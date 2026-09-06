import type {
  CreateRecipeInput,
  CreateRecipeRevisionInput,
  RecipeDetail,
  RecipeListItem,
} from "@misette/api-contract";
import {
  ingredient,
  recipe,
  recipeIngredient,
  recipeRevision,
  recipeShare,
  recipeSource,
  recipeStep,
} from "@misette/db/schema";
import { and, desc, eq, isNotNull, isNull, or } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import type { Database } from "../db.ts";
import { getRecipeAccess } from "./access.ts";
import { RecipeStoreError } from "./error.ts";
import { foldIngredientName } from "./ingredient.ts";

type BatchExtension = (ids: {
  recipeId: string;
  revisionId: string;
}) => BatchItem<"sqlite">[];

type ResolvedIngredient = CreateRecipeInput["ingredients"][number] & {
  ingredientId: string;
};

const dateToEpoch = (date: Date): number => date.getTime();

const executeBatch = async (
  db: Database,
  first: BatchItem<"sqlite">,
  rest: BatchItem<"sqlite">[]
): Promise<void> => {
  await db.batch([first, ...rest]);
};

const getErrorMessages = (error: Error): string[] => {
  const messages: string[] = [];
  const visited = new Set<unknown>();
  let current: unknown = error;

  while (current instanceof Error && !visited.has(current)) {
    visited.add(current);
    messages.push(current.message);
    current = current.cause;
  }

  return messages;
};

const isRevisionUniqueConflict = (error: Error): boolean =>
  getErrorMessages(error).some(
    (message) =>
      message.includes("recipe_revision_recipeId_revisionNo_uidx") ||
      message.includes(
        "UNIQUE constraint failed: recipe_revision.recipe_id, recipe_revision.revision_no"
      )
  );

export class RecipeStore {
  private readonly db: Database;
  private readonly extendBatch: BatchExtension;

  constructor(db: Database, extendBatch: BatchExtension = () => []) {
    this.db = db;
    this.extendBatch = extendBatch;
  }

  async list(userId: string): Promise<RecipeListItem[]> {
    const rows = await this.db
      .select({
        description: recipeRevision.description,
        id: recipe.id,
        revisionNo: recipeRevision.revisionNo,
        title: recipeRevision.title,
        updatedAt: recipe.updatedAt,
      })
      .from(recipe)
      .innerJoin(recipeRevision, eq(recipeRevision.recipeId, recipe.id))
      .leftJoin(
        recipeShare,
        and(eq(recipeShare.recipeId, recipe.id), eq(recipeShare.userId, userId))
      )
      .where(
        and(
          isNull(recipe.deletedAt),
          or(
            eq(recipe.ownerUserId, userId),
            eq(recipe.visibility, "all_users"),
            isNotNull(recipeShare.userId)
          )
        )
      )
      .orderBy(desc(recipe.updatedAt), desc(recipeRevision.revisionNo));

    const latestByRecipe = new Map<string, RecipeListItem>();
    for (const row of rows) {
      if (!latestByRecipe.has(row.id)) {
        latestByRecipe.set(row.id, {
          ...row,
          updatedAt: dateToEpoch(row.updatedAt),
        });
      }
    }
    return [...latestByRecipe.values()];
  }

  async get(userId: string, recipeId: string): Promise<RecipeDetail> {
    const identity = await this.getIdentity(userId, recipeId);
    if (!identity) {
      throw new RecipeStoreError({ kind: "notFound" });
    }

    const access = getRecipeAccess({ ...identity, userId });
    if (!access.canRead) {
      throw new RecipeStoreError({ kind: "notFound" });
    }

    const [revisionRows, sourceRows] = await Promise.all([
      this.db
        .select()
        .from(recipeRevision)
        .where(eq(recipeRevision.recipeId, recipeId))
        .orderBy(desc(recipeRevision.revisionNo))
        .limit(1),
      this.db
        .select()
        .from(recipeSource)
        .where(eq(recipeSource.recipeId, recipeId))
        .orderBy(recipeSource.importedAt)
        .limit(1),
    ]);
    const [latestRevision] = revisionRows;
    const [source] = sourceRows;
    if (!(latestRevision && source)) {
      throw new Error("Recipe persistence invariant violated");
    }

    const [ingredients, steps] = await Promise.all([
      this.db
        .select({
          displayName: recipeIngredient.displayName,
          id: recipeIngredient.id,
          note: recipeIngredient.note,
          quantityText: recipeIngredient.quantityText,
          quantityUnit: recipeIngredient.quantityUnit,
          quantityValue: recipeIngredient.quantityValue,
          sortOrder: recipeIngredient.sortOrder,
        })
        .from(recipeIngredient)
        .where(eq(recipeIngredient.recipeRevisionId, latestRevision.id))
        .orderBy(recipeIngredient.sortOrder),
      this.db
        .select({
          body: recipeStep.body,
          id: recipeStep.id,
          sortOrder: recipeStep.sortOrder,
        })
        .from(recipeStep)
        .where(eq(recipeStep.recipeRevisionId, latestRevision.id))
        .orderBy(recipeStep.sortOrder),
    ]);

    return {
      capabilities: { canEdit: access.canAddRevision },
      createdAt: dateToEpoch(identity.createdAt),
      id: recipeId,
      latestRevision: {
        changeNote: latestRevision.changeNote,
        cookingTimeMinutes: latestRevision.cookingTimeMinutes,
        createdAt: dateToEpoch(latestRevision.createdAt),
        createdByUserId: latestRevision.createdByUserId,
        description: latestRevision.description,
        id: latestRevision.id,
        ingredients,
        revisionNo: latestRevision.revisionNo,
        servingsText: latestRevision.servingsText,
        steps,
        title: latestRevision.title,
      },
      source: {
        id: source.id,
        sourceName: source.sourceName,
        sourceType: source.sourceType,
        sourceUrl: source.sourceUrl,
      },
      updatedAt: dateToEpoch(identity.updatedAt),
      visibility: identity.visibility,
    };
  }

  async create(
    userId: string,
    input: CreateRecipeInput
  ): Promise<{ recipeId: string; revisionNo: number }> {
    const recipeId = crypto.randomUUID();
    const revisionId = crypto.randomUUID();
    const now = new Date();
    const resolvedIngredients = await this.resolveIngredients(
      input.ingredients
    );

    const recipeInsert = this.db.insert(recipe).values({
      createdAt: now,
      id: recipeId,
      ownerUserId: userId,
      updatedAt: now,
      visibility: "private",
    });
    const rest: BatchItem<"sqlite">[] = [
      this.db.insert(recipeRevision).values({
        changeNote: null,
        cookingTimeMinutes: input.cookingTimeMinutes,
        createdAt: now,
        createdByUserId: userId,
        description: input.description,
        id: revisionId,
        recipeId,
        revisionNo: 1,
        servingsText: input.servingsText,
        title: input.title,
      }),
      this.db.insert(recipeSource).values({
        id: crypto.randomUUID(),
        importedAt: now,
        recipeId,
        sourceName: input.source.sourceName,
        sourceType: input.source.sourceType,
        sourceUrl: input.source.sourceUrl,
      }),
    ];

    for (const [sortOrder, line] of resolvedIngredients.entries()) {
      rest.push(
        this.db.insert(recipeIngredient).values({
          displayName: line.displayName,
          id: crypto.randomUUID(),
          ingredientId: line.ingredientId,
          note: line.note,
          quantityText: line.quantityText,
          quantityUnit: line.quantityUnit,
          quantityValue: line.quantityValue,
          recipeRevisionId: revisionId,
          sortOrder,
        })
      );
    }
    for (const [sortOrder, step] of input.steps.entries()) {
      rest.push(
        this.db.insert(recipeStep).values({
          body: step.body,
          id: crypto.randomUUID(),
          recipeRevisionId: revisionId,
          sortOrder,
        })
      );
    }
    rest.push(...this.extendBatch({ recipeId, revisionId }));

    await executeBatch(this.db, recipeInsert, rest);
    return { recipeId, revisionNo: 1 };
  }

  async createRevision(
    userId: string,
    input: CreateRecipeRevisionInput
  ): Promise<{ recipeId: string; revisionNo: number }> {
    const identity = await this.getIdentity(userId, input.recipeId);
    if (!identity) {
      throw new RecipeStoreError({ kind: "notFound" });
    }

    const access = getRecipeAccess({ ...identity, userId });
    if (!access.canRead) {
      throw new RecipeStoreError({ kind: "notFound" });
    }
    if (!access.canAddRevision) {
      throw new RecipeStoreError({ kind: "forbidden" });
    }

    const latestRevisionNo = await this.getLatestRevisionNo(input.recipeId);
    if (latestRevisionNo !== input.baseRevisionNo) {
      throw new RecipeStoreError({ kind: "conflict", latestRevisionNo });
    }

    const resolvedIngredients = await this.resolveIngredients(
      input.ingredients
    );
    const revisionId = crypto.randomUUID();
    const nextRevisionNo = latestRevisionNo + 1;
    const now = new Date();
    const revisionInsert = this.db.insert(recipeRevision).values({
      changeNote: input.changeNote,
      cookingTimeMinutes: input.cookingTimeMinutes,
      createdAt: now,
      createdByUserId: userId,
      description: input.description,
      id: revisionId,
      recipeId: input.recipeId,
      revisionNo: nextRevisionNo,
      servingsText: input.servingsText,
      title: input.title,
    });
    const rest: BatchItem<"sqlite">[] = [];

    for (const [sortOrder, line] of resolvedIngredients.entries()) {
      rest.push(
        this.db.insert(recipeIngredient).values({
          displayName: line.displayName,
          id: crypto.randomUUID(),
          ingredientId: line.ingredientId,
          note: line.note,
          quantityText: line.quantityText,
          quantityUnit: line.quantityUnit,
          quantityValue: line.quantityValue,
          recipeRevisionId: revisionId,
          sortOrder,
        })
      );
    }
    for (const [sortOrder, step] of input.steps.entries()) {
      rest.push(
        this.db.insert(recipeStep).values({
          body: step.body,
          id: crypto.randomUUID(),
          recipeRevisionId: revisionId,
          sortOrder,
        })
      );
    }
    rest.push(
      this.db
        .update(recipe)
        .set({ updatedAt: now })
        .where(eq(recipe.id, input.recipeId)),
      ...this.extendBatch({ recipeId: input.recipeId, revisionId })
    );

    try {
      await executeBatch(this.db, revisionInsert, rest);
    } catch (error) {
      if (error instanceof Error && isRevisionUniqueConflict(error)) {
        const currentRevisionNo = await this.getLatestRevisionNo(
          input.recipeId
        );
        throw new RecipeStoreError({
          kind: "conflict",
          latestRevisionNo: currentRevisionNo,
        });
      }
      throw error;
    }

    return { recipeId: input.recipeId, revisionNo: nextRevisionNo };
  }

  private async getIdentity(userId: string, recipeId: string) {
    const rows = await this.db
      .select({
        createdAt: recipe.createdAt,
        ownerUserId: recipe.ownerUserId,
        permission: recipeShare.permission,
        updatedAt: recipe.updatedAt,
        visibility: recipe.visibility,
      })
      .from(recipe)
      .leftJoin(
        recipeShare,
        and(eq(recipeShare.recipeId, recipe.id), eq(recipeShare.userId, userId))
      )
      .where(and(eq(recipe.id, recipeId), isNull(recipe.deletedAt)))
      .limit(1);

    const [identity] = rows;
    return identity ?? null;
  }

  private async getLatestRevisionNo(recipeId: string): Promise<number> {
    const rows = await this.db
      .select({ revisionNo: recipeRevision.revisionNo })
      .from(recipeRevision)
      .where(eq(recipeRevision.recipeId, recipeId))
      .orderBy(desc(recipeRevision.revisionNo))
      .limit(1);
    const [latest] = rows;
    if (!latest) {
      throw new Error("Recipe persistence invariant violated");
    }
    return latest.revisionNo;
  }

  private async resolveIngredients(
    lines: CreateRecipeInput["ingredients"]
  ): Promise<ResolvedIngredient[]> {
    const canonicalNames = new Map<string, string>();
    for (const line of lines) {
      const normalizedName = foldIngredientName(line.displayName);
      if (!canonicalNames.has(normalizedName)) {
        canonicalNames.set(normalizedName, line.displayName);
      }
    }

    const resolvedEntries = await Promise.all(
      [...canonicalNames].map(async ([normalizedName, canonicalName]) => {
        const existing = await this.findIngredient(normalizedName);
        const id =
          existing?.id ??
          (await this.insertAndFindIngredient(canonicalName, normalizedName));
        return [normalizedName, id] as const;
      })
    );
    const idsByNormalizedName = new Map(resolvedEntries);

    return lines.map((line) => {
      const ingredientId = idsByNormalizedName.get(
        foldIngredientName(line.displayName)
      );
      if (ingredientId === undefined || ingredientId.length === 0) {
        throw new Error("Ingredient persistence invariant violated");
      }
      return { ...line, ingredientId };
    });
  }

  private async findIngredient(
    normalizedName: string
  ): Promise<{ id: string } | undefined> {
    const rows = await this.db
      .select({ id: ingredient.id })
      .from(ingredient)
      .where(eq(ingredient.normalizedName, normalizedName))
      .limit(1);
    const [found] = rows;
    return found;
  }

  private async insertAndFindIngredient(
    canonicalName: string,
    normalizedName: string
  ): Promise<string> {
    const id = crypto.randomUUID();
    try {
      await this.db.insert(ingredient).values({
        canonicalName,
        id,
        normalizedName,
      });
      return id;
    } catch (error) {
      const racedIngredient = await this.findIngredient(normalizedName);
      if (racedIngredient) {
        return racedIngredient.id;
      }
      throw error;
    }
  }
}

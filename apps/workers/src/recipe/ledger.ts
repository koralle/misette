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
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import type { Database } from "../db.ts";
import { getRecipeAccess, getRecipeListPredicate } from "./access.ts";
import { LedgerError } from "./error.ts";
import { foldIngredientName } from "./ingredient.ts";

interface WritePlan {
  first: BatchItem<"sqlite">;
  rest: BatchItem<"sqlite">[];
}

type WritePlanExtension = (ids: {
  recipeId: string;
  revisionId: string;
}) => BatchItem<"sqlite">[];

interface PlannedIngredient {
  canonicalName: string;
  id: string;
  normalizedName: string;
}

const dateToEpoch = (date: Date): number => date.getTime();

const commitWritePlan = async (
  db: Database,
  plan: WritePlan
): Promise<void> => {
  await db.batch([plan.first, ...plan.rest]);
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

const planIngredientWrites = (
  db: Database,
  revisionId: string,
  lines: CreateRecipeInput["ingredients"]
): BatchItem<"sqlite">[] => {
  const plannedIngredients = new Map<string, PlannedIngredient>();
  for (const line of lines) {
    const normalizedName = foldIngredientName(line.displayName);
    if (!plannedIngredients.has(normalizedName)) {
      plannedIngredients.set(normalizedName, {
        canonicalName: line.displayName,
        id: crypto.randomUUID(),
        normalizedName,
      });
    }
  }

  const claims = [...plannedIngredients.values()].map((planned) =>
    db
      .insert(ingredient)
      .values(planned)
      .onConflictDoNothing({ target: ingredient.normalizedName })
  );
  const ingredientLines = lines.map((line, sortOrder) => {
    const normalizedName = foldIngredientName(line.displayName);
    return db.insert(recipeIngredient).select(
      sql`select
        ${crypto.randomUUID()},
        ${revisionId},
        ${ingredient.id},
        ${line.displayName},
        ${line.quantityValue},
        ${line.quantityUnit},
        ${line.quantityText},
        ${line.note},
        ${sortOrder}
      from ${ingredient}
      where ${ingredient.normalizedName} = ${normalizedName}`
    );
  });

  return [...claims, ...ingredientLines];
};

export class RecipeLedger {
  private readonly db: Database;
  private readonly extendWritePlan: WritePlanExtension;

  constructor(db: Database, extendWritePlan: WritePlanExtension = () => []) {
    this.db = db;
    this.extendWritePlan = extendWritePlan;
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
      .where(and(isNull(recipe.deletedAt), getRecipeListPredicate(userId)))
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

  async open(userId: string, recipeId: string): Promise<RecipeDetail> {
    const identity = await this.getIdentity(userId, recipeId);
    if (!identity) {
      throw new LedgerError({ kind: "notFound" });
    }

    const access = getRecipeAccess({ ...identity, userId });
    if (!access.canRead) {
      throw new LedgerError({ kind: "notFound" });
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

  async start(
    userId: string,
    input: CreateRecipeInput
  ): Promise<{ recipeId: string; revisionNo: number }> {
    const recipeId = crypto.randomUUID();
    const revisionId = crypto.randomUUID();
    const now = new Date();
    const plan: WritePlan = {
      first: this.db.insert(recipe).values({
        createdAt: now,
        id: recipeId,
        ownerUserId: userId,
        updatedAt: now,
        visibility: "private",
      }),
      rest: [
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
        ...planIngredientWrites(this.db, revisionId, input.ingredients),
        ...input.steps.map((step, sortOrder) =>
          this.db.insert(recipeStep).values({
            body: step.body,
            id: crypto.randomUUID(),
            recipeRevisionId: revisionId,
            sortOrder,
          })
        ),
        ...this.extendWritePlan({ recipeId, revisionId }),
      ],
    };

    await commitWritePlan(this.db, plan);
    return { recipeId, revisionNo: 1 };
  }

  async append(
    userId: string,
    input: CreateRecipeRevisionInput
  ): Promise<{ recipeId: string; revisionNo: number }> {
    const identity = await this.getIdentity(userId, input.recipeId);
    if (!identity) {
      throw new LedgerError({ kind: "notFound" });
    }

    const access = getRecipeAccess({ ...identity, userId });
    if (!access.canRead) {
      throw new LedgerError({ kind: "notFound" });
    }
    if (!access.canAddRevision) {
      throw new LedgerError({ kind: "forbidden" });
    }

    const latestRevisionNo = await this.getLatestRevisionNo(input.recipeId);
    if (latestRevisionNo !== input.baseRevisionNo) {
      throw new LedgerError({ kind: "conflict", latestRevisionNo });
    }

    const revisionId = crypto.randomUUID();
    const nextRevisionNo = latestRevisionNo + 1;
    const now = new Date();
    const revisionInsert = this.db.insert(recipeRevision).select(
      sql`select
        ${revisionId},
        ${input.recipeId},
        ${nextRevisionNo},
        ${input.title},
        ${input.description},
        ${input.servingsText},
        ${input.cookingTimeMinutes},
        ${input.changeNote},
        ${userId},
        ${now.getTime()}
      where (
        select max(${recipeRevision.revisionNo})
        from ${recipeRevision}
        where ${recipeRevision.recipeId} = ${input.recipeId}
      ) = ${input.baseRevisionNo}`
    );
    const plan: WritePlan = {
      first: revisionInsert,
      rest: [
        ...planIngredientWrites(this.db, revisionId, input.ingredients),
        ...input.steps.map((step, sortOrder) =>
          this.db.insert(recipeStep).values({
            body: step.body,
            id: crypto.randomUUID(),
            recipeRevisionId: revisionId,
            sortOrder,
          })
        ),
        this.db
          .update(recipe)
          .set({
            updatedAt: now,
            visibility: sql`case
              when exists (
                select 1
                from ${recipeRevision}
                where ${recipeRevision.id} = ${revisionId}
              )
              then ${recipe.visibility}
              else ${"conflict"}
            end`,
          })
          .where(eq(recipe.id, input.recipeId)),
        ...this.extendWritePlan({ recipeId: input.recipeId, revisionId }),
      ],
    };

    try {
      await commitWritePlan(this.db, plan);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }
      const currentRevisionNo = await this.getLatestRevisionNo(input.recipeId);
      if (
        isRevisionUniqueConflict(error) ||
        currentRevisionNo !== input.baseRevisionNo
      ) {
        throw new LedgerError({
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
}

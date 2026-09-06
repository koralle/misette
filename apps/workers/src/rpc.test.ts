import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  contract,
  CreateRecipeInput,
  CreateRecipeRevisionInput,
} from "@misette/api-contract";
import {
  recipe,
  recipeRevision,
  recipeShare,
  recipeStep,
} from "@misette/db/schema";
import { createORPCClient, ORPCError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import { eq } from "drizzle-orm";
import { convertV4MiniflareOptions, Miniflare } from "miniflare";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { createAuth } from "./auth.ts";
import { createDb } from "./db.ts";
import app from "./index.ts";
import { RecipeLedger } from "./recipe/ledger.ts";

const MIGRATIONS = [
  "../../../packages/db/drizzle/0000_cynical_prism.sql",
  "../../../packages/db/drizzle/0001_nasty_solo.sql",
] as const;
const STATEMENT_BREAKPOINT = "--> statement-breakpoint";
const SESSION_COOKIE = /better-auth\.session_token=(?<token>[^;,]+)/u;

interface TestState {
  database: D1Database;
  env: CloudflareBindings;
  miniflare: Miniflare;
}

let state: TestState | null = null;

const getState = (): TestState => {
  if (!state) {
    throw new Error("Test state is not initialized");
  }
  return state;
};

const applyMigrations = async (database: D1Database): Promise<void> => {
  const migrations = await Promise.all(
    MIGRATIONS.map(
      async (migration) =>
        await readFile(path.join(import.meta.dirname, migration), "utf-8")
    )
  );
  const statements = migrations.flatMap((migration) =>
    migration
      .split(STATEMENT_BREAKPOINT)
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0)
  );
  if (statements.length === 0) {
    throw new Error("Database migrations are empty");
  }
  await database.batch(
    statements.map((statement) => database.prepare(statement))
  );
};

const recipeInput = (title = "味噌汁"): CreateRecipeInput => ({
  cookingTimeMinutes: 15,
  description: "毎日の味噌汁",
  ingredients: [
    {
      displayName: "  木綿   豆腐  ",
      note: "さいの目",
      quantityText: "1/2丁",
      quantityUnit: null,
      quantityValue: null,
    },
  ],
  servingsText: "2人分",
  source: {
    sourceName: "家庭のレシピ",
    sourceType: "original",
    sourceUrl: null,
  },
  steps: [{ body: "だしを温める" }, { body: "味噌を溶く" }],
  title,
});

const revisionInput = (
  recipeId: string,
  baseRevisionNo: number,
  title = "豆腐の味噌汁"
): CreateRecipeRevisionInput => {
  const input = recipeInput(title);
  return {
    baseRevisionNo,
    changeNote: "豆腐を追加",
    cookingTimeMinutes: input.cookingTimeMinutes,
    description: input.description,
    ingredients: input.ingredients,
    recipeId,
    servingsText: input.servingsText,
    steps: input.steps,
    title: input.title,
  };
};

const signUp = async (
  email: string
): Promise<{ cookie: string; userId: string }> => {
  const { env } = getState();
  const result = await createAuth(env).api.signUpEmail({
    body: {
      email,
      name: email.split("@")[0] ?? email,
      password: "correct horse battery staple",
    },
    returnHeaders: true,
  });
  const setCookie = result.headers.get("set-cookie") ?? "";
  const token = SESSION_COOKIE.exec(setCookie)?.groups?.["token"];
  if (token === undefined || token.length === 0) {
    throw new Error("Session cookie was not returned");
  }
  return {
    cookie: `better-auth.session_token=${token}`,
    userId: result.response.user.id,
  };
};

const createClient = (
  cookie?: string
): ContractRouterClient<typeof contract> => {
  const { env } = getState();
  const link = new RPCLink({
    fetch: async (request) => {
      const headers = new Headers(request.headers);
      if (cookie !== undefined) {
        headers.set("cookie", cookie);
      }
      return await app.request(
        new Request(request, { headers }),
        undefined,
        env
      );
    },
    url: "http://localhost:5173/api/rpc",
  });
  return createORPCClient<ContractRouterClient<typeof contract>>(link);
};

const countRows = async (table: string): Promise<number> => {
  const { database } = getState();
  const result = await database
    .prepare(`SELECT count(*) AS count FROM ${table}`)
    .first<{ count: number }>();
  return result?.count ?? 0;
};

const countRecipeData = async () => {
  const [ingredients, recipes, revisions, ingredientLines, steps] =
    await Promise.all([
      countRows("ingredient"),
      countRows("recipe"),
      countRows("recipe_revision"),
      countRows("recipe_ingredient"),
      countRows("recipe_step"),
    ]);
  return { ingredientLines, ingredients, recipes, revisions, steps };
};

describe("recipe RPC", () => {
  beforeEach(async () => {
    const miniflare = new Miniflare(
      convertV4MiniflareOptions({
        compatibilityDate: "2026-09-01",
        d1Databases: { DB: crypto.randomUUID() },
        modules: true,
        script: "export default { fetch() { return new Response('ok') } }",
      })
    );
    const { DB: database } = await miniflare.getBindings<{
      DB: D1Database;
    }>();
    await applyMigrations(database);
    state = {
      database,
      env: {
        BETTER_AUTH_SECRET: "test-secret-with-at-least-thirty-two-characters",
        BETTER_AUTH_URL: "http://localhost:5173",
        DB: database,
        WEB_ORIGIN: "http://localhost:5173",
      },
      miniflare,
    };
  });

  afterEach(async () => {
    await state?.miniflare.dispose();
    state = null;
  });

  test("rejects an unauthenticated request", async () => {
    await expect(createClient().recipe.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  test("lets the owner create, list, read, and revise a recipe", async () => {
    const owner = await signUp("owner@example.com");
    const client = createClient(owner.cookie);

    const created = await client.recipe.create(recipeInput());
    const list = await client.recipe.list();
    const detail = await client.recipe.get({ recipeId: created.recipeId });
    const revised = await client.recipe.createRevision(
      revisionInput(created.recipeId, 1)
    );

    expect(created.revisionNo).toBe(1);
    expect(list).toMatchObject([
      { id: created.recipeId, revisionNo: 1, title: "味噌汁" },
    ]);
    expect(detail.capabilities.canEdit).toBeTruthy();
    expect(detail.latestRevision.ingredients[0]?.displayName).toBe(
      "木綿   豆腐"
    );
    expect(revised.revisionNo).toBe(2);
  });

  test("lets an editor read and create a revision", async () => {
    const owner = await signUp("owner@example.com");
    const editor = await signUp("editor@example.com");
    const ownerClient = createClient(owner.cookie);
    const created = await ownerClient.recipe.create(recipeInput());
    await createDb(getState().database).insert(recipeShare).values({
      permission: "editor",
      recipeId: created.recipeId,
      userId: editor.userId,
    });

    const editorClient = createClient(editor.cookie);
    const detail = await editorClient.recipe.get({
      recipeId: created.recipeId,
    });
    const revised = await editorClient.recipe.createRevision(
      revisionInput(created.recipeId, 1)
    );

    expect(detail.capabilities.canEdit).toBeTruthy();
    expect(revised.revisionNo).toBe(2);
  });

  test("lets a viewer read but forbids a revision", async () => {
    const owner = await signUp("owner@example.com");
    const viewer = await signUp("viewer@example.com");
    const created = await createClient(owner.cookie).recipe.create(
      recipeInput()
    );
    await createDb(getState().database).insert(recipeShare).values({
      permission: "viewer",
      recipeId: created.recipeId,
      userId: viewer.userId,
    });

    const viewerClient = createClient(viewer.cookie);
    const detail = await viewerClient.recipe.get({
      recipeId: created.recipeId,
    });

    expect(detail.capabilities.canEdit).toBeFalsy();
    await expect(
      viewerClient.recipe.createRevision(revisionInput(created.recipeId, 1))
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  test("lets any authenticated user read an all-users recipe", async () => {
    const owner = await signUp("owner@example.com");
    const reader = await signUp("reader@example.com");
    const created = await createClient(owner.cookie).recipe.create(
      recipeInput()
    );
    await createDb(getState().database)
      .update(recipe)
      .set({ visibility: "all_users" })
      .where(eq(recipe.id, created.recipeId));

    const detail = await createClient(reader.cookie).recipe.get({
      recipeId: created.recipeId,
    });

    expect(detail.capabilities.canEdit).toBeFalsy();
    expect(detail.id).toBe(created.recipeId);
  });

  test("does not reveal a private recipe to an unshared user", async () => {
    const owner = await signUp("owner@example.com");
    const reader = await signUp("reader@example.com");
    const created = await createClient(owner.cookie).recipe.create(
      recipeInput()
    );

    await expect(
      createClient(reader.cookie).recipe.get({ recipeId: created.recipeId })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("rolls back every recipe row when a later create statement fails", async () => {
    const owner = await signUp("owner@example.com");
    const database = createDb(getState().database);
    const ledger = new RecipeLedger(database, ({ revisionId }) => [
      database.insert(recipeStep).values({
        body: "失敗する手順",
        id: crypto.randomUUID(),
        recipeRevisionId: revisionId,
        sortOrder: -1,
      }),
    ]);

    await expect(ledger.start(owner.userId, recipeInput())).rejects.toThrow(
      "CHECK constraint failed"
    );

    await expect(countRecipeData()).resolves.toStrictEqual({
      ingredientLines: 0,
      ingredients: 0,
      recipes: 0,
      revisions: 0,
      steps: 0,
    });
  });

  test("rolls back a failed revision batch", async () => {
    const owner = await signUp("owner@example.com");
    const database = createDb(getState().database);
    const created = await new RecipeLedger(database).start(
      owner.userId,
      recipeInput()
    );
    const ledger = new RecipeLedger(database, ({ revisionId }) => [
      database.insert(recipeStep).values({
        body: "失敗する手順",
        id: crypto.randomUUID(),
        recipeRevisionId: revisionId,
        sortOrder: -1,
      }),
    ]);

    await expect(
      ledger.append(owner.userId, revisionInput(created.recipeId, 1))
    ).rejects.toThrow("CHECK constraint failed");

    await expect(countRecipeData()).resolves.toStrictEqual({
      ingredientLines: 1,
      ingredients: 1,
      recipes: 1,
      revisions: 1,
      steps: 2,
    });
  });

  test("reports the latest revision for a stale base", async () => {
    const owner = await signUp("owner@example.com");
    const client = createClient(owner.cookie);
    const created = await client.recipe.create(recipeInput());
    await client.recipe.createRevision(revisionInput(created.recipeId, 1));

    await expect(
      client.recipe.createRevision(revisionInput(created.recipeId, 1))
    ).rejects.toMatchObject({
      code: "CONFLICT",
      data: { latestRevisionNo: 2 },
    });
  });

  test("allows one concurrent revision and conflicts the other without retrying", async () => {
    const owner = await signUp("owner@example.com");
    const client = createClient(owner.cookie);
    const created = await client.recipe.create(recipeInput());

    const results = await Promise.allSettled([
      client.recipe.createRevision(
        revisionInput(created.recipeId, 1, "赤味噌汁")
      ),
      client.recipe.createRevision(
        revisionInput(created.recipeId, 1, "白味噌汁")
      ),
    ]);
    const successes = results.filter((result) => result.status === "fulfilled");
    const conflicts = results.filter(
      (result) =>
        result.status === "rejected" &&
        result.reason instanceof ORPCError &&
        result.reason.code === "CONFLICT"
    );
    const revisionRows = await createDb(getState().database)
      .select({ revisionNo: recipeRevision.revisionNo })
      .from(recipeRevision)
      .where(eq(recipeRevision.recipeId, created.recipeId))
      .orderBy(recipeRevision.revisionNo);

    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(1);
    expect(revisionRows).toStrictEqual([{ revisionNo: 1 }, { revisionNo: 2 }]);
  });
});

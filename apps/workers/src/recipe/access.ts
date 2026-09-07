import { recipe, recipeShare } from "@misette/db/schema";
import { eq, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

interface RecipeAccess {
  canAddRevision: boolean;
  canRead: boolean;
}

interface RecipeAccessInput {
  ownerUserId: string;
  permission: "editor" | "viewer" | null;
  userId: string;
  visibility: "all_users" | "private";
}

interface AccessRule {
  access: RecipeAccess;
  listPredicate: (userId: string) => SQL;
  matches: (input: RecipeAccessInput) => boolean;
}

const accessRules: readonly AccessRule[] = [
  {
    access: { canAddRevision: true, canRead: true },
    listPredicate: (userId) => eq(recipe.ownerUserId, userId),
    matches: ({ ownerUserId, userId }) => ownerUserId === userId,
  },
  {
    access: { canAddRevision: true, canRead: true },
    listPredicate: () => eq(recipeShare.permission, "editor"),
    matches: ({ permission }) => permission === "editor",
  },
  {
    access: { canAddRevision: false, canRead: true },
    listPredicate: () => eq(recipeShare.permission, "viewer"),
    matches: ({ permission }) => permission === "viewer",
  },
  {
    access: { canAddRevision: false, canRead: true },
    listPredicate: () => eq(recipe.visibility, "all_users"),
    matches: ({ visibility }) => visibility === "all_users",
  },
  {
    access: { canAddRevision: false, canRead: false },
    listPredicate: () => sql`false`,
    matches: () => true,
  },
];

export const getRecipeAccess = (input: RecipeAccessInput): RecipeAccess => {
  const rule = accessRules.find((candidate) => candidate.matches(input));
  if (!rule) {
    throw new Error("Recipe access rules must include a fallback");
  }
  return rule.access;
};

export const getRecipeListPredicate = (userId: string): SQL => {
  const predicates = accessRules.map((rule) => rule.listPredicate(userId));
  const predicate = or(...predicates);
  if (!predicate) {
    throw new Error("Recipe access rules must include a list predicate");
  }
  return predicate;
};

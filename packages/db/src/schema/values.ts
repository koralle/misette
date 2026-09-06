import { sql } from "drizzle-orm";
import { check } from "drizzle-orm/sqlite-core";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";

export const recipeVisibilities = ["private", "all_users"] as const;
export type RecipeVisibility = (typeof recipeVisibilities)[number];

export const recipeSharePermissions = ["viewer", "editor"] as const;
export type RecipeSharePermission = (typeof recipeSharePermissions)[number];

export const recipeSourceTypes = [
  "original",
  "website",
  "book",
  "other",
] as const;
export type RecipeSourceType = (typeof recipeSourceTypes)[number];

export const inCheck = (
  name: string,
  column: AnySQLiteColumn,
  values: readonly string[]
) =>
  check(
    name,
    sql`${column} in (${sql.raw(values.map((value) => `'${value.replaceAll("'", "''")}'`).join(", "))})`
  );

import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { recipeIngredient } from "./recipe.ts";

const nowMs = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export const ingredient = sqliteTable("ingredient", {
  canonicalName: text("canonical_name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(nowMs)
    .notNull(),
  id: text("id").primaryKey(),
  normalizedName: text("normalized_name").notNull().unique(),
});

export const ingredientRelations = relations(ingredient, ({ many }) => ({
  recipeIngredients: many(recipeIngredient),
}));

export type Ingredient = typeof ingredient.$inferSelect;
export type IngredientInsert = typeof ingredient.$inferInsert;

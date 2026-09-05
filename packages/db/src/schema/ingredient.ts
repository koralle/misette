import { relations, sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { recipeIngredient } from './recipe.ts';

const nowMs = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export const ingredient = sqliteTable('ingredient', {
  id: text('id').primaryKey(),
  canonicalName: text('canonical_name').notNull(),
  normalizedName: text('normalized_name').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowMs).notNull(),
});

export const ingredientRelations = relations(ingredient, ({ many }) => ({
  recipeIngredients: many(recipeIngredient),
}));

export type Ingredient = typeof ingredient.$inferSelect;
export type IngredientInsert = typeof ingredient.$inferInsert;

import { desc, relations, sql } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { user } from './auth.ts';
import { recipe, recipeStep } from './recipe.ts';

const nowMs = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export const cookingKnowledge = sqliteTable(
  'cooking_knowledge',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowMs).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(nowMs)
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    index('cooking_knowledge_createdByUserId_updatedAt_idx').on(table.createdByUserId, desc(table.updatedAt)),
  ],
);

export const recipeKnowledge = sqliteTable(
  'recipe_knowledge',
  {
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipe.id, { onDelete: 'restrict' }),
    cookingKnowledgeId: text('cooking_knowledge_id')
      .notNull()
      .references(() => cookingKnowledge.id, { onDelete: 'restrict' }),
  },
  (table) => [
    primaryKey({ columns: [table.recipeId, table.cookingKnowledgeId] }),
    index('recipe_knowledge_cookingKnowledgeId_idx').on(table.cookingKnowledgeId),
  ],
);

export const stepKnowledge = sqliteTable(
  'step_knowledge',
  {
    recipeStepId: text('recipe_step_id')
      .notNull()
      .references(() => recipeStep.id, { onDelete: 'restrict' }),
    cookingKnowledgeId: text('cooking_knowledge_id')
      .notNull()
      .references(() => cookingKnowledge.id, { onDelete: 'restrict' }),
  },
  (table) => [
    primaryKey({ columns: [table.recipeStepId, table.cookingKnowledgeId] }),
    index('step_knowledge_cookingKnowledgeId_idx').on(table.cookingKnowledgeId),
  ],
);

export const cookingKnowledgeRelations = relations(cookingKnowledge, ({ one, many }) => ({
  createdBy: one(user, {
    fields: [cookingKnowledge.createdByUserId],
    references: [user.id],
  }),
  recipeLinks: many(recipeKnowledge),
  stepLinks: many(stepKnowledge),
}));

export const recipeKnowledgeRelations = relations(recipeKnowledge, ({ one }) => ({
  recipe: one(recipe, {
    fields: [recipeKnowledge.recipeId],
    references: [recipe.id],
  }),
  cookingKnowledge: one(cookingKnowledge, {
    fields: [recipeKnowledge.cookingKnowledgeId],
    references: [cookingKnowledge.id],
  }),
}));

export const stepKnowledgeRelations = relations(stepKnowledge, ({ one }) => ({
  recipeStep: one(recipeStep, {
    fields: [stepKnowledge.recipeStepId],
    references: [recipeStep.id],
  }),
  cookingKnowledge: one(cookingKnowledge, {
    fields: [stepKnowledge.cookingKnowledgeId],
    references: [cookingKnowledge.id],
  }),
}));

export type CookingKnowledge = typeof cookingKnowledge.$inferSelect;
export type CookingKnowledgeInsert = typeof cookingKnowledge.$inferInsert;
export type RecipeKnowledge = typeof recipeKnowledge.$inferSelect;
export type RecipeKnowledgeInsert = typeof recipeKnowledge.$inferInsert;
export type StepKnowledge = typeof stepKnowledge.$inferSelect;
export type StepKnowledgeInsert = typeof stepKnowledge.$inferInsert;

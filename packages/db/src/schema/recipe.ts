import { relations, sql } from 'drizzle-orm';
import { check, index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { user } from './auth.ts';
import { cookingAttempt, cookingAttemptStepNote } from './cooking.ts';
import { ingredient } from './ingredient.ts';
import { recipeKnowledge, stepKnowledge } from './knowledge.ts';
import { inCheck, recipeSharePermissions, recipeSourceTypes, recipeVisibilities } from './values.ts';

const nowMs = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export const recipe = sqliteTable(
  'recipe',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    visibility: text('visibility', { enum: recipeVisibilities }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowMs).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(nowMs)
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    index('recipe_ownerUserId_idx').on(table.ownerUserId),
    inCheck('recipe_visibility_check', table.visibility, recipeVisibilities),
  ],
);

export const recipeShare = sqliteTable(
  'recipe_share',
  {
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipe.id, { onDelete: 'restrict' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    permission: text('permission', { enum: recipeSharePermissions }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowMs).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.recipeId, table.userId] }),
    index('recipe_share_userId_idx').on(table.userId),
    inCheck('recipe_share_permission_check', table.permission, recipeSharePermissions),
  ],
);

export const recipeSource = sqliteTable(
  'recipe_source',
  {
    id: text('id').primaryKey(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipe.id, { onDelete: 'restrict' }),
    sourceType: text('source_type', { enum: recipeSourceTypes }).notNull(),
    sourceName: text('source_name'),
    sourceUrl: text('source_url'),
    importedAt: integer('imported_at', { mode: 'timestamp_ms' }).default(nowMs).notNull(),
  },
  (table) => [
    index('recipe_source_recipeId_idx').on(table.recipeId),
    inCheck('recipe_source_sourceType_check', table.sourceType, recipeSourceTypes),
  ],
);

export const recipeRevision = sqliteTable(
  'recipe_revision',
  {
    id: text('id').primaryKey(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipe.id, { onDelete: 'restrict' }),
    revisionNo: integer('revision_no').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    servingsText: text('servings_text'),
    cookingTimeMinutes: integer('cooking_time_minutes'),
    changeNote: text('change_note'),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowMs).notNull(),
  },
  (table) => [
    uniqueIndex('recipe_revision_recipeId_revisionNo_uidx').on(table.recipeId, table.revisionNo),
    index('recipe_revision_createdByUserId_idx').on(table.createdByUserId),
    check('recipe_revision_revisionNo_check', sql`${table.revisionNo} >= 1`),
    check(
      'recipe_revision_cookingTimeMinutes_check',
      sql`${table.cookingTimeMinutes} is null or ${table.cookingTimeMinutes} >= 0`,
    ),
  ],
);

export const recipeIngredient = sqliteTable(
  'recipe_ingredient',
  {
    id: text('id').primaryKey(),
    recipeRevisionId: text('recipe_revision_id')
      .notNull()
      .references(() => recipeRevision.id, { onDelete: 'restrict' }),
    ingredientId: text('ingredient_id')
      .notNull()
      .references(() => ingredient.id, { onDelete: 'restrict' }),
    displayName: text('display_name').notNull(),
    quantityValue: real('quantity_value'),
    quantityUnit: text('quantity_unit'),
    quantityText: text('quantity_text'),
    note: text('note'),
    sortOrder: integer('sort_order').notNull(),
  },
  (table) => [
    uniqueIndex('recipe_ingredient_recipeRevisionId_sortOrder_uidx').on(table.recipeRevisionId, table.sortOrder),
    index('recipe_ingredient_ingredientId_idx').on(table.ingredientId),
    check('recipe_ingredient_sortOrder_check', sql`${table.sortOrder} >= 0`),
  ],
);

export const recipeStep = sqliteTable(
  'recipe_step',
  {
    id: text('id').primaryKey(),
    recipeRevisionId: text('recipe_revision_id')
      .notNull()
      .references(() => recipeRevision.id, { onDelete: 'restrict' }),
    sortOrder: integer('sort_order').notNull(),
    body: text('body').notNull(),
  },
  (table) => [
    uniqueIndex('recipe_step_recipeRevisionId_sortOrder_uidx').on(table.recipeRevisionId, table.sortOrder),
    uniqueIndex('recipe_step_id_recipeRevisionId_uidx').on(table.id, table.recipeRevisionId),
    check('recipe_step_sortOrder_check', sql`${table.sortOrder} >= 0`),
  ],
);

export const recipeRelations = relations(recipe, ({ one, many }) => ({
  owner: one(user, {
    fields: [recipe.ownerUserId],
    references: [user.id],
  }),
  shares: many(recipeShare),
  sources: many(recipeSource),
  revisions: many(recipeRevision),
  knowledgeLinks: many(recipeKnowledge),
}));

export const recipeShareRelations = relations(recipeShare, ({ one }) => ({
  recipe: one(recipe, {
    fields: [recipeShare.recipeId],
    references: [recipe.id],
  }),
  user: one(user, {
    fields: [recipeShare.userId],
    references: [user.id],
  }),
}));

export const recipeSourceRelations = relations(recipeSource, ({ one }) => ({
  recipe: one(recipe, {
    fields: [recipeSource.recipeId],
    references: [recipe.id],
  }),
}));

export const recipeRevisionRelations = relations(recipeRevision, ({ one, many }) => ({
  recipe: one(recipe, {
    fields: [recipeRevision.recipeId],
    references: [recipe.id],
  }),
  createdBy: one(user, {
    fields: [recipeRevision.createdByUserId],
    references: [user.id],
  }),
  ingredients: many(recipeIngredient),
  steps: many(recipeStep),
  cookingAttempts: many(cookingAttempt),
}));

export const recipeIngredientRelations = relations(recipeIngredient, ({ one }) => ({
  revision: one(recipeRevision, {
    fields: [recipeIngredient.recipeRevisionId],
    references: [recipeRevision.id],
  }),
  ingredient: one(ingredient, {
    fields: [recipeIngredient.ingredientId],
    references: [ingredient.id],
  }),
}));

export const recipeStepRelations = relations(recipeStep, ({ one, many }) => ({
  revision: one(recipeRevision, {
    fields: [recipeStep.recipeRevisionId],
    references: [recipeRevision.id],
  }),
  knowledgeLinks: many(stepKnowledge),
  cookingAttemptStepNotes: many(cookingAttemptStepNote),
}));

export type Recipe = typeof recipe.$inferSelect;
export type RecipeInsert = typeof recipe.$inferInsert;
export type RecipeShare = typeof recipeShare.$inferSelect;
export type RecipeShareInsert = typeof recipeShare.$inferInsert;
export type RecipeSource = typeof recipeSource.$inferSelect;
export type RecipeSourceInsert = typeof recipeSource.$inferInsert;
export type RecipeRevision = typeof recipeRevision.$inferSelect;
export type RecipeRevisionInsert = typeof recipeRevision.$inferInsert;
export type RecipeIngredient = typeof recipeIngredient.$inferSelect;
export type RecipeIngredientInsert = typeof recipeIngredient.$inferInsert;
export type RecipeStep = typeof recipeStep.$inferSelect;
export type RecipeStepInsert = typeof recipeStep.$inferInsert;

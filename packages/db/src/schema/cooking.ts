import { desc, relations, sql } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import {
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth.ts";
import { recipeRevision, recipeStep } from "./recipe.ts";

const nowMs = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export const cookingAttempt = sqliteTable(
  "cooking_attempt",
  {
    id: text("id").primaryKey(),
    recipeRevisionId: text("recipe_revision_id")
      .notNull()
      .references(() => recipeRevision.id, { onDelete: "restrict" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    cookedAt: integer("cooked_at", { mode: "timestamp_ms" }).notNull(),
    generalNote: text("general_note"),
    basedOnAttemptId: text("based_on_attempt_id").references(
      (): AnySQLiteColumn => cookingAttempt.id,
      {
        onDelete: "restrict",
      }
    ),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowMs)
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    uniqueIndex("cooking_attempt_id_recipeRevisionId_uidx").on(
      table.id,
      table.recipeRevisionId
    ),
    index("cooking_attempt_recipeRevisionId_idx").on(table.recipeRevisionId),
    index("cooking_attempt_createdByUserId_cookedAt_idx").on(
      table.createdByUserId,
      desc(table.cookedAt)
    ),
    index("cooking_attempt_basedOnAttemptId_idx").on(table.basedOnAttemptId),
    check(
      "cooking_attempt_basedOnAttemptId_check",
      sql`${table.basedOnAttemptId} is null or ${table.basedOnAttemptId} != ${table.id}`
    ),
  ]
);

export const cookingAttemptStepNote = sqliteTable(
  "cooking_attempt_step_note",
  {
    cookingAttemptId: text("cooking_attempt_id").notNull(),
    recipeStepId: text("recipe_step_id").notNull(),
    recipeRevisionId: text("recipe_revision_id").notNull(),
    body: text("body").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowMs)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.cookingAttemptId, table.recipeStepId] }),
    foreignKey({
      name: "cooking_attempt_step_note_attempt_revision_fk",
      columns: [table.cookingAttemptId, table.recipeRevisionId],
      foreignColumns: [cookingAttempt.id, cookingAttempt.recipeRevisionId],
    }).onDelete("restrict"),
    foreignKey({
      name: "cooking_attempt_step_note_step_revision_fk",
      columns: [table.recipeStepId, table.recipeRevisionId],
      foreignColumns: [recipeStep.id, recipeStep.recipeRevisionId],
    }).onDelete("restrict"),
    index("cooking_attempt_step_note_recipeStepId_recipeRevisionId_idx").on(
      table.recipeStepId,
      table.recipeRevisionId
    ),
  ]
);

export const cookingAttemptRelations = relations(
  cookingAttempt,
  ({ one, many }) => ({
    revision: one(recipeRevision, {
      fields: [cookingAttempt.recipeRevisionId],
      references: [recipeRevision.id],
    }),
    createdBy: one(user, {
      fields: [cookingAttempt.createdByUserId],
      references: [user.id],
    }),
    basedOn: one(cookingAttempt, {
      fields: [cookingAttempt.basedOnAttemptId],
      references: [cookingAttempt.id],
      relationName: "cookingAttemptBasedOn",
    }),
    derivedAttempts: many(cookingAttempt, {
      relationName: "cookingAttemptBasedOn",
    }),
    stepNotes: many(cookingAttemptStepNote),
  })
);

export const cookingAttemptStepNoteRelations = relations(
  cookingAttemptStepNote,
  ({ one }) => ({
    attempt: one(cookingAttempt, {
      fields: [
        cookingAttemptStepNote.cookingAttemptId,
        cookingAttemptStepNote.recipeRevisionId,
      ],
      references: [cookingAttempt.id, cookingAttempt.recipeRevisionId],
    }),
    step: one(recipeStep, {
      fields: [
        cookingAttemptStepNote.recipeStepId,
        cookingAttemptStepNote.recipeRevisionId,
      ],
      references: [recipeStep.id, recipeStep.recipeRevisionId],
    }),
  })
);

export type CookingAttempt = typeof cookingAttempt.$inferSelect;
export type CookingAttemptInsert = typeof cookingAttempt.$inferInsert;
export type CookingAttemptStepNote = typeof cookingAttemptStepNote.$inferSelect;
export type CookingAttemptStepNoteInsert =
  typeof cookingAttemptStepNote.$inferInsert;

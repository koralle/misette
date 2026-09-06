import { oc } from "@orpc/contract";
import * as v from "valibot";

export const recipeSourceTypes = [
  "original",
  "website",
  "book",
  "other",
] as const;

export const recipeIngredientInputSchema = v.object({
  displayName: v.pipe(v.string(), v.trim(), v.minLength(1)),
  note: v.nullable(v.string()),
  quantityText: v.nullable(v.string()),
  quantityUnit: v.nullable(v.string()),
  quantityValue: v.nullable(v.number()),
});

export const recipeStepInputSchema = v.object({
  body: v.pipe(v.string(), v.trim(), v.minLength(1)),
});

export const recipeContentInputSchema = v.object({
  cookingTimeMinutes: v.nullable(
    v.pipe(v.number(), v.integer(), v.minValue(0))
  ),
  description: v.nullable(v.string()),
  ingredients: v.array(recipeIngredientInputSchema),
  servingsText: v.nullable(v.string()),
  steps: v.array(recipeStepInputSchema),
  title: v.pipe(v.string(), v.trim(), v.minLength(1)),
});

export const recipeSourceInputSchema = v.object({
  sourceName: v.nullable(v.string()),
  sourceType: v.picklist(recipeSourceTypes),
  sourceUrl: v.nullable(v.string()),
});

export const createRecipeInputSchema = v.object({
  ...recipeContentInputSchema.entries,
  source: recipeSourceInputSchema,
});

export const createRecipeRevisionInputSchema = v.object({
  ...recipeContentInputSchema.entries,
  baseRevisionNo: v.pipe(v.number(), v.integer(), v.minValue(1)),
  changeNote: v.nullable(v.string()),
  recipeId: v.string(),
});

export const recipeIngredientSchema = v.object({
  displayName: v.string(),
  id: v.string(),
  note: v.nullable(v.string()),
  quantityText: v.nullable(v.string()),
  quantityUnit: v.nullable(v.string()),
  quantityValue: v.nullable(v.number()),
  sortOrder: v.number(),
});

export const recipeStepSchema = v.object({
  body: v.string(),
  id: v.string(),
  sortOrder: v.number(),
});

export const recipeSourceSchema = v.object({
  id: v.string(),
  sourceName: v.nullable(v.string()),
  sourceType: v.picklist(recipeSourceTypes),
  sourceUrl: v.nullable(v.string()),
});

export const recipeRevisionSchema = v.object({
  changeNote: v.nullable(v.string()),
  cookingTimeMinutes: v.nullable(v.number()),
  createdAt: v.number(),
  createdByUserId: v.string(),
  description: v.nullable(v.string()),
  id: v.string(),
  ingredients: v.array(recipeIngredientSchema),
  revisionNo: v.number(),
  servingsText: v.nullable(v.string()),
  steps: v.array(recipeStepSchema),
  title: v.string(),
});

export const recipeListItemSchema = v.object({
  description: v.nullable(v.string()),
  id: v.string(),
  revisionNo: v.number(),
  title: v.string(),
  updatedAt: v.number(),
});

export const recipeDetailSchema = v.object({
  capabilities: v.object({
    canEdit: v.boolean(),
  }),
  createdAt: v.number(),
  id: v.string(),
  latestRevision: recipeRevisionSchema,
  source: recipeSourceSchema,
  updatedAt: v.number(),
  visibility: v.picklist(["private", "all_users"]),
});

const list = oc.input(v.void()).output(v.array(recipeListItemSchema));
const get = oc
  .input(v.object({ recipeId: v.string() }))
  .output(recipeDetailSchema);
const create = oc
  .input(createRecipeInputSchema)
  .output(v.object({ recipeId: v.string(), revisionNo: v.number() }));
const createRevision = oc
  .input(createRecipeRevisionInputSchema)
  .output(v.object({ recipeId: v.string(), revisionNo: v.number() }))
  .errors({
    CONFLICT: {
      data: v.object({ latestRevisionNo: v.number() }),
    },
  });

export const contract = {
  recipe: {
    create,
    createRevision,
    get,
    list,
  },
};

export type CreateRecipeInput = v.InferOutput<typeof createRecipeInputSchema>;
export type CreateRecipeRevisionInput = v.InferOutput<
  typeof createRecipeRevisionInputSchema
>;
export type RecipeDetail = v.InferOutput<typeof recipeDetailSchema>;
export type RecipeListItem = v.InferOutput<typeof recipeListItemSchema>;

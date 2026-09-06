import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { css } from "styled-system/css";

import { RecipeForm } from "../../../components/recipe-form.tsx";
import { orpc } from "../../../lib/orpc.ts";

const hasConflictCode = (error: Error): boolean =>
  "code" in error && error.code === "CONFLICT";

export const EditRecipePage = () => {
  const { recipeId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const recipe = useQuery(
    orpc.recipe.get.queryOptions({ input: { recipeId } })
  );
  const createRevision = useMutation(
    orpc.recipe.createRevision.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpc.recipe.list.key(),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.recipe.get.key({ input: { recipeId } }),
          }),
        ]);
        await navigate({
          params: { recipeId },
          to: "/recipes/$recipeId",
        });
      },
    })
  );

  if (recipe.isPending) {
    return <p aria-live="polite">読み込み中…</p>;
  }
  if (recipe.isError) {
    return (
      <p className={css({ color: "red.700", p: "8" })} role="alert">
        レシピを読み込めませんでした
      </p>
    );
  }

  const { latestRevision, source } = recipe.data;
  const conflict =
    createRevision.error instanceof Error &&
    hasConflictCode(createRevision.error);

  return (
    <main
      className={css({
        display: "grid",
        gap: "6",
        maxW: "4xl",
        mx: "auto",
        p: { base: "4", md: "8" },
      })}
    >
      <h1 className={css({ fontSize: "3xl", fontWeight: "bold" })}>
        レシピを編集
      </h1>
      {createRevision.isError && !conflict ? (
        <p className={css({ color: "red.700" })} role="alert">
          新しい版を保存できませんでした
        </p>
      ) : null}
      <RecipeForm
        conflictRecipeId={conflict ? recipeId : undefined}
        initialValue={{
          changeNote: "",
          cookingTimeMinutes: latestRevision.cookingTimeMinutes,
          description: latestRevision.description,
          ingredients: latestRevision.ingredients.map(
            ({ id: _id, sortOrder: _sortOrder, ...line }) => line
          ),
          servingsText: latestRevision.servingsText,
          source: {
            sourceName: source.sourceName,
            sourceType: source.sourceType,
            sourceUrl: source.sourceUrl,
          },
          steps: latestRevision.steps.map(
            ({ id: _id, sortOrder: _sortOrder, ...step }) => step
          ),
          title: latestRevision.title,
        }}
        isPending={createRevision.isPending}
        mode="revision"
        onSubmit={({ changeNote, recipe: value }) => {
          createRevision.mutate({
            baseRevisionNo: latestRevision.revisionNo,
            changeNote,
            cookingTimeMinutes: value.cookingTimeMinutes,
            description: value.description,
            ingredients: value.ingredients,
            recipeId,
            servingsText: value.servingsText,
            steps: value.steps,
            title: value.title,
          });
        }}
      />
    </main>
  );
};

export const Route = createFileRoute("/recipes/$recipeId/edit")({
  component: EditRecipePage,
});

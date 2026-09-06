import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { css } from "styled-system/css";

import { RecipeForm } from "../../components/recipe-form.tsx";
import { orpc } from "../../lib/orpc.ts";

export const NewRecipePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createRecipe = useMutation(
    orpc.recipe.create.mutationOptions({
      onSuccess: async ({ recipeId }) => {
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
        新しいレシピ
      </h1>
      {createRecipe.isError ? (
        <p className={css({ color: "red.700" })} role="alert">
          レシピを保存できませんでした
        </p>
      ) : null}
      <RecipeForm
        isPending={createRecipe.isPending}
        mode="create"
        onSubmit={({ recipe }) => {
          createRecipe.mutate(recipe);
        }}
      />
    </main>
  );
};

export const Route = createFileRoute("/recipes/new")({
  component: NewRecipePage,
});

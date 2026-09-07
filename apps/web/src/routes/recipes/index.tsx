import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { css } from "styled-system/css";

import { orpc } from "../../lib/orpc.ts";

export const RecipeListPage = () => {
  const recipes = useQuery(orpc.recipe.list.queryOptions());

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
      <div
        className={css({
          alignItems: "center",
          display: "flex",
          gap: "4",
          justifyContent: "space-between",
        })}
      >
        <h1 className={css({ fontSize: "3xl", fontWeight: "bold" })}>レシピ</h1>
        <Link
          className={css({
            borderColor: "gray.700",
            borderRadius: "md",
            borderWidth: "1px",
            minH: "12",
            px: "4",
            py: "2",
          })}
          to="/recipes/new"
        >
          新しいレシピ
        </Link>
      </div>

      {recipes.isPending ? <p aria-live="polite">読み込み中…</p> : null}
      {recipes.isError ? (
        <p className={css({ color: "red.700" })} role="alert">
          レシピを読み込めませんでした
        </p>
      ) : null}
      {recipes.isSuccess && recipes.data.length === 0 ? (
        <p>まだレシピがありません。</p>
      ) : null}
      {recipes.isSuccess && recipes.data.length > 0 ? (
        <ul className={css({ display: "grid", gap: "3" })}>
          {recipes.data.map((recipe) => (
            <li
              className={css({
                borderColor: "gray.300",
                borderRadius: "lg",
                borderWidth: "1px",
                p: "4",
              })}
              key={recipe.id}
            >
              <Link
                className={css({ fontSize: "xl", fontWeight: "semibold" })}
                params={{ recipeId: recipe.id }}
                to="/recipes/$recipeId"
              >
                {recipe.title}
              </Link>
              {recipe.description !== null && recipe.description.length > 0 ? (
                <p>{recipe.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
};

export const Route = createFileRoute("/recipes/")({
  component: RecipeListPage,
});

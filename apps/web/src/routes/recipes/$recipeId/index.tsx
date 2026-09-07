import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { css } from "styled-system/css";

import { orpc } from "../../../lib/orpc.ts";

const sourceTypeLabels = {
  book: "本",
  original: "オリジナル",
  other: "その他",
  website: "ウェブサイト",
} as const;

const hasText = (value: string | null): value is string =>
  value !== null && value.length > 0;

export const RecipeDetailPage = () => {
  const { recipeId } = Route.useParams();
  const recipe = useQuery(
    orpc.recipe.get.queryOptions({ input: { recipeId } })
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
  return (
    <main
      className={css({
        display: "grid",
        gap: "7",
        maxW: "4xl",
        mx: "auto",
        p: { base: "4", md: "8" },
      })}
    >
      <header className={css({ display: "grid", gap: "3" })}>
        <div
          className={css({
            alignItems: "start",
            display: "flex",
            gap: "4",
            justifyContent: "space-between",
          })}
        >
          <h1 className={css({ fontSize: "3xl", fontWeight: "bold" })}>
            {latestRevision.title}
          </h1>
          {recipe.data.capabilities.canEdit ? (
            <Link
              className={css({
                borderColor: "gray.700",
                borderRadius: "md",
                borderWidth: "1px",
                minH: "12",
                px: "4",
                py: "2",
              })}
              params={{ recipeId }}
              to="/recipes/$recipeId/edit"
            >
              編集
            </Link>
          ) : null}
        </div>
        <p>{`第${latestRevision.revisionNo}版`}</p>
        {hasText(latestRevision.description) ? (
          <p>{latestRevision.description}</p>
        ) : null}
        <dl
          className={css({
            display: "grid",
            gap: "2",
            gridTemplateColumns: "max-content 1fr",
          })}
        >
          <dt>分量</dt>
          <dd>{latestRevision.servingsText ?? "未設定"}</dd>
          <dt>調理時間</dt>
          <dd>
            {latestRevision.cookingTimeMinutes === null
              ? "未設定"
              : `${latestRevision.cookingTimeMinutes}分`}
          </dd>
        </dl>
      </header>

      <section className={css({ display: "grid", gap: "3" })}>
        <h2 className={css({ fontSize: "2xl", fontWeight: "semibold" })}>
          材料
        </h2>
        {latestRevision.ingredients.length > 0 ? (
          <ul className={css({ display: "grid", gap: "2" })}>
            {latestRevision.ingredients.map((line) => (
              <li key={line.id}>
                <span>{line.displayName}</span>
                {hasText(line.quantityText) ? (
                  <span>{` ${line.quantityText}`}</span>
                ) : null}
                {!hasText(line.quantityText) && line.quantityValue !== null ? (
                  <span>{` ${line.quantityValue}${line.quantityUnit ?? ""}`}</span>
                ) : null}
                {hasText(line.note) ? <span>{`（${line.note}）`}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p>材料は登録されていません。</p>
        )}
      </section>

      <section className={css({ display: "grid", gap: "3" })}>
        <h2 className={css({ fontSize: "2xl", fontWeight: "semibold" })}>
          作り方
        </h2>
        {latestRevision.steps.length > 0 ? (
          <ol
            className={css({
              display: "grid",
              gap: "3",
              listStyle: "decimal",
              pl: "6",
            })}
          >
            {latestRevision.steps.map((step) => (
              <li key={step.id}>{step.body}</li>
            ))}
          </ol>
        ) : (
          <p>手順は登録されていません。</p>
        )}
      </section>

      <section className={css({ display: "grid", gap: "2" })}>
        <h2 className={css({ fontSize: "xl", fontWeight: "semibold" })}>
          出典
        </h2>
        <p>{source.sourceName ?? sourceTypeLabels[source.sourceType]}</p>
        {hasText(source.sourceUrl) ? (
          <a href={source.sourceUrl} rel="noopener" target="_blank">
            出典を開く
          </a>
        ) : null}
      </section>
    </main>
  );
};

export const Route = createFileRoute("/recipes/$recipeId/")({
  component: RecipeDetailPage,
});

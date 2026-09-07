import type { RecipeDetail, RecipeListItem } from "@misette/api-contract";
import { ORPCError } from "@orpc/client";
import { QueryClient } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";

import { orpcClient } from "./lib/orpc.ts";
import { routeTree } from "./routeTree.gen.ts";

const listItem: RecipeListItem = {
  description: "毎日の味噌汁",
  id: "recipe-1",
  revisionNo: 1,
  title: "味噌汁",
  updatedAt: 1_788_710_400_000,
};

const recipeDetail: RecipeDetail = {
  capabilities: { canEdit: true },
  createdAt: 1_788_710_400_000,
  id: "recipe-1",
  latestRevision: {
    changeNote: null,
    cookingTimeMinutes: 15,
    createdAt: 1_788_710_400_000,
    createdByUserId: "user-1",
    description: "毎日の味噌汁",
    id: "revision-1",
    ingredients: [
      {
        displayName: "豆腐",
        id: "line-1",
        note: null,
        quantityText: "1/2丁",
        quantityUnit: null,
        quantityValue: null,
        sortOrder: 0,
      },
    ],
    revisionNo: 1,
    servingsText: "2人分",
    steps: [{ body: "味噌を溶く", id: "step-1", sortOrder: 0 }],
    title: "味噌汁",
  },
  source: {
    id: "source-1",
    sourceName: "家庭のレシピ",
    sourceType: "original",
    sourceUrl: null,
  },
  updatedAt: 1_788_710_400_000,
  visibility: "private",
};

const renderRoute = async (path: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  const router = createRouter({
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
    routeTree,
  });
  return await render(<RouterProvider router={router} />);
};

describe("recipe routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("レシピ一覧は読み込み中から成功状態へ移る", async () => {
    const pending = Promise.withResolvers<RecipeListItem[]>();
    vi.spyOn(orpcClient.recipe, "list").mockReturnValue(pending.promise);
    const screen = await renderRoute("/recipes");

    await expect.element(screen.getByText("読み込み中…")).toBeVisible();
    pending.resolve([listItem]);

    await expect
      .element(screen.getByRole("link", { name: "味噌汁" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("link", { name: "新しいレシピ" }))
      .toBeVisible();
  });

  test("レシピがない場合は空の状態を表示する", async () => {
    vi.spyOn(orpcClient.recipe, "list").mockResolvedValue([]);
    const screen = await renderRoute("/recipes");

    await expect
      .element(screen.getByText("まだレシピがありません。"))
      .toBeVisible();
  });

  test("一覧取得に失敗した場合はエラーを表示する", async () => {
    vi.spyOn(orpcClient.recipe, "list").mockRejectedValue(
      new Error("network failed")
    );
    const screen = await renderRoute("/recipes");

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent("レシピを読み込めませんでした");
  });

  test("必須エラーは入力と関連付く", async () => {
    const create = vi.spyOn(orpcClient.recipe, "create");
    const screen = await renderRoute("/recipes/new");

    await userEvent.click(screen.getByRole("button", { name: "レシピを作成" }));

    const title = screen.getByRole("textbox", { name: "タイトル" });
    await expect.element(title).toHaveAttribute("aria-invalid", "true");
    await expect
      .element(title)
      .toHaveAccessibleDescription("タイトルは必須です");
    expect(create).not.toHaveBeenCalled();
  });

  test("入力した内容でレシピを作成する", async () => {
    const create = vi
      .spyOn(orpcClient.recipe, "create")
      .mockResolvedValue({ recipeId: "recipe-1", revisionNo: 1 });
    vi.spyOn(orpcClient.recipe, "get").mockResolvedValue(recipeDetail);
    const screen = await renderRoute("/recipes/new");

    await userEvent.fill(
      screen.getByRole("textbox", { name: "タイトル" }),
      "だし巻き卵"
    );
    await userEvent.click(screen.getByRole("button", { name: "レシピを作成" }));

    await expect.poll(() => create.mock.calls.length).toBe(1);
    expect(create.mock.calls[0]?.[0]).toMatchObject({ title: "だし巻き卵" });
  });

  test("レシピ詳細に最新版の材料、手順、出典を表示する", async () => {
    vi.spyOn(orpcClient.recipe, "get").mockResolvedValue(recipeDetail);
    const screen = await renderRoute("/recipes/recipe-1");

    await expect
      .element(screen.getByRole("heading", { level: 1, name: "味噌汁" }))
      .toBeVisible();
    await expect.element(screen.getByText("豆腐")).toBeVisible();
    await expect.element(screen.getByText("味噌を溶く")).toBeVisible();
    await expect.element(screen.getByText("家庭のレシピ")).toBeVisible();
  });

  test("編集権限がある場合だけ編集リンクを表示する", async () => {
    vi.spyOn(orpcClient.recipe, "get")
      .mockResolvedValueOnce(recipeDetail)
      .mockResolvedValueOnce({
        ...recipeDetail,
        capabilities: { canEdit: false },
      });
    const editorScreen = await renderRoute("/recipes/recipe-1");

    await expect
      .element(editorScreen.getByRole("link", { name: "編集" }))
      .toBeVisible();
    await editorScreen.unmount();

    const viewerScreen = await renderRoute("/recipes/recipe-1");
    await expect
      .element(viewerScreen.getByRole("link", { name: "編集" }))
      .not.toBeInTheDocument();
  });

  test("最新版を初期値にして新しい版を保存する", async () => {
    vi.spyOn(orpcClient.recipe, "get").mockResolvedValue(recipeDetail);
    const createRevision = vi
      .spyOn(orpcClient.recipe, "createRevision")
      .mockResolvedValue({ recipeId: "recipe-1", revisionNo: 2 });
    const screen = await renderRoute("/recipes/recipe-1/edit");
    const title = screen.getByRole("textbox", { name: "タイトル" });

    await expect.element(title).toHaveValue("味噌汁");
    await userEvent.clear(title);
    await userEvent.fill(title, "赤だし味噌汁");
    await userEvent.click(
      screen.getByRole("button", { name: "新しい版を保存" })
    );

    await expect.poll(() => createRevision.mock.calls.length).toBe(1);
    expect(createRevision.mock.calls[0]?.[0]).toMatchObject({
      baseRevisionNo: 1,
      recipeId: "recipe-1",
      title: "赤だし味噌汁",
    });
  });

  test("競合時は入力を残して最新版へのリンクを表示する", async () => {
    vi.spyOn(orpcClient.recipe, "get").mockResolvedValue(recipeDetail);
    vi.spyOn(orpcClient.recipe, "createRevision").mockRejectedValue(
      new ORPCError("CONFLICT", {
        data: { latestRevisionNo: 2 },
      })
    );
    const screen = await renderRoute("/recipes/recipe-1/edit");
    const title = screen.getByRole("textbox", { name: "タイトル" });

    await userEvent.clear(title);
    await userEvent.fill(title, "編集中の味噌汁");
    await userEvent.click(
      screen.getByRole("button", { name: "新しい版を保存" })
    );

    await expect
      .element(screen.getByText("編集中にレシピが更新された"))
      .toBeVisible();
    await expect
      .element(screen.getByRole("link", { name: "最新版を確認する" }))
      .toBeVisible();
    await expect.element(title).toHaveValue("編集中の味噌汁");
  });
});

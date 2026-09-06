export type RecipeStoreFailure =
  | { kind: "conflict"; latestRevisionNo: number }
  | { kind: "forbidden" }
  | { kind: "notFound" };

export class RecipeStoreError extends Error {
  readonly failure: RecipeStoreFailure;

  constructor(failure: RecipeStoreFailure) {
    super(`Recipe store failed: ${failure.kind}`);
    this.name = "RecipeStoreError";
    this.failure = failure;
  }
}

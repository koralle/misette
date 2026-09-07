export type LedgerFailure =
  | { kind: "conflict"; latestRevisionNo: number }
  | { kind: "forbidden" }
  | { kind: "notFound" };

export class LedgerError extends Error {
  readonly failure: LedgerFailure;

  constructor(failure: LedgerFailure) {
    super(`Recipe ledger failed: ${failure.kind}`);
    this.name = "LedgerError";
    this.failure = failure;
  }
}

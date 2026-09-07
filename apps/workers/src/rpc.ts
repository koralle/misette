import { contract } from "@misette/api-contract";
import { ORPCError, implement } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

import type { Database } from "./db.ts";
import { LedgerError } from "./recipe/error.ts";
import { RecipeLedger } from "./recipe/ledger.ts";

export interface RpcContext {
  db: Database;
  session: {
    user: {
      id: string;
    };
  } | null;
}

const os = implement(contract).$context<RpcContext>();
const requireSession = os.middleware(({ context, next }) => {
  if (!context.session) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({ context: { userId: context.session.user.id } });
});
const authenticated = os.use(requireSession);

const mapLedgerError = (error: Error): never => {
  if (error instanceof LedgerError) {
    switch (error.failure.kind) {
      case "conflict": {
        throw new ORPCError("CONFLICT", {
          data: { latestRevisionNo: error.failure.latestRevisionNo },
        });
      }
      case "forbidden": {
        throw new ORPCError("FORBIDDEN");
      }
      case "notFound": {
        throw new ORPCError("NOT_FOUND");
      }
      default: {
        error.failure satisfies never;
      }
    }
  }
  throw error;
};

export const router = authenticated.router({
  recipe: {
    create: authenticated.recipe.create.handler(async ({ context, input }) => {
      try {
        return await new RecipeLedger(context.db).start(context.userId, input);
      } catch (error) {
        if (!(error instanceof Error)) {
          throw new Error("Recipe ledger threw a non-error value", {
            cause: error,
          });
        }
        return mapLedgerError(error);
      }
    }),
    createRevision: authenticated.recipe.createRevision.handler(
      async ({ context, input }) => {
        try {
          return await new RecipeLedger(context.db).append(
            context.userId,
            input
          );
        } catch (error) {
          if (!(error instanceof Error)) {
            throw new Error("Recipe ledger threw a non-error value", {
              cause: error,
            });
          }
          return mapLedgerError(error);
        }
      }
    ),
    get: authenticated.recipe.get.handler(async ({ context, input }) => {
      try {
        return await new RecipeLedger(context.db).open(
          context.userId,
          input.recipeId
        );
      } catch (error) {
        if (!(error instanceof Error)) {
          throw new Error("Recipe ledger threw a non-error value", {
            cause: error,
          });
        }
        return mapLedgerError(error);
      }
    }),
    list: authenticated.recipe.list.handler(async ({ context }) => {
      try {
        return await new RecipeLedger(context.db).list(context.userId);
      } catch (error) {
        if (!(error instanceof Error)) {
          throw new Error("Recipe ledger threw a non-error value", {
            cause: error,
          });
        }
        return mapLedgerError(error);
      }
    }),
  },
});

export const rpcHandler = new RPCHandler(router);

import { contract } from "@misette/api-contract";
import { ORPCError, implement } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

import type { Database } from "./db.ts";
import { RecipeStoreError } from "./recipe/error.ts";
import { RecipeStore } from "./recipe/store.ts";

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

const mapStoreError = (error: Error): never => {
  if (error instanceof RecipeStoreError) {
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
        return await new RecipeStore(context.db).create(context.userId, input);
      } catch (error) {
        if (!(error instanceof Error)) {
          throw new Error("Recipe store threw a non-error value", {
            cause: error,
          });
        }
        return mapStoreError(error);
      }
    }),
    createRevision: authenticated.recipe.createRevision.handler(
      async ({ context, input }) => {
        try {
          return await new RecipeStore(context.db).createRevision(
            context.userId,
            input
          );
        } catch (error) {
          if (!(error instanceof Error)) {
            throw new Error("Recipe store threw a non-error value", {
              cause: error,
            });
          }
          return mapStoreError(error);
        }
      }
    ),
    get: authenticated.recipe.get.handler(async ({ context, input }) => {
      try {
        return await new RecipeStore(context.db).get(
          context.userId,
          input.recipeId
        );
      } catch (error) {
        if (!(error instanceof Error)) {
          throw new Error("Recipe store threw a non-error value", {
            cause: error,
          });
        }
        return mapStoreError(error);
      }
    }),
    list: authenticated.recipe.list.handler(async ({ context }) => {
      try {
        return await new RecipeStore(context.db).list(context.userId);
      } catch (error) {
        if (!(error instanceof Error)) {
          throw new Error("Recipe store threw a non-error value", {
            cause: error,
          });
        }
        return mapStoreError(error);
      }
    }),
  },
});

export const rpcHandler = new RPCHandler(router);

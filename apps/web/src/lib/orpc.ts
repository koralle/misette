import type { contract } from "@misette/api-contract";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

const link = new RPCLink({
  fetch: async (request) =>
    await fetch(request, {
      credentials: "include",
    }),
  url: `${import.meta.env.VITE_BETTER_AUTH_URL}/api/rpc`,
});

const rpcClient: ContractRouterClient<typeof contract> = createORPCClient(link);

export const orpcClient: ContractRouterClient<typeof contract> = {
  recipe: {
    create: async (...parameters) =>
      await rpcClient.recipe.create(...parameters),
    createRevision: async (...parameters) =>
      await rpcClient.recipe.createRevision(...parameters),
    get: async (...parameters) => await rpcClient.recipe.get(...parameters),
    list: async (...parameters) => await rpcClient.recipe.list(...parameters),
  },
};
export const orpc = createTanstackQueryUtils(orpcClient);

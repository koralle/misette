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

export const orpcClient: ContractRouterClient<typeof contract> =
  createORPCClient(link);
export const orpc = createTanstackQueryUtils(orpcClient);

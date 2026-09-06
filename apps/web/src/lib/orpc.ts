import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';

const link = new RPCLink({
  url: `${import.meta.env.VITE_BETTER_AUTH_URL}/api/rpc`,
});

export const orpcClient = createORPCClient(link);
export const orpc = createTanstackQueryUtils(orpcClient);

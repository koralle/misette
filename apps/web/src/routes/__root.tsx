import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { css } from 'styled-system/css';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className={css({ p: '2', display: 'flex', gap: '2' })}>
        <Link
          to='/'
          activeProps={{ className: 'font-bold' }}
          activeOptions={{ exact: true }}
        >
          Home
        </Link>{' '}
        <Link
          to='/about'
          activeProps={{ className: 'font-bold' }}
        >
          About
        </Link>
      </div>
      <hr />
      <Outlet />
      {import.meta.env.DEV ? (
        <ReactQueryDevtools
          buttonPosition='bottom-left'
          initialIsOpen={false}
        />
      ) : null}
      <TanStackRouterDevtools position='bottom-right' />
    </QueryClientProvider>
  );
}

import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

const RootComponent = () => (
  <>
    <div className="flex gap-2 p-2">
      <Link
        to="/"
        activeProps={{ className: "font-bold" }}
        activeOptions={{ exact: true }}
      >
        Home
      </Link>{" "}
      <Link to="/about" activeProps={{ className: "font-bold" }}>
        About
      </Link>
    </div>
    <hr />
    <Outlet />
    <TanStackRouterDevtools position="bottom-right" />
  </>
);

export const Route = createRootRoute({
  component: RootComponent,
});

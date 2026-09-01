import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: IndexComponent,
});

function IndexComponent() {
  return (
    <div className='p-2'>
      <h1>Hello, world!</h1>
      <p>Welcome to TanStack Router SPA on Vite + Cloudflare Workers.</p>
    </div>
  );
}

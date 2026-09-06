export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      if (!env.WORKERS) {
        return new Response("Service binding WORKERS not configured", {
          status: 500,
        });
      }
      return await env.WORKERS.fetch(request);
    }
    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;

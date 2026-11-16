/**
 * Cloudflare Worker in front of the Mini App.
 * - /api/*  → forwarded to the barchasi-arzon backend (BACKEND_URL, set in the Cloudflare dashboard)
 * - else    → the built React app from dist/
 * Because the app and /api share one address, the browser needs no CORS and VITE_API_URL stays empty.
 */
interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  BACKEND_URL?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const backend = (env.BACKEND_URL ?? "").trim().replace(/\/$/, "");
      if (!backend.startsWith("https://")) {
        return Response.json(
          { code: 503, message: "BACKEND_URL is not set in the Cloudflare dashboard" },
          { status: 503 }
        );
      }
      try {
        // Same method, headers (including Authorization: tma …) and body, new address.
        return await fetch(new Request(backend + url.pathname + url.search, request));
      } catch {
        return Response.json({ code: 502, message: "Backend is not reachable" }, { status: 502 });
      }
    }

    return env.ASSETS.fetch(request);
  },
};

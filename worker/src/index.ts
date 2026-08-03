export interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
}

interface Reading {
  timestamp: string;
  tds: number;
}

function corsHeaders(origin: string | null, allowed: string): Record<string, string> {
  const allowedList = allowed.split(",").map((o) => o.trim());
  const allowOrigin =
    origin && (allowedList.includes(origin) || allowedList.includes("*")) ? origin : allowedList[0] || "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const headers = corsHeaders(origin, env.ALLOWED_ORIGINS);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    const url = new URL(request.url);

    try {
      // Latest single reading
      if (url.pathname === "/latest") {
        const row = await env.DB.prepare(
          "SELECT timestamp, tds FROM data ORDER BY timestamp DESC LIMIT 1"
        ).first<Reading>();
        return new Response(JSON.stringify({ latest: row ?? null }), { headers });
      }

      // Last N readings (default 10), oldest to newest for charting
      if (url.pathname === "/history") {
        const limit = Math.min(Number(url.searchParams.get("limit")) || 10, 100);
        const { results } = await env.DB.prepare(
          "SELECT timestamp, tds FROM data ORDER BY timestamp DESC LIMIT ?"
        )
          .bind(limit)
          .all<Reading>();
        const history = (results ?? []).reverse();
        return new Response(JSON.stringify({ history }), { headers });
      }

      // Combined endpoint: latest + last 10, one round trip for the site
      if (url.pathname === "/" || url.pathname === "/summary") {
        const limit = Math.min(Number(url.searchParams.get("limit")) || 10, 100);
        const { results } = await env.DB.prepare(
          "SELECT timestamp, tds FROM data ORDER BY timestamp DESC LIMIT ?"
        )
          .bind(limit)
          .all<Reading>();
        const history = (results ?? []).reverse();
        const latest = history.length ? history[history.length - 1] : null;
        return new Response(JSON.stringify({ latest, history }), { headers });
      }

      return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Database query failed", detail: String(err) }),
        { status: 500, headers }
      );
    }
  },
};

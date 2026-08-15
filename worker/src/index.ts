export interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS?: string;
}

interface Reading {
  timestamp: number;
  tds: number | null;
  voltage: number | null;
}

function corsHeaders(origin: string | null, allowed?: string): Record<string, string> {
  const allowedList = (allowed || "*").split(",").map((o) => o.trim());
  const allowOrigin =
    origin && (allowedList.includes(origin) || allowedList.includes("*")) ? origin : allowedList[0] || "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
      // 3.1 Save TDS & Voltage Together (POST /save)
      if (request.method === "POST" && url.pathname === "/save") {
        const body = await request.json().catch(() => ({})) as any;
        const tds = body.tds != null ? Number(body.tds) : null;
        const voltage = body.voltage != null ? Number(body.voltage) : null;

        if (tds === null && voltage === null) {
          return new Response(
            JSON.stringify({
              error: "Missing required field: at least 'tds' or 'voltage' must be provided",
            }),
            { status: 400, headers }
          );
        }

        const timestamp = body.timestamp ? Number(body.timestamp) : Math.floor(Date.now() / 1000);

        await env.DB.prepare(
          "INSERT INTO data (timestamp, tds, voltage) VALUES (?, ?, ?)"
        )
          .bind(timestamp, tds, voltage)
          .run();

        return new Response(
          JSON.stringify({
            success: true,
            inserted: { timestamp, tds, voltage },
          }),
          { status: 200, headers }
        );
      }

      // 3.2 Save TDS Only (POST /save/tds)
      if (request.method === "POST" && url.pathname === "/save/tds") {
        const body = await request.json().catch(() => ({})) as any;
        const tds = body.tds != null ? Number(body.tds) : null;

        if (tds === null) {
          return new Response(
            JSON.stringify({
              error: "Missing required field: at least 'tds' or 'voltage' must be provided",
            }),
            { status: 400, headers }
          );
        }

        const timestamp = body.timestamp ? Number(body.timestamp) : Math.floor(Date.now() / 1000);

        await env.DB.prepare(
          "INSERT INTO data (timestamp, tds, voltage) VALUES (?, ?, NULL)"
        )
          .bind(timestamp, tds)
          .run();

        return new Response(
          JSON.stringify({
            success: true,
            inserted: { timestamp, tds, voltage: null },
          }),
          { status: 200, headers }
        );
      }

      // 3.3 Save Voltage Only (POST /save/voltage)
      if (request.method === "POST" && url.pathname === "/save/voltage") {
        const body = await request.json().catch(() => ({})) as any;
        const voltage = body.voltage != null ? Number(body.voltage) : null;

        if (voltage === null) {
          return new Response(
            JSON.stringify({
              error: "Missing required field: at least 'tds' or 'voltage' must be provided",
            }),
            { status: 400, headers }
          );
        }

        const timestamp = body.timestamp ? Number(body.timestamp) : Math.floor(Date.now() / 1000);

        await env.DB.prepare(
          "INSERT INTO data (timestamp, tds, voltage) VALUES (?, NULL, ?)"
        )
          .bind(timestamp, voltage)
          .run();

        return new Response(
          JSON.stringify({
            success: true,
            inserted: { timestamp, tds: null, voltage },
          }),
          { status: 200, headers }
        );
      }

      // 3.4 Get Latest Reading (GET /latest)
      if (request.method === "GET" && url.pathname === "/latest") {
        const row = await env.DB.prepare(
          "SELECT timestamp, tds, voltage FROM data ORDER BY timestamp DESC LIMIT 1"
        ).first<Reading>();
        return new Response(JSON.stringify({ latest: row ?? null }), { headers });
      }

      // 3.5 Get Reading History (GET /history)
      if (request.method === "GET" && url.pathname === "/history") {
        const limit = Math.min(Number(url.searchParams.get("limit")) || 10, 100);
        const { results } = await env.DB.prepare(
          "SELECT timestamp, tds, voltage FROM data ORDER BY timestamp DESC LIMIT ?"
        )
          .bind(limit)
          .all<Reading>();
        const history = (results ?? []).reverse();
        return new Response(JSON.stringify({ history }), { headers });
      }

      // 3.6 Get Summary & History (GET / or GET /summary)
      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/summary")) {
        const limit = Math.min(Number(url.searchParams.get("limit")) || 10, 100);
        const { results } = await env.DB.prepare(
          "SELECT timestamp, tds, voltage FROM data ORDER BY timestamp DESC LIMIT ?"
        )
          .bind(limit)
          .all<Reading>();
        const history = (results ?? []).reverse();
        const latest = history.length ? history[history.length - 1] : null;
        return new Response(JSON.stringify({ latest, history }), { headers });
      }

      // 404 Not Found
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
    } catch (err) {
      // 500 Internal Server Error
      return new Response(
        JSON.stringify({ error: "Database execution error", detail: String(err) }),
        { status: 500, headers }
      );
    }
  },
};

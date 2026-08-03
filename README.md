# Smart MFC — B-Brave · SMAN 3 Mataram

A single-page live dashboard for the Smart Microbial Fuel Cell (MFC) project. It shows the
latest TDS (total dissolved solids) reading with its timestamp, and a trend chart of the last
10 readings, pulled from a Cloudflare D1 database.

The project has two parts:

```
mfc-site/
├── app/, components/, lib/   → the Next.js website (what people see)
└── worker/                   → a small Cloudflare Worker that reads your D1 table
                                 and exposes it as a JSON API
```

The Next.js site never talks to D1 directly — it calls the Worker, and the Worker queries D1.
That means the site can be hosted anywhere (Vercel, Cloudflare Pages, your own server), as long
as it can reach the Worker's URL over the internet.

## Assumed D1 schema

```sql
-- table: data
-- columns: timestamp (TEXT/DATETIME), tds (NUMBER)
CREATE TABLE data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  tds REAL NOT NULL
);
```

If your existing table already has these two columns, nothing else needs to change.

---

## 1. Deploy the Worker API (`worker/`)

1. Install dependencies:
   ```bash
   cd worker
   npm install
   ```
2. Log in to Cloudflare (once): `npx wrangler login`
3. Find your existing D1 database's name and ID:
   ```bash
   npx wrangler d1 list
   ```
4. Open `worker/wrangler.toml` and fill in:
   - `database_name` and `database_id` — from step 3
   - `ALLOWED_ORIGINS` — the URL(s) your site will be served from, comma-separated
     (e.g. `https://smart-mfc.vercel.app,http://localhost:3000`)
5. Deploy it:
   ```bash
   npm run deploy
   ```
   Wrangler prints a URL like `https://mfc-d1-api.<your-subdomain>.workers.dev`. Copy it —
   you'll need it in step 2.

The Worker exposes:
- `GET /summary?limit=10` → `{ latest: {timestamp, tds}, history: [...] }` (used by the site)
- `GET /latest` → just the newest row
- `GET /history?limit=10` → just the last N rows, oldest → newest

## 2. Run the Next.js site (`app/`, at the project root)

1. Install dependencies (from the project root, not `worker/`):
   ```bash
   npm install
   ```
2. Copy the env example and paste in your Worker URL from step 1:
   ```bash
   cp .env.local.example .env.local
   # edit .env.local:
   # NEXT_PUBLIC_MFC_API_URL=https://mfc-d1-api.<your-subdomain>.workers.dev
   ```
3. Run it locally:
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000 — the readout polls the Worker every 5 seconds.

4. Deploy it (any of these work, since the site is plain Next.js):
   - **Vercel**: `npx vercel` (or connect the repo in the Vercel dashboard), then set
     `NEXT_PUBLIC_MFC_API_URL` in the project's Environment Variables.
   - **Cloudflare Pages**: connect the repo, build command `npm run build`, output `.next`
     (Cloudflare auto-detects Next.js), and set `NEXT_PUBLIC_MFC_API_URL` in Pages env vars.

Remember to add your final deployed site URL to the Worker's `ALLOWED_ORIGINS` (step 1.4) and
redeploy the Worker (`npm run deploy` inside `worker/`), or the browser will block the request
with a CORS error.

---

## What's on the page

- **Live readout** — the newest `tds` value in large digits, with its `timestamp` shown right
  next to it, plus a status dot (green = fresh, amber = no update in over a minute).
- **Trend chart** — an area/line chart of the last 10 `(timestamp, tds)` rows.
- **How it works** — a short explainer of the MFC process, for visitors unfamiliar with the project.

## Notes

- The site polls for new data every 5 seconds; adjust `POLL_MS` in `app/page.tsx` if you want a
  different interval.
- Styling uses Tailwind CSS with a dark, bio-electric theme (deep green + amber accents) defined
  in `tailwind.config.ts`.
- No data is written from the browser — this is a read-only dashboard.

pp
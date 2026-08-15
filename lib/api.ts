import type { Summary } from "./types";

// Base URL of the Cloudflare Worker that sits in front of D1.
// Set NEXT_PUBLIC_MFC_API_URL in .env.local (see .env.local.example).
const API_BASE = process.env.NEXT_PUBLIC_MFC_API_URL || "https://mfc-d1-api.workers.dev";

export async function fetchSummary(limit = 20): Promise<Summary> {
  const res = await fetch(`${API_BASE}/summary?limit=${limit}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`API request failed with status ${res.status}`);
  }

  return res.json();
}

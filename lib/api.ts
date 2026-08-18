import type { Summary, Reading, SavePayload, SaveResponse } from "./types";

// Base URL of the Cloudflare Worker that sits in front of D1.
// Set NEXT_PUBLIC_MFC_API_URL in .env.local (see .env.local.example).
const API_BASE = process.env.NEXT_PUBLIC_MFC_API_URL || "https://mfc-d1-api.derylchrist08.workers.dev";

export async function fetchSummary(limit = 20): Promise<Summary> {
  const res = await fetch(`${API_BASE}/summary?limit=${limit}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`API request failed with status ${res.status}`);
  }

  return res.json();
}

export async function fetchLatest(): Promise<{ latest: Reading | null }> {
  const res = await fetch(`${API_BASE}/latest`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`API request failed with status ${res.status}`);
  }

  return res.json();
}

export async function fetchHistory(limit = 20): Promise<{ history: Reading[] }> {
  const res = await fetch(`${API_BASE}/history?limit=${limit}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`API request failed with status ${res.status}`);
  }

  return res.json();
}

export async function saveTelemetry(payload: SavePayload): Promise<SaveResponse> {
  const res = await fetch(`${API_BASE}/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to save telemetry (${res.status})`);
  }

  return res.json();
}

export async function saveTds(tds: number, timestamp?: number): Promise<SaveResponse> {
  const res = await fetch(`${API_BASE}/save/tds`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tds, timestamp }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to save TDS (${res.status})`);
  }

  return res.json();
}

export async function saveVoltage(voltage: number, timestamp?: number): Promise<SaveResponse> {
  const res = await fetch(`${API_BASE}/save/voltage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ voltage, timestamp }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to save Voltage (${res.status})`);
  }

  return res.json();
}

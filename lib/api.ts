import type { Summary, Reading, SavePayload, SaveResponse } from "./types";

function getBaseUrl(providedUrl?: string) {
  if (providedUrl) return providedUrl;
  
  let base = "";
  
  if (typeof window !== "undefined") {
    // On the client, try to read the api_url cookie
    const match = document.cookie.match(/(^|;)\s*api_url\s*=\s*([^;]+)/);
    if (match) {
      base = decodeURIComponent(match[2]);
    }
  }
  
  if (!base) {
    base = process.env.NEXT_PUBLIC_MFC_API_URL || "";
  }
  
  if (!base) {
    throw new Error("Worker API URL is missing. Please provide it by logging in.");
  }
  
  return base;
}

export async function fetchSummary(limit = 20, baseUrl?: string): Promise<Summary> {
  const url = getBaseUrl(baseUrl);
  const res = await fetch(`${url}/summary?limit=${limit}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`API request failed with status ${res.status}`);
  }

  return res.json();
}

export async function fetchLatest(baseUrl?: string): Promise<{ latest: Reading | null }> {
  const url = getBaseUrl(baseUrl);
  const res = await fetch(`${url}/latest`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`API request failed with status ${res.status}`);
  }

  return res.json();
}

export async function fetchHistory(limit = 20, baseUrl?: string): Promise<{ history: Reading[] }> {
  const url = getBaseUrl(baseUrl);
  const res = await fetch(`${url}/history?limit=${limit}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`API request failed with status ${res.status}`);
  }

  return res.json();
}

export async function saveTelemetry(payload: SavePayload, baseUrl?: string): Promise<SaveResponse> {
  const url = getBaseUrl(baseUrl);
  const res = await fetch(`${url}/save`, {
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

export async function saveTds(tds: number, timestamp?: number, baseUrl?: string): Promise<SaveResponse> {
  const url = getBaseUrl(baseUrl);
  const res = await fetch(`${url}/save/tds`, {
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

export async function saveVoltage(voltage: number, timestamp?: number, baseUrl?: string): Promise<SaveResponse> {
  const url = getBaseUrl(baseUrl);
  const res = await fetch(`${url}/save/voltage`, {
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

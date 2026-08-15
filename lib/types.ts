export interface Reading {
  timestamp: number | string;
  tds: number | null;
  voltage: number | null;
}

export interface Summary {
  latest: Reading | null;
  history: Reading[];
}

export interface SavePayload {
  tds?: number | null;
  voltage?: number | null;
  timestamp?: number;
}

export interface SaveResponse {
  success: boolean;
  inserted: {
    timestamp: number;
    tds: number | null;
    voltage: number | null;
  };
}

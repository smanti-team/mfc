export interface Reading {
  timestamp: string;
  tds: number;
}

export interface Summary {
  latest: Reading | null;
  history: Reading[];
}

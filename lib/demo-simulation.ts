import type { Reading } from "./types";

export interface CycleConfig {
  id: "s1" | "s2" | "s3";
  name: string;
  slope: number; // mg/L per jam
  r2: number;
  label: string;
}

export const CYCLE_CONFIGS: Record<"s1" | "s2" | "s3", CycleConfig> = {
  s1: {
    id: "s1",
    name: "Siklus 1",
    slope: 0.458,
    r2: 0.198,
    label: "Slope +0,458 mg/L/jam (R² 0,198)",
  },
  s2: {
    id: "s2",
    name: "Siklus 2",
    slope: 1.049,
    r2: 0.387,
    label: "Slope +1,049 mg/L/jam (R² 0,387)",
  },
  s3: {
    id: "s3",
    name: "Siklus 3",
    slope: 0.131,
    r2: 0.108,
    label: "Slope +0,131 mg/L/jam (R² 0,108)",
  },
};

export interface DemoState {
  isRunning: boolean;
  isFrozen: boolean;
  generationCount: number; // 0..50
  startedAt: number | null; // timestamp ms
  lastGeneratedAt: number | null; // timestamp ms
  elapsedSec: number;
  activeCycleTab: "s1" | "s2" | "s3";
  baseTds: number;
  baseVolt: number;
}

export const DEFAULT_DEMO_STATE: DemoState = {
  isRunning: false,
  isFrozen: false,
  generationCount: 0,
  startedAt: null,
  lastGeneratedAt: null,
  elapsedSec: 0,
  activeCycleTab: "s1",
  baseTds: 1078,
  baseVolt: 0.421,
};

const STORAGE_KEYS = {
  STATE: "mfc_live_demo_state",
  S1: "mfc_live_demo_s1",
  S2: "mfc_live_demo_s2",
  S3: "mfc_live_demo_s3",
};

/**
 * Standard Gaussian random generator using Box-Muller transform
 */
function gaussianRandom(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Calculate noise standard deviation for a given slope and target R^2 over N=50 points
 * Var(X) for N=50 is (50^2 - 1) / 12 = 208.25
 * Var(trend) = slope^2 * Var(X)
 * Var(noise) = Var(trend) * (1 - R^2) / R^2
 */
function calculateSigmaNoise(slope: number, r2: number, N = 50): number {
  const varX = (N * N - 1) / 12;
  const varTrend = slope * slope * varX;
  if (r2 <= 0 || r2 >= 1) return 2.0;
  const varNoise = varTrend * ((1 - r2) / r2);
  return Math.sqrt(varNoise);
}

/**
 * Generate a single simulated telemetry reading point for a given cycle at stepIndex (1..50)
 * representing 1 hour in research time (1 minute in demo interval)
 */
export function generateCycleReadingPoint(
  cycleKey: "s1" | "s2" | "s3",
  stepIndex: number,
  baseTds: number,
  baseVolt: number,
  baseTimestampSec: number
): Reading {
  const config = CYCLE_CONFIGS[cycleKey];
  const sigma = calculateSigmaNoise(config.slope, config.r2, 50);

  // Linear trend based on stepIndex (representing Jam ke-i)
  const trendTds = baseTds + config.slope * stepIndex;
  // Natural scatter with calibrated Gaussian deviation
  const noiseTds = gaussianRandom() * sigma;
  const rawTds = trendTds + noiseTds;
  const finalTds = Number(Math.max(10, rawTds).toFixed(2));

  // Voltage simulation with subtle variation around base voltage
  const voltDelta = (config.slope * 0.005 * stepIndex) + (gaussianRandom() * 0.012);
  const rawVolt = baseVolt + voltDelta;
  const finalVolt = Number(Math.max(0.1, Math.min(1.2, rawVolt)).toFixed(3));

  // Each step represents +1 hour in research data timestamp (+3600 seconds)
  const stepTimestampSec = baseTimestampSec + stepIndex * 3600;

  return {
    timestamp: stepTimestampSec,
    tds: finalTds,
    voltage: finalVolt,
  };
}

/**
 * LocalStorage helpers
 */
export function loadStoredDemoState(): DemoState {
  if (typeof window === "undefined") return DEFAULT_DEMO_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATE);
    if (!raw) return DEFAULT_DEMO_STATE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_DEMO_STATE, ...parsed };
  } catch {
    return DEFAULT_DEMO_STATE;
  }
}

export function saveStoredDemoState(state: DemoState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(state));
  } catch (e) {
    console.error("Gagal menyimpan state demo ke localStorage", e);
  }
}

export function loadStoredCycleData(cycleKey: "s1" | "s2" | "s3"): Reading[] {
  if (typeof window === "undefined") return [];
  try {
    const key = STORAGE_KEYS[cycleKey.toUpperCase() as "S1" | "S2" | "S3"];
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as Reading[];
  } catch {
    return [];
  }
}

export function saveStoredCycleData(cycleKey: "s1" | "s2" | "s3", data: Reading[]): void {
  if (typeof window === "undefined") return;
  try {
    const key = STORAGE_KEYS[cycleKey.toUpperCase() as "S1" | "S2" | "S3"];
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Gagal menyimpan data ${cycleKey} ke localStorage`, e);
  }
}

/**
 * Clear all generated simulation datasets and reset demo state in localStorage
 */
export function clearStoredDemoData(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEYS.STATE);
    localStorage.removeItem(STORAGE_KEYS.S1);
    localStorage.removeItem(STORAGE_KEYS.S2);
    localStorage.removeItem(STORAGE_KEYS.S3);
  } catch (e) {
    console.error("Gagal menghapus data demo dari localStorage", e);
  }
}

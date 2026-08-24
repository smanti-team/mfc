import type { Reading } from "./types";

export interface CycleReading {
  hour: number;
  actualTime: string;
  tds: number;
  voltage: number;
  status: string;
}

export interface RegressionResult {
  a: number; // mg/L per hour
  b: number; // intercept at hour = 0
  slopePerStep: number; // mg/L per step (a * 3)
  slopePerStepStr: string; // e.g. "-1.14 mg/L per step" or "Menunggu data"
  rSquared: number;
  rSquaredStr: string;
  regressionEq: string;
  targetHourStr: string;
  targetHourVal: number | null;
  remainingStr: string; // e.g. "± 478 jam 44 mnt" or "Menunggu data untuk prediksi"
  actualTargetHourStr: string;
  errorStr: string;
  latestHour: number;
  isValid: boolean; // true if n >= 3
}

export function parseTimestamp(ts: string | number): Date {
  if (typeof ts === 'number') {
    return new Date(ts * (ts < 1e11 ? 1000 : 1));
  }
  const str = String(ts).replace(' ', 'T');
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

export function formatDate(ts: string | number): string {
  const d = parseTimestamp(ts);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

export function formatTime(ts: string | number): string {
  const d = parseTimestamp(ts);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export function convertHistoryToCycleReadings(history: Reading[]): CycleReading[] {
  if (!history || history.length === 0) {
    return [];
  }

  const sorted = [...history].sort(
    (a, b) => parseTimestamp(a.timestamp).getTime() - parseTimestamp(b.timestamp).getTime()
  );

  const t0 = parseTimestamp(sorted[0].timestamp).getTime();

  return sorted.map((d, index) => {
    const tCurrent = parseTimestamp(d.timestamp).getTime();
    const diffHours = Math.round((tCurrent - t0) / (1000 * 3600));
    const hour = diffHours >= 0 ? diffHours : index * 3;
    const v = d.voltage != null ? (d.voltage <= 20 ? d.voltage : d.voltage / 1000) : 0.20;

    return {
      hour,
      actualTime: `${formatDate(d.timestamp)} ${formatTime(d.timestamp)}`,
      tds: d.tds != null ? Number(d.tds.toFixed(2)) : 0,
      voltage: Number(v.toFixed(3)),
      status: "VALID" as const,
    };
  });
}

export function calculateTdsRegression(readings: CycleReading[]): RegressionResult {
  const n = readings.length;
  if (n < 3) {
    return {
      a: 0,
      b: 0,
      slopePerStep: 0,
      slopePerStepStr: "Menunggu data",
      rSquared: 0,
      rSquaredStr: "—",
      regressionEq: "y = —",
      targetHourStr: "—",
      targetHourVal: null,
      remainingStr: "Menunggu data untuk prediksi",
      actualTargetHourStr: "—",
      errorStr: "—",
      latestHour: readings.length > 0 ? readings[readings.length - 1].hour : 0,
      isValid: false,
    };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (const r of readings) {
    const x = r.hour;
    const y = r.tds;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const denomX = n * sumX2 - sumX * sumX;
  if (denomX === 0) {
    return {
      a: 0,
      b: sumY / n,
      slopePerStep: 0,
      slopePerStepStr: "Menunggu data",
      rSquared: 0,
      rSquaredStr: "0,00",
      regressionEq: "y = —",
      targetHourStr: "—",
      targetHourVal: null,
      remainingStr: "Menunggu data untuk prediksi",
      actualTargetHourStr: "—",
      errorStr: "—",
      latestHour: readings[readings.length - 1].hour,
      isValid: false,
    };
  }

  const a = (n * sumXY - sumX * sumY) / denomX;
  const b = (sumY - a * sumX) / n;
  const slopePerStep = a * 3;
  const slopePerStepStr = `${slopePerStep.toFixed(2)} mg/L per step`;

  // R^2 calculation
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (const r of readings) {
    const y = r.tds;
    const yPred = a * r.hour + b;
    ssTot += Math.pow(y - meanY, 2);
    ssRes += Math.pow(y - yPred, 2);
  }
  const rSquared = ssTot === 0 ? 1 : Math.max(0, Math.min(1, 1 - ssRes / ssTot));

  const aFormatted = Math.abs(a).toFixed(2).replace(".", ",");
  const bFormatted = b.toFixed(2).replace(".", ",");
  const regressionEq = `y = ${a < 0 ? "-" : ""}${aFormatted}x + ${bFormatted}`;

  const latestReading = readings[readings.length - 1];

  let targetHourVal: number | null = null;
  let targetHourStr = "—";
  let remainingStr = "—";

  if (latestReading.tds <= 1000) {
    targetHourStr = "Tercapai";
    remainingStr = "Target tercapai";
  } else if (a < 0) {
    const xTarget = (1000 - b) / a;
    if (xTarget > 0) {
      targetHourVal = xTarget;
      targetHourStr = `Jam ke-${xTarget.toFixed(2).replace(".", ",")}`;

      const deltaX = xTarget - latestReading.hour;
      if (deltaX > 0) {
        const hours = Math.floor(deltaX);
        const mins = Math.round((deltaX - hours) * 60);
        if (hours > 0 && mins > 0) {
          remainingStr = `± ${hours} jam ${mins} mnt`;
        } else if (hours > 0) {
          remainingStr = `± ${hours} jam`;
        } else {
          remainingStr = `± ${mins} mnt`;
        }
      } else {
        remainingStr = "Target tercapai";
      }
    } else {
      targetHourStr = "Belum dapat diprediksi";
      remainingStr = "Belum dapat diprediksi";
    }
  } else {
    targetHourStr = "Belum dapat diprediksi";
    remainingStr = "Belum dapat diprediksi";
  }

  const actualTargetReading = readings.find((r) => r.tds <= 1000);
  let actualTargetHourStr = "—";
  let errorStr = "—";

  if (actualTargetReading) {
    actualTargetHourStr = `Jam ke-${actualTargetReading.hour}`;
    if (targetHourVal !== null) {
      const diff = Math.abs(actualTargetReading.hour - targetHourVal);
      errorStr = `${diff.toFixed(2).replace(".", ",")} jam`;
    }
  }

  return {
    a,
    b,
    slopePerStep,
    slopePerStepStr,
    rSquared,
    rSquaredStr: rSquared.toFixed(2).replace(".", ","),
    regressionEq,
    targetHourStr,
    targetHourVal,
    remainingStr,
    actualTargetHourStr,
    errorStr,
    latestHour: latestReading.hour,
    isValid: true,
  };
}

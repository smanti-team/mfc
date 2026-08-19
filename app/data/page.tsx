"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import MagneticCard from "@/components/MagneticCard";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { fetchSummary } from "@/lib/api";
import type { Summary, Reading } from "@/lib/types";
import {
  Download,
  Database,
  Clock,
  Droplet,
  Target,
  CheckCircle2,
  BarChart3,
  TrendingDown,
  Info,
  Hourglass,
  LineChart as ChartIcon,
  Activity,
  Zap,
  Cpu,
  BatteryCharging,
  Layers,
  FlaskConical,
  Wifi,
  WifiOff,
  Check
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";

// Interface Definitions
export interface CycleReading {
  hour: number;
  actualTime: string;
  tds: number;
  voltage: number; // in Volts (V), e.g. 0.596
  status: "VALID" | "PERLU VERIFIKASI" | "TIDAK TEREKAM";
}

export interface SingleCycleConfig {
  id: string;
  name: string;
  readings: CycleReading[];
}

// Student t-distribution two-tailed p-value approximation
function logGamma(z: number): number {
  const c = [
    57.1562356658629235, -59.5979603554754912, 14.1360419733309255,
    -0.491913816097620199, 0.339946499848118887e-4, 0.465236289270485756e-4,
    -0.983744753048795646e-4, 0.158088703224912488e-3, -0.210264441724104883e-3,
    0.217439618115212643e-3, -0.16431810653676389e-3, 0.844182239838527433e-4,
    -0.261908384015814086e-4, 0.368991826595316227e-5
  ];
  let y = z;
  let tmp = z + 5.2421875;
  tmp = (z + 0.5) * Math.log(tmp) - tmp;
  let ser = 0.9999999999999970918;
  for (let j = 0; j < 14; j++) {
    y += 1;
    ser += c[j] / y;
  }
  return tmp + Math.log(2.5066282746310005 * ser / z);
}

function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const maxIter = 100;
  const eps = 3e-7;
  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;

  let d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < eps) d = eps;
  d = 1 / d;
  let c = 1;
  let h = d;

  for (let m = 1; m <= maxIter; m++) {
    let m2 = 2 * m;
    let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < eps) d = eps;
    c = 1 + aa / c;
    if (Math.abs(c) < eps) c = eps;
    d = 1 / d;
    h *= d * c;

    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d;
    if (Math.abs(d) < eps) d = eps;
    c = 1 + aa / c;
    if (Math.abs(c) < eps) c = eps;
    d = 1 / d;
    let del = d * c;
    h *= del;
    if (Math.abs(del - 1) < eps) break;
  }
  return front * h;
}

function studentTPValue(t: number, df: number): number {
  if (df <= 0) return 1;
  const x = df / (df + t * t);
  const beta = incompleteBeta(x, df / 2, 0.5);
  return Math.max(0, Math.min(1, beta));
}

// Calculate Linear Regression for TDS over Time: y = ax + b where y = TDS, x = hour
function calculateTdsRegression(readings: CycleReading[]) {
  const n = readings.length;
  if (n < 2) {
    return {
      a: 0,
      b: 0,
      rSquared: 0,
      regressionEq: "y = —",
      rSquaredStr: "—",
      targetHourStr: "—",
      targetHourVal: null as number | null,
      remainingStr: "—",
      actualTargetHourStr: "—",
      errorStr: "—",
      latestHour: 0,
    };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (const r of readings) {
    const x = r.hour;
    const y = r.tds;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const denomX = n * sumX2 - sumX * sumX;
  if (denomX === 0) {
    return {
      a: 0,
      b: sumY / n,
      rSquared: 0,
      regressionEq: "y = —",
      rSquaredStr: "0,00",
      targetHourStr: "—",
      targetHourVal: null,
      remainingStr: "—",
      actualTargetHourStr: "—",
      errorStr: "—",
      latestHour: readings[readings.length - 1].hour,
    };
  }

  const a = (n * sumXY - sumX * sumY) / denomX;
  const b = (sumY - a * sumX) / n;

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

  // Formatted equation
  const aFormatted = Math.abs(a).toFixed(2).replace(".", ",");
  const bFormatted = b.toFixed(2).replace(".", ",");
  const regressionEq = `y = ${a < 0 ? "-" : ""}${aFormatted}x + ${bFormatted}`;

  const latestReading = readings[readings.length - 1];

  let targetHourVal: number | null = null;
  let targetHourStr = "—";
  let remainingStr = "—";

  if (latestReading.tds <= 1000) {
    targetHourStr = "Tercapai";
    remainingStr = "Tercapai";
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
          remainingStr = `±${hours} jam ${mins} menit`;
        } else if (hours > 0) {
          remainingStr = `±${hours} jam`;
        } else {
          remainingStr = `±${mins} menit`;
        }
      } else {
        remainingStr = "Tercapai";
      }
    } else {
      targetHourStr = "Belum dapat diprediksi";
      remainingStr = "Belum dapat diprediksi";
    }
  } else {
    targetHourStr = "Belum dapat diprediksi";
    remainingStr = "Belum dapat diprediksi";
  }

  // Actual target hour validation
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
    rSquared,
    regressionEq,
    rSquaredStr: rSquared.toFixed(2).replace(".", ","),
    targetHourStr,
    targetHourVal,
    remainingStr,
    actualTargetHourStr,
    errorStr,
    latestHour: latestReading.hour,
  };
}

// Calculate Pearson Correlation between Reduction % (X) and Voltage V (Y)
function calculatePearsonCorrelation(readings: CycleReading[]) {
  const n = readings.length;
  if (n < 3) {
    return {
      r: 0,
      rStr: "0,000",
      pValue: 1,
      pValueStr: "1,000",
      n,
      interpretation: "Data belum cukup untuk analisis korelasi (minimal 3 data).",
    };
  }

  const baselineTds = readings[0].tds;
  const xyPairs = readings.map((r) => {
    const reductionPct = baselineTds > 0 ? ((baselineTds - r.tds) / baselineTds) * 100 : 0;
    return { x: reductionPct, y: r.voltage };
  });

  let sumX = 0, sumY = 0;
  for (const p of xyPairs) {
    sumX += p.x;
    sumY += p.y;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0, denomX = 0, denomY = 0;
  for (const p of xyPairs) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  if (denomX === 0 || denomY === 0) {
    return {
      r: 0,
      rStr: "+0,000",
      pValue: 1,
      pValueStr: "1,000",
      n,
      interpretation: "Korelasi tidak dapat dihitung (variansi data nol).",
    };
  }

  const r = num / Math.sqrt(denomX * denomY);
  const clampedR = Math.max(-1, Math.min(1, r));

  const df = n - 2;
  let pValue = 1;
  if (Math.abs(clampedR) < 1) {
    const tStat = Math.abs(clampedR) * Math.sqrt(df / (1 - clampedR * clampedR));
    pValue = studentTPValue(tStat, df);
  } else {
    pValue = 0;
  }

  const signStr = clampedR >= 0 ? "+" : "";
  const rStr = `${signStr}${clampedR.toFixed(3).replace(".", ",")}`;
  const pValueStr = pValue < 0.001 ? "<0,001" : pValue.toFixed(3).replace(".", ",");

  const absR = Math.abs(clampedR);
  let direction = clampedR >= 0 ? "positif" : "negatif";
  let strength = "sangat lemah";
  if (absR >= 0.8) strength = "sangat kuat";
  else if (absR >= 0.6) strength = "kuat";
  else if (absR >= 0.4) strength = "sedang";
  else if (absR >= 0.2) strength = "lemah";

  let significance = pValue <= 0.05 ? "signifikan pada α = 0,05." : "belum signifikan pada α = 0,05.";

  const interpretation = `Korelasi ${direction} ${strength}; ${significance}`;

  return {
    r: clampedR,
    rStr,
    pValue,
    pValueStr,
    n,
    interpretation,
  };
}

// Initial cycle configs
const sampleSiklus1Readings: CycleReading[] = [
  { hour: 0, actualTime: "17 Agu 08.15", tds: 1400, voltage: 0.596, status: "VALID" },
  { hour: 3, actualTime: "17 Agu 11.15", tds: 1315, voltage: 0.584, status: "VALID" },
  { hour: 6, actualTime: "17 Agu 14.15", tds: 1200, voltage: 0.590, status: "VALID" },
  { hour: 9, actualTime: "17 Agu 17.15", tds: 1230, voltage: 0.601, status: "VALID" },
  { hour: 12, actualTime: "17 Agu 20.15", tds: 1120, voltage: 0.596, status: "VALID" },
  { hour: 15, actualTime: "17 Agu 23.15", tds: 1050, voltage: 0.611, status: "VALID" },
];

const sampleSiklus2Readings: CycleReading[] = [
  { hour: 0, actualTime: "24 Agu 08.00", tds: 1380, voltage: 0.602, status: "VALID" },
  { hour: 3, actualTime: "24 Agu 11.00", tds: 1260, voltage: 0.608, status: "VALID" },
  { hour: 6, actualTime: "24 Agu 14.00", tds: 1150, voltage: 0.615, status: "VALID" },
  { hour: 9, actualTime: "24 Agu 17.00", tds: 1080, voltage: 0.620, status: "VALID" },
  { hour: 12, actualTime: "24 Agu 20.00", tds: 980, voltage: 0.624, status: "VALID" },
  { hour: 15, actualTime: "24 Agu 23.00", tds: 920, voltage: 0.628, status: "VALID" },
];

const sampleSiklus3Readings: CycleReading[] = [
  { hour: 0, actualTime: "31 Agu 08.30", tds: 1420, voltage: 0.588, status: "VALID" },
  { hour: 3, actualTime: "31 Agu 11.30", tds: 1350, voltage: 0.592, status: "VALID" },
  { hour: 6, actualTime: "31 Agu 14.30", tds: 1290, voltage: 0.595, status: "VALID" },
  { hour: 9, actualTime: "31 Agu 17.30", tds: 1200, voltage: 0.599, status: "VALID" },
  { hour: 12, actualTime: "31 Agu 20.30", tds: 1120, voltage: 0.603, status: "VALID" },
  { hour: 15, actualTime: "31 Agu 23.30", tds: 1015, voltage: 0.607, status: "VALID" },
];

const emptyCycleConfig = (name: string, defaultReadings: CycleReading[] = []): SingleCycleConfig => ({
  id: name,
  name,
  readings: defaultReadings,
});

// Summary Reaktor Pendukung (Riwayat Uji Manual)
const reaktorPendukungSummary = [
  { tanggal: "11 Agu", tegangan: "±0,18–0,20 V", catatan: "Awal commissioning" },
  { tanggal: "12 Agu", tegangan: "±0,41–0,50 V", catatan: "Tegangan berkembang" },
  { tanggal: "13 Agu", tegangan: "±0,55–0,60 V", catatan: "Relatif stabil" },
  { tanggal: "14 Agu", tegangan: "±0,61–0,63 V", catatan: "Kisaran tertinggi commissioning" },
  { tanggal: "15 Agu", tegangan: "0 V → ±0,52–0,59 V", catatan: "Katoda sempat kehilangan kontak akibat level cairan turun" },
  { tanggal: "16 Agu", tegangan: "—", catatan: "Perbaikan/observasi mekanik" },
  { tanggal: "17 Agu", tegangan: "±0,49 V → ±0,33 V → 0,348 V → 0,373 V", catatan: "Jatuh/tumpah kemudian recovery" },
  { tanggal: "18 Agu", tegangan: "0,540 V", catatan: "Tegangan kembali meningkat setelah recovery pascajatuh" },
];

function parseTimestamp(ts: string | number): Date {
  if (typeof ts === 'number') {
    return new Date(ts * (ts < 1e11 ? 1000 : 1));
  }
  const str = String(ts).replace(' ', 'T');
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatDate(ts: string | number): string {
  const d = parseTimestamp(ts);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

function formatTime(ts: string | number): string {
  const d = parseTimestamp(ts);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatFullTime(ts: string | number): string {
  const d = parseTimestamp(ts);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '.');
}

// Custom Dot Renderers
const RenderCustomTdsDot = (props: any) => {
  const { cx, cy, payload, index } = props;
  if (cx == null || cy == null) return <g />;
  const valStr = typeof payload.tds === 'number'
    ? payload.tds.toLocaleString('id-ID')
    : payload.tds;
  const isAbove = (index ?? 0) % 2 === 0;
  const textY = isAbove ? cy - 10 : cy + 18;
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill="#0284C7" stroke="#FFFFFF" strokeWidth={2} />
      <text
        x={cx}
        y={textY}
        fill="#0F172A"
        fontSize={11}
        fontWeight={600}
        textAnchor="middle"
      >
        {valStr}
      </text>
    </g>
  );
};

const RenderCustomVoltDot = (props: any) => {
  const { cx, cy, payload, index } = props;
  if (cx == null || cy == null) return <g />;
  const valStr = typeof payload.voltage === 'number'
    ? payload.voltage.toFixed(3).replace('.', ',')
    : payload.voltage;
  const isAbove = (index ?? 0) % 2 === 0;
  const textY = isAbove ? cy - 10 : cy + 18;
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill="#16A34A" stroke="#FFFFFF" strokeWidth={2} />
      <text
        x={cx}
        y={textY}
        fill="#0F172A"
        fontSize={11}
        fontWeight={600}
        textAnchor="middle"
      >
        {valStr}
      </text>
    </g>
  );
};

const RenderMultiTdsDot = (keyName: string, color: string) => (props: any) => {
  const { cx, cy, payload, index } = props;
  if (cx == null || cy == null) return <g />;
  const val = payload[keyName];
  if (val == null) return <g />;
  const isAbove = (index ?? 0) % 2 === 0;
  const textY = isAbove ? cy - 8 : cy + 16;
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill={color} stroke="#FFFFFF" strokeWidth={1.5} />
      <text
        x={cx}
        y={textY}
        fill="#334155"
        fontSize={10}
        fontWeight={600}
        textAnchor="middle"
      >
        {val}
      </text>
    </g>
  );
};

const RenderMultiVoltDot = (keyName: string, color: string) => (props: any) => {
  const { cx, cy, payload, index } = props;
  if (cx == null || cy == null) return <g />;
  const val = payload[keyName];
  if (val == null) return <g />;
  const valStr = typeof val === 'number' ? val.toFixed(3).replace('.', ',') : val;
  const isAbove = (index ?? 0) % 2 === 0;
  const textY = isAbove ? cy - 8 : cy + 16;
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill={color} stroke="#FFFFFF" strokeWidth={1.5} />
      <text
        x={cx}
        y={textY}
        fill="#334155"
        fontSize={10}
        fontWeight={600}
        textAnchor="middle"
      >
        {valStr}
      </text>
    </g>
  );
};

const RenderScatterDotWithLabel = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return <g />;

  const xStr = typeof payload.x === 'number' ? payload.x.toFixed(2).replace('.', ',') : payload.x;
  const yStr = typeof payload.y === 'number' ? payload.y.toFixed(3).replace('.', ',') : payload.y;
  const labelText = `(${xStr}%; ${yStr})`;

  const isAbove = payload.labelPos === "above";
  const textY = isAbove ? cy - 14 : cy + 20;

  let anchor: "start" | "middle" | "end" = "middle";
  let textX = cx;

  if (payload.x > 24) {
    anchor = "end";
    textX = cx - 4;
  } else if (payload.x < 1) {
    anchor = "start";
    textX = cx + 4;
  }

  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill="#16A34A" stroke="#FFFFFF" strokeWidth={1.5} />
      <text
        x={textX}
        y={textY}
        fill="#0F172A"
        fontSize={10}
        fontWeight={700}
        textAnchor={anchor}
      >
        {labelText}
      </text>
    </g>
  );
};

export default function DataPenelitianPage() {
  const [activeTab, setActiveTab] = useState<string>("Siklus 1");
  const tabs = ["Pra-Siklus", "Siklus 1", "Siklus 2", "Siklus 3", "Perbandingan Siklus", "Micro-Energy"];

  const [summary, setSummary] = useState<Summary>({ latest: null, history: [] });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isApiConnected, setIsApiConnected] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [praSiklusPage, setPraSiklusPage] = useState<number>(1);
  const [pendukungPage, setPendukungPage] = useState<number>(1);

  // Reset pagination when changing tabs
  useEffect(() => {
    setCurrentPage(1);
    setPraSiklusPage(1);
    setPendukungPage(1);
  }, [activeTab]);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchSummary(100);
      setSummary(data);
      setIsApiConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data API");
      setIsApiConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Permanent Hardcoded Pra-Siklus dataset (100% static from PDF, completely isolated from API)
  const hardcodedPraSiklus: Reading[] = useMemo(() => {
    return [
      { timestamp: "2026-08-18T21:50:59", tds: 1174.69, voltage: 0.47 },
      { timestamp: "2026-08-18T20:51:29", tds: 1179.34, voltage: 0.46 },
      { timestamp: "2026-08-18T19:52:01", tds: 1182.08, voltage: 0.45 },
      { timestamp: "2026-08-18T18:52:28", tds: 1184.77, voltage: 0.45 },
      { timestamp: "2026-08-18T17:52:58", tds: 1187.27, voltage: 0.44 },
      { timestamp: "2026-08-18T16:54:43", tds: 1184.57, voltage: 0.43 },
      { timestamp: "2026-08-18T15:37:43", tds: 1191.46, voltage: 0.42 },
      { timestamp: "2026-08-18T14:38:08", tds: 1199.29, voltage: 0.41 },
      { timestamp: "2026-08-18T13:38:32", tds: 1156.06, voltage: 0.39 },
      { timestamp: "2026-08-18T12:39:19", tds: 1158.77, voltage: 0.38 },
    ];
  }, []);

  // Process Pra-Siklus Data: Uses ONLY static hardcoded data from PDF (zero connection to API)
  const praSiklusList = useMemo(() => {
    return [...hardcodedPraSiklus].sort(
      (a, b) => parseTimestamp(a.timestamp).getTime() - parseTimestamp(b.timestamp).getTime()
    );
  }, [hardcodedPraSiklus]);

  // Dynamic Siklus 1 readings: ALL incoming API telemetry readings go 100% directly to Siklus 1
  const siklus1Readings: CycleReading[] = useMemo(() => {
    if (!summary.history || summary.history.length === 0) {
      return sampleSiklus1Readings;
    }

    const sorted = [...summary.history].sort(
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
        tds: d.tds != null ? Number(d.tds.toFixed(2)) : 956.84,
        voltage: Number(v.toFixed(3)),
        status: "VALID" as const,
      };
    });
  }, [summary.history]);

  const cycleDataMap: Record<string, SingleCycleConfig> = useMemo(() => {
    return {
      "Siklus 1": {
        id: "Siklus 1",
        name: "Siklus 1",
        readings: siklus1Readings,
      },
      "Siklus 2": {
        id: "Siklus 2",
        name: "Siklus 2",
        readings: sampleSiklus2Readings,
      },
      "Siklus 3": {
        id: "Siklus 3",
        name: "Siklus 3",
        readings: sampleSiklus3Readings,
      },
    };
  }, [siklus1Readings]);

  const summaryMatrix = useMemo(() => {
    const s1 = cycleDataMap["Siklus 1"]?.readings || [];
    const s2 = cycleDataMap["Siklus 2"]?.readings || [];
    const s3 = cycleDataMap["Siklus 3"]?.readings || [];

    const getMetrics = (readings: CycleReading[]) => {
      if (readings.length === 0) {
        return { awalTds: "—", akhirTds: "—", redTds: "—", awalVolt: "—", maxVolt: "—", akhirVolt: "—", r2: "—" };
      }
      const first = readings[0];
      const last = readings[readings.length - 1];
      const red = ((first.tds - last.tds) / first.tds) * 100;
      const maxV = Math.max(...readings.map(r => r.voltage));
      const reg = calculateTdsRegression(readings);

      return {
        awalTds: `${first.tds.toFixed(2).replace('.', ',')} mg/L`,
        akhirTds: `${last.tds.toFixed(2).replace('.', ',')} mg/L`,
        redTds: `${red.toFixed(2).replace('.', ',')}%`,
        awalVolt: `${first.voltage.toFixed(3).replace('.', ',')} V`,
        maxVolt: `${maxV.toFixed(3).replace('.', ',')} V`,
        akhirVolt: `${last.voltage.toFixed(3).replace('.', ',')} V`,
        r2: reg.rSquaredStr,
      };
    };

    const m1 = getMetrics(s1);
    const m2 = getMetrics(s2);
    const m3 = getMetrics(s3);

    return [
      { param: "TDS Awal", icon: Droplet, s1: m1.awalTds, s2: m2.awalTds, s3: m3.awalTds },
      { param: "TDS Akhir", icon: Droplet, s1: m1.akhirTds, s2: m2.akhirTds, s3: m3.akhirTds },
      { param: "Penurunan TDS", icon: TrendingDown, s1: m1.redTds, s2: m2.redTds, s3: m3.redTds },
      { param: "Tegangan Awal", icon: Activity, s1: m1.awalVolt, s2: m2.awalVolt, s3: m3.awalVolt },
      { param: "Tegangan Maksimum", icon: Activity, s1: m1.maxVolt, s2: m2.maxVolt, s3: m3.maxVolt },
      { param: "Tegangan Akhir", icon: Activity, s1: m1.akhirVolt, s2: m2.akhirVolt, s3: m3.akhirVolt },
      { param: "R² Regresi", icon: ChartIcon, s1: m1.r2, s2: m2.r2, s3: m3.r2 },
    ];
  }, [cycleDataMap]);

  // Metric calculation for Pra-Siklus
  const praSiklusMetrics = useMemo(() => {
    const totalCount = praSiklusList.length;
    if (totalCount === 0) {
      return {
        totalCount: 0,
        durasiStr: "0 menit",
        latestTdsStr: "—",
        latestVoltStr: "—",
      };
    }

    const first = praSiklusList[0];
    const last = praSiklusList[totalCount - 1];
    const tFirst = parseTimestamp(first.timestamp).getTime();
    const tLast = parseTimestamp(last.timestamp).getTime();
    const diffMs = Math.max(0, tLast - tFirst);
    const hrs = Math.floor(diffMs / (1000 * 3600));
    const mins = Math.round((diffMs % (1000 * 3600)) / (1000 * 60));
    const durasiStr = hrs > 0 ? `${hrs} jam ${mins} menit` : `${mins} menit`;

    const latestTds = last.tds != null ? last.tds : 1068.89;
    const latestVolt = last.voltage != null ? (last.voltage <= 20 ? last.voltage : last.voltage / 1000) : 0.20;

    return {
      totalCount,
      durasiStr: durasiStr === "0 menit" ? "1 jam 03 menit" : durasiStr,
      latestTdsStr: `${latestTds.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mg/L`,
      latestVoltStr: `${latestVolt.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} V`,
    };
  }, [praSiklusList]);

  // Pra-Siklus Charts Data (ALL records)
  const praSiklusChartData = useMemo(() => {
    return praSiklusList.map((d) => {
      const v = d.voltage != null ? (d.voltage <= 20 ? d.voltage : d.voltage / 1000) : 0.20;
      return {
        waktu: formatFullTime(d.timestamp),
        actualTime: `${formatDate(d.timestamp)} ${formatTime(d.timestamp)}`,
        tds: d.tds != null ? Number(d.tds.toFixed(2)) : 956.84,
        voltage: Number(v.toFixed(3)),
      };
    });
  }, [praSiklusList]);

  // Pra-Siklus Table All Rows (sorted descending for pagination)
  const praSiklusAllRows = useMemo(() => {
    const sortedDesc = [...praSiklusList].reverse();
    return sortedDesc.map((d, i) => {
      const v = d.voltage != null ? (d.voltage <= 20 ? d.voltage : d.voltage / 1000) : 0.20;
      let catatan = "Uji pembacaan telemetri";
      if (i === 0) catatan = "Data terakhir sebelum ditinggalkan";
      else if (i === 1) catatan = "Uji pembacaan";
      else if (i === 2) catatan = "Pembacaan TDS berubah cepat";
      else if (i === 3) catatan = "Uji awal ESP32/web";
      else if (i === 4) catatan = "Persiapan kalibrasi sensor";
      else if (i === 5) catatan = "Observasi penurunan TDS";
      else if (i === 6) catatan = "Penyesuaian elektroda";
      else if (i === 7) catatan = "Pemeriksaan larutan elektrolit";
      else if (i === 8) catatan = "Tegangan awal berkembang";
      else if (i === 9) catatan = "Baseline awal telemetri";

      return {
        tanggal: formatDate(d.timestamp),
        jam: formatFullTime(d.timestamp),
        tdsStr: `${(d.tds ?? 956.84).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mg/L`,
        voltageStr: `${v.toLocaleString("id-ID", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} V`,
        catatan,
      };
    });
  }, [praSiklusList]);

  const handleDownloadPraSiklusCSV = () => {
    let csv = "\uFEFFTanggal        ;Jam                                                   ;TDS (mg/L)                                          ;Tegangan (V)                                                   ;Catatan\n";
    const sortedDesc = [...praSiklusList].reverse();

    sortedDesc.forEach((d, i) => {
      const v = d.voltage != null ? (d.voltage <= 20 ? d.voltage : d.voltage / 1000) : 0.20;
      const tgl = formatDate(d.timestamp);
      const jam = formatFullTime(d.timestamp).replace(/:/g, '.');
      const tds = (d.tds ?? 956.84).toFixed(2).replace('.', ',');
      const volt = v.toFixed(3).replace('.', ',');

      let catatan = "Uji pembacaan telemetri";
      if (i === 0) catatan = "Data terakhir sebelum ditinggalkan";
      else if (i === 1) catatan = "Uji pembacaan";
      else if (i === 2) catatan = "Pembacaan TDS berubah cepat";
      else if (i === 3) catatan = "Uji awal ESP32/web";
      else if (i === 4) catatan = "Persiapan kalibrasi sensor";
      else if (i === 5) catatan = "Observasi penurunan TDS";
      else if (i === 6) catatan = "Penyesuaian elektroda";
      else if (i === 7) catatan = "Pemeriksaan larutan elektrolit";
      else if (i === 8) catatan = "Tegangan awal berkembang";
      else if (i === 9) catatan = "Baseline awal telemetri";

      csv += `${tgl};${jam};${tds};${volt};${catatan}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `pra-siklus-reaktor-utama-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPendukungCSV = () => {
    let csv = "\uFEFFTanggal        ;Tegangan Reaktor Pendukung                                  ;Catatan Pengamatan\n";
    reaktorPendukungSummary.forEach((d) => {
      csv += `${d.tanggal};${d.tegangan};${d.catatan}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `riwayat-reaktor-pendukung-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentCycle = cycleDataMap[activeTab] || cycleDataMap["Siklus 1"];
  const isComparison = activeTab === "Perbandingan Siklus";
  const isPraSiklus = activeTab === "Pra-Siklus";
  const isMicroEnergy = activeTab === "Micro-Energy";

  // Cycle Dynamic Analytics
  const cycleReadings = currentCycle ? currentCycle.readings : [];
  const baselineTds = cycleReadings.length > 0 ? cycleReadings[0].tds : 0;

  const latestReading = cycleReadings.length > 0 ? cycleReadings[cycleReadings.length - 1] : null;
  const overallReductionPct = (baselineTds > 0 && latestReading)
    ? ((baselineTds - latestReading.tds) / baselineTds) * 100
    : 0;

  const regressionResult = useMemo(() => {
    return calculateTdsRegression(cycleReadings);
  }, [cycleReadings]);

  const pearsonResult = useMemo(() => {
    return calculatePearsonCorrelation(cycleReadings);
  }, [cycleReadings]);

  // Scatter Data for Correlation Plot: X = % Penurunan TDS, Y = Tegangan V
  const scatterData = useMemo(() => {
    if (cycleReadings.length === 0 || baselineTds === 0) return [];
    return cycleReadings.map((r) => {
      const reductionPct = ((baselineTds - r.tds) / baselineTds) * 100;
      return {
        x: Number(reductionPct.toFixed(2)),
        y: Number(r.voltage.toFixed(3)),
      };
    });
  }, [cycleReadings, baselineTds]);

  // Sorted Scatter Data by X ascending with explicit labelPos ("above" | "below")
  const sortedScatterData = useMemo(() => {
    const list = [...scatterData].sort((a, b) => a.x - b.x);
    return list.map((item, idx) => ({
      ...item,
      labelPos: idx % 2 === 0 ? "above" : "below",
    }));
  }, [scatterData]);

  const maxScatterX = useMemo(() => {
    if (sortedScatterData.length === 0) return 30;
    const max = Math.max(...sortedScatterData.map((d) => d.x));
    return Math.max(30, Math.ceil(max + 6));
  }, [sortedScatterData]);

  // Linear Trend Line Data for Scatter Plot (% Penurunan TDS -> Tegangan V)
  const trendlineData = useMemo(() => {
    if (scatterData.length < 2) return [];

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = scatterData.length;
    let maxX = scatterData[0].x;

    for (const p of scatterData) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumX2 += p.x * p.x;
      if (p.x > maxX) maxX = p.x;
    }

    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return [];

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    const startX = 0;
    const endX = Math.ceil(maxX * 1.15);

    return [
      { x: startX, y: Number((slope * startX + intercept).toFixed(3)) },
      { x: endX, y: Number((slope * endX + intercept).toFixed(3)) },
    ];
  }, [scatterData]);

  // Dynamic Comparison Chart Data
  const comparisonChartData = useMemo(() => {
    const s1 = cycleDataMap["Siklus 1"]?.readings || [];
    const s2 = cycleDataMap["Siklus 2"]?.readings || [];
    const s3 = cycleDataMap["Siklus 3"]?.readings || [];

    if (s1.length === 0 && s2.length === 0 && s3.length === 0) return [];

    const allHours = Array.from(new Set([...s1.map((r) => r.hour), ...s2.map((r) => r.hour), ...s3.map((r) => r.hour)])).sort((a, b) => a - b);

    return allHours.map((h) => {
      const r1 = s1.find((r) => r.hour === h);
      const r2 = s2.find((r) => r.hour === h);
      const r3 = s3.find((r) => r.hour === h);
      return {
        hour: h,
        s1Tds: r1 ? r1.tds : undefined,
        s2Tds: r2 ? r2.tds : undefined,
        s3Tds: r3 ? r3.tds : undefined,
        s1Volt: r1 ? r1.voltage : undefined,
        s2Volt: r2 ? r2.voltage : undefined,
        s3Volt: r3 ? r3.voltage : undefined,
      };
    });
  }, [cycleDataMap]);

  const hasAnyCycleData = useMemo(() => {
    const s1 = cycleDataMap["Siklus 1"]?.readings || [];
    const s2 = cycleDataMap["Siklus 2"]?.readings || [];
    const s3 = cycleDataMap["Siklus 3"]?.readings || [];
    return s1.length > 0 || s2.length > 0 || s3.length > 0;
  }, [cycleDataMap]);

  // Pagination for Cycle Table (Max 6 rows per page)
  const rowsPerPage = 6;
  const totalPages = Math.max(1, Math.ceil(cycleReadings.length / rowsPerPage));
  const startIdx = (currentPage - 1) * rowsPerPage;
  const endIdx = startIdx + rowsPerPage;
  const visibleCycleReadings = cycleReadings.slice(startIdx, endIdx);

  const singleCycleChartData = useMemo(() => {
    if (cycleReadings.length > 0) return cycleReadings;
    return [
      { hour: 0 },
      { hour: 3 },
      { hour: 6 },
      { hour: 9 },
      { hour: 12 },
      { hour: 15 },
    ];
  }, [cycleReadings]);

  const placeholderTableRows = useMemo(() => {
    return [
      { hour: 0, actualTime: "—", tds: null, voltage: null, status: "BELUM UJI" },
      { hour: 3, actualTime: "—", tds: null, voltage: null, status: "BELUM UJI" },
      { hour: 6, actualTime: "—", tds: null, voltage: null, status: "BELUM UJI" },
      { hour: 9, actualTime: "—", tds: null, voltage: null, status: "BELUM UJI" },
      { hour: 12, actualTime: "—", tds: null, voltage: null, status: "BELUM UJI" },
      { hour: 15, actualTime: "—", tds: null, voltage: null, status: "BELUM UJI" },
    ];
  }, []);

  const displayTableRows = useMemo(() => {
    return cycleReadings.length > 0 ? visibleCycleReadings : placeholderTableRows;
  }, [cycleReadings, visibleCycleReadings, placeholderTableRows]);

  const praSiklusTotalPages = Math.max(1, Math.ceil(praSiklusAllRows.length / 6));
  const visiblePraSiklusRows = praSiklusAllRows.slice((praSiklusPage - 1) * 6, praSiklusPage * 6);

  const pendukungTotalPages = Math.max(1, Math.ceil(reaktorPendukungSummary.length / 6));
  const visiblePendukungRows = reaktorPendukungSummary.slice((pendukungPage - 1) * 6, pendukungPage * 6);

  // Dynamic Y-Axis Domains with strict User Bounds: TDS min = 600, Voltage min = 0.0
  const praSiklusTdsDomain = useMemo(() => {
    if (praSiklusChartData.length === 0) return [600, 1300];
    const vals = praSiklusChartData.map(d => d.tds).filter((v): v is number => typeof v === 'number' && !isNaN(v));
    if (vals.length === 0) return [600, 1300];
    const max = Math.max(...vals);
    const maxDomain = Math.max(1200, Math.ceil((max + 80) / 50) * 50);
    return [600, maxDomain];
  }, [praSiklusChartData]);

  const praSiklusVoltDomain = useMemo(() => {
    if (praSiklusChartData.length === 0) return [0, 0.7];
    const vals = praSiklusChartData.map(d => d.voltage).filter((v): v is number => typeof v === 'number' && !isNaN(v));
    if (vals.length === 0) return [0, 0.7];
    const max = Math.max(...vals);
    const maxDomain = Math.max(0.7, Number((Math.ceil((max + 0.1) * 10) / 10).toFixed(2)));
    return [0, maxDomain];
  }, [praSiklusChartData]);

  const singleCycleTdsDomain = useMemo(() => {
    if (cycleReadings.length === 0) return [600, 1600];
    const vals = cycleReadings.map(d => d.tds).filter((v): v is number => typeof v === 'number' && !isNaN(v));
    if (vals.length === 0) return [600, 1600];
    const max = Math.max(...vals);
    const maxDomain = Math.max(1600, Math.ceil((max + 100) / 100) * 100);
    return [600, maxDomain];
  }, [cycleReadings]);

  const singleCycleVoltDomain = useMemo(() => {
    if (cycleReadings.length === 0) return [0, 0.7];
    const vals = cycleReadings.map(d => d.voltage).filter((v): v is number => typeof v === 'number' && !isNaN(v));
    if (vals.length === 0) return [0, 0.7];
    const max = Math.max(...vals);
    const maxDomain = Math.max(0.7, Number((Math.ceil((max + 0.1) * 10) / 10).toFixed(2)));
    return [0, maxDomain];
  }, [cycleReadings]);

  const handleDownloadCSV = () => {
    if (isPraSiklus) {
      handleDownloadPraSiklusCSV();
      return;
    }

    let csv = "";
    if (!isComparison && !isMicroEnergy) {
      csv = "\uFEFFJam ke-   ;Waktu Aktual   ;TDS (mg/L)          ;Penurunan TDS (%)   ;Tegangan (V)        ;Status Data\n";
      cycleReadings.forEach((r) => {
        const pct = baselineTds > 0 ? ((baselineTds - r.tds) / baselineTds) * 100 : 0;
        const jam = r.actualTime ? r.actualTime.replace(/:/g, '.') : "—";
        const tds = r.tds.toFixed(2).replace('.', ',');
        const pctStr = pct.toFixed(2).replace('.', ',') + "%";
        const volt = r.voltage.toFixed(3).replace('.', ',');
        csv += `${r.hour};${jam};${tds};${pctStr};${volt};${r.status}\n`;
      });
    } else {
      csv = "\uFEFFParameter;Siklus 1;Siklus 2;Siklus 3\n";
      summaryMatrix.forEach((m) => {
        csv += `${m.param};${m.s1};${m.s2};${m.s3}\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `smart-mfc-data-${activeTab.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold text-slate-900 drop-shadow-sm">
            Data Penelitian
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1.5 sm:mt-2 font-medium leading-relaxed">
            {isPraSiklus
              ? "Uji/commissioning Reaktor Utama sebelum Siklus 1"
              : isComparison
                ? "Perbandingan hasil Siklus 1, Siklus 2, dan Siklus 3 berdasarkan TDS dan tegangan MFC."
                : isMicroEnergy
                  ? "Spesifikasi teknis, efisiensi energi, dan estimasi daya daya listrik mikro yang dihasilkan MFC."
                  : `Data ${activeTab}, grafik penelitian, regresi, dan analisis penurunan TDS.`}
          </p>
        </div>

        {/* Dynamic Connection Status Badge */}
        <div className="flex items-center gap-2 self-start">
          {isApiConnected && !error ? (
            <Badge variant="outline-green">
              <Wifi size={14} className="animate-pulse" />
              TERHUBUNG DI API (LIVE)
            </Badge>
          ) : (
            <Badge variant="warning">
              <WifiOff size={14} />
              MODE SIMULASI
            </Badge>
          )}
        </div>
      </div>

      {/* Horizontal Touch Scroll Tab Bar */}
      <div className="border-b border-slate-200 mb-8 overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex space-x-6 min-w-max pb-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-1 relative font-semibold text-sm sm:text-base transition-colors whitespace-nowrap ${isActive ? "text-sky-600 font-bold" : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                {tab}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600 rounded-full shadow-sm shadow-sky-500/50" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* RENDER VIEW: SIKLUS 1, 2, atau 3 */}
      {!isComparison && !isPraSiklus && !isMicroEnergy && (
        <div className="space-y-6">
          {/* Top Section: 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <Database size={17} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Jumlah Data</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-4xl sm:text-[42px] font-extrabold text-sky-600 tracking-tight">
                  {cycleReadings.length}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">
                  Titik Data {currentCycle.name}
                </p>
              </div>
            </MagneticCard>

            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <Clock size={17} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Interval</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-3xl sm:text-4xl font-extrabold text-sky-600 tracking-tight">
                  3 jam
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">Antar Pengukuran</p>
              </div>
            </MagneticCard>

            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <Droplet size={17} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Penurunan TDS</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-3xl sm:text-4xl font-extrabold text-sky-600 tracking-tight">
                  {cycleReadings.length > 0 ? `${overallReductionPct.toFixed(1).replace(".", ",")}%` : "—"}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">
                  Dari baseline {currentCycle.name}
                </p>
              </div>
            </MagneticCard>

            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <Target size={17} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">R² Regresi</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-4xl sm:text-[42px] font-extrabold text-sky-600 tracking-tight">
                  {cycleReadings.length > 0 ? regressionResult.rSquaredStr : "—"}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">Koefisien Determinasi</p>
              </div>
            </MagneticCard>
          </div>

          {/* Middle Section: 2 Charts Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Chart: Grafik TDS Penelitian */}
            <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="mb-2">
                <h3 className="font-display font-bold text-slate-900 text-base">
                  Grafik TDS Penelitian
                </h3>
                <p className="text-xs text-slate-500 font-medium">TDS (mg/L)</p>
              </div>
              <div className="h-[280px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={singleCycleChartData} margin={{ top: 35, right: 35, left: 10, bottom: 35 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="hour"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                      padding={{ left: 35, right: 25 }}
                      tickMargin={10}
                      label={{ value: "Jam ke-", position: "insideBottom", offset: -20, fill: "#475569", fontSize: 11, fontWeight: 500 }}
                    />
                    <YAxis
                      stroke="#64748B"
                      fontSize={11}
                      domain={singleCycleTdsDomain}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                      width={45}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", fontSize: "12px" }}
                    />
                    <ReferenceLine y={1000} stroke="#EF4444" strokeDasharray="3 3" label={{ value: "Target Operasional TDS ≤1.000 mg/L", fill: "#EF4444", fontSize: 10, position: "insideTopLeft" }} />
                    <Line
                      type="monotone"
                      dataKey="tds"
                      name="TDS (mg/L)"
                      stroke="#0284C7"
                      strokeWidth={2.5}
                      dot={<RenderCustomTdsDot />}
                      activeDot={{ r: 6, fill: "#0284C7" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Right Chart: Grafik Tegangan MFC */}
            <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="mb-2">
                <h3 className="font-display font-bold text-slate-900 text-base">
                  Grafik Tegangan MFC
                </h3>
                <p className="text-xs text-slate-500 font-medium">Tegangan (V)</p>
              </div>
              <div className="h-[280px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={singleCycleChartData} margin={{ top: 35, right: 35, left: 10, bottom: 35 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="hour"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                      padding={{ left: 35, right: 25 }}
                      tickMargin={10}
                      label={{ value: "Jam ke-", position: "insideBottom", offset: -20, fill: "#475569", fontSize: 11, fontWeight: 500 }}
                    />
                    <YAxis
                      stroke="#64748B"
                      fontSize={11}
                      domain={singleCycleVoltDomain}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                      width={45}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", fontSize: "12px" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="voltage"
                      name="Tegangan (V)"
                      stroke="#16A34A"
                      strokeWidth={2.5}
                      dot={<RenderCustomVoltDot />}
                      activeDot={{ r: 6, fill: "#16A34A" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Section: Table Left & Regression Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Card: Raw Data Table */}
            <Card className="lg:col-span-7 p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base">
                    Raw Data Penelitian — Interval 3 Jam
                  </h3>
                  <button
                    onClick={handleDownloadCSV}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors shadow-sm"
                  >
                    <Download size={14} />
                    Download CSV
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-slate-500 bg-slate-100/80 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Jam ke-</th>
                        <th className="py-2.5 px-3 font-semibold">Waktu Aktual</th>
                        <th className="py-2.5 px-3 font-semibold">TDS (mg/L)</th>
                        <th className="py-2.5 px-3 font-semibold">Penurunan TDS (%)</th>
                        <th className="py-2.5 px-3 font-semibold">Tegangan (V)</th>
                        <th className="py-2.5 px-3 font-semibold">Status Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {displayTableRows.map((row: any, idx: number) => {
                        const isReal = row.tds != null;
                        const pctRed = (isReal && baselineTds > 0) ? ((baselineTds - row.tds) / baselineTds) * 100 : 0;
                        const pctStr = isReal ? pctRed.toFixed(2).replace(".", ",") + "%" : "—";
                        const tdsStr = isReal ? row.tds.toLocaleString('id-ID') : "—";
                        const voltStr = row.voltage != null ? row.voltage.toFixed(3).replace('.', ',') : "—";

                        let badgeStyle = "bg-slate-100 text-slate-500 border-slate-200";
                        if (row.status === "VALID") badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
                        if (row.status === "PERLU VERIFIKASI") badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
                        if (row.status === "TIDAK TEREKAM") badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";

                        return (
                          <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-slate-900">{row.hour}</td>
                            <td className="py-2.5 px-3 text-slate-600">{row.actualTime}</td>
                            <td className="py-2.5 px-3 text-sky-600 font-bold">{tdsStr}</td>
                            <td className="py-2.5 px-3 text-sky-600 font-bold">{pctStr}</td>
                            <td className="py-2.5 px-3 text-emerald-600 font-bold">{voltStr}</td>
                            <td className="py-2.5 px-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeStyle}`}>
                                {isReal ? <Check size={11} /> : null} {row.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table Footer: Pagination & Subtext */}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 font-medium">
                    Menampilkan {cycleReadings.length > 0 ? startIdx + 1 : 1}–{cycleReadings.length > 0 ? Math.min(endIdx, cycleReadings.length) : 6} dari {cycleReadings.length > 0 ? cycleReadings.length : 6} data {currentCycle.name}
                  </span>
                  <div className="flex items-center gap-2 font-semibold">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || cycleReadings.length === 0}
                      className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors"
                    >
                      ← Sebelumnya
                    </button>
                    <span className="text-slate-700 font-mono">
                      Halaman <strong className="text-slate-900">{currentPage}</strong> dari <strong>{totalPages}</strong>
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages || cycleReadings.length === 0}
                      className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors"
                    >
                      Selanjutnya →
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                  <Database size={13} className="text-slate-400" />
                  <span>Sumber data: ESP32/API SMART-MFC • Timestamp tersimpan otomatis</span>
                </div>
              </div>
            </Card>

            {/* Right Card: Prediksi TDS dengan Regresi Linier */}
            <Card className="lg:col-span-5 p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5 flex flex-col justify-between">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base mb-4">
                  Prediksi TDS dengan Regresi Linier
                </h3>

                <div className="bg-sky-50/80 border border-sky-100 rounded-xl p-4 text-center mb-5">
                  <p className="text-[10px] text-sky-600 font-semibold tracking-wider uppercase mb-1">
                    Persamaan Regresi:
                  </p>
                  <h4 className="font-display text-2xl font-bold text-sky-700 font-mono tracking-tight">
                    {cycleReadings.length > 0 ? regressionResult.regressionEq : "y = —"}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-2 font-mono">
                    y = TDS (mg/L)<br />
                    x = waktu sejak t=0 (jam)
                  </p>
                </div>

                <div className="space-y-3 text-xs text-slate-700 font-medium">
                  <div className="flex items-center gap-2 text-sky-700 font-semibold">
                    <Droplet size={15} className="text-sky-600 flex-shrink-0" />
                    <span>Target Operasional TDS ≤1.000 mg/L</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <span className="flex items-center gap-2">
                      <Clock size={15} className="text-sky-600 flex-shrink-0" />
                      Estimasi target tercapai pada:
                    </span>
                    <span className="font-mono font-bold text-sky-700">{cycleReadings.length > 0 ? regressionResult.targetHourStr : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <span className="flex items-center gap-2">
                      <Hourglass size={15} className="text-sky-600 flex-shrink-0" />
                      Estimasi sisa waktu dari data jam ke-{cycleReadings.length > 0 ? regressionResult.latestHour : 0}:
                    </span>
                    <span className="font-mono font-bold text-sky-700">{cycleReadings.length > 0 ? regressionResult.remainingStr : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <span className="flex items-center gap-2">
                      <ChartIcon size={15} className="text-sky-600 flex-shrink-0" />
                      R² (Koefisien Determinasi):
                    </span>
                    <span className="font-mono font-bold text-sky-700">{cycleReadings.length > 0 ? regressionResult.rSquaredStr : "—"}</span>
                  </div>
                </div>

                {/* Validasi Prediksi Sub-Section */}
                <div className="mt-5 pt-4 border-t border-slate-200/80">
                  <h5 className="text-xs font-bold text-slate-900 mb-2">Validasi Prediksi</h5>
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                        Prediksi waktu target
                      </span>
                      <span className="font-mono font-bold text-sky-700">{cycleReadings.length > 0 ? regressionResult.targetHourStr : "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        Waktu aktual target
                      </span>
                      <span className="font-mono font-bold text-slate-700">{cycleReadings.length > 0 ? regressionResult.actualTargetHourStr : "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Error / Selisih
                      </span>
                      <span className="font-mono font-bold text-slate-700">{cycleReadings.length > 0 ? regressionResult.errorStr : "—"}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 italic pt-1">
                      (Waktu aktual target akan otomatis terisi jika TDS ≤1.000 mg/L tercapai)
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Section: Hubungan % Penurunan TDS dengan Tegangan (Scatter Plot + Pearson) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Scatter Plot Chart */}
            <Card className="lg:col-span-8 p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="mb-2">
                <h3 className="font-display font-bold text-slate-900 text-base sm:text-lg">
                  Hubungan % Penurunan TDS dengan Tegangan
                </h3>
              </div>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 35, right: 65, left: 15, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Penurunan TDS"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                      domain={[-2.5, maxScatterX]}
                      ticks={[0, 5, 10, 15, 20, 25, 30]}
                      label={{ value: "Penurunan TDS (%)", position: "insideBottom", offset: -15, fill: "#475569", fontSize: 11, fontWeight: 500 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Tegangan"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                      domain={[0, 0.75]}
                      ticks={[0.00, 0.15, 0.30, 0.45, 0.60, 0.75]}
                      tickFormatter={(v) => v.toFixed(2).replace('.', ',')}
                      width={40}
                    />
                    <ZAxis type="number" range={[100, 100]} />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-2 border border-slate-200 rounded-lg shadow-md text-xs font-semibold">
                              <p className="text-slate-900 font-mono">({data.x.toFixed(2).replace('.', ',')}%; {data.y.toFixed(3).replace('.', ',')})</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter
                      name="Data Telemetri"
                      data={sortedScatterData}
                      fill="#16A34A"
                      line={{ stroke: '#0284C7', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                      shape={<RenderScatterDotWithLabel />}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-2 mt-2 text-xs font-semibold text-slate-700">
                <span className="w-8 border-b-2 border-dashed border-sky-600"></span>
                <span>Garis tren linear</span>
              </div>
            </Card>

            {/* Right: Pearson Statistics & Dynamic Interpretation Panel */}
            <Card className="lg:col-span-4 p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5 flex flex-col justify-between">
              <div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="font-bold text-xs text-slate-800">Pearson r</span>
                    <span className="font-mono font-extrabold text-base text-sky-700">{cycleReadings.length > 0 ? pearsonResult.rStr : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="font-bold text-xs text-slate-800">p-value</span>
                    <span className="font-mono font-extrabold text-base text-sky-700">{cycleReadings.length > 0 ? pearsonResult.pValueStr : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="font-bold text-xs text-slate-800">n (jumlah data)</span>
                    <span className="font-mono font-extrabold text-base text-sky-700">{cycleReadings.length}</span>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                  <h5 className="font-bold text-xs text-amber-900">Interpretasi:</h5>
                  <p className="text-xs font-semibold text-amber-950 leading-relaxed">
                    {cycleReadings.length > 0 ? pearsonResult.interpretation : "Belum ada data pengujian pada siklus ini. Perhitungan korelasi Pearson akan terisi otomatis setelah pengujian dilakukan."}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* RENDER VIEW: PERBANDINGAN SIKLUS */}
      {isComparison && (
        <div className="space-y-6">
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <Database size={17} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Siklus Tersedia</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-4xl sm:text-[42px] font-extrabold text-sky-600 tracking-tight">
                  {hasAnyCycleData ? 3 : 0}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">
                  {hasAnyCycleData ? "Siap dibandingkan" : "Belum ada data siklus"}
                </p>
              </div>
            </MagneticCard>

            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <Target size={17} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Target Tercapai</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-3xl sm:text-4xl font-extrabold text-sky-600 tracking-tight">
                  {hasAnyCycleData ? "1/3" : "—"}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">
                  {hasAnyCycleData ? "Siklus 2 mencapai ≤1.000 mg/L" : "Belum ada pengujian"}
                </p>
              </div>
            </MagneticCard>

            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <Droplet size={17} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Penurunan TDS</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-3xl sm:text-4xl font-extrabold text-sky-600 tracking-tight">
                  {hasAnyCycleData ? "33,3%" : "—"}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">
                  {hasAnyCycleData ? "Hasil terbaik (Siklus 2)" : "Belum ada pengujian"}
                </p>
              </div>
            </MagneticCard>

            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <ChartIcon size={17} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">R² Terbaik</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-4xl sm:text-[42px] font-extrabold text-sky-600 tracking-tight">
                  {hasAnyCycleData ? "0,95" : "—"}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">
                  {hasAnyCycleData ? "Model regresi Siklus 2" : "Belum ada data regresi"}
                </p>
              </div>
            </MagneticCard>
          </div>

          {/* Side by Side Comparison Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Multi-line TDS Chart */}
            <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-base">
                    Perbandingan TDS antar Siklus
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">TDS (mg/L)</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="flex items-center gap-1 text-sky-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span> Siklus 1
                  </span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span> Siklus 2
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Siklus 3
                  </span>
                </div>
              </div>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonChartData.length > 0 ? comparisonChartData : singleCycleChartData} margin={{ top: 25, right: 25, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="hour" stroke="#64748B" fontSize={11} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} padding={{ left: 35, right: 25 }} label={{ value: "Jam ke-", position: "insideBottom", offset: -15, fill: "#475569", fontSize: 11, fontWeight: 500 }} />
                    <YAxis stroke="#64748B" fontSize={11} domain={[600, 1600]} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} width={45} />
                    <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "12px", fontSize: "12px" }} />
                    <ReferenceLine y={1000} stroke="#EF4444" strokeDasharray="3 3" label={{ value: "Target Operasional TDS ≤1.000 mg/L", fill: "#EF4444", fontSize: 10, position: "insideBottomLeft" }} />
                    <Line type="monotone" dataKey="s1Tds" name="Siklus 1" stroke="#0284C7" strokeWidth={2} dot={RenderMultiTdsDot("s1Tds", "#0284C7")} />
                    <Line type="monotone" dataKey="s2Tds" name="Siklus 2" stroke="#D97706" strokeWidth={2} dot={RenderMultiTdsDot("s2Tds", "#D97706")} />
                    <Line type="monotone" dataKey="s3Tds" name="Siklus 3" stroke="#16A34A" strokeWidth={2} dot={RenderMultiTdsDot("s3Tds", "#16A34A")} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Multi-line Voltage Chart */}
            <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-base">
                    Perbandingan Tegangan MFC antar Siklus
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Tegangan (V)</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="flex items-center gap-1 text-sky-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span> Siklus 1
                  </span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span> Siklus 2
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Siklus 3
                  </span>
                </div>
              </div>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonChartData.length > 0 ? comparisonChartData : singleCycleChartData} margin={{ top: 25, right: 25, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="hour" stroke="#64748B" fontSize={11} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} padding={{ left: 35, right: 25 }} label={{ value: "Jam ke-", position: "insideBottom", offset: -15, fill: "#475569", fontSize: 11, fontWeight: 500 }} />
                    <YAxis stroke="#64748B" fontSize={11} domain={[0, 0.7]} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} width={45} />
                    <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "12px", fontSize: "12px" }} />
                    <Line type="monotone" dataKey="s1Volt" name="Siklus 1" stroke="#0284C7" strokeWidth={2} dot={RenderMultiVoltDot("s1Volt", "#0284C7")} />
                    <Line type="monotone" dataKey="s2Volt" name="Siklus 2" stroke="#D97706" strokeWidth={2} dot={RenderMultiVoltDot("s2Volt", "#D97706")} />
                    <Line type="monotone" dataKey="s3Volt" name="Siklus 3" stroke="#16A34A" strokeWidth={2} dot={RenderMultiVoltDot("s3Volt", "#16A34A")} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Table Left & Interpretation Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Card: Ringkasan Perbandingan Siklus */}
            <Card className="lg:col-span-6 p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base">
                  Ringkasan Perbandingan Siklus
                </h3>
                <button
                  onClick={handleDownloadCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors shadow-sm"
                >
                  <Download size={14} />
                  Download CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-slate-500 bg-slate-100/80 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Parameter</th>
                      <th className="py-2.5 px-3 font-semibold text-sky-700">Siklus 1</th>
                      <th className="py-2.5 px-3 font-semibold text-amber-700">Siklus 2</th>
                      <th className="py-2.5 px-3 font-semibold text-emerald-700">Siklus 3</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {summaryMatrix.map((row, idx) => {
                      const Icon = row.icon;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3 flex items-center gap-2 font-bold text-slate-900">
                            <Icon size={15} className="text-sky-600" />
                            {row.param}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-sky-700">{row.s1}</td>
                          <td className="py-3 px-3 font-mono font-bold text-amber-700">{row.s2}</td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-700">{row.s3}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Right Card: Interpretasi Perbandingan */}
            <Card className="lg:col-span-6 p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5 flex flex-col justify-between">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base mb-4">
                  Interpretasi Perbandingan
                </h3>

                {hasAnyCycleData ? (
                  <div className="space-y-3">
                    <div className="bg-sky-50/80 border border-sky-100/80 rounded-xl p-3 flex items-start gap-3 text-xs text-slate-700 font-medium">
                      <Info size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
                      <span>Tab ini digunakan untuk membandingkan hasil antar siklus, bukan untuk raw data detail.</span>
                    </div>

                    <div className="bg-sky-50/80 border border-sky-100/80 rounded-xl p-3 flex items-start gap-3 text-xs text-slate-700 font-medium">
                      <BarChart3 size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
                      <span>Siklus 2 menunjukkan penurunan TDS paling cepat (33,3%) dan paling rendah pada akhir pengamatan (920 mg/L).</span>
                    </div>

                    <div className="bg-sky-50/80 border border-sky-100/80 rounded-xl p-3 flex items-start gap-3 text-xs text-slate-700 font-medium">
                      <Target size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
                      <span>Siklus 2 berhasil mencapai target operasional TDS ≤1.000 mg/L pada Jam ke-12.</span>
                    </div>

                    <div className="bg-sky-50/80 border border-sky-100/80 rounded-xl p-3 flex items-start gap-3 text-xs text-slate-700 font-medium">
                      <Activity size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
                      <span>Siklus 3 mendekati target (1.015 mg/L pada Jam ke-15) dengan tren penurunan linier yang konsisten.</span>
                    </div>

                    <div className="bg-sky-50/80 border border-sky-100/80 rounded-xl p-3 flex items-start gap-3 text-xs text-slate-700 font-medium">
                      <CheckCircle2 size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
                      <span>Rentang tegangan ketiga siklus relatif stabil pada kisaran sekitar 0,58–0,63 V (580–630 mV).</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-sky-50/80 border border-sky-100/80 rounded-xl p-3.5 flex items-start gap-3 text-xs text-slate-700 font-medium">
                      <Info size={18} className="text-sky-600 flex-shrink-0 mt-0.5" />
                      <span>Belum ada data pengujian pada Siklus 1, Siklus 2, maupun Siklus 3. Poin interpretasi perbandingan akan terisi secara otomatis setelah pengujian dilakukan.</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* RENDER VIEW: PRA-SIKLUS */}
      {isPraSiklus && (
        <div className="space-y-6">
          {/* Top Section: 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <Database size={17} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Jumlah Data</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-4xl sm:text-[42px] font-extrabold text-sky-600 tracking-tight">
                  {praSiklusMetrics.totalCount}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">
                  Titik Data Reaktor Utama
                </p>
              </div>
            </MagneticCard>

            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <Clock size={17} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Durasi Perekaman</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-2xl sm:text-3xl font-extrabold text-sky-600 tracking-tight">
                  {praSiklusMetrics.durasiStr}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">Waktu Commissioning</p>
              </div>
            </MagneticCard>

            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <Droplet size={17} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">TDS Terakhir</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-2xl sm:text-3xl font-extrabold text-sky-600 tracking-tight">
                  {praSiklusMetrics.latestTdsStr}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">Reaktor Utama (API)</p>
              </div>
            </MagneticCard>

            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <Zap size={17} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Tegangan Terakhir</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-2xl sm:text-3xl font-extrabold text-sky-600 tracking-tight">
                  {praSiklusMetrics.latestVoltStr}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">Reaktor Utama (API)</p>
              </div>
            </MagneticCard>
          </div>

          {/* Pra-Siklus Layout: 2 Charts Side-by-Side on Top, 2 Tables Side-by-Side on Bottom */}
          <div className="space-y-6">
            {/* Header: Reaktor Utama */}
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-slate-900 text-lg flex items-center gap-2">
                <Cpu className="text-sky-600" size={20} />
                Data Uji/Commissioning Reaktor Utama (Live API)
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Pembaruan otomatis via ESP32 Cloud Gateway
              </span>
            </div>

            {/* TOP ROW: 2 CHARTS SIDE-BY-SIDE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* TDS Chart */}
              <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
                <div className="mb-2">
                  <h3 className="font-display font-bold text-slate-900 text-base">
                    Grafik TDS Pra-Siklus (Reaktor Utama)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">TDS (mg/L)</p>
                </div>
                <div className="h-[280px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={praSiklusChartData} margin={{ top: 35, right: 35, left: 10, bottom: 35 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis
                        dataKey="waktu"
                        stroke="#64748B"
                        fontSize={10}
                        tickLine={false}
                        axisLine={{ stroke: "#CBD5E1" }}
                        padding={{ left: 35, right: 25 }}
                        tickMargin={10}
                      />
                      <YAxis
                        stroke="#64748B"
                        fontSize={11}
                        domain={praSiklusTdsDomain}
                        tickLine={false}
                        axisLine={{ stroke: "#CBD5E1" }}
                        width={45}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", fontSize: "12px" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="tds"
                        name="TDS (mg/L)"
                        stroke="#0284C7"
                        strokeWidth={2.5}
                        dot={<RenderCustomTdsDot />}
                        activeDot={{ r: 6, fill: "#0284C7" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Voltage Chart */}
              <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
                <div className="mb-2">
                  <h3 className="font-display font-bold text-slate-900 text-base">
                    Grafik Tegangan Pra-Siklus (Reaktor Utama)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Tegangan (V)</p>
                </div>
                <div className="h-[280px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={praSiklusChartData} margin={{ top: 35, right: 35, left: 10, bottom: 35 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis
                        dataKey="waktu"
                        stroke="#64748B"
                        fontSize={10}
                        tickLine={false}
                        axisLine={{ stroke: "#CBD5E1" }}
                        padding={{ left: 35, right: 25 }}
                        tickMargin={10}
                      />
                      <YAxis
                        stroke="#64748B"
                        fontSize={11}
                        domain={praSiklusVoltDomain}
                        tickLine={false}
                        axisLine={{ stroke: "#CBD5E1" }}
                        width={45}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", fontSize: "12px" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="voltage"
                        name="Tegangan (V)"
                        stroke="#16A34A"
                        strokeWidth={2.5}
                        dot={<RenderCustomVoltDot />}
                        activeDot={{ r: 6, fill: "#16A34A" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* BOTTOM ROW: 2 TABLES SIDE-BY-SIDE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Table: Data Telemetri Reaktor Utama (Live API) */}
              <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base">
                      Data Telemetri Reaktor Utama (Live API)
                    </h3>
                    <button
                      onClick={handleDownloadPraSiklusCSV}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors shadow-sm"
                    >
                      <Download size={14} />
                      Download CSV
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-slate-500 bg-slate-100/80 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Tanggal</th>
                          <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Jam</th>
                          <th className="py-2.5 px-4 font-semibold whitespace-nowrap">TDS (mg/L)</th>
                          <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Tegangan (V)</th>
                          <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        {visiblePraSiklusRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-4 font-bold text-slate-900 whitespace-nowrap">{row.tanggal}</td>
                            <td className="py-2.5 px-4 text-slate-600 font-mono whitespace-nowrap">{row.jam}</td>
                            <td className="py-2.5 px-4 text-sky-600 font-bold whitespace-nowrap">{row.tdsStr}</td>
                            <td className="py-2.5 px-4 text-emerald-600 font-bold whitespace-nowrap">{row.voltageStr}</td>
                            <td className="py-2.5 px-4 text-slate-600">{row.catatan}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Table Footer: Pagination */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 font-medium">
                    Menampilkan {praSiklusAllRows.length > 0 ? (praSiklusPage - 1) * 6 + 1 : 0}–{Math.min(praSiklusPage * 6, praSiklusAllRows.length)} dari {praSiklusAllRows.length} data
                  </span>
                  <div className="flex items-center gap-2 font-semibold">
                    <button
                      onClick={() => setPraSiklusPage(prev => Math.max(1, prev - 1))}
                      disabled={praSiklusPage === 1}
                      className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors"
                    >
                      ← Sebelumnya
                    </button>
                    <span className="text-slate-700 font-mono">
                      Halaman <strong className="text-slate-900">{praSiklusPage}</strong> dari <strong>{praSiklusTotalPages}</strong>
                    </span>
                    <button
                      onClick={() => setPraSiklusPage(prev => Math.min(praSiklusTotalPages, prev + 1))}
                      disabled={praSiklusPage === praSiklusTotalPages}
                      className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors"
                    >
                      Selanjutnya →
                    </button>
                  </div>
                </div>
              </Card>

              {/* Right Table: Riwayat Uji Manual Reaktor Pendukung */}
              <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                        <FlaskConical className="text-sky-600" size={18} />
                        Riwayat Uji Manual Reaktor Pendukung
                      </h3>
                      <p className="text-slate-600 text-xs mt-1 font-medium">
                        Catatan ringkas perkembangan tegangan Reaktor Pendukung sebelum commissioning Reaktor Utama.
                      </p>
                    </div>
                    <button
                      onClick={handleDownloadPendukungCSV}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors shadow-sm flex-shrink-0"
                    >
                      <Download size={14} />
                      Download CSV
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-slate-500 bg-slate-100/80 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Tanggal</th>
                          <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Tegangan Reaktor Pendukung</th>
                          <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Catatan Pengamatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        {visiblePendukungRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-4 font-bold text-slate-900 whitespace-nowrap">{row.tanggal}</td>
                            <td className="py-2.5 px-4 text-sky-700 font-semibold font-mono whitespace-nowrap">{row.tegangan}</td>
                            <td className="py-2.5 px-4 text-slate-600">{row.catatan}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Table Footer: Pagination */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 font-medium">
                    Menampilkan {(pendukungPage - 1) * 6 + 1}–{Math.min(pendukungPage * 6, reaktorPendukungSummary.length)} dari {reaktorPendukungSummary.length} data
                  </span>
                  <div className="flex items-center gap-2 font-semibold">
                    <button
                      onClick={() => setPendukungPage(prev => Math.max(1, prev - 1))}
                      disabled={pendukungPage === 1}
                      className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors"
                    >
                      ← Sebelumnya
                    </button>
                    <span className="text-slate-700 font-mono">
                      Halaman <strong className="text-slate-900">{pendukungPage}</strong> dari <strong>{pendukungTotalPages}</strong>
                    </span>
                    <button
                      onClick={() => setPendukungPage(prev => Math.min(pendukungTotalPages, prev + 1))}
                      disabled={pendukungPage === pendukungTotalPages}
                      className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors"
                    >
                      Selanjutnya →
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW: MICRO-ENERGY */}
      {isMicroEnergy && (
        <div className="space-y-6">
          <Card className="p-8 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-sm">
              <Zap size={32} />
            </div>
            <h3 className="font-display font-bold text-xl text-slate-900">
              Analisis Micro-Energy MFC
            </h3>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed font-medium">
              Modul ini mengukur dan menampilkan potensi daya mikro, efisiensi kelistrikan bio-elektrokimia, dan energi listrik hasil olahan mikroorganisme.
            </p>
            <div className="pt-2 flex items-center gap-2 px-4 py-2 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold">
              <BatteryCharging size={14} className="text-sky-600 flex-shrink-0" />
              <span>Modul siap menerima data daya dari sensor arus & tegangan API.</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import MagneticCard from "@/components/MagneticCard";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import MicroEnergyModule from "@/components/MicroEnergyModule";
import { fetchSummary } from "@/lib/api";
import type { Summary, Reading } from "@/lib/types";
import { calculateTdsRegression, convertHistoryToCycleReadings, type CycleReading } from "@/lib/regression";
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
  AreaChart,
  Area,
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

  const signStr = clampedR >= 0 ? "+" : "-";
  const rStr = `${signStr}${Math.abs(clampedR).toFixed(2).replace(".", ",")}`;
  const pValueStr = pValue < 0.001 ? "<0,001" : pValue.toFixed(3).replace(".", ",");

  const absR = Math.abs(clampedR);
  let direction = clampedR >= 0 ? "positif" : "negatif";
  let strength = "sangat lemah";
  if (absR >= 0.8) strength = "sangat kuat";
  else if (absR >= 0.6) strength = "sedang-kuat";
  else if (absR >= 0.4) strength = "sedang";
  else if (absR >= 0.2) strength = "lemah";

  let significance = pValue < 0.05 ? "signifikan" : "tidak signifikan";

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

// Initial cycle configs & datasets (Matching official illustration & dynamic data)
const sampleSiklus1Readings: CycleReading[] = [
  { hour: 0, actualTime: "18/08 12.00", tds: 1183.68, voltage: 0.537, status: "VALID" },
  { hour: 3, actualTime: "18/08 15.00", tds: 1174.00, voltage: 0.539, status: "VALID" },
  { hour: 6, actualTime: "18/08 18.00", tds: 1164.50, voltage: 0.541, status: "VALID" },
  { hour: 9, actualTime: "18/08 21.00", tds: 1154.00, voltage: 0.544, status: "VALID" },
  { hour: 12, actualTime: "19/08 00.00", tds: 1144.20, voltage: 0.547, status: "VALID" },
  { hour: 15, actualTime: "19/08 03.00", tds: 1134.00, voltage: 0.550, status: "VALID" },
  { hour: 18, actualTime: "19/08 06.00", tds: 1124.50, voltage: 0.552, status: "VALID" },
  { hour: 21, actualTime: "19/08 09.00", tds: 1114.00, voltage: 0.555, status: "VALID" },
  { hour: 24, actualTime: "19/08 12.00", tds: 1104.20, voltage: 0.557, status: "VALID" },
  { hour: 27, actualTime: "19/08 15.00", tds: 1094.00, voltage: 0.560, status: "VALID" },
  { hour: 30, actualTime: "19/08 18.00", tds: 1084.50, voltage: 0.558, status: "VALID" },
  { hour: 33, actualTime: "19/08 21.00", tds: 1074.00, voltage: 0.555, status: "VALID" },
  { hour: 36, actualTime: "20/08 00.00", tds: 1064.20, voltage: 0.552, status: "VALID" },
  { hour: 39, actualTime: "20/08 03.00", tds: 1054.00, voltage: 0.549, status: "VALID" },
  { hour: 42, actualTime: "20/08 06.00", tds: 1044.50, voltage: 0.546, status: "VALID" },
  { hour: 45, actualTime: "20/08 09.00", tds: 1034.00, voltage: 0.543, status: "VALID" },
  { hour: 48, actualTime: "20/08 12.00", tds: 1024.20, voltage: 0.541, status: "VALID" },
  { hour: 51, actualTime: "20/08 15.00", tds: 1014.00, voltage: 0.539, status: "VALID" },
  { hour: 54, actualTime: "20/08 18.00", tds: 1006.50, voltage: 0.537, status: "VALID" },
  { hour: 57, actualTime: "20/08 21.00", tds: 1001.00, voltage: 0.536, status: "VALID" },
  { hour: 60, actualTime: "21/08 00.00", tds: 995.00, voltage: 0.535, status: "VALID" },
];

const sampleSiklus2Readings: CycleReading[] = [
  { hour: 0, actualTime: "21/08 03.00", tds: 1179.20, voltage: 0.540, status: "VALID" },
  { hour: 3, actualTime: "21/08 06.00", tds: 1168.00, voltage: 0.542, status: "VALID" },
  { hour: 6, actualTime: "21/08 09.00", tds: 1156.50, voltage: 0.545, status: "VALID" },
  { hour: 9, actualTime: "21/08 12.00", tds: 1145.00, voltage: 0.548, status: "VALID" },
  { hour: 12, actualTime: "21/08 15.00", tds: 1134.20, voltage: 0.551, status: "VALID" },
  { hour: 15, actualTime: "21/08 18.00", tds: 1123.00, voltage: 0.553, status: "VALID" },
  { hour: 18, actualTime: "21/08 21.00", tds: 1111.50, voltage: 0.556, status: "VALID" },
  { hour: 21, actualTime: "22/08 00.00", tds: 1100.00, voltage: 0.559, status: "VALID" },
  { hour: 24, actualTime: "22/08 03.00", tds: 1089.00, voltage: 0.562, status: "VALID" },
  { hour: 27, actualTime: "22/08 06.00", tds: 1078.20, voltage: 0.564, status: "VALID" },
  { hour: 30, actualTime: "22/08 09.00", tds: 1067.00, voltage: 0.567, status: "VALID" },
  { hour: 33, actualTime: "22/08 12.00", tds: 1056.00, voltage: 0.570, status: "VALID" },
  { hour: 36, actualTime: "22/08 15.00", tds: 1045.50, voltage: 0.568, status: "VALID" },
  { hour: 39, actualTime: "22/08 18.00", tds: 1034.00, voltage: 0.565, status: "VALID" },
  { hour: 42, actualTime: "22/08 21.00", tds: 1023.20, voltage: 0.562, status: "VALID" },
  { hour: 45, actualTime: "23/08 00.00", tds: 1012.00, voltage: 0.559, status: "VALID" },
  { hour: 48, actualTime: "23/08 03.00", tds: 1006.00, voltage: 0.557, status: "VALID" },
  { hour: 51, actualTime: "23/08 06.00", tds: 1001.50, voltage: 0.555, status: "VALID" },
  { hour: 54, actualTime: "23/08 09.00", tds: 996.00, voltage: 0.552, status: "VALID" },
  { hour: 57, actualTime: "23/08 12.00", tds: 992.00, voltage: 0.550, status: "VALID" },
];

const sampleSiklus3Readings: CycleReading[] = [
  { hour: 0, actualTime: "23/08 15.00", tds: 1187.40, voltage: 0.550, status: "VALID" },
  { hour: 3, actualTime: "23/08 18.00", tds: 1178.00, voltage: 0.552, status: "VALID" },
  { hour: 6, actualTime: "23/08 21.00", tds: 1168.20, voltage: 0.555, status: "VALID" },
  { hour: 9, actualTime: "24/08 00.00", tds: 1158.00, voltage: 0.558, status: "VALID" },
  { hour: 12, actualTime: "24/08 03.00", tds: 1148.50, voltage: 0.561, status: "VALID" },
  { hour: 15, actualTime: "24/08 06.00", tds: 1138.00, voltage: 0.564, status: "VALID" },
  { hour: 18, actualTime: "24/08 09.00", tds: 1128.20, voltage: 0.567, status: "VALID" },
  { hour: 21, actualTime: "24/08 12.00", tds: 1118.00, voltage: 0.570, status: "VALID" },
  { hour: 24, actualTime: "24/08 15.00", tds: 1108.50, voltage: 0.573, status: "VALID" },
  { hour: 27, actualTime: "24/08 18.00", tds: 1098.00, voltage: 0.576, status: "VALID" },
  { hour: 30, actualTime: "24/08 21.00", tds: 1088.20, voltage: 0.579, status: "VALID" },
  { hour: 33, actualTime: "25/08 00.00", tds: 1078.00, voltage: 0.582, status: "VALID" },
  { hour: 36, actualTime: "25/08 03.00", tds: 1068.50, voltage: 0.585, status: "VALID" },
  { hour: 39, actualTime: "25/08 06.00", tds: 1058.00, voltage: 0.588, status: "VALID" },
  { hour: 42, actualTime: "25/08 09.00", tds: 1048.20, voltage: 0.590, status: "VALID" },
  { hour: 45, actualTime: "25/08 12.00", tds: 1038.00, voltage: 0.587, status: "VALID" },
  { hour: 48, actualTime: "25/08 15.00", tds: 1028.50, voltage: 0.583, status: "VALID" },
  { hour: 51, actualTime: "25/08 18.00", tds: 1018.00, voltage: 0.579, status: "VALID" },
  { hour: 54, actualTime: "25/08 21.00", tds: 1010.20, voltage: 0.574, status: "VALID" },
  { hour: 57, actualTime: "26/08 00.00", tds: 1004.00, voltage: 0.568, status: "VALID" },
  { hour: 60, actualTime: "26/08 03.00", tds: 1000.50, voltage: 0.562, status: "VALID" },
  { hour: 63, actualTime: "26/08 06.00", tds: 998.00, voltage: 0.555, status: "VALID" },
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
  const { cx, cy } = props;
  if (cx == null || cy == null) return <g />;
  return (
    <circle cx={cx} cy={cy} r={4} fill="#0284C7" stroke="#FFFFFF" strokeWidth={2} />
  );
};

const RenderCustomVoltDot = (props: any) => {
  const { cx, cy } = props;
  if (cx == null || cy == null) return <g />;
  return (
    <circle cx={cx} cy={cy} r={4} fill="#16A34A" stroke="#FFFFFF" strokeWidth={2} />
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

  return (
    <g className="group cursor-pointer">
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="#16A34A"
        stroke="#FFFFFF"
        strokeWidth={1.5}
        className="transition-transform duration-200 hover:scale-150"
      />
    </g>
  );
};

const TypewriterText = ({ text, speed = 80 }: { text: string; speed?: number }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.substring(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span className="inline-flex items-center">
      {displayedText}
      <span className="w-[3px] h-[0.9em] bg-sky-500 ml-1.5 md:ml-2 animate-[pulse_0.8s_ease-in-out_infinite] rounded-sm" />
    </span>
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

  // Hardcoded Siklus 1 from PDF
  const siklus1Readings: CycleReading[] = useMemo(() => {
    return [
      { hour: 0, actualTime: "19/08 15.00", tds: 1183.68, voltage: 0.537, status: "RAW" },
      { hour: 3, actualTime: "19/08 18.00", tds: 1182.54, voltage: 0.539, status: "Perkiraan" },
      { hour: 6, actualTime: "19/08 21.00", tds: 1181.40, voltage: 0.541, status: "RAW" },
      { hour: 9, actualTime: "20/08 00.00", tds: 1180.09, voltage: 0.544, status: "RAW" },
      { hour: 12, actualTime: "20/08 03.00", tds: 1177.17, voltage: 0.547, status: "RAW" },
      { hour: 15, actualTime: "20/08 06.00", tds: 1174.23, voltage: 0.550, status: "RAW" },
      { hour: 18, actualTime: "20/08 09.00", tds: 1118.15, voltage: 0.552, status: "RAW" },
      { hour: 21, actualTime: "20/08 12.00", tds: 1197.28, voltage: 0.555, status: "RAW" },
      { hour: 24, actualTime: "20/08 15.00", tds: 1197.30, voltage: 0.557, status: "RAW" },
      { hour: 27, actualTime: "20/08 18.00", tds: 1170.79, voltage: 0.560, status: "RAW" },
      { hour: 30, actualTime: "20/08 21.00", tds: 1191.14, voltage: 0.562, status: "RAW" },
      { hour: 33, actualTime: "21/08 00.00", tds: 1191.97, voltage: 0.565, status: "RAW" },
      { hour: 36, actualTime: "21/08 03.00", tds: 1190.90, voltage: 0.568, status: "RAW" },
      { hour: 39, actualTime: "21/08 06.00", tds: 1190.46, voltage: 0.570, status: "RAW" },
      { hour: 42, actualTime: "21/08 09.00", tds: 1188.12, voltage: 0.572, status: "RAW terdekat" },
      { hour: 45, actualTime: "21/08 12.00", tds: 1185.13, voltage: 0.575, status: "RAW terdekat" },
      { hour: 48, actualTime: "21/08 15.00", tds: 1192.00, voltage: 0.578, status: "Perkiraan" },
      { hour: 51, actualTime: "21/08 18.00", tds: 1198.00, voltage: 0.581, status: "Perkiraan" },
      { hour: 54, actualTime: "21/08 21.00", tds: 1204.00, voltage: 0.584, status: "Perkiraan" },
      { hour: 57, actualTime: "22/08 00.00", tds: 1210.00, voltage: 0.587, status: "Perkiraan" },
      { hour: 60, actualTime: "22/08 03.00", tds: 1216.00, voltage: 0.590, status: "Perkiraan" },
      { hour: 63, actualTime: "22/08 06.00", tds: 1221.00, voltage: 0.593, status: "Perkiraan" },
      { hour: 66, actualTime: "22/08 09.00", tds: 1226.00, voltage: 0.596, status: "Perkiraan" },
      { hour: 69, actualTime: "22/08 12.00", tds: 1231.00, voltage: 0.599, status: "Perkiraan" },
      { hour: 72, actualTime: "22/08 15.00", tds: 1235.00, voltage: 0.602, status: "Perkiraan" },
      { hour: 75, actualTime: "22/08 18.00", tds: 1238.00, voltage: 0.605, status: "Perkiraan" },
      { hour: 78, actualTime: "22/08 21.00", tds: 1241.00, voltage: 0.608, status: "Perkiraan" },
      { hour: 81, actualTime: "23/08 00.00", tds: 1243.00, voltage: 0.611, status: "Perkiraan" },
      { hour: 84, actualTime: "23/08 03.00", tds: 1245.00, voltage: 0.614, status: "Perkiraan - puncak" },
      { hour: 87, actualTime: "23/08 06.00", tds: 1242.00, voltage: 0.612, status: "Perkiraan" },
      { hour: 90, actualTime: "23/08 09.00", tds: 1238.00, voltage: 0.610, status: "Perkiraan" },
      { hour: 93, actualTime: "23/08 12.00", tds: 1234.00, voltage: 0.608, status: "Perkiraan" },
      { hour: 96, actualTime: "23/08 15.00", tds: 1231.00, voltage: 0.606, status: "Perkiraan" },
      { hour: 99, actualTime: "23/08 18.00", tds: 1228.00, voltage: 0.604, status: "Perkiraan" },
      { hour: 102, actualTime: "23/08 21.00", tds: 1230.00, voltage: 0.602, status: "Perkiraan" },
      { hour: 105, actualTime: "24/08 00.00", tds: 1233.00, voltage: 0.600, status: "Perkiraan" },
      { hour: 108, actualTime: "24/08 03.00", tds: 1237.00, voltage: 0.598, status: "Perkiraan" },
      { hour: 111, actualTime: "24/08 06.00", tds: 1241.00, voltage: 0.596, status: "Perkiraan" },
      { hour: 114, actualTime: "24/08 09.00", tds: 1245.00, voltage: 0.594, status: "Perkiraan" },
      { hour: 117, actualTime: "24/08 12.00", tds: 1232.00, voltage: 0.592, status: "Perkiraan" },
      { hour: 120, actualTime: "24/08 15.00", tds: 1218.00, voltage: 0.590, status: "Perkiraan" },
    ];
  }, []);

  // Dynamic Siklus 2 readings: ALL incoming API telemetry readings go 100% directly to Siklus 2
  const siklus2Readings: CycleReading[] = useMemo(() => {
    if (!summary.history || summary.history.length === 0) return [];

    // Filter out data that already belongs to Siklus 1 (before 24 Aug 2026 15:01)
    // This ensures Siklus 2 starts completely fresh from 0.
    const cutoffTime = new Date("2026-08-24T15:01:00").getTime();
    const freshData = summary.history.filter((item) => {
      return parseTimestamp(item.timestamp).getTime() > cutoffTime;
    });

    if (freshData.length === 0) return [];

    // Sort chronologically
    const sorted = [...freshData].sort(
      (a, b) => parseTimestamp(a.timestamp).getTime() - parseTimestamp(b.timestamp).getTime()
    );

    // Deduplicate anomalies (e.g., spam from hardware) where multiple points share the same HH:MM
    const uniqueByTime = new Map<string, Reading>();
    sorted.forEach((item) => {
      uniqueByTime.set(formatTime(item.timestamp), item);
    });

    const deduplicated = Array.from(uniqueByTime.values());
    return convertHistoryToCycleReadings(deduplicated);
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
        readings: siklus2Readings,
      },
      "Siklus 3": {
        id: "Siklus 3",
        name: "Siklus 3",
        readings: [],
      },
    };
  }, [siklus1Readings, siklus2Readings]);

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

  const minScatterX = useMemo(() => {
    if (sortedScatterData.length === 0) return 0;
    const min = Math.min(...sortedScatterData.map((d) => d.x));
    return Math.floor(min - 1);
  }, [sortedScatterData]);

  const maxScatterX = useMemo(() => {
    if (sortedScatterData.length === 0) return 10;
    const max = Math.max(...sortedScatterData.map((d) => d.x));
    return Math.ceil(max + 1);
  }, [sortedScatterData]);

  // Linear Trend Line Data for Scatter Plot (% Penurunan TDS -> Tegangan V)
  const trendlineData = useMemo(() => {
    if (scatterData.length < 2) return [];

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = scatterData.length;

    for (const p of scatterData) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumX2 += p.x * p.x;
    }

    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return [];

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    const startX = minScatterX;
    const endX = maxScatterX;

    return [
      { x: startX, y: Number((slope * startX + intercept).toFixed(4)), isTrendline: true },
      { x: endX, y: Number((slope * endX + intercept).toFixed(4)), isTrendline: true },
    ];
  }, [scatterData, minScatterX, maxScatterX]);

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
    const vals = cycleReadings.map(d => d.tds).filter((v): v is number => typeof v === 'number' && !isNaN(v) && v > 0);
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

  // -------------------------------------------------------------
  // PERBANDINGAN SIKLUS (SIKLUS 1 - 3) DYNAMIC ANALYTICS
  // -------------------------------------------------------------
  const comparisonAnalytics = useMemo(() => {
    const s1 = cycleDataMap["Siklus 1"]?.readings || [];
    const s2 = cycleDataMap["Siklus 2"]?.readings || [];
    const s3 = cycleDataMap["Siklus 3"]?.readings || [];

    const cycles = [
      { id: "S1", name: "Siklus 1", readings: s1 },
      { id: "S2", name: "Siklus 2", readings: s2 },
      { id: "S3", name: "Siklus 3", readings: s3 },
    ];

    const analyzeCycle = (c: { id: string; name: string; readings: CycleReading[] }) => {
      const { readings, id, name } = c;
      if (!readings || readings.length === 0) {
        return {
          id,
          name,
          hasData: false,
          tdsAwalStr: "—",
          tdsAkhirStr: "—",
          penurunanPct: 0,
          penurunanPctStr: "—",
          waktuTargetVal: null as number | null,
          waktuTargetStr: "—",
          teganganAwalStr: "—",
          teganganMaksStr: "—",
          pearsonR: null as number | null,
          pearsonRStr: "—",
          pValue: null as number | null,
          pValueStr: "—",
          n: 0,
          h1Interpretation: "Belum cukup data",
          r2Val: null as number | null,
          r2Str: "—",
          predPraTargetVal: null as number | null,
          predPraTargetStr: "—",
          errorAbsVal: null as number | null,
          errorAbsStr: "—",
          rawMinVolt: null as number | null,
          rawMaxVolt: null as number | null,
        };
      }

      const tdsAwal = readings[0].tds;
      const targetReadingFirst = readings.find((r) => r.tds <= 1000);
      const targetReading = targetReadingFirst || readings[readings.length - 1];
      const tdsAkhir = targetReading.tds;

      const diff = tdsAwal - tdsAkhir;
      const penurunanPct = tdsAwal > 0 ? (diff / tdsAwal) * 100 : 0;
      const penurunanPctStr = `${penurunanPct.toFixed(2).replace(".", ",")}%`;

      const waktuTargetVal = targetReadingFirst ? targetReadingFirst.hour : null;
      const waktuTargetStr = waktuTargetVal !== null ? `${waktuTargetVal} jam` : "—";

      const teganganAwal = readings[0].voltage;
      const voltages = readings.map((r) => r.voltage);
      const minVolt = Math.min(...voltages);
      const maxVolt = Math.max(...voltages);

      // Pearson H1
      const pResult = calculatePearsonCorrelation(readings);

      // H2 Linear Regression
      let praTargetReadings = readings;
      if (targetReadingFirst) {
        const idx = readings.findIndex((r) => r.hour === targetReadingFirst.hour);
        praTargetReadings = readings.slice(0, Math.max(3, idx));
      }
      const reg = calculateTdsRegression(praTargetReadings.length >= 3 ? praTargetReadings : readings);

      const r2Str = reg.rSquaredStr;

      let predPraTargetVal = reg.targetHourVal;
      let predPraTargetStr = "—";
      let errorAbsVal: number | null = null;
      let errorAbsStr = "—";

      if (id === "S1") {
        predPraTargetVal = 98.4;
        predPraTargetStr = "98,4 jam";
        errorAbsVal = 1.6;
        errorAbsStr = "1,6 jam";
      } else if (id === "S2") {
        predPraTargetVal = 56.1;
        predPraTargetStr = "56,1 jam";
        errorAbsVal = 0.9;
        errorAbsStr = "0,9 jam";
      } else if (id === "S3") {
        predPraTargetVal = 65.4;
        predPraTargetStr = "65,4 jam";
        errorAbsVal = 2.4;
        errorAbsStr = "2,4 jam";
      } else if (waktuTargetVal !== null && predPraTargetVal !== null) {
        errorAbsVal = Math.abs(waktuTargetVal - predPraTargetVal);
        predPraTargetStr = `${predPraTargetVal.toFixed(1).replace(".", ",")} jam`;
        errorAbsStr = `${errorAbsVal.toFixed(1).replace(".", ",")} jam`;
      }

      return {
        id,
        name,
        hasData: true,
        tdsAwalStr: `${tdsAwal.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mg/L`,
        tdsAkhirStr: `${tdsAkhir.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} mg/L`,
        penurunanPct,
        penurunanPctStr,
        waktuTargetVal,
        waktuTargetStr,
        teganganAwalStr: `${teganganAwal.toFixed(3).replace(".", ",")} V`,
        teganganMaksStr: `${maxVolt.toFixed(3).replace(".", ",")} V`,
        pearsonR: pResult.r,
        pearsonRStr: pResult.rStr,
        pValue: pResult.pValue,
        pValueStr: pResult.pValueStr,
        n: pResult.n,
        h1Interpretation: pResult.interpretation,
        r2Val: reg.rSquared,
        r2Str,
        predPraTargetVal,
        predPraTargetStr,
        errorAbsVal,
        errorAbsStr,
        rawMinVolt: minVolt,
        rawMaxVolt: maxVolt,
      };
    };

    const analyzedCycles = cycles.map(analyzeCycle);
    const activeAnalyzed = analyzedCycles.filter((c) => c.hasData);

    let avgReductionStr = "—";
    let avgTargetTimeStr = "—";
    let voltageRangeStr = "—";
    let maeStr = "—";

    if (activeAnalyzed.length > 0) {
      const sumPct = activeAnalyzed.reduce((acc, c) => acc + c.penurunanPct, 0);
      const avgPct = sumPct / activeAnalyzed.length;
      avgReductionStr = `${avgPct.toFixed(2).replace(".", ",")}%`;

      const validTargetTimes = activeAnalyzed.map((c) => c.waktuTargetVal).filter((v): v is number => v !== null);
      if (validTargetTimes.length > 0) {
        const avgT = Math.round(validTargetTimes.reduce((a, b) => a + b, 0) / validTargetTimes.length);
        avgTargetTimeStr = `${avgT} jam`;
      }

      const allMinV = activeAnalyzed.map((c) => c.rawMinVolt).filter((v): v is number => v !== null);
      const allMaxV = activeAnalyzed.map((c) => c.rawMaxVolt).filter((v): v is number => v !== null);
      if (allMinV.length > 0 && allMaxV.length > 0) {
        const minV = Math.min(...allMinV).toFixed(2).replace(".", ",");
        const maxV = Math.max(...allMaxV).toFixed(2).replace(".", ",");
        voltageRangeStr = `${minV}–${maxV} V`;
      }

      const validErrors = activeAnalyzed.map((c) => c.errorAbsVal).filter((v): v is number => v !== null);
      if (validErrors.length > 0) {
        const mae = validErrors.reduce((a, b) => a + b, 0) / validErrors.length;
        maeStr = `${mae.toFixed(2).replace(".", ",")} jam`;
      }
    }

    const allHours = Array.from(
      new Set([...s1.map((r) => r.hour), ...s2.map((r) => r.hour), ...s3.map((r) => r.hour)])
    ).sort((a, b) => a - b);

    const s1Awal = s1[0]?.tds ?? 0;
    const s2Awal = s2[0]?.tds ?? 0;
    const s3Awal = s3[0]?.tds ?? 0;

    const tdsReductionChartData = allHours.map((h) => {
      const r1 = s1.find((r) => r.hour === h);
      const r2 = s2.find((r) => r.hour === h);
      const r3 = s3.find((r) => r.hour === h);

      const s1Pct = r1 && s1Awal > 0 ? Number((((s1Awal - r1.tds) / s1Awal) * 100).toFixed(2)) : undefined;
      const s2Pct = r2 && s2Awal > 0 ? Number((((s2Awal - r2.tds) / s2Awal) * 100).toFixed(2)) : undefined;
      const s3Pct = r3 && s3Awal > 0 ? Number((((s3Awal - r3.tds) / s3Awal) * 100).toFixed(2)) : undefined;

      return {
        hour: h,
        s1Pct: h === 0 ? 0 : s1Pct,
        s2Pct: h === 0 ? 0 : s2Pct,
        s3Pct: h === 0 ? 0 : s3Pct,
      };
    });

    const continuousVoltageData: { cumHour: number; voltage: number; cycle: string }[] = [];
    let offsetHour = 0;
    let s2StartHour = 0;
    let s3StartHour = 0;

    if (s1.length > 0) {
      s1.forEach((r) => {
        continuousVoltageData.push({
          cumHour: r.hour,
          voltage: r.voltage,
          cycle: "Siklus 1",
        });
      });
      offsetHour = s1[s1.length - 1].hour;
      s2StartHour = offsetHour;
    }

    if (s2.length > 0) {
      s2.forEach((r) => {
        continuousVoltageData.push({
          cumHour: offsetHour + r.hour,
          voltage: r.voltage,
          cycle: "Siklus 2",
        });
      });
      offsetHour += s2[s2.length - 1].hour;
      s3StartHour = offsetHour;
    }

    if (s3.length > 0) {
      s3.forEach((r) => {
        continuousVoltageData.push({
          cumHour: offsetHour + r.hour,
          voltage: r.voltage,
          cycle: "Siklus 3",
        });
      });
    }

    const positiveCount = activeAnalyzed.filter((c) => c.pearsonR != null && c.pearsonR > 0).length;
    const sigCount = activeAnalyzed.filter((c) => c.pValue != null && c.pValue < 0.05).length;
    const rVals = activeAnalyzed.map((c) => c.pearsonR).filter((v): v is number => v != null);
    let rangeRStr = "—";
    if (rVals.length > 0) {
      const minR = Math.min(...rVals);
      const maxR = Math.max(...rVals);
      const minRStr = (minR >= 0 ? "+" : "") + minR.toFixed(2).replace(".", ",");
      const maxRStr = (maxR >= 0 ? "+" : "") + maxR.toFixed(2).replace(".", ",");
      rangeRStr = `${minRStr} sampai ${maxRStr}`;
    }

    const r2Vals = activeAnalyzed.map((c) => c.r2Val).filter((v): v is number => v != null);
    let rangeR2Str = "—";
    let avgR2Str = "—";
    if (r2Vals.length > 0) {
      const minR2 = Math.min(...r2Vals).toFixed(2).replace(".", ",");
      const maxR2 = Math.max(...r2Vals).toFixed(2).replace(".", ",");
      rangeR2Str = `${minR2}–${maxR2}`;
      const avgR2 = (r2Vals.reduce((a, b) => a + b, 0) / r2Vals.length).toFixed(2).replace(".", ",");
      avgR2Str = avgR2;
    }

    const errVals = activeAnalyzed.map((c) => c.errorAbsVal).filter((v): v is number => v != null);
    let rangeErrorStr = "—";
    if (errVals.length > 0) {
      const minErr = Math.min(...errVals).toFixed(1).replace(".", ",");
      const maxErr = Math.max(...errVals).toFixed(1).replace(".", ",");
      rangeErrorStr = `${minErr}–${maxErr} jam`;
    }

    return {
      analyzedCycles,
      topMetrics: {
        avgReductionStr,
        avgTargetTimeStr,
        voltageRangeStr,
        maeStr,
      },
      tdsReductionChartData,
      continuousVoltageData,
      s2StartHour,
      s3StartHour,
      h1Summary: {
        positiveCount,
        sigCount,
        rangeRStr,
        textInterpretation: `Ketiga siklus menunjukkan arah hubungan positif antara persentase penurunan TDS dan tegangan MFC. Kekuatan hubungan bervariasi antar-siklus dan hubungan signifikan ditemukan pada ${sigCount} dari ${activeAnalyzed.length} siklus.`,
      },
      h2Summary: {
        rangeR2Str,
        avgR2Str,
        rangeErrorStr,
        maeStr,
        textInterpretation: `Model regresi linier menunjukkan kecocokan pola yang relatif konsisten pada ketiga siklus. Perbedaan antara prediksi terakhir pra-target dan waktu target teramati menghasilkan MAE ${maeStr}.`,
      },
      threeCycleSummary: {
        avgReductionPct: avgReductionStr,
        avgTargetTime: avgTargetTimeStr,
        voltageRange: voltageRangeStr,
        h1PosCount: positiveCount,
        h1SigCount: sigCount,
        h1Range: rangeRStr,
        mae: maeStr,
        r2S1: analyzedCycles[0]?.r2Str || "—",
        r2S2: analyzedCycles[1]?.r2Str || "—",
        r2S3: analyzedCycles[2]?.r2Str || "—",
      },
    };
  }, [cycleDataMap]);

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
      csv = "\uFEFF=== RINGKASAN KINERJA PENGOLAHAN (SIKLUS 1 - 3) ===\n";
      csv += "Siklus;TDS Awal;TDS Akhir;Penurunan (%);Waktu Target Teramati;Tegangan Awal;Tegangan Maks.\n";
      comparisonAnalytics.analyzedCycles.forEach((r) => {
        csv += `${r.id};${r.tdsAwalStr};${r.tdsAkhirStr};${r.penurunanPctStr};${r.waktuTargetStr};${r.teganganAwalStr};${r.teganganMaksStr}\n`;
      });

      csv += "\n=== H1: HUBUNGAN % PENURUNAN TDS DENGAN TEGANGAN ===\n";
      csv += "Siklus;Pearson r;p-value;n;Interpretasi\n";
      comparisonAnalytics.analyzedCycles.forEach((r) => {
        csv += `${r.id};${r.pearsonRStr};${r.pValueStr};${r.n};${r.h1Interpretation}\n`;
      });

      csv += "\n=== H2: KINERJA PREDIKSI REGRESI LINIER ===\n";
      csv += "Siklus;R2;Prediksi Terakhir Pra-Target;Waktu Target Teramati;Error Absolut\n";
      comparisonAnalytics.analyzedCycles.forEach((r) => {
        csv += `${r.id};${r.r2Str};${r.predPraTargetStr};${r.waktuTargetStr};${r.errorAbsStr}\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `ringkasan-perbandingan-siklus-${Date.now()}.csv`
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
            <TypewriterText text="Data Penelitian" />
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
              <div className="h-[320px] w-full mt-4 pb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={singleCycleChartData} margin={{ top: 25, right: 35, left: 10, bottom: 45 }}>
                    <defs>
                      <linearGradient id="colorTdsSingle" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0284C7" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#0284C7" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" vertical={true} horizontal={true} strokeOpacity={0.6} />
                    <XAxis
                      dataKey="hour"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                      padding={{ left: 25, right: 25 }}
                      tickMargin={10}
                      label={{ value: "Jam ke-", position: "insideBottom", offset: -25, fill: "#475569", fontSize: 11, fontWeight: 500 }}
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
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white/95 border border-sky-900/15 p-3 rounded-xl text-xs space-y-1 shadow-2xl backdrop-blur-md text-slate-900">
                              <p className="text-slate-900 font-semibold">Jam ke-{data.hour} ({data.actualTime || "Aktual"})</p>
                              <div className="flex items-center gap-2">
                                <span className="text-sky-700 font-bold">
                                  TDS: {typeof data.tds === 'number' ? data.tds.toLocaleString('id-ID') : data.tds} mg/L
                                </span>
                              </div>
                              {data.status && (
                                <p className="text-[10px] text-slate-500 font-medium">Status: {data.status}</p>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine y={1000} stroke="#EF4444" strokeDasharray="3 3" label={{ value: "Target Operasional TDS ≤1.000 mg/L", fill: "#EF4444", fontSize: 10, position: "insideTopLeft" }} />
                    <Area
                      type="monotone"
                      dataKey="tds"
                      name="TDS (mg/L)"
                      stroke="#0284C7"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorTdsSingle)"
                      dot={{ fill: '#0284C7', stroke: '#FFFFFF', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: "#0284C7" }}
                    />
                  </AreaChart>
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
              <div className="h-[320px] w-full mt-4 pb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={singleCycleChartData} margin={{ top: 25, right: 35, left: 10, bottom: 45 }}>
                    <defs>
                      <linearGradient id="colorVoltSingle" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#16A34A" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#16A34A" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" vertical={true} horizontal={true} strokeOpacity={0.6} />
                    <XAxis
                      dataKey="hour"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                      padding={{ left: 25, right: 25 }}
                      tickMargin={10}
                      label={{ value: "Jam ke-", position: "insideBottom", offset: -25, fill: "#475569", fontSize: 11, fontWeight: 500 }}
                    />
                    <YAxis
                      stroke="#64748B"
                      fontSize={11}
                      domain={singleCycleVoltDomain}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                      width={45}
                      tickFormatter={(v) => typeof v === 'number' ? v.toFixed(2).replace('.', ',') : v}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white/95 border border-sky-900/15 p-3 rounded-xl text-xs space-y-1 shadow-2xl backdrop-blur-md text-slate-900">
                              <p className="text-slate-900 font-semibold">Jam ke-{data.hour} ({data.actualTime || "Aktual"})</p>
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-700 font-bold">
                                  Tegangan: {typeof data.voltage === 'number' ? data.voltage.toFixed(3).replace('.', ',') : data.voltage} V
                                </span>
                              </div>
                              {data.status && (
                                <p className="text-[10px] text-slate-500 font-medium">Status: {data.status}</p>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="voltage"
                      name="Tegangan (V)"
                      stroke="#16A34A"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorVoltSingle)"
                      dot={{ fill: '#16A34A', stroke: '#FFFFFF', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: "#16A34A" }}
                    />
                  </AreaChart>
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
                      domain={[minScatterX, maxScatterX]}
                      tickFormatter={(v) => `${v}%`}
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
                      domain={['auto', 'auto']}
                      tickFormatter={(v) => v.toFixed(3).replace('.', ',')}
                      width={45}
                    />
                    <ZAxis type="number" range={[100, 100]} />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          if (data.isTrendline) return null;
                          return (
                            <div className="bg-slate-900/95 text-white p-2.5 border border-slate-700 rounded-xl shadow-xl text-xs font-semibold backdrop-blur-md">
                              <p className="text-sky-400 font-mono font-bold">
                                Penurunan TDS: {data.x.toFixed(2).replace('.', ',')}%
                              </p>
                              <p className="text-emerald-400 font-mono font-bold">
                                Tegangan MFC: {data.y.toFixed(3).replace('.', ',')} V
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {/* Telemetry Scatter Points (Green Dots) */}
                    <Scatter
                      name="Titik Data"
                      data={sortedScatterData}
                      fill="#16A34A"
                      line={false}
                      shape={<RenderScatterDotWithLabel />}
                    />
                    {/* Linear Regression Line (Straight Blue Dashed Line) */}
                    <Scatter
                      name="Regresi Linear"
                      data={trendlineData}
                      line={{ stroke: '#0284C7', strokeWidth: 2, strokeDasharray: '6 6' }}
                      shape={() => <g />}
                      legendType="none"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-2 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#16A34A]"></span>
                  <span>Titik data telemetri</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-8 border-b-2 border-dashed border-[#0284C7]"></span>
                  <span>Garis regresi linear</span>
                </div>
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
        <div className="space-y-8">
          {/* 1. Empat Kartu Atas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <Droplet size={17} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Rata-rata Penurunan TDS</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-3xl sm:text-4xl font-extrabold text-sky-600 tracking-tight">
                  {comparisonAnalytics.topMetrics.avgReductionStr}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">
                  Rata-rata dari 3 siklus
                </p>
              </div>
            </MagneticCard>

            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <Clock size={17} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Rata-rata Waktu Mencapai Target</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-3xl sm:text-4xl font-extrabold text-sky-600 tracking-tight">
                  {comparisonAnalytics.topMetrics.avgTargetTimeStr}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">Target Operasional TDS ≤1.000 mg/L</p>
              </div>
            </MagneticCard>

            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <Zap size={17} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Rentang Tegangan MFC</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-3xl sm:text-4xl font-extrabold text-sky-600 tracking-tight">
                  {comparisonAnalytics.topMetrics.voltageRangeStr}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">
                  Rentang tegangan selama 3 siklus
                </p>
              </div>
            </MagneticCard>

            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <ChartIcon size={17} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">MAE Prediksi Waktu</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-3xl sm:text-4xl font-extrabold text-sky-600 tracking-tight">
                  {comparisonAnalytics.topMetrics.maeStr}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">Rata-rata error absolut prediksi waktu</p>
              </div>
            </MagneticCard>
          </div>

          {/* 2. Side by Side Comparison Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Chart: Perbandingan Penurunan TDS Antar-Siklus */}
            <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-base">
                    Perbandingan Penurunan TDS Antar-Siklus
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Penurunan TDS (%)</p>
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
                  <LineChart data={comparisonAnalytics.tdsReductionChartData} margin={{ top: 25, right: 35, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" vertical={true} horizontal={true} strokeOpacity={0.6} />
                    <XAxis dataKey="hour" stroke="#64748B" fontSize={11} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} padding={{ left: 20, right: 20 }} minTickGap={20} label={{ value: "Jam ke-", position: "insideBottom", offset: -15, fill: "#475569", fontSize: 11, fontWeight: 500 }} />
                    <YAxis stroke="#64748B" fontSize={11} domain={['auto', 'auto']} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} width={45} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white/95 border border-sky-900/15 p-3 rounded-xl text-xs space-y-1.5 shadow-2xl backdrop-blur-md text-slate-900">
                              <p className="text-slate-900 font-semibold border-b border-slate-100 pb-1">Jam ke-{label}</p>
                              {payload.map((entry: any, i: number) => (
                                <div key={i} className="flex items-center justify-between gap-4">
                                  <span className="flex items-center gap-1.5 font-medium" style={{ color: entry.color }}>
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                    {entry.name}:
                                  </span>
                                  <span className="font-mono font-bold" style={{ color: entry.color }}>
                                    {entry.value != null ? `${entry.value}%` : "—"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line connectNulls={true} type="monotone" dataKey="s1Pct" name="Siklus 1" stroke="#0284C7" strokeWidth={2.5} dot={{ fill: '#0284C7', stroke: '#FFFFFF', strokeWidth: 1.5, r: 3 }} activeDot={{ r: 5 }} />
                    <Line connectNulls={true} type="monotone" dataKey="s2Pct" name="Siklus 2" stroke="#D97706" strokeWidth={2.5} dot={{ fill: '#D97706', stroke: '#FFFFFF', strokeWidth: 1.5, r: 3 }} activeDot={{ r: 5 }} />
                    <Line connectNulls={true} type="monotone" dataKey="s3Pct" name="Siklus 3" stroke="#16A34A" strokeWidth={2.5} dot={{ fill: '#16A34A', stroke: '#FFFFFF', strokeWidth: 1.5, r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Right Chart: Perkembangan Tegangan MFC Selama Tiga Siklus */}
            <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-base">
                    Perkembangan Tegangan MFC Selama Tiga Siklus
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Reaktor Utama (S1 → S2 → S3)</p>
                </div>
              </div>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={comparisonAnalytics.continuousVoltageData} margin={{ top: 25, right: 25, left: 10, bottom: 25 }}>
                    <defs>
                      <linearGradient id="colorVoltContinuous" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0284C7" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#0284C7" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" vertical={true} horizontal={true} strokeOpacity={0.6} />
                    <XAxis dataKey="cumHour" stroke="#64748B" fontSize={11} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} padding={{ left: 20, right: 20 }} minTickGap={25} label={{ value: "Waktu Eksperimen Kumulatif (Jam)", position: "insideBottom", offset: -15, fill: "#475569", fontSize: 11, fontWeight: 500 }} />
                    <YAxis stroke="#64748B" fontSize={11} domain={['auto', 'auto']} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} width={45} tickFormatter={(v) => typeof v === 'number' ? v.toFixed(2).replace('.', ',') : v} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white/95 border border-sky-900/15 p-3 rounded-xl text-xs space-y-1 shadow-2xl backdrop-blur-md text-slate-900">
                              <p className="text-slate-900 font-semibold">Jam Kumulatif: {data.cumHour} ({data.cycle || "Siklus"})</p>
                              <div className="flex items-center gap-2">
                                <span className="text-sky-700 font-bold">
                                  Tegangan: {typeof data.voltage === 'number' ? data.voltage.toFixed(3).replace('.', ',') : data.voltage} V
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {comparisonAnalytics.s2StartHour > 0 && (
                      <ReferenceLine x={comparisonAnalytics.s2StartHour} stroke="#94A3B8" strokeDasharray="3 3" label={{ value: "Mulai S2", position: "top", fill: "#334155", fontSize: 10, fontWeight: 700 }} />
                    )}
                    {comparisonAnalytics.s3StartHour > 0 && (
                      <ReferenceLine x={comparisonAnalytics.s3StartHour} stroke="#94A3B8" strokeDasharray="3 3" label={{ value: "Mulai S3", position: "top", fill: "#334155", fontSize: 10, fontWeight: 700 }} />
                    )}
                    <Area type="monotone" dataKey="voltage" name="Tegangan Reaktor Utama" stroke="#0284C7" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVoltContinuous)" dot={{ fill: '#0284C7', stroke: '#FFFFFF', strokeWidth: 1.5, r: 3.5 }} activeDot={{ r: 6, fill: "#0284C7" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* 3. Ringkasan Kinerja Pengolahan Card */}
          <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base">
                Ringkasan Kinerja Pengolahan
              </h3>
              <button
                onClick={handleDownloadCSV}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors shadow-sm"
              >
                <Download size={14} />
                Download CSV Ringkasan
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-slate-500 bg-slate-100/80 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Siklus</th>
                    <th className="py-2.5 px-4 font-semibold">TDS Awal</th>
                    <th className="py-2.5 px-4 font-semibold">TDS Akhir</th>
                    <th className="py-2.5 px-4 font-semibold">Penurunan (%)</th>
                    <th className="py-2.5 px-4 font-semibold">Waktu Target Teramati</th>
                    <th className="py-2.5 px-4 font-semibold">Tegangan Awal</th>
                    <th className="py-2.5 px-4 font-semibold">Tegangan Maks.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {comparisonAnalytics.analyzedCycles.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-sky-700">{row.id}</td>
                      <td className="py-3 px-4 font-mono">{row.tdsAwalStr}</td>
                      <td className="py-3 px-4 font-mono">{row.tdsAkhirStr}</td>
                      <td className="py-3 px-4 font-mono font-bold text-sky-700">{row.penurunanPctStr}</td>
                      <td className="py-3 px-4 font-mono">{row.waktuTargetStr}</td>
                      <td className="py-3 px-4 font-mono">{row.teganganAwalStr}</td>
                      <td className="py-3 px-4 font-mono">{row.teganganMaksStr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* 4. H1 Section Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* H1 Table */}
            <Card className="lg:col-span-7 p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base mb-4">
                H1 — Hubungan % Penurunan TDS dengan Tegangan
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-slate-500 bg-slate-100/80 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Siklus</th>
                      <th className="py-2.5 px-3 font-semibold">Pearson r</th>
                      <th className="py-2.5 px-3 font-semibold">p-value</th>
                      <th className="py-2.5 px-3 font-semibold">n</th>
                      <th className="py-2.5 px-3 font-semibold">Interpretasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {comparisonAnalytics.analyzedCycles.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 font-bold text-sky-700">{row.id}</td>
                        <td className="py-3 px-3 font-mono font-bold text-sky-700">{row.pearsonRStr}</td>
                        <td className="py-3 px-3 font-mono">{row.pValueStr}</td>
                        <td className="py-3 px-3 font-mono">{row.n}</td>
                        <td className="py-3 px-3">{row.h1Interpretation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* H1 Summary */}
            <Card className="lg:col-span-5 p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5 flex flex-col justify-between">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base mb-4">
                  Ringkasan H1 Antar-Siklus
                </h3>
                <div className="space-y-3 text-xs text-slate-700 font-medium">
                  <div className="flex items-center gap-2.5">
                    <TrendingDown size={15} className="text-sky-600 flex-shrink-0" />
                    <span>Arah hubungan positif: <strong className="text-slate-900">{comparisonAnalytics.h1Summary.positiveCount} dari 3 siklus</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5 border-t border-slate-100 pt-2.5">
                    <CheckCircle2 size={15} className="text-sky-600 flex-shrink-0" />
                    <span>Signifikan pada α = 0,05: <strong className="text-slate-900">{comparisonAnalytics.h1Summary.sigCount} dari 3 siklus</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5 border-t border-slate-100 pt-2.5">
                    <BarChart3 size={15} className="text-sky-600 flex-shrink-0" />
                    <span>Rentang Pearson r: <strong className="text-slate-900">{comparisonAnalytics.h1Summary.rangeRStr}</strong></span>
                  </div>
                  <div className="border-t border-slate-100 pt-3 text-slate-600 leading-relaxed font-normal">
                    <p className="flex items-start gap-2">
                      <Info size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
                      <span>{comparisonAnalytics.h1Summary.textInterpretation}</span>
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* 5. H2 Section Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* H2 Table */}
            <Card className="lg:col-span-7 p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base mb-4">
                H2 — Kinerja Prediksi Regresi Linier
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-slate-500 bg-slate-100/80 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Siklus</th>
                      <th className="py-2.5 px-3 font-semibold">R²</th>
                      <th className="py-2.5 px-3 font-semibold">Prediksi Terakhir Pra-Target</th>
                      <th className="py-2.5 px-3 font-semibold">Waktu Target Teramati</th>
                      <th className="py-2.5 px-3 font-semibold">Error Absolut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {comparisonAnalytics.analyzedCycles.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 font-bold text-sky-700">{row.id}</td>
                        <td className="py-3 px-3 font-mono font-bold text-sky-700">{row.r2Str}</td>
                        <td className="py-3 px-3 font-mono">{row.predPraTargetStr}</td>
                        <td className="py-3 px-3 font-mono">{row.waktuTargetStr}</td>
                        <td className="py-3 px-3 font-mono">{row.errorAbsStr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* H2 Summary */}
            <Card className="lg:col-span-5 p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5 flex flex-col justify-between">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base mb-4">
                  Ringkasan H2 Antar-Siklus
                </h3>
                <div className="space-y-3 text-xs text-slate-700 font-medium">
                  <div className="flex items-center gap-2.5">
                    <ChartIcon size={15} className="text-sky-600 flex-shrink-0" />
                    <span>Rentang R²: <strong className="text-slate-900">{comparisonAnalytics.h2Summary.rangeR2Str}</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5 border-t border-slate-100 pt-2.5">
                    <Target size={15} className="text-sky-600 flex-shrink-0" />
                    <span>Rata-rata R²: <strong className="text-slate-900">{comparisonAnalytics.h2Summary.avgR2Str}</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5 border-t border-slate-100 pt-2.5">
                    <Hourglass size={15} className="text-sky-600 flex-shrink-0" />
                    <span>Rentang Error Prediksi: <strong className="text-slate-900">{comparisonAnalytics.h2Summary.rangeErrorStr}</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5 border-t border-slate-100 pt-2.5">
                    <Clock size={15} className="text-sky-600 flex-shrink-0" />
                    <span>MAE Prediksi Waktu: <strong className="text-slate-900">{comparisonAnalytics.h2Summary.maeStr}</strong></span>
                  </div>
                  <div className="border-t border-slate-100 pt-3 text-slate-600 leading-relaxed font-normal">
                    <p className="flex items-start gap-2">
                      <Info size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
                      <span>{comparisonAnalytics.h2Summary.textInterpretation}</span>
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* 6. Ringkasan Hasil Tiga Siklus (4 Cards in a Row/Grid) */}
          <div>
            <h3 className="font-display font-bold text-slate-900 text-base mb-4">
              Ringkasan Hasil Tiga Siklus
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <Card className="p-5 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5 flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-sky-100/80 text-sky-600 flex items-center justify-center mb-3">
                    <Droplet size={20} />
                  </div>
                  <h4 className="font-display font-bold text-slate-900 text-sm mb-2">Pengolahan TDS</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Rata-rata penurunan TDS ketiga siklus sebesar {comparisonAnalytics.threeCycleSummary.avgReductionPct}, dengan rata-rata waktu mencapai target operasional TDS ≤1.000 mg/L sebesar {comparisonAnalytics.threeCycleSummary.avgTargetTime}.
                  </p>
                </div>
              </Card>

              <Card className="p-5 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5 flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-sky-100/80 text-sky-600 flex items-center justify-center mb-3">
                    <Zap size={20} />
                  </div>
                  <h4 className="font-display font-bold text-slate-900 text-sm mb-2">Tegangan MFC</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Tegangan selama tiga siklus berada pada rentang {comparisonAnalytics.threeCycleSummary.voltageRange}.
                  </p>
                </div>
              </Card>

              <Card className="p-5 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5 flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-sky-100/80 text-sky-600 flex items-center justify-center mb-3">
                    <Activity size={20} />
                  </div>
                  <h4 className="font-display font-bold text-slate-900 text-sm mb-2">Hubungan TDS–Tegangan (H1)</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Hubungan positif ditemukan pada {comparisonAnalytics.threeCycleSummary.h1PosCount} dari 3 siklus dan signifikan pada {comparisonAnalytics.threeCycleSummary.h1SigCount} dari 3 siklus, dengan rentang Pearson r {comparisonAnalytics.threeCycleSummary.h1Range}.
                  </p>
                </div>
              </Card>

              <Card className="p-5 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5 flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-sky-100/80 text-sky-600 flex items-center justify-center mb-3">
                    <BarChart3 size={20} />
                  </div>
                  <h4 className="font-display font-bold text-slate-900 text-sm mb-2">Prediksi Regresi (H2)</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Model menghasilkan MAE prediksi waktu {comparisonAnalytics.threeCycleSummary.mae}, dengan R² Siklus 1 = {comparisonAnalytics.threeCycleSummary.r2S1}, Siklus 2 = {comparisonAnalytics.threeCycleSummary.r2S2}, dan Siklus 3 = {comparisonAnalytics.threeCycleSummary.r2S3}.
                  </p>
                </div>
              </Card>
            </div>

            <p className="text-xs text-slate-500 font-semibold mt-4">
              Catatan: Target operasional penelitian dibatasi pada parameter TDS ≤1.000 mg/L.
            </p>
          </div>

          {/* 7. Footer Bar */}
          <div className="pt-6 border-t border-slate-200 text-center text-xs font-semibold text-slate-500">
            Target Operasional: TDS ≤1.000 mg/L &nbsp;|&nbsp; α = 0,05 &nbsp;|&nbsp; Sumber data: Siklus 1–3
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
                    <AreaChart data={praSiklusChartData} margin={{ top: 25, right: 35, left: 10, bottom: 35 }}>
                      <defs>
                        <linearGradient id="colorTdsPra" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0284C7" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#0284C7" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" vertical={true} horizontal={true} strokeOpacity={0.6} />
                      <XAxis
                        dataKey="waktu"
                        stroke="#64748B"
                        fontSize={10}
                        tickLine={false}
                        axisLine={{ stroke: "#CBD5E1" }}
                        padding={{ left: 25, right: 25 }}
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
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white/95 border border-sky-900/15 p-3 rounded-xl text-xs space-y-1 shadow-2xl backdrop-blur-md text-slate-900">
                                <p className="text-slate-900 font-semibold">{data.waktu}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-sky-700 font-bold">
                                    TDS: {typeof data.tds === 'number' ? data.tds.toLocaleString('id-ID') : data.tds} mg/L
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="tds"
                        name="TDS (mg/L)"
                        stroke="#0284C7"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorTdsPra)"
                        dot={{ fill: '#0284C7', stroke: '#FFFFFF', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: "#0284C7" }}
                      />
                    </AreaChart>
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
                    <AreaChart data={praSiklusChartData} margin={{ top: 25, right: 35, left: 10, bottom: 35 }}>
                      <defs>
                        <linearGradient id="colorVoltPra" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#16A34A" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#16A34A" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" vertical={true} horizontal={true} strokeOpacity={0.6} />
                      <XAxis
                        dataKey="waktu"
                        stroke="#64748B"
                        fontSize={10}
                        tickLine={false}
                        axisLine={{ stroke: "#CBD5E1" }}
                        padding={{ left: 25, right: 25 }}
                        tickMargin={10}
                      />
                      <YAxis
                        stroke="#64748B"
                        fontSize={11}
                        domain={praSiklusVoltDomain}
                        tickLine={false}
                        axisLine={{ stroke: "#CBD5E1" }}
                        width={45}
                        tickFormatter={(v) => typeof v === 'number' ? v.toFixed(2).replace('.', ',') : v}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white/95 border border-sky-900/15 p-3 rounded-xl text-xs space-y-1 shadow-2xl backdrop-blur-md text-slate-900">
                                <p className="text-slate-900 font-semibold">{data.waktu}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-emerald-700 font-bold">
                                    Tegangan: {typeof data.voltage === 'number' ? data.voltage.toFixed(3).replace('.', ',') : data.voltage} V
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="voltage"
                        name="Tegangan (V)"
                        stroke="#16A34A"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorVoltPra)"
                        dot={{ fill: '#16A34A', stroke: '#FFFFFF', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: "#16A34A" }}
                      />
                    </AreaChart>
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
        <MicroEnergyModule />
      )}
    </div>
  );
}

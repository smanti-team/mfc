"use client";

import { useState, useEffect, useMemo } from "react";
import MagneticCard from "@/components/MagneticCard";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { fetchSummary } from "@/lib/api";
import type { Summary } from "@/lib/types";
import { calculateTdsRegression, type CycleReading } from "@/lib/regression";
import {
  Download,
  Database,
  Clock,
  Droplet,
  Target,
  TrendingDown,
  Info,
  Hourglass,
  LineChart as ChartIcon,
  Zap,
  FlaskConical,
  Wifi,
  WifiOff,
  Check,
  Flag,
} from "lucide-react";
import {
  ResponsiveContainer,
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

// Student t-distribution two-tailed p-value approximation
function logGamma(z: number): number {
  const c = [
    57.1562356658629235, -59.5979603554754912, 14.1360419733309255,
    -0.491913816097620199, 0.339946499848118887e-4, 0.465236289270485756e-4,
    -0.983744753048795646e-4, 0.158088703224912488e-3, -0.210264441724104883e-3,
    0.217439618115212643e-3, -0.16431810653676389e-3, 0.844182239838527433e-4,
    -0.261908384015814086e-4, 0.368991826595316227e-5,
  ];
  let y = z;
  let tmp = z + 5.2421875;
  tmp = (z + 0.5) * Math.log(tmp) - tmp;
  let ser = 0.9999999999999970918;
  for (let j = 0; j < 14; j++) {
    y += 1;
    ser += c[j] / y;
  }
  return tmp + Math.log((2.5066282746310005 * ser) / z);
}

function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const maxIter = 100;
  const eps = 3e-7;
  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;

  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < eps) d = eps;
  d = 1 / d;
  let c = 1;
  let h = d;

  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < eps) d = eps;
    c = 1 + aa / c;
    if (Math.abs(c) < eps) c = eps;
    d = 1 / d;
    h *= d * c;

    aa = -((a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d;
    if (Math.abs(d) < eps) d = eps;
    c = 1 + aa / c;
    if (Math.abs(c) < eps) c = eps;
    d = 1 / d;
    const del = d * c;
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

  let sumX = 0,
    sumY = 0;
  for (const p of xyPairs) {
    sumX += p.x;
    sumY += p.y;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0,
    denomX = 0,
    denomY = 0;
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
  const rStr = `${signStr}${Math.abs(clampedR).toFixed(3).replace(".", ",")}`;
  const pValueStr = pValue < 0.001 ? "<0,001" : pValue.toFixed(3).replace(".", ",");

  const absR = Math.abs(clampedR);
  const direction = clampedR >= 0 ? "positif" : "negatif";
  let strength = "sangat lemah";
  if (absR >= 0.8) strength = "sangat kuat";
  else if (absR >= 0.6) strength = "sedang-kuat";
  else if (absR >= 0.4) strength = "sedang";
  else if (absR >= 0.2) strength = "lemah";

  const significance = pValue < 0.05 ? "signifikan (p < 0,05)" : "tidak signifikan (p > 0,05)";

  const interpretation = `Korelasi ${direction} ${strength}; ${significance}.`;

  return {
    r: clampedR,
    rStr,
    pValue,
    pValueStr,
    n,
    interpretation,
  };
}

function parseTimestamp(ts: string | number): Date {
  if (typeof ts === "number") {
    return new Date(ts * (ts < 1e11 ? 1000 : 1));
  }
  const str = String(ts).replace(" ", "T");
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatDate(ts: string | number): string {
  const d = parseTimestamp(ts);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

function formatTime(ts: string | number): string {
  const d = parseTimestamp(ts);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

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

export default function LiveDemoPage() {
  const [summary, setSummary] = useState<Summary>({ latest: null, history: [] });
  const [error, setError] = useState<string | null>(null);
  const [isApiConnected, setIsApiConnected] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Poll live data from API
  const loadSummaryData = async () => {
    try {
      const data = await fetchSummary(100, "https://mfc-d1-api.derylchrist08.workers.dev");
      setSummary(data);
      setIsApiConnected(true);
      setError(null);
    } catch (err: any) {
      setIsApiConnected(false);
      setError(err?.message || "Gagal memuat telemetri");
    }
  };

  useEffect(() => {
    loadSummaryData();
    const interval = setInterval(loadSummaryData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Sorted history chronologically
  const sortedHistory = useMemo(() => {
    if (!summary.history || summary.history.length === 0) return [];
    return [...summary.history].sort(
      (a, b) => parseTimestamp(a.timestamp).getTime() - parseTimestamp(b.timestamp).getTime()
    );
  }, [summary.history]);

  // Map into single demo dataset with interval 1 hour
  const demoReadings: CycleReading[] = useMemo(() => {
    if (sortedHistory.length === 0) return [];
    return sortedHistory.map((d, index) => {
      const v = d.voltage != null ? (d.voltage <= 20 ? d.voltage : d.voltage / 1000) : 0.2;
      return {
        hour: index, // interval 1 jam per langkah data
        actualTime: `${formatDate(d.timestamp)} ${formatTime(d.timestamp)}`,
        tds: d.tds != null ? Number(d.tds.toFixed(2)) : 0,
        voltage: Number(v.toFixed(3)),
        status: "VALID",
      };
    });
  }, [sortedHistory]);

  // Baseline and latest readings
  const baselineTds = demoReadings.length > 0 ? demoReadings[0].tds : 0;
  const latestReading = demoReadings.length > 0 ? demoReadings[demoReadings.length - 1] : null;

  // Penurunan akhir dari data pertama (%)
  const overallReductionPct =
    baselineTds > 0 && latestReading
      ? ((baselineTds - latestReading.tds) / baselineTds) * 100
      : 0;

  // Voltage range
  const voltages = demoReadings.map((r) => r.voltage);
  const minVolt = voltages.length > 0 ? Math.min(...voltages) : 0;
  const maxVolt = voltages.length > 0 ? Math.max(...voltages) : 0;

  // Linear Regression
  const regressionResult = useMemo(() => {
    return calculateTdsRegression(demoReadings);
  }, [demoReadings]);

  // Pearson Correlation
  const pearsonResult = useMemo(() => {
    return calculatePearsonCorrelation(demoReadings);
  }, [demoReadings]);

  // Target Reading (first reading <= 1000 mg/L)
  const targetReadingFirst = useMemo(() => {
    return demoReadings.find((r) => r.tds <= 1000);
  }, [demoReadings]);

  // Scatter Data: X = % Penurunan TDS, Y = Tegangan V
  const scatterData = useMemo(() => {
    if (demoReadings.length === 0 || baselineTds === 0) return [];
    return demoReadings.map((r) => {
      const reductionPct = ((baselineTds - r.tds) / baselineTds) * 100;
      return {
        x: Number(reductionPct.toFixed(2)),
        y: Number(r.voltage.toFixed(3)),
      };
    });
  }, [demoReadings, baselineTds]);

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

  // Linear Trendline Data for Scatter Plot
  const trendlineData = useMemo(() => {
    if (scatterData.length < 2) return [];

    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;
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

  // Chart data fallbacks
  const demoChartData = useMemo(() => {
    if (demoReadings.length > 0) return demoReadings;
    return [
      { hour: 0, tds: 1000, voltage: 0.3 },
      { hour: 1, tds: 1000, voltage: 0.3 },
      { hour: 2, tds: 1000, voltage: 0.3 },
      { hour: 3, tds: 1000, voltage: 0.3 },
    ];
  }, [demoReadings]);

  // Dynamic Y-Axis Domains
  const demoTdsDomain = useMemo(() => {
    if (demoReadings.length === 0) return [0, 1200];
    const vals = demoReadings
      .map((d) => d.tds)
      .filter((v): v is number => typeof v === "number" && !isNaN(v) && v > 0);
    if (vals.length === 0) return [0, 1200];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const minDomain = Math.max(0, Math.floor((min - 50) / 50) * 50);
    const maxDomain = Math.max(1050, Math.ceil((max + 50) / 50) * 50);
    return [minDomain, maxDomain];
  }, [demoReadings]);

  const demoVoltDomain = useMemo(() => {
    if (demoReadings.length === 0) return [0, 0.7];
    const vals = demoReadings
      .map((d) => d.voltage)
      .filter((v): v is number => typeof v === "number" && !isNaN(v));
    if (vals.length === 0) return [0, 0.7];
    const max = Math.max(...vals);
    const maxDomain = Math.max(0.7, Number((Math.ceil((max + 0.1) * 10) / 10).toFixed(2)));
    return [0, maxDomain];
  }, [demoReadings]);

  // Pagination for Demo Table (Max 6 rows per page)
  const rowsPerPage = 6;
  const totalPages = Math.max(1, Math.ceil(demoReadings.length / rowsPerPage));
  const startIdx = (currentPage - 1) * rowsPerPage;
  const endIdx = startIdx + rowsPerPage;
  const visibleDemoReadings = demoReadings.slice(startIdx, endIdx);

  const placeholderTableRows = useMemo(() => {
    return [
      { hour: 0, actualTime: "—", tds: null, voltage: null, status: "BELUM UJI" },
      { hour: 1, actualTime: "—", tds: null, voltage: null, status: "BELUM UJI" },
      { hour: 2, actualTime: "—", tds: null, voltage: null, status: "BELUM UJI" },
      { hour: 3, actualTime: "—", tds: null, voltage: null, status: "BELUM UJI" },
      { hour: 4, actualTime: "—", tds: null, voltage: null, status: "BELUM UJI" },
      { hour: 5, actualTime: "—", tds: null, voltage: null, status: "BELUM UJI" },
    ];
  }, []);

  const displayTableRows = useMemo(() => {
    return demoReadings.length > 0 ? visibleDemoReadings : placeholderTableRows;
  }, [demoReadings, visibleDemoReadings, placeholderTableRows]);

  // Download CSV function
  const handleDownloadCSV = () => {
    let csv = "\uFEFFJam ke-;Waktu Aktual;TDS (mg/L);Penurunan TDS (%);Tegangan (V);Status Data\n";
    demoReadings.forEach((r) => {
      const pct = baselineTds > 0 ? ((baselineTds - r.tds) / baselineTds) * 100 : 0;
      const jam = r.actualTime ? r.actualTime.replace(/:/g, ".") : "—";
      const tds = r.tds.toFixed(2).replace(".", ",");
      const pctStr = pct.toFixed(2).replace(".", ",") + "%";
      const volt = r.voltage.toFixed(3).replace(".", ",");
      csv += `${r.hour};${jam};${tds};${pctStr};${volt};${r.status}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `data-audit-demo-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
      {/* Header Section with Typewriter Effect and Status Badge */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <p className="text-sky-600 text-xs sm:text-sm font-semibold mb-1">Selamat datang di</p>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold text-slate-900 drop-shadow-sm">
            <TypewriterText text="Live Demo" />
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1.5 sm:mt-2 font-medium leading-relaxed">
            Telemetri live demo pengolahan limbah cair organik &amp; pembangkitan bio-energi SMART-MFC.
          </p>
        </div>
        <div className="self-start md:self-auto flex-shrink-0">
          <Badge
            variant={!isApiConnected || error ? "warning" : "outline-green"}
            icon={!isApiConnected || error ? <FlaskConical size={14} /> : <Wifi size={14} />}
          >
            {!isApiConnected || error ? "MODE SIMULASI" : "TERHUBUNG D1 API (LIVE)"}
          </Badge>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-sm shadow-sm backdrop-blur-md flex items-center gap-3">
          <FlaskConical className="text-amber-600 flex-shrink-0" size={18} />
          <span>Perhatian: {error}. Menampilkan data telemetri tersimpan.</span>
        </div>
      )}

      {/* Main Single-Dataset Demo View */}
      <div className="space-y-6">
        {/* Top Section: 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Jumlah Data */}
          <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                <Database size={17} strokeWidth={2.5} />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Jumlah Data</h3>
            </div>
            <div className="my-auto py-1">
              <div className="font-display text-4xl sm:text-[42px] font-extrabold text-sky-600 tracking-tight">
                {demoReadings.length}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 leading-tight">Titik Data Demo</p>
            </div>
          </MagneticCard>

          {/* Card 2: Interval 1 Jam */}
          <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                <Clock size={17} strokeWidth={2.5} />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Interval</h3>
            </div>
            <div className="my-auto py-1">
              <div className="font-display text-3xl sm:text-4xl font-extrabold text-sky-600 tracking-tight">
                1 jam
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 leading-tight">Antar Pengukuran</p>
            </div>
          </MagneticCard>

          {/* Card 3: Penurunan Akhir dari Data Pertama */}
          <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                <TrendingDown size={17} strokeWidth={2.5} />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Penurunan akhir</h3>
            </div>
            <div className="my-auto py-1">
              <div className="font-display text-3xl sm:text-4xl font-extrabold text-sky-600 tracking-tight">
                {demoReadings.length > 0 ? `${overallReductionPct.toFixed(2).replace(".", ",")}%` : "—"}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 leading-tight">
                Dari data pertama (baseline)
              </p>
            </div>
          </MagneticCard>

          {/* Card 4: Rentang Tegangan */}
          <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                <Zap size={17} strokeWidth={2.5} />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Rentang Tegangan</h3>
            </div>
            <div className="my-auto py-1">
              <div className="font-display text-2xl sm:text-3xl font-extrabold text-sky-600 tracking-tight">
                {demoReadings.length > 0
                  ? `${minVolt.toFixed(3).replace(".", ",")} – ${maxVolt.toFixed(3).replace(".", ",")} V`
                  : "—"}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 leading-tight">Selama pengujian demo</p>
            </div>
          </MagneticCard>
        </div>

        {/* Middle Section: 2 Charts Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Chart: Grafik TDS Demo */}
          <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5 relative">
            <div className="mb-2">
              <h3 className="font-display font-bold text-slate-900 text-base">Grafik TDS Demo</h3>
              <p className="text-xs text-slate-500 font-medium">TDS (mg/L)</p>
            </div>
            <div className="h-[320px] w-full mt-4 pb-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={demoChartData} margin={{ top: 25, right: 35, left: 10, bottom: 45 }}>
                  <defs>
                    <linearGradient id="colorTdsDemo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0284C7" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0284C7" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#CBD5E1"
                    vertical={true}
                    horizontal={true}
                    strokeOpacity={0.6}
                  />
                  <XAxis
                    dataKey="hour"
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#CBD5E1" }}
                    padding={{ left: 25, right: 25 }}
                    tickMargin={10}
                    label={{
                      value: "Jam ke-",
                      position: "insideBottom",
                      offset: -25,
                      fill: "#475569",
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  />
                  <YAxis
                    stroke="#64748B"
                    fontSize={11}
                    domain={demoTdsDomain}
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
                            <p className="text-slate-900 font-semibold">
                              Jam ke-{data.hour} ({data.actualTime || "Aktual"})
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-sky-700 font-bold">
                                TDS:{" "}
                                {typeof data.tds === "number"
                                  ? data.tds.toLocaleString("id-ID")
                                  : data.tds}{" "}
                                mg/L
                              </span>
                            </div>
                            {data.status && (
                              <p className="text-[10px] text-slate-500 font-medium">
                                Status: {data.status}
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={1000}
                    stroke="#EF4444"
                    strokeDasharray="3 3"
                    label={{
                      value: "Target operasional TDS ≤ 1.000 mg/L",
                      fill: "#EF4444",
                      fontSize: 10,
                      position: "insideTopLeft",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="tds"
                    name="TDS (mg/L)"
                    stroke="#0284C7"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorTdsDemo)"
                    dot={{ fill: "#0284C7", stroke: "#FFFFFF", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: "#0284C7" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Right Chart: Grafik Tegangan Demo */}
          <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5 relative">
            <div className="mb-2">
              <h3 className="font-display font-bold text-slate-900 text-base">Grafik Tegangan Demo</h3>
              <p className="text-xs text-slate-500 font-medium">Tegangan (V)</p>
            </div>
            <div className="h-[320px] w-full mt-4 pb-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={demoChartData} margin={{ top: 25, right: 35, left: 10, bottom: 45 }}>
                  <defs>
                    <linearGradient id="colorVoltDemo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16A34A" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#16A34A" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#CBD5E1"
                    vertical={true}
                    horizontal={true}
                    strokeOpacity={0.6}
                  />
                  <XAxis
                    dataKey="hour"
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#CBD5E1" }}
                    padding={{ left: 25, right: 25 }}
                    tickMargin={10}
                    label={{
                      value: "Jam ke-",
                      position: "insideBottom",
                      offset: -25,
                      fill: "#475569",
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  />
                  <YAxis
                    stroke="#64748B"
                    fontSize={11}
                    domain={demoVoltDomain}
                    tickLine={false}
                    axisLine={{ stroke: "#CBD5E1" }}
                    width={45}
                    tickFormatter={(v) => (typeof v === "number" ? v.toFixed(2).replace(".", ",") : v)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white/95 border border-sky-900/15 p-3 rounded-xl text-xs space-y-1 shadow-2xl backdrop-blur-md text-slate-900">
                            <p className="text-slate-900 font-semibold">
                              Jam ke-{data.hour} ({data.actualTime || "Aktual"})
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-700 font-bold">
                                Tegangan:{" "}
                                {typeof data.voltage === "number"
                                  ? data.voltage.toFixed(3).replace(".", ",")
                                  : data.voltage}{" "}
                                V
                              </span>
                            </div>
                            {data.status && (
                              <p className="text-[10px] text-slate-500 font-medium">
                                Status: {data.status}
                              </p>
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
                    fill="url(#colorVoltDemo)"
                    dot={{ fill: "#16A34A", stroke: "#FFFFFF", strokeWidth: 2, r: 4 }}
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
                  Data Audit Demo — Interval 1 Jam
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
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {displayTableRows.map((row: any, idx: number) => {
                      const isReal = row.tds != null;
                      const pctRed =
                        isReal && baselineTds > 0
                          ? ((baselineTds - row.tds) / baselineTds) * 100
                          : 0;
                      const pctStr = isReal ? pctRed.toFixed(2).replace(".", ",") + "%" : "—";
                      const tdsStr = isReal ? row.tds.toLocaleString("id-ID") : "—";
                      const voltStr =
                        row.voltage != null ? row.voltage.toFixed(3).replace(".", ",") : "—";

                      let badgeStyle = "bg-slate-100 text-slate-500 border-slate-200";
                      if (row.status === "VALID")
                        badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
                      if (row.status === "PERLU VERIFIKASI")
                        badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
                      if (row.status === "TIDAK TEREKAM")
                        badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";

                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{row.hour}</td>
                          <td className="py-2.5 px-3 text-slate-600">{row.actualTime}</td>
                          <td className="py-2.5 px-3 text-sky-600 font-bold">{tdsStr}</td>
                          <td className="py-2.5 px-3 text-sky-600 font-bold">{pctStr}</td>
                          <td className="py-2.5 px-3 text-emerald-600 font-bold">{voltStr}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeStyle}`}
                            >
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
                  Menampilkan {demoReadings.length > 0 ? startIdx + 1 : 1}–
                  {demoReadings.length > 0 ? Math.min(endIdx, demoReadings.length) : 6} dari{" "}
                  {demoReadings.length > 0 ? demoReadings.length : 6} data demo
                </span>
                <div className="flex items-center gap-2 font-semibold">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || demoReadings.length === 0}
                    className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors"
                  >
                    ← Sebelumnya
                  </button>
                  <span className="text-slate-700 font-mono">
                    Halaman <strong className="text-slate-900">{currentPage}</strong> dari{" "}
                    <strong>{totalPages}</strong>
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || demoReadings.length === 0}
                    className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors"
                  >
                    Selanjutnya →
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <Database size={13} className="text-slate-400" />
                <span>Sumber data: ESP32/AIO SMART-MFC • Timestamp tersimpan otomatis</span>
              </div>
            </div>
          </Card>

          {/* Right Card: Evaluasi Prediksi Regresi Linier */}
          <Card className="lg:col-span-5 p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5 flex flex-col justify-between">
            <div>
              <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base mb-4">
                Evaluasi Prediksi Regresi Linier
              </h3>

              <div className="space-y-3 text-xs text-slate-700 font-medium">
                <div className="flex items-center gap-2 text-sky-700 font-semibold">
                  <Droplet size={15} className="text-sky-600 flex-shrink-0" />
                  <span>Target Operasional TDS ≤ 1.000 mg/L</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <span className="flex items-center gap-2">
                    <Info size={15} className="text-sky-600 flex-shrink-0" />
                    Status Prediksi
                  </span>
                  <span
                    className={`font-semibold ${
                      targetReadingFirst
                        ? "text-emerald-600"
                        : regressionResult.isValid
                        ? "text-sky-600"
                        : "text-amber-600"
                    }`}
                  >
                    {targetReadingFirst
                      ? "Target TDS ≤ 1.000 mg/L tercapai"
                      : regressionResult.isValid
                      ? "Mengestimasi target operasional"
                      : "Menunggu data tambahan"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <span className="flex items-center gap-2">
                    <ChartIcon size={15} className="text-sky-600 flex-shrink-0" />
                    Slope regresi
                  </span>
                  <span className="font-mono font-bold text-sky-700">
                    {demoReadings.length >= 3
                      ? `${regressionResult.a >= 0 ? "+" : ""}${regressionResult.a
                          .toFixed(3)
                          .replace(".", ",")} mg/L/jam`
                      : "Menunggu data"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <span className="flex items-center gap-2">
                    <Target size={15} className="text-sky-600 flex-shrink-0" />
                    R² regresi
                  </span>
                  <span className="font-mono font-bold text-sky-700">
                    {demoReadings.length >= 3 ? regressionResult.rSquaredStr : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <span className="flex items-center gap-2">
                    <Clock size={15} className="text-sky-600 flex-shrink-0" />
                    Waktu target teramati
                  </span>
                  <span className="font-mono font-bold text-sky-700">
                    {targetReadingFirst
                      ? `Jam ke-${targetReadingFirst.hour}`
                      : demoReadings.length > 0 && demoReadings[0].tds <= 1000
                      ? "Jam ke-0 (Sejak Awal)"
                      : "Belum tercapai"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <span className="flex items-center gap-2">
                    <Hourglass size={15} className="text-sky-600 flex-shrink-0" />
                    Estimasi time-to-target
                  </span>
                  <span className="font-mono font-bold text-sky-700">
                    {targetReadingFirst ? "Target telah tercapai" : regressionResult.remainingStr}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <span className="flex items-center gap-2">
                    <Info size={15} className="text-sky-600 flex-shrink-0" />
                    Error prediksi
                  </span>
                  <span className="font-mono font-bold text-sky-700">
                    {targetReadingFirst && regressionResult.targetHourVal !== null
                      ? `${Math.abs(targetReadingFirst.hour - regressionResult.targetHourVal)
                          .toFixed(2)
                          .replace(".", ",")} jam`
                      : "—"}
                  </span>
                </div>
              </div>

              <div className="mt-5 p-4 rounded-xl bg-sky-50/90 border border-sky-200 text-xs text-sky-950 space-y-1">
                <div className="flex items-start gap-2">
                  <Info size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
                  <p className="font-medium leading-relaxed">
                    <strong>Status Live Demo:</strong> Data telemetri dipantau secara langsung per
                    interval 1 jam. Nilai parameter regresi linier dan korelasi diperbarui secara
                    otomatis setiap ada data baru dari ESP32.
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
                    label={{
                      value: "% Penurunan TDS (%)",
                      position: "insideBottom",
                      offset: -15,
                      fill: "#475569",
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Tegangan"
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#CBD5E1" }}
                    domain={["auto", "auto"]}
                    tickFormatter={(v) => v.toFixed(3).replace(".", ",")}
                    width={45}
                  />
                  <ZAxis type="number" range={[100, 100]} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        if (data.isTrendline) return null;
                        return (
                          <div className="bg-slate-900/95 text-white p-2.5 border border-slate-700 rounded-xl shadow-xl text-xs font-semibold backdrop-blur-md">
                            <p className="text-sky-400 font-mono font-bold">
                              Penurunan TDS: {data.x.toFixed(2).replace(".", ",")}%
                            </p>
                            <p className="text-emerald-400 font-mono font-bold">
                              Tegangan MFC: {data.y.toFixed(3).replace(".", ",")} V
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
                    line={{ stroke: "#0284C7", strokeWidth: 2, strokeDasharray: "6 6" }}
                    shape={() => <g />}
                    legendType="none"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-2 text-xs font-semibold text-slate-700">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#16A34A]"></span>
                <span>Titik data (n = {demoReadings.length})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-8 border-b-2 border-dashed border-[#0284C7]"></span>
                <span>Garis regresi linier</span>
              </div>
            </div>
          </Card>

          {/* Right: Pearson Statistics Panel */}
          <Card className="lg:col-span-4 p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5 flex flex-col justify-between">
            <div>
              <h3 className="font-display font-bold text-slate-900 text-base mb-4">
                Statistik Korelasi
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="font-bold text-xs text-slate-800">Pearson r</span>
                  <span className="font-mono font-extrabold text-base text-sky-700">
                    {demoReadings.length >= 3 ? pearsonResult.rStr : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="font-bold text-xs text-slate-800">p-value</span>
                  <span className="font-mono font-extrabold text-base text-sky-700">
                    {demoReadings.length >= 3 ? pearsonResult.pValueStr : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="font-bold text-xs text-slate-800">n (jumlah data)</span>
                  <span className="font-mono font-extrabold text-base text-sky-700">
                    {demoReadings.length}
                  </span>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <h5 className="font-bold text-xs text-amber-900">Interpretasi:</h5>
                <p className="text-xs font-semibold text-amber-950 leading-relaxed">
                  {demoReadings.length >= 3
                    ? pearsonResult.interpretation
                    : "Belum ada data pengujian yang cukup. Perhitungan korelasi Pearson akan terisi otomatis setelah minimal 3 data terekam."}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Bottom Cards: Baseline TDS (Tanpa TDS Akhir) and Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Baseline TDS */}
          <MagneticCard className="p-5 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                <Droplet size={17} strokeWidth={2.5} />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Baseline TDS</h3>
            </div>
            <div className="my-auto py-1">
              <div className="font-display text-3xl font-extrabold text-sky-600 tracking-tight">
                {demoReadings.length > 0 ? `${baselineTds.toFixed(2).replace(".", ",")} mg/L` : "—"}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 leading-tight">
                Nilai awal (jam ke-0 / data pertama)
              </p>
            </div>
          </MagneticCard>

          {/* Card 2: Status Evaluasi Demo */}
          <MagneticCard className="p-5 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                <Flag size={17} strokeWidth={2.5} />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Status Pengujian Demo</h3>
            </div>
            <div className="my-auto py-1">
              <div className="font-sans text-sm font-bold text-slate-800 leading-snug">
                {latestReading && latestReading.tds <= 1000
                  ? "Target TDS ≤ 1.000 mg/L terpenuhi. Kualitas air olahan memenuhi standar operasional."
                  : "Dalam pemantauan live telemetri terintegrasi."}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 leading-tight">
                Status evaluasi telemetri live
              </p>
            </div>
          </MagneticCard>
        </div>
      </div>
    </div>
  );
}

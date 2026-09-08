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
  TrendingDown,
  Info,
  LineChart as ChartIcon,
  Zap,
  Wifi,
  FlaskConical,
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
      rStr: "—",
      pValue: 1,
      pValueStr: "—",
      n,
      interpretation: "Data belum cukup untuk analisis korelasi (minimal 3 data dari database).",
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
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(/:/g, ".");
}

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
  // Pure database state: Initial state is completely empty with ZERO dummy data
  const [summary, setSummary] = useState<Summary>({ latest: null, history: [] });
  const [error, setError] = useState<string | null>(null);
  const [isApiConnected, setIsApiConnected] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Load telemetry data strictly from the database via REST API
  const loadSummaryData = async () => {
    try {
      setIsLoading(true);
      const data = await fetchSummary(100);
      setSummary(data);
      setIsApiConnected(true);
      setError(null);
    } catch (err: any) {
      setIsApiConnected(false);
      setError(err?.message || "Gagal menghubungkan ke REST API telemetri");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch on mount (strictly no 4-second polling loop)
    loadSummaryData();
  }, []);

  // Sorted history chronologically from database
  const sortedHistory = useMemo(() => {
    if (!summary.history || summary.history.length === 0) return [];
    return [...summary.history].sort(
      (a, b) => parseTimestamp(a.timestamp).getTime() - parseTimestamp(b.timestamp).getTime()
    );
  }, [summary.history]);

  // Map database entries directly into demo readings (interval 1 jam per langkah data)
  // If database is empty, demoReadings is strictly an empty array []
  const demoReadings: CycleReading[] = useMemo(() => {
    if (sortedHistory.length === 0) return [];
    return sortedHistory.map((d, index) => {
      const v = d.voltage != null ? (d.voltage <= 20 ? d.voltage : d.voltage / 1000) : 0;
      return {
        hour: index,
        actualTime: `${formatDate(d.timestamp)} ${formatTime(d.timestamp)}`,
        tds: d.tds != null ? Number(d.tds.toFixed(2)) : 0,
        voltage: Number(v.toFixed(3)),
        status: "VALID",
      };
    });
  }, [sortedHistory]);

  // Baseline and latest readings directly from database
  const baselineTds = demoReadings.length > 0 ? demoReadings[0].tds : null;
  const latestReading = demoReadings.length > 0 ? demoReadings[demoReadings.length - 1] : null;

  // Penurunan akhir dari data pertama (%)
  const overallReductionPct = useMemo(() => {
    if (baselineTds != null && baselineTds > 0 && latestReading != null) {
      return ((baselineTds - latestReading.tds) / baselineTds) * 100;
    }
    return null;
  }, [baselineTds, latestReading]);

  // Voltages from database
  const voltages = useMemo(() => demoReadings.map((r) => r.voltage), [demoReadings]);
  const minVolt = voltages.length > 0 ? Math.min(...voltages) : null;
  const maxVolt = voltages.length > 0 ? Math.max(...voltages) : null;

  // Linear Regression (only computed from database records, no dummy fallback)
  const regressionDisplay = useMemo(() => {
    if (demoReadings.length < 3) {
      return {
        status: "Data belum cukup (menunggu data database)",
        slope: "—",
        rSquared: "—",
        observedTime: "—",
        estimatedTime: "—",
        error: "—",
      };
    }

    const reg = calculateTdsRegression(demoReadings);
    const sign = reg.a >= 0 ? "+" : "-";
    const slopeStr = `${sign}${Math.abs(reg.a).toFixed(3).replace(".", ",")} mg/L/jam`;
    const isTargetReached = demoReadings.some((r) => r.tds <= 1000);
    const firstTargetIdx = demoReadings.findIndex((r) => r.tds <= 1000);

    return {
      status: isTargetReached ? "Target TDS ≤ 1.000 mg/L tercapai" : (reg.isValid ? "Dalam proses estimasi" : "Data belum cukup"),
      slope: slopeStr,
      rSquared: reg.rSquared.toFixed(2).replace(".", ","),
      observedTime: isTargetReached ? `Jam ke-${firstTargetIdx}` : "—",
      estimatedTime: isTargetReached ? "Target telah tercapai" : reg.remainingStr,
      error: reg.errorStr,
    };
  }, [demoReadings]);

  // Pearson Correlation
  const pearsonResult = useMemo(() => {
    return calculatePearsonCorrelation(demoReadings);
  }, [demoReadings]);

  // Scatter Data: X = % Penurunan TDS, Y = Tegangan V
  const scatterData = useMemo(() => {
    if (demoReadings.length === 0 || baselineTds == null || baselineTds === 0) return [];
    return demoReadings.map((r) => {
      const reductionPct = ((baselineTds - r.tds) / baselineTds) * 100;
      return {
        x: Number(reductionPct.toFixed(2)),
        y: Number(r.voltage.toFixed(3)),
      };
    });
  }, [demoReadings, baselineTds]);

  const sortedScatterData = useMemo(() => {
    if (scatterData.length === 0) return [];
    return [...scatterData].sort((a, b) => a.x - b.x);
  }, [scatterData]);

  const minScatterX = useMemo(() => {
    if (sortedScatterData.length === 0) return -10;
    const min = Math.min(...sortedScatterData.map((d) => d.x));
    return Math.floor(min - 2);
  }, [sortedScatterData]);

  const maxScatterX = useMemo(() => {
    if (sortedScatterData.length === 0) return 10;
    const max = Math.max(...sortedScatterData.map((d) => d.x));
    return Math.ceil(max + 2);
  }, [sortedScatterData]);

  // Dedicated Y-Axis Domain for Scatter Plot to clearly display voltage variation
  const scatterVoltDomain = useMemo(() => {
    if (scatterData.length === 0) return [0.43, 0.47];
    const vals = scatterData.map((d) => d.y);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 0.02;
    const pad = span * 0.18;
    return [
      Number((min - pad).toFixed(3)),
      Number((max + pad).toFixed(3)),
    ];
  }, [scatterData]);

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

  // Chart Data: If database has NO data, this is strictly [] so chart remains empty
  const demoChartData = useMemo(() => {
    return demoReadings;
  }, [demoReadings]);

  // Dynamic Y-Axis Domains
  const demoTdsDomain = useMemo(() => {
    if (demoReadings.length === 0) return [350, 1250];
    const vals = demoReadings.map((d) => d.tds).filter((v) => typeof v === "number" && !isNaN(v) && v > 0);
    if (vals.length === 0) return [350, 1250];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const minDomain = Math.max(0, Math.floor((min - 50) / 50) * 50);
    const maxDomain = Math.max(1250, Math.ceil((max + 50) / 50) * 50);
    return [minDomain, maxDomain];
  }, [demoReadings]);

  const demoVoltDomain = useMemo(() => {
    if (demoReadings.length === 0) return [0, 0.7];
    const vals = demoReadings.map((d) => d.voltage).filter((v) => typeof v === "number" && !isNaN(v));
    if (vals.length === 0) return [0, 0.7];
    const max = Math.max(...vals);
    const maxDomain = Math.max(0.7, Number((Math.ceil((max + 0.1) * 10) / 10).toFixed(2)));
    return [0, maxDomain];
  }, [demoReadings]);

  // Pagination for Demo Table (6 rows per page)
  const rowsPerPage = 6;
  const totalPages = Math.max(1, Math.ceil(demoReadings.length / rowsPerPage));
  const startIdx = (currentPage - 1) * rowsPerPage;
  const endIdx = startIdx + rowsPerPage;
  const visibleDemoReadings = demoReadings.slice(startIdx, endIdx);

  // Empty placeholder rows when database is not yet populated
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
    if (demoReadings.length === 0) return;
    let csv = "\uFEFFJam ke-;Waktu Aktual;TDS (mg/L);Penurunan TDS (%);Tegangan (V);Status Data\n";
    demoReadings.forEach((r) => {
      const base = baselineTds ?? r.tds;
      const pct = base > 0 ? ((base - r.tds) / base) * 100 : 0;
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
            {!isApiConnected || error ? "API TIDAK TERHUBUNG" : "TERHUBUNG D1 API (LIVE)"}
          </Badge>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-sm shadow-sm backdrop-blur-md flex items-center gap-3">
          <FlaskConical className="text-amber-600 flex-shrink-0" size={18} />
          <span>Perhatian: {error}. Menunggu data masuk dari database.</span>
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
                {overallReductionPct != null ? `${overallReductionPct.toFixed(2).replace(".", ",")}%` : "—"}
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
                {minVolt != null && maxVolt != null
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
                  {demoChartData.length > 0 && (
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
                  )}
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
                  {demoChartData.length > 0 && (
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
                  )}
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
                  disabled={demoReadings.length === 0}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors ${
                    demoReadings.length > 0
                      ? "text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100"
                      : "text-slate-400 bg-slate-50 border border-slate-200 cursor-not-allowed"
                  }`}
                >
                  <Download size={14} />
                  Download CSV
                </button>
              </div>

              {/* Table wrapper */}
              <div className="overflow-x-auto rounded-xl border border-sky-900/10">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/80 text-slate-700 font-bold border-b border-sky-900/10">
                    <tr>
                      <th className="py-2.5 px-3">Jam ke-</th>
                      <th className="py-2.5 px-3">Waktu Aktual</th>
                      <th className="py-2.5 px-3">TDS (mg/L)</th>
                      <th className="py-2.5 px-3">Penurunan TDS (%)</th>
                      <th className="py-2.5 px-3">Tegangan (V)</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayTableRows.map((r, i) => {
                      const base = baselineTds ?? (r.tds || 0);
                      const pct =
                        r.tds != null && base > 0 ? ((base - r.tds) / base) * 100 : null;
                      const pctSign = pct != null && pct > 0 ? "+" : "";
                      return (
                        <tr key={i} className="hover:bg-sky-50/30 transition-colors">
                          <td className="py-2 px-3 font-bold text-slate-900">{r.hour}</td>
                          <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                            {r.actualTime || "—"}
                          </td>
                          <td className="py-2 px-3 font-semibold text-sky-700">
                            {r.tds != null
                              ? Number(r.tds.toFixed(2)).toLocaleString("id-ID", {
                                  minimumFractionDigits: 1,
                                  maximumFractionDigits: 2,
                                })
                              : "—"}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-700">
                            {pct != null
                              ? `${pctSign}${pct.toFixed(2).replace(".", ",")}%`
                              : "—"}
                          </td>
                          <td className="py-2 px-3 font-medium text-emerald-700">
                            {r.voltage != null ? r.voltage.toFixed(3).replace(".", ",") : "—"}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.status === "VALID"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-50 text-slate-400 border border-slate-200"
                              }`}
                            >
                              {r.status === "VALID" && <Check size={11} strokeWidth={3} />}
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
              <div>
                Menampilkan {demoReadings.length > 0 ? `${startIdx + 1}-${Math.min(endIdx, demoReadings.length)}` : "0"} dari {demoReadings.length} data demo
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                    currentPage === 1
                      ? "text-slate-300 border-slate-200 cursor-not-allowed bg-slate-50/50"
                      : "text-slate-600 border-slate-300 hover:bg-slate-50 bg-white"
                  }`}
                >
                  &larr; Sebelumnya
                </button>
                <span className="text-slate-700 font-bold px-1">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || demoReadings.length === 0}
                  className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                    currentPage === totalPages || demoReadings.length === 0
                      ? "text-slate-300 border-slate-200 cursor-not-allowed bg-slate-50/50"
                      : "text-slate-600 border-slate-300 hover:bg-slate-50 bg-white"
                  }`}
                >
                  Selanjutnya &rarr;
                </button>
              </div>
            </div>

            <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
              <span>Sumber data: ESP32/AID SMART-MFC &bull; Timestamp tersimpan otomatis</span>
            </div>
          </Card>

          {/* Right Card: Evaluasi Prediksi Regresi Linier */}
          <Card className="lg:col-span-5 p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base">
                  Evaluasi Prediksi Regresi Linier
                </h3>
              </div>

              <div className="space-y-2.5 text-xs font-medium divide-y divide-slate-100">
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Droplet size={13} className="text-sky-500" /> Target Operasional TDS &le; 1.000 mg/L
                  </span>
                  <span className="font-bold text-slate-800"></span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Info size={13} className="text-slate-400" /> Status Prediksi
                  </span>
                  <span className="font-bold text-emerald-600">
                    {demoReadings.length >= 3 ? regressionDisplay.status : "Data belum cukup"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <TrendingDown size={13} className="text-sky-600" /> Slope regresi
                  </span>
                  <span className="font-mono font-bold text-sky-700">
                    {demoReadings.length >= 3 ? regressionDisplay.slope : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <ChartIcon size={13} className="text-slate-400" /> R&sup2; regresi
                  </span>
                  <span className="font-mono font-bold text-sky-700">
                    {demoReadings.length >= 3 ? regressionDisplay.rSquared : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Clock size={13} className="text-slate-400" /> Waktu target teramati
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    {demoReadings.length >= 3 ? regressionDisplay.observedTime : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Clock size={13} className="text-slate-400" /> Estimasi time-to-target
                  </span>
                  <span className="font-mono font-bold text-emerald-600">
                    {demoReadings.length >= 3 ? regressionDisplay.estimatedTime : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Info size={13} className="text-slate-400" /> Error prediksi
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    {demoReadings.length >= 3 ? regressionDisplay.error : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Note box */}
            <div className="mt-5 p-3 rounded-xl bg-sky-50/90 border border-sky-200/80 text-slate-700 text-xs">
              <div className="flex items-start gap-2">
                <Info size={15} className="text-sky-600 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px] font-medium text-slate-600">
                  <span className="font-bold text-slate-800">Status Live Demo:</span> Data telemetri dipantau secara langsung per interval 1 jam. Nilai parameter regresi linier dan korelasi diperbarui secara otomatis setiap ada data baru dari ESP32.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Section: Scatter Plot Left & Correlation Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Card: Hubungan % Penurunan TDS dengan Tegangan */}
          <Card className="lg:col-span-8 p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
            <div className="mb-4">
              <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base">
                Hubungan % Penurunan TDS dengan Tegangan
              </h3>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="% Penurunan TDS"
                    unit="%"
                    domain={[minScatterX, maxScatterX]}
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#CBD5E1" }}
                    label={{
                      value: "% Penurunan TDS (%)",
                      position: "insideBottom",
                      offset: -12,
                      fill: "#475569",
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Tegangan"
                    domain={scatterVoltDomain}
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#CBD5E1" }}
                    width={50}
                    tickFormatter={(v) => (typeof v === "number" ? v.toFixed(3).replace(".", ",") : v)}
                  />
                  <ZAxis range={[50, 50]} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white/95 border border-sky-900/15 p-2.5 rounded-xl text-xs space-y-1 shadow-lg text-slate-900">
                            <p className="font-semibold text-slate-700">
                              Penurunan TDS: {data.x?.toFixed(2).replace(".", ",")}%
                            </p>
                            <p className="text-emerald-700 font-bold">
                              Tegangan: {data.y?.toFixed(3).replace(".", ",")} V
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {scatterData.length > 0 && (
                    <Scatter
                      name="Titik Data"
                      data={scatterData}
                      fill="#16A34A"
                      stroke="#FFFFFF"
                      strokeWidth={1.5}
                    />
                  )}
                  {trendlineData.length > 0 && (
                    <Scatter
                      name="Garis Regresi"
                      data={trendlineData}
                      line={{ stroke: "#0284C7", strokeWidth: 2, strokeDasharray: "4 4" }}
                      shape={() => <g />}
                    />
                  )}
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 flex items-center justify-center gap-6 text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#16A34A]"></span>
                <span>Titik data (n = {demoReadings.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 border-t-2 border-dashed border-[#0284C7]"></span>
                <span>Garis regresi linier</span>
              </div>
            </div>
          </Card>

          {/* Right Card: Statistik Korelasi */}
          <Card className="lg:col-span-4 p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5 flex flex-col justify-between">
            <div>
              <div className="mb-4">
                <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base">
                  Statistik Korelasi
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-1 border-b border-slate-100 text-xs">
                  <span className="text-slate-600 font-medium">Pearson r</span>
                  <span className="font-display text-base font-extrabold text-sky-600">
                    {demoReadings.length >= 3 ? pearsonResult.rStr : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100 text-xs">
                  <span className="text-slate-600 font-medium">p-value</span>
                  <span className="font-display text-base font-extrabold text-sky-600">
                    {demoReadings.length >= 3 ? pearsonResult.pValueStr : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100 text-xs">
                  <span className="text-slate-600 font-medium">n (jumlah data)</span>
                  <span className="font-display text-base font-extrabold text-sky-600">
                    {demoReadings.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Interpretasi Box */}
            <div className="mt-5 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900">
              <p className="text-[10px] uppercase tracking-wider font-bold text-amber-800 mb-1">
                Interpretasi:
              </p>
              <p className="text-xs font-semibold leading-relaxed">
                {pearsonResult.interpretation}
              </p>
            </div>
          </Card>
        </div>

        {/* Section: Baseline TDS Left & Status Pengujian Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Baseline TDS */}
          <MagneticCard className="p-5 h-[130px] flex flex-col justify-between border border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center flex-shrink-0">
                <Droplet size={15} strokeWidth={2.5} />
              </div>
              <h3 className="text-xs font-bold text-slate-800">Baseline TDS</h3>
            </div>
            <div className="my-auto py-1">
              <div className="font-display text-2xl sm:text-3xl font-extrabold text-sky-600 tracking-tight">
                {baselineTds != null ? `${baselineTds.toFixed(2).replace(".", ",")} mg/L` : "—"}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">
                Nilai awal (jam ke-0 / data pertama)
              </p>
            </div>
          </MagneticCard>

          {/* Card 2: Status Pengujian Demo */}
          <MagneticCard className="p-5 h-[130px] flex flex-col justify-between border border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center flex-shrink-0">
                <Flag size={15} strokeWidth={2.5} />
              </div>
              <h3 className="text-xs font-bold text-slate-800">Status Pengujian Demo</h3>
            </div>
            <div className="my-auto py-1">
              <div className="font-bold text-sm sm:text-base text-slate-800">
                Dalam pemantauan live telemetri terintegrasi.
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">
                Status evaluasi telemetri live
              </p>
            </div>
          </MagneticCard>
        </div>
      </div>
    </div>
  );
}

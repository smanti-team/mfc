"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Droplets,
  Zap,
  Wifi,
  Clock,
  Settings,
  Info,
  CheckCircle2,
  Play,
  Square,
  FlaskConical,
  Cpu,
  Radio,
  Cloud,
  Monitor,
  Layers,
  Hourglass,
  RefreshCw,
  Database,
  Send,
  AlertCircle,
  Share2,
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
} from "recharts";
import Badge from "@/components/Badge";
import MagneticCard from "@/components/MagneticCard";
import { fetchSummary, saveTelemetry } from "@/lib/api";
import type { Reading, Summary } from "@/lib/types";

// Placeholder sumbu waktu kosong persis sesuai Foto 2 (Jam ke- 0, 3, 6, 9, 12, 15)
// Semua nilai adalah null sehingga grafik benar-benar KOSONG tanpa ada garis/titik dummy!
const EMPTY_AXIS_PLACEHOLDER = [
  { waktu: "0", tds: null, tegangan: null },
  { waktu: "3", tds: null, tegangan: null },
  { waktu: "6", tds: null, tegangan: null },
  { waktu: "9", tds: null, tegangan: null },
  { waktu: "12", tds: null, tegangan: null },
  { waktu: "15", tds: null, tegangan: null },
];

function parseTimestamp(ts: string | number): Date {
  if (typeof ts === "number") {
    return new Date(ts * (ts < 1e11 ? 1000 : 1));
  }
  const str = String(ts).replace(" ", "T");
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatTime(ts: string | number): string {
  const d = parseTimestamp(ts);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatFullTime(ts: string | number): string {
  const d = parseTimestamp(ts);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
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

// Custom Label Renderer untuk Recharts Titik Data TDS (hanya muncul saat ada data riil)
const CustomTdsLabel = (props: any) => {
  const { x, y, value } = props;
  if (x == null || y == null || value == null) return null;
  const formatted = typeof value === "number" ? value.toLocaleString("id-ID") : value;
  return (
    <text
      x={x}
      y={y - 8}
      fill="#0F172A"
      fontSize={10.5}
      fontWeight={700}
      textAnchor="middle"
      className="select-none font-sans"
    >
      {formatted}
    </text>
  );
};

// Custom Label Renderer untuk Recharts Titik Data Tegangan (hanya muncul saat ada data riil)
const CustomVoltLabel = (props: any) => {
  const { x, y, value } = props;
  if (x == null || y == null || value == null) return null;
  const formatted =
    typeof value === "number"
      ? value.toFixed(2).replace(".", ",")
      : String(value).replace(".", ",");
  return (
    <text
      x={x}
      y={y - 8}
      fill="#0F172A"
      fontSize={10.5}
      fontWeight={700}
      textAnchor="middle"
      className="select-none font-sans"
    >
      {formatted}
    </text>
  );
};

// Custom Tooltip Recharts
const CustomChartTooltip = ({ active, payload, label, unit }: any) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    if (val == null) return null;
    return (
      <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-slate-200 text-xs">
        <p className="font-semibold text-slate-700 mb-0.5">Waktu: {label}</p>
        <p className="font-mono font-bold text-sky-600">
          {typeof val === "number"
            ? unit === "V"
              ? `${val.toFixed(2).replace(".", ",")} V`
              : `${val.toLocaleString("id-ID")} mg/L`
            : `${val} ${unit}`}
        </p>
      </div>
    );
  }
  return null;
};

export default function LiveDemoPage() {
  // State API Data Telemetri - KOSONG MURNI tanpa data dummy
  const [summary, setSummary] = useState<Summary>({ latest: null, history: [] });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isApiConnected, setIsApiConnected] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>("--:--:--");

  // State Sesi Demo
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string | null>(null);

  // Timer Durasi Berjalan
  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning]);

  const durationFormatted = useMemo(() => {
    const h = Math.floor(elapsedSec / 3600);
    const m = Math.floor((elapsedSec % 3600) / 60);
    const s = elapsedSec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [elapsedSec]);

  // Fungsi Fetch Data dari REST API (GET /summary?limit=15)
  const loadApiData = useCallback(async () => {
    try {
      setApiError(null);
      const data = await fetchSummary(15);
      setSummary(data);
      setIsApiConnected(true);
      setLastSyncTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (err: any) {
      setIsApiConnected(false);
      setApiError(err instanceof Error ? err.message : "Gagal menghubungi API");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Polling Data Setiap 4 Detik saat Sesi BERJALAN
  useEffect(() => {
    loadApiData();
    if (!isRunning) return;

    const interval = setInterval(() => {
      loadApiData();
    }, 4000);

    return () => clearInterval(interval);
  }, [isRunning, loadApiData]);

  // Siapkan Data Riwayat - MURNI DARI API SAJA, TIDAK ADA DUMMY
  const historyData = useMemo(() => {
    const raw = summary.history || [];
    if (!raw.length) return [];
    // Urutkan kronologis
    const sorted = [...raw].sort(
      (a, b) => parseTimestamp(a.timestamp).getTime() - parseTimestamp(b.timestamp).getTime()
    );
    return sorted.slice(-10);
  }, [summary.history]);

  const hasData = historyData.length > 0;

  // Pembacaan sensor terkini dari data riil API
  const latestReading = useMemo(() => {
    if (summary.latest) return summary.latest;
    if (historyData.length > 0) return historyData[historyData.length - 1];
    return null;
  }, [summary.latest, historyData]);

  const latestTdsVal = latestReading?.tds != null ? Number(latestReading.tds.toFixed(2)) : null;
  const latestVoltVal = latestReading?.voltage != null ? Number(latestReading.voltage.toFixed(3)) : null;

  // Dataset untuk Grafik TDS (kosong jika belum ada data dari API)
  const chartTdsData = useMemo(() => {
    if (!hasData) return EMPTY_AXIS_PLACEHOLDER;
    return historyData.map((item) => ({
      waktu: formatTime(item.timestamp),
      tds: item.tds != null ? Number(item.tds.toFixed(2)) : null,
    }));
  }, [hasData, historyData]);

  // Dataset untuk Grafik Tegangan (kosong jika belum ada data dari API)
  const chartVoltData = useMemo(() => {
    if (!hasData) return EMPTY_AXIS_PLACEHOLDER;
    return historyData.map((item) => ({
      waktu: formatTime(item.timestamp),
      tegangan: item.voltage != null ? Number(item.voltage.toFixed(2)) : null,
    }));
  }, [hasData, historyData]);

  // Handler Kontrol Sesi Demo
  const handleStartDemo = () => {
    setIsRunning(true);
    loadApiData();
  };

  const handleStopDemo = () => {
    setIsRunning(false);
  };

  // Handler Simulasi Ingest Data (POST /save sesuai Dokumen API Section 3.1)
  const handleSendMockTelemetry = async () => {
    setIsSending(true);
    setSendSuccessMsg(null);
    try {
      const baseTds = latestTdsVal ?? 450;
      const baseVolt = latestVoltVal ?? 0.42;
      const randomTds = Number((baseTds + (Math.random() * 8 - 4)).toFixed(2));
      const randomVolt = Number((Math.max(0.1, baseVolt + (Math.random() * 0.04 - 0.02))).toFixed(3));
      const nowSec = Math.floor(Date.now() / 1000);

      await saveTelemetry({
        tds: randomTds,
        voltage: randomVolt,
        timestamp: nowSec,
      });

      setSendSuccessMsg(`✓ Telemetri baru terkirim: TDS ${randomTds} mg/L, Tegangan ${randomVolt} V`);
      // Segera refetch agar data baru langsung masuk ke grafik dan kotak metrik
      await loadApiData();
      setTimeout(() => setSendSuccessMsg(null), 4000);
    } catch (err: any) {
      setApiError(err?.message || "Gagal mengirim data telemetri ke POST /save");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER TITLE & BADGE
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <p className="text-sky-600 text-xs sm:text-sm font-semibold mb-1">Selamat datang di</p>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold text-slate-900 drop-shadow-sm">
            <TypewriterText text="LIVE DEMO SMART-MFC" />
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1.5 sm:mt-2 leading-relaxed">
            Ilustrasi sistem demo untuk menampilkan pembacaan langsung alat SMART-MFC secara real-time dari REST API.
          </p>
        </div>

        <div className="self-start md:self-start flex-shrink-0 pt-1">
          <Badge
            variant={isApiConnected ? "outline-green" : "warning"}
            icon={isApiConnected ? <Wifi size={14} /> : <FlaskConical size={14} />}
          >
            {isApiConnected ? "TERHUBUNG D1 API (LIVE)" : "MODE PENGUJIAN / SIMULASI"}
          </Badge>
        </div>
      </div>

      {/* Banner status jika belum ada data */}
      {!hasData && (
        <div className="p-3.5 bg-sky-50/90 border border-sky-200 rounded-2xl flex items-center gap-3 text-xs text-sky-900 shadow-2xs">
          <Info size={17} className="text-sky-600 flex-shrink-0" />
          <div className="flex-1 font-medium">
            Menunggu data telemetri masuk dari sensor/API. Grafik dan kotak metrik akan otomatis terisi saat data baru diterima.
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. TOP ROW: 4 METRIC CARDS (KPIs) DENGAN EFEK 3D MAGNETIC TILT
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: TDS Live */}
        <MagneticCard className="p-5 flex flex-col justify-between min-h-[170px] relative group overflow-hidden border-slate-200/80 bg-white/90 backdrop-blur-md shadow-sm hover:shadow-md transition-all">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 flex-shrink-0">
                <Droplets size={20} className={hasData ? "animate-pulse" : ""} />
              </div>
              <span className="text-sm font-semibold text-slate-700">TDS Live</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-black text-3xl sm:text-4xl text-slate-900 tracking-tight">
                {isLoading ? "..." : latestTdsVal !== null ? latestTdsVal.toLocaleString("id-ID") : "--"}
              </span>
              <span className="text-sm font-bold text-slate-500">mg/L</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {latestTdsVal !== null ? "Pembacaan sensor terakhir" : "Total Padatan Terlarut (Menunggu Data)"}
            </p>
          </div>
          <div>
            <span className={`inline-block mt-4 px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase ${
              latestTdsVal !== null
                ? "bg-sky-50 text-sky-700 border border-sky-200/80"
                : "bg-slate-100 text-slate-500 border border-slate-200"
            }`}>
              {latestTdsVal !== null ? "TERBACA" : "MENUNGGU"}
            </span>
          </div>
        </MagneticCard>

        {/* Card 2: Tegangan Live */}
        <MagneticCard className="p-5 flex flex-col justify-between min-h-[170px] relative group overflow-hidden border-slate-200/80 bg-white/90 backdrop-blur-md shadow-sm hover:shadow-md transition-all">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 flex-shrink-0">
                <Zap size={20} className={hasData ? "animate-pulse" : ""} />
              </div>
              <span className="text-sm font-semibold text-slate-700">Tegangan Live</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-black text-3xl sm:text-4xl text-slate-900 tracking-tight">
                {isLoading ? "..." : latestVoltVal !== null ? latestVoltVal.toFixed(2).replace(".", ",") : "--"}
              </span>
              <span className="text-sm font-bold text-slate-500">V</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {latestVoltVal !== null ? "Tegangan MFC terakhir" : "Tegangan Reaktor Utama (Menunggu Data)"}
            </p>
          </div>
          <div>
            <span className={`inline-block mt-4 px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase ${
              latestVoltVal !== null
                ? "bg-sky-50 text-sky-700 border border-sky-200/80"
                : "bg-slate-100 text-slate-500 border border-slate-200"
            }`}>
              {latestVoltVal !== null ? "TERBACA" : "MENUNGGU"}
            </span>
          </div>
        </MagneticCard>

        {/* Card 3: Status Perangkat */}
        <MagneticCard className="p-5 flex flex-col justify-between min-h-[170px] relative group overflow-hidden border-slate-200/80 bg-white/90 backdrop-blur-md shadow-sm hover:shadow-md transition-all">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <Wifi size={20} />
              </div>
              <span className="text-sm font-semibold text-slate-700">Status Perangkat</span>
            </div>
            <div className="flex items-baseline">
              <span
                className={`font-display font-black text-2xl sm:text-3xl tracking-wide ${
                  isApiConnected && isRunning
                    ? "text-emerald-600"
                    : isRunning
                    ? "text-amber-600"
                    : "text-slate-500"
                }`}
              >
                {isApiConnected && isRunning ? "TERHUBUNG" : isRunning ? "MENCOBA" : "DIJEDA"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">
              {isApiConnected
                ? hasData
                  ? "ESP32 terhubung • API aktif"
                  : "ESP32 terhubung • Menunggu telemetri"
                : isRunning
                ? "Menghubungkan ke endpoint D1"
                : "Sesi demo dihentikan"}
            </p>
          </div>
          <div>
            <span
              className={`inline-block mt-4 px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase ${
                isApiConnected && isRunning
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {isApiConnected && isRunning ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
        </MagneticCard>

        {/* Card 4: Sesi Demonstrasi */}
        <MagneticCard className="p-5 flex flex-col justify-between min-h-[170px] relative group overflow-hidden border-slate-200/80 bg-white/90 backdrop-blur-md shadow-sm hover:shadow-md transition-all">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 flex-shrink-0">
                <Clock size={20} />
              </div>
              <span className="text-sm font-semibold text-slate-700">Sesi Demonstrasi</span>
            </div>
            <div className="flex items-baseline">
              <span
                className={`font-display font-black text-2xl sm:text-3xl tracking-wide ${
                  isRunning ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {isRunning ? "BERJALAN" : "DIHENTIKAN"}
              </span>
            </div>
            <div className="mt-1.5 space-y-0.5 text-xs text-slate-600 font-medium">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Waktu simulasi</span>
                <span className="font-mono font-semibold text-slate-800">
                  {latestReading?.timestamp ? formatFullTime(latestReading.timestamp) : "--:--:--"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Durasi berjalan</span>
                <span className="font-mono font-semibold text-slate-800">{durationFormatted}</span>
              </div>
            </div>
          </div>
          <div>
            <span
              className={`inline-block mt-4 px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase ${
                isRunning
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {isRunning ? "AKTIF" : "PAUSED"}
            </span>
          </div>
        </MagneticCard>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MIDDLE ROW: 2 CHARTS (PERSIS FOTO KEDUA SAAT KOSONG)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Chart 1: Grafik TDS Live */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2.5 mb-4">
              <div className="flex items-start gap-2.5">
                <Droplets className="text-sky-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Grafik TDS Live</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {hasData ? "Data telemetri real-time (API)" : "Menunggu data masuk dari sensor/API"}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                GET /summary
              </span>
            </div>

            <div className="h-64 sm:h-72 w-full mt-2 relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartTdsData}
                  margin={{ top: 25, right: 30, left: 5, bottom: 35 }}
                >
                  <defs>
                    <linearGradient id="tdsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={true}
                    horizontal={true}
                    stroke="#CBD5E1"
                    strokeOpacity={0.6}
                  />
                  <XAxis
                    dataKey="waktu"
                    axisLine={{ stroke: "#CBD5E1" }}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                    padding={{ left: 20, right: 20 }}
                    label={{
                      value: hasData ? "Waktu" : "Jam ke-",
                      position: "insideBottom",
                      offset: -20,
                      fontSize: 11,
                      fill: "#475569",
                      fontWeight: 500,
                    }}
                  />
                  <YAxis
                    domain={hasData ? ["dataMin - 30", "dataMax + 30"] : [600, 1600]}
                    ticks={hasData ? undefined : [600, 850, 1100, 1350, 1600]}
                    axisLine={{ stroke: "#CBD5E1" }}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    tickFormatter={(v) => typeof v === "number" ? v.toLocaleString("id-ID") : v}
                    label={{
                      value: "TDS (mg/L)",
                      angle: -90,
                      position: "insideLeft",
                      offset: 14,
                      fontSize: 10,
                      fill: "#94A3B8",
                      fontWeight: 600,
                    }}
                  />
                  <Tooltip content={<CustomChartTooltip unit="mg/L" />} />
                  {/* Garis Target Operasional TDS ≤ 1.000 mg/L sesuai Foto 2 */}
                  <ReferenceLine
                    y={1000}
                    stroke="#EF4444"
                    strokeDasharray="3 3"
                    label={{
                      value: "Target Operasional TDS ≤1.000 mg/L",
                      fill: "#EF4444",
                      fontSize: 10,
                      position: "insideBottomLeft",
                    }}
                  />
                  {hasData && (
                    <Area
                      type="monotone"
                      dataKey="tds"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#tdsGradient)"
                      dot={{ r: 4, fill: "#FFFFFF", stroke: "#2563EB", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#2563EB", stroke: "#FFFFFF", strokeWidth: 2 }}
                      label={<CustomTdsLabel />}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium pt-3 mt-1 border-t border-slate-100">
            <Clock size={13} className="text-slate-400" />
            <span>{hasData ? "Waktu Nyata (Interval Polling: 4 detik)" : "Menunggu Data Masuk"}</span>
          </div>
        </div>

        {/* Chart 2: Grafik Tegangan Live */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2.5 mb-4">
              <div className="flex items-start gap-2.5">
                <Zap className="text-sky-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Grafik Tegangan Live</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {hasData ? "Data telemetri real-time (API)" : "Menunggu data masuk dari sensor/API"}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                GET /history
              </span>
            </div>

            <div className="h-64 sm:h-72 w-full mt-2 relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartVoltData}
                  margin={{ top: 25, right: 30, left: 5, bottom: 35 }}
                >
                  <defs>
                    <linearGradient id="voltGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={true}
                    horizontal={true}
                    stroke="#CBD5E1"
                    strokeOpacity={0.6}
                  />
                  <XAxis
                    dataKey="waktu"
                    axisLine={{ stroke: "#CBD5E1" }}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                    padding={{ left: 20, right: 20 }}
                    label={{
                      value: hasData ? "Waktu" : "Jam ke-",
                      position: "insideBottom",
                      offset: -20,
                      fontSize: 11,
                      fill: "#475569",
                      fontWeight: 500,
                    }}
                  />
                  <YAxis
                    domain={hasData ? [0, "auto"] : [0, 0.70]}
                    ticks={hasData ? undefined : [0, 0.20, 0.40, 0.70]}
                    axisLine={{ stroke: "#CBD5E1" }}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    tickFormatter={(v) => typeof v === "number" ? v.toFixed(2).replace(".", ",") : v}
                    label={{
                      value: "Tegangan (V)",
                      angle: -90,
                      position: "insideLeft",
                      offset: 14,
                      fontSize: 10,
                      fill: "#94A3B8",
                      fontWeight: 600,
                    }}
                  />
                  <Tooltip content={<CustomChartTooltip unit="V" />} />
                  {hasData && (
                    <Area
                      type="monotone"
                      dataKey="tegangan"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#voltGradient)"
                      dot={{ r: 4, fill: "#FFFFFF", stroke: "#10B981", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#10B981", stroke: "#FFFFFF", strokeWidth: 2 }}
                      label={<CustomVoltLabel />}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium pt-3 mt-1 border-t border-slate-100">
            <Clock size={13} className="text-slate-400" />
            <span>{hasData ? "Waktu Nyata (Interval Polling: 4 detik)" : "Menunggu Data Masuk"}</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. BOTTOM ROW: 3 CARDS (KONTROL SESI, INFO SESI, ALUR DATA)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-stretch gap-4 sm:gap-5">
        {/* Card 1: Kontrol Sesi Demo (18% width) */}
        <div className="w-full lg:w-[18%] bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Settings className="text-slate-700" size={17} />
              <h3 className="font-bold text-sm text-slate-900">Kontrol Sesi Demo</h3>
            </div>

            <div className="space-y-2.5">
              {/* Tombol Mulai Demo */}
              <button
                onClick={handleStartDemo}
                disabled={isRunning}
                className={`w-full py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  isRunning
                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-80"
                    : "bg-sky-600 hover:bg-sky-700 text-white shadow-sm hover:shadow"
                }`}
              >
                <Play size={15} className={isRunning ? "text-slate-400" : "fill-white"} />
                <span>Mulai Demo</span>
              </button>

              {/* Tombol Akhiri Demo */}
              <button
                onClick={handleStopDemo}
                disabled={!isRunning}
                className={`w-full py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  !isRunning
                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-80"
                    : "border-2 border-rose-500 text-rose-600 hover:bg-rose-50 active:bg-rose-100"
                }`}
              >
                <Square size={14} className={!isRunning ? "text-slate-400" : "fill-rose-600 text-rose-600"} />
                <span>Akhiri Demo</span>
              </button>

              {/* Tombol Interaktif Kirim Sampel Telemetri ke API (POST /save) */}
              <button
                onClick={handleSendMockTelemetry}
                disabled={isSending}
                className="w-full mt-2 py-2 px-2.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 active:bg-emerald-200 transition-all disabled:opacity-50"
              >
                <Send size={12} className={isSending ? "animate-spin" : ""} />
                <span>{isSending ? "Mengirim..." : "Kirim Sampel API"}</span>
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {sendSuccessMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 font-medium">
                {sendSuccessMsg}
              </div>
            )}

            <div className="p-3 bg-sky-50/80 border border-sky-100 rounded-xl flex items-start gap-2">
              <Info size={15} className="text-sky-600 mt-0.5 flex-shrink-0" />
              <p className="text-[10.5px] text-slate-600 leading-relaxed font-medium">
                {isRunning
                  ? "Sesi demo terhubung ke REST API Cloudflare D1. Polling telemetri aktif setiap 4 detik."
                  : "Sesi demo dijeda. Klik Mulai Demo untuk mengaktifkan kembali polling API."}
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Info Sesi (22% width) */}
        <div className="w-full lg:w-[22%] bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
              <Info className="text-slate-700" size={17} />
              <h3 className="font-bold text-sm text-slate-900">Info Sesi</h3>
            </div>

            <div className="space-y-2 text-[11px] sm:text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Layers size={13} className="text-slate-400 shrink-0" />
                  <span>Jenis Sesi</span>
                </div>
                <span className="text-slate-800 font-semibold text-right">IoT Demo</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Clock size={13} className="text-slate-400 shrink-0" />
                  <span>Waktu Simulasi</span>
                </div>
                <span className="text-slate-800 font-semibold">
                  {latestReading?.timestamp ? formatFullTime(latestReading.timestamp) : "--:--:--"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Hourglass size={13} className="text-slate-400 shrink-0" />
                  <span>Durasi Berjalan</span>
                </div>
                <span className="font-mono text-slate-800 font-semibold">{durationFormatted}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <RefreshCw size={13} className="text-slate-400 shrink-0" />
                  <span>Interval</span>
                </div>
                <span className="text-slate-800 font-semibold">4 detik</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Database size={13} className="text-slate-400 shrink-0" />
                  <span>Sumber Data</span>
                </div>
                <span className="text-slate-800 font-semibold text-right">D1 REST API</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Droplets size={13} className="text-sky-600 shrink-0" />
                  <span>TDS Terbaru</span>
                </div>
                <span className="font-bold text-slate-900">
                  {latestTdsVal !== null ? `${latestTdsVal.toLocaleString("id-ID")} mg/L` : "--"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Zap size={13} className="text-amber-500 shrink-0" />
                  <span>Tegangan</span>
                </div>
                <span className="font-bold text-slate-900">
                  {latestVoltVal !== null ? `${latestVoltVal.toFixed(3).replace(".", ",")} V` : "--"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Alur Data Live (Ilustrasi) (Takes 60% of the row) */}
        <div className="w-full lg:flex-1 bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between min-w-0 overflow-hidden">
          <div>
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
              <Share2 size={16} className="text-slate-700 flex-shrink-0" />
              <h3 className="font-bold text-sm text-slate-900">Alur Data Live (Ilustrasi)</h3>
            </div>

            {/* Diagram Alur - 100% Mengisi Seluruh Lebar Kartu Tanpa Terpotong */}
            <div className="w-full py-2 overflow-x-auto lg:overflow-x-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="grid grid-cols-[1fr_auto_1.2fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] items-stretch gap-1 sm:gap-1.5 w-full min-w-[560px] lg:min-w-0">
                {/* Node 1: Reaktor SMART-MFC */}
                <div className="w-full min-w-0 h-full flex flex-col items-center justify-between bg-white border border-slate-200 rounded-xl p-2 sm:p-2.5 shadow-2xs text-center min-h-[125px] sm:min-h-[135px]">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 mb-1">
                    <FlaskConical size={16} />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 leading-tight">
                    Reaktor SMART-MFC
                  </span>
                  <span className="text-[8.5px] sm:text-[9.5px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    AKTIF
                  </span>
                </div>

                {/* SVG Branch / Fork Connector */}
                <div className="flex flex-col items-center justify-center w-3 sm:w-3.5 text-slate-300 self-center">
                  <svg width="14" height="76" viewBox="0 0 14 76" fill="none" className="w-full">
                    <path
                      d="M 1 38 H 7 V 18 H 13"
                      stroke="#94A3B8"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 7 38 V 58 H 13"
                      stroke="#94A3B8"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <polygon points="11,16 14,18 11,20" fill="#94A3B8" />
                    <polygon points="11,56 14,58 11,60" fill="#94A3B8" />
                  </svg>
                </div>

                {/* Parallel Nodes 2A & 2B: Sensor TDS & Anoda-Katoda */}
                <div className="w-full min-w-0 h-full flex flex-col justify-between gap-1.5 min-h-[125px] sm:min-h-[135px]">
                  {/* Node 2A */}
                  <div className="w-full min-w-0 flex-1 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-xl p-1.5 shadow-2xs text-center">
                    <div className="flex items-center gap-1 mb-0.5">
                      <Droplets size={12} className="text-sky-600 shrink-0" />
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-800 leading-tight truncate">
                        Sensor TDS
                      </span>
                    </div>
                    <span className={`text-[8px] sm:text-[8.5px] font-bold px-1.5 py-0.2 rounded-full flex items-center gap-1 ${
                      latestTdsVal !== null
                        ? "text-emerald-600 bg-emerald-50"
                        : "text-slate-500 bg-slate-100"
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${latestTdsVal !== null ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                      {latestTdsVal !== null ? "TERBACA" : "MENUNGGU"}
                    </span>
                  </div>

                  {/* Node 2B */}
                  <div className="w-full min-w-0 flex-1 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-xl p-1.5 shadow-2xs text-center">
                    <div className="flex items-center gap-1 mb-0.5">
                      <Zap size={12} className="text-sky-600 shrink-0" />
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-800 leading-tight truncate">
                        Tegangan MFC
                      </span>
                    </div>
                    <span className={`text-[8px] sm:text-[8.5px] font-bold px-1.5 py-0.2 rounded-full flex items-center gap-1 ${
                      latestVoltVal !== null
                        ? "text-emerald-600 bg-emerald-50"
                        : "text-slate-500 bg-slate-100"
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${latestVoltVal !== null ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                      {latestVoltVal !== null ? "TERBACA" : "MENUNGGU"}
                    </span>
                  </div>
                </div>

                {/* SVG Merge Connector to ADS1115 */}
                <div className="flex flex-col items-center justify-center w-3 sm:w-3.5 text-slate-300 self-center">
                  <svg width="14" height="76" viewBox="0 0 14 76" fill="none" className="w-full">
                    <path
                      d="M 1 18 H 7 V 38 H 13"
                      stroke="#94A3B8"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 1 58 H 7 V 38"
                      stroke="#94A3B8"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <polygon points="11,36 14,38 11,40" fill="#94A3B8" />
                  </svg>
                </div>

                {/* Node 3: ADS1115 */}
                <div className="w-full min-w-0 h-full flex flex-col items-center justify-between bg-white border border-slate-200 rounded-xl p-2 sm:p-2.5 shadow-2xs text-center min-h-[125px] sm:min-h-[135px]">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 mb-1">
                    <Cpu size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 leading-tight block">ADS1115</span>
                    <span className="text-[8px] sm:text-[8.5px] text-slate-400 font-medium">Akuisisi</span>
                  </div>
                  <span className="text-[8.5px] sm:text-[9.5px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    AKTIF
                  </span>
                </div>

                {/* Connector Arrow */}
                <div className="flex items-center justify-center w-2 sm:w-3 text-slate-400 self-center">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="w-full">
                    <path d="M 0 5 H 8" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
                    <polygon points="6,2 10,5 6,8" fill="#94A3B8" />
                  </svg>
                </div>

                {/* Node 4: ESP32 */}
                <div className="w-full min-w-0 h-full flex flex-col items-center justify-between bg-white border border-slate-200 rounded-xl p-2 sm:p-2.5 shadow-2xs text-center min-h-[125px] sm:min-h-[135px]">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 mb-1">
                    <Radio size={16} />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 leading-tight">ESP32</span>
                  <span className={`text-[8.5px] sm:text-[9.5px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 mt-1 ${
                    isApiConnected ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isApiConnected ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                    {isApiConnected ? "TERHUBUNG" : "MENCOBA"}
                  </span>
                </div>

                {/* Connector Arrow */}
                <div className="flex items-center justify-center w-2 sm:w-3 text-slate-400 self-center">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="w-full">
                    <path d="M 0 5 H 8" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
                    <polygon points="6,2 10,5 6,8" fill="#94A3B8" />
                  </svg>
                </div>

                {/* Node 5: Cloud API */}
                <div className="w-full min-w-0 h-full flex flex-col items-center justify-between bg-white border border-slate-200 rounded-xl p-2 sm:p-2.5 shadow-2xs text-center min-h-[125px] sm:min-h-[135px]">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mb-1">
                    <Cloud size={16} />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 leading-tight">Cloud API</span>
                  <span className={`text-[8.5px] sm:text-[9.5px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 mt-1 ${
                    isApiConnected ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isApiConnected ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                    {isApiConnected ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>

                {/* Connector Arrow */}
                <div className="flex items-center justify-center w-2 sm:w-3 text-slate-400 self-center">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="w-full">
                    <path d="M 0 5 H 8" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
                    <polygon points="6,2 10,5 6,8" fill="#94A3B8" />
                  </svg>
                </div>

                {/* Node 6: Web Live Demo */}
                <div className="w-full min-w-0 h-full flex flex-col items-center justify-between bg-white border border-slate-200 rounded-xl p-2 sm:p-2.5 shadow-2xs text-center min-h-[125px] sm:min-h-[135px]">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mb-1">
                    <Monitor size={16} />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 leading-tight">Web Live Demo</span>
                  <span className="text-[8.5px] sm:text-[9.5px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    ONLINE
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Status Pill inside Card 3 */}
          <div className="mt-4 px-3.5 py-2.5 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-emerald-800 leading-tight">
              {isApiConnected
                ? "Semua komponen terhubung ke REST API Cloudflare D1 dan alur data berjalan lancar."
                : "Alur simulasi data lokal berjalan (menunggu sinkronisasi API)."}
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. BOTTOM NOTE / FOOTER BANNER
      ───────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-sky-50/70 border border-sky-200/80 rounded-2xl flex items-center gap-3 text-xs sm:text-sm text-slate-700 shadow-2xs">
        <div className="w-7 h-7 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700 flex-shrink-0">
          <Info size={16} />
        </div>
        <p className="leading-relaxed font-medium">
          <span className="font-bold text-slate-900">Catatan:</span> Halaman ini digunakan untuk demonstrasi sistem SMART-MFC yang terhubung ke IoT Telemetry REST API (Cloudflare Workers &amp; D1 Database). Data sesi demo terpisah dari data penelitian S1-S3.
        </p>
      </div>
    </div>
  );
}

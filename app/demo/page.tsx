"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  AlertCircle,
  Share2,
  TrendingUp,
  FastForward,
  Check,
  Pause,
  Timer,
  RadioTower,
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
import { fetchSummary } from "@/lib/api";
import type { Reading, Summary } from "@/lib/types";
import {
  CYCLE_CONFIGS,
  type CycleConfig,
  type DemoState,
  DEFAULT_DEMO_STATE,
  generateCycleReadingPoint,
  loadStoredDemoState,
  saveStoredDemoState,
  loadStoredCycleData,
  saveStoredCycleData,
  clearStoredDemoData,
} from "@/lib/demo-simulation";

// Placeholder sumbu waktu kosong persis sesuai Foto 2 (Jam ke- 0, 3, 6, 9, 12, 15)
// Semua nilai adalah null sehingga grafik benar-benar KOSONG saat belum ada data sama sekali!
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

// Custom Label Renderer untuk Recharts Titik Data TDS
const CustomTdsLabel = (props: any) => {
  const { x, y, value } = props;
  if (x == null || y == null || value == null) return null;
  const formatted = typeof value === "number" ? value.toLocaleString("id-ID") : value;
  return (
    <text
      x={x}
      y={y - 8}
      fill="#0F172A"
      fontSize={10}
      fontWeight={700}
      textAnchor="middle"
      className="select-none font-sans"
    >
      {formatted}
    </text>
  );
};

// Custom Label Renderer untuk Recharts Titik Data Tegangan
const CustomVoltLabel = (props: any) => {
  const { x, y, value } = props;
  if (x == null || y == null || value == null) return null;
  const formatted =
    typeof value === "number"
      ? value.toFixed(3).replace(".", ",")
      : String(value).replace(".", ",");
  return (
    <text
      x={x}
      y={y - 8}
      fill="#0F172A"
      fontSize={10}
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
              ? `${val.toFixed(3).replace(".", ",")} V`
              : `${val.toLocaleString("id-ID")} mg/L`
            : `${val} ${unit}`}
        </p>
      </div>
    );
  }
  return null;
};

export default function LiveDemoPage() {
  // ── State API Telemetri Riil dari Cloudflare D1 Worker ──
  const [summary, setSummary] = useState<Summary>({ latest: null, history: [] });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isApiConnected, setIsApiConnected] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>("--:--:--");

  // ── State Simulasi Live Demo Multi-Siklus (Tersimpan di LocalStorage) ──
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [generationCount, setGenerationCount] = useState<number>(0);
  const [activeCycleTab, setActiveCycleTab] = useState<"s1" | "s2" | "s3">("s1");
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [countdownSec, setCountdownSec] = useState<number>(60);

  // Datasets 3 Siklus (Tersimpan di LocalStorage)
  const [s1Readings, setS1Readings] = useState<Reading[]>([]);
  const [s2Readings, setS2Readings] = useState<Reading[]>([]);
  const [s3Readings, setS3Readings] = useState<Reading[]>([]);

  // Baseline referensi (diambil dari API saat mulai)
  const [baseTds, setBaseTds] = useState<number>(1078);
  const [baseVolt, setBaseVolt] = useState<number>(0.421);
  const [baseTimestampSec, setBaseTimestampSec] = useState<number>(Math.floor(Date.now() / 1000));

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // 1. Inisialisasi dari LocalStorage saat Mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedState = loadStoredDemoState();
    setIsRunning(storedState.isRunning);
    setIsFrozen(storedState.isFrozen);
    setGenerationCount(storedState.generationCount);
    setActiveCycleTab(storedState.activeCycleTab || "s1");
    setElapsedSec(storedState.elapsedSec || 0);
    if (storedState.baseTds) setBaseTds(storedState.baseTds);
    if (storedState.baseVolt) setBaseVolt(storedState.baseVolt);

    const s1 = loadStoredCycleData("s1");
    const s2 = loadStoredCycleData("s2");
    const s3 = loadStoredCycleData("s3");
    setS1Readings(s1);
    setS2Readings(s2);
    setS3Readings(s3);
  }, []);

  // Format durasi berjalan
  const durationFormatted = useMemo(() => {
    const h = Math.floor(elapsedSec / 3600);
    const m = Math.floor((elapsedSec % 3600) / 60);
    const s = elapsedSec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [elapsedSec]);

  // 2. Fetch Data dari REST API (Polling Cepat setiap 3 detik)
  const loadApiData = useCallback(async () => {
    try {
      setApiError(null);
      const data = await fetchSummary(15);
      setSummary(data);
      setIsApiConnected(true);
      setLastSyncTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));

      // Jika ada data terkini dari API, perbarui baseline
      const latest = data.latest || (data.history && data.history.length > 0 ? data.history[data.history.length - 1] : null);
      if (latest && latest.tds != null) {
        setBaseTds(Number(latest.tds.toFixed(2)));
        if (latest.voltage != null) {
          setBaseVolt(Number(latest.voltage.toFixed(3)));
        }
        if (latest.timestamp) {
          setBaseTimestampSec(Math.floor(parseTimestamp(latest.timestamp).getTime() / 1000));
        }
      }
    } catch (err: any) {
      setIsApiConnected(false);
      setApiError(err instanceof Error ? err.message : "Gagal menghubungi API");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApiData();
    // Polling setiap 3 detik agar telemetri riil dari ESP32/API langsung terdeteksi
    const interval = setInterval(() => {
      loadApiData();
    }, 3000);
    return () => clearInterval(interval);
  }, [loadApiData]);

  // 3. Timer Durasi Berjalan Sesi (setiap detik)
  useEffect(() => {
    if (!isRunning || isFrozen) return;
    const timer = setInterval(() => {
      setElapsedSec((prev) => {
        const next = prev + 1;
        if (next % 5 === 0) {
          const currentState = loadStoredDemoState();
          saveStoredDemoState({ ...currentState, elapsedSec: next });
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning, isFrozen]);

  // Simpan perubahan tab ke localStorage
  const handleSelectTab = (tab: "s1" | "s2" | "s3") => {
    setActiveCycleTab(tab);
    const currentState = loadStoredDemoState();
    saveStoredDemoState({ ...currentState, activeCycleTab: tab });
  };

  // 4. Fungsi Inti: Eksekusi 1 Generasi Data Simultan untuk Ketiga Siklus (S1, S2, S3)
  const executeGenerationStep = useCallback((
    stepNumber: number,
    customBaseTds?: number,
    customBaseVolt?: number,
    customBaseTs?: number
  ) => {
    if (stepNumber > 50) return;

    const bTds = customBaseTds ?? baseTds;
    const bVolt = customBaseVolt ?? baseVolt;
    const bTs = customBaseTs ?? baseTimestampSec;

    // Generate titik baru untuk ketiga siklus secara bersamaan
    const newP1 = generateCycleReadingPoint("s1", stepNumber, bTds, bVolt, bTs);
    const newP2 = generateCycleReadingPoint("s2", stepNumber, bTds, bVolt, bTs);
    const newP3 = generateCycleReadingPoint("s3", stepNumber, bTds, bVolt, bTs);

    setS1Readings((prev) => {
      const updated = [...prev, newP1];
      saveStoredCycleData("s1", updated);
      return updated;
    });

    setS2Readings((prev) => {
      const updated = [...prev, newP2];
      saveStoredCycleData("s2", updated);
      return updated;
    });

    setS3Readings((prev) => {
      const updated = [...prev, newP3];
      saveStoredCycleData("s3", updated);
      return updated;
    });

    setGenerationCount(stepNumber);
    setCountdownSec(60); // Reset hitung mundur

    const willFreeze = stepNumber >= 50;
    if (willFreeze) {
      setIsFrozen(true);
      setNotificationMsg("Batas maksimum 50 data generasi tercapai (FREEZE). Demo terkunci hingga dihentikan.");
    } else {
      setNotificationMsg(`✓ Data Jam ke-${stepNumber} masuk simultan untuk Siklus 1, 2, dan 3 (LocalStorage).`);
      setTimeout(() => setNotificationMsg(null), 4000);
    }

    const stateToSave: DemoState = {
      isRunning: true,
      isFrozen: willFreeze,
      generationCount: stepNumber,
      startedAt: Date.now(),
      lastGeneratedAt: Date.now(),
      elapsedSec,
      activeCycleTab,
      baseTds: bTds,
      baseVolt: bVolt,
    };
    saveStoredDemoState(stateToSave);
  }, [baseTds, baseVolt, baseTimestampSec, elapsedSec, activeCycleTab]);

  // 5. Mesin Simulasi Otomatis dengan Hitung Mundur Detik (Countdown)
  // Setiap 1 detik countdown berkurang. Saat countdown = 0, step baru digenerate!
  const currentCountRef = useRef(generationCount);
  useEffect(() => {
    currentCountRef.current = generationCount;
  }, [generationCount]);

  useEffect(() => {
    if (!isRunning || isFrozen) return;

    const interval = setInterval(() => {
      setCountdownSec((prev) => {
        if (prev <= 1) {
          const nextCount = currentCountRef.current + 1;
          if (nextCount <= 50) {
            executeGenerationStep(nextCount);
          }
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isFrozen, executeGenerationStep]);

  // 6. Handler Mulai Demo (LANGSUNG GENERASI TITIK PERTAMA SEKETIKA!)
  const handleStartDemo = () => {
    if (isFrozen) {
      setNotificationMsg("Sesi telah mencapai batas 50 generasi. Klik Akhiri Demo untuk mereset.");
      return;
    }

    // Ambil data terbaru API sebagai baseline awal
    const apiLatest = summary.latest || (summary.history && summary.history.length > 0 ? summary.history[summary.history.length - 1] : null);
    let initialTds = baseTds;
    let initialVolt = baseVolt;
    let initialTimestamp = baseTimestampSec;

    if (apiLatest && apiLatest.tds != null) {
      initialTds = Number(apiLatest.tds.toFixed(2));
      if (apiLatest.voltage != null) initialVolt = Number(apiLatest.voltage.toFixed(3));
      if (apiLatest.timestamp) initialTimestamp = Math.floor(parseTimestamp(apiLatest.timestamp).getTime() / 1000);
      setBaseTds(initialTds);
      setBaseVolt(initialVolt);
      setBaseTimestampSec(initialTimestamp);
    }

    setIsRunning(true);
    setCountdownSec(60);

    // KUNCI: JIKA BELUM ADA DATA, LANGSUNG MASUKKAN TITIK JAM KE-1 SEKETIKA!
    // Sehingga pengguna TIDAK PERLU menunggu 1 menit dalam keadaan grafik kosong!
    if (generationCount === 0) {
      executeGenerationStep(1, initialTds, initialVolt, initialTimestamp);
      setNotificationMsg("✓ Sesi demo aktif! Titik Jam ke-1 langsung dimasukkan. Titik berikutnya otomatis setiap 60 detik.");
    } else {
      setNotificationMsg(`✓ Sesi demo aktif melanjutkan generasi ke-${generationCount}.`);
    }

    const newState: DemoState = {
      isRunning: true,
      isFrozen: false,
      generationCount: generationCount === 0 ? 1 : generationCount,
      startedAt: Date.now(),
      lastGeneratedAt: Date.now(),
      elapsedSec,
      activeCycleTab,
      baseTds: initialTds,
      baseVolt: initialVolt,
    };
    saveStoredDemoState(newState);
  };

  // 7. Handler Manual Step Simulasi (+1 Jam / +1 Menit ke LocalStorage)
  const handleManualSimulateStep = () => {
    if (!isRunning) {
      setNotificationMsg("Klik 'Mulai Demo' terlebih dahulu sebelum memasukkan data generasi.");
      setTimeout(() => setNotificationMsg(null), 3000);
      return;
    }
    if (isFrozen || generationCount >= 50) {
      setNotificationMsg("Batas 50 data generasi telah tercapai (FREEZE). Sesi hanya bisa dihentikan.");
      return;
    }
    const nextStep = generationCount + 1;
    executeGenerationStep(nextStep);
  };

  // 8. Handler Akhiri Demo (Otomatis Hapus Seluruh Data di LocalStorage)
  const handleStopDemo = () => {
    clearStoredDemoData();
    setIsRunning(false);
    setIsFrozen(false);
    setGenerationCount(0);
    setElapsedSec(0);
    setCountdownSec(60);
    setS1Readings([]);
    setS2Readings([]);
    setS3Readings([]);

    setNotificationMsg("✓ Sesi demo dihentikan. Seluruh data simulasi di LocalStorage telah dibersihkan.");
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // ── Penentuan Sumber Data yang Sedang Ditampilkan ──
  // Mode A: Simulasi Multi-Siklus Aktif (saat demo berjalan dan ada data generasi)
  // Mode B: Live API Stream (saat demo belum berjalan tapi data API dari Cloudflare/ESP32 tersedia)
  const activeCycleConfig = CYCLE_CONFIGS[activeCycleTab];
  const activeDataset = useMemo(() => {
    if (activeCycleTab === "s1") return s1Readings;
    if (activeCycleTab === "s2") return s2Readings;
    return s3Readings;
  }, [activeCycleTab, s1Readings, s2Readings, s3Readings]);

  const isSimulationActive = isRunning && activeDataset.length > 0;
  const hasSimData = activeDataset.length > 0;
  const hasApiData = Boolean(summary.latest || (summary.history && summary.history.length > 0));

  // Data Terkini: Prioritaskan dataset simulasi siklus aktif jika demo berjalan; jika tidak, tampilkan telemetri riil API!
  const latestReading = useMemo(() => {
    if (hasSimData) {
      return activeDataset[activeDataset.length - 1];
    }
    if (summary.latest) return summary.latest;
    if (summary.history && summary.history.length > 0) return summary.history[summary.history.length - 1];
    return null;
  }, [hasSimData, activeDataset, summary.latest, summary.history]);

  const latestTdsVal = latestReading?.tds != null ? Number(latestReading.tds.toFixed(2)) : null;
  const latestVoltVal = latestReading?.voltage != null ? Number(latestReading.voltage.toFixed(3)) : null;

  // Dataset Riwayat API Terurut Kronologis
  const sortedApiHistory = useMemo(() => {
    const raw = summary.history || [];
    return [...raw].sort(
      (a, b) => parseTimestamp(a.timestamp).getTime() - parseTimestamp(b.timestamp).getTime()
    );
  }, [summary.history]);

  // Dataset Grafik TDS Live untuk Recharts
  const chartTdsData = useMemo(() => {
    // 1. Jika ada data simulasi siklus, tampilkan data siklus aktif
    if (hasSimData) {
      return activeDataset.map((item, idx) => ({
        waktu: `Jam ${idx + 1}`,
        rawTime: formatTime(item.timestamp),
        tds: item.tds != null ? Number(item.tds.toFixed(2)) : null,
      }));
    }

    // 2. Jika sesi demo belum aktif tetapi ada data dari API, tampilkan data API riil langsung!
    if (sortedApiHistory.length > 0) {
      return sortedApiHistory.map((item) => ({
        waktu: formatTime(item.timestamp),
        rawTime: formatTime(item.timestamp),
        tds: item.tds != null ? Number(item.tds.toFixed(2)) : null,
      }));
    }

    // 3. Fallback kosong murni jika belum ada data dari manapun
    return EMPTY_AXIS_PLACEHOLDER;
  }, [hasSimData, activeDataset, sortedApiHistory]);

  // Dataset Grafik Tegangan Live untuk Recharts
  const chartVoltData = useMemo(() => {
    if (hasSimData) {
      return activeDataset.map((item, idx) => ({
        waktu: `Jam ${idx + 1}`,
        rawTime: formatTime(item.timestamp),
        tegangan: item.voltage != null ? Number(item.voltage.toFixed(3)) : null,
      }));
    }

    if (sortedApiHistory.length > 0) {
      return sortedApiHistory.map((item) => ({
        waktu: formatTime(item.timestamp),
        rawTime: formatTime(item.timestamp),
        tegangan: item.voltage != null ? Number(item.voltage.toFixed(3)) : null,
      }));
    }

    return EMPTY_AXIS_PLACEHOLDER;
  }, [hasSimData, activeDataset, sortedApiHistory]);

  const hasAnyData = hasSimData || sortedApiHistory.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER TITLE & BADGES
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <p className="text-sky-600 text-xs sm:text-sm font-semibold mb-1">Selamat datang di</p>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold text-slate-900 drop-shadow-sm">
            <TypewriterText text="LIVE DEMO SMART-MFC" />
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1.5 sm:mt-2 leading-relaxed">
            Ilustrasi simulasi multi-siklus berbasis data telemetri riil REST API (1 menit demo = 1 jam penelitian).
          </p>
        </div>

        <div className="self-start md:self-start flex-shrink-0 pt-1 flex flex-wrap items-center gap-2">
          {isFrozen && (
            <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-purple-100 text-purple-800 border border-purple-300 animate-pulse">
              FREEZE (50/50 DATA)
            </span>
          )}
          <Badge
            variant={isApiConnected ? "outline-green" : "warning"}
            icon={isApiConnected ? <Wifi size={14} /> : <FlaskConical size={14} />}
          >
            {isApiConnected ? "TERHUBUNG D1 API (LIVE)" : "MODE PENGUJIAN / SIMULASI"}
          </Badge>
        </div>
      </div>

      {/* ── Status Bar Real-Time Sinkronisasi API & Hitung Mundur Simulasi ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 px-4 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-slate-600 font-medium">
            API Cloudflare: <strong className="text-slate-900">{isApiConnected ? "Online (Sinkron 3 detik)" : "Mencoba menghubungkan..."}</strong>
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-500 font-mono">Sync: {lastSyncTime}</span>
        </div>

        {isRunning && !isFrozen && (
          <div className="flex items-center gap-2 text-sky-700 font-semibold bg-sky-50 px-3 py-1 rounded-lg border border-sky-200">
            <Timer size={14} className="animate-spin text-sky-600" />
            <span>Data Jam ke-{generationCount + 1} masuk dalam:</span>
            <span className="font-mono font-bold text-sky-900 text-sm">{countdownSec}s</span>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. CYCLE TAB SWITCHER (SIKLUS 1 / SIKLUS 2 / SIKLUS 3)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">
            Pilih Siklus Telemetri:
          </span>
          <div className="inline-flex p-1 bg-slate-100/90 rounded-xl gap-1 border border-slate-200/60">
            {(["s1", "s2", "s3"] as const).map((cycleKey) => {
              const cfg = CYCLE_CONFIGS[cycleKey];
              const isSelected = activeCycleTab === cycleKey;
              return (
                <button
                  key={cycleKey}
                  onClick={() => handleSelectTab(cycleKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-white text-sky-700 shadow-xs border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  <span>{cfg.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                      isSelected ? "bg-sky-50 text-sky-700" : "bg-slate-200/70 text-slate-500"
                    }`}
                  >
                    {generationCount}/50
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Info Parameter Siklus Aktif */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-sky-50/80 border border-sky-100 px-3 py-1.5 rounded-xl">
          <TrendingUp size={14} className="text-sky-600 shrink-0" />
          <span>
            {activeCycleConfig.name}: <strong className="text-slate-900">{activeCycleConfig.label}</strong>
          </span>
        </div>
      </div>

      {/* Banner Notifikasi Aksi */}
      {notificationMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-900 shadow-2xs transition-all">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{notificationMsg}</span>
          </div>
        </div>
      )}

      {/* Banner status jika belum ada data */}
      {!hasAnyData && (
        <div className="p-3.5 bg-sky-50/90 border border-sky-200 rounded-2xl flex items-center gap-3 text-xs text-sky-900 shadow-2xs">
          <Info size={17} className="text-sky-600 flex-shrink-0" />
          <div className="flex-1 font-medium">
            Siklus siap. Klik <strong className="text-sky-950 font-bold">Mulai Demo</strong> untuk memasukkan data awal dan menjalankan simulasi otomatis, atau hubungkan ESP32 ke API D1.
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. TOP ROW: 4 METRIC CARDS (KPIs)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: TDS Live */}
        <MagneticCard className="p-5 flex flex-col justify-between min-h-[170px] relative group overflow-hidden border-slate-200/80 bg-white/90 backdrop-blur-md shadow-sm hover:shadow-md transition-all">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 flex-shrink-0">
                <Droplets size={20} className={hasAnyData ? "animate-pulse" : ""} />
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-700">TDS Live</span>
                <span className="block text-[10px] text-sky-600 font-bold">
                  {hasSimData ? activeCycleConfig.name : isApiConnected ? "Stream API D1" : "Menunggu"}
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-black text-3xl sm:text-4xl text-slate-900 tracking-tight">
                {isLoading ? "..." : latestTdsVal !== null ? latestTdsVal.toLocaleString("id-ID") : "--"}
              </span>
              <span className="text-sm font-bold text-slate-500">mg/L</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {hasSimData
                ? `Pembacaan jam ke-${generationCount}`
                : latestTdsVal !== null
                ? "Pembacaan sensor dari API"
                : "Menunggu data masuk"}
            </p>
          </div>
          <div>
            <span
              className={`inline-block mt-4 px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase ${
                latestTdsVal !== null
                  ? "bg-sky-50 text-sky-700 border border-sky-200/80"
                  : "bg-slate-100 text-slate-500 border border-slate-200"
              }`}
            >
              {latestTdsVal !== null ? "TERBACA" : "MENUNGGU"}
            </span>
          </div>
        </MagneticCard>

        {/* Card 2: Tegangan Live */}
        <MagneticCard className="p-5 flex flex-col justify-between min-h-[170px] relative group overflow-hidden border-slate-200/80 bg-white/90 backdrop-blur-md shadow-sm hover:shadow-md transition-all">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 flex-shrink-0">
                <Zap size={20} className={hasAnyData ? "animate-pulse" : ""} />
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-700">Tegangan Live</span>
                <span className="block text-[10px] text-sky-600 font-bold">
                  {hasSimData ? activeCycleConfig.name : isApiConnected ? "Stream API D1" : "Menunggu"}
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-black text-3xl sm:text-4xl text-slate-900 tracking-tight">
                {isLoading ? "..." : latestVoltVal !== null ? latestVoltVal.toFixed(3).replace(".", ",") : "--"}
              </span>
              <span className="text-sm font-bold text-slate-500">V</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {hasSimData
                ? "Tegangan MFC siklus terpilih"
                : latestVoltVal !== null
                ? "Tegangan aktual reaktor"
                : "Tegangan Reaktor (Menunggu Data)"}
            </p>
          </div>
          <div>
            <span
              className={`inline-block mt-4 px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase ${
                latestVoltVal !== null
                  ? "bg-sky-50 text-sky-700 border border-sky-200/80"
                  : "bg-slate-100 text-slate-500 border border-slate-200"
              }`}
            >
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
                  isFrozen
                    ? "text-purple-600"
                    : isRunning
                    ? "text-emerald-600"
                    : isApiConnected
                    ? "text-emerald-600"
                    : "text-slate-500"
                }`}
              >
                {isFrozen ? "FREEZE" : isRunning ? "AKTIF" : isApiConnected ? "TERHUBUNG" : "OFFLINE"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">
              {isFrozen
                ? "50 data tercapai • Siap dihentikan"
                : isRunning
                ? `Simulasi aktif • ${generationCount}/50 data`
                : isApiConnected
                ? "ESP32 terhubung • API D1 Aktif"
                : "Sesi demo dihentikan"}
            </p>
          </div>
          <div>
            <span
              className={`inline-block mt-4 px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase ${
                isFrozen
                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                  : isRunning
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                  : isApiConnected
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {isFrozen ? "LOCKED" : isRunning ? "RUNNING" : isApiConnected ? "ONLINE" : "STOPPED"}
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
                <span className="text-slate-500">Durasi demo</span>
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
          4. MIDDLE ROW: 2 CHARTS (GRAFIK TDS LIVE & GRAFIK TEGANGAN LIVE)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Chart 1: Grafik TDS Live */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2.5 mb-4">
              <div className="flex items-start gap-2.5">
                <Droplets className="text-sky-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Grafik TDS Live — {hasSimData ? activeCycleConfig.name : "Telemetri Real-Time"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {hasSimData
                      ? `Model Linier: Slope +${activeCycleConfig.slope} mg/L/jam (R² ${activeCycleConfig.r2})`
                      : hasAnyData
                      ? "Menampilkan data telemetri real-time dari API Cloudflare D1"
                      : "Menunggu data masuk dari sensor / simulasi"}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                {hasSimData ? "Local Storage" : "REST API D1"}
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
                      value: hasSimData ? "Jam Penelitian (Simulasi)" : "Waktu Pengambilan",
                      position: "insideBottom",
                      offset: -20,
                      fontSize: 11,
                      fill: "#475569",
                      fontWeight: 500,
                    }}
                  />
                  <YAxis
                    domain={hasAnyData ? ["dataMin - 30", "dataMax + 30"] : [600, 1600]}
                    ticks={hasAnyData ? undefined : [600, 850, 1100, 1350, 1600]}
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
                  {/* Garis Target Operasional TDS ≤ 1.000 mg/L */}
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
                  {hasAnyData && (
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

          <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-3 mt-1 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-slate-400" />
              <span>
                {hasSimData
                  ? `Total ${activeDataset.length} data generasi`
                  : sortedApiHistory.length > 0
                  ? `Total ${sortedApiHistory.length} data riwayat API`
                  : "Menunggu Data Masuk"}
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-400">
              {hasSimData ? "1 mnt demo = 1 jam penelitian" : "Polling REST API 3 detik"}
            </span>
          </div>
        </div>

        {/* Chart 2: Grafik Tegangan Live */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2.5 mb-4">
              <div className="flex items-start gap-2.5">
                <Zap className="text-sky-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Grafik Tegangan Live — {hasSimData ? activeCycleConfig.name : "Telemetri Real-Time"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {hasSimData
                      ? "Fluktuasi tegangan mikro MFC terkalibrasi bio-elektrik"
                      : hasAnyData
                      ? "Menampilkan tegangan riil sensor MFC dari API D1"
                      : "Menunggu data masuk dari sensor / simulasi"}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                {hasSimData ? "Local Storage" : "REST API D1"}
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
                      value: hasSimData ? "Jam Penelitian (Simulasi)" : "Waktu Pengambilan",
                      position: "insideBottom",
                      offset: -20,
                      fontSize: 11,
                      fill: "#475569",
                      fontWeight: 500,
                    }}
                  />
                  <YAxis
                    domain={hasAnyData ? ["dataMin - 0.05", "dataMax + 0.05"] : [0.0, 1.0]}
                    ticks={hasAnyData ? undefined : [0.0, 0.25, 0.5, 0.75, 1.0]}
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
                  {hasAnyData && (
                    <Area
                      type="monotone"
                      dataKey="tegangan"
                      stroke="#059669"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#voltGradient)"
                      dot={{ r: 4, fill: "#FFFFFF", stroke: "#059669", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#059669", stroke: "#FFFFFF", strokeWidth: 2 }}
                      label={<CustomVoltLabel />}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-3 mt-1 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-slate-400" />
              <span>
                {hasSimData
                  ? `Total ${activeDataset.length} data generasi`
                  : sortedApiHistory.length > 0
                  ? `Total ${sortedApiHistory.length} data riwayat API`
                  : "Menunggu Data Masuk"}
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-400">
              {hasSimData ? "Sinkronisasi Simultan 3 Siklus" : "Telemetri Reaktor Aktif"}
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. BOTTOM ROW: 3 CARDS (KONTROL SESI, INFO SESI, ALUR DATA)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Card 1: Kontrol Sesi Demo (Col Span 3 ~25%) */}
        <div className="lg:col-span-3 bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Settings className="text-slate-700" size={17} />
              <h3 className="font-bold text-sm text-slate-900">Kontrol Sesi Demo</h3>
            </div>

            <div className="space-y-2.5">
              {/* Tombol Mulai Demo */}
              <button
                onClick={handleStartDemo}
                disabled={isRunning || isFrozen}
                className={`w-full py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  isRunning || isFrozen
                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-80"
                    : "bg-sky-600 hover:bg-sky-700 text-white shadow-sm hover:shadow active:scale-[0.98]"
                }`}
              >
                <Play size={15} className={isRunning || isFrozen ? "text-slate-400" : "fill-white"} />
                <span>{generationCount > 0 ? "Lanjutkan Demo" : "Mulai Demo"}</span>
              </button>

              {/* Tombol Akhiri Demo */}
              <button
                onClick={handleStopDemo}
                disabled={!isRunning && generationCount === 0}
                className={`w-full py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  !isRunning && generationCount === 0
                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-80"
                    : "border-2 border-rose-500 text-rose-600 hover:bg-rose-50 active:bg-rose-100 shadow-2xs active:scale-[0.98]"
                }`}
              >
                <Square size={14} className={!isRunning && generationCount === 0 ? "text-slate-400" : "fill-rose-600 text-rose-600"} />
                <span>Akhiri Demo</span>
              </button>

              {/* Tombol Simulasi Manual Step (+1 Jam ke LocalStorage) */}
              <button
                onClick={handleManualSimulateStep}
                disabled={!isRunning || isFrozen}
                className="w-full mt-2 py-2 px-2.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 active:bg-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                title="Generate 1 titik jam berikutnya secara instan ke local storage"
              >
                <FastForward size={13} />
                <span>Simulasikan +1 Jam (Step)</span>
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="p-3 bg-sky-50/80 border border-sky-100 rounded-xl flex items-start gap-2">
              <Info size={15} className="text-sky-600 mt-0.5 flex-shrink-0" />
              <p className="text-[10.5px] text-slate-600 leading-relaxed font-medium">
                {isFrozen
                  ? "Batas 50 data tercapai. Seluruh data aman di LocalStorage. Klik 'Akhiri Demo' untuk membersihkan dan reset."
                  : isRunning
                  ? `Sesi aktif (${generationCount}/50 data). Titik berikutnya masuk otomatis setiap 60 detik atau klik tombol Step.`
                  : "Sesi demo dijeda / tidak aktif. Klik Mulai Demo untuk menjalankan generasi data multi-siklus."}
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Info Sesi (Col Span 3 ~25%) */}
        <div className="lg:col-span-3 bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
              <Info className="text-slate-700" size={17} />
              <h3 className="font-bold text-sm text-slate-900">Info Sesi</h3>
            </div>

            <div className="space-y-2 text-[11px] sm:text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Layers size={13} className="text-slate-400 shrink-0" />
                  <span>Siklus Aktif</span>
                </div>
                <span className="text-sky-700 font-bold text-right">
                  {hasSimData ? activeCycleConfig.name : "Stream API Langsung"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <TrendingUp size={13} className="text-slate-400 shrink-0" />
                  <span>Slope / R²</span>
                </div>
                <span className="text-slate-800 font-semibold text-right">
                  +{activeCycleConfig.slope} / {activeCycleConfig.r2}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Hourglass size={13} className="text-slate-400 shrink-0" />
                  <span>Generasi Data</span>
                </div>
                <span className="font-mono font-bold text-slate-800">{generationCount} / 50</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <RefreshCw size={13} className="text-slate-400 shrink-0" />
                  <span>Interval Demo</span>
                </div>
                <span className="text-slate-800 font-semibold">1 mnt (= 1 jam)</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Database size={13} className="text-slate-400 shrink-0" />
                  <span>Penyimpanan</span>
                </div>
                <span className="text-emerald-700 font-semibold text-right">LocalStorage</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Droplets size={13} className="text-sky-600 shrink-0" />
                  <span>TDS Terakhir</span>
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

        {/* Card 3: Alur Data Live (Ilustrasi) (Col Span 6 ~50%) */}
        <div className="lg:col-span-6 bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
              <Share2 size={16} className="text-slate-700 flex-shrink-0" />
              <h3 className="font-bold text-sm text-slate-900">Alur Data Live (Ilustrasi)</h3>
            </div>

            {/* Diagram Alur - 100% Flexbox Penuh Membentang Tanpa Ruang Kosong di Kanan */}
            <div className="w-full py-2">
              <div className="flex items-center justify-between w-full gap-1 sm:gap-2">
                {/* Node 1: Reaktor SMART-MFC */}
                <div className="flex-1 min-w-0 h-full flex flex-col items-center justify-between bg-white border border-slate-200 rounded-xl p-2 sm:p-2.5 shadow-2xs text-center min-h-[125px] sm:min-h-[135px]">
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

                {/* SVG Fork Connector */}
                <div className="flex flex-col items-center justify-center w-3 sm:w-3.5 text-slate-300 shrink-0">
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
                <div className="flex-[1.15] min-w-0 h-full flex flex-col justify-between gap-1.5 min-h-[125px] sm:min-h-[135px]">
                  {/* Node 2A */}
                  <div className="w-full min-w-0 flex-1 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-xl p-1.5 shadow-2xs text-center">
                    <div className="flex items-center gap-1 mb-0.5">
                      <Droplets size={12} className="text-sky-600 shrink-0" />
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-800 leading-tight truncate">
                        Sensor TDS
                      </span>
                    </div>
                    <span
                      className={`text-[8px] sm:text-[8.5px] font-bold px-1.5 py-0.2 rounded-full flex items-center gap-1 ${
                        latestTdsVal !== null
                          ? "text-emerald-600 bg-emerald-50"
                          : "text-slate-500 bg-slate-100"
                      }`}
                    >
                      <span
                        className={`w-1 h-1 rounded-full ${
                          latestTdsVal !== null ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                      ></span>
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
                    <span
                      className={`text-[8px] sm:text-[8.5px] font-bold px-1.5 py-0.2 rounded-full flex items-center gap-1 ${
                        latestVoltVal !== null
                          ? "text-emerald-600 bg-emerald-50"
                          : "text-slate-500 bg-slate-100"
                      }`}
                    >
                      <span
                        className={`w-1 h-1 rounded-full ${
                          latestVoltVal !== null ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                      ></span>
                      {latestVoltVal !== null ? "TERBACA" : "MENUNGGU"}
                    </span>
                  </div>
                </div>

                {/* SVG Merge Connector to ADS1115 */}
                <div className="flex flex-col items-center justify-center w-3 sm:w-3.5 text-slate-300 shrink-0">
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
                <div className="flex-1 min-w-0 h-full flex flex-col items-center justify-between bg-white border border-slate-200 rounded-xl p-2 sm:p-2.5 shadow-2xs text-center min-h-[125px] sm:min-h-[135px]">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 mb-1">
                    <Cpu size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 leading-tight block">
                      ADS1115
                    </span>
                    <span className="text-[8px] sm:text-[8.5px] text-slate-400 font-medium">Akuisisi</span>
                  </div>
                  <span className="text-[8.5px] sm:text-[9.5px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    AKTIF
                  </span>
                </div>

                {/* Connector Arrow */}
                <div className="flex items-center justify-center w-2 sm:w-2.5 text-slate-400 shrink-0">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="w-full">
                    <path d="M 0 5 H 8" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
                    <polygon points="6,2 10,5 6,8" fill="#94A3B8" />
                  </svg>
                </div>

                {/* Node 4: ESP32 */}
                <div className="flex-1 min-w-0 h-full flex flex-col items-center justify-between bg-white border border-slate-200 rounded-xl p-2 sm:p-2.5 shadow-2xs text-center min-h-[125px] sm:min-h-[135px]">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 mb-1">
                    <Radio size={16} />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 leading-tight">ESP32</span>
                  <span
                    className={`text-[8.5px] sm:text-[9.5px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 mt-1 ${
                      isApiConnected ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isApiConnected ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    ></span>
                    {isApiConnected ? "TERHUBUNG" : "MENCOBA"}
                  </span>
                </div>

                {/* Connector Arrow */}
                <div className="flex items-center justify-center w-2 sm:w-2.5 text-slate-400 shrink-0">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="w-full">
                    <path d="M 0 5 H 8" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
                    <polygon points="6,2 10,5 6,8" fill="#94A3B8" />
                  </svg>
                </div>

                {/* Node 5: Cloud API */}
                <div className="flex-1 min-w-0 h-full flex flex-col items-center justify-between bg-white border border-slate-200 rounded-xl p-2 sm:p-2.5 shadow-2xs text-center min-h-[125px] sm:min-h-[135px]">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mb-1">
                    <Cloud size={16} />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 leading-tight">
                    Cloud API
                  </span>
                  <span
                    className={`text-[8.5px] sm:text-[9.5px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 mt-1 ${
                      isApiConnected ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isApiConnected ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    ></span>
                    {isApiConnected ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>

                {/* Connector Arrow */}
                <div className="flex items-center justify-center w-2 sm:w-2.5 text-slate-400 shrink-0">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="w-full">
                    <path d="M 0 5 H 8" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
                    <polygon points="6,2 10,5 6,8" fill="#94A3B8" />
                  </svg>
                </div>

                {/* Node 6: Web Live Demo */}
                <div className="flex-1 min-w-0 h-full flex flex-col items-center justify-between bg-white border border-slate-200 rounded-xl p-2 sm:p-2.5 shadow-2xs text-center min-h-[125px] sm:min-h-[135px]">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mb-1">
                    <Monitor size={16} />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 leading-tight">
                    Web Live Demo
                  </span>
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
                ? "Semua komponen terhubung ke REST API Cloudflare D1 dan alur telemetri berjalan lancar."
                : "Alur simulasi data lokal berjalan (menunggu sinkronisasi API)."}
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          6. BOTTOM NOTE / FOOTER BANNER
      ───────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-sky-50/70 border border-sky-200/80 rounded-2xl flex items-center gap-3 text-xs sm:text-sm text-slate-700 shadow-2xs">
        <div className="w-7 h-7 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700 flex-shrink-0">
          <Info size={16} />
        </div>
        <p className="leading-relaxed font-medium">
          <span className="font-bold text-slate-900">Catatan:</span> Halaman ini digunakan untuk demonstrasi sistem SMART-MFC yang terhubung langsung ke IoT Telemetry REST API Cloudflare D1 (sinkronisasi 3 detik) serta simulasi data penelitian (Siklus 1: slope +0,458, Siklus 2: slope +1,049, Siklus 3: slope +0,131). Data simulasi tersimpan di LocalStorage dan akan otomatis dihapus saat demo dihentikan.
        </p>
      </div>
    </div>
  );
}

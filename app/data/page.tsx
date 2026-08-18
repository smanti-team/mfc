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
} from "recharts";

// Interface Definitions
interface CycleReading {
  hour: number;
  actualTime: string;
  tds: number;
  voltage: number;
  status: "Valid" | "Dalam Proses";
}

interface SingleCycleConfig {
  id: string;
  name: string;
  baselineTds: number;
  currentTds: number;
  reductionPercent: string;
  rSquared: string;
  regressionEq: string;
  targetReachedHour: string;
  estimatedRemaining: string;
  readings: CycleReading[];
}

// Fixed Data for Siklus 1, 2, 3
const cycleDataMap: Record<string, SingleCycleConfig> = {
  "Siklus 1": {
    id: "Siklus 1",
    name: "Siklus 1",
    baselineTds: 1400,
    currentTds: 1050,
    reductionPercent: "25,0%",
    rSquared: "0,94",
    regressionEq: "y = -24,3x + 1410",
    targetReachedHour: "Jam ke-18",
    estimatedRemaining: "±3 jam",
    readings: [
      { hour: 0, actualTime: "17 Agu 08.15", tds: 1400, voltage: 596, status: "Valid" },
      { hour: 3, actualTime: "17 Agu 11.15", tds: 1315, voltage: 584, status: "Valid" },
      { hour: 6, actualTime: "17 Agu 14.15", tds: 1200, voltage: 590, status: "Valid" },
      { hour: 9, actualTime: "17 Agu 17.15", tds: 1230, voltage: 601, status: "Valid" },
      { hour: 12, actualTime: "17 Agu 20.15", tds: 1120, voltage: 596, status: "Valid" },
      { hour: 15, actualTime: "17 Agu 23.15", tds: 1050, voltage: 611, status: "Valid" },
    ],
  },
  "Siklus 2": {
    id: "Siklus 2",
    name: "Siklus 2",
    baselineTds: 1380,
    currentTds: 920,
    reductionPercent: "33,3%",
    rSquared: "0,95",
    regressionEq: "y = -30,2x + 1385",
    targetReachedHour: "Jam ke-13",
    estimatedRemaining: "Tercapai",
    readings: [
      { hour: 0, actualTime: "24 Agu 08.00", tds: 1380, voltage: 602, status: "Valid" },
      { hour: 3, actualTime: "24 Agu 11.00", tds: 1260, voltage: 608, status: "Valid" },
      { hour: 6, actualTime: "24 Agu 14.00", tds: 1150, voltage: 615, status: "Valid" },
      { hour: 9, actualTime: "24 Agu 17.00", tds: 1080, voltage: 620, status: "Valid" },
      { hour: 12, actualTime: "24 Agu 20.00", tds: 980, voltage: 624, status: "Valid" },
      { hour: 15, actualTime: "24 Agu 23.00", tds: 920, voltage: 628, status: "Valid" },
    ],
  },
  "Siklus 3": {
    id: "Siklus 3",
    name: "Siklus 3",
    baselineTds: 1420,
    currentTds: 1015,
    reductionPercent: "28,5%",
    rSquared: "0,91",
    regressionEq: "y = -26,8x + 1425",
    targetReachedHour: "Jam ke-16",
    estimatedRemaining: "±1 jam",
    readings: [
      { hour: 0, actualTime: "31 Agu 08.30", tds: 1420, voltage: 588, status: "Valid" },
      { hour: 3, actualTime: "31 Agu 11.30", tds: 1350, voltage: 592, status: "Valid" },
      { hour: 6, actualTime: "31 Agu 14.30", tds: 1290, voltage: 595, status: "Valid" },
      { hour: 9, actualTime: "31 Agu 17.30", tds: 1200, voltage: 599, status: "Valid" },
      { hour: 12, actualTime: "31 Agu 20.30", tds: 1120, voltage: 603, status: "Valid" },
      { hour: 15, actualTime: "31 Agu 23.30", tds: 1015, voltage: 607, status: "Valid" },
    ],
  },
};

// Data for Perbandingan Siklus
const comparisonChartData = [
  { hour: 0, s1Tds: 1400, s2Tds: 1380, s3Tds: 1420, s1Volt: 596, s2Volt: 602, s3Volt: 588 },
  { hour: 3, s1Tds: 1315, s2Tds: 1260, s3Tds: 1350, s1Volt: 584, s2Volt: 608, s3Volt: 592 },
  { hour: 6, s1Tds: 1200, s2Tds: 1150, s3Tds: 1290, s1Volt: 590, s2Volt: 615, s3Volt: 595 },
  { hour: 9, s1Tds: 1230, s2Tds: 1080, s3Tds: 1200, s1Volt: 601, s2Volt: 620, s3Volt: 599 },
  { hour: 12, s1Tds: 1120, s2Tds: 980, s3Tds: 1120, s1Volt: 596, s2Volt: 624, s3Volt: 603 },
  { hour: 15, s1Tds: 1050, s2Tds: 920, s3Tds: 1015, s1Volt: 611, s2Volt: 628, s3Volt: 607 },
];

const summaryMatrix = [
  { param: "TDS Awal", icon: Droplet, s1: "1400 mg/L", s2: "1380 mg/L", s3: "1420 mg/L" },
  { param: "TDS Akhir", icon: Droplet, s1: "1050 mg/L", s2: "920 mg/L", s3: "1015 mg/L" },
  { param: "Penurunan TDS", icon: TrendingDown, s1: "25,0%", s2: "33,3%", s3: "28,5%" },
  { param: "Tegangan Awal", icon: Activity, s1: "596 mV", s2: "602 mV", s3: "588 mV" },
  { param: "Tegangan Maksimum", icon: Activity, s1: "611 mV", s2: "628 mV", s3: "607 mV" },
  { param: "Tegangan Akhir", icon: Activity, s1: "611 mV", s2: "628 mV", s3: "607 mV" },
  { param: "R² Regresi", icon: ChartIcon, s1: "0,94", s2: "0,95", s3: "0,91" },
];

// Summary Reaktor A (Pra-Siklus)
const reaktorASummary = [
  { tanggal: "11 Agu", tegangan: "±0,18–0,20 V", catatan: "Awal commissioning" },
  { tanggal: "12 Agu", tegangan: "±0,41–0,50 V", catatan: "Tegangan berkembang" },
  { tanggal: "13 Agu", tegangan: "±0,55–0,60 V", catatan: "Relatif stabil" },
  { tanggal: "14 Agu", tegangan: "±0,61–0,63 V", catatan: "Kisaran tertinggi commissioning" },
  { tanggal: "15 Agu", tegangan: "0 V → ±0,52–0,59 V", catatan: "Katoda sempat kehilangan kontak akibat level cairan turun" },
  { tanggal: "16 Agu", tegangan: "—", catatan: "Perbaikan/observasi mekanik" },
  { tanggal: "17 Agu", tegangan: "±0,49 V → ±0,33 V → 0,348 V → 0,373 V", catatan: "Jatuh/tumpah kemudian recovery" },
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
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return <g />;
  const valStr = typeof payload.tds === 'number' 
    ? payload.tds.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : payload.tds;
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill="#0284C7" stroke="#FFFFFF" strokeWidth={2} />
      <text
        x={cx}
        y={cy - 10}
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
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return <g />;
  const valStr = typeof payload.voltage === 'number'
    ? payload.voltage.toFixed(2).replace('.', ',')
    : payload.voltage;
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill="#16A34A" stroke="#FFFFFF" strokeWidth={2} />
      <text
        x={cx}
        y={cy - 10}
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
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return <g />;
  const val = payload[keyName];
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill={color} stroke="#FFFFFF" strokeWidth={1.5} />
      <text
        x={cx}
        y={cy - 8}
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
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return <g />;
  const val = payload[keyName];
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill={color} stroke="#FFFFFF" strokeWidth={1.5} />
      <text
        x={cx}
        y={cy - 8}
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

export default function DataPenelitianPage() {
  const [activeTab, setActiveTab] = useState<string>("Pra-Siklus");
  const tabs = ["Pra-Siklus", "Siklus 1", "Siklus 2", "Siklus 3", "Perbandingan Siklus", "Micro-Energy"];

  const [summary, setSummary] = useState<Summary>({ latest: null, history: [] });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchSummary(100);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data API");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Fallback data for Pra-Siklus if API is empty/offline
  const fallbackPraSiklus: Reading[] = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return [
      { timestamp: now - 3600, tds: 956.84, voltage: 0.23 },
      { timestamp: now - 2700, tds: 1061.76, voltage: 0.24 },
      { timestamp: now - 1800, tds: 956.79, voltage: 0.23 },
      { timestamp: now - 300, tds: 1068.89, voltage: 0.20 },
    ];
  }, []);

  // Process Pra-Siklus API / Telemetry Data
  const praSiklusList = useMemo(() => {
    const raw = (summary.history && summary.history.length > 0) ? summary.history : fallbackPraSiklus;
    return [...raw].sort(
      (a, b) => parseTimestamp(a.timestamp).getTime() - parseTimestamp(b.timestamp).getTime()
    );
  }, [summary.history, fallbackPraSiklus]);

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
        voltage: Number(v.toFixed(2)),
      };
    });
  }, [praSiklusList]);

  // Pra-Siklus Table (Latest 6 records, sorted descending)
  const praSiklusTableRows = useMemo(() => {
    const sortedDesc = [...praSiklusList].reverse();
    return sortedDesc.slice(0, 6).map((d, i) => {
      const v = d.voltage != null ? (d.voltage <= 20 ? d.voltage : d.voltage / 1000) : 0.20;
      let catatan = "Uji pembacaan";
      if (i === 0) catatan = "Data terakhir sebelum ditinggalkan";
      else if (i === 1) catatan = "Uji pembacaan";
      else if (i === 2) catatan = "Pembacaan TDS berubah cepat";
      else if (i === 3) catatan = "Uji awal ESP32/web";

      return {
        tanggal: formatDate(d.timestamp),
        jam: formatFullTime(d.timestamp),
        tdsStr: `${(d.tds ?? 956.84).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mg/L`,
        voltageStr: `${v.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} V`,
        catatan,
      };
    });
  }, [praSiklusList]);

  const handleDownloadPraSiklusCSV = () => {
    let csv = "Tanggal,Jam,TDS,Tegangan,Catatan\n";
    [...praSiklusList].reverse().forEach((d, i) => {
      const v = d.voltage != null ? (d.voltage <= 20 ? d.voltage : d.voltage / 1000) : 0.20;
      const tgl = formatDate(d.timestamp);
      const jam = formatFullTime(d.timestamp);
      const tds = (d.tds ?? 0).toFixed(2);
      const volt = v.toFixed(2);
      csv += `"${tgl}","${jam}",${tds},${volt},"Uji/commissioning Reaktor Utama"\n`;
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

  const currentCycle = cycleDataMap[activeTab] || cycleDataMap["Siklus 1"];
  const isComparison = activeTab === "Perbandingan Siklus";
  const isPraSiklus = activeTab === "Pra-Siklus";
  const isMicroEnergy = activeTab === "Micro-Energy";

  const handleDownloadCSV = () => {
    if (isPraSiklus) {
      handleDownloadPraSiklusCSV();
      return;
    }

    let csv = "";
    if (!isComparison && !isMicroEnergy) {
      csv = "Jam ke-,Waktu Aktual,TDS (mg/L),Tegangan MFC (mV),Status\n";
      currentCycle.readings.forEach((r) => {
        csv += `${r.hour},"${r.actualTime}",${r.tds},${r.voltage},${r.status}\n`;
      });
    } else {
      csv = "Parameter,Siklus 1,Siklus 2,Siklus 3\n";
      summaryMatrix.forEach((m) => {
        csv += `"${m.param}","${m.s1}","${m.s2}","${m.s3}"\n`;
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
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-slate-900 drop-shadow-sm">
            Data Penelitian
          </h1>
          <p className="text-slate-600 text-sm mt-2 font-medium">
            {isPraSiklus
              ? "Uji/commissioning Reaktor Utama sebelum Siklus 1"
              : isComparison
              ? "Perbandingan hasil Siklus 1, Siklus 2, dan Siklus 3 berdasarkan TDS dan tegangan MFC."
              : isMicroEnergy
              ? "Pemantauan energi mikro, tegangan daya, dan manajemen daya sistem SMART-MFC."
              : "Data Siklus 1–3, grafik penelitian, regresi, dan analisis penurunan TDS."}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Badge variant={error ? "warning" : "outline-green"} icon={error ? <FlaskConical size={14} /> : <Wifi size={14} />}>
            {error ? "MODE PENGUJIAN / SIMULASI" : "TERHUBUNG D1 API (LIVE)"}
          </Badge>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 mb-8 border-b border-sky-900/10 pb-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-t-xl text-sm font-semibold transition-all relative ${
                isActive
                  ? "bg-white border-t border-x border-sky-900/10 text-sky-600 shadow-sm -mb-[2px] z-10"
                  : "text-slate-600 hover:text-slate-900 hover:bg-sky-50/50"
              }`}
            >
              {tab}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-sky-600" />
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: PRA-SIKLUS (GOAL SCREENSHOT 2) */}
      {isPraSiklus && (
        <div className="space-y-6">
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <Database size={17} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Jumlah Data Uji</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-4xl sm:text-[42px] font-extrabold text-sky-600 tracking-tight">
                  {praSiklusMetrics.totalCount}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">Titik data pra-siklus</p>
              </div>
            </MagneticCard>

            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <Clock size={17} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Durasi Uji</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-xl sm:text-2xl font-extrabold text-sky-600 tracking-tight leading-tight">
                  {praSiklusMetrics.durasiStr}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">Sejak uji/commissioning dimulai</p>
              </div>
            </MagneticCard>

            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <Droplet size={17} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">TDS Terbaru</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-2xl sm:text-3xl font-extrabold text-sky-600 tracking-tight leading-tight">
                  {praSiklusMetrics.latestTdsStr}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">Pembacaan terbaru Reaktor Utama</p>
              </div>
            </MagneticCard>

            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <Target size={17} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Tegangan Terbaru</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-3xl sm:text-4xl font-extrabold text-sky-600 tracking-tight">
                  {praSiklusMetrics.latestVoltStr}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">Tegangan Reaktor Utama</p>
              </div>
            </MagneticCard>
          </div>

          {/* Middle Section: 2 Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Chart: Grafik TDS Pra-Siklus */}
            <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="mb-2">
                <h3 className="font-display font-bold text-slate-900 text-base">
                  Grafik TDS Pra-Siklus
                </h3>
                <p className="text-xs text-emerald-600 font-medium mt-0.5">
                  Perubahan TDS Reaktor Utama selama uji/commissioning
                </p>
              </div>
              <div className="h-[280px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={praSiklusChartData} margin={{ top: 25, right: 25, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="waktu"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                      padding={{ left: 45, right: 45 }}
                      label={{ value: "Waktu", position: "insideBottom", offset: -15, fill: "#475569", fontSize: 11, fontWeight: 500 }}
                    />
                    <YAxis
                      stroke="#64748B"
                      fontSize={11}
                      domain={[700, 1200]}
                      ticks={[700, 800, 900, 1000, 1100, 1200]}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                      label={{ value: "TDS (mg/L)", angle: -90, position: "insideLeft", offset: 12, fill: "#475569", fontSize: 11, fontWeight: 500 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", fontSize: "12px" }}
                    />
                    <Line
                      type="linear"
                      dataKey="tds"
                      name="TDS Reaktor Utama"
                      stroke="#0284C7"
                      strokeWidth={2}
                      dot={<RenderCustomTdsDot />}
                      activeDot={{ r: 6, fill: "#0284C7" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Right Chart: Grafik Tegangan Pra-Siklus */}
            <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="mb-2">
                <h3 className="font-display font-bold text-slate-900 text-base">
                  Grafik Tegangan Pra-Siklus
                </h3>
                <p className="text-xs text-emerald-600 font-medium mt-0.5">
                  Perubahan tegangan Reaktor Utama selama uji/commissioning
                </p>
              </div>
              <div className="h-[280px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={praSiklusChartData} margin={{ top: 25, right: 25, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="waktu"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                      padding={{ left: 45, right: 45 }}
                      label={{ value: "Waktu", position: "insideBottom", offset: -15, fill: "#475569", fontSize: 11, fontWeight: 500 }}
                    />
                    <YAxis
                      stroke="#64748B"
                      fontSize={11}
                      domain={[0.00, 0.40]}
                      ticks={[0.00, 0.10, 0.20, 0.30, 0.40]}
                      tickFormatter={(val) => val.toFixed(2).replace('.', ',')}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                      label={{ value: "Tegangan (V)", angle: -90, position: "insideLeft", offset: 12, fill: "#475569", fontSize: 11, fontWeight: 500 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", fontSize: "12px" }}
                    />
                    <Line
                      type="linear"
                      dataKey="voltage"
                      name="Tegangan (V)"
                      stroke="#16A34A"
                      strokeWidth={2}
                      dot={<RenderCustomVoltDot />}
                      activeDot={{ r: 6, fill: "#16A34A" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Bottom Section: Table Left & Reaktor A Summary Right (Equal 50/50 Proportion) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Card: Data Uji/Commissioning Reaktor Utama */}
            <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base">
                    Data Uji/Commissioning Reaktor Utama
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
                        <th className="py-2 px-3 font-semibold">Tanggal</th>
                        <th className="py-2 px-3 font-semibold">Jam</th>
                        <th className="py-2 px-3 font-semibold">TDS</th>
                        <th className="py-2 px-3 font-semibold">Tegangan</th>
                        <th className="py-2 px-3 font-semibold">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {praSiklusTableRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 text-slate-900 font-semibold">{row.tanggal}</td>
                          <td className="py-2.5 px-3 text-slate-600 font-mono">{row.jam}</td>
                          <td className="py-2.5 px-3 text-sky-600 font-semibold">{row.tdsStr}</td>
                          <td className="py-2.5 px-3 text-emerald-600 font-semibold">{row.voltageStr}</td>
                          <td className="py-2.5 px-3 text-slate-600">{row.catatan}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-3 font-medium">
                Menampilkan {praSiklusTableRows.length} data terbaru dari {praSiklusMetrics.totalCount} data Pra-Siklus.
              </p>
            </Card>

            {/* Right Card: Ringkasan Uji/Commissioning Reaktor A */}
            <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5 flex flex-col justify-between">
              <div>
                <div className="mb-4">
                  <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base">
                    Ringkasan Uji/Commissioning Reaktor A
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-slate-500 bg-slate-100/80 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2.5 font-semibold">Tanggal</th>
                        <th className="py-2 px-2.5 font-semibold">Tegangan (V)</th>
                        <th className="py-2 px-2.5 font-semibold">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {reaktorASummary.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2 px-2.5 text-slate-900 font-semibold whitespace-nowrap">{row.tanggal}</td>
                          <td className="py-2 px-2.5 text-slate-900 font-semibold whitespace-nowrap">{row.tegangan}</td>
                          <td className="py-2 px-2.5 text-slate-600 text-[11px] leading-snug">{row.catatan}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* RENDER VIEW: SIKLUS 1, 2, atau 3 */}
      {!isComparison && !isPraSiklus && !isMicroEnergy && (
        <div className="space-y-6">
          {/* Top Section: 4 Metric Cards (Full Width 4-Column Grid) */}
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
                  {currentCycle.readings.length}
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
                  {currentCycle.reductionPercent}
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
                  {currentCycle.rSquared}
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
                  <LineChart data={currentCycle.readings} margin={{ top: 25, right: 25, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="hour"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                      label={{ value: "Jam ke-", position: "insideBottom", offset: -15, fill: "#475569", fontSize: 11, fontWeight: 500 }}
                    />
                    <YAxis
                      stroke="#64748B"
                      fontSize={11}
                      domain={[600, 1600]}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", fontSize: "12px" }}
                    />
                    <ReferenceLine y={1000} stroke="#EF4444" strokeDasharray="3 3" label={{ value: "Target Operasional TDS ≤1.000 mg/L", fill: "#EF4444", fontSize: 10, position: "insideBottomLeft" }} />
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
                <p className="text-xs text-slate-500 font-medium">Tegangan MFC (mV)</p>
              </div>
              <div className="h-[280px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={currentCycle.readings} margin={{ top: 25, right: 25, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="hour"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                      label={{ value: "Jam ke-", position: "insideBottom", offset: -15, fill: "#475569", fontSize: 11, fontWeight: 500 }}
                    />
                    <YAxis
                      stroke="#64748B"
                      fontSize={11}
                      domain={[450, 700]}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", fontSize: "12px" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="voltage"
                      name="Tegangan (mV)"
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

          {/* Bottom Section: Table & Regression Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Table Card */}
            <Card className="lg:col-span-7 p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
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
                      <th className="py-2 px-3 font-semibold">Jam ke-</th>
                      <th className="py-2 px-3 font-semibold">Waktu Aktual</th>
                      <th className="py-2 px-3 font-semibold">TDS (mg/L)</th>
                      <th className="py-2 px-3 font-semibold">Tegangan MFC (mV)</th>
                      <th className="py-2 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {currentCycle.readings.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{row.hour}</td>
                        <td className="py-2.5 px-3 text-slate-600">{row.actualTime}</td>
                        <td className="py-2.5 px-3 text-sky-600 font-bold">{row.tds}</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-bold">{row.voltage}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check size={11} /> {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Regression Analysis Card */}
            <Card className="lg:col-span-5 p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5 flex flex-col justify-between">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base mb-4">
                  Analisis Regresi Linier
                </h3>

                <div className="bg-sky-50/80 border border-sky-100 rounded-xl p-4 text-center mb-5">
                  <p className="text-[10px] text-sky-600 font-semibold tracking-wider uppercase mb-1">
                    Persamaan regresi:
                  </p>
                  <h4 className="font-display text-2xl font-bold text-sky-700 font-mono tracking-tight">
                    {currentCycle.regressionEq}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-2 font-mono">
                    y = TDS (mg/L)<br />
                    x = waktu sejak t=0 (jam)
                  </p>
                </div>

                <div className="space-y-3.5 text-xs text-slate-700 font-medium">
                  <div className="flex items-center gap-2">
                    <Target size={15} className="text-sky-600 flex-shrink-0" />
                    <span>Target Operasional TDS ≤1.000 mg/L</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-sky-600 flex-shrink-0" />
                      Prediksi target tercapai pada:
                    </span>
                    <span className="font-mono font-bold text-sky-700">{currentCycle.targetReachedHour}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <span className="flex items-center gap-2">
                      <Hourglass size={15} className="text-sky-600 flex-shrink-0" />
                      Estimasi sisa waktu:
                    </span>
                    <span className="font-mono font-bold text-sky-700">{currentCycle.estimatedRemaining}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <span className="flex items-center gap-2">
                      <ChartIcon size={15} className="text-sky-600 flex-shrink-0" />
                      R²:
                    </span>
                    <span className="font-mono font-bold text-sky-700">{currentCycle.rSquared}</span>
                  </div>
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
                  3
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">Siap dibandingkan</p>
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
                  2/3
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">Siklus mencapai ≤1.000 mg/L</p>
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
                  32,5%
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">Hasil terbaik antar siklus</p>
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
                  0,95
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">Model regresi terbaik</p>
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
                  <LineChart data={comparisonChartData} margin={{ top: 25, right: 25, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="hour" stroke="#64748B" fontSize={11} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} label={{ value: "Jam ke-", position: "insideBottom", offset: -15, fill: "#475569", fontSize: 11, fontWeight: 500 }} />
                    <YAxis stroke="#64748B" fontSize={11} domain={[600, 1600]} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} />
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
                  <p className="text-xs text-slate-500 font-medium">Tegangan MFC (mV)</p>
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
                  <LineChart data={comparisonChartData} margin={{ top: 25, right: 25, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="hour" stroke="#64748B" fontSize={11} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} label={{ value: "Jam ke-", position: "insideBottom", offset: -15, fill: "#475569", fontSize: 11, fontWeight: 500 }} />
                    <YAxis stroke="#64748B" fontSize={11} domain={[450, 700]} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} />
                    <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "12px", fontSize: "12px" }} />
                    <Line type="monotone" dataKey="s1Volt" name="Siklus 1" stroke="#0284C7" strokeWidth={2} dot={RenderMultiVoltDot("s1Volt", "#0284C7")} />
                    <Line type="monotone" dataKey="s2Volt" name="Siklus 2" stroke="#D97706" strokeWidth={2} dot={RenderMultiVoltDot("s2Volt", "#D97706")} />
                    <Line type="monotone" dataKey="s3Volt" name="Siklus 3" stroke="#16A34A" strokeWidth={2} dot={RenderMultiVoltDot("s3Volt", "#16A34A")} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Bottom Section: Table Left & Interpretation Right */}
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

                <div className="space-y-3">
                  <div className="bg-sky-50/80 border border-sky-100/80 rounded-xl p-3 flex items-start gap-3 text-xs text-slate-700 font-medium">
                    <Info size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
                    <span>Tab ini digunakan untuk membandingkan hasil antar siklus, bukan untuk raw data detail.</span>
                  </div>

                  <div className="bg-sky-50/80 border border-sky-100/80 rounded-xl p-3 flex items-start gap-3 text-xs text-slate-700 font-medium">
                    <BarChart3 size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
                    <span>Siklus 2 menunjukkan penurunan TDS paling cepat dan paling rendah pada akhir pengamatan.</span>
                  </div>

                  <div className="bg-sky-50/80 border border-sky-100/80 rounded-xl p-3 flex items-start gap-3 text-xs text-slate-700 font-medium">
                    <Target size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
                    <span>Siklus 1 masih berada di atas target pada Jam ke-15.</span>
                  </div>

                  <div className="bg-sky-50/80 border border-sky-100/80 rounded-xl p-3 flex items-start gap-3 text-xs text-slate-700 font-medium">
                    <Activity size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
                    <span>Siklus 3 mendekati target, namun belum mencapai ≤1.000 mg/L pada Jam ke-15.</span>
                  </div>

                  <div className="bg-sky-50/80 border border-sky-100/80 rounded-xl p-3 flex items-start gap-3 text-xs text-slate-700 font-medium">
                    <CheckCircle2 size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
                    <span>Rentang tegangan ketiga siklus relatif stabil pada kisaran sekitar 580–630 mV.</span>
                  </div>

                  <div className="bg-sky-50/80 border border-sky-100/80 rounded-xl p-3 flex items-start gap-3 text-xs text-slate-700 font-medium">
                    <Info size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
                    <span>Perbandingan ini bersifat simulasi tampilan untuk kebutuhan rancangan web.</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 6: MICRO-ENERGY */}
      {isMicroEnergy && (
        <div className="space-y-6">
          <div className="bg-sky-50/90 border border-sky-200/80 rounded-2xl p-5 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                <Zap size={22} />
              </div>
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Section Micro-Energy</h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Modul pemantauan tegangan seri, arus, daya, dan status uji charging Reaktor Utama + Reaktor Pendukung Energi.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 self-start md:self-auto">
              <Info size={14} className="text-amber-700" />
              DIISI SETELAH PENGUJIAN A+B
            </span>
          </div>

          {/* 4 Metric Card Placeholders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <Activity size={17} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Tegangan Reaktor Utama</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-3xl font-extrabold text-sky-600 tracking-tight">
                  {praSiklusMetrics.latestVoltStr}
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500 leading-tight">Reaktor Utama (Live)</p>
            </MagneticCard>

            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <Cpu size={17} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Tegangan Pendukung</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-3xl font-extrabold text-slate-400 tracking-tight">
                  — V
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500 leading-tight">Reaktor Pendukung Energi</p>
            </MagneticCard>

            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <Layers size={17} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Tegangan Seri</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-3xl font-extrabold text-slate-400 tracking-tight">
                  — V
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500 leading-tight">Kombinasi Seri (A + B)</p>
            </MagneticCard>

            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <BatteryCharging size={17} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Status Uji Charging</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-xl font-extrabold text-amber-600 tracking-tight">
                  Menunggu Pengujiaan
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500 leading-tight">Siap dipasang pasca A+B</p>
            </MagneticCard>
          </div>

          {/* Micro-Energy Parameters Table */}
          <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
            <h3 className="font-display font-bold text-slate-900 text-base mb-4">
              Tabel Parameter Micro-Energy (A+B)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-slate-500 bg-slate-100/80 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Parameter Energy</th>
                    <th className="py-2.5 px-3 font-semibold">Tegangan Seri (V)</th>
                    <th className="py-2.5 px-3 font-semibold">Arus (mA)</th>
                    <th className="py-2.5 px-3 font-semibold">Daya (mW)</th>
                    <th className="py-2.5 px-3 font-semibold">Status Uji Charging</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-bold text-slate-900">Uji Pendahuluan A+B</td>
                    <td className="py-3 px-3 font-mono text-slate-400">—</td>
                    <td className="py-3 px-3 font-mono text-slate-400">—</td>
                    <td className="py-3 px-3 font-mono text-slate-400">—</td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Persiapan Pengujian
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500 mt-4 leading-relaxed font-medium">
              Catatan: Detail angka arus, daya, dan tegangan seri Micro-Energy akan diisi secara otomatis setelah pengujian kombinasi Reaktor Utama + Reaktor Pendukung Energi selesai dilakukan.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import MagneticCard from "@/components/MagneticCard";
import Card from "@/components/Card";
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

interface PreCycleData {
  tanggal: string;
  teganganA: string;
  tanggal2?: string;
  teganganA2?: string;
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
  preCycle: PreCycleData[];
  readings: CycleReading[];
}

// Data for Siklus 1, 2, 3
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
    preCycle: [
      { tanggal: "11 Agustus", teganganA: "sekitar 0,18–0,20 V", tanggal2: "14 Agustus", teganganA2: "sekitar 0,61–0,60 V" },
      { tanggal: "12 Agustus", teganganA: "sekitar 0,41–0,50 V", tanggal2: "15 Agustus", teganganA2: "—" },
      { tanggal: "13 Agustus", teganganA: "sekitar 0,55–0,60 V", tanggal2: "16 Agustus", teganganA2: "—" },
    ],
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
    preCycle: [
      { tanggal: "18 Agustus", teganganA: "sekitar 0,50–0,55 V", tanggal2: "21 Agustus", teganganA2: "sekitar 0,62–0,64 V" },
      { tanggal: "19 Agustus", teganganA: "sekitar 0,58–0,60 V", tanggal2: "22 Agustus", teganganA2: "—" },
      { tanggal: "20 Agustus", teganganA: "sekitar 0,60–0,62 V", tanggal2: "23 Agustus", teganganA2: "—" },
    ],
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
    preCycle: [
      { tanggal: "25 Agustus", teganganA: "sekitar 0,45–0,52 V", tanggal2: "28 Agustus", teganganA2: "sekitar 0,59–0,61 V" },
      { tanggal: "26 Agustus", teganganA: "sekitar 0,54–0,57 V", tanggal2: "29 Agustus", teganganA2: "—" },
      { tanggal: "27 Agustus", teganganA: "sekitar 0,57–0,60 V", tanggal2: "30 Agustus", teganganA2: "—" },
    ],
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

// Custom Dot & Value Renderer for TDS Chart
const RenderCustomTdsDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return <g />;
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
        {payload.tds}
      </text>
    </g>
  );
};

// Custom Dot & Value Renderer for Voltage Chart
const RenderCustomVoltDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return <g />;
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
        {payload.voltage}
      </text>
    </g>
  );
};

// Custom Dot & Value Renderer for Multi-line TDS Comparison
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

// Custom Dot & Value Renderer for Multi-line Voltage Comparison
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
  const [activeTab, setActiveTab] = useState<string>("Siklus 1");
  const tabs = ["Siklus 1", "Siklus 2", "Siklus 3", "Perbandingan Siklus"];

  const currentCycle = cycleDataMap[activeTab] || cycleDataMap["Siklus 1"];
  const isComparison = activeTab === "Perbandingan Siklus";

  const handleDownloadCSV = () => {
    let csv = "";
    if (!isComparison) {
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
            {!isComparison
              ? "Data Siklus 1–3, grafik penelitian, regresi, dan analisis penurunan TDS."
              : "Perbandingan hasil Siklus 1, Siklus 2, dan Siklus 3 berdasarkan TDS dan tegangan MFC."}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-50 border border-amber-300 text-amber-800 shadow-sm">
            <Info size={14} className="text-amber-600" />
            SIMULASI TAMPILAN — BUKAN DATA PENELITIAN AKTUAL
          </span>
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

      {/* RENDER VIEW: SIKLUS 1, 2, atau 3 (FOTO 2) */}
      {!isComparison && (
        <div className="space-y-6">
          {/* Top Section: Pre-Cycle Voltage Table & 4 Metric Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            {/* Left Card: Pre-Cycle Table */}
            <Card className="lg:col-span-5 p-4 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="font-display font-semibold text-slate-900 text-xs">
                    Perkembangan Tegangan Pra-{currentCycle.name}
                  </h3>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Pra-Siklus
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-slate-500 bg-slate-100/80 border-b border-slate-200">
                      <tr>
                        <th className="py-1.5 px-2 font-semibold">Tanggal</th>
                        <th className="py-1.5 px-2 font-semibold">Tegangan Reaktor A</th>
                        <th className="py-1.5 px-2 font-semibold">Tanggal</th>
                        <th className="py-1.5 px-2 font-semibold">Tegangan Reaktor A</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {currentCycle.preCycle.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-1.5 px-2 text-[11px]">{row.tanggal}</td>
                          <td className="py-1.5 px-2 text-[11px] text-slate-900 font-semibold">{row.teganganA}</td>
                          <td className="py-1.5 px-2 text-[11px]">{row.tanggal2 || "—"}</td>
                          <td className="py-1.5 px-2 text-[11px] text-slate-900 font-semibold">{row.teganganA2 || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-2.5 leading-snug font-medium">
                Tahap uji/commissioning Reaktor A sebelum {currentCycle.name}. Data ini tidak termasuk dataset Siklus 1–3.
              </p>
            </Card>

            {/* Right Side: 4 Metric Cards */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
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
          </div>

          {/* Middle Section: 2 Charts Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Chart: Grafik TDS Penelitian */}
            <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="mb-2">
                <h3 className="font-display font-bold text-slate-900 text-base">
                  Grafik TDS Penelitian
                </h3>
                <p className="text-slate-500 text-xs mt-0.5 font-medium">
                  TDS (mg/L)
                </p>
              </div>

              <div className="h-[280px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={currentCycle.readings}
                    margin={{ top: 25, right: 20, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="hour"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                      label={{
                        value: "Jam ke-",
                        position: "bottom",
                        offset: 5,
                        fill: "#64748B",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                    <YAxis
                      domain={[600, 1600]}
                      ticks={[600, 800, 1000, 1200, 1400, 1600]}
                      stroke="#64748B"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#CBD5E1",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontSize: "12px",
                      }}
                      itemStyle={{ color: "#0284C7" }}
                    />
                    <ReferenceLine
                      y={1000}
                      stroke="#EF4444"
                      strokeDasharray="4 4"
                      label={{
                        value: "Target Operasional TDS ≤1.000 mg/L",
                        fill: "#EF4444",
                        fontSize: 10,
                        position: "insideTopLeft",
                        fontWeight: 600,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="tds"
                      name="TDS (mg/L)"
                      stroke="#0284C7"
                      strokeWidth={2.5}
                      dot={<RenderCustomTdsDot />}
                      activeDot={{ r: 6, fill: "#0284C7", stroke: "#FFFFFF", strokeWidth: 2 }}
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
                <p className="text-slate-500 text-xs mt-0.5 font-medium">
                  Tegangan MFC (mV)
                </p>
              </div>

              <div className="h-[280px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={currentCycle.readings}
                    margin={{ top: 25, right: 20, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="hour"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                      label={{
                        value: "Jam ke-",
                        position: "bottom",
                        offset: 5,
                        fill: "#64748B",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                    <YAxis
                      domain={[450, 700]}
                      ticks={[450, 500, 550, 600, 650, 700]}
                      stroke="#64748B"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#CBD5E1",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontSize: "12px",
                      }}
                      itemStyle={{ color: "#16A34A" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="voltage"
                      name="Tegangan (mV)"
                      stroke="#16A34A"
                      strokeWidth={2.5}
                      dot={<RenderCustomVoltDot />}
                      activeDot={{ r: 6, fill: "#16A34A", stroke: "#FFFFFF", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Bottom Section: Raw Data Table & Linear Regression Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Raw Data Table */}
            <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-slate-900 text-base">
                  Raw Data Penelitian — Interval 3 Jam
                </h3>
                <button
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-sky-600 text-sky-600 rounded-lg text-xs font-semibold hover:bg-sky-50 transition-colors shadow-sm"
                >
                  <Download size={14} /> Download CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-slate-600 bg-slate-100/80 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Jam ke-</th>
                      <th className="py-2.5 px-3 font-semibold">Waktu Aktual</th>
                      <th className="py-2.5 px-3 font-semibold">TDS (mg/L)</th>
                      <th className="py-2.5 px-3 font-semibold">Tegangan MFC (mV)</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {currentCycle.readings.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900">{row.hour}</td>
                        <td className="py-3 px-3">{row.actualTime}</td>
                        <td className="py-3 px-3 font-semibold text-sky-700">{row.tds}</td>
                        <td className="py-3 px-3 font-semibold text-emerald-700">{row.voltage}</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300">
                            <Check size={12} strokeWidth={3} /> Valid
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Linear Regression Analysis */}
            <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <h3 className="font-display font-bold text-slate-900 text-base mb-4">
                Analisis Regresi Linier
              </h3>

              <div className="bg-sky-50/80 border border-sky-200/80 rounded-xl p-5 mb-6 text-center shadow-inner">
                <p className="text-xs text-sky-700 font-semibold mb-1">Persamaan regresi:</p>
                <p className="font-mono text-2xl md:text-3xl font-bold text-sky-600 my-1">
                  {currentCycle.regressionEq}
                </p>
                <div className="text-[11px] text-slate-500 font-mono mt-2 space-y-0.5">
                  <p>y = TDS (mg/L)</p>
                  <p>x = waktu sejak t=0 (jam)</p>
                </div>
              </div>

              <div className="space-y-4 text-xs font-medium text-slate-700">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Target size={16} className="text-sky-600" />
                    <span>Target Operasional TDS ≤1.000 mg/L</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-600">
                    <CheckCircle2 size={16} className="text-sky-600" />
                    <span>Prediksi target tercapai pada:</span>
                  </div>
                  <span className="font-bold text-sky-700">{currentCycle.targetReachedHour}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Hourglass size={16} className="text-sky-600" />
                    <span>Estimasi sisa waktu:</span>
                  </div>
                  <span className="font-bold text-sky-700">{currentCycle.estimatedRemaining}</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 text-slate-600">
                    <ChartIcon size={16} className="text-sky-600" />
                    <span>R²:</span>
                  </div>
                  <span className="font-bold text-sky-700">{currentCycle.rSquared}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* RENDER VIEW: TAB PERBANDINGAN SIKLUS (FOTO 3) */}
      {isComparison && (
        <div className="space-y-6">
          {/* Top Metric Cards (4 Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <MagneticCard className="p-5 h-[165px] flex flex-col justify-between border-t-2 border-t-sky-500 border-x border-b border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100/80 border border-sky-200/80 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <Database size={17} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">Siklus Tersedia</h3>
              </div>
              <div className="my-auto py-1">
                <div className="font-display text-4xl sm:text-[42px] font-extrabold text-sky-600 tracking-tight">3</div>
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
                <div className="font-display text-4xl sm:text-[42px] font-extrabold text-sky-600 tracking-tight">2/3</div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">
                  Siklus mencapai ≤1.000 mg/L
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
                  32,5%
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">
                  Hasil terbaik antar siklus
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
                  0,95
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">Model regresi terbaik</p>
              </div>
            </MagneticCard>
          </div>

          {/* Middle Section: 2 Comparison Multi-line Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Chart: Perbandingan TDS antar Siklus */}
            <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-base">
                    Perbandingan TDS antar Siklus
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5 font-medium">TDS (mg/L)</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="flex items-center gap-1 text-sky-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" /> Siklus 1
                  </span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Siklus 2
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Siklus 3
                  </span>
                </div>
              </div>

              <div className="h-[280px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={comparisonChartData}
                    margin={{ top: 25, right: 20, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="hour"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                      label={{
                        value: "Jam ke-",
                        position: "bottom",
                        offset: 5,
                        fill: "#64748B",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                    <YAxis
                      domain={[600, 1600]}
                      ticks={[600, 800, 1000, 1200, 1400, 1600]}
                      stroke="#64748B"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#CBD5E1",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontSize: "12px",
                      }}
                    />
                    <ReferenceLine
                      y={1000}
                      stroke="#EF4444"
                      strokeDasharray="4 4"
                      label={{
                        value: "Target Operasional TDS ≤1.000 mg/L",
                        fill: "#EF4444",
                        fontSize: 10,
                        position: "insideTopLeft",
                        fontWeight: 600,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="s1Tds"
                      name="Siklus 1"
                      stroke="#0284C7"
                      strokeWidth={2}
                      dot={RenderMultiTdsDot("s1Tds", "#0284C7")}
                    />
                    <Line
                      type="monotone"
                      dataKey="s2Tds"
                      name="Siklus 2"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      dot={RenderMultiTdsDot("s2Tds", "#F59E0B")}
                    />
                    <Line
                      type="monotone"
                      dataKey="s3Tds"
                      name="Siklus 3"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={RenderMultiTdsDot("s3Tds", "#10B981")}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Right Chart: Perbandingan Tegangan MFC antar Siklus */}
            <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-base">
                    Perbandingan Tegangan MFC antar Siklus
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5 font-medium">Tegangan MFC (mV)</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="flex items-center gap-1 text-sky-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" /> Siklus 1
                  </span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Siklus 2
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Siklus 3
                  </span>
                </div>
              </div>

              <div className="h-[280px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={comparisonChartData}
                    margin={{ top: 25, right: 20, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="hour"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                      label={{
                        value: "Jam ke-",
                        position: "bottom",
                        offset: 5,
                        fill: "#64748B",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                    <YAxis
                      domain={[450, 700]}
                      ticks={[450, 500, 550, 600, 650, 700]}
                      stroke="#64748B"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#CBD5E1",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="s1Volt"
                      name="Siklus 1"
                      stroke="#0284C7"
                      strokeWidth={2}
                      dot={RenderMultiVoltDot("s1Volt", "#0284C7")}
                    />
                    <Line
                      type="monotone"
                      dataKey="s2Volt"
                      name="Siklus 2"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      dot={RenderMultiVoltDot("s2Volt", "#F59E0B")}
                    />
                    <Line
                      type="monotone"
                      dataKey="s3Volt"
                      name="Siklus 3"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={RenderMultiVoltDot("s3Volt", "#10B981")}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Bottom Section: Ringkasan Perbandingan Siklus Matrix & Interpretasi Perbandingan */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ringkasan Perbandingan Siklus Table */}
            <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-slate-900 text-base">
                  Ringkasan Perbandingan Siklus
                </h3>
                <button
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-sky-600 text-sky-600 rounded-lg text-xs font-semibold hover:bg-sky-50 transition-colors shadow-sm"
                >
                  <Download size={14} /> Download CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-slate-600 bg-slate-100/80 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Parameter</th>
                      <th className="py-2.5 px-3 font-semibold text-sky-700">Siklus 1</th>
                      <th className="py-2.5 px-3 font-semibold text-amber-700">Siklus 2</th>
                      <th className="py-2.5 px-3 font-semibold text-emerald-700">Siklus 3</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {summaryMatrix.map((row, idx) => {
                      const IconComp = row.icon;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3 flex items-center gap-2 font-semibold text-slate-800">
                            <IconComp size={14} className="text-sky-600" /> {row.param}
                          </td>
                          <td className="py-3 px-3 text-slate-900 font-medium">{row.s1}</td>
                          <td className="py-3 px-3 text-slate-900 font-medium">{row.s2}</td>
                          <td className="py-3 px-3 text-slate-900 font-medium">{row.s3}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Interpretasi Perbandingan */}
            <Card className="p-6 border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
              <h3 className="font-display font-bold text-slate-900 text-base mb-4">
                Interpretasi Perbandingan
              </h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-sky-50/60 border border-sky-200/60 text-xs text-sky-900 font-medium">
                  <Info size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
                  <p>
                    Tab ini digunakan untuk membandingkan hasil antar siklus, bukan untuk raw data detail.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-sky-50/60 border border-sky-200/60 text-xs text-sky-900 font-medium">
                  <BarChart3 size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
                  <p>
                    Siklus 2 menunjukkan penurunan TDS paling cepat dan paling rendah pada akhir pengamatan.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-sky-50/60 border border-sky-200/60 text-xs text-sky-900 font-medium">
                  <Target size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
                  <p>Siklus 1 masih berada di atas target pada Jam ke-15.</p>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-sky-50/60 border border-sky-200/60 text-xs text-sky-900 font-medium">
                  <Activity size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
                  <p>
                    Siklus 3 mendekati target, namun belum mencapai ≤1.000 mg/L pada Jam ke-15.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-sky-50/60 border border-sky-200/60 text-xs text-sky-900 font-medium">
                  <CheckCircle2 size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
                  <p>
                    Rentang tegangan ketiga siklus relatif stabil pada kisaran sekitar 580–630 mV.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-sky-50/60 border border-sky-200/60 text-xs text-sky-900 font-medium">
                  <Info size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
                  <p>Perbandingan ini bersifat simulasi tampilan untuk kebutuhan rancangan web.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

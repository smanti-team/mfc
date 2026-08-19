"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { fetchSummary } from "@/lib/api";
import type { Summary, Reading } from "@/lib/types";
import MagneticCard from "@/components/MagneticCard";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { 
  Activity, Zap, Hourglass, Calendar, RefreshCcw, Wifi, BatteryCharging, 
  FlaskConical, Droplet, Monitor, Target, SunDim, TrendingDown
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

function parseTimestamp(ts: string | number): Date {
  if (typeof ts === 'number') {
    return new Date(ts * (ts < 1e11 ? 1000 : 1));
  }
  const str = String(ts).replace(' ', 'T');
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatTime(ts: string | number) {
  const date = parseTimestamp(ts);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatFullDateTime(ts: string | number) {
  const date = parseTimestamp(ts);
  return date.toLocaleString('id-ID', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit', 
    minute: '2-digit'
  });
}

// Custom Dot Renderer for TDS Chart (shows gray prediction dots for TDS)
const RenderTdsDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const isPred = payload?.isPrediction;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={isPred ? "#94A3B8" : "#FFFFFF"}
      stroke={isPred ? "#94A3B8" : "#0284C7"}
      strokeWidth={2}
    />
  );
};

const RenderTdsActiveDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const isPred = payload?.isPrediction;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill={isPred ? "#94A3B8" : "#0284C7"}
      stroke="#FFFFFF"
      strokeWidth={2}
    />
  );
};

export default function Home() {
  const [summary, setSummary] = useState<Summary>({ latest: null, history: [] });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchSummary(50);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil data dari API");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Fallback 4 commissioning records matching Pra-Siklus dataset
  const fallbackHistory: Reading[] = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return [
      { timestamp: now - 3600, tds: 956.84, voltage: 0.23 },
      { timestamp: now - 2700, tds: 1061.76, voltage: 0.24 },
      { timestamp: now - 1800, tds: 956.79, voltage: 0.23 },
      { timestamp: now - 300,  tds: 1068.89, voltage: 0.20 },
    ];
  }, []);

  // Sorted active telemetry history
  const sortedHistory = useMemo(() => {
    const rawList = (summary.history && summary.history.length > 0) ? summary.history : fallbackHistory;
    return [...rawList].sort(
      (a, b) => parseTimestamp(a.timestamp).getTime() - parseTimestamp(b.timestamp).getTime()
    );
  }, [summary.history, fallbackHistory]);

  // Latest reading from API
  const latestReading = summary.latest || (sortedHistory.length > 0 ? sortedHistory[sortedHistory.length - 1] : fallbackHistory[fallbackHistory.length - 1]);
  const latestTds = latestReading?.tds != null ? Number(latestReading.tds.toFixed(2)) : 1068.89;
  
  const latestVoltageVal = useMemo(() => {
    if (latestReading?.voltage == null) return 0.20;
    const v = latestReading.voltage;
    return v <= 20 ? Number(v.toFixed(2)) : Number((v / 1000).toFixed(2));
  }, [latestReading]);

  const lastUpdateTimeStr = latestReading ? formatFullDateTime(latestReading.timestamp) : "Belum ada data";

  const activeBatchName = "Batch UJI";
  const processingStatus = "BERJALAN";

  // Linear Regression Slope Analysis (Last 8 points)
  const slopeAnalysis = useMemo(() => {
    if (sortedHistory.length === 0) {
      return { slope: -15, timeStepMs: 10800000, count: 0 };
    }

    const lastPoints = sortedHistory.slice(-8);
    const N = lastPoints.length;

    if (N < 2) {
      return { slope: -15, timeStepMs: 10800000, count: N };
    }

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < N; i++) {
      const x = i;
      const y = lastPoints[i].tds ?? 0;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const denom = N * sumX2 - sumX * sumX;
    const slope = denom !== 0 ? (N * sumXY - sumX * sumY) / denom : -15;

    const firstTime = parseTimestamp(lastPoints[0].timestamp).getTime();
    const lastTime = parseTimestamp(lastPoints[N - 1].timestamp).getTime();
    const totalDiffMs = lastTime - firstTime;
    const timeStepMs = totalDiffMs > 0 ? totalDiffMs / (N - 1) : 10800000;

    return { slope, timeStepMs, count: N };
  }, [sortedHistory]);

  // TDS Chart Data with 8 Gray Prediction Nodes & Voltage Chart Data (ONLY ACTUAL VOLTAGE DATA, NO PREDICTION NODES)
  const { tdsChartData, voltageChartData, remainingTimeString, isTargetReached } = useMemo(() => {
    const targetThreshold = 1000;

    // 1. Real TDS & Voltage points
    const realTdsPoints = sortedHistory.map((d) => ({
      time: formatTime(d.timestamp),
      fullTime: formatFullDateTime(d.timestamp),
      tds: d.tds != null ? Number(d.tds.toFixed(2)) : 1000,
      isPrediction: false,
    }));

    const realVoltPoints = sortedHistory.map((d) => {
      const v = d.voltage != null ? (d.voltage <= 20 ? d.voltage : d.voltage / 1000) : 0.20;
      return {
        time: formatTime(d.timestamp),
        fullTime: formatFullDateTime(d.timestamp),
        voltage: Number(v.toFixed(2)),
        isPrediction: false,
      };
    });

    const lastReal = sortedHistory[sortedHistory.length - 1];
    const lastRealTimeMs = parseTimestamp(lastReal.timestamp).getTime();
    const lastRealTds = lastReal.tds ?? 1068.89;

    const { slope, timeStepMs } = slopeAnalysis;

    // 2. Generate 8 Gray Prediction Nodes FOR TDS CHART ONLY
    const predTdsPoints = [];
    const activeSlope = slope < 0 ? slope : -12.5;

    for (let k = 1; k <= 8; k++) {
      const predTimeMs = lastRealTimeMs + k * timeStepMs;
      const predTds = Math.max(0, Math.round(lastRealTds + k * activeSlope));

      predTdsPoints.push({
        time: formatTime(predTimeMs),
        fullTime: `${formatFullDateTime(predTimeMs)} (Prediksi #${k})`,
        tds: predTds,
        isPrediction: true,
      });
    }

    const combinedTdsData = [...realTdsPoints, ...predTdsPoints];

    let timeStr = "";
    let targetReached = false;

    if (lastRealTds <= targetThreshold) {
      timeStr = "Target tercapai";
      targetReached = true;
    } else if (slope >= 0 && activeSlope >= 0) {
      timeStr = "Belum dapat diprediksi";
    } else {
      const stepsToTarget = (lastRealTds - targetThreshold) / -activeSlope;
      const msToTarget = stepsToTarget * timeStepMs;
      const hoursToTarget = msToTarget / (1000 * 3600);
      const minsToTarget = Math.round(msToTarget / (1000 * 60));

      if (minsToTarget < 60) {
        timeStr = `± ${minsToTarget} mnt`;
      } else {
        const hrs = Math.floor(hoursToTarget);
        const remainingMins = Math.round((hoursToTarget - hrs) * 60);
        timeStr = remainingMins > 0 ? `± ${hrs} jam ${remainingMins} mnt` : `± ${hrs} jam`;
      }
    }

    return {
      tdsChartData: combinedTdsData,
      voltageChartData: realVoltPoints, // ONLY actual voltage telemetry data (NO prediction nodes)
      remainingTimeString: timeStr,
      isTargetReached: targetReached,
    };
  }, [sortedHistory, slopeAnalysis]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <p className="text-sky-600 text-xs sm:text-sm font-semibold mb-1">Selamat datang di</p>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold text-slate-900 drop-shadow-sm">SMART-MFC Dashboard</h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1.5 sm:mt-2 font-medium leading-relaxed">Sistem pemantauan pengolahan limbah cair organik berbasis Microbial Fuel Cell.</p>
        </div>
        <div className="self-start md:self-auto flex-shrink-0">
          <Badge variant={error ? "warning" : "outline-green"} icon={error ? <FlaskConical size={14} /> : <Wifi size={14} />}>
            {error ? "MODE PENGUJIAN / SIMULASI" : "TERHUBUNG D1 API (LIVE)"}
          </Badge>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-sm shadow-sm backdrop-blur-md flex items-center gap-3">
          <FlaskConical className="text-amber-600 flex-shrink-0" size={18} />
          <span>Perhatian: {error}. Menggunakan fallback data simulasi.</span>
        </div>
      )}

      {/* Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Metric 1: TDS Saat Ini */}
        <MagneticCard className="p-6 flex flex-col min-h-[170px] relative group overflow-hidden border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
          <div className="flex items-center gap-2 text-sky-600 mb-2 relative z-10">
            <SunDim size={18} strokeWidth={2.5} className="animate-float" />
            <h3 className="text-[13px] font-semibold text-slate-700">TDS Saat Ini</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center relative z-10 mt-1">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl lg:text-5xl leading-tight font-bold text-sky-600 tracking-tight">
                {isLoading ? "..." : latestTds.toLocaleString('id-ID')}
              </span>
              <span className="text-slate-500 text-lg font-medium tracking-wide">mg/L</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 tracking-wide font-medium">Total Padatan Terlarut ({activeBatchName})</p>
          </div>
        </MagneticCard>

        {/* Metric 2: Tegangan MFC */}
        <MagneticCard className="p-6 flex flex-col min-h-[170px] relative group overflow-hidden border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
          <div className="flex items-center gap-2 text-sky-600 mb-2 relative z-10">
            <Zap size={18} strokeWidth={2.5} className="animate-float" style={{ animationDelay: '0.3s' }} />
            <h3 className="text-[13px] font-semibold text-slate-700">Tegangan MFC</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center relative z-10 mt-1">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl lg:text-5xl leading-tight font-bold text-sky-600 tracking-tight">
                {isLoading ? "..." : latestVoltageVal.toFixed(2).replace('.', ',')}
              </span>
              <span className="text-slate-500 text-lg font-medium tracking-wide">V</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 tracking-wide font-medium">Tegangan Reaktor Utama</p>
          </div>
        </MagneticCard>

        {/* Metric 3: Prediksi Sisa Waktu */}
        <MagneticCard className="p-6 flex flex-col min-h-[170px] relative group overflow-hidden border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
          <div className="flex items-center gap-2 text-sky-600 mb-2 relative z-10">
            <Hourglass size={18} strokeWidth={2.5} className="animate-float" style={{ animationDelay: '0.6s' }} />
            <h3 className="text-[13px] font-semibold text-slate-700">Prediksi Sisa Waktu</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center relative z-10 mt-1">
            <div className="flex items-baseline gap-2">
              <span className={`font-display font-bold text-sky-600 tracking-tight leading-tight ${
                remainingTimeString.length > 18
                  ? "text-lg lg:text-xl"
                  : remainingTimeString.length > 12
                  ? "text-xl lg:text-2xl"
                  : "text-3xl lg:text-4xl"
              }`}>
                {isLoading ? "..." : remainingTimeString}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 tracking-wide font-medium">
              Target: TDS ≤1.000 mg/L
            </p>
          </div>
        </MagneticCard>

        {/* Metric 4: Status Pengolahan */}
        <MagneticCard className="p-6 flex flex-col min-h-[170px] relative group overflow-hidden border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
          <div className="flex items-center gap-2 text-sky-600 mb-2 relative z-10">
            <Activity size={18} strokeWidth={2.5} className="animate-float" style={{ animationDelay: '0.9s' }} />
            <h3 className="text-[13px] font-semibold text-slate-700">Status Pengolahan</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center relative z-10 mt-1">
            <div className="flex items-center gap-3">
              <span className="font-display text-3xl lg:text-4xl leading-tight font-bold text-sky-600 tracking-tight">
                {processingStatus}
              </span>
              <span className="w-3.5 h-3.5 rounded-full flex-shrink-0 bg-sky-500 shadow-[0_0_12px_#0284C7] animate-pulse"></span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 tracking-wide font-medium">
              Batch Aktif: <span className="font-semibold text-slate-800">{activeBatchName}</span>
            </p>
          </div>
        </MagneticCard>
      </div>

      {/* Info Bar */}
      <div className="border border-sky-900/10 bg-white/80 backdrop-blur-md rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 mb-6 text-sm shadow-sm text-slate-800">
        <div className="flex items-center gap-3">
          <Calendar className="text-sky-600" size={18} />
          <div>
            <p className="text-slate-500 text-xs font-medium">Update Terakhir (API)</p>
            <p className="text-slate-900 font-mono text-xs font-semibold">{lastUpdateTimeStr}</p>
          </div>
        </div>
        <div className="w-px h-8 bg-sky-900/10 hidden lg:block"></div>
        <div className="flex items-center gap-3">
          <RefreshCcw className="text-sky-600" size={18} />
          <div>
            <p className="text-slate-900 font-medium">Interval Data Resmi</p>
            <p className="text-slate-500 text-xs">setiap 3 jam</p>
          </div>
        </div>
        <div className="w-px h-8 bg-sky-900/10 hidden lg:block"></div>
        <div className="flex items-center gap-3">
          <TrendingDown className="text-sky-600" size={18} />
          <div>
            <p className="text-slate-900 font-medium">Slope (Regresi Linier)</p>
            <p className="text-sky-700 text-xs font-mono font-bold">{slopeAnalysis.slope.toFixed(2)} mg/L per step</p>
          </div>
        </div>
        <div className="w-px h-8 bg-sky-900/10 hidden lg:block"></div>
        <div className="flex items-center gap-3">
          <Wifi className="text-sky-600" size={18} />
          <div>
            <p className="text-slate-900 font-medium">Cloud Gateway API</p>
            <p className="text-sky-600 text-xs font-bold">MFC-D1 Cloud</p>
          </div>
        </div>
        <div className="w-px h-8 bg-sky-900/10 hidden lg:block"></div>
        <div className="flex items-center gap-3">
          <BatteryCharging className="text-sky-600" size={18} />
          <div>
            <p className="text-slate-900 font-medium">Micro-Energy</p>
            <p className="text-slate-500 text-xs font-medium">Uji Berlangsung</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Left Chart: Grafik TDS (dengan 8 Node Prediksi Abu-abu & type="linear") */}
        <Card className="p-6 pb-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Droplet className="text-sky-600" size={20} />
              <h3 className="font-display font-semibold text-slate-900 text-lg">Grafik TDS vs Waktu</h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-800">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]"></span> Data Aktual
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-[#94A3B8]"></span> 8 Node Prediksi (Abu-abu)
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mb-2 font-medium">
            TDS (mg/L) — Slope 8 data terakhir: <span className="font-mono text-sky-700 font-bold">{slopeAnalysis.slope.toFixed(2)} mg/L per step</span>
          </p>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tdsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorTds" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284C7" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="#0284C7" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" vertical={true} horizontal={true} strokeOpacity={0.6} />
                <XAxis dataKey="time" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} tickMargin={10} minTickGap={15} padding={{ left: 20, right: 20 }} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} tickCount={6} domain={[600, 'auto']} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white/95 border border-sky-900/15 p-3 rounded-xl text-xs space-y-1 shadow-2xl backdrop-blur-md text-slate-900">
                          <p className="text-slate-900 font-semibold">{data.fullTime || data.time}</p>
                          <div className="flex items-center gap-2">
                            <span className={data.isPrediction ? "text-slate-600 font-semibold" : "text-sky-700 font-bold"}>
                              TDS: {data.tds} mg/L
                            </span>
                            {data.isPrediction && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-mono border border-slate-200">
                                ⚪ Node Prediksi
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={1000} stroke="#EF4444" strokeDasharray="3 3" strokeOpacity={0.9} label={{ value: "Target Operasional TDS ≤1.000 mg/L", fill: "#EF4444", fontSize: 10, position: "insideTopRight" }} />
                <Area 
                  type="linear" 
                  dataKey="tds" 
                  name="TDS (mg/L)" 
                  stroke="#0284C7" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorTds)" 
                  dot={<RenderTdsDot />} 
                  activeDot={<RenderTdsActiveDot />} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center mt-2 items-center gap-4 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#0284C7]"></div>
              <span>Node Aktual (Biru Air)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#94A3B8]"></div>
              <span>8 Node Prediksi Slope (Abu-abu)</span>
            </div>
          </div>
        </Card>

        {/* Right Chart: Grafik Tegangan MFC (HANYA DATA AKTUAL, TANPA NODE PREDIKSI ABU-ABU) */}
        <Card className="p-6 pb-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="text-sky-600" size={20} />
              <h3 className="font-display font-semibold text-slate-900 text-lg">Grafik Tegangan MFC vs Waktu</h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-800">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]"></span> Data Tegangan Aktual (V)
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mb-2 font-medium">Tegangan (V) — Hasil pembacaan sensor Reaktor Utama</p>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={voltageChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorVolt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16A34A" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="#16A34A" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" vertical={true} horizontal={true} strokeOpacity={0.6} />
                <XAxis dataKey="time" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} tickMargin={10} minTickGap={15} padding={{ left: 20, right: 20 }} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} tickCount={6} domain={[0, 0.7]} tickFormatter={(v) => v.toFixed(2).replace('.', ',')} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white/95 border border-sky-900/15 p-3 rounded-xl text-xs space-y-1 shadow-2xl backdrop-blur-md text-slate-900">
                          <p className="text-slate-900 font-semibold">{data.fullTime || data.time}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-700 font-bold">
                              Tegangan: {data.voltage.toFixed(2).replace('.', ',')} V
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="linear" 
                  dataKey="voltage" 
                  name="Tegangan (V)" 
                  stroke="#16A34A" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorVolt)" 
                  dot={{ fill: '#16A34A', stroke: '#FFFFFF', strokeWidth: 2, r: 4 }} 
                  activeDot={{ r: 6, fill: '#16A34A' }} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center mt-2 items-center gap-4 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#16A34A]"></div>
              <span>Node Tegangan Aktual (V)</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2 p-6 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-10">
            <Target className="text-sky-600" size={20} />
            <h3 className="font-display font-semibold text-slate-900 text-lg">Cara Kerja Prediksi Slope SMART-MFC</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            <div className="flex flex-row gap-4">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center text-sm shadow-md">1</div>
                <FlaskConical size={36} className="text-sky-600 mt-6 drop-shadow-sm" strokeWidth={1.5} />
              </div>
              <div className="pt-1 flex flex-col justify-between">
                <h4 className="text-slate-900 text-sm font-bold h-7 flex items-center">Ambil Data Telemetri</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed mt-5 font-medium">Sistem membaca titik data real-time {activeBatchName} dari database Cloud Gateway API.</p>
              </div>
            </div>
            
            <div className="flex flex-row gap-4">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center text-sm shadow-md">2</div>
                <TrendingDown size={36} className="text-sky-600 mt-6 drop-shadow-sm" strokeWidth={1.5} />
              </div>
              <div className="pt-1 flex flex-col justify-between">
                <h4 className="text-slate-900 text-sm font-bold h-7 flex items-center">Hitung Slope Regresi</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed mt-5 font-medium">Kemiringan penurunan TDS dihitung menggunakan regresi linier metode least squares.</p>
              </div>
            </div>
            
            <div className="flex flex-row gap-4">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center text-sm shadow-md">3</div>
                <Droplet size={36} className="text-sky-600 mt-6 drop-shadow-sm" strokeWidth={1.5} />
              </div>
              <div className="pt-1 flex flex-col justify-between">
                <h4 className="text-slate-900 text-sm font-bold h-7 flex items-center">Generate 8 Node Abu-abu</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed mt-5 font-medium">8 node proyeksi masa depan dibuat &amp; ditandai dengan warna titik abu-abu di grafik TDS.</p>
              </div>
            </div>
            
            <div className="flex flex-row gap-4">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center text-sm shadow-md">4</div>
                <Monitor size={36} className="text-sky-600 mt-6 drop-shadow-sm" strokeWidth={1.5} />
              </div>
              <div className="pt-1 flex flex-col justify-between">
                <h4 className="text-slate-900 text-sm font-bold h-7 flex items-center leading-tight">Estimasi TDS ≤1.000 mg/L</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed mt-5 font-medium">Prediksi sisa waktu hingga TDS mencapai target ≤1.000 mg/L ({remainingTimeString}).</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-8 relative z-10">
            <Target className="text-sky-600" size={20} />
            <h3 className="font-display font-semibold text-slate-900 text-lg">Target Operasional UMKM</h3>
          </div>
          
          <div className="space-y-6 relative z-10">
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">Target TDS Operasional</p>
              <h4 className="text-2xl font-display font-bold text-sky-600">
                &le; 1.000 mg/L
              </h4>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">Estimasi Sisa Waktu (≤1.000 mg/L)</p>
              <h4 className="text-2xl font-display font-bold text-slate-900">
                {remainingTimeString}
              </h4>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">Slope Regresi Linier</p>
              <h4 className="text-lg font-mono font-bold text-sky-600">
                {slopeAnalysis.slope.toFixed(2)} mg/L per step
              </h4>
            </div>
            
            <div className="pt-2 border-t border-slate-200">
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Live API Endpoint</p>
              <p className="text-[10px] text-sky-600 font-mono font-bold truncate">MFC-D1 Cloud Gateway</p>
            </div>
          </div>

          <div className="absolute -bottom-6 -right-6 text-sky-900/5 group-hover:text-sky-900/10 transition-colors pointer-events-none">
            <Target size={180} strokeWidth={0.5} />
          </div>
        </Card>
      </div>
    </div>
  );
}

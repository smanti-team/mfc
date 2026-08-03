"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { fetchSummary } from "@/lib/api";
import type { Summary, Reading } from "@/lib/types";
import MagneticCard from "@/components/MagneticCard";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { 
  Activity, Zap, Hourglass, Calendar, RefreshCcw, Wifi, Cloud, BatteryCharging, 
  FlaskConical, Droplet, Monitor, Target, SunDim, TrendingDown, CheckCircle2
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

function deriveVoltage(tds: number) {
  const v = Math.round(555 - 0.66 * tds);
  return v > 0 ? v : 0;
}

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
    minute: '2-digit',
    second: '2-digit'
  });
}

// Custom Node Renderer for Recharts (Gray dot for 8 predicted nodes, Green for real nodes)
const RenderCustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const isPred = payload?.isPrediction;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={isPred ? "#9CA3AF" : "#0B1A17"}
      stroke={isPred ? "#9CA3AF" : "#4ADE94"}
      strokeWidth={2}
    />
  );
};

const RenderCustomActiveDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const isPred = payload?.isPrediction;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill={isPred ? "#9CA3AF" : "#4ADE94"}
      stroke="#0B1A17"
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
      // Fetch up to 20 historical items from API
      const data = await fetchSummary(20);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil data dari API");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, [load]);

  // Ensure history is sorted ascending by time
  const sortedHistory = useMemo(() => {
    if (!summary.history || summary.history.length === 0) return [];
    return [...summary.history].sort(
      (a, b) => parseTimestamp(a.timestamp).getTime() - parseTimestamp(b.timestamp).getTime()
    );
  }, [summary.history]);

  // Latest reading
  const latestReading = summary.latest || (sortedHistory.length > 0 ? sortedHistory[sortedHistory.length - 1] : null);
  const latestTds = latestReading?.tds ?? 337;
  const latestVoltage = deriveVoltage(latestTds);
  const lastUpdateTimeStr = latestReading ? formatFullDateTime(latestReading.timestamp) : "Belum ada data";

  // Compute Linear Regression Slope from the last 8 data points
  const slopeAnalysis = useMemo(() => {
    if (sortedHistory.length === 0) {
      return { slope: 0, timeStepMs: 30000, last8Count: 0 };
    }

    const last8 = sortedHistory.slice(-8);
    const N = last8.length;

    if (N < 2) {
      return { slope: 0, timeStepMs: 30000, last8Count: N };
    }

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < N; i++) {
      const x = i;
      const y = last8[i].tds;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const denom = N * sumX2 - sumX * sumX;
    const slope = denom !== 0 ? (N * sumXY - sumX * sumY) / denom : 0;

    // Calculate average time interval (ms) between consecutive steps
    const firstTime = parseTimestamp(last8[0].timestamp).getTime();
    const lastTime = parseTimestamp(last8[N - 1].timestamp).getTime();
    const totalDiffMs = lastTime - firstTime;
    const timeStepMs = totalDiffMs > 0 ? totalDiffMs / (N - 1) : 30000; // fallback 30s

    return { slope, timeStepMs, last8Count: N };
  }, [sortedHistory]);

  // Calculate 8 predicted future data points based on slope
  const { chartData, timeTo50String, isTargetReached } = useMemo(() => {
    if (sortedHistory.length === 0) {
      // Fallback data if API returns empty
      const mock = Array.from({ length: 8 }).map((_, i) => ({
        time: `0${i + 8}:00`.slice(-5),
        fullTime: `Point ${i + 1}`,
        tds: Math.max(100, 500 - i * 45),
        voltage: 200 + i * 30,
        isPrediction: false,
      }));
      return { chartData: mock, timeTo50String: "± 8 jam", isTargetReached: false };
    }

    // 1. Real data points
    const realPoints = sortedHistory.map((d) => ({
      time: formatTime(d.timestamp),
      fullTime: formatFullDateTime(d.timestamp),
      tds: d.tds,
      voltage: deriveVoltage(d.tds),
      isPrediction: false,
    }));

    const lastReal = sortedHistory[sortedHistory.length - 1];
    const lastRealTimeMs = parseTimestamp(lastReal.timestamp).getTime();
    const lastRealTds = lastReal.tds;

    // 2. Generate 8 predicted points extending from last real data point
    const predictedPoints = [];
    const { slope, timeStepMs } = slopeAnalysis;

    for (let k = 1; k <= 8; k++) {
      const predTimeMs = lastRealTimeMs + k * timeStepMs;
      const predTds = Math.max(0, Math.round(lastRealTds + k * slope));
      predictedPoints.push({
        time: formatTime(predTimeMs),
        fullTime: `${formatFullDateTime(predTimeMs)} (Prediksi #${k})`,
        tds: predTds,
        voltage: deriveVoltage(predTds),
        isPrediction: true,
      });
    }

    // Combine real data points + 8 predicted points
    const combinedData = [...realPoints, ...predictedPoints];

    // 3. Calculate Prediction to reach < 50 PPM based on slope of last 8 data points
    let timeStr = "";
    let targetReached = false;

    if (lastRealTds <= 50) {
      timeStr = "Target < 50 ppm Tercapai";
      targetReached = true;
    } else if (slope >= 0) {
      timeStr = "Stabil (TDS tidak turun)";
    } else {
      // slope < 0, decreasing
      const stepsTo50 = (lastRealTds - 50) / -slope;
      const msTo50 = stepsTo50 * timeStepMs;
      const hoursTo50 = msTo50 / (1000 * 3600);
      const minsTo50 = Math.round(msTo50 / (1000 * 60));

      if (minsTo50 < 60) {
        timeStr = `± ${minsTo50} mnt`;
      } else {
        const hrs = Math.floor(hoursTo50);
        const remainingMins = Math.round((hoursTo50 - hrs) * 60);
        timeStr = remainingMins > 0 ? `± ${hrs} jam ${remainingMins} mnt` : `± ${hrs} jam`;
      }
    }

    return {
      chartData: combinedData,
      timeTo50String: timeStr,
      isTargetReached: targetReached,
    };
  }, [sortedHistory, slopeAnalysis]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-signal text-sm font-medium mb-1">Selamat datang di</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-fog">SMART-MFC Dashboard</h1>
          <p className="text-muted text-sm mt-2">Sistem pemantauan pengolahan limbah cair organik berbasis Microbial Fuel Cell.</p>
        </div>
        <Badge variant={error ? "warning" : "outline-green"} icon={error ? <FlaskConical size={14} /> : <Wifi size={14} />}>
          {error ? "MODE PENGUJIAN / SIMULASI" : "TERHUBUNG D1 API (LIVE)"}
        </Badge>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-500/50 text-red-200 text-sm">
          Perhatian: {error}. Menggunakan fallback data.
        </div>
      )}

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <MagneticCard className="p-6 flex flex-col h-[170px] relative group overflow-hidden border-signal/20">
          <div className="flex items-center gap-2 text-signal mb-2 relative z-10">
            <SunDim size={18} strokeWidth={2.5} className="animate-float" />
            <h3 className="text-[13px] font-medium text-fog">TDS Saat Ini</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center relative z-10 mt-2">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[72px] leading-none font-bold text-signal tracking-tighter drop-shadow-[0_0_20px_rgba(74,222,148,0.4)]">
                {isLoading ? "..." : latestTds}
              </span>
              <span className="text-muted text-xl font-medium tracking-wide">ppm</span>
            </div>
            <p className="text-[11px] text-muted mt-2 tracking-wide">Total Padatan Terlarut (Real-Time API)</p>
          </div>
        </MagneticCard>

        <MagneticCard className="p-6 flex flex-col h-[170px] relative group overflow-hidden border-signal/20">
          <div className="flex items-center gap-2 text-signal mb-2 relative z-10">
            <Zap size={18} strokeWidth={2.5} className="animate-float" style={{ animationDelay: '0.3s' }} />
            <h3 className="text-[13px] font-medium text-fog">Tegangan MFC</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center relative z-10 mt-2">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[72px] leading-none font-bold text-signal tracking-tighter drop-shadow-[0_0_20px_rgba(74,222,148,0.4)]">
                {isLoading ? "..." : latestVoltage}
              </span>
              <span className="text-muted text-xl font-medium tracking-wide">mV</span>
            </div>
            <p className="text-[11px] text-muted mt-2 tracking-wide">Tegangan yang dihasilkan mikroba</p>
          </div>
        </MagneticCard>

        <MagneticCard className="p-6 flex flex-col h-[170px] relative group overflow-hidden border-signal/20">
          <div className="flex items-center gap-2 text-signal mb-2 relative z-10">
            <Hourglass size={18} strokeWidth={2.5} className="animate-float" style={{ animationDelay: '0.6s' }} />
            <h3 className="text-[13px] font-medium text-fog">Prediksi &lt; 50 PPM</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center relative z-10 mt-2">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[38px] lg:text-[44px] leading-none font-bold text-signal tracking-tight drop-shadow-[0_0_20px_rgba(74,222,148,0.4)]">
                {isLoading ? "..." : timeTo50String}
              </span>
            </div>
            <p className="text-[11px] text-muted mt-2 tracking-wide">
              Berdasarkan slope 8 data terakhir ({slopeAnalysis.slope.toFixed(2)} ppm/step)
            </p>
          </div>
        </MagneticCard>

        <MagneticCard className="p-6 flex flex-col h-[170px] relative group overflow-hidden border-signal/20">
          <div className="flex items-center gap-2 text-signal mb-2 relative z-10">
            <Activity size={18} strokeWidth={2.5} className="animate-float" style={{ animationDelay: '0.9s' }} />
            <h3 className="text-[13px] font-medium text-fog">Status Pengolahan</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center relative z-10 mt-2">
            <div className="flex items-center gap-4">
              <span className="font-display text-[44px] lg:text-[52px] leading-none font-bold text-signal tracking-tighter drop-shadow-[0_0_20px_rgba(74,222,148,0.4)]">
                {isTargetReached ? "Selesai" : "Berjalan"}
              </span>
              <span className={`w-4 h-4 rounded-full ${isTargetReached ? "bg-emerald-400" : "bg-signal shadow-[0_0_15px_#4ADE94] animate-pulse"}`}></span>
            </div>
            <p className="text-[11px] text-muted mt-3 tracking-wide">
              {isTargetReached ? "Target TDS < 50 ppm tercapai" : "Sistem beroperasi aktif"}
            </p>
          </div>
        </MagneticCard>
      </div>

      {/* Info Bar */}
      <div className="border border-line bg-panel/40 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 mb-6 text-sm">
        <div className="flex items-center gap-3">
          <Calendar className="text-signal" size={18} />
          <div>
            <p className="text-muted text-xs">Update Terakhir (API)</p>
            <p className="text-fog font-mono text-xs">{lastUpdateTimeStr}</p>
          </div>
        </div>
        <div className="w-px h-8 bg-line hidden lg:block"></div>
        <div className="flex items-center gap-3">
          <RefreshCcw className="text-signal" size={18} />
          <div>
            <p className="text-fog">Pembaruan Otomatis</p>
            <p className="text-muted text-xs">setiap 15 detik</p>
          </div>
        </div>
        <div className="w-px h-8 bg-line hidden lg:block"></div>
        <div className="flex items-center gap-3">
          <TrendingDown className="text-signal" size={18} />
          <div>
            <p className="text-fog">Slope (8 Data Terakhir)</p>
            <p className="text-signal text-xs font-mono">{slopeAnalysis.slope.toFixed(2)} ppm / step</p>
          </div>
        </div>
        <div className="w-px h-8 bg-line hidden lg:block"></div>
        <div className="flex items-center gap-3">
          <Wifi className="text-signal" size={18} />
          <div>
            <p className="text-fog">Cloud Worker API</p>
            <p className="text-signal text-xs">Online</p>
          </div>
        </div>
        <div className="w-px h-8 bg-line hidden lg:block"></div>
        <div className="flex items-center gap-3">
          <BatteryCharging className="text-signal" size={18} />
          <div>
            <p className="text-fog">Self-Powered</p>
            <p className="text-muted text-xs">MFC Cell Active</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6 pb-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Droplet className="text-signal" size={20} />
              <h3 className="font-display font-medium text-fog text-lg">Grafik TDS vs Waktu</h3>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-fog">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4ADE94]"></span> Data Aktual
              </span>
              <span className="flex items-center gap-1.5 text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full bg-[#9CA3AF]"></span> 8 Node Prediksi (Abu-abu)
              </span>
            </div>
          </div>
          <p className="text-[11px] text-muted mb-2">
            TDS (ppm) — Slope 8 data terakhir: <span className="font-mono text-signal">{slopeAnalysis.slope.toFixed(2)} ppm/step</span>
          </p>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorTds" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ADE94" stopOpacity={0.5}/>
                    <stop offset="100%" stopColor="#4ADE94" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#22403A" vertical={true} horizontal={true} strokeOpacity={0.4} />
                <XAxis dataKey="time" stroke="#8FADA3" fontSize={11} tickLine={false} axisLine={false} tickMargin={10} minTickGap={20} />
                <YAxis stroke="#8FADA3" fontSize={11} tickLine={false} axisLine={false} tickCount={6} domain={[0, 'auto']} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#0B1A17] border border-[#22403A] p-3 rounded-lg text-xs space-y-1 shadow-xl">
                          <p className="text-fog font-medium">{data.fullTime || data.time}</p>
                          <div className="flex items-center gap-2">
                            <span className={data.isPrediction ? "text-gray-300 font-semibold" : "text-signal font-semibold"}>
                              TDS: {data.tds} ppm
                            </span>
                            {data.isPrediction && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-700 text-gray-200 font-mono">
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
                <ReferenceLine y={50} stroke="#F2B84B" strokeDasharray="3 3" strokeOpacity={0.8} label={{ value: "Target 50 ppm", fill: "#F2B84B", fontSize: 10, position: "insideTopRight" }} />
                <Area 
                  type="monotone" 
                  dataKey="tds" 
                  name="TDS (ppm)" 
                  stroke="#4ADE94" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorTds)" 
                  dot={<RenderCustomDot />} 
                  activeDot={<RenderCustomActiveDot />} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center mt-2 items-center gap-4 text-xs text-muted">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-signal border border-ink"></div>
              <span>Node Aktual (Hijau)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gray-400 border border-ink"></div>
              <span>8 Node Prediksi Slope (Abu-abu)</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 pb-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="text-signal" size={20} />
              <h3 className="font-display font-medium text-fog text-lg">Grafik Tegangan MFC vs Waktu</h3>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-fog">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4ADE94]"></span> Data Aktual
              </span>
              <span className="flex items-center gap-1.5 text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full bg-[#9CA3AF]"></span> 8 Node Prediksi
              </span>
            </div>
          </div>
          <p className="text-[11px] text-muted mb-2">Tegangan (mV) — Hasil konversi dari pembacaan sensor</p>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorVolt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ADE94" stopOpacity={0.5}/>
                    <stop offset="100%" stopColor="#4ADE94" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#22403A" vertical={true} horizontal={true} strokeOpacity={0.4} />
                <XAxis dataKey="time" stroke="#8FADA3" fontSize={11} tickLine={false} axisLine={false} tickMargin={10} minTickGap={20} />
                <YAxis stroke="#8FADA3" fontSize={11} tickLine={false} axisLine={false} tickCount={6} domain={[0, 'auto']} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#0B1A17] border border-[#22403A] p-3 rounded-lg text-xs space-y-1 shadow-xl">
                          <p className="text-fog font-medium">{data.fullTime || data.time}</p>
                          <div className="flex items-center gap-2">
                            <span className={data.isPrediction ? "text-gray-300 font-semibold" : "text-signal font-semibold"}>
                              Tegangan: {data.voltage} mV
                            </span>
                            {data.isPrediction && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-700 text-gray-200 font-mono">
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
                <Area 
                  type="monotone" 
                  dataKey="voltage" 
                  name="Tegangan (mV)" 
                  stroke="#4ADE94" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorVolt)" 
                  dot={<RenderCustomDot />} 
                  activeDot={<RenderCustomActiveDot />} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center mt-2 items-center gap-4 text-xs text-muted">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-signal border border-ink"></div>
              <span>Node Tegangan Aktual (Hijau)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gray-400 border border-ink"></div>
              <span>8 Node Prediksi (Abu-abu)</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2 p-6 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-10">
            <Target className="text-signal" size={20} />
            <h3 className="font-display font-medium text-fog text-lg">Cara Kerja Prediksi Slope SMART-MFC</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            <div className="flex flex-row gap-4">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-signal text-ink font-bold flex items-center justify-center text-sm shadow-[0_0_10px_#4ADE94]">1</div>
                <FlaskConical size={36} className="text-signal mt-6 drop-shadow-[0_0_10px_rgba(74,222,148,0.6)]" strokeWidth={1.5} />
              </div>
              <div className="pt-1 flex flex-col justify-between">
                <h4 className="text-fog text-sm font-bold h-7 flex items-center">Ambil 8 Data Terakhir</h4>
                <p className="text-[11px] text-muted leading-relaxed mt-5">Sistem secara otomatis membaca 8 titik data real-time terbaru dari database D1 Worker API.</p>
              </div>
            </div>
            
            <div className="flex flex-row gap-4">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-signal text-ink font-bold flex items-center justify-center text-sm shadow-[0_0_10px_#4ADE94]">2</div>
                <TrendingDown size={36} className="text-signal mt-6 drop-shadow-[0_0_10px_rgba(74,222,148,0.6)]" strokeWidth={1.5} />
              </div>
              <div className="pt-1 flex flex-col justify-between">
                <h4 className="text-fog text-sm font-bold h-7 flex items-center">Hitung Slope Regresi</h4>
                <p className="text-[11px] text-muted leading-relaxed mt-5">Kemiringan (slope = {slopeAnalysis.slope.toFixed(2)}) dihitung menggunakan metode least squares linier.</p>
              </div>
            </div>
            
            <div className="flex flex-row gap-4">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-signal text-ink font-bold flex items-center justify-center text-sm shadow-[0_0_10px_#4ADE94]">3</div>
                <Droplet size={36} className="text-signal mt-6 drop-shadow-[0_0_10px_rgba(74,222,148,0.6)]" strokeWidth={1.5} />
              </div>
              <div className="pt-1 flex flex-col justify-between">
                <h4 className="text-fog text-sm font-bold h-7 flex items-center">Generate 8 Node Abu-abu</h4>
                <p className="text-[11px] text-muted leading-relaxed mt-5">8 node proyeksi masa depan dibuat &amp; ditandai dengan warna titik abu-abu di grafik.</p>
              </div>
            </div>
            
            <div className="flex flex-row gap-4">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-signal text-ink font-bold flex items-center justify-center text-sm shadow-[0_0_10px_#4ADE94]">4</div>
                <Monitor size={36} className="text-signal mt-6 drop-shadow-[0_0_10px_rgba(74,222,148,0.6)]" strokeWidth={1.5} />
              </div>
              <div className="pt-1 flex flex-col justify-between">
                <h4 className="text-fog text-sm font-bold h-7 flex items-center leading-tight">Estimasi Waktu &lt; 50 PPM</h4>
                <p className="text-[11px] text-muted leading-relaxed mt-5">Prediksi durasi hingga TDS turun di bawah 50 ppm dihitung secara presisi ({timeTo50String}).</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-8 relative z-10">
            <Target className="text-signal" size={20} />
            <h3 className="font-display font-medium text-fog text-lg">Target &amp; Parameter API</h3>
          </div>
          
          <div className="space-y-6 relative z-10">
            <div>
              <p className="text-xs text-muted mb-1">Target TDS Utama</p>
              <h4 className="text-2xl font-display font-bold text-signal drop-shadow-[0_0_10px_rgba(74,222,148,0.4)]">
                &le; 50 ppm
              </h4>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Estimasi Waktu Target (&lt; 50 ppm)</p>
              <h4 className="text-2xl font-display font-bold text-fog drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                {timeTo50String}
              </h4>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Kemiringan (Slope 8 Data)</p>
              <h4 className="text-lg font-mono font-bold text-signal">
                {slopeAnalysis.slope.toFixed(2)} ppm / step
              </h4>
            </div>
            
            <div className="pt-2 border-t border-line/50">
              <p className="text-[10px] text-muted leading-relaxed">Live API Endpoint</p>
              <p className="text-[10px] text-signal font-mono truncate">mfc-d1-api.derylchrist08.workers.dev</p>
            </div>
          </div>

          {/* Target Icon Decorative */}
          <div className="absolute -bottom-6 -right-6 text-signal/5 group-hover:text-signal/10 transition-colors pointer-events-none">
            <Target size={180} strokeWidth={0.5} />
          </div>
        </Card>
      </div>
    </div>
  );
}

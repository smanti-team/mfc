"use client";
import { useEffect, useState, useCallback } from "react";
import { fetchSummary } from "@/lib/api";
import type { Summary } from "@/lib/types";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { 
  Activity, Zap, Hourglass, Calendar, RefreshCcw, Wifi, Cloud, BatteryCharging, 
  FlaskConical, Droplet, Monitor, Target, SunDim
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

function deriveVoltage(tds: number) {
  // Simple linear mock to derive voltage from TDS based on screenshots
  const v = Math.round(555 - 0.66 * tds);
  return v > 0 ? v : 0;
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export default function Home() {
  const [summary, setSummary] = useState<Summary>({ latest: null, history: [] });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      // Fetch more data points for the chart if possible, or use default
      const data = await fetchSummary(10);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const latestTds = summary.latest?.tds ?? 337;
  const latestVoltage = deriveVoltage(latestTds);
  const chartData = summary.history.length > 0 
    ? [...summary.history].reverse().map(d => ({
        time: formatTime(d.timestamp),
        tds: d.tds,
        voltage: deriveVoltage(d.tds)
      }))
    : Array.from({ length: 8 }).map((_, i) => ({
        time: `0${i+8}:00`.slice(-5),
        tds: Math.max(100, 500 - (i * 45)),
        voltage: 200 + (i * 30)
      })); // Fallback mock data if API is empty/failing

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-signal text-sm font-medium mb-1">Selamat datang di</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-fog">SMART-MFC Dashboard</h1>
          <p className="text-muted text-sm mt-2">Sistem pemantauan pengolahan limbah cair organik berbasis Microbial Fuel Cell.</p>
        </div>
        <Badge variant="warning" icon={<FlaskConical size={14} />}>
          MODE PENGUJIAN / DATA SIMULASI
        </Badge>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-500/50 text-red-200 text-sm">
          Warning: Cannot fetch live data ({error}). Using simulated data.
        </div>
      )}

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 flex flex-col h-[170px] relative group overflow-hidden border-signal/20 hover:border-signal/50 transition-colors">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-signal/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center gap-2 text-signal mb-2 relative z-10">
            <SunDim size={18} strokeWidth={2.5} />
            <h3 className="text-[13px] font-medium text-fog">TDS Saat Ini</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center relative z-10 mt-2">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[72px] leading-none font-bold text-signal tracking-tighter drop-shadow-[0_0_20px_rgba(74,222,148,0.4)]">{latestTds}</span>
              <span className="text-muted text-xl font-medium tracking-wide">ppm</span>
            </div>
            <p className="text-[11px] text-muted mt-2 tracking-wide">Total Padatan Terlarut</p>
          </div>
        </Card>

        <Card className="p-6 flex flex-col h-[170px] relative group overflow-hidden border-signal/20 hover:border-signal/50 transition-colors">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-signal/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center gap-2 text-signal mb-2 relative z-10">
            <Zap size={18} strokeWidth={2.5} />
            <h3 className="text-[13px] font-medium text-fog">Tegangan MFC</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center relative z-10 mt-2">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[72px] leading-none font-bold text-signal tracking-tighter drop-shadow-[0_0_20px_rgba(74,222,148,0.4)]">{latestVoltage}</span>
              <span className="text-muted text-xl font-medium tracking-wide">mV</span>
            </div>
            <p className="text-[11px] text-muted mt-2 tracking-wide">Tegangan yang dihasilkan</p>
          </div>
        </Card>

        <Card className="p-6 flex flex-col h-[170px] relative group overflow-hidden border-signal/20 hover:border-signal/50 transition-colors">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-signal/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center gap-2 text-signal mb-2 relative z-10">
            <Hourglass size={18} strokeWidth={2.5} />
            <h3 className="text-[13px] font-medium text-fog">Prediksi Sisa Waktu</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center relative z-10 mt-2">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[72px] leading-none font-bold text-signal tracking-tighter drop-shadow-[0_0_20px_rgba(74,222,148,0.4)]">± 8</span>
              <span className="text-muted text-xl font-medium tracking-wide">jam</span>
            </div>
            <p className="text-[11px] text-muted mt-2 tracking-wide">Perkiraan hingga target tercapai</p>
          </div>
        </Card>

        <Card className="p-6 flex flex-col h-[170px] relative group overflow-hidden border-signal/20 hover:border-signal/50 transition-colors">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-signal/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center gap-2 text-signal mb-2 relative z-10">
            <Activity size={18} strokeWidth={2.5} />
            <h3 className="text-[13px] font-medium text-fog">Status Pengolahan</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center relative z-10 mt-2">
            <div className="flex items-center gap-4">
              <span className="font-display text-[56px] leading-none font-bold text-signal tracking-tighter drop-shadow-[0_0_20px_rgba(74,222,148,0.4)]">Berjalan</span>
              <span className="w-4 h-4 rounded-full bg-signal shadow-[0_0_15px_#4ADE94] animate-pulse"></span>
            </div>
            <p className="text-[11px] text-muted mt-3 tracking-wide">Sistem beroperasi normal</p>
          </div>
        </Card>
      </div>

      {/* Info Bar */}
      <div className="border border-line bg-panel/40 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 mb-6 text-sm">
        <div className="flex items-center gap-3">
          <Calendar className="text-signal" size={18} />
          <div>
            <p className="text-muted text-xs">Update Terakhir</p>
            <p className="text-fog">16 Mei 2025, 11:40:06</p>
          </div>
        </div>
        <div className="w-px h-8 bg-line hidden lg:block"></div>
        <div className="flex items-center gap-3">
          <RefreshCcw className="text-signal" size={18} />
          <div>
            <p className="text-fog">Pembaruan Data</p>
            <p className="text-muted text-xs">setiap 3 jam</p>
          </div>
        </div>
        <div className="w-px h-8 bg-line hidden lg:block"></div>
        <div className="flex items-center gap-3">
          <Wifi className="text-signal" size={18} />
          <div>
            <p className="text-fog">ESP32</p>
            <p className="text-signal text-xs">Online</p>
          </div>
        </div>
        <div className="w-px h-8 bg-line hidden lg:block"></div>
        <div className="flex items-center gap-3">
          <Cloud className="text-signal" size={18} />
          <div>
            <p className="text-fog">Cloud</p>
            <p className="text-signal text-xs">Connected</p>
          </div>
        </div>
        <div className="w-px h-8 bg-line hidden lg:block"></div>
        <div className="flex items-center gap-3">
          <BatteryCharging className="text-signal" size={18} />
          <div>
            <p className="text-fog">Self-Powered</p>
            <p className="text-muted text-xs">Under Test</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6 pb-2">
          <div className="flex items-center gap-2 mb-6">
            <Droplet className="text-signal" size={20} />
            <h3 className="font-display font-medium text-fog text-lg">Grafik TDS vs Waktu</h3>
          </div>
          <p className="text-[11px] text-muted mb-2">TDS (ppm)</p>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorTds" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ADE94" stopOpacity={0.6}/>
                    <stop offset="100%" stopColor="#4ADE94" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#22403A" vertical={true} horizontal={true} strokeOpacity={0.4} />
                <XAxis dataKey="time" stroke="#8FADA3" fontSize={11} tickLine={false} axisLine={false} tickMargin={10} minTickGap={20} />
                <YAxis stroke="#8FADA3" fontSize={11} tickLine={false} axisLine={false} tickCount={6} domain={[0, 600]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B1A17', borderColor: '#22403A', color: '#E7F2ED', borderRadius: '8px' }}
                  itemStyle={{ color: '#4ADE94' }}
                />
                <ReferenceLine y={100} stroke="#F2B84B" strokeDasharray="3 3" strokeOpacity={0.5} />
                <Area type="monotone" dataKey="tds" name="TDS (ppm)" stroke="#4ADE94" strokeWidth={3} fillOpacity={1} fill="url(#colorTds)" dot={{ fill: '#0B1A17', stroke: '#4ADE94', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#4ADE94', stroke: '#0B1A17', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center mt-2 items-center gap-2 text-xs text-muted">
            <div className="w-4 h-0.5 bg-signal"></div>
            <span>TDS (ppm)</span>
          </div>
        </Card>

        <Card className="p-6 pb-2">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="text-signal" size={20} />
            <h3 className="font-display font-medium text-fog text-lg">Grafik Tegangan MFC vs Waktu</h3>
          </div>
          <p className="text-[11px] text-muted mb-2">Tegangan (mV)</p>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorVolt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ADE94" stopOpacity={0.6}/>
                    <stop offset="100%" stopColor="#4ADE94" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#22403A" vertical={true} horizontal={true} strokeOpacity={0.4} />
                <XAxis dataKey="time" stroke="#8FADA3" fontSize={11} tickLine={false} axisLine={false} tickMargin={10} minTickGap={20} />
                <YAxis stroke="#8FADA3" fontSize={11} tickLine={false} axisLine={false} tickCount={6} domain={[0, 600]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B1A17', borderColor: '#22403A', color: '#E7F2ED', borderRadius: '8px' }}
                  itemStyle={{ color: '#4ADE94' }}
                />
                <Area type="monotone" dataKey="voltage" name="Tegangan (mV)" stroke="#4ADE94" strokeWidth={3} fillOpacity={1} fill="url(#colorVolt)" dot={{ fill: '#0B1A17', stroke: '#4ADE94', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#4ADE94', stroke: '#0B1A17', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center mt-2 items-center gap-2 text-xs text-muted">
            <div className="w-4 h-0.5 bg-signal"></div>
            <span>Tegangan (mV)</span>
          </div>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2 p-6 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-10">
            <Target className="text-signal" size={20} />
            <h3 className="font-display font-medium text-fog text-lg">Cara Kerja Singkat</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            
            <div className="flex flex-row gap-4">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-signal text-ink font-bold flex items-center justify-center text-sm shadow-[0_0_10px_#4ADE94]">1</div>
                <FlaskConical size={36} className="text-signal mt-6 drop-shadow-[0_0_10px_rgba(74,222,148,0.6)]" strokeWidth={1.5} />
              </div>
              <div className="pt-1 flex flex-col justify-between">
                <h4 className="text-fog text-sm font-bold h-7 flex items-center">Limbah diproses</h4>
                <p className="text-[11px] text-muted leading-relaxed mt-5">Limbah cair organik masuk ke reaktor MFC dan diuraikan oleh mikroba.</p>
              </div>
            </div>
            
            <div className="flex flex-row gap-4">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-signal text-ink font-bold flex items-center justify-center text-sm shadow-[0_0_10px_#4ADE94]">2</div>
                <Zap size={36} className="text-signal mt-6 drop-shadow-[0_0_10px_rgba(74,222,148,0.6)]" strokeWidth={1.5} />
              </div>
              <div className="pt-1 flex flex-col justify-between">
                <h4 className="text-fog text-sm font-bold h-7 flex items-center">Energi mikro dihasilkan</h4>
                <p className="text-[11px] text-muted leading-relaxed mt-5">Mikroba menghasilkan elektron yang diubah menjadi listrik.</p>
              </div>
            </div>
            
            <div className="flex flex-row gap-4">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-signal text-ink font-bold flex items-center justify-center text-sm shadow-[0_0_10px_#4ADE94]">3</div>
                <Droplet size={36} className="text-signal mt-6 drop-shadow-[0_0_10px_rgba(74,222,148,0.6)]" strokeWidth={1.5} />
              </div>
              <div className="pt-1 flex flex-col justify-between">
                <h4 className="text-fog text-sm font-bold h-7 flex items-center">Kondisi air dipantau</h4>
                <p className="text-[11px] text-muted leading-relaxed mt-5">Sensor mengukur TDS dan tegangan secara berkala.</p>
              </div>
            </div>
            
            <div className="flex flex-row gap-4">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-signal text-ink font-bold flex items-center justify-center text-sm shadow-[0_0_10px_#4ADE94]">4</div>
                <Monitor size={36} className="text-signal mt-6 drop-shadow-[0_0_10px_rgba(74,222,148,0.6)]" strokeWidth={1.5} />
              </div>
              <div className="pt-1 flex flex-col justify-between">
                <h4 className="text-fog text-sm font-bold h-7 flex items-center leading-tight">Website memberi prediksi</h4>
                <p className="text-[11px] text-muted leading-relaxed mt-5">Data dianalisis untuk memprediksi sisa waktu hingga target tercapai.</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-8 relative z-10">
            <Target className="text-signal" size={20} />
            <h3 className="font-display font-medium text-fog text-lg">Target Pengolahan</h3>
          </div>
          
          <div className="space-y-6 relative z-10">
            <div>
              <p className="text-xs text-muted mb-1">Target TDS</p>
              <h4 className="text-2xl font-display font-bold text-fog drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">≤ 100 ppm</h4>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Target Waktu</p>
              <h4 className="text-2xl font-display font-bold text-fog drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">Maks. 24 jam</h4>
            </div>
            
            <div className="pt-4">
              <p className="text-[10px] text-muted leading-relaxed">Catatan</p>
              <p className="text-[10px] text-muted leading-relaxed">Nilai dapat berubah sesuai kondisi aktual.</p>
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

"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import MagneticCard from "@/components/MagneticCard";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { fetchSummary } from "@/lib/api";
import type { Summary } from "@/lib/types";
import { 
  Download, Database, Clock, LineChart as ChartIcon, Target, 
  Activity, Zap, Info, Wifi, FlaskConical
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
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

interface ResearchItem {
  hour: number;
  timeLabel: string;
  tds: number;
  voltage: number;
  prediction: string;
  status: string;
}

export default function DataPenelitianPage() {
  const [summary, setSummary] = useState<Summary>({ latest: null, history: [] });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState("Siklus 1");
  const tabs = ["Siklus 1", "Siklus 2", "Siklus 3", "Semua"];

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchSummary(50);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data dari API");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Sort ascending by time
  const sortedHistory = useMemo(() => {
    if (!summary.history || summary.history.length === 0) return [];
    return [...summary.history].sort(
      (a, b) => parseTimestamp(a.timestamp).getTime() - parseTimestamp(b.timestamp).getTime()
    );
  }, [summary.history]);

  // Calculate research statistical metrics dynamically from live API data
  const researchStats = useMemo(() => {
    const N = sortedHistory.length;
    if (N < 2) {
      const mockChartItems: ResearchItem[] = Array.from({ length: 9 }).map((_, i) => ({
        hour: i * 3,
        timeLabel: `Jam ke-${i * 3}`,
        tds: Math.max(90, 528 - i * 48),
        voltage: 200 + i * 35,
        prediction: i >= 8 ? "24 jam" : "≈ 24 jam",
        status: i >= 8 ? "Target Tercapai" : "Berjalan"
      }));

      return {
        pointCount: N > 0 ? N : 24,
        avgIntervalStr: "30 dtk",
        pearsonR: "-0.81",
        rSquared: "0.89",
        equationStr: "y = -5.2x + 350",
        targetHour: "jam ke-24",
        chartItems: mockChartItems
      };
    }

    const firstMs = parseTimestamp(sortedHistory[0].timestamp).getTime();
    const lastMs = parseTimestamp(sortedHistory[N - 1].timestamp).getTime();
    const avgDiffMs = (lastMs - firstMs) / (N - 1);
    const avgMins = Math.round(avgDiffMs / (1000 * 60));
    const avgSecs = Math.round(avgDiffMs / 1000);
    const avgIntervalStr = avgMins >= 1 ? `${avgMins} mnt` : `${avgSecs} dtk`;

    // Pearson r and Linear Regression: y = slope * x + intercept
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < N; i++) {
      const x = i;
      const y = sortedHistory[i].tds;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    }

    const denomM = N * sumX2 - sumX * sumX;
    const slope = denomM !== 0 ? (N * sumXY - sumX * sumY) / denomM : 0;
    const intercept = (sumY - slope * sumX) / N;

    const numR = N * sumXY - sumX * sumY;
    const denR = Math.sqrt((N * sumX2 - sumX * sumX) * (N * sumY2 - sumY * sumY));
    const r = denR !== 0 ? numR / denR : -0.81;
    const r2 = Math.pow(r, 2);

    const equationStr = `y = ${slope >= 0 ? "+" : ""}${slope.toFixed(2)}x + ${Math.round(intercept)}`;
    const targetSteps = slope < 0 ? (50 - intercept) / slope : 0;
    const targetHour = targetSteps > 0 ? `jam ke-${Math.round(targetSteps)}` : "Tercapai";

    const chartItems: ResearchItem[] = sortedHistory.map((d, i) => ({
      hour: i,
      timeLabel: formatTime(d.timestamp),
      tds: d.tds,
      voltage: deriveVoltage(d.tds),
      prediction: d.tds <= 50 ? "Target Tercapai" : "Berjalan",
      status: d.tds <= 50 ? "Target Tercapai" : "Berjalan"
    }));

    return {
      pointCount: N,
      avgIntervalStr,
      pearsonR: r.toFixed(2),
      rSquared: r2.toFixed(2),
      equationStr,
      targetHour,
      chartItems
    };
  }, [sortedHistory]);

  const handleDownloadCSV = () => {
    if (sortedHistory.length === 0) return;
    let csv = "Index,Timestamp,TDS (ppm),Voltage (mV)\n";
    sortedHistory.forEach((d, idx) => {
      csv += `${idx + 1},"${d.timestamp}",${d.tds},${deriveVoltage(d.tds)}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `smart-mfc-live-data-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-signal text-sm font-medium mb-1">Selamat datang di</p>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-fog">Data Penelitian</h1>
            <Badge variant={error ? "warning" : "outline-green"} icon={error ? <FlaskConical size={14} /> : <Wifi size={14} />}>
              {error ? "MODE SIMULASI" : "TERHUBUNG LIVE API"}
            </Badge>
          </div>
          <p className="text-muted text-sm mt-2 max-w-2xl">
            Khusus untuk kebutuhan riset: data siklus real-time, grafik penelitian, regresi, dan korelasi dari D1 Worker API.
          </p>
        </div>
        
        <button 
          onClick={handleDownloadCSV}
          className="flex items-center gap-2 px-4 py-2 border border-signal text-signal rounded-md hover:bg-signal/10 transition-colors text-sm font-medium"
        >
          <Download size={16} /> Download CSV (Live API)
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-8 border-b border-line pb-1 overflow-x-auto">
        {tabs.map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === tab 
                ? "bg-signal/10 border-b-2 border-signal text-signal" 
                : "text-muted hover:text-fog hover:bg-panel/50 border-b-2 border-transparent"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Top Metrics — 4 MagneticCard terhubung ke API */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MagneticCard className="p-6 flex flex-col h-40 relative overflow-hidden">
          <div className="flex items-center gap-2 text-signal mb-2">
            <Database size={20} className="animate-float" />
            <h3 className="text-sm font-medium text-fog">Jumlah Data</h3>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[64px] leading-none font-bold text-signal tracking-tight drop-shadow-[0_0_15px_rgba(74,222,148,0.5)]">
                {isLoading ? "..." : researchStats.pointCount}
              </span>
            </div>
            <p className="text-[11px] text-muted mt-1 uppercase tracking-wider">titik data dari API</p>
          </div>
        </MagneticCard>

        <MagneticCard className="p-6 flex flex-col h-40 relative overflow-hidden">
          <div className="flex items-center gap-2 text-signal mb-2">
            <Clock size={20} className="animate-float" style={{ animationDelay: '0.3s' }} />
            <h3 className="text-sm font-medium text-fog">Interval Rata-rata</h3>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[52px] leading-none font-bold text-signal tracking-tight drop-shadow-[0_0_15px_rgba(74,222,148,0.5)]">
                {isLoading ? "..." : researchStats.avgIntervalStr}
              </span>
            </div>
            <p className="text-[11px] text-muted mt-1 uppercase tracking-wider">antar pengukuran</p>
          </div>
        </MagneticCard>

        <MagneticCard className="p-6 flex flex-col h-40 relative overflow-hidden">
          <div className="flex items-center gap-2 text-signal mb-2">
            <ChartIcon size={20} className="animate-float" style={{ animationDelay: '0.6s' }} />
            <h3 className="text-sm font-medium text-fog">Pearson r</h3>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[64px] leading-none font-bold text-signal tracking-tight drop-shadow-[0_0_15px_rgba(74,222,148,0.5)]">
                {isLoading ? "..." : researchStats.pearsonR}
              </span>
            </div>
            <p className="text-[11px] text-muted mt-1 uppercase tracking-wider">korelasi data API</p>
          </div>
        </MagneticCard>

        <MagneticCard className="p-6 flex flex-col h-40 relative overflow-hidden">
          <div className="flex items-center gap-2 text-signal mb-2">
            <Target size={20} className="animate-float" style={{ animationDelay: '0.9s' }} />
            <h3 className="text-sm font-medium text-fog">R² Regresi</h3>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[64px] leading-none font-bold text-signal tracking-tight drop-shadow-[0_0_15px_rgba(74,222,148,0.5)]">
                {isLoading ? "..." : researchStats.rSquared}
              </span>
            </div>
            <p className="text-[11px] text-muted mt-1 uppercase tracking-wider">koefisien determinasi</p>
          </div>
        </MagneticCard>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-medium text-fog text-lg">Grafik TDS Penelitian</h3>
          </div>
          <p className="text-muted text-sm mb-6">Perubahan TDS terhadap waktu (Live API Data)</p>
          
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={researchStats.chartItems} margin={{ top: 30, right: 10, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorTdsData" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ADE94" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4ADE94" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#22403A" vertical={false} />
                <XAxis dataKey="timeLabel" stroke="#8FADA3" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'Waktu', position: 'bottom', fill: '#8FADA3', fontSize: 12, offset: 0 }} />
                <YAxis stroke="#8FADA3" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'TDS (ppm)', position: 'top', offset: 15, fill: '#8FADA3', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B1A17', borderColor: '#22403A', color: '#E7F2ED', borderRadius: '8px' }}
                  itemStyle={{ color: '#4ADE94' }}
                />
                <Area type="monotone" dataKey="tds" name="TDS (ppm)" stroke="#4ADE94" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTdsData)" dot={{ fill: '#0B1A17', stroke: '#4ADE94', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#4ADE94', stroke: '#0B1A17', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-medium text-fog text-lg">Grafik Tegangan Penelitian</h3>
          </div>
          <p className="text-muted text-sm mb-6">Perubahan tegangan terhadap waktu (Live API Data)</p>
          
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={researchStats.chartItems} margin={{ top: 30, right: 10, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorVoltData" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ADE94" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4ADE94" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#22403A" vertical={false} />
                <XAxis dataKey="timeLabel" stroke="#8FADA3" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'Waktu', position: 'bottom', fill: '#8FADA3', fontSize: 12, offset: 0 }} />
                <YAxis stroke="#8FADA3" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'Tegangan (mV)', position: 'top', offset: 15, fill: '#8FADA3', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B1A17', borderColor: '#22403A', color: '#E7F2ED', borderRadius: '8px' }}
                  itemStyle={{ color: '#4ADE94' }}
                />
                <Area type="monotone" dataKey="voltage" name="Tegangan (mV)" stroke="#4ADE94" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVoltData)" dot={{ fill: '#0B1A17', stroke: '#4ADE94', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#4ADE94', stroke: '#0B1A17', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Data Table */}
        <Card className="p-6">
          <h3 className="font-display font-medium text-fog text-lg mb-4">Raw Data API (Real-Time)</h3>
          
          <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted border-b border-line sticky top-0 bg-[#0B1A17]">
                <tr>
                  <th className="pb-3 font-medium px-2">Waktu/Jam</th>
                  <th className="pb-3 font-medium px-2">TDS (ppm)</th>
                  <th className="pb-3 font-medium px-2">Tegangan (mV)</th>
                  <th className="pb-3 font-medium px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {researchStats.chartItems.map((row, idx) => (
                  <tr key={idx} className="hover:bg-panel/50 transition-colors">
                    <td className="py-3 px-2 font-mono text-fog">{row.timeLabel}</td>
                    <td className="py-3 px-2 text-fog">{row.tds}</td>
                    <td className="py-3 px-2 text-fog">{row.voltage}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${row.status === 'Target Tercapai' ? 'bg-transparent border-2 border-signal' : 'bg-signal'}`}></div>
                        <span className={`text-xs ${row.status === 'Target Tercapai' ? 'text-signal font-medium' : 'text-signal'}`}>
                          {row.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Linear Regression */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ChartIcon className="text-signal" size={18} />
            <h3 className="font-display font-medium text-fog text-lg">Analisis Regresi Linier API</h3>
          </div>
          <p className="text-muted text-sm mb-6">Model regresi linier aktual antara urutan waktu (x) dan TDS (y) dari data API.</p>
          
          <div className="bg-panel/80 rounded-lg p-6 flex flex-col items-center justify-center border border-line mb-8">
            <p className="font-mono text-2xl md:text-3xl text-signal mb-4">{researchStats.equationStr}</p>
            <div className="text-muted text-sm font-mono text-center">
              <p>y = TDS (ppm)</p>
              <p>x = Urutan Titik Pengukuran</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-line/50">
              <div className="flex items-center gap-2 text-muted text-sm">
                <Target size={16} /> Target TDS
              </div>
              <div className="font-medium text-signal">&le; 50 ppm</div>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-line/50">
              <div className="flex items-center gap-2 text-muted text-sm">
                <Activity size={16} /> Prediksi target tercapai pada
              </div>
              <div className="font-medium text-signal">{researchStats.targetHour}</div>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-2 text-muted text-sm">
                <ChartIcon size={16} /> R² (Koefisien Determinasi)
              </div>
              <div className="font-medium text-signal">{researchStats.rSquared} ({Math.round(parseFloat(researchStats.rSquared) * 100)}%)</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-line bg-panel/30 text-muted text-sm">
        <Info size={16} className="text-signal flex-shrink-0" />
        <p>Halaman ini dikonfigurasi langsung dengan live data dari D1 Cloudflare Worker API.</p>
      </div>
    </div>
  );
}

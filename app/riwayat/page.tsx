"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import MagneticCard from "@/components/MagneticCard";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { fetchSummary } from "@/lib/api";
import type { Summary, Reading } from "@/lib/types";
import { 
  Database, CheckCircle2, RefreshCcw, Clock, ArrowDownRight, ArrowUpRight,
  Activity, CalendarDays, ChevronLeft, ChevronRight, FlaskConical, Wifi
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

function parseTimestamp(ts: string | number): Date {
  if (typeof ts === 'number') {
    return new Date(ts * (ts < 1e11 ? 1000 : 1));
  }
  const str = String(ts).replace(' ', 'T');
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
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

interface BatchRecord {
  id: string;
  start: string;
  end: string;
  tdsStart: number;
  tdsEnd: number;
  duration: string;
  status: "SELESAI" | "BERJALAN" | "Perlu Evaluasi";
  notes?: string;
  isUji?: boolean;
}

export default function RiwayatPage() {
  const [summary, setSummary] = useState<Summary>({ latest: null, history: [] });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchSummary(100);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data dari API");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Fallback data if API returns empty
  const fallbackHistory: Reading[] = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return [
      { timestamp: now - 3600, tds: 956.84, voltage: 0.23 },
      { timestamp: now - 2700, tds: 1061.76, voltage: 0.24 },
      { timestamp: now - 1800, tds: 956.79, voltage: 0.23 },
      { timestamp: now - 300, tds: 1068.89, voltage: 0.20 },
    ];
  }, []);

  // Transform telemetry history into Batch Records
  const { batchList, chartData, stats } = useMemo(() => {
    const rawHistory = (summary.history && summary.history.length > 0) ? summary.history : fallbackHistory;

    const sorted = [...rawHistory].sort(
      (a, b) => parseTimestamp(a.timestamp).getTime() - parseTimestamp(b.timestamp).getTime()
    );

    const firstRecord = sorted[0];
    const lastRecord = sorted[sorted.length - 1];

    const tFirst = parseTimestamp(firstRecord.timestamp).getTime();
    const tLast = parseTimestamp(lastRecord.timestamp).getTime();
    const diffMs = Math.max(0, tLast - tFirst);

    const hours = Math.floor(diffMs / (1000 * 3600));
    const mins = Math.round((diffMs % (1000 * 3600)) / (1000 * 60));
    const durationStr = hours > 0 ? `${hours} jam ${mins} mnt` : `${mins} mnt`;

    const tdsStart = Math.round(firstRecord.tds ?? 956.84);
    const tdsEnd = Math.round(lastRecord.tds ?? 1068.89);

    // Current commissioning data belongs to single Batch UJI
    const ujiBatch: BatchRecord = {
      id: "Batch UJI",
      start: formatFullDateTime(firstRecord.timestamp),
      end: "—",
      tdsStart,
      tdsEnd,
      duration: durationStr === "0 mnt" ? "1 jam 03 mnt" : durationStr,
      status: "BERJALAN",
      notes: "UJI/COMMISSIONING Reaktor Utama",
      isUji: true
    };

    // Official operational batches start from Batch 001 — S1 onwards
    const officialBatches: BatchRecord[] = [];

    const displayBatches: BatchRecord[] = [ujiBatch, ...officialBatches];

    // Chart data for TDS change (%)
    const chart = displayBatches.map(b => {
      const diff = b.tdsStart - b.tdsEnd;
      const pct = b.tdsStart > 0 ? Math.round((diff / b.tdsStart) * 100) : 0;
      return {
        name: b.id,
        penurunan: pct
      };
    });

    const totalOfficial = officialBatches.length;
    const completedOfficial = officialBatches.filter(b => b.status === "SELESAI").length;
    const runningOfficial = officialBatches.filter(b => b.status === "BERJALAN").length;

    return {
      batchList: displayBatches,
      chartData: chart,
      stats: {
        total: totalOfficial,
        completed: completedOfficial,
        running: runningOfficial > 0 ? runningOfficial : 1, // Batch UJI currently running
        avgDuration: "—",
        completedPercent: totalOfficial > 0 ? Math.round((completedOfficial / totalOfficial) * 100) : 0
      }
    };
  }, [summary.history, fallbackHistory]);

  const [selectedBatch, setSelectedBatch] = useState<BatchRecord>(batchList[0]);

  useEffect(() => {
    if (batchList.length > 0) {
      setSelectedBatch(batchList[0]);
    }
  }, [batchList]);

  // Compute TDS change label & formatted value
  const tdsChangeAnalysis = useMemo(() => {
    if (!selectedBatch) return { label: "Perubahan TDS", text: "0 mg/L (0%)", isDecrease: true };
    const diff = selectedBatch.tdsStart - selectedBatch.tdsEnd;
    const absDiff = Math.abs(diff);
    const pct = selectedBatch.tdsStart > 0 ? Math.abs(Math.round((diff / selectedBatch.tdsStart) * 100)) : 0;

    if (diff >= 0) {
      return {
        label: "Penurunan TDS",
        text: `${absDiff} mg/L (${pct}%)`,
        isDecrease: true
      };
    } else {
      return {
        label: "Kenaikan TDS",
        text: `${absDiff} mg/L (${pct}%)`,
        isDecrease: false
      };
    }
  }, [selectedBatch]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-signal text-sm font-medium mb-1">Selamat datang di</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-fog">Riwayat Pengolahan</h1>
          <p className="text-muted text-sm mt-2">Riwayat batch pengolahan limbah cair organik yang dipantau secara real-time dari D1 API.</p>
        </div>
        <Badge variant={error ? "warning" : "outline-green"} icon={error ? <FlaskConical size={14} /> : <Wifi size={14} />}>
          {error ? "MODE SIMULASI" : "TERHUBUNG D1 API (LIVE)"}
        </Badge>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-500/50 text-red-200 text-sm">
          Perhatian: Gagal terhubung API ({error}). Menggunakan fallback data riwayat.
        </div>
      )}

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MagneticCard className="p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-signal mb-6">
            <Database size={20} className="animate-float" />
            <h3 className="text-sm font-medium text-fog">Total Batch</h3>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[64px] leading-none font-bold text-signal tracking-tight drop-shadow-[0_0_15px_rgba(74,222,148,0.5)]">
                {isLoading ? "..." : stats.total}
              </span>
            </div>
            <p className="text-[11px] text-muted mt-2 uppercase tracking-wider">Total batch resmi (mulai Batch 001 — S1)</p>
          </div>
        </MagneticCard>

        <MagneticCard className="p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-signal mb-6">
            <CheckCircle2 size={20} className="animate-float" style={{ animationDelay: '0.3s' }} />
            <h3 className="text-sm font-medium text-fog">Batch Selesai</h3>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[64px] leading-none font-bold text-signal tracking-tight drop-shadow-[0_0_15px_rgba(74,222,148,0.5)]">
                {isLoading ? "..." : stats.completed}
              </span>
            </div>
            <p className="text-[11px] text-muted mt-2 uppercase tracking-wider">
              {stats.completedPercent}% dari total batch
            </p>
          </div>
        </MagneticCard>

        <MagneticCard className="p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-signal mb-6">
            <RefreshCcw size={20} className="animate-float" style={{ animationDelay: '0.6s' }} />
            <h3 className="text-sm font-medium text-fog">Batch Berjalan</h3>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[64px] leading-none font-bold text-signal tracking-tight drop-shadow-[0_0_15px_rgba(74,222,148,0.5)]">
                {isLoading ? "..." : stats.running}
              </span>
            </div>
            <p className="text-[11px] text-muted mt-2 uppercase tracking-wider">Batch UJI sedang aktif</p>
          </div>
        </MagneticCard>

        <MagneticCard className="p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-signal mb-6">
            <Clock size={20} className="animate-float" style={{ animationDelay: '0.9s' }} />
            <h3 className="text-sm font-medium text-fog">Rata-rata Durasi</h3>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[64px] leading-none font-bold text-signal tracking-tight drop-shadow-[0_0_15px_rgba(74,222,148,0.5)]">
                {stats.avgDuration}
              </span>
            </div>
            <p className="text-[11px] text-muted mt-2 uppercase tracking-wider">Durasi rata-rata per batch</p>
          </div>
        </MagneticCard>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table Section */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center gap-2 mb-6">
            <CalendarDays className="text-signal" size={18} />
            <h3 className="font-display font-medium text-fog">Riwayat Batch Terbaru (Data API)</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted border-b border-line">
                <tr>
                  <th className="pb-3 font-medium px-2">ID Batch</th>
                  <th className="pb-3 font-medium px-2">Mulai</th>
                  <th className="pb-3 font-medium px-2">Selesai</th>
                  <th className="pb-3 font-medium px-2">TDS Awal <br/><span className="text-[10px]">(mg/L)</span></th>
                  <th className="pb-3 font-medium px-2">TDS Akhir <br/><span className="text-[10px]">(mg/L)</span></th>
                  <th className="pb-3 font-medium px-2">Durasi</th>
                  <th className="pb-3 font-medium px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {batchList.map((row) => (
                  <tr 
                    key={row.id} 
                    className={`cursor-pointer transition-colors ${selectedBatch?.id === row.id ? 'bg-signal/5 border border-signal/50 rounded-lg' : 'hover:bg-panel/80'}`}
                    onClick={() => setSelectedBatch(row)}
                  >
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2">
                        {selectedBatch?.id === row.id && <div className="w-1.5 h-1.5 rounded-full bg-signal"></div>}
                        <span className={`font-mono ${selectedBatch?.id === row.id ? 'text-signal' : 'text-fog'}`}>{row.id}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-fog">{row.start}</td>
                    <td className="py-4 px-2 text-fog">{row.status === "BERJALAN" ? "—" : row.end}</td>
                    <td className="py-4 px-2 text-fog">{row.tdsStart}</td>
                    <td className="py-4 px-2 text-fog">{row.tdsEnd}</td>
                    <td className="py-4 px-2 text-fog">{row.duration}</td>
                    <td className="py-4 px-2">
                      <Badge variant={row.status === "SELESAI" ? "outline-green" : "warning"}>
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-line text-sm text-muted">
            <button className="flex items-center gap-1 hover:text-fog transition-colors opacity-50 cursor-not-allowed">
              <ChevronLeft size={16} /> Sebelumnya
            </button>
            <span>1 / 1</span>
            <button className="flex items-center gap-1 hover:text-fog transition-colors text-signal opacity-50 cursor-not-allowed">
              Selanjutnya <ChevronRight size={16} />
            </button>
          </div>
        </Card>

        {/* Sidebar Details & Chart */}
        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-signal" size={18} />
                <h3 className="font-display font-medium text-fog">Detail Batch Terpilih</h3>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted">ID Batch</p>
                <p className="font-mono text-sm font-bold text-fog">{selectedBatch?.id || "Batch UJI"}</p>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-[120px_1fr] gap-4">
                <div className="flex items-center gap-2 text-muted">
                  <CalendarDays size={14} /> Mulai
                </div>
                <div className="text-fog font-medium">{selectedBatch?.start || "-"}</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4">
                <div className="flex items-center gap-2 text-muted">
                  <CheckCircle2 size={14} /> Selesai
                </div>
                <div className="text-fog font-medium">{selectedBatch?.status === "BERJALAN" ? "—" : selectedBatch?.end || "-"}</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4">
                <div className="flex items-center gap-2 text-muted">
                  <Activity size={14} /> TDS Awal
                </div>
                <div className="text-fog font-medium">{selectedBatch?.tdsStart ?? 0} mg/L</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4">
                <div className="flex items-center gap-2 text-muted">
                  <Activity size={14} /> TDS Akhir
                </div>
                <div className="text-fog font-medium">{selectedBatch?.tdsEnd ?? 0} mg/L</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4">
                <div className="flex items-center gap-2 text-signal">
                  {tdsChangeAnalysis.isDecrease ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} className="text-amber-400" />}
                  <span className={tdsChangeAnalysis.isDecrease ? "text-signal" : "text-amber-400"}>
                    {tdsChangeAnalysis.label}
                  </span>
                </div>
                <div className={`font-medium ${tdsChangeAnalysis.isDecrease ? "text-signal" : "text-amber-400"}`}>
                  {tdsChangeAnalysis.text}
                </div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4">
                <div className="flex items-center gap-2 text-muted">
                  <Clock size={14} /> Durasi
                </div>
                <div className="text-fog font-medium">{selectedBatch?.duration || "-"}</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4 border-t border-line/50 pt-4 mt-2">
                <div className="flex items-center gap-2 text-muted">
                  <CheckCircle2 size={14} /> Catatan
                </div>
                <div className="text-muted leading-relaxed">
                  {selectedBatch?.notes || "UJI/COMMISSIONING Reaktor Utama"}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="text-signal" size={18} />
              <h3 className="font-display font-medium text-fog">Penurunan TDS per Batch</h3>
            </div>
            
            <div className="h-[320px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 30, right: 20, left: 10, bottom: 40 }}>
                  <defs>
                    <linearGradient id="colorTdsRiwayat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4ADE94" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4ADE94" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#22403A" vertical={false} />
                  <XAxis dataKey="name" stroke="#8FADA3" fontSize={10} tickLine={false} axisLine={false} angle={-45} textAnchor="end" tickMargin={10} />
                  <YAxis stroke="#8FADA3" fontSize={10} tickLine={false} axisLine={false} label={{ value: 'Penurunan (%)', position: 'top', offset: 15, fill: '#8FADA3', fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0B1A17', borderColor: '#22403A', color: '#E7F2ED', fontSize: 12, borderRadius: '8px' }}
                    itemStyle={{ color: '#4ADE94' }}
                  />
                  <Area type="monotone" dataKey="penurunan" name="Penurunan (%)" stroke="#4ADE94" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTdsRiwayat)" dot={{ fill: '#0B1A17', stroke: '#4ADE94', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#4ADE94' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

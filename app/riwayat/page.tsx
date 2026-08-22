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
  }, [loadData]);

  // Transform Siklus 1 live API telemetry into Batch 001 — S1 (Newer batch)
  const { batchList, chartData, stats } = useMemo(() => {
    const hasLiveApi = summary.history && summary.history.length > 0;

    let batch001: BatchRecord;

    if (hasLiveApi) {
      const sorted = [...summary.history].sort(
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

      const tdsStart = firstRecord.tds != null ? Number(firstRecord.tds.toFixed(2)) : 0;
      const tdsEnd = lastRecord.tds != null ? Number(lastRecord.tds.toFixed(2)) : 0;

      const isComplete = tdsEnd > 0 && tdsEnd <= 1000;

      batch001 = {
        id: "Batch 001 — S1",
        start: formatFullDateTime(firstRecord.timestamp),
        end: isComplete ? formatFullDateTime(lastRecord.timestamp) : "—",
        tdsStart,
        tdsEnd,
        duration: durationStr === "0 mnt" ? "0 jam 00 mnt" : durationStr,
        status: isComplete ? "SELESAI" : "BERJALAN",
        notes: "Siklus 1 (Live Telemetri Reaktor Utama)",
        isUji: false,
      };
    } else {
      batch001 = {
        id: "Batch 001 — S1",
        start: "—",
        end: "—",
        tdsStart: 0,
        tdsEnd: 0,
        duration: "—",
        status: "BERJALAN",
        notes: "Siklus 1 (Menunggu Telemetri Live ESP32)",
        isUji: false,
      };
    }

    // Display ONLY official cycle batches (Siklus 1, Siklus 2, Siklus 3). Batch UJI removed per request.
    const displayBatches: BatchRecord[] = [batch001];

    // Chart data for TDS change (%) - ONLY official cycles (Siklus 1-3)
    const chart = displayBatches.map((b) => {
      const diff = b.tdsStart - b.tdsEnd;
      const pct = (b.tdsStart > 0 && diff > 0) ? Number(((diff / b.tdsStart) * 100).toFixed(2)) : 0;
      return {
        name: b.id,
        penurunan: pct,
      };
    });

    const totalCount = displayBatches.length;
    const completedCount = displayBatches.filter((b) => b.status === "SELESAI").length;
    const runningCount = displayBatches.filter((b) => b.status === "BERJALAN").length;
    const completedPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return {
      batchList: displayBatches,
      chartData: chart,
      stats: {
        total: totalCount,
        completed: completedCount,
        running: runningCount,
        avgDuration: "—",
        completedPercent: completedPct,
      },
    };
  }, [summary.history]);

  const [selectedBatch, setSelectedBatch] = useState<BatchRecord>(batchList[0]);

  useEffect(() => {
    if (batchList.length > 0) {
      setSelectedBatch(batchList[0]);
    }
  }, [batchList]);

  // Compute TDS change label & formatted value with max 2 decimals (e.g. 2,28 mg/L (0,19%))
  const tdsChangeAnalysis = useMemo(() => {
    if (!selectedBatch || selectedBatch.tdsStart === 0) {
      return { label: "Perubahan TDS", text: "0,00 mg/L (0,00%)", isDecrease: true };
    }
    const diff = selectedBatch.tdsStart - selectedBatch.tdsEnd;
    const absDiff = Math.abs(diff);
    const absDiffFormatted = absDiff.toFixed(2).replace('.', ',');
    const pct = (absDiff / selectedBatch.tdsStart) * 100;
    const pctFormatted = pct.toFixed(2).replace('.', ',');

    if (diff >= 0) {
      return {
        label: "Penurunan TDS",
        text: `${absDiffFormatted} mg/L (${pctFormatted}%)`,
        isDecrease: true
      };
    } else {
      return {
        label: "Kenaikan TDS",
        text: `${absDiffFormatted} mg/L (${pctFormatted}%)`,
        isDecrease: false
      };
    }
  }, [selectedBatch]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <p className="text-signal text-xs sm:text-sm font-medium mb-1">Selamat datang di</p>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold text-fog"><TypewriterText text="Riwayat Pengolahan" /></h1>
          <p className="text-muted text-xs sm:text-sm mt-1.5 sm:mt-2 leading-relaxed">Riwayat batch pengolahan limbah cair organik yang dipantau secara real-time dari D1 API.</p>
        </div>
        <div className="self-start md:self-auto flex-shrink-0">
          <Badge variant={error ? "warning" : "outline-green"} icon={error ? <FlaskConical size={14} /> : <Wifi size={14} />}>
            {error ? "MODE SIMULASI" : "TERHUBUNG D1 API (LIVE)"}
          </Badge>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          Perhatian: Gagal terhubung API ({error}). Menggunakan fallback data riwayat.
        </div>
      )}

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
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
            <p className="text-[11px] text-muted mt-2 uppercase tracking-wider">TOTAL BATCH RESMI</p>
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
              {stats.completedPercent}% DARI TOTAL BATCH
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
            <p className="text-[11px] text-muted mt-2 uppercase tracking-wider">
              {selectedBatch?.id ? `${selectedBatch.id.toUpperCase()} SEDANG AKTIF` : "BATCH 001 — S1 SEDANG AKTIF"}
            </p>
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
            <p className="text-[11px] text-muted mt-2 uppercase tracking-wider">DURASI RATA-RATA PER BATCH</p>
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
                    <td className="py-4 px-2 text-fog font-mono">{typeof row.tdsStart === 'number' ? row.tdsStart.toFixed(2).replace('.', ',') : row.tdsStart}</td>
                    <td className="py-4 px-2 text-fog font-mono">{typeof row.tdsEnd === 'number' ? row.tdsEnd.toFixed(2).replace('.', ',') : row.tdsEnd}</td>
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
                <p className="font-mono text-sm font-bold text-fog">{selectedBatch?.id || "Batch 001 — S1"}</p>
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
                <div className="text-fog font-medium font-mono">{selectedBatch?.tdsStart != null ? selectedBatch.tdsStart.toFixed(2).replace('.', ',') : "0,00"} mg/L</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4">
                <div className="flex items-center gap-2 text-muted">
                  <Activity size={14} /> TDS Akhir
                </div>
                <div className="text-fog font-medium font-mono">{selectedBatch?.tdsEnd != null ? selectedBatch.tdsEnd.toFixed(2).replace('.', ',') : "0,00"} mg/L</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4">
                <div className="flex items-center gap-2 text-signal">
                  {tdsChangeAnalysis.isDecrease ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} className="text-amber-400" />}
                  <span className={tdsChangeAnalysis.isDecrease ? "text-signal" : "text-amber-400"}>
                    {tdsChangeAnalysis.label}
                  </span>
                </div>
                <div className={`font-medium font-mono ${tdsChangeAnalysis.isDecrease ? "text-signal" : "text-amber-400"}`}>
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
                  {selectedBatch?.notes || "Siklus 1 (Live Telemetri Reaktor Utama)"}
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
                      <stop offset="5%" stopColor="#0284C7" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#0284C7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} angle={-45} textAnchor="end" tickMargin={10} />
                  <YAxis 
                    stroke="#64748B" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    label={{ value: 'Penurunan (%)', position: 'top', offset: 15, fill: '#64748B', fontSize: 10 }} 
                    domain={[0, 'auto']} 
                    tickFormatter={(v) => `${typeof v === 'number' ? v.toFixed(2).replace('.', ',') : v}%`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', color: '#0F172A', fontSize: 12, borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    itemStyle={{ color: '#0284C7' }}
                    formatter={(value: any) => [`${typeof value === 'number' ? value.toFixed(2).replace('.', ',') : value}%`, 'Penurunan']}
                  />
                  <Area type="monotone" dataKey="penurunan" name="Penurunan (%)" stroke="#0284C7" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTdsRiwayat)" dot={{ fill: '#FFFFFF', stroke: '#0284C7', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#0284C7' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

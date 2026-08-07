"use client";
import React, { useState } from "react";
import MagneticCard from "@/components/MagneticCard";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { 
  Database, CheckCircle2, RefreshCcw, Clock, ArrowRight, ArrowDownRight, 
  Activity, CalendarDays, History, ChevronLeft, ChevronRight, FlaskConical 
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

// Mock Data for History
const batchData = [
  { id: "B-001", start: "16 Mei 2025, 08:00", end: "16 Mei 2025, 20:15", tdsStart: 642, tdsEnd: 152, duration: "12 jam 15 mnt", status: "Selesai" },
  { id: "B-002", start: "15 Mei 2025, 09:10", end: "15 Mei 2025, 23:05", tdsStart: 598, tdsEnd: 141, duration: "13 jam 55 mnt", status: "Selesai" },
  { id: "B-003", start: "14 Mei 2025, 08:20", end: "14 Mei 2025, 21:40", tdsStart: 612, tdsEnd: 163, duration: "13 jam 20 mnt", status: "Selesai" },
  { id: "B-004", start: "13 Mei 2025, 07:50", end: "13 Mei 2025, 18:35", tdsStart: 655, tdsEnd: 178, duration: "10 jam 45 mnt", status: "Perlu Evaluasi" },
  { id: "B-005", start: "12 Mei 2025, 08:05", end: "12 Mei 2025, 19:20", tdsStart: 589, tdsEnd: 135, duration: "11 jam 15 mnt", status: "Selesai" },
  { id: "B-006", start: "11 Mei 2025, 09:00", end: "11 Mei 2025, 21:30", tdsStart: 601, tdsEnd: 149, duration: "12 jam 30 mnt", status: "Selesai" },
  { id: "B-007", start: "10 Mei 2025, 08:30", end: "10 Mei 2025, 22:10", tdsStart: 640, tdsEnd: 190, duration: "13 jam 40 mnt", status: "Perlu Evaluasi" },
  { id: "B-008", start: "9 Mei 2025, 07:45", end: "9 Mei 2025, 18:55", tdsStart: 572, tdsEnd: 128, duration: "11 jam 10 mnt", status: "Selesai" },
  { id: "B-009", start: "8 Mei 2025, 08:15", end: "8 Mei 2025, 20:25", tdsStart: 610, tdsEnd: 154, duration: "12 jam 10 mnt", status: "Selesai" },
  { id: "B-010", start: "7 Mei 2025, 08:00", end: "7 Mei 2025, 19:00", tdsStart: 595, tdsEnd: 170, duration: "11 jam 00 mnt", status: "Selesai" },
];

const chartData = batchData.map(b => ({
  name: b.id,
  penurunan: Math.round(((b.tdsStart - b.tdsEnd) / b.tdsStart) * 100)
})).reverse();

export default function RiwayatPage() {
  const [selectedBatch, setSelectedBatch] = useState(batchData[0]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-sky-600 text-sm font-semibold mb-1">Selamat datang di</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-slate-900 drop-shadow-sm">Riwayat Pengolahan</h1>
          <p className="text-slate-600 text-sm mt-2 font-medium">Riwayat batch pengolahan limbah cair organik yang telah dipantau oleh SMART-MFC.</p>
        </div>
        <Badge variant="warning" icon={<FlaskConical size={14} />}>
          DATA DEMO / LATIHAN WEB
        </Badge>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MagneticCard className="p-6 flex flex-col justify-between border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
          <div className="flex items-center gap-2 text-sky-600 mb-6">
            <Database size={20} className="animate-float" />
            <h3 className="text-sm font-semibold text-slate-700">Total Batch</h3>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[64px] leading-none font-bold text-sky-600 tracking-tight">12</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 uppercase tracking-wider font-medium">Total seluruh batch</p>
          </div>
        </MagneticCard>

        <MagneticCard className="p-6 flex flex-col justify-between border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
          <div className="flex items-center gap-2 text-sky-600 mb-6">
            <CheckCircle2 size={20} className="animate-float" style={{ animationDelay: '0.3s' }} />
            <h3 className="text-sm font-semibold text-slate-700">Batch Selesai</h3>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[64px] leading-none font-bold text-sky-600 tracking-tight">9</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 uppercase tracking-wider font-medium">75% dari total batch</p>
          </div>
        </MagneticCard>

        <MagneticCard className="p-6 flex flex-col justify-between border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
          <div className="flex items-center gap-2 text-sky-600 mb-6">
            <RefreshCcw size={20} className="animate-float" style={{ animationDelay: '0.6s' }} />
            <h3 className="text-sm font-semibold text-slate-700">Batch Berjalan</h3>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[64px] leading-none font-bold text-sky-600 tracking-tight">1</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 uppercase tracking-wider font-medium">Sedang dalam proses</p>
          </div>
        </MagneticCard>

        <MagneticCard className="p-6 flex flex-col justify-between border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
          <div className="flex items-center gap-2 text-sky-600 mb-6">
            <Clock size={20} className="animate-float" style={{ animationDelay: '0.9s' }} />
            <h3 className="text-sm font-semibold text-slate-700">Rata-rata Durasi</h3>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[64px] leading-none font-bold text-sky-600 tracking-tight">19</span>
              <span className="text-slate-500 text-lg font-medium">jam</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 uppercase tracking-wider font-medium">Durasi rata-rata per batch</p>
          </div>
        </MagneticCard>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table Section */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center gap-2 mb-6">
            <CalendarDays className="text-sky-600" size={18} />
            <h3 className="font-display font-semibold text-slate-900">Riwayat Batch Terbaru</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 border-b border-sky-900/10 font-semibold">
                <tr>
                  <th className="pb-3 px-2">ID Batch</th>
                  <th className="pb-3 px-2">Mulai</th>
                  <th className="pb-3 px-2">Selesai</th>
                  <th className="pb-3 px-2">TDS Awal <br/><span className="text-[10px]">(ppm)</span></th>
                  <th className="pb-3 px-2">TDS Akhir <br/><span className="text-[10px]">(ppm)</span></th>
                  <th className="pb-3 px-2">Durasi</th>
                  <th className="pb-3 px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-900/10">
                {batchData.map((row) => (
                  <tr 
                    key={row.id} 
                    className={`cursor-pointer transition-colors ${selectedBatch.id === row.id ? 'bg-sky-50/90 border border-sky-300 rounded-lg' : 'hover:bg-sky-50/40'}`}
                    onClick={() => setSelectedBatch(row)}
                  >
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2">
                        {selectedBatch.id === row.id && <div className="w-2 h-2 rounded-full bg-sky-600"></div>}
                        <span className={`font-mono ${selectedBatch.id === row.id ? 'text-sky-700 font-bold' : 'text-slate-900'}`}>{row.id}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-slate-700 font-medium">{row.start}</td>
                    <td className="py-4 px-2 text-slate-700 font-medium">{row.end}</td>
                    <td className="py-4 px-2 text-slate-700 font-medium">{row.tdsStart}</td>
                    <td className="py-4 px-2 text-slate-700 font-medium">{row.tdsEnd}</td>
                    <td className="py-4 px-2 text-slate-700 font-medium">{row.duration}</td>
                    <td className="py-4 px-2">
                      <Badge variant={row.status === "Selesai" ? "outline-green" : "warning"}>
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-sky-900/10 text-sm text-slate-500 font-medium">
            <button className="flex items-center gap-1 hover:text-slate-800 transition-colors opacity-50 cursor-not-allowed">
              <ChevronLeft size={16} /> Sebelumnya
            </button>
            <span>1 / 2</span>
            <button className="flex items-center gap-1 hover:text-slate-900 transition-colors text-sky-600 font-semibold">
              Selanjutnya <ChevronRight size={16} />
            </button>
          </div>
        </Card>

        {/* Sidebar Details & Chart */}
        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-sky-600" size={18} />
                <h3 className="font-display font-semibold text-slate-900">Detail Batch Terpilih</h3>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-medium">ID Batch</p>
                <p className="font-mono text-sm font-bold text-sky-700">{selectedBatch.id}</p>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-[120px_1fr] gap-4">
                <div className="flex items-center gap-2 text-slate-500 font-medium">
                  <CalendarDays size={14} /> Mulai
                </div>
                <div className="text-slate-900 font-medium">{selectedBatch.start}</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4">
                <div className="flex items-center gap-2 text-slate-500 font-medium">
                  <CheckCircle2 size={14} /> Selesai
                </div>
                <div className="text-slate-900 font-medium">{selectedBatch.end}</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4">
                <div className="flex items-center gap-2 text-slate-500 font-medium">
                  <Activity size={14} /> TDS Awal
                </div>
                <div className="text-slate-900 font-medium">{selectedBatch.tdsStart} ppm</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4">
                <div className="flex items-center gap-2 text-slate-500 font-medium">
                  <Activity size={14} /> TDS Akhir
                </div>
                <div className="text-slate-900 font-medium">{selectedBatch.tdsEnd} ppm</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4">
                <div className="flex items-center gap-2 text-sky-600 font-semibold">
                  <ArrowDownRight size={14} /> Penurunan
                </div>
                <div className="text-sky-700 font-bold">
                  {selectedBatch.tdsStart - selectedBatch.tdsEnd} ppm ({Math.round(((selectedBatch.tdsStart - selectedBatch.tdsEnd) / selectedBatch.tdsStart) * 100)}%)
                </div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4">
                <div className="flex items-center gap-2 text-slate-500 font-medium">
                  <Clock size={14} /> Durasi
                </div>
                <div className="text-slate-900 font-medium">{selectedBatch.duration}</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4 border-t border-sky-900/10 pt-4 mt-2">
                <div className="flex items-center gap-2 text-slate-500 font-medium">
                  <CheckCircle2 size={14} /> Catatan
                </div>
                <div className="text-slate-600 leading-relaxed font-medium">
                  Kondisi stabil. Penurunan TDS optimal, sistem bekerja normal.
                </div>
              </div>
            </div>

            <button className="w-full mt-6 py-2.5 rounded-xl border border-sky-600 text-sky-700 hover:bg-sky-50 transition-colors flex items-center justify-center gap-2 text-sm font-semibold shadow-sm">
              <Activity size={16} /> Lihat Grafik
            </button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="text-sky-600" size={18} />
              <h3 className="font-display font-semibold text-slate-900">Penurunan TDS per Batch</h3>
            </div>
            
            <div className="h-[320px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 30, right: 20, left: 10, bottom: 40 }}>
                  <defs>
                    <linearGradient id="colorTdsRiwayat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284C7" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#0284C7" stopOpacity={0.02}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} angle={-45} textAnchor="end" tickMargin={10} />
                  <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} label={{ value: 'Penurunan (%)', position: 'top', offset: 15, fill: '#64748B', fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(2,132,199,0.2)', color: '#0F172A', fontSize: 12, borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
                    itemStyle={{ color: '#0284C7', fontWeight: 'bold' }}
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

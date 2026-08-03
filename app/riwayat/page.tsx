"use client";
import React, { useState } from "react";
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
          <p className="text-signal text-sm font-medium mb-1">Selamat datang di</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-fog">Riwayat Pengolahan</h1>
          <p className="text-muted text-sm mt-2">Riwayat batch pengolahan limbah cair organik yang telah dipantau oleh SMART-MFC.</p>
        </div>
        <Badge variant="warning" icon={<FlaskConical size={14} />}>
          DATA DEMO / LATIHAN WEB
        </Badge>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-signal mb-6">
            <Database size={20} />
            <h3 className="text-sm font-medium text-fog">Total Batch</h3>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[64px] leading-none font-bold text-signal tracking-tight drop-shadow-[0_0_15px_rgba(74,222,148,0.5)]">12</span>
            </div>
            <p className="text-[11px] text-muted mt-2 uppercase tracking-wider">Total seluruh batch</p>
          </div>
        </Card>

        <Card className="p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-signal mb-6">
            <CheckCircle2 size={20} />
            <h3 className="text-sm font-medium text-fog">Batch Selesai</h3>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[64px] leading-none font-bold text-signal tracking-tight drop-shadow-[0_0_15px_rgba(74,222,148,0.5)]">9</span>
            </div>
            <p className="text-[11px] text-muted mt-2 uppercase tracking-wider">75% dari total batch</p>
          </div>
        </Card>

        <Card className="p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-signal mb-6">
            <RefreshCcw size={20} />
            <h3 className="text-sm font-medium text-fog">Batch Berjalan</h3>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[64px] leading-none font-bold text-signal tracking-tight drop-shadow-[0_0_15px_rgba(74,222,148,0.5)]">1</span>
            </div>
            <p className="text-[11px] text-muted mt-2 uppercase tracking-wider">Sedang dalam proses</p>
          </div>
        </Card>

        <Card className="p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-signal mb-6">
            <Clock size={20} />
            <h3 className="text-sm font-medium text-fog">Rata-rata Durasi</h3>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[64px] leading-none font-bold text-signal tracking-tight drop-shadow-[0_0_15px_rgba(74,222,148,0.5)]">19</span>
              <span className="text-muted text-lg font-medium">jam</span>
            </div>
            <p className="text-[11px] text-muted mt-2 uppercase tracking-wider">Durasi rata-rata per batch</p>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table Section */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center gap-2 mb-6">
            <CalendarDays className="text-signal" size={18} />
            <h3 className="font-display font-medium text-fog">Riwayat Batch Terbaru</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted border-b border-line">
                <tr>
                  <th className="pb-3 font-medium px-2">ID Batch</th>
                  <th className="pb-3 font-medium px-2">Mulai</th>
                  <th className="pb-3 font-medium px-2">Selesai</th>
                  <th className="pb-3 font-medium px-2">TDS Awal <br/><span className="text-[10px]">(ppm)</span></th>
                  <th className="pb-3 font-medium px-2">TDS Akhir <br/><span className="text-[10px]">(ppm)</span></th>
                  <th className="pb-3 font-medium px-2">Durasi</th>
                  <th className="pb-3 font-medium px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {batchData.map((row) => (
                  <tr 
                    key={row.id} 
                    className={`cursor-pointer transition-colors ${selectedBatch.id === row.id ? 'bg-signal/5 border border-signal/50 rounded-lg' : 'hover:bg-panel/80'}`}
                    onClick={() => setSelectedBatch(row)}
                  >
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2">
                        {selectedBatch.id === row.id && <div className="w-1.5 h-1.5 rounded-full bg-signal"></div>}
                        <span className={`font-mono ${selectedBatch.id === row.id ? 'text-signal' : 'text-fog'}`}>{row.id}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-fog">{row.start}</td>
                    <td className="py-4 px-2 text-fog">{row.end}</td>
                    <td className="py-4 px-2 text-fog">{row.tdsStart}</td>
                    <td className="py-4 px-2 text-fog">{row.tdsEnd}</td>
                    <td className="py-4 px-2 text-fog">{row.duration}</td>
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

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-line text-sm text-muted">
            <button className="flex items-center gap-1 hover:text-fog transition-colors opacity-50 cursor-not-allowed">
              <ChevronLeft size={16} /> Sebelumnya
            </button>
            <span>1 / 2</span>
            <button className="flex items-center gap-1 hover:text-fog transition-colors text-signal">
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
                <p className="font-mono text-sm font-bold text-fog">{selectedBatch.id}</p>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-[120px_1fr] gap-4">
                <div className="flex items-center gap-2 text-muted">
                  <CalendarDays size={14} /> Mulai
                </div>
                <div className="text-fog font-medium">{selectedBatch.start}</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4">
                <div className="flex items-center gap-2 text-muted">
                  <CheckCircle2 size={14} /> Selesai
                </div>
                <div className="text-fog font-medium">{selectedBatch.end}</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4">
                <div className="flex items-center gap-2 text-muted">
                  <Activity size={14} /> TDS Awal
                </div>
                <div className="text-fog font-medium">{selectedBatch.tdsStart} ppm</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4">
                <div className="flex items-center gap-2 text-muted">
                  <Activity size={14} /> TDS Akhir
                </div>
                <div className="text-fog font-medium">{selectedBatch.tdsEnd} ppm</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4">
                <div className="flex items-center gap-2 text-signal">
                  <ArrowDownRight size={14} /> Penurunan
                </div>
                <div className="text-signal font-medium">
                  {selectedBatch.tdsStart - selectedBatch.tdsEnd} ppm ({Math.round(((selectedBatch.tdsStart - selectedBatch.tdsEnd) / selectedBatch.tdsStart) * 100)}%)
                </div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4">
                <div className="flex items-center gap-2 text-muted">
                  <Clock size={14} /> Durasi
                </div>
                <div className="text-fog font-medium">{selectedBatch.duration}</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4 border-t border-line/50 pt-4 mt-2">
                <div className="flex items-center gap-2 text-muted">
                  <CheckCircle2 size={14} /> Catatan
                </div>
                <div className="text-muted leading-relaxed">
                  Kondisi stabil. Penurunan TDS optimal, sistem bekerja normal.
                </div>
              </div>
            </div>

            <button className="w-full mt-6 py-2.5 rounded-lg border border-signal text-signal hover:bg-signal/10 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
              <Activity size={16} /> Lihat Grafik
            </button>
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

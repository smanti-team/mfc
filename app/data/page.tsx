"use client";
import React, { useState } from "react";
import MagneticCard from "@/components/MagneticCard";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { 
  Download, Database, Clock, LineChart as ChartIcon, Target, 
  Activity, Zap, Info
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

// Mock Data for Siklus 1
const mockData = [
  { hour: 0, tds: 528, voltage: 205, prediction: "> 24 jam", status: "Berjalan" },
  { hour: 3, tds: 472, voltage: 264, prediction: "> 24 jam", status: "Berjalan" },
  { hour: 6, tds: 418, voltage: 316, prediction: "> 24 jam", status: "Berjalan" },
  { hour: 9, tds: 367, voltage: 364, prediction: "> 24 jam", status: "Berjalan" },
  { hour: 12, tds: 318, voltage: 404, prediction: "> 24 jam", status: "Berjalan" },
  { hour: 15, tds: 264, voltage: 436, prediction: "≈ 24 jam", status: "Berjalan" },
  { hour: 18, tds: 205, voltage: 460, prediction: "≈ 24 jam", status: "Berjalan" },
  { hour: 21, tds: 148, voltage: 478, prediction: "≈ 24 jam", status: "Berjalan" },
  { hour: 24, tds: 96, voltage: 492, prediction: "24 jam", status: "Target Tercapai" },
];

export default function DataPenelitianPage() {
  const [activeTab, setActiveTab] = useState("Siklus 1");
  const tabs = ["Siklus 1", "Siklus 2", "Siklus 3", "Semua"];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-signal text-sm font-medium mb-1">Selamat datang di</p>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-fog">Data Penelitian</h1>
            <Badge variant="outline-green">KHUSUS PENELITIAN</Badge>
          </div>
          <p className="text-muted text-sm mt-2 max-w-2xl">
            Khusus untuk kebutuhan riset: data siklus, grafik penelitian, regresi, dan korelasi.
          </p>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 border border-signal text-signal rounded-md hover:bg-signal/10 transition-colors text-sm font-medium">
          <Download size={16} /> Download CSV
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

      {/* Top Metrics — hanya 4 ini yang MagneticCard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MagneticCard className="p-6 flex flex-col h-40 relative overflow-hidden">
          <div className="flex items-center gap-2 text-signal mb-2">
            <Database size={20} className="animate-float" />
            <h3 className="text-sm font-medium text-fog">Jumlah Data</h3>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[64px] leading-none font-bold text-signal tracking-tight drop-shadow-[0_0_15px_rgba(74,222,148,0.5)]">24</span>
            </div>
            <p className="text-[11px] text-muted mt-1 uppercase tracking-wider">titik data</p>
          </div>
        </MagneticCard>

        <MagneticCard className="p-6 flex flex-col h-40 relative overflow-hidden">
          <div className="flex items-center gap-2 text-signal mb-2">
            <Clock size={20} className="animate-float" style={{ animationDelay: '0.3s' }} />
            <h3 className="text-sm font-medium text-fog">Interval</h3>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[64px] leading-none font-bold text-signal tracking-tight drop-shadow-[0_0_15px_rgba(74,222,148,0.5)]">3</span>
              <span className="text-muted text-lg font-medium">jam</span>
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
              <span className="font-display text-[64px] leading-none font-bold text-signal tracking-tight drop-shadow-[0_0_15px_rgba(74,222,148,0.5)]">-0.81</span>
            </div>
            <p className="text-[11px] text-muted mt-1 uppercase tracking-wider">korelasi kuat negatif</p>
          </div>
        </MagneticCard>

        <MagneticCard className="p-6 flex flex-col h-40 relative overflow-hidden">
          <div className="flex items-center gap-2 text-signal mb-2">
            <Target size={20} className="animate-float" style={{ animationDelay: '0.9s' }} />
            <h3 className="text-sm font-medium text-fog">R² Regresi</h3>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[64px] leading-none font-bold text-signal tracking-tight drop-shadow-[0_0_15px_rgba(74,222,148,0.5)]">0.89</span>
            </div>
            <p className="text-[11px] text-muted mt-1 uppercase tracking-wider">good fit</p>
          </div>
        </MagneticCard>
      </div>

      {/* Charts — pakai Card biasa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-medium text-fog text-lg">Grafik TDS Penelitian</h3>
          </div>
          <p className="text-muted text-sm mb-6">Perubahan TDS terhadap waktu (Siklus 1)</p>
          
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockData} margin={{ top: 30, right: 10, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorTdsData" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ADE94" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4ADE94" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#22403A" vertical={false} />
                <XAxis dataKey="hour" stroke="#8FADA3" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'Jam ke-', position: 'bottom', fill: '#8FADA3', fontSize: 12, offset: 0 }} />
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
          <p className="text-muted text-sm mb-6">Perubahan tegangan terhadap waktu (Siklus 1)</p>
          
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockData} margin={{ top: 30, right: 10, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorVoltData" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ADE94" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4ADE94" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#22403A" vertical={false} />
                <XAxis dataKey="hour" stroke="#8FADA3" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'Jam ke-', position: 'bottom', fill: '#8FADA3', fontSize: 12, offset: 0 }} />
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

      {/* Bottom Section — pakai Card biasa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Data Table */}
        <Card className="p-6">
          <h3 className="font-display font-medium text-fog text-lg mb-4">Raw Data 3 Jam</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted border-b border-line">
                <tr>
                  <th className="pb-3 font-medium px-2">Jam ke-</th>
                  <th className="pb-3 font-medium px-2">TDS (ppm)</th>
                  <th className="pb-3 font-medium px-2">Tegangan (mV)</th>
                  <th className="pb-3 font-medium px-2">Prediksi Sisa Waktu</th>
                  <th className="pb-3 font-medium px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {mockData.map((row) => (
                  <tr key={row.hour} className="hover:bg-panel/50 transition-colors">
                    <td className="py-3 px-2 font-mono text-fog">{row.hour}</td>
                    <td className="py-3 px-2 text-fog">{row.tds}</td>
                    <td className="py-3 px-2 text-fog">{row.voltage}</td>
                    <td className="py-3 px-2 text-fog">{row.prediction}</td>
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
            <h3 className="font-display font-medium text-fog text-lg">Analisis Regresi Linier</h3>
          </div>
          <p className="text-muted text-sm mb-6">Model regresi linier antara waktu (jam ke-) dan TDS (ppm).</p>
          
          <div className="bg-panel/80 rounded-lg p-6 flex flex-col items-center justify-center border border-line mb-8">
            <p className="font-mono text-3xl md:text-4xl text-signal mb-4">y = -52.3<span className="text-fog">x</span> + 1820</p>
            <div className="text-muted text-sm font-mono text-center">
              <p>y = TDS (ppm)</p>
              <p>x = Jam ke-</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-line/50">
              <div className="flex items-center gap-2 text-muted text-sm">
                <Target size={16} /> Target TDS
              </div>
              <div className="font-medium text-signal">≤ 100 ppm</div>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-line/50">
              <div className="flex items-center gap-2 text-muted text-sm">
                <Activity size={16} /> Prediksi target tercapai pada
              </div>
              <div className="font-medium text-signal">jam ke-24</div>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-2 text-muted text-sm">
                <ChartIcon size={16} /> R² (Koefisien Determinasi)
              </div>
              <div className="font-medium text-signal">0.89 (89%)</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-line bg-panel/30 text-muted text-sm">
        <Info size={16} className="text-signal flex-shrink-0" />
        <p>Halaman ini khusus untuk kebutuhan penelitian dan analisis. Bukan halaman operasional utama sistem.</p>
      </div>
    </div>
  );
}

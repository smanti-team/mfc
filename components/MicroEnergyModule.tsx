"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Activity,
  Settings2,
  Zap,
  BarChart3,
  Info,
  ShieldCheck,
  Clock,
  Download,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Wifi,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
  Cell,
} from "recharts";
import { saveTelemetry } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface RowInput {
  menit: number;
  tegangan: string;
  catatan: string;
}

interface SavedRow {
  id: string;
  tanggal: string;
  tahap: string;
  subUji: string;
  menit: number | string;
  tegangan: number | null;
  arus: number | null;   // mA
  daya: number | null;   // mW
  vout: number | null;   // V – used by Phase 3 Step-Up
  catatan: string;
}

interface T1State {
  a: RowInput[];   // 1A – Reaktor Utama
  b: RowInput[];   // 1B – Reaktor Pendukung
  saved: boolean;
}

interface T2State {
  a: RowInput[];               // 2A – Seri Tanpa Beban
  b: (RowInput & { arus?: number | null; daya?: number | null })[];  // 2B – Seri + Beban 10 kΩ
  saved: boolean;
}

interface T3State {
  rows: (RowInput & { vout?: string })[];  // Step-Up rows – Vin + Vout
  saved: boolean;
}

interface T4ARow {
  menit: number;
  vinStepUp: string;
  vBaterai: string;
  indikator: string;
  catatan: string;
}

interface T4BRow {
  percobaan: string;
  esp32: string;
  wifi: string;
  sensor: string;
  catatan: string;
}

interface T4State {
  a: T4ARow[];
  b: T4BRow[];
  saved: boolean;
}

interface MicroEnergyState {
  activePhase: 1 | 2 | 3 | 4;
  t1: T1State;
  t2: T2State;
  t3: T3State;
  t4: T4State;
  history: SavedRow[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const R_BEBAN = 10000; // Ohm

const DEFAULT_STATE: MicroEnergyState = {
  activePhase: 1,
  t1: {
    a: [
      { menit: 0, tegangan: "", catatan: "" },
      { menit: 5, tegangan: "", catatan: "" },
      { menit: 10, tegangan: "", catatan: "" },
    ],
    b: [
      { menit: 0, tegangan: "", catatan: "" },
      { menit: 5, tegangan: "", catatan: "" },
      { menit: 10, tegangan: "", catatan: "" },
    ],
    saved: false,
  },
  t2: {
    a: [
      { menit: 0, tegangan: "", catatan: "" },
      { menit: 5, tegangan: "", catatan: "" },
      { menit: 10, tegangan: "", catatan: "" },
    ],
    b: [
      { menit: 0, tegangan: "", catatan: "" },
      { menit: 5, tegangan: "", catatan: "" },
      { menit: 10, tegangan: "", catatan: "" },
    ],
    saved: false,
  },
  t3: {
    rows: [
      { menit: 0, tegangan: "", vout: "", catatan: "" },
      { menit: 5, tegangan: "", vout: "", catatan: "" },
      { menit: 10, tegangan: "", vout: "", catatan: "" },
    ],
    saved: false,
  },
  t4: {
    a: [
      { menit: 0, vinStepUp: "", vBaterai: "", indikator: "", catatan: "" },
      { menit: 30, vinStepUp: "", vBaterai: "", indikator: "", catatan: "" },
      { menit: 60, vinStepUp: "", vBaterai: "", indikator: "", catatan: "" },
    ],
    b: [
      { percobaan: "Uji 1", esp32: "", wifi: "", sensor: "", catatan: "" },
      { percobaan: "Uji 2", esp32: "", wifi: "", sensor: "", catatan: "" },
    ],
    saved: false,
  },
  history: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function parseV(s: string): number | null {
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? null : n;
}

function fmt(n: number | null, decimals = 2): string {
  if (n === null) return "—";
  return n.toFixed(decimals).replace(".", ",");
}

function calcFromV(v: number | null): { arus: number | null; daya: number | null } {
  if (v === null) return { arus: null, daya: null };
  const i = (v / R_BEBAN) * 1000;        // mA
  const p = (v * v / R_BEBAN) * 1000;    // mW
  return { arus: i, daya: p };
}

function nowStr(): string {
  return new Date().toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function SummaryCard({
  icon, label, value, sub,
}: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center gap-2 text-sky-700">
        <span className="text-sky-600">{icon}</span>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="font-display text-2xl font-bold text-slate-900 leading-tight">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function InputTable({
  rows,
  onChangeV,
  onChangeC,
  disabled,
  extraCols,
}: {
  rows: { menit: number; tegangan: string; catatan: string }[];
  onChangeV: (i: number, v: string) => void;
  onChangeC: (i: number, v: string) => void;
  disabled: boolean;
  extraCols?: React.ReactNode;
}) {
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200">
          <th className="py-2.5 px-3 text-left text-xs font-semibold text-slate-500 w-16">Menit</th>
          <th className="py-2.5 px-3 text-left text-xs font-semibold text-slate-500">Tegangan (V)</th>
          {extraCols}
          <th className="py-2.5 px-3 text-left text-xs font-semibold text-slate-500">Catatan</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.menit} className="border-b border-slate-100 last:border-0">
            <td className="py-2.5 px-3 font-semibold text-slate-700">{row.menit}</td>
            <td className="py-2.5 px-3">
              <input
                type="number"
                step="0.01"
                disabled={disabled}
                value={row.tegangan}
                onChange={e => onChangeV(i, e.target.value)}
                className="w-24 px-2.5 py-1 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="[ketik]"
              />
            </td>
            <td className="py-2.5 px-3">
              <input
                type="text"
                disabled={disabled}
                value={row.catatan}
                onChange={e => onChangeC(i, e.target.value)}
                className="w-full min-w-[80px] px-2.5 py-1 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="[ketik]"
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TujuanBox({ title, children, syarat }: { title: string; children: React.ReactNode; syarat: string }) {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-sky-700 font-semibold text-sm">
          <ShieldCheck size={16} />
          Tujuan &amp; Cara Ukur
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{title}</p>
        <ul className="text-sm text-slate-700 space-y-1 pl-2">
          {children}
        </ul>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-sky-700 font-semibold text-sm mb-2">
          <ShieldCheck size={16} />
          Syarat Lanjut
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{syarat}</p>
      </div>
    </div>
  );
}

function HistoryTable({ rows, currentPhase }: { rows: SavedRow[]; currentPhase: 1 | 2 | 3 | 4 }) {
  const [page, setPage] = useState(1);
  const PER_PAGE = 6;

  const filtered = rows; // show all history
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const isPhase4 = currentPhase === 4;
  const isPhase3 = currentPhase === 3;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
          <Clock size={16} className="text-sky-600" />
          Riwayat Pengujian Micro-Energy
        </div>
        <button
          onClick={() => {
            if (rows.length === 0) return;
            const cols = isPhase4
              ? ["Tanggal & Waktu", "Tahap", "Sub-Uji", "Parameter", "Nilai", "Catatan"]
              : isPhase3
              ? ["Tanggal & Waktu", "Tahap", "Menit", "Vin (V)", "Vout (V)", "Catatan"]
              : ["Tanggal & Waktu", "Tahap", "Sub-Uji", "Menit", "Tegangan (V)", "Arus (mA)", "Daya (mW)", "Catatan"];
            let csv = "\uFEFF" + cols.join(";") + "\n";
            rows.forEach(r => {
              if (isPhase4) {
                csv += `${r.tanggal};${r.tahap};${r.subUji};${r.arus !== null ? "Status" : "Tegangan Baterai (V)"};${r.tegangan !== null ? fmt(r.tegangan, 2) : r.catatan};${r.catatan}\n`;
              } else if (isPhase3) {
                csv += `${r.tanggal};${r.tahap};${r.menit};${r.tegangan !== null ? fmt(r.tegangan, 2) : ""};${r.daya !== null ? fmt(r.daya, 2) : ""};${r.catatan}\n`;
              } else {
                csv += `${r.tanggal};${r.tahap};${r.subUji};${r.menit};${r.tegangan !== null ? fmt(r.tegangan, 2) : "—"};${r.arus !== null ? fmt(r.arus, 2) : "—"};${r.daya !== null ? fmt(r.daya, 2) : "—"};${r.catatan}\n`;
              }
            });
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `micro-energy-${Date.now()}.csv`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
          }}
          disabled={rows.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100 disabled:opacity-40 transition-colors"
        >
          <Download size={14} /> Download CSV Micro-Energy
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">Tanggal &amp; Waktu</th>
              <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">Tahap</th>
              <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">Sub-Uji</th>
              <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">Menit</th>
              <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">Tegangan (V)</th>
              {!isPhase3 && <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">Arus (mA)</th>}
              {!isPhase3 && <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">Daya (mW)</th>}
              <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              [0, 1, 2].map(i => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-2.5 px-4 text-slate-400">—</td>
                  <td className="py-2.5 px-4 text-slate-400">Tahap {currentPhase}</td>
                  <td className="py-2.5 px-4 text-slate-400">—</td>
                  <td className="py-2.5 px-4 text-slate-400">—</td>
                  <td className="py-2.5 px-4 text-slate-400 italic text-sky-400">Belum ada data</td>
                  {!isPhase3 && <td className="py-2.5 px-4 text-slate-400 italic text-sky-400">Belum ada data</td>}
                  {!isPhase3 && <td className="py-2.5 px-4 text-slate-400 italic text-sky-400">Belum ada data</td>}
                  <td className="py-2.5 px-4 text-slate-400">—</td>
                </tr>
              ))
            ) : (
              pageRows.map(r => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                  <td className="py-2.5 px-4 whitespace-nowrap text-slate-600">{r.tanggal}</td>
                  <td className="py-2.5 px-4 whitespace-nowrap text-slate-700 font-medium">{r.tahap}</td>
                  <td className="py-2.5 px-4 whitespace-nowrap text-slate-600">{r.subUji}</td>
                  <td className="py-2.5 px-4 text-slate-600">{r.menit}</td>
                  <td className="py-2.5 px-4 text-slate-800 font-semibold">{r.tegangan !== null ? fmt(r.tegangan, 2) : "—"}</td>
                  {!isPhase3 && <td className="py-2.5 px-4 text-slate-600">{r.arus !== null ? fmt(r.arus, 2) : "—"}</td>}
                  {!isPhase3 && <td className="py-2.5 px-4 text-slate-600">{r.daya !== null ? fmt(r.daya, 2) : "—"}</td>}
                  <td className="py-2.5 px-4 text-slate-500">{r.catatan || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 text-xs text-slate-500">
        <span>Menampilkan {total === 0 ? "0–0" : `${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, total)}`} dari {total} data</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(1)} disabled={page === 1} className="p-1 rounded hover:bg-slate-100 disabled:opacity-40"><ChevronFirst size={14} /></button>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded hover:bg-slate-100 disabled:opacity-40"><ChevronLeft size={14} /></button>
          <span className="px-2 font-semibold text-slate-700">{page}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded hover:bg-slate-100 disabled:opacity-40"><ChevronRight size={14} /></button>
          <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="p-1 rounded hover:bg-slate-100 disabled:opacity-40"><ChevronLast size={14} /></button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 – Tegangan Reaktor
// ─────────────────────────────────────────────────────────────────────────────
function Phase1({
  state, onSave, saving,
  onChangeA, onChangeB,
}: {
  state: T1State;
  onSave: () => void;
  saving: boolean;
  onChangeA: (i: number, field: "tegangan" | "catatan", v: string) => void;
  onChangeB: (i: number, field: "tegangan" | "catatan", v: string) => void;
}) {
  const aVals = state.a.map(r => parseV(r.tegangan));
  const bVals = state.b.map(r => parseV(r.tegangan));
  const aValid = aVals.every(v => v !== null && v > 0);
  const bValid = bVals.every(v => v !== null && v > 0);
  const avgA = aValid ? aVals.reduce((s, v) => s! + v!, 0)! / 3 : null;
  const avgB = bValid ? bVals.reduce((s, v) => s! + v!, 0)! / 3 : null;

  const chartData = [
    { name: "Reaktor Utama", value: avgA ?? 0, placeholder: !avgA },
    { name: "Reaktor Pendukung", value: avgB ?? 0, placeholder: !avgB },
    { name: "Seri 2 Reaktor", value: 0, placeholder: true, label: "Menunggu\ndata" },
  ];

  return (
    <div className="space-y-6">
      {/* Two sub-panels + tujuan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1A */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center">A</span>
            <span className="font-semibold text-sm text-slate-800">Sub-Uji 1A — Reaktor Utama</span>
          </div>
          <InputTable
            rows={state.a}
            disabled={state.saved}
            onChangeV={(i, v) => onChangeA(i, "tegangan", v)}
            onChangeC={(i, v) => onChangeA(i, "catatan", v)}
          />
          <p className="text-xs text-slate-400 flex items-center gap-1"><Info size={12} /> Ukur tanpa beban (open circuit)</p>
          {avgA !== null && <p className="text-xs font-semibold text-slate-600">Rata-rata: <span className="text-sky-700">{fmt(avgA, 2)} V</span></p>}
        </div>

        {/* 1B */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center">B</span>
            <span className="font-semibold text-sm text-slate-800">Sub-Uji 1B — Reaktor Pendukung</span>
          </div>
          <InputTable
            rows={state.b}
            disabled={state.saved}
            onChangeV={(i, v) => onChangeB(i, "tegangan", v)}
            onChangeC={(i, v) => onChangeB(i, "catatan", v)}
          />
          <p className="text-xs text-slate-400 flex items-center gap-1"><Info size={12} /> Ukur tanpa beban (open circuit)</p>
          {avgB !== null && <p className="text-xs font-semibold text-slate-600">Rata-rata: <span className="text-sky-700">{fmt(avgB, 2)} V</span></p>}
        </div>

        {/* Tujuan */}
        <TujuanBox
          title="Tahap 1 bertujuan mengukur tegangan dasar (tanpa beban) pada masing-masing reaktor MFC."
          syarat="Kedua sub-uji (1A dan 1B) harus memiliki 3 pembacaan valid dan polaritas benar sebelum melanjutkan ke Tahap 2."
        >
          <li>• Gunakan multimeter mode DC Volt.</li>
          <li>• Probe merah ke katoda (+).</li>
          <li>• Probe hitam ke anoda (−).</li>
          <li>• Pastikan sambungan stabil dan tidak longgar.</li>
          <li>• Catat tegangan pada menit 0, 5, dan 10.</li>
        </TujuanBox>
      </div>

      {/* Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={16} className="text-sky-600" />
          <span className="font-semibold text-sm text-slate-800">Perbandingan Tegangan Tanpa Beban</span>
          <span className="ml-auto text-xs text-slate-400 flex items-center gap-1 font-mono">- - - - Menunggu data</span>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748B" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} tickFormatter={v => v.toFixed(2)} domain={[0, "dataMax + 0.2"]} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }}
                formatter={(val: number, _name: string, entry: { payload?: { placeholder?: boolean } }) =>
                  entry?.payload?.placeholder ? ["—", "Tegangan"] : [`${fmt(val, 2)} V`, "Tegangan"]
                }
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} label={{ position: "top", fontSize: 11, formatter: (v: number) => (v > 0 ? fmt(v, 2) : "—") }}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.placeholder ? "#DBEAFE" : "#60A5FA"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Save */}
      {!state.saved && (
        <div className="flex justify-end">
          <button
            onClick={onSave}
            disabled={!aValid || !bValid || saving}
            className="px-6 py-2.5 bg-sky-700 text-white text-sm font-semibold rounded-xl shadow hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Menyimpan..." : "Simpan Tahap 1 & Lanjut"}
          </button>
        </div>
      )}
      {state.saved && (
        <div className="flex justify-end">
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">✓ Tahap 1 Tersimpan</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 – Seri & Daya
// ─────────────────────────────────────────────────────────────────────────────
function Phase2({
  state, onSave, saving, prevT1Avg,
  onChangeA, onChangeB,
}: {
  state: T2State;
  onSave: () => void;
  saving: boolean;
  prevT1Avg: { a: number | null; b: number | null };
  onChangeA: (i: number, field: "tegangan" | "catatan", v: string) => void;
  onChangeB: (i: number, field: "tegangan" | "catatan", v: string) => void;
}) {
  const bVals = state.b.map(r => ({ v: parseV(r.tegangan), cat: r.catatan, menit: r.menit }));
  const bCalcs = bVals.map(r => ({ ...r, ...calcFromV(r.v) }));
  const avgV2B = bVals.filter(r => r.v !== null).length === 3 ? bVals.reduce((s, r) => s + (r.v ?? 0), 0) / 3 : null;
  const avgP2B = bCalcs.filter(r => r.daya !== null).length === 3 ? bCalcs.reduce((s, r) => s + (r.daya ?? 0), 0) / 3 : null;

  const aVals = state.a.map(r => parseV(r.tegangan));
  const aValid = aVals.every(v => v !== null && v > 0);
  const bValsValid = bVals.every(r => r.v !== null && r.v > 0);

  const chartData = bCalcs.map(r => ({
    menit: r.menit,
    tegangan: r.v ?? 0,
    daya: r.daya ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 2A */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center">A</span>
            <span className="font-semibold text-sm text-slate-800">Sub-Uji 2A — Seri Tanpa Beban</span>
          </div>
          <InputTable
            rows={state.a}
            disabled={state.saved}
            onChangeV={(i, v) => onChangeA(i, "tegangan", v)}
            onChangeC={(i, v) => onChangeA(i, "catatan", v)}
          />
          <p className="text-xs text-slate-400 flex items-center gap-1"><Info size={12} /> Pengukuran tanpa beban (open circuit)</p>
        </div>

        {/* 2B */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center">B</span>
            <span className="font-semibold text-sm text-slate-800">Sub-Uji 2B — Seri + Beban 10 kΩ</span>
          </div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-500 w-12">Menit</th>
                <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-500">Tegangan Beban (V)</th>
                <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-500">Arus (mA)</th>
                <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-500">Daya (mW)</th>
                <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-500">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {state.b.map((row, i) => {
                const v = parseV(row.tegangan);
                const { arus, daya } = calcFromV(v);
                return (
                  <tr key={row.menit} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 px-2 font-semibold text-slate-700">{row.menit}</td>
                    <td className="py-2 px-2">
                      <input
                        type="number" step="0.01" disabled={state.saved} value={row.tegangan}
                        onChange={e => onChangeB(i, "tegangan", e.target.value)}
                        className="w-20 px-2 py-1 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-slate-50 disabled:text-slate-500"
                        placeholder="[ketik]"
                      />
                    </td>
                    <td className="py-2 px-2 text-slate-700 font-mono text-xs">{arus !== null ? fmt(arus, 2) : "—"}</td>
                    <td className="py-2 px-2 text-slate-700 font-mono text-xs">{daya !== null ? fmt(daya, 2) : "—"}</td>
                    <td className="py-2 px-2">
                      <input
                        type="text" disabled={state.saved} value={row.catatan}
                        onChange={e => onChangeB(i, "catatan", e.target.value)}
                        className="w-full min-w-[60px] px-2 py-1 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-slate-50 disabled:text-slate-500"
                        placeholder="[ketik]"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-slate-400 flex items-center gap-1"><Info size={12} /> Dengan beban resistor 10 kΩ</p>
          {/* Formula */}
          <div className="bg-slate-50 rounded-xl p-3 flex gap-8 text-xs text-slate-600 font-mono">
            <div>
              <div className="font-semibold text-slate-700 mb-1">Rumus Perhitungan<br /><span className="font-normal text-slate-400">(untuk Sub-Uji 2B)</span></div>
              <div>I = <span className="font-bold">V</span> / <span className="font-bold">R</span><br />I = Arus (A)<br />V = Tegangan (V)<br />R = Hambatan (Ω)</div>
            </div>
            <div className="pt-5">
              <div>P = <span className="font-bold">V²</span> / <span className="font-bold">R</span><br />P = Daya (W)<br />V = Tegangan (V)<br />R = Hambatan (Ω)</div>
            </div>
          </div>
        </div>

        {/* Tujuan */}
        <TujuanBox
          title="Tahap 2 bertujuan mengukur kenaikan tegangan melalui rangkaian seri dan menghitung daya saat diberi beban resistor 10 kΩ."
          syarat="Lanjut ke Tahap 3 jika tegangan seri terbaca jelas, polaritas benar, dan pengukuran berbeban menghasilkan nilai yang dapat dihitung."
        >
          <li>• Ukur tegangan dengan multimeter DC Volt.</li>
          <li>• Rangkai 2 reaktor secara seri.</li>
          <li>• Pada sub-uji 2B, pasang resistor 10 kΩ sebagai beban.</li>
          <li>• Catat data pada menit 0, 5, dan 10.</li>
        </TujuanBox>
      </div>

      {/* Chart T2 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 size={16} className="text-sky-600" />
          <span className="font-semibold text-sm text-slate-800">Perbandingan Tegangan &amp; Daya Tahap 2</span>
        </div>
        <p className="text-xs text-slate-400 mb-4 flex items-center gap-1"><Info size={12} /> Beban yang digunakan: resistor 10 kΩ</p>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="menit" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748B" }} label={{ value: "Menit", position: "insideBottomRight", offset: -5, fontSize: 11, fill: "#94A3B8" }} />
              <YAxis yAxisId="v" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} tickFormatter={v => v.toFixed(2)} label={{ value: "Tegangan (V)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#94A3B8" }} />
              <YAxis yAxisId="p" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} tickFormatter={v => v.toFixed(2)} label={{ value: "Daya (mW)", angle: 90, position: "insideRight", fontSize: 11, fill: "#94A3B8" }} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="v" dataKey="tegangan" name="Tegangan Beban (V)" fill="#60A5FA" radius={[4, 4, 0, 0]} label={{ position: "top", fontSize: 10, formatter: (v: number) => v > 0 ? fmt(v, 2) : "" }} />
              <Line yAxisId="p" type="monotone" dataKey="daya" name="Daya (mW)" stroke="#10B981" strokeWidth={2} dot={{ r: 4, fill: "#10B981" }} label={{ fontSize: 10, position: "top" }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {!state.saved && (
        <div className="flex justify-end">
          <button
            onClick={onSave}
            disabled={!aValid || !bValsValid || saving}
            className="px-6 py-2.5 bg-sky-700 text-white text-sm font-semibold rounded-xl shadow hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Menyimpan..." : "Simpan Tahap 2 & Lanjut"}
          </button>
        </div>
      )}
      {state.saved && (
        <div className="flex justify-end">
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">✓ Tahap 2 Tersimpan</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 – Step-Up
// ─────────────────────────────────────────────────────────────────────────────
function Phase3({
  state, onSave, saving,
  onChangeRow, onChangeVout,
}: {
  state: T3State;
  onSave: () => void;
  saving: boolean;
  onChangeRow: (i: number, field: "tegangan" | "catatan", v: string) => void;
  onChangeVout: (i: number, v: string) => void;
}) {
  const vinVals = state.rows.map(r => parseV(r.tegangan));
  const voutVals = state.rows.map(r => parseV((r as { vout?: string }).vout || ""));

  const valid = vinVals.every(v => v !== null) && voutVals.every(v => v !== null);

  const vinMin = vinVals.filter(Boolean).length ? Math.min(...vinVals.filter(v => v !== null) as number[]) : null;
  const vinMax = vinVals.filter(Boolean).length ? Math.max(...vinVals.filter(v => v !== null) as number[]) : null;
  const voutMin = voutVals.filter(Boolean).length ? Math.min(...voutVals.filter(v => v !== null) as number[]) : null;
  const voutMax = voutVals.filter(Boolean).length ? Math.max(...voutVals.filter(v => v !== null) as number[]) : null;
  const vinAvg = vinVals.every(v => v !== null) ? vinVals.reduce((s, v) => s! + v!, 0)! / 3 : null;
  const voutAvg = voutVals.every(v => v !== null) ? voutVals.reduce((s, v) => s! + v!, 0)! / 3 : null;

  const chartData = state.rows.map((r, i) => ({
    menit: r.menit,
    vin: vinVals[i] ?? 0,
    vout: voutVals[i] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
            <BarChart3 size={16} className="text-sky-600" /> Data Uji Step-Up
          </div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-slate-500 w-16">Menit</th>
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-slate-500">Tegangan Masuk Step-Up (Vin)</th>
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-slate-500">Tegangan Keluar Step-Up (Vout)</th>
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-slate-500">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {state.rows.map((row, i) => {
                const vout = (row as { vout?: string }).vout || "";
                return (
                  <tr key={row.menit} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 px-3 font-semibold text-slate-700">{row.menit}</td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number" step="0.01" disabled={state.saved} value={row.tegangan}
                        onChange={e => onChangeRow(i, "tegangan", e.target.value)}
                        className="w-24 px-2.5 py-1 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-slate-50"
                        placeholder="[ketik]"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number" step="0.01" disabled={state.saved} value={vout}
                        onChange={e => onChangeVout(i, e.target.value)}
                        className="w-24 px-2.5 py-1 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-slate-50"
                        placeholder="[ketik]"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text" disabled={state.saved} value={row.catatan}
                        onChange={e => onChangeRow(i, "catatan", e.target.value)}
                        className="w-full min-w-[60px] px-2.5 py-1 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-slate-50"
                        placeholder="[ketik]"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tujuan */}
        <TujuanBox
          title="Tujuan tahap ini untuk memeriksa apakah Step-Up dapat menerima tegangan masuk dari rangkaian seri dan menghasilkan tegangan keluar yang sesuai."
          syarat="Lanjut ke Tahap 4 jika Vout terbaca konsisten dan sistem tetap bekerja saat terhubung ke konfigurasi pengujian berikutnya."
        >
          <li>• Ukur Vin pada terminal input Step-Up.</li>
          <li>• Ukur Vout pada terminal output Step-Up.</li>
          <li>• Catat hasil pengukuran pada menit 0, 5, dan 10.</li>
        </TujuanBox>
      </div>

      {/* Two bottom sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Line chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-sky-600" />
            <span className="font-semibold text-sm text-slate-800">Grafik Vin dan Vout terhadap Waktu</span>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 16, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="menit" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748B" }} label={{ value: "Waktu (Menit)", position: "insideBottom", offset: -10, fontSize: 11, fill: "#94A3B8" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} tickFormatter={v => v.toFixed(2)} label={{ value: "Tegangan (V)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#94A3B8" }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="vout" name="Vout (V)" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} label={{ position: "top", fontSize: 10, formatter: (v: number) => v > 0 ? fmt(v, 2) : "" }} />
                <Line type="monotone" dataKey="vin" name="Vin (V)" stroke="#60A5FA" strokeWidth={2} dot={{ r: 4 }} label={{ position: "bottom", fontSize: 10, formatter: (v: number) => v > 0 ? fmt(v, 2) : "" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary table */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-sky-600" />
            <span className="font-semibold text-sm text-slate-800">Ringkasan Vin / Vout</span>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {[
                { label: "Vin min", val: fmt(vinMin, 2) + " V" },
                { label: "Vin maks", val: fmt(vinMax, 2) + " V" },
                { label: "Vout min", val: fmt(voutMin, 2) + " V" },
                { label: "Vout maks", val: fmt(voutMax, 2) + " V" },
              ].map(row => (
                <tr key={row.label}>
                  <td className="py-2.5 text-slate-600">{row.label}</td>
                  <td className="py-2.5 text-right font-semibold text-slate-800 font-mono">{row.val}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="py-2.5 text-slate-800">Rata-rata</td>
                <td className="py-2.5 text-right text-slate-800 font-mono">Vin {fmt(vinAvg, 2)} / Vout {fmt(voutAvg, 2)} V</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {!state.saved && (
        <div className="flex justify-end">
          <button
            onClick={onSave}
            disabled={!valid || saving}
            className="px-6 py-2.5 bg-sky-700 text-white text-sm font-semibold rounded-xl shadow hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Menyimpan..." : "Simpan Tahap 3 & Lanjut"}
          </button>
        </div>
      )}
      {state.saved && (
        <div className="flex justify-end">
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">✓ Tahap 3 Tersimpan</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 4 – Penyimpanan & ESP32
// ─────────────────────────────────────────────────────────────────────────────
function Phase4({
  state, onSave, saving,
  onChangeA, onChangeB,
}: {
  state: T4State;
  onSave: () => void;
  saving: boolean;
  onChangeA: (i: number, field: keyof T4ARow, v: string) => void;
  onChangeB: (i: number, field: keyof T4BRow, v: string) => void;
}) {
  const vBatVals = state.a.map(r => parseV(r.vBaterai));
  const lastBat = vBatVals.at(-1) ?? null;
  const esp32On = state.b.some(r => r.esp32.toLowerCase().includes("menyala") || r.esp32.toLowerCase().includes("on"));

  const batChartData = state.a.map(r => ({
    menit: r.menit,
    vBat: parseV(r.vBaterai) ?? 0,
  }));

  const esp32Status = esp32On ? "MENYALA" : state.b.some(r => r.esp32) ? "TIDAK" : "—";

  const statusStyle = (s: string) => {
    const low = s.toLowerCase();
    if (low.includes("menyala") || low.includes("terhubung") || low.includes("aktif") || low.includes("normal") || low.includes("on") || low === "charging") {
      return "bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-xs font-semibold";
    }
    if (low.includes("tidak") || low.includes("off")) return "bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full text-xs font-semibold";
    return "text-slate-500 text-xs";
  };

  const aValid = state.a.every(r => r.vBaterai !== "");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 4A */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 lg:col-span-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center">A</span>
            <span className="font-semibold text-sm text-slate-800">Sub-Uji 4A — Penyimpanan Energi</span>
          </div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-500 w-16">Menit</th>
                <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-500">Vin Step-Up (V)</th>
                <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-500">Tegangan Baterai (V)</th>
                <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-500">Indikator TP4056</th>
                <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-500">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {state.a.map((row, i) => (
                <tr key={row.menit} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 px-2 font-semibold text-slate-700">{row.menit}</td>
                  <td className="py-2 px-2">
                    <input type="number" step="0.01" disabled={state.saved} value={row.vinStepUp}
                      onChange={e => onChangeA(i, "vinStepUp", e.target.value)}
                      className="w-20 px-2 py-1 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-slate-50" placeholder="[ketik]" />
                  </td>
                  <td className="py-2 px-2">
                    <input type="number" step="0.01" disabled={state.saved} value={row.vBaterai}
                      onChange={e => onChangeA(i, "vBaterai", e.target.value)}
                      className="w-20 px-2 py-1 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-slate-50" placeholder="[ketik]" />
                  </td>
                  <td className="py-2 px-2">
                    <input type="text" disabled={state.saved} value={row.indikator}
                      onChange={e => onChangeA(i, "indikator", e.target.value)}
                      className="w-24 px-2 py-1 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-slate-50"
                      placeholder="charging / full" />
                  </td>
                  <td className="py-2 px-2">
                    <input type="text" disabled={state.saved} value={row.catatan}
                      onChange={e => onChangeA(i, "catatan", e.target.value)}
                      className="w-full px-2 py-1 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-slate-50" placeholder="[ketik]" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 4B */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center">B</span>
              <span className="font-semibold text-sm text-slate-800">Sub-Uji 4B — Menyalakan ESP32</span>
            </div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-500 w-20">Percobaan</th>
                  <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-500">ESP32</th>
                  <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-500">Wi-Fi</th>
                  <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-500">Sensor</th>
                  <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-500">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {state.b.map((row, i) => (
                  <tr key={row.percobaan} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 px-2 font-semibold text-slate-700">{row.percobaan}</td>
                    {(["esp32", "wifi", "sensor"] as (keyof T4BRow)[]).map(field => (
                      <td key={field} className="py-2 px-2">
                        {state.saved
                          ? <span className={statusStyle(row[field] as string)}>{row[field] || "—"}</span>
                          : <input type="text" value={row[field] as string}
                              onChange={e => onChangeB(i, field, e.target.value)}
                              className="w-24 px-2 py-1 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                              placeholder="Menyala/Tidak" />
                        }
                      </td>
                    ))}
                    <td className="py-2 px-2">
                      <input type="text" disabled={state.saved} value={row.catatan}
                        onChange={e => onChangeB(i, "catatan", e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-slate-50" placeholder="[ketik]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tujuan */}
        <TujuanBox
          title=""
          syarat="Keberhasilan ESP32 tidak otomatis diklaim sepenuhnya berasal dari daya sesaat MFC. Baterai berfungsi sebagai penyimpan energi hasil pengisian sebelum digunakan."
        >
          <li>• Tahap 4A memantau apakah energi hasil MFC melalui Step-Up dapat tersimpan di baterai.</li>
          <li>• Tahap 4B memeriksa apakah energi tersimpan dapat digunakan untuk menyalakan ESP32 dan modul terkait.</li>
          <li>• Ukur Vin/V baterai, amati indikator TP4056, lalu cek status ESP32, Wi-Fi, dan sensor.</li>
        </TujuanBox>
      </div>

      {/* Charts + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Baterai chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-sky-600" />
            <span className="font-semibold text-sm text-slate-800">Grafik Tegangan Baterai terhadap Waktu</span>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={batChartData} margin={{ top: 16, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="menit" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748B" }} label={{ value: "Waktu (menit)", position: "insideBottom", offset: -10, fontSize: 11, fill: "#94A3B8" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} tickFormatter={v => v.toFixed(2)} domain={["dataMin - 0.1", "dataMax + 0.1"]} label={{ value: "Tegangan (V)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#94A3B8" }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }} />
                <Line type="monotone" dataKey="vBat" name="Tegangan Baterai (V)" stroke="#60A5FA" strokeWidth={2} dot={{ r: 4 }} label={{ position: "top", fontSize: 10, formatter: (v: number) => v > 0 ? fmt(v, 2) : "" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ESP32 status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Wifi size={16} className="text-sky-600" />
            <span className="font-semibold text-sm text-slate-800">Status Sistem ESP32</span>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {[
                { label: "ESP32", val: state.b[0]?.esp32 || "—" },
                { label: "Wi-Fi", val: state.b[0]?.wifi || "—" },
                { label: "Sensor", val: state.b[0]?.sensor || "—" },
                { label: "Log Serial", val: state.b[0]?.catatan || "—" },
              ].map(r => (
                <tr key={r.label}>
                  <td className="py-2.5 text-slate-600 font-medium">{r.label}</td>
                  <td className="py-2.5 text-right">
                    <span className={statusStyle(r.val)}>{r.val}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!state.saved && (
        <div className="flex justify-end">
          <button
            onClick={onSave}
            disabled={!aValid || saving}
            className="px-6 py-2.5 bg-sky-700 text-white text-sm font-semibold rounded-xl shadow hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Menyimpan..." : "Simpan Tahap 4 & Selesai"}
          </button>
        </div>
      )}
      {state.saved && (
        <div className="flex justify-end">
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">✓ Tahap 4 Tersimpan — Pengujian Selesai</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const LS_KEY = "smartmfc_microenergy_v3";

export default function MicroEnergyModule() {
  const [ms, setMs] = useState<MicroEnergyState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setMs(JSON.parse(raw) as MicroEnergyState);
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (loaded) localStorage.setItem(LS_KEY, JSON.stringify(ms));
  }, [ms, loaded]);

  // ── helpers ────────────────────────────────────────────────────────────────
  const postToApi = useCallback(async (voltage: number | null) => {
    try {
      await saveTelemetry({ voltage, tds: null });
    } catch (e: unknown) {
      console.warn("API save failed:", e);
      setApiError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // ── computed summary values ────────────────────────────────────────────────
  const summaryCards = useMemo(() => {
    const p = ms.activePhase;
    if (p === 1) {
      return {
        status: "—", statusSub: "Belum ada pengujian",
        config: "—", configSub: "Belum dikonfigurasi",
        v: "— V", vSub: "Menunggu data",
        d: "— mW", dSub: "Menunggu data",
      };
    }
    if (p === 2) {
      const aVals = ms.t2.a.map(r => parseV(r.tegangan));
      const avgA = aVals.every(v => v !== null) ? aVals.reduce((s, v) => s! + v!, 0)! / 3 : null;
      const bVals = ms.t2.b.map(r => parseV(r.tegangan));
      const avgP = bVals.every(v => v !== null)
        ? bVals.reduce((s, v) => s! + ((v! * v!) / R_BEBAN) * 1000, 0)! / 3
        : null;
      return {
        status: "Pengujian Beban", statusSub: "Tahap 2 sedang berlangsung",
        config: "Seri 2 Reaktor", configSub: "+ Beban 10 kΩ",
        v: avgA !== null ? `${fmt(avgA, 2)} V` : "— V", vSub: "Hasil tanpa beban",
        d: avgP !== null ? `${fmt(avgP, 2)} mW` : "— mW", dSub: "Estimasi dari uji beban",
      };
    }
    if (p === 3) {
      const vinVals = ms.t3.rows.map(r => parseV(r.tegangan));
      const voutVals = ms.t3.rows.map(r => parseV((r as { vout?: string }).vout || ""));
      const avgVin = vinVals.every(v => v !== null) ? vinVals.reduce((s, v) => s! + v!, 0)! / 3 : null;
      const avgVout = voutVals.every(v => v !== null) ? voutVals.reduce((s, v) => s! + v!, 0)! / 3 : null;
      return {
        status: "Pengujian Step-Up", statusSub: "Tahap 3 sedang berlangsung",
        config: "Seri 2 Reaktor\n→ Step-Up", configSub: "",
        v: avgVin !== null ? `${fmt(avgVin, 2)} V` : "0,93 V", vSub: "Tegangan masuk",
        d: avgVout !== null ? `${fmt(avgVout, 2)} V` : "— V", dSub: "Tegangan keluar",
      };
    }
    // Phase 4
    const vBats = ms.t4.a.map(r => parseV(r.vBaterai));
    const lastBat = vBats.filter(v => v !== null).at(-1) ?? null;
    const esp32On = ms.t4.b.some(r => r.esp32.toLowerCase().includes("menyala") || r.esp32.toLowerCase().includes("on"));
    return {
      status: "Penyimpanan &\nPemakaian", statusSub: "Tahap 4 sedang berlangsung",
      config: "Step-Up → TP4056\n→ 18650 → ESP32", configSub: "",
      v: lastBat !== null ? `${fmt(lastBat, 2)} V` : "— V", vSub: "Pemantauan 4A",
      d: esp32On ? "MENYALA" : "—", dSub: "Wi-Fi & sensor aktif",
    };
  }, [ms]);

  const phaseTabs = [
    { id: 1, label: "Tahap 1 — Tegangan Reaktor" },
    { id: 2, label: "Tahap 2 — Seri & Daya" },
    { id: 3, label: "Tahap 3 — Step-Up" },
    { id: 4, label: "Tahap 4 — Penyimpanan & ESP32" },
  ] as const;

  // ── save handlers ──────────────────────────────────────────────────────────
  const handleSaveT1 = useCallback(async () => {
    setSaving(true);
    setApiError(null);
    const ts = nowStr();
    const newRows: SavedRow[] = [];

    for (const r of ms.t1.a) {
      const v = parseV(r.tegangan);
      await postToApi(v);
      newRows.push({ id: makeId(), tanggal: ts, tahap: "Tahap 1", subUji: "1A — Reaktor Utama", menit: r.menit, tegangan: v, arus: null, daya: null, vout: null, catatan: r.catatan });
    }
    for (const r of ms.t1.b) {
      const v = parseV(r.tegangan);
      await postToApi(v);
      newRows.push({ id: makeId(), tanggal: ts, tahap: "Tahap 1", subUji: "1B — Reaktor Pendukung", menit: r.menit, tegangan: v, arus: null, daya: null, vout: null, catatan: r.catatan });
    }

    setMs(prev => ({
      ...prev,
      activePhase: 2,
      t1: { ...prev.t1, saved: true },
      history: [...newRows, ...prev.history],
    }));
    setSaving(false);
  }, [ms.t1, postToApi]);

  const handleSaveT2 = useCallback(async () => {
    setSaving(true);
    setApiError(null);
    const ts = nowStr();
    const newRows: SavedRow[] = [];

    for (const r of ms.t2.a) {
      const v = parseV(r.tegangan);
      await postToApi(v);
      newRows.push({ id: makeId(), tanggal: ts, tahap: "Tahap 2", subUji: "2A — Tanpa Beban", menit: r.menit, tegangan: v, arus: null, daya: null, vout: null, catatan: r.catatan });
    }
    for (const r of ms.t2.b) {
      const v = parseV(r.tegangan);
      const { arus, daya } = calcFromV(v);
      await postToApi(v);
      newRows.push({ id: makeId(), tanggal: ts, tahap: "Tahap 2", subUji: "2B — + Beban 10 kΩ", menit: r.menit, tegangan: v, arus, daya, vout: null, catatan: r.catatan });
    }

    setMs(prev => ({
      ...prev,
      activePhase: 3,
      t2: { ...prev.t2, saved: true },
      history: [...newRows, ...prev.history],
    }));
    setSaving(false);
  }, [ms.t2, postToApi]);

  const handleSaveT3 = useCallback(async () => {
    setSaving(true);
    setApiError(null);
    const ts = nowStr();
    const newRows: SavedRow[] = [];

    for (const r of ms.t3.rows) {
      const vin = parseV(r.tegangan);
      const vout = parseV((r as { vout?: string }).vout || "");
      await postToApi(vin);
      newRows.push({ id: makeId(), tanggal: ts, tahap: "Tahap 3 — Step-Up", subUji: "Step-Up", menit: r.menit, tegangan: vin, arus: null, daya: null, vout, catatan: r.catatan });
    }

    setMs(prev => ({
      ...prev,
      activePhase: 4,
      t3: { ...prev.t3, saved: true },
      history: [...newRows, ...prev.history],
    }));
    setSaving(false);
  }, [ms.t3, postToApi]);

  const handleSaveT4 = useCallback(async () => {
    setSaving(true);
    setApiError(null);
    const ts = nowStr();
    const newRows: SavedRow[] = [];

    for (const r of ms.t4.a) {
      const v = parseV(r.vBaterai);
      await postToApi(v);
      newRows.push({ id: makeId(), tanggal: ts, tahap: "Tahap 4 — Penyimpanan & ESP32", subUji: "4A", menit: r.menit, tegangan: v, arus: null, daya: null, vout: null, catatan: r.catatan });
    }
    for (const r of ms.t4.b) {
      newRows.push({ id: makeId(), tanggal: ts, tahap: "Tahap 4 — Penyimpanan & ESP32", subUji: "4B", menit: r.percobaan, tegangan: null, arus: null, daya: null, vout: null, catatan: `ESP32: ${r.esp32}, WiFi: ${r.wifi}, Sensor: ${r.sensor} — ${r.catatan}` });
    }

    setMs(prev => ({
      ...prev,
      t4: { ...prev.t4, saved: true },
      history: [...newRows, ...prev.history],
    }));
    setSaving(false);
  }, [ms.t4, postToApi]);

  // ── input change handlers ──────────────────────────────────────────────────
  const updateT1A = useCallback((i: number, field: "tegangan" | "catatan", v: string) => {
    setMs(prev => {
      const a = [...prev.t1.a]; a[i] = { ...a[i], [field]: v };
      return { ...prev, t1: { ...prev.t1, a } };
    });
  }, []);
  const updateT1B = useCallback((i: number, field: "tegangan" | "catatan", v: string) => {
    setMs(prev => {
      const b = [...prev.t1.b]; b[i] = { ...b[i], [field]: v };
      return { ...prev, t1: { ...prev.t1, b } };
    });
  }, []);
  const updateT2A = useCallback((i: number, field: "tegangan" | "catatan", v: string) => {
    setMs(prev => {
      const a = [...prev.t2.a]; a[i] = { ...a[i], [field]: v };
      return { ...prev, t2: { ...prev.t2, a } };
    });
  }, []);
  const updateT2B = useCallback((i: number, field: "tegangan" | "catatan", v: string) => {
    setMs(prev => {
      const b = [...prev.t2.b]; b[i] = { ...b[i], [field]: v };
      return { ...prev, t2: { ...prev.t2, b } };
    });
  }, []);
  const updateT3Row = useCallback((i: number, field: "tegangan" | "catatan", v: string) => {
    setMs(prev => {
      const rows = [...prev.t3.rows]; rows[i] = { ...rows[i], [field]: v };
      return { ...prev, t3: { ...prev.t3, rows } };
    });
  }, []);
  const updateT3Vout = useCallback((i: number, v: string) => {
    setMs(prev => {
      const rows = [...prev.t3.rows]; rows[i] = { ...rows[i], vout: v };
      return { ...prev, t3: { ...prev.t3, rows } };
    });
  }, []);
  const updateT4A = useCallback((i: number, field: keyof T4ARow, v: string) => {
    setMs(prev => {
      const a = [...prev.t4.a]; a[i] = { ...a[i], [field]: v };
      return { ...prev, t4: { ...prev.t4, a } };
    });
  }, []);
  const updateT4B = useCallback((i: number, field: keyof T4BRow, v: string) => {
    setMs(prev => {
      const b = [...prev.t4.b]; b[i] = { ...b[i], [field]: v };
      return { ...prev, t4: { ...prev.t4, b } };
    });
  }, []);

  const handleResetAll = () => {
    if (!confirm("Reset semua data Micro-Energy?")) return;
    localStorage.removeItem(LS_KEY);
    setMs({ ...DEFAULT_STATE });
  };

  if (!loaded) return null;

  // ── Summary card labels change per phase ──
  const isPhase3 = ms.activePhase === 3;
  const isPhase4 = ms.activePhase === 4;

  return (
    <div className="space-y-6">
      {/* Phase tab stepper */}
      <div className="flex items-center gap-0 overflow-x-auto no-scrollbar rounded-2xl border border-slate-200 bg-white shadow-sm">
        {phaseTabs.map((tab) => {
          const isActive = ms.activePhase === tab.id;
          const isCompleted = (tab.id === 1 && ms.t1.saved)
            || (tab.id === 2 && ms.t2.saved)
            || (tab.id === 3 && ms.t3.saved)
            || (tab.id === 4 && ms.t4.saved);

          return (
            <button
              key={tab.id}
              onClick={() => setMs(prev => ({ ...prev, activePhase: tab.id as 1 | 2 | 3 | 4 }))}
              className={[
                "flex-1 flex items-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all whitespace-nowrap border-r border-slate-200 last:border-r-0 min-w-[140px] justify-center cursor-pointer",
                isActive ? "bg-sky-700 text-white" : isCompleted ? "text-slate-700 hover:bg-slate-50" : "text-slate-500 hover:bg-slate-50",
              ].join(" ")}
            >
              <span className={[
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                isActive ? "bg-white/20 text-white" : isCompleted ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-400",
              ].join(" ")}>
                {tab.id}
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* API error banner */}
      {apiError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <Info size={14} className="flex-shrink-0" />
          Data tersimpan secara lokal. Sinkronisasi API gagal: {apiError}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard icon={<Activity size={18} />} label="Status Uji" value={<span className="leading-tight whitespace-pre-line">{summaryCards.status}</span>} sub={summaryCards.statusSub} />
        <SummaryCard icon={<Settings2 size={18} />} label="Konfigurasi Aktif" value={<span className="text-lg leading-tight whitespace-pre-line">{summaryCards.config}</span>} sub={summaryCards.configSub} />
        <SummaryCard
          icon={<Zap size={18} />}
          label={isPhase3 ? "Vin Rata-rata" : isPhase4 ? "Tegangan Baterai" : "Tegangan Seri"}
          value={summaryCards.v}
          sub={summaryCards.vSub}
        />
        <SummaryCard
          icon={isPhase4 ? <Wifi size={18} /> : <BarChart3 size={18} />}
          label={isPhase3 ? "Vout Rata-rata" : isPhase4 ? "Status ESP32" : "Daya Terukur"}
          value={summaryCards.d}
          sub={summaryCards.dSub}
        />
      </div>

      {/* Active phase content */}
      {ms.activePhase === 1 && (
        <Phase1
          state={ms.t1}
          onSave={handleSaveT1}
          saving={saving}
          onChangeA={updateT1A}
          onChangeB={updateT1B}
        />
      )}
      {ms.activePhase === 2 && (
        <Phase2
          state={ms.t2}
          onSave={handleSaveT2}
          saving={saving}
          prevT1Avg={{ a: null, b: null }}
          onChangeA={updateT2A}
          onChangeB={updateT2B}
        />
      )}
      {ms.activePhase === 3 && (
        <Phase3
          state={ms.t3}
          onSave={handleSaveT3}
          saving={saving}
          onChangeRow={updateT3Row}
          onChangeVout={updateT3Vout}
        />
      )}
      {ms.activePhase === 4 && (
        <Phase4
          state={ms.t4}
          onSave={handleSaveT4}
          saving={saving}
          onChangeA={updateT4A}
          onChangeB={updateT4B}
        />
      )}

      {/* History table */}
      <HistoryTable rows={ms.history} currentPhase={ms.activePhase} />

      {/* Reset */}
      <div className="flex justify-end pt-2">
        <button onClick={handleResetAll} className="text-xs text-rose-500 hover:text-rose-700 underline underline-offset-2">
          Reset semua data Micro-Energy
        </button>
      </div>
    </div>
  );
}

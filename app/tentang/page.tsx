"use client";
import React from "react";
import Image from "next/image";
import Card from "@/components/Card";
import MagneticCard from "@/components/MagneticCard";
import {
  FlaskConical, Zap, Droplet, Monitor, Leaf, Cpu, Wifi,
  Activity, Beaker, TrendingUp, BarChart3, Users,
  Wrench, CircleDot, Pipette, Server, LayoutDashboard
} from "lucide-react";

export default function TentangPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
      {/* ═══════════════════════════════════════════════════════════
          HEADER SECTION — 2 columns: description left, schema right
         ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10 mb-8 sm:mb-10">
        {/* LEFT — Text */}
        <div>
          <p className="font-mono text-xs text-sky-600 font-semibold tracking-[0.2em] uppercase mb-2">
            Tentang Proyek
          </p>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-3 sm:mb-4">
            Tentang SMART-MFC
          </h1>
          <h2 className="text-base sm:text-lg text-sky-700 font-semibold mb-4 sm:mb-5 leading-relaxed">
            SMART-MFC (Eco-Filter &amp; Micro-Energy)
          </h2>
          <p className="text-xs sm:text-sm text-slate-700 font-medium italic mb-3 leading-relaxed">
            Inovasi Reaktor Bioremediasi Limbah Cair Organik Berbasis Biofilm Mangrove Lembar Terintegrasi Prediksi AI
          </p>
          <p className="text-slate-600 leading-relaxed text-xs sm:text-sm font-medium mb-4">
            SMART-MFC merupakan purwarupa sistem bioelektrokimia berbasis Microbial Fuel Cell (MFC) yang memanfaatkan sedimen mangrove dan limbah cair tahu. Sistem ini dirancang untuk mengamati perubahan Total Dissolved Solids (TDS) sekaligus tegangan listrik mikro selama proses berlangsung.
          </p>
          <p className="text-slate-600 leading-relaxed text-xs sm:text-sm font-medium mb-4">
            Data TDS dan tegangan dipantau secara periodik melalui sistem sensor, ADS1115, dan ESP32, kemudian dikirim melalui API/database dan ditampilkan pada dashboard web. Regresi Linier digunakan sebagai model prediksi untuk memperkirakan waktu menuju target operasional{" "}
            <strong className="text-slate-800">TDS ≤1.000 mg/L</strong>.
          </p>
          <p className="text-slate-600 leading-relaxed text-xs sm:text-sm font-medium italic">
            Fungsi Micro-Energy masih berada pada tahap pengujian dan pengembangan sehingga SMART-MFC belum diklaim sebagai sistem self-powered.
          </p>
        </div>

        {/* RIGHT — Skema Image */}
        <Card className="flex flex-col h-full relative overflow-hidden border-sky-900/10 bg-white/90 backdrop-blur-md shadow-xl shadow-sky-950/5">
          {/* Label header */}
          <div className="bg-gradient-to-r from-sky-700 to-teal-700 px-4 py-2.5">
            <p className="text-white text-xs sm:text-sm font-semibold tracking-wide text-center">
              SKEMA SMART-MFC &amp; SISTEM MONITORING
            </p>
          </div>
          {/* Image */}
          <div className="p-3 sm:p-4 flex-1 flex items-center justify-center">
            <Image
              src="/SkemaSmartMFC.jpeg"
              alt="Skema SMART-MFC dan Sistem Monitoring"
              width={700}
              height={450}
              className="w-full h-auto object-contain rounded-lg"
              priority
            />
          </div>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          FEATURE CARDS — 4 interactive cards
         ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* 1. Proses Bioelektrokimia */}
        <MagneticCard className="p-7 relative overflow-hidden border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
          <div className="flex gap-5 items-start">
            <div className="w-14 h-14 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Beaker className="text-sky-600" size={26} />
            </div>
            <div className="pt-1 min-w-0">
              <h3 className="font-display font-semibold text-slate-900 mb-2 text-sm">Proses Bioelektrokimia</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Mikroorganisme pada sistem sedimen-limbah berperan dalam proses degradasi bahan organik.
              </p>
            </div>
          </div>
        </MagneticCard>

        {/* 2. Tegangan Mikro */}
        <MagneticCard className="p-7 relative overflow-hidden border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
          <div className="flex gap-5 items-start">
            <div className="w-14 h-14 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Zap className="text-sky-600" size={26} />
            </div>
            <div className="pt-1 min-w-0">
              <h3 className="font-display font-semibold text-slate-900 mb-2 text-sm">Tegangan Mikro</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Proses bioelektrokimia menghasilkan beda potensial yang diukur melalui pasangan anoda dan katoda.
              </p>
            </div>
          </div>
        </MagneticCard>

        {/* 3. Monitoring IoT */}
        <MagneticCard className="p-7 relative overflow-hidden border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
          <div className="flex gap-5 items-start">
            <div className="w-14 h-14 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Wifi className="text-sky-600" size={26} />
            </div>
            <div className="pt-1 min-w-0">
              <h3 className="font-display font-semibold text-slate-900 mb-2 text-sm">Monitoring IoT</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                TDS dan tegangan MFC dipantau secara periodik melalui sensor, ADS1115, dan ESP32.
              </p>
            </div>
          </div>
        </MagneticCard>

        {/* 4. Prediksi AI */}
        <MagneticCard className="p-7 relative overflow-hidden border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
          <div className="flex gap-5 items-start">
            <div className="w-14 h-14 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center flex-shrink-0 shadow-sm">
              <TrendingUp className="text-sky-600" size={26} />
            </div>
            <div className="pt-1 min-w-0">
              <h3 className="font-display font-semibold text-slate-900 mb-2 text-sm">Prediksi AI</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Regresi Linier menganalisis data TDS untuk memperkirakan waktu menuju target operasional <strong>TDS ≤1.000 mg/L</strong>.
              </p>
            </div>
          </div>
        </MagneticCard>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          BOTTOM SECTION — 3 columns
         ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Komponen Utama ─── */}
        <Card title="Komponen Utama">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6 pr-1 pb-4">
            {/* Column 1 */}
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full border border-sky-600 text-sky-600 flex items-center justify-center flex-shrink-0 bg-sky-50">
                  <FlaskConical size={14} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-slate-900 text-xs font-bold">Reaktor PVC 3 inci</h4>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">Wadah utama sistem SMART-MFC</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full border border-sky-600 text-sky-600 flex items-center justify-center flex-shrink-0 bg-sky-50">
                  <Leaf size={14} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-slate-900 text-xs font-bold">Sedimen Mangrove</h4>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">Media/sumber komunitas mikroba alami</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full border border-sky-600 text-sky-600 flex items-center justify-center flex-shrink-0 bg-sky-50">
                  <span className="font-bold text-xs leading-none">A+</span>
                </div>
                <div className="min-w-0">
                  <h4 className="text-slate-900 text-xs font-bold">Anoda Grafit + SS Mesh</h4>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">Elektroda pada zona sedimen anaerob</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full border border-sky-600 text-sky-600 flex items-center justify-center flex-shrink-0 bg-sky-50">
                  <span className="font-bold text-xs leading-none">K+</span>
                </div>
                <div className="min-w-0">
                  <h4 className="text-slate-900 text-xs font-bold">Katoda Grafit + SS Mesh</h4>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">Elektroda pada zona cairan/aerob</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full border border-sky-600 text-sky-600 flex items-center justify-center flex-shrink-0 bg-sky-50">
                  <CircleDot size={14} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-slate-900 text-xs font-bold">Dacron / Separator</h4>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">Memisahkan sedimen dan kolom cairan</p>
                </div>
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-6 pr-2">
              <div className="flex gap-4 items-start">
                <div className="text-sky-600 pt-0.5">
                  <Activity size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-slate-900 text-xs font-bold">Sensor TDS</h4>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">Mengukur kadar padatan terlarut</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="text-sky-600 pt-0.5">
                  <Cpu size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-slate-900 text-xs font-bold">ADS1115</h4>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">ADC 16-bit untuk pembacaan sensor</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="text-sky-600 pt-0.5">
                  <Wifi size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-slate-900 text-xs font-bold">ESP32</h4>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">Mikrokontroler & konektivitas WiFi</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="text-sky-600 pt-0.5">
                  <Zap size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-slate-900 text-xs font-bold">Sistem Daya</h4>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">Mendukung operasional perangkat</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="text-sky-600 pt-0.5">
                  <Monitor size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-slate-900 text-xs font-bold">Dashboard Web</h4>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">Monitoring, data, dan prediksi</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ─── Tujuan Proyek ─── */}
        <Card title="Tujuan Proyek">
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full border border-sky-600 text-sky-700 bg-sky-50 flex items-center justify-center font-mono text-sm font-bold flex-shrink-0">01</div>
              <div>
                <h4 className="text-slate-900 text-sm font-semibold mb-1">Bioremediasi Limbah Cair</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Mengkaji perubahan parameter TDS limbah cair tahu selama proses pada sistem SMART-MFC.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full border border-sky-600 text-sky-700 bg-sky-50 flex items-center justify-center font-mono text-sm font-bold flex-shrink-0">02</div>
              <div>
                <h4 className="text-slate-900 text-sm font-semibold mb-1">Monitoring Cerdas</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Memantau TDS dan tegangan MFC secara periodik melalui sistem IoT.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full border border-sky-600 text-sky-700 bg-sky-50 flex items-center justify-center font-mono text-sm font-bold flex-shrink-0">03</div>
              <div>
                <h4 className="text-slate-900 text-sm font-semibold mb-1">Prediksi &amp; Pengembangan Teknologi</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Menggunakan Regresi Linier untuk memperkirakan waktu menuju target TDS serta menguji potensi Micro-Energy untuk pengembangan SMART-MFC.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* ─── Tim Pengembang ─── */}
        <Card title="Tim Pengembang">
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-3 rounded-xl bg-white/90 border border-sky-900/10 shadow-sm">
              <div className="w-12 h-12 rounded-full border-2 border-sky-400/50 bg-white flex items-center justify-center flex-shrink-0 p-1 shadow-sm overflow-hidden">
                <img src="/Logo_SmartMFC.png" alt="Logo Green Vanguard Tech" className="w-full h-full object-contain" />
              </div>
              <div>
                <h4 className="text-slate-900 text-sm font-bold mb-0.5">Green Vanguard Tech</h4>
                <p className="text-xs text-slate-600 font-medium">Tim pengembang SMART-MFC</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 rounded-xl bg-white/90 border border-sky-900/10 shadow-sm">
              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 bg-white rounded-full overflow-hidden p-1 shadow-sm border border-amber-200">
                <img src="/images.png" alt="Logo SMAN 3 Mataram" className="w-full h-full object-contain" />
              </div>
              <div>
                <h4 className="text-slate-900 text-sm font-bold mb-0.5">SMAN 3 Mataram</h4>
                <p className="text-xs text-slate-600 font-medium">Sekolah asal tim Green Vanguard Tech</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 rounded-xl bg-white/90 border border-sky-900/10 shadow-sm">
              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 bg-white rounded-full overflow-hidden p-1 shadow-sm border border-red-200">
                <img src="/unnamed.png" alt="Logo B-BRAVE 2026" className="w-full h-full object-contain scale-[1.75]" />
              </div>
              <div>
                <h4 className="text-slate-900 text-sm font-bold mb-0.5">B-BRAVE 2026</h4>
                <p className="text-xs text-slate-600 font-medium">Program kompetisi dan pengembangan inovasi</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

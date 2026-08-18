"use client";
import React from "react";
import Card from "@/components/Card";
import MagneticCard from "@/components/MagneticCard";
import { 
  FlaskConical, Zap, Droplet, Monitor, Leaf, Cpu, Wifi,
  Activity, ArrowRight, ShieldCheck, Target, Users
} from "lucide-react";

export default function TentangPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
      {/* Header Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10 mb-8 sm:mb-10">
        <div>
          <p className="font-mono text-xs text-sky-600 font-semibold tracking-[0.2em] uppercase mb-2">Tentang Proyek</p>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-3 sm:mb-4">Tentang SMART-MFC</h1>
          <h2 className="text-base sm:text-xl text-slate-800 font-medium mb-4 sm:mb-6 leading-relaxed">
            Eco-Filter &amp; Micro-Energy untuk pengolahan limbah cair organik berbasis Microbial Fuel Cell.
          </h2>
          <p className="text-slate-600 leading-relaxed text-sm md:text-base font-medium">
            SMART-MFC adalah sistem inovatif yang memanfaatkan limbah cair organik
            sebagai sumber energi mikro melalui teknologi Microbial Fuel Cell (MFC).
            Sistem ini tidak hanya mengolah limbah menjadi lebih bersih, tetapi juga
            menghasilkan listrik dalam jumlah kecil yang dapat dimanfaatkan untuk
            kebutuhan monitoring dan sistem daring.
          </p>
        </div>

        {/* Process Diagram */}
        <Card className="flex flex-col justify-center h-full p-8 relative overflow-hidden group border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <h3 className="text-sm font-semibold text-slate-900 mb-8">Alur Proses SMART-MFC</h3>
          
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 relative z-10">
            <div className="flex flex-col items-center text-center group/item">
              <FlaskConical className="text-sky-600 mb-4 drop-shadow-sm animate-float-slow" size={40} strokeWidth={1.5} />
              <p className="text-[11px] text-slate-600 font-medium max-w-[90px] leading-relaxed">Limbah Cair Organik Masuk</p>
            </div>
            <ArrowRight className="text-sky-400/40 hidden sm:block mt-4" size={20} />
            <div className="flex flex-col items-center text-center group/item">
              <div className="relative mb-4">
                <ShieldCheck className="text-sky-600 drop-shadow-sm relative z-10 animate-float-slow" size={40} strokeWidth={1.5} style={{ animationDelay: '0.5s' }} />
                <div className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_#F59E0B]"></div>
              </div>
              <p className="text-[11px] text-slate-600 font-medium max-w-[90px] leading-relaxed">Bakteri Menguraikan Bahan Organik</p>
            </div>
            <ArrowRight className="text-sky-400/40 hidden sm:block mt-4" size={20} />
            <div className="flex flex-col items-center text-center group/item">
              <Zap className="text-sky-600 mb-4 drop-shadow-sm animate-float-slow" size={40} strokeWidth={1.5} style={{ animationDelay: '1s' }} />
              <p className="text-[11px] text-slate-600 font-medium max-w-[90px] leading-relaxed">Elektron Mengalir (Arus Listrik)</p>
            </div>
            <ArrowRight className="text-sky-400/40 hidden sm:block mt-4" size={20} />
            <div className="flex flex-col items-center text-center group/item">
              <Droplet className="text-sky-600 mb-4 drop-shadow-sm animate-float-slow" size={40} strokeWidth={1.5} style={{ animationDelay: '1.5s' }} />
              <p className="text-[11px] text-slate-600 font-medium max-w-[90px] leading-relaxed">Sensor Memonitor Kualitas Air</p>
            </div>
            <ArrowRight className="text-sky-400/40 hidden sm:block mt-4" size={20} />
            <div className="flex flex-col items-center text-center group/item">
              <Monitor className="text-sky-600 mb-4 drop-shadow-sm animate-float-slow" size={40} strokeWidth={1.5} style={{ animationDelay: '2s' }} />
              <p className="text-[11px] text-slate-600 font-medium max-w-[90px] leading-relaxed">Data Diproses &amp; Prediksi Ditampilkan</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Feature Cards — 4 kotak interaktif */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <MagneticCard className="flex gap-4 p-6 relative overflow-hidden border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
          <div className="w-12 h-12 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center flex-shrink-0 shadow-sm">
            <ShieldCheck className="text-sky-600" size={24} />
          </div>
          <div>
            <h3 className="font-display font-semibold text-slate-900 mb-2 text-sm">Bakteri Menguraikan Limbah</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">Mikroorganisme di dalam reaktor MFC mengurai bahan organik dalam limbah cair dan melepaskan elektron.</p>
          </div>
        </MagneticCard>

        <MagneticCard className="flex gap-4 p-6 relative overflow-hidden border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
          <div className="w-12 h-12 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Zap className="text-sky-600" size={24} />
          </div>
          <div>
            <h3 className="font-display font-semibold text-slate-900 mb-2 text-sm">Energi Mikro Dihasilkan</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">Elektron yang dihasilkan oleh bakteri mengalir melalui rangkaian eksternal sehingga menghasilkan listrik mikro.</p>
          </div>
        </MagneticCard>

        <MagneticCard className="flex gap-4 p-6 relative overflow-hidden border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
          <div className="w-12 h-12 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Activity className="text-sky-600" size={24} />
          </div>
          <div>
            <h3 className="font-display font-semibold text-slate-900 mb-2 text-sm">Dipantau oleh Sensor</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">Sensor TDS memantau kualitas air secara real-time dan dikirim ke sistem untuk dianalisis.</p>
          </div>
        </MagneticCard>

        <MagneticCard className="flex gap-4 p-6 relative overflow-hidden border-sky-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-sky-950/5">
          <div className="w-12 h-12 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Monitor className="text-sky-600" size={24} />
          </div>
          <div>
            <h3 className="font-display font-semibold text-slate-900 mb-2 text-sm">Website Memberi Prediksi</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">Data diolah oleh sistem untuk memberikan prediksi sisa waktu dan kualitas hasil olahan.</p>
          </div>
        </MagneticCard>
      </div>

      {/* Bottom Layout (3 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Komponen Utama */}
        <Card title="Komponen Utama">
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full border border-sky-600 text-sky-600 flex items-center justify-center flex-shrink-0 bg-sky-50 font-bold">
                <FlaskConical size={14} />
              </div>
              <div>
                <h4 className="text-slate-900 text-sm font-semibold">Reaktor PVC 3 inci</h4>
                <p className="text-xs text-slate-500 mt-1 font-medium">Wadah MFC skala laboratorium</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full border border-sky-600 text-sky-600 flex items-center justify-center flex-shrink-0 bg-sky-50 font-bold">
                <Leaf size={14} />
              </div>
              <div>
                <h4 className="text-slate-900 text-sm font-semibold">Sedimen Mangrove</h4>
                <p className="text-xs text-slate-500 mt-1 font-medium">Sumber mikroba alami</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full border border-amber-600 text-amber-700 flex items-center justify-center flex-shrink-0 bg-amber-50 font-bold">
                <span className="font-bold text-lg leading-none mb-1">-</span>
              </div>
              <div>
                <h4 className="text-slate-900 text-sm font-semibold">Anoda (Graphite Felt)</h4>
                <p className="text-xs text-slate-500 mt-1 font-medium">Tempat oksidasi bahan organik</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full border border-sky-600 text-sky-600 flex items-center justify-center flex-shrink-0 bg-sky-50 font-bold">
                <span className="font-bold text-lg leading-none mb-0.5">+</span>
              </div>
              <div>
                <h4 className="text-slate-900 text-sm font-semibold">Katoda (Carbon Cloth)</h4>
                <p className="text-xs text-slate-500 mt-1 font-medium">Tempat reduksi elektron</p>
              </div>
            </div>

            <div className="my-2 border-b border-sky-900/10"></div>
            
            <div className="flex gap-4">
              <div className="text-sky-600 flex-shrink-0 mt-1"><Activity size={18} /></div>
              <div>
                <h4 className="text-slate-900 text-sm font-semibold">Sensor TDS</h4>
                <p className="text-xs text-slate-500 mt-1 font-medium">Mengukur kadar padatan terlarut</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="text-sky-600 flex-shrink-0 mt-1"><Cpu size={18} /></div>
              <div>
                <h4 className="text-slate-900 text-sm font-semibold">ADS1115</h4>
                <p className="text-xs text-slate-500 mt-1 font-medium">ADC 16-bit untuk pembacaan sensor</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="text-sky-600 flex-shrink-0 mt-1"><Wifi size={18} /></div>
              <div>
                <h4 className="text-slate-900 text-sm font-semibold">ESP32</h4>
                <p className="text-xs text-slate-500 mt-1 font-medium">Mikrokontroler &amp; konektivitas WiFi</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="text-sky-600 flex-shrink-0 mt-1"><Zap size={18} /></div>
              <div>
                <h4 className="text-slate-900 text-sm font-semibold">Sistem Daya</h4>
                <p className="text-xs text-slate-500 mt-1 font-medium">Mendukung operasional perangkat</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="text-sky-600 flex-shrink-0 mt-1"><Monitor size={18} /></div>
              <div>
                <h4 className="text-slate-900 text-sm font-semibold">Dashboard Web</h4>
                <p className="text-xs text-slate-500 mt-1 font-medium">Monitoring, data, dan prediksi</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Tujuan Proyek */}
        <Card title="Tujuan Proyek">
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full border border-sky-600 text-sky-700 bg-sky-50 flex items-center justify-center font-mono text-sm font-bold flex-shrink-0">01</div>
              <div>
                <h4 className="text-slate-900 text-sm font-semibold mb-1">Pengolahan Limbah Efektif</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">Mengurangi pencemaran lingkungan melalui pengolahan limbah cair organik yang ramah lingkungan dan efisien.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full border border-sky-600 text-sky-700 bg-sky-50 flex items-center justify-center font-mono text-sm font-bold flex-shrink-0">02</div>
              <div>
                <h4 className="text-slate-900 text-sm font-semibold mb-1">Monitoring Cerdas &amp; Real-time</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">Memanfaatkan sensor dan IoT untuk pemantauan kualitas air secara real-time dan akurat.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full border border-sky-600 text-sky-700 bg-sky-50 flex items-center justify-center font-mono text-sm font-bold flex-shrink-0">03</div>
              <div>
                <h4 className="text-slate-900 text-sm font-semibold mb-1">Inovasi untuk UMKM</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">Menyediakan solusi hemat energi dan biaya yang dapat diterapkan oleh UMKM secara berkelanjutan.</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Tim Pengembang */}
        <Card title="Tim Pengembang">
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-3 rounded-xl bg-white/90 border border-sky-900/10 shadow-sm">
              <div className="w-12 h-12 rounded-full border-2 border-sky-400/50 bg-white flex items-center justify-center flex-shrink-0 p-1 shadow-sm overflow-hidden">
                <img src="/Logo_SmartMFC.png" alt="Logo Green Vanguard Tech" className="w-full h-full object-contain" />
              </div>
              <div>
                <h4 className="text-slate-900 text-sm font-bold mb-1">Green Vanguard Tech</h4>
                <p className="text-xs text-slate-600 font-medium">Inovasi hijau untuk masa depan berkelanjutan.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-3 rounded-xl bg-white/90 border border-sky-900/10 shadow-sm">
              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 bg-white rounded-full overflow-hidden p-1 shadow-sm border border-amber-200">
                <img src="/images.png" alt="Logo SMAN 3 Mataram" className="w-full h-full object-contain" />
              </div>
              <div>
                <h4 className="text-slate-900 text-sm font-bold mb-1">SMAN 3 Mataram</h4>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">Meningkatkan Amaliah Imtaq, Iptek, Kebahasaan, Keindonesiaan, Kemanusiaan, dan Kemandirian.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-3 rounded-xl bg-white/90 border border-sky-900/10 shadow-sm">
              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 bg-white rounded-full overflow-hidden p-1 shadow-sm border border-red-200">
                <img src="/unnamed.png" alt="Logo B-BRAVE 2026" className="w-full h-full object-contain scale-[1.75]" />
              </div>
              <div>
                <h4 className="text-slate-900 text-sm font-bold mb-1">B-BRAVE 2026</h4>
                <p className="text-xs text-slate-600 font-medium">Berani. Berinovasi. Berdampak.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

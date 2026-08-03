"use client";
import React from "react";
import Card from "@/components/Card";
import { 
  FlaskConical, Zap, Droplet, Monitor, Leaf, Cpu, Wifi,
  Activity, ArrowRight, ShieldCheck, Target, Users
} from "lucide-react";

export default function TentangPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
        <div>
          <p className="font-mono text-xs text-signal tracking-[0.2em] uppercase mb-2">Tentang Proyek</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-fog mb-4">Tentang SMART-MFC</h1>
          <h2 className="text-xl text-fog mb-6 leading-relaxed">
            Eco-Filter & Micro-Energy untuk pengolahan limbah cair organik berbasis Microbial Fuel Cell.
          </h2>
          <p className="text-muted leading-relaxed text-sm md:text-base">
            SMART-MFC adalah sistem inovatif yang memanfaatkan limbah cair organik
            sebagai sumber energi mikro melalui teknologi Microbial Fuel Cell (MFC).
            Sistem ini tidak hanya mengolah limbah menjadi lebih bersih, tetapi juga
            menghasilkan listrik dalam jumlah kecil yang dapat dimanfaatkan untuk
            kebutuhan monitoring dan sistem daring.
          </p>
        </div>

        {/* Process Diagram */}
        <Card className="flex flex-col justify-center h-full p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-signal/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <h3 className="text-sm font-medium text-fog mb-8">Alur Proses SMART-MFC</h3>
          
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 relative z-10">
            <div className="flex flex-col items-center text-center group/item">
              <FlaskConical className="text-signal mb-4 drop-shadow-[0_0_8px_rgba(74,222,148,0.5)] transition-transform group-hover/item:scale-110" size={40} strokeWidth={1.5} />
              <p className="text-[11px] text-muted max-w-[90px] leading-relaxed">Limbah Cair Organik Masuk</p>
            </div>
            <ArrowRight className="text-signal/30 hidden sm:block mt-4" size={20} />
            <div className="flex flex-col items-center text-center group/item">
              <div className="relative mb-4 transition-transform group-hover/item:scale-110">
                <ShieldCheck className="text-signal drop-shadow-[0_0_8px_rgba(74,222,148,0.5)] relative z-10" size={40} strokeWidth={1.5} />
                <div className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-electrode animate-pulseDot shadow-[0_0_8px_#F2B84B]"></div>
              </div>
              <p className="text-[11px] text-muted max-w-[90px] leading-relaxed">Bakteri Menguraikan Bahan Organik</p>
            </div>
            <ArrowRight className="text-signal/30 hidden sm:block mt-4" size={20} />
            <div className="flex flex-col items-center text-center group/item">
              <Zap className="text-signal mb-4 drop-shadow-[0_0_8px_rgba(74,222,148,0.5)] transition-transform group-hover/item:scale-110" size={40} strokeWidth={1.5} />
              <p className="text-[11px] text-muted max-w-[90px] leading-relaxed">Elektron Mengalir (Arus Listrik)</p>
            </div>
            <ArrowRight className="text-signal/30 hidden sm:block mt-4" size={20} />
            <div className="flex flex-col items-center text-center group/item">
              <Droplet className="text-signal mb-4 drop-shadow-[0_0_8px_rgba(74,222,148,0.5)] transition-transform group-hover/item:scale-110" size={40} strokeWidth={1.5} />
              <p className="text-[11px] text-muted max-w-[90px] leading-relaxed">Sensor Memonitor Kualitas Air</p>
            </div>
            <ArrowRight className="text-signal/30 hidden sm:block mt-4" size={20} />
            <div className="flex flex-col items-center text-center group/item">
              <Monitor className="text-signal mb-4 drop-shadow-[0_0_8px_rgba(74,222,148,0.5)] transition-transform group-hover/item:scale-110" size={40} strokeWidth={1.5} />
              <p className="text-[11px] text-muted max-w-[90px] leading-relaxed">Data Diproses & Prediksi Ditampilkan</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <Card className="flex gap-4 p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-signal/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-12 h-12 rounded-full bg-signal/10 border border-signal flex items-center justify-center flex-shrink-0 group-hover:shadow-[0_0_15px_rgba(74,222,148,0.5)] transition-shadow">
            <ShieldCheck className="text-signal" size={24} />
          </div>
          <div>
            <h3 className="font-display font-medium text-fog mb-2 text-sm">Bakteri Menguraikan Limbah</h3>
            <p className="text-xs text-muted leading-relaxed">Mikroorganisme di dalam reaktor MFC mengurai bahan organik dalam limbah cair dan melepaskan elektron.</p>
          </div>
        </Card>

        <Card className="flex gap-4 p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-signal/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-12 h-12 rounded-full bg-signal/10 border border-signal flex items-center justify-center flex-shrink-0 group-hover:shadow-[0_0_15px_rgba(74,222,148,0.5)] transition-shadow">
            <Zap className="text-signal" size={24} />
          </div>
          <div>
            <h3 className="font-display font-medium text-fog mb-2 text-sm">Energi Mikro Dihasilkan</h3>
            <p className="text-xs text-muted leading-relaxed">Elektron yang dihasilkan oleh bakteri mengalir melalui rangkaian eksternal sehingga menghasilkan listrik mikro.</p>
          </div>
        </Card>

        <Card className="flex gap-4 p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-signal/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-12 h-12 rounded-full bg-signal/10 border border-signal flex items-center justify-center flex-shrink-0 group-hover:shadow-[0_0_15px_rgba(74,222,148,0.5)] transition-shadow">
            <Activity className="text-signal" size={24} />
          </div>
          <div>
            <h3 className="font-display font-medium text-fog mb-2 text-sm">Dipantau oleh Sensor</h3>
            <p className="text-xs text-muted leading-relaxed">Sensor TDS memantau kualitas air secara real-time dan dikirim ke sistem untuk dianalisis.</p>
          </div>
        </Card>

        <Card className="flex gap-4 p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-signal/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-12 h-12 rounded-full bg-signal/10 border border-signal flex items-center justify-center flex-shrink-0 group-hover:shadow-[0_0_15px_rgba(74,222,148,0.5)] transition-shadow">
            <Monitor className="text-signal" size={24} />
          </div>
          <div>
            <h3 className="font-display font-medium text-fog mb-2 text-sm">Website Memberi Prediksi</h3>
            <p className="text-xs text-muted leading-relaxed">Data diolah oleh sistem untuk memberikan prediksi sisa waktu dan kualitas hasil olahan.</p>
          </div>
        </Card>
      </div>

      {/* Bottom Layout (3 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Komponen Utama */}
        <Card title="Komponen Utama">
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full border border-signal flex items-center justify-center text-signal flex-shrink-0">
                <FlaskConical size={14} />
              </div>
              <div>
                <h4 className="text-fog text-sm font-medium">Reaktor PVC 3 inci</h4>
                <p className="text-xs text-muted mt-1">Wadah MFC skala laboratorium</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full border border-signal flex items-center justify-center text-signal flex-shrink-0">
                <Leaf size={14} />
              </div>
              <div>
                <h4 className="text-fog text-sm font-medium">Sedimen Mangrove</h4>
                <p className="text-xs text-muted mt-1">Sumber mikroba alami</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full border border-electrode flex items-center justify-center text-electrode flex-shrink-0">
                <span className="font-bold text-lg leading-none mb-1">-</span>
              </div>
              <div>
                <h4 className="text-fog text-sm font-medium">Anoda (Graphite Felt)</h4>
                <p className="text-xs text-muted mt-1">Tempat oksidasi bahan organik</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full border border-signal flex items-center justify-center text-signal flex-shrink-0">
                <span className="font-bold text-lg leading-none mb-0.5">+</span>
              </div>
              <div>
                <h4 className="text-fog text-sm font-medium">Katoda (Carbon Cloth)</h4>
                <p className="text-xs text-muted mt-1">Tempat reduksi elektron</p>
              </div>
            </div>

            <div className="my-2 border-b border-line/50"></div>
            
            <div className="flex gap-4">
              <div className="text-signal flex-shrink-0 mt-1"><Activity size={18} /></div>
              <div>
                <h4 className="text-fog text-sm font-medium">Sensor TDS</h4>
                <p className="text-xs text-muted mt-1">Mengukur kadar padatan terlarut</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="text-signal flex-shrink-0 mt-1"><Cpu size={18} /></div>
              <div>
                <h4 className="text-fog text-sm font-medium">ADS1115</h4>
                <p className="text-xs text-muted mt-1">ADC 16-bit untuk pembacaan sensor</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="text-signal flex-shrink-0 mt-1"><Wifi size={18} /></div>
              <div>
                <h4 className="text-fog text-sm font-medium">ESP32</h4>
                <p className="text-xs text-muted mt-1">Mikrokontroler & konektivitas WiFi</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="text-signal flex-shrink-0 mt-1"><Zap size={18} /></div>
              <div>
                <h4 className="text-fog text-sm font-medium">Sistem Daya</h4>
                <p className="text-xs text-muted mt-1">Mendukung operasional perangkat</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="text-signal flex-shrink-0 mt-1"><Monitor size={18} /></div>
              <div>
                <h4 className="text-fog text-sm font-medium">Dashboard Web</h4>
                <p className="text-xs text-muted mt-1">Monitoring, data, dan prediksi</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Tujuan Proyek */}
        <Card title="Tujuan Proyek">
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full border border-signal text-signal flex items-center justify-center font-mono text-sm flex-shrink-0">01</div>
              <div>
                <h4 className="text-fog text-sm font-medium mb-1">Pengolahan Limbah Efektif</h4>
                <p className="text-xs text-muted leading-relaxed">Mengurangi pencemaran lingkungan melalui pengolahan limbah cair organik yang ramah lingkungan dan efisien.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full border border-signal text-signal flex items-center justify-center font-mono text-sm flex-shrink-0">02</div>
              <div>
                <h4 className="text-fog text-sm font-medium mb-1">Monitoring Cerdas & Real-time</h4>
                <p className="text-xs text-muted leading-relaxed">Memanfaatkan sensor dan IoT untuk pemantauan kualitas air secara real-time dan akurat.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full border border-signal text-signal flex items-center justify-center font-mono text-sm flex-shrink-0">03</div>
              <div>
                <h4 className="text-fog text-sm font-medium mb-1">Inovasi untuk UMKM</h4>
                <p className="text-xs text-muted leading-relaxed">Menyediakan solusi hemat energi dan biaya yang dapat diterapkan oleh UMKM secara berkelanjutan.</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Tim Pengembang */}
        <Card title="Tim Pengembang">
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-3 rounded-lg bg-panel border border-line">
              <div className="w-12 h-12 rounded-full border-2 border-signal flex items-center justify-center text-signal flex-shrink-0 bg-ink">
                <Target size={24} />
              </div>
              <div>
                <h4 className="text-fog text-sm font-medium mb-1">Green Vanguard Tech</h4>
                <p className="text-xs text-muted">Inovasi hijau untuk masa depan berkelanjutan.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-3 rounded-lg bg-panel border border-line">
              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 bg-white rounded-md overflow-hidden p-1">
                <img src="/images.png" alt="Logo SMAN 3 Mataram" className="w-full h-full object-contain" />
              </div>
              <div>
                <h4 className="text-fog text-sm font-medium mb-1">SMAN 3 Mataram</h4>
                <p className="text-[11px] text-muted leading-relaxed">Meningkatkan Amaliah Imtaq, Iptek, Kebahasaan, Keindonesiaan, Kemanusiaan, dan Kemandirian.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-3 rounded-lg bg-panel border border-line">
              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 bg-transparent overflow-hidden">
                <img src="/unnamed.png" alt="Logo B-BRAVE 2026" className="w-full h-full object-contain scale-[1.75]" />
              </div>
              <div>
                <h4 className="text-fog text-sm font-medium mb-1">B-BRAVE 2026</h4>
                <p className="text-xs text-muted">Berani. Berinovasi. Berdampak.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

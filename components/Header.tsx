"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, History, LineChart, Info } from "lucide-react";

export default function Header() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Riwayat Pengolahan", href: "/riwayat", icon: History },
    { name: "Data Penelitian", href: "/data", icon: LineChart },
    { name: "Tentang SMART-MFC", href: "/tentang", icon: Info },
  ];

  return (
    <header className="border-b border-sky-900/10 bg-white/85 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-auto flex items-center justify-center flex-shrink-0 drop-shadow-md">
            <img
              src="/Logo_SmartMFC.png"
              alt="Logo SMART-MFC"
              className="h-full w-auto object-contain"
            />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="font-display font-black text-2xl md:text-3xl text-slate-900 tracking-wider leading-none">SMART-MFC</h1>
            <p className="text-xs font-bold text-slate-800 tracking-widest mt-1.5 uppercase">ECO-FILTER &amp; MICRO-ENERGY</p>
            <p className="text-[11px] md:text-xs text-slate-600 font-medium mt-0.5">Green Vanguard Tech — SMAN 3 Mataram</p>
          </div>
        </div>
        
        <nav className="flex items-center gap-1 h-full pt-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`relative flex items-center gap-2 px-5 py-3 h-full transition-colors text-sm font-medium ${
                  isActive
                    ? "text-sky-600 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-sky-500/10"
                }`}
              >
                {isActive && (
                  <div className="absolute bottom-0 left-0 w-full h-[3px] bg-sky-600 shadow-[0_-2px_10px_rgba(2,132,199,0.6)]"></div>
                )}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-t from-sky-500/10 to-transparent"></div>
                )}
                <Icon size={18} className="relative z-10" />
                <span className="relative z-10">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

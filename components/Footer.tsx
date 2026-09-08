"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf, LayoutDashboard, CircleDot, History, LineChart, Info } from "lucide-react";

export default function Footer() {
  const pathname = usePathname();

  const footerNav = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Live Demo", href: "/demo", icon: CircleDot },
    { name: "Riwayat Pengolahan", href: "/riwayat", icon: History },
    { name: "Data Penelitian", href: "/data", icon: LineChart },
    { name: "Tentang SMART-MFC", href: "/tentang", icon: Info },
  ];

  return (
    <footer className="mt-20 border-t border-sky-900/10 bg-white/70 backdrop-blur-md py-8">
      <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-4">
        {/* Navigation Tabs in Footer */}
        <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3 text-xs font-semibold">
          {footerNav.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                  isActive
                    ? "bg-sky-500/15 text-sky-700 border border-sky-300/70 font-bold shadow-sm"
                    : "text-slate-600 hover:text-sky-600 hover:bg-sky-50 border border-transparent"
                }`}
              >
                <Icon size={14} className={isActive ? "text-sky-600" : "text-slate-400"} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Footer Attribution */}
        <div className="flex justify-center items-center gap-2 text-xs text-slate-500 font-medium">
          <Leaf size={14} className="text-sky-600" />
          <span>Built by Green Vanguard Tech — SMAN 3 Mataram</span>
          <Leaf size={14} className="text-sky-600" />
        </div>
      </div>
    </footer>
  );
}


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
    <header className="border-b border-line bg-ink/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-signal flex items-center justify-center text-signal">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v20" />
              <path d="M2 12h20" />
              <circle cx="12" cy="12" r="7" />
              <path d="m16 8-4 4" />
            </svg>
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-fog tracking-wider">SMART-MFC</h1>
            <p className="text-xs text-muted">Green Vanguard Tech — SMAN 3 Mataram</p>
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
                    ? "text-signal"
                    : "text-muted hover:text-fog hover:bg-panel/50"
                }`}
              >
                {isActive && (
                  <div className="absolute bottom-0 left-0 w-full h-[3px] bg-signal shadow-[0_-2px_10px_rgba(74,222,148,0.8)]"></div>
                )}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-t from-signal/10 to-transparent"></div>
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

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, History, LineChart, Info, Menu, X, LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Riwayat Pengolahan", href: "/riwayat", icon: History },
    { name: "Data Penelitian", href: "/data", icon: LineChart },
    { name: "Tentang SMART-MFC", href: "/tentang", icon: Info },
  ];

  return (
    <header className="border-b border-sky-900/10 bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 md:h-24 flex items-center justify-between">
        {/* Logo & Brand Title */}
        <Link href="/" className="flex items-center gap-3 sm:gap-4 group">
          <div className="h-12 w-auto sm:h-16 flex items-center justify-center flex-shrink-0 drop-shadow-md transition-transform group-hover:scale-105">
            <img
              src="/Logo_SmartMFC.png"
              alt="Logo SMART-MFC"
              className="h-full w-auto object-contain"
            />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="font-display font-black text-xl sm:text-2xl md:text-3xl text-slate-900 tracking-wider leading-none">
              SMART-MFC
            </h1>
            <p className="text-[10px] sm:text-xs font-bold text-slate-800 tracking-widest mt-1 uppercase">
              ECO-FILTER &amp; MICRO-ENERGY
            </p>
            <p className="text-[9px] sm:text-[11px] md:text-xs text-slate-600 font-medium mt-0.5 hidden sm:block">
              Green Vanguard Tech — SMAN 3 Mataram
            </p>
          </div>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 h-full pt-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`relative flex items-center gap-2 px-4 lg:px-5 py-3 h-full transition-colors text-sm font-medium ${
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
          
          <form action={logoutAction} className="h-full flex items-center ml-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </form>
        </nav>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors focus:outline-none"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Down Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-sky-900/10 bg-white/95 backdrop-blur-xl px-4 pt-3 pb-5 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-semibold ${
                    isActive
                      ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                      : "text-slate-700 hover:bg-sky-50 hover:text-sky-600"
                  }`}
                >
                  <Icon size={19} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            
            <div className="h-px w-full bg-slate-100 my-1"></div>
            
            <form action={logoutAction} className="w-full">
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                <LogOut size={19} />
                <span>Logout</span>
              </button>
            </form>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-500 font-medium">
              Green Vanguard Tech — SMAN 3 Mataram
            </p>
          </div>
        </div>
      )}
    </header>
  );
}

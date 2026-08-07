import React from "react";
import { Leaf } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-sky-900/10 bg-white/60 backdrop-blur-md py-8">
      <div className="max-w-7xl mx-auto px-6 flex justify-center items-center gap-2 text-sm text-slate-600 font-medium">
        <Leaf size={14} className="text-sky-600" />
        <span>Built by Green Vanguard Tech — SMAN 3 Mataram</span>
        <Leaf size={14} className="text-sky-600" />
      </div>
    </footer>
  );
}

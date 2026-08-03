import React from "react";
import { Leaf } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-line py-8">
      <div className="max-w-7xl mx-auto px-6 flex justify-center items-center gap-2 text-sm text-muted">
        <Leaf size={14} className="text-signal" />
        <span>Built by Green Vanguard Tech — SMAN 3 Mataram</span>
        <Leaf size={14} className="text-signal" />
      </div>
    </footer>
  );
}

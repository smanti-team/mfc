import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  icon?: React.ReactNode;
}

export default function Card({ children, className = "", title, icon }: CardProps) {
  return (
    <div className={`rounded-2xl border border-teal-900/10 bg-white/80 backdrop-blur-md shadow-xl shadow-teal-950/5 overflow-hidden ${className}`}>
      {(title || icon) && (
        <div className="flex items-center gap-3 px-5 py-4 border-b border-teal-900/10 bg-white/50">
          {icon && <div className="text-teal-700">{icon}</div>}
          {title && <h3 className="font-display font-semibold text-slate-900">{title}</h3>}
        </div>
      )}
      <div className={title || icon ? "p-5" : ""}>
        {children}
      </div>
    </div>
  );
}

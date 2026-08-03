import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  icon?: React.ReactNode;
}

export default function Card({ children, className = "", title, icon }: CardProps) {
  return (
    <div className={`rounded-xl border border-line bg-panel/60 backdrop-blur-sm overflow-hidden ${className}`}>
      {(title || icon) && (
        <div className="flex items-center gap-3 px-5 py-4 border-b border-line/50">
          {icon && <div className="text-signal">{icon}</div>}
          {title && <h3 className="font-display font-medium text-fog">{title}</h3>}
        </div>
      )}
      <div className={title || icon ? "p-5" : ""}>
        {children}
      </div>
    </div>
  );
}

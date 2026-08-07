import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "outline" | "solid" | "warning" | "success" | "outline-green";
  icon?: React.ReactNode;
}

export default function Badge({ children, variant = "outline", icon }: BadgeProps) {
  const baseStyles = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium tracking-wide uppercase border";
  
  let variantStyles = "";
  switch (variant) {
    case "outline":
      variantStyles = "border-sky-600 text-sky-700 bg-sky-50";
      break;
    case "outline-green":
      variantStyles = "border-sky-600 text-sky-700 bg-sky-50 font-semibold";
      break;
    case "solid":
      variantStyles = "border-sky-600 text-white bg-sky-600 font-semibold";
      break;
    case "warning":
      variantStyles = "border-amber-600 text-amber-800 bg-amber-50 font-semibold";
      break;
    case "success":
      variantStyles = "border-sky-600 text-sky-700 bg-sky-50 font-semibold";
      break;
  }

  return (
    <span className={`${baseStyles} ${variantStyles}`}>
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </span>
  );
}

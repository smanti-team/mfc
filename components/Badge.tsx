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
      baseStyles.concat(" border-electrode text-electrode bg-electrode/10");
      variantStyles = "border-electrode text-electrode bg-electrode/10";
      break;
    case "outline-green":
      variantStyles = "border-signal text-signal bg-signal/10";
      break;
    case "solid":
      variantStyles = "border-signal text-ink bg-signal";
      break;
    case "warning":
      variantStyles = "border-electrode text-electrode bg-electrode/10";
      break;
    case "success":
      variantStyles = "border-signal text-signal bg-signal/10";
      break;
  }

  return (
    <span className={`${baseStyles} ${variantStyles}`}>
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </span>
  );
}

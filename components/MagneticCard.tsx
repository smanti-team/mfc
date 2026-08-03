"use client";

import React, { useRef, useCallback } from "react";

interface MagneticCardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  /** How strong the tilt effect is (default: 15) */
  tiltStrength?: number;
  /** How strong the magnetic pull is in px (default: 8) */
  magnetStrength?: number;
}

export default function MagneticCard({
  children,
  className = "",
  title,
  icon,
  tiltStrength = 15,
  magnetStrength = 8,
}: MagneticCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const card = cardRef.current;
      if (!card) return;

      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        // Relative position from center (-1 to 1)
        const dx = (e.clientX - cx) / (rect.width / 2);
        const dy = (e.clientY - cy) / (rect.height / 2);

        // Tilt: invert dx for natural feel
        const rotateX = -dy * tiltStrength;
        const rotateY = dx * tiltStrength;

        // Magnetic translate
        const tx = dx * magnetStrength;
        const ty = dy * magnetStrength;

        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translate3d(${tx}px, ${ty}px, 0) scale3d(1.02, 1.02, 1)`;
        card.style.transition = "transform 0.05s ease-out, box-shadow 0.2s";
        card.style.boxShadow = `
          0 0 30px rgba(74, 222, 148, 0.12),
          ${-tx * 1.5}px ${-ty * 1.5}px 30px rgba(74,222,148,0.04)
        `;

        // Glow follows mouse inside card
        if (glowRef.current) {
          const localX = ((e.clientX - rect.left) / rect.width) * 100;
          const localY = ((e.clientY - rect.top) / rect.height) * 100;
          glowRef.current.style.background = `radial-gradient(250px circle at ${localX}% ${localY}%, rgba(74,222,148,0.12), transparent)`;
          glowRef.current.style.opacity = "1";
        }
      });
    },
    [tiltStrength, magnetStrength]
  );

  const handleMouseLeave = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const card = cardRef.current;
    if (card) {
      card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) translate3d(0, 0, 0) scale3d(1, 1, 1)";
      card.style.transition = "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.5s";
      card.style.boxShadow = "";
    }
    if (glowRef.current) {
      glowRef.current.style.opacity = "0";
    }
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`rounded-xl border border-line bg-panel/60 backdrop-blur-sm overflow-hidden relative ${className}`}
      style={{ willChange: "transform", transformStyle: "preserve-3d" }}
    >
      {/* Inner glow overlay */}
      <div
        ref={glowRef}
        className="absolute inset-0 pointer-events-none z-0 rounded-xl"
        style={{ opacity: 0, transition: "opacity 0.3s" }}
      />

      {/* Card content */}
      <div className="relative z-10">
        {(title || icon) && (
          <div className="flex items-center gap-3 px-5 py-4 border-b border-line/50">
            {icon && <div className="text-signal">{icon}</div>}
            {title && <h3 className="font-display font-medium text-fog">{title}</h3>}
          </div>
        )}
        <div className={title || icon ? "p-5" : ""}>{children}</div>
      </div>
    </div>
  );
}

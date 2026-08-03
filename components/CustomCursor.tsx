"use client";

import { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const trailsRef = useRef<HTMLDivElement[]>([]);

  const [isPointer, setIsPointer] = useState(false);
  const [isHidden, setIsHidden] = useState(true);

  const mouse = useRef({ x: 0, y: 0 });
  const ring = useRef({ x: 0, y: 0 });
  const trails = useRef<{ x: number; y: number }[]>(
    Array.from({ length: 8 }, () => ({ x: 0, y: 0 }))
  );
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      setIsHidden(false);

      // Check if hovering interactive element
      const target = e.target as HTMLElement;
      const isClickable =
        target.closest("a, button, [role='button'], input, select, textarea") !== null;
      setIsPointer(isClickable);
    };

    const onLeave = () => setIsHidden(true);
    const onEnter = () => setIsHidden(false);

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const animate = () => {
      // Dot: snappy
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mouse.current.x - 4}px, ${mouse.current.y - 4}px)`;
      }

      // Ring: lags behind smoothly
      ring.current.x = lerp(ring.current.x, mouse.current.x, 0.12);
      ring.current.y = lerp(ring.current.y, mouse.current.y, 0.12);
      if (ringRef.current) {
        const size = isPointer ? 48 : 32;
        ringRef.current.style.transform = `translate(${ring.current.x - size / 2}px, ${ring.current.y - size / 2}px)`;
        ringRef.current.style.width = `${size}px`;
        ringRef.current.style.height = `${size}px`;
      }

      // Trails: each follows previous
      for (let i = 0; i < trails.current.length; i++) {
        const target = i === 0 ? mouse.current : trails.current[i - 1];
        trails.current[i].x = lerp(trails.current[i].x, target.x, 0.3 - i * 0.025);
        trails.current[i].y = lerp(trails.current[i].y, target.y, 0.3 - i * 0.025);
        const el = trailsRef.current[i];
        if (el) {
          const size = 6 - i * 0.6;
          const opacity = (1 - i / trails.current.length) * 0.35;
          el.style.transform = `translate(${trails.current[i].x - size / 2}px, ${trails.current[i].y - size / 2}px)`;
          el.style.width = `${size}px`;
          el.style.height = `${size}px`;
          el.style.opacity = `${opacity}`;
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      cancelAnimationFrame(rafRef.current);
    };
  }, [isPointer]);

  if (isHidden && mouse.current.x === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{ opacity: isHidden ? 0 : 1, transition: "opacity 0.3s" }}
    >
      {/* Dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-2 h-2 rounded-full bg-signal"
        style={{
          boxShadow: "0 0 8px rgba(74,222,148,0.9), 0 0 20px rgba(74,222,148,0.4)",
          willChange: "transform",
          zIndex: 9999,
        }}
      />

      {/* Ring */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 rounded-full border border-signal/60"
        style={{
          willChange: "transform, width, height",
          transition: "width 0.2s, height 0.2s",
          boxShadow: isPointer ? "0 0 16px rgba(74,222,148,0.3)" : "none",
          zIndex: 9998,
        }}
      />

      {/* Trails */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { if (el) trailsRef.current[i] = el; }}
          className="fixed top-0 left-0 rounded-full bg-signal"
          style={{ willChange: "transform, opacity", zIndex: 9997 }}
        />
      ))}
    </div>
  );
}

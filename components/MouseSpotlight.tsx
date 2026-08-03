"use client";

import { useEffect, useRef } from "react";

export default function MouseSpotlight() {
  const spotRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -9999, y: -9999 });
  const cur = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
    };

    document.addEventListener("mousemove", onMove);

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const animate = () => {
      cur.current.x = lerp(cur.current.x, pos.current.x, 0.06);
      cur.current.y = lerp(cur.current.y, pos.current.y, 0.06);

      if (spotRef.current) {
        spotRef.current.style.background = `radial-gradient(600px circle at ${cur.current.x}px ${cur.current.y}px, rgba(74,222,148,0.06) 0%, rgba(74,222,148,0.02) 30%, transparent 70%)`;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={spotRef}
      className="pointer-events-none fixed inset-0 z-[1]"
      style={{ transition: "background 0.1s" }}
    />
  );
}

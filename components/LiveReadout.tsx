"use client";

import { useEffect, useState } from "react";
import type { Reading } from "@/lib/types";
import { formatClock, formatDate, secondsSince } from "@/lib/format";

export default function LiveReadout({ reading }: { reading: Reading | null }) {
  const [, setTick] = useState(0);

  // Re-render every second so the "stale" status stays accurate without a refetch.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const stale = reading ? secondsSince(reading.timestamp) > 60 : true;

  return (
    <div className="circuit-bg relative overflow-hidden rounded-2xl border border-line bg-panel/60 px-6 py-10 sm:px-10 sm:py-14">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink/70" />

      <p className="relative mb-6 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-muted">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            stale ? "bg-electrode" : "bg-signal animate-pulseDot"
          }`}
        />
        {stale ? "signal stale" : "live sensor feed"}
      </p>

      <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-glow text-6xl font-bold leading-none text-signal sm:text-8xl">
              {reading ? reading.tds.toLocaleString() : "—"}
            </span>
            <span className="font-mono text-xl text-muted sm:text-2xl">ppm TDS</span>
          </div>
          <p className="mt-3 font-display text-sm text-muted sm:text-base">
            Total dissolved solids in the bioreactor chamber
          </p>
        </div>

        <div className="rounded-xl border border-line bg-ink/50 px-5 py-4 font-mono">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted">measured at</p>
          <p className="mt-1 text-2xl font-semibold text-fog">
            {reading ? formatClock(reading.timestamp) : "--:--:--"}
          </p>
          <p className="text-xs text-muted">{reading ? formatDate(reading.timestamp) : "no data yet"}</p>
        </div>
      </div>
    </div>
  );
}

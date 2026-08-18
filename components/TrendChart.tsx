"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { Reading } from "@/lib/types";
import { formatClock } from "@/lib/format";

export default function TrendChart({ history }: { history: Reading[] }) {
  const data = history.map((r) => ({
    time: formatClock(r.timestamp),
    tds: r.tds,
  }));

  return (
    <div className="rounded-2xl border border-line bg-panel/60 p-5 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">Trend</p>
          <h2 className="font-display text-lg font-medium text-fog sm:text-xl">
            Last {data.length || 10} readings
          </h2>
        </div>
        <span className="hidden font-mono text-xs text-muted sm:block">mg/L over time</span>
      </div>

      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-line font-mono text-sm text-muted">
          Waiting for readings from the sensor…
        </div>
      ) : (
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="tdsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4ADE94" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#4ADE94" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#22403A" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#8FADA3"
                fontSize={11}
                fontFamily="var(--font-mono)"
                tickLine={false}
                axisLine={{ stroke: "#22403A" }}
              />
              <YAxis
                stroke="#8FADA3"
                fontSize={11}
                fontFamily="var(--font-mono)"
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                contentStyle={{
                  background: "#0B1A17",
                  border: "1px solid #22403A",
                  borderRadius: 8,
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "#E7F2ED",
                }}
                labelStyle={{ color: "#8FADA3" }}
                formatter={(value: number) => [`${value.toLocaleString()} mg/L`, "TDS"]}
              />
              <Area
                type="monotone"
                dataKey="tds"
                stroke="#4ADE94"
                strokeWidth={2}
                fill="url(#tdsFill)"
                dot={{ r: 3, fill: "#4ADE94", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#4ADE94" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

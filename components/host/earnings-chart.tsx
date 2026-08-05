"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

import { formatCents } from "@/lib/utils";

export interface EarningsPoint {
  month: string; // e.g. "2026-05"
  amountCents: number;
}

export function EarningsChart({ data }: { data: EarningsPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(value: number) => formatCents(value).replace(".00", "")}
          width={70}
        />
        <Tooltip
          formatter={(value: number) => formatCents(value)}
          labelClassName="text-foreground"
        />
        <Line
          type="monotone"
          dataKey="amountCents"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

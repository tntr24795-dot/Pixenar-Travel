"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCents } from "@/lib/utils";

export interface DailyPoint {
  date: string;
  bookings: number;
  revenueCents: number;
}

export interface TopListingPoint {
  title: string;
  bookings: number;
}

const AXIS_STYLE = { fontSize: 12 };

export function BookingsOverTimeChart({ data }: { data: DailyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={AXIS_STYLE} minTickGap={24} />
        <YAxis tick={AXIS_STYLE} allowDecimals={false} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="bookings"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
          name="Bookings created"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function RevenueOverTimeChart({ data }: { data: DailyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={AXIS_STYLE} minTickGap={24} />
        <YAxis
          tick={AXIS_STYLE}
          tickFormatter={(v: number) => formatCents(v)}
          width={80}
        />
        <Tooltip formatter={(v: number) => formatCents(v)} />
        <Line
          type="monotone"
          dataKey="revenueCents"
          stroke="hsl(var(--accent))"
          strokeWidth={2}
          dot={false}
          name="Guest service fee revenue"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function TopListingsChart({ data }: { data: TopListingPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(280, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis type="number" tick={AXIS_STYLE} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="title"
          tick={AXIS_STYLE}
          width={160}
        />
        <Tooltip />
        <Bar dataKey="bookings" fill="hsl(var(--primary))" name="Bookings" />
      </BarChart>
    </ResponsiveContainer>
  );
}

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DailyChartPoint } from "@/lib/summary-normalizers";

/**
 * 7-day stacked-ish bar chart of in/out totals.
 * Data is pre-normalized server-side: every day in the window has a row,
 * with 0 when no transactions occurred.
 */
export function DailyTransactionsChart({ data }: { data: DailyChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--border))" }}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--border))" }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelFormatter={(label) => `${label}`}
          formatter={(value, name) => [
            Number(value ?? 0).toLocaleString("ko-KR"),
            name === "in" ? "입고" : "출고",
          ]}
        />
        <Legend
          formatter={(value) => (value === "in" ? "입고" : "출고")}
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="in" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="out" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TopOutgoingPoint = {
  name: string;
  total: number;
};

/**
 * Horizontal bar chart of top 10 products by outgoing quantity (all-time).
 */
export function TopOutgoingChart({ data }: { data: TopOutgoingPoint[] }) {
  // Recharts horizontal layout: XAxis numeric, YAxis category
  const height = Math.max(220, data.length * 32 + 40);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 16, left: 16, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--border))" }}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--border))" }}
          width={120}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [Number(value ?? 0).toLocaleString("ko-KR"), "출고 합계"]}
        />
        <Bar dataKey="total" fill="#914b1e" radius={[0, 2, 2, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

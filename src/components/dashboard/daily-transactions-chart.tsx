"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DailyChartPoint } from "@/lib/summary-normalizers";

const COLORS = {
  inBar: "#93CFC1",
  outBar: "#F0A898",
  inLine: "#4DA697",
  outLine: "#D4705A",
};

const LABEL: Record<string, string> = {
  inCount: "입고 건수",
  outCount: "출고 건수",
  in: "입고 수량",
  out: "출고 수량",
};

/**
 * 7-day combo chart: bars for transaction count (left Y), lines for quantity (right Y).
 */
export function DailyTransactionsChart({ data }: { data: DailyChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--border))" }}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          label={{ value: "건수", angle: -90, position: "insideLeft", fontSize: 11, fill: "#999", offset: 16 }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          label={{ value: "수량", angle: 90, position: "insideRight", fontSize: 11, fill: "#999", offset: 16 }}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value, name) => [
            Number(value ?? 0).toLocaleString("ko-KR"),
            LABEL[name as string] ?? name,
          ]}
        />
        <Legend
          formatter={(value) => LABEL[value as string] ?? value}
          wrapperStyle={{ fontSize: 11 }}
        />
        <Bar yAxisId="left" dataKey="inCount" fill={COLORS.inBar} radius={[4, 4, 0, 0]} barSize={16} />
        <Bar yAxisId="left" dataKey="outCount" fill={COLORS.outBar} radius={[4, 4, 0, 0]} barSize={16} />
        <Line yAxisId="right" type="monotone" dataKey="in" stroke={COLORS.inLine} strokeWidth={2} dot={{ r: 3 }} />
        <Line yAxisId="right" type="monotone" dataKey="out" stroke={COLORS.outLine} strokeWidth={2} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

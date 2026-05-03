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

import type { MonthlyChartPoint } from "@/lib/summary-normalizers";

const COLORS = {
  inBar: "#4F8A55",
  outBar: "#C96442",
  inLine: "#34322E",
  outLine: "#913A22",
};

const LABEL: Record<string, string> = {
  inCount: "입고 건수",
  outCount: "출고 건수",
  in: "입고 수량",
  out: "출고 수량",
};

export function MonthlyTransactionsChart({ data }: { data: MonthlyChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e9e8e6" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#45474c" }}
          tickLine={false}
          axisLine={{ stroke: "#e9e8e6" }}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 11, fill: "#76777c" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          label={{ value: "건수", angle: -90, position: "insideLeft", fontSize: 11, fill: "#76777c", offset: 16 }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 11, fill: "#76777c" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          label={{ value: "수량", angle: 90, position: "insideRight", fontSize: 11, fill: "#76777c", offset: 16 }}
        />
        <Tooltip
          contentStyle={{
            background: "#ffffff",
            border: "none",
            borderRadius: 4,
            boxShadow: "0 20px 40px rgba(27, 28, 27, 0.06)",
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
        <Bar yAxisId="left" dataKey="inCount" fill={COLORS.inBar} radius={[2, 2, 0, 0]} barSize={14} />
        <Bar yAxisId="left" dataKey="outCount" fill={COLORS.outBar} radius={[2, 2, 0, 0]} barSize={14} />
        <Line yAxisId="right" type="monotone" dataKey="in" stroke={COLORS.inLine} strokeWidth={2} dot={{ r: 2.5 }} />
        <Line yAxisId="right" type="monotone" dataKey="out" stroke={COLORS.outLine} strokeWidth={2} dot={{ r: 2.5 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

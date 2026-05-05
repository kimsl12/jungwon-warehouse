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

const COLORS = {
  totalBar: "#4F8A55",
  fallbackBar: "#C96442",
  usersLine: "#34322E",
};

const LABEL: Record<string, string> = {
  total: "전체 호출",
  fellBack: "폴백 호출",
  users: "사용자 수",
};

export type UsagePoint = {
  label: string;
  total: number;
  fellBack: number;
  users: number;
};

export function UsageChart({ data }: { data: UsagePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart
        data={data}
        margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#e9e8e6"
          vertical={false}
        />
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
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 11, fill: "#76777c" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
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
        <Bar
          yAxisId="left"
          dataKey="total"
          fill={COLORS.totalBar}
          radius={[2, 2, 0, 0]}
          barSize={14}
        />
        <Bar
          yAxisId="left"
          dataKey="fellBack"
          fill={COLORS.fallbackBar}
          radius={[2, 2, 0, 0]}
          barSize={14}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="users"
          stroke={COLORS.usersLine}
          strokeWidth={2}
          dot={{ r: 2.5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

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

const COLORS = {
  input: "#4F8A55",
  output: "#34322E",
};

const LABEL: Record<string, string> = {
  input: "입력 토큰",
  output: "출력 토큰",
};

export type TokenPoint = {
  label: string;
  input: number;
  output: number;
};

export function TokenChart({ data }: { data: TokenPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
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
          tick={{ fontSize: 11, fill: "#76777c" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          tickFormatter={(value) => {
            const n = Number(value);
            if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
            return String(n);
          }}
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
          dataKey="input"
          stackId="t"
          fill={COLORS.input}
          radius={[0, 0, 0, 0]}
          barSize={14}
        />
        <Bar
          dataKey="output"
          stackId="t"
          fill={COLORS.output}
          radius={[2, 2, 0, 0]}
          barSize={14}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

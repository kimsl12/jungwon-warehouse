"use client";

import { Bar, BarChart, ResponsiveContainer } from "recharts";

type Props = {
  data: number[];
  height?: number;
  color?: string;
};

export function MiniBars({
  data,
  height = 44,
  color = "var(--c-brand-500)",
}: Props) {
  const series = data.map((value, index) => ({ value, index }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={series} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <Bar
          dataKey="value"
          fill={color}
          radius={[2, 2, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

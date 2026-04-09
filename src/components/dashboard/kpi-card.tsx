import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Compact KPI card used on the dashboard overview.
 * Tone changes the accent color (default neutral, warning red, positive green).
 */
export function KpiCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "warning" | "positive";
}) {
  return (
    <Card>
      <CardContent className="space-y-1.5 py-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "text-2xl font-semibold tabular-nums",
            tone === "warning" && "text-destructive",
            tone === "positive" && "text-emerald-600 dark:text-emerald-400",
          )}
        >
          {value}
        </p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

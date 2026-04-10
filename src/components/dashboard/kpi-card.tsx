import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "warning" | "positive" | "critical";
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded bg-card p-5 space-y-2",
        tone === "critical" && "bg-secondary text-secondary-foreground",
      )}
    >
      <div className="flex items-center justify-between">
        <p
          className={cn(
            "text-[10px] font-semibold uppercase tracking-widest",
            tone === "critical" ? "text-secondary-foreground/70" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        {icon && (
          <span className={cn(
            tone === "critical" ? "text-secondary-foreground/60" : "text-muted-foreground/40",
          )}>
            {icon}
          </span>
        )}
      </div>
      <p
        className={cn(
          "text-3xl font-extrabold tabular-nums tracking-tight",
          tone === "warning" && "text-destructive",
          tone === "positive" && "text-emerald-600",
          tone === "critical" && "text-secondary-foreground",
        )}
      >
        {value}
      </p>
      {hint && (
        <p
          className={cn(
            "text-xs",
            tone === "critical" ? "text-secondary-foreground/70" : "text-muted-foreground",
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

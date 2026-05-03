import type { LucideIcon } from "lucide-react";

import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: React.ReactNode;
  delta?: string;
  deltaTone?: StatusTone;
  deltaCaption?: string;
  icon?: LucideIcon;
  iconAccent?: "brand" | "success" | "warning" | "danger" | "info";
  children?: React.ReactNode;
  className?: string;
};

const ACCENTS: Record<NonNullable<Props["iconAccent"]>, string> = {
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
};

export function KPICard({
  label,
  value,
  delta,
  deltaTone = "success",
  deltaCaption = "전주 대비",
  icon: Icon,
  iconAccent = "brand",
  children,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card p-[18px] shadow-xs",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[12.5px] font-medium text-muted-foreground">
          {label}
        </div>
        {Icon && (
          <div
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-md",
              ACCENTS[iconAccent],
            )}
          >
            <Icon className="size-4" />
          </div>
        )}
      </div>
      <div className="font-display text-[26px] font-semibold leading-none tracking-tight tabular-nums text-foreground">
        {value}
      </div>
      {delta && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <StatusBadge tone={deltaTone}>{delta}</StatusBadge>
          {deltaCaption && <span>{deltaCaption}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

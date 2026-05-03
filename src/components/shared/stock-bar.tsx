import { cn } from "@/lib/utils";

type Props = {
  current: number;
  safe: number;
  unit?: string;
  className?: string;
  showLabel?: boolean;
};

export function StockBar({
  current,
  safe,
  unit,
  className,
  showLabel = true,
}: Props) {
  const ratio = safe > 0 ? current / safe : 1;
  const pct = Math.min(150, ratio * 100);
  const fillPct = Math.min(100, pct);
  const colorClass =
    pct >= 100 ? "bg-success" : pct >= 60 ? "bg-warning" : "bg-danger";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={safe}
      >
        <div
          className={cn("h-full rounded-full transition-all", colorClass)}
          style={{ width: `${fillPct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {current}
          {unit ? unit : ""}
          <span className="text-muted-foreground/60"> / {safe}</span>
        </span>
      )}
    </div>
  );
}

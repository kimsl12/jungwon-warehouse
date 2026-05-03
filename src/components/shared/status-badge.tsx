import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "brand"
  | "neutral";

const TONE_STYLES: Record<StatusTone, string> = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  brand: "bg-brand-50 text-brand-700 dark:text-brand-300",
  neutral: "bg-muted text-muted-foreground",
};

export function StatusBadge({
  tone = "neutral",
  dot = false,
  children,
  className,
}: {
  tone?: StatusTone;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-auto rounded-full border-transparent px-2 py-0.5 text-[11.5px] font-semibold tracking-[0.01em]",
        TONE_STYLES[tone],
        className,
      )}
    >
      {dot && (
        <span
          className="size-1.5 shrink-0 rounded-full bg-current"
          aria-hidden
        />
      )}
      {children}
    </Badge>
  );
}

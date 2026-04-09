import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

type SearchParams = Promise<{
  type?: string;
  qty?: string;
  new?: string;
  name?: string;
  unit?: string;
  low?: string;
}>;

/**
 * Step 3 of mobile flow: confirmation. Reads result data from URL params
 * (set by /m/transaction → form action).
 */
export default async function MobileDonePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const type = params.type === "in" ? "in" : "out";
  const qty = Number(params.qty ?? 0);
  const newQty = Number(params.new ?? 0);
  const name = params.name ?? "";
  const unit = params.unit ?? "";
  const isLow = params.low === "1";

  return (
    <div className="space-y-6 pt-8 text-center">
      <div
        className={
          type === "in"
            ? "mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
            : "mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-3xl text-amber-600 dark:bg-amber-950 dark:text-amber-400"
        }
      >
        ✓
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-bold">
          {type === "in" ? "입고 완료" : "출고 완료"}
        </h1>
        <p className="text-sm text-muted-foreground">{name}</p>
      </div>

      <div className="rounded-lg border bg-background p-4 text-left">
        <div className="flex items-center justify-between border-b py-2 text-sm">
          <span className="text-muted-foreground">처리 수량</span>
          <span className="text-base font-semibold tabular-nums">
            {type === "in" ? "+" : "−"}
            {qty.toLocaleString("ko-KR")}
            {unit && <span className="ml-0.5 text-xs font-normal">{unit}</span>}
          </span>
        </div>
        <div className="flex items-center justify-between py-2 text-sm">
          <span className="text-muted-foreground">현재 재고</span>
          <span
            className={
              isLow
                ? "text-base font-semibold tabular-nums text-destructive"
                : "text-base font-semibold tabular-nums"
            }
          >
            {newQty.toLocaleString("ko-KR")}
            {unit && <span className="ml-0.5 text-xs font-normal">{unit}</span>}
          </span>
        </div>
        {isLow && (
          <p className="mt-2 rounded-md bg-destructive/10 p-2 text-center text-xs font-medium text-destructive">
            재고가 최소 수량 이하입니다
          </p>
        )}
      </div>

      <div className="space-y-2 pt-4">
        <Link
          href="/m/scan"
          className={`${buttonVariants({ size: "lg" })} h-12 w-full text-base`}
        >
          다른 품목 처리
        </Link>
        <Link
          href="/overview"
          className={`${buttonVariants({ variant: "outline", size: "lg" })} h-12 w-full text-base`}
        >
          데스크톱 모드로
        </Link>
      </div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MobileOutboundPage() {
  const supabase = await createClient();

  const { data, count } = await supabase
    .from("transactions")
    .select("id, type, quantity, created_at, created_by, site_id, products!inner(name, category, unit), sites(name)", { count: "exact" })
    .eq("type", "out")
    .order("created_at", { ascending: false })
    .limit(30);

  const transactions = data ?? [];
  const totalCount = count ?? 0;

  const userIds = [...new Set(transactions.map((t) => t.created_by).filter(Boolean))] as string[];
  const profileMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", userIds);
    (profiles ?? []).forEach((p) => { if (p.name) profileMap.set(p.id, p.name); });
  }

  const dateFmt = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-4">
      {/* KPI header */}
      <div className="rounded bg-secondary text-secondary-foreground p-4">
        <p className="text-[10px] font-medium uppercase tracking-widest text-secondary-foreground/60">
          출고 내역
        </p>
        <p className="text-3xl font-extrabold mt-1 tabular-nums">
          {totalCount.toLocaleString("ko-KR")}
        </p>
        <p className="text-xs text-secondary-foreground/60 mt-0.5">전체 출고 건수</p>
      </div>

      {/* List */}
      <div className="space-y-2">
        {transactions.length === 0 ? (
          <p className="rounded bg-card p-6 text-center text-sm text-muted-foreground">
            출고 내역이 없습니다.
          </p>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="rounded bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{tx.products?.name ?? "-"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tx.sites?.name ?? "현장 미지정"} · {tx.created_by ? profileMap.get(tx.created_by) ?? "-" : "시스템"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-bold tabular-nums text-secondary">
                    -{tx.quantity.toLocaleString("ko-KR")}
                    {tx.products?.unit && (
                      <span className="ml-0.5 text-xs font-normal text-muted-foreground">{tx.products.unit}</span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    {dateFmt.format(new Date(tx.created_at))}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

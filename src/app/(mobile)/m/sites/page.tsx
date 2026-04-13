import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MobileSitesPage() {
  const supabase = await createClient();

  const { data: sites } = await supabase
    .from("sites")
    .select("id, name, address, contact, active")
    .order("active", { ascending: false })
    .order("name");

  const allSites = sites ?? [];
  const activeCount = allSites.filter((s) => s.active).length;

  return (
    <div className="space-y-4">
      {/* KPI header */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">전체 현장</p>
          <p className="text-2xl font-extrabold mt-1 tabular-nums">{allSites.length}</p>
        </div>
        <div className="rounded bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">활성</p>
          <p className="text-2xl font-extrabold mt-1 tabular-nums text-emerald-600">{activeCount}</p>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {allSites.length === 0 ? (
          <p className="rounded bg-card p-6 text-center text-sm text-muted-foreground">
            등록된 현장이 없습니다.
          </p>
        ) : (
          allSites.map((site) => (
            <div
              key={site.id}
              className={`rounded bg-card p-3 ${site.active ? "" : "opacity-50"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{site.name}</p>
                    {site.active ? (
                      <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">활성</span>
                    ) : (
                      <span className="shrink-0 rounded bg-surface-high px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">비활성</span>
                    )}
                  </div>
                  {(site.address || site.contact) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[site.address, site.contact].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

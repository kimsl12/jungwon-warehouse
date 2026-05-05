import { redirect } from "next/navigation";

import { TokenChart, type TokenPoint } from "@/components/ai-usage/token-chart";
import { UsageChart, type UsagePoint } from "@/components/ai-usage/usage-chart";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const USER_DAILY_LIMIT = 100;
const GLOBAL_DAILY_LIMIT = 1300;

function todayStartSeoul(): string {
  const now = new Date();
  const seoul = new Date(now.getTime() + 9 * 3600 * 1000);
  const ymd = seoul.toISOString().slice(0, 10);
  return `${ymd}T00:00:00+09:00`;
}

function formatDayLabel(day: string): string {
  const d = new Date(`${day}T00:00:00+09:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function ymdSeoul(iso: string): string {
  // ISO timestamptz → Asia/Seoul YYYY-MM-DD
  const utc = new Date(iso);
  const seoul = new Date(utc.getTime() + 9 * 3600 * 1000);
  return seoul.toISOString().slice(0, 10);
}

export default async function AIUsagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/overview");

  const todayStart = todayStartSeoul();

  // 오늘 전체 호출수
  const { count: todayGlobal } = await supabase
    .from("gemini_usage_log")
    .select("id", { count: "exact", head: true })
    .gte("created_at", todayStart);

  // 오늘 호출 row 들 (사용자별 집계 + 토큰 합계용)
  const { data: todayRowsRaw } = await supabase
    .from("gemini_usage_log")
    .select("user_id, prompt_tokens, response_tokens")
    .gte("created_at", todayStart);
  const todayRows = todayRowsRaw ?? [];

  const userCounts = new Map<string, number>();
  let todayPromptTokens = 0;
  let todayResponseTokens = 0;
  todayRows.forEach((r) => {
    todayPromptTokens += r.prompt_tokens ?? 0;
    todayResponseTokens += r.response_tokens ?? 0;
    const id = r.user_id;
    if (!id) return;
    userCounts.set(id, (userCounts.get(id) ?? 0) + 1);
  });
  const todayTotalTokens = todayPromptTokens + todayResponseTokens;
  const topUserIds = [...userCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 사용자 이름 매핑
  const ids = topUserIds.map(([id]) => id);
  const { data: nameRows } = ids.length
    ? await supabase.from("profiles").select("id, name").in("id", ids)
    : { data: null };
  const nameById = new Map(
    (nameRows ?? []).map((r) => [r.id as string, r.name as string]),
  );

  // 일별 집계 (RPC)
  const { data: dailyRaw } = await supabase.rpc("gemini_usage_daily", {
    p_days: 14,
  });
  const daily = dailyRaw ?? [];
  const chartData: UsagePoint[] = daily.map((d) => ({
    label: formatDayLabel(d.day),
    total: Number(d.total_calls),
    fellBack: Number(d.fell_back_calls),
    users: Number(d.unique_users),
  }));

  // 14일 일별 토큰 합계 (gemini_usage_daily RPC 에 없어 직접 SUM)
  const fourteenDaysAgo = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data: tokenRows } = await supabase
    .from("gemini_usage_log")
    .select("created_at, prompt_tokens, response_tokens")
    .gte("created_at", fourteenDaysAgo);
  const tokenByDay = new Map<string, { input: number; output: number }>();
  (tokenRows ?? []).forEach((r) => {
    const day = ymdSeoul(r.created_at);
    const agg = tokenByDay.get(day) ?? { input: 0, output: 0 };
    agg.input += r.prompt_tokens ?? 0;
    agg.output += r.response_tokens ?? 0;
    tokenByDay.set(day, agg);
  });
  const tokenChartData: TokenPoint[] = [...tokenByDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, t]) => ({
      label: formatDayLabel(day),
      input: t.input,
      output: t.output,
    }));

  // 최근 50건
  const { data: recentRaw } = await supabase
    .from("gemini_usage_log")
    .select(
      "id, user_id, model_used, fell_back, prompt_tokens, response_tokens, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  const recent = recentRaw ?? [];

  // 최근 50건 사용자명 매핑
  const recentUserIds = [
    ...new Set(recent.map((r) => r.user_id).filter((x): x is string => !!x)),
  ];
  const { data: recentNameRows } = recentUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, name")
        .in("id", recentUserIds)
    : { data: null };
  const recentNameById = new Map(
    (recentNameRows ?? []).map((r) => [r.id as string, r.name as string]),
  );

  const todayTotal = todayGlobal ?? 0;
  const globalRemaining = Math.max(0, GLOBAL_DAILY_LIMIT - todayTotal);
  const usagePct = Math.min(100, (todayTotal / GLOBAL_DAILY_LIMIT) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">AI 사용량</h2>
        <p className="text-sm text-muted-foreground">
          Gemini 챗봇 일일 호출량 — 사용자당 {USER_DAILY_LIMIT}회/일,
          전체 {GLOBAL_DAILY_LIMIT.toLocaleString("ko-KR")}회/일 (Asia/Seoul 자정 기준).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-md border bg-card p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            오늘 전체 호출
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight">
            {todayTotal.toLocaleString("ko-KR")}
            <span className="ml-1 text-base font-normal text-muted-foreground">
              / {GLOBAL_DAILY_LIMIT.toLocaleString("ko-KR")}
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${usagePct}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            잔여 {globalRemaining.toLocaleString("ko-KR")}회
          </div>
        </div>

        <div className="rounded-md border bg-card p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            오늘 토큰 사용량
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight">
            {todayTotalTokens.toLocaleString("ko-KR")}
            <span className="ml-1 text-base font-normal text-muted-foreground">
              tokens
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-muted-foreground">입력</div>
              <div className="mt-0.5 font-mono text-sm font-semibold text-foreground">
                {todayPromptTokens.toLocaleString("ko-KR")}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">출력</div>
              <div className="mt-0.5 font-mono text-sm font-semibold text-foreground">
                {todayResponseTokens.toLocaleString("ko-KR")}
              </div>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            평균 {todayTotal > 0
              ? Math.round(todayTotalTokens / todayTotal).toLocaleString("ko-KR")
              : 0} tokens/호출
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-card p-4">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          오늘 호출 상위 사용자
        </div>
        {topUserIds.length === 0 ? (
          <div className="mt-2 text-sm text-muted-foreground">
            오늘 호출 기록 없음
          </div>
        ) : (
          <ul className="mt-2 space-y-1.5 text-sm">
            {topUserIds.map(([id, count]) => (
              <li key={id} className="flex items-center justify-between">
                <span className="text-foreground">
                  {nameById.get(id) ?? id.slice(0, 8)}
                </span>
                <span className="font-mono text-muted-foreground">
                  {count} / {USER_DAILY_LIMIT}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-md border bg-card p-4">
        <div className="mb-3 text-sm font-semibold">최근 14일 호출 추이</div>
        {chartData.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            데이터 없음
          </div>
        ) : (
          <UsageChart data={chartData} />
        )}
      </div>

      <div className="rounded-md border bg-card p-4">
        <div className="mb-3 text-sm font-semibold">최근 14일 토큰 추이</div>
        {tokenChartData.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            데이터 없음
          </div>
        ) : (
          <TokenChart data={tokenChartData} />
        )}
      </div>

      <div className="rounded-md border bg-card">
        <div className="border-b p-4 text-sm font-semibold">
          최근 호출 (50건)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">시각</th>
                <th className="px-4 py-2 text-left font-medium">사용자</th>
                <th className="px-4 py-2 text-left font-medium">모델</th>
                <th className="px-4 py-2 text-right font-medium">입력</th>
                <th className="px-4 py-2 text-right font-medium">출력</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    호출 기록 없음
                  </td>
                </tr>
              ) : (
                recent.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("ko-KR", {
                        timeZone: "Asia/Seoul",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2">
                      {r.user_id
                        ? (recentNameById.get(r.user_id) ??
                          r.user_id.slice(0, 8))
                        : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs">
                        {r.model_used.replace("gemini-2.5-", "")}
                      </span>
                      {r.fell_back && (
                        <span className="ml-1 rounded bg-secondary/10 px-1.5 py-0.5 text-[10px] text-secondary">
                          폴백
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs">
                      {r.prompt_tokens ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs">
                      {r.response_tokens ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

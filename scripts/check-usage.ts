import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  // 한국 시간(Asia/Seoul) 기준 오늘 0시.
  const now = new Date();
  const seoulTodayStart = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }),
  );
  seoulTodayStart.setHours(0, 0, 0, 0);

  // Pacific Time 기준 — Google quota 는 PT 자정에 reset
  const ptTodayStart = new Date();
  const ptOffset = -8; // PT (PST=-8, PDT=-7, 보수적으로 -8)
  ptTodayStart.setUTCHours(8 + ptOffset * -1, 0, 0, 0);
  if (ptTodayStart.getTime() > now.getTime()) {
    ptTodayStart.setDate(ptTodayStart.getDate() - 1);
  }

  console.log(
    `현재 시각:    ${now.toISOString()} (KST ${now.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })})`,
  );
  console.log(`KST 오늘 0시: ${seoulTodayStart.toISOString()}`);
  console.log(`PT 오늘 0시:  ${ptTodayStart.toISOString()}`);
  console.log("");

  // 1. 오늘(KST) 호출
  const { data: todayKst, error: e1 } = await supabase
    .from("gemini_usage_log")
    .select("model_used, fell_back, image_generated, prompt_tokens, response_tokens, created_at, user_id")
    .gte("created_at", seoulTodayStart.toISOString())
    .order("created_at", { ascending: true });

  if (e1) {
    console.error("KST 쿼리 에러:", e1.message);
    return;
  }

  // 2. 오늘(PT) 호출 — Google quota 와 일치
  const { data: todayPt, error: e2 } = await supabase
    .from("gemini_usage_log")
    .select("model_used, fell_back, image_generated, prompt_tokens, response_tokens, created_at, user_id")
    .gte("created_at", ptTodayStart.toISOString())
    .order("created_at", { ascending: true });

  if (e2) {
    console.error("PT 쿼리 에러:", e2.message);
    return;
  }

  console.log("=== KST 오늘 (사내 카운트 기준) ===");
  reportPeriod(todayKst);
  console.log("");
  console.log("=== PT 오늘 (Google quota 기준) ===");
  reportPeriod(todayPt);
  console.log("");

  // 최근 호출 시간 분포 (분당 burst 확인)
  const recent = (todayKst ?? []).slice(-30);
  console.log("=== 최근 30회 시각 (분당 burst 확인) ===");
  for (const r of recent) {
    const t = new Date(r.created_at).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
    });
    const fb = r.fell_back ? " [FB]" : "";
    console.log(`  ${t}  ${r.model_used}${fb}`);
  }

  // 분당 burst 검출
  console.log("");
  console.log("=== 분당 호출 수 (KST 오늘) ===");
  const perMinute = new Map<string, number>();
  for (const r of todayKst ?? []) {
    const t = new Date(r.created_at);
    const key = `${t.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false })}`;
    perMinute.set(key, (perMinute.get(key) ?? 0) + 1);
  }
  const sorted = Array.from(perMinute.entries()).sort((a, b) => b[1] - a[1]);
  console.log(`  최다 분: ${sorted[0]?.[0]} → ${sorted[0]?.[1]}회`);
  console.log(`  10회 이상 분: ${sorted.filter(([, n]) => n >= 10).length}건`);
  for (const [k, n] of sorted.filter(([, n]) => n >= 8).slice(0, 10)) {
    console.log(`    ${k}: ${n}회`);
  }
}

type Row = {
  model_used: string;
  fell_back: boolean;
  image_generated: boolean;
  prompt_tokens: number | null;
  response_tokens: number | null;
  user_id: string | null;
};

function reportPeriod(rows: Row[] | null) {
  const list = rows ?? [];
  const total = list.length;
  const flash = list.filter((r) => r.model_used === "gemini-2.5-flash").length;
  const flashLite = list.filter((r) => r.model_used === "gemini-2.5-flash-lite")
    .length;
  const fellBack = list.filter((r) => r.fell_back).length;
  const image = list.filter((r) => r.image_generated).length;
  const totalIn = list.reduce((s, r) => s + (r.prompt_tokens ?? 0), 0);
  const totalOut = list.reduce((s, r) => s + (r.response_tokens ?? 0), 0);
  const uniqueUsers = new Set(list.map((r) => r.user_id).filter(Boolean)).size;

  console.log(`  총 record (사용자 메시지 수): ${total}`);
  console.log(`  flash:        ${flash}`);
  console.log(`  flash-lite:   ${flashLite}`);
  console.log(`  fell_back:    ${fellBack}`);
  console.log(`  image:        ${image}`);
  console.log(`  unique users: ${uniqueUsers}`);
  console.log(`  토큰 in:  ${totalIn.toLocaleString()}`);
  console.log(`  토큰 out: ${totalOut.toLocaleString()}`);
}

main();

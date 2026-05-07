import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  // KST 오늘 0시
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffset);
  const kstTodayStart = new Date(
    Date.UTC(
      kstNow.getUTCFullYear(),
      kstNow.getUTCMonth(),
      kstNow.getUTCDate(),
    ) - kstOffset,
  );

  console.log(`KST 현재: ${kstNow.toISOString().slice(0, 19)}`);
  console.log(`KST 오늘 0시 (UTC): ${kstTodayStart.toISOString()}`);
  console.log("");

  const { data: rows, error } = await supabase
    .from("gemini_usage_log")
    .select("user_id, model_used, fell_back, created_at")
    .gte("created_at", kstTodayStart.toISOString());
  if (error) {
    console.error(error);
    return;
  }

  const byUser = new Map<string, number>();
  for (const r of rows ?? []) {
    if (!r.user_id) continue;
    byUser.set(r.user_id, (byUser.get(r.user_id) ?? 0) + 1);
  }

  // profiles 매핑
  const userIds = Array.from(byUser.keys());
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, email, role")
    .in("id", userIds);
  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  console.log(`총 record: ${rows?.length}`);
  console.log(`unique users: ${byUser.size}`);
  console.log("");
  console.log("사용자별 사용량 (KST 오늘):");
  const sorted = Array.from(byUser.entries()).sort((a, b) => b[1] - a[1]);
  for (const [uid, count] of sorted) {
    const p = profileMap.get(uid);
    const role = p?.role ?? "?";
    const name = p?.name ?? p?.email ?? uid.slice(0, 8);
    const status =
      role === "admin"
        ? "면제"
        : count >= 100
          ? "⚠️ 한도 초과 (100/day)"
          : count >= 80
            ? `⚠️ ${count}/100 임박`
            : `${count}/100`;
    console.log(`  [${role}] ${name}: ${count}회 — ${status}`);
  }
}
main();

import "server-only";

import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// VAPID 키는 .env.local 에 등록.
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY=...   (브라우저에 노출 OK — 공개 키)
//   VAPID_PRIVATE_KEY=...              (서버 전용)
//   VAPID_SUBJECT=mailto:admin@example.com
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@jungwon.kr";

let configured = false;
function ensureConfigured(): void {
  if (configured) return;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    throw new Error(
      "VAPID 키가 설정되지 않았습니다. .env.local 의 NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY 확인.",
    );
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  configured = true;
}

export type PushSubscriptionRecord = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushPayload = {
  title: string;
  body: string;
  /** 알림 클릭 시 이동할 경로. 예: "/inventory?filter=low_stock" */
  url?: string;
  /** 같은 tag 의 알림은 새 알림이 기존 것을 대체. */
  tag?: string;
};

type SendResult = {
  sent: number;
  failed: number;
  /** 410/404 로 만료된 endpoint — 호출자가 DB 에서 삭제. */
  expiredEndpoints: string[];
};

async function sendOne(
  sub: PushSubscriptionRecord,
  payload: PushPayload,
): Promise<{ ok: boolean; expired: boolean }> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
    return { ok: true, expired: false };
  } catch (e: unknown) {
    const err = e as { statusCode?: number };
    // 404 Not Found / 410 Gone = 구독 만료. DB 정리 필요.
    if (err.statusCode === 404 || err.statusCode === 410) {
      return { ok: false, expired: true };
    }
    return { ok: false, expired: false };
  }
}

export async function sendToSubscriptions(
  subs: PushSubscriptionRecord[],
  payload: PushPayload,
): Promise<SendResult> {
  ensureConfigured();
  if (subs.length === 0) {
    return { sent: 0, failed: 0, expiredEndpoints: [] };
  }

  const results = await Promise.all(subs.map((s) => sendOne(s, payload)));
  const expiredEndpoints: string[] = [];
  let sent = 0;
  let failed = 0;
  results.forEach((r, i) => {
    if (r.ok) sent++;
    else failed++;
    if (r.expired) expiredEndpoints.push(subs[i].endpoint);
  });
  return { sent, failed, expiredEndpoints };
}

/**
 * service_role 클라이언트 — admin 전체 발송 시 RLS 우회 필요.
 * 호출자 세션의 supabase 클라이언트는 본인 row 만 보이므로 별도 클라이언트가 필수.
 */
function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service role 환경 변수가 설정되지 않았습니다.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * role='admin' 인 모든 사용자의 활성 구독에 발송.
 * 만료된 구독은 자동 정리.
 */
export async function sendToAllAdmins(
  payload: PushPayload,
): Promise<{ sent: number; failed: number; admins: number }> {
  ensureConfigured();
  const svc = createServiceClient();

  const { data: admins } = await svc
    .from("profiles")
    .select("id")
    .eq("role", "admin");
  const adminIds = (admins ?? []).map((a) => a.id as string);
  if (adminIds.length === 0) {
    return { sent: 0, failed: 0, admins: 0 };
  }

  const { data: subs } = await svc
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", adminIds)
    .eq("enabled", true);
  const list = (subs ?? []) as PushSubscriptionRecord[];

  const result = await sendToSubscriptions(list, payload);

  if (result.expiredEndpoints.length > 0) {
    await svc
      .from("push_subscriptions")
      .delete()
      .in("endpoint", result.expiredEndpoints);
  }

  return { sent: result.sent, failed: result.failed, admins: adminIds.length };
}

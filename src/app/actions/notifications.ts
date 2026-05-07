"use server";

import { createClient } from "@/lib/supabase/server";
import { pushSubsTable } from "@/lib/push/db";
import { sendToSubscriptions } from "@/lib/push/send";

export type SubscribeInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/**
 * Web Push 구독 등록. admin 만 가능.
 * 동일 endpoint 가 이미 있으면 업데이트 (브라우저 재구독 시).
 */
export async function subscribePushNotifications(
  sub: SubscribeInput,
  userAgent: string | null,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { error: "관리자만 알림을 받을 수 있습니다." };
  }

  if (
    typeof sub.endpoint !== "string" ||
    sub.endpoint.length === 0 ||
    typeof sub.keys?.p256dh !== "string" ||
    typeof sub.keys?.auth !== "string"
  ) {
    return { error: "구독 정보가 올바르지 않습니다." };
  }

  const { error } = await pushSubsTable(supabase).upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      user_agent: userAgent,
      enabled: true,
    },
    { onConflict: "endpoint" },
  );
  if (error) return { error: "구독 저장 실패: " + error.message };
  return { error: null };
}

export async function unsubscribePushNotifications(
  endpoint: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const { error } = await pushSubsTable(supabase)
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);
  if (error) return { error: "구독 해제 실패: " + error.message };
  return { error: null };
}

/**
 * 본인에게 테스트 알림 발송. admin 전용.
 * 본인 활성 구독 모두에 동일 페이로드.
 */
export async function sendTestPushNotification(): Promise<{
  error: string | null;
  sent: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다.", sent: 0 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { error: "관리자만 사용 가능합니다.", sent: 0 };
  }

  const { data: subs } = await pushSubsTable(supabase)
    .select("endpoint, p256dh, auth")
    .eq("user_id", user.id)
    .eq("enabled", true);
  const list = (subs ?? []) as Array<{
    endpoint: string;
    p256dh: string;
    auth: string;
  }>;
  if (list.length === 0) {
    return { error: "활성 구독이 없습니다. 알림을 먼저 활성화해주세요.", sent: 0 };
  }

  try {
    const result = await sendToSubscriptions(list, {
      title: "테스트 알림",
      body: "Web Push 알림이 정상 동작합니다.",
      url: "/overview",
      tag: "test",
    });
    return { error: null, sent: result.sent };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: "발송 실패: " + msg, sent: 0 };
  }
}

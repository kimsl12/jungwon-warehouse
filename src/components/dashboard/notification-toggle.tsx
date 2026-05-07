"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

import {
  sendTestPushNotification,
  subscribePushNotifications,
  unsubscribePushNotifications,
} from "@/app/actions/notifications";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const b64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type Status = "loading" | "unsupported" | "off" | "on" | "denied";

export function NotificationToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setStatus("unsupported");
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      setStatus("unsupported");
      return;
    }

    void (async () => {
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    })();
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "off");
        alert(
          perm === "denied"
            ? "알림 권한이 차단되어 있습니다. 브라우저 설정 > 사이트 권한에서 허용해주세요."
            : "알림 권한이 부여되지 않았습니다.",
        );
        return;
      }

      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register("/sw.js");
      }
      await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        });
      }

      const json = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        await sub.unsubscribe();
        alert("구독 정보를 생성하지 못했습니다.");
        return;
      }

      const result = await subscribePushNotifications(
        {
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        },
        navigator.userAgent,
      );
      if (result.error) {
        await sub.unsubscribe();
        alert(result.error);
        return;
      }
      setStatus("on");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert("알림 활성화 실패: " + msg);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await unsubscribePushNotifications(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert("알림 해제 실패: " + msg);
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    try {
      const result = await sendTestPushNotification();
      if (result.error) {
        alert(result.error);
      } else {
        alert(`테스트 알림을 ${result.sent}건 발송했습니다.`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert("발송 실패: " + msg);
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading" || status === "unsupported") {
    return null;
  }

  if (status === "denied") {
    return (
      <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[12px] text-muted-foreground">
        <BellOff className="size-[18px] shrink-0" />
        <span className="flex-1 leading-tight">
          알림 차단됨
          <br />
          <span className="text-[10px]">브라우저 설정에서 허용 필요</span>
        </span>
      </div>
    );
  }

  const isOn = status === "on";

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={isOn ? disable : enable}
        disabled={busy}
        className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="size-[18px] shrink-0 animate-spin" />
        ) : isOn ? (
          <Bell className="size-[18px] shrink-0 text-primary" />
        ) : (
          <BellOff className="size-[18px] shrink-0" />
        )}
        <span className="flex-1 truncate text-left">
          {isOn ? "알림 켜짐" : "알림 활성화"}
        </span>
      </button>
      {isOn && (
        <button
          type="button"
          onClick={test}
          disabled={busy}
          className="flex h-7 w-full items-center justify-center rounded-md border border-sidebar-border px-2 text-[11px] text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground disabled:opacity-60"
        >
          테스트 발송
        </button>
      )}
    </div>
  );
}

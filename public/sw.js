// Service Worker — Web Push 알림 수신 + 클릭 처리
// 현재는 푸시 알림 표시 전용. 다른 캐싱/오프라인 기능 X.

self.addEventListener("install", (event) => {
  // 즉시 활성화
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_e) {
    payload = { title: "알림", body: event.data?.text() || "" };
  }

  const title = payload.title || "정원전기 재고관리";
  const options = {
    body: payload.body || "",
    icon: "/jungwon-logo.png",
    badge: "/jungwon-logo.png",
    tag: payload.tag || undefined,
    renotify: !!payload.tag,
    data: { url: payload.url || "/overview" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/overview";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((wins) => {
        // 이미 열려있는 동일 origin 창이 있으면 포커스 + 경로 이동
        for (const w of wins) {
          if ("focus" in w && "navigate" in w) {
            w.focus();
            try {
              w.navigate(target);
            } catch (_e) {
              // navigate 미지원 환경 — 그냥 포커스만
            }
            return;
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});

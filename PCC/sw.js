self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

const ICON = new URL('favicon-192.png', self.registration.scope).href;

const OFFLINE_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PCC Records · Offline</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;text-align:center;padding:24px}div{max-width:320px}h1{font-size:20px;margin:16px 0 8px}p{color:#475569;font-size:15px;line-height:1.5}button{margin-top:16px;padding:10px 20px;border:0;border-radius:12px;background:#1e40af;color:#fff;font-weight:600;font-size:15px}</style></head><body><div><img src="${ICON}" width="72" height="72" alt=""><h1>You're offline</h1><p>PCC Records needs an internet connection. Check your Wi-Fi or mobile data, then try again.</p><button onclick="location.reload()">Try again</button></div></body></html>`;

self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(() => new Response(OFFLINE_PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })),
  );
});

self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const path = String(data.url || '/notifications').replace(/^\//, '');
  event.waitUntil(self.registration.showNotification(data.title || 'PCC Records', {
    body: data.body || '',
    icon: ICON,
    badge: ICON,
    tag: data.id ? String(data.id) : undefined,
    data: { url: new URL(path, self.registration.scope).href },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/notifications', self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target);
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});

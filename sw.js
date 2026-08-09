const CACHE = 'dsl-shell-v2';
const SHELL = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // rør aldrig Supabase/eksterne kald

  // Siden selv: altid netværk først, så nye deploys slår igennem med det samme.
  // Kun hvis brugeren er offline falder vi tilbage til det cachede app-skal.
  if (e.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    e.respondWith(
      fetch(e.request)
        .then(res => { caches.open(CACHE).then(c => c.put(e.request, res.clone())); return res; })
        .catch(() => caches.match(e.request).then(cached => cached || caches.match('/index.html')))
    );
    return;
  }

  // Statiske filer (ikoner, manifest): cache-først er fint, de ændrer sig sjældent
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => caches.match('/index.html')))
  );
});

// Push-notifikationer: udelukkende manuelt coach-udløste (se send-push Edge Function) — ingen
// automatik. Klienten skal selv have aktiveret notifikationer via subscribeToPush() i index.html.
self.addEventListener('push', e => {
  let data = { title: 'Det Skarpe Liv', body: 'Du har en påmindelse fra din coach' };
  try { if (e.data) data = e.data.json(); } catch (err) {}
  e.waitUntil(self.registration.showNotification(data.title || 'Det Skarpe Liv', {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus(); }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  }));
});

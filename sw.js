// Denne fil erstatter den tidligere app-service-worker der lå på rod-scope ('/').
// Klientappen er flyttet til /app/ med sin egen service worker og sit eget scope.
// Denne fil findes udelukkende for at rydde op efter allerede-installerede besøgende:
// browseren finder den ved sit næste opdateringstjek af '/sw.js', installerer den,
// hvorefter den tømmer det gamle cache-lager og afregistrerer sig selv permanent —
// så landingpagen fra nu af serveres helt uden service-worker-indblanding.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.registration.unregister();
    const clientsList = await self.clients.matchAll({ type: 'window' });
    clientsList.forEach(c => c.navigate(c.url));
  })());
});

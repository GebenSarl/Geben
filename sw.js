/* BAR RESTO GEBEN — service worker
   Rôle unique : garder l'application entière en cache pour qu'elle s'ouvre
   sans connexion, et rendre l'installation possible sur l'écran d'accueil.
   Les données de gestion ne passent jamais par ici : elles restent dans le
   stockage local du téléphone. */

const CACHE = "geben-v6";

const FICHIERS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icone-192.png",
  "./icone-512.png",
  "./icone-maskable-512.png",
  "./icone-apple-180.png"
];

self.addEventListener("install", evt => {
  evt.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    /* chaque fichier est mis en cache séparément : si l'un manque, les autres
       sont quand même conservés et l'application reste utilisable hors ligne */
    await Promise.all(FICHIERS.map(f => cache.add(f).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", evt => {
  evt.waitUntil((async () => {
    const cles = await caches.keys();
    await Promise.all(cles.filter(c => c !== CACHE).map(c => caches.delete(c)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", evt => {
  const req = evt.request;
  if (req.method !== "GET") return;

  evt.respondWith((async () => {
    /* le cache d'abord : l'application est figée, rien n'a besoin du réseau */
    const enCache = await caches.match(req, { ignoreSearch: true });
    if (enCache) return enCache;

    try {
      const reponse = await fetch(req);
      if (reponse && reponse.ok && new URL(req.url).origin === self.location.origin) {
        const copie = reponse.clone();
        caches.open(CACHE).then(c => c.put(req, copie)).catch(() => {});
      }
      return reponse;
    } catch (e) {
      /* hors connexion et hors cache : on renvoie l'application elle-même
         pour toute navigation, afin de ne jamais afficher l'écran d'erreur */
      if (req.mode === "navigate") {
        const repli = await caches.match("./index.html");
        if (repli) return repli;
      }
      throw e;
    }
  })());
});

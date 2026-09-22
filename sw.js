/* Bump CACHE on every deploy; the old cache is dropped on activate.

   Every path below is relative, so it resolves against wherever sw.js itself
   is served from. That lets the whole suite live at a domain root, in a
   subfolder such as user.github.io/classroom/, or anywhere else, with no
   edits. Registering "../sw.js" from an app directory gives this worker a
   scope of the suite root, which needs no special response header. */
const CACHE = "classroom-suite-v33-2ad6a0f9";

const SHELL = [
  "./",
  "index.html",
  "gradebook/",
  "gradebook/index.html",
  "gradebook/manifest.json",
  "planner/",
  "planner/index.html",
  "planner/manifest.json",
  "fluency/",
  "fluency/index.html",
  "fluency/manifest.json",
  "suite-nav.js",
  "suite-theme-boot.js",
  "suite-theme.css",
  "suite-sync.js",
  "suite-boot.js",
  "sub-plans.js",
  "suite-migrate.js",
  "icon-192.png",
  "icon-512.png",
  "planner-icon-192.png",
  "planner-icon-512.png",
  "fluency-icon-192.png",
  "fluency-icon-512.png",
  "icon-maskable-512.png",
  "planner-icon-maskable-512.png",
  "fluency-icon-maskable-512.png"
];

/* Each file is cached on its own. cache.addAll() is all-or-nothing: one 404
   anywhere in the list rejects the whole install, the new worker never takes
   over, and the previous one keeps serving the old site forever. That failure
   is invisible from the page, so a single stale path could freeze every future
   update. Individual adds mean a missing file costs only that file. */
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  /* Sync talks to APIs over GET. Those must never be answered from the cache,
     or a device would merge against yesterday's copy of the file and quietly
     undo the other device's work. Left to the browser entirely. Google's font
     host is deliberately not in here — those we do want cached for offline. */
  if (/^(www\.googleapis\.com|oauth2\.googleapis\.com|accounts\.google\.com|api\.github\.com)$/.test(url.hostname)) return;

  /* Page loads go to the network first, cache second. Cache-first here would
     mean a page that has moved keeps being served from the old cache, with no
     way to notice from inside the app. Offline still works: the network throws
     and the cached copy answers. */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy)).catch(() => { });
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then(hit =>
            hit || caches.match("gradebook/index.html") || Response.error()
          )
        )
    );
    return;
  }

  /* Scripts, icons and manifests are cache-first for speed, refreshed in the
     background for the next visit. Cross-origin GETs (the pdf.js the fluency
     tool loads) are cached opportunistically so they work offline later. */
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => { });
        }
        return res;
      }).catch(() => hit);

      if (hit) { net.catch(() => { }); return hit; }
      /* An asset that is neither cached nor reachable fails, and that is the
         honest answer. It used to fall back to gradebook/index.html, which
         meant a missing suite-sync.js came back as a page of HTML with a
         JavaScript content type: the browser then threw a syntax error
         somewhere in the markup, which says nothing at all about the real
         problem. The HTML fallback belongs on a navigation, and it is still
         there; it does not belong here. */
      return net.then(res => res || Response.error());
    })
  );
});

/* Lets a page force the waiting worker to take over without a second reload,
   and lets it ask which build it is actually running. "Did my change deploy?"
   was only answerable from DevTools; now the Setup tab can print it. */
self.addEventListener("message", e => {
  if (e.data === "skipWaiting") { self.skipWaiting(); return; }
  if (e.data === "version" && e.source) e.source.postMessage({ suiteVersion: CACHE });
});

/* Bump CACHE on every deploy; the old cache is dropped on activate.

   Every path below is relative, so it resolves against wherever sw.js itself
   is served from. That lets the whole suite live at a domain root, in a
   subfolder such as user.github.io/classroom/, or anywhere else, with no
   edits. Registering "../sw.js" from an app directory gives this worker a
   scope of the suite root, which needs no special response header. */
const CACHE = "classroom-suite-v63-80b6c490";

const SHELL = [
  "./",
  "index.html",
  "gradebook/",
  "gradebook/index.html",
  "manifest.json",
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
  "fluency-extras.js",
  "curriculum.js",
  "suite-icon-180.png",
  "suite-icon-192.png",
  "suite-icon-512.png",
  "suite-icon-maskable-512.png",
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
/* How long a page load waits on the network before the cached copy answers. */
const NAV_WAIT_MS = 4000;

/* The cached copy of a page: the page itself (ignoring any query), then that
   folder's index.html, then the launcher. Resolves undefined if none. */
function cachedPage(req) {
  const u = new URL(req.url);
  u.search = ""; u.hash = "";
  return caches.match(req, { ignoreSearch: true })
    .then(hit => hit || (u.pathname.endsWith("/") ? caches.match(new URL("index.html", u).href) : undefined))
    .then(hit => hit || caches.match("index.html"));
}

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
     way to notice from inside the app.

     Network-first used to wait on the network for as long as the browser
     would, and school Wi-Fi that is connected but not passing traffic can
     hold a page blank for most of a minute before the cache is ever asked.
     Now the cache answers if the network has not within NAV_WAIT_MS; the
     network request carries on and refreshes the cache for the next load.
     A cache miss keeps waiting for the network, so nothing gets worse.

     The old fallback also never worked as written: `caches.match()` returns
     a promise, which is always truthy, so `|| Response.error()` could not
     be reached, and a tool missing from the cache fell back to the
     gradebook. It now tries the page, then that folder's index.html, then
     the launcher. */
  if (req.mode === "navigate") {
    const net = fetch(req).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => { });
      }
      return res;
    });
    e.waitUntil(net.catch(() => { }));
    e.respondWith(new Promise(resolve => {
      let done = false;
      const finish = r => { if (!done && r) { done = true; resolve(r); } };
      const timer = setTimeout(() => { cachedPage(req).then(finish); }, NAV_WAIT_MS);
      net.then(res => { clearTimeout(timer); finish(res); })
        .catch(() => {
          clearTimeout(timer);
          cachedPage(req).then(hit => finish(hit || Response.error()));
        });
    }));
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

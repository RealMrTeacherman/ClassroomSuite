/* Suite switcher: a small bar that lets the three tools behave like one app.
   Injected into each page rather than built into any of them, so it can be
   removed by deleting one script tag. */
(function () {
  if (window.__suiteNav) return;
  window.__suiteNav = true;

  var deferredPrompt = null, installBtn = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    paintInstall();
  });
  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    paintInstall();
  });
  function standalone() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      window.navigator.standalone === true;
  }
  function paintInstall() {
    if (!installBtn) return;
    installBtn.style.display = (deferredPrompt && !standalone()) ? "" : "none";
  }

  var APPS = ["gradebook", "planner", "fluency"];
  var PAGES = [
    { app: "gradebook", label: "Gradebook", icon: "\u25A4" },
    { app: "planner", label: "Planner", icon: "\u25F1" },
    { app: "fluency", label: "Fluency", icon: "\u25F7" }
  ];

  /* Nothing here assumes the suite sits at the root of a domain, so the same
     files work at example.com/, at user.github.io/classroom/, and from a
     folder on disk. Paths are worked out from wherever this page actually is. */
  function segments() {
    var p = location.pathname.split("/").filter(Boolean);
    if (p.length && p[p.length - 1].indexOf(".") >= 0) p.pop();   // drop a file name
    return p;
  }
  function currentApp() {
    var p = segments();
    var last = p[p.length - 1];
    return APPS.indexOf(last) >= 0 ? last : "";
  }
  function base() {
    var p = segments();
    if (APPS.indexOf(p[p.length - 1]) >= 0) p.pop();
    return "/" + (p.length ? p.join("/") + "/" : "");
  }

  var css = document.createElement("style");
  css.textContent =
    '#suitenav{position:fixed;right:20px;bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:2147483000;' +
    'max-width:calc(100vw - 24px);overflow-x:auto;scrollbar-width:none;' +
    'display:flex;gap:2px;padding:3px;border-radius:999px;' +
    'border:1px solid rgba(16,24,32,.1);background:rgba(255,255,255,.9);' +
    'box-shadow:0 2px 10px rgba(16,24,32,.12);' +
    "font:500 12.5px/1 'IBM Plex Sans','Segoe UI',system-ui,sans-serif;" +
    '-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}' +
    '#suitenav a{display:flex;align-items:center;gap:5px;padding:7px 14px;border-radius:999px;' +
    'color:#55636E;text-decoration:none;white-space:nowrap}' +
    '#suitenav a:hover{color:#14202A;background:rgba(16,24,32,.05)}' +
    /* a thumb-sized target for every switcher item on a touch screen; they were 32–39px wide */
    '@media (pointer:coarse){#suitenav a,#suitenav button{min-width:44px;min-height:44px;justify-content:center}}' +
    '#suitenav a[aria-current="page"]{background:#10655C;color:#fff}' +
    '#suitenav b{font-weight:600}' +
    '#suitenav .ic{font-size:13px;opacity:.75}' +
    '@media print{#suitenav{display:none!important}}' +
    '#suitenav button{border:0;background:transparent;font:inherit;cursor:pointer;' +
    'display:flex;align-items:center;gap:5px;padding:7px 14px;border-radius:999px;color:#55636E}' +
    '#suitenav button:hover{color:#14202A;background:rgba(16,24,32,.05)}' +
    '#suitenav .sep{width:1px;background:rgba(16,24,32,.12);margin:5px 2px}' +
    '#suitenav .dot{width:7px;height:7px;border-radius:50%;background:#B4BCC4;flex:none}' +
    '#suitenav .dot.ok{background:#2F7A56}#suitenav .dot.warn{background:#A87621}' +
    '#suitenav .dot.err{background:#B4472F}' +
    '#suitenav::-webkit-scrollbar{display:none}' +
    '@media (max-width:520px){#suitenav .lbl{display:none}#suitenav a{padding:8px 10px}' +
    '#suitenav a[aria-current="page"] .lbl{display:inline}}' +
    /* A thumb needs more than a 12px glyph. */
    '#suitesheet{position:fixed;right:20px;bottom:calc(72px + env(safe-area-inset-bottom,0px));' +
    'z-index:2147483002;width:min(300px,calc(100vw - 40px));display:flex;flex-direction:column;gap:2px;' +
    'padding:10px;border-radius:14px;border:1px solid rgba(16,24,32,.1);background:rgba(255,255,255,.96);' +
    'box-shadow:0 2px 18px rgba(16,24,32,.18);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);' +
    "font:400 13.5px/1.45 'IBM Plex Sans','Segoe UI',system-ui,sans-serif;color:#14202A}" +
    '#suitesheet>b{font-weight:600;font-size:14px;padding:2px 6px 0}' +
    '#suitesheet>i{font-style:normal;color:#55636E;font-size:12.5px;padding:0 6px 6px}' +
    '#suitesheet button{display:block;width:100%;text-align:left;border:0;background:transparent;' +
    'font:inherit;cursor:pointer;padding:9px 6px;border-radius:8px;color:#14202A}' +
    '#suitesheet button:hover{background:rgba(16,24,32,.05)}' +
    '#suitesheet button span{font-weight:500}' +
    '#suitesheet button em{display:block;font-style:normal;color:#626D78;font-size:12px;margin-top:1px}' +
    '#suitesheet button.cancel{color:#55636E;border-top:1px solid rgba(16,24,32,.09);' +
    'border-radius:0 0 8px 8px;margin-top:3px;padding-top:10px}' +
    '@media print{#suitesheet{display:none!important}}' +
    '@media (pointer:coarse){#suitesheet button{padding:12px 8px}}' +
    '@media (pointer:coarse){#suitenav a,#suitenav button{min-height:40px;padding:10px 13px}' +
    '#suitenav .ic{font-size:15px}#suitenav .dot{width:9px;height:9px}}';
  document.head.appendChild(css);

  function build() {
    var cur = currentApp(), root = base();
    var nav = document.createElement("nav");
    nav.id = "suitenav";
    nav.setAttribute("aria-label", "Switch tool");
    PAGES.forEach(function (p) {
      var a = document.createElement("a");
      a.href = root + p.app + "/";
      if (p.app === cur) a.setAttribute("aria-current", "page");
      a.innerHTML = '<span class="ic">' + p.icon + '</span><b class="lbl">' + p.label + "</b>";
      nav.appendChild(a);
    });
    var themeBtn = document.createElement("button");
    themeBtn.type = "button";
    themeBtn.id = "suitetheme";
    themeBtn.innerHTML = '<span class="ic">\u25A7</span><b class="lbl">Look</b>';
    themeBtn.onclick = toggleTheme;
    nav.appendChild(themeBtn);

    installBtn = document.createElement("button");
    installBtn.type = "button";
    installBtn.innerHTML = '<span class="ic">\u2913</span><b class="lbl">Install</b>';
    installBtn.title = "Install this as an app on this device";
    installBtn.style.display = "none";
    installBtn.onclick = function () {
      if (!deferredPrompt) return;
      var p = deferredPrompt;
      deferredPrompt = null;
      paintInstall();
      p.prompt();
      p.userChoice.then(function (r) {
        if (r && r.outcome !== "accepted") { deferredPrompt = p; paintInstall(); }
      });
    };
    nav.appendChild(installBtn);
    paintInstall();
    /* paintTheme() only ever ran from setTheme(), so on a page loaded with
       the textured look already on, the button showed the icon for turning
       it on and carried no aria-pressed at all. */
    paintTheme();

    if (window.SuiteSync) {
      var sep = document.createElement("span"); sep.className = "sep"; nav.appendChild(sep);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.innerHTML = '<span class="dot"></span><b class="lbl">Sync</b>';
      var dot = btn.querySelector(".dot"), lbl = btn.querySelector(".lbl");
      /* "Synced" is a claim about the past written in the present tense. A
         token that lapsed on Friday leaves a green dot until something
         happens to make a request, and a quiet weekend is exactly when two
         devices drift apart. So the pill reports the age of the last round
         that actually completed, and goes amber at a day and red at three. */
      function paintSync(st, dt) {
        var S = window.SuiteSync;
        var age = ageOf(S.lastOk);
        var stale = age !== null && age > 24 * 3600 * 1000;
        var veryStale = age !== null && age > 72 * 3600 * 1000;
        var tokenSoon = typeof S.tokenDays === "number" && S.tokenDays !== null && S.tokenDays <= 14;
        var baseGone = S.baseDurable === false;

        var cls = st === "connected" ? (veryStale ? "err" : (stale || tokenSoon || baseGone) ? "warn" : "ok")
          : st === "needsPermission" || st === "syncing" ? "warn"
          : st === "error" ? "err" : "";
        dot.className = "dot " + cls;

        lbl.textContent = st === "connected" ? (stale ? "Synced " + agoShort(age) : "Synced")
          : st === "needsPermission" ? "Sign in"
          : st === "syncing" ? "Syncing" : st === "error" ? "Sync error"
          : st === "unsupported" ? "Local only" : "Sync";

        var t;
        if (st === "connected") {
          t = "Synced with " + dt + (age === null ? "" : "\nLast completed " + agoLong(age));
          if (tokenSoon) {
            t += S.tokenDays <= 0 ? "\nThe GitHub token has expired."
              : "\nThe GitHub token expires in " + S.tokenDays + " day" + (S.tokenDays === 1 ? "" : "s") + ".";
          }
          if (baseGone) t += "\nThe merge base cannot be saved on this device; edits made elsewhere may be overwritten.";
        } else {
          t = st === "needsPermission" ? "Click to allow access again"
            : st === "syncing" ? "Talking to the other side"
            : st === "unsupported" ? "Nothing is syncing on this device"
            : st === "error" ? dt : "Click to set syncing up";
        }
        btn.title = t;
        btn.setAttribute("aria-label", "Syncing: " + lbl.textContent);
      }
      window.SuiteSync.onState(paintSync);
      /* the age moves on its own even when nothing else does */
      setInterval(function () { paintSync(window.SuiteSync.state, window.SuiteSync.detail); }, 60000);
      btn.onclick = function () { syncMenu(); };
      nav.appendChild(btn);
    }
    document.body.appendChild(nav);
  }

  function ageOf(iso) {
    if (!iso) return null;
    var t = Date.parse(iso);
    return t ? Math.max(0, Date.now() - t) : null;
  }
  function agoShort(ms) {
    var d = Math.floor(ms / 86400000);
    if (d >= 1) return d + "d ago";
    return Math.floor(ms / 3600000) + "h ago";
  }
  function agoLong(ms) {
    var mins = Math.floor(ms / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + " minute" + (mins === 1 ? "" : "s") + " ago";
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + " hour" + (hrs === 1 ? "" : "s") + " ago";
    var d = Math.floor(hrs / 24);
    return d + " day" + (d === 1 ? "" : "s") + " ago";
  }

  function say(msg) {
    var t = document.createElement("div");
    /* the gradebook and planner toasts are both live regions; this one was
       not, so every sync confirmation went unannounced */
    t.setAttribute("role", "status");
    t.setAttribute("aria-live", "polite");
    t.textContent = msg;
    t.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:calc(74px + env(safe-area-inset-bottom,0px));z-index:2147483001;" +
      "background:#14202A;color:#fff;padding:10px 16px;border-radius:10px;font:13.5px/1.4 inherit;" +
      "box-shadow:0 2px 10px rgba(16,24,32,.24);max-width:min(520px,92vw)";
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 4200);
  }

  /* A small menu of real buttons. confirm() would be shorter, but the share
     sheet on iOS has to be opened from a genuine tap and a confirm() spends
     that. This also reads better than "OK means save, Cancel means load". */
  function sheet(title, note, options) {
    var old = document.getElementById("suitesheet");
    if (old) old.remove();
    var box = document.createElement("div");
    box.id = "suitesheet";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", title);
    var h = '<b>' + title + "</b>";
    if (note) h += "<i>" + note + "</i>";
    box.innerHTML = h;
    options.forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button";
      b.innerHTML = "<span>" + o.label + "</span>" + (o.hint ? "<em>" + o.hint + "</em>" : "");
      b.onclick = function () { box.remove(); o.run(); };
      box.appendChild(b);
    });
    var c = document.createElement("button");
    c.type = "button"; c.className = "cancel"; c.textContent = "Cancel";
    c.onclick = function () { box.remove(); };
    box.appendChild(c);
    document.body.appendChild(box);
    setTimeout(function () {
      document.addEventListener("click", function away(ev) {
        if (box.contains(ev.target)) return;
        box.remove(); document.removeEventListener("click", away);
      });
    }, 0);
  }

  function backupMenu() {
    var S = window.SuiteSync;
    var opts = [];

    if (S.backend === "folder") {
      opts.push({ label: "Check the folder now", hint: S.folderName, run: function () {
        S.syncNow().then(function (changed) {
          say(changed && changed.length ? "Picked up changes. Reloading." : "Nothing new in the folder.");
          if (changed && changed.length) setTimeout(function () { location.reload(); }, 1200);
        }).catch(function (e) { say("Could not read the folder: " + (e.message || e)); });
      } });
    } else if (!S.folderSupported && !S.backend) {
      /* the phone's whole job: hand the file to the desktop's watched folder */
      opts.push({ label: "Send to my desktop", hint: "share it into the handoff folder", run: function () {
        S.exportFile().then(function (r) {
          if (r.how === "cancelled") return;
          say(r.how === "share" ? "Sent. Drop it in the handoff folder and the desktop takes it from there."
            : "Saved " + r.name + ". Put it in the handoff folder.");
        }).catch(function (e) { say("Could not send: " + (e.message || e)); });
      } });
    }
    if (S.backend === "drive" || S.backend === "github") {
      var where = S.backend === "drive"
        ? (S.drive.email || S.drive.fileName + " in your Drive")
        : S.github.owner + "/" + S.github.repo;
      opts.push({ label: "Sync now", hint: where, run: function () {
        S.syncNow().then(function (changed) {
          var m = S.lastMerge;
          if (m && m.conflicts) say("Synced. " + m.conflicts + " edited in two places; this device kept.");
          else say(changed && changed.length ? "Synced \u2014 picked up changes. Reloading." : "Synced \u2014 already up to date.");
          if (changed && changed.length) setTimeout(function () { location.reload(); }, 1200);
        }).catch(function (e) { say("Sync failed: " + (e.message || e)); });
      } });
    } else if (S.folderSupported) {
      opts.push({ label: "Set up syncing", hint: "watch a handoff folder", run: function () {
        /* the form lives in the gradebook's Setup tab; all three tools share
           one origin, so setting it up there sets it up for all of them */
        location.href = base() + "gradebook/#setup";
      } });
    }

    if (!(!S.folderSupported && !S.backend)) opts.push({ label: "Save a backup", hint: "share it to Drive, Files or another device", run: function () {
      S.exportFile().then(function (r) {
        if (r.how === "cancelled") return;
        say(r.how === "share" ? "Shared " + r.name + "." : "Saved " + r.name + " to your downloads.");
      }).catch(function (e) { say("Could not save: " + (e.message || e)); });
    } });
    opts.push({ label: "Load a backup", hint: "replaces what is on this device", run: function () {
      S.importFile().then(function (changed) {
        if (!changed.length) { say("Nothing in that file was newer."); return; }
        say("Loaded. Reloading to pick it up.");
        setTimeout(function () { location.reload(); }, 900);
      }).catch(function (e) {
        if (e && e.message !== "AbortError") say("Could not load that file: " + (e.message || e));
      });
    } });

    sheet(S.backend ? "Syncing" : "Move data between devices",
      S.backend === "drive" ? "Every device signed in to the same Google account stays in step."
        : S.backend === "github" ? "Every device set up with the repository stays in step."
        : "Nothing is syncing on this device yet.",
      opts);
  }

  /* ---------- look ---------- */
  /* `data-suite-theme`, deliberately not `data-theme`: the planner owns
     `data-theme` for its own five looks and sets it on the same element. */
  var THEME_KEY = "suite:theme:v1";
  var QUIET_BAR = "#EDF0F2", TEXTURED_BAR = "#283130";
  function currentTheme() {
    return document.documentElement.getAttribute("data-suite-theme") === "textured" ? "textured" : "quiet";
  }
  function setTheme(t) {
    if (t === "textured") document.documentElement.setAttribute("data-suite-theme", "textured");
    else document.documentElement.removeAttribute("data-suite-theme");
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", t === "textured" ? TEXTURED_BAR : QUIET_BAR);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) { }
    paintTheme();
  }
  function toggleTheme() { setTheme(currentTheme() === "textured" ? "quiet" : "textured"); }
  function paintTheme() {
    var b = document.getElementById("suitetheme");
    if (!b) return;
    var on = currentTheme() === "textured";
    b.title = on ? "Switch to the quiet look" : "Switch to the textured look";
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.querySelector(".ic").textContent = on ? "\u25A6" : "\u25A7";
  }

  /* ---------- a new build landed ----------
     Pages are network-first and assets are cache-first, so the load right
     after a deploy runs the new HTML against the old scripts until something
     makes you reload. That window is most of what "my change didn't deploy"
     actually was, on top of the forgotten cache bump. The worker already
     calls skipWaiting and claim, so the only missing piece was telling the
     person sitting in front of it. Never reload on its own: there may be an
     unsaved day on screen. */
  function watchForUpdate() {
    if (!("serviceWorker" in navigator)) return;
    var reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (reloading) return;
      var b = document.getElementById("suiteupdate");
      if (b) return;
      var box = document.createElement("div");
      box.id = "suiteupdate";
      box.setAttribute("role", "status");
      box.setAttribute("aria-live", "polite");
      box.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);" +
        "bottom:calc(74px + env(safe-area-inset-bottom,0px));z-index:2147483001;" +
        "background:#14202A;color:#fff;padding:9px 10px 9px 16px;border-radius:10px;" +
        "display:flex;gap:12px;align-items:center;" +
        "font:13.5px/1.4 'IBM Plex Sans','Segoe UI',system-ui,sans-serif;" +
        "box-shadow:0 2px 10px rgba(16,24,32,.24);max-width:min(520px,92vw)";
      var t = document.createElement("span");
      t.textContent = "A newer version of this tool is ready.";
      box.appendChild(t);
      var go = document.createElement("button");
      go.type = "button";
      go.textContent = "Reload";
      go.style.cssText = "border:0;background:#10655C;color:#fff;font:600 13px inherit;" +
        "padding:7px 13px;border-radius:7px;cursor:pointer";
      go.onclick = function () { reloading = true; location.reload(); };
      box.appendChild(go);
      var x = document.createElement("button");
      x.type = "button";
      x.textContent = "\u00d7";
      x.setAttribute("aria-label", "Dismiss");
      x.style.cssText = "border:0;background:transparent;color:#9FB2B5;font-size:17px;cursor:pointer;padding:0 4px";
      x.onclick = function () { box.remove(); };
      box.appendChild(x);
      document.body.appendChild(box);
    });
  }

  /* which build this device is actually running, straight from the worker */
  function buildVersion() {
    return new Promise(function (res) {
      if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) { res(""); return; }
      var done = false;
      function onMsg(e) {
        if (!e.data || !e.data.suiteVersion) return;
        done = true;
        navigator.serviceWorker.removeEventListener("message", onMsg);
        res(e.data.suiteVersion);
      }
      navigator.serviceWorker.addEventListener("message", onMsg);
      navigator.serviceWorker.controller.postMessage("version");
      setTimeout(function () {
        if (done) return;
        navigator.serviceWorker.removeEventListener("message", onMsg);
        res("");
      }, 1500);
    });
  }
  window.SuiteBuild = { version: buildVersion };

  function syncMenu() {
    var S = window.SuiteSync;
    if (!S) return;
    if (S.backend === "drive" && S.state === "needsPermission") {
      S.signInDrive().then(function () { say("Signed in \u2014 syncing again."); })
        .catch(function (e) { say("Could not sign in: " + (e.message || e)); });
      return;
    }
    if (!S.supported || S.backend === "github" || S.backend === "drive") { backupMenu(); return; }
    if (S.state === "needsPermission") {
      S.ensurePermission().then(function (ok) {
        if (ok) S.pull(false).then(function () { say("Reconnected."); });
      });
      return;
    }
    /* These two were the last confirm() calls left in the switcher, and both
       had the destructive answer on Cancel: dismissing the first one — or
       pressing Escape, or clicking away — disconnected the sync, and
       dismissing the second created a file rather than doing nothing. The
       sheet already used everywhere else makes each choice a button that
       says what it does, and leaves Cancel meaning cancel. */
    if (S.state === "connected") {
      sheet("Synced with " + S.fileName, "All three tools write to that file.", [
        { label: "Write now", hint: "save this device's data to the file", run: function () {
          S.push(true).then(function () { say("Written to " + S.fileName + "."); });
        } },
        { label: "Stop syncing this device", hint: "the data stays in this browser", run: function () {
          S.disconnect().then(function () { say("Disconnected. Still saving in this browser."); });
        } }
      ]);
      return;
    }
    sheet("Connect a shared file", "All three tools read and write one file. Put it in your Drive folder and Drive keeps it in step across machines.", [
      { label: "Open an existing file", hint: "one this suite already wrote", run: function () { doConnect(true); } },
      { label: "Create a new file", hint: "start one from this device's data", run: function () { doConnect(false); } }
    ]);
  }
  function doConnect(existing) {
    var S = window.SuiteSync;
    S.connect(existing).then(function () { say("Connected. Everything is written to that file from now on."); })
      .catch(function (e) { if (e && e.name !== "AbortError") say("Could not connect: " + (e.message || e)); });
  }
  /* A tab row that scrolls sideways on a phone gave no sign that there was
     more: the gradebook's showed "F" of Fluency and nothing else, and the
     running-records tool's hid Students and Passages entirely. This marks
     each row with data-more ("left", "right" or both) while there is more
     that way, which the stylesheet fades, and brings a tapped tab fully
     into view. Nothing about the tabs themselves changes. */
  function tabRows() {
    Array.prototype.forEach.call(document.querySelectorAll("nav.tabs"), function (nav) {
      if (nav.__suiteMore) return;
      nav.__suiteMore = true;
      function update() {
        var more = [];
        if (nav.scrollLeft > 4) more.push("left");
        if (nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 4) more.push("right");
        if (more.length) nav.setAttribute("data-more", more.join(" "));
        else nav.removeAttribute("data-more");
      }
      nav.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", update);
      nav.addEventListener("click", function (ev) {
        var b = ev.target && ev.target.closest ? ev.target.closest("button") : null;
        if (b && nav.scrollWidth > nav.clientWidth) {
          var nr = nav.getBoundingClientRect(), br = b.getBoundingClientRect();
          var l = br.left - nr.left + nav.scrollLeft, r = l + br.width;
          if (l < nav.scrollLeft + 8) nav.scrollLeft = Math.max(0, l - 24);
          else if (r > nav.scrollLeft + nav.clientWidth - 8) nav.scrollLeft = r - nav.clientWidth + 24;
        }
        setTimeout(update, 60);
      });
      update();
    });
  }
  function start() { build(); watchForUpdate(); tabRows(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

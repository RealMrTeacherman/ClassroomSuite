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
    '#suitesheet button em{display:block;font-style:normal;color:#8A95A0;font-size:12px;margin-top:1px}' +
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

    if (window.SuiteSync) {
      var sep = document.createElement("span"); sep.className = "sep"; nav.appendChild(sep);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.innerHTML = '<span class="dot"></span><b class="lbl">Sync</b>';
      var dot = btn.querySelector(".dot"), lbl = btn.querySelector(".lbl");
      window.SuiteSync.onState(function (st, dt) {
        dot.className = "dot " + (st === "connected" ? "ok" : st === "needsPermission" || st === "syncing" ? "warn" : st === "error" ? "err" : "");
        lbl.textContent = st === "connected" ? "Synced" : st === "needsPermission" ? "Sign in"
          : st === "syncing" ? "Syncing" : st === "error" ? "Sync error"
          : st === "unsupported" ? "Local only" : "Sync";
        btn.title = st === "connected" ? "Synced with " + dt
          : st === "needsPermission" ? "Click to allow access to the synced file again"
          : st === "syncing" ? "Talking to the repository"
          : st === "unsupported" ? "Nothing is syncing on this device"
          : st === "error" ? dt : "Click to connect a file";
      });
      btn.onclick = function () { syncMenu(); };
      nav.appendChild(btn);
    }
    document.body.appendChild(nav);
  }

  function say(msg) {
    var t = document.createElement("div");
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
    if (S.state === "connected") {
      if (confirm("Synced with " + S.fileName + ".\n\nOK to write now, or Cancel to disconnect.")) {
        S.push(true).then(function () { say("Written to " + S.fileName + "."); });
      } else {
        S.disconnect().then(function () { say("Disconnected. Still saving in this browser."); });
      }
      return;
    }
    var existing = confirm("Connect a file that all three tools share.\n\nOK to open an existing file, Cancel to create a new one.\n\nPut it in your Google Drive folder and Drive keeps it in step across machines.");
    S.connect(existing).then(function () { say("Connected. Everything is written to that file from now on."); })
      .catch(function (e) { if (e && e.name !== "AbortError") say("Could not connect: " + (e.message || e)); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();

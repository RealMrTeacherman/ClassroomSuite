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
  /* iOS never fires beforeinstallprompt: adding to the home screen is a
     Safari menu item, so the button explains it instead. An iPad reports
     itself as a Mac; the touch points are what give it away. */
  function isIOS() {
    var ua = navigator.userAgent || "";
    return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  }
  function paintInstall() {
    if (!installBtn) return;
    installBtn.style.display = (!standalone() && (deferredPrompt || isIOS())) ? "" : "none";
  }
  /* One app, not three. A home-screen app on iOS keeps its own storage,
     separate from Safari and from every other icon, so a second icon is a
     second roster that never hears from the first. */
  function iosSteps() {
    var home = !currentApp();
    var opts = [];
    if (!home) opts.push({ label: "Open the home page", hint: "add it from there, so it gets the suite\u2019s icon", run: function () {
      location.href = base();
    } });
    sheet("Add to Home Screen",
      "Tap the Share button (in Safari it may be under \u2022\u2022\u2022), then <b>Add to Home Screen</b>, then <b>Add</b>. " +
      "Add it once. The app keeps its own copy of your data, separate from Safari and from any second icon. " +
      "If you have been using the suite in Safari on this device, send its data first " +
      "(Sync \u2192 Send) and bring it in inside the app (Sync \u2192 Get the latest).",
      opts);
  }

  var APPS = ["gradebook", "planner", "fluency", "groups"];
  var PAGES = [
    { app: "gradebook", label: "Gradebook", icon: "\u25A4" },
    { app: "planner", label: "Planner", icon: "\u25F1" },
    { app: "fluency", label: "ORF", icon: "\u25F7" },
    { app: "groups", label: "Small groups", icon: "\u25A6" }
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
    '#suitenav a[aria-current="page"] .lbl{display:inline}#suitenav .syncbtn .lbl{display:inline}}' +
    /* v96: on the narrowest phones the Sync label wins the room over the
       current tool's, which its highlighted icon already shows */
    '@media (max-width:420px){#suitenav a[aria-current="page"] .lbl{display:none}}' +
    '#suiteget{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(74px + env(safe-area-inset-bottom,0px));' +
    'z-index:2147483001;display:flex;gap:10px;align-items:center;padding:8px 8px 8px 14px;border-radius:12px;' +
    'background:#14202A;color:#fff;box-shadow:0 2px 10px rgba(16,24,32,.24);width:max-content;max-width:min(520px,calc(100vw - 24px));box-sizing:border-box;' +
    "font:13.5px/1.4 'IBM Plex Sans','Segoe UI',system-ui,sans-serif}" +
    '#suiteget span{flex:1 1 auto}' +
    '#suiteget button{border:0;border-radius:8px;font:inherit;cursor:pointer;min-height:40px}' +
    '#suiteget .go{background:#10655C;color:#fff;font-weight:600;padding:0 14px;white-space:nowrap}' +
    '#suiteget .x{background:transparent;color:#9FB2B5;font-size:18px;padding:0 8px}' +
    '@media print{#suiteget{display:none!important}}' +
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
    '#suitedrop{position:fixed;inset:0;z-index:2147483003;display:flex;align-items:center;justify-content:center;' +
    'background:rgba(16,24,32,.42);pointer-events:none}' +
    '#suitedrop>div{display:flex;flex-direction:column;gap:6px;padding:22px 28px;border-radius:16px;' +
    'border:2px dashed rgba(255,255,255,.8);background:rgba(20,32,42,.92);color:#fff;text-align:center;' +
    "font:400 13.5px/1.45 'IBM Plex Sans','Segoe UI',system-ui,sans-serif;max-width:min(420px,86vw)}" +
    '#suitedrop b{font-size:16px;font-weight:600}#suitedrop span{opacity:.85}' +
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
      if (!deferredPrompt) { if (isIOS()) iosSteps(); return; }
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
      btn.className = "syncbtn";
      btn.innerHTML = '<span class="dot"></span><b class="lbl">Sync</b>';
      var dot = btn.querySelector(".dot"), lbl = btn.querySelector(".lbl");
      /* v96. It says Sync, whatever the device, so it is always findable.
         A watching computer: green while rounds complete, amber at a day
         without one and red at three ("Synced" is a claim about the past,
         and a quiet weekend is when two devices drift), "Tap to resume"
         when Chrome wants the folder allowed again. A phone: green once it
         has sent and nothing has changed since; amber, reading Send, when
         something has. */
      function paintSync(st, dt) {
        var S = window.SuiteSync;
        var cls = "", text = "Sync", t;
        var ex = S.lastExport;
        if (S.backend === "folder") {
          var age = ageOf(S.lastOk);
          var stale = age !== null && age > 24 * 3600 * 1000;
          var veryStale = age !== null && age > 72 * 3600 * 1000;
          var baseGone = S.baseDurable === false;
          if (st === "needsPermission") {
            cls = "warn"; text = "Tap to resume";
            t = "Chrome needs you to allow the sync folder again. Tap to allow it.";
          } else if (st === "error") {
            cls = "err"; text = "Sync error"; t = dt;
          } else if (st === "syncing") {
            cls = "warn"; t = "Checking the sync folder";
          } else {
            cls = veryStale ? "err" : (stale || baseGone) ? "warn" : "ok";
            if (stale) text = "Synced " + agoShort(age);
            t = "Watching " + S.folderName + (age === null ? "" : "\nLast completed " + agoLong(age));
            if (baseGone) t += "\nThe merge base cannot be saved on this device; edits made elsewhere may be overwritten.";
          }
        } else if (ex && ex.dirty) {
          cls = "warn";
          if (!S.folderSupported) text = "Send";
          t = "Changed since you last sent this device\u2019s data " + agoLong(ageOf(ex.at)) + ". Tap to send it.";
        } else if (ex && ex.at && !S.folderSupported) {
          cls = "ok";
          t = "Sent " + agoLong(ageOf(ex.at)) + "; nothing has changed here since.";
        } else {
          t = S.folderSupported ? "Tap to choose the folder your phone saves to" : "Tap to send to your computer, or get its latest";
        }
        dot.className = "dot " + cls;
        lbl.textContent = text;
        btn.title = t;
        btn.setAttribute("aria-label", "Sync: " + (text === "Sync" ? (cls === "ok" ? "up to date" : "menu") : text));
      }
      window.SuiteSync.onState(paintSync);
      /* the age moves on its own even when nothing else does */
      setInterval(function () { paintSync(window.SuiteSync.state, window.SuiteSync.detail); }, 60000);
      window.addEventListener("suite:exported", function () { paintSync(window.SuiteSync.state, window.SuiteSync.detail); });
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

  function afterImport(changed) {
    var S = window.SuiteSync;
    say(S.describeImport ? S.describeImport(changed) : (changed.length ? "Loaded." : "Nothing in that file was new."));
    if (changed && changed.length) setTimeout(function () { location.reload(); }, 1400);
  }
  function importFailed(e) {
    if (e && e.message !== "AbortError") say("Could not load that file: " + (e.message || e));
  }

  /* ---------- v96: the menus ----------
     Everything that is not the sync folder, Send, Get or Email is gone:
     the repository, the Google sign-in, the single connected file, and
     the separate Save-a-file-and-drag-it-to-Drive flow. */

  /* The computer a phone sends to, named the way that computer names itself
     on the files it writes ("Mac"), once the phone has brought one in. */
  function homeName() {
    var g = window.SuiteSync.lastGet;
    var n = g && g.fromName ? String(g.fromName) : "";
    return n && !/^(computer|a device)$/i.test(n) ? n : "";
  }
  function sendLabel() { var n = homeName(); return "Send to " + (n || "my computer"); }
  function getLabel() { var n = homeName(); return "Get the latest from " + (n || "my computer"); }

  function emailOption(S) {
    return { label: "Email the sync file",
      hint: S.mailAddress && S.mailAddress() ? "to " + S.mailAddress() : "pick Mail and send it to yourself", run: function () {
        S.emailFile().then(function (r) {
          if (r.how === "cancelled") return;
          say(r.how === "share" ? "Ready. On the other computer, download the attachment and the suite takes it from there."
            : "Saved " + r.name + ". Attach it to the email that just opened, then send.");
        }).catch(function (e) { say("Could not email: " + (e.message || e)); });
      } };
  }
  function undoOption(S) {
    return { label: "Undo the last load", hint: "puts this device back as it was", run: function () {
      S.undoImport().then(function (changed) {
        say("Undone. Reloading.");
        if (changed.length) setTimeout(function () { location.reload(); }, 1000);
      }).catch(function (e) { say("Could not undo: " + (e.message || e)); });
    } };
  }
  function chooseFolder() {
    var S = window.SuiteSync;
    S.connectFolder().then(function (changed) {
      say("Watching " + S.folderName + ". Anything your phone saves there is merged within seconds.");
      if (changed && changed.length) setTimeout(function () { location.reload(); }, 1400);
    }).catch(function (e) { if (e && e.message !== "AbortError") say("Could not use that folder: " + (e.message || e)); });
  }
  /* a phone's Send: the share sheet, from this tap. Nothing is awaited
     before it, or Safari refuses to open it. */
  function sendNow() {
    var S = window.SuiteSync;
    S.exportFile().then(function (r) {
      if (r.how === "cancelled") return;
      say(r.how === "share" ? "Sent. Once it is in the sync folder, your computer merges it on its own."
        : "Saved " + r.name + ". Put it in the sync folder.");
    }).catch(function (e) { say("Could not send: " + (e.message || e)); });
  }
  function getNow() {
    var S = window.SuiteSync;
    try { sessionStorage.setItem(GET_ASKED, "1"); } catch (e) { }
    S.importFile().then(afterImport).catch(importFailed);
  }
  function agoOf(iso) { var a = ageOf(iso); return a === null ? "" : agoLong(a); }

  function computerMenu() {
    var S = window.SuiteSync;
    var opts = [];
    if (S.backend === "folder") {
      opts.push({ label: "Check the folder now", hint: S.folderName, run: function () {
        S.syncNow().then(function (changed) {
          say(changed && changed.length ? "Picked up changes. Reloading." : "Nothing new in the folder.");
          if (changed && changed.length) setTimeout(function () { location.reload(); }, 1200);
        }).catch(function (e) { say("Could not read the folder: " + (e.message || e)); });
      } });
    } else {
      opts.push({ label: "Choose the sync folder", hint: "the folder in iCloud Drive or Google Drive that your phone saves to", run: chooseFolder });
    }
    opts.push(emailOption(S));
    opts.push({ label: "Load a sync file", hint: "merges it in; nothing here is lost (or drop it on any page)", run: function () {
      S.importFile().then(afterImport).catch(importFailed);
    } });
    if (S.canUndoImport) opts.push(undoOption(S));
    sheet("Sync",
      S.backend === "folder" ? "Watching <b>" + S.folderName + "</b>. Anything your phone saves there is merged within seconds, and the folder always holds a current classroom.json for it."
        : "Choose the folder your phone saves to, and this computer keeps it in step on its own while any tool is open.",
      opts);
  }

  function phoneMenu() {
    var S = window.SuiteSync;
    var ex = S.lastExport, g = S.lastGet;
    var opts = [];
    opts.push({ label: sendLabel(),
      hint: ex && ex.at ? (ex.dirty ? "changed since you last sent, " : "nothing new since you sent, ") + agoOf(ex.at)
        : "Save to Files, into the sync folder",
      run: sendNow });
    opts.push({ label: getLabel(),
      hint: g && g.at ? "last brought in " + agoOf(g.at) + "; pick classroom.json" : "pick classroom.json in the sync folder; it merges",
      run: getNow });
    opts.push(emailOption(S));
    if (S.canUndoImport) opts.push(undoOption(S));
    sheet("Sync", "Send after you change something here. Get when you start, to bring in what your computer has.", opts);
  }

  /* ---------- v96: a phone, opened, is offered the computer's latest ----------
     A page on iOS cannot open the file picker on its own, only from a tap,
     so this is the nearest thing to syncing on opening: one tap, offered
     once per time the app is opened, and only on a phone that has brought
     in a computer's file before and has not done so for a while. */
  var GET_ASKED = "suite:getAsked";
  var GET_AFTER_MS = 8 * 3600 * 1000;
  function offerGet() {
    var S = window.SuiteSync;
    if (!S || S.folderSupported || document.getElementById("suiteget")) return;
    var g = S.lastGet;
    if (!g || !g.at) return;                       /* never synced this way: nothing to remind */
    var age = ageOf(g.at);
    if (age !== null && age < GET_AFTER_MS) return;
    try { if (sessionStorage.getItem(GET_ASKED)) return; sessionStorage.setItem(GET_ASKED, "1"); } catch (e) { }
    var box = document.createElement("div");
    box.id = "suiteget";
    box.setAttribute("role", "status");
    var t = document.createElement("span");
    t.textContent = "Bring in the latest from " + (homeName() || "your computer") + "?";
    var go = document.createElement("button");
    go.type = "button"; go.className = "go"; go.textContent = "Get it";
    go.onclick = function () { box.remove(); getNow(); };
    var x = document.createElement("button");
    x.type = "button"; x.className = "x"; x.textContent = "\u00d7"; x.setAttribute("aria-label", "Not now");
    x.onclick = function () { box.remove(); };
    box.appendChild(t); box.appendChild(go); box.appendChild(x);
    document.body.appendChild(box);
  }

  /* ---------- v96: told once that the old route has gone ---------- */
  var ROUTE_NAMES = { github: "the GitHub repository", drive: "the Google Drive sign-in", file: "a connected file" };
  function tellRetired() {
    var S = window.SuiteSync;
    var r = S && S.retired;
    if (!r || !r.length) return false;
    S.retiredTold();
    var names = r.map(function (k) { return ROUTE_NAMES[k] || k; }).join(" and ");
    sheet("Sync is simpler now",
      "This device was syncing through " + names + ". That way of syncing has been removed, and everything on this device is still here. " +
      (S.folderSupported ? "To keep it in step, choose the folder your phone saves to."
        : "To keep it in step, use Send and Get on the Sync button."),
      S.folderSupported ? [{ label: "Choose the sync folder", hint: "in iCloud Drive or Google Drive", run: chooseFolder }]
        : [{ label: "Open the Sync menu", run: phoneMenu }]);
    return true;
  }

  /* ---------- drop a sync file anywhere (v77) ----------
     Downloaded from Drive on the other computer, the file is one drag from
     here. Only a drag that carries files is touched, so the gradebook's and
     Small Groups' own drag-and-drop of names is left alone. */
  function dropToLoad() {
    var depth = 0, veil = null;
    function hasFiles(e) {
      var t = e.dataTransfer && e.dataTransfer.types;
      if (!t) return false;
      for (var i = 0; i < t.length; i++) if (t[i] === "Files") return true;
      return false;
    }
    function show() {
      if (veil) return;
      veil = document.createElement("div");
      veil.id = "suitedrop";
      veil.innerHTML = "<div><b>Drop to bring in a sync file</b><span>It merges with what is here. Undo is on the sync menu.</span></div>";
      document.body.appendChild(veil);
    }
    function hide() { depth = 0; if (veil) { veil.remove(); veil = null; } }
    document.addEventListener("dragenter", function (e) { if (!hasFiles(e)) return; depth++; show(); });
    document.addEventListener("dragleave", function (e) { if (!hasFiles(e)) return; if (--depth <= 0) hide(); });
    document.addEventListener("dragover", function (e) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      try { e.dataTransfer.dropEffect = "copy"; } catch (x) { }
    });
    document.addEventListener("drop", function (e) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      hide();
      var S = window.SuiteSync, f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (!S || !S.importBlob || !f) return;
      var okName = S && S.isSyncFileName ? S.isSyncFileName(f.name || "") : /\.json$/i.test(f.name || "");
      if (!okName) { say("That is not a classroom sync file (they end in .json, or .txt when they came by email)."); return; }
      S.importBlob(f).then(afterImport).catch(importFailed);
    });
  }

  /* ---------- look ----------
     Until v91 a Look button here chose between 2026, 2006 and 2046. v92
     kept 2026 only; see suite-theme-boot.js. */

  /* ---------- the switcher steps aside while you scroll down ----------
     Fixed in the corner, it sat on whatever row was under it — on desktop it
     is about 500px wide, and it covered a student's 1-4 chips and note on
     Enter scores at every scroll position, not only at the end of the page.
     Scrolling down tucks it away; any scroll up, reaching the top or the
     bottom, or focus inside it brings it straight back. */
  function tuckOnScroll() {
    var last = window.scrollY || 0, ticking = false;
    function apply() {
      ticking = false;
      var y = window.scrollY || 0, d = y - last;
      var atEnd = y + window.innerHeight >= document.documentElement.scrollHeight - 8;
      if (y < 80 || atEnd || d < -6) document.body.classList.remove("suite-tucked");
      else if (d > 6) document.body.classList.add("suite-tucked");
      if (Math.abs(d) > 6 || y < 80 || atEnd) last = y;
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(apply); } }, { passive: true });
    document.addEventListener("focusin", function (e) {
      if (e.target && e.target.closest && e.target.closest("#suitenav, #suitesheet, #subbtn")) document.body.classList.remove("suite-tucked");
    });
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
    /* Chrome asks again for the folder in a new session; the tap on the
       pill is the permission prompt's user gesture */
    if (S.backend === "folder" && S.state === "needsPermission") {
      S.allowFolder().then(function (changed) {
        say(S.state === "connected" ? "Folder allowed \u2014 watching it again." : "The folder was not allowed.");
        if (changed && changed.length) setTimeout(function () { location.reload(); }, 1200);
      }).catch(function (e) { say("Could not allow the folder: " + (e.message || e)); });
      return;
    }
    if (S.folderSupported) computerMenu(); else phoneMenu();
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
  function start() {
    build(); watchForUpdate(); tabRows(); tuckOnScroll(); dropToLoad();
    /* after the page's own boot has had a moment: the notice first, if any;
       otherwise, on a phone, the offer to get the computer's latest */
    if (window.SuiteSync) setTimeout(function () { if (!tellRetired()) offerGet(); }, 700);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

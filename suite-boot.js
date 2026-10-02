/* ---- a sub day's open text does not carry forward ----
   An open-text subject (Science, WIN, Writing, Health/SEL) starts each day
   with the last day's text, and its "after …" line quotes it. After a sub
   day that was the sub's instructions: "Walk students to music at 1:30",
   "slideshow is in the sub drive". So a day flagged "Sub" — which printing a
   sub plan now sets — is passed over when an open-text subject looks back.
   Stepper subjects (Phonics, Reading, Math) still count it: those lessons
   happened, and skipping them would put the unit, week and day wrong.

   The planner is protected, so its lastTaught() is wrapped rather than
   edited. It is a top-level function declaration, so it lives on window and
   every caller that reaches it by name — suggest(), provenance(), and the
   sub plan's stale-text warning — gets this one (v54). */
(function () {
  if (typeof window.lastTaught !== "function" || typeof window.sortedDayKeys !== "function") return;
  if (window.lastTaught.__skipsSub) return;
  var orig = window.lastTaught;
  function g(n) { try { return (0, eval)(n); } catch (e) { return undefined; } }
  function isSub(rec) { return !!rec && Array.isArray(rec.flags) && rec.flags.indexOf("Sub") >= 0; }
  var wrapped = function (sb, beforeKey) {
    if (!sb || sb.schema !== "free") return orig(sb, beforeKey);
    var days = g("DAYS");
    if (!days) return orig(sb, beforeKey);
    var keys = window.sortedDayKeys();
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k >= beforeKey) continue;
      var rec = days[k];
      if (!rec || rec.noSchool || rec.saved === false || isSub(rec)) continue;
      var e = rec.entries && rec.entries[sb.id];
      if (e && e.taught && e.pos) return { pos: e.pos, from: k };
    }
    return null;
  };
  wrapped.__skipsSub = true;
  window.lastTaught = wrapped;

  /* An unsaved draft opened before its sub day was flagged may already hold
     the sub's text as its pre-fill. Where an open-text field is word for
     word what the old rule copied from a Sub day, it was carried, not
     typed, so it takes the new suggestion. Saved days are his record and
     are never touched. Converges on every load. */
  function unbake() {
    var S = g("S"), pend = g("PENDING"), days = g("DAYS");
    if (!S || !Array.isArray(S.subjects) || !days) return false;
    var free = S.subjects.filter(function (x) { return x && x.schema === "free"; });
    var changedPending = false, changedDays = false;
    function fix(rec, dk) {
      var hit = false;
      if (!rec || rec.saved || !rec.entries) return false;
      free.forEach(function (sb) {
        var e = rec.entries[sb.id];
        if (!e || !e.pos || !String(e.pos.text || "").trim()) return;
        var was = orig(sb, dk);
        if (!was || !isSub(days[was.from]) || !was.pos || was.pos.text !== e.pos.text) return;
        var now = wrapped(sb, dk);
        e.pos = now ? JSON.parse(JSON.stringify(now.pos)) : { text: "" };
        hit = true;
      });
      return hit;
    }
    if (pend && typeof pend === "object") Object.keys(pend).forEach(function (dk) { if (fix(pend[dk], dk)) changedPending = true; });
    Object.keys(days).forEach(function (dk) { if (fix(days[dk], dk)) changedDays = true; });
    if (changedPending && typeof window.queuePending === "function") {
      window.queuePending();
      if (typeof window.flushPending === "function") window.flushPending();
    }
    if (changedDays && typeof window.persist === "function") window.persist();
    return changedPending || changedDays;
  }
  window.__suiteUnbake = unbake;

  /* If the planner already drew the open day from the old answer and
     nothing has been typed, draw it again; a day with edits, or saved, is
     left. The planner boots asynchronously, so wait until it has loaded its
     subjects (S starts as an empty shell) rather than trust script timing. */
  function redraw() {
    var d = g("draft");
    if (d && !d.saved && d.__key && !g("dirty") && typeof window.render === "function") {
      try { (0, eval)("draft = null"); window.render(); } catch (e) { }
    }
  }
  var tries = 0;
  (function whenLoaded() {
    var S = g("S");
    if (!S || !Array.isArray(S.subjects) || !S.subjects.length) { if (++tries < 80) setTimeout(whenLoaded, 50); return; }
    try { unbake(); } catch (e) { }
    redraw();
  })();
})();

/* ---- the planner's subject cards follow the day, not the subject list ----
   The Today rail and each Week card list subjects in the order they were
   added (Phonics, Reading, Writing, Math, Science, WIN …), while each card
   shows its time, so Writing at 11:40 sat before Math at 10:00 and, on
   Wednesday, WIN at 10:30 before Enrichment at 9:45. The planner is a
   protected file, so its render is left alone: after each render the cards
   are moved into the order of that day's schedule, by the first block each
   subject has. A subject with no block that day keeps its place at the end,
   in its usual order. The nodes themselves move, not a CSS `order`, so tab
   order and VoiceOver follow the screen; every control binds by data-id, so
   nothing is lost in the move. Runs in a MutationObserver callback, which is
   before the next paint, so nothing is seen in the wrong order (v51). */
(function () {
  function ready() {
    return typeof blocksFor === "function" && typeof parseKey === "function" &&
      typeof S !== "undefined" && S && Array.isArray(S.subjects);
  }
  function firstBlock(date, id) {
    var bl = blocksFor(date) || [];
    for (var i = 0; i < bl.length; i++) if (bl[i] && bl[i].s === id) return i;
    return 1e6;
  }
  function arrange(parent, items, keyOf) {
    if (items.length < 2) return;
    var keyed = items.map(function (n, i) { return { n: n, k: keyOf(n), i: i }; });
    var sorted = keyed.slice().sort(function (a, b) { return (a.k - b.k) || (a.i - b.i); });
    if (sorted.every(function (x, i) { return x.i === i; })) return;
    var active = document.activeElement, sel = null;
    if (active && parent.contains(active)) {
      try { sel = [active.selectionStart, active.selectionEnd]; } catch (e) { }
    } else active = null;
    var anchor = items[items.length - 1].nextSibling;
    sorted.forEach(function (x) { parent.insertBefore(x.n, anchor); });
    if (active && document.activeElement !== active) {
      try { active.focus({ preventScroll: true }); } catch (e) { active.focus(); }
      try { if (sel && sel[0] != null) active.setSelectionRange(sel[0], sel[1]); } catch (e) { }
    }
  }
  function subjectByName(name) {
    for (var i = 0; i < S.subjects.length; i++) if (S.subjects[i].name === name) return S.subjects[i].id;
    return null;
  }
  function run() {
    if (!ready()) return;
    var rail = document.querySelector(".rail");
    /* v93: a rail laid out by the day (below) is already in order, with rows between the cards */
    if (rail && typeof cursor !== "undefined" && !rail.classList.contains("byday")) {
      var date = cursor;
      var cards = [].filter.call(rail.children, function (n) { return n.classList && n.classList.contains("sub"); });
      arrange(rail, cards, function (n) {
        var b = n.querySelector("[data-skip]");
        return b ? firstBlock(date, b.getAttribute("data-skip")) : 1e6;
      });
    }
    [].forEach.call(document.querySelectorAll(".wday[data-jump]"), function (card) {
      var d = parseKey(card.getAttribute("data-jump"));
      var rows = [].filter.call(card.children, function (n) {
        return n.classList && n.classList.contains("wrow") && n.querySelector("em");
      });
      arrange(card, rows, function (n) {
        var id = subjectByName(n.querySelector("em").textContent);
        return id ? firstBlock(d, id) : 1e6;
      });
    });
  }
  if (!document.querySelector || !window.MutationObserver) return;
  run();
  new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
})();

/* ---- a fresh install gets the current schedule on its first load ----
   See `fresh` in suite-migrate.js. By the time this deferred file runs, the
   planner has booted and written its defaults, so the fixes can run on them
   now. If they change anything the planner is showing stale data, so reload
   once; the second load is not fresh, so this cannot loop (v51). */
(function () {
  var M = window.SuiteMigrate;
  if (!M || !M.fresh || typeof M.runAll !== "function") return;
  M.fresh = false;
  /* The planner boots asynchronously, so its first write may not have
     happened yet; wait for it (briefly) rather than trust script timing. */
  var tries = 0;
  (function attempt() {
    var before;
    try { before = M.keys.map(function (k) { return localStorage.getItem(k); }); } catch (e) { return; }
    if (before[0] == null) { if (++tries < 60) setTimeout(attempt, 50); return; }
    M.runAll();
    var after = M.keys.map(function (k) { return localStorage.getItem(k); });
    if (after.some(function (v, i) { return v !== before[i]; })) { M.reloading = true; location.replace(location.href); }
  })();
})();

/* ---- v80: the open planner never writes over a pull ----
   Reported: saved changes in the planner kept disappearing.

   The planner reads its four keys once, at boot, and after that every save
   writes its whole in-memory copy back: persist() stores all of DAYS,
   persistSettings() all of S. A sync round that brings in another
   computer's edits writes them to local storage underneath it, and the
   planner never looks. So the next keystroke on this computer put the old
   copy back, and the round after that read the old copy as an edit made
   here — "local changed it, remote left it alone" — and sent it everywhere.
   A day saved at home was gone from home too, and nothing said so. The
   "Newer data arrived" banner was the only guard, and it has a close button.

   Both halves are fixed here, because the planner itself is protected:

   1. Every write the planner makes is merged first. `base` is what this
      page's memory and storage last agreed on; if storage has moved since,
      the three-way merge folds the newer storage into memory before the
      write, so the write carries both. Its own edits still win a field
      edited in both places, as a sync round's local side does.
   2. A pull that touches the planner's keys is folded into memory at once,
      and the page redraws — unless something on it is being typed in or a
      sheet is open, in which case the banner offers the reload as before
      (now safe either way).

   Memory is updated in place, never replaced, so the Settings handlers and
   the day on screen keep pointing at the live objects. */
(function () {
  if (location.pathname.indexOf("planner") < 0 || !window.SuiteSync || typeof window.SuiteSync.merge !== "function") return;
  function g(n) { try { return (0, eval)(n); } catch (e) { return undefined; } }
  var store = g("store");
  if (!store || typeof store.set !== "function" || store.set.__merges) return;

  var NAMES = { "lp:days:v2": "DAYS", "lp:pending:v1": "PENDING", "lp:settings:v2": "S", "lp:me:v1": "ME" };
  function isObj(x) { return !!x && typeof x === "object" && !Array.isArray(x); }
  function parse(v) { if (typeof v !== "string") return undefined; try { return JSON.parse(v); } catch (e) { return undefined; } }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function kin(a, b) { return (Array.isArray(a) && Array.isArray(b)) || (isObj(a) && isObj(b)); }
  function ided(a) { return Array.isArray(a) && a.every(function (x) { return isObj(x) && x.id != null; }); }

  /* make `t` equal `s`, keeping every object that still exists */
  function adopt(t, s) {
    if (Array.isArray(t)) {
      if (ided(t) && ided(s)) {
        var by = {}; t.forEach(function (x) { by[String(x.id)] = x; });
        var out = s.map(function (x) { var o = by[String(x.id)]; if (o && kin(o, x)) { adopt(o, x); return o; } return x; });
        t.length = 0; out.forEach(function (x) { t.push(x); });
      } else {
        s.forEach(function (x, i) { if (kin(t[i], x)) adopt(t[i], x); else t[i] = x; });
        t.length = s.length;
      }
      return;
    }
    Object.keys(t).forEach(function (k) { if (!(k in s)) delete t[k]; });
    Object.keys(s).forEach(function (k) { if (kin(t[k], s[k])) adopt(t[k], s[k]); else t[k] = s[k]; });
  }

  var base = {};
  Object.keys(NAMES).forEach(function (k) { base[k] = read(k); });

  /* fold what storage holds now into memory; true if memory changed */
  function fold(k, mem) {
    var now = read(k);
    if (now == null || now === base[k] || !kin(mem, parse(now))) return false;
    var before = JSON.stringify(mem);
    var merged = window.SuiteSync.merge(parse(base[k]), JSON.parse(before), parse(now));
    base[k] = now;
    if (!kin(mem, merged) || JSON.stringify(merged) === before) return false;
    adopt(mem, merged);
    if (k === "lp:days:v2") {
      if (typeof window.invalidateDayCache === "function") window.invalidateDayCache();
      /* the saved day on screen is edited through `draft`; give it the
         other computer's fields too, or the next keystroke reverts them */
      var d = g("draft"), dk = d && d.__key;
      if (d && d.saved && dk && isObj(mem[dk])) { adopt(d, JSON.parse(JSON.stringify(mem[dk]))); d.__key = dk; }
    }
    return true;
  }

  var orig = store.set;
  store.set = function (k, val) {
    if (NAMES[k] && isObj(val)) { try { fold(k, val); } catch (e) { } }
    var p = orig.apply(this, arguments);
    if (NAMES[k]) base[k] = read(k);    /* the device path writes before its first await */
    /* v81: persist() warns when days fail to save; settings, drafts and
       the planner's own record failed in silence */
    if (k !== "lp:days:v2" && p && typeof p.then === "function") p.then(function (okd) {
      if (okd === false && typeof window.toast === "function") window.toast("Couldn\u2019t save \u2014 browser storage may be full. Export a backup from the sync menu.");
    });
    return p;
  };
  store.set.__merges = true;

  function typing() {
    var a = document.activeElement;
    if (a && a !== document.body && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true;
    if (a && a.isContentEditable) return true;
    return !!g("sheetEl");
  }
  /* true when the pull is already on screen, so no reload is needed */
  function absorb(changed) {
    var mine = changed.filter(function (k) { return NAMES[k]; });
    if (!mine.length) return false;
    var moved = false;
    mine.forEach(function (k) { var m = g(NAMES[k]); if (m && typeof m === "object") { try { if (fold(k, m)) moved = true; } catch (e) { } } });
    if (!moved) return true;
    if (typing()) return false;
    if (typeof window.render === "function") { try { window.render(); } catch (e) { return false; } }
    if (typeof window.toast === "function") window.toast("Updated with changes from your other computer");
    return true;
  }
  window.SuitePlannerLive = { absorb: absorb, fold: fold, get base() { return base; } };
})();

/* ---- v81: the ORF tool's writes merge with what arrived underneath ----
   fluency/index.html keeps running-records-v1 in memory, reads it once and
   writes the whole copy on every change, like the planner did (v80). It is
   protected and its storage is inside a closure, so memory cannot be
   refreshed from here; the write guard in suite-sync.js is what keeps a
   pulled check or student from being written over. Its base starts as what
   the tool read at boot, which is what is stored now. */
(function () {
  if (location.pathname.indexOf("fluency") < 0 || !window.SuiteSync || !window.SuiteSync.adopted) return;
  window.SuiteSync.adopted("running-records-v1");
})();

/* ---- v83: the ORF tool's "Restore from backup" can be undone ----
   The tool replaces everything it holds with the backup, and sync then
   carries that to every computer: the checks recorded since the backup was
   saved are gone everywhere. The gradebook and the sync file both have an
   undo; this was the one replace in the suite without one.

   Just before the tool's own handler runs (a capture listener on the
   document fires before the input's), what is stored now is kept. If the
   stored copy then changes (the teacher said yes to the tool's confirm),
   a banner offers Undo for the rest of the visit, and the copy is also
   kept in suite:orfPreRestore:v1 (never synced: it is this computer's
   undo) when it is under a megabyte, for two weeks. Undo waits out the
   tool's 120ms save, puts the copy back and reloads, since the tool reads
   storage only when it starts. */
(function () {
  if (location.pathname.indexOf("fluency") < 0) return;
  var KEY = "running-records-v1", UNDO = "suite:orfPreRestore:v1";
  function get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function offer(before) {
    var b = document.createElement("div");
    b.id = "suite-orf-undo";
    b.setAttribute("role", "status");
    b.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);" +
      "bottom:calc(64px + env(safe-area-inset-bottom,0px));z-index:2147483001;" +
      "background:#14202A;color:#fff;padding:10px 14px;border-radius:10px;display:flex;gap:12px;align-items:center;" +
      "font:13.5px/1.4 'IBM Plex Sans','Segoe UI',system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.3);max-width:min(560px,92vw)";
    var t = document.createElement("span");
    t.textContent = "Backup restored. Everything here before it has been kept.";
    var u = document.createElement("button");
    u.textContent = "Undo";
    u.style.cssText = "border:0;background:#10655C;color:#fff;font:600 13px inherit;padding:6px 12px;border-radius:7px;cursor:pointer";
    u.onclick = function () {
      if (!window.confirm("Put back what was here before the restore?")) return;
      u.disabled = true;
      setTimeout(function () {
        try { window.localStorage.setItem(KEY, before); }
        catch (e) { t.textContent = "Could not put it back: this browser's storage is full."; u.disabled = false; return; }
        try { window.localStorage.removeItem(UNDO); } catch (e) { }
        try { sessionStorage.setItem("suite:orfUndone", "1"); } catch (e) { }
        location.reload();
      }, 400);
    };
    var x = document.createElement("button");
    x.textContent = "\u00d7";
    x.style.cssText = "border:0;background:transparent;color:#9FB2B5;font-size:17px;cursor:pointer;padding:0 2px";
    x.onclick = function () { b.remove(); };
    b.appendChild(t); b.appendChild(u); b.appendChild(x);
    var old = document.getElementById("suite-orf-undo"); if (old) old.remove();
    document.body.appendChild(b);
  }
  /* the backup's readings, by id: a restore is recognised by the stored
     copy now holding exactly these, not by any change at all (a check
     recorded after cancelling the tool's confirm is not a restore) */
  function idsOf(d) {
    return d && Array.isArray(d.records) ? d.records.map(function (r) { return String(r && r.id); }).sort().join("|") : null;
  }
  document.addEventListener("change", function (e) {
    var inp = e.target;
    if (!inp || inp.id !== "fileRestore" || !inp.files || !inp.files[0]) return;
    var before = get(KEY);
    if (before == null) return;
    var file = inp.files[0];
    Promise.resolve(file.text ? file.text() : "").then(function (txt) {
      var want;
      try { want = idsOf(JSON.parse(txt)); } catch (err) { return; }
      if (want == null) return;
      var tries = 0;
      (function watch() {
        /* the tool asks first, and a confirm blocks; this waits as long as
           a person might take to answer */
        var now = get(KEY), d = null;
        try { d = JSON.parse(now); } catch (err) { }
        if (now !== before && idsOf(d) === want) {
          /* a second full copy costs the tool room of its own (five
             megabytes on an iPad), so it is kept only when small */
          if (before.length < 1000000) {
            try { window.localStorage.setItem(UNDO, JSON.stringify({ at: new Date().toISOString(), value: before })); } catch (err) { }
          }
          offer(before);
          return;
        }
        if (++tries < 600) setTimeout(watch, 200);
      })();
    });
  }, true);
  /* an undo copy is for the restore just made; after two weeks it is only
     taking room */
  try {
    var kept = JSON.parse(get(UNDO) || "null");
    if (kept && (!kept.at || Date.now() - new Date(kept.at).getTime() > 14 * 864e5)) window.localStorage.removeItem(UNDO);
  } catch (e) { try { window.localStorage.removeItem(UNDO); } catch (e2) { } }
  try {
    if (sessionStorage.getItem("suite:orfUndone")) {
      sessionStorage.removeItem("suite:orfUndone");
      if (typeof window.toast === "function") setTimeout(function () { window.toast("Put back what was here before the restore."); }, 300);
    }
  } catch (e) { }
})();

/* ---- v89: the planner's Team tab is retired ----
   It shared plans through a Claude artifact's storage, which a page on
   GitHub Pages does not have, so it could never work here (suite-boot.js
   only reworded its note). The planner's file is the teacher's own and is
   not edited: this takes the tab's button out of the nav, and if the
   planner opened on it, moves to Today. Its data (lp:me:v1) is left. */
(function () {
  if (location.pathname.indexOf("planner") < 0) return;
  function run() {
    var b = document.querySelector('[role="tab"][data-view="team"]');
    if (!b) return;
    var was = b.getAttribute("aria-selected") === "true";
    b.remove();
    if (was) { var t = document.querySelector('[role="tab"][data-view="today"]'); if (t) t.click(); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();

/* ---- v88: the planner's district calendar, for the suite calendar ----
   The planner carries Creswell's calendar in its own file (YEAR: first and
   last day, and every day school is closed, grading days among them). That
   file is the teacher's own and is not edited, and the gradebook cannot
   read it, so this copies the few facts the suite calendar needs into
   suite:district:v1 whenever the planner opens. Gradebook Setup offers
   them ("Use the district's dates"); it never applies them by itself.
   Derived from the planner's code, so every computer writes the same. */
(function () {
  if (location.pathname.indexOf("planner") < 0) return;
  try {
    /* a top-level const in the planner's script, visible to this one */
    if (typeof YEAR === "undefined" || !YEAR || !YEAR.first || !YEAR.last) return;
    var closed = YEAR.closed || {};
    var out = { label: String(YEAR.label || ""), first: YEAR.first, last: YEAR.last,
      grading: Object.keys(closed).filter(function (k) { return /grading day/i.test(closed[k]); }).sort() };
    var v = JSON.stringify(out);
    if (window.localStorage.getItem("suite:district:v1") !== v) window.localStorage.setItem("suite:district:v1", v);
  } catch (e) { }
})();

/* ---- v87: the ORF tool is for taking checks ----
   Its Growth, Reports, Gradebook and Students tabs are the gradebook's ORF
   tab now (goals, aim line, groups, patterns: v86) and its roster (the
   gradebook's, pushed one way: v87). The tool's file is the teacher's own
   and is not edited: this takes those four tab buttons out of its nav, so
   nothing can open them, and moves the one thing on them that belongs to
   taking checks, the Records card (the saved checks, with Delete, and the
   CSV, backup and restore buttons), onto Assess. The card keeps its own
   listeners, and the tool already redraws it after every save. A line under
   the tabs says where the rest went. Runs after the tool's script (this
   file is deferred), before its first paint of data (that waits on an
   async load), so the tabs never flash. */
(function () {
  if (location.pathname.indexOf("fluency") < 0) return;
  var GONE = ["growth", "reports", "gradebook", "students"];
  function run() {
    var nav = document.querySelector("nav.tabs");
    if (!nav) return;
    var wasOpen = false;
    GONE.forEach(function (t) {
      var b = nav.querySelector('button[data-tab="' + t + '"]');
      if (b) { if (b.getAttribute("aria-selected") === "true") wasOpen = true; b.remove(); }
    });
    var list = document.getElementById("recordList"), assess = document.getElementById("tab-assess");
    var card = list && list.closest(".panel");
    if (card && assess && card.parentNode !== assess) {
      var h = card.querySelector("h2");
      if (h) h.textContent = "Saved checks";
      card.setAttribute("data-suite-moved", "records");
      assess.appendChild(card);
    }
    if (!document.getElementById("suite-orf-where")) {
      var p = document.createElement("p");
      p.id = "suite-orf-where";
      p.className = "hint";
      p.style.cssText = "margin:6px 0 0";
      p.innerHTML = 'Goals, growth, groups, patterns and the class list are in the <a href="../gradebook/#orf" style="color:var(--accent)">gradebook\u2019s ORF tab</a>.';
      nav.parentNode.insertBefore(p, nav.nextSibling);
    }
    var first = nav.querySelector('button[data-tab="assess"]');
    if (wasOpen && first) first.click();
    GONE.forEach(function (t) { var sec = document.getElementById("tab-" + t); if (sec) sec.classList.add("hidden"); });
    if (first && !nav.querySelector('button[aria-selected="true"]')) first.click();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();

/* Starts sync and the service worker on the tools that have no boot code of
   their own. The gradebook does both itself and does not load this file.

   Neither the planner nor the running-records tool re-reads local storage after
   startup, so a pull that changes their data offers a reload rather than doing
   it silently — there may be an unsaved day on screen. */
(function () {
  if (!window.SuiteSync) return;

  function banner(msg, actionLabel, onAction) {
    var b = document.createElement("div");
    b.setAttribute("role", "status");
    b.setAttribute("aria-live", "polite");
    /* every other floating element in the suite clears the home indicator;
       this one did not, so on a notched phone it sat in the strip */
    b.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);" +
      "bottom:calc(64px + env(safe-area-inset-bottom,0px));z-index:2147483001;" +
      "background:#14202A;color:#fff;padding:10px 14px;border-radius:10px;display:flex;gap:12px;align-items:center;" +
      "font:13.5px/1.4 'IBM Plex Sans','Segoe UI',system-ui,sans-serif;" +
      "box-shadow:0 6px 24px rgba(0,0,0,.3);max-width:min(560px,92vw)";
    var t = document.createElement("span"); t.textContent = msg; b.appendChild(t);
    if (actionLabel) {
      var a = document.createElement("button");
      a.textContent = actionLabel;
      a.style.cssText = "border:0;background:#10655C;color:#fff;font:600 13px inherit;padding:6px 12px;border-radius:7px;cursor:pointer";
      a.onclick = onAction;
      b.appendChild(a);
    }
    var x = document.createElement("button");
    x.textContent = "\u00d7";
    x.style.cssText = "border:0;background:transparent;color:#9FB2B5;font-size:17px;cursor:pointer;padding:0 2px";
    x.onclick = function () { b.remove(); };
    b.appendChild(x);
    var old = document.getElementById("suitebanner");
    if (old) old.remove();
    b.id = "suitebanner";
    document.body.appendChild(b);
    return b;
  }

  /* The Small Groups page redraws itself when its data or the roster
     arrives, so it needs no reload banner. */
  var mine = location.pathname.indexOf("planner") >= 0
    ? ["lp:settings:v2", "lp:days:v2", "lp:me:v1", "lp:pending:v1"]
    : location.pathname.indexOf("/groups") >= 0 ? []
    : ["running-records-v1"];

  /* v87: the gradebook, open in another tab, puts its roster on the ORF
     tool's (see pushRosterToOrf there). The tool reads storage only when it
     starts, so say so rather than let a new child be missing from Assess. */
  if (mine.indexOf("running-records-v1") >= 0) {
    window.addEventListener("storage", function (e) {
      if (e.key !== "running-records-v1" || e.storageArea !== window.localStorage) return;
      banner("The class list or checks changed in another tab.", "Reload", function () { location.reload(); });
    });
  }
  window.SuiteSync.onChanged(function (changed) {
    if (!changed.some(function (k) { return mine.indexOf(k) >= 0; })) return;
    /* v80: the planner folds a pull into what it is showing; the banner
       is only for when it cannot redraw yet (see above) */
    if (window.SuitePlannerLive && window.SuitePlannerLive.absorb(changed)) return;
    banner("Newer data arrived from another machine.", "Reload", function () { location.reload(); });
  });

  window.SuiteSync.init();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("../sw.js").catch(function () { });
  }
})();

/* ---- v79: one name per tool, the same in every place it shows ----
   The planner was "Pocket Chart — 2nd grade daily planner" and the ORF tool
   "Running Records"; the switcher, the launcher and the gradebook called them
   Planner and Fluency. Both files are protected, so their headings and tab
   titles are renamed here, after the page has parsed. The words are the only
   change: the planner's own header markup is untouched. */
(function () {
  var ph = document.querySelector(".brand h1");
  if (ph && /pocket chart/i.test(ph.textContent)) {
    ph.textContent = "Planner";
    var tag = document.querySelector(".brand h1 + span");
    if (tag) tag.textContent = "Grade 2 daily and weekly plans";
    document.title = "Planner";
  }
  var fh = document.querySelector("header.top h1");
  if (fh && /running records/i.test(fh.textContent)) {
    fh.textContent = "ORF";
    document.title = "ORF";
  }

  /* The planner's Team tab predates the suite. Its sharing needs a Claude
     artifact's storage, which a GitHub Pages site never has, and its note
     told the teacher to publish from "the artifact menu". Say what is true
     here instead. The planner redraws #main on every view change, so this
     watches for the note rather than looking once. */
  var main = document.getElementById("main");
  if (!main || !ph) return;
  var fix = function () {
    var hints = main.querySelectorAll(".panel .hint");
    for (var i = 0; i < hints.length; i++) {
      if (/published<\/b> artifact/.test(hints[i].innerHTML)) {
        hints[i].innerHTML = "Sharing plans with your team is not available on this site. " +
          "Your own plans already follow you between computers through <b>Sync</b> in the corner switcher.";
        hints[i].setAttribute("data-suite-team-note", "");
      }
    }
  };
  fix();
  new MutationObserver(fix).observe(main, { childList: true });
})();

/* ---- v93: the day, in one place ----
   The Today view had the subject cards ("Where we are") and, under them, a
   read-only timeline of the day's schedule ("The day, block by block") that
   repeated them. He planned on the cards and never used the timeline. Now
   the cards ARE the day: the rail is laid out in the order of that
   weekday's schedule, and every block without a lesson (arrival, recess,
   lunch, specials, dismissal) is a slim row in its place, with any standing
   note from Settings and a note of its own for that day. The timeline panel
   is taken away. The planner is protected, so this wraps its functions, the
   way curriculum.js wraps cardHTML:

   - renderToday: after the planner draws, the rail is rebuilt in schedule
     order. The card nodes are moved, not redrawn, so every control keeps
     the handler wireToday gave it. A subject's card sits at its first block;
     its later blocks in the same run are listed inside the card; a block for
     it that comes back after something else is a slim "continued" row. A
     subject that is on but has no block that day keeps its place at the end.
     A day with no schedule is left as the planner draws it, empty-state
     panel and "Copy Monday's schedule here" included.
   - cardHTML: the card lists its blocks (time, name, standing note) when
     there is more than one, or one with its own name or a standing note.
     Done in the card's HTML so a card redrawn on its own keeps it.
   - copySubPlan: the copied plan carries each block's note for the day.

   A block's note for the day is draft.blockNotes["8:00|Recess"] (start time
   and name, as Settings has them). The planner saves the whole draft, so it
   is saved, stashed and synced with the day and nothing else; a day built
   fresh has none, so notes never carry forward. Sub plans print them under
   "Just for this day". */
(function () {
  function isPlanner() {
    return typeof renderToday === "function" && typeof cardHTML === "function" && typeof blocksFor === "function" &&
      typeof touch === "function" && typeof copySubPlan === "function" && typeof blockEnd === "function" && typeof sub === "function" &&
      typeof span === "function" && typeof S !== "undefined" && S && Array.isArray(S.subjects);
  }
  if (!isPlanner()) return;

  function e$(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function bkey(b) { return String(b.t || "") + "|" + String(b.l || ""); }
  function onIds() {
    var o = {};
    S.subjects.forEach(function (s) { if (s && s.on) o[s.id] = s; });
    return o;
  }
  /* the day, in order: cards, rows, and "continued" rows */
  function dayPlan(blocks) {
    var on = onIds(), seen = {}, prev = null, out = [];
    blocks.forEach(function (b, i) {
      var s = b && b.s && on[b.s] ? b.s : null;
      if (s) {
        if (!seen[s]) { seen[s] = true; out.push({ kind: "card", id: s }); }
        else if (prev !== s) out.push({ kind: "cont", id: s, b: b, i: i });
      } else out.push({ kind: "row", b: b, i: i });
      prev = s;
    });
    S.subjects.forEach(function (s) { if (s && s.on && !seen[s.id]) out.push({ kind: "card", id: s.id }); });
    return out;
  }
  window.PlannerDay = { dayPlan: dayPlan, key: bkey };

  var CELL_H = 380;
  var STYLE = [
    ".rail.byday .dayrow{grid-column:1/-1;display:flex;gap:12px;align-items:flex-start;padding:7px 4px 7px 2px;border-top:1.5px solid var(--line)}",
    ".rail.byday .dayrow time{font-family:var(--mono);font-size:11px;color:var(--ink-2);flex:0 0 82px;padding-top:3px}",
    ".rail.byday .drbody{flex:1;min-width:0}",
    ".rail.byday .drlabel{font-size:14px;color:var(--ink);display:flex;align-items:center;gap:8px;flex-wrap:wrap}",
    ".rail.byday .drlabel .drsub{font-size:12.5px;color:var(--ink-3)}",
    ".rail.byday .drnote{font-size:13px;color:var(--ink-2);margin-top:2px;line-height:1.5;white-space:pre-line}",
    ".rail.byday .dradd{background:none;border:0;padding:2px 0;margin-top:1px;font:inherit;font-size:12.5px;color:var(--ink-3);cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px}",
    ".rail.byday .dradd:hover{color:var(--ink-2)}",
    ".rail.byday .drday{display:block;width:100%;box-sizing:border-box;margin-top:5px;resize:none;overflow:hidden;min-height:34px;font:inherit;font-size:13.5px;line-height:1.45;color:var(--ink);background:var(--card, #fff);border:1.5px solid var(--line);border-radius:8px;padding:6px 9px}",
    ".rail.byday .drday:focus{outline:none;border-color:var(--ink-2)}",
    ".sub .cblocks{list-style:none;margin:8px 0 0;padding:0;font-size:12.5px;color:var(--ink-2);line-height:1.45}",
    ".sub .cblocks li{display:flex;gap:8px;padding:1px 0}",
    ".sub .cblocks time{font-family:var(--mono);font-size:11px;flex:0 0 76px;padding-top:1px;color:var(--ink-3)}",
    ".sub .cblocks .cbn{display:block;color:var(--ink-3)}",
    "@media (max-width:760px){.rail.byday .dayrow time{flex-basis:70px}.rail.byday .drday{font-size:16px}}",
    "@media print{.rail.byday .dradd{display:none}}",
    /* v98: on a computer the day is a regular grid. Every cell is the same
       width and height, in schedule order, left to right: a lesson card, or
       one lighter cell holding a run of plain blocks. A long cell fades out
       into Show more, which opens it in place, over the cells below, so the
       grid never moves. Phones (760px and under) and print keep the v93
       column: the cells' wrappers become display:contents there. */
    "@media screen and (min-width:761px){" +
      ".rail.byday{grid-template-columns:repeat(auto-fill,minmax(270px,1fr));align-items:start;gap:12px}" +
      ".rail.byday>.blockcell{grid-column:auto;background:rgba(255,255,255,.55);border:1.5px dashed var(--line);border-radius:12px;padding:8px 10px}" +
      ".rail.byday>.blockcell .dayrow{border-top:0;padding:6px 0}" +
      ".rail.byday>.blockcell .dayrow+.dayrow{border-top:1px solid var(--line)}" +
      ".rail.byday>.blockcell .dayrow time{flex-basis:66px}" +
      ".rail.byday>.sub:not(.skip),.rail.byday>.blockcell{height:" + CELL_H + "px;display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden}" +
      ".rail.byday .cmid{flex:1 1 auto;min-height:0;overflow:hidden;position:relative}" +
      ".rail.byday .over:not(.open)>.cmid::after{content:'';position:absolute;left:0;right:0;bottom:0;height:42px;pointer-events:none;background:linear-gradient(rgba(255,255,255,0),var(--card,#fff))}" +
      ".rail.byday>.blockcell.over:not(.open)>.cmid::after{background:linear-gradient(rgba(246,247,248,0),rgb(246,247,248))}" +
      /* as specific as the fixed-height rule above, or that one wins */
      ".rail.byday>.sub.open:not(.skip),.rail.byday>.blockcell.open{height:auto;position:relative;z-index:30;overflow:visible;box-shadow:0 10px 28px rgba(16,24,32,.18)}" +
      ".rail.byday>.blockcell.open{background:var(--card,#fff)}" +
      ".rail.byday>.open>.cmid{overflow:visible}" +
      ".rail.byday .sub>.subnote{flex:none}" +
      ".rail.byday .more{flex:none;align-self:flex-start;margin:6px 0 4px;background:none;border:0;padding:2px 0;font:inherit;font-size:12.5px;font-weight:600;color:var(--ink-2);cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px}" +
      ".rail.byday .more:hover{color:var(--ink)}" +
      "}",
    /* on a wide screen the Today view takes more of it: up to five across */
    "@media screen and (min-width:1600px){html:not([data-suite-theme]):has(.rail.byday){--x-w:1560px}}",
    "@media not screen,(max-width:760px){.rail.byday>.blockcell,.rail.byday .cmid{display:contents}.rail.byday .more{display:none}}"
  ].join("\n");
  function style() {
    if (document.getElementById("pl-day-style")) return;
    var st = document.createElement("style");
    st.id = "pl-day-style";
    st.textContent = STYLE;
    document.head.appendChild(st);
  }

  /* ---------- the card lists its blocks ---------- */
  var OWN_CARD = window.cardHTML;
  window.cardHTML = function (sb) {
    var html = OWN_CARD.apply(this, arguments);
    try {
      var blocks = blocksFor(cursor), mine = [];
      blocks.forEach(function (b, i) { if (b && sb && b.s === sb.id) mine.push({ b: b, i: i }); });
      var show = mine.length > 1 || mine.some(function (x) { return x.b.n || String(x.b.l || "") !== sb.name; });
      if (!show) return html;
      var list = '<ul class="cblocks" aria-label="' + e$(sb.name) + ' blocks today">' + mine.map(function (x) {
        return "<li><time>" + e$(span(x.b.t, blockEnd(blocks, x.i))) + "</time><span>" + e$(x.b.l) +
          (x.b.n ? '<span class="cbn">' + e$(x.b.n) + "</span>" : "") + "</span></li>";
      }).join("") + "</ul>";
      var at = html.indexOf('<textarea class="subnote"');
      if (at >= 0) html = html.slice(0, at) + list + html.slice(at);
    } catch (x) { }
    return html;
  };

  /* ---------- the day laid out ---------- */
  function rowHTML(item, blocks) {
    var b = item.b, t = span(b.t, blockEnd(blocks, item.i));
    if (item.kind === "cont") {
      var sb = sub(item.id);
      return '<div class="dayrow cont" style="--c:' + e$(sb.color) + '"><time>' + e$(t) + '</time><div class="drbody">' +
        '<div class="drlabel"><span class="dot"></span>' + e$(b.l) + '<span class="drsub">' + e$(sb.name) + ", continued from its card</span></div>" +
        (b.n ? '<div class="drnote">' + e$(b.n) + "</div>" : "") + "</div></div>";
    }
    var k = bkey(b), note = (draft && draft.blockNotes && draft.blockNotes[k]) || "";
    return '<div class="dayrow" data-bk="' + e$(k) + '"><time>' + e$(t) + '</time><div class="drbody">' +
      '<div class="drlabel">' + e$(b.l) + "</div>" +
      (b.n ? '<div class="drnote">' + e$(b.n) + "</div>" : "") +
      (note
        ? '<textarea class="drday" rows="1" data-bk="' + e$(k) + '" aria-label="Today\u2019s note for ' + e$(b.l) + '">' + e$(note) + "</textarea>"
        : '<button type="button" class="dradd" data-bk="' + e$(k) + '">Add a note for today</button>') +
      "</div></div>";
  }
  function fit(ta) { try { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + 2 + "px"; } catch (x) { } }
  function wireRow(row) {
    var k = row.getAttribute("data-bk");
    if (!k) return;
    function bindTa(ta) {
      fit(ta);
      ta.addEventListener("input", function () {
        if (!draft) return;
        var v = ta.value;
        if (!draft.blockNotes || typeof draft.blockNotes !== "object") draft.blockNotes = {};
        if (v.trim()) draft.blockNotes[k] = v; else delete draft.blockNotes[k];
        if (!Object.keys(draft.blockNotes).length) delete draft.blockNotes;
        fit(ta);
        touch();
      });
    }
    var ta = row.querySelector("textarea.drday");
    if (ta) bindTa(ta);
    var add = row.querySelector(".dradd");
    if (add) add.addEventListener("click", function () {
      var t = document.createElement("textarea");
      t.className = "drday"; t.rows = 1; t.setAttribute("data-bk", k);
      t.setAttribute("aria-label", "Today\u2019s note for " + (row.querySelector(".drlabel").textContent || ""));
      t.placeholder = "Just for today";
      add.parentNode.replaceChild(t, add);
      bindTa(t);
      t.focus();
    });
  }
  /* ---------- v98: the day as a regular grid ----------
     Cards stay direct children of the rail (other code finds them there).
     A run of plain block rows goes into one .blockcell; each card's middle
     (curriculum detail, starting point, its blocks) into a .cmid, so the
     title, the stepper and the notes box stay in view when it is clipped.
     Which cells are open is remembered across re-renders (a nudge, a Skip,
     another day) until closed or the page is reloaded. */
  var openCells = {};
  function cellKey(c) {
    if (c.classList.contains("sub")) { var b = c.querySelector("[data-skip]"); return b ? "s:" + b.getAttribute("data-skip") : ""; }
    var r = c.querySelector(".dayrow");
    return r ? "b:" + (r.getAttribute("data-bk") || r.textContent.slice(0, 40)) : "";
  }
  function gridOn() {
    try { return window.matchMedia("screen and (min-width:761px)").matches; } catch (x) { return false; }
  }
  function gridCells(rail) {
    var run = null;
    [].slice.call(rail.children).forEach(function (n) {
      if (n.classList && n.classList.contains("dayrow")) {
        if (!run) {
          run = document.createElement("div"); run.className = "blockcell";
          var m = document.createElement("div"); m.className = "cmid"; run.appendChild(m);
          rail.insertBefore(run, n);
        }
        run.firstChild.appendChild(n);
      } else run = null;
    });
    [].forEach.call(rail.querySelectorAll(":scope > .sub:not(.skip)"), function (card) {
      var parts = [].filter.call(card.children, function (x) { return x.matches && x.matches(".rv,.prov,.cblocks"); });
      if (!parts.length) return;
      var mid = document.createElement("div"); mid.className = "cmid";
      card.insertBefore(mid, parts[0]);
      parts.forEach(function (x) { mid.appendChild(x); });
    });
    [].forEach.call(rail.querySelectorAll(":scope > .sub:not(.skip), :scope > .blockcell"), function (c) {
      if (openCells[cellKey(c)]) c.classList.add("open");
    });
    measure(rail);
    setTimeout(function () { measure(rail); }, 300);      /* after fonts settle */
  }
  /* which cells need Show more, and keep an open one from moving the grid */
  function measure(rail) {
    if (!rail || !rail.isConnected) return;
    var on = gridOn();
    [].forEach.call(rail.querySelectorAll(":scope > .sub:not(.skip), :scope > .blockcell"), function (c) {
      var mid = c.querySelector(":scope > .cmid"), btn = c.querySelector(":scope > .more");
      var open = c.classList.contains("open");
      var over = false;
      if (on && mid) {
        if (open) over = true;
        else over = mid.scrollHeight > mid.clientHeight + 4;
      }
      c.classList.toggle("over", over);
      if (over && !btn) {
        btn = document.createElement("button");
        btn.type = "button"; btn.className = "more";
        btn.addEventListener("click", function (e) { e.stopPropagation(); setOpen(c, !c.classList.contains("open")); });
        if (mid.nextSibling) c.insertBefore(btn, mid.nextSibling); else c.appendChild(btn);
      }
      if (!over && btn) btn.parentNode.removeChild(btn);
      if (btn && over) {
        btn.textContent = open ? "Show less" : "Show more";
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      }
      /* open, it is taller than its cell; a negative margin hands the grid
         back exactly one cell's height, so nothing after it moves */
      c.style.marginBottom = open && on ? (CELL_H - c.offsetHeight) + "px" : "";
    });
  }
  function setOpen(c, open) {
    var rail = c.parentNode;
    [].forEach.call(rail.querySelectorAll(":scope > .open"), function (o) {
      if (o !== c) { o.classList.remove("open"); delete openCells[cellKey(o)]; }
    });
    c.classList.toggle("open", open);
    if (open) openCells[cellKey(c)] = true; else delete openCells[cellKey(c)];
    measure(rail);
  }
  function closeAll() {
    var rail = document.querySelector(".rail.byday");
    if (!rail) return;
    var o = rail.querySelector(":scope > .open");
    if (o) setOpen(o, false);
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(); });
  document.addEventListener("click", function (e) {
    var rail = document.querySelector(".rail.byday");
    var o = rail && rail.querySelector(":scope > .open");
    if (o && !o.contains(e.target) && document.contains(e.target)) setOpen(o, false);
  });
  /* typing a note can make a cell outgrow itself; a resize changes columns */
  var measureT = null;
  function remeasure() { clearTimeout(measureT); measureT = setTimeout(function () { measure(document.querySelector(".rail.byday")); }, 120); }
  window.addEventListener("resize", remeasure);
  document.addEventListener("input", function (e) { if (e.target && e.target.closest && e.target.closest(".rail.byday")) remeasure(); });
  document.addEventListener("click", function (e) { if (e.target && e.target.closest && e.target.closest(".rail.byday .dradd")) remeasure(); }, true);

  function layout() {
    var rail = document.querySelector(".rail");
    if (!rail || typeof cursor === "undefined") return;
    var blocks = blocksFor(cursor) || [];
    if (!blocks.length) return;               /* no schedule: the planner's own empty state stays */
    style();
    var cards = {};
    [].forEach.call(rail.querySelectorAll(":scope > .sub"), function (c) {
      var b = c.querySelector("[data-skip]");
      if (b) cards[b.getAttribute("data-skip")] = c;
    });
    var frag = document.createDocumentFragment(), holder = document.createElement("div");
    dayPlan(blocks).forEach(function (item) {
      if (item.kind === "card") { if (cards[item.id]) { frag.appendChild(cards[item.id]); delete cards[item.id]; } return; }
      holder.innerHTML = rowHTML(item, blocks);
      var row = holder.firstChild;
      wireRow(row);
      frag.appendChild(row);
    });
    Object.keys(cards).forEach(function (id) { frag.appendChild(cards[id]); });   /* anything unexpected keeps a place */
    [].slice.call(rail.childNodes).forEach(function (n) { if (!(n.classList && n.classList.contains("sub"))) rail.removeChild(n); });
    rail.appendChild(frag);
    rail.classList.add("byday");
    gridCells(rail);                                       /* v98 */
    /* the timeline panel it replaces */
    [].forEach.call(document.querySelectorAll(".panel > h2"), function (h) {
      if (/^The day, block by block$/.test(h.textContent.trim())) h.parentNode.parentNode.removeChild(h.parentNode);
    });
  }
  var OWN_TODAY = window.renderToday;
  window.renderToday = function () {
    var r = OWN_TODAY.apply(this, arguments);
    try { layout(); } catch (x) { if (window.console) console.error("planner day layout:", x); }
    return r;
  };

  /* ---------- the copied plan carries the day's block notes ---------- */
  var OWN_COPY = window.copySubPlan;
  window.copySubPlan = function () {
    var notes = draft && draft.blockNotes;
    if (!notes || !Object.keys(notes).length) return OWN_COPY.apply(this, arguments);
    var OWN_BF = window.blocksFor;
    window.blocksFor = function (d) {
      return OWN_BF(d).map(function (b) {
        var n = notes[bkey(b)];
        if (!n) return b;
        var c = Object.assign({}, b);
        c.n = (b.n ? b.n + " \u00b7 " : "") + "Today: " + String(n).replace(/\s*\n\s*/g, " / ");
        return c;
      });
    };
    try { return OWN_COPY.apply(this, arguments); } finally { window.blocksFor = OWN_BF; }
  };

  /* the planner may already have drawn Today before this ran */
  try { if (typeof view !== "undefined" && view === "today" && document.querySelector(".rail")) renderToday(); } catch (x) { }
})();

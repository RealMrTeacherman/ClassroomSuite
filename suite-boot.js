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
    if (rail && typeof cursor !== "undefined") {
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

  var mine = location.pathname.indexOf("planner") >= 0
    ? ["lp:settings:v2", "lp:days:v2", "lp:me:v1", "lp:pending:v1"]
    : ["running-records-v1"];

  window.SuiteSync.onChanged(function (changed) {
    if (!changed.some(function (k) { return mine.indexOf(k) >= 0; })) return;
    banner("Newer data arrived from another machine.", "Reload", function () { location.reload(); });
  });

  window.SuiteSync.init();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("../sw.js").catch(function () { });
  }
})();

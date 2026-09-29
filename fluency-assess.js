/* ============================================================
   fluency-assess.js (v90)
   Injected into the running-records tool, which is the teacher's own file.
   Like every other addition to it, this comes off by deleting its one
   <script> tag. The tool's code lives in a closure, so nothing here reads
   or sets its variables: it works from the page and from saved data.

   Two things on the Assess tab:

   1. PAUSE. A Pause button beside Start (always there, greyed out until
      the timer runs, so the sticky bar never changes height mid-read).
      The tool times a read as Date.now() minus the moment it started. A
      pause makes Date.now() run behind by the paused time, but ONLY inside
      the tool's own tick and during a Stop timer click: the tick is caught
      when the tool creates it (a setInterval made during a click on
      Start), and the Stop timer click is marked on its way down. Every
      other caller on the page, sync included, gets the real clock.
      While paused the clock holds, word taps still work, and Stop timer
      counts reading time only. How long the check was paused is saved
      with it, because the H&T norms assume one unbroken minute.

      What this relies on in the tool (test-orf-notes.js fails if any of
      it changes): the tick is a setInterval made inside the Start click;
      elapsed time comes from Date.now(); Stop timer is #btnFinished and is
      enabled exactly while a read is running.

   2. WHAT THEY SAID. A word marked as a miss or a self-correction gets a
      small tag above it. Tap the tag to type what the student said, or
      mark that the teacher told the word; the tag then shows it, the way
      a paper running record is written above the word. The tags sit in a
      layer beside the passage, not in it, so tapping one never changes a
      mark. Notes are kept per pass and per word, and filed under the
      check's id in suite:orfnotes:v1 once the tool has saved it (the same
      way comprehension is filed, fluency-extras.js).
   ============================================================ */
(function () {
  "use strict";
  if (window.FluencyAssess) return;
  if (window.storage) return;             /* running inside a host that stores elsewhere */

  var RR = "running-records-v1";
  var NOTES_KEY = "suite:orfnotes:v1";
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); };
  function readJSON(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function normNotes(c) {
    return window.SuiteOrf && window.SuiteOrf.notes ? window.SuiteOrf.notes.norm(c)
      : (c && c.records && typeof c.records === "object" ? c : { records: {} });
  }

  /* ---------- 1. the clock ---------- */
  var realNow = Date.now.bind(Date);
  var tickDepth = 0, inStop = false, arming = false;
  var pausedAt = null;                    /* real time this pause began */
  var pausedMs = 0;                       /* earlier pauses in this read */
  var lastPausedMs = 0;                   /* the finished read's total, until saved or a new read */
  function offset() { return pausedMs + (pausedAt != null ? realNow() - pausedAt : 0); }
  function scoped() { return tickDepth > 0 || inStop; }
  Date.now = function () { var t = realNow(); return scoped() ? t - offset() : t; };

  var nativeSetInterval = window.setInterval;
  window.setInterval = function (fn, ms) {
    var args = Array.prototype.slice.call(arguments);
    if (arming && typeof fn === "function") {
      args[0] = function () {
        tickDepth++;
        try { return fn.apply(this, arguments); } finally { tickDepth--; }
      };
    }
    return nativeSetInterval.apply(window, args);
  };

  function running() { var f = $("#btnFinished"); return !!(f && !f.disabled); }
  function paused() { return pausedAt != null; }

  function setPaused(on) {
    if (!running()) on = false;
    if (on && pausedAt == null) pausedAt = realNow();
    if (!on && pausedAt != null) { pausedMs += realNow() - pausedAt; pausedAt = null; }
    drawPause();
  }
  function drawPause() {
    var b = $("#btnPause"), bar = $(".timerbar");
    if (!b) return;
    var on = paused(), run = running();
    b.disabled = !run;
    b.textContent = on ? "Resume" : "Pause";
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.title = on ? "Start the clock again" : "Hold the clock (an interruption); marks still work";
    if (bar) bar.classList.toggle("fa-paused", on);
    var live = $("#faLive");
    if (live) live.textContent = on ? "Timer paused" : "";
  }
  /* the read ended (time, Stop timer, Clear, a new passage): keep its total */
  var wasRunning = false;
  function phaseChanged() {
    var run = running();
    if (wasRunning && !run) {
      lastPausedMs = offset();
      pausedAt = null; pausedMs = 0;
    }
    wasRunning = run;
    drawPause();
  }

  /* ---------- 2. what they said ---------- */
  var notes = {};                          /* "pass:i" -> { said, told } */
  var marks = [];                          /* per pass: { i: "e" | "s" } */
  var lastStop = null;                     /* the last pass's last word read */
  var openAt = null;                       /* { p, i } of the open box */
  var layer = null, box = null;

  function passCount() { var n = parseInt((($("#tPass") || {}).textContent) || "1", 10); return n > 0 ? n : 1; }
  /* which pass's marks are on the passage now: the tool paints the pass
     being read while the timer runs and while it waits for the last word,
     and after that the one picked under "Editing marks on" */
  function shownPass() {
    var n = passCount(), cue = $("#cue");
    if (running() || (cue && cue.classList.contains("act"))) return n - 1;
    var on = document.querySelector("#results [data-lap].on");
    return on ? +on.getAttribute("data-lap") : n - 1;
  }
  function wordEls() { return Array.prototype.slice.call(document.querySelectorAll("#passage .w")); }
  function wordAt(i) { return document.querySelector("#passage .w[data-i=\"" + i + "\"]"); }

  function snapshot() {
    var n = passCount();
    if (marks.length > n) marks.length = n;
    Object.keys(notes).forEach(function (k) { if (+k.split(":")[0] >= n) delete notes[k]; });
    var p = shownPass(), m = {}, stop = null;
    wordEls().forEach(function (sp) {
      var i = +sp.getAttribute("data-i");
      if (sp.classList.contains("e")) m[i] = "e";
      else if (sp.classList.contains("s")) m[i] = "s";
      if (sp.classList.contains("stopw")) stop = i;
    });
    marks[p] = m;
    if (p === n - 1) lastStop = stop;
    if (openAt && (openAt.p !== p || !m[openAt.i])) closeBox();
    drawTags();
  }

  function ensureLayer() {
    var pass = $("#passage");
    if (!pass) return null;
    var host = pass.parentNode;
    if (layer && layer.parentNode === host) return layer;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    layer = document.createElement("div");
    layer.className = "fa-layer";
    host.insertBefore(layer, pass.nextSibling);
    layer.addEventListener("click", onLayerClick);
    return layer;
  }
  function place(sp, host) {
    var r = sp.getBoundingClientRect(), h = host.getBoundingClientRect();
    return { x: r.left - h.left + r.width / 2, top: r.top - h.top, bottom: r.bottom - h.top, left: r.left - h.left };
  }
  function tagLabel(k, kind) {
    var nt = notes[k] || {}, said = (nt.said || "").trim();
    if (said && kind === "e" && nt.told) return esc(said) + " \u00b7 T";
    if (said) return esc(said);
    if (kind === "e" && nt.told) return "T";
    return "\u270e";
  }
  function drawTags() {
    var L = ensureLayer();
    if (!L) return;
    var host = L.parentNode, p = shownPass(), m = marks[p] || {};
    var h = "";
    Object.keys(m).forEach(function (i) {
      var sp = wordAt(i); if (!sp) return;
      var k = p + ":" + i, kind = m[i], nt = notes[k] || {}, at = place(sp, host);
      var filled = !!((nt.said || "").trim() || (kind === "e" && nt.told));
      h += "<button type=\"button\" class=\"fa-tag fa-" + kind + (filled ? "" : " fa-empty") + (openAt && openAt.p === p && String(openAt.i) === i ? " fa-on" : "") +
        "\" data-fa=\"" + k + "\" style=\"left:" + at.x.toFixed(1) + "px;top:" + (at.top - 7).toFixed(1) + "px\" aria-label=\"" +
        esc((filled ? "Change what they said for " : "Add what they said for ") + sp.textContent) + "\">" + tagLabel(k, kind) + "</button>";
    });
    L.innerHTML = h;
    if (box) L.appendChild(box);
    if (openAt) placeBox();
  }

  function onLayerClick(e) {
    var t = e.target.closest("[data-fa]");
    if (!t) return;
    var k = t.getAttribute("data-fa").split(":");
    if (openAt && openAt.p === +k[0] && openAt.i === +k[1]) { closeBox(); return; }
    openBox(+k[0], +k[1]);
  }
  function openBox(p, i) {
    var kind = (marks[p] || {})[i];
    if (!kind) return;
    var k = p + ":" + i, nt = notes[k] || (notes[k] = { said: "", told: false });
    var sp = wordAt(i), word = sp ? sp.textContent : "";
    openAt = { p: p, i: i };
    box = document.createElement("div");
    box.className = "fa-box";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "What they said for " + word);
    box.innerHTML =
      "<label class=\"fa-lab\">What they said for <b>" + esc(word) + "</b>" +
      "<input type=\"text\" id=\"faSaid\" autocomplete=\"off\" autocapitalize=\"off\" autocorrect=\"off\" spellcheck=\"false\" enterkeyhint=\"done\" value=\"" + esc(nt.said || "") + "\"></label>" +
      "<div class=\"fa-row\">" +
      (kind === "e"
        ? "<button type=\"button\" class=\"fa-told\" aria-pressed=\"" + (nt.told ? "true" : "false") + "\">Teacher told</button>"
        : "<span class=\"fa-sc\">Self-corrected</span>") +
      "<button type=\"button\" class=\"fa-done\">Done</button></div>";
    var inp = box.querySelector("input");
    inp.addEventListener("input", function () { nt.said = inp.value; refreshTag(k); });
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); closeBox(); }
    });
    box.addEventListener("click", function (e) {
      if (e.target.closest(".fa-told")) {
        nt.told = !nt.told;
        e.target.closest(".fa-told").setAttribute("aria-pressed", nt.told ? "true" : "false");
        refreshTag(k);
      } else if (e.target.closest(".fa-done")) closeBox();
    });
    drawTags();
    try { inp.focus({ preventScroll: true }); } catch (err) { inp.focus(); }
  }
  function placeBox() {
    if (!box || !openAt || !layer) return;
    var sp = wordAt(openAt.i); if (!sp) return;
    var host = layer.parentNode, at = place(sp, host);
    var w = Math.min(280, Math.max(200, host.clientWidth - 16));
    var left = Math.max(8, Math.min(at.left, host.clientWidth - w - 8));
    box.style.width = w + "px";
    box.style.left = left + "px";
    box.style.top = (at.bottom + 4) + "px";
  }
  function refreshTag(k) {
    var t = layer && layer.querySelector("[data-fa=\"" + k + "\"]");
    if (!t) return;
    var kind = (marks[+k.split(":")[0]] || {})[+k.split(":")[1]];
    var nt = notes[k] || {};
    t.innerHTML = tagLabel(k, kind);
    t.classList.toggle("fa-empty", !((nt.said || "").trim() || (kind === "e" && nt.told)));
  }
  function closeBox() {
    if (box && box.parentNode) box.parentNode.removeChild(box);
    box = null;
    if (openAt) { openAt = null; drawTags(); }
  }
  function clearNotes() {
    closeBox();
    notes = {}; marks = []; lastStop = null;
  }

  /* the notes for the check being saved, in the order the tool lists its
     missed and self-corrected words (pass by pass, word by word), with each
     one's place in that list */
  function collect() {
    var out = [], n = passCount(), ne = 0, ns = 0;
    for (var p = 0; p < n; p++) {
      var m = marks[p] || {};
      Object.keys(m).map(Number).sort(function (a, b) { return a - b; }).forEach(function (i) {
        if (p === n - 1 && lastStop != null && i > lastStop) return;
        var kind = m[i], idx = kind === "e" ? ne++ : ns++;
        var nt = notes[p + ":" + i];
        if (!nt) return;
        var said = String(nt.said || "").trim().slice(0, 60), told = kind === "e" && !!nt.told;
        if (!said && !told) return;
        var sp = wordAt(i);
        var x = { w: sp ? sp.textContent : "", kind: kind, n: idx };
        if (said) x.said = said;
        if (told) x.told = true;
        out.push(x);
      });
    }
    return out;
  }

  /* Taken as Save is pressed, before the tool's own handler clears the
     passage; kept only if the tool did save (its results card is gone
     afterwards). If it refused ("Pick a student first") the notes stay. */
  var pending = null, candidate = null;
  function onSaveClick(btn) {
    var sel = $("#selStudent");
    var db = readJSON(RR), had = {};
    ((db && db.records) || []).forEach(function (r) { had[r.id] = 1; });
    candidate = { btn: btn, sid: sel ? sel.value : "", notes: collect(), paused: Math.round(lastPausedMs / 1000), had: had };
  }
  function afterSaveClick() {
    var c = candidate; candidate = null;
    if (!c || document.contains(c.btn)) return;
    clearNotes();
    lastPausedMs = 0;
    if (!c.notes.length && !(c.paused >= 1)) return;
    pending = c;
    setTimeout(fileNotes, 400);
  }
  function fileNotes() {
    var p = pending; pending = null;
    if (!p || !p.sid) return;
    var db = readJSON(RR); if (!db || !Array.isArray(db.records)) return;
    var c = normNotes(readJSON(NOTES_KEY));
    var fresh = db.records.filter(function (r) {
      return r && r.studentId === p.sid && !p.had[r.id] && !(r.id in c.records);
    }).sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    if (!fresh.length) return;              /* the save did not go through */
    var e = {};
    if (p.notes.length) e.notes = p.notes;
    if (p.paused >= 1) e.paused = p.paused;
    c.records[fresh[0].id] = e;
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(c)); decorateRecords(); }
    catch (err) { var t = $("#toast"); if (t) { t.textContent = "Couldn't save what they said on this device."; t.classList.add("on"); } }
  }

  /* ---------- the tool's list of saved checks ----------
     Under any check with notes or a pause, one line: what they said. The
     list is the Saved checks card on Assess in the suite, and Reports in
     the ORF app on its own. */
  function decorateRecords() {
    var list = $("#recordList");
    if (!list) return;
    var c = normNotes(readJSON(NOTES_KEY)), N = window.SuiteOrf && window.SuiteOrf.notes;
    Array.prototype.forEach.call(list.querySelectorAll("tr.fa-said"), function (r) { r.parentNode.removeChild(r); });
    Array.prototype.forEach.call(list.querySelectorAll("[data-del-rec]"), function (b) {
      var e = c.records[b.getAttribute("data-del-rec")];
      if (!e || (!(e.notes && e.notes.length) && !e.paused)) return;
      var tr = b.closest("tr"); if (!tr) return;
      var bits = [];
      if (e.notes && e.notes.length) bits.push("What they said: " + e.notes.map(function (x) { return esc(N ? N.text(x) : x.w); }).join(" \u00b7 "));
      if (e.paused) bits.push("Timer paused " + (N ? N.paused(e.paused) : e.paused + "s"));
      var row = document.createElement("tr");
      row.className = "fa-said";
      row.innerHTML = "<td colspan=\"" + tr.children.length + "\" style=\"border-top:0;padding-top:0;font-size:13px;color:var(--ink-2)\">" + bits.join(" \u00b7 ") + "</td>";
      tr.parentNode.insertBefore(row, tr.nextSibling);
    });
  }

  /* ---------- wiring ---------- */
  function within(e, sel) { var t = e.target; return !!(t && t.closest && t.closest(sel)); }
  window.addEventListener("click", function (e) {
    if (within(e, "#btnStart")) {
      /* a new read: its pauses, notes and tick start fresh */
      pausedAt = null; pausedMs = 0; lastPausedMs = 0;
      clearNotes();
      arming = true;
    }
    if (within(e, "#btnFinished")) inStop = true;
    if (within(e, "#btnReset")) clearNotes();
    if (within(e, "#btnSaveRec")) onSaveClick(e.target.closest("#btnSaveRec"));
    setTimeout(function () { arming = false; inStop = false; }, 0);
  }, true);
  window.addEventListener("click", function () { arming = false; inStop = false; afterSaveClick(); }, false);
  window.addEventListener("change", function (e) { if (within(e, "#selPassage")) clearNotes(); }, true);
  document.addEventListener("pointerdown", function (e) {
    if (!box) return;
    if (within(e, ".fa-box") || within(e, ".fa-tag")) return;
    closeBox();
  }, true);

  var CSS =
    "#btnPause{min-width:6.6em}" +
    ".timerbar .clock{position:relative}" +
    ".timerbar.fa-paused .clock{color:var(--warn);animation:faPulse 1.6s ease-in-out infinite}" +
    ".timerbar.fa-paused .clock::after{content:\"Paused\";position:absolute;left:1px;top:-11px;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;line-height:1;color:var(--warn)}" +
    ".timerbar.fa-paused .progress i{background:var(--warn)}" +
    "@keyframes faPulse{50%{opacity:.45}}" +
    "@media (prefers-reduced-motion:reduce){.timerbar.fa-paused .clock{animation:none}}" +
    ".fa-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}" +
    ".fa-layer{position:absolute;left:0;top:0;width:0;height:0;z-index:3}" +
    ".fa-tag{position:absolute;transform:translateX(-50%);box-sizing:border-box;height:20px;min-width:24px;max-width:10em;padding:0 7px;" +
    "border-radius:99px;border:1.5px solid var(--err);background:var(--panel,#fff);color:var(--err);font:600 12px/17px system-ui,-apple-system,sans-serif;" +
    "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.12)}" +
    ".fa-tag.fa-s{border-color:var(--sc);color:var(--sc)}" +
    ".fa-tag.fa-empty{border-style:dashed;font-weight:400}" +
    ".fa-tag.fa-on{outline:2px solid var(--accent);outline-offset:1px}" +
    ".fa-tag:focus-visible{outline:2px solid var(--accent);outline-offset:1px}" +
    "@media (pointer:coarse){.fa-tag{height:24px;line-height:21px;min-width:30px;font-size:13px}}" +
    ".fa-box{position:absolute;z-index:4;box-sizing:border-box;padding:10px;border-radius:10px;border:1px solid var(--line);" +
    "background:var(--panel,#fff);color:var(--ink);box-shadow:0 8px 24px rgba(0,0,0,.18);font-size:13px}" +
    ".fa-lab{display:block;color:var(--ink-2)}" +
    ".fa-lab input{display:block;width:100%;box-sizing:border-box;margin-top:5px;font:inherit;font-size:16px;padding:8px 10px;" +
    "border:1px solid var(--line);border-radius:8px;background:var(--surface,#fff);color:var(--ink)}" +
    ".fa-row{display:flex;gap:8px;align-items:center;margin-top:8px}" +
    ".fa-row button{font:inherit;font-size:14px;padding:8px 12px;border-radius:8px;cursor:pointer;border:1px solid var(--line);background:var(--panel,#fff);color:var(--ink)}" +
    ".fa-row .fa-told[aria-pressed=true]{background:var(--err);border-color:var(--err);color:#fff}" +
    ".fa-row .fa-done{margin-left:auto;background:var(--accent);border-color:var(--accent);color:#fff}" +
    ".fa-sc{color:var(--sc);font-weight:600}";

  function start() {
    var st = document.createElement("style");
    st.id = "faStyle"; st.textContent = CSS;
    document.head.appendChild(st);

    var sb = $("#btnStart");
    if (sb && !$("#btnPause")) {
      var b = document.createElement("button");
      b.className = "btn quiet"; b.id = "btnPause"; b.type = "button";
      b.disabled = true; b.textContent = "Pause";
      b.setAttribute("aria-pressed", "false");
      sb.parentNode.insertBefore(b, sb.nextSibling);
      b.addEventListener("click", function () { setPaused(!paused()); });
      var live = document.createElement("span");
      live.id = "faLive"; live.className = "fa-live"; live.setAttribute("aria-live", "polite");
      b.parentNode.appendChild(live);
    }
    var fin = $("#btnFinished");
    if (fin && window.MutationObserver) new MutationObserver(phaseChanged).observe(fin, { attributes: true, attributeFilter: ["disabled"] });
    var pass = $("#passage");
    if (pass && window.MutationObserver) {
      var q = false;
      new MutationObserver(function () {
        if (q) return; q = true;
        Promise.resolve().then(function () { q = false; snapshot(); });
      }).observe(pass, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
    }
    if (pass && window.ResizeObserver) new ResizeObserver(function () { drawTags(); }).observe(pass);
    window.addEventListener("resize", drawTags);
    var rl = $("#recordList");
    if (rl && window.MutationObserver) new MutationObserver(function (m) {
      if (m.some(function (x) { return Array.prototype.some.call(x.addedNodes, function (n) { return !(n.classList && n.classList.contains("fa-said")); }); })) decorateRecords();
    }).observe(rl, { childList: true, subtree: true });
    decorateRecords();
    phaseChanged(); snapshot();
  }

  window.FluencyAssess = {
    KEY: NOTES_KEY,
    paused: paused,
    pausedSeconds: function () { return Math.round(offset() / 1000); },
    lastPausedSeconds: function () { return Math.round(lastPausedMs / 1000); },
    notes: function () { return JSON.parse(JSON.stringify(notes)); },
    collect: collect,
    decorateRecords: decorateRecords
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

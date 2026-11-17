/* ============================================================
   fluency-todo.js
   Injected into the ORF tool (fluency/index.html) by one <script> tag,
   and comes off by deleting it.

   WHO STILL NEEDS TO READ. Under the Student and Passage pickers on the
   Assess tab: the children who haven't read the chosen passage yet, as
   chips. Tap a chip to pick that child. "Show everyone" opens the whole
   class with when each one read it, and lets a child be marked done by
   hand (read it on paper, or excused) or unmarked. Children who are done
   get a check mark in the Student picker too.

   Done means a saved check on this passage, or a hand mark. A passage
   used again later (next season, a retest) can "Start a new round": from
   then on only checks saved after that moment count, and hand marks are
   cleared.

   The checks are the tool's own (running-records-v1, read from storage,
   never written), so a check saved on any device counts everywhere. The
   hand marks and rounds are kept in suite:orfdone:v1, on this device only
   until the key is added to suite-sync.js's KEYS:
   { passages: { <passage id>: { since: ISO or "",
   marked: { <student id>: true|false } } } }. An unmark is stored as
   false rather than deleted so that it syncs like any other change.
   ============================================================ */
(function () {
  "use strict";
  if (window.FluencyTodo) return;
  if (window.storage) return;             /* running inside a host that stores elsewhere */

  var RR = "running-records-v1";
  var KEY = "suite:orfdone:v1";
  var OPEN_KEY = "suite:orftodo:open";    /* this device only: is the full list open */
  var CHECK = " ✓";

  function $(s) { return document.querySelector(s); }
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); };
  function readJSON(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function toast(msg) {
    var t = $("#toast"); if (!t) return;
    t.textContent = msg; t.classList.add("on");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("on"); }, 2400);
  }

  function readDone() {
    var d = readJSON(KEY);
    if (!d || typeof d !== "object" || !d.passages || typeof d.passages !== "object") d = { passages: {} };
    return d;
  }
  function writeDone(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); return true; }
    catch (e) { toast("Couldn't save that on this device."); return false; }
  }
  function entry(d, pid) {
    var e = d.passages[pid];
    if (!e || typeof e !== "object") e = d.passages[pid] = {};
    if (typeof e.since !== "string") e.since = "";
    if (!e.marked || typeof e.marked !== "object") e.marked = {};
    return e;
  }

  function first(name) {
    name = String(name || "").trim();
    if (name.indexOf(",") >= 0) { var p = name.split(","); return (p[1] || p[0]).trim().split(/\s+/)[0]; }
    return name.split(/\s+/)[0];
  }
  function lastInitial(name) {
    name = String(name || "").trim();
    if (name.indexOf(",") >= 0) return name.charAt(0).toUpperCase();
    var p = name.split(/\s+/); return p.length > 1 ? p[p.length - 1].charAt(0).toUpperCase() : "";
  }
  function shortDate(iso) {
    var d = new Date(iso); if (isNaN(d)) return "";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  /* who has read passage pid: { sid: { rec, hand } } */
  function status(db, pid) {
    var d = readDone(), e = d.passages[pid] || {}, since = e.since || "", marked = e.marked || {};
    var out = {};
    (db.records || []).forEach(function (r) {
      if (r.passageId !== pid || !r.studentId) return;
      if (since && String(r.date || "") < since) return;
      var cur = out[r.studentId];
      if (!cur || String(r.date) > String(cur.rec.date)) out[r.studentId] = { rec: r };
    });
    Object.keys(marked).forEach(function (sid) {
      if (marked[sid] !== true) return;
      if (out[sid]) out[sid].hand = true; else out[sid] = { hand: true };
    });
    return { done: out, since: since };
  }

  var box = null, open = false;
  try { open = localStorage.getItem(OPEN_KEY) === "1"; } catch (e) { }

  function kids(db) { return (db.students || []).filter(function (s) { return !s.demo; }); }

  function render() {
    var sel = $("#selStudent"), pSel = $("#selPassage");
    if (!sel || !pSel || !box) return;
    var db = readJSON(RR) || {};
    var pid = pSel.value;
    var list = kids(db);
    var pass = (db.passages || []).filter(function (p) { return p.id === pid; })[0];
    decorate(db, pid);
    if (!pid || !pass || !list.length) { box.innerHTML = ""; box.hidden = true; return; }
    box.hidden = false;

    var st = status(db, pid), done = st.done;
    var firsts = {};
    list.forEach(function (s) { var f = first(s.name).toLowerCase(); firsts[f] = (firsts[f] || 0) + 1; });
    function label(s) { var f = first(s.name); return firsts[f.toLowerCase()] > 1 ? f + " " + lastInitial(s.name) + "." : f; }

    var left = list.filter(function (s) { return !done[s.id]; });
    var cur = sel.value;
    var head = left.length
      ? "<b>Still to read this passage</b><span class=\"todo-n\">" + left.length + " of " + list.length + " left</span>"
      : "<b>Everyone has read this passage</b><span class=\"todo-n\">" + list.length + " of " + list.length + "</span>";
    var chips = left.map(function (s) {
      return "<button type=\"button\" class=\"chip tap todo-chip" + (s.id === cur ? " on" : "") + "\" data-todo-pick=\"" + esc(s.id) + "\">" + esc(label(s)) + "</button>";
    }).join("");

    var rows = list.map(function (s) {
      var x = done[s.id], what, btn;
      if (x && x.rec) {
        what = "<span class=\"todo-ok\">✓</span> Read " + esc(shortDate(x.rec.date)) + (x.rec.wcpm != null ? " · " + esc(x.rec.wcpm) + " WCPM" : "");
        btn = "";
      } else if (x && x.hand) {
        what = "<span class=\"todo-ok\">✓</span> Marked done";
        btn = "<button type=\"button\" class=\"btn quiet small\" data-todo-mark=\"" + esc(s.id) + "\" data-v=\"0\">Unmark</button>";
      } else {
        what = "<span class=\"todo-not\">Not yet</span>";
        btn = "<button type=\"button\" class=\"btn quiet small\" data-todo-mark=\"" + esc(s.id) + "\" data-v=\"1\">Mark done</button>";
      }
      return "<tr><td><button type=\"button\" class=\"who\" data-todo-pick=\"" + esc(s.id) + "\">" + esc(s.name) + "</button></td><td>" + what + "</td><td class=\"num\">" + btn + "</td></tr>";
    }).join("");
    var round = st.since
      ? "<p class=\"hint\">Counting checks saved since " + esc(shortDate(st.since)) + ". <button type=\"button\" class=\"todo-link\" data-todo-round=\"all\">Count every check on this passage</button></p>"
      : "";

    box.innerHTML =
      "<div class=\"todo-head\">" + head +
        "<button type=\"button\" class=\"todo-link\" data-todo-open aria-expanded=\"" + open + "\">" + (open ? "Hide list" : "Show everyone") + "</button></div>" +
      (chips ? "<div class=\"todo-chips\">" + chips + "</div>" : "") +
      "<div class=\"todo-all\"" + (open ? "" : " hidden") + ">" +
        "<div class=\"scroll\"><table>" + rows + "</table></div>" + round +
        "<div class=\"row\" style=\"margin-top:10px\"><button type=\"button\" class=\"btn quiet small\" data-todo-round=\"new\" style=\"flex:0 0 auto\">Start a new round on this passage</button></div>" +
        "<p class=\"hint\">A new round is for reading the same passage again later: checks saved before it stop counting, and hand marks are cleared.</p>" +
      "</div>";
  }

  /* a check mark after each child in the Student picker who has read it */
  function decorate(db, pid) {
    var sel = $("#selStudent"); if (!sel) return;
    var done = pid ? status(db, pid).done : {};
    Array.prototype.forEach.call(sel.options, function (o) {
      var t = o.textContent, has = t.slice(-CHECK.length) === CHECK;
      var want = !!(o.value && done[o.value]);
      if (want && !has) o.textContent = t + CHECK;
      else if (!want && has) o.textContent = t.slice(0, -CHECK.length);
    });
  }

  var t = null;
  function later(ms) { clearTimeout(t); t = setTimeout(render, ms == null ? 30 : ms); }

  function boot() {
    var anchor = $("#assessHint");
    if (!anchor || box) return;
    box = document.createElement("div");
    box.id = "orfTodo";
    box.hidden = true;
    anchor.parentNode.insertBefore(box, anchor.nextSibling);

    var css = document.createElement("style");
    css.textContent =
      "#orfTodo{margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}" +
      "#orfTodo[hidden]{display:none}" +
      "#orfTodo .todo-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;font-size:14px}" +
      "#orfTodo .todo-n{color:var(--muted);font-size:13px}" +
      "#orfTodo .todo-link{margin-left:auto;font:inherit;font-size:13px;background:none;border:0;padding:4px 0;color:var(--accent);cursor:pointer;text-decoration:underline}" +
      "#orfTodo .hint .todo-link{margin-left:4px;padding:0}" +
      "#orfTodo .todo-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}" +
      "#orfTodo .todo-chip{font:inherit;font-size:14px;padding:6px 12px;border-radius:99px;border:1px solid var(--line);background:var(--panel);color:var(--ink)}" +
      "#orfTodo .todo-chip.on{background:var(--accent);color:#fff;border-color:var(--accent)}" +
      "#orfTodo .todo-all{margin-top:10px}" +
      "#orfTodo .todo-all[hidden]{display:none}" +
      "#orfTodo .scroll{max-height:320px;overflow:auto}" +
      "#orfTodo table{width:100%;border-collapse:collapse;font-size:14px}" +
      "#orfTodo td{padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:middle}" +
      "#orfTodo .todo-ok{color:var(--accent);font-weight:700}" +
      "#orfTodo .todo-not{color:var(--muted)}" +
      "#orfTodo .who{font:inherit;background:none;border:0;padding:0;color:var(--ink);cursor:pointer;text-align:left}";
    document.head.appendChild(css);

    box.addEventListener("click", function (e) {
      var pick = e.target.closest("[data-todo-pick]");
      if (pick) {
        var sel = $("#selStudent");
        if (sel && Array.prototype.some.call(sel.options, function (o) { return o.value === pick.dataset.todoPick; })) {
          sel.value = pick.dataset.todoPick;
          sel.dispatchEvent(new Event("change", { bubbles: true }));
          render();
          sel.focus();
        }
        return;
      }
      if (e.target.closest("[data-todo-open]")) {
        open = !open;
        try { localStorage.setItem(OPEN_KEY, open ? "1" : "0"); } catch (x) { }
        render(); return;
      }
      var pid = $("#selPassage") && $("#selPassage").value;
      if (!pid) return;
      var mk = e.target.closest("[data-todo-mark]");
      if (mk) {
        var d = readDone();
        entry(d, pid).marked[mk.dataset.todoMark] = mk.dataset.v === "1";
        if (writeDone(d)) render();
        return;
      }
      var rd = e.target.closest("[data-todo-round]");
      if (rd) {
        var d2 = readDone(), en = entry(d2, pid);
        if (rd.dataset.todoRound === "new") {
          if (!confirm("Start a new round on this passage? Everyone goes back on the still-to-read list. Saved checks are kept.")) return;
          en.since = new Date().toISOString(); en.marked = {};
          if (writeDone(d2)) { render(); toast("New round started. Everyone is back on the list."); }
        } else {
          en.since = "";
          if (writeDone(d2)) render();
        }
      }
    });

    var sel = $("#selStudent"), pSel = $("#selPassage");
    /* the tool rebuilds the pickers' options (renderSelectors), and redraws
       Saved checks on every save, delete, move and arrival from another
       device. Its save lands in storage 120ms after, so wait past that. */
    if (window.MutationObserver) {
      new MutationObserver(function () { later(); }).observe(sel, { childList: true });
      var rl = $("#recordList");
      if (rl) new MutationObserver(function () { later(250); }).observe(rl, { childList: true, subtree: true });
    }
    sel.addEventListener("change", function () { later(0); });
    pSel.addEventListener("change", function () { later(0); });
    window.addEventListener("storage", function (e) { if (e.key === KEY || e.key === RR) later(250); });
    if (window.SuiteSync && window.SuiteSync.onChanged) {
      window.SuiteSync.onChanged(function (changed) {
        if (changed && (changed.indexOf(KEY) >= 0 || changed.indexOf(RR) >= 0)) later(250);
      });
    }
    later(300);
  }

  window.FluencyTodo = { render: render, status: function (pid) { return status(readJSON(RR) || {}, pid); } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

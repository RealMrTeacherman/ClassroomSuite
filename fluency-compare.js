/* ============================================================
   fluency-compare.js (v137)
   The Assess tab's results box, once the last word is marked: this read
   beside the student's last saved check, and a bar from where they started
   the year to their next goal, with today's point on the aim line marked.

   Nothing here is worked out separately. The read is added, unsaved, to a
   copy of the records and SuiteOrf.goals.planFor() is asked about it, then
   SuiteOrf.goals.cardStatus() names it. Those are the same two calls the
   gradebook's ORF scorecard makes, so what this shows before Save is what
   the scorecard shows after it.

   Reads only: running-records-v1 (passed in by the tool), suite:orfgoals:v1,
   suite:orfcomp:v1 and the suite calendar in gb2_standards_v1. Writes
   nothing, so it adds no storage key. Its tag sits just before
   suite-orf.js's: it calls SuiteOrf only when a read is finished, and the
   tail of the page (suite-orf, fluency-extras, fluency-assess) is guarded.
   ============================================================ */
(function () {
  "use strict";
  if (window.FluencyCompare) return;

  var DRAFT_ID = "__fc_draft__";
  var DAY = 864e5;
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); };
  function readJSON(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }

  /* the goals settings the scorecard uses: How goals are set, with the
     goal dates and season lines from the suite calendar */
  function goalsState() {
    var G = window.SuiteOrf.goals;
    var raw = readJSON("suite:orfgoals:v1");
    var gb = readJSON("gb2_standards_v1");
    var cal = window.SuiteOrf.calendar(gb && gb.settings, raw);
    var gs = G.normGoals(raw);
    gs.winterDue = cal.winterDue; gs.springDue = cal.springDue; gs.seasons = cal.seasons;
    return gs;
  }

  function lastSaved(db, sid, before) {
    var best = null;
    ((db && db.records) || []).forEach(function (r) {
      if (r.studentId !== sid || r.id === DRAFT_ID) return;
      var t = new Date(r.date).getTime();
      if (!(t <= before)) return;
      if (!best || t > best.t) best = { t: t, rec: r };
    });
    return best;
  }

  function fmtDay(t) {
    var G = window.SuiteOrf && window.SuiteOrf.goals;
    var d = new Date(t);
    return G ? G.fmtShort(d) : d.toLocaleDateString();
  }
  function ago(t, now) {
    var a = new Date(t), b = new Date(now);
    var days = Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()) - new Date(a.getFullYear(), a.getMonth(), a.getDate())) / DAY);
    return days <= 0 ? "earlier today" : days === 1 ? "yesterday" : days + " days ago";
  }
  function signed(n, unit) {
    if (!n) return "same" + (unit ? "" : "");
    return (n > 0 ? "+" : "\u2212") + Math.abs(n) + (unit || "");
  }

  /* draft: { wcpm, accuracy, errors, passageId, passageTitle, passageWords } */
  function plan(db, sid, draft, now) {
    if (!window.SuiteOrf || !window.SuiteOrf.goals) return null;
    var G = window.SuiteOrf.goals;
    var copy = { settings: db.settings, students: db.students, passages: db.passages,
      records: (db.records || []).concat([{ id: DRAFT_ID, studentId: sid, date: new Date(now).toISOString(),
        wcpm: draft.wcpm, accuracy: draft.accuracy, errors: draft.errors, passageId: draft.passageId }]) };
    try {
      var pl = G.planFor(copy, sid, goalsState(), new Date(now), G.normComp(readJSON("suite:orfcomp:v1")));
      return pl ? { pl: pl, st: G.cardStatus(pl) } : null;
    } catch (e) { return null; }
  }

  /* v138: a student's plan as saved, no draft (the move box's warnings) */
  function planOf(db, sid, now) {
    if (!window.SuiteOrf || !window.SuiteOrf.goals || !db) return null;
    var G = window.SuiteOrf.goals;
    try { return G.planFor(db, sid, goalsState(), new Date(now == null ? Date.now() : +now), G.normComp(readJSON("suite:orfcomp:v1"))); }
    catch (e) { return null; }
  }

  /* the next goal along the year: the mid-year one until its date has
     passed, then the end-of-year one */
  function nextGoal(pl, now) {
    if (pl.winterGoal != null && pl.winterDue && now <= pl.winterDue.getTime() + DAY)
      return { v: pl.winterGoal, label: "winter goal", by: pl.winterDue };
    return { v: pl.goal, label: "spring goal", by: pl.goalDate };
  }

  function goalBar(pl, st, wcpm, now) {
    var G = window.SuiteOrf.goals;
    var ng = nextGoal(pl, now);
    var aimNow = Math.round(pl.aim(now));
    /* the bar starts at the year's first check; a read below that starts
       it a little lower and marks where the start was */
    var lo = Math.min(pl.base, wcpm, aimNow), hi = Math.max(ng.v, wcpm, aimNow);
    var pad = Math.max(2, Math.round((hi - lo) * 0.04));
    var under = lo < pl.base;
    lo = under ? Math.max(0, lo - pad) : pl.base; hi = hi + pad;
    var pos = function (v) { return Math.max(0, Math.min(100, ((v - lo) / Math.max(1, hi - lo)) * 100)); };
    var aimP = pos(aimNow), nowP = pos(wcpm);
    var aimAlign = aimP < 12 ? "left:0" : aimP > 88 ? "right:0" : "left:" + aimP.toFixed(1) + "%;transform:translateX(-50%)";
    var mo = pl.thisMonth, monthLine = "";
    if (mo && mo.checkpoint !== "winter") {
      var left = mo.target - wcpm;
      monthLine = esc(mo.label) + " goal " + mo.target + " by " + esc(G.fmtShort(mo.by)) + " \u2014 " +
        (left <= 0 ? '<b class="fc-up">met</b>' : left + " to go");
    }
    var toGoal = ng.v - wcpm;
    return '<div class="fc-goal">' +
      '<div class="fc-track" role="img" aria-label="' + esc("Started at " + pl.base + ", now " + wcpm + ", aim line today " + aimNow + ", " + ng.label + " " + ng.v) + '">' +
        '<span class="fc-aimlab" style="' + aimAlign + '">aim today ' + aimNow + '</span>' +
        '<i class="fc-fill fc-' + st.kind + '" style="width:' + nowP.toFixed(1) + '%"></i>' +
        (under ? '<i class="fc-base" style="left:' + pos(pl.base).toFixed(1) + '%"></i>' : '') +
        '<i class="fc-aim" style="left:' + aimP.toFixed(1) + '%"></i>' +
      '</div>' +
      '<div class="fc-ends"><span>start ' + pl.base + '</span><span>' + esc(ng.label) + ' ' + ng.v +
        (ng.by ? ' by ' + esc(G.fmtShort(ng.by)) : '') + (toGoal > 0 ? ' \u00b7 ' + toGoal + ' to go' : ' \u00b7 <b class="fc-up">reached</b>') + '</span></div>' +
      '<div class="fc-foot"><span>' + monthLine + '</span>' +
        '<span class="fc-pill fc-' + st.kind + '">' + st.sym + ' ' + esc(st.label) + esc(st.gap) + '</span></div>' +
    '</div>';
  }

  function card(title, wcpm, delta, acc, accDelta, errors, cls) {
    return '<div class="fc-card' + (cls ? " " + cls : "") + '">' +
      '<div class="fc-t">' + title + '</div>' +
      '<div class="fc-n">' + wcpm + (delta != null ? ' <span class="' + (delta > 0 ? "fc-up" : delta < 0 ? "fc-down" : "fc-same") + '">' + esc(signed(delta)) + '</span>' : "") + '</div>' +
      '<div class="fc-s">WCPM \u00b7 ' + acc.toFixed(1) + '%' + (accDelta != null && Math.abs(accDelta) >= 0.05 ? ' (' + esc(signed(+accDelta.toFixed(1), "%")) + ')' : "") +
        ' \u00b7 ' + errors + ' error' + (errors === 1 ? "" : "s") + '</div>' +
    '</div>';
  }

  /* the box's HTML; "" when there is nothing to say */
  function html(db, sid, draft, now) {
    now = now == null ? Date.now() : +now;
    if (!db || !draft) return "";
    if (!sid) return '<p class="hint fc-wrap">Pick a student to see this read beside their last check and their goals.</p>';
    var last = lastSaved(db, sid, now);
    var p = plan(db, sid, draft, now);
    var h = '<div class="fc-wrap" role="group" aria-label="Compared with the last check and goals">';
    if (last) {
      var L = last.rec, la = +L.accuracy || 0, le = +L.errors || 0, lw = Math.round(+L.wcpm || 0);
      h += '<div class="fc-pair">' +
        card('Last check \u00b7 <span class="fc-nw">' + esc(fmtDay(last.t)) + '</span> <span class="fc-ago fc-nw">(' + esc(ago(last.t, now)) + ')</span>', lw, null, la, null, le, "") +
        card("This check \u00b7 today", draft.wcpm, draft.wcpm - lw, +draft.accuracy || 0, (+draft.accuracy || 0) - la, draft.errors, "fc-now") +
      '</div>';
      if (L.passageId && draft.passageId && L.passageId !== draft.passageId)
        h += '<p class="hint fc-note">Last time was a different passage' + (L.passageTitle ? " (" + esc(L.passageTitle) + ")" : "") +
          ', so a few words either way can be the passage rather than the reader.</p>';
    }
    if (p && p.st.kind === "start") {
      h += '<p class="hint fc-note"><span class="fc-pill fc-start">' + p.st.sym + ' First check of the year</span> Their goals will be set from this read once it is saved.</p>';
    } else if (p) {
      h += goalBar(p.pl, p.st, draft.wcpm, now);
    } else if (!last) {
      h += '<p class="hint fc-note">No earlier check for this student yet.</p>';
    }
    return h + '</div>';
  }

  var CSS = '' +
    '.fc-wrap{margin:4px 0 12px}' +
    '.fc-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;margin-bottom:10px}' +
    '.fc-card{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:10px 12px;min-width:0}' +
    '.fc-card.fc-now{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}' +
    '.fc-t{font-size:12.5px;color:var(--ink-2)}' +
    '.fc-ago{color:var(--muted)}.fc-nw{white-space:nowrap}' +
    '.fc-n{font-size:24px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.02em;line-height:1.25}' +
    '.fc-n span{font-size:14px;font-weight:600}' +
    '.fc-s{font-size:12.5px;color:var(--ink-2)}' +
    '.fc-up{color:var(--accent)}.fc-down{color:var(--err)}.fc-same{color:var(--muted)}' +
    '.fc-note{margin:0 0 10px}' +
    '.fc-goal{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:10px 12px}' +
    '.fc-track{position:relative;height:10px;background:var(--surface);border-radius:99px;margin:22px 0 4px}' +
    '.fc-fill{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:var(--accent)}' +
    '.fc-fill.fc-exceeding{background:var(--sc)}.fc-fill.fc-attention{background:var(--err)}' +
    '.fc-aim{position:absolute;top:-5px;width:2px;height:20px;margin-left:-1px;background:var(--ink)}' +
    '.fc-base{position:absolute;top:-2px;width:2px;height:14px;margin-left:-1px;background:var(--muted)}' +
    '.fc-aimlab{position:absolute;top:-21px;font-size:11.5px;color:var(--ink-2);white-space:nowrap}' +
    '.fc-ends{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--muted);margin-bottom:8px}' +
    '.fc-foot{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px 10px;font-size:13.5px}' +
    '.fc-pill{display:inline-block;font-size:12.5px;padding:2px 10px;border-radius:99px;border:1px solid;white-space:nowrap}' +
    '.fc-pill.fc-on{color:var(--accent);background:var(--accent-soft);border-color:var(--accent)}' +
    '.fc-pill.fc-exceeding{color:var(--sc);background:var(--sc-soft);border-color:var(--sc)}' +
    '.fc-pill.fc-attention{color:var(--err);background:var(--err-soft);border-color:var(--err)}' +
    '.fc-pill.fc-start{color:var(--ink-2);background:var(--surface);border-color:var(--line);margin-right:6px}' +
    '@media (max-width:420px){.fc-n{font-size:21px}.fc-ends{flex-direction:column;gap:0}.fc-ends span:last-child{text-align:right}}' +
    '@media print{.fc-wrap{display:none}}';
  function injectCSS() {
    if (document.getElementById("fc-css")) return;
    var st = document.createElement("style"); st.id = "fc-css"; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", injectCSS); else injectCSS();

  window.FluencyCompare = Object.freeze({ html: html, plan: plan, planOf: planOf, lastSaved: lastSaved, DRAFT_ID: DRAFT_ID });
})();

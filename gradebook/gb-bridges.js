/* gradebook/gb-bridges.js — The backup card, and the bridge to the lesson planner.
   One of the gradebook's scripts, loaded in order by index.html as classic
   scripts sharing one global scope; see HANDOFF "The gradebook's files". */
/* ============================================================
   BACKUP  (Setup's card over suite-sync.js, which every tool shares)
   ============================================================ */
/* the file changed under us: pick our own key back up and repaint */
function reloadFromStorage() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return;
    S = hydrate(JSON.parse(raw));
    if (window.SuiteSync && window.SuiteSync.adopted) window.SuiteSync.adopted(KEY);
    if (S.settings.subject) UI.subject = S.settings.subject;
    paintSubjSwitch();
    syncIreadyScores();
  } catch (e) { }
}

function plannerDayCount() {
  try {
    const raw = window.localStorage.getItem("lp:days:v2");
    if (!raw) return 0;
    const d = JSON.parse(raw) || {};
    return Object.keys(d).filter(k => d[k] && d[k].saved).length;
  } catch (e) { return 0; }
}
function orfReadingCount() {
  try {
    const raw = window.localStorage.getItem("running-records-v1");
    if (!raw) return 0;
    const d = JSON.parse(raw) || {};
    return Array.isArray(d.records) ? d.records.length : 0;
  } catch (e) { return 0; }
}

/* Setup's Backup card. Gradebook marks, the roster and running records stay
   on the device they were entered on; a backup carries everything, and
   Restore brings another device up to date (the school computer's names). */
function backupCardHTML() {
  const SS = window.SuiteSync;
  let h = '<div class="card pad"><h2>Backup</h2>';
  if (!SS) return h + '<p class="hint">The sync module did not load.</p></div>';
  const b = SS.lastBackup;
  h += '<p class="hint">Everything saves on this device as you work. A backup is one file with all of it: this gradebook, ' +
    plannerDayCount() + " saved lesson-plan days and " + orfReadingCount() + " running records. " +
    (SS.touchDevice() ? "On this device it goes to the share sheet: Save to Files." : "It goes to Downloads.") + "</p>" +
    '<p class="hint">Restore replaces what is here with a backup, which is also how another device is brought up to date (the school computer, when the roster changes). It can be undone. Live sync, on the Sync menu, carries the planner and the boards on its own.</p>' +
    (b && b.at ? '<p class="hint">Last backup: ' + esc(new Date(b.at).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })) + ".</p>" : "") +
    '<div class="row" style="margin-top:10px"><button class="btn primary" onclick="suiteBackup()">Save a backup</button>' +
    '<button class="btn" onclick="suiteRestore()">Restore a backup\u2026</button>' +
    (SS.canUndoImport ? '<button class="btn" onclick="suiteUndoLoad()">Undo the restore</button>' : "") + "</div>";
  return h + "</div>";
}

function initSync() {
  if (!window.SuiteSync) return;
  window.SuiteSync.onState(() => { if (UI.tab === "setup") renderSetup(); });
  /* another tab of the suite (the planner, say) can run the sync round
     that brings in marks from the other computer. This tab hears it only as
     a storage event; before, it kept its old copy and wrote it back on the
     next mark or on close. Now it reads the new copy in, unless a field
     here is mid-edit, in which case the next save merges instead. */
  window.addEventListener("storage", e => {
    if (e.key !== KEY || e.storageArea !== window.localStorage) return;
    const a = document.activeElement;
    if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return;
    reloadFromStorage(); settleCopies(); render();
  });
  window.SuiteSync.onChanged(changed => {
    if (changed.indexOf("gb2_standards_v1") >= 0) { reloadFromStorage(); settleCopies(); render(); }
    if (changed.indexOf(ORF_KEY) >= 0) { pushRosterToOrf(true); if (S.settings.orfAutoLink) syncFromOrf(true); render(); }
    if (changed.indexOf(BOARD_KEY) >= 0) boardGroupsArrived();   /* v97 */
    const others = changed.filter(k => k !== "gb2_standards_v1" && k !== BOARD_KEY);
    if (others.length) toast("Lesson plans and readings updated too \u2014 reopen those tools to see them");
    else if (changed.length) toast("Picked up changes");
  });
  window.SuiteSync.init();
}

/* ---------- service worker ---------- */
function initPWA() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("../sw.js").then(reg => {
    reg.addEventListener("updatefound", () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener("statechange", () => {
        if (nw.state === "installed" && navigator.serviceWorker.controller) {
          const t = document.getElementById("toast");
          t.innerHTML = 'A newer version is ready. <a href="#" style="color:#9FE0C0" onclick="location.reload();return false">Reload</a>';
          t.classList.add("show");
        }
      });
    });
    reg.update();
  }).catch(() => { });
}

/* ============================================================
   LESSON PLANNER BRIDGE
   The planner records curriculum position (Reveal U2 L5, Benchmark U1 W3 D2).
   The gradebook records standards. This is the mapping between them, held at
   unit level, plus the three things that mapping makes possible.
   ============================================================ */
const LP_SETTINGS = "lp:settings:v2";
const LP_DAYS = "lp:days:v2";

function readPlanner() {
  try {
    const s = window.localStorage.getItem(LP_SETTINGS);
    const d = window.localStorage.getItem(LP_DAYS);
    if (!s) return null;
    const subjects = (JSON.parse(s) || {}).subjects || [];
    const days = d ? (JSON.parse(d) || {}) : {};
    if (!subjects.length) return null;
    return { subjects: subjects, days: days, templates: (JSON.parse(s) || {}).templates || {} };
  } catch (e) { return null; }
}
/* only subjects that actually march through units can be mapped this way */
function unitSubjects(lp) {
  return lp.subjects.filter(sb => sb.schema === "uwd" || sb.schema === "ul");
}
function subjCatalog(sbId) { return sbId === "math" ? "Math" : "ELA"; }
function unitOf(pos) { return pos && pos.unit ? Number(pos.unit) : null; }

function unitKey(sbId, unit) { return sbId + "|" + unit; }
function unitStandards(sbId, unit) { return (S.unitMap || {})[unitKey(sbId, unit)] || []; }
function setUnitStandards(sbId, unit, codes) {
  S.unitMap = S.unitMap || {};
  S.unitMap[unitKey(sbId, unit)] = codes;
  save();
}
/* every unit the planner shows as actually taught, with its date range */
function unitsTaught(lp) {
  const out = {};
  Object.keys(lp.days || {}).forEach(dk => {
    const rec = lp.days[dk];
    if (!rec || rec.noSchool || !rec.saved || !rec.entries) return;
    Object.keys(rec.entries).forEach(sid => {
      const e = rec.entries[sid];
      if (!e || !e.taught) return;
      const u = unitOf(e.pos);
      if (!u) return;
      const k = unitKey(sid, u);
      const o = out[k] = out[k] || { sbId: sid, unit: u, first: dk, last: dk, days: 0 };
      if (dk < o.first) o.first = dk;
      if (dk > o.last) o.last = dk;
      o.days++;
    });
  });
  return out;
}
/* The Reveal lesson the planner has for Math on a date, or null. Only when
   the planner's Math is following the pacing guide (see curriculum.js). */
function revealStepOn(dateISO, lp) {
  const R = window.RevealPacing;
  lp = lp || readPlanner();
  if (!R || !lp) return null;
  const rec = (lp.days || {})[dateISO];
  const sb = lp.subjects.find(x => x.id === "math");
  const e = rec && rec.entries && rec.entries.math;
  if (!rec || rec.noSchool || !e || !e.taught || !R.on(sb)) return null;
  return R.find(e.pos);
}
/* the Reveal lesson the planner SHOWS for a date, saved or not. A saved
   day is what it says (revealStepOn). An unsaved day is the planner's own
   draft: an edit already started on that day's card (lp:pending:v1), or
   else the lesson after the last one taught before the date, as the
   planner's suggest() does. A weekend, or a day whose schedule has blocks
   but no Math, has none. Only the Enter card's default reads this; anything
   that counts what was taught (dates, ranges, "taught" labels) still reads
   revealStepOn, which is saved days only. */
const LP_PENDING = "lp:pending:v1";
function readPlannerPending() {
  try { const o = JSON.parse(window.localStorage.getItem(LP_PENDING) || "{}"); return o && typeof o === "object" ? o : {}; }
  catch (e) { return {}; }
}
function mathTaughtBefore(dateISO, lp) {
  const ks = Object.keys(lp.days || {}).filter(k => k < dateISO).sort().reverse();
  for (const k of ks) {
    const r = lp.days[k];
    if (!r || r.noSchool || r.saved === false) continue;
    const e = r.entries && r.entries.math;
    if (e && e.taught && e.pos) return e.pos;
  }
  return null;
}
function plannedStepOn(dateISO, lp) {
  const R = window.RevealPacing;
  lp = lp || readPlanner();
  if (!R || !lp || !dateISO) return null;
  const sb = lp.subjects.find(x => x.id === "math");
  if (!R.on(sb)) return null;
  if ((lp.days || {})[dateISO]) return revealStepOn(dateISO, lp);
  if (!sb.on) return null;   /* the planner drafts only subjects that are on */
  const pend = readPlannerPending()[dateISO];
  if (pend) {
    const e = pend.entries && pend.entries.math;
    return !pend.noSchool && e && e.taught && e.pos ? R.find(e.pos) : null;
  }
  const dow = new Date(dateISO + "T12:00:00").getDay();
  if (dow === 0 || dow === 6) return null;
  const tpl = (lp.templates || {})[dow] || [];
  if (tpl.length && !tpl.some(b => b && b.s === "math")) return null;
  const last = mathTaughtBefore(dateISO, lp);
  const pos = last ? R.next(last) : sb.start;
  return pos ? R.find(pos) : null;
}
/* what to call marks from that day: "Lesson 2-3", "Unit 2 test". The
   unit test was "Unit 2 assessment" in v60 and v61, which were never
   published; the planner calls it the test, so this does too. */
function revealCtx(step) {
  if (!step) return "";
  if (step.k === "L") return "Lesson " + step.u + "-" + step.n;
  if (step.k === "assess") return "Unit " + step.u + " test";
  if (step.k === "probe") return "Unit " + step.u + " probe";
  if (step.k === "review") return "Unit " + step.u + " review";
  return step.t;
}
/* What the planner says you taught on a given date, as gradebook standards.
   Math following the pacing guide is known to the lesson, so it gives that
   lesson's standards (a unit test, its unit's) rather than the whole unit's;
   a day the guide gives no grade 2 standard (an opener, Unit 1) gives none.
   Everything else is still by unit, from the map on the Planning tab. */
function standardsTaughtOn(dateISO) {
  const lp = readPlanner();
  if (!lp) return [];
  const rec = (lp.days || {})[dateISO];
  if (!rec || !rec.entries) return [];
  const out = [];
  const step = revealStepOn(dateISO, lp);
  Object.keys(rec.entries).forEach(sid => {
    const e = rec.entries[sid];
    if (!e || !e.taught) return;
    const u = unitOf(e.pos);
    if (!u) return;
    const sb = lp.subjects.find(x => x.id === sid);
    const lesson = sid === "math" && step ? step : null;
    const bmw = sid === "reading" ? benchmarkWeekOn(dateISO, lp) : null;
    const codes = lesson ? window.RevealPacing.oregon(lesson)
      : bmw ? window.BenchmarkScope.codes(bmw.pos, "reading")
      : unitStandards(sid, u);
    codes.forEach(c => {
      if (byCode[c] && !out.some(x => x.code === c)) {
        out.push({ code: c, subject: sb ? sb.name : sid, unit: u,
          ctx: lesson ? revealCtx(lesson) : bmw ? "Benchmark U" + bmw.pos.unit + " W" + bmw.pos.week : "",
          lesson: lesson ? window.RevealPacing.name(lesson) : bmw ? "Benchmark Unit " + bmw.pos.unit + " \u00b7 Week " + bmw.pos.week : "" });
      }
    });
  });
  /* Writing is an open field in the planner, so it has no position of its
     own. Benchmark's writing and grammar go with its reading week, so on a
     day Writing was taught they come from that day's Reading position. */
  const wr = rec.entries.writing, bw = benchmarkWeekOn(dateISO, lp, true);
  if (wr && wr.taught && bw) {
    window.BenchmarkScope.codes(bw.pos, "writing").forEach(c => {
      if (byCode[c] && !out.some(x => x.code === c)) {
        out.push({ code: c, subject: "Writing", unit: Number(bw.pos.unit), ctx: "Benchmark U" + bw.pos.unit + " W" + bw.pos.week + " writing",
          lesson: "Benchmark Unit " + bw.pos.unit + " \u00b7 Week " + bw.pos.week });
      }
    });
  }
  return out;
}
/* The Benchmark week the planner has for Reading on a date, or null.
   anyTaught: Writing uses the week even on a day Reading was skipped. */
function benchmarkWeekOn(dateISO, lp, anyTaught) {
  const B = window.BenchmarkScope;
  lp = lp || readPlanner();
  if (!B || !lp) return null;
  const rec = (lp.days || {})[dateISO];
  const sb = lp.subjects.find(x => x.id === "reading");
  const e = rec && rec.entries && rec.entries.reading;
  if (!rec || rec.noSchool || !e || !e.pos || (!e.taught && !anyTaught) || !B.on(sb)) return null;
  const w = B.week(e.pos);
  return w ? { pos: e.pos, week: w, unit: B.unit(e.pos.unit) } : null;
}

/* ---------- learning the mapping instead of asking for it ----------
   The unit → standards map is deliberately empty: only he knows what his
   Reveal and Benchmark units cover, and a plausible wrong guess would
   quietly corrupt the coverage and reteach views. But an empty map means
   both of those views are dead, and filling roughly seventy rows in one
   sitting is why it stayed empty.

   It does not have to be one sitting. The planner already records which
   unit was taught on which date; entering a mark records a standard on a
   date. Where those two overlap and the map has nothing, there is an
   obvious question to ask, and answering it is one tap. The judgment stays
   his — nothing is ever written without the tap — but the work is spread
   across the year and happens where he already is. */
function unitTaughtOn(dateISO) {
  const lp = readPlanner();
  if (!lp) return [];
  const rec = (lp.days || {})[dateISO];
  if (!rec || rec.noSchool || !rec.entries) return [];
  const out = [];
  Object.keys(rec.entries).forEach(sid => {
    const e = rec.entries[sid];
    if (!e || !e.taught) return;
    const u = unitOf(e.pos);
    if (!u) return;
    const sb = lp.subjects.find(x => x.id === sid);
    if (!sb || (sb.schema !== "uwd" && sb.schema !== "ul")) return;
    out.push({ sbId: sid, name: sb.name || sid, unit: u });
  });
  return out;
}
/* the one suggestion worth making right now, or null */
function mappingSuggestion(code, dateISO) {
  if (!code || !dateISO || !byCode[code]) return null;
  if (S.settings.noMapPrompts) return null;
  const units = unitTaughtOn(dateISO);
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    /* only ever offer a subject whose catalog side matches the standard, so
       a math unit is never offered for an ELA code */
    if (subjCatalog(u.sbId) !== byCode[code].s) continue;
    if (unitStandards(u.sbId, u.unit).includes(code)) continue;
    return { sbId: u.sbId, name: u.name, unit: u.unit, code: code };
  }
  return null;
}
function mappingPromptHTML(code, dateISO) {
  const s = mappingSuggestion(code, dateISO);
  if (!s) return "";
  return '<div class="card pad" id="mapprompt" style="margin-top:10px;border-color:var(--accent)">' +
    '<div class="row" style="align-items:center;gap:10px;flex-wrap:wrap">' +
    '<span class="small">The planner has <b>' + esc(s.name) + " unit " + s.unit +
    "</b> taught on this date. Does it cover " + codeHTML(s.code) + "?</span>" +
    '<span style="flex:1"></span>' +
    '<button class="btn sm primary" onclick="linkUnit(\'' + esc(s.sbId) + "'," + s.unit + ",'" + esc(s.code) + "')\">Yes, link it</button>" +
    '<button class="btn sm" onclick="dismissMapPrompt()">Not now</button>' +
    '<button class="btn sm" onclick="stopMapPrompts()" title="You can turn these back on in Setup">Stop asking</button>' +
    "</div></div>";
}
function linkUnit(sbId, unit, code) {
  const cur = unitStandards(sbId, unit).slice();
  if (!cur.includes(code)) cur.push(code);
  setUnitStandards(sbId, unit, cur);
  toast("Linked " + code + " to unit " + unit + ".");
  render();
}
function dismissMapPrompt() {
  const el = document.getElementById("mapprompt");
  if (el) el.remove();
}
function stopMapPrompts() {
  S.settings.noMapPrompts = true; save();
  toast("Stopped. Turn these back on in Setup.");
  dismissMapPrompt();
}

/* ============================================================
   TAB — PLANNING
   ============================================================ */
/* ============================================================
   THE PLANNING TAB IS FOLDED AWAY
   "Taught this day" was already on Enter scores (plannerPickHTML), and the
   Reveal and Benchmark pacing are the planner's to show. What was left
   went where it belongs: Coverage and "Before you move on" are about
   marks, so they are at the foot of Groups & patterns; the unit-to-
   standards map is a setting, so it is in Setup.
   ============================================================ */
function planningContext() {
  const lp = readPlanner();
  return lp ? { lp: lp, subs: unitSubjects(lp), taught: unitsTaught(lp) } : null;
}
/* Coverage and "Before you move on", for the foot of Groups & patterns */
function planningAnalysisHTML() {
  const ctx = planningContext();
  if (!ctx) return "";
  const lp = ctx.lp, subs = ctx.subs, taught = ctx.taught;
  let html = '<div class="divider"></div>';
  /* ---- coverage ---- */
  const gaps = [], thin = [];
  Object.keys(taught).forEach(k => {
    const t = taught[k];
    const codes = unitStandards(t.sbId, t.unit);
    const sb = lp.subjects.find(x => x.id === t.sbId);
    if (!codes.length && t.sbId === "math" && window.RevealPacing && window.RevealPacing.priorUnit(t.unit)) return;
    if (!codes.length) { gaps.push({ t: t, sb: sb }); return; }
    codes.forEach(c => {
      const n = new Set(S.scores.filter(x => x.std === c && x.source !== "iready").map(x => x.sid)).size;
      if (n < Math.ceil(S.students.length / 2)) thin.push({ t: t, sb: sb, code: c, n: n });
    });
  });
  html += '<div class="card pad"><div class="sectionhead"><h2>Coverage</h2><span class="spacer"></span>' +
    '<span class="hint">taught, but not much recorded</span></div>';
  if (!S.students.length) {
    html += '<p class="hint">Add your roster first and this fills in.</p>';
  } else if (!thin.length && !gaps.length) {
    html += '<p class="small">Every unit you have taught has standards attached, and each has marks for at least half the class.</p>';
  } else {
    if (thin.length) {
      html += '<table style="margin-top:6px"><thead><tr><th>Unit</th><th>Standard</th><th class="c">Students with a mark</th></tr></thead><tbody>' +
        thin.slice(0, 25).map(x => "<tr><td>" + esc((x.sb ? x.sb.name : x.t.sbId) + " \u00b7 Unit " + x.t.unit) +
          '</td><td>' + codeHTML(x.code) + " " + esc(byCode[x.code].lbl) +
          '</td><td class="c num" style="color:' + (x.n ? "var(--s2-ink)" : "var(--s1)") + ';font-weight:650">' +
          x.n + " of " + S.students.length + "</td></tr>").join("") + "</tbody></table>";
    }
    if (gaps.length) {
      html += '<p class="hint" style="margin-top:10px">Taught but with no standards attached yet: ' +
        gaps.slice(0, 12).map(g => esc((g.sb ? g.sb.name : g.t.sbId) + " U" + g.t.unit)).join(", ") + ".</p>";
    }
  }
  html += "</div>";

  /* ---- who needs reteaching before you move on ---- */
  const followups = [];
  subs.forEach(sb => {
    const mine = Object.keys(taught).map(k => taught[k]).filter(t => t.sbId === sb.id);
    if (!mine.length) return;
    const cur = mine.sort((a, b) => a.last.localeCompare(b.last))[mine.length - 1];
    const codes = unitStandards(sb.id, cur.unit);
    if (!codes.length) return;
    const kids = {};
    codes.forEach(c => {
      S.students.forEach(st => {
        const a = scoresFor(st.id, c).filter(x => x.source !== "iready");
        if (!a.length) return;
        if (a[a.length - 1].v <= 2) (kids[st.id] = kids[st.id] || []).push(c);
      });
    });
    const ids = Object.keys(kids);
    if (ids.length) followups.push({ sb: sb, unit: cur.unit, codes: codes, kids: kids, ids: ids, last: cur.last });
  });
  if (followups.length) {
    html += '<div class="divider"></div><h2>Before you move on</h2><div class="grid2">';
    followups.forEach(f => {
      html += '<div class="group"><h3><span class="tag reteach">Reteach</span> ' + esc(f.sb.name) + " \u00b7 Unit " + f.unit +
        '<span class="spacer" style="flex:1"></span><span class="tiny muted">' + f.ids.length + "</span></h3><div class=\"body\">" +
        '<div class="namelist">' + f.ids.map(id =>
          "<span>" + esc(fullName(S.students.find(s => s.id === id))) + ' <span class="tiny muted">' + f.kids[id].length + "</span></span>").join("") + "</div>" +
        '<div class="tiny muted">Last taught ' + esc(f.last) + " \u00b7 " + f.codes.length + " standards in this unit</div></div></div>";
    });
    html += "</div>";
  }

  return html;
}
/* the unit-to-standards map, for Setup */
function unitMapHTML() {
  const ctx = planningContext();
  if (!ctx) return '<div class="card pad" id="unitmap-card"><h2>Units and standards</h2><p class="hint">Open the planner from this same address and save a day, and the Reveal and Benchmark units appear here to map to standards.</p></div>';
  const subs = ctx.subs, taught = ctx.taught;
  let html = "";
  /* ---- the mapping itself ---- */
  html += '<div class="card pad" id="unitmap-card"><div class="sectionhead"><h2>Units and standards</h2><span class="spacer"></span>' +
    '<span class="hint">tick the standards each unit covers</span></div>' +
    '<p class="hint">' + (window.RevealPacing
      ? "Math is filled in from the Reveal pacing guide and is known lesson by lesson. Reading is filled in from the Benchmark scope and sequence, week by week; Benchmark prints skill names rather than codes, so those were matched from the names. Change any unit here and the change is kept."
      : "Only you can say what your Reveal and Benchmark units actually cover, so nothing is filled in by default. Unit level is enough \u2014 you do not need this per lesson.") + '</p>';
  subs.forEach(sb => {
    const cat = subjCatalog(sb.id);
    const maxSeen = Math.max(0, ...Object.keys(taught).map(k => taught[k]).filter(t => t.sbId === sb.id).map(t => t.unit));
    const shown = Math.max(maxSeen + 2, Number(S.unitCount && S.unitCount[sb.id]) || 0, 8,
      sb.id === "math" && window.RevealPacing ? window.RevealPacing.UNITS.length : 0,
      sb.id === "reading" && window.BenchmarkScope ? window.BenchmarkScope.UNITS.length : 0);
    html += '<h3 style="margin-top:16px">' + esc(sb.name) + ' <span class="tiny muted">' + esc(sb.curriculum || "") + " \u00b7 " + cat + " standards</span></h3>";
    for (let u = 1; u <= shown; u++) {
      const codes = unitStandards(sb.id, u);
      const t = taught[unitKey(sb.id, u)];
      const ru = sb.id === "math" && window.RevealPacing ? window.RevealPacing.unit(u)
        : sb.id === "reading" && window.BenchmarkScope ? window.BenchmarkScope.unit(u) : null;
      html += '<div style="border:1px solid var(--rule);border-radius:6px;padding:8px 11px;margin-top:8px' +
        (codes.length ? "" : ";background:#FCFBF8") + '">' +
        '<div class="row"><strong class="small" style="min-width:64px">Unit ' + u + "</strong>" +
        (ru ? '<span class="tiny muted">' + esc(ru.title) + (sb.id === "math" && window.RevealPacing.priorUnit(u) ? " \u00b7 grade 1 review" : "") + "</span>" : "") +
        (t ? '<span class="chip tiny">taught ' + t.days + " day" + (t.days === 1 ? "" : "s") + "</span>" : '<span class="tiny muted">not yet taught</span>') +
        '<span style="flex:1">' + (codes.length
          ? codes.map(c => codeHTML(c)).join(" ")
          : '<span class="tiny muted">no standards attached</span>') + "</span></div>" +
        '<details style="margin-top:6px"><summary class="tiny muted" style="cursor:pointer">choose standards</summary><div style="columns:2;margin-top:6px">' +
        CATALOG.filter(x => x.s === cat && stdListed(x)).map(x =>
          '<label class="row tiny" style="gap:6px;padding:1px 0"><input type="checkbox" data-usub="' + esc(sb.id) + '" data-unit="' + u + '" data-code="' + x.c + '"' +
          (codes.indexOf(x.c) >= 0 ? " checked" : "") + "><span>" + esc(dispCode(x.c) + " " + x.lbl) + "</span></label>").join("") +
        "</div></details></div>";
    }
    html += '<button class="btn sm" style="margin-top:8px" onclick="addUnitRow(\'' + esc(sb.id) + "'," + shown + ')">Show another unit</button>';
  });
  html += "</div>";
  return html;
}
function wireUnitMap() {
  document.querySelectorAll("#unitmap-card [data-usub]").forEach(cb => {
    cb.onchange = () => {
      const sid = cb.dataset.usub, u = Number(cb.dataset.unit);
      const cur = unitStandards(sid, u).slice();
      const i = cur.indexOf(cb.dataset.code);
      if (cb.checked) { if (i < 0) cur.push(cb.dataset.code); } else if (i >= 0) cur.splice(i, 1);
      setUnitStandards(sid, u, cur);
      refreshUnitMap();
    };
  });
}
/* redraws only the map, keeping the details that are open and the page where it is */
function refreshUnitMap() {
  const card = document.getElementById("unitmap-card");
  if (!card) return;
  const open = Array.from(card.querySelectorAll("details")).map(d => d.open);
  const tmp = document.createElement("div");
  tmp.innerHTML = unitMapHTML();
  card.replaceWith(tmp.firstElementChild);
  Array.from(document.querySelectorAll("#unitmap-card details")).forEach((d, i) => { if (open[i]) d.open = true; });
  wireUnitMap();
}
function addUnitRow(sbId, shown) {
  S.unitCount = S.unitCount || {};
  S.unitCount[sbId] = shown + 1;
  save(); refreshUnitMap();
}

/* ---------- Grading by Reveal lesson ----------
   The Enter card's Math is graded by the guide's day. By default that is the
   lesson the planner recorded on the date; choosing another (catching up on
   last week's exit tickets, say) offers that lesson's standards and names
   the assignment after it. An assignment is standard + date + "What was
   it?", so choosing a lesson the planner has on record also moves the date
   to the day it was taught, which is when the work was done and which
   quarter it counts in; a toast says so, and the date can be changed back.
   A name typed into "What was it?" is never replaced, only one this made. */
function lessonRowShown() {
  return !!window.RevealPacing && (UI.subject === "Math" || UI.subject === "All");
}
/* the dates the planner recorded a guide day as taught, oldest first */
function revealDatesOf(i) {
  const lp = readPlanner();
  if (!lp || !window.RevealPacing) return [];
  return Object.keys(lp.days || {}).sort().filter(k => { const s = revealStepOn(k, lp); return s && s.i === i; });
}
function lessonFromCtx(ctx) {
  const R = window.RevealPacing;
  if (!R || !ctx) return null;
  const s = R.FLAT.find(x => revealCtx(x) === ctx);
  return s ? s.i : null;
}
function enterLessonStep() {
  const R = window.RevealPacing;
  if (!R) return null;
  if (UI.enterLesson != null && R.FLAT[UI.enterLesson]) return R.FLAT[UI.enterLesson];
  return plannedStepOn(UI.enterDate);
}
/* the card takes the day's lesson the way choosing it in the Lesson
   menu does: its first standard (unless the one showing is already in it),
   and its name, replacing only a name this made, never one typed, and never
   beside marks entered without a name, which would split one assignment.
   Runs when the card opens and when the date changes, not on every render,
   so clearing "What was it?" by hand stays cleared. */
function followDayLesson() {
  if (UI.enterLesson != null || UI.enterMulti) return;
  const step = plannedStepOn(UI.enterDate);
  if (!step) return;
  const codes = lessonCodes(step);
  if (!codes.length) return;
  if (codes.indexOf(UI.enterStd) < 0) UI.enterStd = codes[0];
  const c = revealCtx(step);
  const unnamed = S.scores.some(x => x.std === UI.enterStd && x.date === UI.enterDate && !x.ctx && !x.source);
  if (UI.enterCtx ? lessonFromCtx(UI.enterCtx) != null : !unnamed) UI.enterCtx = c;
}
function lessonCodes(step) {
  const act = activeCodes(UI.subject);
  return step ? window.RevealPacing.oregon(step).filter(c => byCode[c] && act.indexOf(c) >= 0) : [];
}
function shortDate(iso) {
  const d = new Date(iso + "T12:00:00");
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()] + " " + d.getDate();
}
function lessonLabel(s) { return s.k === "L" ? s.u + "-" + s.n + " \u00b7 " + s.t : s.t; }
/* Two menus, Unit then day: one list of all 143 guide days was
   long to scroll. Choosing a unit only browses (UI.enterUnit); nothing about
   the assignment changes until a day in it is chosen, so looking through
   the units can never move the date. */
function unitRange(u, taught) {
  const ds = u.steps.map(x => taught[x.i]).filter(Boolean).sort();
  return ds.length ? " \u00b7 taught " + shortDate(ds[0]) + (ds.length > 1 ? "\u2013" + shortDate(ds[ds.length - 1]) : "") : "";
}
function lessonPickHTML() {
  if (!lessonRowShown()) return "";
  const R = window.RevealPacing, lp = readPlanner();
  const dayStep = plannedStepOn(UI.enterDate, lp);
  const daySaved = !!dayStep && !!revealStepOn(UI.enterDate, lp);
  const step = enterLessonStep();
  /* when each guide day was taught, from the planner, for the lists */
  const taught = {};
  let latest = null;
  if (lp) Object.keys(lp.days || {}).sort().forEach(k => {
    const x = revealStepOn(k, lp);
    if (x) { taught[x.i] = k; if (k <= UI.enterDate) latest = x; }
  });
  const following = !!dayStep && (UI.enterLesson == null || dayStep.i === UI.enterLesson);
  const gradeable = x => R.oregon(x).some(c => byCode[c]);
  const shownU = UI.enterUnit != null && R.unit(UI.enterUnit) ? Number(UI.enterUnit)
    : step ? step.u : latest ? latest.u : 2;
  const unitOpts = R.UNITS.map(u => {
    const none = !u.steps.some(gradeable);
    return '<option value="' + u.u + '"' + (u.u === shownU ? " selected" : "") + (none ? " disabled" : "") + ">Unit " + u.u + " \u00b7 " + esc(u.title) +
      unitRange(u, taught) + (none ? " \u00b7 grade 1 review" : "") + "</option>";
  }).join("");
  const inUnit = step && step.u === shownU;
  const dayOpts = (inUnit ? "" : '<option value="" selected disabled>Pick a day in Unit ' + shownU + "</option>") +
    R.unit(shownU).steps.map(x => {
      const none = !gradeable(x);
      return '<option value="' + x.i + '"' + (inUnit && step.i === x.i ? " selected" : "") + (none ? " disabled" : "") + ">" +
        esc(lessonLabel(x)) + (dayStep && dayStep.i === x.i ? " \u00b7 this day" : taught[x.i] ? " \u00b7 taught " + shortDate(taught[x.i]) : "") +
        (none ? " \u00b7 no grade 2 standards" : "") + "</option>";
    }).join("");
  let h = '<div class="row lessonpick" style="margin-top:10px;align-items:flex-end">' +
    '<label class="fld" style="flex:1;min-width:min(100%,14rem)">Reveal unit<select id="e-unit">' + unitOpts + "</select></label>" +
    '<label class="fld" style="flex:2;min-width:min(100%,16rem)">Lesson<select id="e-lesson">' + dayOpts + "</select></label>" +
    (dayStep && !following ? '<button class="btn sm" data-lesson-day title="' + esc(R.name(dayStep)) + '">Back to this day\u2019s lesson</button>' : "") +
    "</div>";
  if (step) {
    const codes = lessonCodes(step), ctx = revealCtx(step);
    h += '<div class="row" style="margin-top:8px;gap:6px;align-items:center">' +
      '<span class="tiny muted pickhead" style="letter-spacing:.04em">IN THIS LESSON</span>' +
      (codes.length ? codes.map(c => '<button class="btn sm' + (pickOn(c) ? " primary" : "") + '" data-pick="' + c + '" data-pickctx="' + esc(ctx) + '"' +
        (UI.enterMulti ? ' aria-pressed="' + pickOn(c) + '"' : "") + ' title="' + esc(R.name(step)) + '">' + esc(byCode[c].lbl) + "</button>").join("") + multiButtonHTML(codes, ctx)
        : '<span class="tiny muted">No grade 2 standards to mark on this day' + (R.oregon(step).length ? " that are switched on in Setup" : "") + ".</span>") +
      '<span class="tiny muted lessonname">' + esc(R.name(step)) + "</span></div>";
    if (following && !daySaved) h += '<div class="hint" style="margin-top:6px">This day isn\u2019t saved in the planner yet, so this is the lesson its card shows for it.</div>';
    if (step.tg && step.tg.length) h += '<div class="hint" style="margin-top:6px">' + esc(step.tg.join(" ")) + "</div>";
    /* a benchmark lists which questions go with each standard */
    const qs = R.questions ? R.questions(step).filter(g => byCode[g.code]) : [];
    if (qs.length) h += '<div class="hint" style="margin-top:6px">Questions by standard: ' +
      qs.map(g => esc(byCode[g.code].lbl) + " — " + (g.qs.length > 1 ? "Qs " : "Q") + g.qs.join(", ")).join(" · ") + "</div>";
  } else {
    h += '<div class="hint" style="margin-top:8px">The planner has no Reveal lesson on this date. Pick one above, or choose a standard.</div>';
  }
  return h;
}
function chooseLesson(v) {
  const R = window.RevealPacing;
  if (v === "" || v == null || !R) { UI.enterLesson = null; UI.enterUnit = null; renderEnter(); return; }
  const i = Number(v), step = R.FLAT[i];
  if (!step) return;
  UI.enterLesson = i;
  UI.enterUnit = null;
  UI.enterMulti = null;
  let msg = "";
  const onDay = plannedStepOn(UI.enterDate);
  if (!onDay || onDay.i !== i) {
    const dates = revealDatesOf(i);
    if (dates.length) {
      UI.enterDate = dates[dates.length - 1];
      msg = "Dated " + shortDate(UI.enterDate) + ", when " + R.name(step) + " was taught. Change the date if the work is from another day.";
    }
  }
  const codes = lessonCodes(step);
  if (codes.length && codes.indexOf(UI.enterStd) < 0) UI.enterStd = codes[0];
  /* name it after the lesson: replace a name this made, never one typed,
     and never beside unnamed marks, which would split one assignment */
  const c = revealCtx(step);
  const unnamed = S.scores.some(x => x.std === UI.enterStd && x.date === UI.enterDate && !x.ctx && !x.source);
  if (UI.enterCtx ? lessonFromCtx(UI.enterCtx) != null : !unnamed) UI.enterCtx = c;
  renderEnter();
  if (msg) toast(msg);
}

function pickOn(c) { return UI.enterMulti ? UI.enterMulti.indexOf(c) >= 0 : c === UI.enterStd; }
function uniqCodes(a) { return a.filter((c, i) => a.indexOf(c) === i); }
/* the row of standards the planner says today's lessons covered */
function plannerPickHTML() {
  const t = standardsTaughtOn(UI.enterDate);
  if (!t.length) return "";
  const codes = activeCodes(UI.subject);
  /* Math is offered by the lesson row above, whenever that is shown */
  const show = t.filter(x => codes.indexOf(x.code) >= 0 && !(lessonRowShown() && byCode[x.code].s === "Math"));
  if (!show.length) return "";
  return '<div class="row" style="margin-top:10px;gap:6px;align-items:center">' +
    '<span class="tiny muted pickhead" style="letter-spacing:.04em">TAUGHT THIS DAY</span>' +
    show.map(x => '<button class="btn sm' + (pickOn(x.code) ? " primary" : "") + '" data-pick="' + x.code + '"' + (UI.enterMulti ? ' aria-pressed="' + pickOn(x.code) + '"' : "") +
      (x.ctx ? ' data-pickctx="' + esc(x.ctx) + '"' : "") + ' title="' + esc(x.lesson || (x.subject + " Unit " + x.unit)) + '">' +
      esc(byCode[x.code].lbl) + "</button>").join("") + multiButtonHTML(uniqCodes(show.map(x => x.code)), show[0].ctx || "") +
    (show[0].lesson ? '<span class="tiny muted">' + esc(show[0].lesson) + "</span>" : "") + "</div>";
}

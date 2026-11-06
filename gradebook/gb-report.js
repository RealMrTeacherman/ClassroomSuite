/* gradebook/gb-report.js — Report card marks by standard (Power Law), iReady-alone marks, and the Report card tab.
   One of the gradebook's scripts, loaded in order by index.html as classic
   scripts sharing one global scope; see HANDOFF "The gradebook's files". */
/* ============================================================
   TAB 5 — REPORT CARD, BY STANDARD
   Synergy's standards-based report card is marked per standard (2.OA.A.1),
   so this is too: one column per standard, students in last-name order (the
   order Synergy lists them). It replaced v103's hand-made "report card
   lines"; those (S.rc) and their overrides are left in storage, unused.
   A sub-standard's marks (2.RF.3a) count toward its parent (2.RF.3), the
   row Synergy marks. Codes here are always the stored Oregon codes, which
   are Synergy's, whatever "Show math codes as" says for the rest of the
   gradebook.
   ============================================================ */
function termOf(id) { return S.terms.find(t => t.id === id) || S.terms[0]; }
function reportable(x) { return x.source !== "iready" || !!S.settings.ireadyInReport; }
/* sub-standards graded on their own line in Synergy */
const RC_OWN_LINE = ["2.OA.B.2a", "2.OA.B.2b"];
function rcParent(code) {
  if (RC_OWN_LINE.indexOf(code) >= 0) return code;
  const s = byCode[code];
  if (!s || s.lvl !== 2) return code;
  const p = code.replace(/[a-z]$/, "");
  return byCode[p] ? p : code;
}
/* the standards on the report card for this subject: active ones, and the
   parent of any active sub-standard */
function rcCodes() {
  const want = new Set();
  activeCodes(UI.subject).forEach(c => want.add(rcParent(c)));
  return CATALOG.filter(s => want.has(s.c)).map(s => s.c);
}
function stdScores(sid, code) {
  return S.scores.filter(x => x.sid === sid && reportable(x) &&
    (rcParent(x.std) === code || (x.std === FL20 && (code === FL20_ADD || code === FL20_SUB))));
}
/* the scores a term's mark is figured from: that term's, or with
   "year to date" every score from the start of the year to the term's end */
function stdEvidence(sid, code, term) {
  const from = S.settings.rcYTD ? "" : term.start;
  return stdScores(sid, code).filter(x => x.date && x.date >= from && x.date <= term.end)
    .sort((a, b) => a.date.localeCompare(b.date));
}
/* reading fluency is marked by the most recent score alone, whatever
   the rule in Setup ("at least for now"). Most recent graded score: an
   iReady domain mark only if there is nothing else. */
const RC_LATEST_ONLY = ["2.RF.4"];
function rcLatestOnly(code) { return RC_LATEST_ONLY.indexOf(code) >= 0; }
function rcCalc(code, ev) {
  if (!ev.length) return null;
  if (!rcLatestOnly(code)) return computeMark(ev.map(x => x.v));
  const g = ev.filter(x => x.source !== "iready");
  return (g.length ? g : ev)[(g.length ? g : ev).length - 1].v;
}
function stdMark(sid, code, term) {
  const ev = stdEvidence(sid, code, term);
  return { raw: rcCalc(code, ev), n: ev.length };
}
function carriedStd(sid, code, term) {
  const vals = stdScores(sid, code).filter(x => x.date < term.start).sort((a, b) => a.date.localeCompare(b.date));
  if (!vals.length) return null;
  const earlier = S.terms.filter(t => t.end < term.start).sort((a, b) => b.end.localeCompare(a.end));
  for (const t of earlier) {
    const inT = vals.filter(x => x.date >= t.start && x.date <= t.end);
    if (inT.length) return { v: roundMark(rcCalc(code, inT)), from: t.name, n: inT.length };
  }
  return { v: roundMark(rcCalc(code, vals)), from: "earlier work", n: vals.length };
}
/* an override is keyed term|student|std:CODE, beside v103's term|student|lineId */
function stdKey(term, sid, code) { return term.id + "|" + sid + "|std:" + code; }
function finalStd(sid, code, term) {
  const k = stdKey(term, sid, code);
  const r = stdMark(sid, code, term);
  if (S.overrides[k]) return { v: S.overrides[k], over: true, n: r.n };
  if (r.n === 0 && S.settings.carryForward && !S.settings.rcYTD) {
    const c = carriedStd(sid, code, term);
    if (c && c.v) return { v: c.v, over: false, n: 0, carried: c.from };
  }
  if (!rcGraded(sid, code, term)) {
    const ir = rcIreadyFill(sid, code, term);
    if (ir) return { v: ir.v, over: false, n: 0, ir: ir };
  }
  return { v: roundMark(r.raw), over: false, n: r.n, raw: r.raw, latest: rcLatestOnly(code) };
}
/* ============================================================
   A STANDARD WITH NO SCORES, MARKED FROM iREADY ALONE
   His rule, for a standard nobody has scored for this child, taught yet
   or not: the latest iReady diagnostic (up to the term's end) places
   Mid 2 or higher -> 3, Grade 1 or Early 2 -> 2, Grade K -> 1. Never a 4.
   Written against the grade in Setup, so for 2nd grade it is exactly that.
   "No scores" means no assignment or ORF score: the iReady tab's own domain
   marks (Turn iReady into standards marks) don't count as grades, so a
   standard with only those is marked by this rule instead.
   The placement used is the domain the standard belongs to (2.OA ->
   Algebra and Algebraic Thinking, 2.RF.3 -> Phonics, ...), the overall
   placement when no domain fits or the domain is missing. Math and
   reading only: writing, speaking/listening and conventions (L.1-L.3)
   are never filled. Any score at all on the standard and this is not
   used; an override (Set it yourself) beats it. Nothing is stored.
   ============================================================ */
const RC_IR_FILL = [
  [/\.OA\./, [/algebra/]],
  [/\.NBT\./, [/number/]],
  [/\.GM\.A\./, [/geometry/]],
  [/\.GM\.[B-D]\./, [/measurement/]],
  [/\.DR\./, [/measurement/]],
  [/\.RF\.2[a-z]?$/, [/phonological/]],
  [/\.RF\.3[a-z]?$/, [/\bphonics\b/, /high.?frequency/]],
  [/\.RF\.4[a-z]?$/, []],
  [/\.RL\./, [/literature/, /comprehension(: | )?overall|^comprehension$/]],
  [/\.RI\./, [/informational/, /comprehension(: | )?overall|^comprehension$/]],
  [/\.L\.[456][a-z]?$/, [/vocab/]]
];
/* graded: an assignment or ORF score counts. The domain marks the iReady
   tab writes are not grades, so a standard with only those is filled too */
function rcGraded(sid, code, term) { return stdEvidence(sid, code, term).some(x => x.source !== "iready"); }
function irGradeWord(n) { return n <= 0 ? "K" : String(n); }
/* placement -> 1, 2 or 3 by his rule; null when it can't be read. Takes
   absolute placements ("Mid 2", "Grade 1", "Emerging K") and relative
   ones ("Mid or Above Grade Level", "Early On Grade Level", "1 Grade Level Below") */
function irFillMark(p) {
  const s = normHdr(p);
  if (!s) return null;
  const G = Number(S.settings.studentGrade || 2);
  if (/tested out|max(imum)? scale/.test(s)) return 3;
  if (/emerging/.test(s)) return 1;
  if (/above grade level|(mid|late) on grade level/.test(s)) return 3;
  if (/early on grade level/.test(s)) return 2;
  if (/on grade level|at grade level/.test(s)) return 3;
  let below = null, m = s.match(/(\d+)\s*(?:or more\s*)?grade levels?\s*below/);
  if (m) below = Number(m[1]);
  else if (/three or more grade levels?\s*below/.test(s)) below = 3;
  else if (/two grade levels?\s*below/.test(s)) below = 2;
  else if (/one grade level\s*below/.test(s)) below = 1;
  if (below != null) return below <= 1 ? 2 : 1;
  m = s.match(/^(?:(early|mid|late)\s+)?(?:grade\s*)?(k|\d+)$/);
  if (!m) return null;
  const g = m[2] === "k" ? 0 : Number(m[2]);
  if (g > G) return 3;
  if (g === G) return m[1] === "early" ? 2 : 3;
  return g === G - 1 ? 2 : 1;
}
function irFillWords() {
  const G = Number(S.settings.studentGrade || 2);
  return "Mid " + irGradeWord(G) + " or higher \u2192 3 \u00b7 Grade " + irGradeWord(G - 1) + " or Early " + irGradeWord(G) +
    " \u2192 2 \u00b7 Grade " + irGradeWord(G - 2) + (G - 2 > 0 ? " or below" : "") + " \u2192 1";
}
function rcIreadyFill(sid, code, term) {
  if (!S.settings.rcIreadyFill) return null;
  const std = byCode[code];
  if (!std || (std.s !== "Math" && std.s !== "ELA")) return null;
  const rule = RC_IR_FILL.find(r => r[0].test(code));
  if (!rule) return null;
  const rec = (S.iready || []).filter(r => r.sid === sid && r.subject === std.s && (!r.date || r.date <= term.end))
    .sort((a, b) => (a.date || "").localeCompare(b.date || "")).slice(-1)[0];
  if (!rec) return null;
  for (const re of rule[1]) {
    const k = Object.keys(rec.domains || {}).find(k => re.test(normHdr(k)));
    const v = k ? irFillMark((rec.domains[k] || {}).p) : null;
    if (v) return { v: v, from: k, p: rec.domains[k].p, date: rec.date || "" };
  }
  const v = irFillMark(rec.placement);
  return v ? { v: v, from: "Overall", p: rec.placement, date: rec.date || "" } : null;
}
/* how a child's marks on a standard become one mark for a marking
   period. */
function termMarksCardHTML() {
  const r = S.settings.rule;
  return '<div class="card pad" id="term-marks"><h2>Term marks</h2>' +
    '<p class="hint" style="margin-top:4px">How a child\u2019s marks on one standard become one mark for a marking period. Conferences, Math goal and Skill groups all use it.</p>' +
    '<div class="row" style="margin-top:8px;align-items:flex-end"><label class="fld">How marks are figured<select id="tm-rule">' +
    '<option value="powerlaw"' + (r === "powerlaw" ? " selected" : "") + '>Power law (the trend, where they are now)</option>' +
    '<option value="weighted"' + (r === "weighted" ? " selected" : "") + '>Recent work counts more</option>' +
    '<option value="latest"' + (r === "latest" ? " selected" : "") + '>Most recent mark only</option>' +
    '<option value="mean"' + (r === "mean" ? " selected" : "") + '>Straight average</option></select></label>' +
    '<label class="row small" style="gap:6px;padding-bottom:7px"><input type="checkbox" id="tm-ytd"' + (S.settings.rcYTD ? " checked" : "") + '> Count the whole year so far, not just this term</label>' +
    (S.settings.rcYTD ? "" : '<label class="row small" style="gap:6px;padding-bottom:7px"><input type="checkbox" id="tm-carry"' + (S.settings.carryForward ? " checked" : "") + '> Carry a mark forward when a standard has no marks this term</label>') +
    '<label class="row small" style="gap:6px;padding-bottom:7px"><input type="checkbox" id="tm-irfill"' + (S.settings.rcIreadyFill ? " checked" : "") + '> Mark a math or reading standard with no scores from iReady alone</label>' +
    "</div>" + (r === "powerlaw" ? '<p class="hint" style="margin-top:6px">With fewer than ' + POWER_MIN + " scores there is no trend to fit, so the plain average is used, and the Report card flags it.</p>" : "") + "</div>";
}
/* ============================================================
   REPORT CARD
   Back as a tab, laid out as he chose from the mockups: the class as a grid
   (students in last-name order, Synergy's; one column per standard, in the
   stored Oregon codes, Synergy's) and a "why" panel for the picked mark: every
   score behind it, assignments, iReady and ORF together, plotted oldest to
   newest with the power-law curve, the number it lands on, the plain average
   beside it, and 1-4 to set the mark yourself (an override, as in v104).
   The mark is finalStd's, so Conferences, the CSV and the entry sheet all say
   the same. Standards nobody has a score on yet are hidden unless asked for.
   ============================================================ */
function rcTerm() {
  return S.terms.find(t => t.id === UI.reportTerm) || S.terms.find(t => t.id === studentTermNow()) || S.terms[0];
}
function rcScoredCodes(term) {
  return rcCodes().filter(c => S.students.some(st => { const f = finalStd(st.id, c, term); return f.v || f.n; }));
}
/* every standard, always. He keys Synergy from this grid by hand, so a
   standard nobody has scored still gets its column (blank where no mark). */
function rcShownCodes(term) { return rcCodes(); }
function rcThin(f) { return S.settings.rule === "powerlaw" && !f.over && !f.latest && f.n > 0 && f.n < POWER_MIN; }
function rcSrc(x) { return x.source === "iready" ? "iReady" : x.source === "orf" ? "ORF" : "Assignment"; }
const RC_RULE_WORDS = { powerlaw: "power law", weighted: "recent work counts more", latest: "most recent mark", mean: "straight average" };
function rcMethodLine(term) {
  const what = ["assignments"];
  if (S.settings.ireadyInReport && S.settings.ireadyAutoScore) what.push("iReady");
  if (S.settings.orfAutoScore) what.push("ORF checks");
  const span = S.settings.rcYTD ? "the year so far, through " + fmtShort(term.end) : fmtShort(term.start) + " \u2013 " + fmtShort(term.end);
  return "Figured by " + (RC_RULE_WORDS[S.settings.rule] || S.settings.rule) + " over " + span + ", from " +
    (what.length > 1 ? what.slice(0, -1).join(", ") + " and " + what[what.length - 1] : what[0]) + "." +
    (S.settings.rcIreadyFill ? " A math or reading standard with no scores is marked from iReady alone." : "") +
    (rcCodes().some(rcLatestOnly) ? " Reading fluency (2.RF.4) is the most recent score." : "");
}
function fmtShort(iso) {
  const d = new Date(String(iso) + "T12:00:00");
  return isNaN(d) ? String(iso || "") : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function rcCellHTML(st, code, term, f) {
  const ev = stdEvidence(st.id, code, term);
  const on = UI.rcSel && UI.rcSel.sid === st.id && UI.rcSel.code === code;
  const cls = "mark " + (f.v ? "v" + f.v : "vnone") + (rcThin(f) ? " rc-thin" : "") + (f.over ? " rc-over" : "") + (f.ir ? " rc-ir" : "");
  const label = fullName(st) + ", " + code + ": " + (f.v ? f.v : "no mark") + (f.over ? ", set by you" : "") + (rcThin(f) ? ", fewer than " + POWER_MIN + " scores" : "") + (f.ir ? ", from iReady alone" : "");
  return '<td class="c"><button type="button" class="rc-cell' + (on ? " on" : "") + '" data-sid="' + esc(st.id) + '" data-code="' + esc(code) + '" aria-label="' + esc(label) + '">' +
    '<span class="' + cls + '">' + (f.v || "\u2013") + "</span>" +
    (f.ir || ev.some(x => x.source === "iready") ? '<span class="rc-i" aria-hidden="true">i</span>' : "") + "</button></td>";
}
function rcChartSVG(ev, fit) {
  const n = ev.length, W = 300, H = 120, x0 = 22, x1 = 290, y0 = 10, y1 = 104;
  const X = i => n === 1 ? (x0 + x1) / 2 : x0 + (x1 - x0) * i / (n - 1);
  const Y = v => y0 + (y1 - y0) * (4 - v) / 3;
  let h = '<svg class="rc-chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Scores oldest to newest' + (fit ? ", with the power-law curve" : "") + '">';
  [4, 3, 2, 1].forEach(v => {
    h += '<line x1="' + x0 + '" x2="' + x1 + '" y1="' + Y(v) + '" y2="' + Y(v) + '" style="stroke:var(--line)"/>' +
      '<text x="8" y="' + (Y(v) + 4) + '" style="fill:var(--ink-3);font-size:10px">' + v + "</text>";
  });
  if (fit) h += '<polyline fill="none" points="' + ev.map((_, i) => X(i).toFixed(1) + "," + Y(fit.at(i)).toFixed(1)).join(" ") + '" style="stroke:var(--accent);stroke-width:2;stroke-dasharray:5 4"/>';
  ev.forEach((x, i) => {
    const cx = X(i), cy = Y(x.v), c = "fill:var(--s" + x.v + ");stroke:var(--panel);stroke-width:2";
    const t = "<title>" + esc(fmtShort(x.date) + ", " + rcSrc(x) + ": " + x.v) + "</title>";
    if (x.source === "iready") h += '<polygon points="' + cx + "," + (cy - 7) + " " + (cx + 7) + "," + cy + " " + cx + "," + (cy + 7) + " " + (cx - 7) + "," + cy + '" style="' + c + '">' + t + "</polygon>";
    else if (x.source === "orf") h += '<rect x="' + (cx - 5.5) + '" y="' + (cy - 5.5) + '" width="11" height="11" rx="2" style="' + c + '">' + t + "</rect>";
    else h += '<circle cx="' + cx + '" cy="' + cy + '" r="6" style="' + c + '">' + t + "</circle>";
  });
  return h + "</svg>";
}
function rcWhyHTML(term) {
  const sel = UI.rcSel, st = sel && S.students.find(s => s.id === sel.sid);
  if (!st || !byCode[sel.code]) return '<div class="card pad rc-why"><p class="hint">Pick any mark to see the scores behind it.</p></div>';
  const code = sel.code, f = finalStd(st.id, code, term), ev = stdEvidence(st.id, code, term), vals = ev.map(x => x.v);
  const lat = rcLatestOnly(code);
  const rule = lat ? "latest" : S.settings.rule, calc = rcCalc(code, ev), plain = vals.length ? avg(vals) : null;
  const two = x => x == null ? "\u2013" : (Math.round(x * 100) / 100).toFixed(2);
  let how;
  if (!vals.length) how = "<b>No scores yet</b>" + (S.settings.rcYTD ? " this year." : " this term.");
  else if (rule === "powerlaw" && vals.length >= POWER_MIN) how = "<b>Power law " + two(calc) + "</b> \u2192 rounds to " + roundMark(calc);
  else if (rule === "powerlaw") how = "<b>Average of " + vals.length + " score" + (vals.length === 1 ? "" : "s") + ": " + two(calc) + "</b> \u2192 " + roundMark(calc);
  else if (lat) how = "<b>Most recent score: " + calc + "</b>";
  else how = "<b>" + esc(RC_RULE_WORDS[rule] || rule) + " " + two(calc) + "</b> \u2192 " + roundMark(calc);
  let sub = vals.length ? "Straight average " + two(plain) + " \u00b7 " + vals.length + " score" + (vals.length === 1 ? "" : "s") + ", " + fmtShort(ev[0].date) + " \u2013 " + fmtShort(ev[ev.length - 1].date) : "";
  const irf = f.ir || (!rcGraded(st.id, code, term) ? rcIreadyFill(st.id, code, term) : null);
  const irWhere = x => esc((x.from === "Overall" ? "Overall" : x.from) + " placement " + x.p) + (x.date ? ", diagnostic of " + esc(fmtShort(x.date)) : "");
  if (f.over) { how = "<b>Set by you: " + f.v + "</b>"; sub = vals.length && !irf ? "Calculated: " + roundMark(calc) + " (" + two(calc) + ")" : irf ? "From iReady: " + irf.v + " (" + irWhere(irf) + ")" : "Nothing calculated yet"; }
  else if (!vals.length && f.carried) sub = "Carried from " + esc(f.carried);
  else if (f.ir) { how = "<b>From iReady: " + f.v + "</b>"; sub = irWhere(f.ir); }
  let h = '<div class="card pad rc-why" id="rc-why"><div class="rc-whyhead"><span class="rc-eyebrow">' + esc(code) + " \u00b7 " + esc(byCode[code].lbl) + "</span>" +
    '<span class="rc-who">' + nameLink(st, fullName(st)) + "</span></div>" +
    '<div class="rc-result">' + '<span class="mark rc-big ' + (f.v ? "v" + f.v : "vnone") + '">' + (f.v || "\u2013") + "</span>" +
    '<div class="rc-how"><span>' + how + "</span>" + (sub ? '<span class="muted">' + sub + "</span>" : "") + "</div></div>";
  if (f.ir) h += '<p class="notice rc-thinnote">No assignment or ORF scores on this standard yet, so the mark comes from the iReady placement alone: ' + irFillWords() + ". A score on it, or setting it yourself, replaces this.</p>";
  if (lat && vals.length && !f.over && !f.ir) h += '<p class="notice rc-thinnote">Reading fluency uses the most recent score only, not the trend.</p>';
  if (rcThin(f)) h += '<p class="notice rc-thinnote">Fewer than ' + POWER_MIN + " scores, so there\u2019s no trend to fit and this is the plain average. Worth a look before it goes on the report card.</p>";
  if (ev.length && !f.ir) {
    const fit = rule === "powerlaw" && vals.length >= POWER_MIN && !f.over ? powerFit(vals) : null;
    h += rcChartSVG(ev, fit) + '<div class="rc-axis"><span>oldest</span><span>newest</span></div>';
    h += '<div class="rc-ev">' + ev.slice().reverse().map(x => {
      const before = x.date < term.start;
      return '<div class="rc-evrow' + (before ? " early" : "") + '"' + (x.note ? ' title="' + esc(x.note) + '"' : "") + '><span class="rc-date">' + esc(fmtShort(x.date)) + "</span>" +
        '<span class="rc-tag ' + rcSrc(x).toLowerCase() + '">' + rcSrc(x) + "</span>" +
        '<span class="rc-what">' + esc(x.ctx || "") + (x.std !== code ? ' <span class="muted">(' + esc(x.std) + ")</span>" : "") + "</span>" + markHTML(x.v) + "</div>";
    }).join("") + "</div>";
  }
  h += '<div class="rc-set"><span class="muted small">Set it yourself</span><span class="rc-setgrp">' + [1, 2, 3, 4].map(v =>
    '<button type="button" class="rc-setbtn s' + v + '" data-set="' + v + '" aria-pressed="' + (f.over && f.v === v ? "true" : "false") + '">' + v + "</button>").join("") + "</span>" +
    (f.over ? '<button type="button" class="btn sm ghost" data-set="0">Use calculated</button>' : "") + "</div></div>";
  return h;
}
function renderReport() {
  const el = document.getElementById("panel-report");
  if (!el) return;
  if (!S.students.length) return noStudents(el);
  const term = rcTerm();
  UI.reportTerm = term.id;
  const codes = rcShownCodes(term), studs = sortedStudents();
  if (!UI.rcSel || !studs.some(s => s.id === UI.rcSel.sid) || codes.indexOf(UI.rcSel.code) < 0)
    UI.rcSel = codes.length ? { sid: studs[0].id, code: codes[0] } : null;
  const marks = {};
  studs.forEach(st => { marks[st.id] = {}; codes.forEach(c => { marks[st.id][c] = finalStd(st.id, c, term); }); });
  let thin = 0, over = 0, irn = 0;
  studs.forEach(st => codes.forEach(c => { const f = marks[st.id][c]; if (rcThin(f)) thin++; if (f.over) over++; if (f.ir) irn++; }));
  let h = '<div class="sectionhead rc-top"><div><h2>' + esc(term.name) + " report card \u00b7 " + esc(subjLabel()) + "</h2>" +
    '<p class="hint" style="margin-top:2px">' + esc(rcMethodLine(term)) + ' <a class="rc-change" href="#setup" onclick="gotoTab(\'setup\');setTimeout(()=>{const t=document.getElementById(\'term-marks\');t&&t.scrollIntoView()},50);return false">Change</a></p></div>' +
    '<span class="spacer"></span><label class="fld">Term<select id="rc-term">' + S.terms.map(t => '<option value="' + t.id + '"' + (t.id === term.id ? " selected" : "") + ">" + esc(t.name) + "</option>").join("") + "</select></label>" +
    '<button class="btn" onclick="rcPrint()">Print entry sheet</button><button class="btn primary" onclick="downloadMarks()">Download CSV</button></div>';
  if (!codes.length) {
    h += '<div class="card empty"><strong>No scores yet ' + (S.settings.rcYTD ? "this year" : "this term") + "</strong>Marks entered in Enter marks show up here, a column per standard.</div>";
    el.innerHTML = h; rcWire(el); return;
  }
  h += '<div class="rc-wrap"><div class="card rc-grid"><div class="rc-scroll scroll"><table class="rc-table"><thead><tr><th class="rc-name">Student</th>';
  codes.forEach(c => {
    const cnt = { 1: 0, 2: 0, 3: 0, 4: 0 }; let tot = 0;
    studs.forEach(st => { const v = marks[st.id][c].v; if (v) { cnt[v]++; tot++; } });
    h += '<th class="rc-col"><code class="std">' + esc(c) + '</code><span class="rc-lbl">' + esc(byCode[c].lbl) + "</span>" +
      '<span class="rc-dist" title="' + [1, 2, 3, 4].map(v => v + ": " + cnt[v]).join("  ") + '">' +
      (tot ? [1, 2, 3, 4].map(v => cnt[v] ? '<span style="width:' + (cnt[v] / tot * 100) + '%;background:var(--s' + v + ')"></span>' : "").join("") : "") + "</span>" +
      '<button type="button" class="btn sm ghost" data-copy="' + esc(c) + '">Copy column</button></th>';
  });
  h += "</tr></thead><tbody>";
  studs.forEach(st => {
    h += '<tr><th class="rc-name" scope="row">' + nameLink(st, st.last + ", " + st.first) + "</th>";
    codes.forEach(c => { h += rcCellHTML(st, c, term, marks[st.id][c]); });
    h += "</tr>";
  });
  h += "</tbody></table></div>" +
    '<div class="rc-legend"><span><b class="rc-ikey">i</b> includes an iReady score</span>' +
    '<span><span class="mark rc-thin v2" aria-hidden="true">2</span> fewer than ' + POWER_MIN + " scores: plain average" + (thin ? " (" + thin + ")" : "") + "</span>" +
    '<span><span class="mark rc-over v3" aria-hidden="true">3</span> set by you' + (over ? " (" + over + ")" : "") + "</span>" +
    (irn ? '<span><span class="mark rc-ir v2" aria-hidden="true">2</span> no scores: from iReady alone (' + irn + ")</span>" : "") +
    "</div></div>" + rcWhyHTML(term) + "</div>";
  el.innerHTML = h;
  rcWire(el);
}
function rcWire(el) {
  const ts = el.querySelector("#rc-term");
  if (ts) ts.onchange = () => { UI.reportTerm = ts.value; renderReport(); };
  el.onclick = e => {
    const cell = e.target.closest(".rc-cell");
    if (cell) {
      UI.rcSel = { sid: cell.dataset.sid, code: cell.dataset.code };
      renderReport();
      const w = document.getElementById("rc-why");
      if (w && phoneLayout() && w.scrollIntoView) w.scrollIntoView({ behavior: "smooth", block: "start" });
      const again = el.querySelector('.rc-cell[data-sid="' + cell.dataset.sid + '"][data-code="' + cell.dataset.code + '"]');
      if (again && !phoneLayout()) again.focus();
      return;
    }
    const set = e.target.closest("[data-set]");
    if (set && UI.rcSel) { rcSet(Number(set.dataset.set)); return; }
    const cp = e.target.closest("[data-copy]");
    if (cp) rcCopy(cp.dataset.copy);
  };
}
/* tapping the mark already set clears it, as on the student page */
function rcSet(v) {
  const term = rcTerm(), k = stdKey(term, UI.rcSel.sid, UI.rcSel.code);
  if (!v || S.overrides[k] === v) delete S.overrides[k]; else S.overrides[k] = v;
  save(); renderReport();
}
function rcCopy(code) {
  const text = copyColumn(code, rcTerm());
  const done = () => toast("Copied " + code + ": " + sortedStudents().length + " marks, top to bottom");
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => toast("Couldn\u2019t copy here. Try the CSV."));
    else toast("Couldn\u2019t copy here. Try the CSV.");
  } catch (e) { toast("Couldn\u2019t copy here. Try the CSV."); }
}
/* the entry sheet: the grid on paper, to type from */
function rcPrint() {
  const term = rcTerm(), codes = rcShownCodes(term);
  let h = "<h2>" + esc(term.name) + " report card \u00b7 " + esc(subjLabel()) + '</h2><p style="font-size:11px;color:#555">' + esc(rcMethodLine(term)) +
    " * fewer than " + POWER_MIN + " scores." + (S.settings.rcIreadyFill ? " i from iReady alone (no scores)." : "") + " Printed " + todayISO() + '.</p><table border="1" cellspacing="0" cellpadding="3" style="width:100%;border-collapse:collapse;font-size:11px"><tr><th align="left">Student</th>' +
    codes.map(c => '<th style="text-align:center">' + esc(c) + "</th>").join("") + "</tr>";
  sortedStudents().forEach(st => {
    h += "<tr><td>" + esc(st.last + ", " + st.first) + "</td>" + codes.map(c => { const f = finalStd(st.id, c, term); return '<td style="text-align:center">' + (f.v || "") + (rcThin(f) ? "*" : "") + (f.ir ? "<sup>i</sup>" : "") + "</td>"; }).join("") + "</tr>";
  });
  document.getElementById("printsheet").innerHTML = h + "</table>";
  suitePrint();
}
/* the export below (downloadMarks, copyColumn) is wired to the Report
   card tab again. How marks are figured is still set in Setup. */
/* one mark per line, in last-name order: a blank line where there is no mark,
   so a pasted column never slides up against the wrong child */
function copyColumn(code, term) {
  return sortedStudents().map(st => finalStd(st.id, code, term).v || "").join("\n");
}
function csvCell(x) { const s = String(x == null ? "" : x); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function download(name, text) {
  const b = new Blob([text], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
function downloadMarks() {
  const term = rcTerm();
  const codes = rcCodes();
  const head = ["Last Name", "First Name", "Student ID"].concat(codes);
  const rows = [head.map(csvCell).join(",")];
  sortedStudents().forEach(st => {
    const r = [st.last, st.first, st.sid || ""].concat(codes.map(c => finalStd(st.id, c, term).v || ""));
    rows.push(r.map(csvCell).join(","));
  });
  download("synergy-marks-" + term.name.replace(/\s+/g, "-") + ".csv", rows.join("\n"));
}
function downloadDetail() {
  const rows = [["Last Name", "First Name", "Student ID", "Subject", "Standard", "Standard text", "Mark", "Date", "Context", "Note"].join(",")];
  S.scores.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(x => {
    const st = S.students.find(s => s.id === x.sid); if (!st) return;
    const c = byCode[x.std] || {};
    rows.push([st.last, st.first, st.sid || "", c.s || "", x.std, c.t || "", x.v, x.date, x.ctx || "", x.note || ""].map(csvCell).join(","));
  });
  download("all-standard-scores.csv", rows.join("\n"));
}
function printStudent() {
  const st = S.students.find(s => s.id === UI.studentSel);
  let h = "<h2>" + esc(fullName(st)) + "</h2><p style=\"font-size:11px;color:#555\">Standards record, printed " + todayISO() + "</p>";
  (UI.subject === "All" ? ["Math", "ELA"] : [UI.subject]).forEach(subj => {
    const codes = activeCodes(subj).filter(c => scoresFor(st.id, c).length);
    if (!codes.length) return;
    h += "<h3>" + subj + '</h3><table border="1" cellspacing="0" cellpadding="3" style="width:100%;border-collapse:collapse"><tr><th align="left">Standard</th><th align="left">Description</th><th>Marks</th></tr>';
    codes.forEach(c => {
      h += "<tr><td>" + esc(c) + "</td><td>" + esc(byCode[c].lbl) + "</td><td align=\"center\">" + scoresFor(st.id, c).map(x => x.v).join(" \u203a ") + "</td></tr>";
    });
    h += "</table>";
  });
  document.getElementById("printsheet").innerHTML = h;
  suitePrint();
}

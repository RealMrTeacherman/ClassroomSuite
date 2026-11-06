/* gradebook/gb-class-goal.js — Math: the Class goal tab and its sheet.
   One of the gradebook's scripts, loaded in order by index.html as classic
   scripts sharing one global scope; see HANDOFF "The gradebook's files". */
/* ============================================================
   CLASS GOAL — Math
   Where the whole class needs the most help, from daily classwork and from
   the iReady diagnostic, shown side by side and never blended into one
   rank: they measure different things on different scales, and seeing
   them disagree is itself worth knowing. Then one goal set from that
   picture, tracked against a straight line from where the class started
   to where it is aiming, and printed for PLC or admin with class numbers
   only, never a child's name.

   Classwork is every mark not written by iReady or the ORF tool. A
   child's mark on a standard is the report card's rule over those marks,
   rounded the report card's way, so "3 or higher" here is the same 3 that
   goes to Synergy. Goals live in S.goals, an array of records with ids,
   so the sync merge handles them record by record like everything else.
   ============================================================ */
const CG_DOMAINS = [
  { key: "num", name: "Number and Operations", match: /number/ },
  { key: "alg", name: "Algebra and Algebraic Thinking", match: /algebra/ },
  { key: "md", name: "Measurement and Data", match: /measurement/ },
  { key: "geo", name: "Geometry", match: /geometry/ }
];
/* Oregon 2021 math codes onto iReady's four domains. iReady's domains are
   the CCSS ones: OA is Algebra, NBT is Number and Operations, and Oregon's
   GM splits back into CCSS G (its A cluster: shapes, partitioning) and MD
   (length, time, money), with DR (data) also MD. */
function cgDomainOf(code) {
  if (/^\d\.NBT\./.test(code)) return "num";
  if (/^\d\.OA\./.test(code)) return "alg";
  if (/^\d\.GM\.A\./.test(code)) return "geo";
  if (/^\d\.(GM|DR)\./.test(code)) return "md";
  return null;
}
function cgDom(key) { return CG_DOMAINS.find(d => d.key === key) || null; }
function cgISO(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function cgAddDays(iso, n) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return cgISO(d); }
function cgDaysBetween(a, b) { return Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5); }
function cgLongDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
}
function cgPct(a, b) { return b ? Math.round(100 * a / b) : null; }
function cgSince(win) { return !win || win === "0" ? null : cgAddDays(todayISO(), -Number(win)); }
function cgIsClasswork(x) { return x.source !== "iready" && x.source !== "orf"; }

/* one child's mark across some standards: the report card's rule on each,
   averaged. null when there is no classwork mark on any of them. */
function cgMark(sid, codes, asOf, since) {
  const per = [];
  codes.forEach(c => {
    const vals = S.scores.filter(x => x.sid === sid && x.std === c && cgIsClasswork(x) && x.date &&
      (!asOf || x.date <= asOf) && (!since || x.date >= since))
      .sort((a, b) => a.date.localeCompare(b.date)).map(x => x.v);
    const m = computeMark(vals);
    if (m != null) per.push(m);
  });
  return per.length ? avg(per) : null;
}
/* sids: just these children (a group); omitted, the whole class */
function cgPopOf(sids) { return sids ? S.students.filter(st => sids.indexOf(st.id) >= 0) : S.students; }
/* opt (v129, Extend groups): { bar: 4, codeFor: sid => that child's own
   standard }, so each child is counted on their own next skill at 4 */
function cgClassStat(codes, asOf, since, sids, opt) {
  const pop = cgPopOf(sids), bar = opt && opt.bar || 3;
  const out = { n: pop.length, marked: 0, at: 0, below: [], none: [], pct: null, byMark: [0, 0, 0, 0] };
  pop.forEach(st => {
    const m = cgMark(st.id, opt && opt.codeFor ? [opt.codeFor(st.id)] : codes, asOf, since);
    if (m == null) { out.none.push(st); return; }
    out.marked++;
    out.byMark[roundMark(m) - 1]++;                         /* the bar on Class goal */
    if (roundMark(m) >= bar) out.at++; else out.below.push({ st: st, m: m });
  });
  out.pct = cgPct(out.at, out.marked);
  return out;
}
/* enough marks to say something about the class: half of it, at least 3 */
function cgThin(stat) { return stat.marked < Math.max(3, Math.ceil(stat.n / 2)); }

/* the Reveal unit the planner has today (or the last school day before) */
function cgCurrentUnit() {
  if (typeof plannedStepOn !== "function") return null;
  let lp = null;
  try { lp = readPlanner(); } catch (e) { return null; }
  if (!lp) return null;
  let d = todayISO();
  for (let i = 0; i < 14; i++) {
    let s = null;
    try { s = plannedStepOn(d, lp); } catch (e) { return null; }
    if (s && s.u) return Number(s.u);
    d = cgAddDays(d, -1);
  }
  return null;
}
function cgUnitsFor(code) {
  return Object.keys(S.unitMap || {}).filter(k => /^math\|/.test(k) && Array.isArray(S.unitMap[k]) && S.unitMap[k].indexOf(code) >= 0)
    .map(k => Number(k.split("|")[1])).filter(n => isFinite(n)).sort((a, b) => a - b);
}
function cgUnitNote(code, cur) {
  if (cur == null) return "";
  const us = cgUnitsFor(code);
  if (!us.length) return "";
  if (us.indexOf(cur) >= 0) return "In Unit " + cur + " now";
  const later = us.filter(u => u > cur), earlier = us.filter(u => u < cur);
  if (later.length) return (earlier.length ? "Back in Unit " : "First taught in Unit ") + later[0];
  return "Taught in Unit " + earlier[earlier.length - 1];
}

/* ---- iReady: each child's most recent math diagnostic, and the one before ---- */
function cgDomRank(rec, dkey) {
  if (dkey === "overall") return placementRank(rec.placement);
  const d = cgDom(dkey);
  const k = Object.keys(rec.domains || {}).find(k => d.match.test(normHdr(k)));
  return k ? placementRank((rec.domains[k] || {}).p) : null;
}
function cgIrStat(dkey, asOf, sids) {
  const now = [], prev = [];
  cgPopOf(sids).forEach(st => {
    const a = S.iready.filter(r => r.sid === st.id && r.subject === "Math" && r.date && (!asOf || r.date <= asOf))
      .sort((x, y) => x.date.localeCompare(y.date))
      .map(r => ({ date: r.date, rank: cgDomRank(r, dkey) })).filter(x => x.rank != null);
    if (a.length) now.push(a[a.length - 1]);
    if (a.length > 1) prev.push(a[a.length - 2]);
  });
  const sum = list => {
    const on = list.filter(x => x.rank >= 0).length;
    const dates = list.map(x => x.date).sort();
    return { n: list.length, on: on, one: list.filter(x => x.rank === -1).length,
      two: list.filter(x => x.rank <= -2).length, pct: cgPct(on, list.length),
      from: dates[0] || "", to: dates[dates.length - 1] || "" };
  };
  const out = sum(now);
  const p = sum(prev);
  out.prev = p.n >= 3 ? p : null;
  return out;
}
function cgHasIready() { return S.iready.some(r => r.subject === "Math"); }

/* ---- the needs picture ---- */
function cgNeeds(win) {
  const since = cgSince(win), cur = cgCurrentUnit();
  const back = cgAddDays(todayISO(), -21);
  const rows = activeCodes("Math").filter(c => cgDomainOf(c)).map(c => {
    const st = cgClassStat([c], null, since);
    let trend = null;
    if (!since || since <= back) {
      const then = cgClassStat([c], back, since);
      if (!cgThin(then) && !cgThin(st)) trend = st.pct - then.pct;
    }
    return { code: c, dom: cgDomainOf(c), stat: st, thin: cgThin(st), trend: trend, unit: cgUnitNote(c, cur) };
  });
  const ranked = rows.filter(r => !r.thin && r.stat.below.length)
    .sort((a, b) => b.stat.below.length - a.stat.below.length || a.stat.pct - b.stat.pct || a.code.localeCompare(b.code));
  const ir = CG_DOMAINS.map(d => Object.assign({ key: d.key, name: d.name }, cgIrStat(d.key)))
    .filter(d => d.n).sort((a, b) => a.pct - b.pct || b.two - a.two);
  return { rows: rows, ranked: ranked, ir: ir, overall: cgIrStat("overall"), since: since, cur: cur };
}
/* where the two sources agree. Not a combined rank: just a note when the
   lowest iReady domains hold one of the top classwork needs. */
function cgAgreement(nd) {
  const top = nd.ranked.slice(0, 3), out = [];
  nd.ir.filter(d => d.n >= 3).slice(0, 2).forEach(d => {
    const hits = top.filter(r => r.dom === d.key);
    if (hits.length) out.push({ dom: d, rows: hits });
  });
  return out;
}

/* ---- goals ---- */
function cgActive() { return (S.goals || []).find(g => !g.done && !g.group) || null; }
/* a group goal counts whoever is in the group now: data follows the child */
function cgPop(g) { return g && g.group ? ggMembers(g.group) : null; }
/* an Extend goal counts each child at 4 on the skill they were
   working toward when it started (one who joins later: their next skill) */
function cgGoalOpt(g) { return g && g.bar ? { bar: g.bar, codeFor: sid => (g.targets || {})[sid] || ggExtendTarget(sid) } : null; }
function cgBarWords(g) { return g && g.bar === 4 ? "at 4 on their next skill" : "at 3 or higher"; }
function cgFocusCodes(kind, key) {
  if (kind === "std") return byCode[key] ? [key] : [];
  return activeCodes("Math").filter(c => cgDomainOf(c) === key);
}
function cgFocusDomain(kind, key) { return kind === "std" ? cgDomainOf(key) : key; }
function cgFocusWords(g) {
  if (g.focus.kind === "std") {
    const s = byCode[g.focus.key];
    return s ? s.lbl.charAt(0).toLowerCase() + s.lbl.slice(1) + " (" + dispCode(g.focus.key) + ")" : g.focus.key;
  }
  const d = cgDom(g.focus.key);
  return "the " + (d ? d.name : g.focus.key) + " standards";
}
function cgSuggest(base) {
  if (base == null) return 80;
  if (base >= 95) return 100;
  return Math.min(100, Math.round((base + Math.max(10, (100 - base) / 2)) / 5) * 5);
}
function cgTermEnd() {
  const t = todayISO();
  const term = (S.terms || []).find(x => x.start <= t && t <= x.end);
  return term && term.end > cgAddDays(t, 13) ? term.end : cgAddDays(t, 56);
}
function cgGrade() {
  const g = Number(S.settings.studentGrade || 2);
  return ({ 1: "first", 2: "second", 3: "third", 4: "fourth", 5: "fifth" }[g] || "") + (g >= 1 && g <= 5 ? " graders" : "students");
}
function cgStatement(g) {
  /* a group still named for its need would say the need twice: "this group" */
  const gname = g.group ? ggName(g) : "", same = g.group && (g.bar === 4 ? gname === "Extend" : byCode[g.focus.key] && gname === byCode[g.focus.key].lbl);
  const who = g.group ? (same ? "the children in this group" : "the children in the " + gname + " group") : "our " + cgGrade();
  let s = "By " + cgLongDate(g.due) + ", " + g.target + "% of " + who + (g.bar === 4
    ? " will score 4 on the next skill each is working toward"
    : " will score 3 or higher on " + cgFocusWords(g)) + " in daily classwork, up from " + (g.base.pct == null ? "no marks yet" : g.base.pct + "%") +
    " on " + cgLongDate(g.started) + ".";
  if (g.ir && g.ir.target != null) {
    const d = cgDom(g.ir.dom);
    s += " On the iReady math diagnostic, students on or above grade level in " + (d ? d.name : "this domain") +
      " will rise from " + (g.ir.base && g.ir.base.pct != null ? g.ir.base.pct + "%" : "the next diagnostic") + " to " + g.ir.target + "%.";
  }
  return s;
}
function cgDraftFrom(kind, key) {
  const codes = cgFocusCodes(kind, key), dom = cgFocusDomain(kind, key);
  const base = cgClassStat(codes, null, null), irs = dom ? cgIrStat(dom) : null;
  return { kind: kind, key: key, target: cgSuggest(base.pct),
    irTarget: irs && irs.n ? cgSuggest(irs.pct) : null, due: cgTermEnd(), actions: "" };
}
function cgStartGoal() {
  const d = UI.cgDraft;
  if (!d) return;
  const codes = cgFocusCodes(d.kind, d.key);
  if (!codes.length) { toast("Choose something to focus on"); return; }
  const t = todayISO();
  if (!d.due || d.due <= t) { toast("The goal date needs to be after today"); return; }
  const base = cgClassStat(codes, null, null), dom = cgFocusDomain(d.kind, d.key);
  const irs = dom ? cgIrStat(dom) : null;
  const g = {
    id: uid(), subject: "Math", focus: { kind: d.kind, key: d.key }, codes: codes,
    started: t, due: d.due,
    base: { pct: base.pct, marked: base.marked, n: base.n },
    target: Math.max(0, Math.min(100, Math.round(Number(d.target) || 0))),
    ir: dom && cgHasIready() ? { dom: dom, base: irs && irs.n ? { pct: irs.pct, n: irs.n, date: irs.to } : null,
      target: d.irTarget == null || d.irTarget === "" ? null : Math.max(0, Math.min(100, Math.round(Number(d.irTarget)))) } : null,
    actions: String(d.actions || ""), notes: [], done: null
  };
  S.goals = (S.goals || []).concat([g]);
  UI.cgDraft = null;
  save(); renderClassGoal(); toast("Class goal started");
}
function cgGoalNow(g) {
  const pop = cgPop(g);
  const st = cgClassStat(g.codes, null, null, pop, cgGoalOpt(g));
  const ir = g.ir ? cgIrStat(g.ir.dom, null, pop) : null;
  const t = todayISO(), total = Math.max(1, cgDaysBetween(g.started, g.due));
  const el = Math.max(0, Math.min(total, cgDaysBetween(g.started, t)));
  const b = g.base.pct == null ? 0 : g.base.pct;
  const expected = Math.round(b + (g.target - b) * el / total);
  let pace = "";
  if (st.pct == null) pace = "none";
  else if (st.pct >= g.target) pace = "met";
  else if (el < 7) pace = "early";
  else if (st.pct >= expected - 5) pace = "on";
  else pace = "behind";
  const last = S.scores.filter(x => g.codes.indexOf(x.std) >= 0 && cgIsClasswork(x) && x.date && x.date >= g.started && x.date <= t && (!pop || pop.indexOf(x.sid) >= 0))
    .map(x => x.date).sort().pop() || null;
  return { st: st, ir: ir, expected: expected, pace: pace, last: last, quiet: cgDaysBetween(last || g.started, t) };
}
function cgPaceWords(g, now) {
  switch (now.pace) {
    case "met": return "Goal met: " + now.st.pct + "% are " + cgBarWords(g) + ", against a target of " + g.target + "%.";
    case "early": return "Just started. The first check against the line comes after a week of marks.";
    case "on": return "On pace. The line has " + (g.group ? "the group" : "the class") + " at about " + now.expected + "% by today; it is at " + now.st.pct + "%.";
    case "behind": return "Behind pace by " + (now.expected - now.st.pct) + " points. The line has " + (g.group ? "the group" : "the class") + " at about " + now.expected + "% by today; it is at " + now.st.pct + "%.";
    default: return "No classwork marks on the focus yet.";
  }
}
/* weekly points from the start to today, plus today */
function cgSeries(g) {
  const t = todayISO(), end = g.due < t ? g.due : t, pts = [], pop = cgPop(g);
  for (let d = g.started; d <= end; d = cgAddDays(d, 7)) {
    const s = cgClassStat(g.codes, d, null, pop, cgGoalOpt(g));
    if (s.pct != null) pts.push({ date: d, pct: s.pct });
  }
  if (!pts.length || pts[pts.length - 1].date !== end) {
    const s = cgClassStat(g.codes, end, null, pop, cgGoalOpt(g));
    if (s.pct != null) pts.push({ date: end, pct: s.pct });
  }
  return pts;
}
/* one iReady point per diagnostic window: dates within three weeks of
   each other are one sitting */
function cgIrSeries(g) {
  if (!g.ir) return [];
  const lo = cgAddDays(g.started, -45), pop = cgPop(g);
  const dates = Array.from(new Set(S.iready.filter(r => r.subject === "Math" && r.date && r.date >= lo && r.date <= g.due && (!pop || pop.indexOf(r.sid) >= 0)).map(r => r.date))).sort();
  const wins = [];
  dates.forEach(d => { const w = wins[wins.length - 1]; if (w && cgDaysBetween(w.first, d) <= 21) w.last = d; else wins.push({ first: d, last: d }); });
  return wins.map(w => { const s = cgIrStat(g.ir.dom, w.last, pop); return { date: w.last < g.started ? g.started : w.last, pct: s.pct }; })
    .filter(p => p.pct != null);
}
function cgChartSVG(g, paper, narrow, height) {
  /* a phone draws it narrower rather than shrinking the type; paper shorter, to keep the sheet to one page */
  const W = narrow ? 360 : 640, H = height || (paper ? 150 : narrow ? 200 : 220), L = 38, R = 14, T = 12, B = 30;
  const x0 = g.started, span = Math.max(1, cgDaysBetween(g.started, g.due));
  const X = d => L + (W - L - R) * Math.max(0, Math.min(1, cgDaysBetween(x0, d) / span));
  const Y = p => T + (H - T - B) * (1 - p / 100);
  const ink = paper ? "#000" : "currentColor";
  let s = '<svg class="cg-chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Class progress toward the goal">';
  [0, 25, 50, 75, 100].forEach(p => {
    s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(p) + '" y2="' + Y(p) + '" stroke="' + ink + '" stroke-opacity=".15"/>' +
      '<text x="' + (L - 6) + '" y="' + (Y(p) + 4) + '" text-anchor="end" font-size="11" fill="' + ink + '" fill-opacity=".7">' + p + "%</text>";
  });
  s += '<text x="' + L + '" y="' + (H - 8) + '" font-size="11" fill="' + ink + '" fill-opacity=".7">' + esc(shortDate(g.started)) + "</text>" +
    '<text x="' + (W - R) + '" y="' + (H - 8) + '" text-anchor="end" font-size="11" fill="' + ink + '" fill-opacity=".7">' + esc(shortDate(g.due)) + "</text>";
  const b = g.base.pct == null ? 0 : g.base.pct;
  s += '<line class="cg-aim" x1="' + X(g.started) + '" y1="' + Y(b) + '" x2="' + X(g.due) + '" y2="' + Y(g.target) + '" stroke="' + ink + '" stroke-width="1.5" stroke-dasharray="6 5"/>';
  s += '<text x="' + (X(g.due) - 4) + '" y="' + (Y(g.target) - 6) + '" text-anchor="end" font-size="11" fill="' + ink + '">Target ' + g.target + "%</text>";
  const pts = cgSeries(g);
  if (pts.length) {
    s += '<polyline class="cg-line" fill="none" stroke="' + (paper ? "#000" : "var(--accent)") + '" stroke-width="2.5" points="' +
      pts.map(p => X(p.date).toFixed(1) + "," + Y(p.pct).toFixed(1)).join(" ") + '"/>';
    pts.forEach(p => { s += '<circle class="cg-pt" cx="' + X(p.date).toFixed(1) + '" cy="' + Y(p.pct).toFixed(1) + '" r="3.5" fill="' + (paper ? "#000" : "var(--accent)") + '"><title>' + esc(shortDate(p.date)) + ": " + p.pct + "%</title></circle>"; });
  }
  cgIrSeries(g).forEach(p => {
    s += '<rect class="cg-ir" x="' + (X(p.date) - 5).toFixed(1) + '" y="' + (Y(p.pct) - 5).toFixed(1) + '" width="10" height="10" fill="' + (paper ? "#fff" : "var(--panel)") + '" stroke="' + ink + '" stroke-width="1.5"><title>iReady ' + esc(shortDate(p.date)) + ": " + p.pct + "%</title></rect>";
  });
  return s + "</svg>";
}
const CG_KEY = "Solid line: classroom marks at 3 or higher, each week. Dashed line: the straight path from the start to the target. Squares: iReady, on or above grade level in the domain.";

/* ---- drawing ---- */
function cgArrow(t) {
  if (t == null) return "";
  const a = t >= 10 ? "\u2191" : t <= -10 ? "\u2193" : "\u2192";
  return '<span class="cg-trend" title="Change in the share at 3 or higher over the last 3 weeks, in percentage points">' + a + " " + (t > 0 ? "+" : "") + t + " pts in 3 wks</span>";
}
/* one row of the classwork table. The bar is the whole class split by
   each child's mark (the report card's rule, rounded as the report card
   rounds), with no mark yet in grey; the numbers beside it are the same
   ones the list had. Its iReady domain sits in its own column, with that
   domain's share on or above: shown beside it, never folded into the rank. */
function cgBarHTML(s) {
  const n = Math.max(1, s.n), parts = s.byMark.map((v, i) => ({ v: v, c: "cg-b" + (i + 1), what: "at " + (i + 1) }))
    .concat([{ v: s.none.length, c: "cg-bnone", what: "with no mark yet" }]).filter(x => x.v);
  return '<span class="cg-bar" role="img" aria-label="' + esc(parts.map(x => x.v + " " + x.what).join(", ")) + '">' +
    parts.map(x => '<span class="' + x.c + '" style="width:' + (100 * x.v / n).toFixed(2) + '%">' + (x.v / n >= 0.05 ? x.v : "") + "</span>").join("") + "</span>";
}
function cgNeedRowHTML(r, canPick, i, nd, both) {
  const s = r.stat, ir = nd ? nd.ir.find(d => d.key === r.dom) : null;
  return '<tr class="cg-need" data-std="' + esc(r.code) + '">' +
    '<td class="cg-rank">' + (i + 1) + "</td>" +
    '<td class="cg-stdcell">' + codeHTML(r.code) + ' <span class="cg-lbl">' + esc(byCode[r.code].lbl) + "</span>" +
    (r.unit ? '<span class="cg-unit cg-unit2">' + esc(r.unit) + "</span>" : "") + "</td>" +
    '<td class="cg-barcell">' + cgBarHTML(s) + "</td>" +
    '<td class="cg-nums"><span><b>' + s.below.length + " of " + s.marked + "</b> below 3</span><span>" + s.pct + "% at 3+</span>" + cgArrow(r.trend) + "</td>" +
    '<td class="cg-domcell">' + esc(cgDom(r.dom).name) + (ir ? '<span class="cg-dompct">' + ir.pct + "% on or above</span>" : "") +
    (both ? '<span class="cg-both">Both point here</span>' : "") + "</td>" +
    '<td class="cg-act">' + (canPick ? '<button class="btn sm ghost cg-pick" data-kind="std" data-key="' + esc(r.code) + '">Make this the goal</button>' : "") + "</td></tr>";
}
function cgIrRowHTML(d, canPick) {
  const w = x => d.n ? (100 * x / d.n).toFixed(1) : 0;
  const chg = d.prev ? d.pct - d.prev.pct : null;
  return '<div class="cg-irrow" data-dom="' + d.key + '">' +
    '<div class="cg-need-top"><span class="cg-lbl"><b>' + esc(d.name) + "</b></span></div>" +
    '<div class="cg-meter cg-stack" aria-hidden="true"><span class="cg-on" style="width:' + w(d.on) + '%"></span><span class="cg-one" style="width:' + w(d.one) + '%"></span><span class="cg-two" style="width:' + w(d.two) + '%"></span></div>' +
    '<div class="cg-nums"><span><b>' + d.pct + "%</b> on or above</span><span>" + d.one + " one below</span><span>" + d.two + " two+ below</span>" +
    (chg != null ? '<span class="cg-trend" title="Since each child\u2019s diagnostic before this one">' + (chg > 0 ? "\u2191 +" : chg < 0 ? "\u2193 " : "\u2192 ") + chg + " since last</span>" : "") +
    '<span class="spacer" style="flex:1"></span>' +
    (canPick ? '<button class="btn sm ghost cg-pick" data-kind="dom" data-key="' + d.key + '">Make this the goal</button>' : "") +
    "</div></div>";
}
function cgRange(a, b) { return !a ? "" : a === b ? shortDate(a) : shortDate(a) + "\u2013" + shortDate(b); }
function cgNeedsHTML(nd, canPick) {
  /* iReady as a strip of its domains, then classwork as one table. Two
     cards, each ranked by its own measure; they are not blended into one rank. */
  let h = '<div class="sectionhead"><h2>Where the class needs the most help</h2><span class="spacer"></span>' +
    '<span class="hint">Classwork and iReady are ranked separately. They measure different things, so they are not blended into one rank.</span></div>';
  h += '<div class="cg-needs">';
  /* iReady */
  if (nd.ir.length) {
    const all = nd.ir.concat([nd.overall]);
    const from = all.map(d => d.from).filter(Boolean).sort()[0], to = all.map(d => d.to).filter(Boolean).sort().pop();
    h += '<div class="card pad cg-col cg-irstrip" id="cg-iready"><div class="cg-colhead"><h3>iReady diagnostic</h3><span class="hint">Domains ranked by the share on or above grade level, lowest first, from each child\u2019s most recent diagnostic (' + esc(cgRange(from, to)) + ").</span></div>" +
      '<div class="cg-irtiles">' + nd.ir.map(d => cgIrRowHTML(d, canPick)).join("") + "</div>" +
      '<div class="cg-key"><span><i class="cg-on"></i>On or above grade level</span><span><i class="cg-one"></i>One grade below</span><span><i class="cg-two"></i>Two or more below</span></div>';
    if (nd.overall.n) h += '<p class="hint" style="margin:6px 0 0">Overall: ' + nd.overall.pct + "% on or above grade level, " + nd.overall.two + " two or more grades below (" + nd.overall.n + " tested).</p>";
    h += "</div>";
  } else {
    h += '<div class="card pad cg-col cg-irstrip cg-irnone" id="cg-iready"><span class="cg-empty"><b>iReady diagnostic.</b> No iReady math results yet. Bring in a diagnostic export in Setup and it is ranked here, on its own.</span>' +
      '<button class="btn sm" onclick="gotoTab(\'iready\')">Go to iReady</button></div>';
  }
  /* classwork */
  const ag = cgAgreement(nd), bothCodes = [];
  ag.forEach(a => a.rows.forEach(r => bothCodes.push(r.code)));
  h += '<div class="card pad cg-col" id="cg-classwork"><div class="cg-colhead"><h3>Daily classwork</h3><span class="hint">Standards ranked by how many children are below 3, each child\u2019s mark by the term-mark rule (Setup). Each bar is the whole class.</span></div>';
  if (nd.ranked.length) {
    h += '<div class="cg-key"><span><i class="cg-b1"></i>1</span><span><i class="cg-b2"></i>2</span><span><i class="cg-b3"></i>3</span><span><i class="cg-b4"></i>4</span><span><i class="cg-bnone"></i>No mark yet</span></div>' +
      '<div class="cg-tablewrap"><table class="cg-ntable"><thead><tr><th class="cg-rank">#</th><th>Standard</th><th>Children by mark</th><th>Below 3</th><th>Its iReady domain</th><th></th></tr></thead><tbody>' +
      nd.ranked.slice(0, 6).map((r, i) => cgNeedRowHTML(r, canPick, i, nd, bothCodes.indexOf(r.code) >= 0)).join("") + "</tbody></table></div>";
  } else h += '<div class="cg-empty">No standard has enough marks to rank yet. A standard is ranked once half the class has a mark on it.</div>';
  const thin = nd.rows.filter(r => r.thin && r.stat.marked);
  if (thin.length) h += '<p class="hint" style="margin-top:8px">Too few marks to rank yet: ' + thin.map(r => esc(dispCode(r.code)) + " (" + r.stat.marked + ")").join(", ") + ".</p>";
  /* agreement, said in full under the table it tags */
  if (ag.length) {
    h += '<div class="notice ok cg-agree"><b>Both point here</b><span>' + ag.map(a =>
      esc(a.dom.name) + " is among the lowest iReady domains (" + a.dom.pct + "% on or above), and " +
      a.rows.map(r => esc(byCode[r.code].lbl) + " (" + esc(dispCode(r.code)) + ")").join(" and ") +
      (a.rows.length > 1 ? " are" : " is") + " among the top classwork needs.").join(" ") + "</span></div>";
  } else if (nd.ranked.length && nd.ir.length) {
    h += '<div class="notice cg-agree"><b>The two disagree</b><span>The top classwork needs sit outside the lowest iReady domains. That can mean a skill the diagnostic has not caught up with yet, or a domain the units have not reached; worth a look before choosing.</span></div>';
  }
  h += "</div></div>";
  /* every standard, grouped by iReady domain */
  h += '<details class="card pad cg-all"><summary><b>Every math standard</b> <span class="hint">grouped by iReady domain</span></summary><div class="cg-tablewrap"><table class="cg-table"><thead><tr><th>Standard</th><th class="c">At 3+</th><th class="c">Below 3</th><th class="c">Marked</th><th>Trend</th><th>Unit</th></tr></thead><tbody>';
  CG_DOMAINS.forEach(d => {
    const rs = nd.rows.filter(r => r.dom === d.key);
    if (!rs.length) return;
    const ir = nd.ir.find(x => x.key === d.key);
    h += '<tr class="cg-domrow"><th colspan="6">' + esc(d.name) +
      (ir ? ' <span class="hint">\u00b7 iReady ' + ir.pct + "% on or above, " + ir.one + " one below, " + ir.two + " two+ below</span>" : "") + "</th></tr>";
    rs.forEach(r => {
      const s = r.stat;
      h += '<tr data-std="' + esc(r.code) + '"><td>' + codeHTML(r.code) + " " + esc(byCode[r.code].lbl) + "</td>" +
        '<td class="c">' + (s.marked ? s.pct + "%" : "\u2013") + '</td><td class="c">' + (s.marked ? s.below.length : "\u2013") + "</td>" +
        '<td class="c">' + s.marked + " of " + s.n + "</td><td>" + (r.thin ? '<span class="hint">too few</span>' : cgArrow(r.trend)) + "</td>" +
        '<td class="hint">' + esc(r.unit) + "</td></tr>";
    });
  });
  h += "</tbody></table></div></details>";
  return h;
}
function cgFocusOptions(sel) {
  let o = '<optgroup label="A whole iReady domain">' + CG_DOMAINS.map(d =>
    '<option value="dom:' + d.key + '"' + (sel === "dom:" + d.key ? " selected" : "") + ">" + esc(d.name) + "</option>").join("") + "</optgroup>";
  CG_DOMAINS.forEach(d => {
    const cs = activeCodes("Math").filter(c => cgDomainOf(c) === d.key);
    if (!cs.length) return;
    o += '<optgroup label="One standard: ' + esc(d.name) + '">' + cs.map(c =>
      '<option value="std:' + esc(c) + '"' + (sel === "std:" + c ? " selected" : "") + ">" + esc(dispCode(c)) + " " + esc(byCode[c].lbl) + "</option>").join("") + "</optgroup>";
  });
  return o;
}
function cgDraftHTML() {
  const d = UI.cgDraft;
  if (!d) {
    return '<div class="card pad cg-draft"><h2>Set a class goal</h2><p class="hint" style="margin-top:4px">Choose \u201cMake this the goal\u201d on any need above, or start from a blank goal. The baseline is taken from today\u2019s marks when you start it.</p>' +
      '<div class="row" style="margin-top:10px"><button class="btn" id="cg-blank">Start a goal</button></div></div>';
  }
  const codes = cgFocusCodes(d.kind, d.key), dom = cgFocusDomain(d.kind, d.key);
  const base = cgClassStat(codes, null, null), irs = dom ? cgIrStat(dom) : null;
  const g = { focus: { kind: d.kind, key: d.key }, due: d.due, started: todayISO(), target: Number(d.target) || 0,
    base: { pct: base.pct }, ir: dom && irs && irs.n && d.irTarget != null && d.irTarget !== "" ? { dom: dom, base: { pct: irs.pct }, target: Number(d.irTarget) } : null };
  let h = '<div class="card pad cg-draft" id="cg-draft"><h2>Set a class goal</h2>' +
    '<div class="row cg-form" style="margin-top:10px">' +
    '<label class="fld" style="flex:2;min-width:240px">Focus<select id="cg-focus">' + cgFocusOptions(d.kind + ":" + d.key) + "</select></label>" +
    '<label class="fld">Goal date<input type="date" id="cg-due" value="' + esc(d.due) + '"></label></div>' +
    '<div class="row cg-form" style="margin-top:10px">' +
    '<label class="fld">Classwork target (% at 3+)<input type="number" min="0" max="100" step="5" id="cg-target" value="' + esc(d.target) + '"></label>' +
    '<span class="cg-base">Now: <b>' + (base.pct == null ? "no marks yet" : base.pct + "%") + "</b>" + (base.marked ? " (" + base.at + " of " + base.marked + " marked)" : "") + "</span></div>";
  if (dom && irs && irs.n) {
    h += '<div class="row cg-form" style="margin-top:10px">' +
      '<label class="fld">iReady target (% on or above in ' + esc(cgDom(dom).name) + ')<input type="number" min="0" max="100" step="5" id="cg-irtarget" value="' + esc(d.irTarget == null ? "" : d.irTarget) + '" placeholder="leave blank to skip"></label>' +
      '<span class="cg-base">Now: <b>' + irs.pct + "%</b> (" + irs.on + " of " + irs.n + ")</span></div>";
  }
  h += '<label class="fld" style="margin-top:10px;display:flex">What we\u2019ll do<textarea id="cg-actions" rows="3" placeholder="e.g. Daily 10-minute number talk on making a ten; small-group reteach during math rotations; weekly exit ticket on the focus">' + esc(d.actions || "") + "</textarea></label>" +
    '<div class="cg-statement" id="cg-preview">' + esc(cgStatement(g)) + "</div>" +
    '<p class="hint">Suggested targets close about half of the gap; change them to whatever your team agrees on.</p>' +
    '<div class="row" style="margin-top:8px"><button class="btn primary" id="cg-start">Start this goal</button><button class="btn ghost" id="cg-cancel">Cancel</button></div></div>';
  return h;
}
function cgGoalHTML(g) {
  const now = cgGoalNow(g);
  let h = '<div class="card pad cg-goal" id="cg-goal" data-goal="' + esc(g.id) + '"><div class="sectionhead"><h2>Our class goal</h2><span class="spacer"></span>' +
    '<span class="hint">Started ' + esc(cgLongDate(g.started)) + "</span></div>" +
    '<p class="cg-statement">' + esc(cgStatement(g)) + "</p>";
  h += '<div class="cg-stats">' +
    '<div class="cg-stat"><span>Baseline</span><b>' + (g.base.pct == null ? "\u2013" : g.base.pct + "%") + "</b></div>" +
    '<div class="cg-stat cg-now"><span>Now</span><b>' + (now.st.pct == null ? "\u2013" : now.st.pct + "%") + "</b><i>" + now.st.at + " of " + now.st.marked + " marked</i></div>" +
    '<div class="cg-stat"><span>Target</span><b>' + g.target + "%</b><i>by " + esc(shortDate(g.due)) + "</i></div>";
  if (g.ir) {
    h += '<div class="cg-stat cg-irstat"><span>iReady ' + esc(cgDom(g.ir.dom).name) + "</span><b>" +
      (now.ir && now.ir.n ? now.ir.pct + "%" : "\u2013") + "</b><i>" +
      (g.ir.base && g.ir.base.pct != null ? "from " + g.ir.base.pct + "%" : "") + (g.ir.target != null ? (g.ir.base ? ", " : "") + "target " + g.ir.target + "%" : "") + "</i></div>";
  }
  h += "</div>";
  h += '<div class="notice ' + (now.pace === "behind" ? "warn" : now.pace === "met" || now.pace === "on" ? "ok" : "") + ' cg-pace" data-pace="' + now.pace + '"><b>' +
    ({ met: "Met", on: "On pace", behind: "Behind", early: "Early days", none: "No marks yet" }[now.pace]) + "</b><span>" + esc(cgPaceWords(g, now)) + "</span></div>";
  if (now.quiet >= 10 && g.due >= todayISO()) {
    h += '<div class="notice warn cg-quiet"><b>Quiet</b><span>No new classwork marks on the focus in ' + now.quiet + " days. A quick exit ticket keeps the line honest.</span></div>";
  }
  h += '<div class="cg-chartbox">' + cgChartSVG(g, false, phoneLayout()) + '<p class="hint">' + CG_KEY + "</p></div>";
  /* who is not there yet: on screen only, never on the printed sheet */
  const below = now.st.below.slice().sort((a, b) => a.m - b.m);
  h += '<div class="grid2" style="margin-top:12px"><div class="cg-who"><h3>Not at 3 yet <span class="tiny muted">' + below.length + "</span></h3>" +
    (below.length ? '<div class="namelist">' + below.map(x => "<span>" + nameLink(x.st, fullName(x.st)) + ' <span class="tiny muted">' + x.m.toFixed(1) + "</span></span>").join("") + "</div>" : '<p class="hint">Everyone marked is at 3 or higher.</p>') +
    "</div>" + '<div class="cg-who"><h3>No mark on the focus yet <span class="tiny muted">' + now.st.none.length + "</span></h3>" +
    (now.st.none.length ? '<div class="namelist">' + now.st.none.map(st => "<span>" + nameLink(st, fullName(st)) + "</span>").join("") + "</div>" : '<p class="hint">Every child has a mark.</p>') +
    '</div></div><p class="hint">These lists are for you: the printed sheet shows counts only.</p>';
  /* edit */
  h += '<div class="row cg-form" style="margin-top:12px"><label class="fld">Classwork target (%)<input type="number" min="0" max="100" step="5" id="cg-g-target" value="' + g.target + '"></label>' +
    (g.ir ? '<label class="fld">iReady target (%)<input type="number" min="0" max="100" step="5" id="cg-g-irtarget" value="' + (g.ir.target == null ? "" : g.ir.target) + '"></label>' : "") +
    '<label class="fld">Goal date<input type="date" id="cg-g-due" value="' + esc(g.due) + '"></label></div>';
  h += '<label class="fld" style="margin-top:10px;display:flex">What we\u2019re doing<textarea id="cg-g-actions" rows="3">' + esc(g.actions || "") + "</textarea></label>";
  /* check-ins */
  h += '<h3 style="margin-top:14px">Check-ins</h3><div class="cg-notes">' +
    ((g.notes || []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).map(n =>
      '<div class="cg-note" data-note="' + esc(n.id) + '"><span class="cg-ndate">' + esc(shortDate(n.date)) + "</span><span>" + esc(n.text) +
      '</span><button class="btn sm ghost cg-delnote" data-note="' + esc(n.id) + '" title="Delete this check-in">\u00d7</button></div>').join("") || '<p class="hint">None yet. A line after each PLC or data meeting makes the printed sheet tell the story.</p>') +
    '</div><div class="row" style="margin-top:8px"><input type="date" id="cg-n-date" value="' + todayISO() + '" style="max-width:160px">' +
    '<input type="text" id="cg-n-text" placeholder="What we saw, what we changed (no student names: this prints)" style="flex:1;min-width:200px">' +
    '<button class="btn" id="cg-n-add">Add</button></div>';
  h += '<div class="row" style="margin-top:14px"><button class="btn primary" id="cg-print">Print goal sheet</button><span class="spacer" style="flex:1"></span>' +
    '<button class="btn" id="cg-finish">Finish this goal</button><button class="btn danger" id="cg-delete">Delete</button></div></div>';
  return h;
}
function cgPastHTML() {
  const done = (S.goals || []).filter(g => g.done).sort((a, b) => (b.done.date || "").localeCompare(a.done.date || ""));
  if (!done.length) return "";
  return '<div class="card pad cg-past"><h2>Past goals</h2>' + done.map(g =>
    '<div class="cg-pastrow" data-goal="' + esc(g.id) + '"><p>' + (g.group ? '<span class="tag">Group</span> ' : "") + esc(cgStatement(g)) + "</p><p class=\"hint\">Finished " + esc(cgLongDate(g.done.date)) +
    ": classwork " + (g.done.pct == null ? "\u2013" : g.done.pct + "%") + " against " + g.target + "% (" + (g.done.pct != null && g.done.pct >= g.target ? "met" : "not met") + ")" +
    (g.ir && g.done.irPct != null ? "; iReady " + g.done.irPct + "%" + (g.ir.target != null ? " against " + g.ir.target + "%" : "") : "") + ".</p></div>").join("") + "</div>";
}
function renderClassGoal() {
  const el = document.getElementById("panel-goal");
  if (!S.students.length) return noStudents(el);
  if (UI.cgWin == null) UI.cgWin = "0";
  const g = cgActive(), nd = cgNeeds(UI.cgWin);
  let h = '<div class="stack"><div class="card pad noprint"><div class="row">' +
    '<h2 style="margin:0">Class goal \u00b7 Math</h2><span class="spacer" style="flex:1"></span>' +
    '<label class="fld">Classwork from<select id="cg-win"><option value="0"' + (UI.cgWin === "0" ? " selected" : "") + '>All year</option><option value="45"' + (UI.cgWin === "45" ? " selected" : "") + '>Last 45 days</option><option value="21"' + (UI.cgWin === "21" ? " selected" : "") + ">Last 3 weeks</option></select></label>" +
    (g ? "" : '<button class="btn" id="cg-printneeds">Print needs</button>') + "</div>" +
    (UI.subject !== "Math" ? '<p class="hint" style="margin-top:6px">This tab looks at Math whatever the subject switch says.</p>' : "") + "</div>";
  if (g) h += cgGoalHTML(g) + '<div class="divider"></div>' + cgNeedsHTML(nd, false);
  else h += cgNeedsHTML(nd, true) + '<div class="divider"></div>' + cgDraftHTML();
  h += '<div class="divider"></div>' + ygHTML() + '<div class="divider"></div>' + ggHTML() + cgPastHTML() + "</div>";
  el.innerHTML = h;
  cgWire(g);
  ygWire();
  ggWire();
}
function cgWire(g) {
  const $ = id => document.getElementById(id);
  $("cg-win").onchange = e => { UI.cgWin = e.target.value; renderClassGoal(); };
  document.querySelectorAll("#panel-goal .cg-pick").forEach(b => b.onclick = () => {
    UI.cgDraft = cgDraftFrom(b.dataset.kind, b.dataset.key);
    renderClassGoal();
    const d = $("cg-draft"); if (d && d.scrollIntoView) d.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  if ($("cg-printneeds")) $("cg-printneeds").onclick = printClassGoal;
  if ($("cg-blank")) $("cg-blank").onclick = () => {
    const nd = cgNeeds(UI.cgWin), top = nd.ranked[0];
    UI.cgDraft = top ? cgDraftFrom("std", top.code) : cgDraftFrom("dom", (nd.ir[0] || CG_DOMAINS[0]).key);
    renderClassGoal();
  };
  if ($("cg-draft")) {
    const d = UI.cgDraft;
    $("cg-focus").onchange = e => {
      const [k, key] = e.target.value.split(":");
      const nd = cgDraftFrom(k, key);
      nd.due = d.due; nd.actions = d.actions;
      UI.cgDraft = nd; renderClassGoal();
    };
    const preview = () => {
      const codes = cgFocusCodes(d.kind, d.key), dom = cgFocusDomain(d.kind, d.key);
      const base = cgClassStat(codes, null, null), irs = dom ? cgIrStat(dom) : null;
      $("cg-preview").textContent = cgStatement({ focus: { kind: d.kind, key: d.key }, due: d.due, started: todayISO(), target: Number(d.target) || 0,
        base: { pct: base.pct }, ir: dom && irs && irs.n && d.irTarget != null && d.irTarget !== "" ? { dom: dom, base: { pct: irs.pct }, target: Number(d.irTarget) } : null });
    };
    $("cg-due").oninput = e => { d.due = e.target.value; preview(); };
    $("cg-target").oninput = e => { d.target = e.target.value; preview(); };
    if ($("cg-irtarget")) $("cg-irtarget").oninput = e => { d.irTarget = e.target.value; preview(); };
    $("cg-actions").oninput = e => { d.actions = e.target.value; };
    $("cg-start").onclick = cgStartGoal;
    $("cg-cancel").onclick = () => { UI.cgDraft = null; renderClassGoal(); };
  }
  if (g) {
    const clamp = v => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
    $("cg-g-target").onchange = e => { g.target = clamp(e.target.value); save(); renderClassGoal(); };
    if ($("cg-g-irtarget")) $("cg-g-irtarget").onchange = e => { g.ir.target = e.target.value === "" ? null : clamp(e.target.value); save(); renderClassGoal(); };
    $("cg-g-due").onchange = e => {
      if (!e.target.value || e.target.value <= g.started) { toast("The goal date needs to be after the start"); e.target.value = g.due; return; }
      g.due = e.target.value; save(); renderClassGoal();
    };
    $("cg-g-actions").onchange = e => { g.actions = e.target.value; save(); };
    $("cg-n-add").onclick = () => {
      const t = $("cg-n-text").value.trim(), d = $("cg-n-date").value || todayISO();
      if (!t) { toast("Write a line first"); return; }
      g.notes = (g.notes || []).concat([{ id: uid(), date: d, text: t }]);
      save(); renderClassGoal();
    };
    $("cg-n-text").onkeydown = e => { if (e.key === "Enter") $("cg-n-add").click(); };
    document.querySelectorAll("#panel-goal .cg-delnote").forEach(b => b.onclick = () => {
      g.notes = (g.notes || []).filter(n => n.id !== b.dataset.note); save(); renderClassGoal();
    });
    $("cg-print").onclick = printClassGoal;
    $("cg-finish").onclick = () => {
      if (!confirm("Finish this goal? Its final numbers are kept under Past goals, and you can set a new one.")) return;
      const now = cgGoalNow(g);
      g.done = { date: todayISO(), pct: now.st.pct, irPct: now.ir && now.ir.n ? now.ir.pct : null };
      save(); renderClassGoal();
    };
    $("cg-delete").onclick = () => {
      if (!confirm("Delete this goal and its check-ins? This cannot be undone.")) return;
      S.goals = S.goals.filter(x => x.id !== g.id); save(); renderClassGoal();
    };
  }
}

/* ---- the printed sheet: one page, black and white, no names ---- */
function cgSheetHTML() {
  const g = cgActive(), nd = cgNeeds(UI.cgWin || "0");
  const who = S.settings.teacher ? esc(S.settings.teacher) + " \u00b7 " : "";
  let h = '<article class="cgsheet"><div class="cf-head"><div><h1 class="cf-name">' + (g ? "Class math goal" : "Class math needs") + "</h1>" +
    '<div class="cf-sub">' + who + esc(S.settings.year || "") + " \u00b7 " + S.students.length + " students</div></div>" +
    '<div class="cf-meta">Printed ' + esc(cgLongDate(todayISO())) + "</div></div>";
  if (g) {
    const now = cgGoalNow(g);
    h += '<p class="cg-s-goal">' + esc(cgStatement(g)) + "</p>";
    h += '<table class="cf-table cg-s-nums"><thead><tr><th>Measure</th><th class="cf-c">Baseline</th><th class="cf-c">Now</th><th class="cf-c">Target</th></tr></thead><tbody>' +
      "<tr><td>Classwork: at 3 or higher on the focus</td><td class=\"cf-c\">" + (g.base.pct == null ? "\u2013" : g.base.pct + "%") + '</td><td class="cf-c">' +
      (now.st.pct == null ? "\u2013" : now.st.pct + "%") + " <span class=\"cg-s-n\">(" + now.st.at + "/" + now.st.marked + ')</span></td><td class="cf-c">' + g.target + "%</td></tr>" +
      (g.ir ? "<tr><td>iReady: on or above grade level in " + esc(cgDom(g.ir.dom).name) + '</td><td class="cf-c">' + (g.ir.base && g.ir.base.pct != null ? g.ir.base.pct + "%" : "\u2013") +
        '</td><td class="cf-c">' + (now.ir && now.ir.n ? now.ir.pct + "% <span class=\"cg-s-n\">(" + now.ir.on + "/" + now.ir.n + ")</span>" : "\u2013") + '</td><td class="cf-c">' + (g.ir.target == null ? "\u2013" : g.ir.target + "%") + "</td></tr>" : "") +
      "</tbody></table>";
    h += '<p class="cf-says"><b>' + ({ met: "Met.", on: "On pace.", behind: "Behind pace.", early: "Early days.", none: "No marks yet." }[now.pace]) + "</b> " + esc(cgPaceWords(g, now).replace(/^[^.]*\.\s*/, "")) + "</p>";
    h += cgChartSVG(g, true).replace('class="cg-chart"', 'class="cg-chart cf-chart"') + '<p class="cf-key">' + CG_KEY + "</p>";
    if (g.actions) h += '<h3 class="cg-s-h">What we\u2019re doing</h3><p class="cg-s-text">' + esc(g.actions).replace(/\n/g, "<br>") + "</p>";
    const all = (g.notes || []).slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const notes = all.slice(-4);   /* the four most recent keep it to one page */
    if (notes.length) h += '<h3 class="cg-s-h">Check-ins' + (all.length > notes.length ? ' <span class="cg-s-n">(the latest ' + notes.length + " of " + all.length + ")</span>" : "") + '</h3><table class="cf-table">' + notes.map(n => '<tr><td style="width:70px">' + esc(shortDate(n.date)) + "</td><td>" + esc(n.text) + "</td></tr>").join("") + "</table>";
  }
  /* the needs, counts only */
  h += '<h3 class="cg-s-h">' + (g ? "Where the class stands now" : "Where the class needs the most help") + '</h3><div class="cg-s-two"><div>';
  const top = nd.ranked.slice(0, g ? 3 : 8);
  h += top.length ? '<table class="cf-table cg-s-needs"><thead><tr><th>Classwork standard</th><th class="cf-c">At 3+</th><th class="cf-c">Below 3</th></tr></thead><tbody>' +
    top.map(r => '<tr><td>' + esc(dispCode(r.code)) + " " + esc(byCode[r.code].lbl) + '</td><td class="cf-c">' + r.stat.pct + '%</td><td class="cf-c">' + r.stat.below.length + "/" + r.stat.marked + "</td></tr>").join("") + "</tbody></table>"
    : '<p class="cf-none">Not enough classwork marks to rank yet.</p>';
  h += "</div><div>";
  if (nd.ir.length) {
    h += '<table class="cf-table cg-s-ir"><thead><tr><th>iReady domain</th><th class="cf-c">On/ above</th><th class="cf-c">1 below</th><th class="cf-c">2+ below</th></tr></thead><tbody>' +
      nd.ir.map(d => "<tr><td>" + esc(d.name) + '</td><td class="cf-c">' + d.pct + '%</td><td class="cf-c">' + d.one + '</td><td class="cf-c">' + d.two + "</td></tr>").join("") + "</tbody></table>";
  } else h += '<p class="cf-none">No iReady math results yet.</p>';
  return h + "</div></div></article>";
}
function printClassGoal() {
  document.getElementById("printsheet").innerHTML = cgSheetHTML();
  const t = document.getElementById("toast");
  if (t) { clearTimeout(toastT); t.classList.remove("show"); t.style.display = "none"; }
  suitePrint();
  if (t) t.style.display = "";
}

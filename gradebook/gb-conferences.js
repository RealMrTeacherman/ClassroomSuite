/* gradebook/gb-conferences.js — Conferences: the one-page family sheet.
   One of the gradebook's scripts, loaded in order by index.html as classic
   scripts sharing one global scope; see HANDOFF "The gradebook's files". */
/* ============================================================
   CONFERENCES (v121; v146 report card, iReady and home focus; v153 bar graph,
   three-box ratings)
   One sheet per child for a parent conference, black on white. v146 (his
   layout "B"): a section per subject, Reading first, each with the child's
   latest iReady diagnostic placement, the report card mark for every
   standard that has one so far (finalStd: the Report card tab's mark, an
   override if set; a standard with no mark yet is left off), and one area
   to work on at home with a few steps. Reading also carries the ORF line.
   Nothing is stored: every line is read from what the gradebook and the
   ORF tool already hold. Both subjects always, whatever the Math/ELA/Both
   switch says: a family hears about both.

   The home focus (confFocus): the lowest report card mark of 2 or below
   among the standards that have an area, ties to the area whose iReady
   domain placed lowest, then catalog order. No mark that low: the lowest
   iReady domain placed below grade level. Neither: "keep going". Writing,
   conventions and speaking marks are on the sheet but never chosen: he
   asked for reading and math. A different focus can be picked per child
   on screen (UI.confFocus, this session only); paper shows the result.
   ============================================================ */
/* v153 styles for the rating boxes, set here so the change ships
   in this file alone */
(function () {
  const st = document.createElement("style");
  st.textContent = ".cf-rated th.cf-r,.cf-rated td.cf-r{text-align:center;width:78px;padding-left:4px;padding-right:4px}" +
    ".cf-rated th.cf-r{font-size:11.5px;line-height:1.15;vertical-align:bottom}.cf-box{display:inline-block;vertical-align:middle}" +
    "@media (max-width:760px){.cf-rated th.cf-r,.cf-rated td.cf-r{width:54px;padding-left:2px;padding-right:2px}.cf-rated th.cf-r{font-size:10.5px}}" +
    /* v154 the conference schedule card */
    ".cs-in{width:100%;min-height:84px;box-sizing:border-box;font:inherit;font-size:13px;padding:8px;border:1px solid var(--line-strong);border-radius:var(--radius-sm);background:var(--panel);color:var(--ink)}" +
    ".cs-acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px}.cs-busy{font-size:13px;color:var(--ink-2)}" +
    ".cs-day{margin:14px 0 4px;font-size:13px;font-weight:600}.cs-list{width:100%;border-collapse:collapse;font-size:13px}" +
    ".cs-list td{padding:5px 8px 5px 0;border-bottom:1px solid var(--line);vertical-align:middle}.cs-list{table-layout:fixed}.cs-list td.cs-t{white-space:nowrap;width:76px;font-variant-numeric:tabular-nums}.cs-list td:nth-child(2){width:220px}" +
    ".cs-list td.cs-raw{color:var(--ink-3);font-size:12px}.cs-list select{max-width:100%}.cs-list tr.cs-miss td{background:color-mix(in srgb,var(--accent) 7%,transparent)}" +
    "@media (max-width:760px){.cs-list td.cs-raw{display:none}.cs-list td:nth-child(2){width:auto}.cs-list select{font-size:16px}}";
  document.head.appendChild(st);
})();
const CONF_SUBJECTS = [["ELA", "Reading, writing, and language"], ["Math", "Math"]];
function confTerm() {
  const want = UI.confTerm || studentTermNow();
  return S.terms.find(t => t.id === want) || termOf(want);
}
function confWords(code) { return PARENT_WORDS[code] || (byCode[code] ? byCode[code].lbl : code); }
/* the standards on this child's report card so far, by subject: every
   standard switched on (a sub-standard as its parent) that has a mark */
function confStandards(st, term) {
  return CONF_SUBJECTS.map(([subj, label]) => {
    const codes = [];
    activeCodes(subj).forEach(c => { const p = rcParent(c); if (!codes.includes(p)) codes.push(p); });
    const order = CATALOG.map(s => s.c);
    codes.sort((x, y) => order.indexOf(x) - order.indexOf(y));
    const rows = [];
    codes.forEach(c => {
      /* no iReady on the sheet (his iReady report goes home on its
         own). A row needs real grades (assignments, ORF) or a mark he set:
         a mark filled from iReady alone is left off. */
      const f = finalStd(st.id, c, term);
      if (f.v && !f.ir && (f.over || rcGraded(st.id, c, term))) rows.push({ code: c, words: confWords(c), v: f.v });
    });
    return { subj: subj, label: label, rows: rows };
  });
}
/* ---- at home. Each area in a family's words, with things most homes
   have. Keys are stable (UI.confFocus holds them). ---- */
const CONF_HOME = {
  sounds: { s: "ELA", t: "Hearing the sounds in words", steps: [
    "Say a word like “stamp” and tap a finger for each sound: s-t-a-m-p.",
    "Play “change one sound”: cat, bat, bit, bin. Say each new word together.",
    "Clap the syllables in family names and favorite foods."] },
  phonics: { s: "ELA", t: "Sounding out new words", steps: [
    "Practice sounding out unfamiliar or challenging words in stories and wherever words are found."] },
  fluency: { s: "ELA", t: "Reading smoothly", steps: [
    "Read the same short page three times this week. Notice together how it gets smoother.",
    "Practice reading out loud with expression."] },
  stories: { s: "ELA", t: "Understanding stories", steps: [
    "After a story, ask: Who was in it? What was the problem? How did it end?",
    "Stop partway and ask, “What do you think will happen next? Why?”",
    "Have your child retell the story to someone else using first, then, finally."] },
  nonfiction: { s: "ELA", t: "Learning from nonfiction", steps: [
    "While reading a book about a topic your child is interested in, ask them what new things they learned.",
    "Before reading, look at the pictures and headings together and guess what you’ll learn."] },
  vocab: { s: "ELA", t: "Learning new words", steps: [
    "When a book has a new word, figure out together what it might mean from the sentence and pictures.",
    "Play “same and opposite”: you say a word, your child gives one that means the same and one that means the opposite."] },
  readmore: { s: "ELA", t: "Keep reading every day", steps: [
    "Start digging into some more challenging chapter books!"] },
  facts: { s: "Math", t: "Adding and subtracting within 20", steps: [
    "Practice a few facts whenever you have a second: “What’s 8 + 7? How did you know?”",
    "Practice making 10, “punching in” numbers, and counting up and back (start with 8, count 7 more)."] },
  story: { s: "Math", t: "Solving story problems", steps: [
    "Make up story problems from your day: “We had 14 grapes and ate 6. How many are left?”",
    "Switch roles: your child makes up a problem for you to solve."] },
  groups: { s: "Math", t: "Odd and even numbers and equal groups", steps: [
    "Pair up socks or spoons. If every one has a partner, the number is even.",
    "Set snacks out in rows (3 rows of 4) and add the rows to find the total."] },
  placevalue: { s: "Math", t: "Hundreds, tens, and ones", steps: [
    "Check in on place value when looking at prices: “Oh, this Switch 2 is 450 dollars. How many hundreds?”",
    "Challenge your child to count by 5s, 10s, and 100s in the car or wherever counting makes sense."] },
  bignum: { s: "Math", t: "Adding and subtracting bigger numbers", steps: [
    "Add two prices on a menu or receipt: the tens first, then the ones.",
    "Ask “What is 10 more? 10 less? 100 more?” when you see numbers out and about."] },
  measure: { s: "Math", t: "Measuring length", steps: [
    "Measure things around the house with a ruler or tape measure, in inches and centimeters.",
    "Guess first, then measure: “How long is the table? How close was your guess?”"] },
  timemoney: { s: "Math", t: "Telling time and counting money", steps: [
    "Read a clock with hands together a few times a day, to the nearest 5 minutes.",
    "Count a handful of coins: start with the quarters, then dimes, nickels, and pennies."] },
  shapes: { s: "Math", t: "Shapes and equal parts", steps: [
    "Name shapes you see: how many sides and corners does each have?",
    "Cut a sandwich or tortilla into halves, thirds, or fourths and name the pieces."] },
  data: { s: "Math", t: "Reading graphs", steps: [
    "Make a tally chart at home (favorite fruit, cars that pass by) and talk about which has the most."] },
  mathtalk: { s: "Math", t: "Math in everyday life", steps: [
    "Ask “How many more?” and “How did you know?” while counting things together.",
    "Play board or card games that use counting and adding."] }
};
/* a report card standard's home area, or null (writing, conventions,
   speaking: on the sheet, never the focus) */
const CONF_AREA_RULES = [[/^\d\.RF\.2$/, "sounds"], [/^\d\.RF\.3$/, "phonics"], [/^\d\.RF\.4$/, "fluency"],
  [/^\d\.RL\./, "stories"], [/^\d\.RI\./, "nonfiction"], [/^\d\.L\.[456]$/, "vocab"],
  [/^\d\.OA\.B\.2$/, "facts"], [/^\d\.(OA\.A\.1|GM\.C\.8)$/, "story"], [/^\d\.OA\.C\./, "groups"],
  [/^\d\.NBT\.A\./, "placevalue"], [/^\d\.NBT\.B\./, "bignum"], [/^\d\.GM\.D\./, "timemoney"],
  [/^\d\.GM\.A\./, "shapes"], [/^\d\.GM\./, "measure"], [/^\d\.DR\./, "data"]];
function confAreaOf(code) { const r = CONF_AREA_RULES.find(x => x[0].test(code)); return r ? r[1] : null; }
/* iReady's domains, foundations first, and the home area each points to */
const CONF_DOMS = {
  ELA: [["pa", /phonological/, "sounds"], ["phonics", /\bphonics\b/, "phonics"], ["hfw", /high.?frequency/, "phonics"],
        ["vocab", /vocab/, "vocab"], ["lit", /literature/, "stories"], ["info", /informational/, "nonfiction"]],
  Math: [["num", /number/, "placevalue"], ["alg", /algebra/, "facts"], ["md", /measurement/, "measure"], ["geo", /geometry/, "shapes"]]
};
const CONF_AREA_DOM = { sounds: "pa", phonics: "phonics", stories: "lit", nonfiction: "info", vocab: "vocab",
  facts: "alg", story: "alg", groups: "alg", placevalue: "num", bignum: "num", measure: "md", timemoney: "md", shapes: "geo", data: "md" };
/* the child's latest iReady diagnostic in this subject, up to the term's end */
function confIready(st, term, subj) {
  return S.iready.filter(r => r.sid === st.id && r.subject === subj && (!r.date || r.date <= term.end))
    .sort((a, b) => (a.date || "").localeCompare(b.date || "")).slice(-1)[0] || null;
}
function confDomRank(rec, subj, dk) {
  const d = (CONF_DOMS[subj] || []).find(x => x[0] === dk);
  if (!rec || !d) return null;
  const k = Object.keys(rec.domains || {}).find(k => d[1].test(normHdr(k)));
  return k ? placementRank((rec.domains[k] || {}).p) : null;
}
function confRankWords(r) {
  if (r == null) return "";
  if (r > 0) return "above grade level";
  if (r === 0) return "on grade level";
  if (r === -1) return "one grade level below";
  return Math.abs(r) + " grade levels below";
}
/* the area to work on at home: { area, from: "mark" | "iready" | "none" } */
function confFocus(st, term, subj, rows) {
  const rec = confIready(st, term, subj);
  const cand = rows.map((r, i) => ({ v: r.v, i: i, area: confAreaOf(r.code) })).filter(x => x.area && CONF_HOME[x.area].s === subj);
  const low = cand.length ? Math.min.apply(null, cand.map(x => x.v)) : 9;
  if (low <= 2) {
    const rk = x => { const r = confDomRank(rec, subj, CONF_AREA_DOM[x.area]); return r == null ? 0 : r; };
    const pick = cand.filter(x => x.v === low).sort((a, b) => rk(a) - rk(b) || a.i - b.i)[0];
    return { area: pick.area, from: "mark" };
  }
  let best = null;
  (CONF_DOMS[subj] || []).forEach(d => {
    const r = confDomRank(rec, subj, d[0]);
    if (r != null && r < 0 && (!best || r < best.r)) best = { r: r, area: d[2] };
  });
  if (best) return { area: best.area, from: "iready" };
  return { area: subj === "ELA" ? "readmore" : "mathtalk", from: "none" };
}
/* the child's reading plan from the ORF tool: of the ORF students linked to
   this child, the one read most recently */
function confReading(st, now) {
  if (!orfGoalsReady()) return null;
  let db = null;
  try { db = JSON.parse(localStorage.getItem("running-records-v1") || "null"); } catch (e) { db = null; }
  if (!db || !Array.isArray(db.students) || !Array.isArray(db.records)) return null;
  const G = window.SuiteOrf.goals, gs = orfGoalsForPlans(), comp = orfCompState();
  let best = null;
  db.students.filter(o => o && o.id && !o.demo && (orfStudentToLocal(o.id, db) || {}).id === st.id).forEach(o => {
    let pl = null;
    try { pl = G.planFor(db, o.id, gs, now, comp); } catch (e) { pl = null; }
    if (pl && (!best || pl.latest.t > best.latest.t)) best = pl;
  });
  return best;
}
/* what the line says, to a family: no percentiles, no "aim line" */
function confReadingWords(st, pl, now) {
  const G = window.SuiteOrf.goals, first = String(st.first || "").trim() || "Your child";
  const goal = pl.goal + (pl.comp ? ", answering all three questions about the passage" : "");
  const by = G.fmtLong(pl.goalDate);
  if (pl.result) {
    let s = first + " read " + pl.springActual + " words a minute at the spring check. The goal was " + goal + ".";
    if (pl.result === "green") s += " Goal met.";
    else if (pl.result === "blue") s += " That met the start-of-year goal of " + pl.boySpring + ".";
    return s;
  }
  if (pl.status === "start") return first + "’s first reading check this year was " + pl.base + " words a minute. The goal by " + by + " is " + goal + ".";
  let s = first + " went from " + pl.base + " to " + pl.latestY + " words a minute. The goal by " + by + " is " + goal + ".";
  if (pl.status === "met") s += " " + first + " has already reached it.";
  else if (pl.status === "metBoy") s += " That’s past the start-of-year goal of " + pl.boySpring + ".";
  else if (pl.status === "on") s += " That’s on track.";
  else if (pl.status === "close") s += " That’s just under the pace for the goal.";
  else if (pl.status === "below" && pl.perWeekNow != null) s += " Reaching it means growing about " + Math.max(1, Math.round(pl.perWeekNow)) + " words a minute each week.";
  if (pl.winterDue && pl.winterGoal != null && pl.winterActual == null && now.getTime() < pl.winterDue.getTime())
    s += " Mid-year checkpoint: " + pl.winterGoal + " by " + G.fmtLong(pl.winterDue) + ".";
  return s;
}
/* v153 (his ask): the reading checks as a bar graph, one bar per check day
   (that day's median, as the ORF tab plots it), oldest first, each bar
   labelled with its score and date, and a dotted line across at the
   child's end-of-year goal so a family sees how far there is to go. Bars
   start at 0. Gray bars, black outline: reads in black and white. */
function confChartSVG(pl) {
  const G = window.SuiteOrf.goals;
  const days = [];
  pl.checks.forEach(c => { if (!days.includes(c.t)) days.push(c.t); });
  days.sort((a, b) => a - b);
  const bars = days.map(t => {
    const ys = pl.checks.filter(c => c.t === t).map(c => c.y).sort((a, b) => a - b);
    return { t: t, v: Math.round(ys[Math.floor(ys.length / 2)]) };
  });
  const top = Math.max.apply(null, bars.map(b => b.v).concat([pl.goal]));
  const step = top > 120 ? 40 : 20;
  const yMax = Math.ceil(top * 1.15 / step) * step;
  const W = 720, H = 170, L = 34, R = 84, T = 10, B = 24;
  const n = Math.max(bars.length, 1), slot = (W - L - R) / Math.max(n, 4);
  const bw = Math.min(56, slot * 0.68);
  const X = i => L + slot * (i + 0.5), Y = v => T + (H - T - B) * (1 - v / yMax);
  let g = '<svg class="cf-chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Reading checks in words per minute, with the end-of-year goal of ' + pl.goal + '">';
  for (let v = 0; v <= yMax; v += step) {
    g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" stroke="' + (v ? "#D4D4D4" : "#000") + '" stroke-width="' + (v ? 0.75 : 1) + '"/>' +
      '<text x="' + (L - 6) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="#444">' + v + "</text>";
  }
  const every = slot < 34 ? Math.ceil(34 / slot) : 1;
  bars.forEach((b, i) => {
    const x = X(i) - bw / 2, y = Y(b.v);
    g += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (Y(0) - y).toFixed(1) + '" fill="#A6A6A6" stroke="#000" stroke-width="1"><title>' + G.fmtShort(new Date(b.t)) + ": " + b.v + "</title></rect>";
    if (slot >= 20) g += '<text x="' + X(i).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="600" fill="#000">' + b.v + "</text>";
    if (i % every === 0 || i === bars.length - 1) g += '<text x="' + X(i).toFixed(1) + '" y="' + (H - 7) + '" text-anchor="middle" font-size="11" fill="#444">' + G.fmtShort(new Date(b.t)) + "</text>";
  });
  const gy = Y(pl.goal).toFixed(1);
  g += '<line x1="' + L + '" x2="' + (W - R + 4) + '" y1="' + gy + '" y2="' + gy + '" stroke="#000" stroke-width="2" stroke-dasharray="2 4" stroke-linecap="round"/>' +
    '<text x="' + (W - R + 8) + '" y="' + (+gy - 2).toFixed(1) + '" font-size="11" font-weight="700" fill="#000">Goal: ' + pl.goal + "</text>" +
    '<text x="' + (W - R + 8) + '" y="' + (+gy + 11).toFixed(1) + '" font-size="10.5" fill="#444">by ' + G.fmtShort(pl.goalDate) + "</text>";
  return g + "</svg>";
}
/* report card marks in a family's words (v153, his three): 3 and 4 are
   "Got it", 2 "Working on it", 1 "Needs some help". Shown as a row of three
   boxes, the one that applies filled in. */
const CONF_RATE = [["got", "Got it"], ["working", "Working on it"], ["help", "Needs some help"]];
function confRate(v) { return v >= 3 ? "got" : v === 2 ? "working" : "help"; }
function confBox(on, label) {
  return '<svg class="cf-box" viewBox="0 0 16 16" width="16" height="16" role="img" aria-label="' + (on ? label : "not " + label) + '">' +
    '<rect x="1" y="1" width="14" height="14" rx="2" fill="' + (on ? "#000" : "#fff") + '" stroke="#000" stroke-width="1.5"/>' +
    (on ? '<path d="M4 8.3l2.7 2.7L12 5.4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' : "") + "</svg>";
}
function confFocusKey(st, subj) { return st.id + "|" + subj; }
function confSubjectHTML(st, term, now, g, paper) {
  
  let h = '<section class="cf-subj" data-subj="' + g.subj + '"><h3 class="cf-subjhead">' + esc(g.label) + "</h3>";
  if (g.subj === "ELA") {
    const pl = confReading(st, now);
    if (pl) {
      /* v153: no key or sentence under it, at his ask: the bars and the
         goal line speak for themselves */
      h += '<div class="cf-reading"><h4 class="cf-minor">Reading fluency</h4><p class="cf-hint">Words read correctly in one minute</p>' + confChartSVG(pl) + "</div>";
    }
  }
  if (g.rows.length) {
    h += '<table class="cf-table cf-rated"><thead><tr><th>Skills taught so far</th>' + CONF_RATE.map(x => '<th class="cf-r">' + x[1] + "</th>").join("") + "</tr></thead><tbody>" +
      g.rows.map(r => { const k = confRate(r.v); return '<tr data-std="' + esc(r.code) + '" data-rate="' + k + '"><td>' + esc(r.words) + "</td>" +
        CONF_RATE.map(x => '<td class="cf-r">' + confBox(x[0] === k, x[1]) + "</td>").join("") + "</tr>"; }).join("") +
      "</tbody></table>";
  } else h += '<p class="cf-none">No report card marks yet.</p>';
  const auto = confFocus(st, term, g.subj, g.rows), key = confFocusKey(st, g.subj);
  const chosen = UI.confFocus && UI.confFocus[key] && CONF_HOME[UI.confFocus[key]] && CONF_HOME[UI.confFocus[key]].s === g.subj ? UI.confFocus[key] : "";
  const area = chosen || auto.area, a = CONF_HOME[area];
  h += '<div class="cf-home" data-area="' + area + '"><div class="cf-homehead">Focus at home: ' + esc(a.t) + "</div><ul>" +
    a.steps.map(x => "<li>" + esc(x) + "</li>").join("") + "</ul></div>";
  if (!paper) {
    const why = { mark: "lowest report card mark", iready: "lowest iReady area", none: "no area below grade level" }[auto.from];
    h += '<label class="cf-pick noprint">Focus<select data-cf-focus="' + esc(key) + '">' +
      '<option value="">Picked for you: ' + esc(CONF_HOME[auto.area].t) + " (" + why + ")</option>" +
      Object.keys(CONF_HOME).filter(k => CONF_HOME[k].s === g.subj && k !== auto.area).map(k =>
        '<option value="' + k + '"' + (k === chosen ? " selected" : "") + ">" + esc(CONF_HOME[k].t) + "</option>").join("") + "</select></label>";
  }
  return h + "</section>";
}
function confSheetHTML(st, term, now, paper, slot) {
  const teacher = String(S.settings.teacher || "").trim();
  let h = '<article class="confsheet" data-sid="' + esc(st.id) + '">' +
    '<header class="cf-head"><div><h2 class="cf-name">' + esc(fullName(st)) + "</h2>" +
    '<div class="cf-sub">Grade 2 · ' + esc(term.name) + " conference" + (slot ? " · " + esc(csWhen(slot)) : "") + "</div></div>" +
    '<div class="cf-meta">' + (teacher ? esc(teacher) + "<br>" : "") + esc(window.SuiteOrf ? window.SuiteOrf.goals.fmtLong(now) + ", " + now.getFullYear() : todayISO()) + "</div></header>";
  const groups = confStandards(st, term);
  groups.forEach(g => { h += confSubjectHTML(st, term, now, g, paper); });
  if (groups.some(g => g.rows.length)) h += '<p class="cf-key">“Got it” means meeting the end-of-year grade 2 standard already. “Working on it” means getting there. “Needs some help” means extra practice will help most. Each comes from the grades so far.</p>';
  return h + "</article>";
}
/* who gets a sheet, in order: [{ st, slot }]. "sched" (or "sched:<day>")
   is conference order from the schedule; otherwise the class A-Z or one child */
function confRoster() {
  const w = UI.confWho || "all";
  if (w.indexOf("sched") === 0) {
    const day = w.slice(6), byId = {};
    S.students.forEach(s => { byId[s.id] = s; });
    return csSlots().filter(x => byId[x.sid] && (!day || x.date === day)).map(x => ({ st: byId[x.sid], slot: x }));
  }
  const all = sortedStudents();
  return (w !== "all" ? all.filter(s => s.id === w) : all).map(st => ({ st: st, slot: null }));
}
function renderConferences() {
  const el = document.getElementById("panel-conf");
  if (!S.students.length) return noStudents(el);
  const days = csDays();
  /* conference order is the default once there is a schedule */
  if (UI.confWho == null && csSlots().some(x => byIdOk(x.sid))) UI.confWho = "sched";
  const w = UI.confWho || "all";
  if (w.indexOf("sched") === 0 ? !csSlots().length || (w.length > 5 && !days.some(d => d.date === w.slice(6)))
      : w !== "all" && !S.students.find(s => s.id === w)) UI.confWho = csSlots().length ? "sched" : "all";
  const term = confTerm(), now = new Date();
  const roster = sortedStudents(), who = UI.confWho || "all", many = confRoster().length;
  let h = '<div class="stack">' + csCardHTML() + '<div class="card pad noprint"><div class="row">' +
    '<label class="fld">Term<select id="cf-term">' + S.terms.map(t => '<option value="' + t.id + '"' + (t.id === term.id ? " selected" : "") + ">" + esc(t.name) + "</option>").join("") + "</select></label>" +
    '<label class="fld">Sheets<select id="cf-who">' +
    (csSlots().length ? '<optgroup label="Conference order"><option value="sched"' + (who === "sched" ? " selected" : "") + ">All conferences, in order</option>" +
      days.filter(d => d.date).map(d => '<option value="sched:' + d.date + '"' + (who === "sched:" + d.date ? " selected" : "") + ">" + esc(d.label) + " (" + d.n + ")</option>").join("") + "</optgroup>" : "") +
    '<optgroup label="Class"><option value="all"' + (who === "all" ? " selected" : "") + ">Whole class, A\u2013Z</option>" +
    roster.map(s => '<option value="' + s.id + '"' + (s.id === who ? " selected" : "") + ">" + esc(s.last + ", " + s.first) + "</option>").join("") + "</optgroup></select></label>" +
    '<span style="flex:1"></span><button class="btn primary" id="cf-print"' + (many ? "" : " disabled") + ">" + (many === 1 ? "Print this sheet" : "Print " + many + " sheets") + "</button></div>" +
    '<p class="hint" style="margin-top:8px">One page per child, black and white. Reading and math both, whatever the subject switch says: the report card mark for each standard graded so far (Setup → Term marks) and one thing to work on at home. No iReady: that goes home on its own. Change a child’s home focus under it before printing.</p></div>' +
    '<div class="cf-preview">' + confRoster().map(r => confSheetHTML(r.st, term, now, false, r.slot)).join("") + "</div></div>";
  el.innerHTML = h;
  document.getElementById("cf-term").onchange = e => { UI.confTerm = e.target.value; renderConferences(); };
  document.getElementById("cf-who").onchange = e => { UI.confWho = e.target.value; renderConferences(); };
  document.getElementById("cf-print").onclick = printConferences;
  csWire(el);
  el.querySelectorAll("select[data-cf-focus]").forEach(sel => {
    sel.onchange = () => {
      UI.confFocus = UI.confFocus || {};
      if (sel.value) UI.confFocus[sel.dataset.cfFocus] = sel.value; else delete UI.confFocus[sel.dataset.cfFocus];
      renderConferences();
    };
  });
}
function printConferences() {
  const term = confTerm(), now = new Date();
  document.getElementById("printsheet").innerHTML = confRoster().map(r => confSheetHTML(r.st, term, now, true, r.slot)).join("");
  /* a toast is fixed, so it would print on every child's page */
  const t = document.getElementById("toast");
  if (t) { clearTimeout(toastT); t.classList.remove("show"); t.style.display = "none"; }
  suitePrint();
  if (t) t.style.display = "";
}
/* ============================================================
   CONFERENCE SCHEDULE (v154)
   His sign-up sheet (SignUpGenius) pasted in, as copied text or as
   screenshots, becomes the order the sheets print in. Each slot is
   { date: "2026-11-10" | "", time: "15:30", text, sid, hand, at }: sid is
   the matched child, "" for nobody found yet, "none" for a slot he marked
   not his; hand is true once he picked the child himself. Kept in
   S.confSlots, so it syncs like the rest of the gradebook. Pasting again
   adds to it: a slot at the same day and time is updated, but a child he
   picked by hand stays picked.

   Reading: every "Tuesday, Nov 10" (or 11/10/2026) heading sets the day,
   every "3:30 PM to 3:50 PM" starts a slot, and the words after it up to
   the next time are that slot's sign-up (links and buttons stripped; a
   slot still open, "0 filled", is left out). SignUpGenius and ParentSquare
   both read this way. The child is found in those
   words against the roster (and Also called names): a name in brackets
   counts most, since the sheet puts the child there, then a first or last
   name anywhere, a full name a little more; a name cut off at the edge of
   a screenshot still counts, at half, as its start. A tie or nothing: left
   for him to pick. Screenshots are read in the browser with Tesseract (loaded the
   first time one is added, so that part needs the internet).
   ============================================================ */
const CS_OCR = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
const CS_MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const CS_WD = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CS_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function byIdOk(id) { return !!id && S.students.some(s => s.id === id); }
function csSlots() {
  const a = Array.isArray(S.confSlots) ? S.confSlots.slice() : [];
  return a.sort((x, y) => ((x.date || "9") + x.time).localeCompare((y.date || "9") + y.time) || (x.at || 0) - (y.at || 0));
}
function csDayLabel(date) {
  if (!date) return "Day not given";
  const d = new Date(date + "T12:00:00");
  return CS_WD[d.getDay()] + ", " + CS_MONTHS[d.getMonth()] + " " + d.getDate();
}
function csTime12(t) {
  const h = +t.slice(0, 2), m = t.slice(3);
  return ((h + 11) % 12 + 1) + ":" + m + " " + (h < 12 ? "AM" : "PM");
}
function csWhen(x) { return (x.date ? csDayLabel(x.date) + ", " : "") + csTime12(x.time); }
function csDays() {
  const out = [];
  csSlots().forEach(x => {
    let d = out.find(o => o.date === (x.date || ""));
    if (!d) out.push(d = { date: x.date || "", label: csDayLabel(x.date), n: 0 });
    if (byIdOk(x.sid)) d.n++;
  });
  return out;
}
/* the school year a month falls in: Aug-Dec the first calendar year */
function csYearFor(mon) {
  const y0 = +String(S.settings.yearStart || "").slice(0, 4) || new Date().getFullYear();
  return mon >= 7 ? y0 : y0 + 1;
}
function csNorm(x) { return String(x || "").replace(/[\u2018\u2019]/g, "'").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function csIso(y, m, d) { return y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0"); }
function csCells(x) { return String(x).split(/\t|\n/).map(c => c.replace(/\s+/g, " ").trim()).filter(Boolean); }
/* text (copied, or read from a screenshot) -> [{ date, time, text }] */
function csParse(raw) {
  const t = String(raw || "").replace(/\u00a0/g, " ").replace(/\r/g, "");
  const ev = [];
  const DAY = /\b(?:sun|mon|tues?|wed(?:nes)?|thu(?:rs?)?|fri|sat(?:ur)?)(?:day)?\.?,?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b(?:,?\s+(\d{4}))?/gi;
  const NUM = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g;
  const TIME = /\b(\d{1,2})\s*[:.]\s*(\d{2})\s*([ap])\.?\s*m\.?\s*(?:to|-|\u2013|\u2014)\s*\d{1,2}\s*[:.]\s*\d{2}(?:\s*[ap]\.?\s*m\b\.?)?/gi;
  let m;
  while ((m = DAY.exec(t))) {
    const mon = CS_MON.indexOf(m[1].toLowerCase().slice(0, 3));
    ev.push({ i: m.index, end: DAY.lastIndex, date: csIso(m[3] ? +m[3] : csYearFor(mon), mon, +m[2]) });
  }
  while ((m = NUM.exec(t))) {
    const mon = +m[1] - 1, d = +m[2];
    if (mon < 0 || mon > 11 || d < 1 || d > 31) continue;
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    ev.push({ i: m.index, end: NUM.lastIndex, date: csIso(y, mon, d) });
  }
  while ((m = TIME.exec(t))) {
    let h = +m[1] % 12; if (m[3].toLowerCase() === "p") h += 12;
    ev.push({ i: m.index, end: TIME.lastIndex, time: String(h).padStart(2, "0") + ":" + m[2] });
  }
  ev.sort((a, b) => a.i - b.i);
  let day = "";
  const out = [];
  ev.forEach((e, k) => {
    if (e.date) { day = e.date; return; }
    const next = ev[k + 1];
    out.push({ date: day, time: e.time, text: t.slice(e.end, next ? next.i : t.length) });
  });
  /* cells that repeat down the sheet (the event title, a note) say nothing
     about who signed up, nor do the counts and buttons; a cell with a
     bracket is kept, as that is where the child's name goes */
  const count = {};
  out.forEach(x => csCells(x.text).forEach(c => { count[c] = (count[c] || 0) + 1; }));
  out.forEach(x => {
    /* a slot still open ("1 open, 0 filled") has nobody to print for */
    x.open = /\b0\s*filled\b/i.test(x.text);
    x.text = csCells(x.text).filter(c => count[c] < 2 || /\(/.test(c))
      .join(" ").replace(/\]\([^)]*\)/g, "] ").replace(/\(?\bhttps?:\/\/\S*/gi, " ").replace(/[\[\]*\u2022]/g, " ")
      .replace(/\b\d+\s*(open|filled)\b/gi, " ").replace(/\b(sign\s*up|swap|already filled|add someone|disable)\b/gi, " ")
      .replace(/^\s*(pm|am)\b/i, " ").replace(/\s+/g, " ").trim();
  });
  return out.filter(x => !x.open);
}
/* the child one slot's words name, or "" */
function csMatch(text) {
  const all = csNorm(text), par = (all.match(/\([^)]*\)?/g) || []).join(" ");
  const toks = x => x.split(/[^a-z'\-]+/).filter(Boolean);
  const A = toks(all), P = toks(par);
  /* a whole word scores 1; the start of a name cut off as the very last
     word (a screenshot's edge) scores half */
  const hit = (ws, name) => {
    name = csNorm(name).replace(/[^a-z'\-]/g, "");
    if (!name || !ws.length) return 0;
    if (ws.indexOf(name) >= 0) return 1;
    const tail = ws[ws.length - 1];
    return tail.length >= 3 && name.indexOf(tail) === 0 ? 0.5 : 0;
  };
  let best = [], top = 0;
  S.students.forEach(st => {
    const firsts = [st.first].concat(akaOf(st));
    const f = ws => Math.max.apply(null, firsts.map(n => hit(ws, n)));
    const fa = f(A), la = hit(A, st.last);
    let sc = 3 * f(P) + 3 * hit(P, st.last) + fa + la;
    if (fa === 1 && la === 1) sc += 1;
    if (sc > top) { top = sc; best = [st]; } else if (sc === top && sc > 0) best.push(st);
  });
  return top >= 0.5 && best.length === 1 ? best[0].id : "";
}
/* slots into the schedule; returns how many were read */
function csAdd(raw) {
  const got = csParse(raw);
  if (!got.length) return 0;
  const cur = Array.isArray(S.confSlots) ? S.confSlots : [];
  const now = Date.now();
  got.forEach((g, k) => {
    const old = cur.find(x => x.date === g.date && x.time === g.time);
    const sid = csMatch(g.text);
    const row = { date: g.date, time: g.time, text: g.text.slice(0, 160), at: old ? old.at : now + k,
      sid: old && old.hand ? old.sid : sid || (old && old.sid) || "", hand: !!(old && old.hand) };
    if (old) Object.assign(old, row); else cur.push(row);
  });
  S.confSlots = cur;
  UI.confWho = "sched";
  save();
  return got.length;
}
function csCardHTML() {
  const slots = csSlots(), open = UI.csOpen != null ? UI.csOpen : !slots.length;
  const found = slots.filter(x => byIdOk(x.sid)).length;
  const miss = slots.filter(x => x.sid !== "none" && !byIdOk(x.sid)).length;
  let h = '<div class="card pad noprint cs-card"><div class="row"><h3 style="margin:0">Conference schedule</h3><span style="flex:1"></span>' +
    (slots.length ? '<span class="hint">' + found + " of " + slots.length + " slots matched" + (miss ? " \u00b7 " + miss + " to check" : "") + "</span>" +
      '<button class="btn ghost" id="cs-toggle">' + (open ? "Hide" : "Show") + "</button>" : "") + "</div>";
  if (!open) return h + "</div>";
  h += '<p class="hint" style="margin-top:6px">Copy the table from your sign-up page and paste it here, or add screenshots of it (pasting a screenshot works too). Each family\u2019s child is found by name; check the matches below. The sheets then print in conference order.</p>' +
    '<textarea id="cs-in" class="cs-in" placeholder="Paste the sign-up table or a screenshot here"></textarea>' +
    '<div class="cs-acts"><button class="btn primary" id="cs-read">Read pasted table</button>' +
    '<label class="btn" style="cursor:pointer">Add screenshots<input type="file" id="cs-shot" accept="image/*" multiple hidden></label>' +
    '<span class="cs-busy" id="cs-busy" role="status"></span>' +
    (slots.length ? '<span style="flex:1"></span><button class="btn ghost" id="cs-clear">Clear schedule</button>' : "") + "</div>";
  if (slots.length) {
    const opts = sid => '<option value=""' + (!sid ? " selected" : "") + ">Pick a student\u2026</option>" +
      sortedStudents().map(s => '<option value="' + s.id + '"' + (s.id === sid ? " selected" : "") + ">" + esc(s.first + " " + s.last) + "</option>").join("") +
      '<option value="none"' + (sid === "none" ? " selected" : "") + ">Skip this slot</option>";
    csDays().forEach(d => {
      h += '<div class="cs-day">' + esc(d.label) + '</div><table class="cs-list"><tbody>';
      slots.forEach((x, k) => {
        if ((x.date || "") !== d.date) return;
        const sid = x.sid === "none" || byIdOk(x.sid) ? x.sid : "";
        h += "<tr" + (sid ? "" : ' class="cs-miss"') + '><td class="cs-t">' + esc(csTime12(x.time)) + '</td><td><select data-cs="' + k + '" aria-label="Student at ' + esc(csWhen(x)) + '">' + opts(sid) + "</select></td>" +
          '<td class="cs-raw">' + esc(x.text || "(nobody signed up)") + "</td></tr>";
      });
      h += "</tbody></table>";
    });
  }
  return h + "</div>";
}
function csBusy(msg) { const b = document.getElementById("cs-busy"); if (b) b.textContent = msg || ""; }
function csAfter(n, what) {
  UI.csOpen = true;
  renderConferences();
  toast(n ? n + " conference slot" + (n === 1 ? "" : "s") + " read from " + what : "No conference times found in " + what);
}
function csLoadOcr() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  return new Promise((res, rej) => {
    const sc = document.createElement("script");
    sc.src = CS_OCR; sc.onload = () => res(window.Tesseract); sc.onerror = () => rej(new Error("load"));
    document.head.appendChild(sc);
  });
}
/* screenshots in the order given, read one at a time, their slots added together */
function csReadImages(files) {
  files = Array.from(files || []).filter(f => /^image\//.test(f.type));
  if (!files.length) return;
  csBusy("Getting the screenshot reader\u2026");
  csLoadOcr().then(T => {
    let all = "", i = 0;
    const next = () => {
      if (i >= files.length) return Promise.resolve();
      const f = files[i++];
      csBusy("Reading screenshot " + i + " of " + files.length + "\u2026");
      return T.recognize(f, "eng").then(r => { all += "\n" + ((r && r.data && r.data.text) || ""); }).then(next);
    };
    return next().then(() => csAfter(csAdd(all), files.length === 1 ? "the screenshot" : "the screenshots"));
  }).catch(() => { csBusy(""); toast("Couldn\u2019t read the screenshot. It needs the internet; copying the table as text works offline."); });
}
/* clearing takes a second click, so one stray tap can't lose the schedule */
function csClear(btn) {
  if (!btn.dataset.armed) {
    btn.dataset.armed = "1"; btn.textContent = "Click again to clear";
    setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = "Clear schedule"; } }, 4000);
    return;
  }
  S.confSlots = [];
  if (UI.confWho && UI.confWho.indexOf("sched") === 0) UI.confWho = "all";
  save(); renderConferences();
  toast("Schedule cleared");
}
function csWire(el) {
  const g = id => document.getElementById(id);
  if (g("cs-toggle")) g("cs-toggle").onclick = () => { UI.csOpen = !(UI.csOpen != null ? UI.csOpen : !csSlots().length); renderConferences(); };
  if (!g("cs-in")) return;
  g("cs-read").onclick = () => {
    const v = g("cs-in").value;
    if (!v.trim()) { toast("Paste the sign-up table into the box first"); return; }
    csAfter(csAdd(v), "the pasted table");
  };
  g("cs-in").addEventListener("paste", e => {
    const cd = e.clipboardData;
    if (!cd) return;
    const imgs = Array.from(cd.items || []).filter(it => it.kind === "file" && /^image\//.test(it.type)).map(it => it.getAsFile()).filter(Boolean);
    if (imgs.length) { e.preventDefault(); csReadImages(imgs); return; }
    /* a table copied from a web page: one row a line, cells tab-separated,
       read straight away */
    const html = cd.getData("text/html");
    let txt = cd.getData("text/plain") || "";
    if (html && /<t[dr][\s>]/i.test(html)) {
      const doc = new DOMParser().parseFromString(html, "text/html");
      doc.querySelectorAll("br,div,p,li,span,a").forEach(n => n.after(" "));
      const rows = Array.from(doc.querySelectorAll("tr")).map(tr => Array.from(tr.children).map(c => (c.textContent || "").replace(/\s+/g, " ").trim()).join("\t")).join("\n");
      if (/\d:\d\d/.test(rows)) txt = rows;
    }
    if (csParse(txt).length) { e.preventDefault(); g("cs-in").value = txt; csAfter(csAdd(txt), "the pasted table"); }
  });
  g("cs-shot").onchange = e => { csReadImages(e.target.files); e.target.value = ""; };
  if (g("cs-clear")) g("cs-clear").onclick = e => csClear(e.currentTarget);
  el.querySelectorAll("select[data-cs]").forEach(sel => {
    sel.onchange = () => {
      const x = csSlots()[+sel.dataset.cs];
      if (!x) return;
      x.sid = sel.value; x.hand = true;
      save(); renderConferences();
    };
  });
}

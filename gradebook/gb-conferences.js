/* gradebook/gb-conferences.js — Conferences: the one-page family sheet.
   One of the gradebook's scripts, loaded in order by index.html as classic
   scripts sharing one global scope; see HANDOFF "The gradebook's files". */
/* ============================================================
   CONFERENCES (v121; v146 report card, iReady and home focus)
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
    "Say a word like \u201cstamp\u201d and tap a finger for each sound: s-t-a-m-p.",
    "Play \u201cchange one sound\u201d: cat, bat, bit, bin. Say each new word together.",
    "Clap the syllables in family names and favorite foods."] },
  phonics: { s: "ELA", t: "Sounding out new words", steps: [
    "When your child gets stuck on a word, have them slide through it sound by sound, then reread the sentence.",
    "Hunt for word parts on signs, boxes, and menus: sh, ch, ee, ai, -ing, -ed.",
    "Write a few tricky words on sticky notes around the house and read each one when you pass it."] },
  fluency: { s: "ELA", t: "Reading smoothly", steps: [
    "Read the same short page three times this week. Notice together how it gets smoother.",
    "Take turns: you read a page with expression, then your child reads it back the same way.",
    "Read jokes, poems, or a recipe aloud, like a performer."] },
  stories: { s: "ELA", t: "Understanding stories", steps: [
    "After a story, ask: Who was in it? What was the problem? How did it end?",
    "Stop partway and ask, \u201cWhat do you think will happen next? Why?\u201d",
    "Have your child retell the story to someone else using first, next, then, and last."] },
  nonfiction: { s: "ELA", t: "Learning from nonfiction", steps: [
    "Pick a library book about something your child loves, like animals, trucks, or space.",
    "Before reading, look at the pictures and headings together and guess what you\u2019ll learn.",
    "Afterward, ask for two new facts your child learned."] },
  vocab: { s: "ELA", t: "Learning new words", steps: [
    "Try one interesting word a day at dinner (enormous, curious, delicious) and look for chances to use it again.",
    "When a book has a new word, figure out together what it might mean from the sentence and pictures.",
    "Play \u201csame and opposite\u201d: you say a word, your child gives one that means the same and one that means the opposite."] },
  readmore: { s: "ELA", t: "Keep reading every day", steps: [
    "Read together for about 20 minutes a day, and let your child choose the book.",
    "Talk about it afterward: a favorite part, a new word, a question it raised."] },
  facts: { s: "Math", t: "Adding and subtracting within 20", steps: [
    "Practice a few facts in the car or at dinner: \u201cWhat\u2019s 8 + 7? How did you know?\u201d",
    "Play a card game: each flip two cards and add them. The bigger sum wins.",
    "Make 10 with small objects: \u201cI have 6. How many more make 10?\u201d"] },
  story: { s: "Math", t: "Solving story problems", steps: [
    "Make up story problems from your day: \u201cWe had 14 grapes and ate 6. How many are left?\u201d",
    "Ask your child to draw a quick picture of the problem before solving it.",
    "Switch roles: your child makes up a problem for you to solve."] },
  groups: { s: "Math", t: "Odd and even numbers and equal groups", steps: [
    "Pair up socks or spoons. If every one has a partner, the number is even.",
    "Set snacks out in rows (3 rows of 4) and add the rows to find the total."] },
  placevalue: { s: "Math", t: "Hundreds, tens, and ones", steps: [
    "Bundle straws, spoons, or crayons into groups of 10, then count by tens and ones.",
    "Read house numbers and prices: \u201cIn 352, what does the 3 stand for?\u201d",
    "Count by 5s, 10s, and 100s while walking or doing chores."] },
  bignum: { s: "Math", t: "Adding and subtracting bigger numbers", steps: [
    "Add two prices on a menu or receipt: the tens first, then the ones.",
    "Ask \u201cWhat is 10 more? 10 less? 100 more?\u201d about house or page numbers."] },
  measure: { s: "Math", t: "Measuring length", steps: [
    "Measure things around the house with a ruler or tape measure, in inches and centimeters.",
    "Guess first, then measure: \u201cHow long is the table? How close was your guess?\u201d"] },
  timemoney: { s: "Math", t: "Telling time and counting money", steps: [
    "Read a clock with hands together a few times a day, to the nearest 5 minutes.",
    "Count a handful of coins: start with the quarters, then dimes, nickels, and pennies."] },
  shapes: { s: "Math", t: "Shapes and equal parts", steps: [
    "Name shapes you see: how many sides and corners does each have?",
    "Cut a sandwich or tortilla into halves, thirds, or fourths and name the pieces."] },
  data: { s: "Math", t: "Reading graphs", steps: [
    "Make a tally chart at home (favorite fruit, cars that pass by) and talk about which has the most."] },
  mathtalk: { s: "Math", t: "Math in everyday life", steps: [
    "Ask \u201cHow many more?\u201d and \u201cHow did you know?\u201d while counting things together.",
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
  if (pl.status === "start") return first + "\u2019s first reading check this year was " + pl.base + " words a minute. The goal by " + by + " is " + goal + ".";
  let s = first + " went from " + pl.base + " to " + pl.latestY + " words a minute. The goal by " + by + " is " + goal + ".";
  if (pl.status === "met") s += " " + first + " has already reached it.";
  else if (pl.status === "metBoy") s += " That\u2019s past the start-of-year goal of " + pl.boySpring + ".";
  else if (pl.status === "on") s += " That\u2019s on track.";
  else if (pl.status === "close") s += " That\u2019s just under the pace for the goal.";
  else if (pl.status === "below" && pl.perWeekNow != null) s += " Reaching it means growing about " + Math.max(1, Math.round(pl.perWeekNow)) + " words a minute each week.";
  if (pl.winterDue && pl.winterGoal != null && pl.winterActual == null && now.getTime() < pl.winterDue.getTime())
    s += " Mid-year checkpoint: " + pl.winterGoal + " by " + G.fmtLong(pl.winterDue) + ".";
  return s;
}
/* the reading line in black and white: solid dots for checks, a dashed path
   to the goal, an open square at a mid-year checkpoint, a filled one at the
   goal. Same scale and aim line as the ORF tab's chart. */
function confChartSVG(pl) {
  const MON = window.SuiteOrf.goals.MONTHS;
  const t0 = pl.baseDate.getTime(), t1 = pl.goalDate.getTime() + 14 * 864e5;
  const ys = pl.checks.map(c => c.y).concat([pl.goal, pl.base, pl.winterGoal || 0]);
  const yMax = Math.ceil(Math.max.apply(null, ys) * 1.12 / 10) * 10, yMin = Math.max(0, Math.floor(Math.min.apply(null, ys.filter(v => v > 0)) * 0.8 / 10) * 10);
  const W = 720, H = 150, L = 34, R = 14, T = 8, B = 22;
  const X = t => L + (W - L - R) * (t - t0) / Math.max(1, t1 - t0), Y = v => T + (H - T - B) * (1 - (v - yMin) / Math.max(1, yMax - yMin));
  let g = '<svg class="cf-chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Reading checks and the path to the goal">';
  const step = yMax - yMin > 120 ? 40 : 20;
  for (let v = yMin; v <= yMax; v += step) {
    g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" stroke="#C8C8C8" stroke-width="0.75"/>' +
      '<text x="' + (L - 6) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="#444">' + v + "</text>";
  }
  const d0 = new Date(t0);
  for (let y = d0.getFullYear(), m = d0.getMonth() + 1; ; m++) {
    if (m > 11) { m = 0; y++; }
    const t = new Date(y, m, 1).getTime(); if (t > t1) break;
    g += '<text x="' + X(t).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="11" fill="#444">' + MON[m].slice(0, 3) + "</text>";
  }
  let path = "";
  for (let t = t0; t <= pl.goalDate.getTime(); t += 3 * 864e5) path += (path ? "L" : "M") + X(t).toFixed(1) + " " + Y(pl.aim(t)).toFixed(1);
  path += "L" + X(pl.goalDate.getTime()).toFixed(1) + " " + Y(pl.goal).toFixed(1);
  g += '<path d="' + path + '" fill="none" stroke="#555" stroke-width="1.5" stroke-dasharray="6 4"/>';
  const sq = (t, v, fill) => '<rect x="' + (X(t) - 5).toFixed(1) + '" y="' + (Y(v) - 5).toFixed(1) + '" width="10" height="10" fill="' + fill + '" stroke="#000" stroke-width="1.5"/>';
  if (pl.winterDue && pl.winterGoal != null) g += sq(pl.winterDue.getTime(), pl.winterGoal, "#fff");
  g += sq(pl.goalDate.getTime(), pl.goal, "#000");
  const days = [];
  pl.checks.forEach(c => { if (!days.includes(c.t)) days.push(c.t); });
  const pts = days.map(t => { const v = Math.round(pl.checks.filter(c => c.t === t).map(c => c.y).sort((a, b) => a - b)[Math.floor(pl.checks.filter(c => c.t === t).length / 2)]); return [X(t), Y(v)]; });
  if (pts.length > 1) g += '<polyline points="' + pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ") + '" fill="none" stroke="#000" stroke-width="1.5"/>';
  pl.checks.forEach(c => { g += '<circle cx="' + X(c.t).toFixed(1) + '" cy="' + Y(c.y).toFixed(1) + '" r="4" fill="#000"><title>' + window.SuiteOrf.goals.fmtShort(new Date(c.t)) + ": " + c.y + "</title></circle>"; });
  return g + "</svg>";
}
function confFocusKey(st, subj) { return st.id + "|" + subj; }
function confSubjectHTML(st, term, now, g, paper) {
  
  let h = '<section class="cf-subj" data-subj="' + g.subj + '"><h3 class="cf-subjhead">' + esc(g.label) + "</h3>";
  if (g.subj === "ELA") {
    const pl = confReading(st, now);
    if (pl) {
      h += '<div class="cf-reading"><h4 class="cf-minor">Reading fluency</h4><p class="cf-hint">Words read correctly in one minute</p>' + confChartSVG(pl) +
        '<p class="cf-key">Dots: each reading check. Dashed line: the steady path to the goal. Filled square: the goal' +
        (pl.winterDue && pl.winterGoal != null ? "; open square: the mid-year checkpoint" : "") + ".</p>" +
        '<p class="cf-says">' + esc(confReadingWords(st, pl, now)) + "</p></div>";
    }
  }
  if (g.rows.length) {
    h += '<table class="cf-table"><thead><tr><th>On the report card so far</th><th class="cf-c">Mark</th></tr></thead><tbody>' +
      g.rows.map(r => '<tr data-std="' + esc(r.code) + '"><td>' + esc(r.words) + '</td><td class="cf-c"><span class="cf-mark">' + r.v + "</span></td></tr>").join("") +
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
function confSheetHTML(st, term, now, paper) {
  const teacher = String(S.settings.teacher || "").trim();
  let h = '<article class="confsheet" data-sid="' + esc(st.id) + '">' +
    '<header class="cf-head"><div><h2 class="cf-name">' + esc(fullName(st)) + "</h2>" +
    '<div class="cf-sub">Grade 2 \u00b7 ' + esc(term.name) + " conference</div></div>" +
    '<div class="cf-meta">' + (teacher ? esc(teacher) + "<br>" : "") + esc(window.SuiteOrf ? window.SuiteOrf.goals.fmtLong(now) + ", " + now.getFullYear() : todayISO()) + "</div></header>";
  const groups = confStandards(st, term);
  groups.forEach(g => { h += confSubjectHTML(st, term, now, g, paper); });
  if (groups.some(g => g.rows.length)) h += '<p class="cf-key">Marks run from 1 to 4; 3 means meeting the end-of-year grade 2 standard. Each is the report card mark from the grades so far.</p>';
  return h + "</article>";
}
function confRoster() {
  const all = sortedStudents();
  return UI.confWho && UI.confWho !== "all" ? all.filter(s => s.id === UI.confWho) : all;
}
function renderConferences() {
  const el = document.getElementById("panel-conf");
  if (!S.students.length) return noStudents(el);
  if (UI.confWho && UI.confWho !== "all" && !S.students.find(s => s.id === UI.confWho)) UI.confWho = "all";
  const term = confTerm(), now = new Date();
  const roster = sortedStudents();
  let h = '<div class="stack"><div class="card pad noprint"><div class="row">' +
    '<label class="fld">Term<select id="cf-term">' + S.terms.map(t => '<option value="' + t.id + '"' + (t.id === term.id ? " selected" : "") + ">" + esc(t.name) + "</option>").join("") + "</select></label>" +
    '<label class="fld">Student<select id="cf-who"><option value="all">Whole class</option>' +
    roster.map(s => '<option value="' + s.id + '"' + (s.id === UI.confWho ? " selected" : "") + ">" + esc(s.last + ", " + s.first) + "</option>").join("") + "</select></label>" +
    '<span style="flex:1"></span><button class="btn primary" id="cf-print">' + (UI.confWho && UI.confWho !== "all" ? "Print this sheet" : "Print all sheets") + "</button></div>" +
    '<p class="hint" style="margin-top:8px">One page per child, black and white. Reading and math both, whatever the subject switch says: the report card mark for each standard graded so far (Setup \u2192 Term marks) and one thing to work on at home. No iReady: that goes home on its own. Change a child\u2019s home focus under it before printing.</p></div>' +
    '<div class="cf-preview">' + confRoster().map(st => confSheetHTML(st, term, now)).join("") + "</div></div>";
  el.innerHTML = h;
  document.getElementById("cf-term").onchange = e => { UI.confTerm = e.target.value; renderConferences(); };
  document.getElementById("cf-who").onchange = e => { UI.confWho = e.target.value; renderConferences(); };
  document.getElementById("cf-print").onclick = printConferences;
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
  document.getElementById("printsheet").innerHTML = confRoster().map(st => confSheetHTML(st, term, now, true)).join("");
  /* a toast is fixed, so it would print on every child's page */
  const t = document.getElementById("toast");
  if (t) { clearTimeout(toastT); t.classList.remove("show"); t.style.display = "none"; }
  suitePrint();
  if (t) t.style.display = "";
}

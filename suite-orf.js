/* ============================================================
   suite-orf.js (v82)
   The one copy of what every tool needs to read an ORF check.

   Before v82 the norms table lived in four files and the name parsing in
   five, and they had started to disagree. Everything below is used by the
   gradebook (its ORF bridge and marks), fluency-extras.js (goals, aim
   line, roster) and groups/orf-suggest.js + groups/index.html (suggested
   reading groups). Loaded by a plain <script> tag before any of them.

   The running-records tool (fluency/index.html) is the teacher's own file
   and keeps its own NORMS, windowFor and nameParts inside it. They are not
   called from here and cannot be. test-orf-shared.js loads that page and
   fails if its copies ever stop matching these.

   Nothing here reads or writes storage. It is data and pure functions.

   window.SuiteOrf
     HT                 Hasbrouck & Tindal 2017, grades 1-6:
                        HT[grade][percentile] = [fall, winter, spring] WCPM.
                        Grade 1 has no fall norms (null).
     PCTS               [10, 25, 50, 75, 90]
     norms(grade)       HT[grade], or grade 2's when there is no such grade
     SEASONS            ["fall", "winter", "spring"]
     windowFor(date)    the running-records tool's windows, by month:
                        Aug-Nov fall, Dec-Feb winter, Mar-Jul spring
     stripEld(s)        { name, eld }: a typed "ELD" tag taken off a name
     nameParts(n)       { first, last }: "Last, First" or "First Last";
                        a single word is the last name, as the tool reads it;
                        a suffix (Jr, III) stays with the surname
     splitName(n)       nameParts after stripEld, plus eld and lastBare
                        (the surname without its suffix)
     lastFirst(n)       "Last, First"
     firstName(n)       the first name, or the only name
     goals              v86: the reading-goals engine (planFor, tableGoals,
                        springResult, normGoals, normComp, dates)
     miscues            v86: clean, features, patterns(records)
   ============================================================ */
(function () {
  "use strict";
  if (window.SuiteOrf) return;

  function freeze(o) {
    Object.keys(o).forEach(function (k) { if (o[k] && typeof o[k] === "object") freeze(o[k]); });
    return Object.freeze(o);
  }

  /* Hasbrouck & Tindal (2017), An update to compiled ORF norms (Technical
     Report No. 1702), University of Oregon. Verified row by row against the
     report; see HANDOFF "Reference data already verified". The grade 2 25th
     row (36 / 59 / 72) differs from the 2006 table still circulating. */
  var HT = freeze({
    1: { 90: [null, 97, 116], 75: [null, 59, 91], 50: [null, 29, 60], 25: [null, 16, 34], 10: [null, 9, 18] },
    2: { 90: [111, 131, 148], 75: [84, 109, 124], 50: [50, 84, 100], 25: [36, 59, 72], 10: [23, 35, 43] },
    3: { 90: [134, 161, 166], 75: [104, 137, 139], 50: [83, 97, 112], 25: [59, 79, 91], 10: [40, 62, 63] },
    4: { 90: [153, 168, 184], 75: [125, 143, 160], 50: [94, 120, 133], 25: [75, 95, 105], 10: [60, 71, 83] },
    5: { 90: [179, 183, 195], 75: [153, 160, 169], 50: [121, 133, 146], 25: [87, 109, 119], 10: [64, 84, 102] },
    6: { 90: [185, 195, 204], 75: [159, 166, 173], 50: [132, 145, 146], 25: [112, 116, 122], 10: [89, 91, 91] }
  });
  var PCTS = Object.freeze([10, 25, 50, 75, 90]);
  var SEASONS = Object.freeze(["fall", "winter", "spring"]);

  function norms(grade) { return HT[grade] || HT[2]; }

  /* The running-records tool's rule, exactly (its windowFor). The
     gradebook's season lines are separate, editable settings whose
     defaults (08-01, 12-01, 03-01) draw the same windows. */
  function windowFor(date) {
    var m = new Date(date).getMonth();
    if (m >= 7 && m <= 10) return "fall";
    if (m === 11 || m <= 1) return "winter";
    return "spring";
  }

  /* ---- v88: the season lines and the suite calendar ----
     The windows a check falls in are three MM-DD lines on the school
     calendar (gradebook Setup). The defaults draw exactly the windows above:
     fall from Aug 1, winter from Dec 1, spring from Mar 1. */
  var SEASON_LINES = Object.freeze({ fall: "08-01", winter: "12-01", spring: "03-01" });
  function seasonLines(o) {
    var out = {};
    ["fall", "winter", "spring"].forEach(function (k) {
      var v = o && o[k];
      out[k] = /^\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : SEASON_LINES[k];
    });
    return out;
  }
  function mdOf(d) { return String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  /* 0 fall, 1 winter, 2 spring: the gradebook's rule since v59 */
  function seasonIndex(date, lines) {
    var d = date instanceof Date ? date : new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(date)) ? date + "T12:00:00" : date);
    if (isNaN(d)) return 0;
    var L = seasonLines(lines), md = mdOf(d);
    if (md >= L.winter) return 1;
    if (md < L.spring) return 1;
    if (md < L.fall) return 2;
    return 0;
  }
  /* The suite calendar, owned by gradebook Setup and kept in its settings
     (gb2_standards_v1). Every tool reads it through this, so a missing or
     half-filled one comes out the same everywhere. `legacyGoals` is
     suite:orfgoals:v1, where the ORF goal dates lived before v88. */
  function calendar(settings, legacyGoals) {
    var st = settings && typeof settings === "object" ? settings : {};
    var lg = legacyGoals && typeof legacyGoals === "object" ? legacyGoals : {};
    var md = function (v, d) { return /^\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : d; };
    var iso = function (v) { return /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : ""; };
    return {
      teacher: String(st.teacher || "").trim(),
      yearLabel: String(st.year || ""),
      yearStart: iso(st.yearStart), yearEnd: iso(st.yearEnd),
      seasons: seasonLines(st.orfSeason),
      winterDue: md(st.orfWinterDue, md(lg.winterDue, "01-15")),
      springDue: md(st.orfSpringDue, md(lg.springDue, "05-14"))
    };
  }

  /* Bare "ELD" in capitals, or "(ELD)" / "[ELD]" in any case, as a whole
     word at the start or end of a name or of either half of "Last, First".
     Returns the name as typed when there is no tag or nothing else left. */
  function stripEld(s) {
    var raw = String(s == null ? "" : s), eld = false;
    var SEP = "[\\s\\-\\u2013\\u2014:|/]";
    var pats = [
      new RegExp("^ELD(?:" + SEP + "+|$)"),
      new RegExp("^[(\\[]\\s*eld\\s*[)\\]]" + SEP + "*", "i"),
      new RegExp("(?:^|" + SEP + "+)ELD$"),
      new RegExp(SEP + "*[(\\[]\\s*eld\\s*[)\\]]$", "i")
    ];
    var parts = raw.split(",").map(function (part) {
      var t = part.trim(), prev;
      do {
        prev = t;
        pats.forEach(function (re) { var n = t.replace(re, "").trim(); if (n !== t) { eld = true; t = n; } });
      } while (t !== prev);
      return t;
    });
    var name = parts.filter(Boolean).join(", ");
    if (!name) return { name: raw.trim(), eld: false };
    return { name: eld ? name : raw.trim(), eld: eld };
  }

  var SUFFIX = /^(jr|sr|ii|iii|iv)\.?$/i;
  function nameParts(n) {
    n = String(n == null ? "" : n).trim();
    if (n.indexOf(",") > -1) { var b = n.split(","); return { last: b[0].trim(), first: b.slice(1).join(",").trim() }; }
    var p = n.split(/\s+/).filter(Boolean);
    if (p.length <= 1) return { last: p[0] || "", first: "" };
    var i = p.length - 1;
    while (i > 0 && SUFFIX.test(p[i])) i--;
    return { first: p.slice(0, i).join(" "), last: p.slice(i).join(" ") };
  }
  function splitName(n) {
    var tag = stripEld(n), p = nameParts(tag.name);
    var bare = p.last.split(/\s+/).filter(Boolean);
    while (bare.length > 1 && SUFFIX.test(bare[bare.length - 1])) bare.pop();
    return { first: p.first, last: p.last, lastBare: bare.join(" "), eld: tag.eld };
  }
  function lastFirst(n) { var p = nameParts(n); return p.first ? p.last + ", " + p.first : p.last; }
  function firstName(n) { var p = nameParts(n); return p.first || p.last; }


  /* ============================================================
     v86: the reading goals (moved from fluency-extras.js, unchanged) and
     the missed-word patterns (the ORF tool's own rules), so the gradebook
     and the ORF page read one copy. Pure: no storage, no page.
     ============================================================ */
  var DAY = 86400000;
  var WIN = ["fall", "winter", "spring"];
  var PACE = { realistic: 1.5, ambitious: 2.0 };
  var METHODS = { table: 1, realistic: 1, ambitious: 1 };


  /* One percentile row read as a timeline across grades, with each summer a
     single step (one grade's spring and the next grade's fall):
       0 g1 winter, 1 [g1 spring | g2 fall], 2 g2 winter, 3 [g2 spring | g3 fall],
       ... 10 g6 winter, 11 g6 spring                                        */
  function ladder(p) {
    function r(pairs) { return { v: pairs.map(function (x) { return HT[x[0]][p][x[1]]; }), lab: pairs.map(function (x) { return "grade " + x[0] + " " + WIN[x[1]]; }) }; }
    var out = [];
    for (var g = 1; g <= 6; g++) { out.push(r([[g, 1]])); out.push(g < 6 ? r([[g, 2], [g + 1, 0]]) : r([[6, 2]])); }
    return out;
  }
  function lowRung(r) { var i = r.v.length > 1 && r.v[1] < r.v[0] ? 1 : 0; return { v: r.v[i], lab: r.lab[i] }; }
  function highRung(r) { var i = r.v.length > 1 && r.v[1] > r.v[0] ? 1 : 0; return { v: r.v[i], lab: r.lab[i] }; }
  function ratioGap(a, b) { return Math.abs(Math.log(Math.max(a, 0.5) / Math.max(b, 0.5))); }
  /* the rung a check in that window of that grade sits on */
  function homeRung(grade, win) {
    if (win === "winter") return 2 * (grade - 1);
    if (win === "fall" && grade >= 2) return 2 * grade - 3;
    return null;                        /* spring, or grade 1 fall (no norm) */
  }

  /* Last year's method, as rules. A fall check gets a winter and a spring
     goal; a winter check (a new student, or the mid-year review) gets a
     spring goal. Returns null where the table has nothing to offer. */
  /* opts.rowUp: a student whose row is below the 25th (the 10th row on the
     grade's own table) starts one row up, on the 25th. Holding the 10th row
     keeps a student at the 10th percentile, and for students well below
     grade level the guidance is a goal that closes the gap. Students read
     past the bottom of the table (stepped into the grade below) are left on
     their steps: from that far back, a year of growth is already the
     ambitious goal. Only a START is moved up, never the mid-year review. */
  function tableGoals(score, win, grade, opts) {
    grade = HT[grade] ? +grade : 2;
    var home = homeRung(grade, win);
    if (home == null) return null;
    var need = win === "fall" ? 2 : 1;
    var L10 = ladder(10), L90 = ladder(90);
    var col = win === "fall" ? 0 : 1;
    var place;
    var floor = home > 0 ? lowRung(L10[home - 1]).v : L10[0].v[0] / 2;
    if (score < floor) {
      /* below the rung under this grade's: step down along the 10th row.
         Grade 1 has no fall norm, so "below grade 1 winter" is a rung of its
         own, taken when the score is nearer nothing than that rung. */
      var i = 0, bd = Infinity;
      for (var q = 0; q < Math.max(1, home); q++) {
        L10[q].v.forEach(function (v) { var d = ratioGap(score, v); if (d < bd - 1e-9) { bd = d; i = q; } });
      }
      if (i === 0 && score * 2 < L10[0].v[0]) i = -1;
      place = { p: 10, i: i, off: "below" };
    } else {
      var best = null;
      PCTS.slice().reverse().forEach(function (p) {
        var d = ratioGap(score, HT[grade][p][col]);
        if (!best || d < best.d - 1e-9) best = { d: d, p: p, i: home, off: false };
      });
      for (var k = home + 1; k <= L90.length - 1 - need; k++) {
        L90[k].v.forEach(function (v) { var d = ratioGap(score, v); if (d < best.d - 1e-9) best = { d: d, p: 90, i: k, off: "above" }; });
      }
      place = best;
    }
    var L = place.p === 10 ? L10 : place.p === 90 ? L90 : ladder(place.p);
    var at = place.i < 0 ? { v: 0, lab: "below grade 1 winter" } : lowRung(L[place.i]);
    var last = L.length - 1;
    var out = { grade: grade, row: place.p, off: place.off, at: at, winter: null, winterLab: null };
    var moved = false;
    if (!place.off && place.p === 10 && opts && opts.rowUp) { place.p = 25; moved = true; }
    if (!place.off) {
      /* on the grade's own table the goals are simply that row's values —
         its own spring, not the next grade's fall, which for grade 1's
         lower rows is the larger number */
      if (need === 2) { out.winter = HT[grade][place.p][1]; out.winterLab = "grade " + grade + " winter"; }
      out.spring = HT[grade][place.p][2]; out.springLab = "grade " + grade + " spring";
      out.row = place.p; out.movedUp = moved;
      return out;
    }
    if (need === 2) { var w = lowRung(L[Math.min(last, place.i + 1)]); out.winter = w.v; out.winterLab = w.lab; }
    var sp = highRung(L[Math.min(last, place.i + need)]);
    out.spring = sp.v; out.springLab = sp.lab;
    return out;
  }

  /* The mid-year review, as last year's sheet did it (20 of its 21 rows):
       - winter check below the spring goal: the goal stands
       - past it, and the goal was on this grade's own table: place the winter
         check on the winter values and take the next step, never lower
       - past it, and the goal was already above this grade's table: keep the
         number and add "all 3 comprehension questions correct"            */
  function midYearReview(boyTable, boySpring, winterActual, grade) {
    if (winterActual == null || winterActual < boySpring) return { spring: boySpring, changed: false, comp: false };
    if (boyTable && boyTable.off === "above") return { spring: boySpring, changed: true, comp: true };
    var t = tableGoals(winterActual, "winter", grade);
    var next = t ? t.spring : boySpring;
    return { spring: Math.max(boySpring, next), changed: next > boySpring, comp: false, table: t };
  }

  /* Last year's four colours, as rules (they reproduce all 21 students):
       green   made the goal in force at spring (the mid-year one if it was
               raised), comprehension included where the goal asks for it
       blue    missed that, but made the start-of-year goal
       yellow  missed both, at or above the grade-level expectation
       red     missed both, below it
     The grade-level expectation is the end-of-year 50th percentile (100 in
     grade 2), with the margin of error around it: a score within the margin
     below the line is yellow but flagged as below expectations, and only
     one further below than that is red.                                   */
  function springResult(o) {
    var tol = o.tolerance == null ? 2 : o.tolerance;
    function made(goal, needComp) { return o.actual >= goal - tol && (!needComp || o.comp === 3); }
    if (made(o.goal, o.needComp)) return "green";
    if (o.reviewed && made(o.boySpring, false)) return "blue";
    return o.actual >= o.expectation - (o.margin || 0) ? "yellow" : "red";
  }

  var INSTR_RATIO = 32 / (242 / 7);      /* 32 instructional weeks, Sep 15 to May 15 */
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  /* ---------- dates ---------- */
  /* A reading is stamped with toISOString(), which is UTC; an evening check
     would otherwise land on tomorrow. A bare date is taken as written. */
  function localDay(iso) {
    var s = String(iso || "");
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    var d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
    if (isNaN(d)) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  }
  /* The school year a date falls in starts on August 1. */
  /* v88: the school year turns over on the calendar's fall line (Setup,
     default 08-01: the August 1 this always used) */
  function lineOr(line) { return /^\d{2}-\d{2}$/.test(String(line || "")) ? String(line) : SEASON_LINES.fall; }
  function yearStart(now, line) {
    var l = lineOr(line), m = +l.slice(0, 2), dd = +l.slice(3, 5);
    return new Date(mdOf(now) >= l ? now.getFullYear() : now.getFullYear() - 1, m - 1, dd);
  }
  function dueIn(now, mmdd, line) {
    var l = lineOr(line);
    var y = yearStart(now, l).getFullYear();
    var mm = +String(mmdd).slice(0, 2), dd = +String(mmdd).slice(3, 5);
    return new Date(String(mmdd).slice(0, 5) >= l ? y : y + 1, mm - 1, dd, 12);
  }
  function benchDates(now) {
    var y = yearStart(now).getFullYear();
    return [new Date(y, 8, 15, 12).getTime(), new Date(y + 1, 0, 15, 12).getTime(), new Date(y + 1, 4, 15, 12).getTime()];
  }
  function instrWeeks(t0, t1) { return Math.max(0, (t1 - t0) / (7 * DAY)) * INSTR_RATIO; }
  function endOfMonth(y, m) { return new Date(y, m + 1, 0, 12); }
  function fmtShort(d) { return MONTHS[d.getMonth()].slice(0, 3) + " " + d.getDate(); }
  function fmtLong(d) { return MONTHS[d.getMonth()] + " " + d.getDate(); }

  /* ---------- the norm curve (pace methods and the percentile shown) ---------- */
  /* WCPM along the year for one row: straight between the windows, carried on
     at the nearest segment's slope before fall and after spring. Grade 1 has
     no fall value, so its winter-to-spring slope is carried back. */
  function along(row, t, B) {
    var r = row[0] == null ? [row[1] - (row[2] - row[1]) * (B[1] - B[0]) / (B[2] - B[1]), row[1], row[2]] : row;
    var i = t <= B[1] ? 0 : 1;
    var f = (t - B[i]) / (B[i + 1] - B[i]);
    return r[i] + f * (r[i + 1] - r[i]);
  }
  function rowAt(p, grade) {
    var T = HT[grade] || HT[2];
    p = Math.max(10, Math.min(90, p));
    for (var i = 0; i < PCTS.length - 1; i++) {
      var a = PCTS[i], b = PCTS[i + 1];
      if (p <= b) {
        var f = (p - a) / (b - a);
        return [0, 1, 2].map(function (k) { return T[a][k] == null ? null : T[a][k] + f * (T[b][k] - T[a][k]); });
      }
    }
    return T[90].slice();
  }
  function standing(w, t, B, grade) {
    var T = HT[grade] || HT[2];
    var v = PCTS.map(function (p) { return along(T[p], t, B); });
    if (w <= v[0]) return { p: 10, scale: v[0] > 0 ? w / v[0] : 1, below: w < v[0] };
    if (w >= v[4]) return { p: 90, scale: w / v[4], above: w > v[4] };
    for (var i = 0; i < 4; i++) {
      if (w <= v[i + 1]) {
        var f = (w - v[i]) / (v[i + 1] - v[i]);
        return { p: PCTS[i] + f * (PCTS[i + 1] - PCTS[i]), scale: 1 };
      }
    }
    return { p: 50, scale: 1 };
  }
  function curveFor(st, B, grade) {
    var row = rowAt(st.p, grade);
    return function (t) { return st.scale * along(row, t, B); };
  }
  function ordinal(n) {
    var s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  /* ---------- one student's plan ---------- */
  function median(a) {
    var s = a.slice().sort(function (x, y) { return x - y; });
    var n = s.length;
    return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  }
  function checksIn(db, sid, from, to) {
    return db.records.filter(function (r) { return r.studentId === sid; })
      .map(function (r) { var d = localDay(r.date); return d ? { t: d.getTime(), d: d, y: Math.round(Number(r.wcpm) || 0), rec: r } : null; })
      .filter(function (x) { return x && x.t >= from && x.t <= to; })
      .sort(function (a, b) { return a.t - b.t; });
  }
  /* several passages read on one day count as one reading: their median */
  function dayMedian(checks, t) { return Math.round(median(checks.filter(function (c) { return c.t === t; }).map(function (c) { return c.y; }))); }
  function windowOf(d, lines) { return SEASONS[seasonIndex(d, lines)]; }
  function ownGoals(goalsState, sid) {
    var o = goalsState.goals[sid];
    if (o == null) return {};
    if (typeof o === "number") return { spring: o };
    var out = {};
    if (isFinite(+o.winter) && +o.winter > 0) out.winter = Math.round(+o.winter);
    if (isFinite(+o.spring) && +o.spring > 0) out.spring = Math.round(+o.spring);
    return out;
  }

  function planFor(db, sid, goalsState, now, compState) {
    now = now || new Date();
    var compMap = (compState && compState.records) || {};
    function compOn(t) {
      var best = null;
      checks.forEach(function (c) { var v = compMap[c.rec.id]; if (c.t === t && v != null && (best == null || v > best)) best = v; });
      return best;
    }
    var grade = HT[goalsState.grade] ? +goalsState.grade : 2;
    /* v88: the calendar's lines and dates, when the caller has them */
    var lines = seasonLines(goalsState.seasons), line = lines.fall;
    var y0 = yearStart(now, line).getTime();
    var springDate = dueIn(now, goalsState.springDue || "05-14", line);
    var tG = springDate.getTime();
    var checks = checksIn(db, sid, y0, tG + 45 * DAY);
    if (!checks.length) return null;
    var B = benchDates(now);
    var t0 = checks[0].t;
    var base = dayMedian(checks, t0);
    if (t0 >= tG) return null;
    var tW = dueIn(now, goalsState.winterDue || "01-15", line).getTime();
    var hasWinter = tW > t0 + 7 * DAY && tW < tG;
    var win = windowOf(new Date(t0), lines);

    var st = standing(base, t0, B, grade);
    var curve = curveFor(st, B, grade);
    var classGoal = grade === 2 ? Math.max(1, +(db.settings && db.settings.goalWcpm) || 100) : HT[grade][50][2];
    var method = METHODS[goalsState.method] ? goalsState.method : "table";
    var weeks = instrWeeks(t0, tG);
    var tg = method === "table" ? tableGoals(base, hasWinter ? win : (win === "fall" ? "winter" : win), grade, { rowUp: goalsState.rowUp !== false }) : null;
    var usedMethod = tg ? "table" : (method === "table" ? "realistic" : method);
    var pace = PACE[usedMethod] || PACE.realistic;
    var hold = Math.round(st.scale * rowAt(st.p, grade)[2]);
    var reach = Math.round(base + pace * weeks);

    var sugSpring, sugWinter = null, why;
    var colName = win === "fall" ? "fall" : "winter";
    if (tg) {
      sugSpring = tg.spring;
      sugWinter = hasWinter ? tg.winter : null;
      if (tg.movedUp) {
        why = "one row up: " + base + " is closest to the grade " + grade + " 10th-percentile row's " + colName + " value, " +
          HT[grade][10][win === "fall" ? 0 : 1] + ", so the goals come from the 25th row instead" +
          (sugWinter != null ? ", winter " + sugWinter + " and spring " + sugSpring : ", spring " + sugSpring);
      } else if (!tg.off) {
        why = "the grade " + grade + " " + ordinal(tg.row) + "-percentile row: " + base + " is closest to its " + colName +
          " value, " + HT[grade][tg.row][win === "fall" ? 0 : 1] + (sugWinter != null ? ", so the goals are its winter " + sugWinter + " and spring " + sugSpring : ", so the goal is its spring " + sugSpring);
      } else {
        why = "the " + ordinal(tg.row) + "-percentile row, read past the grade " + grade + " table: " + base + " is nearest " + tg.at.lab + (tg.at.v ? " (" + tg.at.v + ")" : "") +
          ", so the goals are the next steps along that row: " + (sugWinter != null ? tg.winterLab + " (" + sugWinter + ") by winter and " : "") + tg.springLab + " (" + sugSpring + ") by spring";
      }
    } else {
      sugSpring = Math.max(hold, Math.min(classGoal, reach), base + 1);
      if (sugSpring === hold && hold >= classGoal) why = "keeps them at about the " + ordinal(Math.round(st.p)) + " percentile, where they started";
      else if (sugSpring === classGoal) why = "the grade " + grade + " spring 50th percentile, which " + pace.toFixed(1) + " words a week gets to from " + base;
      else if (sugSpring === hold) why = "an average year's growth from where they started";
      else why = pace.toFixed(1) + " words a week from " + base + " over about " + Math.round(weeks) + " school weeks";
      if (method === "table") why += grade === 1 && win === "fall"
        ? " (H\u0026T has no grade 1 fall norms, so a fall start uses 1.5 words a week)"
        : " (a start this late in the year is past the table's last window, so this uses 1.5 words a week)";
    }
    if (hasWinter && sugWinter == null) {
      var sp = curve(tG) - curve(t0);
      sugWinter = Math.round(sp > 0.5 ? base + (sugSpring - base) * (curve(tW) - curve(t0)) / sp : base + (sugSpring - base) * (tW - t0) / (tG - t0));
    }

    var own = ownGoals(goalsState, sid);
    var winterGoal = hasWinter ? (own.winter != null ? own.winter : sugWinter) : null;

    /* the winter benchmark: the last reading from December 1 to two weeks
       past the due date */
    var winterActual = null, winterDate = null;
    if (hasWinter) {
      var wFrom = new Date(new Date(tW).getFullYear() - (new Date(tW).getMonth() === 11 ? 0 : 1), 11, 1).getTime();
      var inWin = checks.filter(function (c) { return c.t >= wFrom && c.t <= tW + 14 * DAY && c.t > t0; });
      if (inWin.length) { winterDate = inWin[inWin.length - 1].t; winterActual = dayMedian(checks, winterDate); }
    }
    var review = hasWinter ? midYearReview(tg, sugSpring, winterActual, grade) : { spring: sugSpring, changed: false, comp: false };
    var boySpring = sugSpring;
    var goal = own.spring != null ? own.spring : review.spring;
    var comp = own.spring == null && review.comp;
    var custom = own.spring != null || own.winter != null;

    /* the aim line: straight pieces through the winter checkpoint when there
       is one, re-starting from a winter reading the review raised the goal
       from; otherwise the student's own norm curve, stretched to the goal */
    var span = curve(tG) - curve(t0);
    var piecewise = hasWinter && (usedMethod === "table" || own.winter != null || review.changed);
    var restart = review.changed && winterActual != null ? Math.max(winterGoal, winterActual) : winterGoal;
    function aim(t) {
      if (t <= t0) return base;
      if (t >= tG) return goal;
      if (piecewise) {
        if (t <= tW) return base + (winterGoal - base) * (t - t0) / (tW - t0);
        return restart + (goal - restart) * (t - tW) / (tG - tW);
      }
      if (goal <= base) return goal;
      var f = span > 0.5 ? (curve(t) - curve(t0)) / span : (t - t0) / (tG - t0);
      return base + (goal - base) * f;
    }

    var months = [];
    var d0 = new Date(t0);
    var winterRowDone = !hasWinter;
    for (var y = d0.getFullYear(), m = d0.getMonth(); ; m++) {
      if (m > 11) { m = 0; y++; }
      var end = endOfMonth(y, m);
      var at = Math.min(end.getTime(), tG);
      if (!winterRowDone && tW <= at) {
        months.push({ y: y, m: m, label: "Winter goal", checkpoint: "winter", by: new Date(tW), target: winterGoal,
          checks: winterActual == null ? [] : [{ y: winterActual, t: winterDate, vs: winterActual - winterGoal }] });
        winterRowDone = true;
      }
      if (at - t0 >= 10 * DAY) {
        var inMonth = checks.filter(function (c) { return c.d.getFullYear() === y && c.d.getMonth() === m && c.t <= tG + 14 * DAY; });
        months.push({
          y: y, m: m, label: at === tG ? "Spring goal" : MONTHS[m], checkpoint: at === tG ? "spring" : null,
          by: new Date(at), target: Math.round(aim(at)),
          checks: inMonth.map(function (c) { return { y: c.y, t: c.t, id: c.rec.id, vs: Math.round(c.y - aim(c.t)) }; })
        });
      }
      if (end.getTime() >= tG) break;
      if (months.length > 16) break;
    }

    /* the spring benchmark: the last reading from 30 days before the spring
       due date to three weeks after, and after the winter one */
    var springActual = null, sDay = null, springComp = null, result = null;
    var sIn = checks.filter(function (c) { return c.t >= tG - 30 * DAY && c.t <= tG + 21 * DAY && c.t > t0 && (!winterDate || c.t > winterDate); });
    if (sIn.length) { sDay = sIn[sIn.length - 1].t; springActual = dayMedian(checks, sDay); springComp = compOn(sDay); }
    var expectation = goalsState.expectation > 0 ? +goalsState.expectation : HT[grade][50][2];
    var margin = goalsState.margin >= 0 ? +goalsState.margin : 10;
    if (springActual != null) {
      /* "reviewed": the goal in force at spring is not the start-of-year one,
         whether the review raised it or it was typed (as 124 was last year) */
      result = springResult({ goal: goal, needComp: comp, boySpring: boySpring, reviewed: goal > boySpring || comp,
        actual: springActual, comp: springComp, expectation: expectation, margin: margin, tolerance: goalsState.tolerance });
    }

    var latest = checks[checks.length - 1];
    var latestY = dayMedian(checks, latest.t);
    var below = 0;
    /* checks on the first day are the starting point, not progress */
    for (var i = checks.length - 1; i >= 0 && checks[i].t > t0; i--) { if (checks[i].y < aim(checks[i].t)) below++; else break; }
    var diff = Math.round(latestY - aim(latest.t));
    var status = latest.t === t0 ? "start"
      : latestY >= goal ? "met"
      /* the sheet's blue: judged at the spring benchmark, not the moment
         the review raises the goal */
      : review.changed && own.spring == null && latestY >= boySpring && latest.t >= tG - 21 * DAY ? "metBoy"
      : diff >= 0 ? "on" : diff >= -5 ? "close" : "below";
    if (result) status = "r-" + result;
    var perWeekNow = latest.t < tG ? (goal - latestY) / Math.max(0.5, instrWeeks(latest.t, tG)) : null;

    var nowT = now.getTime();
    var thisMonth = null;
    for (var k = 0; k < months.length; k++) { if (months[k].checkpoint !== "winter" && months[k].by.getTime() >= nowT - DAY) { thisMonth = months[k]; break; } }

    return {
      sid: sid, grade: grade, base: base, baseDate: new Date(t0), window: win, standing: st,
      goal: goal, comp: comp, boySpring: boySpring, review: review, winterGoal: winterGoal,
      winterActual: winterActual, winterDate: winterDate ? new Date(winterDate) : null,
      winterDue: hasWinter ? new Date(tW) : null, custom: custom, own: own, table: tg,
      suggested: review.spring, suggestedWinter: hasWinter ? sugWinter : null, why: why, hold: hold, reach: reach,
      classGoal: classGoal, goalDate: springDate, method: usedMethod,
      months: months, aim: aim, checks: checks, latest: latest, latestY: latestY, diff: diff, status: status,
      belowRun: below, perWeekNow: perWeekNow, thisMonth: thisMonth,
      springActual: springActual, springDate: sDay ? new Date(sDay) : null, springComp: springComp,
      result: result, expectation: expectation, margin: margin,
      flagged: result === "yellow" && springActual < expectation, latestComp: compOn(latest.t), compOn: compOn
    };
  }

  /* suite:orfgoals:v1, filled in with every default. Safe on anything. */
  function normGoals(g) {
    if (!g || typeof g !== "object") g = {};
    if (!g.goals || typeof g.goals !== "object") g.goals = {};
    if (!METHODS[g.method]) g.method = "table";
    if (!/^\d{2}-\d{2}$/.test(String(g.winterDue || ""))) g.winterDue = "01-15";
    if (!/^\d{2}-\d{2}$/.test(String(g.springDue || ""))) g.springDue = "05-14";
    if (!HT[g.grade]) g.grade = 2;
    if (g.rowUp !== false) g.rowUp = true;
    /* the margin of error around the grade-level line: a single ORF passage
       is typically off by about 10 words either way */
    if (!(g.margin >= 0 && g.margin <= 30)) g.margin = 10;
    g.grade = +g.grade;
    /* spring results: a score this many words short still counts as made
       (last year 71 against 72 and 159 against 161 were counted made), and
       the grade-level expectation that splits yellow from red (null: the
       grade's spring 25th percentile) */
    if (!(g.tolerance >= 0 && g.tolerance <= 15)) g.tolerance = 2;
    if (!(g.expectation > 0 && g.expectation <= 300)) g.expectation = null;
    return g;
  }
  /* suite:orfcomp:v1: { records: { <reading id>: 0-3 } } */
  function normComp(c) {
    if (!c || typeof c !== "object" || !c.records || typeof c.records !== "object") c = { records: {} };
    return c;
  }
  /* a plan's status, in the words the ORF page has always used; the spring
     results are last year's words */
  var STATUS_LABELS = {
    start: "First check of the year", met: "At the goal", metBoy: "Past the start-of-year goal",
    on: "On track", close: "Just under the line", below: "Below the line",
    "r-green": "Made the goal", "r-blue": "Made the start-of-year goal",
    "r-yellow": "Goal not made, at or above grade level", "r-red": "Goal not made, below grade level"
  };
  function statusLabel(pl) {
    if (pl.status === "r-green" && (pl.goal > pl.boySpring || pl.comp)) return "Made the mid-year goal";
    return STATUS_LABELS[pl.status] || "";
  }

  /* ---- the missed-word patterns: copied from the ORF tool's file, which
     keeps its own; test-orf-analysis.js fails if the two ever differ ---- */
  function clean(raw){ return String(raw).toLowerCase().replace(/[^a-z0-9']/g,""); }

  function syllables(w){
    w = w.replace(/[^a-z]/g,"");
    if(!w) return 0;
    if(w.length<=3) return 1;
    var s = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/,"").replace(/^y/,"");
    var m = s.match(/[aeiouy]{1,2}/g);
    return m ? m.length : 1;
  }

  var HFW = new Set(("a about after again all always am an and any are around as ask at ate away be because been before best better big black blue both bring brown but buy by call came can carry clean cold come could cut did do does done dont down draw drink eat eight every fall far fast find first five fly for found four from full funny gave get give go goes going good got green grow had has have he help her here him his hold hot how hurt i if in into is it its jump just keep kind know laugh let light like little live long look made make many may me much must my myself never new no not now of off old on once one only open or other our out over own pick play please pretty pull put ran read red ride right round run said saw say see seven shall she show sing sit six sleep small so some soon start stop take tell ten thank that the their them then there these they think this those three to today together too try two under up upon us use very walk want warm was wash we well went were what when where which white who why will wish with work would write yellow yes you your").split(" "));

  function features(raw){
    var w = clean(raw);
    var f=[];
    if(!w) return f;
    if(HFW.has(w)) f.push("High-frequency word");
    var syl = syllables(w);
    if(syl>=3) f.push("Three or more syllables");
    else if(syl===2) f.push("Two syllables");
    if(/[aeiou]r(?![aeiou])/.test(w)) f.push("R-controlled vowel");
    if(/(ai|ay|ea|ee|ie|oa|oe|ue|ui|ei|igh)/.test(w)) f.push("Vowel team");
    if(/(oi|oy|ou|ow|au|aw|oo)/.test(w)) f.push("Diphthong or oo/aw");
    if(/[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnprstvz]e$/.test(w)) f.push("Silent e");
    if(/(sh|ch|th|wh|ph|ck|ng|tch)/.test(w)) f.push("Digraph");
    if(/^(bl|br|cl|cr|dr|fl|fr|gl|gr|pl|pr|sc|sk|sl|sm|sn|sp|st|sw|tr|tw|scr|spl|spr|str|thr|shr)/.test(w)) f.push("Initial blend");
    if(/(nd|nt|mp|st|sk|lt|lk|ft|ct|pt)$/.test(w)) f.push("Final blend");
    if(/(ing|ed|er|est|ly|ful|less|ness|tion|sion|able)$/.test(w) && w.length>4) f.push("Suffix or ending");
    if(/'/.test(w)) f.push("Contraction");
    if(w.length>=8) f.push("Long word (8+ letters)");
    return f;
  }
  /* words missed most (by how many students, then how often), and the
     features those misses share */
  function patterns(records, students) {
    var byWord = {}, byFeat = {}, total = 0;
    (records || []).forEach(function (r) {
      (r.missed || []).forEach(function (raw) {
        var w = clean(raw); if (!w) return;
        var e = byWord[w] || (byWord[w] = { word: w, display: raw, count: 0, students: {} });
        e.count++; e.students[r.studentId] = 1;
        total++;
        features(raw).forEach(function (f) {
          var x = byFeat[f] || (byFeat[f] = { feature: f, n: 0, examples: [] });
          x.n++; if (x.examples.length < 4 && x.examples.indexOf(w) < 0) x.examples.push(w);
        });
      });
    });
    var words = Object.keys(byWord).map(function (k) { var e = byWord[k]; e.who = Object.keys(e.students); return e; })
      .sort(function (a, b) { return b.who.length - a.who.length || b.count - a.count; }).slice(0, 20);
    var feats = Object.keys(byFeat).map(function (k) { return byFeat[k]; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 8);
    return { words: words, features: feats, total: total };
  }


  /* ============================================================
     v89: the suggested reading groups (moved from groups/orf-suggest.js,
     unchanged but for the windows, which can follow the calendar's lines).
     The running-records tool's Reports grouping, reproduced because its
     file is not edited; test-orf-suggest.js holds the two equal. The
     gradebook's ORF tab and Small Groups both call this; neither has its
     own. Sample students are always left out.
     suggest(db, basis, lines?) -> [{ key, title, desc, members:[...] }]
     ============================================================ */
  var SUGGEST = (function () {


    /* the table in the shape the tool's own grouping uses */
    var NORMS = {};
    SEASONS.forEach(function (win, i) {
      var row = {};
      PCTS.forEach(function (p) { row["p" + p] = norms(2)[p][i]; });
      NORMS[win] = row;
    });
    /* v89: with the calendar's lines when the caller has them; without, the
       tool's own month rule (the same windows as the default lines) */
    var LINES = null;
    function windowOf(date) { return LINES ? SEASONS[seasonIndex(new Date(date), LINES)] : windowFor(date); }
    function percentileOf(w, win) {
      var n = NORMS[win];
      var pts = [[10, n.p10], [25, n.p25], [50, n.p50], [75, n.p75], [90, n.p90]];
      if (w < pts[0][1]) return { p: 10, below: true, win: win };
      if (w > pts[4][1]) return { p: 90, above: true, win: win };
      for (var i = 0; i < pts.length - 1; i++) {
        var pa = pts[i][0], va = pts[i][1], pb = pts[i + 1][0], vb = pts[i + 1][1];
        if (w >= va && w <= vb) {
          var f = vb === va ? 0 : (w - va) / (vb - va);
          return { p: Math.round(pa + f * (pb - pa)), win: win };
        }
      }
      return { p: 50, win: win };
    }
    function ordinal(n) { var s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
    function pctLabel(o) { return o.below ? "below 10th" : o.above ? "90th+" : ordinal(o.p); }
    function kmeans1d(vals, k) {
      if (vals.length <= k) return vals.map(function (v) { return [v]; });
      var sorted = vals.slice().sort(function (a, b) { return a - b; });
      var cent = [], groups = [];
      for (var i = 0; i < k; i++) cent.push(sorted[Math.floor((i + 0.5) * sorted.length / k)]);
      for (var it = 0; it < 40; it++) {
        groups = [];
        for (var g = 0; g < k; g++) groups.push([]);
        sorted.forEach(function (v) {
          var bi = 0, bd = Infinity;
          cent.forEach(function (c, j) { var d = Math.abs(v - c); if (d < bd) { bd = d; bi = j; } });
          groups[bi].push(v);
        });
        var nc = groups.map(function (gr, j) { return gr.length ? gr.reduce(function (a, b) { return a + b; }, 0) / gr.length : cent[j]; });
        var still = nc.every(function (c, j) { return Math.abs(c - cent[j]) < 0.001; });
        cent = nc;
        if (still) break;
      }
      return groups.filter(function (gr) { return gr.length; });
    }
    function max(a) { return Math.max.apply(null, a); }
    function min(a) { return Math.min.apply(null, a); }

    /* Each real student's latest saved check, in save order, as the tool
       reads it. The tool's sample class is left out. */
    function latest(db) {
      var students = (db && Array.isArray(db.students) ? db.students : []).filter(function (s) { return s && s.id && !s.demo; });
      var recs = db && Array.isArray(db.records) ? db.records : [];
      var out = [];
      students.forEach(function (st) {
        var mine = recs.filter(function (r) { return r && r.studentId === st.id; });
        if (!mine.length) return;
        var r = mine[mine.length - 1];
        var pct = percentileOf(r.wcpm, windowOf(r.date));
        out.push({ orfId: st.id, name: String(st.name || ""), wcpm: r.wcpm, accuracy: r.accuracy, date: r.date, pct: pct, pctLabel: pctLabel(pct) });
      });
      return out;
    }

    var NEED = [
      ["word", "Word-level accuracy first", "Accuracy under 95%. Decoding and word work at their level before timed rereading."],
      ["intensive", "Rate \u2014 intensive", "Accurate but below the 25th percentile. Daily repeated reading of short, easy text."],
      ["strategic", "Rate \u2014 strategic", "Accurate, 25th to 50th percentile. Repeated readings a few times a week and phrase-cued practice."],
      ["ontrack", "At or above the 50th percentile", "Expression, phrasing and comprehension of harder text."]
    ];

    function suggest(db, basis, lines) {
      LINES = lines ? seasonLines(lines) : null;
      var withRec = latest(db);
      if (withRec.length < 2) return [];
      if (basis === "need") {
        var b = { word: [], intensive: [], strategic: [], ontrack: [] };
        withRec.forEach(function (x) {
          if (x.accuracy < 95) b.word.push(x);
          else if (x.pct.below || x.pct.p < 25) b.intensive.push(x);
          else if (x.pct.p < 50) b.strategic.push(x);
          else b.ontrack.push(x);
        });
        return NEED.filter(function (d) { return b[d[0]].length; })
          .map(function (d) { return { key: d[0], title: d[1], desc: d[2], members: b[d[0]] }; });
      }
      var k = withRec.length >= 8 ? 4 : 3;
      var clusters = kmeans1d(withRec.map(function (x) { return x.wcpm; }), k)
        .sort(function (a, c) { return max(c) - max(a); });
      var used = {}, out = [];
      clusters.forEach(function (c, i) {
        var lo = min(c), hi = max(c);
        var members = withRec.filter(function (x) {
          if (used[x.orfId]) return false;
          if (x.wcpm >= lo && x.wcpm <= hi) { used[x.orfId] = true; return true; }
          return false;
        });
        if (!members.length) return;
        out.push({ key: "rate" + i, title: "Group " + String.fromCharCode(65 + i) + " \u00b7 " + (lo === hi ? lo : lo + "\u2013" + hi) + " WCPM",
          desc: members.length + " student" + (members.length > 1 ? "s" : "") + " reading at a similar rate.", members: members });
      });
      return out;
    }

    return { suggest: suggest, latest: latest, percentileOf: percentileOf, windowFor: windowFor, kmeans1d: kmeans1d };
  })();

  /* ---- v90: what the student said, per check (suite:orfnotes:v1) ----
     Written by fluency-assess.js when a check is saved, read by the
     gradebook. One entry per reading id:
       { paused: <seconds the timer was paused>,
         notes: [ { w: word, kind: "e" | "s", n, said, told } ] }
     kind "e" is a miss, "s" a self-correction; n is the word's place in the
     reading's own missed (e) or selfCorr (s) list, so the note and the tool's
     record line up even when a word is missed twice. told: the teacher said
     the word. */
  var NOTES_KEY = "suite:orfnotes:v1";
  function normNotes(c) {
    if (!c || typeof c !== "object" || !c.records || typeof c.records !== "object") c = { records: {} };
    Object.keys(c.records).forEach(function (id) {
      var r = c.records[id];
      if (!r || typeof r !== "object") { delete c.records[id]; return; }
      if (!Array.isArray(r.notes)) r.notes = [];
      r.notes = r.notes.filter(function (x) { return x && typeof x === "object" && x.w; });
      if (!(r.paused > 0)) delete r.paused;
    });
    return c;
  }
  /* porch -> "patch" / porch -> told / porch -> "p-", told / want -> "went", self-corrected */
  function noteText(x) {
    var bits = [];
    if (x.said) bits.push("\u201c" + x.said + "\u201d");
    if (x.kind === "s") bits.push("self-corrected");
    else if (x.told) bits.push("told");
    return x.w + " \u2192 " + (bits.length ? bits.join(", ") : "missed");
  }
  function pausedText(sec) {
    sec = Math.max(0, Math.round(+sec || 0));
    return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
  }

  window.SuiteOrf = Object.freeze({
    VERSION: 1,
    HT: HT, PCTS: PCTS, SEASONS: SEASONS, norms: norms, windowFor: windowFor,
    SEASON_LINES: SEASON_LINES, seasonLines: seasonLines, seasonIndex: seasonIndex, calendar: calendar,
    stripEld: stripEld, nameParts: nameParts, splitName: splitName,
    lastFirst: lastFirst, firstName: firstName,
    goals: Object.freeze({
      PACE: PACE, METHODS: METHODS, INSTR_RATIO: INSTR_RATIO, MONTHS: MONTHS, STATUS_LABELS: STATUS_LABELS, statusLabel: statusLabel,
      tableGoals: tableGoals, midYearReview: midYearReview, springResult: springResult,
      localDay: localDay, yearStart: yearStart, dueIn: dueIn, benchDates: benchDates, instrWeeks: instrWeeks,
      fmtShort: fmtShort, fmtLong: fmtLong, along: along, rowAt: rowAt, standing: standing, curveFor: curveFor,
      ordinal: ordinal, planFor: planFor, normGoals: normGoals, normComp: normComp
    }),
    miscues: Object.freeze({ clean: clean, features: features, syllables: syllables, patterns: patterns }),
    suggest: Object.freeze(SUGGEST),
    notes: Object.freeze({ KEY: NOTES_KEY, norm: normNotes, text: noteText, paused: pausedText })
  });
})();

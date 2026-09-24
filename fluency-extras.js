/* ============================================================
   fluency-extras.js
   Injected into the running-records tool, which is the teacher's own file.
   Like every other addition to it, this comes off by deleting its one
   <script> tag. It never reaches into the tool's closure: it reads the
   tool's saved data from local storage, draws into the page beside the
   tool's own output, and keeps what it owns in a key of its own.

   Two things:

   1. MONTHLY GOALS on the Growth tab. Each student gets a year-end goal of
      their own and a goal for every month between their first check of the
      year and the goal date, plus an aim line on the chart.

   2. THE ROSTER can be edited: a Rename button on every student, and a
      one-tap way to take a typed-in "ELD" tag off names.

   ---- How goals are set: the H&T table, the way Creslane set them -------
   This is last year's hand-set method, reproduced exactly — the same winter
   and spring goal as every one of the 23 rows on last year's sheet, and the
   same mid-year revision as 20 of its 21 (test-orf-goals.js holds them all).
   It works for any grade 1-6 (Grade, on the whole-class view); the sheet
   was grade 2, so the examples are.

     1. Take the student's first check of the year (the median, if several
        passages were read that day).
     2. Find the grade's FALL value it is closest to — for grade 2: 23, 36,
        50, 84 or 111 — and that is the student's row (10th ... 90th).
        "Closest" is by proportion, not by words: 29 is 26% above 23 but
        only 24% below 36, so it goes on the 25th row, as the sheet did.
     3. The winter goal is that row's WINTER value, the spring goal its
        SPRING value. 82 -> 109 / 124. 90 -> 109 / 124. 101 -> 131 / 148.

   Off the ends of the grade's table the row continues into the next
   grade's norms, read as a timeline in which one grade's spring and the
   next grade's fall are the same moment (summer):

     ... grade 1 winter, [grade 1 spring | grade 2 fall], grade 2 winter,
         [grade 2 spring | grade 3 fall], grade 3 winter, ...

   The student is placed on the rung they are closest to and the goals are
   the next two rungs; at a merged summer rung the winter goal takes the
   lower value and the spring goal the higher:

     8   -> placed at grade 1 winter (9)   -> 18 (gr 1 spring) / 35 (gr 2 winter)
     2   -> placed below grade 1 winter    ->  9 (gr 1 winter) / 23 (gr 2 fall)
     128 -> placed at grade 2 winter (131) -> 134 (gr 3 fall) / 161 (gr 3 winter)
     140 -> placed at grade 3 fall (134)   -> 161 (gr 3 winter) / 166 (gr 3 spring)

   Only a score below the rung under the grade's own (grade 2: below grade
   1 winter's 10th, 9) steps down — last year 9 and 10 both got 35 / 43.
   Grade 1 has no fall norms, so a grade 1 fall start uses the 1.5-a-week
   pace below.

   Since v59 a student whose row is the 10th (below the 25th percentile)
   starts ONE ROW UP, on the 25th: 18 -> 59 / 72 rather than 35 / 43. It is
   a setting (on by default) so last year's sheet can still be reproduced
   with it off. Students stepped down into the grade below are not moved.

   ---- The mid-year review ---------------------------------------------------
   At the winter benchmark (the last reading from December 1 to two weeks
   past the winter due date):
     - below the spring goal: the goal stands
     - past it, goal on the grade's own table: the winter reading is placed
       on the WINTER values the same way and the goal becomes that row's
       spring value, never lower. 69 -> 72, 73 -> 100, 124 -> 148, 150 -> 161.
     - past it, goal already above grade level: the number stays and the
       goal adds "all 3 comprehension questions correct" (161+, 166+).
   The one row this does not reproduce is 37 -> 94 at winter, which the
   rule puts on 100 and the sheet raised to 124.

   Two pace-based methods are kept as alternatives, for a student the
   table sells short: 1.5 ("realistic") or 2.0 ("ambitious") words a week,
   the grade 2 rates from Fuchs, Fuchs, Hamlett, Walz & Germann (1993),
   counted over instructional weeks (H&T's 32 between fall and spring,
   which is 34.6 calendar weeks). Every goal can be overwritten by typing.

   ---- How the monthly goals are spaced -------------------------------------
   Table method: a straight line from the first check to the winter goal
   (Winter benchmark due, default January 15), and another on to the
   spring goal (Spring benchmark due, default May 14). A goal the mid-year
   review raised restarts the second line from the winter reading. Because the table
   itself front-loads the year (50th row: +34 fall to winter, +16 winter
   to spring), so do the months. Pace methods follow the same H&T curve
   for the student's starting percentile, stretched to end on the goal.
   ============================================================ */
(function () {
  "use strict";
  if (window.FluencyExtras) return;

  var KEY = "running-records-v1";
  var GOALS_KEY = "suite:orfgoals:v1";
  var DAY = 86400000;

  var PCTS = [10, 25, 50, 75, 90];
  /* the running-records tool's own grade 2 rows, used only to reproduce its
     chart's scale for the aim line */
  var ROWS = { 10: [23, 35, 43], 25: [36, 59, 72], 50: [50, 84, 100], 75: [84, 109, 124], 90: [111, 131, 148] };
  var PACE = { realistic: 1.5, ambitious: 2.0 };
  var METHODS = { table: 1, realistic: 1, ambitious: 1 };

  /* Hasbrouck & Tindal 2017, grades 1-6: percentile -> [fall, winter,
     spring]. Grade 1 has no fall norms. */
  var HT = {
    1: { 90: [null, 97, 116], 75: [null, 59, 91], 50: [null, 29, 60], 25: [null, 16, 34], 10: [null, 9, 18] },
    2: { 90: [111, 131, 148], 75: [84, 109, 124], 50: [50, 84, 100], 25: [36, 59, 72], 10: [23, 35, 43] },
    3: { 90: [134, 161, 166], 75: [104, 137, 139], 50: [83, 97, 112], 25: [59, 79, 91], 10: [40, 62, 63] },
    4: { 90: [153, 168, 184], 75: [125, 143, 160], 50: [94, 120, 133], 25: [75, 95, 105], 10: [60, 71, 83] },
    5: { 90: [179, 183, 195], 75: [153, 160, 169], 50: [121, 133, 146], 25: [87, 109, 119], 10: [64, 84, 102] },
    6: { 90: [185, 195, 204], 75: [159, 166, 173], 50: [132, 145, 146], 25: [112, 116, 122], 10: [89, 91, 91] }
  };
  var WIN = ["fall", "winter", "spring"];

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

  /* ---------- storage ---------- */
  function readDB() {
    try {
      var d = JSON.parse(window.localStorage.getItem(KEY) || "null");
      if (d && Array.isArray(d.students) && Array.isArray(d.records)) return d;
    } catch (e) { }
    return null;
  }
  function readGoals() {
    var g = null;
    try { g = JSON.parse(window.localStorage.getItem(GOALS_KEY) || "null"); } catch (e) { }
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
  /* Comprehension, 0-3 questions, per saved check. The tool's own records
     have no field for it and it would drop one on its next save, so it
     lives here, keyed by the check's id. */
  var COMP_KEY = "suite:orfcomp:v1";
  function readComp() {
    var c = null;
    try { c = JSON.parse(window.localStorage.getItem(COMP_KEY) || "null"); } catch (e) { }
    if (!c || typeof c !== "object" || !c.records || typeof c.records !== "object") c = { records: {} };
    return c;
  }
  function writeComp(c) {
    try { window.localStorage.setItem(COMP_KEY, JSON.stringify(c)); return true; }
    catch (e) { toast("Couldn't save comprehension on this device."); return false; }
  }
  function writeGoals(g) {
    try { window.localStorage.setItem(GOALS_KEY, JSON.stringify(g)); return true; }
    catch (e) { toast("Couldn't save the goal on this device."); return false; }
  }

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
  function today() { return api.today ? new Date(api.today) : new Date(); }
  /* The school year a date falls in starts on August 1. */
  function yearStart(now) { return new Date(now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1, 7, 1); }
  function dueIn(now, mmdd) {
    var y = yearStart(now).getFullYear();
    var mm = +String(mmdd).slice(0, 2), dd = +String(mmdd).slice(3, 5);
    return new Date(mm >= 8 ? y : y + 1, mm - 1, dd, 12);
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
  function windowOf(d) { var m = d.getMonth(); return m >= 7 && m <= 10 ? "fall" : (m === 11 || m <= 1) ? "winter" : "spring"; }
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
    now = now || today();
    var compMap = (compState || readComp()).records;
    function compOn(t) {
      var best = null;
      checks.forEach(function (c) { var v = compMap[c.rec.id]; if (c.t === t && v != null && (best == null || v > best)) best = v; });
      return best;
    }
    var grade = HT[goalsState.grade] ? +goalsState.grade : 2;
    var y0 = yearStart(now).getTime();
    var springDate = dueIn(now, goalsState.springDue || "05-14");
    var tG = springDate.getTime();
    var checks = checksIn(db, sid, y0, tG + 45 * DAY);
    if (!checks.length) return null;
    var B = benchDates(now);
    var t0 = checks[0].t;
    var base = dayMedian(checks, t0);
    if (t0 >= tG) return null;
    var tW = dueIn(now, goalsState.winterDue || "01-15").getTime();
    var hasWinter = tW > t0 + 7 * DAY && tW < tG;
    var win = windowOf(new Date(t0));

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

  /* ---------- page helpers ---------- */
  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function toast(msg) {
    var t = $("#toast"); if (!t) return;
    t.textContent = msg; t.classList.add("on");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("on"); }, 2400);
  }
  function nameParts(n) {
    n = String(n || "").trim();
    if (n.indexOf(",") > -1) { var b = n.split(","); return { last: b[0].trim(), first: b.slice(1).join(",").trim() }; }
    var p = n.split(/\s+/).filter(Boolean);
    if (p.length <= 1) return { last: p[0] || "", first: "" };
    var SUF = /^(jr|sr|ii|iii|iv)\.?$/i, i = p.length - 1;
    while (i > 0 && SUF.test(p[i])) i--;
    return { first: p.slice(0, i).join(" "), last: p.slice(i).join(" ") };
  }
  function lastFirst(n) { var p = nameParts(n); return p.first ? p.last + ", " + p.first : p.last; }
  function firstName(n) { var p = nameParts(n); return p.first || p.last; }

  var STATUS = {
    start: ["First check of the year", "var(--muted)"],
    met: ["At the goal", "var(--accent)"],
    metBoy: ["Past the start-of-year goal", "var(--sc)"],
    on: ["On track", "var(--accent)"],
    close: ["Just under the line", "var(--warn)"],
    below: ["Below the line", "var(--err)"],
    /* spring results, in last year's words and colours */
    "r-green": ["Made the goal", "var(--accent)"],
    "r-blue": ["Made the start-of-year goal", "var(--sc)"],
    "r-yellow": ["Goal not made, at or above grade level", "var(--warn)"],
    "r-red": ["Goal not made, below grade level", "var(--err)"]
  };
  var RESULT_ORDER = ["r-green", "r-blue", "r-yellow", "r-red"];
  function statusLabel(pl) {
    if (pl.status === "r-green" && (pl.goal > pl.boySpring || pl.comp)) return "Made the mid-year goal";
    return STATUS[pl.status][0];
  }
  var COMP = "all 3 comprehension questions correct";
  function statusCell(pl) {
    var s = STATUS[pl.status];
    var extra = pl.status === "on" || pl.status === "close" || pl.status === "below"
      ? " <span class=\"hint\" style=\"display:inline\">(" + (pl.diff > 0 ? "+" : "") + pl.diff + ")</span>"
      : pl.status === "met" && pl.comp && pl.latestComp !== 3
        ? " <span class=\"hint\" style=\"display:inline\">\u00b7 comprehension " + (pl.latestComp == null ? "not recorded" : pl.latestComp + "/3, needs 3/3") + "</span>" : "";
    if (pl.flagged) extra += " <span class=\"hint\" style=\"display:inline;color:var(--err)\">\u00b7 flagged: " + pl.springActual + " is below " + pl.expectation + ", within the margin of error</span>";
    return "<span style=\"color:" + s[1] + "\">" + statusLabel(pl) + "</span>" + extra;
  }
  function goalText(pl) { return pl.goal + (pl.comp ? "+" : ""); }
  function isoOf(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

  function settingsHTML(g) {
    var o = function (v, t, cur) { return "<option value=\"" + v + "\"" + (String(cur) === String(v) ? " selected" : "") + ">" + t + "</option>"; };
    var now = today();
    return "<div class=\"row\" style=\"margin-bottom:6px\">" +
      "<div style=\"flex:0 0 110px\"><label class=\"fld\" for=\"fxGrade\">Grade</label><select id=\"fxGrade\">" +
        [1, 2, 3, 4, 5, 6].map(function (n) { return o(n, "Grade " + n, g.grade); }).join("") + "</select></div>" +
      "<div style=\"flex:1 1 280px\"><label class=\"fld\" for=\"fxMethod\">How suggested goals are set</label><select id=\"fxMethod\">" +
        o("table", "H\u0026T table \u2014 the student\u2019s row (last year\u2019s way)", g.method) +
        o("realistic", "Growth pace \u2014 1.5 words a week", g.method) +
        o("ambitious", "Growth pace \u2014 2.0 words a week", g.method) + "</select></div>" +
      "<div style=\"flex:0 0 165px\"><label class=\"fld\" for=\"fxWinterDue\">Winter benchmark due</label><input type=\"date\" id=\"fxWinterDue\" value=\"" + isoOf(dueIn(now, g.winterDue)) + "\"></div>" +
      "<div style=\"flex:0 0 165px\"><label class=\"fld\" for=\"fxSpringDue\">Spring benchmark due</label><input type=\"date\" id=\"fxSpringDue\" value=\"" + isoOf(dueIn(now, g.springDue)) + "\"></div>" +
      "<div style=\"flex:0 0 150px\"><label class=\"fld\" for=\"fxTol\">Counts as made within</label><input type=\"number\" id=\"fxTol\" min=\"0\" max=\"15\" value=\"" + g.tolerance + "\"></div>" +
      "<div style=\"flex:0 0 200px\"><label class=\"fld\" for=\"fxExpect\">Grade level: end-of-year 50th</label><input type=\"number\" id=\"fxExpect\" min=\"1\" max=\"300\" value=\"" + (g.expectation || HT[g.grade][50][2]) + "\"></div>" +
      "<div style=\"flex:0 0 150px\"><label class=\"fld\" for=\"fxMargin\">Margin of error</label><input type=\"number\" id=\"fxMargin\" min=\"0\" max=\"30\" value=\"" + g.margin + "\"></div>" +
      "<div style=\"flex:1 1 100%\"><label class=\"checkline\"><input type=\"checkbox\" id=\"fxRowUp\"" + (g.rowUp ? " checked" : "") + "> Start students below the 25th percentile one row up</label></div>" +
      "</div>";
  }

  /* ---------- the Growth tab ---------- */
  function goalsPanel() {
    var el = $("#fxGoals");
    if (el) return el;
    var detail = $("#gwDetailPanel");
    if (!detail || !detail.parentNode) return null;
    el = document.createElement("div");
    el.className = "panel";
    el.id = "fxGoals";
    detail.parentNode.insertBefore(el, detail);
    el.addEventListener("change", onGoalsChange);
    el.addEventListener("click", onGoalsClick);
    return el;
  }

  function renderGoals() {
    var el = goalsPanel();
    if (!el) return;
    var db = readDB();
    var sel = $("#gwStudent");
    var sid = sel ? sel.value : "";
    if (!db || !db.students.length) { el.innerHTML = ""; el.hidden = true; return; }
    el.hidden = false;
    var g = readGoals();
    if (sid) {
      var st = db.students.find(function (s) { return s.id === sid; });
      var pl = st && planFor(db, sid, g);
      el.innerHTML = pl ? studentHTML(st, pl, g) :
        "<h2>Goals</h2><p class=\"empty\">No checks yet this school year. The first one sets the starting point, and the goals follow from it.</p>";
      drawAimLine(db, pl);
      return;
    }
    var rows = db.students.map(function (s) { var p = planFor(db, s.id, g); return p ? { st: s, pl: p } : null; })
      .filter(Boolean)
      .sort(function (a, b) {
        var A = nameParts(a.st.name), Bn = nameParts(b.st.name);
        return A.last.localeCompare(Bn.last) || A.first.localeCompare(Bn.first);
      });
    el.innerHTML = classHTML(rows, g);
  }

  function classHTML(rows, g) {
    var h = "<h2>Winter, spring and monthly goals</h2>" + settingsHTML(g);
    if (!rows.length) return h + "<p class=\"empty\">No checks yet this school year. Each student\u2019s first check sets their starting point.</p>";
    var now = today();
    var withMonth = rows.find(function (r) { return r.pl.thisMonth && !r.pl.thisMonth.checkpoint; });
    var monthLabel = withMonth ? withMonth.pl.thisMonth.label : null;
    /* the mid-year column appears once there is a winter benchmark to review */
    var reviewed = rows.some(function (r) { return r.pl.winterActual != null; });
    var mark = function (on) { return on ? " <span class=\"hint\" style=\"display:inline\">set</span>" : ""; };
    h += "<div class=\"scroll\"><table><tr><th>Student</th><th class=\"num\">First check</th><th class=\"num\">Winter goal</th>" +
      (reviewed ? "<th class=\"num\">Winter actual</th>" : "") +
      "<th class=\"num\">Spring goal" + (reviewed ? " (start of year)" : "") + "</th>" +
      (reviewed ? "<th class=\"num\">Spring goal (mid-year)</th>" : "") +
      (monthLabel ? "<th class=\"num\">Goal for " + esc(monthLabel) + "</th>" : "") +
      "<th class=\"num\">Latest</th><th>Where they are</th></tr>";
    var compOf = function (p) { return p.latestComp == null ? "" : " <span class=\"hint\" style=\"display:inline\">" + p.latestComp + "/3</span>"; };
    rows.forEach(function (r) {
      var p = r.pl;
      h += "<tr><td><button class=\"btn quiet small\" data-fx-open=\"" + esc(r.st.id) + "\" style=\"padding:2px 6px;white-space:nowrap\">" + esc(lastFirst(r.st.name)) + "</button></td>" +
        "<td class=\"num\">" + p.base + "</td>" +
        "<td class=\"num\">" + (p.winterGoal == null ? "\u2014" : p.winterGoal + mark(p.own.winter != null)) + "</td>" +
        (reviewed ? "<td class=\"num\">" + (p.winterActual == null ? "\u2014" : p.winterActual) + "</td>" : "") +
        "<td class=\"num\">" + (reviewed ? p.boySpring : goalText(p) + mark(p.own.spring != null)) + "</td>" +
        (reviewed ? "<td class=\"num\">" + (p.winterActual == null && p.own.spring == null ? "\u2014" :
          goalText(p) + (p.comp ? " <span class=\"hint\" style=\"display:inline\">w/ comprehension</span>" : "") + mark(p.own.spring != null)) + "</td>" : "") +
        (monthLabel ? "<td class=\"num\">" + (p.thisMonth && !p.thisMonth.checkpoint ? p.thisMonth.target : "\u2014") + "</td>" : "") +
        "<td class=\"num\">" + p.latestY + compOf(p) + "</td>" +
        "<td>" + statusCell(p) + (p.belowRun >= 3 ? " <span class=\"hint\" style=\"display:inline;color:var(--err)\">\u00b7 " + p.belowRun + " in a row</span>" : "") + "</td></tr>";
    });
    h += "</table></div>";
    var done = rows.filter(function (r) { return r.pl.result; });
    if (done.length) {
      var anyRaised = done.some(function (r) { return r.pl.goal > r.pl.boySpring || r.pl.comp; });
      h += "<h3>Spring results</h3><div class=\"scroll\"><table>" + RESULT_ORDER.map(function (k) {
        var n = done.filter(function (r) { return r.pl.status === k; }).length;
        var label = k === "r-green" && anyRaised ? "Made the goal in force (mid-year, where raised)" : STATUS[k][0];
        var fl = k === "r-yellow" ? done.filter(function (r) { return r.pl.flagged; }).length : 0;
        return "<tr><td style=\"color:" + STATUS[k][1] + "\">" + label + (fl ? " <span class=\"hint\" style=\"display:inline\">\u00b7 " + fl + " flagged, below the line within the margin</span>" : "") +
          "</td><td class=\"num\">" + n + "</td><td class=\"num\">" + Math.round(100 * n / done.length) + "%</td></tr>";
      }).join("") + "</table></div><p class=\"hint\">" + done.length + " students with a spring reading. \u201cMade\u201d includes a score up to " + g.tolerance +
        " word" + (g.tolerance === 1 ? "" : "s") + " short, and a goal that asks for comprehension needs 3 of 3. Grade level is " +
        (g.expectation || HT[g.grade][50][2]) + ", the end-of-year 50th percentile, less a " + g.margin + "-word margin of error: " +
        "yellow includes " + ((g.expectation || HT[g.grade][50][2]) - g.margin) + " and up, and the ones below " + (g.expectation || HT[g.grade][50][2]) + " are flagged. " +
        "These colours are for fluency goals only, not report card marks.</p>";
    }
    h += "<p class=\"hint\">" + (g.method === "table"
      ? "Goals come from the Hasbrouck \u0026 Tindal grade " + g.grade + " row each student\u2019s first check is closest to: that row\u2019s winter value by the winter benchmark, its spring value by the spring one. Well below or above the table, the next steps along the 10th or 90th row into the grade below or above. "
      : "Goals keep a student\u2019s percentile, or reach the spring 50th percentile if the chosen pace can, or else go as far as that pace does. ") +
      "At the winter benchmark, a student already past their spring goal gets a new one from their winter score; one whose goal was already above grade level keeps the number and adds " + COMP + ". " +
      "Monthly goals run in straight steps between the checkpoints. Tap a name to see the months or type goals of your own.</p>";
    return h;
  }

  function studentHTML(st, p, g) {
    var nm = firstName(st.name);
    var compAll = readComp().records;
    var h = "<h2>Goals for " + esc(nm) + "</h2>";
    h += "<div class=\"row\" style=\"align-items:flex-end\">" +
      (p.winterGoal != null ? "<div style=\"flex:0 0 140px\"><label class=\"fld\" for=\"fxWinter\">Winter goal</label>" +
        "<input type=\"number\" id=\"fxWinter\" min=\"1\" max=\"300\" value=\"" + p.winterGoal + "\" data-sid=\"" + esc(st.id) + "\"></div>" : "") +
      "<div style=\"flex:0 0 140px\"><label class=\"fld\" for=\"fxGoal\">Spring goal</label>" +
      "<input type=\"number\" id=\"fxGoal\" min=\"1\" max=\"300\" value=\"" + p.goal + "\" data-sid=\"" + esc(st.id) + "\"></div>" +
      (p.custom ? "<div style=\"flex:0 0 auto\"><button class=\"btn quiet\" data-fx-reset=\"" + esc(st.id) + "\">Use the suggested " +
        (p.suggestedWinter != null ? p.suggestedWinter + " / " : "") + p.suggested + "</button></div>" : "") +
      "</div>";
    var notes = [];
    notes.push("First check " + p.base + " on " + fmtShort(p.baseDate) + " (grade " + p.grade + ", " +
      (p.standing.below ? "below the 10th percentile" : p.standing.above ? "above the 90th percentile" : "about the " + ordinal(Math.round(p.standing.p)) + " percentile") + ").");
    notes.push((p.own.winter != null || p.own.spring != null ? "You set " + (p.own.winter != null && p.own.spring != null ? "both goals" : p.own.winter != null ? "the winter goal" : "the spring goal") + ". Suggested: " : "Suggested from ") + esc(p.why) + ".");
    if (p.winterActual != null && p.own.spring == null) {
      notes.push(p.review.comp
        ? "Mid-year review: " + p.winterActual + " at winter is past the spring goal, which is already above grade level, so it stays " + p.goal + " and adds " + COMP + "."
        : p.review.changed
          ? "Mid-year review: " + p.winterActual + " at winter is past the start-of-year spring goal of " + p.boySpring + ", so the spring goal is now " + p.goal + " (" + esc(p.review.table.springLab) + ", " + ordinal(p.review.table.row) + " percentile)."
          : "Mid-year review: " + p.winterActual + " at winter" + (p.winterActual < p.boySpring ? " is not yet past the spring goal, so it stands." : ", and the goal stands."));
    }
    notes.push("Grade, method and benchmark dates are on the whole-class view.");
    h += "<p class=\"hint\">" + notes.join(" ") + "</p>";

    h += "<div class=\"scroll\" style=\"margin-top:10px\"><table><tr><th>Month</th><th class=\"num\">Goal</th><th>Checks that month</th></tr>";
    p.months.forEach(function (m) {
      var cur = p.thisMonth === m;
      var checks = m.checks.length
        ? m.checks.map(function (c) {
            var tone = c.vs >= 0 ? "var(--accent)" : c.vs >= -5 ? "var(--warn)" : "var(--err)";
            var cq = c.id != null && compAll[c.id] != null ? " \u00b7 " + compAll[c.id] + "/3" : "";
            return c.y + " <span style=\"color:" + tone + "\">(" + (c.vs > 0 ? "+" : "") + c.vs + ")</span>" + cq;
          }).join(", ")
        : "<span class=\"hint\" style=\"display:inline\">\u2014</span>";
      var strong = cur || m.checkpoint;
      var target = m.checkpoint === "spring" ? goalText(p) : m.target;
      h += "<tr" + (strong ? " style=\"font-weight:600\"" : "") + "><td>" + m.label + (cur ? " \u00b7 now" : "") +
        " <span class=\"hint\" style=\"display:inline;font-weight:400\">by " + fmtShort(m.by) + "</span></td>" +
        "<td class=\"num\">" + target + "</td><td>" + checks + "</td></tr>";
    });
    h += "</table></div>";
    h += "<details style=\"margin-top:10px\"><summary class=\"hint\" style=\"cursor:pointer\">Comprehension for each check this year</summary><div class=\"scroll\"><table>" +
      p.checks.map(function (c) {
        var v = compAll[c.rec.id];
        var opt = function (x, t) { return "<option value=\"" + x + "\"" + (String(v == null ? "" : v) === String(x) ? " selected" : "") + ">" + t + "</option>"; };
        return "<tr><td>" + fmtShort(c.d) + "</td><td class=\"num\">" + c.y + "</td><td><select data-fx-comp=\"" + esc(c.rec.id) + "\" aria-label=\"Comprehension, " + fmtShort(c.d) + "\">" +
          opt("", "Not asked") + opt(0, "0 of 3") + opt(1, "1 of 3") + opt(2, "2 of 3") + opt(3, "3 of 3") + "</select></td></tr>";
      }).join("") + "</table></div></details>";

    var lines = [];
    if (p.result) lines.push("Spring benchmark: " + p.springActual + (p.springComp != null ? " with " + p.springComp + "/3 comprehension" : "") + " on " + fmtShort(p.springDate) + " \u2014 " + statusLabel(p).toLowerCase() + ".");
    if (p.status === "met") lines.push(p.comp ? "At the spring goal on words per minute. The goal also asks for " + COMP + "." : "Already at the spring goal. It may be worth raising it and leaning on phrasing and comprehension.");
    else if (p.status === "metBoy") lines.push("Past the start-of-year goal of " + p.boySpring + ", not yet at the mid-year one of " + p.goal + ".");
    if (p.status !== "met" && p.perWeekNow != null) {
      var w = p.perWeekNow;
      lines.push("From the latest check, " + p.latestY + " on " + fmtShort(p.latest.d) + ", reaching " + p.goal + " by " + fmtLong(p.goalDate) +
        " takes about " + w.toFixed(1) + " words a week" + (w > 2.5 ? " \u2014 faster than readers usually grow." : "."));
    }
    if (p.belowRun >= 3) lines.push("The last " + p.belowRun + " checks are all below the aim line. Three in a row is Hasbrouck\u2019s signal to consider changing the instructional plan.");
    h += "<div class=\"verdict" + (p.belowRun >= 3 || p.status === "below" ? " behind" : p.status === "close" ? " off" : "") + "\">" + lines.join(" ") +
      " The number after each check is how far it sits above or below the aim line on that day.</div>";
    return h;
  }

  function onGoalsChange(e) {
    var t = e.target, g = readGoals();
    if (t.id === "fxMethod") { g.method = METHODS[t.value] ? t.value : "table"; writeGoals(g); renderGoals(); return; }
    if (t.id === "fxGrade") { g.grade = HT[t.value] ? +t.value : 2; writeGoals(g); renderGoals(); return; }
    if (t.id === "fxMargin") { var mv = Math.round(+t.value); g.margin = mv >= 0 && mv <= 30 ? mv : 10; writeGoals(g); renderGoals(); return; }
    if (t.id === "fxRowUp") { g.rowUp = !!t.checked; writeGoals(g); renderGoals(); return; }
    if (t.id === "fxTol") { var tv = Math.round(+t.value); g.tolerance = tv >= 0 && tv <= 15 ? tv : 2; writeGoals(g); renderGoals(); return; }
    if (t.id === "fxExpect") {
      var ev = Math.round(+t.value);
      g.expectation = ev > 0 && ev <= 300 && ev !== HT[g.grade][50][2] ? ev : null;
      writeGoals(g); renderGoals(); return;
    }
    if (t.hasAttribute("data-fx-comp")) {
      var c = readComp(), cv = t.value;
      if (cv === "") delete c.records[t.getAttribute("data-fx-comp")]; else c.records[t.getAttribute("data-fx-comp")] = +cv;
      writeComp(c); renderGoals(); return;
    }
    if (t.id === "fxWinterDue" || t.id === "fxSpringDue") {
      var m = String(t.value || "").match(/^\d{4}-(\d{2})-(\d{2})$/);
      if (m) { g[t.id === "fxWinterDue" ? "winterDue" : "springDue"] = m[1] + "-" + m[2]; writeGoals(g); }
      renderGoals(); return;
    }
    if (t.id === "fxGoal" || t.id === "fxWinter") {
      var v = Math.round(+t.value);
      if (!(v > 0 && v <= 300)) { toast("A goal between 1 and 300."); renderGoals(); return; }
      var sid = t.dataset.sid, o = g.goals[sid];
      o = typeof o === "number" ? { spring: o } : (o && typeof o === "object" ? o : {});
      o[t.id === "fxGoal" ? "spring" : "winter"] = v;
      g.goals[sid] = o;
      writeGoals(g); renderGoals(); toast("Goal set.");
    }
  }
  function onGoalsClick(e) {
    var b = e.target.closest("[data-fx-reset]");
    if (b) { var g = readGoals(); delete g.goals[b.dataset.fxReset]; writeGoals(g); renderGoals(); return; }
    var o = e.target.closest("[data-fx-open]");
    if (o) {
      var sel = $("#gwStudent"); if (!sel) return;
      sel.value = o.dataset.fxOpen;
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      window.scrollTo({ top: 0 });
    }
  }

  /* The aim line on the tool's own chart. The chart's scale is not exposed,
     so it is worked out here the same way the tool works it out — and then
     checked against where the tool actually drew its first and last dots.
     If they disagree (the chart changed shape) nothing is drawn, rather
     than a line in the wrong place. */
  function drawAimLine(db, pl) {
    var svg = document.querySelector("#gwChart svg");
    if (!svg || !pl) return;
    var old = svg.querySelector("#fxAim"); if (old) old.remove();
    var recs = db.records.filter(function (r) { return r.studentId === pl.sid; })
      .slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    var points = recs.map(function (r) { return { t: new Date(r.date).getTime(), y: r.wcpm }; });
    if (!points.length) return;
    var goal = +(db.settings && db.settings.goalWcpm) || 80;
    /* the tool's own goal date, or the default it falls back to when none
       has been saved (June 5 of the coming spring) */
    var gs = (db.settings && db.settings.goalDate) || "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(gs)) { var nd = new Date(); gs = (nd.getMonth() >= 6 ? nd.getFullYear() + 1 : nd.getFullYear()) + "-06-05"; }
    var gd = new Date(gs + "T00:00:00");
    if (isNaN(gd)) return;
    var benchOn = $("#gwBench") ? $("#gwBench").checked : false;
    var bench = [];
    if (benchOn) {
      var y = gd.getFullYear(), start = gd.getMonth() <= 6 ? y - 1 : y;
      bench = [new Date(start, 8, 15).getTime(), new Date(start + 1, 0, 15).getTime(), new Date(start + 1, 4, 15).getTime()]
        .map(function (t, i) { return { t: t, y: [ROWS[50][0], ROWS[50][1], ROWS[50][2]][i] }; });
    }
    var W = 720, H = 330, padL = 40, padR = 58, padT = 22, padB = 36;
    var all = points.concat(bench);
    var bt = bench.map(function (b) { return b.t; });
    var t0 = Math.min.apply(null, [points[0].t, gd.getTime() - 120 * DAY].concat(bt));
    var t1 = Math.max.apply(null, [gd.getTime(), points[points.length - 1].t + 3 * DAY].concat(bt));
    var span = Math.max(t1 - t0, 30 * DAY);
    var yMax = Math.max(goal * 1.3, Math.max.apply(null, all.map(function (p) { return p.y; })) * 1.2, 40);
    function X(t) { return padL + ((t - t0) / span) * (W - padL - padR); }
    function Y(v) { return H - padB - (Math.min(v, yMax) / yMax) * (H - padT - padB); }

    var dots = svg.querySelectorAll("circle[r=\"5.5\"]");
    if (dots.length !== points.length) return;
    var first = dots[0], last = dots[dots.length - 1];
    var close = function (a, b) { return Math.abs(parseFloat(a) - b) < 0.6; };
    if (!close(first.getAttribute("cx"), X(points[0].t)) || !close(first.getAttribute("cy"), Y(points[0].y)) ||
        !close(last.getAttribute("cx"), X(points[points.length - 1].t)) || !close(last.getAttribute("cy"), Y(points[points.length - 1].y))) return;

    var NS = "http://www.w3.org/2000/svg";
    var grp = document.createElementNS(NS, "g");
    grp.setAttribute("id", "fxAim");
    var ts = [];
    var tStart = pl.baseDate.getTime(), tEnd = pl.goalDate.getTime();
    for (var k = 0; k <= 40; k++) ts.push(tStart + (tEnd - tStart) * k / 40);
    var d = ts.map(function (t, i) { return (i ? "L" : "M") + X(t).toFixed(1) + "," + Y(pl.aim(t)).toFixed(1); }).join(" ");
    var path = document.createElementNS(NS, "path");
    path.setAttribute("d", d); path.setAttribute("fill", "none");
    path.setAttribute("stroke", "var(--sc)"); path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-dasharray", "2 4"); path.setAttribute("stroke-linecap", "round");
    grp.appendChild(path);
    pl.months.forEach(function (m) {
      var cx = X(m.by.getTime()), cy = Y(m.target);
      var r = document.createElementNS(NS, "rect");
      r.setAttribute("x", (cx - 3.5).toFixed(1)); r.setAttribute("y", (cy - 3.5).toFixed(1));
      r.setAttribute("width", "7"); r.setAttribute("height", "7");
      r.setAttribute("transform", "rotate(45 " + cx.toFixed(1) + " " + cy.toFixed(1) + ")");
      r.setAttribute("fill", "var(--sc)");
      grp.appendChild(r);
    });
    /* labelled under the line partway along its last stretch, clear of the
       goal line's own label and of the 50th-percentile track's */
    var tl = (pl.winterDue ? pl.winterDue.getTime() : tStart) + ((tEnd - (pl.winterDue ? pl.winterDue.getTime() : tStart)) * 0.45);
    var lab = document.createElementNS(NS, "text");
    lab.setAttribute("x", X(tl).toFixed(1)); lab.setAttribute("y", (Y(pl.aim(tl)) + 18).toFixed(1));
    lab.setAttribute("text-anchor", "middle"); lab.setAttribute("font-size", "11"); lab.setAttribute("fill", "var(--sc)");
    lab.textContent = "aim line";
    grp.appendChild(lab);
    svg.insertBefore(grp, first);
  }

  /* ---------- the roster ---------- */
  /* Same rule as stripEldTag() in the gradebook: bare "ELD" in capitals, or
     "(ELD)" / "[ELD]" in any case, as a whole word at the start or end of a
     name or of either half of "Last, First". */
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
      do { prev = t; pats.forEach(function (re) { var n = t.replace(re, "").trim(); if (n !== t) { eld = true; t = n; } }); } while (t !== prev);
      return t;
    });
    var name = parts.filter(Boolean).join(", ");
    if (!name) return { name: raw.trim(), eld: false };
    return { name: eld ? name : raw.trim(), eld: eld };
  }

  /* The tool keeps its roster in memory and writes the whole thing back on
     every change, so a name changed only in storage would be overwritten by
     its next save. Wait out any save already queued (its timer is 120ms),
     change the stored copy, and reload so the tool reads it back in. */
  var api = { reload: function () { location.reload(); } };
  function editStored(mutate, done) {
    setTimeout(function () {
      var raw = null;
      try { raw = window.localStorage.getItem(KEY); } catch (e) { }
      var d = null;
      try { d = JSON.parse(raw || "null"); } catch (e) { }
      if (!d || !Array.isArray(d.students)) { toast("Couldn't read the roster on this device."); return; }
      var msg = mutate(d);
      if (!msg) return;
      try { window.localStorage.setItem(KEY, JSON.stringify(d)); }
      catch (e) { toast("Couldn't save \u2014 nothing was changed."); return; }
      try { sessionStorage.setItem("fx:return", JSON.stringify({ tab: "students", toast: msg })); } catch (e) { }
      if (done) done(msg);
      api.reload();
    }, 250);
  }

  function renameStudent(id, name) {
    name = String(name || "").replace(/\s+/g, " ").trim();
    if (!name) { toast("Type a name."); return; }
    editStored(function (d) {
      var st = d.students.find(function (s) { return s.id === id; });
      if (!st) { toast("That student is no longer on the roster."); return null; }
      if (st.name === name) return null;
      if (d.students.some(function (s) { return s.id !== id && String(s.name).toLowerCase() === name.toLowerCase(); })) {
        toast("Someone on the roster already has that name."); return null;
      }
      st.name = name;
      return "Renamed. Their checks stay with them.";
    });
  }
  function untagAll() {
    editStored(function (d) {
      var n = 0, clash = 0;
      d.students.forEach(function (s) {
        var t = stripEld(s.name);
        if (!t.eld) return;
        if (d.students.some(function (o) { return o !== s && String(o.name).toLowerCase() === t.name.toLowerCase(); })) { clash++; return; }
        s.name = t.name; n++;
      });
      if (!n) { toast(clash ? "Those names are already on the roster without the tag \u2014 rename them by hand." : "No names start with ELD."); return null; }
      return "Took ELD off " + n + " name" + (n === 1 ? "" : "s") + "." + (clash ? " " + clash + " left, because the same name is already on the roster." : "");
    });
  }

  function decorateRoster() {
    var list = $("#studentList");
    if (!list || window.storage) return;
    var db = readDB();
    list.querySelectorAll(".list-item").forEach(function (li) {
      var del = li.querySelector("[data-del-student]");
      if (!del || li.querySelector("[data-fx-rename]")) return;
      var b = document.createElement("button");
      b.className = "btn quiet small";
      b.textContent = "Rename";
      b.setAttribute("data-fx-rename", del.getAttribute("data-del-student"));
      var wrap = document.createElement("div");
      wrap.style.cssText = "display:flex;gap:6px;flex:none";
      del.parentNode.insertBefore(wrap, del);
      wrap.appendChild(b); wrap.appendChild(del);
    });
    var tagged = db ? db.students.filter(function (s) { return !s.demo && stripEld(s.name).eld; }) : [];
    var old = $("#fxEld");
    /* this runs from an observer on the list, and adding the notice is itself
       a change to the list: touch it only when it has to change */
    var want = tagged.length ? String(tagged.length) : "";
    if (old && old.getAttribute("data-n") === want && old.parentNode === list && list.firstChild === old) return;
    if (!old && !want) return;
    if (old) old.remove();
    if (tagged.length) {
      var n = document.createElement("div");
      n.id = "fxEld";
      n.setAttribute("data-n", want);
      n.className = "verdict off";
      n.style.margin = "0 0 12px";
      n.innerHTML = tagged.length + " name" + (tagged.length === 1 ? " starts" : "s start") + " with \u201cELD\u201d. " +
        "The gradebook reads past the tag now, links each one to the right student and ticks their ELD box, so this is only tidying. " +
        "<button class=\"btn quiet small\" data-fx-untag style=\"margin-left:6px\">Take \u201cELD\u201d off " + (tagged.length === 1 ? "it" : "all " + tagged.length) + "</button>";
      list.insertBefore(n, list.firstChild);
    }
  }
  function onRosterClick(e) {
    var r = e.target.closest("[data-fx-rename]");
    if (r) {
      var id = r.getAttribute("data-fx-rename");
      var li = r.closest(".list-item");
      var db = readDB();
      var st = db && db.students.find(function (s) { return s.id === id; });
      if (!li || !st) return;
      var main = li.querySelector(".li-main");
      main.innerHTML = "<label class=\"fld\" for=\"fxName\">Name</label><input type=\"text\" id=\"fxName\" value=\"" + esc(st.name) + "\" autocomplete=\"off\">";
      r.parentNode.innerHTML = "<button class=\"btn small\" data-fx-save=\"" + esc(id) + "\">Save</button><button class=\"btn quiet small\" data-fx-cancel>Cancel</button>";
      var inp = main.querySelector("input");
      inp.focus(); inp.select();
      inp.addEventListener("keydown", function (k) {
        if (k.key === "Enter") renameStudent(id, inp.value);
        if (k.key === "Escape") api.reload();
      });
      return;
    }
    var s = e.target.closest("[data-fx-save]");
    if (s) { var v = $("#fxName"); renameStudent(s.getAttribute("data-fx-save"), v ? v.value : ""); return; }
    if (e.target.closest("[data-fx-cancel]")) { api.reload(); return; }
    if (e.target.closest("[data-fx-untag]")) {
      if (!confirm("Take \u201cELD\u201d off the front or end of these names? Their checks stay with them.")) return;
      untagAll();
    }
  }

  /* ---------- comprehension on the Assess tab ---------- */
  /* After a read the tool shows its scores and a "Save this check" button.
     A row of chips goes above that button: Not asked, 0-3 of 3. When the
     check is saved the tool gives it an id this script cannot see, so the
     choice is held with the ids already stored, and once the tool's save
     has landed (its timer is 120ms) the check for that student that was not
     there before is the new one, and the choice is filed under its id. Changing it later is on the Growth tab. */
  var compPick = null, compPending = null;
  function decorateResults() {
    var res = $("#results");
    if (!res) return;
    var save = res.querySelector("#btnSaveRec");
    if (!save) { compPick = null; return; }
    if (res.querySelector("#fxComp")) return;
    compPick = null;
    var row = save.closest(".row") || save.parentNode;
    var box = document.createElement("div");
    box.id = "fxComp";
    box.style.cssText = "margin:4px 0 12px;font-size:13px;color:var(--ink-2)";
    box.innerHTML = "Comprehension questions: " + [["", "Not asked"], [0, "0 of 3"], [1, "1 of 3"], [2, "2 of 3"], [3, "3 of 3"]].map(function (x) {
      return "<span class=\"chip tap" + (x[0] === "" ? " on" : "") + "\" role=\"button\" tabindex=\"0\" data-fx-q=\"" + x[0] + "\">" + x[1] + "</span>";
    }).join("");
    row.parentNode.insertBefore(box, row);
  }
  function onResultsClick(e) {
    var chip = e.target.closest("[data-fx-q]");
    if (chip) {
      var v = chip.getAttribute("data-fx-q");
      compPick = v === "" ? null : +v;
      chip.parentNode.querySelectorAll("[data-fx-q]").forEach(function (c) { c.classList.toggle("on", c === chip); });
      return;
    }
    if (e.target.closest("#btnSaveRec") && compPick != null) {
      var sel = $("#selStudent"), db0 = readDB();
      /* the checks already stored for this student: the new one is whichever
         is not among them once the tool has saved (no clocks compared) */
      var had = {};
      (db0 ? db0.records : []).forEach(function (r) { had[r.id] = 1; });
      compPending = { sid: sel ? sel.value : "", comp: compPick, had: had };
      setTimeout(fileComp, 400);
    }
  }
  function fileComp() {
    var p = compPending; compPending = null;
    if (!p || !p.sid) return;
    var db = readDB(); if (!db) return;
    var c = readComp();
    var fresh = db.records.filter(function (r) {
      return r.studentId === p.sid && !p.had[r.id] && !(r.id in c.records);
    }).sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    if (!fresh.length) return;            /* the save did not go through */
    c.records[fresh[0].id] = p.comp;
    writeComp(c);
    renderGoals();
  }

  /* ---------- wiring ---------- */
  function watch(sel, fn) {
    var el = $(sel);
    if (!el || !window.MutationObserver) return;
    var t = null;
    new MutationObserver(function () {
      fn();
      /* the tool renders first and saves 120ms later, so look again once the
         saved copy has caught up */
      clearTimeout(t); t = setTimeout(fn, 260);
    }).observe(el, { childList: true });
  }

  function start() {
    if (window.storage) return;           /* running inside a host that stores elsewhere */
    watch("#gwChart", renderGoals);
    watch("#studentList", decorateRoster);
    watch("#results", decorateResults);
    var res = $("#results");
    if (res) res.addEventListener("click", onResultsClick, true);
    var list = $("#studentList");
    if (list) list.addEventListener("click", onRosterClick, true);
    renderGoals(); decorateRoster();
    var back = null;
    try { back = JSON.parse(sessionStorage.getItem("fx:return") || "null"); sessionStorage.removeItem("fx:return"); } catch (e) { }
    if (back && back.tab) {
      var btn = document.querySelector("nav.tabs button[data-tab=\"" + back.tab + "\"]");
      if (btn) btn.click();
      if (back.toast) setTimeout(function () { toast(back.toast); }, 200);
    }
  }

  api.planFor = planFor;
  api.tableGoals = tableGoals;
  api.midYearReview = midYearReview;
  api.HT = HT;
  api.standing = standing;
  api.benchDates = benchDates;
  api.stripEld = stripEld;
  api.readGoals = readGoals;
  api.renderGoals = renderGoals;
  api.decorateRoster = decorateRoster;
  api.renameStudent = renameStudent;
  api.untagAll = untagAll;
  api.GOALS_KEY = GOALS_KEY;
  api.COMP_KEY = COMP_KEY;
  api.springResult = springResult;
  api.readComp = readComp;
  window.FluencyExtras = api;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

/* ============================================================
   groups/orf-suggest.js
   The running-records tool's "Suggested groups" (Reports tab), computed
   from the same saved checks so Small Groups can offer them as reading
   groups.

   fluency/index.html is the teacher's own file and is not edited, so its
   grouping is reproduced here rather than called. The pieces are copied
   exactly: NORMS, windowFor, percentileOf, kmeans1d, and the two ways
   renderGroups() groups a class (by rate, and by instructional need), each
   from every student's latest saved check. test-orf-suggest.js loads the
   real fluency page with the same data and fails if the two ever disagree,
   so a change on that side cannot quietly drift.

   One deliberate difference: the fluency page's Reports tab puts its
   sample class ("Add a sample class") into its groups when one is loaded.
   These are reading groups for real children, so sample students are
   always left out here.

   window.OrfSuggest.suggest(db, basis) -> [{ key, title, desc, members:[...] }]
     db     the running-records-v1 object
     basis  "rate" | "need"
   Each member: { orfId, name, wcpm, accuracy, date, pct:{p, below, above, win}, pctLabel }
   ============================================================ */
(function () {
  "use strict";

  var NORMS = {
    fall: { p90: 111, p75: 84, p50: 50, p25: 36, p10: 23 },
    winter: { p90: 131, p75: 109, p50: 84, p25: 59, p10: 35 },
    spring: { p90: 148, p75: 124, p50: 100, p25: 72, p10: 43 }
  };
  function windowFor(date) {
    var m = new Date(date).getMonth();
    if (m >= 7 && m <= 10) return "fall";
    if (m === 11 || m <= 1) return "winter";
    return "spring";
  }
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
      var pct = percentileOf(r.wcpm, windowFor(r.date));
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

  function suggest(db, basis) {
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

  window.OrfSuggest = { suggest: suggest, latest: latest, percentileOf: percentileOf, windowFor: windowFor, kmeans1d: kmeans1d };
})();

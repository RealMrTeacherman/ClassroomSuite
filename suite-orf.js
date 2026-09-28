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

  window.SuiteOrf = Object.freeze({
    VERSION: 1,
    HT: HT, PCTS: PCTS, SEASONS: SEASONS, norms: norms, windowFor: windowFor,
    stripEld: stripEld, nameParts: nameParts, splitName: splitName,
    lastFirst: lastFirst, firstName: firstName
  });
})();

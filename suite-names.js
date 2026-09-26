/* ============================================================
   suite-names.js (v76)
   Nicknames: "Theo" is Theodore, "Kade" is Kaden.

   The roster comes from school (legal names); the running-records roster
   and old group boards are typed by hand (the names children go by). Each
   gradebook student can carry `aka`, a list of the other names they go by,
   set on Setup → Roster → "Also called", or filled in when two records are
   merged. Every place that matches a typed name to a gradebook student asks
   this file, so a nickname entered once is understood everywhere.

   match() never guesses between two children: every rule below must land on
   exactly one student, or it returns nothing and the caller carries on as
   before (a new student, a visitor, or "shown and skipped").
   ============================================================ */
(function () {
  if (window.SuiteNames) return;

  /* letters only, accents folded: "José" and "Jose" are the same name */
  function norm(s) {
    return String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z]/g, "");
  }
  /* "Theo, Teddy" in the box, or an array once saved */
  function akaList(v) {
    var a = Array.isArray(v) ? v : String(v == null ? "" : v).split(/[,;\/]+/);
    var out = [], seen = {};
    a.forEach(function (x) {
      var t = String(x == null ? "" : x).trim();
      if (!t || seen[norm(t)] || !norm(t)) return;
      seen[norm(t)] = 1; out.push(t);
    });
    return out;
  }
  function namesOf(s) {
    return [norm(s.first)].concat(akaList(s.aka).map(norm)).filter(Boolean);
  }
  function one(list) { return list.length === 1 ? list[0] : null; }

  function match(students, first, last) {
    var f = norm(first), l = norm(last);
    if (!f && !l) return null;
    students = students || [];
    /* one name on its own ("Kade", or "Theo" with no surname) */
    if (!f || !l) {
      var t = f || l;
      return one(students.filter(function (s) { return namesOf(s).indexOf(t) >= 0; }));
    }
    /* the surname as given, or its initial ("Theo R.") */
    function lastOk(s) {
      var sl = norm(s.last);
      return sl === l || (l.length === 1 && sl.charAt(0) === l);
    }
    var hit = one(students.filter(function (s) { return lastOk(s) && namesOf(s).indexOf(f) >= 0; }));
    if (hit) return hit;
    /* "Theo R." where nobody has written down that Theo is Theodore yet:
       only when one child's first name starts with it and has that initial */
    if (l.length === 1 && f.length >= 3) {
      hit = one(students.filter(function (s) { return lastOk(s) && norm(s.first).indexOf(f) === 0; }));
      if (hit) return hit;
    }
    return null;
  }

  /* Two roster records that look like one child under two names: the same
     surname (or one is its initial), and one first name is a nickname of the
     other, either written down as one or a clear shortening of it (Theo,
     Theodore; Kade, Kaden). Returns the one to keep, the legal-looking longer
     name, or null. Never used to merge on its own. */
  function nicknamePair(a, b) {
    var fa = norm(a.first), fb = norm(b.first), la = norm(a.last), lb = norm(b.last);
    if (!fa || !fb || fa === fb || !la || !lb) return null;
    var sameLast = la === lb || (la.length === 1 && lb.charAt(0) === la) || (lb.length === 1 && la.charAt(0) === lb);
    if (!sameLast) return null;
    var listed = namesOf(a).indexOf(fb) >= 0 || namesOf(b).indexOf(fa) >= 0;
    var shorter = fa.length <= fb.length ? fa : fb, longer = shorter === fa ? fb : fa;
    var shortening = shorter.length >= 3 && longer.indexOf(shorter) === 0;
    if (!listed && !shortening) return null;
    /* keep the fuller record: the longer surname, then the longer first name */
    if (la.length !== lb.length) return la.length > lb.length ? a : b;
    return fa.length >= fb.length ? a : b;
  }

  window.SuiteNames = { norm: norm, akaList: akaList, match: match, nicknamePair: nicknamePair };
})();

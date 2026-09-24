/* Data fixes, run before the planner boots so it reads the new shape.
   A fix that adds or removes something is flagged so it happens once and a
   later hand edit sticks; a fix that enforces a state converges on every
   load instead (see toFreeText below). */
(function () {
  var S_KEY = "lp:settings:v2", D_KEY = "lp:days:v2", FLAG = "suite:migrations";

  function done() {
    try { return JSON.parse(localStorage.getItem(FLAG) || "{}"); } catch (e) { return {}; }
  }
  function mark(name) {
    var d = done(); d[name] = new Date().toISOString();
    try { localStorage.setItem(FLAG, JSON.stringify(d)); } catch (e) { }
  }

  /* Reading a position back as text.
     Matches the planner's own fmt() wording, so a day that used to show
     "U2 · W1 · D3" still says exactly that once the block is free text. */
  function posToText(schema, p) {
    if (!p) return "";
    if (p.text != null) return String(p.text);
    if (schema === "uwd" && p.unit != null) {
      return "U" + p.unit + " \u00b7 W" + (p.week || 1) + " \u00b7 D" + (p.day || 1);
    }
    if (schema === "ul" && p.unit != null) return "U" + p.unit + " \u00b7 L" + (p.lesson || 1);
    if (p.lesson != null) return "L" + p.lesson;
    return "";
  }

  /* Turn one subject's stepper into an open field, keeping whatever has
     already been recorded as the text it used to display.

     This one is NOT flagged, and that is deliberate. Flagged migrations run
     once and trust that they worked; this one had two ways to be wrongly
     marked done — an older build marked the Science pass complete in cases
     where it had converted nothing, and a service worker serving a cached
     copy of this file meant the Writing pass never ran at all while the flag
     machinery happily believed otherwise. Checking the actual state on every
     load costs nothing and cannot silently no-op.

     Re-running is safe because the planner has no schema selector: there is
     no way to set a block back to a stepper from the interface, so this is
     never fighting a deliberate choice. If one is ever wanted back, add the
     id to suite:migrations as "open-text-optout": ["writing"] and this
     leaves it alone.

     The first version handled only `ul`, so a `uwd` subject had its unit,
     week and day replaced with an empty string. posToText covers all three. */
  function optedOut(id) {
    var d = done()["open-text-optout"];
    return Array.isArray(d) && d.indexOf(id) >= 0;
  }
  function toFreeText(id) {
    if (optedOut(id)) return;
    try {
      var raw = localStorage.getItem(S_KEY);
      if (!raw) return;                       /* planner has not saved yet; try again next boot */
      var st = JSON.parse(raw);
      if (!Array.isArray(st.subjects)) return;
      var sb = null;
      st.subjects.forEach(function (x) { if (x && x.id === id) sb = x; });
      if (!sb || sb.schema === "free") return;   /* already an open field, or he removed it */

      var was = sb.schema;
      sb.schema = "free";
      sb.start = { text: "" };
      localStorage.setItem(S_KEY, JSON.stringify(st));

      var days = JSON.parse(localStorage.getItem(D_KEY) || "{}");
      var changed = false;
      Object.keys(days).forEach(function (k) {
        var e = days[k] && days[k].entries && days[k].entries[id];
        if (!e || !e.pos || e.pos.text != null) return;
        e.pos = { text: posToText(was, e.pos) };
        changed = true;
      });
      if (changed) localStorage.setItem(D_KEY, JSON.stringify(days));
    } catch (e) { return; }
  }

  /* Health and SEL is real classroom time and he plans it, so it needs its own
     editable block. A block in the planner is a subject in `lp:settings:v2`,
     which is data — so this is a migration rather than a change to his file.

     Free-text schema, like Science/SS and WIN: Health and SEL does not march
     through numbered units, and a wrong guess at a unit scheme would make the
     block annoying rather than useful.

     Flagged, so if he deletes the block later it stays deleted. If settings
     have not been written yet this returns without marking, and picks it up on
     a later load once the planner has saved them — the same shape as the
     migration above. */
  function addHealthSel() {
    if (done()["health-sel-subject"]) return;
    try {
      var raw = localStorage.getItem(S_KEY);
      if (!raw) return;                       /* planner has not saved yet; try again next boot */
      var st = JSON.parse(raw);
      if (!Array.isArray(st.subjects)) return;
      if (st.subjects.some(function (x) { return x.id === "health"; })) { mark("health-sel-subject"); return; }

      var block = {
        id: "health", name: "Health / SEL", curriculum: "",
        schema: "free", color: "#6E5A9B", start: { text: "" }, on: true
      };
      /* sits with Science/SS rather than at the end, since it is the same
         kind of block and they read together */
      var at = -1;
      st.subjects.forEach(function (x, i) { if (x.id === "science") at = i; });
      if (at >= 0) st.subjects.splice(at + 1, 0, block);
      else st.subjects.push(block);

      localStorage.setItem(S_KEY, JSON.stringify(st));
    } catch (e) { return; }
    mark("health-sel-subject");
  }

  /* Wednesday, as the school actually runs it (September 2026).

     The planner's Wednesday template had drifted from the real day: 9:45 was
     "Assembly / Enrichments / Math" linked to Math, so the planner showed
     Math running 9:15–10:30 and the week's one open block had nowhere to be
     written down; and 11:45 was "STEAM — Teacher Choice" where the day has
     GID & Class Store from 11:40.

     Two parts, deliberately different, per the rule above:

     Flagged, once ("wednesday-2026"): an Enrichment subject (free text, like
     WIN, seated after it) and the Wednesday blocks re-pointed. It changes
     things he can edit in Settings afterwards, and a later hand edit must
     stick. suite:migrations syncs, so a second device will not re-apply it.

     Converging, every load: an empty Wednesday is filled in. The planner's
     own "Reset to sub-plan schedule" sets Wednesday to [] (its reset only
     knows mtrfBlocks), and its v4 refill never runs again once tv is
     current, so a reset left Wednesday blank for good. A school day with no
     blocks is wrong every time it is seen. */
  function wedBlocks() {
    return [
      { t: "8:00",  l: "Morning Meeting",                          s: "",        n: "Feelings check-in \u00b7 schedule \u00b7 attendance & lunch count \u00b7 jobs \u00b7 yoga dice" },
      { t: "8:15",  l: "Phonics",                                  s: "phonics", n: "ECRI \u2014 first 15 minutes of the Reading block" },
      { t: "8:30",  l: "Reading",                                  s: "reading", n: "" },
      { t: "9:00",  l: "Structured Break",                         s: "",        n: "Recess" },
      { t: "9:15",  l: "Math",                                     s: "math",    n: "" },
      { t: "9:45",  l: "Assembly / Enrichments / World Wednesday", s: "enrich",  n: "Varies by week \u2014 write it in the Enrichment card" },
      { t: "10:30", l: "WIN",                                      s: "win",     n: "" },
      { t: "11:00", l: "Recess",                                   s: "",        n: "" },
      { t: "11:15", l: "Line up & sanitize",                       s: "",        n: "" },
      { t: "11:20", l: "Lunch",                                    s: "",        n: "" },
      { t: "11:40", l: "GID & Class Store",                        s: "",        n: "Unfinished work first, then the GID menu \u00b7 Class Store" },
      { t: "12:20", l: "PE",                                       s: "",        n: "" },
      { t: "12:55", l: "Dismissal",                                s: "",        n: "" }
    ];
  }
  /* the planner's own clock rule: 12-hour, no am/pm, anything before 7 is pm */
  function clock(t) {
    var m = /^(\d{1,2}):(\d{2})/.exec(String(t || "").trim());
    if (!m) return 1e9;
    var h = +m[1]; if (h < 7) h += 12;
    return h * 60 + (+m[2]);
  }
  function wednesday() {
    try {
      var raw = localStorage.getItem(S_KEY);
      if (!raw) return;                       /* planner has not saved yet; try again next boot */
      var st = JSON.parse(raw);
      if (!st || !Array.isArray(st.subjects) || !st.templates || typeof st.templates !== "object") return;
      var wed = Array.isArray(st.templates[3]) ? st.templates[3] : [];

      if (done()["wednesday-2026"]) {
        if (wed.length) return;
        st.templates[3] = wedBlocks();
        localStorage.setItem(S_KEY, JSON.stringify(st));
        return;
      }

      if (!st.subjects.some(function (x) { return x && x.id === "enrich"; })) {
        var block = {
          id: "enrich", name: "Enrichment",
          curriculum: "Assembly \u00b7 Enrichments \u00b7 World Wednesday",
          schema: "free", color: "#8A6A3B", start: { text: "" }, on: true
        };
        var at = -1;
        st.subjects.forEach(function (x, i) { if (x && x.id === "win") at = i; });
        if (at >= 0) st.subjects.splice(at + 1, 0, block);
        else st.subjects.push(block);
      }

      var want = wedBlocks();
      if (!wed.length) wed = want;
      else {
        var put = function (match, b) {
          var i = -1;
          wed.forEach(function (x, j) { if (i < 0 && x && match(x)) i = j; });
          if (i >= 0) wed[i] = { t: b.t, l: b.l, s: b.s, n: b.n || wed[i].n || "" };
          else wed.push(b);
        };
        /* 9:45: whatever it was called, it is the open weekly block */
        put(function (b) { return b.t === "9:45"; }, want[5]);
        /* 10:30: WIN, linked so its text reaches the sub plan */
        put(function (b) { return b.t === "10:30"; }, want[6]);
        /* 11:40: GID & Class Store replaces the 11:45 STEAM slot */
        put(function (b) { return b.t === "11:40" || b.t === "11:45" || /STEAM/i.test(b.l || ""); }, want[10]);
      }
      st.templates[3] = wed.slice().sort(function (a, b) { return clock(a.t) - clock(b.t); });
      localStorage.setItem(S_KEY, JSON.stringify(st));
    } catch (e) { return; }
    mark("wednesday-2026");
  }

  /* Day records the planner cannot draw.

     The arrows only moved between saved days. go() moves the cursor and then
     renders, and renderToday() throws on a record missing something it
     assumes — so the cursor moved, the screen stayed on the previous day,
     and the next press moved it again until it landed on a complete record,
     in practice a saved one. `draft` had already switched before the throw,
     so typing on the stale screen went into a day not on screen.

     The shapes that throw, each checked against the real planner: flags not
     an array, entries not an object, a free-text entry with no pos, and a
     record that is not an object at all. A missing notes, noSchool or saved
     is harmless and left alone, as is a stepper entry with no pos.

     What wrote them is not settled. The planner does not, the gradebook only
     reads, and both day keys sync, so an older build on another device is
     the likeliest source. So this repairs the shape, whatever wrote it, and
     converges on every load: a record that cannot be drawn is wrong every
     time it is seen. Only missing structure is filled in; no value that is
     present changes. Runs last, after toFreeText has settled the schemas. */
  function repairDays() {
    var free = {};
    try {
      var st = JSON.parse(localStorage.getItem(S_KEY) || "null");
      ((st && st.subjects) || []).forEach(function (x) { if (x && x.schema === "free") free[x.id] = true; });
    } catch (e) { }
    function isObj(x) { return !!x && typeof x === "object" && !Array.isArray(x); }
    var fixed = 0;
    [D_KEY, "lp:pending:v1"].forEach(function (key) {
      var all;
      try { all = JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return; }
      if (!isObj(all)) return;
      var changed = false;
      Object.keys(all).forEach(function (dk) {
        var rec = all[dk];
        if (!isObj(rec)) { delete all[dk]; changed = true; fixed++; return; }
        var hit = false;
        if (!Array.isArray(rec.flags)) { rec.flags = []; hit = true; }
        if (!isObj(rec.entries)) { rec.entries = {}; hit = true; }
        Object.keys(rec.entries).forEach(function (id) {
          var e = rec.entries[id];
          if (free[id] && isObj(e) && !isObj(e.pos)) { e.pos = { text: "" }; hit = true; }
        });
        if (hit) { changed = true; fixed++; }
      });
      if (changed) { try { localStorage.setItem(key, JSON.stringify(all)); } catch (e) { } }
    });
    /* said once, so "was this what was wrong on my machine?" has an answer */
    if (fixed && window.console) console.info("[suite] repaired " + fixed + " planner day record" + (fixed === 1 ? "" : "s"));
  }

  /* Subjects marked taught on a day they are not scheduled.

     Every enabled subject gets a card, and one that is not on that day's
     schedule is meant to arrive already marked Skipped: the planner's
     buildDraft() does that when it creates a day. Two paths skip it. A day
     record that has no entry for a subject — Health/SEL and Enrichment were
     both added after days already existed, and repairDays() gives a record
     with no entries an empty set — is drawn by cardHTML(), whose fallback
     marks the subject taught. And a day created while its weekday's
     template was empty (Wednesday, before wednesday() filled it back in)
     marked everything taught. Either way Wednesday showed Writing, Science
     and Health/SEL as live cards with nothing in them.

     Only an entry that holds nothing is changed: an open-text subject with
     no text and no note. Anything written in one, on any day, is kept as
     written. Stepper subjects are left alone because a position cannot say
     whether it was recorded on purpose. Converges on every load; a day
     whose template is empty is not judged. Runs after repairDays(). */
  function skipUnscheduled() {
    var st;
    try { st = JSON.parse(localStorage.getItem(S_KEY) || "null"); } catch (e) { return; }
    if (!st || !Array.isArray(st.subjects) || !st.templates || typeof st.templates !== "object") return;
    function isObj(x) { return !!x && typeof x === "object" && !Array.isArray(x); }
    function blank(v) { return !String(v == null ? "" : v).trim(); }
    var free = st.subjects.filter(function (x) { return x && x.on && x.id && x.schema === "free"; });
    var fixed = 0;
    [D_KEY, "lp:pending:v1"].forEach(function (key) {
      var all;
      try { all = JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return; }
      if (!isObj(all)) return;
      var changed = false;
      Object.keys(all).forEach(function (dk) {
        var rec = all[dk], m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dk);
        if (!m || !isObj(rec) || rec.noSchool || !isObj(rec.entries)) return;
        var tpl = st.templates[new Date(+m[1], +m[2] - 1, +m[3]).getDay()];
        if (!Array.isArray(tpl) || !tpl.length) return;
        var inDay = {};
        tpl.forEach(function (b) { if (b && b.s) inDay[b.s] = true; });
        var hit = false;
        free.forEach(function (sb) {
          if (inDay[sb.id]) return;
          var e = rec.entries[sb.id];
          if (e === undefined) { rec.entries[sb.id] = { pos: { text: "" }, taught: false, note: "" }; hit = true; return; }
          if (isObj(e) && e.taught !== false && blank(e.note) && blank(isObj(e.pos) ? e.pos.text : "")) { e.taught = false; hit = true; }
        });
        if (hit) { changed = true; fixed++; }
      });
      if (changed) { try { localStorage.setItem(key, JSON.stringify(all)); } catch (e) { } }
    });
    if (fixed && window.console) console.info("[suite] marked unscheduled subjects skipped on " + fixed + " planner day" + (fixed === 1 ? "" : "s"));
  }

  /* Wednesday 12:20 is PE.

     The planner's own default and the first Wednesday pass both called it
     "Core Arts — Health/SEL Block A", which is not what happens then. The
     block is renamed in the planner's Wednesday and in the sub plan's block
     list, but only while it still carries exactly that old name, so a name
     typed in Settings or the sub plan panel afterwards is kept. Converges
     rather than being flagged: reloading the private sub plan seed, which
     may still hold the old name, is put right on the next load. */
  function wednesdayPE() {
    var OLD_PLANNER = "Core Arts \u2014 Health/SEL Block A", OLD_SUB = "Core Arts \u2014 Health/SEL";
    try {
      var st = JSON.parse(localStorage.getItem(S_KEY) || "null");
      var wed = st && st.templates && Array.isArray(st.templates[3]) ? st.templates[3] : null;
      var hit = false;
      (wed || []).forEach(function (b) {
        if (b && b.t === "12:20" && b.l === OLD_PLANNER) { b.l = "PE"; hit = true; }
      });
      if (hit) localStorage.setItem(S_KEY, JSON.stringify(st));
    } catch (e) { }
    try {
      var sp = JSON.parse(localStorage.getItem("suite:subplan:v1") || "null");
      var hit2 = false;
      ((sp && Array.isArray(sp.blocks)) ? sp.blocks : []).forEach(function (b) {
        if (b && b.start === "12:20" && /W/.test(b.days || "") && b.title === OLD_SUB) { b.title = "PE"; hit2 = true; }
      });
      if (hit2) localStorage.setItem("suite:subplan:v1", JSON.stringify(sp));
    } catch (e) { }
  }

  /* Wednesday dismissal is 12:55, confirmed by the teacher. The earlier
     default said 12:45 with a "Confirm the exact time" note. A block ends
     where the next begins, so moving dismissal also makes PE read
     12:20–12:55. Only exactly the old values are changed, so a time set by
     hand afterwards is kept, and the placeholder note is cleared only if it
     is still the placeholder. Converges, like wednesdayPE(). */
  function wednesdayDismissal() {
    try {
      var st = JSON.parse(localStorage.getItem(S_KEY) || "null");
      var wed = st && st.templates && Array.isArray(st.templates[3]) ? st.templates[3] : null;
      var hit = false;
      (wed || []).forEach(function (b) {
        if (b && b.t === "12:45" && b.l === "Dismissal") {
          b.t = "12:55";
          if (b.n === "Confirm the exact time") b.n = "";
          hit = true;
        }
      });
      if (hit) localStorage.setItem(S_KEY, JSON.stringify(st));
    } catch (e) { }
    try {
      var sp = JSON.parse(localStorage.getItem("suite:subplan:v1") || "null");
      var hit2 = false;
      ((sp && Array.isArray(sp.blocks)) ? sp.blocks : []).forEach(function (b) {
        if (!b || !/W/.test(b.days || "")) return;
        if (b.title === "Dismissal" && b.start === "12:45") { b.start = "12:55"; hit2 = true; }
        if (b.start === "12:20" && b.end === "12:45") { b.end = "12:55"; hit2 = true; }
      });
      if (hit2) localStorage.setItem("suite:subplan:v1", JSON.stringify(sp));
    } catch (e) { }
  }

  /* The planner's own five looks are retired: the suite's Look control sets
     the look for all three tools. `atomic` is the planner's base, the one
     look with no rules of its own, so pinning ME.theme to it means none of
     the planner's [data-theme] rules match and only the suite's apply.
     Subject colours are left exactly as they are — they are data, and a
     colour chosen under another look is still a choice. Converges. */
  function pinPlannerLook() {
    try {
      var raw = localStorage.getItem("lp:me:v1");
      if (!raw) return;
      var me = JSON.parse(raw);
      if (!me || typeof me !== "object" || !me.theme || me.theme === "atomic") return;
      me.theme = "atomic";
      localStorage.setItem("lp:me:v1", JSON.stringify(me));
    } catch (e) { }
  }


  /* The end of the day, as the teacher described it (v52).

     "Closing clean-up is the last ten minutes of whatever our last
     in-classroom activity is." Tue, Thu and Fri end in the room, so it stays
     at 2:15. Monday and Wednesday end in PE, so it comes before PE: Monday
     Health/SEL 1:30-1:45, clean-up 1:45, PE 1:55, then shoutouts 2:20 and
     bussers out 2:25; Wednesday GID & Class Store to 12:10, clean-up 12:10,
     PE 12:20.

     And the three Health/SEL specials (Mon 1:30, Thu 1:55, Fri 1:55) are
     Health/SEL: they carried no subject, so its card said Skipped every day.

     Flagged, once: these add, move and remove blocks he can edit in
     Settings, and a later hand edit must stick. Each part only acts on the
     shape it expects, so a day he has already rearranged is left alone. */
  var CLEAN_NOTE = "Number boxes \u00b7 trash \u00b7 chairs in \u00b7 backpacks";
  function endOfDay() {
    if (done()["end-of-day-2026"]) return;
    var st;
    try { st = JSON.parse(localStorage.getItem(S_KEY) || "null"); } catch (e) { return; }
    if (!st || !Array.isArray(st.subjects) || !st.templates || typeof st.templates !== "object") return;
    var T = st.templates;
    var hasHealth = st.subjects.some(function (x) { return x && x.id === "health"; });
    var linked = {};
    function arr(d) { return Array.isArray(T[d]) ? T[d] : null; }
    function find(tpl, t, re) { for (var i = 0; i < tpl.length; i++) { var b = tpl[i]; if (b && b.t === t && re.test(b.l || "")) return b; } return null; }

    if (hasHealth) [1, 2, 4, 5].forEach(function (d) {
      var tpl = arr(d); if (!tpl) return;
      tpl.forEach(function (b) {
        if (b && !b.s && /Health\s*\/\s*SEL/i.test(b.l || "")) { b.s = "health"; linked[d] = true; }
      });
    });

    /* a M/T/R/F day whose last period is PE */
    [1, 2, 4, 5].forEach(function (d) {
      var tpl = arr(d); if (!tpl) return;
      if (!find(tpl, "1:55", /(^|\u2014\s*)PE\s*$/)) return;
      var clean = find(tpl, "2:15", /clean/i);
      if (!clean) return;
      clean.t = "1:45";
      /* Shoutouts (2:20) and bussers out (2:25) stay, per the teacher (v53):
         v52 removed them on the guess that PE ran to dismissal. */
      T[d] = tpl.slice().sort(function (a, b) { return clock(a.t) - clock(b.t); });
    });

    var wed = arr(3);
    if (wed && find(wed, "12:20", /^PE$/) && !wed.some(function (b) { return b && /clean/i.test(b.l || ""); })) {
      wed.push({ t: "12:10", l: "Closing clean-up", s: "", n: CLEAN_NOTE });
      T[3] = wed.slice().sort(function (a, b) { return clock(a.t) - clock(b.t); });
    }

    try { localStorage.setItem(S_KEY, JSON.stringify(st)); } catch (e) { return; }

    /* Health/SEL was skipped on every day because it had no block. On a day
       not yet saved, an empty skipped Health/SEL entry was the planner's
       doing, not his, so it follows the schedule now. Saved days are his
       record and are left as they are. */
    function isObj(x) { return !!x && typeof x === "object" && !Array.isArray(x); }
    function blank(v) { return !String(v == null ? "" : v).trim(); }
    [D_KEY, "lp:pending:v1"].forEach(function (key) {
      var all;
      try { all = JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return; }
      if (!isObj(all)) return;
      var changed = false;
      Object.keys(all).forEach(function (dk) {
        var rec = all[dk], m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dk);
        if (!m || !isObj(rec) || rec.saved || !isObj(rec.entries)) return;
        if (!linked[new Date(+m[1], +m[2] - 1, +m[3]).getDay()]) return;
        var e = rec.entries.health;
        if (isObj(e) && e.taught === false && blank(e.note) && blank(isObj(e.pos) ? e.pos.text : "")) { e.taught = true; changed = true; }
      });
      if (changed) { try { localStorage.setItem(key, JSON.stringify(all)); } catch (e) { } }
    });
    mark("end-of-day-2026");
  }

  /* v52 took Monday's shoutouts (2:20) and bussers out (2:25) away and put
     a bare 2:30 Dismissal in their place. They happen on Monday too, so put
     them back — only where the day still has exactly what v52 left: PE at
     1:55, clean-up at 1:45, and that 2:30 Dismissal with neither block
     present. Flagged, once, like endOfDay() (v53). */
  function mondayShoutouts() {
    if (done()["monday-shoutouts-2026"]) return;
    var st;
    try { st = JSON.parse(localStorage.getItem(S_KEY) || "null"); } catch (e) { return; }
    if (!st || !st.templates || typeof st.templates !== "object") return;
    var T = st.templates, touched = false;
    [1, 2, 4, 5].forEach(function (d) {
      var tpl = Array.isArray(T[d]) ? T[d] : null; if (!tpl) return;
      function has(t, re) { return tpl.some(function (b) { return b && b.t === t && re.test(b.l || ""); }); }
      if (!has("1:55", /(^|\u2014\s*)PE\s*$/) || !has("1:45", /clean/i)) return;
      if (tpl.some(function (b) { return b && /shout|bussers/i.test(b.l || ""); })) return;
      var dis = null;
      tpl.forEach(function (b) { if (b && b.t === "2:30" && b.l === "Dismissal" && !b.s) dis = b; });
      if (!dis) return;
      tpl.splice(tpl.indexOf(dis), 1);
      tpl.push({ t: "2:20", l: "Shoutouts", s: "", n: "Bonus Mighty Mustangs" });
      tpl.push({ t: "2:25", l: "Bussers out \u00b7 dismissal 2:30", s: "", n: dis.n || "" });
      T[d] = tpl.slice().sort(function (a, b) { return clock(a.t) - clock(b.t); });
      touched = true;
    });
    if (touched) { try { localStorage.setItem(S_KEY, JSON.stringify(st)); } catch (e) { return; } }
    mark("monday-shoutouts-2026");
  }

  /* The same day in the sub plan's own block list. Converges, like
     wednesdayPE(): reloading the private standing-notes file can bring the
     old rows back, so they are put right on every load. Only rows that are
     exactly the old defaults are replaced; anything typed in is kept. */
  function subPlanEndOfDay() {
    var raw, sp;
    try { raw = localStorage.getItem("suite:subplan:v1"); sp = raw && JSON.parse(raw); } catch (e) { return; }
    if (!sp || !Array.isArray(sp.blocks)) return;
    function row(b, start, end, title, days) {
      return b && b.start === start && b.end === end && b.title === title && b.days === days && !b.subject;
    }
    function like(b, o) {
      return { start: o.start, end: o.end, title: o.title, days: o.days, subject: o.subject || "",
        detail: String(b.detail || ""), emergency: String(b.emergency || "") };
    }
    var out = [], hit = false;
    sp.blocks.forEach(function (b) {
      if (row(b, "1:30", "1:55", "Specials 1", "MTRF")) {
        out.push(like(b, { start: "1:30", end: "1:45", title: "Specials 1", days: "M", subject: "health" }));
        out.push(like(b, { start: "1:30", end: "1:55", title: "Specials 1", days: "TRF" }));
        hit = true; return;
      }
      if (row(b, "1:55", "2:20", "Specials 2", "MTRF")) {
        out.push(like(b, { start: "1:55", end: "2:20", title: "Specials 2", days: "M" }));
        out.push(like(b, { start: "1:55", end: "2:15", title: "Specials 2", days: "T" }));
        out.push(like(b, { start: "1:55", end: "2:15", title: "Specials 2", days: "RF", subject: "health" }));
        hit = true; return;
      }
      if (row(b, "2:15", "2:30", "Clean-up, shoutouts, dismissal", "MTRF")) {
        out.push(like(b, { start: "1:45", end: "1:55", title: "Closing clean-up", days: "M" }));
        out.push(like(b, { start: "2:15", end: "2:30", title: "Clean-up, shoutouts, dismissal", days: "TRF" }));
        out.push(like(b, { start: "2:20", end: "2:30", title: "Shoutouts, dismissal", days: "M" }));
        hit = true; return;
      }
      /* v52's Monday rows, from before shoutouts came back (v53) */
      if (row(b, "1:55", "2:30", "Specials 2", "M")) {
        out.push(like(b, { start: "1:55", end: "2:20", title: "Specials 2", days: "M" }));
        hit = true; return;
      }
      if (row(b, "2:30", "", "Dismissal", "M")) {
        out.push(like(b, { start: "2:20", end: "2:30", title: "Shoutouts, dismissal", days: "M" }));
        hit = true; return;
      }
      if (row(b, "11:40", "12:20", "GID and Class Store", "W")) {
        out.push(like(b, { start: "11:40", end: "12:10", title: "GID and Class Store", days: "W" }));
        out.push(like(b, { start: "12:10", end: "12:20", title: "Closing clean-up", days: "W" }));
        hit = true; return;
      }
      out.push(b);
    });
    if (!hit) return;
    /* the sub plan prints in clock order, and its editor lists rows as
       stored, so keep them in clock order too; the sort is stable */
    sp.blocks = out.map(function (b, i) { return { b: b, i: i }; })
      .sort(function (x, y) { return (clock(x.b.start) - clock(y.b.start)) || (x.i - y.i); })
      .map(function (x) { return x.b; });
    try { localStorage.setItem("suite:subplan:v1", JSON.stringify(sp)); } catch (e) { }
  }

  /* Walk to WIN, from Monday 28 September 2026 (v55). WIN Time on Monday
     and Thursday is Walk to Read; on Tuesday and Friday, Walk to Math. It
     starts next week, so nothing changes before that date: the first load
     on or after it renames the blocks. Only the planner's own labels are
     renamed ("WIN — Reading small groups", "WIN — Math small groups", and
     the subject's "Reading M/Th · Math T/F"), so a label he has typed is
     kept. Flagged, once: these are names he can edit in Settings. */
  var WALK_START = "2026-09-28";
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function walkToWin() {
    if (done()["walk-to-win-2026"] || todayKey() < WALK_START) return;
    var st;
    try { st = JSON.parse(localStorage.getItem(S_KEY) || "null"); } catch (e) { return; }
    if (!st || !Array.isArray(st.subjects) || !st.templates || typeof st.templates !== "object") return;
    var RENAME = { 1: ["WIN \u2014 Reading small groups", "WIN \u2014 Walk to Read"],
                   4: ["WIN \u2014 Reading small groups", "WIN \u2014 Walk to Read"],
                   2: ["WIN \u2014 Math small groups", "WIN \u2014 Walk to Math"],
                   5: ["WIN \u2014 Math small groups", "WIN \u2014 Walk to Math"] };
    Object.keys(RENAME).forEach(function (d) {
      var tpl = st.templates[d];
      if (!Array.isArray(tpl)) return;
      tpl.forEach(function (b) { if (b && b.s === "win" && b.l === RENAME[d][0]) b.l = RENAME[d][1]; });
    });
    st.subjects.forEach(function (x) {
      if (x && x.id === "win" && x.curriculum === "Reading M/Th \u00b7 Math T/F") x.curriculum = "Walk to Read M/Th \u00b7 Walk to Math T/F";
    });
    try { localStorage.setItem(S_KEY, JSON.stringify(st)); } catch (e) { return; }
    mark("walk-to-win-2026");
  }
  /* The sub plan's one M/T/R/F WIN row becomes one row per pairing, from the
     same date. Converges, like subPlanEndOfDay(), since reloading the
     private standing-notes file can bring the old row back; only the exact
     old default row is replaced, and its notes go to both new rows. */
  function subPlanWalkToWin() {
    if (todayKey() < WALK_START) return;
    var raw, sp;
    try { raw = localStorage.getItem("suite:subplan:v1"); sp = raw && JSON.parse(raw); } catch (e) { return; }
    if (!sp || !Array.isArray(sp.blocks)) return;
    var out = [], hit = false;
    sp.blocks.forEach(function (b) {
      if (b && b.start === "12:05" && b.end === "1:00" && b.title === "WIN time" && b.days === "MTRF" && b.subject === "win") {
        [["WIN \u2014 Walk to Read", "MR"], ["WIN \u2014 Walk to Math", "TF"]].forEach(function (x) {
          out.push({ start: "12:05", end: "1:00", title: x[0], days: x[1], subject: "win",
            detail: String(b.detail || ""), emergency: String(b.emergency || "") });
        });
        hit = true; return;
      }
      out.push(b);
    });
    if (!hit) return;
    sp.blocks = out;
    try { localStorage.setItem("suite:subplan:v1", JSON.stringify(sp)); } catch (e) { }
  }

  function runAll() {
    /* Science and Social Studies covers too much variety to be "Lesson 4", and
       Writing runs on its own rhythm rather than the curriculum's unit, week
       and day. Both are open fields he types into. */
    toFreeText("science");
    toFreeText("writing");
    addHealthSel();
    wednesday();
    pinPlannerLook();
    wednesdayPE();
    wednesdayDismissal();
    endOfDay();
    mondayShoutouts();
    subPlanEndOfDay();
    walkToWin();
    subPlanWalkToWin();
    repairDays();
    skipUnscheduled();
  }

  /* On a fresh install there is nothing stored yet, so every fix above finds
     nothing to fix; the planner then writes its built-in defaults, which
     predate them (a Wednesday with STEAM at 11:45 and dismissal at 12:45).
     They converged on the second load, so a newly added home-screen app
     opened on the wrong Wednesday. `fresh` tells suite-boot.js to run them
     again once the planner has written its defaults (v51). */
  var fresh = false;
  try { fresh = !localStorage.getItem(S_KEY); } catch (e) { }
  runAll();
  window.SuiteMigrate = { fresh: fresh, runAll: runAll, keys: [S_KEY, D_KEY] };
})();

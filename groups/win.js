/* ============================================================
   groups/win.js (v78) — Walk to WIN
   The grade's lists (who goes to which teacher for Walk to Read on
   Monday/Thursday and Walk to Math on Tuesday/Friday) are pasted in as the
   school sends them. This finds this class's children on them, puts them on
   one projectable slide, and prints the list of everyone coming to this room.

   suite:win:v1 = { v:1, me:"josh", teachers:{ key:{ call, room } },
     lists:{ id:{ id, start:"YYYY-MM-DD", added, name,
       subjects:{ read|math:{ title, days:["mon","thu"],
         groups:[{ id, teacher, key, desc, count, lines:[{ id, text, first, init, note }] }] } },
       fix:{ read|math:{ gradebookId: "t:<teacherKey>" | "none" | "unsure" } } } } }

   The lists name every second grader, so this key is the teacher's data
   like the roster is: it lives in the browser and the synced file, never in
   the repo. Lists are a map and every group and line has an id, so the merge
   works record by record.

   Matching never guesses between children. A line claims a child only when
   it can mean no one else on this roster, and a child is placed only when
   exactly one line claims them; everything else is shown for one tap.
   ============================================================ */
(function () {
  "use strict";
  if (window.SuiteWin) return;

  var KEY = "suite:win:v1", ROSTER_KEY = "gb2_standards_v1";
  var SUBJECTS = [
    { id: "read", label: "Walk to Read", word: "Reading", days: ["mon", "thu"] },
    { id: "math", label: "Walk to Math", word: "Math", days: ["tue", "fri"] }
  ];
  var DAYNAMES = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday" };
  var DAYNUM = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  var FIRST_DAY = "2026-09-28";   /* Walk to WIN begins (see suite-migrate.js, v55) */
  /* the card colours: bright, readable across a room, the same teacher the
     same colour every time */
  var HUES = [
    { fill: "#FDE3C4", edge: "#C1701A" }, { fill: "#D4EBC8", edge: "#3F7A2E" },
    { fill: "#D7E4F7", edge: "#2F5E9E" }, { fill: "#F5D3E2", edge: "#A83A6B" },
    { fill: "#FBF0B8", edge: "#9A7A0A" }, { fill: "#E3DAF5", edge: "#5B45A0" }
  ];

  function norm(s) {
    return window.SuiteNames ? window.SuiteNames.norm(s)
      : String(s == null ? "" : s).toLowerCase().replace(/[^a-z]/g, "");
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function uid(p) { return (p || "w") + Math.random().toString(36).slice(2, 9); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function fromIso(s) { var p = String(s).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function today() { return window.SuiteWin && window.SuiteWin.__today ? window.SuiteWin.__today : iso(new Date()); }
  function longDate(s) {
    var d = fromIso(s);
    return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()] + ", " +
      ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][d.getMonth()] + " " + d.getDate();
  }
  function shortDate(s) { var d = fromIso(s); return (d.getMonth() + 1) + "/" + d.getDate(); }
  /* the next weekday on or after a date */
  function nextSchoolDay(s) {
    var d = fromIso(s);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return iso(d);
  }
  function defaultStart() {
    var t = today();
    return t < FIRST_DAY ? FIRST_DAY : nextSchoolDay(t);
  }

  /* ================= reading the lists =================
     The shape the school's document has, as text copied out of it:

       Walk to Win Reading (Fall) M/TH        a title: subject and days
       Ms. A                                  a teacher
       Decoding group -                       (sometimes) what the group does
       (12 or 11)                             the count, sometimes with more after it
       Tobin                                  one child per line
       ...
       Pim (all leave at 12:30)               a note; "all" means the lines above it,
                                              back to the last blank line

   A teacher line is found by its count line, which is what every group has.
   Both subjects can be pasted at once, or one alone. */
  var COUNT_RE = /^\(\s*(\d+)(?:\s*or\s*(\d+))?\s*\)\s*[-\u2013\u2014:]?\s*(.*)$/i;
  function daysFrom(title, subject) {
    var t = " " + String(title).toLowerCase().replace(/[^a-z\/ ,&]/g, " ") + " ";
    var out = [];
    if (/[ \/,&](m|mon|monday)[ \/,&s]/.test(t)) out.push("mon");
    if (/[ \/,&](t|tu|tue|tues|tuesday)[ \/,&s]/.test(t)) out.push("tue");
    if (/[ \/,&](w|wed|wednesday)[ \/,&s]/.test(t)) out.push("wed");
    if (/[ \/,&](th|thu|thur|thurs|thursday)[ \/,&s]/.test(t)) out.push("thu");
    if (/[ \/,&](f|fr|fri|friday)[ \/,&s]/.test(t)) out.push("fri");
    return out.length ? out : subject.days.slice();
  }
  function subjectOf(line) {
    var l = line.toLowerCase();
    if (!/walk\s*to\s*win|\bwin\b/.test(l) && !/^walk\s*to\s*(read|math)/.test(l)) return null;
    if (/read|ela|literacy|phonics/.test(l)) return SUBJECTS[0];
    if (/math/.test(l)) return SUBJECTS[1];
    return null;
  }
  function looksLikeDesc(s) {
    return / [-\u2013\u2014] |[-\u2013\u2014:]\s*$/.test(s) || s.split(/\s+/).length >= 3;
  }
  /* "Olive P." -> Olive, P; "Wren K" -> Wren, K; "Pim (all leave at 12:30)" */
  function parseName(raw) {
    var text = String(raw).trim(), note = "";
    var m = text.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    if (m) { text = m[1].trim(); note = m[2].trim(); }
    var parts = text.replace(/\./g, " ").trim().split(/\s+/);
    var first = parts[0] || "", init = "";
    if (parts.length > 1) init = parts[parts.length - 1].charAt(0).toUpperCase();
    return { text: text, first: first, init: init, note: note };
  }
  function parse(text) {
    var lines = String(text || "").replace(/\r/g, "").split("\n").map(function (l) { return l.replace(/\s+$/, "").replace(/^\s+/, ""); });
    var out = { read: null, math: null }, warnings = [];
    /* split into subjects at each title */
    var chunks = [], cur = null;
    lines.forEach(function (l) {
      var s = l ? subjectOf(l) : null;
      if (s) { cur = { subject: s, title: l, lines: [] }; chunks.push(cur); return; }
      if (!cur) {
        if (!l) return;
        cur = { subject: null, title: "", lines: [] }; chunks.push(cur);
      }
      cur.lines.push(l);
    });
    chunks.forEach(function (ch) {
      if (!ch.subject) { if (ch.lines.some(function (x) { return x; })) warnings.push("Some lines came before a title like \u201cWalk to Win Reading\u201d or \u201cWalk to Win Math\u201d, so they were left out."); return; }
      var L = ch.lines, heads = [];
      L.forEach(function (l, i) {
        var cm = l.match(COUNT_RE);
        if (!cm) return;
        /* back up to the teacher: over one description line if there is one */
        var j = i - 1; while (j >= 0 && !L[j]) j--;
        if (j < 0) return;
        var desc = cm[3] || "", t = j;
        if (looksLikeDesc(L[j])) {
          var k = j - 1; while (k >= 0 && !L[k]) k--;
          if (k >= 0 && !looksLikeDesc(L[k]) && !COUNT_RE.test(L[k])) { desc = L[j].replace(/\s*[-\u2013\u2014:]\s*$/, "") + (desc ? " \u2014 " + desc : ""); t = k; }
        }
        heads.push({ at: t, countAt: i, teacher: L[t], desc: desc.replace(/^[-\u2013\u2014\s]+/, ""), count: +cm[1], countAlt: cm[2] ? +cm[2] : null });
      });
      if (!heads.length) { warnings.push(ch.title + ": no groups found. Each teacher needs a count line under their name, like (18)."); return; }
      var groups = heads.map(function (h, hi) {
        var end = hi + 1 < heads.length ? heads[hi + 1].at : L.length;
        var body = L.slice(h.countAt + 1, end), g = { id: uid("g"), teacher: h.teacher, key: norm(h.teacher), desc: h.desc, count: h.count, countAlt: h.countAlt, lines: [] };
        var block = [];
        body.forEach(function (l) {
          if (!l) { block = []; return; }
          if (l.split(/\s+/).length > 3 && !/\(/.test(l)) { g.desc = g.desc ? g.desc + " \u2014 " + l : l; return; }
          var n = parseName(l);
          if (!norm(n.first)) return;
          var rec = { id: uid("l"), text: n.text, first: n.first, init: n.init, note: n.note };
          g.lines.push(rec); block.push(rec);
          /* "(all leave at 12:30)" on the last name of a block is about the block */
          if (n.note && /\ball\b/i.test(n.note)) {
            var shared = n.note.replace(/^\s*all\s+/i, "");
            block.forEach(function (b) { b.note = shared; });
          }
        });
        var n2 = g.lines.length;
        if (n2 !== g.count && n2 !== g.countAlt) {
          warnings.push(ch.subject.word + ", " + g.teacher + ": the list says (" + g.count + (g.countAlt ? " or " + g.countAlt : "") + ") and has " + n2 + " names.");
        }
        return g;
      });
      if (out[ch.subject.id]) warnings.push(ch.subject.label + " was in the text twice; the second one is used.");
      out[ch.subject.id] = { title: ch.title, days: daysFrom(ch.title, ch.subject), groups: groups };
    });
    return { subjects: out, warnings: warnings };
  }

  /* ================= the roster, and matching ================= */
  function readRoster() {
    var list = [];
    try {
      var st = JSON.parse(localStorage.getItem(ROSTER_KEY) || "null");
      (st && Array.isArray(st.students) ? st.students : []).forEach(function (s) {
        if (!s || !s.id) return;
        list.push({ id: String(s.id), first: String(s.first || "").trim(), last: String(s.last || "").trim(), aka: s.aka });
      });
    } catch (e) { }
    var count = {};
    list.forEach(function (s) { var k = norm(s.first); count[k] = (count[k] || 0) + 1; });
    list.forEach(function (s) {
      s.label = s.first || s.last || "(no name)";
      if (s.first && count[norm(s.first)] > 1 && s.last) s.label = s.first + " " + s.last.charAt(0) + ".";
    });
    list.sort(function (a, b) { return a.label.localeCompare(b.label); });
    return list;
  }
  function namesOf(s) {
    var aka = window.SuiteNames ? window.SuiteNames.akaList(s.aka) : [];
    return [norm(s.first)].concat(aka.map(norm)).filter(Boolean);
  }
  /* how well a line fits a child: 2 with a matching initial, 1 a bare first
     name, 0 not them */
  function fit(line, s) {
    if (namesOf(s).indexOf(norm(line.first)) < 0) return 0;
    if (!line.init) return 1;
    return norm(s.last).charAt(0) === norm(line.init) ? 2 : 0;
  }
  function edits(a, b) {
    a = norm(a); b = norm(b);
    if (Math.abs(a.length - b.length) > 2) return 9;
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (j = 0; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return d[a.length][b.length];
  }
  /* one subject: { place:{ sid:{ key, line, how:"list"|"fix"|"none"|"unsure", why } }, lineOf:{ lineId: sid } } */
  function matchSubject(sub, roster, fix) {
    fix = fix || {};
    var lines = [];
    (sub ? sub.groups : []).forEach(function (g) { g.lines.forEach(function (l) { lines.push({ g: g, l: l }); }); });
    /* every line's best children */
    var claims = {};      /* sid -> [{g,l,score}] */
    var byLine = {};      /* lineId -> [sid] at the line's best score */
    lines.forEach(function (x) {
      var best = 0, who = [];
      roster.forEach(function (s) {
        var f = fit(x.l, s);
        if (f > best) { best = f; who = [s.id]; } else if (f && f === best) who.push(s.id);
      });
      byLine[x.l.id] = who;
      who.forEach(function (sid) { (claims[sid] = claims[sid] || []).push({ g: x.g, l: x.l, score: best }); });
    });
    var place = {}, lineOf = {};
    roster.forEach(function (s) {
      var f = fix[s.id];
      if (f && f.indexOf("t:") === 0) { place[s.id] = { key: f.slice(2), how: "fix" }; return; }
      if (f === "none") { place[s.id] = { how: "none" }; return; }
      if (f === "unsure") { place[s.id] = { how: "unsure", why: "you marked this to check" }; return; }
      var c = (claims[s.id] || []).slice();
      /* a line with this child's initial beats a bare first name */
      var top = c.reduce(function (m, x) { return Math.max(m, x.score); }, 0);
      c = c.filter(function (x) { return x.score === top; });
      /* a bare "Wren" is not this Wren if the list also has a "Wren" with
         this child's initial: that line is theirs, the bare one someone else's */
      var mine = c.filter(function (x) { return byLine[x.l.id].length === 1; });
      if (mine.length === 1) {
        place[s.id] = { key: mine[0].g.key, line: mine[0].l.id, how: "list" };
        lineOf[mine[0].l.id] = s.id;
        return;
      }
      if (mine.length > 1) {
        place[s.id] = { how: "unsure", why: "on the list twice: " + mine.map(function (x) { return x.l.text + " (" + x.g.teacher + ")"; }).join(" and ") };
        return;
      }
      if (c.length) {
        place[s.id] = { how: "unsure", why: "\u201c" + c[0].l.text + "\u201d on the list could be more than one child in your class" };
        return;
      }
      place[s.id] = { how: "unsure", why: "not found on this list" };
    });
    /* suggestions for the unsure: close spellings among lines nobody claimed */
    roster.forEach(function (s) {
      var p = place[s.id];
      if (p.how !== "unsure" || fix[s.id] === "unsure") return;
      var sugg = [];
      lines.forEach(function (x) {
        if (lineOf[x.l.id]) return;
        var d = Math.min.apply(null, namesOf(s).map(function (n) { return edits(n, x.l.first); }));
        var initOk = !x.l.init || norm(s.last).charAt(0) === norm(x.l.init);
        /* one letter off for a short name (Ivy, Ivey), two for a longer one */
        var room = Math.min(norm(s.first).length, norm(x.l.first).length) >= 6 ? 2 : 1;
        if (d <= room && initOk) sugg.push({ key: x.g.key, teacher: x.g.teacher, text: x.l.text, d: d });
      });
      sugg.sort(function (a, b) { return a.d - b.d; });
      p.suggest = sugg.slice(0, 2);
    });
    return { place: place, lineOf: lineOf };
  }

  /* ================= state ================= */
  var W = null;
  function defaults() { return { v: 1, me: "", teachers: {}, lists: {} }; }
  function load() {
    try { W = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { W = null; }
    if (!W || typeof W !== "object") W = defaults();
    if (!W.lists || typeof W.lists !== "object") W.lists = {};
    if (!W.teachers || typeof W.teachers !== "object") W.teachers = {};
    Object.keys(W.lists).forEach(function (id) {
      var L = W.lists[id];
      if (!L || !L.subjects) { delete W.lists[id]; return; }
      L.fix = L.fix || {}; L.fix.read = L.fix.read || {}; L.fix.math = L.fix.math || {};
    });
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(W)); }
    catch (e) { note("Could not save \u2014 browser storage may be full.", true); }
  }
  function sortedLists() {
    return Object.keys(W.lists).map(function (k) { return W.lists[k]; })
      .sort(function (a, b) { return a.start < b.start ? -1 : a.start > b.start ? 1 : (a.added < b.added ? -1 : 1); });
  }
  /* the list in effect on a date: the latest one started by then, or, before
     the first one starts, that one (so it can be shown ahead of time) */
  function listOn(date) {
    var all = sortedLists(), hit = null;
    all.forEach(function (L) { if (L.start <= date) hit = L; });
    return hit || all[0] || null;
  }
  function before(L) {
    var all = sortedLists(), prev = null;
    all.forEach(function (x) { if (x.id !== L.id && (x.start < L.start || (x.start === L.start && x.added < L.added))) prev = x; });
    return prev;
  }
  function teachersOf(L) {
    var seen = {}, out = [];
    SUBJECTS.forEach(function (S) {
      var sub = L && L.subjects[S.id];
      (sub ? sub.groups : []).forEach(function (g) { if (!seen[g.key]) { seen[g.key] = 1; out.push({ key: g.key, name: g.teacher }); } });
    });
    return out;
  }
  function teacherName(key, L) {
    var t = W.teachers[key];
    if (t && t.call) return t.call;
    var hit = teachersOf(L).filter(function (x) { return x.key === key; })[0];
    return hit ? hit.name : key;
  }
  function hue(key, L) {
    var keys = teachersOf(L).map(function (t) { return t.key; }).sort();
    var i = keys.indexOf(key);
    return HUES[(i < 0 ? 0 : i) % HUES.length];
  }
  function assignments(L, roster) {
    var out = {};
    SUBJECTS.forEach(function (S) { out[S.id] = matchSubject(L.subjects[S.id], roster, L.fix[S.id]); });
    return out;
  }
  function lineById(sub, id) {
    var hit = null;
    (sub ? sub.groups : []).forEach(function (g) { g.lines.forEach(function (l) { if (l.id === id) hit = l; }); });
    return hit;
  }

  /* adding a list. One subject alone keeps the other from the list before it. */
  function addList(parsed, start, name) {
    var prev = listOn(start);
    var subjects = {};
    SUBJECTS.forEach(function (S) {
      if (parsed.subjects[S.id]) subjects[S.id] = parsed.subjects[S.id];
      else if (prev && prev.subjects[S.id]) subjects[S.id] = JSON.parse(JSON.stringify(prev.subjects[S.id]));
    });
    var L = { id: uid("list"), start: start, added: new Date().toISOString(), name: name || "", subjects: subjects, fix: { read: {}, math: {} } };
    /* a choice made by hand on the old list carries over while that subject is unchanged */
    if (prev) SUBJECTS.forEach(function (S) { if (!parsed.subjects[S.id] && prev.fix[S.id]) L.fix[S.id] = JSON.parse(JSON.stringify(prev.fix[S.id])); });
    if (!W.me) {
      var ts = teachersOf(L);
      /* the teacher whose name the device or planner carries, if any one does */
      var hints = [];
      try { hints.push(String((JSON.parse(localStorage.getItem("lp:me:v1") || "{}") || {}).name || "")); } catch (e) { }
      try { hints.push(String(localStorage.getItem("suite:device:v1") || "")); } catch (e) { }
      var guess = ts.filter(function (t) { return hints.some(function (h) { return h && norm(h).indexOf(t.key) >= 0; }); });
      if (guess.length === 1) W.me = guess[0].key;
    }
    W.lists[L.id] = L;
    save();
    return L;
  }
  /* what moved for this class between two lists */
  function changes(L, prev, roster) {
    if (!prev) return [];
    var a = assignments(L, roster), b = assignments(prev, roster), out = [];
    roster.forEach(function (s) {
      SUBJECTS.forEach(function (S) {
        var now = a[S.id].place[s.id], was = b[S.id].place[s.id];
        var nk = now.how === "list" || now.how === "fix" ? now.key : now.how, wk = was.how === "list" || was.how === "fix" ? was.key : was.how;
        if (nk === wk) return;
        function say(p) { return p.how === "list" || p.how === "fix" ? teacherName(p.key, L) : p.how === "none" ? "not going" : "not sure"; }
        out.push({ sid: s.id, name: s.label, subject: S.id, from: say(was), to: say(now) });
      });
    });
    return out;
  }

  /* ================= the slide ================= */
  function slideHTML(L, roster, opts) {
    opts = opts || {};
    var a = assignments(L, roster), t = opts.date || today();
    var dow = fromIso(t).getDay(), h = "";
    var unsure = [];
    SUBJECTS.forEach(function (S) {
      var sub = L.subjects[S.id];
      if (!sub) return;
      var isToday = sub.days.some(function (d) { return DAYNUM[d] === dow; }) && t >= L.start;
      var cards = {};
      roster.forEach(function (s) {
        var p = a[S.id].place[s.id];
        if (p.how === "list" || p.how === "fix") {
          (cards[p.key] = cards[p.key] || []).push({ s: s, note: p.line ? (lineById(sub, p.line) || {}).note : "" });
        } else if (p.how === "unsure") {
          unsure.push({ s: s, sub: S });
        }
      });
      var order = sub.groups.map(function (g) { return g.key; }).filter(function (k, i, arr) { return arr.indexOf(k) === i; });
      Object.keys(cards).forEach(function (k) { if (order.indexOf(k) < 0) order.push(k); });
      /* staying here goes last, so the ones who walk read first */
      order.sort(function (x, y) { return (x === W.me ? 1 : 0) - (y === W.me ? 1 : 0); });
      h += '<section class="w-half' + (isToday ? " w-today" : "") + '" data-sub="' + S.id + '"><header><h2>' + S.label +
        "</h2><span>" + sub.days.map(function (d) { return DAYNAMES[d]; }).join(" &amp; ") + "</span>" +
        (isToday ? '<b class="w-badge">Today</b>' : "") + '</header><div class="w-cards">';
      order.forEach(function (k) {
        var kids = cards[k];
        if (!kids || !kids.length) return;
        var c = hue(k, L), room = (W.teachers[k] && W.teachers[k].room) || "";
        var head = k === W.me ? "Stay in our room" : teacherName(k, L);
        var sub2 = k === W.me ? "with " + teacherName(k, L) : (room ? room : "");
        /* a note shared by several ("leave at 12:30") is said once, under
           the names, with a mark on each name it is about */
        var marks = [], MARKS = ["*", "\u2020", "\u2021", "\u00a7"];
        kids.forEach(function (x) { if (x.note && marks.indexOf(x.note) < 0) marks.push(x.note); });
        kids.sort(function (x, y) { return x.s.label.localeCompare(y.s.label); });
        h += '<div class="w-card' + (k === W.me ? " w-stay" : "") + '" style="--fill:' + c.fill + ";--edge:" + c.edge + '">' +
          "<h3>" + esc(head) + "</h3>" + (sub2 ? "<small>" + esc(sub2) + "</small>" : "") + "<ul>" +
          kids.map(function (x) {
            var m = x.note ? MARKS[marks.indexOf(x.note) % MARKS.length] : "";
            return "<li>" + esc(x.s.label) + (m ? "<sup>" + m + "</sup>" : "") + "</li>";
          }).join("") + "</ul>" +
          marks.map(function (n, i) { return '<p class="w-fn">' + MARKS[i % MARKS.length] + " " + esc(n) + "</p>"; }).join("") +
          "</div>";
      });
      h += "</div></section>";
    });
    /* said per subject: a child placed for math and not found for reading
       should not look lost for both */
    if (unsure.length) {
      var parts = SUBJECTS.map(function (S) {
        var names = unsure.filter(function (u) { return u.sub === S; }).map(function (u) { return esc(u.s.label); });
        return names.length ? "<span>" + S.word + ": " + names.join(", ") + "</span>" : "";
      }).filter(Boolean);
      h += '<div class="w-ask"><b>Check with ' + esc(W.me ? teacherName(W.me, L) : "your teacher") + ":</b> " + parts.join(" \u00b7 ") + "</div>";
    }
    return '<div class="w-slide">' + h + "</div>";
  }
  /* largest type that fits: shrink until nothing overflows */
  function fitSlide(el) {
    if (!el) return;
    var slide = el.querySelector(".w-slide");
    if (!slide) return;
    /* The cards shrink to their share of the slide and their names spill
       out of them, so the slide as a whole never reports overflowing. Each
       card is measured instead. */
    function over() {
      if (slide.scrollHeight > el.clientHeight + 1 || slide.scrollWidth > el.clientWidth + 1) return true;
      var cards = slide.querySelectorAll(".w-card, .w-ask");
      for (var i = 0; i < cards.length; i++) if (cards[i].scrollHeight > cards[i].clientHeight + 1) return true;
      return false;
    }
    var size = Math.max(10, Math.round(el.clientWidth / 36));
    slide.style.fontSize = size + "px";
    var guard = 0;
    while (guard++ < 60 && size > 8 && over()) { size -= 1; slide.style.fontSize = size + "px"; }
  }

  /* ================= coming to me: the printed list ================= */
  function nextDays(days, from, n) {
    var out = [], d = fromIso(from), guard = 0;
    while (out.length < n && guard++ < 60) {
      var k = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][d.getDay()];
      if (days.indexOf(k) >= 0) out.push(iso(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }
  function comingToMe(L, roster) {
    var a = assignments(L, roster), out = [];
    SUBJECTS.forEach(function (S) {
      var sub = L.subjects[S.id];
      if (!sub || !W.me) return;
      var mine = sub.groups.filter(function (g) { return g.key === W.me; });
      var rows = [], ours = {};
      mine.forEach(function (g) {
        g.lines.forEach(function (l) {
          var sid = a[S.id].lineOf[l.id];
          var p = sid ? a[S.id].place[sid] : null;
          /* matched to one of ours who has since been placed elsewhere by hand:
             the line may be another class's child of that name, so it stays
             on the list, just not marked as ours */
          var movedAway = p && p.how !== "list";
          rows.push({ name: l.text, note: l.note, ours: !!sid && !movedAway });
          if (sid && !movedAway) ours[sid] = 1;
        });
      });
      roster.forEach(function (s) {
        var p = a[S.id].place[s.id];
        if (p.how === "fix" && p.key === W.me && !ours[s.id]) rows.push({ name: s.label, note: "", ours: true, added: true });
      });
      rows.sort(function (x, y) { return x.name.localeCompare(y.name); });
      out.push({ subject: S, days: sub.days, desc: mine.map(function (g) { return g.desc; }).filter(Boolean).join("; "),
        rows: rows, dates: nextDays(sub.days, today() > L.start ? today() : L.start, 5) });
    });
    return out;
  }
  function printHTML(L, roster) {
    var me = W.me ? teacherName(W.me, L) : "";
    return comingToMe(L, roster).map(function (c) {
      return '<div class="w-sheet"><h1>' + c.subject.label + " \u2014 coming to " + esc(me) + "</h1>" +
        '<p class="w-sub">' + c.days.map(function (d) { return DAYNAMES[d]; }).join(" &amp; ") + " \u00b7 " + c.rows.length + " students" +
        (c.desc ? " \u00b7 " + esc(c.desc) : "") + " \u00b7 list from " + esc(longDate(L.start)) + "</p>" +
        '<table><thead><tr><th class="w-n">#</th><th>Name</th><th>Note</th>' +
        c.dates.map(function (d) { return '<th class="w-d">' + shortDate(d) + "</th>"; }).join("") +
        "</tr></thead><tbody>" +
        c.rows.map(function (r, i) {
          return "<tr><td class=\"w-n\">" + (i + 1) + "</td><td>" + esc(r.name) + (r.ours ? ' <span class="w-ours">our class</span>' : "") + "</td><td>" +
            esc(r.note || (r.added ? "added by you" : "")) + "</td>" + c.dates.map(function () { return '<td class="w-d"><span class="w-box"></span></td>'; }).join("") + "</tr>";
        }).join("") +
        "</tbody></table></div>";
    }).join("");
  }

  /* ================= the page ================= */
  var root = null, viewId = "", draft = null, lastRemoved = null, msgT = null;
  var CSS =
    "#win{display:none;min-height:100vh;padding:clamp(10px,1.4vw,22px);padding-bottom:calc(84px + env(safe-area-inset-bottom,0px));" +
    "padding-top:calc(clamp(10px,1.4vw,22px) + env(safe-area-inset-top,0px));background:#E4E9EE;font-family:var(--font)}" +
    "body.tab-win #win{display:block}body.tab-win #board,body.tab-win #reading{display:none!important}" +
    ".w-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:12px}" +
    ".w-bar h1{margin:0;font-size:22px;line-height:1.15}.w-bar h1 small{display:block;font-size:13px;font-weight:400;color:#56677A;margin-top:2px}" +
    ".w-bar .sp{flex:1}" +
    ".w-btn{font:inherit;font-size:14px;padding:8px 14px;border-radius:10px;border:1px solid #B9C6D2;background:#fff;color:#16202B;cursor:pointer}" +
    ".w-btn:hover{border-color:#8699AB}.w-btn.pri{background:#16202B;border-color:#16202B;color:#fff}" +
    ".w-btn.brass{background:#C8912E;border-color:#C8912E;color:#140D04;font-weight:600}" +
    ".w-btn:disabled{opacity:.45;cursor:default}" +
    ".w-rail{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}" +
    ".w-rail button{font:inherit;font-size:13px;padding:6px 12px;border-radius:999px;border:1px solid #B9C6D2;background:#fff;cursor:pointer;color:#16202B}" +
    ".w-rail button[aria-pressed=true]{background:#10655C;border-color:#10655C;color:#fff}" +
    ".w-rail em{font-style:normal;opacity:.75;margin-left:4px}" +
    ".w-panel{background:#fff;border:1px solid #CBD6E0;border-radius:14px;padding:14px 16px;margin-bottom:12px;font-size:14px;line-height:1.45}" +
    ".w-panel h2{margin:0 0 6px;font-size:16px}.w-panel p{margin:6px 0}.w-panel .hint{color:#56677A;font-size:13px}" +
    ".w-panel textarea{width:100%;min-height:160px;font:13px/1.4 ui-monospace,Menlo,Consolas,monospace;border:1px solid #B9C6D2;border-radius:8px;padding:8px}" +
    ".w-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:8px}" +
    ".w-row label{display:flex;align-items:center;gap:6px}" +
    ".w-row input[type=date],.w-row input[type=text],.w-row select{font:inherit;font-size:14px;padding:6px 8px;border:1px solid #B9C6D2;border-radius:8px;background:#fff}" +
    ".w-warn{color:#8A5A00;background:#FFF6DC;border:1px solid #EDD28A;border-radius:10px;padding:8px 10px;margin:8px 0}" +
    ".w-msg{position:sticky;top:6px;z-index:5;background:#14202A;color:#fff;border-radius:10px;padding:8px 12px;margin-bottom:10px;display:flex;gap:10px;align-items:center}" +
    ".w-msg[hidden],.w-panel[hidden],.w-rail[hidden]{display:none}.w-msg.bad{background:#8A2A1A}.w-msg button{font:inherit;font-size:13px;border:0;border-radius:8px;padding:4px 10px;cursor:pointer}" +
    ".w-pv{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;margin-top:8px}" +
    ".w-pv div{border:1px solid #DCE3EA;border-radius:10px;padding:8px}.w-pv b{display:block}.w-pv small{color:#56677A}" +
    ".w-pv ol{margin:4px 0 0 18px;padding:0;font-size:13px;columns:2}" +
    ".w-tbl{width:100%;border-collapse:collapse;margin-top:6px}.w-tbl th,.w-tbl td{text-align:left;padding:6px 8px;border-top:1px solid #E3E9EF;vertical-align:top}" +
    ".w-tbl th{font-size:12px;color:#56677A;font-weight:600;border-top:0}.w-tbl select{max-width:100%}" +
    ".w-tbl .ok{color:#2F7A56}.w-tbl .q{color:#A06A00;font-weight:600}.w-tbl .why{display:block;font-size:12px;color:#56677A}" +
    ".w-tbl .sg{font:inherit;font-size:12px;margin-top:4px;padding:3px 8px;border-radius:999px;border:1px solid #C8912E;background:#FFF6DC;cursor:pointer}" +
    ".w-scroll{overflow-x:auto}" +
    /* the slide */
    ".w-stage{position:relative;width:100%;aspect-ratio:16/9;background:#fff;border-radius:14px;border:1px solid #CBD6E0;overflow:hidden;margin-bottom:12px}" +
    ".w-stage:fullscreen{border:0;border-radius:0;aspect-ratio:auto;width:100vw;height:100vh}" +
    ".w-stage:-webkit-full-screen{width:100vw;height:100vh}" +
    ".w-slide{position:absolute;inset:0;padding:1.1em 1.3em;display:flex;flex-direction:column;gap:.7em;color:#16202B;font-family:var(--font)}" +
    ".w-half{flex:1 1 0;display:flex;flex-direction:column;min-height:0}" +
    ".w-half header{display:flex;align-items:baseline;gap:.6em;margin-bottom:.35em}" +
    ".w-half h2{margin:0;font-size:1.55em;line-height:1.05}.w-half header span{font-size:1em;color:#56677A}" +
    ".w-badge{margin-left:auto;font-size:.8em;background:#10655C;color:#fff;border-radius:999px;padding:.15em .7em}" +
    ".w-half:not(.w-today) h2{color:#3A4756}" +
    ".w-cards{flex:1;display:flex;gap:.6em;min-height:0}" +
    ".w-card{flex:1 1 0;display:flex;flex-direction:column;background:var(--fill);border:.18em solid var(--edge);border-radius:.6em;padding:.45em .7em;min-width:0;overflow:hidden}" +
    ".w-card h3{margin:0;font-size:1.25em;line-height:1.1}.w-card small{display:block;font-size:.85em;color:#3A4756;margin-top:.1em}" +
    ".w-card ul{list-style:none;margin:.35em 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(6.2em,1fr));column-gap:.6em;align-content:start}" +
    ".w-card li{font-size:1.05em;line-height:1.25;font-weight:600;white-space:nowrap}.w-card sup{font-size:.7em;margin-left:.08em}" +
    ".w-fn{margin:auto 0 0;padding-top:.25em;font-size:.8em;color:#3A4756}" +
    ".w-stay{border-style:dashed}" +
    ".w-ask{font-size:.95em;background:#FFF6DC;border:.12em solid #C8912E;border-radius:.5em;padding:.3em .7em}" +
    ".w-empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;color:#56677A;padding:24px;font-size:16px}" +
    "#w-print{display:none}" +
    "@media print{" +
    "body.tab-win>*:not(#win){display:none!important}body.tab-win #win{padding:0;background:#fff}" +
    "body.tab-win #win>*:not(#w-print){display:none!important}body.tab-win #w-print{display:block}" +
    ".w-sheet{page-break-after:always;font-family:var(--font);color:#000}.w-sheet:last-child{page-break-after:auto}" +
    ".w-sheet h1{font-size:20pt;margin:0 0 2pt}.w-sub{font-size:10pt;margin:0 0 8pt;color:#333}" +
    ".w-sheet table{width:100%;border-collapse:collapse;font-size:12pt}" +
    ".w-sheet th,.w-sheet td{border:1px solid #888;padding:3pt 5pt;text-align:left}.w-sheet th{font-size:9.5pt;background:#eee}" +
    ".w-n{width:22pt;text-align:right!important}.w-d{width:34pt;text-align:center!important}" +
    ".w-box{display:inline-block;width:10pt;height:10pt;border:1px solid #333}" +
    ".w-ours{font-size:8pt;border:1px solid #555;border-radius:6pt;padding:0 3pt;margin-left:3pt}" +
    "#suitenav,#suitesheet{display:none!important}}";

  function note(msg, bad, undo) {
    var box = document.getElementById("w-msg");
    if (!box) return;
    box.hidden = false;
    box.className = "w-msg" + (bad ? " bad" : "");
    box.innerHTML = "<span>" + esc(msg) + "</span>" + (undo ? '<button type="button" id="w-undo">Undo</button>' : "") +
      '<button type="button" id="w-msgx" aria-label="Dismiss">\u00d7</button>';
    if (undo) document.getElementById("w-undo").onclick = function () { undo(); box.hidden = true; };
    document.getElementById("w-msgx").onclick = function () { box.hidden = true; };
    clearTimeout(msgT);
    msgT = setTimeout(function () { box.hidden = true; }, undo ? 12000 : 6000);
  }

  function build() {
    if (root) return;
    var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    root = document.createElement("section");
    root.id = "win";
    root.setAttribute("aria-label", "Walk to WIN");
    root.innerHTML =
      '<div class="w-bar"><h1>Walk to WIN<small>Where your class goes for Walk to Read and Walk to Math, from the grade\u2019s lists.</small></h1>' +
      '<div class="sp"></div>' +
      '<button class="w-btn" id="w-toMath" type="button">Math board</button>' +
      '<button class="w-btn" id="w-toRead" type="button">Reading groups</button>' +
      '<button class="w-btn" id="w-add" type="button">Add a new list</button>' +
      '<button class="w-btn" id="w-printBtn" type="button">Print who\u2019s coming to me</button>' +
      '<button class="w-btn pri" id="w-present" type="button">Present</button></div>' +
      '<div class="w-msg" id="w-msg" role="status" hidden></div>' +
      '<nav class="w-rail" id="w-rail" aria-label="Lists"></nav>' +
      '<div id="w-addPanel" class="w-panel" hidden></div>' +
      '<div class="w-stage" id="w-stage" tabindex="-1"></div>' +
      '<div id="w-changes"></div>' +
      '<div id="w-review" class="w-panel"></div>' +
      '<div id="w-setup" class="w-panel"></div>' +
      '<div id="w-print"></div>';
    var anchor = document.getElementById("reading");
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(root, anchor.nextSibling);
    else document.body.appendChild(root);

    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-w]");
      if (!b) return;
      var act = b.getAttribute("data-w");
      if (act === "view") { viewId = b.getAttribute("data-id"); render(); }
      if (act === "suggest") { setFix(b.getAttribute("data-sub"), b.getAttribute("data-sid"), "t:" + b.getAttribute("data-key")); }
      if (act === "remove") removeList(b.getAttribute("data-id"));
    });
    root.addEventListener("change", function (e) {
      var t = e.target;
      if (t.matches("select[data-fix]")) setFix(t.getAttribute("data-fix"), t.getAttribute("data-sid"), t.value);
      if (t.id === "w-me") { W.me = t.value; save(); render(); }
      if (t.matches("input[data-call],input[data-room]")) {
        var k = t.getAttribute("data-call") || t.getAttribute("data-room");
        var rec = W.teachers[k] = W.teachers[k] || { call: "", room: "" };
        if (t.hasAttribute("data-call")) rec.call = t.value.trim(); else rec.room = t.value.trim();
        save(); renderSlide();
      }
      if (t.id === "w-start" && viewId && W.lists[viewId]) { W.lists[viewId].start = t.value || W.lists[viewId].start; save(); render(); }
    });
    document.getElementById("w-toMath").onclick = function () { go("math"); };
    document.getElementById("w-toRead").onclick = function () { go("reading"); };
    document.getElementById("w-add").onclick = function () { draft = { text: "", start: defaultStart(), parsed: null }; renderAdd(); };
    document.getElementById("w-present").onclick = present;
    document.getElementById("w-printBtn").onclick = printList;
    window.addEventListener("resize", function () { if (document.body.classList.contains("tab-win")) fitSlide(document.getElementById("w-stage")); });
    document.addEventListener("fullscreenchange", function () { setTimeout(function () { fitSlide(document.getElementById("w-stage")); }, 60); });
  }
  function go(tab) {
    if (window.SmallGroups && window.SmallGroups.setTab) window.SmallGroups.setTab(tab);
  }
  function current() {
    if (viewId && W.lists[viewId]) return W.lists[viewId];
    var L = listOn(today());
    viewId = L ? L.id : "";
    return L;
  }
  function setFix(sub, sid, v) {
    var L = current(); if (!L) return;
    if (!v || v === "auto") delete L.fix[sub][sid]; else L.fix[sub][sid] = v;
    save(); render();
  }
  function removeList(id) {
    var L = W.lists[id]; if (!L) return;
    if (!confirm("Remove the list starting " + longDate(L.start) + "? You can undo straight after.")) return;
    lastRemoved = L; delete W.lists[id]; if (viewId === id) viewId = ""; save(); render();
    note("Removed the list from " + longDate(L.start) + ".", false, function () {
      if (lastRemoved) { W.lists[lastRemoved.id] = lastRemoved; viewId = lastRemoved.id; lastRemoved = null; save(); render(); }
    });
  }
  function present() {
    var st = document.getElementById("w-stage");
    renderSlide();
    var req = st.requestFullscreen || st.webkitRequestFullscreen;
    if (req) { try { var p = req.call(st); if (p && p.catch) p.catch(function () { }); } catch (e) { } }
    setTimeout(function () { fitSlide(st); }, 120);
  }
  function printList() {
    var L = current();
    if (!L) return note("Add a list first.", true);
    if (!W.me) return note("Choose which teacher you are, under \u201cThe teachers\u201d below, first.", true);
    document.getElementById("w-print").innerHTML = printHTML(L, readRoster());
    window.print();
  }

  function renderRail() {
    var rail = document.getElementById("w-rail"), all = sortedLists(), cur = current(), live = listOn(today());
    rail.innerHTML = all.map(function (L) {
      var tag = L === live ? (L.start > today() ? "starts " + shortDate(L.start) : "in use") : L.start > today() ? "starts " + shortDate(L.start) : "earlier";
      return '<button type="button" data-w="view" data-id="' + L.id + '" aria-pressed="' + (cur && cur.id === L.id) + '">' +
        esc(L.name || "List from " + longDate(L.start)) + "<em>" + tag + "</em></button>";
    }).join("");
    rail.hidden = !all.length;
  }
  function renderSlide() {
    var st = document.getElementById("w-stage"), L = current(), roster = readRoster();
    if (!L) {
      st.innerHTML = '<div class="w-empty"><div><p><b>No lists yet.</b></p><p>Press <b>Add a new list</b> and paste the grade\u2019s Walk to Read and Walk to Math lists.</p></div></div>';
      return;
    }
    if (!roster.length) {
      st.innerHTML = '<div class="w-empty"><div><p><b>No roster yet.</b></p><p>Your class comes from the gradebook: Setup \u2192 Roster.</p></div></div>';
      return;
    }
    st.innerHTML = slideHTML(L, roster);
    fitSlide(st);
  }
  function renderReview() {
    var box = document.getElementById("w-review"), L = current(), roster = readRoster();
    if (!L || !roster.length) { box.hidden = true; return; }
    box.hidden = false;
    var a = assignments(L, roster);
    var nUnsure = 0;
    /* anyone to check first */
    var order = roster.slice().sort(function (x, y) {
      var ux = SUBJECTS.some(function (S) { return L.subjects[S.id] && a[S.id].place[x.id].how === "unsure"; }) ? 0 : 1;
      var uy = SUBJECTS.some(function (S) { return L.subjects[S.id] && a[S.id].place[y.id].how === "unsure"; }) ? 0 : 1;
      return ux - uy || x.label.localeCompare(y.label);
    });
    var rows = order.map(function (s) {
      return "<tr><td>" + esc(s.label) + (s.last ? ' <span class="why">' + esc(s.first + " " + s.last) + "</span>" : "") + "</td>" +
        SUBJECTS.map(function (S) {
          var sub = L.subjects[S.id];
          if (!sub) return "<td>\u2014</td>";
          var p = a[S.id].place[s.id], fixv = L.fix[S.id][s.id] || "auto";
          if (p.how === "unsure") nUnsure++;
          var line = p.line ? lineById(sub, p.line) : null;
          var ts = teachersOf(L);
          var opts = '<option value="auto"' + (fixv === "auto" ? " selected" : "") + ">" +
            (p.how === "list" ? "From the list: " + esc(teacherName(p.key, L)) : "From the list: not found") + "</option>" +
            ts.map(function (t) { var v = "t:" + t.key; return '<option value="' + v + '"' + (fixv === v ? " selected" : "") + ">" + esc(teacherName(t.key, L)) + (t.key === W.me ? " (stays)" : "") + "</option>"; }).join("") +
            '<option value="none"' + (fixv === "none" ? " selected" : "") + ">Not going (pulled out, other plan)</option>" +
            '<option value="unsure"' + (fixv === "unsure" ? " selected" : "") + ">Not sure yet</option>";
          var status = p.how === "list" ? '<span class="ok">\u2713 ' + esc(line ? "\u201c" + line.text + "\u201d" : "") + (line && line.note ? " \u00b7 " + esc(line.note) : "") + "</span>"
            : p.how === "fix" ? '<span class="ok">\u2713 set by you</span>'
            : p.how === "none" ? '<span class="ok">not going</span>'
            : '<span class="q">Check</span><span class="why">' + esc(p.why || "") + "</span>";
          var sugg = (p.suggest || []).map(function (x) {
            return '<button type="button" class="sg" data-w="suggest" data-sub="' + S.id + '" data-sid="' + s.id + '" data-key="' + x.key + '">\u201c' +
              esc(x.text) + "\u201d on " + esc(teacherName(x.key, L)) + "\u2019s list?</button>";
          }).join(" ");
          return "<td>" + status + '<div><select data-fix="' + S.id + '" data-sid="' + s.id + '" aria-label="' + esc(S.label + " for " + s.label) + '">' + opts + "</select></div>" + sugg + "</td>";
        }).join("") + "</tr>";
    }).join("");
    box.innerHTML = "<h2>Your class on this list</h2>" +
      '<p class="hint">Found by name. A child is placed only when a line on the list can mean no one else in your class; anyone else says <b>Check</b>, and shows on the slide under \u201cCheck with me\u201d until you choose. Choices here stay with this list.</p>' +
      (nUnsure ? '<p class="w-warn">' + nUnsure + " to check.</p>" : '<p class="hint"><b>Everyone is placed.</b></p>') +
      '<div class="w-scroll"><table class="w-tbl"><thead><tr><th>Student</th>' + SUBJECTS.map(function (S) { return "<th>" + S.label + "</th>"; }).join("") +
      "</tr></thead><tbody>" + rows + "</tbody></table></div>";
  }
  function renderChanges() {
    var box = document.getElementById("w-changes"), L = current(), roster = readRoster();
    var prev = L ? before(L) : null;
    if (!L || !prev || !roster.length) { box.innerHTML = ""; return; }
    var ch = changes(L, prev, roster);
    box.innerHTML = '<div class="w-panel"><h2>What changed from the list before</h2>' +
      (ch.length ? '<ul style="margin:4px 0 0 18px;padding:0">' + ch.map(function (c) {
        return "<li><b>" + esc(c.name) + "</b> \u2014 " + (c.subject === "read" ? "Read" : "Math") + ": " + esc(c.from) + " \u2192 " + esc(c.to) + "</li>";
      }).join("") + "</ul>" : '<p class="hint">Nobody in your class moves.</p>') + "</div>";
  }
  function renderSetup() {
    var box = document.getElementById("w-setup"), L = current();
    if (!L) { box.hidden = true; return; }
    box.hidden = false;
    var ts = teachersOf(L);
    box.innerHTML = "<h2>The teachers</h2>" +
      '<div class="w-row"><label>Which one are you? <select id="w-me"><option value="">Choose\u2026</option>' +
      ts.map(function (t) { return '<option value="' + t.key + '"' + (W.me === t.key ? " selected" : "") + ">" + esc(t.name) + "</option>"; }).join("") +
      "</select></label></div>" +
      '<p class="hint">The list uses first names. Type what the children call each teacher, and a room if it helps; the slide uses these. They are kept for every list.</p>' +
      ts.map(function (t) {
        var rec = W.teachers[t.key] || {};
        return '<div class="w-row"><b style="min-width:70px">' + esc(t.name) + "</b>" +
          '<label>Children call them <input type="text" data-call="' + t.key + '" value="' + esc(rec.call || "") + '" placeholder="e.g. Mrs. ' + esc(t.name) + '" size="16"></label>' +
          '<label>Room <input type="text" data-room="' + t.key + '" value="' + esc(rec.room || "") + '" placeholder="e.g. Room 14" size="10"></label></div>';
      }).join("") +
      '<h2 style="margin-top:14px">This list</h2><div class="w-row"><label>Starts <input type="date" id="w-start" value="' + L.start + '"></label>' +
      '<span class="hint">From this day the slide uses this list. A later list takes over on its own start day.</span>' +
      '<span style="flex:1"></span><button type="button" class="w-btn" data-w="remove" data-id="' + L.id + '">Remove this list</button></div>';
  }
  function renderAdd() {
    var box = document.getElementById("w-addPanel");
    if (!draft) { box.hidden = true; box.innerHTML = ""; return; }
    box.hidden = false;
    var p = draft.parsed, groupsHTML = "";
    if (p) {
      SUBJECTS.forEach(function (S) {
        var sub = p.subjects[S.id];
        groupsHTML += "<h2 style=\"margin-top:10px\">" + S.label + (sub ? " \u00b7 " + sub.days.map(function (d) { return DAYNAMES[d]; }).join(" &amp; ") : "") + "</h2>";
        if (!sub) { groupsHTML += '<p class="hint">Not in this paste' + (listOn(draft.start) ? ", so it stays as it is on the current list." : ".") + "</p>"; return; }
        groupsHTML += '<div class="w-pv">' + sub.groups.map(function (g) {
          return "<div><b>" + esc(g.teacher) + "</b><small>" + g.lines.length + " names" + (g.desc ? " \u00b7 " + esc(g.desc) : "") + "</small><ol>" +
            g.lines.map(function (l) { return "<li>" + esc(l.text) + (l.note ? " <i>(" + esc(l.note) + ")</i>" : "") + "</li>"; }).join("") + "</ol></div>";
        }).join("") + "</div>";
      });
    }
    var ok = p && (p.subjects.read || p.subjects.math);
    box.innerHTML = "<h2>Add a new list</h2>" +
      '<p class="hint">Copy the lists out of the school\u2019s document and paste them here, titles and all (\u201cWalk to Win Reading \u2026 M/TH\u201d, then each teacher, the count, and the names). Both at once, or just the one that changed.</p>' +
      '<textarea id="w-text" spellcheck="false" placeholder="Walk to Win Reading (Fall) M/TH&#10;Ms. A&#10;Decoding group -&#10;(12)&#10;Tobin&#10;\u2026">' + esc(draft.text) + "</textarea>" +
      '<div class="w-row"><button type="button" class="w-btn" id="w-open">Open a text file</button><input type="file" id="w-file" accept=".txt,text/plain" hidden>' +
      '<label>Starts <input type="date" id="w-dstart" value="' + draft.start + '"></label>' +
      '<button type="button" class="w-btn" id="w-read">Read it</button>' +
      '<span style="flex:1"></span><button type="button" class="w-btn" id="w-cancel">Cancel</button>' +
      '<button type="button" class="w-btn brass" id="w-save"' + (ok ? "" : " disabled") + ">Use this list</button></div>" +
      (p && p.warnings.length ? '<div class="w-warn">' + p.warnings.map(esc).join("<br>") + "</div>" : "") + groupsHTML;
    var ta = document.getElementById("w-text");
    ta.oninput = function () { draft.text = ta.value; draft.parsed = null; document.getElementById("w-save").disabled = true; };
    document.getElementById("w-dstart").onchange = function (e) { draft.start = e.target.value || defaultStart(); };
    document.getElementById("w-read").onclick = function () { draft.parsed = parse(draft.text); renderAdd(); };
    document.getElementById("w-cancel").onclick = function () { draft = null; renderAdd(); };
    var fi = document.getElementById("w-file");
    document.getElementById("w-open").onclick = function () { fi.click(); };
    fi.onchange = function () {
      var f = fi.files && fi.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () { draft.text = String(r.result); draft.parsed = parse(draft.text); renderAdd(); };
      r.readAsText(f);
    };
    document.getElementById("w-save").onclick = function () {
      if (!draft.parsed) return;
      var L = addList(draft.parsed, draft.start || defaultStart());
      draft = null; viewId = L.id; render();
      note("Saved. " + (L.start > today() ? "It takes over on " + longDate(L.start) + "." : "It is in use now."));
    };
  }
  function render() {
    if (!root) return;
    load();
    renderRail(); renderAdd(); renderSlide(); renderChanges(); renderReview(); renderSetup();
  }

  window.addEventListener("storage", function (e) { if ((e.key === KEY || e.key === ROSTER_KEY) && document.body.classList.contains("tab-win")) render(); });
  if (window.SuiteSync && window.SuiteSync.onChanged) {
    window.SuiteSync.onChanged(function (changed) {
      if ((changed.indexOf(KEY) >= 0 || changed.indexOf(ROSTER_KEY) >= 0) && document.body.classList.contains("tab-win")) render();
    });
  }

  load();
  window.SuiteWin = {
    KEY: KEY, parse: parse, matchSubject: matchSubject, readRoster: readRoster,
    state: function () { load(); return W; },
    addList: function (text, start, name) { load(); var p = typeof text === "string" ? parse(text) : text; return addList(p, start || defaultStart(), name); },
    listOn: function (d) { load(); return listOn(d || today()); },
    assignments: function (L) { load(); return assignments(L, readRoster()); },
    changes: function (L) { load(); return changes(L, before(L), readRoster()); },
    comingToMe: function (L) { load(); return comingToMe(L, readRoster()); },
    slideHTML: function (L, opts) { load(); return slideHTML(L, readRoster(), opts); },
    printHTML: function (L) { load(); return printHTML(L, readRoster()); },
    setMe: function (k) { load(); W.me = k; save(); },
    setFix: function (id, sub, sid, v) { load(); var L = W.lists[id]; if (!v || v === "auto") delete L.fix[sub][sid]; else L.fix[sub][sid] = v; save(); },
    defaultStart: defaultStart,
    show: function () { build(); viewId = ""; render(); },
    render: render
  };
  /* the page ran setTab("win") before this deferred file arrived */
  if (document.body && document.body.classList.contains("tab-win")) window.SuiteWin.show();
})();

/* ==========================================================================
   sub-plans.js — sub plans, generated from the day you are looking at.

   Injected into the planner rather than built into it: nothing here touches
   the planner's own code, so removing the one <script> tag leaves it exactly
   as it was. The standing notes live under their own storage key, which
   suite-sync carries between machines like everything else.

   NOTHING PERSONAL IS IN THIS FILE. The suite is served from a public
   repository, so names, behaviour notes and phone numbers are loaded from a
   private JSON file and kept in this browser.
   ========================================================================== */
(function () {
  if (window.__subPlans) return;
  window.__subPlans = true;

  var KEY = "suite:subplan:v1";
  var LP_SETTINGS = "lp:settings:v2";
  var LP_DAYS = "lp:days:v2";
  var GB_KEY = "gb2_standards_v1";
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var DAYKEY = ["U", "M", "T", "W", "R", "F", "S"];
  var MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  /* ---------- storage ---------- */
  function blank() {
    return {
      intro: "", contact: "", signal: "", trusted: "",
      incentives: "", consequences: "", arrival: "", closing: "",
      watch: [], specials: {},
      blocks: [
        { start: "8:00", end: "8:15", title: "Arrival & Morning Meeting", days: "MTRF", subject: "", detail: "", emergency: "" },
        { start: "8:15", end: "8:30", title: "Phonics", days: "MTRF", subject: "phonics", detail: "", emergency: "" },
        { start: "8:30", end: "8:50", title: "Reading small groups", days: "MTRF", subject: "reading", detail: "", emergency: "" },
        { start: "8:50", end: "9:10", title: "Whole-group comprehension", days: "MTRF", subject: "reading", detail: "", emergency: "" },
        { start: "9:10", end: "9:30", title: "Reading small groups (rotate)", days: "MTRF", subject: "reading", detail: "", emergency: "" },
        { start: "9:30", end: "9:45", title: "Recess", days: "MTRF", subject: "", detail: "", emergency: "" },
        { start: "9:45", end: "10:00", title: "Read aloud & snack", days: "MTRF", subject: "", detail: "", emergency: "" },
        { start: "10:00", end: "10:15", title: "Math warm-up", days: "MTRF", subject: "math", detail: "", emergency: "" },
        { start: "10:15", end: "10:40", title: "Math core lesson", days: "MTRF", subject: "math", detail: "", emergency: "" },
        { start: "10:40", end: "11:00", title: "Math small groups", days: "MTRF", subject: "math", detail: "", emergency: "" },
        { start: "11:00", end: "11:40", title: "Lunch & recess", days: "MTRF", subject: "", detail: "", emergency: "" },
        { start: "11:40", end: "12:05", title: "Writing", days: "MTRF", subject: "writing", detail: "", emergency: "" },
        { start: "12:05", end: "1:00", title: "WIN time", days: "MTRF", subject: "win", detail: "", emergency: "" },
        { start: "1:00", end: "1:30", title: "Science / Social Studies", days: "MTRF", subject: "science", detail: "", emergency: "" },
        { start: "1:30", end: "1:55", title: "Specials 1", days: "MTRF", subject: "", detail: "", emergency: "" },
        { start: "1:55", end: "2:20", title: "Specials 2", days: "MTRF", subject: "", detail: "", emergency: "" },
        { start: "2:15", end: "2:30", title: "Clean-up, shoutouts, dismissal", days: "MTRF", subject: "", detail: "", emergency: "" }
      ]
    };
  }
  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return normalise(JSON.parse(raw));
    } catch (e) { }
    /* first run: take the notes over from where they used to live */
    try {
      var gb = JSON.parse(localStorage.getItem(GB_KEY) || "{}");
      if (gb && gb.sub && typeof gb.sub === "object") {
        var moved = normalise(gb.sub);
        write(moved);
        return moved;
      }
    } catch (e) { }
    return blank();
  }
  function write(v) {
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { }
  }
  function normalise(src) {
    var b = blank();
    ["intro", "contact", "signal", "trusted", "incentives", "consequences", "arrival", "closing"]
      .forEach(function (k) { if (typeof src[k] === "string") b[k] = src[k]; });
    if (Array.isArray(src.watch)) b.watch = src.watch.filter(function (w) { return w && w.name; })
      .map(function (w) { return { name: String(w.name), note: String(w.note || "") }; });
    if (src.specials && typeof src.specials === "object") b.specials = src.specials;
    if (Array.isArray(src.blocks) && src.blocks.length) {
      b.blocks = src.blocks.map(function (x) {
        return {
          start: String(x.start || ""), end: String(x.end || ""), title: String(x.title || ""),
          days: String(x.days || "MTRF"), subject: String(x.subject || ""),
          detail: String(x.detail || ""), emergency: String(x.emergency || "")
        };
      });
    }
    return b;
  }
  var S = read();
  function persist() { write(S); }

  /* ---------- planner data ---------- */
  function planner() {
    try {
      var s = localStorage.getItem(LP_SETTINGS);
      if (!s) return null;
      return {
        subjects: (JSON.parse(s) || {}).subjects || [],
        days: JSON.parse(localStorage.getItem(LP_DAYS) || "{}") || {}
      };
    } catch (e) { return null; }
  }
  function esc(x) {
    return String(x == null ? "" : x).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function nl(x) { return esc(x).replace(/\n/g, "<br>"); }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function dayKeyOf(iso) { var d = new Date(iso + "T12:00:00"); return isNaN(d) ? "M" : DAYKEY[d.getDay()]; }
  function pretty(iso) {
    var d = new Date(iso + "T12:00:00");
    if (isNaN(d)) return iso;
    return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()] +
      ", " + d.getDate() + " " + MONTHS[d.getMonth()];
  }
  function blocksFor(iso) {
    var k = dayKeyOf(iso);
    return S.blocks.filter(function (b) { return !b.days || b.days.indexOf(k) >= 0; });
  }
  function lessonFor(iso, subjectId) {
    var lp = planner();
    if (!lp || !subjectId) return null;
    var rec = lp.days[iso];
    if (!rec || !rec.entries) return null;
    var e = rec.entries[subjectId];
    if (!e) return null;
    var sb = lp.subjects.find(function (x) { return x.id === subjectId; });
    var p = e.pos || {}, where = "";
    if (p.unit && p.week && p.day) where = "Unit " + p.unit + " · Week " + p.week + " · Day " + p.day;
    else if (p.unit && p.lesson) where = "Unit " + p.unit + " · Lesson " + p.lesson;
    else if (p.lesson) where = "Lesson " + p.lesson;
    else if (p.text) where = String(p.text);
    return {
      name: sb ? sb.name : subjectId,
      curriculum: sb && sb.curriculum ? sb.curriculum : "",
      where: where, note: e.note || ""
    };
  }
  function dayNote(iso) {
    var lp = planner();
    if (!lp) return "";
    var rec = lp.days[iso];
    return rec && rec.notes ? String(rec.notes) : "";
  }
  function noSchool(iso) {
    var lp = planner();
    if (!lp) return false;
    var rec = lp.days[iso];
    return !!(rec && rec.noSchool);
  }
  function specialFor(iso, title) {
    var pair = S.specials[dayKeyOf(iso)];
    if (!pair) return "";
    if (/specials\s*1/i.test(title)) return pair[0] || "";
    if (/specials\s*2/i.test(title)) return pair[1] || "";
    return "";
  }
  function firstSentence(t) {
    var s = String(t || "").replace(/\s+/g, " ").trim();
    var m = s.match(/^(.{0,150}?[.!?])\s/);
    return m ? m[1] : (s.length > 150 ? s.slice(0, 147) + "…" : s);
  }
  function hasContent() {
    return !!(S.intro || S.signal || S.contact || S.trusted || S.watch.length ||
      S.blocks.some(function (b) { return b.detail || b.emergency; }));
  }

  /* ---------- the printed documents ---------- */
  var DOC_CSS =
    "@page{margin:14mm}" +
    "#subprint{font-family:'IBM Plex Sans','Segoe UI',system-ui,sans-serif;color:#14202A;font-size:11.5pt;line-height:1.45}" +
    "#subprint h1{font-family:'IBM Plex Serif',Georgia,serif;font-size:19pt;margin:0 0 2pt}" +
    "#subprint h2{font-size:11pt;letter-spacing:.09em;text-transform:uppercase;color:#55636E;margin:16pt 0 6pt;border-bottom:1px solid #C9D1D8;padding-bottom:3pt}" +
    "#subprint .lede{color:#55636E;margin:0 0 12pt;font-size:11pt}" +
    "#subprint .blk{page-break-inside:avoid;margin:0 0 11pt;padding-left:10pt;border-left:2.5pt solid #C9D1D8}" +
    "#subprint .blk .t{font-size:10.5pt;color:#55636E;font-weight:600}" +
    "#subprint .blk .h{font-size:13pt;font-weight:600;margin:1pt 0 3pt}" +
    "#subprint .blk .w{display:inline-block;padding:1.5pt 6pt;border:1px solid #C9D1D8;border-radius:4pt;font-size:10pt;margin-bottom:4pt}" +
    "#subprint .blk p{margin:3pt 0}" +
    "#subprint .em{background:#FAF2E2;border:1px solid #E7D7B4;border-radius:4pt;padding:5pt 8pt;font-size:10.5pt;margin-top:5pt}" +
    "#subprint .em b{color:#8A5E14}" +
    "#subprint .box{border:1px solid #C9D1D8;border-radius:5pt;padding:8pt 10pt;margin:0 0 9pt}" +
    "#subprint .two{display:flex;gap:12pt}#subprint .two>*{flex:1}" +
    "#subprint table{width:100%;border-collapse:collapse;font-size:10.5pt}" +
    "#subprint th,#subprint td{border:1px solid #C9D1D8;padding:4pt 6pt;text-align:left;vertical-align:top}" +
    "#subprint th{background:#EDF0F2;font-size:9.5pt;letter-spacing:.06em;text-transform:uppercase}" +
    "#subprint .sig{font-size:12.5pt;font-weight:600}" +
    "#subprint .notes{border:1px solid #C9D1D8;border-radius:5pt;height:150pt;margin-top:6pt}" +
    "#subprint .muted{color:#55636E}";

  function buildFull(iso, who) {
    var h = "<h1>Sub plans &middot; " + esc(pretty(iso)) + "</h1>";
    h += '<p class="lede">' + esc(who || "Grade 2") + (S.contact ? " &middot; reach me at " + esc(S.contact) : "") + "</p>";
    if (S.intro) h += '<div class="box">' + nl(S.intro) + "</div>";
    if (S.signal || S.trusted) {
      h += "<h2>First things</h2>";
      if (S.signal) h += '<p class="sig">' + nl(S.signal) + "</p>";
      if (S.trusted) h += "<p><b>Students who can tell you how things run:</b> " + esc(S.trusted) + "</p>";
    }
    if (S.arrival) h += "<h2>Arrival</h2><p>" + nl(S.arrival) + "</p>";
    var note = dayNote(iso);
    if (note) h += '<h2>Just for this day</h2><div class="box">' + nl(note) + "</div>";

    h += "<h2>The day, block by block</h2>";
    var blocks = blocksFor(iso);
    if (!blocks.length) h += "<p>No blocks are set for a " + esc(DAYS[new Date(iso + "T12:00:00").getDay()]) + ".</p>";
    blocks.forEach(function (b) {
      var l = lessonFor(iso, b.subject), sp = specialFor(iso, b.title);
      h += '<div class="blk"><div class="t">' + esc(b.start) + " – " + esc(b.end) + "</div>";
      h += '<div class="h">' + esc(b.title) + (sp ? ": " + esc(sp) : "") + "</div>";
      if (l && l.where) h += '<span class="w"><b>' + esc(l.curriculum || l.name) + "</b> &middot; " + esc(l.where) + "</span>";
      if (l && l.note) h += "<p><b>My note:</b> " + esc(l.note) + "</p>";
      if (b.detail) h += "<p>" + nl(b.detail) + "</p>";
      if (b.emergency) h += '<div class="em"><b>If you cannot find it:</b> ' + nl(b.emergency) + "</div>";
      h += "</div>";
    });

    if (S.incentives || S.consequences || S.watch.length) {
      h += "<h2>Behaviour</h2>";
      if (S.incentives) h += "<p>" + nl(S.incentives) + "</p>";
      if (S.consequences) h += "<p>" + nl(S.consequences) + "</p>";
      if (S.watch.length) {
        h += '<table><thead><tr><th style="width:22%">Student</th><th>What helps</th></tr></thead><tbody>' +
          S.watch.map(function (w) { return "<tr><td><b>" + esc(w.name) + "</b></td><td>" + nl(w.note) + "</td></tr>"; }).join("") +
          "</tbody></table>";
      }
    }
    if (S.closing) h += "<h2>End of day</h2><p>" + nl(S.closing) + "</p>";
    h += '<h2>How did it go?</h2><div class="notes"></div>';
    return h;
  }
  function buildGlance(iso, who) {
    var h = "<h1>At a glance &middot; " + esc(pretty(iso)) + "</h1>";
    h += '<p class="lede">' + esc(who || "Grade 2") + (S.contact ? " &middot; " + esc(S.contact) : "") + " &middot; the full plan has the detail</p>";
    if (S.signal) h += '<div class="box"><b>To get their attention:</b> <span class="sig">' + esc(S.signal).replace(/\n/g, " ") + "</span></div>";
    h += '<h2>The day</h2><table><thead><tr><th style="width:15%">Time</th><th style="width:32%">What</th><th>Where it is</th></tr></thead><tbody>';
    blocksFor(iso).forEach(function (b) {
      var l = lessonFor(iso, b.subject), sp = specialFor(iso, b.title);
      h += "<tr><td>" + esc(b.start) + "–" + esc(b.end) + "</td><td><b>" + esc(b.title) + (sp ? ": " + esc(sp) : "") + "</b></td><td>" +
        (l && l.where ? esc((l.curriculum ? l.curriculum + " · " : "") + l.where) : '<span class="muted">—</span>') +
        (b.emergency ? '<br><span class="muted">Stuck? ' + esc(firstSentence(b.emergency)) + "</span>" : "") + "</td></tr>";
    });
    h += "</tbody></table>";
    var note = dayNote(iso);
    if (note) h += '<h2>Today only</h2><div class="box">' + nl(note) + "</div>";
    h += '<div class="two" style="margin-top:14pt">';
    if (S.watch.length) {
      h += '<div><h2 style="margin-top:0">Keep an eye on</h2>' +
        S.watch.map(function (w) { return "<p><b>" + esc(w.name) + "</b> " + esc(firstSentence(w.note)) + "</p>"; }).join("") + "</div>";
    }
    if (S.consequences || S.incentives) {
      h += '<div><h2 style="margin-top:0">Behaviour, briefly</h2>' +
        (S.consequences ? "<p>" + esc(firstSentence(S.consequences)) + "</p>" : "") +
        (S.incentives ? '<p class="muted">' + esc(firstSentence(S.incentives)) + "</p>" : "") + "</div>";
    }
    h += "</div>";
    if (S.trusted) h += "<p><b>Ask these students if unsure:</b> " + esc(S.trusted) + "</p>";
    return h;
  }
  function teacherName() {
    try {
      var gb = JSON.parse(localStorage.getItem(GB_KEY) || "{}");
      return (gb.settings && gb.settings.teacher) || "";
    } catch (e) { return ""; }
  }
  function doPrint(kind, iso) {
    if (!hasContent()) { alert("Add your standing notes first — the editor is on this panel."); return; }
    var box = document.getElementById("subprint");
    box.innerHTML = (kind === "glance" ? buildGlance(iso, teacherName()) : buildFull(iso, teacherName()));
    document.body.setAttribute("data-subprint", "1");
    window.print();
    setTimeout(function () { document.body.removeAttribute("data-subprint"); }, 500);
  }

  /* ---------- the panel ---------- */
  var open = false, curDate = todayISO();

  function css() {
    var s = document.createElement("style");
    s.textContent =
      DOC_CSS +
      "#subprint{display:none}" +
      "@media print{body[data-subprint] > *{display:none !important}" +
      "body[data-subprint] > #subprint{display:block !important}}" +
      "#subbtn{position:fixed;right:20px;bottom:64px;z-index:2147482999;display:flex;align-items:center;gap:6px;" +
      "padding:9px 16px;border-radius:999px;border:1px solid rgba(16,24,32,.1);background:rgba(255,255,255,.92);" +
      "box-shadow:0 2px 10px rgba(16,24,32,.12);cursor:pointer;color:#14202A;" +
      "font:600 13px 'IBM Plex Sans','Segoe UI',system-ui,sans-serif;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}" +
      "#subbtn:hover{border-color:#10655C;color:#10655C}" +
      "#subwrap{position:fixed;inset:0;z-index:2147483100;background:rgba(16,24,32,.36);display:flex;align-items:center;justify-content:center;padding:22px}" +
      "#subpanel{width:min(960px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:14px;" +
      "box-shadow:0 20px 60px rgba(16,24,32,.3);font:15px/1.5 'IBM Plex Sans','Segoe UI',system-ui,sans-serif;color:#14202A}" +
      "#subpanel .hd{position:sticky;top:0;background:rgba(255,255,255,.95);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);" +
      "border-bottom:1px solid rgba(16,24,32,.09);padding:14px 18px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}" +
      "#subpanel h2{margin:0;font-family:'IBM Plex Serif',Georgia,serif;font-size:17px;font-weight:600}" +
      "#subpanel h3{margin:18px 0 8px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#8A95A0}" +
      "#subpanel .bd{padding:16px 18px 22px}" +
      "#subpanel label.f{display:flex;flex-direction:column;gap:4px;font:600 11px 'IBM Plex Sans',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#8A95A0}" +
      "#subpanel input,#subpanel textarea,#subpanel select{font:14px 'IBM Plex Sans',sans-serif;color:#14202A;border:1px solid rgba(16,24,32,.14);border-radius:8px;padding:7px 10px;background:#fff;width:100%}" +
      "#subpanel textarea{resize:vertical}" +
      "#subpanel .g2{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}" +
      "#subpanel .b{border:1px solid rgba(16,24,32,.14);border-radius:8px;padding:8px 14px;background:#fff;font:600 13.5px 'IBM Plex Sans',sans-serif;cursor:pointer;color:#14202A;box-shadow:0 1px 2px rgba(16,24,32,.07);width:auto}" +
      "#subpanel .b:hover{background:#F7F9FA}" +
      "#subpanel .b.p{background:#10655C;border-color:#10655C;color:#fff;box-shadow:none}" +
      "#subpanel .b.d{color:#B4472F;border-color:#B4472F}" +
      "#subpanel .row{display:flex;gap:9px;align-items:center;flex-wrap:wrap}" +
      "#subpanel .blkrow{border:1px solid rgba(16,24,32,.09);border-radius:10px;padding:10px 12px;margin-top:9px}" +
      "#subpanel .warn{background:#FAF2E2;border:1px solid #E7D7B4;border-radius:10px;padding:11px 13px;font-size:13.5px;margin-top:12px}" +
      "#subpanel .hint{font-size:12.5px;color:#8A95A0}" +
      "#subpanel table{width:100%;border-collapse:collapse;font-size:13.5px}" +
      "#subpanel th,#subpanel td{border-bottom:1px solid rgba(16,24,32,.09);padding:5px 6px;text-align:left}" +
      "@media print{#subbtn,#subwrap{display:none !important}}";
    document.head.appendChild(s);
  }

  function panelHTML() {
    var blocks = blocksFor(curDate);
    var lp = planner();
    var filled = blocks.filter(function (b) { return lessonFor(curDate, b.subject); }).length;
    var subjOpts = function (cur) {
      var subs = lp ? lp.subjects : [];
      return '<option value="">no lesson</option>' + subs.map(function (s) {
        return '<option value="' + esc(s.id) + '"' + (s.id === cur ? " selected" : "") + ">" + esc(s.name) + "</option>";
      }).join("");
    };
    var f = function (k, label, rows) {
      return '<label class="f">' + esc(label) + (rows > 1
        ? '<textarea data-f="' + k + '" rows="' + rows + '">' + esc(S[k]) + "</textarea>"
        : '<input data-f="' + k + '" value="' + esc(S[k]) + '">') + "</label>";
    };

    var h = '<div class="hd"><h2>Sub plan</h2>' +
      '<input type="date" id="subdate" value="' + esc(curDate) + '" style="width:auto" aria-label="Day">' +
      '<button class="b p" data-act="full">Print full plan</button>' +
      '<button class="b" data-act="glance">Print the one-pager</button>' +
      '<span style="flex:1"></span>' +
      '<button class="b" data-act="save">Save standing notes</button>' +
      '<label class="b" style="display:inline-flex">Load standing notes<input type="file" id="subseed" accept=".json" hidden></label>' +
      '<button class="b" data-act="close">Close</button></div><div class="bd">';

    h += '<p class="hint">' + (noSchool(curDate) ? '<span style="color:#B4472F">The planner has this day marked as no school. </span>' : "") +
      blocks.length + " block" + (blocks.length === 1 ? "" : "s") + " for a " + DAYS[new Date(curDate + "T12:00:00").getDay()] +
      ", " + filled + " filled in from the planner" + (dayNote(curDate) ? ", plus your note for the day" : "") + ".</p>";

    if (!hasContent()) {
      h += '<div class="warn"><b>Nothing standing yet.</b> The published files carry the time blocks and nothing else — no names, no notes, no phone number, because this site is served from a public repository. Load yours from a private file above, or type them in below.</div>';
    }

    h += "<h3>Standing notes</h3><div class=\"g2\">" +
      f("intro", "Opening note to the sub", 3) + f("signal", "Come-together signal", 3) +
      f("trusted", "Students who know the routines", 2) + f("contact", "How to reach you", 1) +
      f("arrival", "Arrival routine", 3) + f("closing", "End of day routine", 3) +
      f("incentives", "Incentives", 3) + f("consequences", "Consequences", 3) + "</div>";

    h += "<h3>Students to keep an eye on</h3>";
    S.watch.forEach(function (w, i) {
      h += '<div class="row" style="margin-top:7px;align-items:flex-start">' +
        '<input data-w="name" data-i="' + i + '" value="' + esc(w.name) + '" placeholder="Name" style="width:150px">' +
        '<textarea data-w="note" data-i="' + i + '" rows="2" style="flex:1;min-width:240px" placeholder="What helps">' + esc(w.note) + "</textarea>" +
        '<button class="b d" data-rmw="' + i + '">Remove</button></div>';
    });
    h += '<button class="b" style="margin-top:8px" data-act="addw">Add a student</button>';

    h += "<h3>Specials by day</h3><table><thead><tr><th>Day</th><th>First slot</th><th>Second slot</th></tr></thead><tbody>";
    ["M", "T", "W", "R", "F"].forEach(function (k, i) {
      var p = S.specials[k] || ["", ""];
      h += "<tr><td>" + ["Mon", "Tue", "Wed", "Thu", "Fri"][i] + "</td>" +
        '<td><input data-sp="' + k + '" data-slot="0" value="' + esc(p[0] || "") + '"></td>' +
        '<td><input data-sp="' + k + '" data-slot="1" value="' + esc(p[1] || "") + '"></td></tr>';
    });
    h += "</tbody></table>";

    h += '<h3>Blocks</h3><p class="hint">Days uses M T W R F. Subject links a block to the planner so the lesson fills itself in.</p>';
    S.blocks.forEach(function (b, i) {
      h += '<div class="blkrow"><div class="row">' +
        '<input data-b="start" data-i="' + i + '" value="' + esc(b.start) + '" style="width:74px" aria-label="Start">' +
        '<input data-b="end" data-i="' + i + '" value="' + esc(b.end) + '" style="width:74px" aria-label="End">' +
        '<input data-b="title" data-i="' + i + '" value="' + esc(b.title) + '" style="flex:1;min-width:170px" aria-label="Title">' +
        '<input data-b="days" data-i="' + i + '" value="' + esc(b.days) + '" style="width:78px" aria-label="Days">' +
        '<select data-b="subject" data-i="' + i + '" style="width:auto" aria-label="Planner subject">' + subjOpts(b.subject) + "</select>" +
        '<button class="b d" data-rmb="' + i + '">Remove</button></div>' +
        '<textarea data-b="detail" data-i="' + i + '" rows="2" style="margin-top:7px" placeholder="What to do">' + esc(b.detail) + "</textarea>" +
        '<textarea data-b="emergency" data-i="' + i + '" rows="2" style="margin-top:6px" placeholder="If you cannot find it…">' + esc(b.emergency) + "</textarea></div>";
    });
    h += '<button class="b" style="margin-top:9px" data-act="addb">Add a block</button>';
    return h + "</div>";
  }

  function paint() {
    var panel = document.getElementById("subpanel");
    if (!panel) return;
    panel.innerHTML = panelHTML();
    panel.querySelectorAll("[data-f]").forEach(function (el) {
      el.onchange = function () { S[el.dataset.f] = el.value; persist(); };
    });
    panel.querySelectorAll("[data-w]").forEach(function (el) {
      el.onchange = function () { S.watch[+el.dataset.i][el.dataset.w] = el.value; persist(); };
    });
    panel.querySelectorAll("[data-sp]").forEach(function (el) {
      el.onchange = function () {
        var p = S.specials[el.dataset.sp] || ["", ""];
        p[+el.dataset.slot] = el.value; S.specials[el.dataset.sp] = p; persist();
      };
    });
    panel.querySelectorAll("[data-b]").forEach(function (el) {
      el.onchange = function () { S.blocks[+el.dataset.i][el.dataset.b] = el.value; persist(); };
    });
    panel.querySelectorAll("[data-rmw]").forEach(function (el) {
      el.onclick = function () { S.watch.splice(+el.dataset.rmw, 1); persist(); paint(); };
    });
    panel.querySelectorAll("[data-rmb]").forEach(function (el) {
      el.onclick = function () { S.blocks.splice(+el.dataset.rmb, 1); persist(); paint(); };
    });
    panel.querySelectorAll("[data-act]").forEach(function (el) {
      el.onclick = function () {
        var a = el.dataset.act;
        if (a === "close") close();
        else if (a === "full" || a === "glance") doPrint(a, curDate);
        else if (a === "addw") { S.watch.push({ name: "", note: "" }); persist(); paint(); }
        else if (a === "addb") { S.blocks.push({ start: "", end: "", title: "", days: "MTRF", subject: "", detail: "", emergency: "" }); persist(); paint(); }
        else if (a === "save") {
          var blob = new Blob([JSON.stringify({ sub: S }, null, 1)], { type: "application/json" });
          var link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = "sub-plan-standing-notes.json";
          link.click();
          setTimeout(function () { URL.revokeObjectURL(link.href); }, 3000);
        }
      };
    });
    var dt = document.getElementById("subdate");
    if (dt) dt.onchange = function () { curDate = dt.value; paint(); };
    var seed = document.getElementById("subseed");
    if (seed) seed.onchange = function (e) {
      var file = e.target.files[0]; if (!file) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var obj = JSON.parse(rd.result);
          S = normalise(obj.sub || obj);
          persist(); paint();
        } catch (err) { alert("That file could not be read."); }
      };
      rd.readAsText(file);
    };
  }
  function openPanel(dateISO) {
    if (open) return;
    open = true;
    if (dateISO) curDate = dateISO;
    var wrap = document.createElement("div");
    wrap.id = "subwrap";
    wrap.innerHTML = '<div id="subpanel"></div>';
    wrap.addEventListener("click", function (e) { if (e.target === wrap) close(); });
    document.body.appendChild(wrap);
    paint();
    document.addEventListener("keydown", escClose);
  }
  function close() {
    open = false;
    var w = document.getElementById("subwrap");
    if (w) w.remove();
    document.removeEventListener("keydown", escClose);
  }
  function escClose(e) { if (e.key === "Escape") close(); }

  function build() {
    css();
    var print = document.createElement("div");
    print.id = "subprint";
    document.body.appendChild(print);

    var btn = document.createElement("button");
    btn.id = "subbtn";
    btn.type = "button";
    btn.innerHTML = '<span aria-hidden="true">\u2637</span> Sub plan';
    btn.title = "Turn a day into sub plans";
    btn.onclick = function () { openPanel(); };
    document.body.appendChild(btn);

    window.SubPlans = { open: openPanel, close: close };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();

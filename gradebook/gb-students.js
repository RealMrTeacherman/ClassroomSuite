/* gradebook/gb-students.js — The Students tab and a student's own page; the iReady importer.
   One of the gradebook's scripts, loaded in order by index.html as classic
   scripts sharing one global scope; see HANDOFF "The gradebook's files". */
/* ============================================================
   TAB 3 — STUDENTS
   ============================================================ */
function renderStudents() {
  const el = document.getElementById("panel-students");
  if (!S.students.length) return noStudents(el);
  const roster = sortedStudents();
  if (!roster.find(s => s.id === UI.studentSel)) UI.studentSel = roster[0].id;
  const st = S.students.find(s => s.id === UI.studentSel);

  /* surfaced here, where the roster is, rather than left for report cards */
  let html = '<div class="stack">' + duplicateNoticeHTML() + '<div class="card pad"><div class="row">' +
    '<label class="fld">Student<select id="st-sel">' + roster.map(s => '<option value="' + s.id + '"' + (s.id === UI.studentSel ? " selected" : "") + ">" + esc(s.last + ", " + s.first) + "</option>").join("") + "</select></label>" +
    /* step child by child without reopening the list */
    (function () {
      const i = roster.findIndex(s => s.id === UI.studentSel), p = roster[i - 1], n = roster[i + 1];
      return '<span class="row st-step" style="gap:6px;align-self:flex-end">' +
        '<button type="button" class="btn sm" data-st-step="' + (p ? esc(p.id) : "") + '"' + (p ? ' aria-label="Previous student: ' + esc(p.first + " " + p.last) + '"' : ' disabled aria-label="Previous student"') + '>\u2190</button>' +
        '<span class="small muted num">' + (i + 1) + " of " + roster.length + "</span>" +
        '<button type="button" class="btn sm" data-st-step="' + (n ? esc(n.id) : "") + '"' + (n ? ' aria-label="Next student: ' + esc(n.first + " " + n.last) + '"' : ' disabled aria-label="Next student"') + '>\u2192</button></span>';
    })() +
    '<span style="flex:1"></span><button class="btn sm" onclick="printStudent()">Print this student</button></div></div>';
  html += studentAssignmentsHTML(st);

  const ms = missingSummary(st.id);
  if (ms.total) {
    const items = S.missing.filter(m => m.sid === st.id && !m.excused && !m.received)
      .sort((a, b) => a.date.localeCompare(b.date));
    html += '<div class="card pad"><h3>Work not turned in</h3>' +
      '<p class="small" style="margin-top:6px">' + ms.total + ' time' + (ms.total === 1 ? "" : "s") + ' this year' +
      (ms.open ? ', <strong style="color:var(--s1)">' + ms.open + " still outstanding" + "</strong>" : ", all since handed in") + ".</p>" +
      (items.length ? '<ul class="small" style="margin:6px 0 0;padding-left:18px">' +
        items.map(m => "<li>" + esc(assignmentLabel(m.std, m.date, m.ctx)) + "</li>").join("") + "</ul>" : "") +
      "</div>";
  }

  const orf = S.orf.filter(r => r.sid === st.id && !r.gone).sort((a, b) => a.date.localeCompare(b.date));
  if (orf.length) {
    const l = orf[orf.length - 1], se = seasonOf(l.date), t = normAt(50, se);
    html += '<div class="card pad"><h3>Oral reading fluency</h3>' +
      '<p class="small" style="margin-top:6px">Latest: <strong class="num">' + l.wcpm + ' WCPM</strong> on ' + esc(l.date) +
      ' \u2014 ' + SEASON_NAME[se] + ' 50th percentile is ' + t + ', so ' +
      (l.wcpm >= t ? "at or above benchmark" : "<span style=\"color:var(--s1)\">" + (t - l.wcpm) + " words below benchmark</span>") + '.</p>' +
      '<table style="margin-top:8px"><thead><tr><th>Date</th><th class="c">WCPM</th><th class="c">Accuracy</th><th>Season</th><th class="c">Mark</th></tr></thead><tbody>' +
      orf.map(r => { const s2 = seasonOf(r.date); return "<tr><td>" + esc(r.date) + '</td><td class="c num">' + r.wcpm +
        '</td><td class="c num">' + (r.accuracy ? r.accuracy + "%" : "\u2013") + "</td><td>" + SEASON_NAME[s2] +
        '</td><td class="c">' + markHTML(wcpmToMark(r.wcpm, s2)) + "</td></tr>"; }).join("") +
      "</tbody></table></div>";
  }

  html += studentReadingHTML(st);

  const ir = S.iready.filter(r => r.sid === st.id).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  if (ir.length) {
    html += '<div class="card pad"><h3>iReady</h3><table style="margin-top:8px"><thead><tr><th>Subject</th><th>Date</th><th class="c">Scale</th><th>Placement</th><th class="c">%ile</th><th>Domains below grade level</th></tr></thead><tbody>' +
      ir.map(r => {
        const low = Object.keys(r.domains || {}).filter(k => {
          const rk = placementRank((r.domains[k] || {}).p); return rk != null && rk < 0;
        }).map(k => k + " (" + placementRank(r.domains[k].p) + ")");
        return "<tr><td>" + esc(r.subject) + "</td><td>" + esc(r.date || "") + '</td><td class="c num">' + esc(r.overall || "") +
          "</td><td>" + esc(r.placement || "") + '</td><td class="c num">' + esc(r.percentile || "") + "</td><td>" +
          (low.length ? '<span style="color:var(--s1)">' + esc(low.join(", ")) + "</span>" : '<span class="muted">none</span>') + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  (UI.subject === "All" ? ["Math", "ELA"] : [UI.subject]).forEach(subj => {
    const codes = activeCodes(subj).filter(c => scoresFor(st.id, c).length);
    if (!codes.length) return;
    html += '<div class="card pad"><h3>' + subj + "</h3>";
    let lastDom = "";
    codes.forEach(c => {
      const a = scoresFor(st.id, c);
      if (byCode[c].d !== lastDom) { lastDom = byCode[c].d; html += '<div class="tiny muted" style="margin:10px 0 2px;font-weight:640">' + esc(lastDom) + "</div>"; }
      html += '<div class="stdrow"><span class="lbl">' + codeHTML(c) + " " + esc(byCode[c].lbl) + "</span>" +
        '<span class="spark">' + a.slice(-6).map(x => '<i style="height:' + (x.v * 5 + 4) + "px;background:var(--s" + x.v + ')" title="' + x.date + ": " + x.v + '"></i>').join("") + "</span>" +
        markHTML(a[a.length - 1].v) + "</div>";
    });
    html += "</div>";
  });

  const notes = S.scores.filter(x => x.sid === st.id && x.note);
  if (notes.length) {
    html += '<div class="card pad"><h3>Notes</h3><table style="margin-top:8px"><tbody>' +
      notes.slice(-25).reverse().map(n => "<tr><td style=\"width:90px\" class=\"tiny muted\">" + esc(n.date) + "</td><td class=\"tiny\">" + codeHTML(n.std) + "</td><td>" + esc(n.note) + "</td></tr>").join("") + "</tbody></table></div>";
  }
  html += "</div>";
  el.innerHTML = html;
  document.getElementById("st-sel").onchange = e => { UI.studentSel = e.target.value; renderStudents(); };
  el.querySelectorAll("[data-st-step]").forEach(b => b.onclick = () => {
    if (!b.dataset.stStep) return;
    UI.studentSel = b.dataset.stStep; renderStudents();
    const again = [...el.querySelectorAll("[data-st-step]")].find(x => x.textContent === b.textContent && !x.disabled);
    if (again) again.focus();
  });
  const ts = document.getElementById("sa-term");
  if (ts) ts.onchange = e => { UI.studentTerm = e.target.value; renderStudents(); };
  const un = document.getElementById("sa-unmarked");
  if (un) un.onchange = e => { UI.studentUnmarked = e.target.checked; renderStudents(); };
  el.querySelectorAll(".asgrow .scale button").forEach(b => {
    b.onclick = () => gradeFor(b.dataset.sid, b.dataset.std, b.dataset.date, b.dataset.ctx, Number(b.dataset.v));
  });
}

/* ---- a student's assignments, and their reading in detail ----
   Every assignment the class has (as Enter scores lists them: a standard on
   a date, with what it was), this child's mark on each, and 1-4 to mark it
   here. A mark is written exactly as Enter scores writes one (matched on
   student, standard and date), so it clears the chase list the same way. */
function studentTermNow() {
  const today = todayISO();
  const t = S.terms.find(x => today >= x.start && today <= x.end);
  return t ? t.id : (S.terms.length ? S.terms[S.terms.length - 1].id : "");
}
function studentAssignmentsHTML(st) {
  const tid = UI.studentTerm || studentTermNow();
  const term = tid === "all" ? null : S.terms.find(t => t.id === tid);
  /* one row per standard and date: that is what a mark is matched on, and a
     not-turned-in entry with no "what it was" would otherwise list the same
     piece of work twice. The described one gives the row its name. */
  const seen = {};
  let list = [];
  visibleAssignments().filter(a => !term || (a.date >= term.start && a.date <= term.end)).forEach(a => {
    const k = a.std + "|" + a.date;
    if (!seen[k]) { seen[k] = Object.assign({}, a); list.push(seen[k]); }
    else if (!seen[k].ctx && a.ctx) seen[k].ctx = a.ctx;
  });
  list.sort((a, b) => b.date.localeCompare(a.date) || a.std.localeCompare(b.std));
  const markOf = a => S.scores.find(x => x.sid === st.id && x.std === a.std && x.date === a.date && !x.source && sameCtx(x, a.ctx || "")) || null;
  const marked = list.filter(a => markOf(a)).length;
  const missing = list.filter(a => missingFor(st.id, a.std, a.date, a.ctx || "")).length;
  const total = list.length;   /* before "only ones without a mark" narrows it */
  if (UI.studentUnmarked) list = list.filter(a => !markOf(a));
  let h = '<div class="card pad"><div class="sectionhead"><h3>Assignments</h3><span class="spacer"></span>' +
    '<label class="fld" style="margin:0">Term<select id="sa-term">' +
    S.terms.map(t => '<option value="' + t.id + '"' + (t.id === tid ? " selected" : "") + ">" + esc(t.name) + "</option>").join("") +
    '<option value="all"' + (tid === "all" ? " selected" : "") + ">The whole year</option></select></label></div>" +
    '<div class="row small" style="margin-top:4px;gap:14px"><span class="muted">' +
    marked + " of " + total + " marked" +
    (missing ? ' \u00b7 <strong style="color:var(--s1)">' + missing + " not turned in</strong>" : "") + "</span>" +
    '<label class="row" style="gap:6px"><input type="checkbox" id="sa-unmarked"' + (UI.studentUnmarked ? " checked" : "") + "> Only ones without a mark</label></div>";
  if (!list.length) {
    h += '<p class="hint" style="margin-top:8px">' + (UI.studentUnmarked ? "Every assignment here has a mark." :
      "No " + esc(subjLabel()) + " assignments " + (term ? "in " + esc(term.name) : "yet") + ". They appear as you mark them in Enter marks.") + "</p></div>";
    return h;
  }
  h += '<div style="margin-top:6px">' + list.map(a => {
    const m = markOf(a), miss = missingFor(st.id, a.std, a.date, a.ctx || "");
    const d = new Date(a.date + "T12:00:00");
    const when = isNaN(d) ? a.date : d.getDate() + " " + ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
    return '<div class="asgrow"><div class="what"><span class="when">' + esc(when) + "</span>" + codeHTML(a.std) + " " + esc(a.label) +
      (a.ctx ? ' <span class="muted">\u00b7 ' + esc(a.ctx) + "</span>" : "") +
      (miss ? ' <span class="pill" style="background:var(--s1-bg);color:var(--s1)">not turned in</span>' : "") + "</div>" +
      '<span class="scale">' + [1, 2, 3, 4].map(v => '<button data-v="' + v + '" data-sid="' + esc(st.id) + '" data-std="' + esc(a.std) + '" data-date="' + esc(a.date) +
        '" data-ctx="' + esc(a.ctx || "") + '" aria-pressed="' + (m && m.v === v ? "true" : "false") + '" title="Mark ' + v + (m && m.v === v ? " (tap again to clear)" : "") + '">' + v + "</button>").join("") + "</span></div>";
  }).join("") + "</div></div>";
  return h;
}
function gradeFor(sid, std, date, ctx, v) {
  const i = S.scores.findIndex(x => x.sid === sid && x.std === std && x.date === date && !x.source && sameCtx(x, ctx || ""));
  if (i >= 0 && S.scores[i].v === v) S.scores.splice(i, 1);
  else if (i >= 0) S.scores[i].v = v;
  else S.scores.push({ id: uid(), sid: sid, std: std, v: v, date: date, note: "", ctx: ctx || "" });
  clearMissingOnScore(sid, std, date, ctx || "");
  save(); renderStudents();
}
/* Each ORF check in detail, read live from the ORF tool's own records (the
   gradebook's S.orf copies keep only what marks need): the passage, WCPM,
   accuracy, the words missed and self-corrected, what the child said on
   missed words (v90 notes), and the patterns across all their checks, from
   suite-orf.js, the code the ORF page and tab use. */
function studentReadingHTML(st) {
  let db = null;
  try { db = JSON.parse(localStorage.getItem("running-records-v1") || "null"); } catch (e) { db = null; }
  if (!db || !Array.isArray(db.students) || !Array.isArray(db.records)) return "";
  const mine = new Set(db.students.filter(o => o && o.id && !o.demo && (orfStudentToLocal(o.id, db) || {}).id === st.id).map(o => o.id));
  const recs = db.records.filter(r => mine.has(r.studentId)).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (!recs.length) return "";
  const notesAll = window.SuiteOrf && window.SuiteOrf.notes ? orfNotesState() : { records: {} };
  const NT = window.SuiteOrf && window.SuiteOrf.notes;
  let h = '<div class="card pad"><h3>Reading checks, word by word</h3>' +
    '<p class="hint" style="margin-top:4px">From the ORF tool: each check\u2019s missed words in red, self-corrections in green.</p>';
  recs.forEach(r => {
    const nt = notesAll.records[r.id];
    const day = String(r.date || "").slice(0, 10);
    h += '<div class="asgrow" style="display:block"><div><strong class="num">' + esc(day) + "</strong>" +
      (r.passageTitle ? ' <span class="muted">' + esc(r.passageTitle) + "</span>" : "") +
      ' \u00b7 <span class="num">' + esc(r.wcpm) + " WCPM</span>" +
      (r.accuracy != null ? ' \u00b7 <span class="num">' + esc(r.accuracy) + "%</span>" : "") +
      ' \u00b7 <span class="num">' + esc(r.errors || 0) + " error" + (r.errors === 1 ? "" : "s") + "</span>" +
      (r.sc ? ' \u00b7 <span class="num">' + esc(r.sc) + " self-corrected</span>" : "") + "</div>";
    const missed = (r.missed || []).map(w => "<span>" + esc(w) + "</span>").join("");
    const sc = (r.selfCorr || []).map(w => '<span class="sc">' + esc(w) + "</span>").join("");
    if (missed || sc) h += '<div class="orfmiss">' + missed + sc + "</div>";
    else h += '<div class="tiny muted" style="margin-top:2px">No words missed.</div>';
    if (nt && nt.notes && nt.notes.length && NT) h += '<div class="small" style="margin-top:4px"><span class="muted">What they said:</span> ' + nt.notes.map(x => esc(NT.text(x))).join(" \u00b7 ") + "</div>";
    h += "</div>";
  });
  if (window.SuiteOrf && window.SuiteOrf.miscues) {
    const pat = window.SuiteOrf.miscues.patterns(recs);
    if (pat.total) {
      h += '<div class="divider"></div><h3 class="small" style="margin-top:8px">Across all ' + recs.length + " check" + (recs.length === 1 ? "" : "s") + "</h3>" +
        '<p class="small" style="margin-top:4px"><span class="muted">Missed most:</span> ' + pat.words.slice(0, 10).map(w => esc(w.display) + (w.count > 1 ? " \u00d7" + w.count : "")).join(", ") + "</p>" +
        (pat.features.length ? '<p class="small" style="margin-top:4px"><span class="muted">Patterns:</span> ' + pat.features.map(f => esc(f.feature) + " (" + f.n + ")").join(", ") + "</p>" : "");
    }
  }
  return h + "</div>";
}

/* ============================================================
   TAB 4 — iREADY IMPORT
   ============================================================ */
function parseDelimited(text) {
  const firstLine = text.split(/\r?\n/)[0] || "";
  const delim = (firstLine.split("\t").length > firstLine.split(",").length) ? "\t" : ",";
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cur); cur = ""; }
    else if (ch === "\n") { row.push(cur); cur = ""; rows.push(row); row = []; }
    else if (ch === "\r") { }
    else cur += ch;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ""));
}
function normName(s) { return String(s || "").toLowerCase().replace(/[^a-z]/g, ""); }
/* "ELD Maria Lopez" in the running-records tool is Maria Lopez with a tag
   typed in front, not a child whose first name is "ELD Maria". Left in, the
   tag defeated every match below and the child never linked. The tag is
   recognised only as a whole word at the start or end of a name (or of
   either half of "Last, First"): bare "ELD" in capitals, or "(ELD)" /
   "[ELD]" in any case — so Eldon, Elder and a surname Eld are left alone.
   fluency-extras.js carries the same rule for the tool's own roster. */
/* The rule itself is in suite-orf.js, shared with the running-records
   additions and Small Groups. Without that file a name is taken as typed. */
function stripEldTag(s) {
  if (window.SuiteOrf) return window.SuiteOrf.stripEld(s);
  return { name: String(s == null ? "" : s).trim(), eld: false };
}
function matchStudent(first, last, sid) {
  if (sid) { const m = S.students.find(s => s.sid && s.sid.trim() === String(sid).trim()); if (m) return m; }
  const f = normName(stripEldTag(first).name), l = normName(stripEldTag(last).name);
  let m = S.students.find(s => normName(s.first) === f && normName(s.last) === l);
  if (m) return m;
  /* a name the child goes by ("Theo" for Theodore, set under Setup →
     Roster → Also called), or "Theo R." when only one child fits */
  if (window.SuiteNames) {
    m = window.SuiteNames.match(S.students, stripEldTag(first).name, stripEldTag(last).name);
    if (m) return m;
  }
  /* same surname, first name starting the same way ("Theodore" for "Theo"):
     only when exactly one child fits, and never on an empty first name.
     Before v82 this took the first of several, so "Sam Lee" became
     whichever of Samuel and Samantha Lee came first on the roster. */
  if (!f) return null;
  const near = S.students.filter(s => normName(s.last) === l && normName(s.first).startsWith(f.slice(0, 3)));
  return near.length === 1 ? near[0] : null;
}
/* ---------- column and value helpers ---------- */
function normHdr(x) { return String(x == null ? "" : x).toLowerCase().replace(/\s+/g, " ").trim(); }
function pickCol(h, patterns, avoid) {
  for (const re of patterns) {
    for (let i = 0; i < h.length; i++) {
      const s = normHdr(h[i]);
      if (!s) continue;
      if (avoid && avoid.test(s)) continue;
      if (re.test(s)) return i;
    }
  }
  return -1;
}
function findHeaderRow(rows) {
  let best = 0, bestScore = -1;
  const lim = Math.min(rows.length, 20);
  for (let i = 0; i < lim; i++) {
    const cells = rows[i].map(normHdr);
    const joined = cells.join("|");
    let sc = cells.filter(c => c !== "").length;
    if (/last name|first name|student name|^student$/.test(joined)) sc += 25;
    if (/placement|scale score|subject|percentile|completion date/.test(joined)) sc += 25;
    if (sc > bestScore) { bestScore = sc; best = i; }
  }
  return best;
}
function toISO(v) {
  if (v == null) return "";
  const s = String(v).trim();
  if (!s) return "";
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) {
    const p = localDayOf(s).split("-");
    return p[0] + "-" + String(Number(p[1])).padStart(2, "0") + "-" + String(Number(p[2])).padStart(2, "0");
  }
  let m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  if (m) {
    let yr = Number(m[3]); if (yr < 100) yr += 2000;
    return yr + "-" + String(Number(m[1])).padStart(2, "0") + "-" + String(Number(m[2])).padStart(2, "0");
  }
  if (/^\d{5}$/.test(s)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Number(s) * 864e5);
    return isNaN(d) ? "" : d.toISOString().slice(0, 10);
  }
  const d = new Date(s);
  return isNaN(d) ? "" : d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
/* iReady writes placements two ways: relative ("1 Grade Level Below") and
   absolute ("Grade 1", "Late K", "Emerging K"). Both need to become a number. */
function placementRank(p) {
  if (p == null) return null;
  const s = normHdr(p);
  if (!s) return null;
  const grade = Number(S.settings.studentGrade || 2);
  if (/tested out|max(imum)? scale/.test(s)) return 1;
  if (/emerging\s*k/.test(s)) return -(grade + 2);
  let m = s.match(/(\d+)\s*(?:or more\s*)?grade levels?\s*below/);
  if (m) return -Number(m[1]);
  if (/three or more grade levels?\s*below/.test(s)) return -3;
  if (/two grade levels?\s*below/.test(s)) return -2;
  if (/one grade level\s*below/.test(s)) return -1;
  if (/above grade level/.test(s)) return 1;
  if (/on grade level|at grade level|on level/.test(s)) return 0;
  m = s.match(/grade\s*(k|\d+)/) || s.match(/^(?:early|mid|late)\s+(k|\d+)$/);
  if (m) return (m[1] === "k" ? 0 : Number(m[1])) - grade;
  return null;
}
function detectDomains(h) {
  const out = [];
  h.forEach((c, i) => {
    const s = normHdr(c);
    const m = s.match(/^(.*?)[: ]*placement$/);
    if (!m) return;
    const name = m[1].replace(/[:]+$/, "").trim();
    if (!name || name === "overall" || /relative/.test(s)) return;
    out.push({ name: String(c).replace(/\s*placement\s*$/i, "").replace(/[: ]+$/, "").trim(), place: i, scale: -1 });
  });
  out.forEach(d => {
    const want = normHdr(d.name + " scale score");
    h.forEach((c, i) => { if (normHdr(c) === want) d.scale = i; });
  });
  return out;
}
function inferSubject(h) {
  const j = h.map(normHdr).join(" ");
  const ela = /phonics|phonological|high[- ]frequency|vocabulary|comprehension|lexile/.test(j);
  const math = /number and operations|algebra and algebraic|measurement and data|geometry|quantile/.test(j);
  if (ela && !math) return "ELA";
  if (math && !ela) return "Math";
  return "";
}
function normSubject(raw, h) {
  const s = normHdr(raw);
  if (/read|ela|literacy/.test(s)) return "ELA";
  if (/math/.test(s)) return "Math";
  return inferSubject(h || []);
}

/* the iReady tab's contents, drawn in Setup with the other ways data
   comes in. Its own box, redrawn on its own. iReady results show up where
   they are used: Students, Math goal and Skill groups. */
function renderIReady() {
  const el = document.getElementById("setup-iready");
  if (!el) return;
  let html = "";
  html += '<div class="card pad"><h2>Bring in iReady diagnostic results</h2>' +
    '<p class="hint" style="margin-top:6px">Export a diagnostic results report from iReady, then choose the file or paste it below. Save it as CSV, or open the Excel file and copy the whole sheet. Title rows above the column headings are fine \u2014 they get skipped.</p>' +
    '<div class="row" style="margin-top:10px"><input type="file" id="ir-file" accept=".csv,.tsv,.txt">' +
    '<label class="fld">This class is grade<input type="number" id="ir-grade" min="0" max="12" value="' + (S.settings.studentGrade || 2) + '" style="width:64px"></label></div>' +
    '<textarea id="ir-paste" rows="5" style="width:100%;margin-top:10px;font-family:ui-monospace,monospace;font-size:12px" placeholder="Paste the sheet here"></textarea>' +
    '<div class="row" style="margin-top:10px"><button class="btn primary" onclick="ireadyRead()">Read this file</button></div></div>';

  if (UI.ireadyRows) {
    const h = UI.ireadyHead, m = UI.ireadyMap, data = UI.ireadyRows;
    const opts = i => '<option value="-1">\u2014 none \u2014</option>' +
      h.map((c, k) => '<option value="' + k + '"' + (k === i ? " selected" : "") + ">" + esc(c || "column " + (k + 1)) + "</option>").join("");
    html += '<div class="card pad"><div class="sectionhead"><h3>What was found</h3><span class="spacer"></span>' +
      '<span class="hint">header on row ' + (UI.ireadyHeadRow + 1) + " \u00b7 " + data.length + " data rows</span></div>";

    html += '<div class="row">' +
      '<label class="fld">Last name<select data-map="last">' + opts(m.last) + "</select></label>" +
      '<label class="fld">First name<select data-map="first">' + opts(m.first) + "</select></label>" +
      '<label class="fld">Student ID<select data-map="sid">' + opts(m.sid) + "</select></label>" +
      '<label class="fld">Subject<select data-map="subject">' + opts(m.subject) + "</select></label>" +
      '<label class="fld">Date<select data-map="date">' + opts(m.date) + "</select></label>" +
      '<label class="fld">Overall scale<select data-map="overall">' + opts(m.overall) + "</select></label>" +
      '<label class="fld">Overall placement<select data-map="placement">' + opts(m.placement) + "</select></label>" +
      '<label class="fld">Percentile<select data-map="percentile">' + opts(m.percentile) + "</select></label>" +
      "</div>";

    html += '<div class="hint" style="margin-top:10px">' +
      (m.domains.length
        ? "Domains: " + m.domains.map(d => '<code class="std">' + esc(d.name) + (d.scale >= 0 ? " +score" : "") + "</code>").join(" ")
        : '<span style="color:var(--warn)">No domain placement columns found. This report may be a summary rather than a diagnostic results export.</span>') + "</div>";
    if (m.subject < 0) {
      const g = inferSubject(h);
      html += '<div class="hint" style="color:var(--warn)">No Subject column. ' +
        (g ? "The domain names look like " + g + ", so every row will be filed under " + g + "." : "Reading and math columns both appear, so rows cannot be filed reliably \u2014 export the subjects separately.") + "</div>";
    }
    if (m.recentOnly >= 0) {
      html += '<label class="row small" style="gap:6px;margin-top:8px"><input type="checkbox" id="ir-recent"' + (UI.ireadyRecentOnly ? " checked" : "") +
        "> Only import rows flagged as the most recent diagnostic</label>";
    }

    const rows = ireadyRowsToUse();
    let unmatched = 0;
    rows.forEach(r => { if (!ireadyStudent(r)) unmatched++; });
    const prev = rows.slice(0, 8).map(r => {
      const st = ireadyStudent(r);
      const d = toISO(m.date >= 0 ? r[m.date] : "");
      const pl = m.placement >= 0 ? r[m.placement] : "";
      const rk = placementRank(pl);
      return "<tr><td>" + esc([m.last >= 0 ? r[m.last] : "", m.first >= 0 ? r[m.first] : ""].filter(Boolean).join(", ")) + "</td><td>" +
        (st ? esc(fullName(st)) : '<span style="color:var(--s1)">no match</span>') + "</td><td>" +
        esc(normSubject(m.subject >= 0 ? r[m.subject] : "", h) || "?") + "</td><td>" + (d || '<span style="color:var(--s1)">unreadable</span>') +
        '</td><td class="c num">' + esc(m.overall >= 0 ? r[m.overall] : "") + "</td><td>" + esc(pl) +
        '</td><td class="c num">' + (rk == null ? '<span class="muted">?</span>' : (rk > 0 ? "+" : "") + rk) + "</td></tr>";
    }).join("");
    html += '<table style="margin-top:12px"><thead><tr><th>In the file</th><th>Matched to</th><th>Subject</th><th>Date</th><th class="c">Scale</th><th>Placement</th><th class="c">Levels</th></tr></thead><tbody>' + prev + "</tbody></table>";
    if (unmatched) html += '<p class="hint" style="color:var(--warn);margin-top:8px">' + unmatched + " of " + rows.length + " rows have no matching student on your roster. Check the name columns above, or add student IDs in Setup so matching does not depend on spelling.</p>";
    html += '<div class="row" style="margin-top:12px"><button class="btn primary" onclick="ireadyImport()">Import ' + (rows.length - unmatched) + " rows</button>" +
      '<button class="btn" onclick="UI.ireadyRows=null;renderIReady()">Cancel</button></div></div>';
  }

  html += ireadyMappingCardHTML();

  if (S.iready.length) {
    html += '<div class="card pad"><div class="sectionhead"><h3>Imported records</h3><span class="spacer"></span>' +
      '<button class="btn sm danger" onclick="if(confirm(\'Remove all imported iReady records?\')){S.iready=[];syncIreadyScores();renderIReady()}">Clear all</button></div>' +
      '<div class="scroll"><table><thead><tr><th>Student</th><th>Subject</th><th>Date</th><th class="c">Scale</th><th>Placement</th><th class="c">%ile</th><th>Domains</th><th></th></tr></thead><tbody>' +
      S.iready.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).map(r => {
        const st = S.students.find(s => s.id === r.sid);
        const dl = Object.keys(r.domains || {}).map(k => {
          const d = r.domains[k], rk = placementRank(d && d.p);
          const col = rk == null ? "var(--ink-3)" : rk < 0 ? "var(--s1)" : rk > 0 ? "var(--s4)" : "var(--s3)";
          return '<span class="chip tiny" style="border-color:' + col + ';color:' + col + '">' + esc(k) + (rk == null ? "" : " " + (rk > 0 ? "+" : "") + rk) + "</span>";
        }).join(" ");
        return "<tr><td>" + esc(st ? fullName(st) : "?") + "</td><td>" + esc(r.subject) + "</td><td>" + esc(r.date || "") +
          '</td><td class="c num">' + esc(r.overall || "") + "</td><td>" + esc(r.placement || "") +
          '</td><td class="c num">' + esc(r.percentile || "") + "</td><td>" + dl +
          '</td><td class="c"><button class="btn sm ghost" onclick="S.iready=S.iready.filter(x=>x.id!==\'' + r.id + "');syncIreadyScores();renderIReady()\">Remove</button></td></tr>";
      }).join("") + "</tbody></table></div></div>";
  }
  el.innerHTML = html;

  document.getElementById("ir-file").onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { document.getElementById("ir-paste").value = rd.result; ireadyRead(); };
    rd.readAsText(f);
  };
  document.getElementById("ir-grade").onchange = e => { S.settings.studentGrade = Number(e.target.value) || 2; save(); renderIReady(); };
  el.querySelectorAll("select[data-map]").forEach(sel => {
    sel.onchange = () => { UI.ireadyMap[sel.dataset.map] = Number(sel.value); renderIReady(); };
  });
  const rc = document.getElementById("ir-recent");
  if (rc) rc.onchange = () => { UI.ireadyRecentOnly = rc.checked; renderIReady(); };
  wireIreadyMapping(el);
}

function ireadyStudent(r) {
  const m = UI.ireadyMap;
  const sid = m.sid >= 0 ? r[m.sid] : "";
  if (m.last >= 0 || m.first >= 0) {
    return matchStudent(m.first >= 0 ? r[m.first] : "", m.last >= 0 ? r[m.last] : "", sid);
  }
  if (m.name >= 0) {
    const p = splitOrfName(r[m.name]);
    return matchStudent(p.first, p.last, sid) || matchStudent(p.last, p.first, sid);
  }
  return sid ? matchStudent("", "", sid) : null;
}
function ireadyRowsToUse() {
  const m = UI.ireadyMap;
  if (UI.ireadyRecentOnly && m.recentOnly >= 0) {
    return UI.ireadyRows.filter(r => /^(y|yes|true|1)$/i.test(String(r[m.recentOnly]).trim()));
  }
  return UI.ireadyRows;
}
function ireadyRead() {
  const txt = document.getElementById("ir-paste").value.trim();
  if (!txt) { toast("Paste the report or choose a file first"); return; }
  const rows = parseDelimited(txt);
  if (rows.length < 2) { toast("Could not find a header row plus data"); return; }
  const hr = findHeaderRow(rows);
  const h = rows[hr].map(x => String(x == null ? "" : x).trim());
  const width = h.filter(Boolean).length;
  const data = rows.slice(hr + 1).filter(r => r.filter(c => String(c).trim() !== "").length >= Math.min(3, width));
  if (!data.length) { toast("Found headings but no data rows under them"); return; }

  UI.ireadyHead = h;
  UI.ireadyHeadRow = hr;
  UI.ireadyRows = data;
  UI.ireadyRecentOnly = false;
  UI.ireadyMap = {
    last: pickCol(h, [/^(student )?last name$/, /last name/]),
    first: pickCol(h, [/^(student )?first name$/, /first name/]),
    name: pickCol(h, [/^student name$/, /^student$/, /full name/]),
    sid: pickCol(h, [/^student id$/, /student id/, /sis id|state id|local id/]),
    subject: pickCol(h, [/^subject$/, /^content area$/]),
    date: pickCol(h, [/^completion date$/, /completion date/, /date completed|test date|assessment date/, /^date$/], /window|enroll|birth|start date|end date/),
    overall: pickCol(h, [/^overall scale score$/, /^scale score$/, /overall scale score/], /comprehension|domain|mid on grade|typical|stretch|growth/),
    placement: pickCol(h, [/^overall placement$/, /overall placement/], /relative|comprehension|domain/),
    percentile: pickCol(h, [/^percentile$/, /national percentile|percentile rank/], /growth/),
    recentOnly: pickCol(h, [/most recent diagnostic/]),
    domains: detectDomains(h)
  };
  if (UI.ireadyMap.recentOnly >= 0) UI.ireadyRecentOnly = true;
  renderIReady();
}
function ireadyImport() {
  const m = UI.ireadyMap, h = UI.ireadyHead;
  let added = 0, missed = 0, dupes = 0, nodate = 0;
  ireadyRowsToUse().forEach(r => {
    const st = ireadyStudent(r);
    if (!st) { missed++; return; }
    const subj = normSubject(m.subject >= 0 ? r[m.subject] : "", h) || "Math";
    const date = toISO(m.date >= 0 ? r[m.date] : "");
    if (!date) nodate++;
    if (S.iready.some(x => x.sid === st.id && x.subject === subj && x.date === date)) { dupes++; return; }
    const dom = {};
    m.domains.forEach(d => {
      const p = r[d.place], sc = d.scale >= 0 ? r[d.scale] : "";
      if (p != null && String(p).trim() !== "") dom[d.name] = { p: String(p).trim(), s: sc == null ? "" : String(sc).trim() };
    });
    S.iready.push({
      id: uid(), sid: st.id, subject: subj, date: date,
      overall: m.overall >= 0 ? String(r[m.overall] || "").trim() : "",
      placement: m.placement >= 0 ? String(r[m.placement] || "").trim() : "",
      percentile: m.percentile >= 0 ? String(r[m.percentile] || "").trim() : "",
      domains: dom
    });
    added++;
  });
  syncIreadyScores();
  save(); UI.ireadyRows = null; renderIReady();
  toast("Imported " + added +
    (dupes ? " \u00b7 " + dupes + " already here" : "") +
    (missed ? " \u00b7 " + missed + " unmatched" : "") +
    (nodate ? " \u00b7 " + nodate + " with no readable date" : ""));
}

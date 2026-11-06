/* gradebook/gb-assign.js — Grading several standards at once, and moving between assignments.
   One of the gradebook's scripts, loaded in order by index.html as classic
   scripts sharing one global scope; see HANDOFF "The gradebook's files". */
/* ============================================================
   GRADING SEVERAL STANDARDS AT ONCE
   An assessment that covers more than one standard (a Reveal unit test,
   a probe, a lesson with two standards, or anything named the same on the
   same day) used to be graded one standard at a time: pick it, go down the
   roster, pick the next, go down again. UI.enterMulti holds the standards
   being graded together; each student's row carries a 1-4 for each, and
   an "All" 1-4 that gives every one the same mark in one tap.

   Nothing new is stored. Each mark is still its own record under its own
   standard, date and "What was it?", so each standard is still its own
   assignment everywhere else: the stepper, the report card, groups.
   ============================================================ */
function multiCodes() {
  if (!UI.enterMulti) return null;
  const act = activeCodes(UI.subject);
  const codes = UI.enterMulti.filter((c, i, a) => byCode[c] && act.indexOf(c) >= 0 && a.indexOf(c) === i);
  if (codes.length < 2) { UI.enterMulti = null; if (codes[0]) UI.enterStd = codes[0]; return null; }
  UI.enterMulti = codes;
  if (codes.indexOf(UI.enterStd) < 0) UI.enterStd = codes[0];
  return codes;
}
/* start grading these together; name it the way a chip would, never
   beside unnamed marks, which would split an assignment in two */
function startMulti(codes, ctx) {
  UI.enterMulti = codes.slice();
  UI.lastAll = null;
  if (ctx && !UI.enterCtx && !codes.some(c => S.scores.some(x => x.std === c && x.date === UI.enterDate && !x.ctx && !x.source))) UI.enterCtx = ctx;
  if (codes.indexOf(UI.enterStd) < 0) UI.enterStd = codes[0];
  renderEnter();
}
function stopMulti() { UI.enterMulti = null; UI.lastAll = null; renderEnter(); }
function toggleMultiCode(c) {
  const codes = (UI.enterMulti || []).slice(), i = codes.indexOf(c);
  if (i >= 0) {
    if (codes.length <= 2) { toast("Grading together needs two standards. Choose One at a time to grade just one."); return; }
    codes.splice(i, 1);
  } else codes.push(c);
  UI.enterMulti = codes;
  renderEnter();
}
/* other standards already marked under this date and name: the rest of
   the same assessment, when it was graded one standard at a time */
function siblingCodes() {
  if (!UI.enterCtx || !UI.enterStd) return [];
  const act = activeCodes(UI.subject), out = [];
  S.scores.concat(S.missing).forEach(x => {
    if (x.source || x.excused || x.date !== UI.enterDate || (x.ctx || "") !== UI.enterCtx) return;
    if (x.std !== UI.enterStd && byCode[x.std] && act.indexOf(x.std) >= 0 && out.indexOf(x.std) < 0) out.push(x.std);
  });
  return out;
}
function multiButtonHTML(codes, ctx) {
  if (UI.enterMulti || codes.length < 2) return "";
  return '<button class="btn sm" data-multi="' + esc(codes.join(" ")) + '"' + (ctx ? ' data-pickctx="' + esc(ctx) + '"' : "") +
    ">Grade all " + codes.length + " together</button>";
}
function multiRosterHTML(codes) {
  const add = activeCodes(UI.subject).filter(c => codes.indexOf(c) < 0);
  let h = '<div class="card"><div class="pad" style="padding-bottom:8px"><div class="sectionhead" style="margin:0">' +
    "<h2>" + codes.length + " standards together</h2><span class=\"spacer\"></span>" +
    '<span class="hint" style="max-width:340px">Tap a number under each standard, or under All to give every standard the same mark. Tap it again to clear.</span>' +
    '<button class="btn brass" onclick="logRestAsMissingMulti()">Log the rest as not turned in</button>' +
    (UI.lastMissingBatch && UI.lastMissingBatch.length ? '<button class="btn sm" onclick="undoMissingBatch()">Undo those ' + UI.lastMissingBatch.length + "</button>" : "") +
    '<button class="btn sm ghost" data-multi-stop>One at a time</button></div>' +
    '<div class="mg-legend">' + codes.map(c => '<span class="mg-std">' + codeHTML(c) + " " + esc(byCode[c].lbl) +
      '<button class="mg-x" data-multi-drop="' + c + '" aria-label="Stop grading ' + esc(dispCode(c)) + ' here" title="Take this one out">\u00d7</button></span>').join("") +
      (add.length ? '<label class="mg-add">Add a standard<select id="e-multi-add"><option value="">Choose\u2026</option>' +
        add.map(c => '<option value="' + c + '">' + esc(dispCode(c) + " \u2014 " + byCode[c].lbl) + "</option>").join("") + "</select></label>" : "") +
    "</div></div>";
  h += '<div id="rosterlist" class="mg">';
  sortedStudents().forEach(st => {
    const recs = codes.map(c => S.scores.find(x => x.sid === st.id && x.std === c && x.date === UI.enterDate && !x.source && sameCtx(x, (UI.enterCtx || ""))) || null);
    const same = recs.every(r => r) && recs.every(r => r.v === recs[0].v) ? recs[0].v : 0;
    const miss = codes.every(c => hasScore(st.id, c, UI.enterDate, UI.enterCtx || "") || missingFor(st.id, c, UI.enterDate, UI.enterCtx || "")) && codes.some(c => missingFor(st.id, c, UI.enterDate, UI.enterCtx || ""));
    const note = (recs.find(r => r && r.note) || {}).note || "";
    h += '<div class="entryrow mgrow"' + (miss ? ' style="background:var(--s1-bg)"' : "") + ">" +
      '<div class="mg-who"><span class="nm">' + esc(fullName(st)) + (st.eld ? ' <span class="chip eld">ELD</span>' : "") + "</span>" +
      '<button class="btn sm' + (miss ? "" : " ghost") + '" data-miss-all="' + st.id + '" title="No work received from this student" style="' + (miss ? "border-color:var(--s1);color:var(--s1);font-weight:650;background:#fff" : "") + '">' + (miss ? "no work \u2713" : "no work") + "</button>" +
      '<input class="note" data-note-all="' + st.id + '" placeholder="note" value="' + esc(note) + '"></div>' +
      '<div class="mg-cells">' + codes.map((c, i) => {
        const prior = scoresFor(st.id, c).filter(x => x.date !== UI.enterDate), prev = prior.length ? prior[prior.length - 1] : null;
        /* what the standard is, not just its code, over its buttons,
           so a row far down the roster still says what is being marked */
        return '<div class="mg-cell"><span class="mg-lbl" title="' + esc(byCode[c].t || byCode[c].lbl) + '"><span class="mg-code">' + esc(dispCode(c)) + "</span>" +
          (prev ? ' <span class="mg-prev">was ' + prev.v + "</span>" : "") + '<span class="mg-what">' + esc(byCode[c].lbl) + "</span></span>" +
          '<span class="scale">' + [1, 2, 3, 4].map(v => '<button data-v="' + v + '" data-sid="' + st.id + '" data-std="' + c + '" aria-pressed="' + (recs[i] && recs[i].v === v ? "true" : "false") +
            '" title="' + esc(dispCode(c)) + ": mark " + v + '">' + v + "</button>").join("") + "</span></div>";
      }).join("") +
      '<div class="mg-cell mg-all"><span class="mg-lbl">All</span><span class="scale">' + [1, 2, 3, 4].map(v =>
        '<button data-v="' + v + '" data-all="' + st.id + '" aria-pressed="' + (same === v ? "true" : "false") + '" title="Every standard: mark ' + v + '">' + v + "</button>").join("") +
      "</span></div></div></div>";
  });
  return h + "</div></div>";
}
function wireMulti(el, codes) {
  el.querySelectorAll(".mg .scale button[data-std]").forEach(b => { b.onclick = () => setScore(b.dataset.sid, b.dataset.std, Number(b.dataset.v)); });
  el.querySelectorAll(".mg .scale button[data-all]").forEach(b => { b.onclick = () => setAllScores(b.dataset.all, codes, Number(b.dataset.v)); });
  el.querySelectorAll("[data-miss-all]").forEach(b => { b.onclick = () => toggleMissingAll(b.dataset.missAll, codes); });
  el.querySelectorAll("[data-multi-drop]").forEach(b => { b.onclick = () => toggleMultiCode(b.dataset.multiDrop); });
  const stop = el.querySelector("[data-multi-stop]"); if (stop) stop.onclick = stopMulti;
  const addSel = document.getElementById("e-multi-add");
  if (addSel) addSel.onchange = () => { if (addSel.value) toggleMultiCode(addSel.value); };
  el.querySelectorAll("input[data-note-all]").forEach(inp => {
    inp.onchange = () => {
      const recs = S.scores.filter(x => x.sid === inp.dataset.noteAll && x.date === UI.enterDate && codes.indexOf(x.std) >= 0 && !x.source && sameCtx(x, (UI.enterCtx || "")));
      if (!recs.length) { if (inp.value) toast("Give a mark first, then the note saves with it"); return; }
      recs.forEach(r => { r.note = inp.value; }); save();
    };
  });
}
/* one tap, every standard; tapping the mark they all already have clears
   them all. Undo last puts back exactly what was there before. */
function setAllScores(sid, codes, v) {
  const st = S.students.find(x => x.id === sid);
  const ctx = (UI.enterCtx || "");
  const cur = codes.map(c => S.scores.find(x => x.sid === sid && x.std === c && x.date === UI.enterDate && !x.source && sameCtx(x, ctx)) || null);
  const clear = cur.every(r => r && r.v === v);
  UI.lastAll = { before: codes.map((c, i) => ({ std: c, rec: cur[i] ? Object.assign({}, cur[i]) : null })), sid: sid, date: UI.enterDate, ctx: ctx,
    missing: S.missing.filter(m => m.sid === sid && m.date === UI.enterDate && codes.indexOf(m.std) >= 0 && sameCtx(m, ctx)).map(m => Object.assign({}, m)) };
  codes.forEach((c, i) => {
    if (clear) { S.scores = S.scores.filter(x => x !== cur[i]); return; }
    if (cur[i]) { cur[i].v = v; cur[i].ctx = UI.enterCtx || ""; }
    else S.scores.push({ id: uid(), sid: sid, std: c, v: v, date: UI.enterDate, note: "", ctx: UI.enterCtx || "" });
    clearMissingOnScore(sid, c, UI.enterDate, ctx);
  });
  UI.log.push(clear ? "Cleared " + fullName(st) + " \u2014 all " + codes.length : fullName(st) + " \u2014 all " + codes.length + " = " + v);
  save(); renderEnter();
}
function undoAll() {
  const u = UI.lastAll; UI.lastAll = null;
  u.before.forEach(b => {
    S.scores = S.scores.filter(x => !(x.sid === u.sid && x.std === b.std && x.date === u.date && !x.source && sameCtx(x, u.ctx)));
    if (b.rec) S.scores.push(b.rec);
  });
  /* a mark clears a student's "no work"; put those back as they were */
  S.missing.forEach(m => { const o = u.missing.find(x => x.id === m.id); if (o) Object.assign(m, o); });
  UI.log.push("Undid last entry"); save(); renderEnter();
}
function toggleMissingAll(sid, codes) {
  const date = UI.enterDate, ctx = (UI.enterCtx || "");
  const open = codes.map(c => missingFor(sid, c, date, ctx)).filter(Boolean);
  const unmarked = codes.filter(c => !hasScore(sid, c, date, ctx) && !missingFor(sid, c, date, ctx));
  if (open.length && !unmarked.length) { S.missing = S.missing.filter(m => open.indexOf(m) < 0); save(); renderEnter(); return; }
  if (codes.some(c => hasScore(sid, c, date, ctx))) { toast("That student already has marks for this one"); return; }
  unmarked.forEach(c => S.missing.push({ id: uid(), sid: sid, std: c, date: date, ctx: UI.enterCtx || "", received: null, excused: false }));
  save(); renderEnter();
}
/* everyone with no mark on any of these standards and nothing logged yet */
function logRestAsMissingMulti() {
  const codes = multiCodes(), date = UI.enterDate;
  if (!codes) return;
  const batch = [];
  sortedStudents().forEach(st => {
    if (codes.some(c => hasScore(st.id, c, date, UI.enterCtx || "") || missingFor(st.id, c, date, UI.enterCtx || ""))) return;
    codes.forEach(c => {
      const rec = { id: uid(), sid: st.id, std: c, date: date, ctx: UI.enterCtx || "", received: null, excused: false };
      S.missing.push(rec); batch.push(rec.id);
    });
  });
  UI.lastMissingBatch = batch;
  save(); renderEnter();
  const n = batch.length / codes.length;
  toast(batch.length ? "Logged " + n + (n === 1 ? " student" : " students") + " as not turned in" : "Everyone has a mark for this one");
}

/* part11 is now empty: the planner snapshot lives in suite-sync.js, which all
   three tools load, so the gradebook no longer carries planner data itself. */

/* ============================================================
   MOVING BETWEEN ASSIGNMENTS
   An assignment was never stored as a thing in its own right — it is just the
   set of marks that share a standard, a date and a context. That is enough to
   rebuild the list, so nothing has to be migrated and older data works.
   ============================================================ */
function assignmentsList() {
  const map = {};
  function slot(std, date, ctx) {
    const k = std + "|" + date + "|" + (ctx || "");
    return (map[k] = map[k] || { key: k, std: std, date: date, ctx: ctx || "", markedIds: {}, missingIds: {} });
  }
  /* marks derived from iReady or the ORF tool are not assignments you graded.
     counted per child on the roster, not per record, so a second mark
     for the same child, or a child who has left, no longer reads 27/26. */
  S.scores.forEach(x => { if (!x.source) slot(x.std, x.date, x.ctx).markedIds[x.sid] = 1; });
  S.missing.forEach(m => { if (!m.excused) slot(m.std, m.date, m.ctx).missingIds[m.sid] = 1; });
  const onRoster = {};
  S.students.forEach(st => { onRoster[st.id] = 1; });

  return Object.keys(map)
    .map(k => {
      const a = map[k];
      a.marked = Object.keys(a.markedIds).filter(id => onRoster[id]).length;
      a.missing = Object.keys(a.missingIds).filter(id => onRoster[id] && !a.markedIds[id]).length;
      delete a.markedIds; delete a.missingIds;
      a.subject = byCode[a.std] ? byCode[a.std].s : "";
      a.label = byCode[a.std] ? byCode[a.std].lbl : a.std;
      a.total = S.students.length;
      a.done = a.marked + a.missing;
      a.complete = a.total > 0 && a.done >= a.total;
      return a;
    })
    .filter(a => byCode[a.std])
    .sort((x, y) => y.date.localeCompare(x.date) || x.std.localeCompare(y.std));
}
function visibleAssignments() {
  return assignmentsList().filter(a => UI.subject === "All" || a.subject === UI.subject);
}
function currentKey() { return UI.enterStd + "|" + UI.enterDate + "|" + (UI.enterCtx || ""); }

/* the list the stepper walks: saved assignments, plus the one being started */
function stepList() {
  const list = visibleAssignments();
  if (!UI.enterStd) return list;
  const k = currentKey();
  if (list.some(a => a.key === k)) return list;
  const c = byCode[UI.enterStd];
  return [{
    key: k, std: UI.enterStd, date: UI.enterDate, ctx: UI.enterCtx || "",
    subject: c ? c.s : "", label: c ? c.lbl : UI.enterStd,
    marked: 0, missing: 0, total: S.students.length, done: 0, complete: false, fresh: true
  }].concat(list);
}
function gotoAssignment(a) {
  if (!a) return;
  if (a.subject && UI.subject !== "All" && UI.subject !== a.subject) {
    UI.subject = a.subject;
    S.settings.subject = a.subject;
    save();
    paintSubjSwitch();
  }
  UI.enterStd = a.std; UI.enterDate = a.date; UI.enterCtx = a.ctx || "";
  UI.enterMulti = null;
  UI.enterLesson = lessonFromCtx(UI.enterCtx);
  UI.enterUnit = null;
  UI.tab = "enter";
  renderEnter();
}
function stepAssignment(dir) {
  const list = stepList();
  if (!list.length) return;
  const k = currentKey();
  let i = list.findIndex(a => a.key === k);
  if (i < 0) i = 0;
  const next = list[i + dir];
  if (!next) { toast(dir > 0 ? "That is the oldest one" : "That is the newest one"); return; }
  gotoAssignment(next);
}
function jumpUnfinished() {
  const list = visibleAssignments().filter(a => !a.complete);
  if (!list.length) { toast("Every assignment has a mark for each student"); return; }
  const k = currentKey();
  const i = list.findIndex(a => a.key === k);
  gotoAssignment(list[(i + 1) % list.length]);
}
function newAssignment() {
  UI.enterMulti = null;
  UI.enterDate = todayISO();
  UI.enterCtx = "";
  UI.enterLesson = null;
  UI.enterUnit = null;
  renderEnter();
  const box = document.getElementById("e-ctx");
  if (box) box.focus();
  toast("New assignment on today\u2019s date \u2014 pick the standard and note what it was");
}
function assignmentLabelText(a) {
  const d = new Date(a.date + "T12:00:00");
  const when = isNaN(d) ? a.date
    : d.getDate() + " " + ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  return when + " \u00b7 " + dispCode(a.std) + " " + a.label +
    (a.ctx ? " \u00b7 " + a.ctx : "") +
    (a.fresh ? " \u00b7 nothing marked yet" : " \u00b7 " + a.done + "/" + a.total);
}

function assignmentBarHTML() {
  if (!S.students.length) return "";
  const list = stepList();
  const k = currentKey();
  let i = list.findIndex(a => a.key === k);
  if (i < 0) i = 0;
  const unfinished = visibleAssignments().filter(a => !a.complete).length;

  return '<div class="card pad asgbar">' +
    '<div class="row">' +
    '<button class="btn sm" data-step="-1" title="Newer assignment (Alt and left arrow)" aria-label="Newer assignment"' +
    (i <= 0 ? " disabled style=\"opacity:.4\"" : "") + ">\u2190</button>" +
    '<button class="btn sm" data-step="1" title="Older assignment (Alt and right arrow)" aria-label="Older assignment"' +
    (i >= list.length - 1 ? " disabled style=\"opacity:.4\"" : "") + ">\u2192</button>" +
    '<label class="sr-only" for="asg">Assignment</label>' +
    '<select id="asg" class="asgsel">' +
    list.map(a => '<option value="' + esc(a.key) + '"' + (a.key === k ? " selected" : "") + ">" +
      esc(assignmentLabelText(a)) + "</option>").join("") +
    "</select>" +
    '<span class="tiny muted num count">' + (i + 1) + " of " + list.length + "</span>" +
    '<span class="spacer"></span>' +
    (unfinished ? '<button class="btn sm" onclick="jumpUnfinished()">Next unfinished <span class="tiny muted">' + unfinished + "</span></button>" : "") +
    '<button class="btn sm primary" onclick="newAssignment()">New assignment</button>' +
    "</div></div>";
}
/* the saved assignments as a list (CHANGELOG v126). The dropdown
   hid them: Enter scores opens on today's date, so an assignment marked on
   Tuesday looked empty on Thursday until it was found in the menu. Here
   every saved assignment is on screen with how much of it is marked, the
   one open is highlighted, and today's unstarted one is drawn dashed and
   says "not started". Newest first, ten at a time. */
const ASG_LIST_SHOWN = 10;
function asgWhen(iso) {
  if (iso === todayISO()) return "Today";
  const d = new Date(iso + "T12:00:00");
  if (isNaN(d)) return iso;
  const y = new Date(todayISO() + "T12:00:00"); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()] + ", " + shortDate(iso);
}
/* "Recently graded", and shut until opened, so the roster has the
   width. Shut, a button above the cards opens it; it says when the open
   assignment has nothing marked yet, so earlier marks are still pointed to.
   Open or shut is this session's choice (UI.asgOpen), not synced. */
function asgToggleHTML() {
  if (!S.students.length || UI.asgOpen) return "";
  const list = stepList(), cur = list.find(a => a.key === currentKey());
  const saved = list.filter(a => !a.fresh).length, unfinished = visibleAssignments().filter(a => !a.complete).length;
  return '<div class="asgtoggle"><button class="btn sm" data-asg-open aria-expanded="false" aria-controls="asglist">' +
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg>' +
    "Recently graded" + (saved ? ' <span class="tiny muted">' + saved + "</span>" : "") + "</button>" +
    (cur && cur.fresh && saved ? '<span class="small muted">Nothing marked on this one yet. Earlier marks are in Recently graded.</span>' : "") +
    /* the bar is hidden at this width, so its two other buttons come along */
    '<span class="spacer" style="flex:1"></span>' +
    (unfinished ? '<button class="btn sm ghost" onclick="jumpUnfinished()">Next unfinished <span class="tiny muted">' + unfinished + "</span></button>" : "") +
    '<button class="btn sm primary" onclick="newAssignment()">New assignment</button></div>';
}
function asgListHTML() {
  if (!S.students.length || !UI.asgOpen) return "";
  const list = stepList(), k = currentKey();
  const saved = list.filter(a => !a.fresh).length;
  let shown = UI.asgAll ? list : list.slice(0, ASG_LIST_SHOWN);
  const cur = list.find(a => a.key === k);
  if (cur && shown.indexOf(cur) < 0) shown = shown.concat([cur]);
  const unfinished = visibleAssignments().filter(a => !a.complete).length;
  let h = '<nav class="card asglist" id="asglist" aria-label="Recently graded"><div class="al-head"><h2>Recently graded</h2>' +
    '<button class="btn sm primary" onclick="newAssignment()">New</button>' +
    '<button class="btn sm ghost al-close" data-asg-close aria-expanded="true" aria-controls="asglist" title="Hide the list">Hide</button></div><div class="al-items">';
  if (!shown.length) h += '<p class="small muted" style="padding:0 6px">Nothing marked yet.</p>';
  shown.forEach(a => {
    const pct = a.total ? Math.min(100, Math.round(a.done / a.total * 100)) : 0;
    const title = a.marked + " marked" + (a.missing ? ", " + a.missing + " not turned in" : "") + " of " + a.total;
    h += '<button class="al-item' + (a.fresh ? " al-fresh" : "") + '" data-asg="' + esc(a.key) + '"' +
      (a.key === k ? ' aria-current="true"' : "") + (a.fresh ? "" : ' title="' + esc(title) + '"') + ">" +
      '<span class="al-when"><span>' + esc(asgWhen(a.date)) + '</span><span class="al-n">' +
      (a.fresh ? "not started" : a.done + "/" + a.total) + "</span></span>" +
      '<span class="al-name">' + esc(a.ctx || a.label) + "</span>" +
      '<span class="al-code">' + esc(dispCode(a.std) + (a.ctx ? " " + a.label : "")) + "</span>" +
      (a.fresh ? "" : '<span class="al-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span>') +
      "</button>";
  });
  h += '</div><div class="al-foot">' +
    (saved > ASG_LIST_SHOWN ? '<button class="btn sm ghost" data-asg-all>' + (UI.asgAll ? "Show fewer" : "Show all " + saved) + "</button>" : "") +
    (unfinished ? '<button class="btn sm ghost" onclick="jumpUnfinished()">Next unfinished <span class="tiny muted">' + unfinished + "</span></button>" : "") +
    "</div></nav>";
  return h;
}
function wireAssignmentBar(el) {
  el.querySelectorAll("[data-asg]").forEach(b => {
    b.onclick = () => gotoAssignment(stepList().find(x => x.key === b.dataset.asg));
  });
  el.querySelectorAll("[data-asg-open]").forEach(b => {
    b.onclick = () => { UI.asgOpen = true; renderEnter(); const f = document.querySelector("#asglist .al-item[aria-current=true]") || document.querySelector("#asglist .al-close"); if (f) f.focus(); };
  });
  el.querySelectorAll("[data-asg-close]").forEach(b => {
    b.onclick = () => { UI.asgOpen = false; renderEnter(); const t = document.querySelector("[data-asg-open]"); if (t) t.focus(); };
  });
  el.querySelectorAll("[data-asg-all]").forEach(b => {
    b.onclick = () => { UI.asgAll = !UI.asgAll; renderEnter(); };
  });
  el.querySelectorAll("[data-step]").forEach(b => {
    b.onclick = () => stepAssignment(Number(b.dataset.step));
  });
  const sel = document.getElementById("asg");
  if (sel) sel.onchange = () => {
    const a = stepList().find(x => x.key === sel.value);
    gotoAssignment(a);
  };
}
/* Alt with the arrow keys steps through them without leaving the roster */
function initAssignmentKeys() {
  window.addEventListener("keydown", e => {
    if (UI.tab !== "enter" || !e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); stepAssignment(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); stepAssignment(1); }
  });
}

/* Sub plans moved to the planner, where they belong: see sub-plans.js.
   The standing notes moved with them, from this app's state to the key
   suite:subplan:v1, which sub-plans.js migrates on first run. */

/* gradebook/gb-enter.js — Enter marks, Groups & patterns, and skill groups.
   One of the gradebook's scripts, loaded in order by index.html as classic
   scripts sharing one global scope; see HANDOFF "The gradebook's files". */
/* ============================================================
   TAB 1 — ENTER SCORES
   ============================================================ */
function renderEnter() {
  const el = document.getElementById("panel-enter");
  if (!S.students.length) return noStudents(el);

  const codes = activeCodes(UI.subject);
  if (!codes.includes(UI.enterStd)) UI.enterStd = codes[0] || "";
  if (UI.enterFollow && lessonRowShown()) { UI.enterFollow = false; followDayLesson(); }
  const domains = [];
  codes.forEach(c => { const d = byCode[c].d; if (!domains.includes(d)) domains.push(d); });
  const stdOpts = domains.map(d => {
    const subj = byCode[codes.filter(c => byCode[c].d === d)[0]].s;
    return '<optgroup label="' + esc(UI.subject === "All" ? subj + " \u00b7 " + d : d) + '">' +
      codes.filter(c => byCode[c].d === d).map(c =>
        '<option value="' + c + '"' + (c === UI.enterStd ? " selected" : "") + '>' + esc(dispCode(c) + " \u2014 " + byCode[c].lbl) + "</option>").join("") +
      "</optgroup>";
  }).join("");

  const multi = multiCodes();
  const std = byCode[UI.enterStd];

  /* the list of saved assignments sits beside everything else */
  let html = '<div class="enterlay">' + asgListHTML() + '<div class="stack enter-main">';
  html += asgToggleHTML() + assignmentBarHTML();
  /* On a phone the assignment bar and this card filled the whole first
     screen of an iPhone SE, so every marking session began with a scroll.
     Once the assignment on screen has marks, the card folds to one line
     that says what it is; tapping it opens the pickers again. A new or
     empty assignment keeps it open, because choosing is the next step. */
  const foldKey = UI.enterStd + "|" + UI.enterDate + "|" + (UI.enterCtx || "");
  const foldable = !!std && phoneLayout() &&
    S.scores.some(x => (multi ? multi.indexOf(x.std) >= 0 : x.std === UI.enterStd) && x.date === UI.enterDate && (x.ctx || "") === (UI.enterCtx || "") && !x.source);
  const foldOpen = UI.enterFold && UI.enterFold.key === foldKey ? UI.enterFold.open : false;
  html += (foldable
      ? '<details class="card pad stdfold"' + (foldOpen ? " open" : "") +
        ' ontoggle="UI.enterFold={key:' + esc(JSON.stringify(foldKey)).replace(/'/g, "&#39;") + ',open:this.open}">' +
        '<summary>' + (multi ? esc(multi.length + " standards together") : codeHTML(std.c) + " " + esc(std.lbl)) +
        '<span class="tiny"> \u00b7 ' + esc(UI.enterDate.slice(5)) + (UI.enterCtx ? " \u00b7 " + esc(UI.enterCtx) : "") + "</span>" +
        '<span class="stdfold-change">Change</span></summary>'
      : '<div class="card pad">') +
    '<div class="row" style="align-items:flex-end">' +
    '<label class="fld" style="flex:1;min-width:300px">' + esc(subjLabel()) + ' standard<select id="e-std">' + stdOpts + "</select></label>" +
    '<label class="fld">Date<input type="date" id="e-date" value="' + UI.enterDate + '"></label>' +
    '<label class="fld">What was it? (optional)<input type="text" id="e-ctx" placeholder="exit ticket, small group, observation" value="' + esc(UI.enterCtx || "") + '" style="width:220px"></label>' +
    "</div>" +
    (std ? '<div class="hint" style="margin-top:10px">' + codeHTML(std.c) + " " + esc(std.t) + "</div>" : "") +
    lessonPickHTML() +
    plannerPickHTML() +
    (foldable ? "</details>" : "</div>");

  if (std && multi) {
    html += multiRosterHTML(multi);
  } else if (std) {
    const sib = siblingCodes();
    const roster = sortedStudents();
    html += '<div class="card"><div class="pad" style="padding-bottom:8px"><div class="sectionhead" style="margin:0">' +
      "<h2>" + esc(std.lbl) + "</h2><span class=\"spacer\"></span>" +
      '<span class="hint" style="max-width:320px">Tap a number. It saves as you go. Tap the same number again to clear.</span>' +
      '<button class="btn brass" onclick="logRestAsMissing()">Log the rest as not turned in</button>' +
      (UI.lastMissingBatch && UI.lastMissingBatch.length ? '<button class="btn sm" onclick="undoMissingBatch()">Undo those ' + UI.lastMissingBatch.length + "</button>" : "") +
      "</div>" +
      (sib.length ? '<div class="row" style="margin-top:8px;gap:8px;align-items:center"><span class="tiny muted">\u201c' + esc(UI.enterCtx) + "\u201d on this date also covers " +
        esc(sib.map(c => dispCode(c)).join(", ")) + '.</span><button class="btn sm" data-multi="' + esc([UI.enterStd].concat(sib).join(" ")) + '">Grade all ' + (sib.length + 1) + " together</button></div>" : "") +
      sameDayHTML() +
      "</div>";
    html += '<div id="rosterlist">';
    roster.forEach(st => {
      const todayScore = S.scores.find(x => x.sid === st.id && x.std === UI.enterStd && x.date === UI.enterDate && !x.source && sameCtx(x, (UI.enterCtx || "")));
      const prior = scoresFor(st.id, UI.enterStd).filter(x => x.date !== UI.enterDate);
      const prev = prior.length ? prior[prior.length - 1] : null;
      const miss = missingFor(st.id, UI.enterStd, UI.enterDate, (UI.enterCtx || ""));
      html += '<div class="entryrow"' + (miss ? ' style="background:var(--s1-bg)"' : "") + ">" +
        '<span class="nm">' + nameLink(st, fullName(st)) + (st.eld ? ' <span class="chip eld">ELD</span>' : "") + "</span>" +
        '<span class="prev">' + (prev ? "was " + markHTML(prev.v) + ' <span class="tiny">' + esc(prev.date.slice(5)) + "</span>" : '<span class="tiny muted">no prior</span>') + "</span>" +
        '<span class="scale">' + [1, 2, 3, 4].map(v =>
          '<button data-v="' + v + '" data-sid="' + st.id + '" aria-pressed="' + (todayScore && todayScore.v === v ? "true" : "false") + '" title="Mark ' + v + '">' + v + "</button>").join("") + "</span>" +
        '<button class="btn sm' + (miss ? "" : " ghost") + '" data-miss="' + st.id + '" title="No work received from this student" style="' + (miss ? "border-color:var(--s1);color:var(--s1);font-weight:650;background:#fff" : "") + '">' + (miss ? "no work \u2713" : "no work") + "</button>" +
        '<input class="note" data-sid="' + st.id + '" placeholder="note" value="' + esc(todayScore && todayScore.note || "") + '">' +
        "</div>";
    });
    html += "</div></div>";
  } else {
    html += '<div class="card empty"><strong>No ' + esc(subjLabel()) + ' standards turned on</strong>Choose which standards you are tracking in Setup.</div>';
  }

  html += missingCardHTML();

  /* asked where the answer is known, not on a settings screen months later */
  html += mappingPromptHTML(UI.enterStd, UI.enterDate);

  if (UI.log.length) {
    html += '<div class="card pad"><div class="sectionhead"><h3>Just entered</h3><span class="spacer"></span><button class="btn sm" onclick="undoLast()">Undo last</button></div>' +
      '<div class="small muted">' + UI.log.slice(-8).reverse().map(l => esc(l)).join("<br>") + "</div></div>";
  }
  html += "</div></div>";
  el.innerHTML = html;

  wireAssignmentBar(el);
  document.getElementById("e-std").onchange = e => { UI.enterStd = e.target.value; UI.enterMulti = null; renderEnter(); };
  document.getElementById("e-date").onchange = e => {
    UI.enterDate = e.target.value;
    /* where the planner has a lesson on the new date, that is the lesson,
       and the card takes its standard and name */
    if (plannedStepOn(UI.enterDate)) { UI.enterLesson = null; UI.enterFollow = true; }
    UI.enterUnit = null;
    renderEnter();
  };
  const ls = document.getElementById("e-lesson");
  if (ls) ls.onchange = e => chooseLesson(e.target.value);
  const us = document.getElementById("e-unit");
  if (us) us.onchange = e => { UI.enterUnit = Number(e.target.value); renderEnter(); };
  const back = el.querySelector("[data-lesson-day]");
  if (back) back.onclick = () => chooseLesson("");
  const ctx = document.getElementById("e-ctx");
  if (ctx) {
    UI.ctxWas = UI.enterCtx || "";
    ctx.oninput = e => { UI.enterCtx = e.target.value; };
    ctx.onchange = () => { renameCtx(UI.ctxWas, (UI.enterCtx || "").trim() === "" ? "" : UI.enterCtx); renderEnter(); };
  }

  if (multi) wireMulti(el, multi);
  else el.querySelectorAll(".scale button").forEach(b => {
    b.onclick = () => setScore(b.dataset.sid, UI.enterStd, Number(b.dataset.v));
  });
  el.querySelectorAll("[data-multi]").forEach(b => {
    b.onclick = () => startMulti(b.dataset.multi.split(" "), b.dataset.pickctx || "");
  });
  el.querySelectorAll("[data-pick]").forEach(b => {
    b.onclick = () => {
      /* while grading together, a chip puts its standard in or takes it out */
      if (multi) { toggleMultiCode(b.dataset.pick); return; }
      UI.enterStd = b.dataset.pick;
      /* Name the assignment after the lesson, but only when that cannot
         split one: an assignment is standard + date + "What was it?", so
         filling that in beside marks already entered without it would make
         a second assignment out of the same work. */
      const c = b.dataset.pickctx;
      if (c && !UI.enterCtx && !S.scores.some(x => x.std === UI.enterStd && x.date === UI.enterDate && !x.ctx && !x.source)) UI.enterCtx = c;
      renderEnter();
    };
  });
  el.querySelectorAll("[data-miss]").forEach(b => {
    b.onclick = () => toggleMissingHere(b.dataset.miss);
  });
  el.querySelectorAll("input.note[data-sid]").forEach(inp => {
    inp.onchange = () => {
      const rec = S.scores.find(x => x.sid === inp.dataset.sid && x.std === UI.enterStd && x.date === UI.enterDate && !x.source && sameCtx(x, (UI.enterCtx || "")));
      if (rec) { rec.note = inp.value; save(); } else if (inp.value) { toast("Give a mark first, then the note saves with it"); }
    };
  });
}

/* each "What was it?" is its own assignment, with its own marks, so an
   exit ticket and a small-group check on the same skill and day both count.
   Name the others on this standard and date, so it is plain this one is apart. */
function sameDayHTML() {
  const cur = UI.enterCtx || "";
  const other = S.scores.filter(x => x.std === UI.enterStd && x.date === UI.enterDate && !x.source && (x.ctx || "") !== cur);
  if (!other.length) return "";
  const names = [...new Set(other.map(x => x.ctx || "no name"))];
  return '<p class="notice samedaynote" role="note" style="margin:8px 0 0">Also on this standard and date: ' +
    names.map(n => "\u201c" + esc(n) + "\u201d").join(" and ") + ". Its marks are kept apart from this one\u2019s.</p>";
}
/* changing the name of an assignment already being graded renames its
   marks with it, rather than leaving them behind as a second assignment.
   Typing the name of one that already has marks opens that one instead. */
function renameCtx(from, to) {
  if (from === to) return;
  const codes = UI.enterMulti ? (multiCodes() || [UI.enterStd]) : [UI.enterStd];
  const mine = x => codes.indexOf(x.std) >= 0 && x.date === UI.enterDate && !x.source;
  const olds = S.scores.filter(x => mine(x) && (x.ctx || "") === from);
  if (!olds.length) return;
  if (S.scores.some(x => mine(x) && (x.ctx || "") === to)) {
    toast("\u201c" + (to || "no name") + "\u201d already has marks on this date, so it is open now");
    return;
  }
  olds.forEach(x => { x.ctx = to; });
  S.missing.forEach(m => { if (codes.indexOf(m.std) >= 0 && m.date === UI.enterDate && (m.ctx || "") === from) m.ctx = to; });
  UI.undo = []; UI.lastAll = null;
  save();
  toast("Renamed: " + olds.length + (olds.length === 1 ? " mark" : " marks") + " now under \u201c" + (to || "no name") + "\u201d");
}
function setScore(sid, code, v) {
  UI.lastAll = null;
  const ctx = (UI.enterCtx || "");
  const i = S.scores.findIndex(x => x.sid === sid && x.std === code && x.date === UI.enterDate && !x.source && sameCtx(x, ctx));
  const st = S.students.find(x => x.id === sid);
  /* Undo puts back exactly what this tap replaced. It used to pop the
     newest record, which after a change or a clear was someone else's mark. */
  (UI.undo = UI.undo || []).push({ sid: sid, code: code, date: UI.enterDate, ctx: ctx,
    prev: i >= 0 ? Object.assign({}, S.scores[i]) : null,
    miss: S.missing.filter(m => m.sid === sid && m.std === code && m.date === UI.enterDate && sameCtx(m, ctx)).map(m => Object.assign({}, m)) });
  if (UI.undo.length > 50) UI.undo.shift();
  if (i >= 0 && S.scores[i].v === v) {
    S.scores.splice(i, 1);
    UI.log.push("Cleared " + fullName(st) + " \u2014 " + code);
  } else if (i >= 0) {
    S.scores[i].v = v; S.scores[i].ctx = UI.enterCtx || "";
    UI.log.push(fullName(st) + " \u2014 " + code + " changed to " + v);
  } else {
    S.scores.push({ id: uid(), sid: sid, std: code, v: v, date: UI.enterDate, note: "", ctx: UI.enterCtx || "" });
    UI.log.push(fullName(st) + " \u2014 " + code + " = " + v);
  }
  clearMissingOnScore(sid, code, UI.enterDate, ctx);
  save(); renderEnter();
}
function undoLast() {
  if (UI.lastAll) { undoAll(); return; }
  const u = (UI.undo || []).pop();
  if (!u) return;
  S.scores = S.scores.filter(x => !(x.sid === u.sid && x.std === u.code && x.date === u.date && !x.source && sameCtx(x, u.ctx)));
  if (u.prev) S.scores.push(u.prev);
  S.missing = S.missing.filter(m => !(m.sid === u.sid && m.std === u.code && m.date === u.date && sameCtx(m, u.ctx))).concat(u.miss);
  UI.log.push("Undid last entry"); save(); renderEnter();
}

/* ============================================================
   TAB 2 — GROUPS & PATTERNS
   ============================================================ */
function latestMap(code, days) {
  const m = {};
  S.students.forEach(st => {
    const a = scoresFor(st.id, code).filter(x => inWindow(x, days) && scoreAllowed(x));
    if (a.length) m[st.id] = a[a.length - 1].v;
  });
  return m;
}
function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  let inter = 0; A.forEach(x => { if (B.has(x)) inter++; });
  const uni = A.size + B.size - inter;
  return uni ? inter / uni : 0;
}
function buildNeedGroups(subject, days, lo) {
  const codes = activeCodes(subject);
  let seeds = [];
  codes.forEach(c => {
    const m = latestMap(c, days);
    const kids = Object.keys(m).filter(sid => lo ? m[sid] <= 2 : m[sid] === 4);
    if (kids.length >= 2) seeds.push({ stds: [c], kids: kids });
  });
  let merged = true, guard = 0;
  while (merged && guard++ < 60) {
    merged = false;
    outer:
    for (let i = 0; i < seeds.length; i++) {
      for (let j = i + 1; j < seeds.length; j++) {
        const jac = jaccard(seeds[i].kids, seeds[j].kids);
        const union = Array.from(new Set(seeds[i].kids.concat(seeds[j].kids)));
        if (jac >= 0.5 && union.length <= 7) {
          seeds[i] = { stds: seeds[i].stds.concat(seeds[j].stds), kids: union };
          seeds.splice(j, 1); merged = true; break outer;
        }
      }
    }
  }
  seeds.sort((a, b) => b.kids.length * b.stds.length - a.kids.length * a.stds.length);
  return seeds.slice(0, 8);
}
function classroomAvg(sid, subject, days) {
  const codes = activeCodes(subject);
  const vals = S.scores.filter(x => x.sid === sid && x.source !== "iready" &&
    codes.includes(x.std) && inWindow(x, days)).map(x => x.v);
  return avg(vals);
}
/* ============================================================
   SKILL GROUPS
   Even-sized groups off a recency-weighted average, hand-adjustable.
   A move is stored as a pin in S.groupPins, keyed subject|standard, so
   it survives new marks, reloads and sync. Pinned kids are seated first
   and everyone else is dealt around them in rank order.
   ============================================================ */
const GROUP_DECAY = 0.62;   /* each older mark counts this much of the one after it */
const UNPLACED = -1;

/* one standard, one student: newest mark counts most, older ones fade */
function weightedOn(sid, code, days) {
  const a = scoresFor(sid, code).filter(x => inWindow(x, days) && scoreAllowed(x));
  if (!a.length) return null;
  let num = 0, den = 0;
  a.forEach((x, i) => { const w = Math.pow(GROUP_DECAY, a.length - 1 - i); num += x.v * w; den += w; });
  return { v: num / den, n: a.length, last: a[a.length - 1] };
}
/* across several standards each standard counts once, however many marks it holds,
   so one heavily assessed standard cannot swamp the picture */
function weightedAcross(sid, codes, days) {
  const parts = []; let n = 0, last = null;
  codes.forEach(c => {
    const r = weightedOn(sid, c, days);
    if (!r) return;
    parts.push(r.v); n += r.n;
    if (!last || r.last.date.localeCompare(last.date) > 0) last = r.last;
  });
  return parts.length ? { v: avg(parts), n: n, last: last, stds: parts.length } : null;
}
function skillScore(sid, sel, subject, days) {
  return sel === "__all" ? weightedAcross(sid, activeCodes(subject), days)
    : weightedAcross(sid, [sel], days);
}
function pinKey(subject, sel) { return subject + "|" + sel; }
/* which standard the tab is grouping on: the one you picked, else the one
   with the most recent mark in this subject */
function skillSel() {
  const codes = activeCodes(UI.subject).filter(c => S.scores.some(x => x.std === c && scoreAllowed(x)));
  if (UI.groupStd === "__all" || (UI.groupStd && codes.indexOf(UI.groupStd) >= 0)) return UI.groupStd;
  let best = null, bestDate = "";
  S.scores.forEach(x => {
    if (codes.indexOf(x.std) < 0 || !scoreAllowed(x)) return;
    if (x.date > bestDate) { bestDate = x.date; best = x.std; }
  });
  UI.groupStd = best || "__all";
  return UI.groupStd;
}
function skillSelLabel(sel) {
  return sel === "__all" ? "All " + subjLabel() + " standards"
    : sel + " \u00b7 " + (byCode[sel] ? byCode[sel].lbl : sel);
}
function byRank(a, b) {
  const av = a.v == null ? 99 : a.v, bv = b.v == null ? 99 : b.v;
  const ab = a.broad == null ? 99 : a.broad, bb = b.broad == null ? 99 : b.broad;
  return (av - bv) || (ab - bb) ||
    ((a.last ? a.last.v : 9) - (b.last ? b.last.v : 9)) ||
    a.sort.localeCompare(b.sort);
}
function buildSkillGroups(subject, sel, days, k) {
  const pins = S.groupPins[pinKey(subject, sel)] || {};
  const seated = [], out = [];
  S.students.forEach(st => {
    const r = skillScore(st.id, sel, subject, days);
    const broad = sel === "__all" ? (r ? r.v : null)
      : (weightedAcross(st.id, activeCodes(subject), days) || {}).v;
    const pin = pins[st.id];
    const row = {
      sid: st.id, st: st, name: fullName(st), sort: (st.last + st.first).toLowerCase(),
      v: r ? r.v : null, n: r ? r.n : 0, last: r ? r.last : null,
      broad: broad == null ? null : broad, pinned: pin != null
    };
    if (pin === UNPLACED) out.push(row);
    else if (pin != null || r) seated.push(row);
    else out.push(row);
  });

  const kk = Math.max(1, Math.min(Number(k) || 4, seated.length || 1));
  const base = Math.floor(seated.length / kk), rem = seated.length % kk;
  const cap = [];
  /* the spare students go to the higher groups, so the lowest group stays smallest */
  for (let i = 0; i < kk; i++) cap.push(base + (i >= kk - rem ? 1 : 0));

  const groups = []; for (let i = 0; i < kk; i++) groups.push([]);
  const free = [];
  seated.forEach(r => {
    if (r.pinned) groups[Math.max(0, Math.min(kk - 1, pins[r.sid]))].push(r);
    else free.push(r);
  });
  free.sort(byRank);
  let gi = 0;
  free.forEach(r => {
    while (gi < kk - 1 && groups[gi].length >= cap[gi]) gi++;
    groups[gi].push(r);
  });
  groups.forEach(g => g.sort(byRank));
  out.sort((a, b) => a.sort.localeCompare(b.sort));
  return { groups: groups, out: out, pins: pins, moved: Object.keys(pins).length };
}

/* --- moving students by hand --- */
function gMove(sid, to) {
  const key = pinKey(UI.subject, skillSel());
  const m = S.groupPins[key] = S.groupPins[key] || {};
  m[sid] = to;
  save(); renderSkillGroups();
}
function gUnpin(sid) {
  const key = pinKey(UI.subject, skillSel());
  if (S.groupPins[key]) { delete S.groupPins[key][sid]; if (!Object.keys(S.groupPins[key]).length) delete S.groupPins[key]; }
  save(); renderSkillGroups();
}
function gClearPins() {
  const key = pinKey(UI.subject, skillSel());
  if (!S.groupPins[key]) return;
  delete S.groupPins[key];
  /* and they are no longer the board's groups */
  if (S.boardTaken && S.boardTaken.key === key) S.boardTaken.undone = true;
  save(); renderSkillGroups(); toast("Back to the suggested groups");
}
let gDragSid = null;
function gDragStart(ev, sid) {
  gDragSid = sid;
  ev.currentTarget.classList.add("dragging");
  try { ev.dataTransfer.setData("text/plain", sid); ev.dataTransfer.effectAllowed = "move"; } catch (e) { }
}
function gDragEnd(ev) { ev.currentTarget.classList.remove("dragging"); gDragSid = null; }
function gOver(ev, el) { ev.preventDefault(); ev.dataTransfer.dropEffect = "move"; el.classList.add("over"); }
function gLeave(ev, el) { if (!el.contains(ev.relatedTarget)) el.classList.remove("over"); }
function gDrop(ev, el, to) {
  ev.preventDefault(); el.classList.remove("over");
  let sid = gDragSid;
  try { sid = ev.dataTransfer.getData("text/plain") || sid; } catch (e) { }
  if (sid) gMove(sid, to);
}

function skillChip(r, idx, kk) {
  const dec = r.v == null ? "\u2013" : r.v.toFixed(1);
  const title = r.n ? r.n + " mark" + (r.n === 1 ? "" : "s") + (r.last ? ", most recent " + r.last.date : "")
    : "No marks on this standard in the chosen window";
  return '<span class="sgchip' + (r.pinned ? " moved" : "") + '" draggable="true"' +
    ' ondragstart="gDragStart(event,\'' + r.sid + '\')" ondragend="gDragEnd(event)" title="' + esc(title) + '">' +
    '<button class="mv" onclick="gMove(\'' + r.sid + '\',' + (idx - 1) + ')"' + (idx <= UNPLACED ? " disabled" : "") +
    ' aria-label="Move ' + esc(r.name) + ' left">\u25c0</button>' +
    '<span class="nm">' + esc(r.name) + (r.st.eld ? ' <span class="tiny muted">ELD</span>' : "") + "</span>" +
    (r.pinned ? '<button class="undo" onclick="gUnpin(\'' + r.sid + '\')" title="Put back where the data puts them">\u21ba</button>' : "") +
    '<span class="num">' + dec + "</span>" + markHTML(r.v == null ? null : roundMark(r.v)) +
    '<button class="mv" onclick="gMove(\'' + r.sid + '\',' + (idx + 1) + ')"' + (idx >= kk - 1 ? " disabled" : "") +
    ' aria-label="Move ' + esc(r.name) + ' right">\u25b6</button></span>';
}
/* ---------- skill groups, published for Small Groups ----------
   Small Groups offers the skill groups this tab makes, for Math (its board)
   and ELA, in suite:suggest:v1: the standard grouped on and each group as
   gradebook ids, lowest first. For the subject on screen it is what the
   teacher picked here; for the other, the standard with the newest mark,
   as this tab would choose. Written only when the groups change. */
let publishT = null;
function selFor(subject) {
  if (UI.subject === subject && UI.groupStd) return skillSel();
  const codes = activeCodes(subject).filter(c => S.scores.some(x => x.std === c && scoreAllowed(x)));
  let best = null, bd = "";
  S.scores.forEach(x => { if (codes.indexOf(x.std) >= 0 && scoreAllowed(x) && x.date > bd) { bd = x.date; best = x.std; } });
  return best || "__all";
}
function publishSuggestions() {
  if (!S.students.length) return;
  const out = {};
  [["math", "Math"], ["ela", "ELA"]].forEach(([k, subj]) => {
    const sel = selFor(subj), res = buildSkillGroups(subj, sel, UI.groupWindow, UI.groupCount);
    out[k] = { std: sel, label: sel === "__all" ? "all " + (subj === "Math" ? "math" : "ELA") + " standards together" : dispCode(sel) + " \u00b7 " + byCode[sel].lbl,
      groups: res.groups.map(g => g.map(r => r.sid)), out: res.out.map(r => r.sid) };
  });
  const prev = orfJSON("suite:suggest:v1");
  if (prev && JSON.stringify([prev.math, prev.ela]) === JSON.stringify([out.math, out.ela])) return;
  try { localStorage.setItem("suite:suggest:v1", JSON.stringify(Object.assign({ at: new Date().toISOString() }, out))); } catch (e) { }
}
function schedulePublish() { clearTimeout(publishT); publishT = setTimeout(publishSuggestions, 600); }

/* ---------- the math board's groups, taken back ----------
   The Small Groups board writes suite:boardGroups:v1 when the teacher sends
   his arrangement: { at, std, label, groups: [[ids] x 2-6 (v141; 4 before), first slot first],
   out: [ids] }. Only the gradebook writes its own data, so it takes the
   request here: every child is pinned where the board put them, for that
   standard, and the board's first slot is Group 1, as "Use these groups"
   maps them the other way. A request is taken once (S.boardTaken.at, which
   syncs with the gradebook, so another device does not take it again), and
   can be undone: what the pins were is kept beside it. */
const BOARD_KEY = "suite:boardGroups:v1";
function takeBoardGroups() {
  const r = orfJSON(BOARD_KEY);
  if (!r || typeof r.at !== "string" || !Array.isArray(r.groups) || r.groups.length < 2 || r.groups.length > 6) return false;
  if (S.boardTaken && S.boardTaken.at && S.boardTaken.at >= r.at) return false;
  if (!S.students.length) return false;
  const known = new Set(S.students.map(s => s.id));
  const pins = {};
  r.groups.forEach((g, i) => { (Array.isArray(g) ? g : []).forEach(id => { if (known.has(id)) pins[id] = i; }); });
  (Array.isArray(r.out) ? r.out : []).forEach(id => { if (known.has(id) && !(id in pins)) pins[id] = UNPLACED; });
  const std = r.std && (r.std === "__all" || byCode[r.std]) ? r.std : selFor("Math");
  const key = pinKey("Math", std);
  S.boardTaken = { at: r.at, std: std, key: key, prev: S.groupPins[key] ? JSON.parse(JSON.stringify(S.groupPins[key])) : null, undone: false };
  if (Object.keys(pins).length) S.groupPins[key] = pins;
  /* the gradebook shows them as the board does: its number of groups, on that standard */
  UI.groupCount = r.groups.length;
  if (UI.subject === "Math") UI.groupStd = std;
  save();
  publishSuggestions();
  return true;
}
function undoBoardGroups() {
  const t = S.boardTaken;
  if (!t || t.undone || !t.key) return;
  if (t.prev) S.groupPins[t.key] = t.prev; else delete S.groupPins[t.key];
  t.undone = true;
  save(); render(); publishSuggestions();
  toast("Back to the groups from before the board\u2019s");
}
function boardTakenNoteHTML(subj, sel) {
  const t = S.boardTaken;
  if (!t || t.undone || subj !== "Math" || t.key !== pinKey(subj, sel)) return "";
  const when = new Date(t.at);
  return '<div class="card pad" style="margin-top:10px"><div class="row"><span class="hint" style="flex:1">These are the Small Groups board\u2019s groups, sent ' +
    esc(isNaN(when) ? "" : when.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })) +
    '. Everyone is pinned where the board put them, so new marks will not move them until you choose <em>Undo my moves</em>.</span>' +
    '<button class="btn sm" onclick="undoBoardGroups()">Undo</button></div></div>';
}
function boardGroupsArrived() {
  if (!takeBoardGroups()) return;
  render();
  toast("Took the board\u2019s groups for " + (S.boardTaken.std === "__all" ? "all math standards" : dispCode(S.boardTaken.std)) + " \u00b7 Undo is on Skill groups");
}
function renderSkillGroups() {
  const host = document.getElementById("skillgroups");
  if (!host) return;
  const subj = UI.subject, days = UI.groupWindow, sel = skillSel();
  const codes = activeCodes(subj).filter(c => S.scores.some(x => x.std === c && scoreAllowed(x)));
  const res = buildSkillGroups(subj, sel, days, UI.groupCount);
  const kk = res.groups.length;

  let h = '<div class="sectionhead"><h2>Skill groups</h2><span class="spacer"></span>' +
    (res.moved ? '<button class="btn sm ghost" onclick="gClearPins()">Undo my moves (' + res.moved + ")</button>" : "") +
    '<button class="btn sm" onclick="printSkillGroups()">Print these groups</button></div>';

  h += '<div class="card pad"><div class="row">' +
    '<label class="fld">Group on<select id="sg-std" style="max-width:340px">' +
    '<option value="__all"' + (sel === "__all" ? " selected" : "") + ">All " + esc(subjLabel()) + " standards together</option>" +
    codes.map(c => '<option value="' + esc(c) + '"' + (sel === c ? " selected" : "") + ">" +
      esc(dispCode(c) + " \u00b7 " + byCode[c].lbl) + "</option>").join("") +
    "</select></label>" +
    '<label class="fld">How many<select id="sg-k">' +
    [2, 3, 4, 5, 6].map(n => '<option value="' + n + '"' + (Number(UI.groupCount) === n ? " selected" : "") + ">" + n + " groups</option>").join("") +
    "</select></label>" +
    '<span class="spacer" style="flex:1"></span>' +
    '<span class="hint" style="max-width:420px">Every mark counts, but the newest counts most. Groups are as even as the roster allows, ordered lowest to highest. Drag a name, or use the arrows, to move anyone on a hunch \u2014 the move sticks.</span>' +
    "</div></div>";
  h += boardTakenNoteHTML(subj, sel);                       /* v97 */

  if (!codes.length) {
    h += '<div class="card empty"><strong>No marks yet</strong>Enter a few scores and the groups build themselves.</div>';
    host.innerHTML = h; wireSkillControls(); return;
  }

  h += '<div class="grid2">';
  res.groups.forEach((g, i) => {
    const vals = g.filter(r => r.v != null).map(r => r.v);
    const range = vals.length ? (Math.min.apply(null, vals).toFixed(1) + (vals.length > 1 ? "\u2013" + Math.max.apply(null, vals).toFixed(1) : "")) : "no marks";
    h += '<div class="group sg" ondragover="gOver(event,this)" ondragleave="gLeave(event,this)" ondrop="gDrop(event,this,' + i + ')">' +
      '<h3><span class="gname">Group ' + (i + 1) + '</span><span class="tiny muted">' + esc(range) + "</span>" +
      '<span class="spacer" style="flex:1"></span><span class="tiny muted">' + g.length + " student" + (g.length === 1 ? "" : "s") + "</span></h3>" +
      '<div class="body"><div class="sglist">' +
      (g.length ? g.map(r => skillChip(r, i, kk)).join("") : '<div class="sgempty">Empty \u2014 drop someone here.</div>') +
      "</div></div></div>";
  });
  h += "</div>";

  if (res.out.length) {
    h += '<div class="group sg" style="margin-top:13px" ondragover="gOver(event,this)" ondragleave="gLeave(event,this)" ondrop="gDrop(event,this,' + UNPLACED + ')">' +
      '<h3><span class="gname">Not placed</span><span class="spacer" style="flex:1"></span>' +
      '<span class="tiny muted">' + res.out.length + "</span></h3>" +
      '<div class="body"><div class="tiny muted" style="margin-bottom:7px">Nothing recorded on this standard yet, so the gradebook will not guess. Move them in if you already know where they belong.</div>' +
      '<div class="sgrow">' + res.out.map(r => skillChip(r, UNPLACED, kk)).join("") + "</div></div></div>";
  }

  host.innerHTML = h;
  wireSkillControls();
  publishSuggestions();                                     /* v89 */
}
function wireSkillControls() {
  const a = document.getElementById("sg-std"), b = document.getElementById("sg-k");
  if (a) a.onchange = e => { UI.groupStd = e.target.value; renderSkillGroups(); };
  if (b) b.onchange = e => { UI.groupCount = Number(e.target.value); renderSkillGroups(); };
}
function printSkillGroups() {
  const sel = skillSel();
  const res = buildSkillGroups(UI.subject, sel, UI.groupWindow, UI.groupCount);
  let h = "<h2>" + esc(skillSelLabel(sel)) + "</h2>" +
    '<p style="font-size:11px;color:#555;margin-bottom:10px">' + esc(subjLabel()) +
    " skill groups, printed " + todayISO() + ". Newer marks weighted more heavily.</p>";
  h += '<table border="1" cellspacing="0" cellpadding="4" style="width:100%;border-collapse:collapse">' +
    '<thead><tr><th align="left" style="width:74px">Group</th><th align="left">Students</th></tr></thead><tbody>';
  res.groups.forEach((g, i) => {
    h += "<tr><td><strong>" + (i + 1) + "</strong></td><td>" +
      (g.length ? g.map(r => esc(r.name) + " <span style=\"color:#666\">" + (r.v == null ? "" : r.v.toFixed(1)) + "</span>").join(" \u00b7 ") : "\u2014") +
      "</td></tr>";
  });
  if (res.out.length) h += '<tr><td>Not placed</td><td>' + res.out.map(r => esc(r.name)).join(" \u00b7 ") + "</td></tr>";
  h += "</tbody></table>";
  document.getElementById("printsheet").innerHTML = h;
  suitePrint();
}

function renderGroups() {
  const el = document.getElementById("panel-groups");
  if (!S.students.length) return noStudents(el);
  const subj = UI.subject, days = UI.groupWindow;

  let html = '<div class="stack">';
  html += '<div class="card pad"><div class="row">' +
    '<label class="fld">Evidence<select id="g-ev">' +
    '<option value="both"' + (UI.groupEvidence === "both" ? " selected" : "") + '>Classwork and iReady</option>' +
    '<option value="classroom"' + (UI.groupEvidence === "classroom" ? " selected" : "") + '>Classwork only</option>' +
    '<option value="iready"' + (UI.groupEvidence === "iready" ? " selected" : "") + '>iReady only</option>' +
    '</select></label>' +
    '<label class="fld">Using data from<select id="g-win"><option value="0"' + (days === "0" ? " selected" : "") + '>All year</option><option value="45"' + (days === "45" ? " selected" : "") + '>Last 45 days</option><option value="21"' + (days === "21" ? " selected" : "") + '>Last 3 weeks</option></select></label>' +
    '<span class="spacer" style="flex:1"></span><span class="hint">Both settings feed everything on this tab.</span>' +
    "</div></div>";

  /* --- even skill groups, filled in after the panel is in the DOM --- */
  html += '<div id="skillgroups"></div><div class="divider"></div>';

  /* --- reteach groups --- */
  const need = buildNeedGroups(subj, days, true);
  html += "<h2>Groups with a shared need</h2>";
  if (!need.length) {
    html += '<div class="card empty"><strong>Not enough overlapping data yet</strong>Once two or more students have a 1 or 2 on the same standard, groups appear here.</div>';
  } else {
    html += '<div class="grid2">';
    need.forEach((g, i) => {
      const ones = g.kids.filter(sid => { const m = latestMap(g.stds[0], days); return m[sid] === 1; }).length;
      html += '<div class="group"><h3><span class="tag ' + (ones ? "reteach" : "practice") + '">' + (ones ? "Reteach" : "More practice") + "</span> Group " + (i + 1) + ' <span class="spacer" style="flex:1"></span><span class="tiny muted">' + g.kids.length + " students</span></h3><div class=\"body\">";
      html += '<div class="namelist">' + g.kids.map(sid => "<span>" + esc(fullName(S.students.find(s => s.id === sid))) + "</span>").join("") + "</div>";
      html += '<div class="small"><strong>Shared need:</strong><ul style="margin:6px 0 0;padding-left:18px">' +
        g.stds.map(c => "<li>" + codeHTML(c) + " " + esc(byCode[c].lbl) + "</li>").join("") + "</ul></div>" +
        evidenceLine(groupEvidenceMix(g, days));
      html += "</div></div>";
    });
    html += "</div>";
  }

  /* --- extend --- */
  const ext = buildNeedGroups(subj, days, false);
  if (ext.length) {
    html += '<div class="divider"></div><h2>Ready to extend</h2><div class="grid2">';
    ext.slice(0, 4).forEach((g, i) => {
      html += '<div class="group"><h3><span class="tag extend">Extend</span> ' + esc(g.stds.map(c => byCode[c].lbl).join(", ")) + "</h3><div class=\"body\">" +
        '<div class="namelist">' + g.kids.map(sid => "<span>" + esc(fullName(S.students.find(s => s.id === sid))) + "</span>").join("") + "</div></div></div>";
    });
    html += "</div>";
  }

  html += ireadyDomainGroupsHTML(subj);

  /* --- watch list --- */
  const flags = [];
  S.students.forEach(st => {
    activeCodes(subj).forEach(c => {
      const a = scoresFor(st.id, c);
      if (a.length >= 2 && a[a.length - 1].v < a[a.length - 2].v) {
        flags.push({ t: "down", who: fullName(st), why: byCode[c].lbl + " dropped from " + a[a.length - 2].v + " to " + a[a.length - 1].v });
      }
    });
    const ir = S.iready.filter(r => r.sid === st.id && (subj === "All" || r.subject === subj)).sort((a, b) => (a.date || "").localeCompare(b.date || "")).slice(-1)[0];
    if (ir) {
      const rank = placementRank(ir.placement);
      const ca = classroomAvg(st.id, ir.subject, days);
      if (rank != null && ca != null) {
        if (rank <= -1 && ca >= 3) flags.push({ t: "mix", who: fullName(st), why: "classroom marks average " + ca.toFixed(1) + " but iReady places " + ir.placement.toLowerCase() });
        if (rank >= 0 && ca <= 2.2) flags.push({ t: "mix", who: fullName(st), why: "iReady places " + ir.placement.toLowerCase() + " but classroom marks average " + ca.toFixed(1) });
      }
    }
    const n = S.scores.filter(x => x.sid === st.id && activeCodes(subj).includes(x.std)).length;
    if (n > 0 && n < 3) flags.push({ t: "thin", who: fullName(st), why: "only " + n + " mark" + (n === 1 ? "" : "s") + " recorded so far" });
  });
  ireadyGrowthFlags(subj).forEach(f => flags.push(f));
  html += '<div class="divider"></div><h2>Worth a look</h2>';
  if (!flags.length) {
    html += '<div class="notice ok"><b>Nothing flagged.</b><span>Come back after a few more entries.</span></div>';
  } else {
    /* one row per child, every flag of theirs together, most flagged
       first; it listed each flag on its own row, the same child up to three
       times, and counted flags as students */
    const TAG = { down: "Slipping", mix: "Mismatch", growth: "Flat growth", thin: "Thin data" };
    const byKid = new Map();
    flags.forEach(f => { if (!byKid.has(f.who)) byKid.set(f.who, []); byKid.get(f.who).push(f); });
    const rows = [...byKid.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    const slip = rows.filter(r => r[1].some(f => f.t === "down")).length;
    html += '<div class="notice warn"><b>Worth a look</b><span>' + rows.length + (rows.length === 1 ? " child" : " children") +
      (slip ? ", " + slip + " slipping on a standard" : "") + ".</span></div>";
    html += '<div class="card"><table class="wl-table"><thead><tr><th>Student</th><th>What stands out</th></tr></thead><tbody>' +
      rows.map(([who, fs]) => {
        const st = S.students.find(x => fullName(x) === who);
        return '<tr data-wl="' + esc(who) + '"><td class="wl-who">' + (st ? nameLink(st, who) : esc(who)) + "</td><td><ul class=\"wl-list\">" +
          fs.map(f => '<li><span class="tag flag">' + TAG[f.t] + "</span> " + esc(f.why) + "</li>").join("") + "</ul></td></tr>";
      }).join("") +
      "</tbody></table></div>";
  }

  /* --- class heatmap --- */
  const codes = activeCodes(subj).filter(c => S.scores.some(x => x.std === c));
  if (codes.length) {
    html += '<div class="divider"></div><h2>Class at a glance</h2>' +
      '<div class="scroll"><table><thead><tr><th style="min-width:150px">Student</th>' +
      codes.map(c => '<th class="c" title="' + esc(byCode[c].t) + '"><span style="writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap">' + esc(dispCode(byCode[c].c)) + "</span></th>").join("") +
      '<th class="c">Avg</th></tr></thead><tbody>';
    sortedStudents().forEach(st => {
      const vals = [];
      html += "<tr><td>" + nameLink(st, fullName(st)) + (st.eld ? ' <span class="chip eld tiny">ELD</span>' : "") + "</td>";
      codes.forEach(c => {
        const a = scoresFor(st.id, c).filter(scoreAllowed);
        const l = a.length ? a[a.length - 1] : null;
        if (l) vals.push(l.v);
        html += '<td class="c"' + (l && l.source === "iready" ? ' title="from iReady"' : "") + ">" +
          markHTML(l ? l.v : null) + (l && l.source === "iready" ? '<span class="tiny muted">i</span>' : "") + "</td>";
      });
      const a = avg(vals);
      html += '<td class="c num"><strong>' + (a ? a.toFixed(1) : "\u2013") + "</strong></td></tr>";
    });
    html += "</tbody></table></div>";
  }
  html += planningAnalysisHTML();                           /* from the old Planning tab */
  html += "</div>";
  el.innerHTML = html;
  renderSkillGroups();
  document.getElementById("g-win").onchange = e => { UI.groupWindow = e.target.value; renderGroups(); };
  document.getElementById("g-ev").onchange = e => { UI.groupEvidence = e.target.value; renderGroups(); };
}

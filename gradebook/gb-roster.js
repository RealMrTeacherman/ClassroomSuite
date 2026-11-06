/* gradebook/gb-roster.js — Work not turned in, duplicate students, and iReady domains in marks and grouping.
   One of the gradebook's scripts, loaded in order by index.html as classic
   scripts sharing one global scope; see HANDOFF "The gradebook's files". */
/* ============================================================
   WORK NOT TURNED IN
   ============================================================ */
function missingOpen() { return S.missing.filter(m => !m.received && !m.excused); }
/* an assignment is standard + date + "What was it?", and a child has a
   mark (or a "no work") per assignment. ctx left out matches any name. */
function sameCtx(x, ctx) { return ctx === undefined || x.ctx === undefined || (x.ctx || "") === (ctx || ""); }
function missingFor(sid, std, date, ctx) {
  return S.missing.find(m => m.sid === sid && m.std === std && m.date === date && sameCtx(m, ctx) && !m.received && !m.excused) || null;
}
function hasScore(sid, std, date, ctx) {
  return S.scores.some(x => x.sid === sid && x.std === std && x.date === date && !x.source && sameCtx(x, ctx));
}
/* called whenever a mark is entered, so the chase list clears itself */
function clearMissingOnScore(sid, std, date, ctx) {
  S.missing.forEach(m => {
    if (m.sid === sid && m.std === std && m.date === date && sameCtx(m, ctx) && !m.received) m.received = todayISO();
  });
}
function logRestAsMissing() {
  const std = UI.enterStd, date = UI.enterDate;
  if (!std) return;
  const batch = [];
  sortedStudents().forEach(st => {
    if (hasScore(st.id, std, date, UI.enterCtx || "")) return;
    if (missingFor(st.id, std, date, UI.enterCtx || "")) return;
    const rec = { id: uid(), sid: st.id, std: std, date: date, ctx: UI.enterCtx || "", received: null, excused: false };
    S.missing.push(rec); batch.push(rec.id);
  });
  UI.lastMissingBatch = batch;
  save(); renderEnter();
  toast(batch.length ? "Logged " + batch.length + " as not turned in" : "Everyone has a mark for this one");
}
function undoMissingBatch() {
  if (!UI.lastMissingBatch || !UI.lastMissingBatch.length) return;
  S.missing = S.missing.filter(m => UI.lastMissingBatch.indexOf(m.id) < 0);
  UI.lastMissingBatch = [];
  save(); renderEnter(); toast("Undone");
}
function toggleMissingHere(sid) {
  const std = UI.enterStd, date = UI.enterDate;
  const ex = missingFor(sid, std, date, UI.enterCtx || "");
  if (ex) { S.missing = S.missing.filter(m => m.id !== ex.id); }
  else {
    if (hasScore(sid, std, date, UI.enterCtx || "")) { toast("That student already has a mark for this one"); return; }
    S.missing.push({ id: uid(), sid: sid, std: std, date: date, ctx: UI.enterCtx || "", received: null, excused: false });
  }
  save(); renderEnter();
}
function markMissingReceived(id) {
  const m = S.missing.find(x => x.id === id); if (!m) return;
  m.received = todayISO(); save(); render();
  toast("Marked as handed in \u2014 give it a mark when you have one");
}
function excuseMissing(id) {
  const m = S.missing.find(x => x.id === id); if (!m) return;
  m.excused = true; save(); render(); toast("Excused");
}
function assignmentLabel(std, date, ctx) {
  const c = byCode[std];
  return (c ? c.lbl : std) + " \u00b7 " + date + (ctx ? " \u00b7 " + ctx : "");
}

/* the card that lists everything still outstanding, grouped by assignment */
function missingCardHTML(limitToCurrent) {
  const open = missingOpen();
  if (!open.length) return "";
  const groups = {};
  open.forEach(m => {
    const k = m.std + "|" + m.date + "|" + (m.ctx || "");
    (groups[k] = groups[k] || { std: m.std, date: m.date, ctx: m.ctx, items: [] }).items.push(m);
  });
  const keys = Object.keys(groups).sort((a, b) => groups[b].date.localeCompare(groups[a].date));
  let h = '<div class="card pad"><div class="sectionhead"><h2>Still waiting on</h2>' +
    '<span class="chip" style="border-color:#E0C3BA;background:var(--s1-bg);color:var(--s1)">' + open.length + "</span>" +
    '<span class="spacer"></span><button class="btn sm" onclick="printMissing()">Print the follow-up list</button></div>';
  keys.forEach(k => {
    const g = groups[k];
    h += '<div style="border-top:1px solid var(--rule);padding:10px 0 4px">' +
      '<div class="small" style="font-weight:640">' + esc(assignmentLabel(g.std, g.date, g.ctx)) + "</div>";
    g.items.forEach(m => {
      const st = S.students.find(s => s.id === m.sid);
      h += '<div class="row small" style="gap:8px;padding:3px 0">' +
        '<span style="flex:1;min-width:130px">' + esc(st ? fullName(st) : "?") + "</span>" +
        '<button class="btn sm" onclick="markMissingReceived(\'' + m.id + '\')">Handed in</button>' +
        '<button class="btn sm ghost" onclick="excuseMissing(\'' + m.id + '\')">Excuse</button></div>';
    });
    h += "</div>";
  });
  h += '<p class="hint" style="margin-top:10px">Entering a mark for one of these clears it from the list on its own.</p></div>';
  return h;
}
function printMissing() {
  const open = missingOpen();
  if (!open.length) { toast("Nothing outstanding"); return; }
  const byStudent = {};
  open.forEach(m => (byStudent[m.sid] = byStudent[m.sid] || []).push(m));
  let h = "<h2>Work still to come in</h2><p style=\"font-size:11px;color:#555\">" +
    esc(S.settings.teacher || "Grade 2") + " \u00b7 printed " + todayISO() + "</p>";
  sortedStudents().forEach(st => {
    const items = byStudent[st.id]; if (!items) return;
    h += '<div style="margin:10px 0;page-break-inside:avoid"><strong>' + esc(fullName(st)) + "</strong> (" + items.length + ")" +
      '<table border="1" cellspacing="0" cellpadding="3" style="width:100%;border-collapse:collapse;margin-top:3px">' +
      '<tr><th align="left" style="width:110px">Assigned</th><th align="left">What is missing</th><th style="width:70px">In</th></tr>' +
      items.sort((a, b) => a.date.localeCompare(b.date)).map(m =>
        "<tr><td>" + esc(m.date) + "</td><td>" + esc((byCode[m.std] ? byCode[m.std].lbl : m.std) + (m.ctx ? " \u2014 " + m.ctx : "")) + "</td><td></td></tr>").join("") +
      "</table></div>";
  });
  document.getElementById("printsheet").innerHTML = h;
  suitePrint();
}
function missingSummary(sid) {
  const all = S.missing.filter(m => m.sid === sid && !m.excused);
  return { open: all.filter(m => !m.received).length, total: all.length };
}

/* ============================================================
   RECONCILING DUPLICATE STUDENTS
   A record entered as just "Mia" and one entered later as "Mia Alvarez"
   are the same child. This finds those pairs and folds one into the other.
   ============================================================ */
const PREMERGE_KEY = KEY + "_premerge";

function isPartialName(st) { return !String(st.first || "").trim() || !String(st.last || "").trim(); }
function partialToken(st) { return String(st.first || "").trim() || String(st.last || "").trim(); }

function findDuplicatePairs() {
  const full = S.students.filter(s => String(s.first || "").trim() && String(s.last || "").trim());
  const out = [];
  S.students.filter(isPartialName).forEach(p => {
    const tok = normName(partialToken(p));
    if (!tok) return;
    let matches = full.filter(f => normName(f.first) === tok || akaOf(f).some(a => normName(a) === tok));
    if (!matches.length) matches = full.filter(f => normName(f.last) === tok);
    if (!matches.length) matches = full.filter(f => normName(f.first).indexOf(tok) === 0 && tok.length >= 3);
    out.push({ from: p, matches: matches, reason: "first name only" });
  });
  /* exact repeats of the same full name */
  const seen = {};
  full.forEach(f => { const k = normName(f.first) + "|" + normName(f.last); (seen[k] = seen[k] || []).push(f); });
  Object.keys(seen).forEach(k => {
    if (seen[k].length < 2) return;
    const keep = seen[k].slice().sort((a, b) => dataCount(b.id) - dataCount(a.id))[0];
    seen[k].forEach(d => { if (d.id !== keep.id) out.push({ from: d, matches: [keep], reason: "same name twice" }); });
  });
  return out;
}
function dataCount(sid) {
  return S.scores.filter(x => x.sid === sid).length + S.orf.filter(x => x.sid === sid).length +
    S.iready.filter(x => x.sid === sid).length + S.missing.filter(x => x.sid === sid).length;
}

function mergeStudents(fromId, toId) {
  const res = { moved: 0, dropped: 0 };
  if (fromId === toId) return res;
  const from = S.students.find(s => s.id === fromId), to = S.students.find(s => s.id === toId);
  if (!from || !to) return res;

  const seenScore = new Set(S.scores.filter(x => x.sid === toId).map(x => x.std + "|" + x.date));
  S.scores = S.scores.filter(x => {
    if (x.sid !== fromId) return true;
    const k = x.std + "|" + x.date;
    if (seenScore.has(k)) { res.dropped++; return false; }
    x.sid = toId; seenScore.add(k); res.moved++; return true;
  });

  const seenOrf = new Set(S.orf.filter(r => r.sid === toId).map(r => r.date + "|" + r.wcpm));
  S.orf = S.orf.filter(r => {
    if (r.sid !== fromId) return true;
    const k = r.date + "|" + r.wcpm;
    if (seenOrf.has(k)) { res.dropped++; return false; }
    r.sid = toId; seenOrf.add(k); res.moved++; return true;
  });

  const seenIr = new Set(S.iready.filter(r => r.sid === toId).map(r => r.subject + "|" + r.date));
  S.iready = S.iready.filter(r => {
    if (r.sid !== fromId) return true;
    const k = r.subject + "|" + r.date;
    if (seenIr.has(k)) { res.dropped++; return false; }
    r.sid = toId; seenIr.add(k); res.moved++; return true;
  });

  S.missing.forEach(m => { if (m.sid === fromId) { m.sid = toId; res.moved++; } });

  Object.keys(S.overrides).forEach(k => {
    const p = k.split("|");
    if (p[1] !== fromId) return;
    const nk = p[0] + "|" + toId + "|" + p[2];
    if (S.overrides[nk] === undefined) S.overrides[nk] = S.overrides[k];
    delete S.overrides[k];
  });
  Object.keys(S.orfLink).forEach(k => { if (S.orfLink[k] === fromId) S.orfLink[k] = toId; });

  Object.keys(S.groupPins).forEach(k => {
    const m = S.groupPins[k];
    if (m[fromId] === undefined) return;
    if (m[toId] === undefined) m[toId] = m[fromId];
    delete m[fromId];
  });

  if (!String(to.sid || "").trim() && String(from.sid || "").trim()) to.sid = from.sid;
  /* the name the other record went by becomes one this child is also
     called, so the next import or fluency check under it lands here */
  const other = isPartialName(from) ? partialToken(from) : String(from.first || "").trim();
  const known = [to.first].concat(akaOf(to)).map(normName);
  const add = [other].concat(akaOf(from)).filter(a => normName(a) && known.indexOf(normName(a)) < 0);
  if (add.length) to.aka = akaOf({ aka: akaOf(to).concat(add) });
  if (from.eld || hasEldTag(from)) to.eld = true;

  S.students = S.students.filter(s => s.id !== fromId);
  return res;
}

/* Names that are probably the same child, but not certainly.

   `findDuplicatePairs` handles the two cases it can be sure about: a record
   with only one name that matches a full one, and the exact same full name
   twice. Those get merged automatically because there is nothing to weigh up.

   This is the third case, and it must never merge on its own. A roster
   imported twice in different formats gives you "Alex Ortega-Reyes" and
   "Alex Ortega-Reyes Ortega-Reyes" — the second surname is a maternal
   surname the other export dropped, and it is one child. But the same shape
   is also two brothers, or a child and a cousin in the same class, and
   merging those silently loses a term of marks with no obvious sign that
   anything happened. So: same first name, and one surname contains the whole
   of the other as a word, and then a human decides. */
function likelyDuplicates() {
  const full = S.students.filter(s => String(s.first || "").trim() && String(s.last || "").trim());
  const out = [], paired = {};
  const words = s => normName(s).length ? String(s).toLowerCase().split(/[^a-z]+/).filter(Boolean) : [];
  full.forEach((a, i) => {
    full.slice(i + 1).forEach(b => {
      /* Theo Robinson and Theodore Robinson, or Theo R. — a nickname,
         or two children. A human decides, as for the surname case. */
      if (normName(a.first) !== normName(b.first)) {
        const keepN = window.SuiteNames && window.SuiteNames.nicknamePair(a, b);
        if (!keepN) return;
        const key = [a.id, b.id].sort().join("|");
        if (paired[key] || (S.notSame || {})[key]) return;
        paired[key] = true;
        const dropN = keepN === a ? b : a;
        out.push({ keep: keepN, drop: dropN, why: "\u201c" + dropN.first + "\u201d looks like a name " + keepN.first + " goes by" });
        return;
      }
      const la = normName(a.last), lb = normName(b.last);
      if (la === lb) return;                       /* already handled as an exact repeat */
      const wa = words(a.last), wb = words(b.last);
      const shorter = wa.length <= wb.length ? wa : wb;
      const longer = wa.length <= wb.length ? wb : wa;
      /* every word of the shorter surname appears in the longer one */
      if (!shorter.length || !shorter.every(w => longer.includes(w))) return;
      const key = [a.id, b.id].sort().join("|");
      if (paired[key] || (S.notSame || {})[key]) return;
      paired[key] = true;
      /* keep whichever carries more data, offer to fold the other into it */
      const keep = dataCount(a.id) >= dataCount(b.id) ? a : b;
      const drop = keep === a ? b : a;
      out.push({ keep: keep, drop: drop, why: "one surname contains the other" });
    });
  });
  return out;
}
function duplicateNoticeHTML() {
  const pairs = likelyDuplicates();
  if (!pairs.length) return "";
  return pairs.map(p =>
    '<div class="notice warn"><b>Possibly the same student</b><span>' +
    esc(fullName(p.drop)) + " (" + dataCount(p.drop.id) + " mark" + (dataCount(p.drop.id) === 1 ? "" : "s") + ") and " +
    esc(fullName(p.keep)) + " (" + dataCount(p.keep.id) + ") \u2014 " + p.why +
    ". If they are two children, leave this alone.</span>" +
    '<span style="flex:1"></span>' +
    '<button class="btn sm" onclick="mergeLikely(\'' + p.drop.id + "','" + p.keep.id + '\')">Merge into ' + esc(fullName(p.keep)) + "</button>" +
    '<button class="btn sm" onclick="notSameChild(\'' + p.drop.id + "','" + p.keep.id + '\')">They\u2019re two children</button></div>'
  ).join("");
}
/* stop asking about a pair that really is two children */
function notSameChild(a, b) {
  S.notSame = S.notSame || {};
  S.notSame[[a, b].sort().join("|")] = true;
  save(); render(); toast("Kept as two students");
}
function mergeLikely(dropId, keepId) {
  const drop = S.students.find(s => s.id === dropId), keep = S.students.find(s => s.id === keepId);
  if (!drop || !keep) { toast("Those students are no longer here"); return; }
  if (!confirm("Move everything from " + fullName(drop) + " into " + fullName(keep) + "?\n\nYou can undo this from Setup.")) return;
  try { window.localStorage.setItem(PREMERGE_KEY, JSON.stringify(S)); } catch (e) { }
  const r = mergeStudents(dropId, keepId);
  S.mergeLog = [fullName(drop) + " \u2192 " + fullName(keep) +
    " (" + r.moved + " moved" + (r.dropped ? ", " + r.dropped + " duplicate marks dropped" : "") + ")"];
  save(); render();
  toast("Merged \u00b7 undo from Setup");
}

/* A gradebook student named "ELD Maria Lopez" — brought over from the
   running-records roster by an older build, or typed that way — is Maria
   Lopez with the ELD box that already exists for the purpose. Take the tag
   off and tick the box. Converges: a tag is wrong every time it is seen.
   If Maria Lopez is already on the roster, the renamed record is now the
   same name twice, and the exact-repeat rule below folds them together. */
function isEldOnly(x) { return /^\s*(?:ELD|[(\[]\s*eld\s*[)\]])\s*$/.test(String(x || "")) || /^\s*[(\[]\s*eld\s*[)\]]\s*$/i.test(String(x || "")); }
function hasEldTag(s) { return stripEldTag(s.first).eld || stripEldTag(s.last).eld || isEldOnly(s.first) || isEldOnly(s.last); }
function untagEldNames() {
  const log = [];
  S.students.forEach(s => {
    if (!hasEldTag(s)) return;
    const was = fullName(s);
    const f = stripEldTag(s.first), l = stripEldTag(s.last);
    if (isEldOnly(s.first) || isEldOnly(s.last)) {
      /* "ELD" landed in a name box of its own (first "ELD", last "Maria
         Lopez"): split what is left again, the way the ORF bridge would */
      const p = splitOrfName(isEldOnly(s.first) ? s.last : s.first);
      s.first = p.first; s.last = p.last;
    } else {
      if (f.eld) s.first = f.name;
      if (l.eld) s.last = l.name;
    }
    s.eld = true;
    log.push("\u201c" + was + "\u201d is " + fullName(s) + ", with ELD ticked");
  });
  return log;
}

function autoMergeDuplicates(silent) {
  const before = S.students.some(hasEldTag) ? JSON.stringify(S) : null;
  const renamed = untagEldNames();
  const pairs = findDuplicatePairs().filter(p => p.matches.length === 1);
  if (!pairs.length && !renamed.length) return null;
  try { window.localStorage.setItem(PREMERGE_KEY, before || JSON.stringify(S)); } catch (e) { }
  const log = renamed.slice();
  let moved = 0, dropped = 0;
  pairs.forEach(p => {
    const label = (partialToken(p.from) || "?") + " \u2192 " + fullName(p.matches[0]);
    const r = mergeStudents(p.from.id, p.matches[0].id);
    moved += r.moved; dropped += r.dropped;
    log.push(label + " (" + r.moved + " moved" + (r.dropped ? ", " + r.dropped + " duplicate marks dropped" : "") + ")");
  });
  S.mergeLog = log;
  save();
  if (!silent) { render(); toast("Merged " + pairs.length + " duplicate" + (pairs.length === 1 ? "" : "s")); }
  return { count: pairs.length, renamed: renamed.length, moved: moved, dropped: dropped, log: log };
}
function hasPremerge() { try { return !!window.localStorage.getItem(PREMERGE_KEY); } catch (e) { return false; } }
function undoMerge() {
  let raw = null;
  try { raw = window.localStorage.getItem(PREMERGE_KEY); } catch (e) { }
  if (!raw) { toast("Nothing to undo"); return; }
  if (!confirm("Put the roster back the way it was before the merge? Anything you have entered since will be lost.")) return;
  try {
    S = hydrate(JSON.parse(raw));
    S.mergeLog = null;
    window.localStorage.removeItem(PREMERGE_KEY);
    save(); render(); toast("Roster restored");
  } catch (e) { toast("Could not restore"); }
}
function mergeManually(fromId, toId) {
  try { window.localStorage.setItem(PREMERGE_KEY, JSON.stringify(S)); } catch (e) { }
  const from = S.students.find(s => s.id === fromId), to = S.students.find(s => s.id === toId);
  if (!from || !to) return;
  const label = fullName(from) + " \u2192 " + fullName(to);
  const r = mergeStudents(fromId, toId);
  S.mergeLog = [label + " (" + r.moved + " moved" + (r.dropped ? ", " + r.dropped + " dropped" : "") + ")"];
  save(); renderSetup(); toast("Merged");
}

/* the Setup card: what was merged, what still needs a decision */
function duplicatesCardHTML() {
  const pending = findDuplicatePairs();
  const ambiguous = pending.filter(p => p.matches.length > 1);
  const orphans = pending.filter(p => p.matches.length === 0);
  const log = S.mergeLog || [];
  if (!ambiguous.length && !orphans.length && !log.length && !hasPremerge()) return "";

  let h = '<div class="card pad"><div class="sectionhead"><h2>Duplicate students</h2><span class="spacer"></span>' +
    (hasPremerge() ? '<button class="btn sm danger" onclick="undoMerge()">Undo the merge</button>' : "") + "</div>";

  if (log.length) {
    h += '<p class="small" style="margin-top:4px">Folded together automatically when this file was opened:</p>' +
      '<ul class="small" style="margin:6px 0 0;padding-left:18px">' + log.map(l => "<li>" + esc(l) + "</li>").join("") + "</ul>" +
      '<p class="hint" style="margin-top:6px">Where both records had a mark on the same standard and date, the full-name record\u2019s mark was kept.</p>';
  }
  if (ambiguous.length) {
    h += '<div class="divider"></div><p class="small" style="font-weight:640;color:var(--warn)">These need you to pick, because more than one student matches:</p>';
    ambiguous.forEach(p => {
      h += '<div class="row small" style="gap:8px;padding:5px 0;border-bottom:1px solid #EDF1EF">' +
        '<span style="flex:1"><strong>' + esc(partialToken(p.from)) + "</strong> " +
        '<span class="muted">' + dataCount(p.from.id) + " marks</span></span>" +
        '<select data-mergefrom="' + p.from.id + '"><option value="">merge into\u2026</option>' +
        p.matches.map(mm => '<option value="' + mm.id + '">' + esc(fullName(mm)) + "</option>").join("") + "</select></div>";
    });
  }
  if (orphans.length) {
    h += '<div class="divider"></div><p class="small">These have only one name and nothing on the roster matches them. Give them a last name below, or merge them by hand:</p>';
    orphans.forEach(p => {
      h += '<div class="row small" style="gap:8px;padding:5px 0;border-bottom:1px solid #EDF1EF">' +
        '<span style="flex:1"><strong>' + esc(partialToken(p.from)) + "</strong> " +
        '<span class="muted">' + dataCount(p.from.id) + " marks</span></span>" +
        '<select data-mergefrom="' + p.from.id + '"><option value="">merge into\u2026</option>' +
        S.students.filter(x => x.id !== p.from.id).sort((a, b) => a.last.localeCompare(b.last))
          .map(mm => '<option value="' + mm.id + '">' + esc(fullName(mm)) + "</option>").join("") + "</select></div>";
    });
  }
  h += "</div>";
  return h;
}

/* ============================================================
   iREADY DOMAINS -> STANDARDS MARKS
   A domain placement is a broad estimate across a grade band, not evidence
   about one standard, so every mapping here is editable and the marks are
   kept out of report card calculations unless you say otherwise.
   ============================================================ */
const IREADY_MAP_DEFAULT = {
  /* Reading */
  "phonological awareness": ["2.RF.2"],
  "phonics": ["2.RF.3"],
  "high-frequency words": ["2.RF.3"],
  "high frequency words": ["2.RF.3"],
  "vocabulary": ["2.L.4", "2.L.6"],
  "comprehension: overall": ["2.RL.10", "2.RI.10"],
  "comprehension overall": ["2.RL.10", "2.RI.10"],
  "comprehension: literature": ["2.RL.10"],
  "comprehension literature": ["2.RL.10"],
  "comprehension: informational text": ["2.RI.10"],
  "comprehension informational text": ["2.RI.10"],
  /* Math */
  "number and operations": ["2.NBT.A.1", "2.NBT.B.5"],
  "algebra and algebraic thinking": ["2.OA.A.1", "2.OA.B.2"],
  "measurement and data": ["2.GM.B.4", "2.DR.B.2"],
  "geometry": ["2.GM.A.1"]
};
function ireadyCuts() { return Object.assign({ 4: 1, 3: 0, 2: -1 }, S.settings.ireadyCuts || {}); }
function placementToMark(rank) {
  if (rank == null) return null;
  const c = ireadyCuts();
  if (rank >= c[4]) return 4;
  if (rank >= c[3]) return 3;
  if (rank >= c[2]) return 2;
  return 1;
}
function rankWords(r) {
  if (r == null) return "unknown";
  if (r > 0) return "above grade level";
  if (r === 0) return "on grade level";
  if (r === -1) return "one grade below";
  return Math.abs(r) + " grades below";
}
/* every domain name seen in the imported data, plus the ones we know about */
function knownDomains() {
  const seen = {};
  S.iready.forEach(r => Object.keys(r.domains || {}).forEach(k => {
    const n = normHdr(k);
    if (!seen[n]) seen[n] = { key: n, label: k, subject: r.subject };
  }));
  return Object.keys(seen).sort().map(k => seen[k]);
}
function domainTargets(nameKey) {
  const m = S.settings.ireadyMap || {};
  if (m[nameKey]) return m[nameKey];
  if (IREADY_MAP_DEFAULT[nameKey]) return IREADY_MAP_DEFAULT[nameKey];
  const hit = Object.keys(IREADY_MAP_DEFAULT).find(k => nameKey.indexOf(k) >= 0 || k.indexOf(nameKey) >= 0);
  return hit ? IREADY_MAP_DEFAULT[hit] : [];
}
function setDomainTargets(nameKey, codes) {
  S.settings.ireadyMap = S.settings.ireadyMap || {};
  S.settings.ireadyMap[nameKey] = codes;
}

function syncIreadyScores() {
  S.scores = S.scores.filter(x => x.source !== "iready");
  if (!S.settings.ireadyAutoScore) { save(); return 0; }
  let written = 0;
  S.iready.forEach(rec => {
    if (!rec.date) return;
    /* gather every mark this record implies, then average per standard so two
       domains pointing at one standard become a single mark, not two */
    const bucket = {};
    Object.keys(rec.domains || {}).forEach(dn => {
      const targets = domainTargets(normHdr(dn));
      if (!targets || !targets.length) return;
      const rank = placementRank((rec.domains[dn] || {}).p);
      const mk = placementToMark(rank);
      if (!mk) return;
      targets.forEach(code => {
        if (!byCode[code]) return;
        (bucket[code] = bucket[code] || { vals: [], why: [] });
        bucket[code].vals.push(mk);
        bucket[code].why.push(dn + ": " + (rec.domains[dn] || {}).p);
      });
    });
    Object.keys(bucket).forEach(code => {
      const b = bucket[code];
      S.scores.push({
        id: "ir-" + rec.id + "-" + code,
        sid: rec.sid, std: code,
        v: Math.round(avg(b.vals)),
        date: rec.date,
        note: b.why.join(" \u00b7 "),
        ctx: "iReady diagnostic",
        source: "iready"
      });
      written++;
    });
  });
  save();
  return written;
}

function ireadyMappingCardHTML() {
  const doms = knownDomains();
  const on = !!S.settings.ireadyAutoScore;
  const c = ireadyCuts();
  let h = '<div class="card pad"><div class="sectionhead"><h2>Turn iReady into standards marks</h2><span class="spacer"></span>' +
    '<label class="row small" style="gap:6px"><input type="checkbox" id="ir-auto"' + (on ? " checked" : "") + "> On</label></div>";
  h += '<p class="hint">A domain placement covers a wide band of skills, so treating it as evidence about one standard is a stretch. These marks show up in the class picture, grouping and student pages, but stay out of term marks unless you tick the box below.</p>';
  h += '<label class="row small" style="gap:6px;margin-top:8px"><input type="checkbox" id="ir-inreport"' + (S.settings.ireadyInReport ? " checked" : "") +
    "> Let these count toward term marks</label>";

  h += '<table style="margin-top:12px"><thead><tr><th>Mark</th><th>When the domain places the student</th></tr></thead><tbody>' +
    [4, 3, 2].map(mk => "<tr><td>" + markHTML(mk) + '</td><td><select data-ircut="' + mk + '">' +
      [1, 0, -1, -2, -3].map(x => '<option value="' + x + '"' + (x === c[mk] ? " selected" : "") + ">" + esc(rankWords(x)) + " or better</option>").join("") +
      "</select></td></tr>").join("") +
    "<tr><td>" + markHTML(1) + '</td><td class="muted small">anything lower</td></tr></tbody></table>';

  if (!doms.length) {
    h += '<p class="hint" style="margin-top:12px">No domains imported yet. Bring in a diagnostic results export and the mapping table appears here.</p></div>';
    return h;
  }
  h += '<h3 style="margin-top:16px">Which standard each domain speaks to</h3>';
  doms.forEach(d => {
    const targets = domainTargets(d.key);
    const subj = /phon|vocab|comprehen|high|word/.test(d.key) ? "ELA" : "Math";
    h += '<div style="border:1px solid var(--rule);border-radius:6px;padding:9px 11px;margin-top:9px">' +
      '<div class="row"><strong class="small" style="flex:1;min-width:170px">' + esc(d.label) + "</strong>" +
      "<span>" + (targets.length ? targets.map(t => codeHTML(t)).join(" ") : '<span class="tiny muted">not mapped \u2014 ignored</span>') + "</span></div>" +
      '<details style="margin-top:6px"><summary class="tiny muted" style="cursor:pointer">change</summary><div style="columns:2;margin-top:6px">' +
      CATALOG.filter(x => x.s === subj && stdListed(x)).map(x =>
        '<label class="row tiny" style="gap:6px;padding:1px 0"><input type="checkbox" data-irdom="' + esc(d.key) + '" data-code="' + x.c + '"' +
        (targets.indexOf(x.c) >= 0 ? " checked" : "") + "><span>" + esc(x.c + " " + x.lbl) + "</span></label>").join("") +
      "</div></details></div>";
  });
  const n = S.scores.filter(x => x.source === "iready").length;
  h += '<p class="hint" style="margin-top:12px">' + (on ? n + " mark" + (n === 1 ? "" : "s") + " currently written from iReady." : "Currently off.") + "</p></div>";
  return h;
}
function wireIreadyMapping(el) {
  const a = document.getElementById("ir-auto");
  if (a) a.onchange = () => { S.settings.ireadyAutoScore = a.checked; syncIreadyScores(); renderIReady(); };
  const b = document.getElementById("ir-inreport");
  if (b) b.onchange = () => { S.settings.ireadyInReport = b.checked; save(); renderIReady(); };
  el.querySelectorAll("[data-ircut]").forEach(sl => {
    sl.onchange = () => {
      S.settings.ireadyCuts = Object.assign(ireadyCuts(), {});
      S.settings.ireadyCuts[Number(sl.dataset.ircut)] = Number(sl.value);
      const c = ireadyCuts();
      if (!(c[4] >= c[3] && c[3] >= c[2])) toast("Cut points should go 4 \u2265 3 \u2265 2");
      syncIreadyScores(); renderIReady();
    };
  });
  el.querySelectorAll("[data-irdom][data-code]").forEach(cb => {
    cb.onchange = () => {
      const key = cb.dataset.irdom;
      const cur = domainTargets(key).slice();
      const i = cur.indexOf(cb.dataset.code);
      if (cb.checked) { if (i < 0) cur.push(cb.dataset.code); } else if (i >= 0) cur.splice(i, 1);
      setDomainTargets(key, cur);
      syncIreadyScores(); renderIReady();
    };
  });
}

/* ============================================================
   iREADY IN THE GROUPING
   ============================================================ */
function scoreAllowed(x) {
  const e = UI.groupEvidence || "both";
  if (e === "classroom") return x.source !== "iready";
  if (e === "iready") return x.source === "iready";
  return true;
}
function latestIready(sid, subject) {
  const a = S.iready.filter(r => r.sid === sid && (subject === "All" || r.subject === subject) && r.date)
    .sort((x, y) => x.date.localeCompare(y.date));
  return a.length ? a[a.length - 1] : null;
}
/* how much of a group is backed by classroom work, by iReady, or by both */
function groupEvidenceMix(g, days) {
  const out = { both: 0, classroom: 0, iready: 0 };
  g.kids.forEach(sid => {
    let c = false, i = false;
    g.stds.forEach(code => {
      S.scores.forEach(x => {
        if (x.sid !== sid || x.std !== code || x.v > 2 || !inWindow(x, days)) return;
        if (x.source === "iready") i = true; else c = true;
      });
    });
    if (c && i) out.both++; else if (c) out.classroom++; else if (i) out.iready++;
  });
  return out;
}
function evidenceLine(mix) {
  const bits = [];
  if (mix.both) bits.push('<strong>' + mix.both + " backed by both</strong>");
  if (mix.classroom) bits.push(mix.classroom + " from classwork only");
  if (mix.iready) bits.push(mix.iready + " from iReady only");
  if (!bits.length) return "";
  return '<div class="tiny muted" style="margin-top:6px">Evidence: ' + bits.join(" \u00b7 ") + "</div>";
}
/* groups straight off the domain placements, whatever the standard mapping says */
function ireadyDomainGroups(subject) {
  const map = {};
  S.students.forEach(st => {
    const r = latestIready(st.id, subject);
    if (!r) return;
    Object.keys(r.domains || {}).forEach(dn => {
      const p = (r.domains[dn] || {}).p;
      const rank = placementRank(p);
      if (rank == null || rank >= 0) return;
      (map[dn] = map[dn] || []).push({ st: st, rank: rank, p: p, date: r.date });
    });
  });
  return Object.keys(map)
    .map(k => ({ name: k, kids: map[k].sort((a, b) => a.rank - b.rank) }))
    .filter(g => g.kids.length >= 2)
    .sort((a, b) => b.kids.length - a.kids.length);
}
function ireadyDomainGroupsHTML(subject) {
  const gs = ireadyDomainGroups(subject);
  if (!gs.length) return "";
  let h = '<div class="divider"></div><div class="sectionhead"><h2>Below grade level on iReady</h2><span class="spacer"></span>' +
    '<span class="hint">Straight from the most recent diagnostic, whatever the standard mapping says.</span></div><div class="grid2">';
  gs.forEach(g => {
    h += '<div class="group"><h3><span class="tag reteach">Domain</span> ' + esc(g.name) +
      '<span class="spacer" style="flex:1"></span><span class="tiny muted">' + g.kids.length + "</span></h3><div class=\"body\">" +
      '<div class="namelist">' + g.kids.map(k =>
        "<span>" + esc(fullName(k.st)) + ' <span class="tiny muted">' + esc(k.p) + "</span></span>").join("") + "</div>" +
      '<div class="tiny muted">Diagnostic of ' + esc(g.kids[0].date || "") + "</div></div></div>";
  });
  return h + "</div>";
}
/* students whose scale score has stalled between diagnostics */
function ireadyGrowthFlags(subject) {
  const out = [];
  S.students.forEach(st => {
    ["Math", "ELA"].forEach(sj => {
      if (subject !== "All" && subject !== sj) return;
      const a = S.iready.filter(r => r.sid === st.id && r.subject === sj && r.date)
        .sort((x, y) => x.date.localeCompare(y.date));
      if (a.length < 2) return;
      const f = Number(a[0].overall), l = Number(a[a.length - 1].overall);
      if (!isFinite(f) || !isFinite(l)) return;
      if (l - f <= 0) {
        out.push({
          t: "growth", who: fullName(st),
          why: "iReady " + sj + " scale score has not moved since " + a[0].date + " (" + f + " then " + l + ")"
        });
      }
    });
  });
  return out;
}

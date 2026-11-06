/* gradebook/gb-fluency.js — The bridge to the ORF tool, the Fluency tab and the Reading progress scorecard.
   One of the gradebook's scripts, loaded in order by index.html as classic
   scripts sharing one global scope; see HANDOFF "The gradebook's files". */
/* ============================================================
   ORAL READING FLUENCY BRIDGE
   Norms: Hasbrouck & Tindal (2017), An update to compiled ORF norms
   (Technical Report No. 1702), University of Oregon. Grade 2 row.
   ============================================================ */
/* percentile: [fall, winter, spring] WCPM. The table lives in
   suite-orf.js, the one copy the whole suite reads. Without it there
   are no norms, so no ORF marks: syncOrfScores() then leaves the marks it
   has alone rather than deleting them, and the Fluency tab says why. */
const ORF_NORMS = window.SuiteOrf ? window.SuiteOrf.norms(2) : null;
/* the rule is suite-orf.js's, read against the calendar's lines */
function seasonOf(dateStr) {
  return window.SuiteOrf ? window.SuiteOrf.seasonIndex(String(dateStr), S.settings.orfSeason) : 0;
}
const SEASON_NAME = ["Fall", "Winter", "Spring"];
function pctBand(wcpm, season) {
  const w = Number(wcpm);
  if (!isFinite(w)) return null;
  if (!ORF_NORMS) return null;
  const order = [90, 75, 50, 25, 10];
  for (const p of order) if (w >= ORF_NORMS[p][season]) return p;
  return 0;
}
/* a percentile the table doesn't publish (it has 10, 25, 50, 75, 90)
   is read on the straight line between its neighbours: the 20th is two
   thirds of the way from the 10th to the 25th (fall 32, winter 51, spring 62) */
const ORF_PUBLISHED = [10, 25, 50, 75, 90];
function normEstimated(p) { return ORF_PUBLISHED.indexOf(Number(p)) < 0; }
function normAt(p, season) {
  if (!ORF_NORMS) return null;
  p = Number(p);
  if (ORF_NORMS[p]) return ORF_NORMS[p][season];
  const lo = ORF_PUBLISHED.filter(x => x < p).pop(), hi = ORF_PUBLISHED.find(x => x > p);
  if (lo == null || hi == null) return null;
  const a = ORF_NORMS[lo][season], b = ORF_NORMS[hi][season];
  if (a == null || b == null) return null;
  return Math.round(a + (b - a) * (p - lo) / (hi - lo));
}
/* Report card marks are graded against END-OF-YEAR expectations: a 3 is the
   end-of-year 50th percentile (100 in grade 2) whenever the check was taken,
   so a fall 50 — on the fall 50th — is a 1, as it would be on the report
   card. "season" is the older behaviour, each check against its own window's
   norms, kept as a choice on the Fluency tab. */
/* "fall" is his choice: every check against the fall column, a 4 at
   the 90th, a 3 at the 75th, a 2 at the 20th, whenever it was read */
function orfBasis() { const a = S.settings.orfAgainst; return a === "season" || a === "eoy" || a === "fall" ? a : "wcpm"; }
/* the one column a rule reads every check against, or null for "its own season" */
function orfFixedSeason() { const b = orfBasis(); return b === "fall" ? 0 : b === "eoy" ? 2 : null; }
/* what the ORF marks were last written under: the rule, and for the bands
   the bands themselves, so changing either re-marks every check */
function orfMarksKey() {
  const b = orfBasis(), c = b === "wcpm" ? (S.settings.orfWcpm || {}) : (S.settings.orfCuts || {});
  return b + ":" + c[2] + "/" + c[3] + "/" + c[4];
}
function wcpmToMark(wcpm, season) {
  if (orfBasis() === "wcpm") {
    const w = Number(wcpm), c = Object.assign({ 2: 20, 3: 80, 4: 101 }, S.settings.orfWcpm || {});
    if (!isFinite(w) || w < 0) return null;
    return w >= c[4] ? 4 : w >= c[3] ? 3 : w >= c[2] ? 2 : 1;
  }
  /* the WCPM at each cut, so a cut between published percentiles works */
  const w = Number(wcpm), se = orfFixedSeason() != null ? orfFixedSeason() : season;
  if (!isFinite(w) || !ORF_NORMS) return null;
  const cuts = S.settings.orfCuts;                        /* percentile floor for each mark */
  for (const mk of [4, 3, 2]) { const n = normAt(cuts[mk], se); if (n != null && w >= n) return mk; }
  return 1;
}


/* ---------- live link to the running-records tool on this computer ---------- */
const ORF_KEY = "running-records-v1";
function readOrfDB() {
  try {
    const raw = window.localStorage.getItem(ORF_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.records) || !Array.isArray(d.students)) return null;
    return d;
  } catch (e) { return null; }
}
function splitOrfName(n) {
  if (window.SuiteOrf) { const p = window.SuiteOrf.splitName(n); return { first: p.first, last: p.last, eld: p.eld }; }
  const t = String(n == null ? "" : n).trim();
  return { first: "", last: t, eld: false };
}
function orfStudentToLocal(orfSid, db) {
  /* a child the gradebook put on the ORF tool's roster carries its
     gradebook id in its own */
  if (/^gb:/.test(String(orfSid))) {
    const own = S.students.find(x => "gb:" + x.id === orfSid);
    if (own) { S.orfLink[orfSid] = own.id; return own; }
  }
  if (S.orfLink[orfSid]) {
    const hit = S.students.find(x => x.id === S.orfLink[orfSid]);
    if (hit) return hit;
  }
  const os = (db.students || []).find(x => x.id === orfSid);
  if (!os) return null;
  const p = splitOrfName(os.name);
  const m = matchStudent(p.first, p.last, "");
  if (m) { S.orfLink[orfSid] = m.id; if (p.eld) m.eld = true; }
  return m;
}
/* ---------- the roster goes one way, gradebook to ORF tool ----------
   The gradebook's roster is the class. Its children are put on the ORF
   tool's roster (so they are there to pick on Assess) under their roster
   names. ELD is the roster's flag now: a tag typed on an ORF name is moved
   onto the flag first, then the name is written without it (the ORF tool
   reads a trailing tag as a surname, so "Ben Cole (ELD)" sorted as
   "(ELD), Ben Cole"). A child with no ORF entry gets
   one whose id is "gb:" + the gradebook id, so two computers add the same
   entry and the sync merge folds it. Nothing is ever taken off the ORF
   roster: a child who left keeps their checks there, and an ORF entry the
   gradebook cannot place is left as it is. An entry is renamed only when it
   is the one ORF entry for its child, so two entries for one child are not
   given the same name; the one exception to "never taken off" is a "gb:"
   entry made here before the child's own entry arrived from the other
   computer, with nothing read on it. The ORF tool's own write guard merges this in
   if the ORF page is open, and it reads storage fresh each time here, so
   nothing is held that could go stale. Writes only when something changed. */
let rosterPushedSig = null;
function orfRosterName(st) { return fullName(st); }
function pushRosterToOrf(force) {
  if (!S.students.length) return 0;
  const sig = JSON.stringify(S.students.map(x => [x.id, x.first, x.last, !!x.eld]));
  if (!force && sig === rosterPushedSig) return 0;
  let raw = null;
  try { raw = localStorage.getItem(ORF_KEY); } catch (e) { return 0; }
  let db = null;
  try { db = raw ? JSON.parse(raw) : null; } catch (e) { return 0; }         /* unreadable: never overwrite it */
  if (raw && !(db && Array.isArray(db.students))) return 0;
  if (!db) db = { students: [], records: [], passages: [], settings: {} };
  if (!Array.isArray(db.records)) db.records = [];
  const byChild = {};
  db.students.forEach(o => {
    if (!o || !o.id || o.demo) return;
    const st = orfStudentToLocal(o.id, db);
    if (st) (byChild[st.id] = byChild[st.id] || []).push(o);
  });
  let added = 0, renamed = 0;
  S.students.forEach(st => {
    const mine = byChild[st.id] || [];
    const want = orfRosterName(st);
    if (!mine.length) {
      db.students.push({ id: "gb:" + st.id, name: want });
      S.orfLink["gb:" + st.id] = st.id;
      added++;
    } else if (mine.length > 1) {
      /* an entry added here before the child's own ORF entry arrived from
         the other computer: the added one goes if nothing was ever read on
         it, the same way on every computer */
      const used = new Set(db.records.map(r => r.studentId));
      const spare = mine.filter(o => /^gb:/.test(o.id) && !used.has(o.id));
      if (spare.length && spare.length < mine.length) {
        db.students = db.students.filter(o => spare.indexOf(o) < 0);
        spare.forEach(o => { delete S.orfLink[o.id]; });
        renamed++;
      }
    } else if (mine.length === 1 && mine[0].name !== want) {
      /* a tag typed there becomes the roster's flag before it is dropped */
      if (!st.eld && window.SuiteOrf && window.SuiteOrf.stripEld(mine[0].name).eld) st.eld = true;
      mine[0].name = orfRosterName(st);
      renamed++;
    }
  });
  rosterPushedSig = JSON.stringify(S.students.map(x => [x.id, x.first, x.last, !!x.eld]));
  if (added || renamed) {
    try { localStorage.setItem(ORF_KEY, JSON.stringify(db)); }
    catch (e) { return 0; }
    /* the links and any ELD flag found above are the gradebook's: kept
       without going back through save(), which called this */
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { }
  }
  return added + renamed;
}
function importOrfRoster() {
  const db = readOrfDB();
  if (!db) { toast("No ORF tool data found in this browser"); return; }
  let added = 0, linked = 0;
  (db.students || []).forEach(os => {
    if (os.demo) return;
    const p = splitOrfName(os.name);
    let m = matchStudent(p.first, p.last, "");
    if (!m) {
      m = { id: uid(), first: p.first, last: p.last, sid: "", eld: !!p.eld };
      S.students.push(m); added++;
    } else { linked++; if (p.eld) m.eld = true; }
    S.orfLink[os.id] = m.id;
  });
  save(); renderORF();
  toast("Added " + added + " students" + (linked ? " \u00b7 " + linked + " already here" : ""));
}
/* ---------- one copy per reading, whichever computer made it ----------
   Each computer that opened the gradebook used to make its own copy of a
   new reading, under an id of its own, and the sync merge (which matches
   records by id) kept both: every reading counted twice, and a correction
   reached only one of them. A copy's id is now derived from the reading
   ("orf:" + its id in the ORF tool), so two computers make the same record
   and the merge folds them into one. Copies made before v83 are folded
   here: one per reading is kept, chosen the same way on every computer
   (the derived id if there is one, else the lowest id), so two computers
   never each keep a different one and between them delete both. The same
   goes for iReady rows, where one file imported on two computers made two
   of every row; a row is one child, one subject, one date, which is what
   the import itself treats as a duplicate. */
function foldCopies(arr, keyOf, preferId, fold) {
  const groups = new Map();
  arr.forEach(r => {
    const k = keyOf(r); if (k == null) return;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  });
  const drop = new Set();
  groups.forEach((g, k) => {
    if (g.length < 2) return;
    const want = preferId ? preferId(k) : null;
    const keep = g.find(r => r.id === want) || g.slice().sort((a, b) => String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0)[0];
    if (fold) fold(keep, g);
    g.forEach(r => { if (r !== keep) drop.add(r); });
  });
  return drop.size ? { list: arr.filter(r => !drop.has(r)), dropped: drop.size } : { list: arr, dropped: 0 };
}
function orfCopyId(srcId) { return "orf:" + srcId; }
function foldOrfCopies() {
  const res = foldCopies(S.orf, r => r.srcId ? String(r.srcId) : null, orfCopyId, (keep, g) => {
    /* what the teacher decided about the reading, on any computer */
    if (g.some(r => r.exclude)) keep.exclude = true;
    if (g.some(r => r.link)) keep.link = true;
    if (keep.srcDay == null) { const d = g.map(r => r.srcDay).filter(Boolean).sort()[0]; if (d) keep.srcDay = d; }
    /* a date moved by hand on one computer, if the kept copy was not moved */
    const moved = g.filter(r => r.srcDay && r.date !== r.srcDay).map(r => r.date).sort();
    if (moved.length && !(keep.srcDay && keep.date !== keep.srcDay)) keep.date = moved[0];
  });
  S.orf = res.list;
  return res.dropped;
}
function foldIreadyRows() {
  const res = foldCopies(S.iready, r => r.date ? r.sid + "|" + r.subject + "|" + r.date : null, null, null);
  S.iready = res.list;
  return res.dropped;
}
/* Folds duplicates and rebuilds the marks they made. Writes only when it
   changed something, so running it on every reload cannot loop between tabs. */
function settleCopies() {
  const o = foldOrfCopies(), i = foldIreadyRows();
  if (i) syncIreadyScores();
  if (o) syncOrfScores();
  else if (i) save();
  return o + i;
}

/* A copy of one of the tool's readings. The tool is where a reading
   is recorded and corrected, so a copy follows it: the numbers always, the
   day only while the copy still has the day last seen there (srcDay), so a
   date moved here by hand stays moved. */
function orfCopyValues(rec) {
  return {
    wcpm: Math.round(Number(rec.wcpm) || 0),
    accuracy: rec.accuracy == null ? null : Math.round(Number(rec.accuracy)),
    errors: rec.errors == null ? null : Number(rec.errors),
    sc: rec.sc == null ? null : Number(rec.sc),
    passage: rec.passageTitle || ""
  };
}
function syncFromOrf(silent) {
  const db = readOrfDB();
  if (!db) { if (!silent) toast("No ORF tool data found in this browser"); return 0; }
  const folded = foldOrfCopies();
  let added = 0, unmatched = 0, redated = 0, updated = 0, gone = 0;
  const live = new Set();
  /* the tool's sample class does not count as readings */
  const demo = new Set((db.students || []).filter(o => o && o.demo).map(o => o.id));
  let real = 0;
  db.records.forEach(rec => {
    if (rec && rec.id) live.add(rec.id);
    if (rec && !demo.has(rec.studentId)) real++;
    const had = S.orf.find(r => r.srcId === rec.id);
    if (had) {
      let changed = false;
      /* A reading brought in by an older build carries the UTC day. Move it
         only if it still holds exactly that value, so a date corrected by
         hand is never touched. Converges: it is wrong every time it is seen. */
      const utc = String(rec.date || "").slice(0, 10), local = localDayOf(rec.date);
      if (had.date === utc && local !== utc && /^\d{4}-\d{2}-\d{2}$/.test(local)) { had.date = local; redated++; }
      /* this copy is known to come from the tool on this computer, so
         the tool's version of it is the true one from now on */
      had.link = true;
      if (had.gone) { had.gone = false; changed = true; }
      /* a check moved to a different student in the tool (saved under
         the wrong name) moves here too. The tool says whose it is, as it
         says the numbers; a child it cannot match here leaves the copy be. */
      const owner = orfStudentToLocal(rec.studentId, db);
      if (owner && had.sid !== owner.id) { had.sid = owner.id; changed = true; }
      const v = orfCopyValues(rec);
      Object.keys(v).forEach(k => {
        const was = had[k] == null ? null : had[k];
        if (was !== v[k]) { had[k] = v[k]; changed = true; }
      });
      if (/^\d{4}-\d{2}-\d{2}$/.test(local)) {
        if (had.srcDay == null) {
          /* first time seen by adopt the tool's day as the one to
             follow only if the copy already has it. A copy on another day
             may have been moved by hand, and there is no telling. */
          if (had.date === local) had.srcDay = local;
        } else if (had.srcDay !== local) {
          if (had.date === had.srcDay) { had.date = local; changed = true; }
          had.srcDay = local;
        }
      }
      if (changed) updated++;
      return;
    }
    const st = orfStudentToLocal(rec.studentId, db);
    if (!st) { unmatched++; return; }
    const d = localDayOf(rec.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
    S.orf.push(Object.assign({ id: orfCopyId(rec.id), srcId: rec.id, sid: st.id, date: d, srcDay: d, link: true },
      orfCopyValues(rec), { exclude: false }));
    added++;
  });
  /* A reading deleted in the tool is set aside here, not deleted: it stops
     counting towards marks and drops out of every list, and it comes back
     by itself if the reading reappears (a sync that had not arrived yet, a
     restored backup). Only copies seen in this tool since v82 are judged,
     so a reading brought in from a file on another computer is never taken
     for a deleted one; and a tool with no readings at all (a fresh browser,
     say, or one holding only its sample class) is not taken as "every
     reading was deleted". */
  if (real) S.orf.forEach(r => {
    if (r.link && r.srcId && !r.gone && !live.has(r.srcId)) { r.gone = true; gone++; }
  });
  if (added || redated || updated || gone || folded) syncOrfScores(); else save();
  if (!silent) {
    const bits = [];
    if (added) bits.push("brought in " + added + " new reading" + (added === 1 ? "" : "s"));
    if (updated) bits.push(updated + " changed in the ORF tool");
    if (gone) bits.push(gone + " removed there, set aside here");
    if (unmatched) bits.push(unmatched + " unmatched");
    toast(bits.length ? bits.join(" \u00b7 ").replace(/^./, c => c.toUpperCase()) : "Already up to date");
    renderORF();
  }
  return added;
}

/* ---------- generic reader for whatever shape the ORF tool exports ---------- */
function collectArrays(node, path, out, depth) {
  if (depth > 7 || node == null) return;
  if (Array.isArray(node)) {
    if (node.length && typeof node[0] === "object" && node[0] !== null && !Array.isArray(node[0]))
      out.push({ path: path || "(root)", arr: node });
    node.slice(0, 200).forEach((v, i) => collectArrays(v, path + "[" + i + "]", out, depth + 1));
  } else if (typeof node === "object") {
    Object.keys(node).forEach(k => collectArrays(node[k], path ? path + "." + k : k, out, depth + 1));
  }
}
function keyUnion(arr) {
  const s = new Set();
  arr.slice(0, 80).forEach(o => Object.keys(o || {}).forEach(k => s.add(k)));
  return Array.from(s);
}
function scoreCandidate(keys) {
  let sc = 0;
  const has = re => keys.some(k => re.test(k));
  if (has(/wcpm|wordscorrect|words_correct|correctperminute|cwpm/i)) sc += 6;
  if (has(/^date$|date|when|timestamp|assessed/i)) sc += 3;
  if (has(/student|sid|pupil|child|name/i)) sc += 2;
  if (has(/error|accuracy|selfcorrect|miscue/i)) sc += 2;
  if (has(/passage|title|level/i)) sc += 1;
  return sc;
}
function buildPeopleIndex(root) {
  const idx = {};
  (function walk(n, d) {
    if (d > 7 || n == null) return;
    if (Array.isArray(n)) return n.slice(0, 400).forEach(v => walk(v, d + 1));
    if (typeof n !== "object") return;
    const keys = Object.keys(n);
    const idk = keys.find(k => /^id$|studentid|_id|uid/i.test(k));
    const fk = keys.find(k => /^first|firstname|given/i.test(k));
    const lk = keys.find(k => /^last|lastname|surname|family/i.test(k));
    const nk = keys.find(k => /^name$|fullname|student$/i.test(k));
    if (idk && (nk || (fk && lk))) {
      idx[String(n[idk])] = nk ? String(n[nk]) : (String(n[fk]) + " " + String(n[lk]));
    }
    keys.forEach(k => walk(n[k], d + 1));
  })(root, 0);
  return idx;
}
function resolveStudent(raw, people) {
  if (raw == null) return null;
  let label = String(raw);
  if (people[label]) label = people[label];
  label = stripEldTag(label).name.trim();
  if (!label) return null;
  let first = "", last = "";
  if (label.indexOf(",") >= 0) { const p = label.split(","); last = p[0]; first = p[1] || ""; }
  else { const w = label.split(/\s+/); first = w.shift() || ""; last = w.join(" "); }
  let m = matchStudent(first, last, "");
  if (!m) m = matchStudent(last, first, "");
  if (!m) m = S.students.find(s => normName(s.first + s.last) === normName(label.replace(/[, ]/g, "")));
  return m || null;
}

/* ---------- writing ORF results into the gradebook ---------- */
function syncOrfScores() {
  const code = S.settings.orfStandard;
  /* suite-orf.js missing: keep the marks there are (the bands need no norms) */
  if (!ORF_NORMS && orfBasis() !== "wcpm") { save(); return; }
  S.settings.orfMarksBasis = orfMarksKey();
  S.scores = S.scores.filter(x => x.source !== "orf");
  if (!S.settings.orfAutoScore) { save(); return; }
  S.orf.filter(r => !r.exclude && !r.gone).forEach(r => {
    const m = wcpmToMark(r.wcpm, seasonOf(r.date));
    if (!m) return;
    S.scores.push({
      id: "orf-" + r.id, sid: r.sid, std: code, v: m, date: r.date,
      note: r.wcpm + " WCPM" + (r.accuracy ? ", " + r.accuracy + "% accurate" : ""),
      ctx: "ORF check", source: "orf"
    });
  });
  save();
}

/* ============================================================
   TAB — FLUENCY (ORF)
   ============================================================ */
/* ============================================================
   THE ORF TOOL'S ANALYSIS, IN THE GRADEBOOK
   Reading goals, the aim line, one verdict, flags, comprehension, missed-
   word patterns and suggested reading groups. All of it is read live from
   the ORF tool's own storage (running-records-v1, suite:orfgoals:v1,
   suite:orfcomp:v1) and worked out by suite-orf.js, the same code the ORF
   page runs, so the two can never disagree. The copies in S.orf are only
   for marks. Goals and comprehension are written back to their own keys,
   read fresh and written whole each time (nothing held in memory to go
   stale), so the ORF page and the other computer see them.
   ============================================================ */
const ORF_GOALS_KEY = "suite:orfgoals:v1", ORF_COMP_KEY = "suite:orfcomp:v1", ORF_NOTES_KEY = "suite:orfnotes:v1";
function orfJSON(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
function orfGoalsReady() { return !!(window.SuiteOrf && window.SuiteOrf.goals); }
function orfGoalsState() { return window.SuiteOrf.goals.normGoals(orfJSON(ORF_GOALS_KEY)); }
function orfCompState() { return window.SuiteOrf.goals.normComp(orfJSON(ORF_COMP_KEY)); }
/* what the student said on missed words, and how long the timer was
   paused, per check (fluency-assess.js writes it; read-only here) */
function orfNotesState() { return window.SuiteOrf.notes ? window.SuiteOrf.notes.norm(orfJSON(ORF_NOTES_KEY)) : { records: {} }; }
function orfWrite(k, mutate) {
  const cur = k === ORF_GOALS_KEY ? orfGoalsState() : orfCompState();
  mutate(cur);
  try { localStorage.setItem(k, JSON.stringify(cur)); return true; }
  catch (e) { toast("Could not save \u2014 browser storage may be full"); return false; }
}
/* the ORF tool's students with a gradebook name beside them where linked */
function orfPeople(db) {
  return (db.students || []).filter(o => o && o.id && !o.demo).map(o => {
    const st = orfStudentToLocal(o.id, db);
    const nm = st ? fullName(st) : (window.SuiteOrf ? window.SuiteOrf.stripEld(o.name).name : String(o.name || ""));
    return { o: o, st: st, name: nm, eld: st ? !!st.eld : (window.SuiteOrf ? window.SuiteOrf.stripEld(o.name).eld : false) };
  }).sort((a, b) => a.name.localeCompare(b.name));
}
/* text in the amber reads in --s2-ink (6.2:1); --s2 itself stays for fills */
const ORF_STATUS_INK = c => c === "var(--s2)" ? "var(--s2-ink)" : c;
function orfDay(t) { const d = new Date(t); return window.SuiteOrf.goals.fmtShort(d); }
/* the one verdict: the student's own goal and aim line, nothing else */
function orfVerdict(pl) {
  const G = window.SuiteOrf.goals;
  const goal = pl.goal + (pl.comp ? " with all 3 comprehension questions" : "");
  if (pl.result) {
    let s = "Spring check " + pl.springActual + (pl.springComp != null ? " (" + pl.springComp + "/3)" : "") + ": " + G.statusLabel(pl).toLowerCase() + " (" + goal + ").";
    if (pl.flagged) s += " Flagged: below " + pl.expectation + ", within the margin of error.";
    return s;
  }
  if (pl.status === "start") return "First check " + pl.base + " on " + orfDay(pl.baseDate) + ". Goal " + goal + " by " + G.fmtLong(pl.goalDate) + ".";
  let s = "Latest " + pl.latestY + " on " + orfDay(pl.latest.t) + ", " +
    (pl.diff === 0 ? "on" : Math.abs(pl.diff) + (pl.diff > 0 ? " above" : " below")) + " the aim line.";
  if (pl.status === "met") s += " Already at the goal of " + goal + ".";
  else if (pl.perWeekNow != null) s += " Reaching " + goal + " by " + G.fmtLong(pl.goalDate) + " takes about " + Math.max(0, pl.perWeekNow).toFixed(1) + " words a week.";
  if (pl.belowRun >= 3) s += " " + pl.belowRun + " checks in a row below the aim line: time to change the plan.";
  return s;
}
function orfAimSVG(pl) {
  const t0 = pl.baseDate.getTime(), t1 = pl.goalDate.getTime() + 14 * 864e5;
  const ys = pl.checks.map(c => c.y).concat([pl.goal, pl.base, pl.winterGoal || 0]);
  const yMax = Math.ceil(Math.max.apply(null, ys) * 1.12 / 10) * 10, yMin = Math.max(0, Math.floor(Math.min.apply(null, ys) * 0.8 / 10) * 10);
  const W = 640, H = 220, L = 36, R = 12, T = 12, B = 26;
  const X = t => L + (W - L - R) * (t - t0) / Math.max(1, t1 - t0), Y = v => T + (H - T - B) * (1 - (v - yMin) / Math.max(1, yMax - yMin));
  let path = "";
  for (let t = t0; t <= pl.goalDate.getTime(); t += 3 * 864e5) path += (path ? "L" : "M") + X(t).toFixed(1) + " " + Y(pl.aim(t)).toFixed(1);
  path += "L" + X(pl.goalDate.getTime()).toFixed(1) + " " + Y(pl.goal).toFixed(1);
  let g = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Checks against the aim line" style="width:100%;max-width:760px;height:auto;display:block;margin-top:8px">';
  for (let v = yMin; v <= yMax; v += (yMax - yMin > 120 ? 40 : 20)) {
    g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="var(--line)" stroke-width="1"/>' +
      '<text x="' + (L - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + v + "</text>";
  }
  const d0 = new Date(t0);
  for (let y = d0.getFullYear(), m = d0.getMonth() + 1; ; m++) {
    if (m > 11) { m = 0; y++; }
    const t = new Date(y, m, 1).getTime(); if (t > t1) break;
    g += '<text x="' + X(t) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="var(--muted)">' + window.SuiteOrf.goals.MONTHS[m].slice(0, 3) + "</text>";
  }
  g += '<path d="' + path + '" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="6 4"/>';
  if (pl.winterDue && pl.winterGoal != null) g += '<circle cx="' + X(pl.winterDue.getTime()) + '" cy="' + Y(pl.winterGoal) + '" r="4" fill="none" stroke="var(--accent)" stroke-width="2"/>';
  g += '<circle cx="' + X(pl.goalDate.getTime()) + '" cy="' + Y(pl.goal) + '" r="5" fill="var(--accent)"/>';
  pl.checks.forEach(c => {
    const under = c.t > t0 && c.y < pl.aim(c.t);
    g += '<circle cx="' + X(c.t).toFixed(1) + '" cy="' + Y(c.y).toFixed(1) + '" r="4.5" fill="' + (under ? "var(--s1)" : "var(--s3)") + '"><title>' + orfDay(c.t) + ": " + c.y + "</title></circle>";
  });
  return g + "</svg>";
}
/* ============================================================
   READING PROGRESS — one scorecard for the class
   One row per child: the latest check and its percentile, this month's
   goal and where they are against the aim line, the mid-year and end-of-
   year goals with the percentile each works out to in its own season, and
   the start-to-goal track. A row opens to the month-by-month goals, the
   aim-line chart, goal settings and every check. It replaced v126's
   Reading goals tracks, v130's Goals at a glance and Where the class sits,
   which said the same things three ways. Every number is the plan's
   (SuiteOrf.goals.planFor): nothing is recomputed here.
   ============================================================ */
function orfOrd(n) { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
/* a WCPM as a percentile of the grade's norms for one season (0 fall, 1
   winter, 2 spring), read between the published rows as the WIN lists do */
function orfPctOf(w, se, grade) {
  const N = window.SuiteOrf.norms(grade), P = [10, 25, 50, 75, 90], v = P.map(p => N[p][se]);
  if (w < v[0]) return { label: "below 10th", band: 0 };
  if (w > v[4]) return { label: "above 90th", band: 5 };
  for (let i = 0; i < 4; i++) if (w >= v[i] && w <= v[i + 1]) {
    const f = v[i + 1] === v[i] ? 0 : (w - v[i]) / (v[i + 1] - v[i]);
    return { label: orfOrd(Math.round(P[i] + f * (P[i + 1] - P[i]))), band: i + 1 };
  }
  return { label: "50th", band: 3 };
}
function orfIso(t) { const d = new Date(t); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
/* The scorecard's words for where a child is (the teacher's, v134):
   exceeding goal = more than the margin above the aim line, or already at
   the goal; on track = within the margin of the line either way; needs
   attention = further below it than that. After the spring check the result
   words stay (Made the goal, Goal not made...), sorted with the nearest kind.
   The margin scales with the reader (SuiteOrf.goals.band): a flat 10 words is about 10%
   of a 100-word reader and half of a 20-word one. */
const ORF_KIND_COLOR = { exceeding: "var(--s4)", on: "var(--s3)", attention: "var(--s1)", start: "var(--ink-3)" };
/* the margin and the kinds live in suite-orf.js (goals.band,
   goals.cardStatus), shared with the Assess tab's last-check comparison */
const ORF_BAND_FLOOR = window.SuiteOrf ? window.SuiteOrf.goals.BAND_FLOOR : 3;
function orfCardStatus(pl) {
  const st = window.SuiteOrf.goals.cardStatus(pl);
  return Object.assign(st, { color: ORF_KIND_COLOR[st.kind] });
}
/* the columns every child's months fall into: each month (the aim line at
   its end), the mid-year checkpoint where it falls, the end-of-year goal */
function orfMonthCols(withPlan) {
  const keyOf = mo => mo.checkpoint === "winter" ? "winter" : mo.checkpoint === "spring" ? "spring" : mo.y + "-" + mo.m;
  const cols = new Map();
  withPlan.forEach(({ pl }) => pl.months.forEach(mo => {
    const k = keyOf(mo);
    if (!cols.has(k)) cols.set(k, { key: k, kind: mo.checkpoint || "month", m: mo.m, t: mo.by.getTime(), by: mo.by });
  }));
  return { keyOf: keyOf, list: [...cols.values()].sort((a, b) => a.t - b.t) };
}
/* one month's cell: the goal, then that month's latest check (the mid-year
   one against the mid-year goal) */
function orfMonthCell(pl, mo, kind) {
  const ck = mo && mo.checks.length ? mo.checks[mo.checks.length - 1] : null;
  if (!ck) return { goal: mo ? mo.target : null, check: "", up: null };
  const start = ck.t === pl.baseDate.getTime(), up = ck.vs >= 0;
  return { goal: mo.target, check: ck.y + (start ? " start" : up ? " \u2713" : " \u2717"), up: start ? null : up,
    said: window.SuiteOrf.goals.fmtShort(new Date(ck.t)) + ": " + ck.y + (start ? ", the first check" : ", " +
      (ck.vs === 0 ? "right on " : Math.abs(ck.vs) + (up ? " above " : " below ")) + (kind === "winter" ? "the mid-year goal" : "the aim line that day")) };
}
/* everything one row shows, worked out once for the screen and the sheet */
function orfRowFacts(p, pl, gs, now) {
  const G = window.SuiteOrf.goals, grade = gs.grade;
  const st = orfCardStatus(pl), se = seasonOf(orfIso(pl.latest.t));
  const f = { st: st, now: pl.latestY, nowDate: G.fmtShort(new Date(pl.latest.t)), se: se, pNow: orfPctOf(pl.latestY, se, grade) };
  f.month = pl.thisMonth ? pl.thisMonth.target : null;
  f.mid = pl.winterDue ? pl.winterGoal : null;
  f.pMid = f.mid != null ? orfPctOf(f.mid, 1, grade) : null;
  if (f.mid == null) f.midSub = "";
  else if (pl.winterActual != null) f.midSub = pl.winterActual >= f.mid ? "met: read " + pl.winterActual : "read " + pl.winterActual + ", " + (f.mid - pl.winterActual) + " short";
  else f.midSub = (f.mid > pl.latestY ? (f.mid - pl.latestY) + " to go" : "already there") + " \u00b7 " + f.pMid.label + " winter";
  /* on the card the percentile gets its own line; the sentence is for the sheet */
  f.midLines = pl.winterActual != null || f.mid == null ? [f.midSub] : [f.mid > pl.latestY ? (f.mid - pl.latestY) + " to go" : "already there", f.pMid.label + " for winter"];
  f.eoy = pl.goal; f.pEoy = orfPctOf(pl.goal, 2, grade);
  f.eoySub = pl.result ? "read " + pl.springActual : pl.latestY >= pl.goal ? "already there" : pl.perWeekNow != null ? Math.max(0, pl.perWeekNow).toFixed(1) + " words a week" : "";
  f.flag = pl.belowRun >= 3 ? pl.belowRun + " checks in a row below the aim line: time to change the plan"
    : pl.flagged ? "below the grade-level line, within the margin of error" : "";
  return f;
}
/* "the 39th percentile", "below the 10th percentile", in a sentence */
function orfPctWords(pc) {
  const m = /^(below|above) (.+)$/.exec(pc.label);
  return m ? m[1] + " the " + m[2] + " percentile" : "the " + pc.label + " percentile";
}
function orfSummary(p, pl, f) {
  const G = window.SuiteOrf.goals;
  const goal = pl.goal + (pl.comp ? " with all 3 comprehension questions" : "");
  if (pl.result) return orfVerdict(pl) + " That was " + orfPctWords(orfPctOf(pl.springActual, 2, pl.grade)) + " for spring.";
  let s = f.st.kind === "start" ? "First check " + pl.base + " on " + f.nowDate + "."
    : "Latest " + pl.latestY + " on " + f.nowDate + ": " + f.st.label.toLowerCase() + ", " +
      (pl.diff === 0 ? "right on the aim line" : Math.abs(pl.diff) + (pl.diff > 0 ? " above" : " below") + " the aim line") + ".";
  s += " Now " + orfPctWords(f.pNow) + " for " + SEASON_NAME[f.se].toLowerCase() + ".";
  if (f.mid != null && pl.winterActual == null) s += " The mid-year goal of " + f.mid + " is about " + orfPctWords(f.pMid) + " for winter, and the";
  else s += " The";
  s += " end-of-year goal of " + goal + " about " + orfPctWords(f.pEoy) + " for spring.";
  if (pl.status === "met") s += " Already at it.";
  else if (pl.perWeekNow != null) s += " Getting there by " + G.fmtLong(pl.goalDate) + " takes about " + Math.max(0, pl.perWeekNow).toFixed(1) + " words a week.";
  return s;
}
/* the card's order, which the sheet keeps: A-Z, or the children who need
   a change first (flagged, then needs attention, first check, on track,
   exceeding), furthest below the line first within each; no checks last */
function orfOrderRows(rows, facts) {
  const rank = x => !x.pl ? 9 : x.pl.belowRun >= 3 || x.pl.flagged ? -1 : facts.get(x.p.o.id).st.rank;
  return rows.slice().sort((a, b) => UI.orfOrder === "name" ? a.p.name.localeCompare(b.p.name)
    : rank(a) - rank(b) || (a.pl && b.pl ? a.pl.diff - b.pl.diff : 0) || a.p.name.localeCompare(b.p.name));
}
function orfScorecardHTML(rows, now, gs) {
  const G = window.SuiteOrf.goals, withPlan = rows.filter(x => x.pl);
  let h = '<div class="card pad" id="orf-progress"><div class="sectionhead"><h2>Reading progress</h2><span class="spacer"></span>' +
    (withPlan.length ? '<div class="row sc-tools"><span class="small muted">Order</span><span class="segmented">' +
      '<button type="button" aria-pressed="' + (UI.orfOrder !== "name") + '" onclick="UI.orfOrder=\'need\';renderORF()">Needs attention first</button>' +
      '<button type="button" aria-pressed="' + (UI.orfOrder === "name") + '" onclick="UI.orfOrder=\'name\';renderORF()">A\u2013Z</button></span>' +
      '<button type="button" class="btn primary" onclick="printOrfSheet()">Download PDF</button></div>' : "") + "</div>" +
    '<p class="hint" style="margin-top:4px">Words correct per minute. Every goal comes from the child\u2019s own aim line; percentiles are Hasbrouck &amp; Tindal (2017) grade ' + gs.grade +
    " norms. On track means within the margin of error of the aim line, either way: 10% of the line, at least " + ORF_BAND_FLOOR + " words and at most " + gs.margin +
    ". More than that above is exceeding goal; more than that below needs attention. Tap a name to see every check.</p>";
  /* the card is left open: How goals are set closes it */
  if (!withPlan.length) return h + '<p class="hint" style="margin-top:6px">No checks this school year yet.</p>';
  const facts = new Map(withPlan.map(x => [x.p.o.id, orfRowFacts(x.p, x.pl, gs, now)]));
  const top = Math.max.apply(null, withPlan.map(x => Math.max(x.pl.goal, x.pl.latestY, x.pl.base, x.pl.winterGoal || 0)));
  const step = top > 150 ? 40 : 20, MAX = Math.ceil(top * 1.05 / step) * step;
  const P = v => (Math.max(0, Math.min(MAX, v)) / MAX * 100).toFixed(1) + "%";
  const seasons = [...new Set([...facts.values()].map(f => f.se))];
  const tm = withPlan.map(x => x.pl.thisMonth).filter(Boolean).sort((a, b) => a.by - b.by)[0];
  const monthHead = tm ? (tm.checkpoint === "spring" ? "Goal" : G.MONTHS[tm.m] + " goal") + " <span>by " + esc(G.fmtShort(tm.by)) + "</span>" : "This month";
  const winterDue = withPlan.map(x => x.pl.winterDue).find(Boolean), springDue = withPlan[0].pl.goalDate;
  const order = orfOrderRows(rows, facts);
  h += '<div class="sc-key small">' +
    '<span><svg width="40" height="12" aria-hidden="true"><rect x="0" y="4" width="40" height="4" rx="2" fill="currentColor" opacity=".18"/></svg>Start to end-of-year goal</span>' +
    '<span><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" fill="var(--s3)" stroke="var(--panel)" stroke-width="2"/></svg>Latest check</span>' +
    '<span><svg width="14" height="14" aria-hidden="true"><rect x="3" y="3" width="8" height="8" fill="var(--panel)" stroke="currentColor" stroke-width="2" transform="rotate(45 7 7)"/></svg>Mid-year goal</span>' +
    '<span><svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="var(--panel)" stroke="currentColor" stroke-width="2.5"/></svg>End-of-year goal</span>' +
    '<span><svg width="34" height="10" aria-hidden="true"><rect x="0" y="1" width="9" height="8" rx="1.5" fill="currentColor" opacity=".14"/><rect x="12" y="1" width="9" height="8" rx="1.5" fill="currentColor" opacity=".72"/><rect x="24" y="1" width="9" height="8" rx="1.5" fill="currentColor" opacity=".14"/></svg>Percentile band: under 10th, 10\u201325, 25\u201350, 50\u201375, 75\u201390, 90th+</span></div>';
  h += '<div class="scroll sc-scroll"><table class="sc-table"><thead><tr><th scope="col">Student</th><th scope="col">Now</th>' +
    '<th scope="col">Percentile' + (seasons.length === 1 ? " <span>" + SEASON_NAME[seasons[0]].toLowerCase() + "</span>" : "") + "</th>" +
    '<th scope="col">' + monthHead + "</th>" +
    '<th scope="col">Mid-year' + (winterDue ? " <span>by " + esc(G.fmtShort(winterDue)) + "</span>" : "") + "</th>" +
    '<th scope="col">End of year <span>by ' + esc(G.fmtShort(springDue)) + "</span></th>" +
    '<th scope="col" class="sc-trackh">0 <span>to</span> ' + MAX + " <span>WCPM</span></th></tr></thead><tbody>";
  order.forEach(({ p, pl }) => {
    const who = esc(p.name) + (p.eld ? ' <span class="chip eld tiny">ELD</span>' : "") + (p.st ? "" : ' <span class="tiny muted">not on the roster</span>');
    if (!pl) { h += '<tr class="sc-row" data-orf="' + esc(p.o.id) + '"><th scope="row" class="sc-name"><span class="sc-who">' + who + '</span></th><td colspan="6" class="muted small">no checks this year</td></tr>'; return; }
    const f = facts.get(p.o.id), open = UI.orfGoalSid === p.o.id, id = esc(p.o.id);
    const lo = Math.min(pl.base, pl.latestY), hi = Math.max(pl.base, pl.latestY);
    const track = "Started " + pl.base + ", now " + pl.latestY + (f.mid != null ? ", mid-year goal " + f.mid : "") + ", end-of-year goal " + pl.goal;
    h += '<tr class="sc-row' + (open ? " sc-open" : "") + '" data-orf="' + id + '">' +
      '<th scope="row" class="sc-name"><button type="button" class="sc-btn" aria-expanded="' + open + '" aria-controls="sc-more-' + id + '" onclick="orfPickGoal(\'' + id + '\')">' +
        '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M5 3l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        esc(p.name) + "</button>" + (p.eld ? ' <span class="chip eld tiny">ELD</span>' : "") + (p.st ? "" : ' <span class="tiny muted">not on the roster</span>') + "</th>" +
      '<td><span class="sc-big">' + f.now + '</span><span class="sc-sub">' + esc(f.nowDate) + "</span></td>" +
      '<td><span class="sc-pct">' + esc(f.pNow.label) + (seasons.length === 1 ? "" : ' <span class="sc-sub" style="display:inline">' + SEASON_NAME[f.se].toLowerCase() + "</span>") + "</span>" +
        '<span class="sc-bands" aria-hidden="true">' + [0, 1, 2, 3, 4, 5].map(i => "<i" + (i === f.pNow.band ? ' class="on"' : "") + "></i>").join("") + "</span></td>" +
      '<td><span class="sc-num">' + (f.month == null ? "\u2014" : f.month) + '</span><span class="sc-st" style="color:' + ORF_STATUS_INK(f.st.color) + '">' + f.st.sym + " " + esc(f.st.label + f.st.gap) + "</span>" +
        (f.flag ? '<span class="tag reteach sc-flag" title="' + esc(f.flag) + '">\u2691 ' + (pl.belowRun >= 3 ? pl.belowRun + " in a row below" : "flagged") + "</span>" : "") + "</td>" +
      '<td><span class="sc-num">' + (f.mid == null ? "\u2014" : f.mid) + "</span>" + f.midLines.map(x => '<span class="sc-sub">' + esc(x) + "</span>").join("") + "</td>" +
      '<td><span class="sc-num">' + pl.goal + (pl.comp ? ' <span class="sc-comp" title="with 3 of 3 comprehension questions">3/3</span>' : "") + '</span><span class="sc-sub">' + esc(f.eoySub) + "</span></td>" +
      '<td class="sc-trackc"><span class="sc-track" role="img" aria-label="' + esc(track) + '">' +
        '<span class="sc-span" style="left:' + P(pl.base) + ";width:" + P(Math.max(pl.goal, pl.latestY) - pl.base) + '"></span>' +
        '<span class="sc-fill" style="left:' + P(lo) + ";width:" + P(Math.max(0.5, hi - lo)) + ";background:" + f.st.color + '"></span>' +
        (f.mid != null ? '<span class="sc-mid" style="left:' + P(f.mid) + '"></span>' : "") +
        '<span class="sc-goal" style="left:' + P(pl.goal) + '"></span>' +
        '<span class="sc-now" style="left:' + P(pl.latestY) + ";background:" + f.st.color + '"></span></span></td></tr>';
    if (open) h += '<tr class="sc-more" id="sc-more-' + id + '"><td colspan="7"><div class="sc-inner">' + orfChildHTML(p, pl, f) + "</div></td></tr>";
  });
  return h + "</tbody></table></div>";
}
/* the opened row: the summary, the months, the chart, the goals, the checks */
function orfChildHTML(p, pl, f) {
  const G = window.SuiteOrf.goals, comp = orfCompState(), own = pl.own || {}, notesAll = orfNotesState();
  const now = UI.orfToday ? new Date(UI.orfToday) : new Date(), nowT = now.getTime() - 864e5;
  const cur = pl.months.find(mo => mo.checkpoint !== "winter" && mo.by.getTime() >= nowT);
  let h = '<p class="sc-summary">' + esc(orfSummary(p, pl, f)) + "</p>" +
    (f.flag ? '<p class="small" style="margin:6px 0 0"><span class="tag reteach">\u2691</span> ' + esc(f.flag.replace(/^./, c => c.toUpperCase())) + ".</p>" : "") +
    '<ol class="sc-months">' + pl.months.map(mo => {
      const kind = mo.checkpoint || "month", c = orfMonthCell(pl, mo, kind);
      const lab = kind === "winter" ? "Mid-year" : kind === "spring" ? "End of year" : G.MONTHS[mo.m].slice(0, 3);
      return '<li class="' + (kind !== "month" ? "sc-k" : "") + (mo === cur ? " sc-cur" : "") + '"><span class="sc-ml">' + lab + '</span><span class="sc-mg">' + mo.target + "</span>" +
        '<span class="sc-mc ' + (c.up == null ? "" : c.up ? "sc-up" : "sc-down") + '"' + (c.said ? ' title="' + esc(c.said) + '"' : "") + ">" + esc(c.check || " ") +
        (c.said ? '<span class="sr-only"> (' + esc(c.said) + ")</span>" : "") + "</span></li>";
    }).join("") + "</ol>" +
    '<p class="hint" style="margin-top:6px">Top: the goal for that month (the aim line at the month\u2019s end). Under it: that month\u2019s latest check, \u2713 at or above the aim line the day it was read, \u2717 below. Outlined: this month.</p>';
  h += orfAimSVG(pl) +
    '<p class="hint" style="margin-top:4px">Dashed: the aim line to the goal. Dots: checks, red when under the line. How the goal was set: ' + esc(pl.why) + ".</p>" +
    '<div class="row" style="margin-top:8px">' +
    (pl.winterDue ? '<label class="fld">Winter goal<input type="number" min="1" max="300" value="' + (own.winter != null ? own.winter : "") + '" placeholder="' + (pl.suggestedWinter || "") + '" onchange="orfSetGoal(\'' + esc(p.o.id) + '\',\'winter\',this.value)"></label>' : "") +
    '<label class="fld">Spring goal<input type="number" min="1" max="300" value="' + (own.spring != null ? own.spring : "") + '" placeholder="' + pl.suggested + '" onchange="orfSetGoal(\'' + esc(p.o.id) + '\',\'spring\',this.value)"></label>' +
    (pl.custom ? '<button class="btn sm" onclick="orfSetGoal(\'' + esc(p.o.id) + '\',null)">Use the suggested goals</button>' : "") +
    '</div><table style="margin-top:10px"><thead><tr><th>Check</th><th class="c">WCPM</th><th class="c">vs aim line</th><th class="c">Comprehension</th></tr></thead><tbody>' +
    pl.checks.slice().reverse().map(c => {
      const v = comp.records[c.rec.id], nt = notesAll.records[c.rec.id], NT = window.SuiteOrf.notes;
      const said = nt && nt.notes.length ? '<tr class="orf-said"><td colspan="4" class="small" style="border-top:0;padding-top:0"><span class="muted">What they said:</span> ' +
        nt.notes.map(x => esc(NT.text(x))).join(" \u00b7 ") + "</td></tr>" : "";
      const paused = nt && nt.paused ? ' <span class="tiny" style="display:inline-block;padding:1px 7px;border-radius:5px;background:var(--s2-bg);color:var(--s2-ink);font-weight:600" title="The timer was paused for an interruption. The norms assume one unbroken minute, so read this score with that in mind.">paused ' + esc(NT.paused(nt.paused)) + "</span>" : "";
      return "<tr><td>" + esc(orfDay(c.t)) + (c.rec.passageTitle ? ' <span class="tiny muted">' + esc(c.rec.passageTitle) + "</span>" : "") + paused + '</td><td class="c num">' + c.y +
        '</td><td class="c num">' + (c.t === pl.baseDate.getTime() ? "start" : (Math.round(c.y - pl.aim(c.t)) > 0 ? "+" : "") + Math.round(c.y - pl.aim(c.t))) +
        '</td><td class="c"><select aria-label="Comprehension for ' + esc(orfDay(c.t)) + '" onchange="orfSetComp(\'' + esc(c.rec.id) + '\',this.value)"><option value="">\u2014</option>' +
        [0, 1, 2, 3].map(n => '<option value="' + n + '"' + (v === n ? " selected" : "") + ">" + n + "/3</option>").join("") + "</select></td></tr>" + said;
    }).join("") + "</tbody></table>";
  return h;
}
/* The Download PDF button: the whole class on landscape Letter, black and
   white like every sheet the gradebook prints, through the print dialog
   (Save as PDF). The header row repeats on each page of a long class. */
function orfSheetHTML() {
  const db = readOrfDB();
  if (!db || !orfGoalsReady()) return "";
  const G = window.SuiteOrf.goals, gs = orfGoalsForPlans(), comp = orfCompState(), now = UI.orfToday ? new Date(UI.orfToday) : new Date();
  const rows = orfPeople(db).map(p => ({ p: p, pl: G.planFor(db, p.o.id, gs, now, comp) }));
  const withPlan = rows.filter(x => x.pl);
  const facts = new Map(withPlan.map(x => [x.p.o.id, orfRowFacts(x.p, x.pl, gs, now)]));
  const { keyOf, list } = orfMonthCols(withPlan);
  const order = orfOrderRows(rows, facts);
  const head = c => c.kind === "winter" ? "Mid-year<span>" + esc(G.fmtShort(c.by)) + "</span>" : c.kind === "spring" ? "End of year<span>" + esc(G.fmtShort(c.by)) + "</span>" : esc(G.MONTHS[c.m].slice(0, 3)) + "<span>goal</span>";
  let h = '<article class="orfsheet"><header class="cf-head"><div><h2 class="cf-name">Reading progress</h2><p class="cf-sub">Oral reading fluency, words correct per minute' +
    (S.settings.teacher ? " \u00b7 " + esc(S.settings.teacher) : "") + (S.settings.year ? " \u00b7 " + esc(S.settings.year) : "") + "</p></div>" +
    '<p class="cf-meta">As of ' + esc(G.fmtLong(now)) + "<br>Percentiles: Hasbrouck &amp; Tindal (2017), grade " + gs.grade + "</p></header>" +
    '<table class="os-table"><thead><tr><th class="os-l">Student</th><th>Now</th><th class="os-l">Percentile</th><th class="os-l">Status</th>' +
    list.map(c => '<th class="' + (c.kind !== "month" ? "os-k" : "") + '">' + head(c) + "</th>").join("") + "<th>Words<span>a week</span></th></tr></thead><tbody>";
  order.forEach(({ p, pl }) => {
    const nm = esc(p.name) + (p.eld ? " (ELD)" : "");
    if (!pl) { h += '<tr><th scope="row" class="os-l">' + nm + '</th><td colspan="' + (list.length + 4) + '" class="os-l">no checks this year</td></tr>'; return; }
    const f = facts.get(p.o.id), by = {};
    pl.months.forEach(mo => { by[keyOf(mo)] = mo; });
    h += '<tr><th scope="row" class="os-l">' + nm + '</th><td><b>' + f.now + "</b><span>" + esc(f.nowDate) + "</span></td>" +
      '<td class="os-l">' + esc(f.pNow.label) + "<span>" + SEASON_NAME[f.se].toLowerCase() + "</span></td>" +
      '<td class="os-l"><b>' + f.st.sym + " " + esc(f.st.label + f.st.gap) + "</b>" + (f.flag ? "<span>\u2691 " + esc(pl.belowRun >= 3 ? pl.belowRun + " in a row below" : "flagged") + "</span>" : "") + "</td>" +
      list.map(c => {
        const mo = by[c.key], cell = mo ? orfMonthCell(pl, mo, c.kind) : null;
        return '<td class="' + (c.kind !== "month" ? "os-k" : "") + '">' + (cell ? (c.kind !== "month" ? "<b>" + cell.goal + "</b>" : cell.goal) + (cell.check ? "<span><b>" + esc(cell.check) + "</b></span>" : "") : "\u2013") + "</td>";
      }).join("") +
      "<td>" + (pl.perWeekNow != null && !pl.result && pl.latestY < pl.goal ? Math.max(0, pl.perWeekNow).toFixed(1) : "\u2013") + "</td></tr>";
  });
  return h + '</tbody></table><p class="os-key">Each month: that month\u2019s goal (the child\u2019s aim line at the month\u2019s end), then that month\u2019s latest check, \u2713 at or above the aim line the day it was read, \u2717 below. ' +
    "Status compares the latest check with the aim line, give or take the margin of error (10% of the line, at least " + ORF_BAND_FLOOR + " words, at most " + gs.margin +
    "): \u25B2 exceeding goal (more than the margin above), \u2713 on track (within it), \u25BC needs attention (more than the margin below), \u25CB first check. Shaded: the mid-year and end-of-year goals.</p></article>";
}

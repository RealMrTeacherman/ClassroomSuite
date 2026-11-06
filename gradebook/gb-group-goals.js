/* gradebook/gb-group-goals.js — Math: Group goals and Year goals.
   One of the gradebook's scripts, loaded in order by index.html as classic
   scripts sharing one global scope; see HANDOFF "The gradebook's files". */
/* ============================================================
   GROUP GOALS — Math
   Small groups formed here from each child's biggest classwork need, and a
   goal for each. A child's need is their lowest standard below 3 (the
   report card's rule, classwork only, over the same window as the class
   needs); on a tie, the one more of the class shares, so groups come out
   whole rather than in ones. A child alone with their need moves to their
   next need that already has a group; if none, they are listed on their
   own rather than made a group of one.

   Groups are kept once used: S.ggroups (records with ids) and S.ggPlace,
   a { child id: group id } map, so a move on one device and a move on
   another both survive the sync merge. A group goal is an S.goals record
   with `group`; its numbers are always over the group's *current* members,
   so a child's data follows them when they move (his choice). The baseline
   is the group as it stood on the day the goal started.
   ============================================================ */
function ggMembers(gid) { return S.students.filter(st => (S.ggPlace || {})[st.id] === gid).map(st => st.id); }
function ggGroup(gid) { return (S.ggroups || []).find(x => x.id === gid) || null; }
function ggName(g) { const gr = g && g.group ? ggGroup(g.group) : null; return gr ? gr.name : (g && g.groupName) || "this"; }
function ggOpenGoal(gid) { return (S.goals || []).find(g => g.group === gid && !g.done) || null; }
function ggHasGroups() { return (S.ggroups || []).length > 0; }
/* the Extend group, for children at 3 or higher on every focus skill.
   Its numbers count each child at 4 on their own next skill. */
function ggIsExtend(gr) { return !!gr && gr.kind === "extend"; }
function ggOpt(gr) { return ggIsExtend(gr) ? { bar: 4, codeFor: sid => (gr.targets && gr.targets[sid]) || ggExtendTarget(sid) } : null; }
function ggStat(gr, sids, asOf) { return cgClassStat(ggIsExtend(gr) ? ggFocusCodes() : [gr.std], asOf || null, null, sids, ggOpt(gr)); }
/* where a child not in any group belongs among the groups there are */
function ggFit(sid) {
  const codes = ggFocusCodes(), gs = S.ggroups || [];
  if (!codes.length || !gs.length) return null;
  const mk = {};
  codes.forEach(c => { const m = cgMark(sid, [c], null, null); if (m != null) mk[c] = m; });
  const p = ggPlaceOf(sid, codes, mk), need = gs.filter(g => !ggIsExtend(g));
  if (p.extend) { const x = gs.find(ggIsExtend); if (x) return x; }
  const order = c => { const i = codes.indexOf(c); return i < 0 ? 999 : i; }, at = p.extend ? codes.length : order(p.std);
  const same = need.find(g => g.std === p.std);
  if (same) return same;
  const earlier = need.filter(g => order(g.std) < at).sort((a, b) => order(b.std) - order(a.std))[0];
  const later = need.filter(g => order(g.std) > at).sort((a, b) => order(a.std) - order(b.std))[0];
  return earlier || later || gs[0];
}
function ggPlaceOut() {
  const out = S.students.filter(st => !ggGroup((S.ggPlace || {})[st.id]));
  S.ggPlace = S.ggPlace || {};
  let n = 0;
  out.forEach(st => { const g = ggFit(st.id); if (g) { S.ggPlace[st.id] = g.id; n++; } });
  save(); renderClassGoal(); toast(n + (n === 1 ? " child placed" : " children placed"));
}

/* the skills a group goal can be about, in the order they build on
   each other, earliest first. A child's goal area is the first of these
   they are below 3 on. These are the four strands he spends most time on;
   fact fluency within 20, measurement, time, money, shapes and data are
   left out on purpose (the whole grade works on fluency all year), so a
   low mark there never makes a goal area. Only standards switched on count. */
const GG_FOCUS = [
  ["Place value", ["2.NBT.A.1", "2.NBT.A.2", "2.NBT.A.3", "2.NBT.A.4"]],
  ["Adding and subtracting within 100", ["2.NBT.B.5", "2.OA.A.1"]],
  ["Extending the operations", ["2.NBT.B.8", "2.NBT.B.6", "2.NBT.B.7", "2.NBT.B.9"]],
  ["Groundwork for multiplication", ["2.OA.C.3", "2.OA.C.4"]]
];
function ggFocusCodes() {
  const on = activeCodes("Math");
  return GG_FOCUS.reduce((a, t) => a.concat(t[1]), []).filter(c => on.indexOf(c) >= 0);
}
function ggTierOf(code) { const t = GG_FOCUS.find(t => t[1].indexOf(code) >= 0); return t ? t[0] : ""; }
/* iReady places a child with no marks on these skills: their lower of
   Number and Operations and Algebra, when below grade level (a tie goes to
   Number and Operations, which comes first), to that domain's first skill */
function ggIreadyPlace(sid, codes) {
  const r = S.iready.filter(x => x.sid === sid && x.subject === "Math" && x.date).sort((a, b) => a.date.localeCompare(b.date)).pop();
  if (!r) return null;
  const num = cgDomRank(r, "num"), alg = cgDomRank(r, "alg");
  if (num == null && alg == null) return null;
  const first = re => codes.find(c => re.test(c)) || null;
  const nb = num != null && num < 0, ab = alg != null && alg < 0;
  if (nb && (!ab || num <= alg)) return { std: first(/\.NBT\./) || codes[0] };
  if (ab) return { std: first(/\.OA\./) || codes[0] };
  return { extend: true };
}
/* one child: where they go and why. marks are their marks on the focus skills */
function ggPlaceOf(sid, codes, mk) {
  const marked = codes.filter(c => mk[c] != null);
  if (marked.length) {
    const low = marked.filter(c => roundMark(mk[c]) < 3);
    if (low.length) return { std: low[0], needs: low, why: "marks" };
    return { extend: true, why: "marks" };
  }
  const ir = ggIreadyPlace(sid, codes);
  if (ir) return Object.assign({ why: "iready", needs: ir.std ? [ir.std] : [] }, ir);
  return { std: codes[0], needs: [codes[0]], why: "none" };
}
/* an Extend child's next skill: the first focus skill they are below 4 on;
   at 4 on all they have marks on, the next skill after those; else the last */
function ggExtendTarget(sid, codes, mk) {
  codes = codes || ggFocusCodes();
  if (!mk) { mk = {}; codes.forEach(c => { const m = cgMark(sid, [c], null, null); if (m != null) mk[c] = m; }); }
  const marked = codes.filter(c => mk[c] != null);
  const below = marked.find(c => roundMark(mk[c]) < 4);
  if (below) return below;
  if (!marked.length) return codes[0];
  const after = codes.slice(codes.indexOf(marked[marked.length - 1]) + 1)[0];
  return after || codes[codes.length - 1];
}

function ggSuggest(win) {
  const since = cgSuggestSince(win), codes = ggFocusCodes(), order = c => codes.indexOf(c);
  const marks = {}, why = {}, needs = {}, targets = {}, by = {}, extend = [];
  S.students.forEach(st => {
    const mk = marks[st.id] = {};
    codes.forEach(c => { const m = cgMark(st.id, [c], null, since); if (m != null) mk[c] = m; });
  });
  if (!codes.length) return { groups: [], codes: codes, marks: marks, why: why, targets: targets };
  S.students.forEach(st => {
    const p = ggPlaceOf(st.id, codes, marks[st.id]);
    why[st.id] = p.why;
    if (p.extend) { extend.push(st.id); targets[st.id] = ggExtendTarget(st.id, codes, marks[st.id]); return; }
    needs[st.id] = p.needs.length ? p.needs : [p.std];
    (by[p.std] = by[p.std] || []).push(st.id);
  });
  /* nobody is left on their own while another group could take them: from
     the latest skill back, a child alone with their need joins the group for
     their next missing skill, else the nearest earlier group, else the
     nearest later one. With no other group at all, a group of one stays. */
  for (let moved = true; moved;) {
    moved = false;
    const single = Object.keys(by).filter(c => by[c].length === 1).sort((a, b) => order(b) - order(a));
    for (const c of single) {
      const sid = by[c][0], others = Object.keys(by).filter(x => x !== c);
      if (!others.length) continue;
      const next = needs[sid].slice(1).find(n => by[n] && by[n].length >= 2);
      const earlier = others.filter(x => order(x) < order(c)).sort((a, b) => order(b) - order(a))[0];
      const later = others.filter(x => order(x) > order(c)).sort((a, b) => order(a) - order(b))[0];
      const to = next || earlier || later;
      by[to].push(sid); delete by[c]; moved = true; break;
    }
  }
  const lowFirst = c => (a, b) => (marks[a][c] == null) - (marks[b][c] == null) || (marks[a][c] || 0) - (marks[b][c] || 0);
  const groups = Object.keys(by).sort((a, b) => order(a) - order(b))
    .map(c => ({ std: c, kind: "need", tier: ggTierOf(c), kids: by[c].sort(lowFirst(c)), marks: marks }));
  if (extend.length) {
    const count = {};
    extend.forEach(sid => { count[targets[sid]] = (count[targets[sid]] || 0) + 1; });
    const std = Object.keys(count).sort((a, b) => count[b] - count[a] || order(a) - order(b))[0];
    groups.push({ std: std, kind: "extend", tier: "Extend", kids: extend.slice(), marks: marks, targets: targets });
  }
  return { groups: groups, codes: codes, marks: marks, why: why, targets: targets };
}
/* the suggestion with the moves he dragged in before using it. A
   move is kept by the group it went to, so the children he did not touch
   still follow their marks; a move to a group the suggestion no longer has
   waits, unused, until that group comes back or he resets. */
function ggSugKey(x) { return x.kind === "extend" ? "extend" : "std:" + x.std; }
function ggSugName(x) { return x.kind === "extend" ? "Extend" : byCode[x.std] ? byCode[x.std].lbl : x.std; }
function ggSuggestMoved(win) {
  const sug = ggSuggest(win), mv = S.ggSugMoves || {}, moved = {}, at = {};
  sug.groups.forEach(x => x.kids.forEach(sid => { at[sid] = x; }));
  Object.keys(mv).forEach(sid => {
    const from = at[sid], to = sug.groups.find(x => ggSugKey(x) === mv[sid]);
    if (!from || !to || from === to) return;
    from.kids = from.kids.filter(k => k !== sid); to.kids.push(sid); at[sid] = to; moved[sid] = true;
    if (to.kind === "extend") to.targets[sid] = to.targets[sid] || ggExtendTarget(sid, sug.codes, sug.marks[sid]);
  });
  sug.groups = sug.groups.filter(x => x.kids.length);
  sug.moved = moved;
  return sug;
}

/* ---- dragging names between groups ----
   Mouse: press and move. Touch: press and hold, then move, so an ordinary
   swipe still scrolls. Any card with data-drop takes a name; Escape or
   letting go anywhere else puts it back. The Move menu under Edit group
   stays, for a keyboard or a drag that will not cooperate. */
let GGD = null;
function ggDragWire(P) {
  P.querySelectorAll(".gg-kid[data-drag]").forEach(chip => chip.addEventListener("pointerdown", e => ggDragStart(e, chip, P)));
}
function ggDragStart(e, chip, P) {
  if (GGD || (e.button != null && e.button > 0) || e.target.closest("select")) return;
  const home = chip.closest("[data-drop]");
  const d = GGD = { chip: chip, P: P, sid: chip.dataset.sid, from: home ? home.dataset.drop : "", x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY,
    id: e.pointerId, touch: e.pointerType === "touch", on: false, over: null };
  if (d.touch) d.hold = setTimeout(() => { if (GGD === d) ggDragBegin(d); }, 350);
  window.addEventListener("pointermove", ggDragMove, { passive: false });
  window.addEventListener("pointerup", ggDragEnd);
  window.addEventListener("pointercancel", ggDragCancel);
  window.addEventListener("touchmove", ggTouchMove, { passive: false });
  window.addEventListener("keydown", ggDragKey);
  window.addEventListener("contextmenu", ggNoMenu);
}
function ggNoMenu(e) { if (GGD && GGD.touch) e.preventDefault(); }
function ggTouchMove(e) { if (GGD && GGD.on && e.cancelable) e.preventDefault(); }
function ggDragKey(e) { if (e.key === "Escape") ggDragCancel(); }
function ggDragBegin(d) {
  d.on = true;
  const r = d.chip.getBoundingClientRect(), g = d.ghost = d.chip.cloneNode(true);
  g.classList.add("gg-ghost"); g.removeAttribute("data-drag");
  g.style.width = r.width + "px"; d.dx = d.x0 - r.left; d.dy = d.y0 - r.top;
  document.body.appendChild(g);
  d.chip.classList.add("gg-lift"); document.body.classList.add("gg-dragging");
  ggDragPlace(d);
  const edge = () => {
    if (GGD !== d) return;
    const h = window.innerHeight || 800, band = 70;
    if (d.y < band) window.scrollBy(0, -Math.ceil((band - d.y) / 4));
    else if (d.y > h - band) window.scrollBy(0, Math.ceil((d.y - (h - band)) / 4));
    ggDragPlace(d);
    d.raf = requestAnimationFrame(edge);
  };
  d.raf = requestAnimationFrame(edge);
}
function ggDragPlace(d) {
  if (!d.ghost) return;
  d.ghost.style.left = (d.x - d.dx) + "px"; d.ghost.style.top = (d.y - d.dy) + "px";
  /* every layer under the finger, so a floating bar (the corner switcher,
     the update notice) over a card does not hide the card from the drop */
  let els = typeof document.elementsFromPoint === "function" ? document.elementsFromPoint(d.x, d.y) : [];
  if (!els || !els.length) els = document.elementFromPoint ? [document.elementFromPoint(d.x, d.y)] : [];
  const over = els.map(el => el && el.closest ? el.closest("[data-drop]") : null).find(x => x && d.P.contains(x)) || null;
  const ok = over && over.dataset.drop !== d.from ? over : null;
  if (ok !== d.over) { if (d.over) d.over.classList.remove("gg-drop-over"); if (ok) ok.classList.add("gg-drop-over"); d.over = ok; }
}
function ggDragMove(e) {
  const d = GGD;
  if (!d || e.pointerId !== d.id) return;
  d.x = e.clientX; d.y = e.clientY;
  const far = Math.hypot(d.x - d.x0, d.y - d.y0);
  if (!d.on) {
    if (d.touch) { if (far > 10) ggDragCancel(); return; }   /* a swipe: let it scroll */
    if (far > 5) ggDragBegin(d); else return;
  }
  if (e.cancelable) e.preventDefault();
  ggDragPlace(d);
}
function ggDragStop() {
  const d = GGD; GGD = null;
  if (!d) return null;
  clearTimeout(d.hold); if (d.raf) cancelAnimationFrame(d.raf);
  window.removeEventListener("pointermove", ggDragMove, { passive: false });
  window.removeEventListener("pointerup", ggDragEnd);
  window.removeEventListener("pointercancel", ggDragCancel);
  window.removeEventListener("touchmove", ggTouchMove, { passive: false });
  window.removeEventListener("keydown", ggDragKey);
  window.removeEventListener("contextmenu", ggNoMenu);
  if (d.ghost) d.ghost.remove();
  if (d.over) d.over.classList.remove("gg-drop-over");
  d.chip.classList.remove("gg-lift"); document.body.classList.remove("gg-dragging");
  if (d.on) {   /* the press was a drag, not a tap on the name */
    const eat = ev => { ev.stopPropagation(); ev.preventDefault(); };
    window.addEventListener("click", eat, true);
    setTimeout(() => window.removeEventListener("click", eat, true), 400);
  }
  return d;
}
function ggDragCancel() { ggDragStop(); }
function ggDragEnd(e) {
  if (!GGD || (e && e.pointerId !== GGD.id)) return;
  /* where it was let go is where the last move left it: a lifted finger's
     own coordinates are not always reliable (some report 0,0) */
  const d = ggDragStop();
  if (d && d.on && d.over) ggDrop(d.sid, d.over.dataset.drop);
}
/* where a name was let go: "sug:<key>" on the suggestion, "g:<id>" a group, "out" */
function ggDrop(sid, to) {
  const st = S.students.find(s => s.id === sid);
  if (!st || !to) return;
  let where = "";
  if (to.indexOf("sug:") === 0) {
    const key = to.slice(4), natural = ggSuggest(UI.cgWin).groups.find(x => x.kids.indexOf(sid) >= 0);
    const x = ggSuggestMoved(UI.cgWin).groups.find(x => ggSugKey(x) === key);
    if (!x) return;
    S.ggSugMoves = S.ggSugMoves || {};
    if (natural && ggSugKey(natural) === key) delete S.ggSugMoves[sid]; else S.ggSugMoves[sid] = key;
    where = ggSugName(x);
  } else if (to.indexOf("g:") === 0) {
    const gr = ggGroup(to.slice(2));
    if (!gr) return;
    S.ggPlace = S.ggPlace || {}; S.ggPlace[sid] = gr.id; where = gr.name;
  } else if (to === "out") {
    if (S.ggPlace) delete S.ggPlace[sid]; where = "Not in a group";
  } else return;
  save(); renderClassGoal(); toast(fullName(st) + " \u2192 " + where);
}

/* the suggestion uses the needs window; kept separate so a test can see it */
function cgSuggestSince(win) { return cgSince(win); }

function ggUse(sug) {
  S.ggroups = sug.groups.map(x => Object.assign({ id: uid(), name: x.kind === "extend" ? "Extend" : byCode[x.std].lbl, std: x.std, made: todayISO(), v: 129 },
    x.kind === "extend" ? { kind: "extend" } : {}));
  S.ggPlace = {};
  sug.groups.forEach((x, i) => x.kids.forEach(sid => { S.ggPlace[sid] = S.ggroups[i].id; }));
  S.ggSugMoves = {};
  save(); renderClassGoal(); toast(S.ggroups.length + " groups made");
}
function ggRegroup() {
  const open = (S.goals || []).filter(g => g.group && !g.done);
  if (!confirm("Start the groups over?" + (open.length ? " Their " + open.length + " open goal" + (open.length > 1 ? "s are" : " is") + " finished and kept under Past goals." : ""))) return;
  open.forEach(g => { const now = cgGoalNow(g); g.groupName = ggName(g); g.done = { date: todayISO(), pct: now.st.pct, irPct: now.ir && now.ir.n ? now.ir.pct : null }; });
  S.ggroups = []; S.ggPlace = {}; S.ggSugMoves = {};
  save(); renderClassGoal();
}
function ggStart(gid) {
  const d = UI.ggDraft, gr = ggGroup(gid);
  if (!d || d.gid !== gid || !gr) return;
  const t = todayISO();
  if (!d.due || d.due <= t) { toast("The goal date needs to be after today"); return; }
  const sids = ggMembers(gid), dom = cgDomainOf(gr.std);
  if (!sids.length) { toast("This group has no children in it"); return; }
  /* an Extend goal fixes each child's next skill on the day it starts */
  const ext = ggIsExtend(gr), targets = {};
  if (ext) sids.forEach(sid => { targets[sid] = ggExtendTarget(sid); });
  const base = ext ? cgClassStat(ggFocusCodes(), null, null, sids, { bar: 4, codeFor: sid => targets[sid] }) : cgClassStat([gr.std], null, null, sids), irs = cgIrStat(dom, null, sids);
  const clamp = v => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
  S.goals = (S.goals || []).concat([Object.assign({
    id: uid(), subject: "Math", group: gid, groupName: gr.name, focus: { kind: ext ? "extend" : "std", key: gr.std }, codes: ext ? ggFocusCodes() : [gr.std],
    started: t, due: d.due, base: { pct: base.pct, marked: base.marked, n: base.n, at: base.at },
    target: clamp(d.target),
    ir: cgHasIready() ? { dom: dom, base: irs.n ? { pct: irs.pct, n: irs.n, date: irs.to } : null,
      target: d.irTarget == null || d.irTarget === "" ? null : clamp(d.irTarget) } : null,
    actions: String(d.actions || ""), notes: [], done: null
  }, ext ? { bar: 4, targets: targets } : {})]);
  UI.ggDraft = null; save(); renderClassGoal(); toast("Goal set for " + gr.name);
}

/* codeFor: an Extend child's own next skill; why: how a suggested
   child was placed, when it was not by their marks */
function ggMemberChips(gid, sids, std, canMove, codeFor, why, moved) {
  const others = (S.ggroups || []).filter(x => x.id !== gid);
  return '<div class="gg-kids">' + sids.map(sid => {
    const st = S.students.find(s => s.id === sid), c = codeFor ? codeFor(sid) : std, m = cgMark(sid, [c], null, null);
    const w = why && why[sid];
    return '<span class="gg-kid" data-drag data-sid="' + esc(sid) + '">' + nameLink(st, fullName(st)) +
      (m != null ? ' <span class="mark v' + roundMark(m) + ' gg-mk" title="Mark on ' + esc(dispCode(c)) + ' by the term-mark rule">' + m.toFixed(1) + "</span>" : "") +
      (codeFor ? ' <span class="tiny muted gg-next">' + esc(dispCode(c)) + "</span>" : "") +
      (moved && moved[sid] ? ' <span class="gg-moved">moved</span>' : w === "iready" ? ' <span class="tiny muted gg-why">by iReady</span>' : w === "none" ? ' <span class="tiny muted gg-why">no marks or iReady yet</span>' : "") +
      (canMove ? '<select class="gg-move" data-sid="' + esc(sid) + '" aria-label="Move ' + esc(fullName(st)) + '"><option value="">Move\u2026</option>' +
        others.map(o => '<option value="' + esc(o.id) + '">' + esc(o.name) + "</option>").join("") +
        '<option value="-">Out of groups</option></select>' : "") + "</span>";
  }).join("") + "</div>";
}
function ggSideBySide(gr, sids) {
  if (typeof gr === "string") gr = { std: gr };
  const std = gr.std, ext = ggIsExtend(gr), st = ggStat(gr, sids), dom = cgDomainOf(std), ir = cgIrStat(dom, null, sids);
  return '<div class="gg-sides"><div><span class="hint">Classwork \u00b7 ' + (ext ? "each child\u2019s next skill" : esc(dispCode(std))) + "</span><b>" +
    (st.marked ? st.at + " of " + st.marked : "\u2013") + "</b><i>" + (ext ? "at 4" : "at 3 or higher") + "</i></div>" +
    "<div><span class=\"hint\">iReady \u00b7 " + esc(cgDom(dom).name) + "</span><b>" + (ir.n ? ir.on + " of " + ir.n : "\u2013") + "</b><i>" +
    (ir.n ? "on or above grade level" : "no diagnostic yet") + "</i></div></div>";
}
/* a suggested group's starting point. Every child in it is below 3
   on its standard in the window the suggestion used, which is why they are
   together; said that way rather than as "0 of 3". The all-year figure can
   differ when a shorter window is chosen, and then the count is shown. */
function ggStartHTML(gr, sids, why, moved) {
  if (typeof gr === "string") gr = { std: gr };
  /* a child he moved is not here because of their marks, so the
     reason is said of the rest and the moves are counted on their own */
  const all0 = sids, mv = moved ? all0.filter(s => moved[s]).length : 0;
  sids = moved ? all0.filter(s => !moved[s]) : all0;
  const byYou = mv ? " " + mv + " moved here by you." : "";
  const std = gr.std, ext = ggIsExtend(gr), st = ggStat(gr, sids), dom = cgDomainOf(std), ir = cgIrStat(dom, null, all0);
  const n = sids.length, all = n === 2 ? "both" : n === 1 ? "this child" : "all " + n;
  const byIr = sids.filter(sid => why && why[sid] === "iready").length, none = sids.filter(sid => why && why[sid] === "none").length;
  const placed = (byIr ? " " + byIr + " placed by iReady, with no marks on these skills yet." : "") + (none ? " " + none + " with no marks or iReady yet, starting here." : "");
  const cw = ext
    ? "at 3 or higher on every focus skill they have marks on; each works toward 4 on their next one. " + (st.marked ? st.at + " of " + st.marked + " at 4 on it now." : "") + placed
    : st.marked && st.at === 0
    ? (st.marked === n ? all : st.marked === 1 ? "the one with marks" : (st.marked === 2 ? "both" : "all " + st.marked) + " with marks") +
      (st.marked === 1 ? " is" : " are") + " below 3 on this standard. That is why they are together." + placed
    : (st.marked ? st.at + " of " + st.marked + " at 3 or higher on this standard, all year" : "no marks on this standard yet") +
      (st.at > 0 ? "; below 3 in the window chosen above" : "") + "." + placed;
  const said = !n ? (mv === 1 ? "moved here by you." : "all " + mv + " moved here by you.") : cw + byYou;
  return '<div class="gg-start"><span class="hint">Where they start</span><div class="gg-sides">' +
    "<div><b>Classwork:</b> " + esc(said) + "</div>" +
    "<div><b>iReady, " + esc(cgDom(dom).name) + ":</b> " + (ir.n ? ir.on + " of " + ir.n + " on or above grade level." : "no diagnostic yet.") + "</div></div></div>";
}
function ggSuggestHTML() {
  const sug = ggSuggestMoved(UI.cgWin), nMoved = Object.keys(sug.moved).length;
  let h = '<div class="card pad gg-suggest" id="gg-suggest"><p class="hint" style="margin-top:0">Every child is in a group. Each goes with the first skill they are below 3 on, in the order these skills build: ' +
    GG_FOCUS.map(t => esc(t[0].toLowerCase())).join(", then ") + '. Children at 3 or higher on all of them go to <b>Extend</b>, working toward 4 on their next skill. With no marks on these yet, iReady places them; with neither, they start at the first skill.</p>' +
    '<p class="gg-legend"><span class="mark v2 gg-mk">2.0</span> beside a name is that child\u2019s mark on the group\u2019s standard, by the term-mark rule (Setup). Drag a name to move a child (on a phone, press and hold first); nothing is kept as groups until you use them.</p>';
  if (!sug.codes.length) return h + '<div class="cg-empty">None of the focus skills are switched on in Setup, so there are no groups to suggest.</div></div>';
  h += '<div class="grid2">' + sug.groups.map(x => {
    const ext = x.kind === "extend", gr = { std: x.std, kind: x.kind, targets: x.targets };
    return '<div class="gg-card gg-sug" data-drop="sug:' + esc(ggSugKey(x)) + '" data-std="' + esc(x.std) + '" data-kind="' + x.kind + '"><h3>' + (ext ? "Extend" : esc(byCode[x.std].lbl)) +
      ' <span class="tiny muted">' + x.kids.length + (x.kids.length === 1 ? " child" : " children") + "</span></h3>" +
      '<div class="tiny muted gg-tier">' + esc(ext ? "At 3 or higher on every focus skill" : x.tier) + "</div>" +
      (ext ? "" : "<div>" + codeHTML(x.std) + "</div>") +
      ggMemberChips(null, x.kids, x.std, false, ext ? (sid => x.targets[sid]) : null, sug.why, sug.moved) + ggStartHTML(gr, x.kids, sug.why, sug.moved) + "</div>";
  }).join("") + "</div>";
  if (sug.groups.length) h += '<div class="gg-sugbar"><button class="btn primary" id="gg-use">Use these groups</button>' +
    (nMoved ? '<span class="hint" style="margin:0">' + nMoved + (nMoved === 1 ? " child" : " children") + ' moved by you</span><button class="btn ghost" id="gg-sugreset">Reset to suggested</button>' : "") + "</div>";
  return h + "</div>";
}
function ggDraftHTML(gr) {
  const d = UI.ggDraft, sids = ggMembers(gr.id), dom = cgDomainOf(gr.std);
  const base = ggStat(gr, sids), ir = cgIrStat(dom, null, sids);
  const g = { group: gr.id, bar: ggIsExtend(gr) ? 4 : undefined, focus: { kind: ggIsExtend(gr) ? "extend" : "std", key: gr.std }, due: d.due, started: todayISO(), target: Number(d.target) || 0,
    base: { pct: base.pct }, ir: ir.n && d.irTarget != null && d.irTarget !== "" ? { dom: dom, base: { pct: ir.pct }, target: Number(d.irTarget) } : null };
  return '<div class="gg-draft" data-gid="' + esc(gr.id) + '"><div class="row cg-form">' +
    '<label class="fld">Classwork target (%)<input type="number" min="0" max="100" step="5" class="gg-d-target" value="' + esc(d.target) + '"></label>' +
    (ir.n ? '<label class="fld">iReady target (%)<input type="number" min="0" max="100" step="5" class="gg-d-irtarget" value="' + esc(d.irTarget == null ? "" : d.irTarget) + '" placeholder="blank to skip"></label>' : "") +
    '<label class="fld">Goal date<input type="date" class="gg-d-due" value="' + esc(d.due) + '"></label></div>' +
    '<label class="fld" style="margin-top:8px;display:flex">What this group will do<textarea class="gg-d-actions" rows="2" placeholder="e.g. Teacher table 3 days a week: make-a-ten with ten frames, then open number line">' + esc(d.actions || "") + "</textarea></label>" +
    '<div class="cg-statement gg-preview">' + esc(cgStatement(g)) + "</div>" +
    '<div class="row"><button class="btn primary gg-d-start">Start this goal</button><button class="btn ghost gg-d-cancel">Cancel</button></div></div>';
}
function ggGoalHTML(g) {
  const now = cgGoalNow(g), gid = g.group, moved = now.st.n !== g.base.n;
  return '<div class="gg-goal" data-goal="' + esc(g.id) + '"><p class="cg-statement">' + esc(cgStatement(g)) + "</p>" +
    '<div class="cg-stats"><div class="cg-stat"><span>Baseline</span><b>' + (g.base.pct == null ? "\u2013" : g.base.pct + "%") + "</b><i>" + (g.base.n ? g.base.n + " children" : "") + "</i></div>" +
    '<div class="cg-stat cg-now"><span>Now</span><b>' + (now.st.pct == null ? "\u2013" : now.st.pct + "%") + "</b><i>" + now.st.at + " of " + now.st.marked + "</i></div>" +
    '<div class="cg-stat"><span>Target</span><b>' + g.target + "%</b><i>by " + esc(shortDate(g.due)) + "</i></div></div>" +
    (moved ? '<p class="hint gg-moved">Started with ' + g.base.n + " children; " + now.st.n + " now. The numbers follow whoever is in the group.</p>" : "") +
    '<div class="notice ' + (now.pace === "behind" ? "warn" : now.pace === "met" || now.pace === "on" ? "ok" : "") + ' cg-pace" data-pace="' + now.pace + '"><b>' +
    ({ met: "Met", on: "On pace", behind: "Behind", early: "Early days", none: "No marks yet" }[now.pace]) + "</b><span>" + esc(cgPaceWords(g, now)) + "</span></div>" +
    (now.quiet >= 10 && g.due >= todayISO() ? '<div class="notice warn cg-quiet"><b>Quiet</b><span>No new marks on the focus in ' + now.quiet + " days.</span></div>" : "") +
    '<div class="cg-chartbox gg-chart">' + cgChartSVG(g, false, phoneLayout()) + "</div>" +
    '<details class="gg-more"><summary>Targets, plan and check-ins' + ((g.notes || []).length ? " (" + g.notes.length + ")" : "") + "</summary>" +
    '<div class="row cg-form" style="margin-top:8px"><label class="fld">Classwork target (%)<input type="number" min="0" max="100" step="5" class="gg-g-target" value="' + g.target + '"></label>' +
    (g.ir ? '<label class="fld">iReady target (%)<input type="number" min="0" max="100" step="5" class="gg-g-irtarget" value="' + (g.ir.target == null ? "" : g.ir.target) + '"></label>' : "") +
    '<label class="fld">Goal date<input type="date" class="gg-g-due" value="' + esc(g.due) + '"></label></div>' +
    '<label class="fld" style="margin-top:8px;display:flex">What this group is doing<textarea class="gg-g-actions" rows="2">' + esc(g.actions || "") + "</textarea></label>" +
    '<div class="cg-notes">' + (g.notes || []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).map(n =>
      '<div class="cg-note"><span class="cg-ndate">' + esc(shortDate(n.date)) + "</span><span>" + esc(n.text) +
      '</span><button class="btn sm ghost gg-delnote" data-note="' + esc(n.id) + '" title="Delete this check-in">\u00d7</button></div>').join("") + "</div>" +
    '<div class="row" style="margin-top:6px"><input type="text" class="gg-n-text" placeholder="Check-in (no names: this prints)" style="flex:1;min-width:180px"><button class="btn gg-n-add">Add</button></div>' +
    '<div class="row" style="margin-top:10px"><span class="spacer" style="flex:1"></span><button class="btn gg-finish">Finish this goal</button><button class="btn danger gg-delete">Delete</button></div>' +
    "</details></div>";
}
/* Moving children and renaming are occasional, so they sit behind Edit
   group: day to day a card is names, not a Move menu per child. */
function ggCardHTML(gr) {
  const sids = ggMembers(gr.id), g = ggOpenGoal(gr.id), editing = UI.ggEdit === gr.id;
  const lbl = byCode[gr.std] ? byCode[gr.std].lbl : gr.std;
  let h = '<div class="gg-card' + (editing ? " gg-editing" : "") + '" data-gid="' + esc(gr.id) + '" data-drop="g:' + esc(gr.id) + '"><div class="gg-head">' +
    (editing ? '<input class="gg-name" value="' + esc(gr.name) + '" aria-label="Group name">'
      : '<h3 class="gg-title">' + esc(gr.name) + ' <span class="tiny muted">' + sids.length + "</span></h3>") +
    '<button class="btn sm ' + (editing ? "primary" : "ghost") + ' gg-edit">' + (editing ? "Done" : "Edit group") + "</button></div>" +
    (ggIsExtend(gr) ? '<div class="hint">Each child works toward 4 on their next focus skill, shown beside their name.</div>'
      : "<div>" + codeHTML(gr.std) + (lbl !== gr.name ? " " + esc(lbl) : "") + "</div>") +
    ggSideBySide(gr, sids) + ggMemberChips(gr.id, sids, gr.std, editing, ggIsExtend(gr) ? ggOpt(gr).codeFor : null);
  if (g) h += ggGoalHTML(g);
  else if (UI.ggDraft && UI.ggDraft.gid === gr.id) h += ggDraftHTML(gr);
  else h += '<div class="row" style="margin-top:8px"><button class="btn gg-set"' + (sids.length ? "" : " disabled") + ">Set a goal for this group</button></div>";
  return h + "</div>";
}
function ggHTML() {
  let h = '<div class="sectionhead" id="gg"><h2>Group goals</h2><span class="spacer"></span>' +
    (ggHasGroups() ? '<button class="btn" id="gg-print">Print group goals</button><button class="btn ghost" id="gg-regroup">Start groups over</button>' : "") + "</div>";
  if (!ggHasGroups()) return h + ggSuggestHTML();
  /* groups made by the old rule (lowest mark, any standard) stay as
     they are until he starts over; nothing is regrouped behind his back */
  if (S.ggroups.some(g => !(g.v >= 129)))
    h += '<div class="notice gg-oldrule"><b>Made by the old rule</b><span>These groups came from each child\u2019s lowest mark on any standard. <b>Start groups over</b> to regroup everyone by the first focus skill they\u2019re missing, with an Extend group.</span></div>';
  h += '<p class="hint gg-draghint">Drag a name to another group to move a child (on a phone, press and hold first).</p>';
  h += '<div class="gg-cards">' + S.ggroups.map(ggCardHTML).join("") + "</div>";
  const out = S.students.filter(st => !ggGroup((S.ggPlace || {})[st.id]));
  if (out.length) {
    h += '<div class="card pad gg-out" data-drop="out"><h3>Not in a group <span class="tiny muted">' + out.length + '</span></h3><div class="gg-kids">' +
      out.map(st => '<span class="gg-kid" data-drag data-sid="' + esc(st.id) + '">' + nameLink(st, fullName(st)) +
        (ggFit(st.id) ? ' <span class="tiny muted gg-fit">\u2192 ' + esc(ggFit(st.id).name) + "</span>" : "") +
        '<select class="gg-move" data-sid="' + esc(st.id) + '" aria-label="Add ' + esc(fullName(st)) + '"><option value="">Add to\u2026</option>' +
        S.ggroups.map(o => '<option value="' + esc(o.id) + '">' + esc(o.name) + "</option>").join("") + "</select></span>").join("") + "</div>" +
      (out.some(st => ggFit(st.id)) ? '<div class="row" style="margin-top:8px"><button class="btn primary" id="gg-place">Place ' + (out.length === 1 ? "them" : "all " + out.length) + " as suggested</button></div>" : "") + "</div>";
  }
  return h;
}
function ggWire() {
  const P = document.getElementById("panel-goal");
  const q = s => P.querySelector(s), qa = s => P.querySelectorAll(s);
  if (q("#gg-use")) q("#gg-use").onclick = () => ggUse(ggSuggestMoved(UI.cgWin));
  if (q("#gg-sugreset")) q("#gg-sugreset").onclick = () => { S.ggSugMoves = {}; save(); renderClassGoal(); toast("Back to the suggested groups"); };
  ggDragWire(P);
  if (q("#gg-place")) q("#gg-place").onclick = ggPlaceOut;
  if (q("#gg-regroup")) q("#gg-regroup").onclick = ggRegroup;
  if (q("#gg-print")) q("#gg-print").onclick = printGroupGoals;
  qa(".gg-move").forEach(sel => sel.onchange = () => {
    const v = sel.value; if (!v) return;
    S.ggPlace = S.ggPlace || {};
    if (v === "-") delete S.ggPlace[sel.dataset.sid]; else S.ggPlace[sel.dataset.sid] = v;
    save(); renderClassGoal();
  });
  qa(".gg-card[data-gid]").forEach(card => {
    const gid = card.dataset.gid, gr = ggGroup(gid), c = s => card.querySelector(s);
    if (!gr) return;
    c(".gg-edit").onclick = () => {
      const inp = c(".gg-name");
      if (inp) { const v = inp.value.trim(); if (v && v !== gr.name) { gr.name = v; save(); } }
      UI.ggEdit = UI.ggEdit === gid ? null : gid; renderClassGoal();
    };
    if (c(".gg-name")) {
      c(".gg-name").onchange = e => { const v = e.target.value.trim(); if (v) { gr.name = v; save(); renderClassGoal(); } else e.target.value = gr.name; };
      c(".gg-name").onkeydown = e => { if (e.key === "Enter") c(".gg-edit").click(); };
    }
    if (c(".gg-set")) c(".gg-set").onclick = () => {
      const sids = ggMembers(gid), b = ggStat(gr, sids), ir = cgIrStat(cgDomainOf(gr.std), null, sids);
      UI.ggDraft = { gid: gid, target: cgSuggest(b.pct), irTarget: ir.n ? cgSuggest(ir.pct) : null, due: cgTermEnd(), actions: "" };
      renderClassGoal();
    };
    if (c(".gg-draft")) {
      const d = UI.ggDraft;
      const preview = () => {
        const sids = ggMembers(gid), dom = cgDomainOf(gr.std), b = ggStat(gr, sids), ir = cgIrStat(dom, null, sids);
        c(".gg-preview").textContent = cgStatement({ group: gid, bar: ggIsExtend(gr) ? 4 : undefined, focus: { kind: ggIsExtend(gr) ? "extend" : "std", key: gr.std }, due: d.due, started: todayISO(), target: Number(d.target) || 0,
          base: { pct: b.pct }, ir: ir.n && d.irTarget != null && d.irTarget !== "" ? { dom: dom, base: { pct: ir.pct }, target: Number(d.irTarget) } : null });
      };
      c(".gg-d-target").oninput = e => { d.target = e.target.value; preview(); };
      if (c(".gg-d-irtarget")) c(".gg-d-irtarget").oninput = e => { d.irTarget = e.target.value; preview(); };
      c(".gg-d-due").oninput = e => { d.due = e.target.value; preview(); };
      c(".gg-d-actions").oninput = e => { d.actions = e.target.value; };
      c(".gg-d-start").onclick = () => ggStart(gid);
      c(".gg-d-cancel").onclick = () => { UI.ggDraft = null; renderClassGoal(); };
    }
    const g = ggOpenGoal(gid);
    if (g && c(".gg-goal")) {
      const clamp = v => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
      const keepOpen = () => { UI.ggOpen = g.id; };
      if (UI.ggOpen === g.id) c(".gg-more").open = true;
      c(".gg-g-target").onchange = e => { g.target = clamp(e.target.value); keepOpen(); save(); renderClassGoal(); };
      if (c(".gg-g-irtarget")) c(".gg-g-irtarget").onchange = e => { g.ir.target = e.target.value === "" ? null : clamp(e.target.value); keepOpen(); save(); renderClassGoal(); };
      c(".gg-g-due").onchange = e => {
        if (!e.target.value || e.target.value <= g.started) { toast("The goal date needs to be after the start"); e.target.value = g.due; return; }
        g.due = e.target.value; keepOpen(); save(); renderClassGoal();
      };
      c(".gg-g-actions").onchange = e => { g.actions = e.target.value; save(); };
      c(".gg-n-add").onclick = () => {
        const t = c(".gg-n-text").value.trim(); if (!t) { toast("Write a line first"); return; }
        g.notes = (g.notes || []).concat([{ id: uid(), date: todayISO(), text: t }]); keepOpen(); save(); renderClassGoal();
      };
      c(".gg-n-text").onkeydown = e => { if (e.key === "Enter") c(".gg-n-add").click(); };
      card.querySelectorAll(".gg-delnote").forEach(b => b.onclick = () => { g.notes = g.notes.filter(n => n.id !== b.dataset.note); keepOpen(); save(); renderClassGoal(); });
      c(".gg-finish").onclick = () => {
        if (!confirm("Finish this group's goal? Its final numbers are kept under Past goals.")) return;
        const now = cgGoalNow(g); g.groupName = gr.name;
        g.done = { date: todayISO(), pct: now.st.pct, irPct: now.ir && now.ir.n ? now.ir.pct : null };
        save(); renderClassGoal();
      };
      c(".gg-delete").onclick = () => {
        if (!confirm("Delete this group's goal and its check-ins? This cannot be undone.")) return;
        S.goals = S.goals.filter(x => x.id !== g.id); save(); renderClassGoal();
      };
    }
  });
}

/* ============================================================
   YEAR GOALS
   The end-of-year math goals he submitted: four groups, each with its own
   children for the whole year and its goal in his own words, exactly as
   submitted. They come from a file he loads, never from this page's code
   (the site is public; names stay on his devices). Unlike the groups below,
   nothing here regroups: membership is the one he submitted.

   A child has met their group's goal when every standard the goal names is
   at the goal's bar on end-of-unit Reveal tests, the marks named "Unit 2
   test" (or "assessment", or "end of unit"). Daily classwork is shown in
   grey for context and does not count, because the goals say "as
   demonstrated by end-of-unit Reveal assessments". The marks he submitted
   with the goals are kept and shown as where each child started.
   ============================================================ */
const YG_UNIT = /\bunit\s*\d+\s*(test|assessment)\b|end[\s-]+of[\s-]+unit/i;
function ygIsUnit(x) { return cgIsClasswork(x) && YG_UNIT.test(x.ctx || ""); }
function ygNorm(t) { return String(t || "").replace(/\([^)]*\)/g, " ").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
/* who a submitted name is on this roster: the child it was matched to
   when loaded, else by full name or a name they are also called */
function ygSid(m) {
  if (m.sid && S.students.some(st => st.id === m.sid)) return m.sid;
  const n = ygNorm(m.name);
  const st = S.students.find(st => ygNorm(fullName(st)) === n) ||
    S.students.find(st => akaOf(st).some(a => ygNorm(a + " " + st.last) === n));
  return st ? st.id : null;
}
function ygUnitMark(sid, c) {
  const vals = S.scores.filter(x => x.sid === sid && x.std === c && x.date && ygIsUnit(x)).sort((a, b) => a.date.localeCompare(b.date)).map(x => x.v);
  return computeMark(vals);
}
function ygChild(gr, sid) {
  const bar = gr.bar || 3, cells = {};
  gr.codes.forEach(c => { cells[c] = { u: sid ? ygUnitMark(sid, c) : null, cw: sid ? cgMark(sid, [c], null, null) : null }; });
  return { cells: cells, met: !!sid && gr.codes.length > 0 && gr.codes.every(c => cells[c].u != null && roundMark(cells[c].u) >= bar) };
}
function ygStat(gr) {
  const kids = gr.members.map(m => ({ m: m, sid: ygSid(m) }));
  kids.forEach(k => { k.r = ygChild(gr, k.sid); });
  return { kids: kids, met: kids.filter(k => k.r.met).length, n: kids.length, missing: kids.filter(k => !k.sid) };
}
function ygBarWords(gr) {
  return (gr.bar || 3) + (gr.bar === 4 ? "" : " or higher") + " on " + gr.codes.map(dispCode).join(gr.codes.length > 2 ? ", " : " and ").replace(/, ([^,]*)$/, ", and $1");
}
function ygHTML() {
  const Y = S.yearGoals;
  let h = '<div class="sectionhead" id="yg"><h2>Year goals</h2><span class="spacer"></span>' +
    (Y ? '<button class="btn ghost" id="yg-load">Load a new file</button>' : "") +
    '<input type="file" id="yg-file" accept=".json,application/json" hidden></div>';
  if (!Y) return h + '<div class="card pad yg-empty"><p class="hint" style="margin-top:0">The end-of-year goals you submitted, each with its own children all year. They come from a year goals file, so the names stay on your devices.</p>' +
    '<div class="row"><button class="btn primary" id="yg-load">Load year goals file</button></div></div>';
  h += '<p class="hint" style="margin-top:0">Submitted' + (Y.year ? " for " + esc(Y.year) : "") + '. A child has met their goal when every standard it names is at the goal\u2019s mark on end-of-unit Reveal tests (marks named like \u201cUnit 2 test\u201d). Daily classwork is shown in grey and does not count. These groups stay as submitted; the groups below can change.</p>';
  const lost = [];
  h += '<div class="yg-list">' + Y.groups.map(gr => {
    const r = ygStat(gr), pct = r.n ? Math.round(100 * r.met / r.n) : 0;
    r.missing.forEach(k => lost.push(k.m.name));
    const open = (UI.ygOpen || {})[gr.id];
    return '<details class="yg-g" data-yg="' + esc(gr.id) + '"' + (open ? " open" : "") + '><summary><span class="yg-name">' + esc((gr.n ? gr.n + ". " : "") + gr.name) +
      ' <span>' + r.n + (r.n === 1 ? " child" : " children") + "</span></span>" +
      '<span class="yg-prog"><span class="yg-count">' + r.met + " of " + r.n + ' met</span><span class="yg-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span></span></summary>' +
      '<div class="yg-body"><p class="yg-goal">' + esc(gr.goal) + "</p>" +
      (gr.need ? '<div class="hint" style="margin:0">' + esc(gr.need) + "</div>" : "") +
      '<div class="tiny muted">Met: ' + esc(ygBarWords(gr)) + " on unit tests.</div>" +
      '<div class="yg-wrap"><table class="yg-table"><thead><tr><th>Student</th>' + gr.codes.map(c => '<th title="' + esc(byCode[c] ? byCode[c].lbl : c) + '">' + esc(dispCode(c)) + "</th>").join("") + "<th>Met</th></tr></thead><tbody>" +
      r.kids.map(k => {
        const st = k.sid ? S.students.find(x => x.id === k.sid) : null, from = (k.m.start || {});
        return "<tr><td>" + (st ? nameLink(st, fullName(st)) : '<span class="yg-miss">' + esc(k.m.name) + " (not on your roster)</span>") + "</td>" +
          gr.codes.map(c => {
            const cl = k.r.cells[c], f = from[c] != null ? '<span class="yg-from">started ' + esc(from[c]) + "</span>" : "";
            const v = cl.u != null ? '<span class="mark v' + roundMark(cl.u) + ' gg-mk" title="End-of-unit tests">' + cl.u.toFixed(1) + "</span>"
              : cl.cw != null ? '<span class="yg-cw" title="Daily classwork only; no unit test yet, so it does not count">' + cl.cw.toFixed(1) + "</span>" : '<span class="muted">\u2013</span>';
            return "<td>" + v + f + "</td>";
          }).join("") + "<td>" + (k.r.met ? '<span class="yg-met">Met</span>' : "") + "</td></tr>";
      }).join("") + "</tbody></table></div></div></details>";
  }).join("") + "</div>";
  if (lost.length) h += '<div class="notice warn yg-lost"><b>Not matched</b><span>' + esc(lost.join(", ")) + (lost.length === 1 ? " is" : " are") + " in the file but not on your roster by that name. Fix the spelling in Setup, or add it under Also called, and they will match.</span></div>";
  return h;
}
/* the file: { kind: "classroom-suite/year-goals", subject, year, groups:
   [{ n, name, goal, need, codes, bar, students: [{ name, start: {code: mark} }] }] } */
function ygFromFile(o) {
  if (!o || o.kind !== "classroom-suite/year-goals" || !Array.isArray(o.groups) || !o.groups.length) return null;
  const groups = o.groups.map((g, i) => ({
    id: uid(), n: Number(g.n) || i + 1, name: String(g.name || "Group " + (i + 1)), goal: String(g.goal || ""), need: String(g.need || ""),
    codes: (fl20Codes(Array.isArray(g.codes) ? g.codes : []) || []).filter(c => byCode[c]), bar: Number(g.bar) === 4 ? 4 : 3,
    members: (Array.isArray(g.students) ? g.students : []).map(x => typeof x === "string" ? { name: x } : { name: String(x.name || ""), start: x.start && typeof x.start === "object" ? x.start : undefined })
      .filter(m => m.name)
  })).filter(g => g.codes.length && g.members.length);
  if (!groups.length) return null;
  groups.forEach(g => g.members.forEach(m => { const sid = ygSid(m); if (sid) m.sid = sid; }));
  return { subject: String(o.subject || "Math"), year: String(o.year || ""), loaded: todayISO(), groups: groups };
}
function ygWire() {
  const f = document.getElementById("yg-file");
  if (!f) return;
  document.querySelectorAll("#panel-goal #yg-load").forEach(b => b.onclick = () => f.click());
  f.onchange = () => {
    const file = f.files && f.files[0];
    if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      let y = null;
      try { y = ygFromFile(JSON.parse(rd.result)); } catch (e) { y = null; }
      f.value = "";
      if (!y) { toast("That isn\u2019t a year goals file"); return; }
      if (S.yearGoals && !confirm("Replace the year goals you have with the ones in this file?")) return;
      S.yearGoals = y; UI.ygOpen = {}; save(); renderClassGoal();
      toast(y.groups.length + (y.groups.length === 1 ? " year goal" : " year goals") + " loaded");
    };
    rd.readAsText(file);
  };
  document.querySelectorAll("#panel-goal .yg-g").forEach(d => d.addEventListener("toggle", () => {
    UI.ygOpen = UI.ygOpen || {}; UI.ygOpen[d.dataset.yg] = d.open;
  }));
}

/* ---- printed: every group's goal, counts only, never names ---- */
function ggSheetHTML() {
  const who = S.settings.teacher ? esc(S.settings.teacher) + " \u00b7 " : "";
  let h = '<article class="cgsheet ggsheet"><div class="cf-head"><div><h1 class="cf-name">Math group goals</h1>' +
    '<div class="cf-sub">' + who + esc(S.settings.year || "") + " \u00b7 " + S.students.length + " students \u00b7 " + S.ggroups.length + " groups</div></div>" +
    '<div class="cf-meta">Printed ' + esc(cgLongDate(todayISO())) + "</div></div>";
  S.ggroups.forEach(gr => {
    const sids = ggMembers(gr.id), g = ggOpenGoal(gr.id);
    h += '<section class="gg-s-block"><h3 class="cg-s-h">' + esc(gr.name) + ' <span class="cg-s-n">' + (ggIsExtend(gr) ? "each child\u2019s next skill" : esc(dispCode(gr.std))) + " \u00b7 " + sids.length + " children</span></h3>";
    if (!g) {
      const st = ggStat(gr, sids);
      h += '<p class="cf-none">No goal set yet. ' + (st.marked ? st.at + " of " + st.marked + (ggIsExtend(gr) ? " at 4 on their next skill now." : " at 3 or higher now.") : "") + "</p></section>";
      return;
    }
    const now = cgGoalNow(g);
    h += '<p class="cg-s-goal">' + esc(cgStatement(g)) + "</p>" +
      '<table class="cf-table cg-s-nums"><thead><tr><th>Measure</th><th class="cf-c">Baseline</th><th class="cf-c">Now</th><th class="cf-c">Target</th></tr></thead><tbody>' +
      '<tr><td>Classwork: ' + cgBarWords(g) + '</td><td class="cf-c">' + (g.base.pct == null ? "\u2013" : g.base.pct + "%") + '</td><td class="cf-c">' +
      (now.st.pct == null ? "\u2013" : now.st.pct + "%") + ' <span class="cg-s-n">(' + now.st.at + "/" + now.st.marked + ')</span></td><td class="cf-c">' + g.target + "%</td></tr>" +
      (g.ir ? '<tr><td>iReady: on or above in ' + esc(cgDom(g.ir.dom).name) + '</td><td class="cf-c">' + (g.ir.base && g.ir.base.pct != null ? g.ir.base.pct + "%" : "\u2013") +
        '</td><td class="cf-c">' + (now.ir && now.ir.n ? now.ir.pct + '% <span class="cg-s-n">(' + now.ir.on + "/" + now.ir.n + ")</span>" : "\u2013") + '</td><td class="cf-c">' + (g.ir.target == null ? "\u2013" : g.ir.target + "%") + "</td></tr>" : "") +
      "</tbody></table>" +
      '<p class="cf-says"><b>' + ({ met: "Met.", on: "On pace.", behind: "Behind pace.", early: "Early days.", none: "No marks yet." }[now.pace]) + "</b> " +
      esc(cgPaceWords(g, now).replace(/^[^.]*\.\s*/, "")) + (now.st.n !== g.base.n ? " Started with " + g.base.n + " children; " + now.st.n + " now." : "") + "</p>" +
      cgChartSVG(g, true, false, 110).replace('class="cg-chart"', 'class="cg-chart cf-chart"');
    if (g.actions) h += '<p class="cg-s-text"><b>Doing:</b> ' + esc(g.actions).replace(/\n/g, "; ") + "</p>";
    const notes = (g.notes || []).slice().sort((a, b) => (a.date || "").localeCompare(b.date || "")).slice(-2);
    if (notes.length) h += '<p class="cg-s-text"><b>Latest:</b> ' + notes.map(n => esc(shortDate(n.date)) + ": " + esc(n.text)).join(" \u00b7 ") + "</p>";
    h += "</section>";
  });
  return h + '<p class="cf-key">' + CG_KEY.replace("classroom marks", "the group's marks") + "</p></article>";
}
function printGroupGoals() {
  document.getElementById("printsheet").innerHTML = ggSheetHTML();
  const t = document.getElementById("toast");
  if (t) { clearTimeout(toastT); t.classList.remove("show"); t.style.display = "none"; }
  suitePrint();
  if (t) t.style.display = "";
}

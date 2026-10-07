/* planner/day-view.js (v112): the Today view laid out as the day, part of the planner.
   Moved unchanged from suite-boot.js (v93, v98, v110), where it was built while
   the planner was thought protected. Loaded after curriculum.js and
   suite-boot.js, as it ran before, so a card's additions land in the same
   order. */
/* ---- v93: the day, in one place ----
   The Today view had the subject cards ("Where we are") and, under them, a
   read-only timeline of the day's schedule ("The day, block by block") that
   repeated them. He planned on the cards and never used the timeline. Now
   the cards ARE the day: the rail is laid out in the order of that
   weekday's schedule, and every block without a lesson (arrival, recess,
   lunch, specials, dismissal) is a slim row in its place, with any standing
   note from Settings and a note of its own for that day. The timeline panel
   is taken away. (v112: built in suite-boot.js while the planner was thought
   protected; moved here unchanged. The planner calls cardBlocks from
   cardHTML, afterToday from renderToday, withDayNotes from copySubPlan; it
   runs after the first draw and redraws, as it did from suite-boot.js.)

   - renderToday: after the planner draws, the rail is rebuilt in schedule
     order. The card nodes are moved, not redrawn, so every control keeps
     the handler wireToday gave it. A subject's card sits at its first block;
     its later blocks in the same run are listed inside the card; a block for
     it that comes back after something else is a slim "continued" row. A
     subject that is on but has no block that day keeps its place at the end.
     A day with no schedule is left as the planner draws it, empty-state
     panel and "Copy Monday's schedule here" included.
   - cardHTML: the card lists its blocks (time, name, standing note) when
     there is more than one, or one with its own name or a standing note.
     Done in the card's HTML so a card redrawn on its own keeps it.
   - copySubPlan: the copied plan carries each block's note for the day.

   A block's note for the day is draft.blockNotes["8:00|Recess"] (start time
   and name, as Settings has them). The planner saves the whole draft, so it
   is saved, stashed and synced with the day and nothing else; a day built
   fresh has none, so notes never carry forward. Sub plans print them under
   "Just for this day". */
(function () {

  function e$(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function bkey(b) { return String(b.t || "") + "|" + String(b.l || ""); }
  function onIds() {
    var o = {};
    S.subjects.forEach(function (s) { if (s && s.on) o[s.id] = s; });
    return o;
  }
  /* the day, in order: cards, rows, and "continued" rows */
  function dayPlan(blocks) {
    var on = onIds(), seen = {}, prev = null, out = [];
    blocks.forEach(function (b, i) {
      var s = b && b.s && on[b.s] ? b.s : null;
      if (s) {
        if (!seen[s]) { seen[s] = true; out.push({ kind: "card", id: s }); }
        else if (prev !== s) out.push({ kind: "cont", id: s, b: b, i: i });
      } else out.push({ kind: "row", b: b, i: i });
      prev = s;
    });
    S.subjects.forEach(function (s) { if (s && s.on && !seen[s.id]) out.push({ kind: "card", id: s.id }); });
    return out;
  }
  /* v110: spanOf and markNow are the planner's own now; named here as before for tests */
  window.PlannerDay = { dayPlan: dayPlan, key: bkey,
    spanOf: function (t) { return window.spanOf(t); }, markNow: function () { return window.markNow(); } };

  var CELL_H = 380;
  var STYLE = [
    ".rail.byday .dayrow{grid-column:1/-1;display:flex;gap:12px;align-items:flex-start;padding:7px 4px 7px 2px;border-top:1.5px solid var(--line)}",
    ".rail.byday .dayrow time{font-family:var(--mono);font-size:11px;color:var(--ink-2);flex:0 0 82px;padding-top:3px}",
    ".rail.byday .drbody{flex:1;min-width:0}",
    ".rail.byday .drlabel{font-size:14px;color:var(--ink);display:flex;align-items:center;gap:8px;flex-wrap:wrap}",
    ".rail.byday .drlabel .drsub{font-size:12.5px;color:var(--ink-3)}",
    ".rail.byday .drnote{font-size:13px;color:var(--ink-2);margin-top:2px;line-height:1.5;white-space:pre-line}",
    ".rail.byday .dradd{background:none;border:0;padding:2px 0;margin-top:1px;font:inherit;font-size:12.5px;color:var(--ink-3);cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px}",
    ".rail.byday .dradd:hover{color:var(--ink-2)}",
    ".rail.byday .drday{display:block;width:100%;box-sizing:border-box;margin-top:5px;resize:none;overflow:hidden;min-height:34px;font:inherit;font-size:13.5px;line-height:1.45;color:var(--ink);background:var(--card, #fff);border:1.5px solid var(--line);border-radius:8px;padding:6px 9px}",
    ".rail.byday .drday:focus{outline:none;border-color:var(--ink-2)}",
    ".sub .cblocks{list-style:none;margin:8px 0 0;padding:0;font-size:12.5px;color:var(--ink-2);line-height:1.45}",
    ".sub .cblocks li{display:flex;gap:8px;padding:1px 0}",
    ".sub .cblocks time{font-family:var(--mono);font-size:11px;flex:0 0 76px;padding-top:1px;color:var(--ink-3)}",
    ".sub .cblocks .cbn{display:block;color:var(--ink-3)}",
    "@media (max-width:760px){.rail.byday .dayrow time{flex-basis:70px}.rail.byday .drday{font-size:16px}}",
    "@media print{.rail.byday .dradd{display:none}}",
    /* v98: on a computer the day is a regular grid. Every cell is the same
       width and height, in schedule order, left to right: a lesson card, or
       one lighter cell holding a run of plain blocks. A long cell fades out
       into Show more, which opens it in place, over the cells below, so the
       grid never moves. Phones (760px and under) and print keep the v93
       column: the cells' wrappers become display:contents there. */
    "@media screen and (min-width:761px){" +
      ".rail.byday{grid-template-columns:repeat(auto-fill,minmax(270px,1fr));align-items:start;gap:12px}" +
      ".rail.byday>.blockcell{grid-column:auto;background:rgba(255,255,255,.55);border:1.5px dashed var(--line);border-radius:12px;padding:8px 10px}" +
      ".rail.byday>.blockcell .dayrow{border-top:0;padding:6px 0}" +
      ".rail.byday>.blockcell .dayrow+.dayrow{border-top:1px solid var(--line)}" +
      ".rail.byday>.blockcell .dayrow time{flex-basis:66px}" +
      ".rail.byday>.sub:not(.skip),.rail.byday>.blockcell{height:" + CELL_H + "px;display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden}" +
      ".rail.byday .cmid{flex:1 1 auto;min-height:0;overflow:hidden;position:relative}" +
      ".rail.byday .over:not(.open)>.cmid::after{content:'';position:absolute;left:0;right:0;bottom:0;height:42px;pointer-events:none;background:linear-gradient(rgba(255,255,255,0),var(--card,#fff))}" +
      ".rail.byday>.blockcell.over:not(.open)>.cmid::after{background:linear-gradient(rgba(246,247,248,0),rgb(246,247,248))}" +
      /* as specific as the fixed-height rule above, or that one wins */
      ".rail.byday>.sub.open:not(.skip),.rail.byday>.blockcell.open{height:auto;position:relative;z-index:30;overflow:visible;box-shadow:0 10px 28px rgba(16,24,32,.18)}" +
      ".rail.byday>.blockcell.open{background:var(--card,#fff)}" +
      ".rail.byday>.open>.cmid{overflow:visible}" +
      ".rail.byday .sub>.subnote{flex:none}" +
      ".rail.byday .more{flex:none;align-self:flex-start;margin:6px 0 4px;background:none;border:0;padding:2px 0;font:inherit;font-size:12.5px;font-weight:600;color:var(--ink-2);cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px}" +
      ".rail.byday .more:hover{color:var(--ink)}" +
      "}",
    /* on a wide screen the Today view takes more of it: up to five across */
    "@media screen and (min-width:1600px){html:not([data-suite-theme]):has(.rail.byday){--x-w:1560px}}",
    "@media not screen,(max-width:760px){.rail.byday>.blockcell,.rail.byday .cmid{display:contents}.rail.byday .more{display:none}}"
  ].join("\n");
  function style() {
    if (document.getElementById("pl-day-style")) return;
    var st = document.createElement("style");
    st.id = "pl-day-style";
    st.textContent = STYLE;
    document.head.appendChild(st);
  }

  /* ---------- the card lists its blocks ---------- */
  function cardBlocks(sb, html) {
    try {
      var blocks = blocksFor(cursor), mine = [];
      blocks.forEach(function (b, i) { if (b && sb && b.s === sb.id) mine.push({ b: b, i: i }); });
      var show = mine.length > 1 || mine.some(function (x) { return x.b.n || String(x.b.l || "") !== sb.name; });
      if (!show) return html;
      var list = '<ul class="cblocks" aria-label="' + e$(sb.name) + ' blocks today">' + mine.map(function (x) {
        return "<li><time>" + e$(span(x.b.t, blockEnd(blocks, x.i))) + "</time><span>" + e$(x.b.l) +
          (x.b.n ? '<span class="cbn">' + e$(x.b.n) + "</span>" : "") + "</span></li>";
      }).join("") + "</ul>";
      var at = html.indexOf('<textarea class="subnote"');
      if (at >= 0) html = html.slice(0, at) + list + html.slice(at);
    } catch (x) { }
    return html;
  }

  /* ---------- the day laid out ---------- */
  function rowHTML(item, blocks) {
    var b = item.b, t = span(b.t, blockEnd(blocks, item.i));
    if (item.kind === "cont") {
      var sb = sub(item.id);
      return '<div class="dayrow cont" style="--c:' + e$(sb.color) + '"><time>' + e$(t) + '</time><div class="drbody">' +
        '<div class="drlabel"><span class="dot"></span>' + e$(b.l) + '<span class="drsub">' + e$(sb.name) + ", continued from its card</span></div>" +
        (b.n ? '<div class="drnote">' + e$(b.n) + "</div>" : "") + "</div></div>";
    }
    var k = bkey(b), note = (draft && draft.blockNotes && draft.blockNotes[k]) || "";
    return '<div class="dayrow" data-bk="' + e$(k) + '"><time>' + e$(t) + '</time><div class="drbody">' +
      '<div class="drlabel">' + e$(b.l) + "</div>" +
      (b.n ? '<div class="drnote">' + e$(b.n) + "</div>" : "") +
      (note
        ? '<textarea class="drday" rows="1" data-bk="' + e$(k) + '" aria-label="Today\u2019s note for ' + e$(b.l) + '">' + e$(note) + "</textarea>"
        : '<button type="button" class="dradd" data-bk="' + e$(k) + '">Add a note for today</button>') +
      "</div></div>";
  }
  function fit(ta) { try { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + 2 + "px"; } catch (x) { } }
  function wireRow(row) {
    var k = row.getAttribute("data-bk");
    if (!k) return;
    function bindTa(ta) {
      fit(ta);
      ta.addEventListener("input", function () {
        if (!draft) return;
        var v = ta.value;
        if (!draft.blockNotes || typeof draft.blockNotes !== "object") draft.blockNotes = {};
        if (v.trim()) draft.blockNotes[k] = v; else delete draft.blockNotes[k];
        if (!Object.keys(draft.blockNotes).length) delete draft.blockNotes;
        fit(ta);
        touch();
      });
    }
    var ta = row.querySelector("textarea.drday");
    if (ta) bindTa(ta);
    var add = row.querySelector(".dradd");
    if (add) add.addEventListener("click", function () {
      var t = document.createElement("textarea");
      t.className = "drday"; t.rows = 1; t.setAttribute("data-bk", k);
      t.setAttribute("aria-label", "Today\u2019s note for " + (row.querySelector(".drlabel").textContent || ""));
      t.placeholder = "Just for today";
      add.parentNode.replaceChild(t, add);
      bindTa(t);
      t.focus();
    });
  }
  /* ---------- v98: the day as a regular grid ----------
     Cards stay direct children of the rail (other code finds them there).
     A run of plain block rows goes into one .blockcell; each card's middle
     (curriculum detail, starting point, its blocks) into a .cmid, so the
     title, the stepper and the notes box stay in view when it is clipped.
     Which cells are open is remembered across re-renders (a nudge, a Skip,
     another day) until closed or the page is reloaded. */
  var openCells = {};
  function cellKey(c) {
    if (c.classList.contains("sub")) { var b = c.querySelector("[data-skip]"); return b ? "s:" + b.getAttribute("data-skip") : ""; }
    var r = c.querySelector(".dayrow");
    return r ? "b:" + (r.getAttribute("data-bk") || r.textContent.slice(0, 40)) : "";
  }
  function gridOn() {
    try { return window.matchMedia("screen and (min-width:761px)").matches; } catch (x) { return false; }
  }
  function gridCells(rail) {
    var run = null;
    [].slice.call(rail.children).forEach(function (n) {
      if (n.classList && n.classList.contains("dayrow")) {
        if (!run) {
          run = document.createElement("div"); run.className = "blockcell";
          var m = document.createElement("div"); m.className = "cmid"; run.appendChild(m);
          rail.insertBefore(run, n);
        }
        run.firstChild.appendChild(n);
      } else run = null;
    });
    [].forEach.call(rail.querySelectorAll(":scope > .sub:not(.skip)"), function (card) {
      var parts = [].filter.call(card.children, function (x) { return x.matches && x.matches(".rv,.prov,.cblocks"); });
      if (!parts.length) return;
      var mid = document.createElement("div"); mid.className = "cmid";
      card.insertBefore(mid, parts[0]);
      parts.forEach(function (x) { mid.appendChild(x); });
    });
    [].forEach.call(rail.querySelectorAll(":scope > .sub:not(.skip), :scope > .blockcell"), function (c) {
      if (openCells[cellKey(c)]) c.classList.add("open");
    });
    measure(rail);
    setTimeout(function () { measure(rail); }, 300);      /* after fonts settle */
  }
  /* which cells need Show more, and keep an open one from moving the grid */
  function measure(rail) {
    if (!rail || !rail.isConnected) return;
    var on = gridOn();
    [].forEach.call(rail.querySelectorAll(":scope > .sub:not(.skip), :scope > .blockcell"), function (c) {
      var mid = c.querySelector(":scope > .cmid"), btn = c.querySelector(":scope > .more");
      var open = c.classList.contains("open");
      var over = false;
      if (on && mid) {
        if (open) over = true;
        else over = mid.scrollHeight > mid.clientHeight + 4;
      }
      c.classList.toggle("over", over);
      if (over && !btn) {
        btn = document.createElement("button");
        btn.type = "button"; btn.className = "more";
        btn.addEventListener("click", function (e) { e.stopPropagation(); setOpen(c, !c.classList.contains("open")); });
        if (mid.nextSibling) c.insertBefore(btn, mid.nextSibling); else c.appendChild(btn);
      }
      if (!over && btn) btn.parentNode.removeChild(btn);
      if (btn && over) {
        btn.textContent = open ? "Show less" : "Show more";
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      }
      /* open, it is taller than its cell; a negative margin hands the grid
         back exactly one cell's height, so nothing after it moves */
      c.style.marginBottom = open && on ? (CELL_H - c.offsetHeight) + "px" : "";
    });
  }
  function setOpen(c, open) {
    var rail = c.parentNode;
    [].forEach.call(rail.querySelectorAll(":scope > .open"), function (o) {
      if (o !== c) { o.classList.remove("open"); delete openCells[cellKey(o)]; }
    });
    c.classList.toggle("open", open);
    if (open) openCells[cellKey(c)] = true; else delete openCells[cellKey(c)];
    measure(rail);
  }
  function closeAll() {
    var rail = document.querySelector(".rail.byday");
    if (!rail) return;
    var o = rail.querySelector(":scope > .open");
    if (o) setOpen(o, false);
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(); });
  document.addEventListener("click", function (e) {
    var rail = document.querySelector(".rail.byday");
    var o = rail && rail.querySelector(":scope > .open");
    if (o && !o.contains(e.target) && document.contains(e.target)) setOpen(o, false);
  });
  /* typing a note can make a cell outgrow itself; a resize changes columns */
  var measureT = null;
  function remeasure() { clearTimeout(measureT); measureT = setTimeout(function () { measure(document.querySelector(".rail.byday")); }, 120); }
  window.addEventListener("resize", remeasure);
  document.addEventListener("input", function (e) { if (e.target && e.target.closest && e.target.closest(".rail.byday")) remeasure(); });
  document.addEventListener("click", function (e) { if (e.target && e.target.closest && e.target.closest(".rail.byday .dradd")) remeasure(); }, true);

  /* v108's dayNotesBar() and markNow() moved into the planner in v110: it draws
     the notes bar in place and marks the lesson on now itself. */
  function layout() {
    var rail = document.querySelector(".rail");
    if (!rail || typeof cursor === "undefined") return;
    var blocks = blocksFor(cursor) || [];
    if (!blocks.length) return;               /* no schedule: the planner's own empty state stays */
    style();
    var cards = {};
    [].forEach.call(rail.querySelectorAll(":scope > .sub"), function (c) {
      var b = c.querySelector("[data-skip]");
      if (b) cards[b.getAttribute("data-skip")] = c;
    });
    var frag = document.createDocumentFragment(), holder = document.createElement("div");
    dayPlan(blocks).forEach(function (item) {
      if (item.kind === "card") { if (cards[item.id]) { frag.appendChild(cards[item.id]); delete cards[item.id]; } return; }
      holder.innerHTML = rowHTML(item, blocks);
      var row = holder.firstChild;
      wireRow(row);
      frag.appendChild(row);
    });
    Object.keys(cards).forEach(function (id) { frag.appendChild(cards[id]); });   /* anything unexpected keeps a place */
    [].slice.call(rail.childNodes).forEach(function (n) { if (!(n.classList && n.classList.contains("sub"))) rail.removeChild(n); });
    rail.appendChild(frag);
    rail.classList.add("byday");
    gridCells(rail);                                       /* v98 */
    if (typeof window.markNow === "function") window.markNow();   /* v110: the planner's own; the grid rebuilt cells */
    /* the timeline panel it replaces */
    [].forEach.call(document.querySelectorAll(".panel > h2"), function (h) {
      if (/^The day, block by block$/.test(h.textContent.trim())) h.parentNode.parentNode.removeChild(h.parentNode);
    });
  }
  function afterToday() {
    try { layout(); } catch (x) { if (window.console) console.error("planner day layout:", x); }
  }

  /* ---------- the copied plan carries the day's block notes ---------- */
  function withDayNotes(blocks) {
    var notes = draft && draft.blockNotes;
    if (!notes || !Object.keys(notes).length) return blocks;
    return blocks.map(function (b) {
      var n = notes[bkey(b)];
      if (!n) return b;
      var c = Object.assign({}, b);
      c.n = (b.n ? b.n + " \u00b7 " : "") + "Today: " + String(n).replace(/\s*\n\s*/g, " / ");
      return c;
    });
  }

  window.DayView = { cardBlocks: cardBlocks, afterToday: afterToday, withDayNotes: withDayNotes };   /* v112: the planner calls these */

  /* the planner may already have drawn Today before this ran */
  try { if (typeof view !== "undefined" && view === "today" && document.querySelector(".rail")) renderToday(); } catch (x) { }
})();

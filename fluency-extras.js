/* ============================================================
   fluency-extras.js
   Injected into the ORF tool (fluency/index.html) by one <script> tag.

   One thing since v132: COMPREHENSION on the Assess tab. After a read, a
   row of chips (Not asked, 0-3 of 3) sits above "Save this check", and the
   choice is filed under the saved check's id in suite:orfcomp:v1, which the
   gradebook's ORF tab reads (and edits, on a child's checks).

   Until v131 this file also drew monthly goals and the aim line on the
   tool's Growth tab, and Rename and the ELD tag on its Students tab. Those
   tabs were hidden in the suite from v87 (the gradebook's ORF tab does all
   of it) and only the standalone ORF app showed them; v132 spun that app
   off as its own project and removed them here. How the goals are set is
   written up in suite-orf.js, beside the engine.
   ============================================================ */
(function () {
  "use strict";
  if (window.FluencyExtras) return;
  if (!window.SuiteOrf) { if (window.console) console.warn("fluency-extras: suite-orf.js did not load"); return; }
  var G = window.SuiteOrf.goals;
  var KEY = "running-records-v1";

  /* ---------- storage ---------- */
  function readDB() {
    try {
      var d = JSON.parse(window.localStorage.getItem(KEY) || "null");
      if (d && Array.isArray(d.students) && Array.isArray(d.records)) return d;
    } catch (e) { }
    return null;
  }
  /* Comprehension, 0-3 questions, per saved check. The tool's own records
     have no field for it and it would drop one on its next save, so it
     lives here, keyed by the check's id. */
  var COMP_KEY = "suite:orfcomp:v1";
  function readComp() {
    var c = null;
    try { c = JSON.parse(window.localStorage.getItem(COMP_KEY) || "null"); } catch (e) { }
    return G.normComp(c);
  }
  function writeComp(c) {
    try { window.localStorage.setItem(COMP_KEY, JSON.stringify(c)); return true; }
    catch (e) { toast("Couldn't save comprehension on this device."); return false; }
  }

  /* ---------- page helpers ---------- */
  function $(s) { return document.querySelector(s); }
  function toast(msg) {
    var t = $("#toast"); if (!t) return;
    t.textContent = msg; t.classList.add("on");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("on"); }, 2400);
  }

  /* ---------- comprehension on the Assess tab ---------- */
  /* After a read the tool shows its scores and a "Save this check" button.
     A row of chips goes above that button: Not asked, 0-3 of 3. When the
     check is saved the tool gives it an id this script cannot see, so the
     choice is held with the ids already stored, and once the tool's save
     has landed (its timer is 120ms) the check for that student that was not
     there before is the new one, and the choice is filed under its id. Changing it later is in the gradebook's ORF tab, on the child's checks. */
  var compPick = null, compPending = null;
  function decorateResults() {
    var res = $("#results");
    if (!res) return;
    var save = res.querySelector("#btnSaveRec");
    if (!save) { compPick = null; return; }
    if (res.querySelector("#fxComp")) return;
    compPick = null;
    var row = save.closest(".row") || save.parentNode;
    var box = document.createElement("div");
    box.id = "fxComp";
    box.style.cssText = "margin:4px 0 12px;font-size:13px;color:var(--ink-2)";
    box.innerHTML = "Comprehension questions: " + [["", "Not asked"], [0, "0 of 3"], [1, "1 of 3"], [2, "2 of 3"], [3, "3 of 3"]].map(function (x) {
      return "<span class=\"chip tap" + (x[0] === "" ? " on" : "") + "\" role=\"button\" tabindex=\"0\" data-fx-q=\"" + x[0] + "\">" + x[1] + "</span>";
    }).join("");
    row.parentNode.insertBefore(box, row);
  }
  function onResultsClick(e) {
    var chip = e.target.closest("[data-fx-q]");
    if (chip) {
      var v = chip.getAttribute("data-fx-q");
      compPick = v === "" ? null : +v;
      chip.parentNode.querySelectorAll("[data-fx-q]").forEach(function (c) { c.classList.toggle("on", c === chip); });
      return;
    }
    if (e.target.closest("#btnSaveRec") && compPick != null) {
      var sel = $("#selStudent"), db0 = readDB();
      /* the checks already stored for this student: the new one is whichever
         is not among them once the tool has saved (no clocks compared) */
      var had = {};
      (db0 ? db0.records : []).forEach(function (r) { had[r.id] = 1; });
      compPending = { sid: sel ? sel.value : "", comp: compPick, had: had };
      setTimeout(fileComp, 400);
    }
  }
  function fileComp() {
    var p = compPending; compPending = null;
    if (!p || !p.sid) return;
    var db = readDB(); if (!db) return;
    var c = readComp();
    var fresh = db.records.filter(function (r) {
      return r.studentId === p.sid && !p.had[r.id] && !(r.id in c.records);
    }).sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    if (!fresh.length) return;            /* the save did not go through */
    c.records[fresh[0].id] = p.comp;
    writeComp(c);
  }

  /* ---------- wiring ---------- */
  function start() {
    if (window.storage) return;           /* running inside a host that stores elsewhere */
    var res = $("#results");
    if (!res) return;
    if (window.MutationObserver) new MutationObserver(decorateResults).observe(res, { childList: true });
    res.addEventListener("click", onResultsClick, true);
  }

  window.FluencyExtras = { readComp: readComp, COMP_KEY: COMP_KEY };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

/* ============================================================
   groups/orf-suggest.js
   Since v89 the suggested reading groups are suite-orf.js's
   (SuiteOrf.suggest), the one copy the gradebook and Small Groups both
   call. This file only keeps the old name, window.OrfSuggest, for anything
   that still asks for it. It needs suite-orf.js loaded first.
   ============================================================ */
(function () {
  "use strict";
  if (!window.SuiteOrf || !window.SuiteOrf.suggest) { if (window.console) console.warn("orf-suggest: suite-orf.js did not load"); return; }
  window.OrfSuggest = window.SuiteOrf.suggest;
})();

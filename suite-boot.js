/* Starts sync and the service worker on the tools that have no boot code of
   their own. The gradebook does both itself and does not load this file.

   Neither the planner nor the running-records tool re-reads local storage after
   startup, so a pull that changes their data offers a reload rather than doing
   it silently — there may be an unsaved day on screen. */
(function () {
  if (!window.SuiteSync) return;

  function banner(msg, actionLabel, onAction) {
    var b = document.createElement("div");
    b.setAttribute("role", "status");
    b.setAttribute("aria-live", "polite");
    /* every other floating element in the suite clears the home indicator;
       this one did not, so on a notched phone it sat in the strip */
    b.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);" +
      "bottom:calc(64px + env(safe-area-inset-bottom,0px));z-index:2147483001;" +
      "background:#14202A;color:#fff;padding:10px 14px;border-radius:10px;display:flex;gap:12px;align-items:center;" +
      "font:13.5px/1.4 'IBM Plex Sans','Segoe UI',system-ui,sans-serif;" +
      "box-shadow:0 6px 24px rgba(0,0,0,.3);max-width:min(560px,92vw)";
    var t = document.createElement("span"); t.textContent = msg; b.appendChild(t);
    if (actionLabel) {
      var a = document.createElement("button");
      a.textContent = actionLabel;
      a.style.cssText = "border:0;background:#10655C;color:#fff;font:600 13px inherit;padding:6px 12px;border-radius:7px;cursor:pointer";
      a.onclick = onAction;
      b.appendChild(a);
    }
    var x = document.createElement("button");
    x.textContent = "\u00d7";
    x.style.cssText = "border:0;background:transparent;color:#9FB2B5;font-size:17px;cursor:pointer;padding:0 2px";
    x.onclick = function () { b.remove(); };
    b.appendChild(x);
    var old = document.getElementById("suitebanner");
    if (old) old.remove();
    b.id = "suitebanner";
    document.body.appendChild(b);
    return b;
  }

  var mine = location.pathname.indexOf("planner") >= 0
    ? ["lp:settings:v2", "lp:days:v2", "lp:me:v1", "lp:pending:v1"]
    : ["running-records-v1"];

  window.SuiteSync.onChanged(function (changed) {
    if (!changed.some(function (k) { return mine.indexOf(k) >= 0; })) return;
    banner("Newer data arrived from another machine.", "Reload", function () { location.reload(); });
  });

  window.SuiteSync.init();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("../sw.js").catch(function () { });
  }
})();

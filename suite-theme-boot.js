/* ==========================================================================
   suite-theme-boot.js

   Sits in <head> and runs synchronously. It warms the font connections, and
   since v92 clears the old look preference.

   The suite had three looks until v91: 2026, 2006 ("textured") and 2046,
   chosen from Look in the corner switcher and applied here, before the first
   paint, as `data-suite-theme` on the root element. v92 kept 2026 only. The
   attribute is never set now; suite-theme.css still prefixes its 2026 rules
   with `html:not([data-suite-theme])` (see the note there). `data-theme` on
   the same element is the planner's own, and was never this file's.
   ========================================================================== */
(function () {
  /* suite-theme.css asks for its typefaces with @import, which serialises:
     the browser cannot even discover the font request until it has fetched
     and parsed that stylesheet. Opening the connections here, from the head,
     overlaps the DNS lookup and the TLS handshake with everything else, so
     by the time the import is found the connection is already warm. Doing it
     from script rather than a <link> in each page is what keeps the planner's
     and the running-records tool's own files untouched. */
  try {
    ["https://fonts.googleapis.com", "https://fonts.gstatic.com"].forEach(function (href) {
      var l = document.createElement("link");
      l.rel = "preconnect";
      l.href = href;
      if (href.indexOf("gstatic") >= 0) l.crossOrigin = "anonymous";
      document.head.appendChild(l);
    });
  } catch (e) { /* the fonts still load, just a little later */ }

  /* v92: a device that chose 2006 or 2046 kept "suite:theme:v1". Nothing
     reads or writes it now, so it goes. It was never synced, and nothing can
     set it again, so this converges on every load rather than using a flag. */
  try { localStorage.removeItem("suite:theme:v1"); } catch (e) { }
})();

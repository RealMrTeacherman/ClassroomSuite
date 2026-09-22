/* ==========================================================================
   suite-theme-boot.js

   Sits in <head> and runs synchronously, so the chosen look is already on the
   root element before the first pixel is drawn. Doing this from the deferred
   nav script instead would paint the quiet theme and then repaint the
   textured one, which reads as a fault rather than a preference.

   Deliberately tiny and dependency-free. Deleting the one <script> tag puts
   every tool back to the quiet theme with nothing else to undo.
   ========================================================================== */
/* The attribute is `data-suite-theme`, not `data-theme`, and that matters.
   The planner has five looks of its own and sets `data-theme` on this very
   element as it boots (atomic, moonbase, console, fourcolor, formica). Both
   scripts writing the same attribute meant whichever ran last won: this one
   runs first, so the planner overwrote it a moment later and every one of
   the textured theme's rules stopped matching. The textured look had never
   worked on the planner at all, and pressing Look there wiped the planner's
   own theme until the next reload. Two names, two looks, no collision. */
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

  try {
    var t = localStorage.getItem("suite:theme:v1");
    if (t === "textured") {
      document.documentElement.setAttribute("data-suite-theme", "textured");
      /* the notch and the status bar are part of the page on a phone */
      var m = document.querySelector('meta[name="theme-color"]');
      if (m) m.setAttribute("content", "#283130");
    }
  } catch (e) { /* private mode, or storage disabled: quiet theme, no harm */ }
})();

/* ==========================================================================
   suite-theme-boot.js

   Sits in <head> and runs synchronously, so the chosen look is already on the
   root element before the first pixel is drawn. Doing this from the deferred
   nav script instead would paint the quiet theme and then repaint the
   textured one, which reads as a fault rather than a preference.

   Deliberately tiny and dependency-free. Deleting the one <script> tag puts
   every tool back to the quiet theme with nothing else to undo.
   ========================================================================== */
(function () {
  try {
    var t = localStorage.getItem("suite:theme:v1");
    if (t === "textured") document.documentElement.setAttribute("data-theme", "textured");
  } catch (e) { /* private mode, or storage disabled: quiet theme, no harm */ }
})();

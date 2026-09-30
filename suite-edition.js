/* suite-edition.js (v91) — which copy of the suite this is.

   This is the one file where the two copies of the suite are allowed to
   differ. Everything else ships byte for byte. `npm run share` swaps in
   tools/share/suite-edition.js for the Creslane copy, and test-share.js
   checks that this is the only difference.

   Put a setting here only when it is a build's default. What a teacher
   chooses is stored in that teacher's browser and wins over anything
   here, so this only decides what a board starts as.

     groupLook  the math board's four groups: "animals" (Fox, Bear,
                Tiger, Lion) or "colors" (Red, Blue, Yellow, Green) */
window.SuiteEdition = { name: "own", groupLook: "animals" };

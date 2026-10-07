/* suite-edition.js (v91) — which copy of the suite this is.

   This is the one file where the two copies of the suite are allowed to
   differ. Everything else ships byte for byte. `npm run share` swaps in
   tools/share/suite-edition.js for the Creslane copy, and test-share.js
   checks that this is the only difference.

   Put a setting here only when it is a build's default. What a teacher
   chooses is stored in that teacher's browser and wins over anything
   here, so this only decides what a board starts as.

     groupLook  the math board's four groups: "animals" (Fox, Bear,
                Tiger, Lion) or "colors" (Red, Blue, Yellow, Green)
     firebase   v106: this copy's Firebase project, so Planner sync asks
                only for an email and password. Firebase's web config is
                public by design (its security rules, tools/firestore.rules,
                protect the data); the Creslane copy has none, so no other
                teacher's suite points at this project. */
window.SuiteEdition = { name: "own", groupLook: "animals",
  firebase: {
    apiKey: "AIzaSyDbYEAJ8Y_FO5FZiILHkQePRFvNDoDUjME",
    authDomain: "classroomsuite-54865.firebaseapp.com",
    projectId: "classroomsuite-54865",
    storageBucket: "classroomsuite-54865.firebasestorage.app",
    messagingSenderId: "199350231153",
    appId: "1:199350231153:web:57cd7a8ead59b78acd7bd0"
  } };

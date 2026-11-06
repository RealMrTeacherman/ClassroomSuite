/* gradebook/gb-boot.js — Boot: the last file, run once every other gradebook file has loaded.
   One of the gradebook's scripts, loaded in order by index.html as classic
   scripts sharing one global scope; see HANDOFF "The gradebook's files". */
/* ============================================================
   BOOT
   ============================================================ */
load();
if (S.settings.subject) UI.subject = S.settings.subject;
paintSubjSwitch();
adoptCalendar();                                            /* v88 */
setTimeout(() => { try { publishSuggestions(); } catch (e) { } }, 0);   /* v89 */
const mergeRes = autoMergeDuplicates(true);
foldIreadyRows();                                           /* v83 */
const foldedOrf = foldOrfCopies();
syncIreadyScores();
if (foldedOrf) syncOrfScores();
/* ORF marks made under the other basis (every build before v59 graded each
   check against its own season) are rebuilt once. Converges: hand-entered
   marks are never touched, and a matching basis does nothing. */
if (S.settings.orfMarksBasis !== orfMarksKey() && S.orf.length) syncOrfScores();
pushRosterToOrf(true);                                      /* v87 */
if (S.settings.orfAutoLink) {
  const pulled = syncFromOrf(true);
  if (pulled) setTimeout(() => toast("Brought in " + pulled + " new reading" + (pulled === 1 ? "" : "s") + " from your ORF tool"), 600);
}
render();
openTabFromHash();
if (mergeRes) setTimeout(() => toast((mergeRes.count
  ? "Merged " + mergeRes.count + " duplicate student" + (mergeRes.count === 1 ? "" : "s")
  : "Took the ELD tag off " + mergeRes.renamed + " name" + (mergeRes.renamed === 1 ? "" : "s")) + " \u2014 see Setup"), 300);
initAssignmentKeys();
initSync();
/* groups the board sent while the gradebook was closed; and, while it
   is open, ones sent from another tab or arriving by sync */
setTimeout(boardGroupsArrived, 400);
window.addEventListener("storage", e => {
  if (e.key === BOARD_KEY && e.storageArea === window.localStorage) boardGroupsArrived();
});
/* a reading saved or corrected in the ORF tool in another tab reaches
   the marks now rather than the next time the gradebook is opened (one
   arriving from the other computer comes through initSync's onChanged) */
window.addEventListener("storage", e => {
  if (e.key !== ORF_KEY || e.storageArea !== window.localStorage) return;
  const a = document.activeElement;
  if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return;
  pushRosterToOrf(true);                                    /* a restore there cannot bring an old roster back */
  if (S.settings.orfAutoLink) syncFromOrf(true);
  render();
});
initPWA();
window.addEventListener("beforeunload", save);

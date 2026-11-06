/* gradebook/gb-setup.js — The Setup tab.
   One of the gradebook's scripts, loaded in order by index.html as classic
   scripts sharing one global scope; see HANDOFF "The gradebook's files". */
/* ============================================================
   TAB 6 — SETUP
   ============================================================ */
function hasPreRestore() {
  try { return !!localStorage.getItem(PRE_RESTORE); } catch (e) { return false; }
}
function undoRestore() {
  let prev = null;
  try { prev = localStorage.getItem(PRE_RESTORE); } catch (e) { }
  if (!prev) { toast("There is nothing to undo"); return; }
  if (!confirm("Put this device back to how it was before the last restore?\n\nWhatever the restore brought in will be replaced.")) return;
  try {
    S = hydrate(JSON.parse(prev));
    if (S.settings.subject) UI.subject = S.settings.subject;
    paintSubjSwitch();
    save();
    localStorage.removeItem(PRE_RESTORE);
    render();
    toast("Put back to before the restore");
  } catch (e) { toast("That could not be undone"); }
}

function paintHealth() {
  const el = document.getElementById("health");
  if (!el) return;
  const rows = [];
  const S_ = window.SuiteSync;

  if (S_) {
    /* A key on this origin that is in neither the synced list nor the
       deliberately-excluded one is a key that silently never travels. That
       used to be a comment asking the next person to remember. */
    const stray = S_.auditKeys ? S_.auditKeys() : [];
    if (stray.length) {
      rows.push('<b style="color:var(--s1)">Not in backups:</b> ' + stray.map(esc).join(", ") +
        ' \u2014 these are saved on this device only. Add them to KEYS in suite-sync.js, or to NEVER_SYNC with a reason.');
    }
  }

  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then(q => {
      if (!q || !q.quota) return;
      const pct = Math.round((q.usage / q.quota) * 100);
      const mb = (q.usage / 1048576).toFixed(1);
      const line = document.getElementById("health-quota");
      if (line) line.innerHTML = "Storage used: " + mb + " MB (" + pct + "% of what this browser allows)" +
        (pct > 80 ? ' \u2014 <b style="color:var(--s1)">running low</b>' : "");
    }).catch(() => {});
  }
  rows.push('<span id="health-quota">Storage used: checking\u2026</span>');
  rows.push('<span id="health-build">Build: checking\u2026</span>');

  el.innerHTML = rows.map(r => '<div style="padding:2px 0">' + r + "</div>").join("");

  if (window.SuiteBuild) {
    window.SuiteBuild.version().then(v => {
      const line = document.getElementById("health-build");
      if (line) line.textContent = "Build: " + (v || "not served by a service worker on this device");
    });
  }
}

function renderSetup() {
  const el = document.getElementById("panel-setup");
  let html = '<div class="stack">';

  /* Also here, not only on Students: this is where the roster is managed, and
     a notice nobody walks past is a notice nobody reads. */
  html += duplicateNoticeHTML();

  html += backupCardHTML();

  html += calendarCardHTML();                              /* v88 */

  /* roster */
  html += '<div class="card pad"><div class="sectionhead"><h2>Roster</h2><span class="spacer"></span><span class="hint">' + S.students.length + " students</span></div>" +
    '<textarea id="roster-paste" rows="3" style="width:100%" placeholder="Paste names, one per line. Either &quot;Smith, Ava&quot; or &quot;Ava Smith&quot; works. Add a student ID after a comma or tab if you have it."></textarea>' +
    '<div class="row" style="margin-top:8px"><button class="btn primary" onclick="addRoster()">Add these students</button></div>';
  if (S.students.length) {
    html += '<table style="margin-top:14px"><thead><tr><th>Last</th><th>First</th><th title="Other names this child goes by, such as Theo for Theodore. Separate with commas.">Also called</th><th>Student ID</th><th class="c">ELD</th><th></th></tr></thead><tbody>' +
      sortedStudents().map(s =>
        '<tr><td><input type="text" data-sf="last" data-id="' + s.id + '" value="' + esc(s.last) + '" style="width:110px"></td>' +
        '<td><input type="text" data-sf="first" data-id="' + s.id + '" value="' + esc(s.first) + '" style="width:110px"></td>' +
        '<td><input type="text" data-sf="aka" data-id="' + s.id + '" value="' + esc(akaOf(s).join(", ")) + '" placeholder="e.g. ' + esc(nickHint(s)) + '" aria-label="Also called" style="width:110px"></td>' +
        '<td><input type="text" data-sf="sid" data-id="' + s.id + '" value="' + esc(s.sid || "") + '" style="width:110px"></td>' +
        '<td class="c"><input type="checkbox" data-sf="eld" data-id="' + s.id + '"' + (s.eld ? " checked" : "") + "></td>" +
        '<td class="c"><button class="btn sm danger" onclick="removeStudent(\'' + s.id + '\')">Remove</button></td></tr>').join("") +
      "</tbody></table>";
  }
  html += "</div>";

  html += duplicatesCardHTML();

  /* the school year and its terms: the calendar card, above */

  /* standards */
  const onCount = Object.keys(S.active).filter(k => S.active[k]).length;
  html += '<div class="card pad"><div class="sectionhead"><h2>' + esc(subjLabel()) + ' standards in play</h2><span class="spacer"></span>' +
    '<label class="row small" style="gap:6px"><input type="checkbox" id="show-subs"' + (S.settings.showSubs ? " checked" : "") + "> Show sub-standards</label>" +
    (UI.subject !== "ELA" && window.RevealPacing ? '<label class="row small" style="gap:6px">Show math codes as <select id="set-mathcodes">' +
      '<option value="oregon"' + (S.settings.mathCodes !== "ccss" ? " selected" : "") + '>Oregon 2021 (Synergy)</option>' +
      '<option value="ccss"' + (S.settings.mathCodes === "ccss" ? " selected" : "") + '>CCSS (Reveal)</option></select></label>' : "") +
    '<span class="hint">' + onCount + " turned on</span></div>" +
    '<p class="hint">Turning a standard off hides it from entry and analysis; marks you already recorded are kept.</p>';
  (UI.subject === "All" ? ["Math", "ELA"] : [UI.subject]).forEach(subj => {
    html += '<h3 style="margin-top:14px">' + subj + "</h3>";
    const doms = [];
    CATALOG.filter(s => s.s === subj).forEach(s => { if (!doms.includes(s.d)) doms.push(s.d); });
    doms.forEach(d => {
      const list = CATALOG.filter(s => s.s === subj && s.d === d && stdListed(s));
      html += '<div style="margin:8px 0"><div class="tiny muted" style="font-weight:640;margin-bottom:4px">' + esc(d) +
        ' <button class="btn sm ghost" onclick="toggleDomain(\'' + esc(subj) + "','" + esc(d) + "',true)\">all on</button>" +
        '<button class="btn sm ghost" onclick="toggleDomain(\'' + esc(subj) + "','" + esc(d) + "',false)\">all off</button></div>";
      html += list.map(s =>
        '<label class="row small" style="gap:7px;padding:2px 0' + (s.lvl === 2 ? ";padding-left:22px" : "") + '"><input type="checkbox" data-std="' + s.c + '"' + (S.active[s.c] ? " checked" : "") + '>' + codeHTML(s.c) + " <span>" + esc(s.lbl) + "</span></label>").join("");
      html += "</div>";
    });
  });
  html += "</div>";

  
  /* data */
  html += '<div class="card pad"><h2>Your data</h2>' +
    '<p class="hint">Everything lives in this browser only \u2014 nothing is uploaded. Back it up regularly, and move it between computers with these buttons.</p>' +
    '<div class="row" style="margin-top:10px"><button class="btn" onclick="exportJSON()">Save a backup file</button>' +
    '<label class="btn" style="display:inline-flex">Restore from backup<input type="file" id="imp" accept=".json" hidden></label>' +
    '<button class="btn" onclick="downloadDetail()">Download all marks (CSV)</button>' +
    '<span style="flex:1"></span><button class="btn danger" onclick="wipe()">Erase everything</button></div>';
  /* when calculated marks go to Synergy's report card, the button goes
     here: downloadMarks() and copyColumn() already make what it sends. */
  if (hasPreRestore()) {
    html += '<p class="hint" style="margin-top:10px">A restore replaced what was on this device. ' +
      'The previous state is still here until the next restore.</p>' +
      '<div class="row"><button class="btn" onclick="undoRestore()">Undo the last restore</button></div>';
  }
  html += '</div>';

  html += termMarksCardHTML();                             /* v134 */
  html += '<div id="setup-iready" class="stack"></div>';     /* v134 */
  html += '<div id="setup-orfimport" class="stack"></div>';  /* v134 */

  html += '<div class="card pad"><h2>Planning prompts</h2>' +
    '<label class="row" style="gap:8px"><input type="checkbox" id="set-mapprompts"' +
    (S.settings.noMapPrompts ? '' : ' checked') + '>' +
    '<span class="small">When a mark lands on a date the planner says a unit was taught, offer to link that standard to that unit.</span></label>' +
    '<p class="hint">This is how the unit \u2192 standards map on the Planning tab gets filled in: a tap at a time, where you already know the answer. Nothing is ever written without the tap.</p></div>';

  /* ---------- how healthy is this actually ----------
     Three things that used to be knowable only from DevTools, or not at all:
     which build this device is running, whether anything on this origin is
     quietly not syncing, and whether the merge base is being kept. Each has
     cost a debugging session at least once. */
  /* the unit-to-standards map, from the old Planning tab */
  html += unitMapHTML();

  html += '<div class="card pad"><h2>This device</h2>' +
    '<div id="health" class="small muted">Checking\u2026</div></div>';

  html += "</div>";
  el.innerHTML = html;
  wireUnitMap();
  paintHealth();
  renderIReady();
  renderOrfImport();
  const tr = document.getElementById("tm-rule");
  if (tr) tr.onchange = e => { S.settings.rule = e.target.value; save(); renderSetup(); };
  const tc = document.getElementById("tm-carry");
  if (tc) tc.onchange = e => { S.settings.carryForward = e.target.checked; save(); };
  const ty = document.getElementById("tm-ytd");
  if (ty) ty.onchange = e => { S.settings.rcYTD = e.target.checked; save(); renderSetup(); };
  const tf = document.getElementById("tm-irfill");
  if (tf) tf.onchange = e => { S.settings.rcIreadyFill = e.target.checked; save(); };

  const mp = document.getElementById("set-mapprompts");
  if (mp) mp.onchange = e => { S.settings.noMapPrompts = !e.target.checked; save(); };
  document.getElementById("set-teacher").oninput = e => { S.settings.teacher = e.target.value; save(); };
  document.getElementById("set-year").oninput = e => { S.settings.year = e.target.value; save(); };
  document.getElementById("show-subs").onchange = e => { S.settings.showSubs = e.target.checked; save(); renderSetup(); };
  const mc = document.getElementById("set-mathcodes");
  if (mc) mc.onchange = e => { S.settings.mathCodes = e.target.value; save(); renderSetup(); };
  el.querySelectorAll("[data-sf]").forEach(inp => {
    inp.onchange = () => {
      const s = S.students.find(x => x.id === inp.dataset.id); if (!s) return;
      if (inp.dataset.sf === "aka") {
        const list = akaOf({ aka: inp.value }).filter(a => normName(a) !== normName(s.first));
        if (list.length) s.aka = list; else delete s.aka;
        save(); renderSetup(); return;
      }
      s[inp.dataset.sf] = inp.type === "checkbox" ? inp.checked : inp.value; save();
    };
  });
  el.querySelectorAll("[data-tf]").forEach(inp => {
    inp.onchange = () => { const t = S.terms.find(x => x.id === inp.dataset.id); t[inp.dataset.tf] = inp.value; save(); };
  });
  el.querySelectorAll("[data-mergefrom]").forEach(sel => {
    sel.onchange = () => { if (sel.value) mergeManually(sel.dataset.mergefrom, sel.value); };
  });
  document.getElementById("yr-start").onchange = e => { S.settings.yearStart = e.target.value; save(); };
  document.querySelectorAll("#calendar-card [data-cal]").forEach(inp => { inp.onchange = () => setCalendar(inp.dataset.cal, inp.value); });
  document.getElementById("yr-end").onchange = e => { S.settings.yearEnd = e.target.value; save(); };
  document.getElementById("yr-n").value = String(S.terms.length >= 2 && S.terms.length <= 4 ? S.terms.length : 4);
  el.querySelectorAll("[data-std]").forEach(cb => {
    cb.onchange = () => { S.active[cb.dataset.std] = cb.checked; save(); };
  });
  document.getElementById("imp").onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const parsed = JSON.parse(rd.result);
        /* Restoring replaces a year of work from a file picker, in one click,
           with no way back. Keep what was here first: it costs one write and
           it is the difference between a mis-picked file being a shrug and
           being the end of the year's records. */
        let snapshot = null;
        try { snapshot = localStorage.getItem(KEY); } catch (e2) { }
        S = hydrate(parsed);
        if (S.settings.subject) UI.subject = S.settings.subject;
        paintSubjSwitch();
        autoMergeDuplicates(true);
        save();
        if (snapshot) {
          try { localStorage.setItem(PRE_RESTORE, snapshot); } catch (e2) { }
        }
        render();
        toast("Backup restored" + (S.mergeLog && S.mergeLog.length ? " \u00b7 merged " + S.mergeLog.length + " duplicate students" : ""));
      } catch (err) { toast("That file could not be read"); }
    };
    rd.readAsText(f);
  };
}
function addRoster() {
  const box = document.getElementById("roster-paste");
  const lines = box.value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  let n = 0;
  lines.forEach(ln => {
    let sid = "", first = "", last = "";
    const parts = ln.split(/\t|,(?=\s*\S)/).map(x => x.trim());
    if (ln.indexOf(",") >= 0 && parts.length >= 2 && !/^\d+$/.test(parts[1])) {
      last = parts[0]; first = parts[1]; sid = parts[2] || "";
    } else {
      const w = parts[0].split(/\s+/);
      first = w.shift() || ""; last = w.join(" ");
      sid = parts[1] || "";
    }
    if (!first && !last) return;
    S.students.push({ id: uid(), first: first, last: last, sid: sid, eld: false });
    n++;
  });
  box.value = ""; save(); renderSetup(); toast("Added " + n + " students");
}
function removeStudent(id) {
  if (!confirm("Remove this student and all of their marks?")) return;
  S.students = S.students.filter(s => s.id !== id);
  S.scores = S.scores.filter(x => x.sid !== id);
  S.iready = S.iready.filter(x => x.sid !== id);
  Object.keys(S.groupPins).forEach(k => { delete S.groupPins[k][id]; });
  save(); renderSetup();
}
function toggleDomain(subj, dom, on) {
  CATALOG.filter(s => s.s === subj && s.d === dom && stdListed(s)).forEach(s => S.active[s.c] = on);
  save(); renderSetup();
}
function rebuildTerms() {
  const a = S.settings.yearStart, b = S.settings.yearEnd, n = Number(document.getElementById("yr-n").value);
  if (!a || !b || b <= a) { toast("Set a first and last day of school first"); return; }
  const dropped = S.terms.filter(t => Number(t.id.slice(1)) > n).map(t => t.id);
  if (dropped.length && !confirm("Going to " + n + " marking periods drops any marks you set by hand in the later ones. Continue?")) return;
  dropped.forEach(id => Object.keys(S.overrides).forEach(k => { if (k.indexOf(id + "|") === 0) delete S.overrides[k]; }));
  S.terms = splitYear(a, b, n);
  if (!S.terms.find(t => t.id === UI.reportTerm)) UI.reportTerm = S.terms[0].id;
  save(); renderSetup(); toast("Split into " + n + " marking periods");
}

function exportJSON() {
  const b = new Blob([JSON.stringify(S, null, 1)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b); a.download = "gradebook-backup-" + todayISO() + ".json"; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
/* The two above and below are not the same thing. exportJSON writes this
   gradebook only, which is what you want before a risky import. These two carry
   all three tools, which is what you want when moving to another device. */
function suiteBackup() {
  if (!window.SuiteSync) return toast("Sync module did not load");
  window.SuiteSync.exportFile().then(r => {
    if (r.how === "cancelled") return;
    toast(r.how === "share" ? "Backup saved" : "Saved " + r.name + " to Downloads");
    if (UI.tab === "setup") renderSetup();
  }).catch(e => toast("Could not save: " + (e.message || e)));
}
function suiteLoaded(changed) {
  const SS = window.SuiteSync;
  if (changed.length) { reloadFromStorage(); render(); }
  toast(SS.describeImport ? SS.describeImport(changed) : (changed.length ? "Restored" : "Nothing in that backup differed"));
  if (UI.tab === "setup") renderSetup();
}
function suiteRestore() {
  if (!window.SuiteSync) return toast("Sync module did not load");
  if (!confirm("Replace the gradebook, the lesson plans and the running records on this device with the backup you pick?\n\nUndo puts this device back as it is now.")) return;
  window.SuiteSync.importFile().then(suiteLoaded).catch(e => {
    if (e && e.message !== "AbortError") toast("Could not load that file: " + (e.message || e));
  });
}
function suiteUndoLoad() {
  if (!window.SuiteSync) return;
  window.SuiteSync.undoImport().then(changed => {
    reloadFromStorage(); render();
    toast(changed.length ? "Undone: back to how this device was before the restore" : "Nothing to undo");
  }).catch(e => toast("Could not undo: " + (e.message || e)));
}
function wipe() {
  if (!confirm("This erases the roster, every mark, and all imported data. Continue?")) return;
  if (!confirm("Really erase everything? Save a backup first if you are not sure.")) return;
  S = blankState(); save(); render(); toast("Everything erased");
}

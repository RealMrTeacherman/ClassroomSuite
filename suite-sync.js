/* ============================================================
   suite-sync.js
   Moving the suite's data between devices.

   v96: one route, chosen around the devices actually in use.
     - A computer in Chrome or Edge watches one folder (in iCloud Drive or
       Google Drive, say). It merges anything dropped there and keeps a
       current classroom.json in it, on its own, every few seconds.
     - A phone or iPad cannot watch a folder or keep hold of a file: every
       iOS browser is Safari underneath, and Safari gives a page a one-time
       copy of a picked file and nothing more. So it Sends (share sheet,
       Save to Files, into that folder) and Gets (picks classroom.json),
       one tap each.
     - Any device can email the sync file (v95), for a computer that can
       reach neither.
   The private-repo, Google sign-in and single-connected-file routes were
   removed in v96; a device still set up for one is told once, and keeps
   everything it has.

   All the tools live on one origin, so they already share local storage on
   any given device. The folder and the files are only the transport.
   ============================================================ */
(function () {
  if (window.SuiteSync) return;

  var KEYS = [
    "gb2_standards_v1",     /* gradebook */
    "lp:settings:v2",       /* planner */
    "lp:days:v2",
    "lp:me:v1",
    "lp:pending:v1",
    "running-records-v1",   /* oral reading fluency */
    "suite:subplan:v1",     /* sub plan standing notes */
    "suite:orfgoals:v1",    /* each student's own ORF year-end goal (fluency-extras.js) */
    "suite:orfcomp:v1",     /* comprehension questions per ORF check (fluency-extras.js) */
    "suite:orfnotes:v1",    /* v90: what the student said on missed words, and pauses, per ORF check (fluency-assess.js) */
    "suite:groups:v1",      /* math rotation groups: placements by gradebook student id (groups/) */
    "suite:readgroups:v1",  /* reading volunteer groups, per unit, by gradebook student id (groups/) */
    "suite:win:v1",         /* Walk to WIN lists for the grade, and where this class goes (groups/win.js) */
    "suite:suggest:v1",     /* v89: the gradebook's skill groups, offered on the Small Groups board */
    "suite:boardGroups:v1", /* v97: the math board's groups, sent back for the gradebook to take */
    "suite:district:v1",    /* v88: the planner's district calendar (first, last, grading days), copied for gradebook Setup */
    /* Migration flags have to travel. They are not preferences: they record a
       decision ("Health/SEL was deliberately deleted", "leave Writing on its
       stepper"), and a device that has not run a migration yet has an empty
       flag map. Left per-device, a phone that had never opened the planner
       would see no `health` subject, conclude the migration had not run, add
       the block back, and sync that back over the deletion. */
    "suite:migrations"
  ];
  /* Keys that are deliberately NOT synced, each for a stated reason. Anything
     on the origin that is in neither list is a mistake, and `auditKeys()`
     reports it rather than letting it fail silently. */
  var NEVER_SYNC = {
    /* v96: the three routes removed this build. Cleared on the first load
       of v96 (see retireOld); listed so that a device mid-way through that
       is not reported as having stray keys. */
    "suite:gh:v1": "v96: the retired GitHub route's token; cleared on load, never travels",
    "suite:gd:v1": "v96: the retired Google Drive route's settings; cleared on load",
    "suite:retired:v1": "v96: which retired route this device was using, and whether it has been told",
    "suite:lastGet:v1": "v96: when this device last brought in another device's file; drives the phone's Get reminder",
    "suite:theme:v1": "the look this device used until v91; a preference, not data, and cleared on load since v92",
    "suite:mailto:v1": "v95: the address this device's Email button fills in; set per device, like its name",
    "suite:device:v1": "this device's own name",
    "suite:syncBase:v1": "the merge base; superseded by IndexedDB, kept for migration",
    "suite:folderSeen:v1": "drops this device has already absorbed",
    "suite:folderFile:v1": "the name of this computer's own file in the watched folder",
    "suite:lastSync": "this device's clock on the last round",
    "suite:lastOk": "when this device last completed a round",
    "suite:ghExp": "v96: the retired GitHub token's expiry; cleared on load",
    "suite:lastExport:v1": "when this device last saved a sync file by hand, and whether it has changed since",
    /* v81: both are this device's own undo copies, taken just before a merge
       or a restore here. Sent to another computer they would undo the wrong
       machine's state. auditKeys() reported the first as stray after any
       gradebook merge, and Setup warned about it. */
    "gb2_standards_v1_premerge": "this device's undo copy from before its last gradebook merge",
    "gb2:preRestore:v1": "this device's undo copy from before its last gradebook restore",
    /* v83: the same, for the running-records tool's Restore from backup */
    "suite:orfPreRestore:v1": "this device's undo copy from before its last ORF tool restore",
    /* v99: planner sync through a private GitHub repository
       (suite-planner-sync.js). The token is this device's alone, and a
       "Not a student here" is a judgment made on this device's notes. */
    "suite:plannerHub:v1": "v99: this device's planner-sync repository, token and last round; never travels",
    "suite:plannerHubOk:v1": "v99: words this device was told are not a student's name, per note"
  };
  var KEY_PREFIXES = /^(gb2_|lp:|running-records|suite:)/;
  /* one IndexedDB store for everything here; "handle" is the retired
     connected file's slot, read once by retireOld() and then cleared */
  var HANDLE_DB = "suite_sync", HANDLE_KEY = "handle";
  /* Chrome and Edge on a computer. Not Safari on any platform, and so
     nothing on an iPhone or iPad. */
  var FOLDER_SUPPORTED = !!window.showDirectoryPicker;

  /* A write that lands while a round is already in flight is queued, not
     dropped: the round re-runs when it finishes (drainPending). */
  var pushPending = false;
  var state = FOLDER_SUPPORTED ? "off" : "unsupported";
  var detail = "";
  var listeners = [];

  function emit() { listeners.forEach(function (f) { try { f(state, detail); } catch (e) { } }); }
  function set(s, d) { state = s; detail = d || ""; emit(); }

  /* ---------- handle storage (a FileSystemFileHandle is not JSON) ---------- */
  function idb() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open(HANDLE_DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore("kv"); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function idbGet(k) {
    return idb().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction("kv", "readonly").objectStore("kv").get(k);
        t.onsuccess = function () { res(t.result || null); };
        t.onerror = function () { rej(t.error); };
      });
    }).catch(function () { return null; });
  }
  function idbSet(k, v) {
    return idb().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction("kv", "readwrite").objectStore("kv").put(v, k);
        t.onsuccess = function () { res(true); };
        t.onerror = function () { rej(t.error); };
      });
    }).catch(function () { return false; });
  }

  /* ---------- payload ---------- */
  function snapshot() {
    var keys = {};
    KEYS.forEach(function (k) {
      try { var v = localStorage.getItem(k); if (v != null) keys[k] = v; } catch (e) { }
    });
    return { suite: 1, updatedAt: new Date().toISOString(), keys: keys };
  }
  /* files written by the earlier gradebook-only version are still readable */
  function normalise(obj) {
    if (!obj || typeof obj !== "object") return null;
    if (obj.keys && typeof obj.keys === "object") return obj;
    /* A file from the gradebook-only version is the gradebook state itself,
       with no wrapper to recognise it by. Check that it actually looks like
       one before treating it as such: otherwise picking the wrong .json — easy
       to do on a phone, where the file picker is the only way data gets in —
       would quietly replace a whole roster with nothing. */
    var looksLikeGradebook = Array.isArray(obj.students) || Array.isArray(obj.scores) ||
      (obj.active && typeof obj.active === "object" && obj.settings);
    if (!looksLikeGradebook) return null;
    var keys = {};
    if (obj.planner && typeof obj.planner === "object") {
      Object.keys(obj.planner).forEach(function (k) { keys[k] = obj.planner[k]; });
    }
    var copy = Object.assign({}, obj);
    delete copy.planner;
    keys["gb2_standards_v1"] = JSON.stringify(copy);
    return { suite: 1, updatedAt: obj.updatedAt || "", keys: keys };
  }
  function setLocalStamp(s) { try { localStorage.setItem("suite:lastSync", s); } catch (e) { } }

  var applying = false;
  function apply(payload) {
    var changed = [];
    applying = true;
    Object.keys(payload.keys || {}).forEach(function (k) {
      if (KEYS.indexOf(k) < 0) return;
      var v = payload.keys[k];
      if (typeof v !== "string") return;
      try {
        if (localStorage.getItem(k) !== v) { localStorage.setItem(k, v); changed.push(k); }
      } catch (e) { }
    });
    setLocalStamp(payload.updatedAt || "");
    applying = false;
    return changed;
  }

  /* ---------- telling the page ---------- */
  var changeHandlers = [];
  function notifyChanged(changed) { changeHandlers.forEach(function (f) { try { f(changed); } catch (e) { } }); }

  function init() {
    /* The base has to be in hand before the first round: a round that runs
       without it resolves every disagreement in this device's favour. */
    return loadBase().then(initBackend);
  }
  function initBackend() {
    return retireOld().then(function () {
      if (!FOLDER_SUPPORTED) { set("unsupported"); return; }
      return idbGet(FOLDER_HANDLE_KEY).then(function (h) {
        if (!h) { set("off"); return; }
        folder = h;
        return folderPerm(false).then(function (okPerm) {
          if (!okPerm) { set("needsPermission", "tap to allow the folder again"); folderPoll(); return; }
          folderPoll();
          return folderSync({ force: true }).then(function (changed) {
            if (changed.length) notifyChanged(changed);
          });
        });
      });
    });
  }

  /* ---------- v96: the routes that were removed ----------
     A device still set up for the GitHub repository, the Google sign-in or
     a single connected file keeps all its data (it is in this browser), but
     the setting is cleared, along with the GitHub token, and the device
     notes which route it was on so the switcher can say so once. The note is
     a flag on purpose: it records an event, and "told" must stick. */
  var RETIRED_KEY = "suite:retired:v1";
  function retired() {
    try { return JSON.parse(localStorage.getItem(RETIRED_KEY) || "null") || null; } catch (e) { return null; }
  }
  function retireOld() {
    var was = [];
    try {
      if (localStorage.getItem("suite:gh:v1")) was.push("github");
      if (localStorage.getItem("suite:gd:v1")) was.push("drive");
    } catch (e) { }
    return idbGet(HANDLE_KEY).then(function (h) {
      if (h) was.push("file");
      if (!was.length) return;
      try {
        ["suite:gh:v1", "suite:ghExp", "suite:gd:v1"].forEach(function (k) { localStorage.removeItem(k); });
        if (!retired()) localStorage.setItem(RETIRED_KEY, JSON.stringify({ routes: was, at: new Date().toISOString(), told: false }));
      } catch (e) { }
      return idbSet(HANDLE_KEY, null);
    });
  }
  function retiredTold() {
    var r = retired();
    if (r && !r.told) { r.told = true; try { localStorage.setItem(RETIRED_KEY, JSON.stringify(r)); } catch (e) { } }
  }

  /* ---------- the fallback for phones and iPads ----------
     The File System Access API is Chrome/Edge desktop only, so on a phone the
     connected file is not available at all. A plain download and a plain file
     input work everywhere, carry exactly the same payload, and can be handed
     between devices through Drive, Files or mail. This is the only way data
     reaches an iPad, so it is not an afterthought.

     v77: this is also the whole sync for a computer that cannot install
     Google Drive for Desktop. Save a sync file here, drag it into Drive in the
     browser, download it on the other computer and drop it on any page. So a
     file now says which device wrote it (`from`, the same id that device's
     own file carries in a watched folder), and loading one MERGES instead of
     replacing: see "Loading a file by hand" below. */
  var EXPORT_KEY = "suite:lastExport:v1";
  function exportState() {
    try { return JSON.parse(localStorage.getItem(EXPORT_KEY) || "null") || null; } catch (e) { return null; }
  }
  /* a window event rather than emit(): emit() repaints the gradebook's Setup
     tab, and the first keystroke after a save would take the focus out of
     whatever field it was typed in */
  function tellUnsent() { try { window.dispatchEvent(new Event("suite:exported")); } catch (e) { } }
  function setExportState(o) { try { localStorage.setItem(EXPORT_KEY, JSON.stringify(o)); } catch (e) { } }
  /* called from the setItem wrapper: one write on the first change only */
  function markUnsent() {
    var st = exportState();
    if (st && !st.dirty) { st.dirty = true; setExportState(st); tellUnsent(); }
  }
  /* A phone or tablet: the share sheet is the way a file gets into Drive.
     A computer: the share sheet (Windows' and macOS's, which Chrome now
     offers) cannot reach Drive in a browser tab, while a download lands in
     Downloads, one drag from drive.google.com. */
  function touchDevice() {
    var ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod|Android/.test(ua)) return true;
    if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
    try {
      return !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches &&
        !window.matchMedia("(any-pointer: fine)").matches);
    } catch (e) { return false; }
  }
  function exportName() {
    var d = new Date();
    function two(n) { return (n < 10 ? "0" : "") + n; }
    var slug = String(deviceName()).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "device";
    /* the time and the device are in the name so a Drive folder with several
       in it sorts itself, and Drive never has to add "(1)" */
    return "classroom-" + d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate()) +
      "-" + two(d.getHours()) + two(d.getMinutes()) + "-" + slug + ".json";
  }
  function exportFile() {
    var payload = snapshot();
    payload.from = ownFile();
    payload.fromName = deviceName();
    var prev = exportState();
    payload.n = (prev && typeof prev.n === "number" ? prev.n : 0) + 1;
    var name = exportName();
    var blob = new Blob([JSON.stringify(payload, null, 1)], { type: "application/json" });
    function sent(how) {
      setExportState({ at: payload.updatedAt, dirty: false, name: name, n: payload.n }); tellUnsent();
      return { name: name, how: how };
    }

    function download() {
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = name; a.rel = "noopener";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      return sent("download");
    }

    /* On iOS a download lands wherever Safari decides and gives you no chance
       to put it in Drive. The share sheet does, and it is the natural way to
       move a file off a phone, so prefer it where it exists. It has to be
       reached from a real tap, which is why the caller opens a menu with
       buttons rather than a confirm(). */
    var file = null;
    try { file = new File([blob], name, { type: "application/json" }); } catch (e) { }
    if (file && touchDevice() && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file], title: "Classroom data" })
        .then(function () { return sent("share"); })
        .catch(function (e) {
          if (e && e.name === "AbortError") return { name: name, how: "cancelled" };
          return download();
        });
    }
    return Promise.resolve(download());
  }

  /* ------------------------------------------------------------
     Emailing the sync file (v95)

     A web page cannot send email. What it can do is hand a file to the
     device's share sheet, where Mail is one of the choices, with the subject
     and a line of instructions filled in. So the button prepares exactly what
     Save a sync file makes and opens the share sheet with it attached; he
     picks Mail and sends it to himself at school, where downloading the
     attachment into a watched Downloads folder merges it on its own.

     Chrome shares only some file types, and .json may not be one of them, so
     the same file goes as .txt where .json is refused; the watcher, the
     picker and drag-and-drop all take a classroom-*.txt. Where nothing can
     be shared, it saves the file and opens a new email to the address set
     for this device, to attach it to. Called from a real tap, and nothing is
     awaited before share(), or Safari refuses it.
     ------------------------------------------------------------ */
  var MAIL_KEY = "suite:mailto:v1";
  function mailAddress() { try { return String(localStorage.getItem(MAIL_KEY) || "").trim(); } catch (e) { return ""; } }
  function setMailAddress(v) {
    v = String(v || "").trim();
    try { if (v) localStorage.setItem(MAIL_KEY, v); else localStorage.removeItem(MAIL_KEY); } catch (e) { }
    return v;
  }
  function emailFile() {
    var payload = snapshot();
    payload.from = ownFile();
    payload.fromName = deviceName();
    var prev = exportState();
    payload.n = (prev && typeof prev.n === "number" ? prev.n : 0) + 1;
    var name = exportName();
    var json = JSON.stringify(payload, null, 1);
    var when = "";
    try { when = new Date().toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); } catch (e) { when = new Date().toString(); }
    var subject = "Classroom sync file \u00b7 " + deviceName() + " \u00b7 " + when;
    var body = "The classroom suite's sync file from " + deviceName() + ", " + when + ".\n\n" +
      "On the other computer, download the attachment. If the suite there is watching Downloads, it is merged on its own " +
      "within a few seconds; otherwise drop it on any page of the suite.";
    function sent(how, file) {
      setExportState({ at: payload.updatedAt, dirty: false, name: file, n: payload.n }); tellUnsent();
      return { name: file, how: how };
    }
    function make(n, type) { try { return new File([json], n, { type: type }); } catch (e) { return null; } }
    function shareable(f) {
      if (!f || !navigator.share || !navigator.canShare) return false;
      try { return navigator.canShare({ files: [f] }); } catch (e) { return false; }
    }
    function fallback() {
      var url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      var a = document.createElement("a");
      a.href = url; a.download = name; a.rel = "noopener";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      var m = document.createElement("a");
      m.href = "mailto:" + encodeURIComponent(mailAddress()).replace(/%40/g, "@") +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body + "\n\nAttach " + name + " from your Downloads folder before you send this.");
      document.body.appendChild(m); m.click(); m.remove();
      return sent("mailto", name);
    }
    var asJson = make(name, "application/json");
    var asTxt = make(name.replace(/\.json$/i, ".txt"), "text/plain");
    var file = shareable(asJson) ? asJson : shareable(asTxt) ? asTxt : null;
    if (file) {
      return navigator.share({ files: [file], title: subject, text: body })
        .then(function () { return sent("share", file.name); })
        .catch(function (e) {
          if (e && e.name === "AbortError") return { name: file.name, how: "cancelled" };
          return fallback();
        });
    }
    return Promise.resolve(fallback());
  }
  /* a sync file that went by email as .txt (v95) */
  var TXT_SYNC_RE = /^classroom-.*\.txt$/i;
  function syncFileName(n) { return /\.json$/i.test(n || "") || TXT_SYNC_RE.test(n || ""); }

  /* ------------------------------------------------------------
     Loading a file by hand (v77)

     Up to v76 loading a file replaced this device's data with it. That is
     right for restoring a backup and wrong for carrying work between two
     computers: marks entered here since the file was saved were thrown away.

     So a file is now merged the way a second computer's file is merged in a
     watched folder. It says which device wrote it, and it is compared with
     the last file from that same device (kept in IndexedDB): whatever that
     device changed since comes across, including a mark it deleted, and
     whatever was changed here is kept. The first file from a device has
     nothing to compare with, so it is laid over what is here: its values win,
     and nothing that is only here is removed. A file older than one already
     loaded from the same device is refused, because it could only take its
     edits back. A plain value changed on both sides goes to the device whose
     name sorts first, so two computers trading files end up agreeing.

     Every load keeps what was here first, and Undo puts it back exactly.
     "Replace" is still there for a real restore.
     ------------------------------------------------------------ */
  var HAND_IDB = "handPeers", UNDO_IDB = "handUndo";
  var lastImport = null, undoReady = false;
  /* The memory copy is the authority while the page is open, with IndexedDB
     behind it, as the folder code keeps its peers: a private window can
     refuse IndexedDB, and a merge that silently lost its comparison would
     treat every file as the first. */
  var handPeers = null, undoRec;   /* undefined: not read yet */
  function loadHandPeers() {
    if (handPeers) return Promise.resolve(handPeers);
    return idbGet(HAND_IDB).then(function (v) {
      if (!handPeers) handPeers = (v && typeof v === "object") ? v : {};
      return handPeers;
    });
  }
  function saveHandPeers() { idbSet(HAND_IDB, handPeers); }
  function loadUndo() {
    if (undoRec !== undefined) return Promise.resolve(undoRec);
    return idbGet(UNDO_IDB).then(function (v) { if (undoRec === undefined) undoRec = (v && v.keys) ? v : null; return undoRec; });
  }
  function saveUndo(u) { undoRec = u; undoReady = !!u; idbSet(UNDO_IDB, u); }
  loadUndo().then(function (u) { undoReady = !!u; emit(); });
  /* which of two files from one device is newer: its own count first, since
     two files can share a millisecond; the clock for files from before v77 */
  function newer(a, b) {
    if (typeof a.n === "number" && typeof b.n === "number") return a.n - b.n;
    return a.at < b.at ? -1 : a.at > b.at ? 1 : 0;
  }

  var LASTGET_KEY = "suite:lastGet:v1";
  function lastGet() { try { return JSON.parse(localStorage.getItem(LASTGET_KEY) || "null") || null; } catch (e) { return null; } }
  function importText(text, opts) {
    opts = opts || {};
    var raw;
    try { raw = JSON.parse(text); } catch (e) { return Promise.reject(new Error("that file is not a classroom backup")); }
    var payload = normalise(raw);
    if (!payload || !payload.keys) return Promise.reject(new Error("that file is not a classroom backup"));
    var from = String((raw && (raw.from || raw.writer)) || "");
    var fromName = String((raw && raw.fromName) || "") || (from ? from.replace(/^classroom\./, "").replace(/-[0-9a-f]{6}\.json$/, "") : "");
    var mine = ownFile();
    var remote = {};
    Object.keys(payload.keys).forEach(function (k) { if (KEYS.indexOf(k) >= 0 && typeof payload.keys[k] === "string") remote[k] = payload.keys[k]; });

    return loadHandPeers().then(function (peers) {
      /* v96: a file from another device has been looked at, whether or not
         it held anything new. The phone's Get reminder keys off this. */
      if (from && from !== mine) { try { localStorage.setItem(LASTGET_KEY, JSON.stringify({ at: new Date().toISOString(), fromName: fromName })); } catch (e) { } }
      var known = from && from !== mine ? peers[from] : null;
      var info = { from: from, fromName: fromName, own: !!from && from === mine, at: payload.updatedAt || "",
                   n: typeof raw.n === "number" ? raw.n : undefined,
                   replaced: !!opts.replace, stale: false, same: false, conflicts: 0, first: !known, changed: [] };

      var order = known && known.at && info.at ? newer(info, known) : 1;
      if (!opts.replace && order <= 0) {
        info.stale = order < 0; info.same = !info.stale;
        info.seenAt = known.at;
        lastImport = info;
        var none = []; none.info = info; return none;
      }

      var before = snapshot().keys;
      var next;
      if (opts.replace) {
        next = Object.assign({}, before, remote);
      } else {
        var m = mergeKeys(known ? known.keys : {}, before, remote, false, known ? from < mine : true);
        next = m.keys; info.conflicts = m.report.conflicts;
      }
      var undo = { at: new Date().toISOString(), keys: before, from: from, peer: from ? (peers[from] || null) : null, fromName: fromName };
      return Promise.resolve().then(function () {
        saveUndo(undo);
        var changed = apply({ keys: next, updatedAt: payload.updatedAt || new Date().toISOString() });
        if (from && from !== mine) {
          peers[from] = { at: info.at, n: info.n, keys: remote };
          saveHandPeers();
        }
        info.changed = changed;
        lastImport = info;
        if (changed.length && backend()) schedulePush();
        notifyChanged(changed);
        emit();
        changed.info = info;
        return changed;
      });
    });
  }
  function undoImport() {
    return loadUndo().then(function (u) {
      if (!u || !u.keys) throw new Error("there is no load to undo");
      applying = true;
      var changed = [];
      KEYS.forEach(function (k) {
        try {
          var cur = localStorage.getItem(k), was = u.keys[k];
          if (was === undefined || was === null) { if (cur !== null) { localStorage.removeItem(k); changed.push(k); } }
          else if (cur !== was) { localStorage.setItem(k, was); changed.push(k); }
        } catch (e) { }
      });
      applying = false;
      return loadHandPeers().then(function (peers) {
        if (u.from) { if (u.peer) peers[u.from] = u.peer; else delete peers[u.from]; saveHandPeers(); }
        saveUndo(null);
      }).then(function () {
        lastImport = null;
        if (changed.length && backend()) schedulePush();
        notifyChanged(changed);
        emit();
        return changed;
      });
    });
  }
  /* a File from a picker or a drop */
  function importBlob(f, opts) {
    return new Promise(function (res, rej) {
      if (!f) return rej(new Error("AbortError"));
      var r = new FileReader();
      r.onload = function () { importText(String(r.result), opts).then(res, rej); };
      r.onerror = function () { rej(new Error("could not read that file")); };
      r.readAsText(f);
    });
  }
  /* opens the picker itself, so a caller does not have to build an <input> */
  function importFile(opts) {
    return new Promise(function (res, rej) {
      var inp = document.createElement("input");
      inp.type = "file";
      inp.accept = "application/json,.json,text/plain,.txt";
      inp.style.cssText = "position:fixed;left:-9999px";
      inp.onchange = function () {
        var f = inp.files && inp.files[0];
        inp.remove();
        if (!f) return rej(new Error("AbortError"));
        importBlob(f, opts).then(res, rej);
      };
      document.body.appendChild(inp);
      inp.click();
    });
  }
  /* one sentence for a toast, shared by the gradebook and the switcher */
  function describeImport(changed) {
    var i = (changed && changed.info) || lastImport || {};
    var who = i.own ? "this device" : i.fromName || "another device";
    if (i.stale) return "That file from " + who + " is older than one already loaded here, so nothing changed.";
    if (i.same) return "Already loaded that file from " + who + ".";
    if (!changed || !changed.length) return "Nothing in that file was new.";
    var s = (i.replaced ? "Replaced with the file from " : "Brought in the file from ") + who + ".";
    if (i.conflicts) s += " " + i.conflicts + " edited in both places.";
    return s + " Undo is on the sync menu.";
  }

  /* ============================================================
     THREE-WAY MERGE

     Newest-wins is fine when only one device is ever open. Once two are
     syncing live, a lesson's worth of marks entered on the phone while the
     laptop sits open at the desk would be thrown away by whichever wrote last.

     So every write keeps a copy of what both sides last agreed on — the base —
     and a later disagreement is resolved against it: whichever side actually
     changed a thing wins, and only a genuine both-sides edit of the same field
     is a conflict. Every record the suite stores carries a stable `id`, which
     is what makes this possible on the arrays.
     ============================================================ */
  var BASE_KEY = "suite:syncBase:v1";
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function isObj(x) { return x && typeof x === "object" && !Array.isArray(x); }
  function idKeyed(a) {
    return Array.isArray(a) && a.every(function (x) { return isObj(x) && x.id != null; });
  }
  function anyIdArray(b, l, r) {
    var arrays = [b, l, r].filter(Array.isArray);
    if (arrays.length < 2) return false;
    if (!arrays.every(idKeyed)) return false;
    return arrays.some(function (a) { return a.length > 0; });
  }
  function index(a) {
    var m = {}; (a || []).forEach(function (x) { m[String(x.id)] = x; }); return m;
  }

  function merge3(base, local, remote, report) {
    if (same(local, remote)) return local;
    var container = anyIdArray(base, local, remote) || (isObj(local) && isObj(remote));
    /* "we never touched it, so take theirs" is right for a shared file, and
       wrong for a dropped one: the drop may simply not know about a student
       added here. For a container in additive mode, merge it record by
       record instead of adopting it whole. Plain values still follow the
       base, so a setting changed only on the phone still arrives. */
    if (!(report.additive && container) && same(base, local)) return remote;
    if (same(base, remote)) return local;   /* they never touched it */

    if (anyIdArray(base, local, remote)) {
      var bi = index(base), li = index(local), ri = index(remote);
      var out = [], seen = {};
      /* keep the local order, then anything the other side added */
      (local || []).forEach(function (rec) {
        var id = String(rec.id); seen[id] = 1;
        if (!(id in ri)) {
          /* A dropped file is one device saying "here is what I have", not
             "this is everything that exists" — it may have been written
             before the other side added anything. So absence in a drop is no
             opinion, never a deletion. Only the shared file can delete. */
          if (report.additive) { out.push(rec); return; }
          /* deleted over there: drop it only if we left it alone */
          if (id in bi && same(bi[id], rec)) return;
          report.kept++;
        }
        out.push(id in ri ? merge3(bi[id], rec, ri[id], report) : rec);
      });
      (remote || []).forEach(function (rec) {
        var id = String(rec.id);
        if (seen[id]) return;
        /* deleted here: drop it only if they left it alone */
        if (id in bi && same(bi[id], rec)) return;
        if (id in bi) report.kept++;
        out.push(rec);
      });
      return out;
    }

    if (isObj(local) && isObj(remote)) {
      var b = isObj(base) ? base : {};
      var out2 = {}, keys = {};
      [b, local, remote].forEach(function (o) { Object.keys(o).forEach(function (k) { keys[k] = 1; }); });
      Object.keys(keys).forEach(function (k) {
        var inB = k in b, inL = k in local, inR = k in remote;
        if (!inL && !inR) return;
        if (!inL) { if (!report.additive && inB && same(b[k], remote[k])) return; out2[k] = remote[k]; return; }
        if (!inR) { if (!report.additive && inB && same(b[k], local[k])) return; out2[k] = local[k]; return; }
        out2[k] = merge3(inB ? b[k] : undefined, local[k], remote[k], report);
      });
      return out2;
    }

    /* a plain value both sides changed. Keep what is on this device, since
       that is what the person in front of it can see, and say so. */
    report.conflicts++;
    /* Between two computers watching one folder, each keeping its own side
       would leave them disagreeing for good. So a folder peer merge says
       which side wins, and both computers work it out the same way. */
    return report.remoteWins ? remote : local;
  }

  function parseOr(v) {
    if (typeof v !== "string") return undefined;
    try { return JSON.parse(v); } catch (e) { return undefined; }
  }
  /* merges two key maps against the base, returning the agreed map */
  function mergeKeys(baseKeys, localKeys, remoteKeys, additive, remoteWins) {
    var report = { conflicts: 0, kept: 0, additive: !!additive, remoteWins: !!remoteWins, changedLocally: [], changedRemotely: [] };
    var out = {};
    var names = {};
    [baseKeys, localKeys, remoteKeys].forEach(function (m) {
      Object.keys(m || {}).forEach(function (k) { if (KEYS.indexOf(k) >= 0) names[k] = 1; });
    });
    Object.keys(names).forEach(function (k) {
      var lv = (localKeys || {})[k], rv = (remoteKeys || {})[k];
      /* A whole top-level key missing here is not a decision.
         These seven are the containers — the roster, the plans, the running
         records — and nothing in any tool deletes one on purpose. What does
         make one vanish is eviction: iOS Safari clears a site's local
         storage after about a week without a visit, and the phone sits in a
         drawer over spring break. The base can easily outlive it, since
         IndexedDB is evicted on a different schedule, and then the merge
         would read the gap as "deleted here, untouched there" and take the
         whole gradebook out on every other device. Absence of the container
         is no opinion; take whatever the other side has. */
      if (lv === undefined && rv !== undefined) {
        out[k] = rv;
        report.changedLocally.push(k);
        return;
      }
      var m = merge3(parseOr((baseKeys || {})[k]), parseOr(lv), parseOr(rv), report);
      if (m === undefined) return;
      out[k] = JSON.stringify(m);
      if (out[k] !== (localKeys || {})[k]) report.changedLocally.push(k);
      if (out[k] !== (remoteKeys || {})[k]) report.changedRemotely.push(k);
    });
    return { keys: out, report: report };
  }

  /* The base lives in IndexedDB, not local storage.
     It is a full second copy of everything the suite holds, and local storage
     is five megabytes on iOS — so on the device where the base matters most
     it was the first thing to be dropped when the year filled up. That is not
     the harmless degradation the old comment here claimed. Without a base
     every scalar difference reads as a both-sides edit, every one of those
     resolves to whatever is on this device, and a phone quietly overwrites
     each setting the desktop had changed. Measured, not assumed:

       with a base:    the other device's edit is taken, 0 conflicts
       with no base:   the other device's edit is discarded, 1 conflict

     IndexedDB has room for it. The in-memory copy is the authority during a
     round so the merge itself can stay synchronous; the store is written
     behind it. If even that fails, `baseDurable` goes false and the pill
     says so rather than letting the suite lose edits in silence. */
  var BASE_IDB = "syncBase";
  var baseCache = null, baseDurable = true, baseLoaded = false;

  function loadBase() {
    if (baseLoaded) return Promise.resolve(baseCache || {});
    return idbGet(BASE_IDB).then(function (v) {
      baseLoaded = true;
      if (v && typeof v === "object") { baseCache = v; return baseCache; }
      /* a base written by an earlier build: carry it over, then stop paying
         for it in local storage */
      var legacy = {};
      try { legacy = JSON.parse(localStorage.getItem(BASE_KEY) || "null") || {}; }
      catch (e) { legacy = {}; }
      baseCache = legacy;
      if (Object.keys(legacy).length) idbSet(BASE_IDB, legacy);
      try { localStorage.removeItem(BASE_KEY); } catch (e) { }
      return baseCache;
    }).catch(function () { baseLoaded = true; baseCache = {}; return baseCache; });
  }
  function readBase() { return baseCache || {}; }
  function writeBase(keys) {
    baseCache = keys;
    idbSet(BASE_IDB, keys).then(function (okWrite) {
      if (okWrite) {
        if (!baseDurable) { baseDurable = true; emit(); }
        return;
      }
      if (baseDurable) { baseDurable = false; emit(); }
    });
    return true;
  }

  /* Every key on this origin should be either synced or deliberately not.
     The old comment asking the next person to remember to add new keys to
     KEYS was the suite's quietest failure: a key left out simply never
     travels, and nothing says so. This turns that into something the Setup
     tab can show. */
  function auditKeys() {
    var stray = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || !KEY_PREFIXES.test(k)) continue;
        if (KEYS.indexOf(k) >= 0 || NEVER_SYNC[k]) continue;
        stray.push(k);
      }
    } catch (e) { }
    return stray;
  }

  /* ---------- this device's name ----------
     On every file it writes, so a merge can say where something came from,
     and in the name of a computer's own file in the folder. */
  var DEVICE_KEY = "suite:device:v1";
  function deviceName() {
    try {
      var d = localStorage.getItem(DEVICE_KEY);
      if (d) return d;
      var guess = /iPhone/.test(navigator.userAgent) ? "iPhone"
        : /iPad/.test(navigator.userAgent) ? "iPad"
        : /Android/.test(navigator.userAgent) ? "Android phone"
        : /Mac/.test(navigator.userAgent) ? "Mac" : "computer";
      localStorage.setItem(DEVICE_KEY, guess);
      return guess;
    } catch (e) { return "a device"; }
  }
  var lastReport = null;

  /* ---------- which backend is in charge ---------- */
  function backend() { return folder ? "folder" : ""; }

  /* Nothing used to write to the connected file when the tool you were
     looking at saved something — only another tab's storage event did, or the
     Write now button. Catching writes to a tracked key here makes every
     backend live, and means neither the planner nor the running records tool
     had to learn anything about sync. */
  var pushTimer = null;
  function schedulePush() {
    if (!backend()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(flushPush, 4000);
  }
  function busyNow() {
    return !!(folder && folderBusy) || laneBusy();
  }
  /* v99: the planner's GitHub round (suite-planner-sync.js) reads and
     writes the same keys. Two rounds interleaved would each apply what it
     read before the other wrote, and put the older copy back, so only one
     runs at a time: each checks the other before starting. */
  var otherLane = null;
  function laneBusy() { try { return !!(otherLane && otherLane()); } catch (e) { return false; } }
  function flushPush() {
    clearTimeout(pushTimer); pushTimer = null;
    if (busyNow()) { pushPending = true; return; }
    if (folder) folderSync({ quiet: true });
  }
  /* called at the end of every round, whatever the backend */
  function drainPending() {
    if (!pushPending) return;
    pushPending = false;
    setTimeout(flushPush, 0);
  }
  /* When a round finished cleanly. The pill reports the age of this rather
     than a flat "Synced", because "Synced" is a claim about the past shown in
     the present tense: a folder whose cloud client stopped on Friday leaves
     a green dot, and a quiet weekend is exactly when two devices drift. */
  var LASTOK_KEY = "suite:lastOk";
  function markOk() { try { localStorage.setItem(LASTOK_KEY, new Date().toISOString()); } catch (e) { } }
  function lastOk() { try { return localStorage.getItem(LASTOK_KEY) || ""; } catch (e) { return ""; } }

  /* A phone does not get a tidy shutdown — you press the home button and the
     tab is frozen. Anything still waiting on the debounce goes now.
     `pagehide` as well as `visibilitychange`: on iOS the tab is often killed
     outright rather than hidden first, and pagehide is the one that fires. */
  function flushIfWaiting() { if (pushTimer) flushPush(); }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) flushIfWaiting();
  });
  window.addEventListener("pagehide", flushIfWaiting);
  /* and when the network comes back, whatever was waiting goes out */
  window.addEventListener("online", function () {
    if (backend()) flushPush();
  });
  /* ---------- v81: a tool's write never undoes what arrived underneath it ----------
     The planner's lost days (v80) were one case of a pattern the sweep
     found in four more places: a tool holds its data in memory, writes the
     whole copy back, and does not re-read when a sync round (in this tab or
     another tab of the suite) changes storage underneath it. Its next
     write, or its pagehide flush, then puts the old copy back, and the next
     round sends that everywhere as an edit.

     A tool calls `adopted(key)` whenever its memory matches storage: when
     it loads or reloads. From then on every write it makes to that key is
     checked: if storage has moved since, the write is merged with what is
     there, against what the tool last saw, before it lands. Only fields the
     tool changed are its; everything else keeps what arrived. The base then
     becomes what the tool wrote, since that is what its memory now holds.
     Sync's own writes (applying) pass straight through. */
  var held = {};                 /* key -> what this page's memory was built from */
  var guardReport = { merged: 0, conflicts: 0 };
  function rawGet(k) { try { return window.Storage.prototype.getItem.call(window.localStorage, k); } catch (e) { return null; } }
  function adopted(k) { if (KEYS.indexOf(k) >= 0) held[k] = rawGet(k); }
  function guardValue(k, v) {
    if (!(k in held) || applying) return v;
    var base = held[k], cur = rawGet(k);
    held[k] = String(v);
    if (cur === null || cur === base || cur === String(v)) return v;
    var b = parseOr(base), l = parseOr(String(v)), r = parseOr(cur);
    if (l === undefined || r === undefined) return v;
    var rep = { conflicts: 0, kept: 0, additive: false, remoteWins: false, changedLocally: [], changedRemotely: [] };
    var m = merge3(b, l, r, rep);
    if (m === undefined) return v;
    guardReport.merged++; guardReport.conflicts += rep.conflicts;
    return JSON.stringify(m);
  }
  try {
    var proto = window.Storage && window.Storage.prototype;
    if (proto && !proto.__suitePatched) {
      var origSet = proto.setItem;
      proto.setItem = function (k, v) {
        if (this === window.localStorage) {
          var g = guardValue(k, v);
          if (g !== v) { origSet.call(this, k, g); }
          else origSet.apply(this, arguments);
        } else origSet.apply(this, arguments);
        if (this === window.localStorage && KEYS.indexOf(k) >= 0 && !applying) { schedulePush(); markUnsent(); }
      };
      proto.__suitePatched = true;
    }
  } catch (e) { }

  /* ============================================================
     THE SYNC FOLDER

     A cloud drive's desktop app (iCloud Drive on a Mac, Google Drive for
     desktop) is not an API: it syncs an ordinary folder, and there is
     nothing in that for an administrator to block.

     So the computer watches one folder. Anything that looks like a suite
     payload dropped in there gets merged and then removed, and the folder is
     left holding one current classroom.json. The phone's part is the share
     sheet it already has: Send, Save to Files, into that folder; and Get,
     which picks classroom.json. Nothing on the computer to press.

     This also works with a folder on a USB stick, a network share, or
     Dropbox. It does not care what is syncing the folder, or whether
     anything is.
     ============================================================ */
  var FOLDER_HANDLE_KEY = "folder";
  var CANON = "classroom.json";
  var SEEN_KEY = "suite:folderSeen:v1";
  var folder = null, folderTimer = null, folderBusy = false, lastPickup = null;
  var canonStamp = "", canonKeys = null;   /* so the poll need not re-read it */

  function seenList() {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}") || {}; } catch (e) { return {}; }
  }
  function markSeen(name, stamp) {
    var s = seenList();
    s[name] = stamp;
    /* keep it from growing for ever */
    var names = Object.keys(s);
    if (names.length > 60) names.slice(0, names.length - 60).forEach(function (n) { delete s[n]; });
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(s)); } catch (e) { }
  }

  function folderPerm(ask) {
    if (!folder) return Promise.resolve(false);
    var opts = { mode: "readwrite" };
    return folder.queryPermission(opts).then(function (p) {
      if (p === "granted") return true;
      if (!ask) return false;
      return folder.requestPermission(opts).then(function (q) { return q === "granted"; });
    }).catch(function () { return false; });
  }

  function folderFiles() {
    var out = [];
    return (function walk(it) {
      return it.next().then(function (step) {
        if (step.done) return out;
        var name = step.value[0], h = step.value[1];
        if (h.kind === "file" && syncFileName(name)) out.push({ name: name, handle: h });
        return walk(it);
      });
    })(folder.entries()).catch(function () { return out; });
  }

  /* ------------------------------------------------------------
     Two computers watching the same folder (v76)

     Up to v75 every computer read and rewrote the one classroom.json. With
     one computer that is fine. With two (a Mac at home, a Windows machine at
     school, both watching the same Drive folder) it can lose work: Drive
     for Desktop takes a few seconds to carry a write across, so the second
     computer can rewrite classroom.json from a copy that does not have the
     first one's newest marks yet. The first computer then reads that file,
     sees the marks "gone over there", and deletes them.

     So each computer now writes a file of its own, classroom.<name>.json,
     and nobody else ever writes it. A file with one writer can be read
     against what that writer said last time, so a copy that is merely
     behind reads as "no change", never as a deletion, and a deletion that
     really happened over there still arrives. A plain value both computers
     changed goes the same way on both (the file whose name sorts first
     wins), so they end up agreeing instead of each keeping its own.

     classroom.json is still written, because it is the file a phone loads
     with Load a backup. It carries the name of the computer that wrote it,
     and a file carrying a name is never merged: the computer's own file is
     the truth. A classroom.json with no name was written by an earlier
     build and is merged the careful way, like a drop.
     ------------------------------------------------------------ */
  var OWN_KEY = "suite:folderFile:v1";
  var PEER_RE = /^classroom\.[a-z0-9-]+\.json$/i;
  var PEER_IDB = "folderPeers";
  var peerBases = null;                     /* file name -> { stamp, keys } */
  var ownWritten = null, canonWritten = null;

  function ownFile() {
    try {
      var f = localStorage.getItem(OWN_KEY);
      if (f && PEER_RE.test(f)) return f;
      var slug = String(deviceName()).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "computer";
      var id = "";
      for (var i = 0; i < 6; i++) id += "0123456789abcdef".charAt(Math.floor(Math.random() * 16));
      f = "classroom." + slug + "-" + id + ".json";
      localStorage.setItem(OWN_KEY, f);
      return f;
    } catch (e) { return "classroom.computer.json"; }
  }
  function loadPeers() {
    if (peerBases) return Promise.resolve(peerBases);
    return idbGet(PEER_IDB).then(function (v) {
      peerBases = (v && typeof v === "object") ? v : {};
      return peerBases;
    });
  }
  function keysJson(keys) {
    return JSON.stringify(KEYS.map(function (k) { return [k, keys ? (keys[k] === undefined ? null : keys[k]) : null]; }));
  }

  function folderSync(opts) {
    opts = opts || {};
    if (!folder) return Promise.resolve([]);
    if (folderBusy) { if (opts.push) pushPending = true; return Promise.resolve([]); }
    /* v99: the planner's GitHub round is running; go once it is done */
    if (laneBusy()) { pushPending = true; return Promise.resolve([]); }
    folderBusy = true;
    if (!opts.quiet) set("syncing", "");

    var mine = ownFile();
    return folderPerm(false).then(function (okPerm) {
      if (!okPerm) { set("needsPermission", "tap to allow the folder again"); return []; }
      return loadPeers().then(folderFiles).then(function (files) {
        var localKeys = snapshot().keys;
        var base = readBase();
        var merged = localKeys;
        var canonical = null, canonNamed = false, haveMine = false;
        var peers = [], drops = [], echoes = [], seen = seenList();
        var conflicts = 0, kept = 0;

        var chain = Promise.resolve();
        files.forEach(function (f) {
          chain = chain.then(function () {
            if (f.name === mine) { haveMine = true; return; }     /* only this computer writes it */
            return f.handle.getFile().then(function (file) {
              var stamp = String(file.lastModified) + ":" + file.size;
              var isPeer = PEER_RE.test(f.name);
              if (isPeer && peerBases[f.name] && peerBases[f.name].stamp === stamp) return;   /* nothing new from them */
              if (!isPeer && f.name !== CANON && seen[f.name] === stamp) return;   /* already absorbed */
              /* The canonical file was being read and JSON-parsed in full
                 every eight seconds for as long as the tab stayed open. It
                 is the largest file in the folder and this is the main
                 thread. Its own stamp answers the only question being asked
                 of it: has anything changed since we last looked. */
              if (f.name === CANON && canonStamp === stamp && canonKeys) {
                canonical = canonKeys.keys; canonNamed = canonKeys.named;
                return;
              }
              return file.text().then(function (text) {
                var raw, payload;
                try { raw = JSON.parse(text); payload = normalise(raw); } catch (e) { payload = null; }
                if (!payload || !payload.keys) return;                  /* not ours; leave it alone */
                var named = !!(raw && raw.writer);
                if (f.name === CANON) {
                  canonical = payload.keys; canonNamed = named;
                  canonStamp = stamp; canonKeys = { keys: payload.keys, named: named };
                  return;
                }
                if (isPeer) { peers.push({ name: f.name, keys: payload.keys, stamp: stamp }); return; }
                /* a copy of classroom.json (Drive's "classroom (1).json" when
                   two computers wrote it at once) holds nothing that is not in
                   a computer's own file: tidy it away, never merge it */
                if (named) { echoes.push({ name: f.name, stamp: stamp }); return; }
                /* a sync file this computer saved by hand (v77). Where Drive
                   for Desktop is not installed the watched folder is often
                   Downloads, which is exactly where that file lands, and it
                   has to stay there long enough to be dragged into Drive. */
                if (raw && raw.from && raw.from === mine) { markSeen(f.name, stamp); return; }
                drops.push({ name: f.name, keys: payload.keys, handle: f.handle, stamp: stamp });
              });
            }).catch(function () { });
          });
        });

        return chain.then(function () {
          peers.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
          peers.forEach(function (p) {
            var pb = peerBases[p.name] ? peerBases[p.name].keys : {};
            var m = mergeKeys(pb, merged, p.keys, false, p.name < mine);
            merged = m.keys; conflicts += m.report.conflicts; kept += m.report.kept;
          });
          if (canonical && !canonNamed) {
            var m1 = mergeKeys(base, merged, canonical, true);
            merged = m1.keys; conflicts += m1.report.conflicts; kept += m1.report.kept;
          }
          drops.forEach(function (d) {
            var m2 = mergeKeys(base, merged, d.keys, true);
            merged = m2.keys; conflicts += m2.report.conflicts; kept += m2.report.kept;
          });

          var changed = [];
          var differsLocally = KEYS.some(function (k) { return merged[k] !== undefined && merged[k] !== localKeys[k]; });
          if (differsLocally) changed = apply({ keys: merged, updatedAt: new Date().toISOString() });

          var mj = keysJson(merged);
          var writeMine = !haveMine || ownWritten !== mj;
          /* classroom.json is rewritten when this computer's picture has
             moved since it last wrote it, not merely because it differs:
             otherwise two computers a few seconds apart would take turns
             overwriting it until Drive caught up. */
          var writeCanon = !canonical || (canonWritten === null ? keysJson(canonical) !== mj : canonWritten !== mj);
          lastReport = { conflicts: conflicts, kept: kept, additive: true,
                         picked: drops.length, peers: peers.length, changedLocally: changed, changedRemotely: [] };

          var w = Promise.resolve();
          if (writeMine) w = w.then(function () { return folderWrite(merged, mine); }).then(function () { ownWritten = mj; });
          if (writeCanon) w = w.then(function () { return folderWrite(merged, CANON); }).then(function () { canonWritten = mj; });
          return w.then(function () {
            writeBase(merged);
            peers.forEach(function (p) { peerBases[p.name] = { stamp: p.stamp, keys: p.keys }; });
            if (peers.length) idbSet(PEER_IDB, peerBases);
            markOk();
            /* only now is it safe to take the dropped files away: everything
               they held is in this computer's own file and on this device */
            var rm = Promise.resolve();
            drops.concat(echoes).forEach(function (d) {
              rm = rm.then(function () {
                return folder.removeEntry(d.name).catch(function () { markSeen(d.name, d.stamp); });
              });
            });
            return rm.then(function () {
              if (drops.length) lastPickup = { count: drops.length, at: new Date().toISOString() };
              set("connected", folder.name);
              if (changed.length) notifyChanged(changed);
              return changed;
            });
          });
        });
      });
    }).catch(function (e) {
      set("error", e.message || String(e));
      return [];
    }).then(function (r) { folderBusy = false; drainPending(); return r; });
  }

  function folderWrite(keys, name) {
    name = name || CANON;
    if (name === CANON) { canonStamp = ""; canonKeys = null; }   /* re-read it next round */
    return folder.getFileHandle(name, { create: true }).then(function (h) {
      return h.createWritable().then(function (w) {
        /* v96: and the name it goes by, so a phone that gets this file can
           say "Send to Mac" rather than the slug in the file name */
        return w.write(JSON.stringify({ suite: 1, updatedAt: new Date().toISOString(), writer: ownFile(), fromName: deviceName(), keys: keys }, null, 1))
          .then(function () { return w.close(); });
      });
    });
  }

  function folderConnect() {
    if (!FOLDER_SUPPORTED) return Promise.reject(new Error("this browser cannot watch a folder \u2014 use Chrome or Edge on a computer"));
    return window.showDirectoryPicker({ id: "suite-handoff", mode: "readwrite", startIn: "documents" })
      .then(function (h) {
        folder = h;
        return idbSet(FOLDER_HANDLE_KEY, h);
      }).then(function () {
        return folderSync({ force: true });
      }).then(function (changed) {
        folderPoll();
        return changed;
      }).catch(function (e) {
        if (e && e.name === "AbortError") throw new Error("AbortError");
        folder = null;
        throw e;
      });
  }
  function folderDisconnect() {
    clearInterval(folderTimer);
    folder = null;
    idbSet(FOLDER_HANDLE_KEY, null);
    try { localStorage.removeItem(SEEN_KEY); localStorage.removeItem(BASE_KEY); } catch (e) { }
    idbSet(BASE_IDB, null); baseCache = {}; canonStamp = ""; canonKeys = null;
    idbSet(PEER_IDB, null); peerBases = null; ownWritten = null; canonWritten = null;
    set("off");
    return Promise.resolve();
  }
  function folderPoll() {
    clearInterval(folderTimer);
    if (!folder) return;
    /* a drop from the phone should be waiting by the time he sits down */
    folderTimer = setInterval(function () {
      if (!folder || document.hidden) return;
      folderSync({ quiet: true });
    }, 8000);
  }

  window.SuiteSync = {
    keys: KEYS,
    get state() { return state; },
    get detail() { return detail; },
    get backend() { return backend(); },
    folderSupported: FOLDER_SUPPORTED,
    get folderName() { return folder ? folder.name : ""; },
    get lastPickup() { return lastPickup; },
    /* this computer's own file, and the other computers seen in the folder */
    get folderFile() { return folder ? ownFile() : ""; },
    get otherComputers() { return peerBases ? Object.keys(peerBases).length : 0; },
    connectFolder: folderConnect,
    disconnectFolder: folderDisconnect,
    allowFolder: function () {
      return folderPerm(true).then(function (ok) {
        if (!ok) return [];
        return folderSync({ force: true });
      });
    },
    get lastMerge() { return lastReport; },
    /* everything the Setup tab needs to show whether syncing is actually
       healthy, rather than only whether the last request happened to work */
    get lastOk() { return lastOk(); },
    get baseDurable() { return baseDurable; },
    auditKeys: auditKeys,
    neverSync: NEVER_SYNC,
    get device() { return deviceName(); },
    setDevice: function (n) { try { localStorage.setItem(DEVICE_KEY, String(n || "").trim() || deviceName()); } catch (e) { } },
    init: init,
    syncNow: function () { return folder ? folderSync({ force: true }) : Promise.resolve([]); },
    push: function (now) { return folder ? folderSync({ quiet: !now }) : Promise.resolve([]); },
    pull: function (force) { return folder ? folderSync({ force: !!force }) : Promise.resolve([]); },
    /* a phone's Send, and Save a sync file */
    exportFile: exportFile,
    emailFile: emailFile, mailAddress: mailAddress, setMailAddress: setMailAddress, isSyncFileName: syncFileName,
    /* a phone's Get, and Load a sync file: merges; { replace: true } restores */
    importFile: importFile,
    importText: importText,
    importBlob: importBlob,
    undoImport: undoImport,
    describeImport: describeImport,
    get canUndoImport() { return undoReady; },
    get lastImport() { return lastImport; },
    /* v96: when another device's file was last brought in here, and from whom */
    get lastGet() { return lastGet(); },
    /* when a sync file was last saved here, and whether anything changed since */
    get lastExport() { var e = exportState(); return e ? { at: e.at, dirty: !!e.dirty, name: e.name || "" } : null; },
    /* v96: the route this device was on before it was removed, until told */
    get retired() { var r = retired(); return r && !r.told ? r.routes.slice() : null; },
    retiredTold: retiredTold,
    touchDevice: touchDevice,
    onState: function (f) { listeners.push(f); f(state, detail); },
    onChanged: function (f) { changeHandlers.push(f); },
    /* v80: the same three-way merge, for a tool that holds a copy of its
       data in memory and must fold a pull into it (see suite-boot.js,
       "the open planner never writes over a pull"). Plain values both
       sides changed keep `local`, as they do in a round. */
    /* v81: this page's memory now matches storage for `key`; see above */
    adopted: adopted,
    get guardReport() { return { merged: guardReport.merged, conflicts: guardReport.conflicts }; },
    merge: function (base, local, remote) {
      return merge3(base, local, remote, { conflicts: 0, kept: 0, additive: false, remoteWins: false, changedLocally: [], changedRemotely: [] });
    },
    /* v99: what suite-planner-sync.js needs to run its own round with this
       file's merge, so there is one merge and one way of applying it */
    lane: {
      mergeKeys: mergeKeys,
      apply: apply,
      notify: notifyChanged,
      idbGet: idbGet,
      idbSet: idbSet,
      folderBusy: function () { return !!folderBusy; },
      setBusy: function (f) { otherLane = f; },
      drain: drainPending
    }
  };
})();

/* v99: the planner's own route, in its own file so it can be read (and
   removed) on its own. Loaded from here so every page that syncs gets it,
   and neither of the teacher's own files needs a new tag. */
(function () {
  try {
    var cs = document.currentScript;
    if (!cs || !cs.src || window.SuitePlannerSync) return;
    var s = document.createElement("script");
    s.src = cs.src.replace(/suite-sync\.js(\?[^#]*)?(#.*)?$/, "suite-planner-sync.js");
    if (s.src === cs.src) return;
    (document.head || document.documentElement).appendChild(s);
  } catch (e) { }
})();

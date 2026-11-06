/* ============================================================
   suite-sync.js
   The suite's data as one file: Save a backup, Restore a backup, and the
   merge that live sync (suite-planner-sync.js) and every tool's own writes
   rely on.

   Gradebook marks, the roster and running records stay on the device they
   were entered on. Live sync carries only the planner, the boards and
   lesson materials (no student records). A backup file carries everything,
   and is how a device is brought up to date by hand (the school computer's
   names, say): Restore replaces what is here and can be undone.

    A device still set up for them is cleared on load
   (retireOld) and told once.
   ============================================================ */
(function () {
  if (window.SuiteSync) return;

  /* Everything a backup carries. */
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
    "suite:orfnotes:v1",    /* missed-word notes and pauses per ORF check (fluency-assess.js) */
    "suite:groups:v1",      /* math rotation groups, by gradebook student id (groups/) */
    "suite:readgroups:v1",  /* reading volunteer groups, per unit, by gradebook id (groups/) */
    "suite:win:v1",         /* Walk to WIN lists (groups/win.js) */
    "suite:suggest:v1",     /* the gradebook's skill groups, offered on the Small Groups board */
    "suite:boardGroups:v1", /* the math board's groups, sent back for the gradebook to take */
    "suite:district:v1",    /* the planner's district calendar, copied for gradebook Setup */
    /* Migration flags travel: they record decisions ("Health/SEL was
       deliberately deleted"). A device restored without them would re-run
       the migration and put the deleted thing back. */
    "suite:migrations"
  ];
  /* Keys deliberately left out of a backup, each with its reason. Anything
     on the origin in neither list is reported by auditKeys() in Setup. */
  var NEVER_SYNC = {
    "suite:device:v1": "this device's own name",
    "suite:theme:v1": "the look this device used until v91; a preference, cleared on load since v92",
    "suite:lastBackup:v1": "when this device last saved a backup",
    "suite:retired:v2": "a device that was on the retired file routes, until told once",
    "gb2_standards_v1_premerge": "this device's undo copy from before its last gradebook merge",
    "gb2:preRestore:v1": "this device's undo copy from before its last gradebook restore",
    "suite:orfPreRestore:v1": "this device's undo copy from before its last ORF tool restore",
    "suite:plannerHub:v1": "this device's live-sync settings (Firebase project, email, display) and last round",
    "suite:plannerHubOk:v1": "words this device was told are not a student's name, per note",
    "suite:winLive:v1": "the WIN slide summary by gradebook id; travels only live, in boards.json",
    "suite:winLiveMine:v1": "what this device last summarised, so it re-summarises only on its own change"
  };
  var KEY_PREFIXES = /^(gb2_|lp:|running-records|suite:)/;
  var IDB_NAME = "suite_sync";

  /* ---------- IndexedDB, one key-value store ---------- */
  function idb() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open(IDB_NAME, 1);
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

  /* ---------- the payload ---------- */
  function snapshot() {
    var keys = {};
    KEYS.forEach(function (k) {
      try { var v = localStorage.getItem(k); if (v != null) keys[k] = v; } catch (e) { }
    });
    return { suite: 1, updatedAt: new Date().toISOString(), keys: keys };
  }
  /* Any earlier sync file or backup still restores. A file from the
     gradebook-only version is the gradebook state itself, with no wrapper,
     so it must look like one before it is taken: picking the wrong .json on
     a phone once replaced a whole roster with nothing. */
  function normalise(obj) {
    if (!obj || typeof obj !== "object") return null;
    if (obj.keys && typeof obj.keys === "object") return obj;
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
    applying = false;
    return changed;
  }

  /* ---------- telling the page ---------- */
  var changeHandlers = [], listeners = [];
  function notifyChanged(changed) { changeHandlers.forEach(function (f) { try { f(changed); } catch (e) { } }); }
  function emit() { listeners.forEach(function (f) { try { f(); } catch (e) { } }); }

  function init() { return retireOld(); }

  /* ---------- the retired file routes ----------
     A device set up for the sync folder, Send/Get or the emailed file keeps
     all its data (it is in this browser). Its route settings are cleared,
     and if it was using one, it is told once (retiredNotice). */
  var RETIRED_LS = ["suite:lastGet:v1", "suite:mailto:v1", "suite:syncBase:v1", "suite:folderSeen:v1",
    "suite:folderFile:v1", "suite:lastSync", "suite:lastOk", "suite:lastExport:v1",
    "suite:gh:v1", "suite:ghExp", "suite:gd:v1", "suite:retired:v1"];
  var RETIRED_IDB = ["folder", "handle", "handPeers", "folderPeers", "syncBase"];
  var RETIRED_KEY = "suite:retired:v2";
  function retireOld() {
    var was = false;
    try {
      RETIRED_LS.forEach(function (k) {
        if (localStorage.getItem(k) != null) {
          if (k === "suite:lastGet:v1" || k === "suite:folderFile:v1" || k === "suite:lastExport:v1") was = true;
          localStorage.removeItem(k);
        }
      });
    } catch (e) { }
    return Promise.all(RETIRED_IDB.map(function (k) {
      return idbGet(k).then(function (v) {
        if (v == null) return;
        if (k === "folder") was = true;
        return idbSet(k, null);
      });
    })).then(function () {
      if (was) { try { localStorage.setItem(RETIRED_KEY, new Date().toISOString()); } catch (e) { } emit(); }
    });
  }
  function retiredNotice() { try { return !!localStorage.getItem(RETIRED_KEY); } catch (e) { return false; } }
  function clearRetiredNotice() { try { localStorage.removeItem(RETIRED_KEY); } catch (e) { } }

  /* ---------- Save a backup ----------
     A computer: a download, into Downloads. A phone or tablet: the share
     sheet (Save to Files), which has to be opened from a real tap, so the
     callers open a menu of buttons rather than a confirm(). */
  var BACKUP_KEY = "suite:lastBackup:v1";
  function lastBackup() { try { return JSON.parse(localStorage.getItem(BACKUP_KEY) || "null") || null; } catch (e) { return null; } }
  function touchDevice() {
    var ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod|Android/.test(ua)) return true;
    if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
    try {
      return !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches &&
        !window.matchMedia("(any-pointer: fine)").matches);
    } catch (e) { return false; }
  }
  function two(n) { return (n < 10 ? "0" : "") + n; }
  function backupName() {
    var d = new Date();
    var slug = String(deviceName()).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "device";
    return "classroom-backup-" + d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate()) +
      "-" + two(d.getHours()) + two(d.getMinutes()) + "-" + slug + ".json";
  }
  function exportFile() {
    var payload = snapshot();
    payload.fromName = deviceName();
    var name = backupName();
    var blob = new Blob([JSON.stringify(payload, null, 1)], { type: "application/json" });
    function saved(how) {
      try { localStorage.setItem(BACKUP_KEY, JSON.stringify({ at: payload.updatedAt, name: name })); } catch (e) { }
      emit();
      return { name: name, how: how };
    }
    function download() {
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = name; a.rel = "noopener";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      return saved("download");
    }
    var file = null;
    try { file = new File([blob], name, { type: "application/json" }); } catch (e) { }
    if (file && touchDevice() && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file], title: "Classroom backup" })
        .then(function () { return saved("share"); })
        .catch(function (e) {
          if (e && e.name === "AbortError") return { name: name, how: "cancelled" };
          return download();
        });
    }
    return Promise.resolve(download());
  }

  /* ---------- Restore a backup ----------
     The file's keys replace this device's; a key the file lacks is left as
     it is. What was here is kept first, and Undo puts it back exactly. */
  var UNDO_IDB = "handUndo";
  var lastImport = null, undoReady = false, undoRec;   /* undefined: not read yet */
  function loadUndo() {
    if (undoRec !== undefined) return Promise.resolve(undoRec);
    return idbGet(UNDO_IDB).then(function (v) { if (undoRec === undefined) undoRec = (v && v.keys) ? v : null; return undoRec; });
  }
  function saveUndo(u) { undoRec = u; undoReady = !!u; idbSet(UNDO_IDB, u); }
  loadUndo().then(function (u) { undoReady = !!u; emit(); });

  function importText(text) {
    var raw;
    try { raw = JSON.parse(text); } catch (e) { return Promise.reject(new Error("that file is not a classroom backup")); }
    var payload = normalise(raw);
    if (!payload || !payload.keys) return Promise.reject(new Error("that file is not a classroom backup"));
    var remote = {};
    Object.keys(payload.keys).forEach(function (k) { if (KEYS.indexOf(k) >= 0 && typeof payload.keys[k] === "string") remote[k] = payload.keys[k]; });
    var info = { fromName: String((raw && raw.fromName) || ""), at: payload.updatedAt || "", changed: [] };
    var before = snapshot().keys;
    saveUndo({ at: new Date().toISOString(), keys: before, fromName: info.fromName });
    var changed = apply({ keys: Object.assign({}, before, remote) });
    info.changed = changed;
    lastImport = info;
    notifyChanged(changed);
    emit();
    changed.info = info;
    return Promise.resolve(changed);
  }
  function undoImport() {
    return loadUndo().then(function (u) {
      if (!u || !u.keys) throw new Error("there is no restore to undo");
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
      saveUndo(null);
      lastImport = null;
      notifyChanged(changed);
      emit();
      return changed;
    });
  }
  /* a File from a picker */
  function importBlob(f) {
    return new Promise(function (res, rej) {
      if (!f) return rej(new Error("AbortError"));
      var r = new FileReader();
      r.onload = function () { importText(String(r.result)).then(res, rej); };
      r.onerror = function () { rej(new Error("could not read that file")); };
      r.readAsText(f);
    });
  }
  /* opens the picker itself; called from a tap */
  function importFile() {
    return new Promise(function (res, rej) {
      var inp = document.createElement("input");
      inp.type = "file";
      inp.accept = "application/json,.json,text/plain,.txt";
      inp.style.cssText = "position:fixed;left:-9999px";
      inp.onchange = function () {
        var f = inp.files && inp.files[0];
        inp.remove();
        if (!f) return rej(new Error("AbortError"));
        importBlob(f).then(res, rej);
      };
      document.body.appendChild(inp);
      inp.click();
    });
  }
  /* one sentence for a toast, shared by the gradebook and the switcher */
  function describeImport(changed) {
    var i = (changed && changed.info) || lastImport || {};
    if (!changed || !changed.length) return "Nothing in that backup differed from what is here.";
    var when = "";
    try { if (i.at) when = " of " + new Date(i.at).toLocaleDateString([], { month: "short", day: "numeric" }); } catch (e) { }
    return "Restored the backup" + when + (i.fromName ? " from " + i.fromName : "") + ". Undo is on the Sync menu.";
  }

  /* ============================================================
     THREE-WAY MERGE
     Used by live sync (against its own bases) and by the write guard
     below. Whichever side actually changed a thing wins; only a both-sides
     edit of the same field is a conflict, and that keeps `local`. Arrays
     merge by `id`, so every record the suite stores must carry one.
     The block between the two MERGE markers is self-contained (it needs
     only KEYS), so tests can lift it out and run it on its own.
     ============================================================ */
  /* MERGE-START */
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
    /* a caller can say the other side wins instead (remoteWins) */
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


  /* MERGE-END */

  /* Every key on this origin should be either in a backup or deliberately
     not. A key in neither list is reported in Setup. */
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

  /* ---------- this device's name, on its backups and live writes ---------- */
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

  /* ---------- a tool's write never undoes what arrived underneath it ----------
     A tool holds its data in memory and writes the whole copy back. If live
     sync (in this tab or another) changed storage since, that write would put
     the old copy back. A tool calls `adopted(key)` whenever its memory
     matches storage; from then on each write it makes to that key is merged
     with what is there, against what the tool last saw. Only fields the tool
     changed are its. Writes made while applying sync pass straight through. */
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
      };
      proto.__suitePatched = true;
    }
  } catch (e) { }


  window.SuiteSync = {
    keys: KEYS,
    neverSync: NEVER_SYNC,
    auditKeys: auditKeys,
    get device() { return deviceName(); },
    setDevice: function (n) { try { localStorage.setItem(DEVICE_KEY, String(n || "").trim() || deviceName()); } catch (e) { } },
    init: init,
    /* Save a backup / Restore a backup */
    exportFile: exportFile,
    importFile: importFile,
    importText: importText,
    importBlob: importBlob,
    undoImport: undoImport,
    describeImport: describeImport,
    get canUndoImport() { return undoReady; },
    get lastImport() { return lastImport; },
    get lastBackup() { return lastBackup(); },
    get retiredNotice() { return retiredNotice(); },
    clearRetiredNotice: clearRetiredNotice,
    touchDevice: touchDevice,
    onState: function (f) { listeners.push(f); f(); },
    onChanged: function (f) { changeHandlers.push(f); },
    adopted: adopted,
    get guardReport() { return { merged: guardReport.merged, conflicts: guardReport.conflicts }; },
    /* for a tool that must fold a pull into its memory (suite-boot.js) */
    merge: function (base, local, remote) {
      return merge3(base, local, remote, { conflicts: 0, kept: 0, additive: false, remoteWins: false, changedLocally: [], changedRemotely: [] });
    },
    /* what suite-planner-sync.js needs to run its round with this merge */
    lane: {
      mergeKeys: mergeKeys,
      apply: apply,
      notify: notifyChanged,
      idbGet: idbGet,
      idbSet: idbSet
    }
  };
})();

/* Live sync lives in its own file, loaded from here so every page that
   syncs gets it with no tag of its own. */
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

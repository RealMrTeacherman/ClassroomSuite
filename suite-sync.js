/* ============================================================
   suite-sync.js
   One connected JSON file, shared by every tool in this folder.

   All three tools live on one origin, so they already share local storage on
   any given machine. The file is only the transport between machines: whichever
   tool is open writes the whole picture, and there is no intra-machine conflict
   to resolve. Between machines it is newest-wins on a single timestamp.
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
    "suite:subplan:v1"      /* sub plan standing notes */
  ];
  var HANDLE_DB = "suite_sync", HANDLE_KEY = "handle";
  var SUPPORTED = !!window.showSaveFilePicker;

  var handle = null, lastMtime = 0, writeTimer = null, pollTimer = null;
  var state = SUPPORTED ? "off" : "unsupported";
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
  function localStamp() {
    try {
      var raw = localStorage.getItem("suite:lastSync");
      return raw || "";
    } catch (e) { return ""; }
  }
  function setLocalStamp(s) { try { localStorage.setItem("suite:lastSync", s); } catch (e) { } }

  function apply(payload) {
    var changed = [];
    Object.keys(payload.keys || {}).forEach(function (k) {
      if (KEYS.indexOf(k) < 0) return;
      var v = payload.keys[k];
      if (typeof v !== "string") return;
      try {
        if (localStorage.getItem(k) !== v) { localStorage.setItem(k, v); changed.push(k); }
      } catch (e) { }
    });
    setLocalStamp(payload.updatedAt || "");
    return changed;
  }

  /* ---------- permissions ---------- */
  function ensure(interactive) {
    if (!handle) return Promise.resolve(false);
    return handle.queryPermission({ mode: "readwrite" }).then(function (p) {
      if (p === "granted") return true;
      if (!interactive) { set("needsPermission"); return false; }
      return handle.requestPermission({ mode: "readwrite" }).then(function (q) {
        if (q === "granted") { set("connected", handle.name); return true; }
        set("needsPermission"); return false;
      });
    }).catch(function () { set("error", "permission check failed"); return false; });
  }

  /* ---------- read / write ---------- */
  function pull(force) {
    if (!handle) return Promise.resolve([]);
    return ensure(false).then(function (ok) {
      if (!ok) return [];
      return handle.getFile().then(function (f) {
        if (!force && f.lastModified <= lastMtime) return [];
        return f.text().then(function (text) {
          if (!text.trim()) return [];
          var payload = normalise(JSON.parse(text));
          if (!payload) { set("error", "that file is not a classroom backup"); return []; }
          lastMtime = f.lastModified;
          if (!force && payload.updatedAt && localStamp() && payload.updatedAt <= localStamp()) return [];
          var changed = apply(payload);
          set("connected", handle.name);
          return changed;
        });
      });
    }).catch(function () { set("error", "could not read the file"); return []; });
  }
  function doWrite() {
    return ensure(false).then(function (ok) {
      if (!ok) return false;
      var payload = snapshot();
      return handle.createWritable().then(function (w) {
        return w.write(JSON.stringify(payload, null, 1)).then(function () { return w.close(); });
      }).then(function () {
        setLocalStamp(payload.updatedAt);
        return handle.getFile();
      }).then(function (f) {
        lastMtime = f.lastModified;
        set("connected", handle.name);
        return true;
      });
    }).catch(function () { set("error", "could not write the file"); return false; });
  }
  function push(now) {
    if (!handle) return Promise.resolve(false);
    clearTimeout(writeTimer);
    if (now) return doWrite();
    return new Promise(function (res) { writeTimer = setTimeout(function () { doWrite().then(res); }, 1200); });
  }

  /* ---------- connect ---------- */
  function connect(openExisting) {
    if (!SUPPORTED) return Promise.reject(new Error("unsupported"));
    var opts = {
      suggestedName: "classroom.json",
      types: [{ description: "Classroom data", accept: { "application/json": [".json"] } }]
    };
    var p = openExisting
      ? window.showOpenFilePicker({ types: opts.types, multiple: false }).then(function (a) { return a[0]; })
      : window.showSaveFilePicker(opts);
    return p.then(function (h) {
      handle = h;
      return idbSet(HANDLE_KEY, h);
    }).then(function () {
      if (!openExisting) return doWrite().then(function () { return []; });
      return pull(true).then(function (changed) {
        if (!changed.length) return doWrite().then(function () { return []; });
        return changed;
      });
    }).then(function (changed) {
      set("connected", handle.name);
      startPolling();
      return changed;
    });
  }
  function disconnect() {
    handle = null; clearInterval(pollTimer);
    return idbSet(HANDLE_KEY, null).then(function () { set("off"); });
  }

  function startPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(function () {
      if (!handle || document.hidden) return;
      pull(false).then(function (changed) { if (changed.length) notifyChanged(changed); });
    }, 20000);
  }

  /* ---------- telling the page ---------- */
  var changeHandlers = [];
  function notifyChanged(changed) { changeHandlers.forEach(function (f) { try { f(changed); } catch (e) { } }); }

  function init() {
    if (!SUPPORTED) { set("unsupported"); return Promise.resolve(); }
    return idbGet(HANDLE_KEY).then(function (h) {
      if (!h) { set("off"); return; }
      handle = h;
      return ensure(false).then(function (ok) {
        if (!ok) { set("needsPermission"); return; }
        set("connected", h.name);
        startPolling();
        return pull(false).then(function (changed) { if (changed.length) notifyChanged(changed); });
      });
    });
  }

  /* any tool writing to a tracked key in another tab mirrors to the file */
  window.addEventListener("storage", function (e) {
    if (!e.key || KEYS.indexOf(e.key) < 0 || !handle) return;
    push(false);
  });

  /* ---------- the fallback for phones and iPads ----------
     The File System Access API is Chrome/Edge desktop only, so on a phone the
     connected file is not available at all. A plain download and a plain file
     input work everywhere, carry exactly the same payload, and can be handed
     between devices through Drive, Files or mail. This is the only way data
     reaches an iPad, so it is not an afterthought. */
  function exportFile() {
    var payload = snapshot();
    var name = "classroom-" + new Date().toISOString().slice(0, 10) + ".json";
    var blob = new Blob([JSON.stringify(payload, null, 1)], { type: "application/json" });

    function download() {
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = name; a.rel = "noopener";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      return { name: name, how: "download" };
    }

    /* On iOS a download lands wherever Safari decides and gives you no chance
       to put it in Drive. The share sheet does, and it is the natural way to
       move a file off a phone, so prefer it where it exists. It has to be
       reached from a real tap, which is why the caller opens a menu with
       buttons rather than a confirm(). */
    var file = null;
    try { file = new File([blob], name, { type: "application/json" }); } catch (e) { }
    if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file], title: "Classroom data" })
        .then(function () { return { name: name, how: "share" }; })
        .catch(function (e) {
          if (e && e.name === "AbortError") return { name: name, how: "cancelled" };
          return download();
        });
    }
    return Promise.resolve(download());
  }
  function importText(text) {
    var payload = normalise(JSON.parse(text));
    if (!payload || !payload.keys) throw new Error("that file is not a classroom backup");
    var changed = apply(payload);
    notifyChanged(changed);
    return changed;
  }
  /* opens the picker itself, so a caller does not have to build an <input> */
  function importFile() {
    return new Promise(function (res, rej) {
      var inp = document.createElement("input");
      inp.type = "file";
      inp.accept = "application/json,.json";
      inp.style.cssText = "position:fixed;left:-9999px";
      inp.onchange = function () {
        var f = inp.files && inp.files[0];
        inp.remove();
        if (!f) return rej(new Error("AbortError"));
        var r = new FileReader();
        r.onload = function () {
          try { res(importText(String(r.result))); }
          catch (e) { rej(e); }
        };
        r.onerror = function () { rej(new Error("could not read that file")); };
        r.readAsText(f);
      };
      document.body.appendChild(inp);
      inp.click();
    });
  }

  window.SuiteSync = {
    keys: KEYS,
    supported: SUPPORTED,
    get state() { return state; },
    get detail() { return detail; },
    get fileName() { return handle ? handle.name : ""; },
    init: init,
    connect: connect,
    disconnect: disconnect,
    push: push,
    pull: pull,
    exportFile: exportFile,
    importFile: importFile,
    ensurePermission: function () { return ensure(true); },
    onState: function (f) { listeners.push(f); f(state, detail); },
    onChanged: function (f) { changeHandlers.push(f); }
  };
})();

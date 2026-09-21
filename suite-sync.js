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
    if (FOLDER_SUPPORTED) {
      return idbGet(FOLDER_HANDLE_KEY).then(function (h) {
        if (!h) return initRest();
        folder = h;
        return folderPerm(false).then(function (okPerm) {
          if (!okPerm) { set("needsPermission", "tap to allow the folder again"); folderPoll(); return; }
          folderPoll();
          return folderSync({ force: true }).then(function (changed) {
            if (changed.length) notifyChanged(changed);
          });
        });
      });
    }
    return initRest();
  }
  function initRest() {
    if (gdLoad()) {
      set("syncing", "");
      gdPoll();
      return gdSync({ force: true }).then(function (changed) {
        if (changed.length) notifyChanged(changed);
      });
    }
    if (ghLoad()) {
      set("connected", gh.owner + "/" + gh.repo);
      ghPoll();
      return ghSync({ force: true }).then(function (changed) {
        if (changed.length) notifyChanged(changed);
      });
    }
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
    return local;
  }

  function parseOr(v) {
    if (typeof v !== "string") return undefined;
    try { return JSON.parse(v); } catch (e) { return undefined; }
  }
  /* merges two key maps against the base, returning the agreed map */
  function mergeKeys(baseKeys, localKeys, remoteKeys, additive) {
    var report = { conflicts: 0, kept: 0, additive: !!additive, changedLocally: [], changedRemotely: [] };
    var out = {};
    var names = {};
    [baseKeys, localKeys, remoteKeys].forEach(function (m) {
      Object.keys(m || {}).forEach(function (k) { if (KEYS.indexOf(k) >= 0) names[k] = 1; });
    });
    Object.keys(names).forEach(function (k) {
      var m = merge3(parseOr((baseKeys || {})[k]), parseOr((localKeys || {})[k]), parseOr((remoteKeys || {})[k]), report);
      if (m === undefined) return;
      out[k] = JSON.stringify(m);
      if (out[k] !== (localKeys || {})[k]) report.changedLocally.push(k);
      if (out[k] !== (remoteKeys || {})[k]) report.changedRemotely.push(k);
    });
    return { keys: out, report: report };
  }

  function readBase() {
    try { return JSON.parse(localStorage.getItem(BASE_KEY) || "null") || {}; }
    catch (e) { return {}; }
  }
  function writeBase(keys) {
    /* The base doubles what the suite stores. If that will not fit — iOS is
       the tight one — carry on without it: the merge then falls back to
       treating anything unknown as a change, which is safe, just chattier. */
    try { localStorage.setItem(BASE_KEY, JSON.stringify(keys)); return true; }
    catch (e) { try { localStorage.removeItem(BASE_KEY); } catch (e2) { } return false; }
  }

  /* ============================================================
     GITHUB BACKEND

     A private repo holding one JSON file. Works in every browser that has
     fetch, which is the point — the File System Access API does not exist on
     iOS and never will, so this is what makes an iPad a real device rather
     than a place to paste a backup into.

     Two things it gets for free by being git: every write is a commit, so a
     bad import can be recovered from the repo's history, and the blob sha
     gives honest conflict detection — a write whose sha is stale is rejected
     by GitHub rather than silently clobbering.

     The token is kept in its own key and is deliberately NOT in KEYS, so it is
     never written into the synced file and never travels to another device.
     ============================================================ */
  var GH_KEY = "suite:gh:v1";
  var DEVICE_KEY = "suite:device:v1";
  var gh = null, ghEtag = "", ghSha = "", ghTimer = null, ghBusy = false;

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
  function ghLoad() {
    try { gh = JSON.parse(localStorage.getItem(GH_KEY) || "null"); } catch (e) { gh = null; }
    return gh;
  }
  function ghStore() {
    try { localStorage.setItem(GH_KEY, JSON.stringify(gh)); } catch (e) { }
  }

  /* base64 that survives a name with an accent in it */
  function toB64(str) {
    var bytes = new TextEncoder().encode(str), s = "";
    for (var i = 0; i < bytes.length; i += 0x8000) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(s);
  }
  function fromB64(b64) {
    var bin = atob(String(b64).replace(/\s/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function ghUrl() {
    return "https://api.github.com/repos/" + encodeURIComponent(gh.owner) + "/" +
      encodeURIComponent(gh.repo) + "/contents/" + gh.path.split("/").map(encodeURIComponent).join("/");
  }
  function ghFetch(url, opts) {
    opts = opts || {};
    opts.headers = Object.assign({
      Authorization: "Bearer " + gh.token,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }, opts.headers || {});
    opts.cache = "no-store";
    return fetch(url, opts);
  }
  function ghProblem(res) {
    if (res.status === 401) return "the token was rejected — it may have expired or been revoked";
    if (res.status === 403) {
      if (res.headers.get("x-ratelimit-remaining") === "0") return "GitHub's rate limit is used up; it resets within the hour";
      return "the token does not have Contents write access to that repository";
    }
    if (res.status === 404) return "no such repository, or the token cannot see it";
    if (res.status === 409 || res.status === 422) return "conflict";
    return "GitHub returned " + res.status;
  }

  /* the file as GitHub currently has it, or null if it is not there yet */
  function ghRead(useEtag) {
    var headers = {};
    if (useEtag && ghEtag) headers["If-None-Match"] = ghEtag;
    return ghFetch(ghUrl() + "?ref=" + encodeURIComponent(gh.branch), { headers: headers })
      .then(function (res) {
        if (res.status === 304) return { unchanged: true };
        if (res.status === 404) { ghSha = ""; return null; }
        if (!res.ok) throw new Error(ghProblem(res));
        ghEtag = res.headers.get("etag") || "";
        return res.json().then(function (j) {
          ghSha = j.sha || "";
          /* over a megabyte the contents API stops inlining the file */
          var body = j.content ? fromB64(j.content) : null;
          if (body == null && j.git_url) {
            return ghFetch(j.git_url).then(function (r2) {
              if (!r2.ok) throw new Error(ghProblem(r2));
              return r2.json();
            }).then(function (blob) { return { payload: normalise(JSON.parse(fromB64(blob.content))) }; });
          }
          return { payload: normalise(JSON.parse(body)) };
        });
      });
  }
  function ghWrite(payload, message) {
    var body = {
      message: message,
      content: toB64(JSON.stringify(payload, null, 1)),
      branch: gh.branch
    };
    if (ghSha) body.sha = ghSha;
    return ghFetch(ghUrl(), { method: "PUT", body: JSON.stringify(body) }).then(function (res) {
      if (!res.ok) throw new Error(ghProblem(res));
      return res.json().then(function (j) {
        ghSha = (j.content && j.content.sha) || "";
        ghEtag = "";
        return true;
      });
    });
  }

  /* One round: read, merge against the base, write back whatever moved. */
  function ghSync(opts) {
    opts = opts || {};
    if (!gh || ghBusy) return Promise.resolve([]);
    ghBusy = true;
    if (!opts.quiet) set("syncing", "");
    var localKeys = snapshot().keys;

    return ghRead(!opts.force).then(function (res) {
      if (res && res.unchanged && !opts.push) return [];

      var remoteKeys = res && res.payload ? res.payload.keys : null;
      if (!remoteKeys) {
        /* nothing there yet, so this device seeds it */
        return ghWrite({ suite: 1, updatedAt: new Date().toISOString(), keys: localKeys },
          "Start classroom data from " + deviceName()).then(function () {
            writeBase(localKeys);
            set("connected", gh.owner + "/" + gh.repo);
            return [];
          });
      }

      var merged = mergeKeys(readBase(), localKeys, remoteKeys);
      lastReport = merged.report;   /* whatever happens next, this round's result */
      var changed = [];
      if (merged.report.changedLocally.length) {
        changed = apply({ keys: merged.keys, updatedAt: new Date().toISOString() });
      }
      var mustWrite = merged.report.changedRemotely.length > 0;
      if (!mustWrite) {
        writeBase(merged.keys);
        set("connected", gh.owner + "/" + gh.repo);
        if (changed.length) notifyChanged(changed);
        return changed;
      }
      var note = "Update from " + deviceName();
      if (merged.report.conflicts) note += " (" + merged.report.conflicts + " kept from this device)";
      return ghWrite({ suite: 1, updatedAt: new Date().toISOString(), keys: merged.keys }, note)
        .then(function () {
          writeBase(merged.keys);
          set("connected", gh.owner + "/" + gh.repo);
          if (changed.length) notifyChanged(changed);
          return changed;
        });
    }).catch(function (e) {
      /* someone else committed between our read and our write: read again and
         redo the merge on top of theirs. Once only, then give up quietly. */
      if (/conflict/.test(e.message) && !opts.retried) {
        ghBusy = false; ghEtag = "";
        return ghSync(Object.assign({}, opts, { retried: true, force: true }));
      }
      set("error", e.message || String(e));
      return [];
    }).then(function (r) { ghBusy = false; return r; });
  }

  var lastReport = null;
  function ghConnect(cfg) {
    gh = {
      owner: String(cfg.owner || "").trim(),
      repo: String(cfg.repo || "").trim(),
      path: String(cfg.path || "classroom.json").trim().replace(/^\/+/, ""),
      branch: String(cfg.branch || "main").trim(),
      token: String(cfg.token || "").trim()
    };
    if (!gh.owner || !gh.repo || !gh.token) { gh = null; return Promise.reject(new Error("owner, repository and token are all needed")); }
    ghEtag = ""; ghSha = "";
    /* check the repo really is private before putting a roster in it */
    return ghFetch("https://api.github.com/repos/" + encodeURIComponent(gh.owner) + "/" + encodeURIComponent(gh.repo))
      .then(function (res) {
        if (!res.ok) throw new Error(ghProblem(res));
        return res.json();
      }).then(function (info) {
        if (info.private === false) {
          gh = null;
          throw new Error("that repository is public. Student names must not go in a public repo — make it private first, or use a different one.");
        }
        ghStore();
        return ghSync({ force: true, push: true });
      }).then(function (changed) {
        ghPoll();
        return changed;
      }).catch(function (e) { gh = null; set("off"); throw e; });
  }
  function ghDisconnect(keepToken) {
    clearInterval(ghTimer);
    gh = null; ghEtag = ""; ghSha = "";
    try { localStorage.removeItem(GH_KEY); if (!keepToken) localStorage.removeItem(BASE_KEY); } catch (e) { }
    set("off");
    return Promise.resolve();
  }
  function ghPoll() {
    clearInterval(ghTimer);
    if (!gh) return;
    ghTimer = setInterval(function () {
      if (!gh || document.hidden || !navigator.onLine) return;
      ghSync({ quiet: true });
    }, 25000);
  }

  /* ---------- which backend is in charge ---------- */
  function backend() { return folder ? "folder" : gd ? "drive" : gh ? "github" : handle ? "file" : ""; }

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
  function flushPush() {
    clearTimeout(pushTimer); pushTimer = null;
    if (folder) folderSync({ quiet: true });
    else if (gd) gdSync({ quiet: true, push: true });
    else if (gh) ghSync({ quiet: true, push: true });
    else if (handle) doWrite();
  }
  /* A phone does not get a tidy shutdown — you press the home button and the
     tab is frozen. Anything still waiting on the debounce goes now. */
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && pushTimer) flushPush();
  });
  try {
    var proto = window.Storage && window.Storage.prototype;
    if (proto && !proto.__suitePatched) {
      var origSet = proto.setItem;
      proto.setItem = function (k, v) {
        origSet.apply(this, arguments);
        if (this === window.localStorage && KEYS.indexOf(k) >= 0 && !applying) schedulePush();
      };
      proto.__suitePatched = true;
    }
  } catch (e) { }

  /* ============================================================
     GOOGLE DRIVE BACKEND

     The file lives in the teacher's own Drive. If that is a school Google
     Workspace account, it is the same place the district already keeps student
     records under its existing agreement with Google, which is the reason to
     prefer this over anything else.

     Scope is drive.file and nothing wider: this app can only ever see the file
     it made itself, not the rest of the Drive. The token is held in memory
     only — never written to storage — and renewed silently while the Google
     session is alive.

     Drive has no conditional write, so unlike the GitHub backend a stale write
     cannot be rejected by the server. The version is therefore re-checked
     immediately before writing and the merge redone if it moved. The window is
     about a second, and the three-way merge means a loss inside it would need
     both devices writing the same field in that same second.
     ============================================================ */
  var GD_KEY = "suite:gd:v1";
  var SIGNIN_NEEDED = "signin-needed";
  var GD_SCOPE = "https://www.googleapis.com/auth/drive.file";
  var gd = null, gdTok = "", gdTokExp = 0, gdClient = null, gdTimer = null, gdBusy = false, gdVersion = "";

  function gdLoad() {
    try { gd = JSON.parse(localStorage.getItem(GD_KEY) || "null"); } catch (e) { gd = null; }
    return gd;
  }
  function gdStore() { try { localStorage.setItem(GD_KEY, JSON.stringify(gd)); } catch (e) { } }

  function gdScript() {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) return Promise.resolve();
    return new Promise(function (res, rej) {
      var existing = document.getElementById("gsi-client");
      if (existing) { existing.addEventListener("load", function () { res(); }); return; }
      var s = document.createElement("script");
      s.id = "gsi-client";
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.onload = function () { res(); };
      s.onerror = function () { rej(new Error("could not reach Google to sign in \u2014 check the network, or whether the school blocks accounts.google.com")); };
      document.head.appendChild(s);
    });
  }
  /* interactive: show Google's account chooser. Otherwise renew in the
     background, which works while the Google session cookie is alive. */
  function gdAuth(interactive) {
    if (gdTok && Date.now() < gdTokExp - 60000) return Promise.resolve(gdTok);
    return gdScript().then(function () {
      return new Promise(function (res, rej) {
        try {
          gdClient = window.google.accounts.oauth2.initTokenClient({
            client_id: gd.clientId,
            scope: GD_SCOPE,
            callback: function (r) {
              if (r && r.access_token) {
                gdTok = r.access_token;
                gdTokExp = Date.now() + (Number(r.expires_in || 3600) * 1000);
                res(gdTok);
                return;
              }
              /* A silent renewal that cannot be done silently is the normal
                 course of events, not a fault: Safari in particular drops the
                 Google session cookie on its own schedule. It needs one tap,
                 not an error message. */
              rej(new Error(interactive ? "Google did not return a token" : SIGNIN_NEEDED));
            },
            error_callback: function (err) {
              if (!interactive) { rej(new Error(SIGNIN_NEEDED)); return; }
              rej(new Error(err && err.type === "popup_closed"
                ? "the Google sign-in window was closed"
                : "Google sign-in failed \u2014 the account may not be allowed to use this app. If this is a school account, an administrator has to allow this app's client ID under Admin console \u2192 Security \u2192 Access and data control \u2192 API controls."));
            }
          });
          gdClient.requestAccessToken({ prompt: interactive ? "" : "none" });
        } catch (e) { rej(e); }
      });
    });
  }
  function gdFetch(url, opts, interactive) {
    return gdAuth(!!interactive).then(function (tok) {
      opts = opts || {};
      opts.headers = Object.assign({ Authorization: "Bearer " + tok }, opts.headers || {});
      opts.cache = "no-store";
      return fetch(url, opts);
    }).then(function (res) {
      if (res.status === 401) { gdTok = ""; gdTokExp = 0; throw new Error("Google signed this device out \u2014 connect again"); }
      if (res.status === 403) throw new Error("Google refused the request. If this is a school account, an administrator has to allow this app's client ID under Admin console \u2192 Security \u2192 Access and data control \u2192 API controls.");
      return res;
    });
  }
  function gdApi(path) { return "https://www.googleapis.com/drive/v3/" + path; }

  /* Which Google account this is matters: a district account is covered by the
     district's own arrangement with Google, a personal one is not. Show it
     rather than make him remember. Best effort — if Drive will not tell us,
     say nothing rather than fail the sync over it. */
  function gdWhoAmI() {
    if (!gd || gd.email) return Promise.resolve(gd ? gd.email : "");
    return gdFetch(gdApi("about?fields=user(emailAddress)")).then(function (r) {
      if (!r.ok) return "";
      return r.json().then(function (j) {
        var e = j && j.user && j.user.emailAddress;
        if (e) { gd.email = e; gdStore(); }
        return e || "";
      });
    }).catch(function () { return ""; });
  }

  /* the file this app made, if it is still there */
  function gdFind() {
    var q = "name='" + gd.fileName.replace(/'/g, "\\'") + "' and trashed=false";
    return gdFetch(gdApi("files?spaces=drive&fields=files(id,name,version)&q=" + encodeURIComponent(q)))
      .then(function (r) {
        if (!r.ok) throw new Error("Drive returned " + r.status);
        return r.json();
      }).then(function (j) { return (j.files && j.files[0]) || null; });
  }
  function gdMeta(id) {
    return gdFetch(gdApi("files/" + id + "?fields=version,modifiedTime")).then(function (r) {
      if (!r.ok) throw new Error("Drive returned " + r.status);
      return r.json();
    });
  }
  function gdReadFile(id) {
    return gdFetch(gdApi("files/" + id + "?alt=media")).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error("Drive returned " + r.status);
      return r.text();
    });
  }
  function gdCreate(text) {
    var boundary = "suite" + Date.now();
    var meta = { name: gd.fileName, mimeType: "application/json" };
    var body = "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(meta) + "\r\n--" + boundary +
      "\r\nContent-Type: application/json\r\n\r\n" + text + "\r\n--" + boundary + "--";
    return gdFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,version", {
      method: "POST",
      headers: { "Content-Type": "multipart/related; boundary=" + boundary },
      body: body
    }).then(function (r) {
      if (!r.ok) throw new Error("Drive would not create the file (" + r.status + ")");
      return r.json();
    });
  }
  function gdUpdate(id, text) {
    return gdFetch("https://www.googleapis.com/upload/drive/v3/files/" + id + "?uploadType=media&fields=id,version", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: text
    }).then(function (r) {
      if (!r.ok) throw new Error("Drive would not save the file (" + r.status + ")");
      return r.json();
    });
  }

  function gdSync(opts) {
    opts = opts || {};
    if (!gd || gdBusy) return Promise.resolve([]);
    gdBusy = true;
    if (!opts.quiet) set("syncing", "");
    var localKeys = snapshot().keys;

    return Promise.resolve(gd.fileId ? { id: gd.fileId } : gdFind()).then(function (f) {
      if (!f) {
        return gdCreate(JSON.stringify({ suite: 1, updatedAt: new Date().toISOString(), keys: localKeys }, null, 1))
          .then(function (made) {
            gd.fileId = made.id; gdStore(); gdVersion = made.version || "";
            writeBase(localKeys);
            set("connected", gd.fileName + " in your Drive");
            return [];
          });
      }
      gd.fileId = f.id; gdStore();
      return gdReadFile(f.id).then(function (text) {
        var remoteKeys = null;
        if (text) {
          var p = normalise(JSON.parse(text));
          remoteKeys = p ? p.keys : null;
        }
        if (!remoteKeys) {
          return gdUpdate(f.id, JSON.stringify({ suite: 1, updatedAt: new Date().toISOString(), keys: localKeys }, null, 1))
            .then(function (u) {
              gdVersion = u.version || ""; writeBase(localKeys);
              set("connected", gd.fileName + " in your Drive");
              return [];
            });
        }
        var merged = mergeKeys(readBase(), localKeys, remoteKeys);
        lastReport = merged.report;
        var changed = [];
        if (merged.report.changedLocally.length) {
          changed = apply({ keys: merged.keys, updatedAt: new Date().toISOString() });
        }
        if (!merged.report.changedRemotely.length) {
          writeBase(merged.keys);
          set("connected", gd.fileName + " in your Drive");
          if (changed.length) notifyChanged(changed);
          return changed;
        }
        /* Drive cannot reject a stale write, so check the version did not move
           while we were merging. If it did, start over on top of theirs. */
        return gdMeta(f.id).then(function (m) {
          if (gdVersion && m.version && String(m.version) !== String(gdVersion) && !opts.retried) {
            gdBusy = false;
            return gdSync(Object.assign({}, opts, { retried: true }));
          }
          return gdUpdate(f.id, JSON.stringify({ suite: 1, updatedAt: new Date().toISOString(), keys: merged.keys }, null, 1))
            .then(function (u) {
              gdVersion = u.version || "";
              writeBase(merged.keys);
              set("connected", gd.fileName + " in your Drive");
              if (changed.length) notifyChanged(changed);
              return changed;
            });
        });
      }).then(function (r) {
        /* remember the version we are now level with */
        if (!gdVersion && gd.fileId) return gdMeta(gd.fileId).then(function (m) { gdVersion = m.version || ""; return r; });
        return r;
      });
    }).catch(function (e) {
      if (e && e.message === SIGNIN_NEEDED) set("needsPermission", "tap to sign in to Google again");
      else set("error", e.message || String(e));
      return [];
    }).then(function (r) { gdBusy = false; return r; });
  }
  /* the one tap that turns needsPermission back into connected */
  function gdSignIn() {
    if (!gd) return Promise.reject(new Error("Drive is not set up on this device"));
    return gdAuth(true).then(function () { return gdSync({ force: true, push: true }); });
  }

  function gdConnect(cfg) {
    gd = {
      clientId: String(cfg.clientId || "").trim(),
      fileName: String(cfg.fileName || "classroom.json").trim() || "classroom.json",
      fileId: ""
    };
    if (!gd.clientId) { gd = null; return Promise.reject(new Error("the OAuth client ID is needed")); }
    gdTok = ""; gdTokExp = 0; gdVersion = "";
    return gdAuth(true).then(function () {
      gdStore();
      return gdSync({ force: true, push: true });
    }).then(function (changed) {
      gdWhoAmI();
      if (state === "error") throw new Error(detail);
      gdPoll();
      return changed;
    }).catch(function (e) { gd = null; try { localStorage.removeItem(GD_KEY); } catch (e2) { } set("off"); throw e; });
  }
  function gdDisconnect() {
    clearInterval(gdTimer);
    try {
      if (gdTok && window.google && window.google.accounts && window.google.accounts.oauth2) {
        window.google.accounts.oauth2.revoke(gdTok, function () { });
      }
    } catch (e) { }
    gd = null; gdTok = ""; gdTokExp = 0; gdVersion = "";
    try { localStorage.removeItem(GD_KEY); localStorage.removeItem(BASE_KEY); } catch (e) { }
    set("off");
    return Promise.resolve();
  }
  function gdPoll() {
    clearInterval(gdTimer);
    if (!gd) return;
    gdTimer = setInterval(function () {
      if (!gd || document.hidden || !navigator.onLine) return;
      gdSync({ quiet: true });
    }, 25000);
  }

  /* ============================================================
     HANDOFF FOLDER

     The Drive API needs an OAuth client, and a district admin can block that
     — ours is. The Drive *desktop client* is not an API: it syncs an ordinary
     folder, and nobody can block a folder.

     So the desktop watches one folder. Anything that looks like a suite
     payload dropped in there gets merged and then removed, and the folder is
     left holding one current classroom.json. The phone's part is the share
     sheet it already has: Save a backup, share to Drive, into that folder.
     Nothing on the desktop to press.

     This also works with a folder on a USB stick, a network share, or
     Dropbox. It does not care what is syncing the folder, or whether
     anything is.
     ============================================================ */
  var FOLDER_HANDLE_KEY = "folder";
  var FOLDER_SUPPORTED = !!window.showDirectoryPicker;
  var CANON = "classroom.json";
  var SEEN_KEY = "suite:folderSeen:v1";
  var folder = null, folderTimer = null, folderBusy = false, lastPickup = null;

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
        if (h.kind === "file" && /\.json$/i.test(name)) out.push({ name: name, handle: h });
        return walk(it);
      });
    })(folder.entries()).catch(function () { return out; });
  }

  function folderSync(opts) {
    opts = opts || {};
    if (!folder || folderBusy) return Promise.resolve([]);
    folderBusy = true;
    if (!opts.quiet) set("syncing", "");

    return folderPerm(false).then(function (okPerm) {
      if (!okPerm) { set("needsPermission", "tap to allow the folder again"); return []; }
      return folderFiles().then(function (files) {
        var localKeys = snapshot().keys;
        var base = readBase();
        var merged = localKeys;
        var canonical = null, drops = [], seen = seenList();
        var conflicts = 0;

        var chain = Promise.resolve();
        files.forEach(function (f) {
          chain = chain.then(function () {
            return f.handle.getFile().then(function (file) {
              var stamp = String(file.lastModified) + ":" + file.size;
              if (f.name !== CANON && seen[f.name] === stamp) return;   /* already absorbed */
              return file.text().then(function (text) {
                var payload;
                try { payload = normalise(JSON.parse(text)); } catch (e) { payload = null; }
                if (!payload || !payload.keys) return;                  /* not ours; leave it alone */
                if (f.name === CANON) { canonical = payload.keys; return; }
                drops.push({ name: f.name, keys: payload.keys, handle: f.handle, stamp: stamp });
              });
            }).catch(function () { });
          });
        });

        return chain.then(function () {
          if (canonical) {
            var m = mergeKeys(base, merged, canonical);
            merged = m.keys; conflicts += m.report.conflicts;
          }
          drops.forEach(function (d) {
            var m2 = mergeKeys(base, merged, d.keys, true);
            merged = m2.keys; conflicts += m2.report.conflicts;
          });

          var changed = [];
          var differsLocally = KEYS.some(function (k) { return merged[k] !== undefined && merged[k] !== localKeys[k]; });
          if (differsLocally) changed = apply({ keys: merged, updatedAt: new Date().toISOString() });

          var mustWrite = !canonical || KEYS.some(function (k) { return merged[k] !== (canonical || {})[k]; });
          lastReport = { conflicts: conflicts, picked: drops.length, changedLocally: changed };

          if (!mustWrite && !drops.length) {
            writeBase(merged);
            set("connected", folder.name);
            if (changed.length) notifyChanged(changed);
            return changed;
          }
          return folderWrite(merged).then(function () {
            writeBase(merged);
            /* only now is it safe to take the dropped files away: everything
               they held is in classroom.json and on this device */
            var rm = Promise.resolve();
            drops.forEach(function (d) {
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
    }).then(function (r) { folderBusy = false; return r; });
  }

  function folderWrite(keys) {
    return folder.getFileHandle(CANON, { create: true }).then(function (h) {
      return h.createWritable().then(function (w) {
        return w.write(JSON.stringify({ suite: 1, updatedAt: new Date().toISOString(), keys: keys }, null, 1))
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
    supported: SUPPORTED,
    get state() { return state; },
    get detail() { return detail; },
    get fileName() { return handle ? handle.name : ""; },
    get backend() { return backend(); },
    get github() { return gh ? { owner: gh.owner, repo: gh.repo, path: gh.path, branch: gh.branch } : null; },
    folderSupported: FOLDER_SUPPORTED,
    get folderName() { return folder ? folder.name : ""; },
    get lastPickup() { return lastPickup; },
    connectFolder: folderConnect,
    disconnectFolder: folderDisconnect,
    allowFolder: function () {
      return folderPerm(true).then(function (ok) {
        if (!ok) return [];
        return folderSync({ force: true });
      });
    },
    get drive() { return gd ? { fileName: gd.fileName, fileId: gd.fileId, clientId: gd.clientId, email: gd.email || "" } : null; },
    get lastMerge() { return lastReport; },
    get device() { return deviceName(); },
    setDevice: function (n) { try { localStorage.setItem(DEVICE_KEY, String(n || "").trim() || deviceName()); } catch (e) { } },
    init: init,
    connect: connect,
    disconnect: disconnect,
    connectGitHub: ghConnect,
    disconnectGitHub: ghDisconnect,
    connectDrive: gdConnect,
    disconnectDrive: gdDisconnect,
    signInDrive: gdSignIn,
    driveAccount: gdWhoAmI,
    syncNow: function () { return folder ? folderSync({ force: true }) : gd ? gdSync({ force: true, push: true }) : gh ? ghSync({ force: true, push: true }) : pull(true).then(function (c) { return doWrite().then(function () { return c; }); }); },
    push: function (now) { return folder ? folderSync({ quiet: !now }) : gd ? gdSync({ quiet: !now, push: true }) : gh ? ghSync({ quiet: !now, push: true }) : push(now); },
    pull: function (force) { return folder ? folderSync({ force: !!force }) : gd ? gdSync({ force: !!force }) : gh ? ghSync({ force: !!force }) : pull(force); },
    exportFile: exportFile,
    importFile: importFile,
    ensurePermission: function () { return ensure(true); },
    onState: function (f) { listeners.push(f); f(state, detail); },
    onChanged: function (f) { changeHandlers.push(f); }
  };
})();

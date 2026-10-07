/* ==========================================================================
   suite-planner-sync.js (v99) — the planner, kept in step on its own.

   The folder route needs a computer to watch a folder and a phone to tap
   Send and Get. The planner holds no student records, so it alone also
   travels through a PRIVATE GitHub repository: one file, planner.json,
   pulled when a page opens or comes back into view and pushed about ten
   seconds after the last planner change. It works the same in Safari on a
   phone as in Chrome on a computer.

   It carries these keys and no others (PLANNER_KEYS). They stay on the
   folder route too, so Send, Get and Email still carry the planner to a
   device that has not set this up (the school computer, a colleague).
   Each route merges against its own base, so the two never disagree about
   what the other changed; see "Planner sync" in HANDOFF.md.

   What keeps it safe is not the transport:
   - Only PLANNER_KEYS ever reach the repository, and a test holds the list
     to keys that hold no student record. A new key stays off it.
   - Before every push, every piece of text in those keys (notes, what we
     did, block labels and notes, even object keys) is checked against the
     names this device knows: the gradebook roster and each child's other
     names, the ORF tool's roster, and the Walk to WIN lists, which name
     children in other rooms. A first name or another name matches in any
     case; a surname only when capitalised, so "long vowels" is not a
     child called Long. Any match holds the WHOLE push and says where.
   - With no class list on the device there is nothing to check against,
     so it holds rather than send unchecked.
   - A repository that is not private is refused.
   - A word marked "Not a student here" is passed for that one note only,
     and only until the note's text changes. That mark stays on this device.

   v101 adds the projected boards, by id only. boards.json carries the math
   board (suite:groups:v1) and the reading cards (suite:readgroups:v1),
   where a child is a random gradebook id, never a name. Each board's
   `guests` (visiting children, typed by name) is taken out before it
   leaves the device, and every piece of typed text gets the same name
   check, holding boards.json on its own. A device that receives boards
   keeps its own guests and lays the placements around them. Names come
   from each device's own gradebook; the Walk to WIN lists, which store
   names, stay on the folder route.

   v102 adds the Walk to WIN slides (LIVE_KEY): not the pasted lists, which
   name the whole grade, but win.js's summary of this class's matches by
   gradebook id, with the teachers' names and rooms on the cards (his call),
   the line notes and the days. The newest summary wins (its `at`); a device
   re-summarises only when its own lists or roster change.

   A device can be set up as a DISPLAY (the school computer that projects):
   read-only, it never writes either file, takes the repository's copy as
   it is, and checks every 25 seconds while on screen, so the projector
   follows the Mac and the phone with no tap. Board changes go out 3
   seconds after they are made.

   v105: FIREBASE can stand in for GitHub as the store. The same two
   files travel, each as one Firestore document (collection "suite", docs
   "planner" and "boards": { text, rev, at, from }), so every rule above
   holds unchanged: the merge, the name check, the guests, the newest WIN
   summary. `rev` plays the sha (a transaction refuses a stale one). Instead
   of polling, each page listens to both documents and runs a round the
   moment another device writes. Sign-in is a Firebase email and password,
   not a Google account; the security rules (tools/firestore.rules) let the
   display's account read and only the owner's write. The SDK is vendored
   (vendor/firebase/, Apache-2.0) and loads only on a device set up for it.
   Everything Firebase-specific is the FB object below; the rest is shared.

   v113: GitHub is gone. Firebase is the store; a device still set up for
   GitHub sees a note to sign in with Firebase, and nothing it holds is lost.
   (The GitHub text above is its history; CHANGELOG v99-v112 has it all.)

   Nothing waits on GitHub: every request has a timeout and the first round
   starts after the page is up (v95 hung on a GitHub call at startup).
   Every request skips the browser cache, because GitHub lets a browser keep
   a file for a minute, and a pull straight after another device's push
   would otherwise read the old copy.
   ========================================================================== */
(function () {
  "use strict";
  if (window.SuitePlannerSync) return;
  var SS = window.SuiteSync;
  if (!SS || !SS.lane) return;
  var L = SS.lane;

  var PLANNER_KEYS = ["lp:settings:v2", "lp:days:v2", "lp:pending:v1", "lp:me:v1", "suite:migrations"];
  var CONF_KEY = "suite:plannerHub:v1", OK_KEY = "suite:plannerHubOk:v1", BASE_IDB = "plannerHubBase";
  var FILE = "planner.json";
  var PUSH_AFTER = 10000, TIMEOUT = 15000, PULL_GAP = 30000, TRIES = 3;
  /* v101: the projected boards, by id */
  var BOARD_KEYS = ["suite:groups:v1", "suite:readgroups:v1"];
  var BOARDS_FILE = "boards.json", BBASE_IDB = "boardsHubBase";
  var LIVE_KEY = "suite:winLive:v1";   /* v102: not a folder-route key, so handled beside the merge */
  var BOARD_PUSH_AFTER = 3000, DISPLAY_POLL = 25000;
  /* v105: where this file was loaded from, to find vendor/firebase/ beside it */
  var HERE = (document.currentScript && document.currentScript.src) || "";
  var onGroups = /\/groups(\/|\/index\.html)?$/.test(location.pathname);
  var onPlanner = /\/planner(\/|\/index\.html)?$/.test(location.pathname);

  /* ---------- this device's settings ---------- */
  function conf() {
    try { var c = JSON.parse(localStorage.getItem(CONF_KEY) || "null"); return c && typeof c === "object" ? c : null; }
    catch (e) { return null; }
  }
  function saveConf(c) { try { localStorage.setItem(CONF_KEY, JSON.stringify(c)); } catch (e) { } }
  function viaFirebase() { var c = conf(); return !!(c && c.fb && c.fb.projectId && c.email); }
  function configured() { var c = conf(); return !!(c && c.fb && c.fb.projectId && c.email); }
  /* v113: set up for GitHub before it was removed */
  function leftoverGitHub() { var c = conf(); return !!(c && c.repo && c.token && !c.fb); }
  function display() { var c = conf(); return !!(c && c.readonly); }
  /* v107: sync covers everything it can, so a connected device always keeps the
     boards (and the WIN summary) in step; the per-device switch is gone */
  function boardsOn() { return configured(); }
  function noteConf(patch) { var c = conf(); if (!c) return; Object.keys(patch).forEach(function (k) { c[k] = patch[k]; }); saveConf(c); }



  /* ---------- state, for the menu and the banner ---------- */
  var state = configured() ? "idle" : "off", detail = "", hold = null;
  var listeners = [];
  function setState(s, d) {
    state = s; detail = d || "";
    listeners.forEach(function (f) { try { f(state); } catch (e) { } });
    paintBanner();
  }

  /* ---------- names: the check before every push ---------- */
  function fold(s) { return String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function wordsOf(s) { return fold(s).toLowerCase().split(/[^a-z]+/).filter(function (w) { return w.length >= 2; }); }
  function readJSON(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function akaList(v) {
    if (window.SuiteNames && window.SuiteNames.akaList) return window.SuiteNames.akaList(v);
    return (Array.isArray(v) ? v : String(v == null ? "" : v).split(/[,;\/]+/)).map(function (x) { return String(x).trim(); }).filter(Boolean);
  }
  /* word -> "any" (matches in any case) or "cap" (a surname: capitalised only) */
  function knownNames() {
    var words = {}, roster = 0;
    function add(name, how) {
      wordsOf(name).forEach(function (w) { if (words[w] !== "any") words[w] = how; });
    }
    var gb = readJSON("gb2_standards_v1");
    (gb && Array.isArray(gb.students) ? gb.students : []).forEach(function (s) {
      if (!s || typeof s !== "object") return;
      roster++;
      add(s.first, "any");
      akaList(s.aka).forEach(function (a) { add(a, "any"); });
      add(s.last, "cap");
    });
    var orf = readJSON("running-records-v1");
    (orf && Array.isArray(orf.students) ? orf.students : []).forEach(function (s) {
      if (s && !s.demo) add(s.name, "any");
    });
    var win = readJSON("suite:win:v1");
    var lists = win && win.lists && typeof win.lists === "object" ? win.lists : {};
    Object.keys(lists).forEach(function (id) {
      var subj = (lists[id] && lists[id].subjects) || {};
      Object.keys(subj).forEach(function (sk) {
        ((subj[sk] && subj[sk].groups) || []).forEach(function (g) {
          ((g && g.lines) || []).forEach(function (ln) { if (ln) add(ln.first, "any"); });
        });
      });
    });
    return { words: words, roster: roster };
  }
  /* the names in one piece of text, as they were typed */
  function namesIn(text, words) {
    var out = [], seen = {};
    var re = /[A-Za-z]+/g, m, t = fold(text);
    while ((m = re.exec(t))) {
      var raw = m[0], w = raw.toLowerCase();
      if (w.length < 2 || !words[w] || seen[w]) continue;
      if (words[w] === "cap" && !/^[A-Z]/.test(raw)) continue;
      seen[w] = 1; out.push({ word: w, typed: raw });
    }
    return out;
  }
  function hash(s) {
    var h = 5381; s = String(s);
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36) + ":" + s.length;
  }
  function okMap() { var o = readJSON(OK_KEY); return o && typeof o === "object" ? o : {}; }
  function fieldId(key, path) { return key + "|" + path.join("/"); }

  /* Every string in the planner's keys, and every object key (a block's
     note is keyed by the block's name). */
  function eachText(v, path, visit) {
    if (typeof v === "string") { visit(path, v, false); return; }
    if (Array.isArray(v)) { v.forEach(function (x, i) { eachText(x, path.concat([String(i)]), visit); }); return; }
    if (v && typeof v === "object") {
      Object.keys(v).forEach(function (k) {
        visit(path.concat([k]), k, true);
        eachText(v[k], path.concat([k]), visit);
      });
    }
  }
  function scan(keys, list) {
    list = list || PLANNER_KEYS;
    var known = knownNames();
    if (!known.roster) return { reason: "roster", hits: [] };
    var ok = okMap(), hits = [], live = {};
    var settings = null;
    try { settings = JSON.parse(keys["lp:settings:v2"] || "null"); } catch (e) { }
    list.forEach(function (k) {
      if (typeof keys[k] !== "string") return;
      var v; try { v = JSON.parse(keys[k]); } catch (e) { return; }
      eachText(v, [], function (path, text, isKey) {
        /* v101: a board's `place` maps random gradebook ids ("x7ada3k") to
           groups; split into words, an id can contain "ada" by chance */
        if (path.length >= 2 && path[path.length - 2] === "place") return;
        /* v102: the WIN summary's notes are keyed by gradebook id too */
        if (isKey && path.length >= 2 && path[path.length - 2] === "notes") return;
        var found = namesIn(text, known.words);
        if (!found.length) return;
        var id = fieldId(k, path) + (isKey ? "#key" : "");
        var mark = ok[id], h = hash(text);
        live[id] = h;
        found.forEach(function (f) {
          if (mark && mark.h === h && mark.w && mark.w.indexOf(f.word) >= 0) return;
          hits.push({ id: id, key: k, path: path, h: h, word: f.word, typed: f.typed, where: describe(k, path, settings) });
        });
      });
    });
    /* a mark whose note has changed, or gone, passes nothing any more */
    var stale = Object.keys(ok).filter(function (id) { return live[id] !== ok[id].h; });
    if (stale.length) {
      stale.forEach(function (id) { delete ok[id]; });
      try { localStorage.setItem(OK_KEY, JSON.stringify(ok)); } catch (e) { }
    }
    return hits.length ? { reason: "names", hits: hits } : null;
  }

  /* where a piece of text is, in the planner's own words */
  var DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  function dayLabel(dk) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dk);
    if (!m) return dk;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return DOW[d.getDay()].slice(0, 3) + " " + (+m[2]) + "/" + (+m[3]);
  }
  function subjectName(settings, id) {
    var s = settings && Array.isArray(settings.subjects) ? settings.subjects.filter(function (x) { return x && x.id === id; })[0] : null;
    return s && s.name ? s.name : id;
  }
  function describe(key, path, settings) {
    var p = path;
    if (key === "lp:days:v2" || key === "lp:pending:v1") {
      var day = dayLabel(p[0] || "") + (key === "lp:pending:v1" ? " (not saved yet)" : "");
      if (p[1] === "notes") return day + " \u00b7 day notes";
      if (p[1] === "entries" && p[2]) {
        var sn = subjectName(settings, p[2]);
        if (p[3] === "note") return day + " \u00b7 " + sn + " note";
        if (p[3] === "pos") return day + " \u00b7 " + sn + ", what we did";
        return day + " \u00b7 " + sn;
      }
      if (p[1] === "blockNotes" && p[2]) return day + " \u00b7 note on " + String(p[2]).split("|").slice(1).join("|");
      return day;
    }
    if (key === "lp:settings:v2") {
      if (p[0] === "templates" && p[1] != null) {
        var blk = settings && settings.templates && settings.templates[p[1]] && settings.templates[p[1]][p[2]];
        return "Settings \u00b7 " + (DOW[+p[1]] || "schedule") + " schedule" + (blk && blk.l ? ", " + blk.l : "");
      }
      if (p[0] === "subjects" && p[1] != null) {
        var sj = settings && settings.subjects && settings.subjects[p[1]];
        return "Settings \u00b7 " + (sj && sj.name ? sj.name : "a subject");
      }
      return "Settings";
    }
    if (key === "lp:me:v1") return "the planner\u2019s name for you";
    /* v101: the boards */
    if (key === "suite:groups:v1") {
      var gi = p[1] === "groups" && p[2] != null ? " \u00b7 group " + (+p[2] + 1) : "";
      if (p[1] === "title") return "Math board \u00b7 title";
      if (p[1] === "stations") return "Math board \u00b7 station " + (+p[2] + 1);
      if (gi && p[3] === "pages") return "Math board" + gi + " \u00b7 page note";
      if (gi) return "Math board" + gi + " name";
      return "Math board";
    }
    if (key === LIVE_KEY) {
      var subj = p.indexOf("subjects") >= 0 ? p[p.indexOf("subjects") + 1] : "";
      var wl = "Walk to WIN" + (subj === "read" ? " \u00b7 Reading" : subj === "math" ? " \u00b7 Math" : "");
      if (p.indexOf("notes") >= 0) return wl + " \u00b7 a line note";
      if (p.indexOf("groups") >= 0) return wl + " \u00b7 a group";
      if (p[1] === "teachers") return "Walk to WIN \u00b7 a teacher\u2019s name or room";
      if (p[p.length - 1] === "name") return "Walk to WIN \u00b7 list name";
      return wl;
    }
    if (key === "suite:readgroups:v1") {
      var un = p[0] === "units" && /^u(\d+)$/.test(p[1] || "") ? " \u00b7 Unit " + p[1].slice(1) : "";
      if (un && p[2] === "name") return "Reading cards" + un + " name";
      if (un && p[2] === "weeks") return "Reading cards" + un + " \u00b7 week label";
      if (un && p[2] === "subs") return "Reading cards" + un + " \u00b7 " + p[3] + " group label";
      return "Reading cards" + un;
    }
    return "planner housekeeping";
  }
  function notAStudent(hit) {
    var ok = okMap(), m = ok[hit.id];
    if (!m || m.h !== hit.h) m = { h: hit.h, w: [] };
    if (m.w.indexOf(hit.word) < 0) m.w.push(hit.word);
    ok[hit.id] = m;
    try { localStorage.setItem(OK_KEY, JSON.stringify(ok)); } catch (e) { }
  }

  /* ---------- the store: Firebase (v105; GitHub removed, v113) ---------- */
  function err(code, msg) { var e = new Error(msg || code); e.code = code; e.suite = true; return e; }
  function checkRepo() { return FB.ready(); }
  /* one file: { sha, text }, or { sha: null, text: null } if it is not there yet ("sha" is Firebase's rev) */
  function fetchFile(name) { return FB.get(name); }
  function putFile(name, text, sha, message) {
    /* v101: a display never writes, whatever asks it to */
    if (display()) return Promise.reject(err("display"));
    return FB.put(name, text, sha, message);
  }
  /* ---------- v105: Firebase, as a store for the same two files ---------- */
  function withTimeout(p) {
    var t = null;
    return Promise.race([p, new Promise(function (res, rej) { t = setTimeout(function () { rej(err("net", "Firebase did not answer")); }, TIMEOUT); })])
      .then(function (v) { clearTimeout(t); return v; }, function (e) { clearTimeout(t); throw e; });
  }
  function fbError(e) {
    if (e && e.suite) return e;   /* already one of ours */
    var c = String(e && e.code || "");
    if (c === "permission-denied") return err("fbdenied");
    if (c === "unauthenticated" || /^auth\/(wrong-password|user-not-found|invalid-credential|invalid-email|invalid-login-credentials|user-disabled)$/.test(c)) return err("fbauth");
    if (c === "auth/too-many-requests") return err("fbslow");
    if (c === "auth/network-request-failed" || c === "unavailable") return err("fbnet", "Firebase could not be reached");
    if (c === "auth/invalid-api-key" || c === "auth/api-key-not-valid" || c === "auth/configuration-not-found") return err("fbconfig");
    return err("net", (e && e.message) || c || "Firebase could not be reached");
  }
  var FB = {
    app: null, auth: null, db: null, user: null, seen: {}, listening: false, liveT: null,
    /* beside this file; failing that, beside suite-sync.js; failing that, the
       suite root one folder up, where every tool page lives */
    base: function () {
      if (HERE) return HERE.replace(/suite-planner-sync\.js(\?[^#]*)?(#.*)?$/, "") + "vendor/firebase/";
      var ss = document.querySelector('script[src*="suite-sync.js"]');
      if (ss && ss.src) return ss.src.replace(/suite-sync\.js(\?[^#]*)?(#.*)?$/, "") + "vendor/firebase/";
      return "../vendor/firebase/";
    },
    load: function () {
      if (window.firebase && window.firebase.firestore && window.firebase.auth) return Promise.resolve();
      var files = ["firebase-app-compat.js", "firebase-auth-compat.js", "firebase-firestore-compat.js"], base = FB.base();
      return files.reduce(function (p, f) {
        return p.then(function () {
          return new Promise(function (res, rej) {
            var sc = document.createElement("script");
            sc.src = base + f; sc.onload = res; sc.onerror = function () { rej(err("nocode")); };
            (document.head || document.documentElement).appendChild(sc);
          });
        });
      }, Promise.resolve());
    },
    init: function () {
      return FB.load().then(function () {
        if (FB.app) return;
        var c = conf();
        FB.app = window.firebase.initializeApp(c.fb, "classroom-suite");
        FB.auth = FB.app.auth();
        FB.db = FB.app.firestore();
        /* a school network that blocks Firestore's streaming falls back to long polling by itself */
        try { FB.db.settings({ experimentalAutoDetectLongPolling: true }); } catch (e) { }
      });
    },
    whoIsIn: function () {
      return new Promise(function (res) {
        var off = FB.auth.onAuthStateChanged(function (u) { off(); res(u || null); });
      });
    },
    ready: function () {
      return withTimeout(FB.init().then(FB.whoIsIn)).then(function (u) {
        if (!u) throw err("fbsignin");
        FB.user = u; FB.listen();
      }, function (e) { throw fbError(e); });
    },
    signIn: function (email, password) {
      return withTimeout(FB.init().then(function () { return FB.auth.signInWithEmailAndPassword(email, password); }))
        .then(function (cred) { FB.user = cred.user; }, function (e) { throw fbError(e); });
    },
    signOut: function () {
      FB.stop();
      if (FB.auth) try { FB.auth.signOut(); } catch (e) { }
      FB.user = null;
    },
    doc: function (name) { return FB.db.collection("suite").doc(String(name).replace(/\.json$/, "")); },
    get: function (name) {
      return withTimeout(FB.doc(name).get({ source: "server" })).then(function (snap) {
        if (!snap.exists) return { sha: null, text: null };
        var d = snap.data() || {};
        return { sha: String(d.rev), text: typeof d.text === "string" ? d.text : "" };
      }, function (e) { throw fbError(e); });
    },
    put: function (name, text, sha, message) {
      var ref = FB.doc(name);
      return withTimeout(FB.db.runTransaction(function (tx) {
        return tx.get(ref).then(function (snap) {
          var cur = snap.exists ? String((snap.data() || {}).rev) : null;
          if (cur !== (sha || null)) throw err("moved");                     /* another device wrote first */
          var rev = (snap.exists ? Number((snap.data() || {}).rev) || 0 : 0) + 1;
          tx.set(ref, { text: text, rev: rev, from: SS.device || "", note: message || "",
            at: window.firebase.firestore.FieldValue.serverTimestamp() });
          return String(rev);
        });
      })).then(function (rev) { FB.seen[String(name).replace(/\.json$/, "")] = rev; return rev; }, function (e) { throw fbError(e); });
    },
    /* the moment another device writes either file, a round runs here */
    listen: function () {
      if (FB.listening) return;
      FB.listening = true;
      FB.unsub = ["planner", "boards"].map(function (n) {
        return FB.doc(n).onSnapshot(function (snap) {
          if (snap.metadata && snap.metadata.hasPendingWrites) return;
          var rev = snap.exists ? String((snap.data() || {}).rev) : null;
          if (!(n in FB.seen)) { FB.seen[n] = rev; return; }
          if (rev === FB.seen[n]) return;
          FB.seen[n] = rev;
          clearTimeout(FB.liveT);
          FB.liveT = setTimeout(function () { if (configured()) round(); }, 300);
        }, function () { FB.listening = false; });
      });
    },
    stop: function () {
      (FB.unsub || []).forEach(function (u) { try { u(); } catch (e) { } });
      FB.unsub = []; FB.listening = false; FB.seen = {};
    }
  };
  /* v106: this copy's own project, from suite-edition.js, if it has one */
  function editionFirebase() {
    var e = window.SuiteEdition && window.SuiteEdition.firebase;
    return e && e.apiKey && e.projectId && e.appId ? e : null;
  }
  var otherProject = false;   /* "Use a different Firebase project" was pressed */
  /* v113: suite-edition.js is loaded by the Small Groups page only, so on the
     planner, gradebook or ORF tool the built-in project was unknown and the
     panel asked for the config (v106's bug). It is loaded here when missing,
     once, from beside this file; the panel redraws when it arrives. */
  var editionTried = false;
  function ensureEdition() {
    if (window.SuiteEdition || editionTried) return Promise.resolve();
    editionTried = true;
    return new Promise(function (res) {
      var sc = document.createElement("script"), done = false;
      var fin = function () { if (!done) { done = true; res(); } };
      sc.src = FB.base().replace(/vendor\/firebase\/$/, "") + "suite-edition.js";
      sc.onload = fin; sc.onerror = fin; setTimeout(fin, 2000);
      (document.head || document.documentElement).appendChild(sc);
    });
  }
  /* the config Firebase's console shows (a JS snippet or JSON), read without running it */
  function parseFirebaseConfig(text) {
    var t = String(text || ""), out = {}, re = /["']?(apiKey|authDomain|projectId|storageBucket|messagingSenderId|appId)["']?\s*:\s*["']([^"']+)["']/g, m;
    while ((m = re.exec(t))) out[m[1]] = m[2];
    return out.apiKey && out.projectId && out.appId ? out : null;
  }

  function readRemote() {
    return fetchFile(FILE).then(function (got) {
      if (got.text == null) return { sha: null, keys: {} };
      var p; try { p = JSON.parse(got.text); } catch (e) { p = null; }
      if (!p || p.kind !== "planner" || !p.keys || typeof p.keys !== "object") throw err("badfile");
      return { sha: got.sha, keys: onlyPlanner(p.keys) };
    });
  }
  function writeRemote(keys, sha) {
    var payload = { suite: 1, kind: "planner", updatedAt: new Date().toISOString(), fromName: SS.device, keys: keys };
    return putFile(FILE, JSON.stringify(payload), sha, "Planner from " + SS.device);
  }

  /* ---------- v101: the boards, without their guests ----------
     A guest is a visiting child, typed by name: suite:groups:v1 keeps them
     at math.guests, suite:readgroups:v1 at units.<u>.guests. They never
     leave the device. Everything else on a board is a random id or typed
     text, and the typed text is name-checked. */
  function parse(json) { try { var v = JSON.parse(json); return v && typeof v === "object" ? v : null; } catch (e) { return null; } }
  function stripGuests(key, json) {
    var v = parse(json);
    if (!v) return null;
    if (key === "suite:groups:v1" && v.math && typeof v.math === "object") delete v.math.guests;
    if (key === "suite:readgroups:v1" && v.units && typeof v.units === "object")
      Object.keys(v.units).forEach(function (u) { if (v.units[u] && typeof v.units[u] === "object") delete v.units[u].guests; });
    return JSON.stringify(v);
  }
  /* the incoming board, with this device's own guests put back in */
  function withGuests(key, json, mineJson) {
    var v = parse(json), mine = parse(mineJson);
    if (!v) return json;
    /* whatever guests arrived are dropped first: only this device's own are kept */
    if (key === "suite:groups:v1" && v.math && typeof v.math === "object") {
      delete v.math.guests;
      var g = mine && mine.math && mine.math.guests;
      if (g && typeof g === "object" && Object.keys(g).length) v.math.guests = g;
    }
    if (key === "suite:readgroups:v1" && v.units && typeof v.units === "object")
      Object.keys(v.units).forEach(function (u) { if (v.units[u] && typeof v.units[u] === "object") delete v.units[u].guests; });
    if (key === "suite:readgroups:v1" && v.units && typeof v.units === "object" && mine && mine.units && typeof mine.units === "object") {
      Object.keys(mine.units).forEach(function (u) {
        var mg = mine.units[u] && mine.units[u].guests;
        if (!mg || typeof mg !== "object" || !Object.keys(mg).length) return;
        if (!v.units[u] || typeof v.units[u] !== "object") v.units[u] = {};
        v.units[u].guests = mg;
      });
    }
    return JSON.stringify(v);
  }

  /* ---------- the round ---------- */
  function onlyPlanner(keys) {
    var out = {};
    PLANNER_KEYS.forEach(function (k) { if (keys && typeof keys[k] === "string") out[k] = keys[k]; });
    return out;
  }
  function localKeys() {
    var out = {};
    PLANNER_KEYS.forEach(function (k) { try { var v = localStorage.getItem(k); if (v != null) out[k] = v; } catch (e) { } });
    return out;
  }
  var base = null;
  function loadBase() {
    if (base) return Promise.resolve(base);
    return L.idbGet(BASE_IDB).then(function (b) { base = b && typeof b === "object" ? b : {}; return base; },
      function () { base = {}; return base; });
  }
  function saveBase(keys) { base = onlyPlanner(keys); L.idbSet(BASE_IDB, base); }

  /* ---------- v101: the boards' base and state ---------- */
  var bbase = null, bstate = "off", bdetail = "", bhold = null, bempty = false;
  var winRemote = null;   /* v103: { at, from } of the WIN summary GitHub holds, as of the last round */
  function loadBBase() {
    if (bbase) return Promise.resolve(bbase);
    return L.idbGet(BBASE_IDB).then(function (b) { bbase = b && typeof b === "object" ? b : {}; return bbase; },
      function () { bbase = {}; return bbase; });
  }
  function onlyBoards(keys) {
    var out = {};
    BOARD_KEYS.forEach(function (k) { if (keys && typeof keys[k] === "string") out[k] = keys[k]; });
    return out;
  }
  function saveBBase(keys) { bbase = onlyBoards(keys); L.idbSet(BBASE_IDB, bbase); }

  var busy = false, again = false, applying = false, lastRound = 0, pushTimer = null, boardTimer = null;
  L.setBusy(function () { return busy; });

  function round() {
    if (!configured()) { setState("off"); return Promise.resolve([]); }
    if (busy) { again = true; return Promise.resolve([]); }
    if (L.folderBusy()) { setTimeout(round, 1500); return Promise.resolve([]); }
    busy = true; lastRound = Date.now();
    clearTimeout(pushTimer); pushTimer = null;
    clearTimeout(boardTimer); boardTimer = null;
    if (state !== "held") setState("syncing");
    var changed = [];
    function attempt(n) {
      return readRemote().then(function (remote) {
        var mine = localKeys();
        if (display()) {
          /* v101: a display shows what the repository has, and sends nothing */
          var take = {};
          PLANNER_KEYS.forEach(function (k) { if (remote.keys[k] !== undefined && remote.keys[k] !== mine[k]) take[k] = remote.keys[k]; });
          if (Object.keys(take).length) {
            applying = true;
            try { changed = changed.concat(L.apply({ keys: take, updatedAt: new Date().toISOString() })); }
            finally { applying = false; }
          }
          saveBase(remote.keys); hold = null;
          return "ok";
        }
        var m = L.mergeKeys(base, mine, remote.keys, false, false);
        var merged = onlyPlanner(m.keys);
        var toApply = {};
        PLANNER_KEYS.forEach(function (k) { if (merged[k] !== undefined && merged[k] !== mine[k]) toApply[k] = merged[k]; });
        if (Object.keys(toApply).length) {
          applying = true;
          try { changed = changed.concat(L.apply({ keys: toApply, updatedAt: new Date().toISOString() })); }
          finally { applying = false; }
        }
        var needPush = PLANNER_KEYS.some(function (k) { return merged[k] !== undefined && merged[k] !== remote.keys[k]; });
        if (!needPush) { saveBase(merged); hold = null; return "ok"; }
        var check = scan(merged);
        if (check) { saveBase(remote.keys); hold = check; return "held"; }
        hold = null;
        return writeRemote(merged, remote.sha).then(function () { saveBase(merged); return "ok"; }, function (e) {
          if (e.code === "moved" && n < TRIES) return attempt(n + 1);   /* another device wrote first: merge again */
          throw e;
        });
      });
    }
    /* v101: the boards, after the planner */
    var boardChanged = [];
    function boardAttempt(n) {
      return fetchFile(BOARDS_FILE).then(function (got) {
        var remote = {}, remoteLive;
        bempty = got.text == null;
        if (got.text != null) {
          var p = parse(got.text);
          if (!p || p.kind !== "boards" || !p.keys || typeof p.keys !== "object") throw err("badboards");
          remote = onlyBoards(p.keys);
          if (typeof p.keys[LIVE_KEY] === "string" && parse(p.keys[LIVE_KEY])) remoteLive = p.keys[LIVE_KEY];
          /* a file someone else wrote is still never let put a guest here */
          Object.keys(remote).forEach(function (k) { remote[k] = stripGuests(k, remote[k]) || remote[k]; });
        }
        var raw = {}, mine = {};
        BOARD_KEYS.forEach(function (k) {
          var v = localStorage.getItem(k);
          if (v == null) return;
          raw[k] = v;
          var st = stripGuests(k, v);
          if (st != null) mine[k] = st;
        });
        var merged = display() ? remote : onlyBoards(L.mergeKeys(bbase, mine, remote, false, false).keys);
        var put = {};
        BOARD_KEYS.forEach(function (k) {
          if (merged[k] === undefined) return;
          var next = withGuests(k, merged[k], raw[k]);
          if (next !== raw[k]) put[k] = next;
        });
        if (Object.keys(put).length) {
          applying = true;
          try { boardChanged = boardChanged.concat(L.apply({ keys: put, updatedAt: new Date().toISOString() })); }
          finally { applying = false; }
        }
        /* v102: the WIN summary. A display shows the repository's; an editing
           device sends its own when it is the newer one. */
        var myLive = localStorage.getItem(LIVE_KEY), when = function (j) { var o = parse(j); return o && typeof o.at === "string" ? o.at : ""; };
        if (display()) {
          if (remoteLive !== undefined && remoteLive !== myLive) {
            applying = true;
            try { localStorage.setItem(LIVE_KEY, remoteLive); boardChanged.push(LIVE_KEY); } finally { applying = false; }
          }
          var rl = parse(remoteLive || "null");
          winRemote = rl ? { at: rl.at, from: rl.from || "" } : null;
          saveBBase(remote); bhold = null; return "ok";
        }
        var mineOk = myLive != null && !!parse(myLive);
        /* sent when there is none there yet, or when this one is newer */
        var sendLive = mineOk && (remoteLive === undefined || when(myLive) > when(remoteLive)) ? myLive : remoteLive;
        var held = parse(sendLive || remoteLive || "null");
        winRemote = held ? { at: held.at, from: held.from || "" } : null;
        if (sendLive !== undefined) merged[LIVE_KEY] = sendLive;
        var need = BOARD_KEYS.concat([LIVE_KEY]).some(function (k) { return merged[k] !== undefined && merged[k] !== (k === LIVE_KEY ? remoteLive : remote[k]); });
        if (!need) { saveBBase(merged); bhold = null; return "ok"; }
        var check = scan(merged, BOARD_KEYS.concat([LIVE_KEY]));
        if (check) { saveBBase(remote); bhold = check; return "held"; }
        bhold = null;
        var payload = { suite: 1, kind: "boards", updatedAt: new Date().toISOString(), fromName: SS.device, keys: merged };
        return putFile(BOARDS_FILE, JSON.stringify(payload), got.sha, "Boards from " + SS.device).then(function () {
          saveBBase(merged); return "ok";
        }, function (e) {
          if (e.code === "moved" && n < TRIES) return boardAttempt(n + 1);
          throw e;
        });
      });
    }
    function boardRound() {
      if (!boardsOn()) { bstate = "off"; bhold = null; return Promise.resolve(); }
      if (/^(fbauth|fbdenied|fbsignin|fbconfig|nocode)$/.test(state)) { bstate = state; return Promise.resolve(); }   /* the planner step said why */
      return loadBBase().then(function () { return boardAttempt(1); }).then(function (how) {
        bstate = how === "held" ? "held" : "idle"; bdetail = "";
      }, function (e) {
        var code = e && e.code || "net";
        bstate = code === "moved" ? "net" : code; bdetail = e && e.message || "";
      });
    }
    return loadBase().then(checkRepo).then(function () { return attempt(1); }).then(function (how) {
      if (how === "ok") { noteConf({ lastOk: new Date().toISOString() }); setState("idle"); }
      else setState("held", hold.reason);
    }, function (e) {
      var code = e && e.code || "net";
      setState(code === "moved" ? "net" : code, e && e.message);
    }).then(boardRound).then(function () {
      busy = false;
      setState(state, detail);
      /* only the planner page shows planner data from memory; everywhere
         else reads it from storage when it is needed */
      if (changed.length && onPlanner) L.notify(changed);
      /* v101: and the Small Groups page holds the boards */
      if (boardChanged.length && onGroups) L.notify(boardChanged);
      L.drain();
      if (again) { again = false; setTimeout(round, 0); }
      return changed;
    });
  }

  function schedule() {
    if (!configured() || display()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(round, PUSH_AFTER);
  }
  /* v101: a change to a board reaches the projector in seconds */
  function scheduleBoards() {
    if (!boardsOn() || display()) return;
    clearTimeout(boardTimer);
    boardTimer = setTimeout(round, BOARD_PUSH_AFTER);
  }
  /* a planner write, from the planner or from the folder route, goes out */
  try {
    var proto = window.Storage && window.Storage.prototype;
    if (proto && !proto.__plannerHubPatched) {
      var prev = proto.setItem;
      proto.setItem = function (k, v) {
        var r = prev.apply(this, arguments);
        if (this === window.localStorage && !applying) {
          if (PLANNER_KEYS.indexOf(k) >= 0) schedule();
          else if (BOARD_KEYS.indexOf(k) >= 0 || k === LIVE_KEY) scheduleBoards();
        }
        return r;
      };
      proto.__plannerHubPatched = true;
    }
  } catch (e) { }
  document.addEventListener("visibilitychange", function () {
    if (!configured()) return;
    if (document.hidden) { if (pushTimer || boardTimer) round(); }
    else if (Date.now() - lastRound > PULL_GAP) round();
  });
  window.addEventListener("pagehide", function () { if (pushTimer || boardTimer) round(); });
  window.addEventListener("online", function () { if (configured()) round(); });

  /* v101: a display checks on its own while it is on screen */
  setInterval(function () {
    if (!configured() || !display() || document.hidden || busy) return;
    /* v105: with Firebase the display listens; this is only a safety check every few minutes */
    if (viaFirebase() && Date.now() - lastRound < 180000) return;
    round();
  }, DISPLAY_POLL);
  function start() { if (configured()) setTimeout(round, 1200); }
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);

  /* ---------- connecting, and turning it off ---------- */
  function connectFirebase(configText, email, password, readonly) {
    var fb = parseFirebaseConfig(configText);
    email = String(email || "").trim();
    if (!fb) return Promise.reject(err("fbconfig"));
    if (!email || !password) return Promise.reject(err("fbcreds"));
    var was = conf();
    var c = { fb: fb, email: email };
    if (readonly) c.readonly = true;
    if (FB.app && (!was || !was.fb || was.fb.projectId !== fb.projectId)) { FB.signOut(); try { FB.app.delete(); } catch (e) { } FB.app = null; }
    saveConf(c);
    if (!was || !was.fb || was.fb.projectId !== fb.projectId) { base = {}; L.idbSet(BASE_IDB, {}); bbase = {}; L.idbSet(BBASE_IDB, {}); }
    /* connected only once this account can actually read: a sign-in the
       security rules don't name would otherwise leave a device half set up */
    return FB.signIn(email, password).then(FB.ready).then(function () { return FB.get(FILE); }).then(function () { return round(); }, function (e) {
      FB.signOut();
      try { localStorage.removeItem(CONF_KEY); } catch (x) { }
      setState("off");
      throw e;
    });
  }
  function disconnect() {
    if (viaFirebase()) FB.signOut();
    try { localStorage.removeItem(CONF_KEY); } catch (e) { }
    clearTimeout(pushTimer); pushTimer = null; hold = null;
    base = {}; L.idbSet(BASE_IDB, {});
    bbase = {}; L.idbSet(BBASE_IDB, {}); bstate = "off"; bhold = null;
    clearTimeout(boardTimer); boardTimer = null;
    setState("off");
  }
  /* v107: the boards are no longer a choice; this only runs a round now, for
     anything that still calls it (v101-v106 tests and pages) */
  function setBoards() {
    if (!configured()) return Promise.reject(err("off"));
    return round();
  }

  /* ---------- words ---------- */
  function ago(iso) {
    var t = Date.parse(iso || ""); if (!t) return "";
    var m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + " min ago";
    var h = Math.round(m / 60); if (h < 24) return h + " h ago";
    var d = Math.round(h / 24); return d + (d === 1 ? " day ago" : " days ago");
  }

  var MESSAGES = {
    badfile: "planner.json in the repository isn\u2019t a planner file, so nothing was changed.",
    /* v101 */
    display: "This computer only displays, so it sends nothing.",
    /* v105: Firebase */
    fbconfig: "That doesn\u2019t look like a Firebase config. Paste the firebaseConfig block from your project\u2019s settings.",
    fbcreds: "Enter the email and password of a user you made in Firebase.",
    fbauth: "Firebase turned that email or password down.",
    fbslow: "Firebase says too many tries. Wait a few minutes, then try again.",
    fbnet: "Couldn\u2019t reach Firebase. Check this computer is online; on a school computer, the network may block Firebase (see chrome://policy, URLBlocklist).",
    fbsignin: "Signed out of Firebase on this device. Turn off on this device, then connect again.",
    fbdenied: "Firebase refused. Check the security rules are published, with this account\u2019s user ID in them.",
    nocode: "Couldn\u2019t load Firebase\u2019s code. Reload the page.",
    badboards: "boards.json in the repository isn\u2019t a boards file, so nothing was changed.",
    off: "Connect planner sync first."
  };
  /* v103: Walk to WIN, said plainly, so a stalled slide says where it stalled */
  function clock(at) {
    if (at === "") return "before any change on that device";
    var t = Date.parse(at || ""); if (!t) return "at an unknown time";
    var d = new Date(t), now = new Date();
    var h = d.getHours(), m = d.getMinutes(), hm = ((h + 11) % 12 + 1) + ":" + (m < 10 ? "0" : "") + m + (h < 12 ? " am" : " pm");
    return d.toDateString() === now.toDateString() ? hm : (d.getMonth() + 1) + "/" + d.getDate() + " " + hm;
  }
  function winLines() {
    var SW = window.SuiteWin;
    if (!SW) return ["Walk to WIN: open Small groups to see its status here."];
    if (typeof SW.liveStatus !== "function")
      return ["Walk to WIN: this page is running an older Walk to WIN file. Reload the page, wait a few seconds, and reload again."];
    var st = SW.liveStatus(), out = [];
    if (st.error) out.push("Walk to WIN: " + st.error + ".");
    if (display()) {
      if (!winRemote) out.push("Walk to WIN: GitHub has no WIN slides yet. Open Small groups \u2192 Walk to WIN on your Mac once.");
      else out.push("Walk to WIN slides as of " + clock(winRemote.at) + (winRemote.from ? ", from " + winRemote.from : "") + ".");
      if (winRemote && st.drawing !== "summary") out.push("But this page is drawing this computer\u2019s own lists. Reload the page, wait a few seconds, and reload again.");
    } else if (!st.error) {
      if (!st.lists) out.push("Walk to WIN: no summary on this device yet. Open Small groups \u2192 Walk to WIN once.");
      else out.push("Walk to WIN changed here " + clock(st.at) + "; GitHub has " +
        (winRemote ? "the version from " + clock(winRemote.at) + (winRemote.from ? " (" + winRemote.from + ")" : "") : "none yet") + ".");
    }
    return out;
  }
  function boardsStatus() {
    if (!boardsOn()) return "Off on this device";
    if (bstate === "off") return "On";
    /* v102: "On" alone, with nothing ever sent, read as working (it misled) */
    if (bstate === "idle" && display() && bempty) return "On, but nothing has been sent yet. Connect the Mac or phone you change them on.";
    if (bstate === "idle") return display()
      ? (viaFirebase() ? "On \u00b7 live: this computer shows each change as it is made" : "On \u00b7 this computer shows them and checks every 25 seconds")
      : "On \u00b7 changes go out in seconds";
    if (bstate === "held") return heldText(bhold, "board");
    return MESSAGES[bstate] || "Couldn\u2019t reach Firebase (" + (bdetail || bstate) + "). It tries again shortly.";
  }
  function heldText(h) {
    h = h || hold;
    if (!h) return "";
    if (h.reason === "roster") return "Paused: this device has no class list yet, so it can\u2019t check for names. Get the latest once.";
    var n = h.hits.length;
    return "Paused: a student\u2019s name is in " + h.hits[0].where + (n > 1 ? " and " + (n - 1) + " more" : "") + ".";
  }
  function status() {
    if (state === "off") return "Off on this device";
    if (state === "syncing") return "Syncing\u2026";
    if (state === "held") return heldText();
    var c = conf();
    if (state === "idle") return "On \u00b7 in step " + (ago(c && c.lastOk) || "");
    return MESSAGES[state] || "Couldn\u2019t reach Firebase (" + (detail || state) + "). It tries again when you come back to the page.";
  }

  function where() { var c = conf() || {}; return "Firebase (" + (c.fb ? c.fb.projectId : "") + ")"; }
  /* ---------- the panel ---------- */
  var css = document.createElement("style");
  css.textContent =
    /* v101: two lists of held places can outgrow a phone; the panel scrolls rather than run off it */
    '#suitesheet.hub{width:min(340px,calc(100vw - 40px));max-height:calc(100vh - 140px);max-height:calc(100dvh - 140px);overflow-y:auto}' +
    '#suitesheet.hub label{display:block;font-size:12.5px;color:#55636E;padding:4px 6px 0}' +
    '#suitesheet.hub input{display:block;box-sizing:border-box;width:100%;min-height:36px;margin-top:3px;padding:0 10px;' +
    'border:1px solid rgba(16,24,32,.18);border-radius:8px;background:#fff;color:#14202A;font:inherit}' +
    /* the planner's own focus ring is its orange, which reads as an error here */
    '#suitesheet.hub input:focus-visible{outline:2px solid var(--suite-accent,#10655C);outline-offset:1px}' +
    '#suitesheet.hub .hubstatus{padding:2px 6px 6px;font-size:13px}' +
    '#suitesheet.hub .hubhit{display:flex;gap:8px;align-items:center;padding:6px;border-top:1px solid rgba(16,24,32,.07)}' +
    '#suitesheet.hub .hubhit span{flex:1 1 auto;font-size:12.5px}' +
    '#suitesheet.hub .hubhit button{width:auto;flex:0 0 auto;padding:6px 8px;font-size:12px;color:#10655C}' +
    '#suitesheet.hub .hubhead{padding:10px 6px 0;margin-top:6px;border-top:1px solid rgba(16,24,32,.09);font-weight:600;font-size:13.5px}' +
    '#suitesheet.hub label.hubcheck{display:flex;gap:8px;align-items:center;padding:8px 6px 2px;color:#14202A;font-size:13px}' +
    '#suitesheet.hub label.hubcheck input{width:auto;min-height:0;margin:0}' +
    '#suitesheet.hub .hubmsg{color:#B4472F;font-size:12.5px;padding:2px 6px}' +
    '#suitesheet.hub .hubgo{background:#10655C;color:#fff;text-align:center;font-weight:600;margin-top:6px}' +
    '#suitesheet.hub .hubgo:hover{background:#0D554D}' +
    '#suitehubheld{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(74px + env(safe-area-inset-bottom,0px));' +
    'z-index:2147483000;display:flex;gap:10px;align-items:center;padding:8px 8px 8px 14px;border-radius:12px;' +
    'background:#14202A;color:#fff;box-shadow:0 2px 10px rgba(16,24,32,.24);width:max-content;max-width:min(520px,calc(100vw - 24px));box-sizing:border-box;' +
    "font:13.5px/1.4 'IBM Plex Sans','Segoe UI',system-ui,sans-serif}" +
    '#suitehubheld span{flex:1 1 auto}' +
    '#suitehubheld button{border:0;border-radius:8px;font:inherit;cursor:pointer;min-height:40px}' +
    '#suitehubheld .go{background:#10655C;color:#fff;font-weight:600;padding:0 14px;white-space:nowrap}' +
    '#suitehubheld .x{background:transparent;color:#9FB2B5;font-size:18px;padding:0 8px}' +
    '@media print{#suitehubheld{display:none!important}}';
  (document.head || document.documentElement).appendChild(css);

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function button(label, run, cls) {
    var b = el("button", cls || "", null);
    b.type = "button";
    b.appendChild(el("span", "", label));
    b.onclick = run;
    return b;
  }
  function open(msg) {
    /* drawn at once; if the edition then arrives with a built-in project, drawn
       again without the config box (only while this setup panel is still up) */
    if (!configured() && !window.SuiteEdition && !editionTried) ensureEdition().then(function () {
      var up = document.getElementById("suitesheet");
      if (up && document.getElementById("fbconfig") && !configured() && editionFirebase()) open(msg);
    });
    var old = document.getElementById("suitesheet");
    if (old) old.remove();
    var box = el("div", "hub");
    box.id = "suitesheet";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Planner sync");
    box.appendChild(el("b", "", "Planner sync"));
    function close() { box.remove(); }

    if (!configured()) {
      /* v113: GitHub is gone; a device set up for it is told so, once, here */
      if (leftoverGitHub()) box.appendChild(el("div", "hubmsg", "GitHub sync was removed. Sign in with Firebase below; everything on this device is still here."));
      /* v105: Firebase, first */
      box.appendChild(el("i", "", "Keeps the planner, the math board, the reading cards and the Walk to WIN slides in step live through your own Firebase project, the boards by student id only. Never the gradebook, reading checks or sub plans, and nothing is sent while a note names a student."));
      /* v106: with this copy's project built in, only the sign-in is asked for */
      var built = otherProject ? null : editionFirebase();
      if (built) box.appendChild(el("div", "hubstatus", "Your suite\u2019s Firebase project: " + built.projectId));
      var f1 = el("label", "", "Firebase config"), j1 = el("textarea");
      j1.id = "fbconfig"; j1.rows = 4; j1.spellcheck = false; j1.placeholder = "const firebaseConfig = { apiKey: \u2026, projectId: \u2026, appId: \u2026 };";
      j1.style.cssText = "display:block;box-sizing:border-box;width:100%;margin-top:3px;padding:6px 10px;border:1px solid rgba(16,24,32,.18);border-radius:8px;font:12px ui-monospace,Menlo,Consolas,monospace";
      f1.appendChild(j1);
      var f2 = el("label", "", "Email"), j2 = el("input");
      j2.id = "fbemail"; j2.type = "email"; j2.autocomplete = "username"; j2.setAttribute("autocapitalize", "off"); f2.appendChild(j2);
      var f3 = el("label", "", "Password"), j3 = el("input");
      j3.id = "fbpass"; j3.type = "password"; j3.autocomplete = "current-password"; f3.appendChild(j3);
      if (built) j1.value = JSON.stringify(built);
      else box.appendChild(f1);
      box.appendChild(f2); box.appendChild(f3);
      var f4 = el("label", "hubcheck"), j4 = el("input");
      j4.type = "checkbox"; j4.id = "fbdisplay";
      f4.appendChild(j4); f4.appendChild(document.createTextNode("This computer only displays (sign in as the display user)"));
      box.appendChild(f4);
      box.appendChild(el("i", "", (built ? "" : "The config is in your Firebase project\u2019s settings, under Your apps. ") +
        "Sign in with the user you made for this device. Bring a second device up to date first (Get the latest, or the sync folder), so its first round starts from the same plans."));
      if (msg) box.appendChild(el("div", "hubmsg", msg));
      box.appendChild(button("Connect", function () {
        var go = this; go.disabled = true;
        var keep = { c: j1.value, e: j2.value, d: j4.checked };
        connectFirebase(j1.value, j2.value, j3.value, j4.checked).then(function () { open(); }, function (e) {
          open(MESSAGES[e && e.code] || "Couldn\u2019t connect: " + (e && e.message || e));
          var a1 = document.getElementById("fbconfig"), a2 = document.getElementById("fbemail"), a4 = document.getElementById("fbdisplay");
          if (a1 && otherProject) a1.value = keep.c; if (a2) a2.value = keep.e; if (a4) a4.checked = keep.d;
        });
      }, "hubgo"));
      if (built) box.appendChild(button("Use a different Firebase project", function () { otherProject = true; open(); }));
    } else {
      var c = conf();
      box.appendChild(el("i", "", display()
        ? "Through " + where() + ". This computer only displays: it shows what is there and never changes anything."
        : "Through " + where() + ". " + "The planner and the boards go there, the boards by student id only," + " and nothing is sent while typed text names a student."));
      box.appendChild(el("div", "hubstatus", status()));
      if (msg) box.appendChild(el("div", "hubmsg", msg));
      function hits(h) {
        h.hits.slice(0, 12).forEach(function (x) {
          var row = el("div", "hubhit");
          row.appendChild(el("span", "", "\u201c" + x.typed + "\u201d in " + x.where));
          var b = el("button", "", "Not a student here"); b.type = "button";
          b.onclick = function () { notAStudent(x); round().then(function () { open(); }); };
          row.appendChild(b);
          box.appendChild(row);
        });
        if (h.hits.length > 12) box.appendChild(el("div", "hubstatus", "\u2026and " + (h.hits.length - 12) + " more. Edit those, then Sync now."));
      }
      if (state === "held" && hold && hold.reason === "names") hits(hold);
      box.appendChild(button("Sync now", function () { round().then(function () { open(); }); }));

      /* v101: the projected boards */
      box.appendChild(el("div", "hubhead", "Boards and Walk to WIN slides"));
      box.appendChild(el("i", "", display()
        ? "Shows the math board, reading cards and Walk to WIN slides as they change on your Mac or phone, names from this computer\u2019s own gradebook copy."
        : "Keeps the math board, reading cards and Walk to WIN slides in step too, by student id only. Children\u2019s names, visiting children and the pasted WIN lists stay off GitHub; the WIN cards\u2019 teacher names and rooms go. Nothing goes while typed text names a student."));
      box.appendChild(el("div", "hubstatus", boardsStatus()));
      if (boardsOn()) winLines().forEach(function (t) { box.appendChild(el("div", "hubstatus", t)); });   /* v103 */
      if (bstate === "held" && bhold && bhold.reason === "names") hits(bhold);
      box.appendChild(button("Turn off on this device", function () { disconnect(); open(); }));
    }
    var cancel = el("button", "cancel", "Close"); cancel.type = "button"; cancel.onclick = close;
    box.appendChild(cancel);
    document.body.appendChild(box);
    var f = box.querySelector("input"); if (f && !msg) try { f.focus(); } catch (e) { }
  }

  /* On the planner only, and without the name itself: the planner is
     projected, and a banner is on screen for anyone in the room. */
  var bannerShut = false;
  function paintBanner() {
    if (!(onPlanner || onGroups) || !document.body) return;
    var b = document.getElementById("suitehubheld");
    /* v101: the Small Groups page is projected too; it shows the boards' hold */
    var h = onPlanner ? (state === "held" ? hold : null) : (bstate === "held" ? bhold : null);
    var what = onPlanner ? "Planner sync" : "Board sync";
    if (!h || bannerShut) { if (b) b.remove(); return; }
    if (!b) {
      b = el("div"); b.id = "suitehubheld"; b.setAttribute("role", "status");
      b.appendChild(el("span"));
      var go = el("button", "go", "Details"); go.type = "button";
      go.onclick = function () { open(); };
      var x = el("button", "x", "\u00d7"); x.type = "button"; x.setAttribute("aria-label", "Hide until next time");
      x.onclick = function () { bannerShut = true; b.remove(); };
      b.appendChild(go); b.appendChild(x);
      document.body.appendChild(b);
    }
    b.firstChild.textContent = h.reason === "roster"
      ? what + " is paused: this device has no class list to check against."
      : what + " is paused: " + (onPlanner ? (h.hits.length > 1 ? h.hits.length + " notes name" : "a note names")
        : (h.hits.length > 1 ? h.hits.length + " places on the boards name" : "a board names")) +
        " a student" + (h.hits[0] ? " (" + h.hits[0].where + ")" : "") + ".";
    lift();
  }
  /* The phone's Get offer, the update notice and the planner's reload
     banner all sit where this does. Whichever comes and goes, this sits
     above them rather than under. */
  var OTHERS = ["suiteget", "suiteupdate", "suitebanner"];
  function lift() {
    var b = document.getElementById("suitehubheld");
    if (!b) return;
    var top = Infinity;
    OTHERS.forEach(function (id) {
      var o = document.getElementById(id);
      if (!o) return;
      var r = o.getBoundingClientRect();
      top = Math.min(top, r.height ? r.top : window.innerHeight - 140);
    });
    /* sit 10px above the highest of them; measured, because a phone wraps them */
    b.style.bottom = top === Infinity ? "" : Math.max(0, Math.round(window.innerHeight - top + 10)) + "px";
  }
  if (onPlanner && typeof MutationObserver === "function") {
    var watch = function () { if (document.body) new MutationObserver(lift).observe(document.body, { childList: true }); };
    if (document.body) watch(); else document.addEventListener("DOMContentLoaded", watch);
  }

  window.SuitePlannerSync = {
    keys: PLANNER_KEYS.slice(),
    get state() { return state; },
    get held() { return hold ? { reason: hold.reason, hits: hold.hits.map(function (h) { return { where: h.where, word: h.word }; }) } : null; },
    get configured() { return configured(); },
    status: status,
    open: open,
    connectFirebase: connectFirebase,   /* v105 */
    parseFirebaseConfig: parseFirebaseConfig,
    get via() { return configured() ? "firebase" : "off"; },
    disconnect: disconnect,
    syncNow: round,
    scan: function () { return scan(localKeys()); },
    /* v101 */
    boardKeys: BOARD_KEYS.slice(),
    get display() { return display(); },
    get boardsOn() { return boardsOn(); },
    get boardState() { return boardsOn() ? bstate : "off"; },
    get boardHeld() { return bhold ? { reason: bhold.reason, hits: bhold.hits.map(function (h) { return { where: h.where, word: h.word }; }) } : null; },
    boardsStatus: boardsStatus,
    winLines: function () { return boardsOn() ? winLines() : []; },   /* v103 */
    setBoards: setBoards,
    onState: function (f) { listeners.push(f); },
    /* the Sync menu's line for this */
    menuOption: function () {
      return { label: "Planner sync", hint: configured() ? status() : "keep the planner in step on its own, through Firebase", run: function () { open(); } };
    }
  };
})();

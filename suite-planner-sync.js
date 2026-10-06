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
  var API = "https://api.github.com", FILE = "planner.json";
  var PUSH_AFTER = 10000, TIMEOUT = 15000, PULL_GAP = 30000, TRIES = 3;
  /* v101: the projected boards, by id */
  var BOARD_KEYS = ["suite:groups:v1", "suite:readgroups:v1"];
  var BOARDS_FILE = "boards.json", BBASE_IDB = "boardsHubBase";
  var LIVE_KEY = "suite:winLive:v1";   /* v102: not a folder-route key, so handled beside the merge */
  var BOARD_PUSH_AFTER = 3000, DISPLAY_POLL = 25000;
  var onGroups = /\/groups(\/|\/index\.html)?$/.test(location.pathname);
  var REPO_RE = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/;
  var onPlanner = /\/planner(\/|\/index\.html)?$/.test(location.pathname);

  /* ---------- this device's settings ---------- */
  function conf() {
    try { var c = JSON.parse(localStorage.getItem(CONF_KEY) || "null"); return c && typeof c === "object" ? c : null; }
    catch (e) { return null; }
  }
  function saveConf(c) { try { localStorage.setItem(CONF_KEY, JSON.stringify(c)); } catch (e) { } }
  function configured() { var c = conf(); return !!(c && c.repo && c.token); }
  function display() { var c = conf(); return !!(c && c.readonly); }
  function boardsOn() { var c = conf(); return !!(c && c.repo && c.token && c.boards); }
  function noteConf(patch) { var c = conf(); if (!c) return; Object.keys(patch).forEach(function (k) { c[k] = patch[k]; }); saveConf(c); }

  /* "owner/name", or the repository's address pasted whole */
  function parseRepo(v) {
    var t = String(v || "").trim().replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\.git$/i, "").replace(/\/+$/, "");
    return REPO_RE.test(t) ? t : "";
  }

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

  /* ---------- GitHub ---------- */
  function err(code, msg) { var e = new Error(msg || code); e.code = code; return e; }
  function gh(method, url, body, accept) {
    var c = conf();
    if (!c || !c.token) return Promise.reject(err("off"));
    if (typeof fetch !== "function") return Promise.reject(err("net", "no network here"));
    var ctl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = null;
    var headers = { "Authorization": "Bearer " + c.token, "Accept": accept || "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    if (body) headers["Content-Type"] = "application/json";
    var req = fetch(API + url, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined,
      cache: "no-store", signal: ctl ? ctl.signal : undefined });
    var limit = new Promise(function (res, rej) {
      timer = setTimeout(function () { if (ctl) ctl.abort(); rej(err("net", "GitHub did not answer")); }, TIMEOUT);
    });
    return Promise.race([req, limit]).then(function (r) {
      clearTimeout(timer);
      var exp = r.headers && r.headers.get && r.headers.get("github-authentication-token-expiration");
      if (exp) noteConf({ exp: exp });
      return r;
    }, function (e) {
      clearTimeout(timer);
      throw e && e.code ? e : err("net", "could not reach GitHub");
    });
  }
  function failFor(r) {
    if (r.status === 401) return err("auth");
    if (r.status === 403 || r.status === 404) return err("access", String(r.status));
    return err("net", "GitHub said " + r.status);
  }
  function utf8ToB64(s) {
    var bytes = new TextEncoder().encode(s), bin = "";
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function b64ToUtf8(b) {
    var bin = atob(String(b).replace(/\s+/g, "")), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  var repoChecked = false;
  function checkRepo() {
    if (repoChecked) return Promise.resolve();
    return gh("GET", "/repos/" + conf().repo).then(function (r) {
      if (!r.ok) throw failFor(r);
      return r.json().then(function (j) {
        if (!j || j.private !== true) throw err("public");
        repoChecked = true;
      });
    });
  }
  /* one file in the repository: { sha, text }, or { sha: null, text: null } if it is not there yet */
  function fetchFile(name) {
    var repo = conf().repo;
    return gh("GET", "/repos/" + repo + "/contents/" + name).then(function (r) {
      if (r.status === 404) return { sha: null, text: null };   /* the repository is there (checkRepo); the file is not yet */
      if (!r.ok) throw failFor(r);
      return r.json().then(function (j) {
        if (j && j.encoding === "base64" && j.content) return { sha: j.sha, text: b64ToUtf8(j.content) };
        /* over a megabyte the contents call leaves the content out */
        return gh("GET", "/repos/" + repo + "/git/blobs/" + j.sha, null, "application/vnd.github.raw+json").then(function (r2) {
          if (!r2.ok) throw failFor(r2);
          return r2.text().then(function (t) { return { sha: j.sha, text: t }; });
        });
      });
    });
  }
  function putFile(name, text, sha, message) {
    /* v101: a display never writes, whatever asks it to */
    if (display()) return Promise.reject(err("display"));
    var body = { message: message, content: utf8ToB64(text) };
    if (sha) body.sha = sha;
    return gh("PUT", "/repos/" + conf().repo + "/contents/" + name, body).then(function (r) {
      if (r.status === 409 || r.status === 422) throw err("moved");
      if (!r.ok) throw r.status === 403 || r.status === 404 ? err("nowrite") : failFor(r);
      return r.json().then(function (j) { return j && j.content && j.content.sha; });
    });
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
      if (state === "auth" || state === "access" || state === "public") { bstate = state; return Promise.resolve(); }   /* the planner step said why */
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
      if (code === "auth" || code === "access") repoChecked = false;
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
    if (configured() && display() && !document.hidden && !busy) round();
  }, DISPLAY_POLL);
  function start() { if (configured()) setTimeout(round, 1200); }
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);

  /* ---------- connecting, and turning it off ---------- */
  function connect(repoText, token, readonly) {
    var repo = parseRepo(repoText);
    token = String(token || "").trim();
    if (!repo) return Promise.reject(err("repo"));
    if (!token) return Promise.reject(err("token"));
    var was = conf();
    saveConf(readonly ? { repo: repo, token: token, readonly: true } : { repo: repo, token: token });
    repoChecked = false;
    if (!was || was.repo !== repo) { base = {}; L.idbSet(BASE_IDB, {}); }
    return checkRepo().then(function () { return round(); }, function (e) {
      try { localStorage.removeItem(CONF_KEY); } catch (x) { }
      setState("off");
      throw e;
    });
  }
  function disconnect() {
    try { localStorage.removeItem(CONF_KEY); } catch (e) { }
    clearTimeout(pushTimer); pushTimer = null; hold = null; repoChecked = false;
    base = {}; L.idbSet(BASE_IDB, {});
    bbase = {}; L.idbSet(BBASE_IDB, {}); bstate = "off"; bhold = null;
    clearTimeout(boardTimer); boardTimer = null;
    setState("off");
  }
  /* v101: the boards are a choice made on each device */
  function setBoards(on) {
    if (!configured()) return Promise.reject(err("off"));
    noteConf({ boards: !!on });
    clearTimeout(boardTimer); boardTimer = null;
    if (!on) { bstate = "off"; bhold = null; bbase = {}; L.idbSet(BBASE_IDB, {}); setState(state, detail); return Promise.resolve([]); }
    bbase = {}; L.idbSet(BBASE_IDB, {});
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
  function daysLeft() {
    var c = conf(), t = c && c.exp ? Date.parse(String(c.exp).replace(" UTC", "Z").replace(" ", "T")) : NaN;
    return isNaN(t) ? null : Math.floor((t - Date.now()) / 86400000);
  }
  var MESSAGES = {
    auth: "GitHub turned the token down. It may have expired: paste a new one.",
    access: "GitHub can\u2019t find that repository with this token.",
    nowrite: "This token can read the repository but not write to it. Give it Contents: Read and write.",
    "public": "Stopped: that repository is public. Make it private on GitHub, then Sync now.",
    badfile: "planner.json in the repository isn\u2019t a planner file, so nothing was changed.",
    repo: "That doesn\u2019t look like a repository. Use your-name/repository-name.",
    token: "Paste the token too.",
    /* v101 */
    display: "This computer only displays, so it sends nothing.",
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
    if (bstate === "idle" && display() && bempty) return "On, but nothing has been sent yet. Press Keep the boards in step on the Mac or phone you change them on.";
    if (bstate === "idle") return display()
      ? "On \u00b7 this computer shows them and checks every 25 seconds"
      : "On \u00b7 changes go out in seconds";
    if (bstate === "held") return heldText(bhold, "board");
    return MESSAGES[bstate] || "Couldn\u2019t reach GitHub (" + (bdetail || bstate) + "). It tries again shortly.";
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
    if (state === "idle") {
      var left = daysLeft();
      return "On \u00b7 in step " + (ago(c && c.lastOk) || "") +
        (left !== null && left <= 14 ? " \u00b7 the token runs out " + (left <= 0 ? "today" : "in " + left + (left === 1 ? " day" : " days")) : "");
    }
    return MESSAGES[state] || "Couldn\u2019t reach GitHub (" + (detail || state) + "). It tries again when you come back to the page.";
  }

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
    var old = document.getElementById("suitesheet");
    if (old) old.remove();
    var box = el("div", "hub");
    box.id = "suitesheet";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Planner sync");
    box.appendChild(el("b", "", "Planner sync"));
    function close() { box.remove(); }

    if (!configured()) {
      box.appendChild(el("i", "", "Keeps the planner in step on its own through a private GitHub repository, and the math board and reading cards too if you choose, by student id only. Never the gradebook, reading checks, Walk to WIN lists or sub plans, and nothing is sent while a note names a student."));
      var l1 = el("label", "", "Repository"), i1 = el("input");
      i1.id = "hubrepo"; i1.placeholder = "your-name/planner-sync"; i1.autocomplete = "off"; i1.spellcheck = false;
      i1.setAttribute("autocapitalize", "off"); l1.appendChild(i1);
      var l2 = el("label", "", "Token"), i2 = el("input");
      i2.id = "hubtoken"; i2.type = "password"; i2.autocomplete = "off"; i2.placeholder = "github_pat_\u2026"; l2.appendChild(i2);
      box.appendChild(l1); box.appendChild(l2);
      var l3 = el("label", "hubcheck"), i3 = el("input");
      i3.type = "checkbox"; i3.id = "hubdisplay";
      l3.appendChild(i3); l3.appendChild(document.createTextNode("This computer only displays (it never changes anything)"));
      box.appendChild(l3);
      box.appendChild(el("i", "", "A fine-grained token for that one repository, with Contents: Read and write (Read only, for a computer that only displays). Paste both once on each device. Bring a second device up to date first (Get the latest, or the sync folder), so its first round starts from the same plans."));
      if (msg) box.appendChild(el("div", "hubmsg", msg));
      box.appendChild(button("Connect", function () {
        var go = this; go.disabled = true;
        connect(i1.value, i2.value, i3.checked).then(function () { open(); }, function (e) {
          open(MESSAGES[e && e.code] || "Couldn\u2019t connect: " + (e && e.message || e));
          var r = document.getElementById("hubrepo"); if (r) r.value = i1.value;
        });
      }, "hubgo"));
    } else {
      var c = conf();
      box.appendChild(el("i", "", display()
        ? "Through " + c.repo + ". This computer only displays: it shows what is there and never changes anything."
        : "Through " + c.repo + ". " + (boardsOn() ? "The planner and the boards go there, the boards by student id only," : "Only the planner goes there,") + " and nothing is sent while typed text names a student."));
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
      box.appendChild(button(boardsOn() ? "Stop keeping the boards in step here" : "Keep the boards in step", function () {
        setBoards(!boardsOn()).then(function () { open(); }, function (e) { open(MESSAGES[e && e.code] || String(e && e.message || e)); });
      }));
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
    connect: connect,
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
      return { label: "Planner sync", hint: configured() ? status() + (boardsOn() ? " \u00b7 boards too" : "") : "keep the planner in step on its own, through GitHub", run: function () { open(); } };
    }
  };
})();

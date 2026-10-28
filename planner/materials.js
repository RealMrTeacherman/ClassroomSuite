/* planner/materials.js (v140): lesson materials, part of the planner.

   Files, links and notes kept on a curriculum lesson, so the slides for
   Reveal U3 L4 are on that lesson's card whichever day it lands on, and
   again next year. Added on the Mac, they open on the school computer.

   - Where one belongs. A Reveal or Benchmark position, not a date:
     "math|u3.l4", "reading|u2.w3.d1" (a guide day such as a Review is
     "math|u3.l4.review"). Adding one asks how wide: this lesson, this week
     (Benchmark) or every lesson in the unit. Open-text subjects (Science,
     WIN) have no position, so theirs belong to the day ("science|d:<date>").
   - Where it is kept. With Planner sync on, in his Firebase project
     (SuitePlannerSync.materials: an index document, and a file's bytes in
     pieces beside it), so every signed-in device sees it within a second or
     two and the display can open it. Without it, on this device only. Each
     device keeps the bytes it has opened in IndexedDB, so a file opens at
     once the second time and without a connection; the day's files are
     fetched ahead when the day is drawn.
   - Names. A file's name, a link and a note go through the same name check
     as the planner before they leave the device. The contents of a file are
     not read: these are curriculum resources (his decision, v140).
   - Never synced by the folder or the sync file, and never in localStorage.

   On the card the button says "Files & links": the Reveal card already has
   a "Materials" disclosure, the guide's own list of what to gather.

   The planner draws an empty .mats on each lesson card (cardBase); this
   file fills them after each draw (renderToday -> afterToday) and when a
   position is nudged (refresh). */
(function () {
  "use strict";
  if (window.PlannerMaterials) return;

  var MAX_BYTES = 20 * 1024 * 1024;
  var PS = function () { return window.SuitePlannerSync || null; };
  var live = function () { var p = PS(); return !!(p && p.configured); };
  var display = function () { var p = PS(); return !!(p && p.display); };

  /* ---------- this device's copy: IndexedDB, or memory where there is none ---------- */
  var DBN = "suite_materials", ST = "kv", dbP = null, mem = new Map();
  function db() {
    if (dbP) return dbP;
    dbP = new Promise(function (res) {
      try {
        if (!window.indexedDB) return res(null);
        var r = window.indexedDB.open(DBN, 1);
        r.onupgradeneeded = function () { try { r.result.createObjectStore(ST); } catch (e) { } };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { res(null); };
      } catch (e) { res(null); }
    });
    return dbP;
  }
  function req(d, mode, fn) {
    return new Promise(function (res) {
      try {
        var r = fn(d.transaction(ST, mode).objectStore(ST));
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { res(undefined); };
      } catch (e) { res(undefined); }
    });
  }
  /* memory keeps a copy either way, so a browser that refuses IndexedDB
     (or jsdom) still works for the session */
  function kget(k) {
    return db().then(function (d) {
      if (!d) return mem.get(k);
      return req(d, "readonly", function (st) { return st.get(k); }).then(function (v) { return v === undefined ? mem.get(k) : v; });
    });
  }
  function kset(k, v) { mem.set(k, v); return db().then(function (d) { return d ? req(d, "readwrite", function (st) { return st.put(v, k); }) : null; }); }
  function kdel(k) { mem.delete(k); return db().then(function (d) { return d ? req(d, "readwrite", function (st) { return st.delete(k); }) : null; }); }

  /* ---------- state ---------- */
  var remote = {};          /* the store's index, as last heard (cached in "index") */
  var local = {};           /* on this device only: no live sync, or not sent yet ("local") */
  var ready = {};           /* id -> File, the bytes in memory for an instant open */
  var busy = {};            /* id -> what is happening to it, said on its chip */
  var loaded = false, unlisten = null;

  function all() {
    var out = {};
    Object.keys(remote).forEach(function (id) { out[id] = remote[id]; });
    Object.keys(local).forEach(function (id) { if (!out[id]) out[id] = local[id]; });
    return out;
  }
  function saveLocal() { return kset("local", local); }
  function uid() { return "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  /* ---------- which lesson ---------- */
  function scopesFor(sb, pos, dk) {
    var p = pos || {}, id = sb.id, out = [];
    if (sb.schema === "ul" && p.unit) {
      out.push({ scope: "lesson", key: id + "|u" + p.unit + ".l" + (p.lesson || 0) + (p.k ? "." + p.k : ""), label: "This lesson" });
      out.push({ scope: "unit", key: id + "|u" + p.unit, label: "Every lesson in Unit " + p.unit });
    } else if (sb.schema === "uwd" && p.unit) {
      out.push({ scope: "lesson", key: id + "|u" + p.unit + ".w" + (p.week || 1) + ".d" + (p.day || 1), label: "This lesson" });
      out.push({ scope: "week", key: id + "|u" + p.unit + ".w" + (p.week || 1), label: "Every day of Week " + (p.week || 1) });
      out.push({ scope: "unit", key: id + "|u" + p.unit, label: "Every lesson in Unit " + p.unit });
    } else if (sb.schema === "l" && p.lesson) {
      out.push({ scope: "lesson", key: id + "|l" + p.lesson, label: "This lesson" });
    } else {
      out.push({ scope: "day", key: id + "|d:" + dk, label: "This day" });
    }
    return out;
  }
  function cardScopes(id) {
    if (typeof draft === "undefined" || !draft || !draft.entries) return null;
    var sb = sub(id), e = draft.entries[id];
    if (!sb || !e) return null;
    return { sb: sb, scopes: scopesFor(sb, e.pos, key(cursor)), where: lessonName(sb, e.pos) };
  }
  function lessonName(sb, pos) {
    var f = (window.fmt || fmt)(sb, pos);
    return sb.schema === "free" ? sb.name + " today" : sb.name + " " + f;
  }
  function itemsFor(scopes) {
    var keys = {}, a = all();
    scopes.forEach(function (s, i) { keys[s.key] = i; });
    return Object.keys(a).map(function (id) { return a[id]; })
      .filter(function (m) { return m && keys[m.key] != null; })
      .sort(function (x, y) { return (keys[x.key] - keys[y.key]) || String(x.at).localeCompare(String(y.at)); });
  }

  /* ---------- words ---------- */
  function e$(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function kindTag(m) {
    if (m.kind === "link") return "Link";
    if (m.kind === "note") return "Note";
    var t = String(m.type || ""), n = String(m.name || "").toLowerCase();
    if (/pdf/.test(t) || /\.pdf$/.test(n)) return "PDF";
    if (/^image\//.test(t)) return "Image";
    if (/presentation|powerpoint/.test(t) || /\.(pptx?|key)$/.test(n)) return "Slides";
    if (/word|opendocument\.text/.test(t) || /\.docx?$/.test(n)) return "Doc";
    if (/^video\//.test(t)) return "Video";
    if (/^audio\//.test(t)) return "Audio";
    return "File";
  }
  function title(m) {
    if (m.kind === "note") { var t = String(m.text || "").trim().split("\n")[0]; return t.length > 48 ? t.slice(0, 46) + "\u2026" : t || "Note"; }
    if (m.kind === "link") return m.name || hostOf(m.url);
    return m.name || "File";
  }
  function hostOf(u) { try { var x = new URL(u); return x.hostname.replace(/^www\./, "") + (x.pathname.length > 1 ? x.pathname.replace(/\/$/, "") : ""); } catch (e) { return u; } }
  function size(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
  function when(at) {
    var t = Date.parse(at || ""); if (!t) return "";
    return new Date(t).toLocaleDateString([], { month: "short", day: "numeric" });
  }

  /* ---------- the card ---------- */
  function chipHTML(m) {
    var st = busy[m.id], scope = m.scope === "unit" ? " \u00b7 unit" : m.scope === "week" ? " \u00b7 week" : "";
    return '<button type="button" class="matchip' + (st ? " busy" : "") + '" data-mat-open="' + e$(m.id) + '" title="' + e$(title(m) + (st ? " \u2014 " + st : "")) + '">' +
      '<span class="mattag">' + e$(kindTag(m)) + "</span>" +
      '<span class="matname">' + e$(title(m)) + "</span>" +
      (st ? '<span class="matstate">' + e$(st) + "</span>" : scope ? '<span class="matstate">' + scope.slice(3) + "</span>" : "") +
      "</button>";
  }
  function fill(el) {
    var id = el.getAttribute("data-mats"), c = cardScopes(id);
    if (!c) { el.innerHTML = ""; return; }
    var items = itemsFor(c.scopes);
    var add = display() ? "" : '<button type="button" class="matadd" data-mat-add="' + e$(id) + '">' +
      (items.length ? "Files & links" : "Add files & links") + "</button>";
    el.innerHTML = items.length || add ? items.map(chipHTML).join("") + add : "";
    el.classList.toggle("has", !!items.length);
  }
  function refresh(id) {
    if (typeof main === "undefined" || !main) return;
    [].forEach.call(main.querySelectorAll(id ? '.mats[data-mats="' + id + '"]' : ".mats[data-mats]"), fill);
    if (openFor && sheetOpen()) drawItems();
  }
  function afterToday() {
    refresh();
    prefetchDay();
  }

  /* tap a chip, tap "Materials", drop a file on a card */
  document.addEventListener("click", function (ev) {
    var t = ev.target && ev.target.closest ? ev.target.closest("[data-mat-open],[data-mat-add]") : null;
    if (!t) return;
    ev.preventDefault();
    if (t.hasAttribute("data-mat-add")) openSheetFor(t.getAttribute("data-mat-add"));
    else openItem(t.getAttribute("data-mat-open"));
  });
  document.addEventListener("dragover", function (ev) {
    var card = dropCard(ev); if (!card) return;
    ev.preventDefault(); card.classList.add("matdrop");
  });
  document.addEventListener("dragleave", function (ev) {
    var card = dropCard(ev); if (card && !card.contains(ev.relatedTarget)) card.classList.remove("matdrop");
  });
  document.addEventListener("drop", function (ev) {
    var card = dropCard(ev); if (!card) return;
    ev.preventDefault(); card.classList.remove("matdrop");
    var files = ev.dataTransfer && ev.dataTransfer.files ? [].slice.call(ev.dataTransfer.files) : [];
    var id = card.querySelector(".mats[data-mats]").getAttribute("data-mats");
    if (files.length) addFiles(id, files, "lesson");
  });
  function dropCard(ev) {
    if (display()) return null;
    var dt = ev.dataTransfer; if (!dt || [].indexOf.call(dt.types || [], "Files") < 0) return null;
    var card = ev.target && ev.target.closest ? ev.target.closest(".sub") : null;
    return card && card.querySelector(".mats[data-mats]") ? card : null;
  }

  /* ---------- the sheet ---------- */
  var openFor = null, scopePick = "lesson", note = "";
  function sheetOpen() { var d = document.querySelector("dialog.sheet .matsheet"); return !!d; }
  function openSheetFor(id) {
    openFor = id; scopePick = "lesson"; note = "";
    openSheet('<div class="matsheet"></div>', function () { drawSheet(); });
  }
  function whereItGoes() {
    if (display()) return "This computer only displays: it opens materials and adds none. Add them on the Mac or your phone.";
    if (live()) return "Kept in your Firebase project with the planner: your other devices have it within a few seconds.";
    return "Kept on this device only. Turn on Planner sync (Sync \u203a Planner sync) to have materials on your other computers.";
  }
  function drawSheet() {
    var host = document.querySelector("dialog.sheet .matsheet");
    if (!host) return;
    var c = cardScopes(openFor);
    if (!c) { closeSheet(); return; }
    var h = "<h2>" + e$(c.where) + " \u00b7 files & links</h2>" +
      '<p class="hint">' + e$(whereItGoes()) + "</p>" + '<div class="matitems"></div>';
    if (!display()) {
      h += (c.scopes.length > 1 ? '<fieldset class="matscope"><legend>Add to</legend>' + c.scopes.map(function (s) {
          return '<label><input type="radio" name="matscope" value="' + s.scope + '"' + (s.scope === scopePick ? " checked" : "") + "> " + e$(s.label) + "</label>";
        }).join("") + "</fieldset>" : "") +
        '<div class="matdropzone" data-mat-zone tabindex="0">Drop files here or paste them (\u2318V / Ctrl+V)' +
        '<button type="button" class="ghost" data-mat-choose>Choose files</button>' +
        '<input type="file" multiple hidden data-mat-file></div>' +
        '<label class="matfld">A link or a note<textarea id="matnote" rows="3" placeholder="https://\u2026 or anything to remember for this lesson">' + e$(note) + "</textarea></label>" +
        '<p class="matmsg" role="status"></p>';
    }
    h += '<div class="sheetbar">' + (display() ? "" : '<button class="primary" data-mat-addtext>Add link or note</button>') +
      '<button class="ghost" data-sheet-cancel>Done</button></div>';
    host.innerHTML = h;
    drawItems();
    wireSheet(host);
  }
  /* the list alone, so progress and other devices' changes never take the
     cursor out of the note being typed */
  function drawItems() {
    var box = document.querySelector("dialog.sheet .matsheet .matitems");
    if (!box) return;
    var c = cardScopes(openFor);
    if (!c) return;
    var items = itemsFor(c.scopes), h = "";
    if (items.length) {
      h += '<ul class="matlist">' + items.map(function (m) {
        var meta = [kindTag(m), m.size ? size(m.size) : "", m.scope !== "lesson" && m.scope !== "day" ? (c.scopes.filter(function (s) { return s.key === m.key; })[0] || {}).label : "",
          when(m.at) ? "added " + when(m.at) + (m.from ? " on " + m.from : "") : "", busy[m.id] || (m.pending ? "not sent yet" : "")].filter(Boolean).join(" \u00b7 ");
        return '<li><button type="button" class="matopen" data-mat-open="' + e$(m.id) + '">' + e$(title(m)) + "</button>" +
          '<span class="matmeta">' + e$(meta) + "</span>" +
          (display() ? "" : '<button type="button" class="matdel" data-mat-del="' + e$(m.id) + '" aria-label="Remove ' + e$(title(m)) + '">Remove</button>') +
          "</li>";
      }).join("") + "</ul>";
    } else h += '<p class="matnone">Nothing here yet.</p>';
    box.innerHTML = h;
    [].forEach.call(box.querySelectorAll("[data-mat-del]"), function (b) { b.onclick = function () { removeItem(b.getAttribute("data-mat-del")); }; });
  }
  function wireSheet(host) {
    var dlg = host.closest("dialog");
    var cancel = host.querySelector("[data-sheet-cancel]"); if (cancel) cancel.onclick = function () { openFor = null; closeSheet(); };
    [].forEach.call(host.querySelectorAll("input[name=matscope]"), function (r) { r.onchange = function () { scopePick = r.value; }; });
    var fileIn = host.querySelector("[data-mat-file]"), choose = host.querySelector("[data-mat-choose]");
    if (choose) choose.onclick = function () { fileIn.click(); };
    if (fileIn) fileIn.onchange = function () { addFiles(openFor, [].slice.call(fileIn.files || []), scopePick); fileIn.value = ""; };
    var zone = host.querySelector("[data-mat-zone]");
    if (zone) {
      zone.ondragover = function (ev) { ev.preventDefault(); zone.classList.add("over"); };
      zone.ondragleave = function () { zone.classList.remove("over"); };
      zone.ondrop = function (ev) { ev.preventDefault(); ev.stopPropagation(); zone.classList.remove("over");
        addFiles(openFor, [].slice.call((ev.dataTransfer && ev.dataTransfer.files) || []), scopePick); };
    }
    var addT = host.querySelector("[data-mat-addtext]");
    if (addT) addT.onclick = function () { addText(openFor, host.querySelector("#matnote").value, scopePick); };
    if (dlg && !dlg.__matPaste) {
      dlg.__matPaste = true;
      dlg.addEventListener("paste", function (ev) {
        var files = ev.clipboardData && ev.clipboardData.files ? [].slice.call(ev.clipboardData.files) : [];
        if (files.length && openFor && !display()) { ev.preventDefault(); addFiles(openFor, files, scopePick); }
      });
    }
  }
  function say(text) { var m = document.querySelector("dialog.sheet .matmsg"); if (m) m.textContent = text || ""; }

  /* ---------- the name check, before anything leaves this device ---------- */
  function nameCheck(texts) {
    if (!live()) return { ok: true };
    var p = PS();
    if (!p || !p.names) return { ok: true };
    var r = p.names(texts.join("\n"));
    if (!r.roster) return { ok: false, why: "There is no class list on this device to check names against, so nothing was sent. Open the gradebook here once, then try again." };
    return r.hits.length ? { ok: false, hit: true, why: "That has a word that matches a child\u2019s name." } : { ok: true };
  }
  function confirmName(check, go) {
    if (check.ok) return go();
    if (!check.hit) { say(check.why); return; }
    if (window.confirm(check.why + " Curriculum resources should name no child.\n\nAdd it anyway? (Choose OK only if it is not a child.)")) go();
    else say("Not added.");
  }

  /* ---------- adding ---------- */
  function scopeKey(id, scope) {
    var c = cardScopes(id); if (!c) return null;
    return c.scopes.filter(function (s) { return s.scope === scope; })[0] || c.scopes[0];
  }
  function addText(id, text, scope) {
    text = String(text || "").trim();
    if (!text) { say("Paste a link or type a note first."); return; }
    var s = scopeKey(id, scope); if (!s) return;
    var isUrl = /^https?:\/\/\S+$/i.test(text);
    var m = isUrl ? { kind: "link", url: text, name: hostOf(text) } : { kind: "note", text: text.slice(0, 20000) };
    confirmName(nameCheck([text]), function () {
      m.id = uid(); m.key = s.key; m.scope = s.scope; m.at = new Date().toISOString();
      m.from = deviceName();
      note = ""; var box = document.getElementById("matnote"); if (box) box.value = "";
      store(m, null);
    });
  }
  function addFiles(id, files, scope) {
    if (!files.length) return;
    var s = scopeKey(id, scope); if (!s) return;
    var big = files.filter(function (f) { return f.size > MAX_BYTES; });
    files = files.filter(function (f) { return f.size <= MAX_BYTES; });
    if (big.length) say(big.map(function (f) { return f.name; }).join(", ") + (big.length > 1 ? " are" : " is") + " over 20 MB, so not added. A link to it works instead.");
    if (!files.length) return;
    confirmName(nameCheck(files.map(function (f) { return f.name; })), function () {
      files.forEach(function (f) {
        var name = f.name && !/^image\.(png|jpe?g)$/i.test(f.name) ? f.name : "Pasted image " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + (/png/.test(f.type) ? ".png" : ".jpg");
        readBytes(f).then(function (bytes) {
          var m = { id: uid(), key: s.key, scope: s.scope, kind: "file", name: name, type: f.type || "application/octet-stream",
            size: bytes.length, at: new Date().toISOString(), from: deviceName() };
          return kset("blob:" + m.id, { bytes: bytes, type: m.type }).then(function () {
            ready[m.id] = makeFile(bytes, m);
            store(m, bytes);
          });
        }, function () { say("Couldn\u2019t read " + f.name + "."); });
      });
    });
  }
  function readBytes(f) {
    if (f.arrayBuffer) return f.arrayBuffer().then(function (b) { return new Uint8Array(b); });
    return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(new Uint8Array(r.result)); }; r.onerror = rej; r.readAsArrayBuffer(f); });
  }
  function deviceName() { try { return (window.SuiteSync && window.SuiteSync.device) || ""; } catch (e) { return ""; } }

  /* on this device first, so it shows at once; then to the store */
  function store(m, bytes) {
    m.pending = live();
    local[m.id] = m;
    saveLocal(); refresh();
    if (live()) send(m.id, bytes);
  }
  function send(id, bytes) {
    var m = local[id], p = PS();
    if (!m || !p || !live() || display() || busy[id] === "sending") return Promise.resolve();
    busy[id] = "sending"; refresh();
    var bytesP = m.kind !== "file" ? Promise.resolve(null)
      : bytes ? Promise.resolve(bytes) : kget("blob:" + id).then(function (b) { return b && b.bytes; });
    return bytesP.then(function (b) {
      if (m.kind === "file" && !b) throw new Error("This file\u2019s bytes are not on this device any more.");
      return m.kind === "file" ? p.materials.putFile(id, b, function (i, n) { if (n > 1) { busy[id] = "sending " + i + "/" + n; refresh(); } }) : 0;
    }).then(function (chunks) {
      var rec = {}; Object.keys(m).forEach(function (k) { if (k !== "pending") rec[k] = m[k]; });
      if (m.kind === "file") rec.chunks = chunks;
      return p.materials.change(function (idx) { idx.items[id] = rec; }).then(function (idx) {
        remote = idx.items; kset("index", remote);
        delete local[id]; delete busy[id]; saveLocal(); refresh(); say("");
      });
    }).then(null, function (e) {
      delete busy[id]; refresh();
      say("Not sent yet (" + ((e && e.message) || "no connection") + "). It stays on this device and goes when Firebase can be reached.");
    });
  }
  /* anything on this device only, once there is somewhere to send it: added
     while offline, or before Planner sync was turned on */
  function sendPending() { if (live() && !display()) Object.keys(local).forEach(function (id) { send(id); }); }

  /* ---------- removing ---------- */
  function removeItem(id) {
    var m = all()[id]; if (!m) return;
    var c = cardScopes(openFor);
    var wide = m.scope === "unit" || m.scope === "week" ? " It is on " + ((c && c.scopes.filter(function (s) { return s.key === m.key; })[0]) || { label: "more than this lesson" }).label.toLowerCase() + "." : "";
    if (!window.confirm("Remove \u201c" + title(m) + "\u201d" + (local[id] && !m.pending ? "" : " from every device") + "?" + wide)) return;
    delete ready[id];
    if (local[id]) { delete local[id]; saveLocal(); kdel("blob:" + id); refresh(); if (!remote[id]) return; }
    var p = PS();
    if (!p || !live()) return;
    busy[id] = "removing"; refresh();
    p.materials.change(function (idx) { delete idx.items[id]; }).then(function (idx) {
      remote = idx.items; kset("index", remote); delete busy[id]; kdel("blob:" + id); refresh();
      if (m.chunks) p.materials.dropFile(id, m.chunks);
    }, function (e) { delete busy[id]; refresh(); say("Couldn\u2019t remove it (" + ((e && e.message) || "no connection") + "). Try again in a moment."); });
  }

  /* ---------- opening ---------- */
  function makeFile(bytes, m) {
    try { return new File([bytes], m.name || "file", { type: m.type || "application/octet-stream" }); }
    catch (e) { var b = new Blob([bytes], { type: m.type || "application/octet-stream" }); b.name = m.name; return b; }
  }
  function bytesOf(m) {
    if (ready[m.id]) return Promise.resolve(ready[m.id]);
    return kget("blob:" + m.id).then(function (b) {
      if (b && b.bytes) return (ready[m.id] = makeFile(b.bytes, m));
      var p = PS();
      if (!p || !live() || !m.chunks) throw new Error(live() ? "not in Firebase yet" : "on another device; turn on Planner sync here to open it");
      busy[m.id] = "getting"; refresh();
      return p.materials.getFile(m.id, m.chunks).then(function (bytes) {
        delete busy[m.id]; refresh();
        kset("blob:" + m.id, { bytes: bytes, type: m.type });
        return (ready[m.id] = makeFile(bytes, m));
      }, function (e) { delete busy[m.id]; refresh(); throw e; });
    });
  }
  function iosApp() {
    var ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    return ios && (navigator.standalone === true || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches));
  }
  function viewable(m) { return /pdf|^image\/|^text\/|^video\/|^audio\//.test(m.type || "") || /\.pdf$/i.test(m.name || ""); }
  function openItem(id) {
    var m = all()[id]; if (!m) return;
    if (m.kind === "link") { window.open(m.url, "_blank", "noopener"); return; }
    if (m.kind === "note") { showNote(m); return; }
    /* a file already in memory opens inside this tap; one still to fetch on
       iOS's home-screen app needs a second tap, which the chip asks for */
    if (ready[id]) { show(ready[id], m, null); return; }
    if (iosApp()) { bytesOf(m).then(function () { busy[id] = "ready \u00b7 tap"; refresh(); setTimeout(function () { if (busy[id] === "ready \u00b7 tap") { delete busy[id]; refresh(); } }, 8000); }, fail); return; }
    var win = viewable(m) ? window.open("", "_blank") : null;
    if (win) try { win.document.title = m.name; win.document.body.textContent = "Getting " + m.name + "\u2026"; } catch (e) { }
    bytesOf(m).then(function (f) { show(f, m, win); }, function (e) { if (win) win.close(); fail(e); });
  }
  function fail(e) { var msg = "Couldn\u2019t open it: " + ((e && e.message) || "no connection") + "."; if (sheetOpen()) say(msg); else window.alert(msg); }
  function show(file, m, win) {
    if (busy[m.id] === "ready \u00b7 tap") { delete busy[m.id]; refresh(); }
    if (iosApp() && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: m.name }).then(null, function () { });
      return;
    }
    var url = URL.createObjectURL(file);
    setTimeout(function () { URL.revokeObjectURL(url); }, 120000);
    if (viewable(m)) {
      if (win) { win.location.href = url; return; }
      if (window.open(url, "_blank")) return;
    }
    var a = document.createElement("a"); a.href = url; a.download = m.name || "file";
    document.body.appendChild(a); a.click(); a.remove();
  }
  function showNote(m) {
    var back = openFor;
    openSheet('<h2>' + e$(title(m)) + '</h2><div class="matnotebody">' + e$(m.text) + '</div>' +
      '<div class="sheetbar"><button class="primary" data-mat-copy>Copy</button><button class="ghost" data-sheet-cancel>' + (back ? "Back" : "Close") + "</button></div>",
      function (el) {
        el.querySelector("[data-mat-copy]").onclick = function () {
          try { navigator.clipboard.writeText(m.text).then(function () { el.querySelector("[data-mat-copy]").textContent = "Copied"; }); } catch (e) { }
        };
        el.querySelector("[data-sheet-cancel]").onclick = function () { closeSheet(); if (back) openSheetFor(back); };
      });
  }

  /* the day's files, fetched ahead so they open at once (the projector) */
  function prefetchDay() {
    if (typeof main === "undefined" || !main) return;
    [].forEach.call(main.querySelectorAll(".sub:not(.skip) .mats[data-mats]"), function (el) {
      var c = cardScopes(el.getAttribute("data-mats")); if (!c) return;
      itemsFor(c.scopes).forEach(function (m) {
        if (m.kind === "file" && !ready[m.id] && !busy[m.id]) bytesOf(m).then(null, function () { });
      });
    });
  }

  /* ---------- from the store ---------- */
  function heard(idx) {
    remote = (idx && idx.items && typeof idx.items === "object") ? idx.items : {};
    kset("index", remote);
    /* gone from the store: its bytes go from this device too */
    Object.keys(ready).forEach(function (id) { if (!remote[id] && !local[id]) delete ready[id]; });
    kget("known").then(function (known) {
      (known || []).forEach(function (id) { if (!remote[id] && !local[id]) kdel("blob:" + id); });
      kset("known", Object.keys(remote).concat(Object.keys(local)));
    });
    refresh(); prefetchDay();
  }
  function connect() {
    if (unlisten) { unlisten(); unlisten = null; }
    if (!live()) return;
    unlisten = PS().materials.listen(heard);
    sendPending();
  }
  function boot() {
    Promise.all([kget("index"), kget("local")]).then(function (r) {
      remote = r[0] && typeof r[0] === "object" ? r[0] : {};
      local = r[1] && typeof r[1] === "object" ? r[1] : {};
      loaded = true;
      refresh(); prefetchDay();
      connect();
      var p = PS();
      if (p && p.onState) { var was = live(); p.onState(function () { if (live() !== was) { was = live(); connect(); } }); }
    });
  }
  window.addEventListener("online", sendPending);
  if (document.readyState === "complete") setTimeout(boot, 0);
  else window.addEventListener("load", function () { setTimeout(boot, 0); });

  window.PlannerMaterials = {
    afterToday: afterToday,
    refresh: refresh,
    /* for tests and the console */
    scopesFor: scopesFor,
    get items() { return all(); },
    get loaded() { return loaded; },
    addText: addText,
    addFiles: addFiles,
    open: openItem,
    bytes: function (id) { var m = all()[id]; return m ? bytesOf(m) : Promise.reject(new Error("no such item")); },
    remove: removeItem,
    reconnect: connect
  };
})();

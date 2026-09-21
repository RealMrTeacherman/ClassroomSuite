/* One-time data fixes, run before the planner boots so it reads the new shape.
   Each is flagged so it happens once and never again. */
(function () {
  var S_KEY = "lp:settings:v2", D_KEY = "lp:days:v2", FLAG = "suite:migrations";

  function done() {
    try { return JSON.parse(localStorage.getItem(FLAG) || "{}"); } catch (e) { return {}; }
  }
  function mark(name) {
    var d = done(); d[name] = new Date().toISOString();
    try { localStorage.setItem(FLAG, JSON.stringify(d)); } catch (e) { }
  }

  /* Reading a position back as text.
     Matches the planner's own fmt() wording, so a day that used to show
     "U2 · W1 · D3" still says exactly that once the block is free text. */
  function posToText(schema, p) {
    if (!p) return "";
    if (p.text != null) return String(p.text);
    if (schema === "uwd" && p.unit != null) {
      return "U" + p.unit + " \u00b7 W" + (p.week || 1) + " \u00b7 D" + (p.day || 1);
    }
    if (schema === "ul" && p.unit != null) return "U" + p.unit + " \u00b7 L" + (p.lesson || 1);
    if (p.lesson != null) return "L" + p.lesson;
    return "";
  }

  /* Turn one subject's stepper into an open field, keeping whatever has
     already been recorded as the text it used to display.

     This one is NOT flagged, and that is deliberate. Flagged migrations run
     once and trust that they worked; this one had two ways to be wrongly
     marked done — an older build marked the Science pass complete in cases
     where it had converted nothing, and a service worker serving a cached
     copy of this file meant the Writing pass never ran at all while the flag
     machinery happily believed otherwise. Checking the actual state on every
     load costs nothing and cannot silently no-op.

     Re-running is safe because the planner has no schema selector: there is
     no way to set a block back to a stepper from the interface, so this is
     never fighting a deliberate choice. If one is ever wanted back, add the
     id to suite:migrations as "open-text-optout": ["writing"] and this
     leaves it alone.

     The first version handled only `ul`, so a `uwd` subject had its unit,
     week and day replaced with an empty string. posToText covers all three. */
  function optedOut(id) {
    var d = done()["open-text-optout"];
    return Array.isArray(d) && d.indexOf(id) >= 0;
  }
  function toFreeText(id) {
    if (optedOut(id)) return;
    try {
      var raw = localStorage.getItem(S_KEY);
      if (!raw) return;                       /* planner has not saved yet; try again next boot */
      var st = JSON.parse(raw);
      if (!Array.isArray(st.subjects)) return;
      var sb = null;
      st.subjects.forEach(function (x) { if (x && x.id === id) sb = x; });
      if (!sb || sb.schema === "free") return;   /* already an open field, or he removed it */

      var was = sb.schema;
      sb.schema = "free";
      sb.start = { text: "" };
      localStorage.setItem(S_KEY, JSON.stringify(st));

      var days = JSON.parse(localStorage.getItem(D_KEY) || "{}");
      var changed = false;
      Object.keys(days).forEach(function (k) {
        var e = days[k] && days[k].entries && days[k].entries[id];
        if (!e || !e.pos || e.pos.text != null) return;
        e.pos = { text: posToText(was, e.pos) };
        changed = true;
      });
      if (changed) localStorage.setItem(D_KEY, JSON.stringify(days));
    } catch (e) { return; }
  }

  /* Health and SEL is real classroom time and he plans it, so it needs its own
     editable block. A block in the planner is a subject in `lp:settings:v2`,
     which is data — so this is a migration rather than a change to his file.

     Free-text schema, like Science/SS and WIN: Health and SEL does not march
     through numbered units, and a wrong guess at a unit scheme would make the
     block annoying rather than useful.

     Flagged, so if he deletes the block later it stays deleted. If settings
     have not been written yet this returns without marking, and picks it up on
     a later load once the planner has saved them — the same shape as the
     migration above. */
  function addHealthSel() {
    if (done()["health-sel-subject"]) return;
    try {
      var raw = localStorage.getItem(S_KEY);
      if (!raw) return;                       /* planner has not saved yet; try again next boot */
      var st = JSON.parse(raw);
      if (!Array.isArray(st.subjects)) return;
      if (st.subjects.some(function (x) { return x.id === "health"; })) { mark("health-sel-subject"); return; }

      var block = {
        id: "health", name: "Health / SEL", curriculum: "",
        schema: "free", color: "#6E5A9B", start: { text: "" }, on: true
      };
      /* sits with Science/SS rather than at the end, since it is the same
         kind of block and they read together */
      var at = -1;
      st.subjects.forEach(function (x, i) { if (x.id === "science") at = i; });
      if (at >= 0) st.subjects.splice(at + 1, 0, block);
      else st.subjects.push(block);

      localStorage.setItem(S_KEY, JSON.stringify(st));
    } catch (e) { return; }
    mark("health-sel-subject");
  }

  /* Science and Social Studies covers too much variety to be "Lesson 4", and
     Writing runs on its own rhythm rather than the curriculum's unit, week
     and day. Both are open fields he types into. */
  toFreeText("science");
  toFreeText("writing");
  addHealthSel();
})();

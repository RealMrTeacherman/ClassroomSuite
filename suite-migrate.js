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

  /* Science and Social Studies covers too much variety to be "Lesson 4", so it
     moves to the planner's free-text schema. Anything already recorded keeps
     its wording rather than being thrown away. */
  function scienceToFreeText() {
    if (done()["science-free-text"]) return;
    var changed = false;
    try {
      var raw = localStorage.getItem(S_KEY);
      if (!raw) return;                       /* nothing saved yet; the default already says free */
      var st = JSON.parse(raw);
      var sci = (st.subjects || []).find(function (x) { return x.id === "science"; });
      if (sci && sci.schema !== "free") {
        sci.schema = "free";
        sci.start = { text: "" };
        localStorage.setItem(S_KEY, JSON.stringify(st));
        changed = true;
      }
      var days = JSON.parse(localStorage.getItem(D_KEY) || "{}");
      Object.keys(days).forEach(function (k) {
        var e = days[k] && days[k].entries && days[k].entries.science;
        if (!e || !e.pos) return;
        if (e.pos.text != null) return;
        e.pos = { text: e.pos.lesson ? "Lesson " + e.pos.lesson : "" };
        changed = true;
      });
      if (changed) localStorage.setItem(D_KEY, JSON.stringify(days));
    } catch (e) { return; }
    mark("science-free-text");
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

  scienceToFreeText();
  addHealthSel();
})();

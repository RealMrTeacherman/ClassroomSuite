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

  scienceToFreeText();
})();

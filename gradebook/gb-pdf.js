/* gradebook/gb-pdf.js — Download PDF: sheets drawn as PDF in the browser, for the iPhone home-screen app.
   One of the gradebook's scripts, loaded in order by index.html as classic
   scripts sharing one global scope; see HANDOFF "The gradebook's files". */
/* ============================================================
   DOWNLOAD PDF IN THE IPHONE HOME-SCREEN APP
   On an iPhone or iPad the suite runs from its home-screen icon as its
   own app, and there window.print() does nothing at all: no dialog, no
   error. So there the button builds the PDF itself, from the same sheet
   the print dialog shows (orfSheetHTML), and hands the file to the share
   sheet (Save to Files, AirDrop, Mail). Everywhere else it is still the
   print dialog. A small writer for one kind of page, no library: the
   standard PDF fonts (Helvetica, its bold, ZapfDingbats for the status
   marks), so nothing is embedded and the file is a few KB.
   ============================================================ */
function pdfIsIosApp() {
  const n = window.navigator || {};
  const ios = /iPhone|iPad|iPod/.test(n.userAgent || "") || (n.platform === "MacIntel" && n.maxTouchPoints > 1);
  const app = n.standalone === true || !!(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
  return ios && app;
}
/* every print button: in the iPhone home-screen app the print screen never
   opens, so say so instead of doing nothing */
function suitePrint() {
  if (pdfIsIosApp()) { toast("The iPhone home-screen app can\u2019t open the print screen. Open the gradebook in Safari, or on your Mac, to print this."); return false; }
  window.print();
  return true;
}
/* Adobe's widths for Helvetica and Helvetica-Bold, WinAnsi 32-255, per 1000 */
const PDF_WIDTHS = { H: [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,350,556,350,222,556,333,1000,556,556,333,1000,667,333,1000,350,611,350,350,222,222,333,333,350,556,1000,333,1000,500,333,944,350,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500], B: [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,350,556,350,278,556,500,1000,556,556,333,1000,667,333,1000,350,611,350,350,278,278,500,500,350,556,1000,333,1000,556,333,944,350,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556] };
const PDF_WIN = { "\u20AC": 128, "\u201A": 130, "\u0192": 131, "\u201E": 132, "\u2026": 133, "\u2020": 134, "\u2021": 135, "\u02C6": 136, "\u2030": 137, "\u0160": 138, "\u2039": 139, "\u0152": 140,
  "\u017D": 142, "\u2018": 145, "\u2019": 146, "\u201C": 147, "\u201D": 148, "\u2022": 149, "\u2013": 150, "\u2014": 151, "\u02DC": 152, "\u2122": 153, "\u0161": 154, "\u203A": 155, "\u0153": 156, "\u017E": 158, "\u0178": 159, "\u2212": 45, "\u00A0": 32 };
/* the status marks, drawn in ZapfDingbats: check, ballot x, triangles, circle */
const PDF_DINGBATS = { "\u2713": "3", "\u2717": "7", "\u25B2": "s", "\u25BC": "t", "\u25CB": "m" };
function pdfCode(ch) {
  const c = ch.charCodeAt(0);
  if (PDF_WIN[ch] != null) return PDF_WIN[ch];
  return (c >= 32 && c <= 126) || (c >= 160 && c <= 255) ? c : 63;
}
/* a line of text as runs, each in one font: H, B (bold) or Z (dingbats) */
function pdfRuns(text, bold) {
  const runs = [];
  for (const ch of String(text).replace(/\u2691/g, "!")) {
    const z = PDF_DINGBATS[ch], f = z ? "Z" : bold ? "B" : "H", code = z ? z.charCodeAt(0) : pdfCode(ch);
    const last = runs[runs.length - 1];
    if (last && last.f === f) last.codes.push(code); else runs.push({ f: f, codes: [code] });
  }
  return runs;
}
function pdfWidth(runs, size) {
  let w = 0;
  runs.forEach(r => r.codes.forEach(c => { w += r.f === "Z" ? 790 : PDF_WIDTHS[r.f][c - 32] || 556; }));
  return w * size / 1000;
}
function pdfStr(codes) {
  return "(" + codes.map(c => c === 40 || c === 41 || c === 92 ? "\\" + String.fromCharCode(c) : c < 32 || c > 126 ? "\\" + c.toString(8).padStart(3, "0") : String.fromCharCode(c)).join("") + ")";
}
function pdfText(x, y, runs, size) {
  let s = "BT " + x.toFixed(1) + " " + y.toFixed(1) + " Td ";
  runs.forEach(r => { s += "/F" + r.f + " " + size + " Tf " + pdfStr(r.codes) + " Tj "; });
  return s + "ET\n";
}
/* words onto lines no wider than w */
function pdfWrap(text, bold, size, w) {
  const out = []; let cur = "";
  String(text).split(/\s+/).forEach(word => {
    const t = cur ? cur + " " + word : word;
    if (cur && pdfWidth(pdfRuns(t, bold), size) > w) { out.push(cur); cur = word; } else cur = t;
  });
  if (cur) out.push(cur);
  return out;
}
/* a sheet cell as lines: what is outside a <span> first, then each <span> */
function pdfCellLines(cell) {
  const head = cell.tagName === "TH", lines = [];
  let first = "", firstBold = head, any = false;
  cell.childNodes.forEach(n => {
    if (n.nodeType === 1 && n.tagName === "SPAN") return;
    const t = n.textContent; if (!t.trim()) return;
    first += t; any = true;
    if (n.nodeType === 1 && n.tagName === "B") firstBold = true;
  });
  if (any) lines.push({ t: first.trim(), b: firstBold });
  cell.querySelectorAll(":scope > span").forEach(sp => lines.push({ t: sp.textContent.trim(), b: !!sp.querySelector("b") }));
  return lines;
}
/* the sheet (orfSheetHTML) as a PDF: landscape Letter, the title on the
   first page, the header row on every page, Page n of N, the key last */
function orfPdfBytes(html) {
  const box = document.createElement("div");
  box.innerHTML = html;
  const PW = 792, PH = 612, M = 34, W = PW - 2 * M;
  const title = (box.querySelector("h2") || {}).textContent || "Reading progress";
  const sub = (box.querySelector(".cf-sub") || {}).textContent || "";
  const meta = box.querySelector(".cf-meta") ? box.querySelector(".cf-meta").innerHTML.split(/<br\s*\/?>/i).map(x => { const d = document.createElement("div"); d.innerHTML = x; return d.textContent.trim(); }) : [];
  const key = (box.querySelector(".os-key") || {}).textContent || "";
  const tr = [...box.querySelectorAll("table.os-table tr")];
  const rows = tr.map(r => [...r.children].map(c => ({ lines: pdfCellLines(c), span: c.colSpan || 1, left: c.classList.contains("os-l"), shade: c.classList.contains("os-k") })));
  const headRow = rows[0], body = rows.slice(1), ncol = headRow.length;
  /* columns as wide as their widest line; shrink the type to fit the page */
  let size = 8, cw;
  const natural = sz => {
    const w = new Array(ncol).fill(0);
    rows.forEach(r => { let i = 0; r.forEach(c => { if (c.span === 1) c.lines.forEach(l => { w[i] = Math.max(w[i], pdfWidth(pdfRuns(l.t, l.b), sz) + 8); }); i += c.span; }); });
    return w;
  };
  for (; size >= 6; size -= 0.5) { cw = natural(size); if (cw.reduce((a, b) => a + b, 0) <= W) break; }
  const spare = W - cw.reduce((a, b) => a + b, 0);
  if (spare > 0) cw = cw.map(x => x + spare / ncol);
  const LH = size + 2.2, rowH = r => Math.max(...r.map(c => c.lines.length)) * LH + 6;
  const pages = []; let ops = "", y = 0;
  const startPage = firstPage => {
    if (ops) pages.push(ops);
    ops = ""; y = PH - M;
    if (firstPage) {
      ops += pdfText(M, y - 16, pdfRuns(title, true), 16); y -= 22;
      ops += pdfText(M, y - 9, pdfRuns(sub, false), 9);
      meta.forEach((m, i) => { const r = pdfRuns(m, false); ops += pdfText(PW - M - pdfWidth(r, 8.5), PH - M - 10 - i * 11, r, 8.5); });
      y -= 16;
      ops += "0 G 1.2 w " + M + " " + y.toFixed(1) + " m " + (PW - M) + " " + y.toFixed(1) + " l S\n"; y -= 8;
    }
    drawRow(headRow, true);
  };
  const drawRow = (r, head) => {
    const h = rowH(r); let x = M, i = 0;
    r.forEach(c => {
      let w = 0; for (let k = 0; k < c.span; k++) w += cw[i + k];
      if (c.shade) ops += "0.93 g " + x.toFixed(1) + " " + (y - h).toFixed(1) + " " + w.toFixed(1) + " " + h.toFixed(1) + " re f 0 g\n";
      const lines = head ? c.lines : c.lines, base = head ? y - h + 4 + (lines.length - 1) * LH : y - 3 - size;
      lines.forEach((l, k) => {
        const runs = pdfRuns(l.t, l.b), lw = pdfWidth(runs, size), ly = head ? y - h + 4 + (lines.length - 1 - k) * LH : y - 3 - size - k * LH;
        ops += pdfText(c.left ? x + 4 : x + w - 4 - lw, ly, runs, size);
      });
      x += w; i += c.span;
    });
    y -= h;
    ops += (head ? "0 G 1 w " : "0.55 G 0.5 w ") + M + " " + y.toFixed(1) + " m " + (PW - M) + " " + y.toFixed(1) + " l S\n";
  };
  startPage(true);
  body.forEach(r => { if (y - rowH(r) < M + 18) startPage(false); drawRow(r, false); });
  const keyLines = pdfWrap(key, false, 7.5, W);
  if (y - 10 - keyLines.length * 9.5 < M + 18) startPage(false);
  y -= 12;
  keyLines.forEach(l => { ops += pdfText(M, y, pdfRuns(l, false), 7.5); y -= 9.5; });
  pages.push(ops);
  /* the file: catalog, page tree, three standard fonts, then each page */
  const objs = [], n = pages.length;
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[2] = "<< /Type /Pages /Count " + n + " /Kids [" + pages.map((_, i) => (6 + 2 * i) + " 0 R").join(" ") + "] >>";
  objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  objs[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /ZapfDingbats >>";
  pages.forEach((p, i) => {
    const foot = pdfRuns("Page " + (i + 1) + " of " + n, false);
    const content = p + pdfText(PW - M - pdfWidth(foot, 7.5), M - 14, foot, 7.5);
    objs[6 + 2 * i] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + PW + " " + PH + "] /Resources << /Font << /FH 3 0 R /FB 4 0 R /FZ 5 0 R >> >> /Contents " + (7 + 2 * i) + " 0 R >>";
    objs[7 + 2 * i] = "<< /Length " + content.length + " >>\nstream\n" + content + "endstream";
  });
  let out = "%PDF-1.4\n", xref = [];
  for (let i = 1; i < objs.length; i++) { xref[i] = out.length; out += i + " 0 obj\n" + objs[i] + "\nendobj\n"; }
  const at = out.length;
  out += "xref\n0 " + objs.length + "\n0000000000 65535 f \n" + xref.slice(1).map(o => String(o).padStart(10, "0") + " 00000 n \n").join("") +
    "trailer\n<< /Size " + objs.length + " /Root 1 0 R /Info << /Title " + pdfStr(pdfRuns(title, false)[0].codes) + " /Producer (Classroom suite) >> >>\nstartxref\n" + at + "\n%%EOF\n";
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
  return bytes;
}
/* the file to the share sheet (Save to Files, AirDrop, Mail); where files
   cannot be shared, a plain download */
async function orfSharePdf() {
  const html = orfSheetHTML();
  if (!html) { toast("No ORF checks to save yet"); return; }
  const name = "reading-progress-" + todayISO() + ".pdf";
  const file = new File([orfPdfBytes(html)], name, { type: "application/pdf" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "Reading progress" }); return; }
  } catch (e) { if (e && e.name === "AbortError") return; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
function printOrfSheet() {
  if (pdfIsIosApp()) { orfSharePdf(); return; }   /* no print screen there */
  const h = orfSheetHTML();
  if (!h) { toast("No ORF checks to print yet"); return; }
  document.getElementById("printsheet").innerHTML = h;
  const t = document.getElementById("toast");
  if (t) { clearTimeout(toastT); t.classList.remove("show"); t.style.display = "none"; }
  suitePrint();
  if (t) t.style.display = "";
}
function orfAnalysisHTML(db) {
  if (!db || !orfGoalsReady()) return "";
  const G = window.SuiteOrf.goals, gs = orfGoalsForPlans(), comp = orfCompState(), now = UI.orfToday ? new Date(UI.orfToday) : new Date();
  const people = orfPeople(db);
  const rows = people.map(p => ({ p: p, pl: G.planFor(db, p.o.id, gs, now, comp) }));
  let h = "";

  /* ---- the class, one row each; a row opens to the child ---- */
  h += orfScorecardHTML(rows, now, gs);

  /* ---- how goals are set ---- */
  h += '<details style="margin-top:12px"><summary class="small">How goals are set</summary><div class="row" style="margin-top:8px">' +
    '<label class="fld">Method<select onchange="orfSetting(\'method\',this.value)">' +
    [["table", "Last year\u2019s table"], ["realistic", "1.5 words a week"], ["ambitious", "2 words a week"]].map(m => '<option value="' + m[0] + '"' + (gs.method === m[0] ? " selected" : "") + ">" + m[1] + "</option>").join("") + "</select></label>" +
    '<label class="fld">Grade-level line<input type="number" min="1" max="300" value="' + (gs.expectation || "") + '" placeholder="' + window.SuiteOrf.HT[gs.grade][50][2] + '" onchange="orfSetting(\'expectation\',this.value)"></label>' +
    '<label class="fld">Margin of error<input type="number" min="0" max="30" value="' + gs.margin + '" onchange="orfSetting(\'margin\',this.value)"></label>' +
    '<label class="row small" style="gap:6px"><input type="checkbox"' + (gs.rowUp ? " checked" : "") + ' onchange="orfSetting(\'rowUp\',this.checked)"> Below the 25th starts one row up</label>' +
    '</div><p class="hint" style="margin-top:6px">The margin of error is the most a check can sit off the aim line and still be on track; for a slower reader it is 10% of their line, at least ' + ORF_BAND_FLOOR + ' words. The spring results use it as set, around the grade-level line. Winter checkpoint ' + esc(G.fmtLong(G.dueIn(now, gs.winterDue, gs.seasons.fall))) + ", spring goal date " +
    esc(G.fmtLong(G.dueIn(now, gs.springDue, gs.seasons.fall))) + ': set on the school calendar in <a href="#setup" onclick="document.querySelector(\'[data-tab=setup]\').click();return false">Setup</a>.</p></details></div>';

  /* ---- suggested groups ---- */
  if (window.SuiteOrf.suggest) {
    const basis = UI.orfGroupBasis === "need" ? "need" : "rate";
    const groups = window.SuiteOrf.suggest.suggest(db, basis, suiteCalendar().seasons);
    h += '<div class="card pad"><div class="sectionhead"><h2>Suggested reading groups</h2><span class="spacer"></span>' +
      '<label class="fld" style="margin:0">Group by<select onchange="UI.orfGroupBasis=this.value;renderORF()">' +
      '<option value="rate"' + (basis === "rate" ? " selected" : "") + '>Similar rate</option><option value="need"' + (basis === "need" ? " selected" : "") + ">What they need next</option></select></label></div>";
    if (!groups.length) h += '<p class="hint" style="margin-top:6px">Two or more children with checks are needed.</p>';
    else groups.forEach(gr => {
      h += '<div class="group" style="margin-top:10px"><h3>' + esc(gr.title) + '</h3><div class="body"><p class="small muted" style="margin:0 0 4px">' + esc(gr.desc) + '</p><div class="namelist">' +
        gr.members.map(m => { const pp = people.find(x => x.o.id === m.orfId); return "<span>" + esc(pp ? pp.name : m.name) + ' <span class="tiny muted">' + m.wcpm + "</span></span>"; }).join("") + "</div></div></div>";
    });
    h += '<p class="hint" style="margin-top:6px">From each child\u2019s latest check. To use a group, place the children in Small Groups.</p></div>';
  }

  /* ---- missed-word patterns ---- */
  const psid = UI.orfPatSid || "";
  const real = new Set(people.map(p => p.o.id));
  const pat = window.SuiteOrf.miscues.patterns(db.records.filter(r => real.has(r.studentId) && (!psid || r.studentId === psid)));
  h += '<div class="card pad"><div class="sectionhead"><h2>Patterns in missed words</h2><span class="spacer"></span>' +
    '<label class="fld" style="margin:0">For<select onchange="UI.orfPatSid=this.value;renderORF()"><option value="">The whole class</option>' +
    people.map(p => '<option value="' + esc(p.o.id) + '"' + (psid === p.o.id ? " selected" : "") + ">" + esc(p.name) + "</option>").join("") + "</select></label></div>";
  if (!pat.total) h += '<p class="hint" style="margin-top:6px">No missed words recorded' + (psid ? " for this child" : "") + " yet.</p>";
  else {
    const top = pat.features.length ? pat.features[0].n : 1;
    h += '<div class="row" style="align-items:flex-start;gap:24px;margin-top:6px"><div style="flex:1 1 260px"><h3 class="small">What the misses share</h3>' +
      pat.features.map(f => '<div style="margin:8px 0"><div class="row small" style="justify-content:space-between"><span>' + esc(f.feature) + '</span><span class="muted">' + f.n + " of " + pat.total +
        '</span></div><span class="wbar" style="display:block;min-width:0;margin:3px 0"><i style="width:' + Math.max(6, f.n / top * 100).toFixed(0) + '%;background:var(--accent)"></i></span><div class="tiny muted">' + esc(f.examples.join(", ")) + "</div></div>").join("") +
      '</div><div style="flex:1 1 260px"><h3 class="small">Words missed most</h3><table><thead><tr><th>Word</th><th class="c">Times</th>' + (psid ? "" : '<th class="c">Children</th>') + "</tr></thead><tbody>" +
      pat.words.map(w => "<tr><td>" + esc(w.word) + '</td><td class="c num">' + w.count + "</td>" + (psid ? "" : '<td class="c num" title="' + esc(w.who.map(id => (people.find(x => x.o.id === id) || {}).name).filter(Boolean).join(", ")) + '">' + w.who.length + "</td>") + "</tr>").join("") +
      "</tbody></table></div></div>";
  }
  return h + "</div>";
}
/* ---------- the suite calendar ----------
   One calendar for the suite, set in Setup and kept in this file's
   settings: the teacher, the school year and its dates, the marking
   periods, the ORF season lines and the ORF goal dates. Everything else
   reads it through SuiteOrf.calendar(). The goal dates lived in
   suite:orfgoals:v1 until v88; they are taken from there once, the same
   way on every computer, and read from here from then on. */
function suiteCalendar() {
  return window.SuiteOrf ? window.SuiteOrf.calendar(S.settings, orfJSON(ORF_GOALS_KEY))
    : { teacher: S.settings.teacher || "", seasons: S.settings.orfSeason, winterDue: "01-15", springDue: "05-14" };
}
function adoptCalendar() {
  if (!window.SuiteOrf) return;
  const cal = suiteCalendar();
  let changed = false;
  if (!/^\d{2}-\d{2}$/.test(String(S.settings.orfWinterDue || ""))) { S.settings.orfWinterDue = cal.winterDue; changed = true; }
  if (!/^\d{2}-\d{2}$/.test(String(S.settings.orfSpringDue || ""))) { S.settings.orfSpringDue = cal.springDue; changed = true; }
  if (changed) save();
}
/* the goals state with the calendar's dates and lines laid over it */
function orfGoalsForPlans() {
  const cal = suiteCalendar();
  return Object.assign(orfGoalsState(), { winterDue: cal.winterDue, springDue: cal.springDue, seasons: cal.seasons });
}
function setCalendar(k, v) {
  const m = String(v).match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!m) { toast("Pick a date"); renderSetup(); return; }
  const md = m[1] + "-" + m[2];
  if (k === "orfWinterDue" || k === "orfSpringDue") { S.settings[k] = md; save(); renderSetup(); return; }
  if (k === "fall" || k === "winter" || k === "spring") {
    S.settings.orfSeason = Object.assign({ fall: "08-01", winter: "12-01", spring: "03-01" }, S.settings.orfSeason || {});
    S.settings.orfSeason[k] = md;
    const o = S.settings.orfSeason;
    if (!(o.spring < o.fall && o.fall < o.winter)) toast("Windows should run spring, then fall, then winter through the year");
    syncOrfScores(); renderSetup();
  }
}
/* an MM-DD shown as a date in the school year it falls in */
function calIso(mmdd) {
  const y0 = Number(String(S.settings.yearStart || "").slice(0, 4)) || new Date().getFullYear();
  const line = (S.settings.orfSeason && S.settings.orfSeason.fall) || "08-01";
  return (String(mmdd) >= line ? y0 : y0 + 1) + "-" + mmdd;
}
/* the district's dates, as the planner carries them (suite-boot.js
   copies them to suite:district:v1 when the planner opens) */
function districtCalendar() {
  const d = orfJSON("suite:district:v1");
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(String(d.first)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(d.last))) return null;
  const grading = (Array.isArray(d.grading) ? d.grading : []).filter(g => /^\d{4}-\d{2}-\d{2}$/.test(g) && g > d.first && g < d.last).sort();
  const n = grading.length + 1;
  const names = n === 4 ? QUARTER_NAMES : n === 3 ? TRI_NAMES : n === 2 ? SEM_NAMES : QUARTER_NAMES;
  const terms = [];
  for (let i = 0; i < n; i++) terms.push({ id: "t" + (i + 1), name: names[i] || "Term " + (i + 1),
    start: i === 0 ? d.first : addDays(grading[i - 1], 1), end: i === n - 1 ? d.last : grading[i] });
  return { first: d.first, last: d.last, grading: grading, terms: terms };
}
function districtDiffers(dc) {
  if (!dc) return false;
  if (dc.first !== S.settings.yearStart || dc.last !== S.settings.yearEnd || dc.terms.length !== S.terms.length) return true;
  return dc.terms.some((t, i) => t.start !== S.terms[i].start || t.end !== S.terms[i].end);
}
function useDistrictCalendar() {
  const dc = districtCalendar();
  if (!dc) return;
  const dropped = S.terms.filter(t => Number(t.id.slice(1)) > dc.terms.length).map(t => t.id);
  if (dropped.length && !confirm("That makes " + dc.terms.length + " marking periods, which drops any marks you set by hand in the later ones. Continue?")) return;
  dropped.forEach(id => Object.keys(S.overrides).forEach(k => { if (k.indexOf(id + "|") === 0) delete S.overrides[k]; }));
  S.settings.yearStart = dc.first; S.settings.yearEnd = dc.last;
  /* the same ids, so marks set by hand in each marking period stay with it */
  S.terms = dc.terms.map(t => { const had = S.terms.find(x => x.id === t.id); return had ? Object.assign({}, had, { start: t.start, end: t.end }) : t; });
  if (!S.terms.find(t => t.id === UI.reportTerm)) UI.reportTerm = S.terms[0].id;
  save(); renderSetup(); toast("Using the district's dates");
}
function calendarCardHTML() {
  const cal = suiteCalendar(), dc = districtCalendar();
  const fmt = iso => new Date(iso + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return '<div class="card pad" id="calendar-card"><h2>School calendar</h2>' +
    '<p class="hint" style="margin-top:4px">The one calendar for the suite: the term marks, the ORF marks and goals, sub plans and Walk to WIN all read these.</p>' +
    (districtDiffers(dc) ? '<div class="notice warn" style="margin-top:8px"><p class="small" style="margin:0">The planner\u2019s district calendar has school from <strong>' + fmt(dc.first) + "</strong> to <strong>" + fmt(dc.last) +
      "</strong>" + (dc.grading.length ? ", with grading days " + dc.grading.map(fmt).join(", ") : "") + ". The dates below are different.</p>" +
      '<div class="row" style="margin-top:8px"><button class="btn primary" onclick="useDistrictCalendar()">Use the district\u2019s dates</button>' +
      '<span class="hint">' + dc.terms.length + " marking periods, each ending on its grading day</span></div></div>" : "") +
    '<div class="row" style="margin-top:8px">' +
    '<label class="fld">Teacher / class label<input type="text" id="set-teacher" value="' + esc(S.settings.teacher) + '" placeholder="Room 12"></label>' +
    '<label class="fld">School year<input type="text" id="set-year" value="' + esc(S.settings.year) + '" style="width:120px"></label></div>' +
    '<div class="row" style="margin-top:8px;align-items:flex-end">' +
    '<label class="fld">First day<input type="date" id="yr-start" value="' + esc(S.settings.yearStart || "") + '"></label>' +
    '<label class="fld">Last day<input type="date" id="yr-end" value="' + esc(S.settings.yearEnd || "") + '"></label>' +
    '<label class="fld">Marking periods<select id="yr-n"><option value="4">4 quarters</option><option value="3">3 trimesters</option><option value="2">2 semesters</option></select></label>' +
    '<button class="btn" onclick="rebuildTerms()">Split the year evenly</button></div>' +
    '<p class="hint" style="margin-top:8px">An even split is only a starting point \u2014 real quarters break on grading days and skip over breaks. Set the exact end dates below from the district calendar and everything downstream follows.</p>' +
    '<table style="margin-top:8px"><thead><tr><th>Name</th><th>Starts</th><th>Ends</th></tr></thead><tbody>' +
    S.terms.map(t => "<tr>" +
      '<td><input type="text" data-tf="name" data-id="' + t.id + '" aria-label="' + esc(t.name) + ' name" value="' + esc(t.name) + '"></td>' +
      '<td><input type="date" data-tf="start" data-id="' + t.id + '" aria-label="' + esc(t.name) + ' starts" value="' + t.start + '"></td>' +
      '<td><input type="date" data-tf="end" data-id="' + t.id + '" aria-label="' + esc(t.name) + ' ends" value="' + t.end + '"></td></tr>').join("") +
    "</tbody></table>" +
    '<h3 style="margin-top:16px">Reading checks</h3>' +
    '<div class="row" style="margin-top:6px">' +
    [["fall", "Fall window opens"], ["winter", "Winter window opens"], ["spring", "Spring window opens"]].map(x =>
      '<label class="fld">' + x[1] + '<input type="date" data-cal="' + x[0] + '" value="' + calIso(cal.seasons[x[0]]) + '"></label>').join("") + "</div>" +
    '<div class="row" style="margin-top:6px">' +
    '<label class="fld">Winter goal checkpoint<input type="date" data-cal="orfWinterDue" value="' + calIso(cal.winterDue) + '"></label>' +
    '<label class="fld">Spring goal date<input type="date" data-cal="orfSpringDue" value="' + calIso(cal.springDue) + '"></label></div>' +
    '<p class="hint" style="margin-top:6px">The windows decide which norms a check is read against, and the fall window is where a new school year begins for the ORF goals. Only the month and day are kept, so these carry over from year to year.</p></div>';
}
/* a name opens its row and closes it again; focus stays on the name */
function orfPickGoal(sid) {
  UI.orfGoalSid = sid && UI.orfGoalSid !== sid ? sid : null;
  renderORF();
  if (sid) {
    const b = [...document.querySelectorAll("#orf-progress tr.sc-row")].find(r => r.dataset.orf === sid);
    const btn = b && b.querySelector(".sc-btn");
    if (btn) btn.focus({ preventScroll: true });
  }
}
function orfSetGoal(sid, which, val) {
  if (which == null) { orfWrite(ORF_GOALS_KEY, g => { delete g.goals[sid]; }); renderORF(); return; }
  const v = String(val).trim() === "" ? null : Math.round(+val);
  if (v != null && !(v > 0 && v <= 300)) { toast("A goal between 1 and 300"); renderORF(); return; }
  orfWrite(ORF_GOALS_KEY, g => {
    let o = g.goals[sid];
    o = typeof o === "number" ? { spring: o } : (o && typeof o === "object" ? o : {});
    if (v == null) delete o[which]; else o[which] = v;
    if (o.spring == null && o.winter == null) delete g.goals[sid]; else g.goals[sid] = o;
  });
  renderORF(); toast(v == null ? "Back to the suggested goal" : "Goal set");
}
function orfSetComp(recId, val) {
  orfWrite(ORF_COMP_KEY, c => { if (val === "") delete c.records[recId]; else c.records[recId] = Math.max(0, Math.min(3, Math.round(+val))); });
  renderORF();
}
function orfSetting(k, v) {
  orfWrite(ORF_GOALS_KEY, g => {
    if (k === "rowUp") g.rowUp = !!v;
    else if (k === "method") g.method = v;
    else if (k === "expectation") { const n = Math.round(+v); g.expectation = n > 0 && n <= 300 ? n : null; }
    else if (k === "margin") { const n = Math.round(+v); g.margin = n >= 0 && n <= 30 ? n : 10; }
  });
  renderORF();
}

function renderORF() {
  const el = document.getElementById("panel-orf");
  const cuts = Object.assign({ 4: 75, 3: 50, 2: 25 }, S.settings.orfCuts || {});
  let html = '<div class="stack">';

  if (!ORF_NORMS) html += '<div class="card pad"><p class="hint" style="color:var(--warn)">The ORF norms did not load ' +
    '(suite-orf.js), so no readings are being turned into marks. The marks already here are kept. Reload the page; ' +
    'if this stays, the site is missing that file.</p></div>';

  /* live link card */
  const db = readOrfDB();
  html += '<div class="card pad"><div class="sectionhead"><h2>Your ORF tool</h2><span class="spacer"></span>' +
    '<label class="row small" style="gap:6px"><input type="checkbox" id="orf-autolink"' + (S.settings.orfAutoLink ? " checked" : "") + '> Pull in new readings on open</label></div>';
  if (db) {
    const unlinked = (db.students || []).filter(o => !o.demo && !orfStudentToLocal(o.id, db)).length;
    const newRecs = db.records.filter(r => !S.orf.some(x => x.srcId === r.id)).length;
    html += '<p class="small" style="margin-top:4px">Found it on this computer: <strong>' + (db.students || []).filter(o => !o.demo).length +
      ' students</strong> and <strong>' + db.records.length + ' readings</strong>' +
      (newRecs ? ', <strong style="color:var(--accent)">' + newRecs + ' not here yet</strong>' : ', all of which are already here') + '.</p>';
    if (unlinked) html += '<p class="hint" style="color:var(--warn)">' + unlinked + ' student' + (unlinked === 1 ? " is" : "s are") + ' in the ORF tool but not on this roster \u2014 bring the roster over and they will link up.</p>';
    html += '<div class="row" style="margin-top:10px"><button class="btn primary" onclick="syncFromOrf(false)">Bring in readings</button>' +
      '<button class="btn" onclick="importOrfRoster()">Bring the roster over</button></div>';
  } else {
    html += '<p class="hint" style="margin-top:4px">Not found in this browser. The live link works when both files are opened on the same computer in the same browser, which is how Chrome and Edge treat local files. If yours does not connect, the file import in Setup does the same job.</p>';
  }
  html += "</div>";

  /* goals, aim line, groups, patterns, read live */
  html += orfAnalysisHTML(db);

  /* the file import and the 1-4 settings are drawn here but placed
     after the class's data, so the data cards read together */
  const setupAt = html.length;
  /* conversion settings */
  html += '<div class="card pad"><div class="sectionhead"><h3>How WCPM becomes a 1\u20134</h3><span class="spacer"></span>' +
    '<label class="row small" style="gap:6px"><input type="checkbox" id="orf-auto"' + (S.settings.orfAutoScore ? " checked" : "") + "> Turn readings into marks automatically</label></div>" +
    '<label class="fld" style="margin-top:8px">Grade every check against<select id="orf-against">' +
      '<option value="fall"' + (orfBasis() === "fall" ? " selected" : "") + '>Fall norms, by percentile (every check)</option>' +
      '<option value="wcpm"' + (orfBasis() === "wcpm" ? " selected" : "") + '>Our WCPM bands</option>' +
      '<option value="eoy"' + (orfBasis() === "eoy" ? " selected" : "") + '>End-of-year expectations (as report cards are graded)</option>' +
      '<option value="season"' + (orfBasis() === "season" ? " selected" : "") + '>The norms for the season it was taken in</option></select></label>' +
(orfBasis() === "wcpm" ? (function () {
      /* Creswell's bands, the same for every check whenever it was read */
      const c = Object.assign({ 2: 20, 3: 80, 4: 101 }, S.settings.orfWcpm || {});
      const to = { 1: c[2] - 1, 2: c[3] - 1, 3: c[4] - 1 };
      return '<p class="hint">Each check is marked by its words correct per minute, whenever it was read. Change where a band starts if the school\u2019s bands change.</p>' +
        '<table style="margin-top:10px"><thead><tr><th>Mark</th><th>Words correct per minute</th></tr></thead><tbody>' +
        [4, 3, 2].map(mk => "<tr><td>" + markHTML(mk) + '</td><td class="row" style="gap:6px"><input type="number" min="1" max="300" step="1" style="width:76px" data-wcut="' + mk +
          '" value="' + c[mk] + '" aria-label="A ' + mk + ' starts at"><span class="small">' + (mk === 4 ? "and up" : "to " + to[mk]) + "</span></td></tr>").join("") +
        "<tr><td>" + markHTML(1) + '</td><td class="small">0 to ' + to[1] + "</td></tr></tbody></table>";
    })() : (    '<p class="hint">' + (orfBasis() === "fall"
      ? "Every check is measured against the fall norms, whenever it was read: the fall WCPM at each cut point below."
      : orfBasis() === "eoy"
      ? "Every check is measured against the spring norms, whenever it was read, because report card marks are graded against end-of-year expectations. A 3 is the end-of-year 50th percentile, so fall and winter marks run lower by design."
      : "Each check is measured against the norms for its own season, read from its date using the windows on the school calendar (Setup).") +
    ' Percentiles come from Hasbrouck &amp; Tindal (2017) grade 2 norms. The table publishes the 10th, 25th, 50th, 75th and 90th; any other is estimated on the line between its neighbours (marked ~). Change the cut points if Creswell uses different ones.</p>' +
    '<table style="margin-top:10px"><thead><tr><th>Mark</th><th>Student is at or above</th>' +
    (orfFixedSeason() != null ? '<th class="c">' + (orfBasis() === "fall" ? "Fall WCPM" : "End of year") + "</th>" : '<th class="c">Fall</th><th class="c">Winter</th><th class="c">Spring</th>') + '</tr></thead><tbody>' +
    [4, 3, 2].map(mk => {
      const p = cuts[mk];
      return "<tr><td>" + markHTML(mk) + '</td><td><select data-cut="' + mk + '" aria-label="A ' + mk + ' is at or above">' +
        [90, 75, 50, 25, 20, 10].map(x => '<option value="' + x + '"' + (x === Number(p) ? " selected" : "") + ">" + x + "th percentile" + (normEstimated(x) ? " (estimated)" : "") + "</option>").join("") +
        '</select></td>' + (function () {
          const est = normEstimated(p) ? "~" : "", cell = se => '<td class="c num">' + est + normAt(p, se) + "+</td>";
          return orfFixedSeason() != null ? cell(orfFixedSeason()) : cell(0) + cell(1) + cell(2);
        })() + "</tr>";
    }).join("") +
    "<tr><td>" + markHTML(1) + '</td><td colspan="' + (orfFixedSeason() != null ? 2 : 4) + '" class="muted small">anything below the cut for a 2</td></tr>' +
    "</tbody></table>")) +
    '<div class="row" style="margin-top:12px">' +
    '<label class="fld">These marks land on<select id="orf-std">' +
    CATALOG.filter(s => s.s === "ELA" && s.d === "Foundational Skills").map(s => '<option value="' + s.c + '"' + (S.settings.orfStandard === s.c ? " selected" : "") + ">" + esc(s.c + " \u2014 " + s.lbl) + "</option>").join("") +
    "</select></label></div></div>";
  const setupHTML = html.slice(setupAt);
  html = html.slice(0, setupAt);

  /* every reading brought in. "Where the class sits" (the latest
     check against the 50th, its band and mark) is the Reading progress
     scorecard now; each check's mark is in this list. */
  if (S.orf.length && S.students.length) {
    html += '<div class="card pad"><div class="sectionhead"><h3>All readings</h3><span class="spacer"></span>' +
      '<button class="btn sm danger" onclick="if(confirm(\'Remove every imported reading?\')){S.orf=[];syncOrfScores();renderORF()}">Clear all</button></div>' +
      '<div class="scroll" style="max-height:44vh"><table><thead><tr><th>Student</th><th>Date</th><th>Passage</th><th class="c">WCPM</th><th class="c">Accuracy</th><th>Season</th><th class="c">Mark</th><th class="c">Use it</th></tr></thead><tbody>' +
      S.orf.filter(r => !r.gone).sort((a, b) => b.date.localeCompare(a.date)).map(r => {
        const st = S.students.find(s => s.id === r.sid), se = seasonOf(r.date);
        return "<tr><td>" + esc(st ? fullName(st) : "?") + "</td><td>" + esc(r.date) + '</td><td class="tiny muted">' + esc(r.passage || "") + '</td><td class="c num">' + r.wcpm +
          '</td><td class="c num">' + (r.accuracy ? r.accuracy + "%" : "\u2013") + "</td><td>" + SEASON_NAME[se] +
          '</td><td class="c">' + markHTML(wcpmToMark(r.wcpm, se)) + '</td><td class="c"><input type="checkbox" data-orfuse="' + r.id + '"' + (r.exclude ? "" : " checked") + "></td></tr>";
      }).join("") + "</tbody></table></div></div>";
  }

  html += '<div class="divider"></div>' + setupHTML;
  html += "</div>";
  el.innerHTML = html;

  document.getElementById("orf-auto").onchange = e => { S.settings.orfAutoScore = e.target.checked; syncOrfScores(); renderORF(); };
  document.getElementById("orf-autolink").onchange = e => { S.settings.orfAutoLink = e.target.checked; save(); };
  document.getElementById("orf-std").onchange = e => { S.settings.orfStandard = e.target.value; syncOrfScores(); renderORF(); };
  const ag = document.getElementById("orf-against");
  if (ag) ag.onchange = () => { S.settings.orfAgainst = ["season", "eoy", "fall"].indexOf(ag.value) >= 0 ? ag.value : "wcpm"; syncOrfScores(); renderORF(); };
  el.querySelectorAll("[data-wcut]").forEach(inp => {
    inp.onchange = () => {
      const c = S.settings.orfWcpm = Object.assign({ 2: 20, 3: 80, 4: 101 }, S.settings.orfWcpm || {});
      const n = Math.round(Number(inp.value));
      if (!isFinite(n) || n < 1) { renderORF(); return; }
      c[Number(inp.dataset.wcut)] = n;
      if (!(c[4] > c[3] && c[3] > c[2])) toast("Each band has to start above the one below it");
      syncOrfScores(); renderORF();
    };
  });
  el.querySelectorAll("[data-cut]").forEach(sl => {
    sl.onchange = () => {
      S.settings.orfCuts[Number(sl.dataset.cut)] = Number(sl.value);
      const c = S.settings.orfCuts;
      if (!(c[4] >= c[3] && c[3] >= c[2])) { toast("Cut points must go 4 \u2265 3 \u2265 2"); }
      syncOrfScores(); renderORF();
    };
  });
  el.querySelectorAll("[data-orfuse]").forEach(cb => {
    cb.onchange = () => {
      const r = S.orf.find(x => x.id === cb.dataset.orfuse);
      r.exclude = !cb.checked; syncOrfScores(); renderORF();
    };
  });
}

/* the ORF file import, moved from the ORF tab to Setup with the
   other ways data comes in. Drawn into its own box so a redraw here leaves
   the rest of Setup (and anything half-typed there) alone. */
function renderOrfImport() {
  const el = document.getElementById("setup-orfimport");
  if (!el) return;
  let html = '<div class="card pad" id="orf-import"><h2>Bring in ORF readings from a file</h2>' +
    '<p class="hint" style="margin-top:6px">For readings that are not in the ORF tool on this device. Drop in the backup file an ORF tool saves, or a CSV with a name, a date, and a WCPM column. The shape of the file does not matter \u2014 the fields are detected and you confirm them before anything is imported.</p>' +
    '<div class="row" style="margin-top:10px"><input type="file" id="orf-file" accept=".json,.csv,.tsv,.txt"><span class="hint">or paste below</span></div>' +
    '<textarea id="orf-paste" rows="4" style="width:100%;margin-top:10px;font-family:ui-monospace,monospace;font-size:12px" placeholder="Paste JSON or CSV rows here"></textarea>' +
    '<div class="row" style="margin-top:10px"><button class="btn primary" onclick="orfRead()">Read this file</button>' +
    '<button class="btn" onclick="orfTemplate()">Download a blank CSV template</button></div></div>';

  /* mapping card */
  if (UI.orfCand) {
    const c = UI.orfCand, keys = c.keys;
    const sel = (field, label) => '<label class="fld">' + label + '<select data-omap="' + field + '"><option value="">\u2014</option>' +
      keys.map(k => '<option value="' + esc(k) + '"' + (UI.orfMap[field] === k ? " selected" : "") + ">" + esc(k) + "</option>").join("") + "</select></label>";
    html += '<div class="card pad"><h3>Check the fields</h3>';
    if (UI.orfCands.length > 1) {
      html += '<label class="fld" style="margin-bottom:10px">Which list holds the readings?<select id="orf-arr">' +
        UI.orfCands.map((x, i) => '<option value="' + i + '"' + (i === UI.orfCandIdx ? " selected" : "") + ">" + esc(x.path) + " (" + x.arr.length + " records)</option>").join("") + "</select></label>";
    }
    html += '<div class="row">' + sel("student", "Student") + sel("wcpm", "WCPM") + sel("date", "Date") + sel("accuracy", "Accuracy % (optional)") + "</div>";

    const prev = c.arr.slice(0, 6).map(o => {
      const st = resolveStudent(o[UI.orfMap.student], UI.orfPeople);
      const d = String(o[UI.orfMap.date] || "").slice(0, 10);
      const w = o[UI.orfMap.wcpm];
      const se = seasonOf(d), m = wcpmToMark(w, se);
      return "<tr><td>" + esc(String(o[UI.orfMap.student] == null ? "" : o[UI.orfMap.student])) + "</td><td>" +
        (st ? esc(fullName(st)) : '<span style="color:var(--s1)">no match</span>') + "</td><td>" + esc(d) +
        '</td><td class="c num">' + esc(w == null ? "" : w) + "</td><td>" + SEASON_NAME[se] + '</td><td class="c">' + markHTML(m) + "</td></tr>";
    }).join("");
    html += '<table style="margin-top:12px"><thead><tr><th>In file</th><th>Matched to</th><th>Date</th><th class="c">WCPM</th><th>Season</th><th class="c">Mark</th></tr></thead><tbody>' + prev + "</tbody></table>";
    html += '<div class="row" style="margin-top:12px"><button class="btn primary" onclick="orfImport()">Import ' + c.arr.length + ' readings</button>' +
      '<button class="btn" onclick="UI.orfCand=null;renderOrfImport()">Cancel</button></div></div>';
  }

  el.innerHTML = html;
  document.getElementById("orf-file").onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { document.getElementById("orf-paste").value = rd.result; orfRead(); };
    rd.readAsText(f);
  };
  const arrSel = document.getElementById("orf-arr");
  if (arrSel) arrSel.onchange = () => { UI.orfCandIdx = Number(arrSel.value); orfPickCandidate(); renderOrfImport(); };
  el.querySelectorAll("[data-omap]").forEach(sl => {
    sl.onchange = () => { UI.orfMap[sl.dataset.omap] = sl.value; renderOrfImport(); };
  });
}
function orfRead() {
  const txt = document.getElementById("orf-paste").value.trim();
  if (!txt) { toast("Paste the file or choose one first"); return; }
  let cands = [];
  let root = null;
  if (txt[0] === "{" || txt[0] === "[") {
    try { root = JSON.parse(txt); } catch (e) { toast("That looks like JSON but could not be parsed"); return; }
    collectArrays(root, "", cands, 0);
    cands = cands.map(c => ({ path: c.path, arr: c.arr, keys: keyUnion(c.arr) }));
    cands.forEach(c => c.score = scoreCandidate(c.keys));
    cands = cands.filter(c => c.score > 0).sort((a, b) => b.score - a.score || b.arr.length - a.arr.length);
    if (!cands.length) { toast("No list of readings found in that file"); return; }
  } else {
    const rows = parseDelimited(txt);
    if (rows.length < 2) { toast("Could not find a header row plus data"); return; }
    const h = rows[0].map(x => x.trim());
    const objs = rows.slice(1).map(r => { const o = {}; h.forEach((k, i) => o[k] = r[i]); return o; });
    cands = [{ path: "CSV", arr: objs, keys: h, score: 9 }];
    root = objs;
  }
  UI.orfCands = cands; UI.orfCandIdx = 0; UI.orfPeople = buildPeopleIndex(root);
  orfPickCandidate();
  renderOrfImport();
}
function orfPickCandidate() {
  const c = UI.orfCands[UI.orfCandIdx];
  UI.orfCand = c;
  const find = re => c.keys.find(k => re.test(k)) || "";
  UI.orfMap = {
    wcpm: find(/wcpm|wordscorrect|words_correct|correctperminute|cwpm/i),
    date: find(/^date$|date|when|timestamp|assessed/i),
    student: find(/studentid|student_id|studentname|^student$|^sid$|^name$|pupil/i) || find(/student|name|id/i),
    accuracy: find(/accuracy|percentcorrect|acc%/i)
  };
}
function orfImport() {
  const c = UI.orfCand, m = UI.orfMap;
  if (!m.wcpm) { toast("Pick which field holds WCPM"); return; }
  let added = 0, missed = 0, bad = 0;
  c.arr.forEach(o => {
    const st = resolveStudent(o[m.student], UI.orfPeople);
    if (!st) { missed++; return; }
    const w = Number(String(o[m.wcpm]).replace(/[^0-9.\-]/g, ""));
    if (!isFinite(w) || w <= 0) { bad++; return; }
    let d = localDayOf(o[m.date]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const parsed = new Date(o[m.date]);
      d = isNaN(parsed) ? todayISO() : localDayOf(parsed.toISOString());
    }
    const srcId = o.id || o.recordId || null;
    if (srcId && S.orf.some(r => r.srcId === srcId)) return;
    if (S.orf.some(r => r.sid === st.id && r.date === d && r.wcpm === Math.round(w))) return;
    const acc = m.accuracy ? Number(String(o[m.accuracy]).replace(/[^0-9.]/g, "")) : null;
    S.orf.push({ id: uid(), srcId: srcId, sid: st.id, date: d, wcpm: Math.round(w), accuracy: isFinite(acc) && acc ? Math.round(acc) : null, exclude: false });
    added++;
  });
  UI.orfCand = null;
  syncOrfScores(); renderOrfImport();
  toast("Imported " + added + " readings" + (missed ? " \u00b7 " + missed + " unmatched" : "") + (bad ? " \u00b7 " + bad + " without a usable WCPM" : ""));
}
function orfTemplate() {
  const rows = [["Student", "Date", "WCPM", "Accuracy"].join(",")];
  sortedStudents().forEach(st => rows.push([st.last + ", " + st.first, todayISO(), "", ""].map(csvCell).join(",")));
  if (!S.students.length) rows.push(["Smith, Ava", todayISO(), "72", "96"].join(","));
  download("orf-readings-template.csv", rows.join("\n"));
}

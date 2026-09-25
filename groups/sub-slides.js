/* ============================================================
   groups/sub-slides.js
   Builds the substitute's math groups deck (.pptx) from the Groups tool.

   The template (sub-deck-template.js) is the deck approved on 15 Sept 2026
   with every name, station label and page box taken out, so nothing about
   the class ships in the repository. This file puts back:
     - the title and the four group names, on the BOARD layout
     - one name chip per student, also on the layout, so "Slide > Edit
       theme" still edits all four rotations at once
     - on each slide, the four station labels and a PAGE box beside every
       station that takes page numbers, filled from the board
     - speaker notes for the substitute, in the current names

   The four slides are the line-up rotation, as the original deck was:
   slide r puts the group in corner g at station (g + r) % 4. The station
   bars and icons belong to the station index and stay in the template.

   window.SubSlides.build(model, JSZip, opts) -> Promise<Blob>
   window.SubSlides.fill(model, opts)          -> { files, warnings }  (no zip; for tests)
   ============================================================ */
(function () {
  "use strict";

  var EMU_PT = 12700;
  var STATION_HEX = ["0F6B6B", "4B3FA8", "B01E55", "2E6B2E"];
  var TINTS = { fox: "FBE7DE", bear: "F2E7E0", tiger: "FDF0D9", lion: "F7EBD9" };

  /* Where the template's cards and bars are, in EMU (13.33 x 7.5 in slide). */
  var CARD = [[384048, 841248], [6195060, 841248], [384048, 3767328], [6195060, 3767328]];
  var CARD_W = 5609844, CARD_H = 2761488;
  var BAR = [[566928, 1901952], [6377940, 1901952], [566928, 4828032], [6377940, 4828032]];
  var LABEL_DX = 694944, LABEL_W = 4402836, LABEL_W_PAGE = 3104388, BAR_H = 694944;
  var PAGE_DX = 3945636, PAGE_DY = 82296, PAGE_W = 1188720, PAGE_H = 530352;

  /* Chip sizes, largest first. The first that fits every name wins; a card
     holds two rows at the approved size, three at the smallest two. */
  var TIERS = [
    { sz: 1500, h: 301752, gap: 82296, pad: 146304 },
    { sz: 1300, h: 265176, gap: 73152, pad: 128016 },
    { sz: 1150, h: 228600, gap: 54864, pad: 109728 },
    { sz: 1000, h: 201168, gap: 45720, pad: 91440 }
  ];
  var NAMES_DX = 201168, NAMES_DY = 1938528, NAMES_RIGHT = 5426964, NAMES_BOTTOM = CARD_H - 27432;

  function xml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c];
    });
  }

  var RUN_FONT = '<a:latin typeface="Arial" pitchFamily="34" charset="0"/>' +
    '<a:ea typeface="Arial" pitchFamily="34" charset="-122"/><a:cs typeface="Arial" pitchFamily="34" charset="-120"/>';

  /* Text width in EMU. A canvas measures Arial bold for real; without one
     (a test, an old browser) a bold-Arial average of 0.6em per letter is
     what the approved deck itself used. */
  var ctx = null, ctxTried = false;
  function defaultMeasure(text, sz) {
    if (!ctxTried) {
      ctxTried = true;
      try {
        if (typeof document !== "undefined" && typeof HTMLCanvasElement !== "undefined" &&
            !/jsdom/i.test((typeof navigator !== "undefined" && navigator.userAgent) || "")) {
          ctx = document.createElement("canvas").getContext("2d");
        }
      } catch (e) { ctx = null; }
    }
    var pt = sz / 100;
    if (ctx) {
      ctx.font = "bold " + pt + "pt Arial, Helvetica, sans-serif";
      /* canvas reports CSS px at 96/in; a point is 1/72 in */
      return Math.ceil(ctx.measureText(text).width * 0.75 * EMU_PT);
    }
    return Math.ceil(String(text).length * 0.6 * pt * EMU_PT);
  }

  function layoutNames(names, measure) {
    for (var t = 0; t < TIERS.length; t++) {
      var tier = TIERS[t], chips = [], x = 0, y = 0, fits = true;
      for (var i = 0; i < names.length; i++) {
        var w = Math.min(NAMES_RIGHT - NAMES_DX, measure(names[i], tier.sz) + 2 * tier.pad);
        if (x > 0 && x + w > NAMES_RIGHT - NAMES_DX) { x = 0; y += tier.h + tier.gap; }
        chips.push({ name: names[i], x: x, y: y, w: w, h: tier.h, sz: tier.sz });
        x += w + tier.gap;
      }
      if (names.length && NAMES_DY + y + tier.h > NAMES_BOTTOM) fits = false;
      if (fits || t === TIERS.length - 1) return { chips: chips, fits: fits };
    }
  }

  function chipXml(id, c, cardX, cardY, tint) {
    return '<p:sp><p:nvSpPr><p:cNvPr id="' + id + '" name="Name ' + id + '"></p:cNvPr><p:cNvSpPr txBox="1"/><p:nvPr></p:nvPr></p:nvSpPr>' +
      '<p:spPr><a:xfrm><a:off x="' + (cardX + NAMES_DX + c.x) + '" y="' + (cardY + NAMES_DY + c.y) + '"/>' +
      '<a:ext cx="' + c.w + '" cy="' + c.h + '"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 50000"/></a:avLst></a:prstGeom>' +
      '<a:solidFill><a:srgbClr val="' + tint + '"/></a:solidFill><a:ln w="12700"><a:solidFill><a:srgbClr val="' + tint + '"/></a:solidFill></a:ln></p:spPr>' +
      '<p:txBody><a:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="ctr"><a:normAutofit/></a:bodyPr><a:lstStyle/>' +
      '<a:p><a:pPr algn="ctr" indent="0" marL="0"><a:buNone/></a:pPr><a:r><a:rPr lang="en-US" sz="' + c.sz + '" b="1" dirty="0">' +
      '<a:solidFill><a:srgbClr val="16202B"/></a:solidFill>' + RUN_FONT + '</a:rPr><a:t>' + xml(c.name) + '</a:t></a:r>' +
      '<a:endParaRPr lang="en-US" sz="' + c.sz + '" dirty="0"/></a:p></p:txBody></p:sp>';
  }

  function labelXml(id, x, y, w, text) {
    return '<p:sp><p:nvSpPr><p:cNvPr id="' + id + '" name="Station ' + id + '"></p:cNvPr><p:cNvSpPr txBox="1"/><p:nvPr></p:nvPr></p:nvSpPr>' +
      '<p:spPr><a:xfrm><a:off x="' + x + '" y="' + y + '"/><a:ext cx="' + w + '" cy="' + BAR_H + '"/></a:xfrm>' +
      '<a:prstGeom prst="rect"><a:avLst></a:avLst></a:prstGeom><a:noFill/><a:ln></a:ln></p:spPr>' +
      '<p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="ctr"><a:normAutofit/></a:bodyPr><a:lstStyle/>' +
      '<a:p><a:pPr algn="l" indent="0" marL="0"><a:buNone/></a:pPr><a:r><a:rPr lang="en-US" sz="2600" b="1" dirty="0">' +
      '<a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>' + RUN_FONT + '</a:rPr><a:t>' + xml(text) + '</a:t></a:r>' +
      '<a:endParaRPr lang="en-US" sz="2600" dirty="0"/></a:p></p:txBody></p:sp>';
  }

  function pageXml(id, x, y, hex, value) {
    var run = function (sz, extra, t) {
      return '<a:p><a:pPr algn="ctr" indent="0" marL="0"><a:lnSpc><a:spcPts val="1500"/></a:lnSpc><a:buNone/></a:pPr>' +
        '<a:r><a:rPr lang="en-US" sz="' + sz + '" b="1"' + extra + ' dirty="0"><a:solidFill><a:srgbClr val="' + hex + '"/></a:solidFill>' +
        RUN_FONT + '</a:rPr><a:t>' + xml(t) + '</a:t></a:r><a:endParaRPr lang="en-US" sz="1000" dirty="0"/></a:p>';
    };
    return '<p:sp><p:nvSpPr><p:cNvPr id="' + id + '" name="Page ' + id + '"></p:cNvPr><p:cNvSpPr txBox="1"/><p:nvPr></p:nvPr></p:nvSpPr>' +
      '<p:spPr><a:xfrm><a:off x="' + x + '" y="' + y + '"/><a:ext cx="' + PAGE_W + '" cy="' + PAGE_H + '"/></a:xfrm>' +
      '<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 13793"/></a:avLst></a:prstGeom>' +
      '<a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="12700"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></p:spPr>' +
      '<p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="ctr"><a:normAutofit/></a:bodyPr><a:lstStyle/>' +
      run(1000, ' spc="100" kern="0"', "PAGE") + run(1800, "", value || "______") + '</p:txBody></p:sp>';
  }

  function notesParas(lines) {
    return lines.map(function (l) {
      return l ? '<a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>' + xml(l) + '</a:t></a:r></a:p>' : '<a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>';
    }).join("");
  }

  /* model: { title, stations:[4], pageStations:[4],
              groups:[{ animal, name, names:[...], pages:{stationIndex: "12"} } x4], madeOn } */
  function fill(model, opts) {
    opts = opts || {};
    var T = opts.template || (typeof window !== "undefined" && window.SUB_DECK_TEMPLATE);
    if (!T) throw new Error("The slide template did not load.");
    var measure = opts.measure || defaultMeasure;
    var files = {}, warnings = [];
    Object.keys(T).forEach(function (k) { files[k] = T[k]; });
    var groups = model.groups;
    var title = model.title || "Math Groups";
    var stations = model.stations;
    var pageSt = model.pageStations || [false, false, true, false];

    function text(k, fn) { files[k] = { text: fn(T[k].text) }; }

    /* ---- the BOARD layout: title, group names, name chips ---- */
    text("ppt/slideLayouts/slideLayout2.xml", function (s) {
      s = s.split("{{TITLE}}").join(xml(title));
      var chips = "", id = 1000;
      groups.forEach(function (g, i) {
        s = s.split("{{G" + i + "}}").join(xml(g.name));
        var lay = layoutNames(g.names, measure);
        if (!lay.fits) warnings.push(g.name + " has more names than fit on its card; some run past the bottom.");
        lay.chips.forEach(function (c) { chips += chipXml(id++, c, CARD[i][0], CARD[i][1], TINTS[g.animal] || TINTS.fox); });
      });
      return s.replace("<!--NAMES-->", chips);
    });

    /* ---- each rotation: labels, page boxes, notes ---- */
    for (var r = 0; r < 4; r++) {
      (function (r) {
        text("ppt/slides/slide" + (r + 1) + ".xml", function (s) {
          var out = "", id = 2000;
          for (var c = 0; c < 4; c++) {
            var st = (c + r) % 4, bx = BAR[c][0], by = BAR[c][1];
            var hasPage = !!pageSt[st];
            out += labelXml(id++, bx + LABEL_DX, by, hasPage ? LABEL_W_PAGE : LABEL_W, stations[st]);
            if (hasPage) {
              var v = groups[c].pages && groups[c].pages[st] != null ? String(groups[c].pages[st]).trim() : "";
              out += pageXml(id++, bx + PAGE_DX, by + PAGE_DY, STATION_HEX[st], v);
            }
          }
          return s.replace("<!--CORNERS-->", out);
        });
        text("ppt/notesSlides/notesSlide" + (r + 1) + ".xml", function (s) {
          var lines = ["ROTATION " + (r + 1) + " OF 4 \u2014 for the substitute", "",
            "Each group keeps the same corner of the screen. Only the colored bar changes.", ""];
          for (var c = 0; c < 4; c++) {
            var st = (c + r) % 4;
            var pg = pageSt[st] && groups[c].pages && String(groups[c].pages[st] || "").trim();
            lines.push("  " + groups[c].name + " \u2192 " + stations[st] + (pg ? " (page " + pg + ")" : ""));
          }
          lines.push("", "To move everyone on: click \u201cNext rotation\u201d or press the right arrow key. After Rotation 4 it loops back to Rotation 1.",
            "", "Present the deck (Slideshow) so students see only the board.", "",
            "TEACHER \u2014 this deck was made from the Groups tool" + (model.madeOn ? " on " + model.madeOn : "") +
            ". To change names, groups or page numbers, change them there and download a fresh copy. " +
            "For a quick fix in this deck: click a PAGE box to type a page, or use Slide > Edit theme to change names once on the BOARD layout.");
          return s.replace(/<a:p>(?:(?!<a:p>)[\s\S])*?\{\{NOTES\}\}[\s\S]*?<\/a:p>/, notesParas(lines));
        });
      })(r);
    }

    text("docProps/core.xml", function (s) {
      return s.split("{{TITLE}}").join(xml(title)).split("{{NOW}}").join(new Date().toISOString().replace(/\.\d+Z$/, "Z"));
    });
    return { files: files, warnings: warnings };
  }

  function build(model, JSZip, opts) {
    var res = fill(model, opts);
    var zip = new JSZip();
    /* [Content_Types].xml first, as Office writes it */
    var names = Object.keys(res.files).sort(function (a, b) {
      return (a === "[Content_Types].xml" ? -1 : 0) - (b === "[Content_Types].xml" ? -1 : 0);
    });
    names.forEach(function (k) {
      var f = res.files[k];
      if (f.b64 != null) zip.file(k, f.b64, { base64: true });
      else zip.file(k, f.text);
    });
    var type = (opts && opts.type) || "blob";
    return zip.generateAsync({
      type: type, compression: "DEFLATE",
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    }).then(function (out) { return { file: out, warnings: res.warnings }; });
  }

  window.SubSlides = { build: build, fill: fill, layoutNames: layoutNames };
})();

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
  /* v91: the colors look. In slot order (Red, Blue, Yellow, Green): the
     card's border and name color, and the tint behind each name. The
     animal colors they replace are the template's own, in the same order.
     Station bars go to one slate, as on the board. The medallion pictures
     are in sub-deck-colors.js. Kept in step with LOOKS in index.html
     (test-group-looks.js checks). */
  var ANIMAL_HEX = ["C9481E", "6E4630", "D08207", "A9722B"];
  var COLOR_LOOK = {
    card: ["C62828", "1F5FAE", "9A7300", "2E7D32", "6B4FA0", "C2560F"],
    tint: ["FDE4E2", "E1ECFA", "FFF4CC", "E2F2E3", "EEE8F7", "FCE8D9"],
    station: "34424F"
  };

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

  /* box (v141, a card of another size): { right, bottom } in place of the
     approved card's NAMES_RIGHT and NAMES_BOTTOM */
  function layoutNames(names, measure, box) {
    var right = box ? box.right : NAMES_RIGHT, bottom = box ? box.bottom : NAMES_BOTTOM;
    for (var t = 0; t < TIERS.length; t++) {
      var tier = TIERS[t], chips = [], x = 0, y = 0, fits = true;
      for (var i = 0; i < names.length; i++) {
        var w = Math.min(right - NAMES_DX, measure(names[i], tier.sz) + 2 * tier.pad);
        if (x > 0 && x + w > right - NAMES_DX) { x = 0; y += tier.h + tier.gap; }
        chips.push({ name: names[i], x: x, y: y, w: w, h: tier.h, sz: tier.sz });
        x += w + tier.gap;
      }
      if (names.length && NAMES_DY + y + tier.h > bottom) fits = false;
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

  function labelXml(id, x, y, w, text, sz) {
    sz = sz || 2600;
    return '<p:sp><p:nvSpPr><p:cNvPr id="' + id + '" name="Station ' + id + '"></p:cNvPr><p:cNvSpPr txBox="1"/><p:nvPr></p:nvPr></p:nvSpPr>' +
      '<p:spPr><a:xfrm><a:off x="' + x + '" y="' + y + '"/><a:ext cx="' + w + '" cy="' + BAR_H + '"/></a:xfrm>' +
      '<a:prstGeom prst="rect"><a:avLst></a:avLst></a:prstGeom><a:noFill/><a:ln></a:ln></p:spPr>' +
      '<p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="ctr"><a:normAutofit/></a:bodyPr><a:lstStyle/>' +
      '<a:p><a:pPr algn="l" indent="0" marL="0"><a:buNone/></a:pPr><a:r><a:rPr lang="en-US" sz="' + sz + '" b="1" dirty="0">' +
      '<a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>' + RUN_FONT + '</a:rPr><a:t>' + xml(text) + '</a:t></a:r>' +
      '<a:endParaRPr lang="en-US" sz="' + sz + '" dirty="0"/></a:p></p:txBody></p:sp>';
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
              groups:[{ animal, name, names:[...], pages:{stationIndex: "12"} } x4], madeOn,
              look: "animals" | "colors" (v91; absent is animals) } */
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
    var colors = model.look === "colors";
    var stationHex = colors ? [0, 1, 2, 3].map(function () { return COLOR_LOOK.station; }) : STATION_HEX;
    if (colors) {
      var C = opts.colorMedallions || (typeof window !== "undefined" && window.SUB_DECK_COLORS);
      if (!C) throw new Error("The color pictures for the slides did not load.");
      Object.keys(C).forEach(function (k) { files[k] = C[k]; });
    }

    function text(k, fn) { files[k] = { text: fn(T[k].text) }; }

    /* ---- the BOARD layout: title, group names, name chips ---- */
    text("ppt/slideLayouts/slideLayout2.xml", function (s) {
      s = s.split("{{TITLE}}").join(xml(title));
      if (colors) ANIMAL_HEX.forEach(function (h, i) { s = s.split('val="' + h + '"').join('val="' + COLOR_LOOK.card[i] + '"'); });
      var chips = "", id = 1000;
      groups.forEach(function (g, i) {
        s = s.split("{{G" + i + "}}").join(xml(g.name));
        var lay = layoutNames(g.names, measure);
        if (!lay.fits) warnings.push(g.name + " has more names than fit on its card; some run past the bottom.");
        lay.chips.forEach(function (c) { chips += chipXml(id++, c, CARD[i][0], CARD[i][1], colors ? COLOR_LOOK.tint[i] : (TINTS[g.animal] || TINTS.fox)); });
      });
      return s.replace("<!--NAMES-->", chips);
    });

    /* ---- each rotation: labels, page boxes, notes ---- */
    for (var r = 0; r < 4; r++) {
      (function (r) {
        text("ppt/slides/slide" + (r + 1) + ".xml", function (s) {
          if (colors) STATION_HEX.forEach(function (h) { s = s.split('val="' + h + '"').join('val="' + COLOR_LOOK.station + '"'); });
          var out = "", id = 2000;
          for (var c = 0; c < 4; c++) {
            var st = (c + r) % 4, bx = BAR[c][0], by = BAR[c][1];
            var hasPage = !!pageSt[st];
            out += labelXml(id++, bx + LABEL_DX, by, hasPage ? LABEL_W_PAGE : LABEL_W, stations[st]);
            if (hasPage) {
              var v = groups[c].pages && groups[c].pages[st] != null ? String(groups[c].pages[st]).trim() : "";
              out += pageXml(id++, bx + PAGE_DX, by + PAGE_DY, stationHex[st], v);
            }
          }
          return s.replace("<!--CORNERS-->", out);
        });
        text("ppt/notesSlides/notesSlide" + (r + 1) + ".xml", function (s) {
          var lines = ["ROTATION " + (r + 1) + " OF 4 \u2014 for the substitute", "",
            "Each group keeps the same corner of the screen. Only the " + (colors ? "station" : "colored") + " bar changes.", ""];
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

  /* ---------- v141: any board ----------
     The approved deck is four cards in four corners with each look's own
     pictures. A board with another number of groups, or with a picture or
     colour of its own, gets a deck drawn from the same parts: the template's
     master, theme, title, "Next rotation" button and notes, its card, bar,
     label, page box and chip shapes at the approved sizes, laid out two or
     three across, one slide per rotation. The page supplies the pictures as
     PNGs (model.png: { medallions:[b64 x n], stations:[b64 x n] }): each
     medallion as the board draws it, each station icon in white.
     model adds: n, groups[i].color/.tint (hex), stationHex[n], start[i] (the
     station group i is at now; slide r puts it at (start + r) % n). */
  var SLIDE_W = 12192000, MARGIN_X = 384048, TOP = 841248, BOTTOM_PAD = 329184, GAP_X = 201168, GAP_Y = 164592;
  function cardsFor(n) {
    var cols = n <= 3 ? n : n === 4 ? 2 : 3, rows = Math.ceil(n / cols);
    var w = Math.floor((SLIDE_W - 2 * MARGIN_X - (cols - 1) * GAP_X) / cols);
    var h = Math.floor((6858000 - TOP - BOTTOM_PAD - (rows - 1) * GAP_Y) / rows);
    var out = [];
    for (var i = 0; i < n; i++) {
      var c = i % cols, r = Math.floor(i / cols);
      out.push({ x: MARGIN_X + c * (w + GAP_X), y: TOP + r * (h + GAP_Y), w: w, h: h });
    }
    return { cards: out, cols: cols };
  }
  function hex(h) { return String(h || "").replace(/^#/, "").toUpperCase(); }
  function spTree(head, body) { return head + body + "</p:spTree>"; }
  function picXml(id, rid, x, y, size, name) {
    return '<p:pic><p:nvPicPr><p:cNvPr id="' + id + '" name="' + name + '"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>' +
      '<p:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>' +
      '<p:spPr><a:xfrm><a:off x="' + x + '" y="' + y + '"/><a:ext cx="' + size + '" cy="' + size + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>';
  }
  function shapeXml(id, name, x, y, w, h, geom, adj, fillHex, lnW, lnHex, dash) {
    return '<p:sp><p:nvSpPr><p:cNvPr id="' + id + '" name="' + name + '"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>' +
      '<a:xfrm><a:off x="' + x + '" y="' + y + '"/><a:ext cx="' + w + '" cy="' + h + '"/></a:xfrm>' +
      '<a:prstGeom prst="' + geom + '"><a:avLst>' + (adj != null ? '<a:gd name="adj" fmla="val ' + adj + '"/>' : "") + '</a:avLst></a:prstGeom>' +
      (fillHex ? '<a:solidFill><a:srgbClr val="' + fillHex + '"/></a:solidFill>' : "<a:noFill/>") +
      '<a:ln w="' + lnW + '"><a:solidFill><a:srgbClr val="' + lnHex + '"/></a:solidFill>' + (dash ? '<a:prstDash val="dash"/>' : "") + "</a:ln></p:spPr></p:sp>";
  }
  function nameXml(id, x, y, w, h, text, colorHex, sz) {
    return '<p:sp><p:nvSpPr><p:cNvPr id="' + id + '" name="Group ' + id + '"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr>' +
      '<a:xfrm><a:off x="' + x + '" y="' + y + '"/><a:ext cx="' + w + '" cy="' + h + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln/></p:spPr>' +
      '<p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="ctr"><a:normAutofit/></a:bodyPr><a:lstStyle/>' +
      '<a:p><a:pPr algn="l" indent="0" marL="0"><a:buNone/></a:pPr><a:r><a:rPr lang="en-US" sz="' + sz + '" b="1" dirty="0"><a:solidFill><a:srgbClr val="' + colorHex + '"/></a:solidFill>' +
      RUN_FONT + '</a:rPr><a:t>' + xml(text) + '</a:t></a:r><a:endParaRPr lang="en-US" sz="' + sz + '" dirty="0"/></a:p></p:txBody></p:sp>';
  }
  var REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/";
  function rels(list) {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      list.map(function (r) { return '<Relationship Id="' + r[0] + '" Type="' + REL + r[1] + '" Target="' + r[2] + '"/>'; }).join("") + "</Relationships>";
  }
  function fillGeneral(model, opts) {
    opts = opts || {};
    var T = opts.template || (typeof window !== "undefined" && window.SUB_DECK_TEMPLATE);
    if (!T) throw new Error("The slide template did not load.");
    var png = model.png;
    if (!png || !png.medallions || !png.stations) throw new Error("The pictures for the slides were not made.");
    var measure = opts.measure || defaultMeasure;
    var groups = model.groups, n = groups.length, title = model.title || "Math Groups";
    var stations = model.stations, pageSt = model.pageStations || [];
    var start = model.start || groups.map(function (_, i) { return i; });
    var lay = cardsFor(n), three = lay.cols === 3;
    var files = {}, warnings = [];
    /* everything but the slides, their notes and the template's pictures */
    Object.keys(T).forEach(function (k) {
      if (/^ppt\/(slides|notesSlides)\//.test(k) || /^ppt\/media\//.test(k)) return;
      files[k] = T[k];
    });
    for (var i = 0; i < n; i++) {
      files["ppt/media/med-" + (i + 1) + ".png"] = { b64: png.medallions[i] };
      files["ppt/media/st-" + (i + 1) + ".png"] = { b64: png.stations[i] };
    }
    function text(k, fn) { files[k] = { text: fn(T[k].text) }; }

    /* ---- the BOARD layout: the title, then n cards ---- */
    text("ppt/slideLayouts/slideLayout2.xml", function (s) {
      var a = s.indexOf("<p:spTree>"), b = s.indexOf("</p:spTree>");
      var tree = s.slice(a, b), head = tree.slice(0, tree.indexOf("<p:sp>"));
      var titleSp = tree.slice(tree.indexOf("<p:sp>"), tree.indexOf("</p:sp>") + 7).split("{{TITLE}}").join(xml(title));
      var body = titleSp, id = 100, chipId = 1000;
      groups.forEach(function (g, i) {
        var c = lay.cards[i], col = hex(g.color), nameSz = three ? 3200 : 4000;
        body += shapeXml(id++, "Card " + (i + 1), c.x, c.y, c.w, c.h, "roundRect", 4636, "FFFFFF", 38100, col);
        body += picXml(id++, "rId" + (i + 1), c.x + 182880, c.y + 128016, 841248, "Picture " + (i + 1));
        body += nameXml(id++, c.x + 1152144, c.y + 128016, c.w - 1152144 - 182880, 841248, g.name, col, nameSz);
        body += shapeXml(id++, "Rule " + (i + 1), c.x + 182880, c.y + 1847088, c.w - 365760, 0, "line", null, null, 15875, "CBD6E0", true);
        var box = { right: c.w - 182880, bottom: c.h - 27432 };
        var ln = layoutNames(g.names, measure, box);
        if (!ln.fits) warnings.push(g.name + " has more names than fit on its card; some run past the bottom.");
        ln.chips.forEach(function (ch) { body += chipXml(chipId++, ch, c.x, c.y, hex(g.tint)); });
      });
      return s.slice(0, a) + spTree(head, body) + s.slice(b + "</p:spTree>".length);
    });
    var lrel = []; for (var q = 0; q < n; q++) lrel.push(["rId" + (q + 1), "image", "../media/med-" + (q + 1) + ".png"]);
    lrel.push(["rId" + (n + 1), "slideMaster", "../slideMasters/slideMaster1.xml"]);
    files["ppt/slideLayouts/_rels/slideLayout2.xml.rels"] = { text: rels(lrel) };

    /* ---- one slide per rotation ---- */
    var S1 = T["ppt/slides/slide1.xml"].text, sa = S1.indexOf("<p:spTree>"), sb = S1.indexOf("</p:spTree>");
    var stree = S1.slice(sa, sb), shead = stree.slice(0, stree.indexOf("<p:sp>"));
    var parts = stree.slice(stree.indexOf("<p:sp>")).split(/(?=<p:sp>|<p:pic>)/);
    var rotSp = parts[0], nextSp = parts[1];
    var N1 = T["ppt/notesSlides/notesSlide1.xml"].text;
    for (var r = 0; r < n; r++) {
      var body = rotSp.replace("Rotation 1 of 4", "Rotation " + (r + 1) + " of " + n) + nextSp, id = 2000;
      for (var c = 0; c < n; c++) {
        var cd = lay.cards[c], st = (start[c] + r) % n, bx = cd.x + 182880, by = cd.y + 1060704, bw = cd.w - 365760;
        var stHex = hex(model.stationHex[st]), hasPage = !!pageSt[st];
        body += shapeXml(id++, "Station bar " + (c + 1), bx, by, bw, BAR_H, "roundRect", 13158, stHex, 12700, stHex);
        body += picXml(id++, "rId" + (st + 2), bx + 164592, by + 137160, 420624, "Station icon " + (c + 1));
        var lw = hasPage ? bw - 694944 - PAGE_W - 164592 : bw - 694944 - 146304;
        body += labelXml(id++, bx + LABEL_DX, by, lw, stations[st], three ? 2000 : 2600);
        if (hasPage) {
          var v = groups[c].pages && groups[c].pages[st] != null ? String(groups[c].pages[st]).trim() : "";
          body += pageXml(id++, bx + bw - PAGE_W - 109728, by + PAGE_DY, stHex, v);
        }
      }
      files["ppt/slides/slide" + (r + 1) + ".xml"] = { text: S1.slice(0, sa).replace('name="Slide 1"', 'name="Slide ' + (r + 1) + '"') + spTree(shead, body) + S1.slice(sb + "</p:spTree>".length) };
      var srel = [["rId1", "slide", "slide" + ((r + 1) % n + 1) + ".xml"]];
      for (var k = 0; k < n; k++) srel.push(["rId" + (k + 2), "image", "../media/st-" + (k + 1) + ".png"]);
      srel.push(["rId" + (n + 2), "slideLayout", "../slideLayouts/slideLayout2.xml"]);
      srel.push(["rId" + (n + 3), "notesSlide", "../notesSlides/notesSlide" + (r + 1) + ".xml"]);
      files["ppt/slides/_rels/slide" + (r + 1) + ".xml.rels"] = { text: rels(srel) };
      var lines = ["ROTATION " + (r + 1) + " OF " + n + " \u2014 for the substitute", "",
        "Each group keeps the same place on the screen. Only the station bar changes.", ""];
      for (var c2 = 0; c2 < n; c2++) {
        var st2 = (start[c2] + r) % n;
        var pg = pageSt[st2] && groups[c2].pages && String(groups[c2].pages[st2] || "").trim();
        lines.push("  " + groups[c2].name + " \u2192 " + stations[st2] + (pg ? " (page " + pg + ")" : ""));
      }
      lines.push("", "To move everyone on: click \u201cNext rotation\u201d or press the right arrow key. After Rotation " + n + " it loops back to Rotation 1.",
        "", "Present the deck (Slideshow) so students see only the board.", "",
        "TEACHER \u2014 this deck was made from the Groups tool" + (model.madeOn ? " on " + model.madeOn : "") +
        ". To change names, groups or page numbers, change them there and download a fresh copy. " +
        "For a quick fix in this deck: click a PAGE box to type a page, or use Slide > Edit theme to change names once on the BOARD layout.");
      files["ppt/notesSlides/notesSlide" + (r + 1) + ".xml"] = { text: N1.replace(/<a:p>(?:(?!<a:p>)[\s\S])*?\{\{NOTES\}\}[\s\S]*?<\/a:p>/, notesParas(lines)) };
      files["ppt/notesSlides/_rels/notesSlide" + (r + 1) + ".xml.rels"] = { text: rels([["rId1", "notesMaster", "../notesMasters/notesMaster1.xml"], ["rId2", "slide", "../slides/slide" + (r + 1) + ".xml"]]) };
    }

    /* ---- the package's lists of slides ---- */
    text("ppt/presentation.xml", function (s) {
      var ids = ""; for (var k = 0; k < n; k++) ids += '<p:sldId id="' + (256 + k) + '" r:id="rIdS' + (k + 1) + '"/>';
      return s.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, "<p:sldIdLst>" + ids + "</p:sldIdLst>");
    });
    text("ppt/_rels/presentation.xml.rels", function (s) {
      s = s.replace(/<Relationship Id="[^"]+" Type="[^"]+\/slide" Target="slides\/slide\d+\.xml"\/>/g, "");
      var add = ""; for (var k = 0; k < n; k++) add += '<Relationship Id="rIdS' + (k + 1) + '" Type="' + REL + 'slide" Target="slides/slide' + (k + 1) + '.xml"/>';
      return s.replace("</Relationships>", add + "</Relationships>");
    });
    text("[Content_Types].xml", function (s) {
      s = s.replace(/<Override PartName="\/ppt\/(slides\/slide|notesSlides\/notesSlide)\d+\.xml"[^>]*\/>/g, "");
      var add = "";
      for (var k = 1; k <= n; k++) add += '<Override PartName="/ppt/slides/slide' + k + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' +
        '<Override PartName="/ppt/notesSlides/notesSlide' + k + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>';
      return s.replace("</Types>", add + "</Types>");
    });
    text("docProps/app.xml", function (s) {
      var titles = ""; for (var k = 1; k <= n; k++) titles += "<vt:lpstr>Slide " + k + "</vt:lpstr>";
      return s.replace("<Slides>4</Slides>", "<Slides>" + n + "</Slides>").replace("<Notes>4</Notes>", "<Notes>" + n + "</Notes>")
        .replace("<vt:lpstr>Slide Titles</vt:lpstr></vt:variant>\n\t\t\t<vt:variant><vt:i4>4</vt:i4>", "<vt:lpstr>Slide Titles</vt:lpstr></vt:variant>\n\t\t\t<vt:variant><vt:i4>" + n + "</vt:i4>")
        .replace('<vt:vector size="7" baseType="lpstr">', '<vt:vector size="' + (3 + n) + '" baseType="lpstr">')
        .replace(/(<vt:lpstr>Slide \d<\/vt:lpstr>)+/, titles);
    });
    text("docProps/core.xml", function (s) {
      return s.split("{{TITLE}}").join(xml(title)).split("{{NOW}}").join(new Date().toISOString().replace(/\.\d+Z$/, "Z"));
    });
    return { files: files, warnings: warnings };
  }

  function build(model, JSZip, opts) {
    var res = model.general ? fillGeneral(model, opts) : fill(model, opts);
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

  window.SubSlides = { build: build, fill: fill, fillGeneral: fillGeneral, cardsFor: cardsFor, layoutNames: layoutNames };
})();

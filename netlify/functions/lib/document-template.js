// ═══════════════════════════════════════════════════════════════
// Meridian International — Shared Document Template Module
// Used by ALL engagement documents (Consultation Summary Note,
// Engagement Letter, Trade Compliance Advisory, etc.)
// Import this module rather than rebuilding styling per-document.
// ═══════════════════════════════════════════════════════════════

const docx = require('docx');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, Footer, Header,
  PageNumber, ShadingType, convertInchesToTwip, UnderlineType, TabStopType
} = docx;

// Edition Two (Sept 2026), from the Meridian design system tokens: ink, bronze and paper.
// Key names are kept from the original template so every document builder keeps working:
// GOLD now carries bronze (the one accent) and TEAL carries the status green used for
// "Verified". SLATE is ink-muted, STONE a lighter muted tone for small print.
const COLORS = {
  INK: "1F1B17", GOLD: "86632F", BRONZE: "86632F", SLATE: "57524B", STONE: "6E675D",
  BORDER: "DFDBD3", WHITE: "FFFFFF", LIGHT_BG: "FAF9F6", TEAL: "2E6A5E"
};
// EB Garamond is the brand serif, but a .docx only renders fonts installed on the reader's
// machine. "Garamond" ships with Microsoft Office on Windows and Mac, so it is the closest
// safe choice; Word falls back to its own serif if it is missing.
const FONTS = { SERIF: "Garamond", SANS: "Arial", MONO: "Courier New" };

const U = 80;
const g = (n) => n * U; // spacing grid unit — 4pt per unit, never hardcode raw twips elsewhere

const MARGINS = {
  ML: convertInchesToTwip(1.15), MR: convertInchesToTwip(1.15),
  MT: convertInchesToTwip(0.75), MB: convertInchesToTwip(0.85)
};
const PAGE_W = 11906;
const CONTENT_W = PAGE_W - MARGINS.ML - MARGINS.MR;

function rule(color = COLORS.GOLD, size = 4, b = 0, a = 0) {
  return new Paragraph({ spacing: { before: g(b), after: g(a) },
    border: { bottom: { style: BorderStyle.SINGLE, size, color, space: 1 } }, children: [] });
}
function docTitle(t) {
  return new Paragraph({ spacing: { before: g(6), after: g(2) },
    children: [new TextRun({ text: t, font: FONTS.SERIF, size: 32, color: COLORS.INK, characterSpacing: 20 })] });
}
function meta(l, v) {
  return new Paragraph({ spacing: { before: 0, after: g(2) },
    tabStops: [{ type: TabStopType.LEFT, position: convertInchesToTwip(1.5) }],
    children: [
      new TextRun({ text: l, font: FONTS.SANS, size: 14, color: COLORS.STONE }),
      new TextRun({ text: "\t" }),
      new TextRun({ text: v, font: FONTS.SANS, size: 16, color: COLORS.INK }),
    ] });
}
function section(num, title) {
  return new Paragraph({ spacing: { before: g(9), after: g(4) },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: COLORS.BORDER, space: 4 } },
    children: [
      new TextRun({ text: num, font: FONTS.MONO, size: 15, color: COLORS.GOLD }),
      new TextRun({ text: "    ", font: FONTS.SANS, size: 15 }),
      new TextRun({ text: title, font: FONTS.SERIF, size: 24, color: COLORS.INK }),
    ] });
}
function subHead(t) {
  return new Paragraph({ spacing: { before: g(6), after: g(2) },
    children: [new TextRun({ text: t, font: FONTS.SANS, size: 17, color: COLORS.INK, bold: true })] });
}
function body(t) {
  return new Paragraph({ spacing: { before: 0, after: g(4), line: 264 }, alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text: t, font: FONTS.SANS, size: 18, color: COLORS.INK })] });
}
function spacer(n) { return new Paragraph({ spacing: { before: 0, after: g(n) }, children: [] }); }

// ── Citation line — sits directly under a compliance claim ──
// status: 'verified' | 'unverified'
function citation(sourceName, url, dateRetrieved, status = 'verified') {
  const label = status === 'verified' ? 'SOURCE' : 'UNVERIFIED';
  const labelColor = status === 'verified' ? COLORS.TEAL : COLORS.GOLD;
  const text = status === 'verified'
    ? `${sourceName} — ${url}  ·  accessed ${dateRetrieved}`
    : `Not confirmed from a primary source as of ${dateRetrieved} — verify before client issue`;
  return new Paragraph({
    spacing: { before: 0, after: g(4) },
    indent: { left: g(2) },
    children: [
      new TextRun({ text: label + "  ", font: FONTS.MONO, size: 13, color: labelColor, bold: true }),
      new TextRun({ text: text, font: FONTS.SANS, size: 13, color: COLORS.STONE, italics: true }),
    ],
  });
}

// ── Sources Verified table — closes any section citing external facts ──
function sourcesTable(rows) {
  // rows: [claim, source, url, dateRetrieved, status]
  const widths = [Math.round(CONTENT_W*0.30), Math.round(CONTENT_W*0.18), Math.round(CONTENT_W*0.28), Math.round(CONTENT_W*0.12), Math.round(CONTENT_W*0.12)];
  const headers = ["Claim", "Source", "URL", "Accessed", "Status"];
  const hdr = new TableRow({ tableHeader: true, children: headers.map((h,i) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: COLORS.INK },
    margins: { top: g(1), bottom: g(1), left: g(1), right: g(1) },
    children: [new Paragraph({ children: [new TextRun({ text: h, font: FONTS.SANS, size: 12, color: COLORS.WHITE, bold: true })] })],
  }))});
  const dataRows = rows.map((r, ri) => new TableRow({ children: r.map((c, i) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: ri % 2 === 0 ? COLORS.WHITE : COLORS.LIGHT_BG },
    margins: { top: g(1), bottom: g(1), left: g(1), right: g(1) },
    borders: { top: {style:BorderStyle.NONE}, bottom: {style:BorderStyle.SINGLE, size:1, color:COLORS.BORDER}, left:{style:BorderStyle.NONE}, right:{style:BorderStyle.NONE} },
    children: [new Paragraph({ children: [new TextRun({
      text: c, font: i === 4 ? FONTS.MONO : FONTS.SANS, size: 12,
      color: i === 4 ? (c === 'Verified' ? COLORS.TEAL : COLORS.GOLD) : COLORS.INK,
      bold: i === 4,
    })] })],
  }))}));
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths,
    borders: { top:{style:BorderStyle.SINGLE,size:1,color:COLORS.BORDER}, bottom:{style:BorderStyle.SINGLE,size:1,color:COLORS.BORDER}, left:{style:BorderStyle.NONE}, right:{style:BorderStyle.NONE}, insideHorizontal:{style:BorderStyle.SINGLE,size:1,color:COLORS.BORDER}, insideVertical:{style:BorderStyle.NONE} },
    rows: [hdr, ...dataRows] });
}

function summaryTable(rows) {
  const C1 = Math.round(CONTENT_W*0.55), C2 = CONTENT_W - C1;
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [C1, C2],
    borders: { top:{style:BorderStyle.NONE}, bottom:{style:BorderStyle.NONE}, left:{style:BorderStyle.NONE}, right:{style:BorderStyle.NONE}, insideHorizontal:{style:BorderStyle.NONE}, insideVertical:{style:BorderStyle.NONE} },
    rows: rows.map(([label, value]) => new TableRow({ children: [
      new TableCell({ width: { size: C1, type: WidthType.DXA }, margins: { top: g(2), bottom: g(2), left: 0, right: g(2) },
        borders: { top:{style:BorderStyle.NONE}, bottom:{style:BorderStyle.SINGLE,size:1,color:COLORS.BORDER}, left:{style:BorderStyle.NONE}, right:{style:BorderStyle.NONE} },
        children: [new Paragraph({ children: [new TextRun({ text: label, font: FONTS.SANS, size: 17, color: COLORS.SLATE })] })] }),
      new TableCell({ width: { size: C2, type: WidthType.DXA }, margins: { top: g(2), bottom: g(2), left: g(2), right: 0 },
        borders: { top:{style:BorderStyle.NONE}, bottom:{style:BorderStyle.SINGLE,size:1,color:COLORS.BORDER}, left:{style:BorderStyle.NONE}, right:{style:BorderStyle.NONE} },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: value, font: FONTS.SANS, size: 17, color: COLORS.INK })] })] }),
    ] })) });
}

function feeTable(rows) {
  const C1 = Math.round(CONTENT_W*0.66), C2 = CONTENT_W - C1;
  const noB = { style: BorderStyle.NONE }, thinB = { style: BorderStyle.SINGLE, size: 1, color: COLORS.BORDER };
  const thickB = { style: BorderStyle.SINGLE, size: 6, color: COLORS.INK }, dblB = { style: BorderStyle.DOUBLE, size: 4, color: COLORS.INK };
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [C1, C2],
    borders: { top:noB, bottom:noB, left:noB, right:noB, insideHorizontal:noB, insideVertical:noB },
    rows: rows.map(([label, amount, type]) => {
      const isHeader = type==='header', isSub = type==='subtotal', isTotal = type==='total', isSpacer = type==='spacer';
      if (isSpacer) return new TableRow({ children: [new TableCell({ columnSpan: 2, borders: {top:noB,bottom:noB,left:noB,right:noB}, children: [spacer(3)] })] });
      const fill = isHeader ? COLORS.INK : COLORS.WHITE;
      const lblClr = isHeader ? COLORS.WHITE : COLORS.INK, amtClr = isHeader ? COLORS.WHITE : COLORS.SLATE;
      const bold = isHeader || isTotal || isSub;
      const top = isTotal ? dblB : noB, bot = isTotal ? thickB : isSub ? thinB : noB;
      return new TableRow({ children: [
        new TableCell({ width:{size:C1,type:WidthType.DXA}, shading:{type:ShadingType.CLEAR,fill}, margins:{top:g(2),bottom:g(2),left:0,right:g(2)}, borders:{top,bottom:bot,left:noB,right:noB},
          children:[new Paragraph({children:[new TextRun({text:label,font:FONTS.SANS,size:16,color:lblClr,bold})]})] }),
        new TableCell({ width:{size:C2,type:WidthType.DXA}, shading:{type:ShadingType.CLEAR,fill}, margins:{top:g(2),bottom:g(2),left:g(2),right:0}, borders:{top,bottom:bot,left:noB,right:noB},
          children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({text:amount,font:FONTS.MONO,size:16,color:amtClr,bold})]})] }),
      ] });
    }) });
}

function serviceList(items) {
  return items.map(([code, desc]) => new Paragraph({ spacing: { before: 0, after: g(3) }, children: [
    new TextRun({ text: code + "   ", font: FONTS.MONO, size: 16, color: COLORS.GOLD }),
    new TextRun({ text: desc, font: FONTS.SANS, size: 17, color: COLORS.INK }),
  ] }));
}
function stepList(items) {
  return items.map((text, i) => new Paragraph({ spacing: { before: 0, after: g(3) }, children: [
    new TextRun({ text: `${i+1}.  `, font: FONTS.MONO, size: 16, color: COLORS.GOLD }),
    new TextRun({ text, font: FONTS.SANS, size: 18, color: COLORS.INK }),
  ] }));
}
function signOff(name, title, entity, date, email) {
  return [
    rule(COLORS.BORDER, 2, 13, 5),
    new Paragraph({ spacing:{before:0,after:0}, children:[new TextRun({text:name,font:FONTS.SANS,size:20,color:COLORS.INK,bold:true})] }),
    new Paragraph({ spacing:{before:g(1),after:0}, children:[new TextRun({text:title,font:FONTS.SANS,size:16,color:COLORS.SLATE})] }),
    new Paragraph({ spacing:{before:0,after:0}, children:[new TextRun({text:entity+"  ·  Hong Kong SAR",font:FONTS.SANS,size:16,color:COLORS.SLATE})] }),
    new Paragraph({ spacing:{before:0,after:0}, children:[new TextRun({text:date,font:FONTS.SANS,size:16,color:COLORS.SLATE})] }),
    new Paragraph({ spacing:{before:0,after:0}, children:[new TextRun({text:email,font:FONTS.SANS,size:16,color:COLORS.GOLD,underline:{type:UnderlineType.SINGLE,color:COLORS.GOLD}})] }),
  ];
}
function buildHeader() {
  return new Header({ children: [
    new Paragraph({ spacing:{before:0,after:0}, children: [
      new TextRun({ text:"MERIDIAN", font:FONTS.SERIF, size:24, color:COLORS.INK, bold:true, characterSpacing:90 }),
      new TextRun({ text:"  ", font:FONTS.SANS, size:10 }),
      new TextRun({ text:"INTERNATIONAL", font:FONTS.SERIF, size:24, color:COLORS.GOLD, characterSpacing:90 }),
    ] }),
    new Paragraph({ spacing:{before:g(2),after:0}, children:[new TextRun({
      text:"Meridian Capital Holdings Limited  ·  BR 76904892  ·  Hong Kong SAR  ·  enquiries@meridianinternational.io",
      font:FONTS.SANS, size:13, color:COLORS.STONE })] }),
    rule(COLORS.GOLD, 4, 2, 0),
  ] });
}
function buildFooter(docRef) {
  return new Footer({ children: [
    rule(COLORS.BORDER, 2, 0, 2),
    new Paragraph({ spacing:{before:0,after:g(1)}, children:[new TextRun({
      text:"Meridian Capital Holdings Limited, trading as Meridian International, provides commercial and compliance support. It is not a law firm and does not provide legal, customs brokerage or tax advice.",
      font:FONTS.SANS, size:13, color:COLORS.STONE, italics:true })] }),
    new Paragraph({ children: [
      new TextRun({ text: docRef + "  ·  Page ", font:FONTS.SANS, size:13, color:COLORS.STONE }),
      new TextRun({ children:[PageNumber.CURRENT], font:FONTS.SANS, size:13, color:COLORS.STONE }),
    ] }),
  ] });
}

module.exports = {
  docx, Document, Packer, Paragraph, TextRun,
  COLORS, FONTS, U, g, MARGINS, CONTENT_W,
  rule, docTitle, meta, section, subHead, body, spacer,
  citation, sourcesTable, summaryTable, feeTable, serviceList, stepList,
  signOff, buildHeader, buildFooter,
};

// HTML and print CSS for the synthetic Arabic tender document ILRA/RD/2026/042. Pure functions:
// content in, HTML out. Right to left, A4.
//
// Modes:
//   'measure' lays every page out on screen at the printable width and reports its height, so
//             build.mjs can name the page that would overflow.
//   'scan'    prints only the three scanned pages, full bleed, as a photocopied sheet: grey paper,
//             a slight rotation, speckles, stamps and a signature. build.mjs rasterises that PDF.
//   'print'   prints the whole document; the scanned pages are the rasterised images, so they have
//             no text layer.
// Times New Roman (body) and Arial (headings, tables) carry Arabic glyphs on macOS, and pdftotext
// reads both back in logical order. Geeza Pro and Al Nile came back with broken ligatures.

const PAGE_H_MM = 297 - 20 - 22; // A4 minus the top and bottom @page margins
const PAGE_W_MM = 210 - 18 - 18;
const BODY_PT = 12.5; // body text size; verify.mjs checks the printed line pitch against it
const LEADING = 1.5;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// A fictional emblem: a road running to the horizon under a bridge arch. Not a national emblem.
const DEVICE = (cls = 'device') => `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true">
  <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="3"/>
  <circle cx="50" cy="50" r="40.5" fill="none" stroke="currentColor" stroke-width="0.8"/>
  <path d="M22 58 Q 50 26 78 58" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linecap="round"/>
  <path d="M30 58 L30 50 M40 58 L40 43 M60 58 L60 43 M70 58 L70 50" stroke="currentColor" stroke-width="1.6"/>
  <path d="M19 59 H81" stroke="currentColor" stroke-width="2.4"/>
  <path d="M46 61 L34 84 H66 L54 61 Z" fill="currentColor"/>
  <path d="M50 64 V68 M50 72 V76.5 M50 80 V84" stroke="#fff" stroke-width="1.6"/>
</svg>`;

// ---------------------------------------------------------------------------
// Digits. Text pages use Western digits; the scanned pages use Eastern Arabic digits.

const EASTERN = '٠١٢٣٤٥٦٧٨٩';
/** Western to Eastern Arabic digits, with the Arabic thousands and decimal separators. Text only, no tags. */
export const ea = (s) => String(s)
  .replace(/(\d),(?=\d{3})/g, '$1٬')
  .replace(/(\d)\.(?=\d)/g, '$1٫')
  .replace(/\d/g, (d) => EASTERN[Number(d)]);
const qty = (n) => ea(Number(n).toLocaleString('en-US'));

// ---------------------------------------------------------------------------
// CSS

function css(meta, mode) {
  const shared = `
:root { --accent: #7b2332; --accent-soft: #f5ebed; --ink: #1b1b1b; --muted: #505050; --rule: #958a8c; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; color: var(--ink); font-family: 'Times New Roman', Times, serif; font-size: ${BODY_PT}pt; line-height: ${LEADING}; }
.page { display: flow-root; position: relative; }
.body > :first-child { margin-top: 0; }
[dir=ltr] { unicode-bidi: isolate; }
h1, h2, h3, th, .kv th, .cover, .toc, .sign, .closing { font-family: Arial, Helvetica, sans-serif; }
h1.part { font-size: 14pt; color: var(--accent); margin: 0 0 4mm; padding-bottom: 1.8mm; border-bottom: 1.2pt solid var(--accent); }
h2.cl { font-size: 11.5pt; margin: 3.4mm 0 1.2mm; break-after: avoid; }
h2.cl .no { color: var(--accent); }
h3.h { font-size: 11pt; margin: 3mm 0 1.2mm; color: #2a2a2a; break-after: avoid; }
p { margin: 0 0 1.7mm; text-align: justify; }
.sub { display: grid; grid-template-columns: 12mm 1fr; margin: 0 0 1.5mm; text-align: justify; }
.sub .no { color: #333; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; padding-top: 0.6mm; }
ol.list { margin: 0 0 1.7mm; padding: 0 9mm 0 0; list-style: none; }
ol.list > li { position: relative; margin: 0 0 0.8mm; text-align: justify; }
ol.list > li > .mk { position: absolute; right: -9mm; width: 8mm; text-align: right; }
ol.dash > li > .mk { right: -6mm; }
table { border-collapse: collapse; width: 100%; margin: 1mm 0 2.4mm; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.38; }
table.t th, table.t td { border: 0.5pt solid var(--rule); padding: 1mm 1.8mm; vertical-align: top; text-align: start; }
table.t thead th { background: var(--accent-soft); font-size: 9.5pt; font-weight: 700; color: #4a1620; }
table.t td.c, table.t th.c { text-align: center; }
table.t tr.total td { font-weight: 700; border-top: 1pt solid var(--ink); }
table.kv th, table.kv td { padding: 1mm 1.8mm; vertical-align: top; text-align: start; border-bottom: 0.5pt solid #d2c9cb; }
table.kv th { width: 40mm; font-size: 9.5pt; color: #2a2a2a; }
.sign { display: grid; grid-template-columns: 1fr 1fr; gap: 1mm 10mm; margin-top: 4mm; }
.sign div { border-bottom: 0.6pt dotted #444; padding: 4.6mm 0 0.6mm; font-size: 9.5pt; color: #333; }
.letter p { margin-bottom: 2mm; }
.closing { width: 72mm; margin: 8mm auto 0 0; text-align: center; font-size: 10pt; line-height: 1.9; }
.toc td, .toc th { font-size: 10.5pt; }

/* Cover */
.cover { height: ${PAGE_H_MM - 4}mm; border: 1.6pt solid var(--accent); padding: 1.6mm; }
.cover .in { height: 100%; border: 0.5pt solid var(--accent); padding: 12mm 14mm 9mm; display: flex; flex-direction: column; align-items: center; text-align: center; }
.cover .country { font-size: 13pt; font-weight: 700; color: #333; }
.cover .device { width: 27mm; height: 27mm; margin: 7mm 0 5mm; color: var(--accent); }
.cover .issuer { font-size: 19pt; font-weight: 700; color: var(--accent); }
.cover .dept { font-size: 12pt; color: #333; margin-top: 1.2mm; }
.cover .bar { width: 64mm; border-top: 2pt solid var(--accent); border-bottom: 0.6pt solid var(--accent); height: 1.6mm; margin: 8mm 0 7mm; }
.cover .kind { font-size: 17pt; font-weight: 700; color: #222; }
.cover .ref { font-size: 13pt; margin-top: 2mm; letter-spacing: 0.04em; }
.cover .title { margin: 7mm 0 8mm; padding: 5mm 7mm; border: 0.6pt solid var(--rule); background: #faf6f6; font-family: 'Times New Roman', Times, serif; font-size: 16pt; line-height: 1.55; color: #111; }
.cover table.kv { width: 140mm; margin: 0 auto; font-size: 10.5pt; }
.cover table.kv th { width: 34mm; }
.cover .note { margin-top: 5mm; font-size: 10pt; color: #333; font-family: 'Times New Roman', Times, serif; }
.cover .foot { margin-top: auto; font-size: 8.8pt; color: #555; line-height: 1.5; }

/* Watermark: one per page (not position: fixed, which would also print over the scanned pages) */
.wm { position: absolute; inset: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 10; }
.wm .in { transform: rotate(-52deg); text-align: center; white-space: nowrap; font-family: Arial, Helvetica, sans-serif; font-weight: 700; color: rgba(110, 95, 98, 0.12); line-height: 1.5; }
.wm .ar { font-size: 34pt; }
.wm .en { font-size: 22pt; }

/* Scanned sheets: a letterhead and a page number drawn on the sheet */
.sheet { position: relative; width: 210mm; height: 296.6mm; overflow: hidden; }
.sheet .copy { position: absolute; inset: 0; padding: 14mm 18mm 16mm; display: flex; flex-direction: column; }
.lh { display: flex; align-items: center; gap: 4mm; padding-bottom: 2.4mm; border-bottom: 1.2pt double #333; margin-bottom: 6mm; font-family: Arial, Helvetica, sans-serif; }
.lh .device { width: 17mm; height: 17mm; color: #333; }
.lh .names { flex: 1; font-size: 10pt; line-height: 1.45; }
.lh .names b { font-size: 12pt; }
.lh .refbox { font-size: 9pt; text-align: left; line-height: 1.5; }
.sheet .foot { margin-top: auto; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; }
.sheet h1.part { color: #222; border-color: #333; text-align: center; }
.sheet table.t thead th { background: #e9e9e9; color: #222; }
.sheet table.t tr.bill td { background: #efefef; }
.sheet table.boq td { padding: 0.7mm 1.8mm; }
.sheet .form p { margin-bottom: 2.4mm; }
.sheet .dots { display: inline-block; min-width: 46mm; border-bottom: 0.7pt dotted #333; }
.sheet .field { display: grid; grid-template-columns: 44mm 1fr; margin: 0 0 3mm; font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; }
.sheet .field span:last-child { border-bottom: 0.7pt dotted #333; }
.stampwrap { position: relative; }
.stamp { position: absolute; color: rgba(38, 52, 150, 0.78); pointer-events: none; }
.sig { position: absolute; color: rgba(25, 30, 95, 0.85); }
.faded { color: #8a8a8a; }
`;
  if (mode === 'measure') {
    return shared + `
body { width: ${PAGE_W_MM}mm; }
.wm, .stamp, .sig { display: none; }
.page { margin-bottom: 20mm; }
.sheet { width: auto; height: auto; overflow: visible; }
.sheet .copy { position: static; padding: 0; }`;
  }
  const sheetLook = `
@page { size: A4; margin: 0; }
.page + .page { break-before: page; }
/* The photocopy: grey paper, a darker edge, the copy slightly rotated and softened */
.sheet { background: linear-gradient(97deg, #d9d6cf 0, #ecebe6 4mm, #f1f0ec 40%, #eceae4 100%); }
.sheet .copy { transform: rotate(var(--rot)) translate(var(--dx), var(--dy)); transform-origin: 50% 50%; filter: blur(0.35px) contrast(0.92); color: #262626; }
.sheet .speck { position: absolute; inset: 0; }`;
  if (mode === 'scan') return shared + sheetLook;
  return shared + `
@page {
  size: A4;
  margin: 20mm 18mm 22mm;
  @top-right {
    content: "${meta.headerAr}";
    width: ${PAGE_W_MM * 0.7}mm; vertical-align: bottom; padding-bottom: 3mm; border-bottom: 0.6pt solid #7b2332;
    direction: rtl; text-align: right; font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #3d3d3d;
  }
  @top-left {
    content: "${meta.ref}";
    width: ${PAGE_W_MM * 0.3}mm; vertical-align: bottom; padding-bottom: 3mm; border-bottom: 0.6pt solid #7b2332;
    direction: ltr; text-align: left; font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #3d3d3d;
  }
  @bottom-center {
    content: "${meta.footerAr[0]} " counter(page) " ${meta.footerAr[1]} " counter(pages);
    vertical-align: top; padding-top: 5mm; direction: rtl;
    font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #3d3d3d;
  }
}
@page :first { @top-right { content: none; border: none; } @top-left { content: none; border: none; } }
@page scan { margin: 0; @top-right { content: none; border: none; } @top-left { content: none; border: none; } @bottom-center { content: none; } }
.page { height: ${PAGE_H_MM - 0.6}mm; }
.page + .page { break-before: page; }
.page.scanned { page: scan; height: 296.6mm; }
.page.scanned img { display: block; width: 210mm; height: 296.6mm; }
tr, .sub, li { break-inside: avoid; }`;
}

// ---------------------------------------------------------------------------
// Blocks

// Keeps a number and its unit on one line: "(38) كم", "200 مم".
const UNIT = /(\d\)?) (?=(?:كم|مم|م|م2|م3|شهراً|يوماً|ساعة|درجة)(?=[\s،.:)]|$))/g;
const glue = (html) => html.replace(UNIT, '$1&nbsp;');
const ABJAD = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي'];
const marker = (style, i) => (style === 'num' ? `${i + 1}.` : style === 'alpha' ? `(${ABJAD[i]})` : '–');

function block(b, ctx) {
  if (typeof b === 'string') return `<p>${glue(b)}</p>`;
  switch (b.t) {
    case 'p': return `<p>${glue(b.html)}</p>`;
    case 'part': return `<h1 class="part">${b.title}</h1>`;
    case 'clause': return `<h2 class="cl"><span class="no">البند (${b.no}):</span> ${b.title}</h2>`;
    case 'h': return `<h3 class="h">${b.html}</h3>`;
    case 'sub': return `<div class="sub"><span class="no">${b.no}</span><div>${glue(b.html)}</div></div>`;
    case 'list': return `<ol class="list ${b.style}">${b.items.map((it, i) => `<li><span class="mk">${marker(b.style, i)}</span>${glue(it)}</li>`).join('')}</ol>`;
    case 'kv': return `<table class="kv"><tbody>${b.rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</tbody></table>`;
    case 'table': return table(b);
    case 'sign': return `<div class="sign">${b.fields.map((f) => `<div>${f}</div>`).join('')}</div>`;
    case 'letter': return `<div class="letter">${b.blocks.map((x) => block(x, ctx)).join('')}</div>`;
    case 'closing': return `<div class="closing">${b.lines.join('<br>')}</div>`;
    case 'cover': return cover(ctx.meta);
    case 'contents': return contents(ctx);
    case 'scan-boq': return scanBoq(ctx);
    case 'scan-visit': return scanVisit(ctx);
    case 'scan-bond': return scanBond(ctx);
    default: throw new Error(`Unknown block type: ${b.t}`);
  }
}

function table(b) {
  const cols = b.widths ? `<colgroup>${b.widths.map((w) => `<col style="width:${w}">`).join('')}</colgroup>` : '';
  const align = (i) => (b.align && b.align[i] ? ` class="${b.align[i]}"` : '');
  const head = b.head ? `<thead><tr>${b.head.map((h, i) => `<th${align(i)}>${h}</th>`).join('')}</tr></thead>` : '';
  const rows = b.rows.map((r) => {
    const cells = Array.isArray(r) ? r : r.cells;
    return `<tr${Array.isArray(r) ? '' : ` class="${r.cls || ''}"`}>${cells.map((c, i) => `<td${align(i)}>${c}</td>`).join('')}</tr>`;
  });
  return `<table class="t ${b.cls || ''}">${cols}${head}<tbody>${rows.join('')}</tbody></table>`;
}

function cover(m) {
  return `<div class="cover"><div class="in">
  <div class="country">${m.country}</div>
  ${DEVICE()}
  <div class="issuer">${m.issuer}</div>
  <div class="dept">${m.department}</div>
  <div class="bar"></div>
  <div class="kind">${m.kind}</div>
  <div class="ref" dir="ltr">${m.ref}</div>
  <div class="title">${m.title}</div>
  <table class="kv"><tbody>${m.cover.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</tbody></table>
  <div class="note">${m.coverNote}</div>
  <div class="foot">${m.disclaimerAr}<br><span dir="ltr">${m.disclaimerEn}</span></div>
</div></div>`;
}

function contents({ parts, pages }) {
  const first = (id) => pages.find((p) => p.part === id)?.n;
  const rows = parts.map((p) => `<tr><td>${p.title}</td><td class="c">${p.clauses ? `<span dir="ltr">${p.clauses}</span>` : '–'}</td><td class="c">${first(p.id)}</td></tr>`);
  return `<table class="t toc"><colgroup><col><col style="width:26mm"><col style="width:18mm"></colgroup>
<thead><tr><th>القسم أو الملحق</th><th class="c">البنود</th><th class="c">الصفحة</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

// ---------------------------------------------------------------------------
// The three scanned pages. Each is a sheet with the Authority's letterhead, Eastern Arabic digits,
// the tender committee's stamp, and a hand-numbered page. In 'measure' mode the look is off.

function mulberry(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function specks(seed) {
  const r = mulberry(seed);
  const dots = [];
  for (let i = 0; i < 170; i++) {
    const x = (r() * 206 + 2).toFixed(1);
    const y = (r() * 293 + 2).toFixed(1);
    const rad = (0.06 + r() * r() * 0.32).toFixed(2);
    dots.push(`<circle cx="${x}" cy="${y}" r="${rad}" fill="rgba(20,20,20,${(0.25 + r() * 0.4).toFixed(2)})"/>`);
  }
  // Two faint copier streaks
  const s1 = (40 + r() * 120).toFixed(1);
  const s2 = (20 + r() * 160).toFixed(1);
  return `<svg class="speck" viewBox="0 0 210 297" preserveAspectRatio="none" aria-hidden="true">${dots.join('')}
<rect x="${s1}" y="0" width="0.35" height="297" fill="rgba(60,60,60,0.09)"/><rect x="${s2}" y="0" width="0.2" height="297" fill="rgba(60,60,60,0.07)"/></svg>`;
}

/** The tender committee's round stamp: two rings and straight lines of text (Chrome does not lay
 *  Arabic out along a curved path). Drawn only in the 'scan' pass, so it ends up in the image. */
function stamp(id, { size = 36, rot = -12, date = '', pos = '', dense = false } = {}) {
  // A dense stamp is inked heavily, with a smudged centre, so the figures under it are hard to read.
  const smudge = dense ? '<circle cx="50" cy="50" r="40" fill="currentColor" opacity="0.2"/><circle cx="45" cy="54" r="22" fill="currentColor" opacity="0.2"/>' : '';
  return `<svg class="stamp" data-stamp="${id}" style="width:${size}mm;height:${size}mm;transform:rotate(${rot}deg);${pos}" viewBox="0 0 100 100" aria-hidden="true">${smudge}
  <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" stroke-width="2.8"/>
  <circle cx="50" cy="50" r="42.5" fill="none" stroke="currentColor" stroke-width="1"/>
  <path d="M14 36 H86 M14 66 H86" stroke="currentColor" stroke-width="1"/>
  <text x="50" y="30" text-anchor="middle" font-family="Arial" font-size="8.6" font-weight="700" fill="currentColor">هيئة طرق الربط الداخلي</text>
  <text x="50" y="50" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="currentColor">لجنة المناقصات</text>
  <text x="50" y="61" text-anchor="middle" font-family="Arial" font-size="9" fill="currentColor">صحار</text>
  <text x="50" y="78" text-anchor="middle" font-family="Arial" font-size="8.4" fill="currentColor">${date}</text>
</svg>`;
}

const signature = (pos) => `<svg class="sig" viewBox="0 0 120 40" aria-hidden="true" style="width:34mm;height:12mm;${pos}">
  <path d="M6 28 C 14 8, 22 8, 20 26 S 34 34, 40 18 S 52 4, 50 24 C 49 32, 60 30, 66 20 C 70 14, 74 14, 76 22 C 78 30, 90 26, 98 16 C 102 11, 108 12, 114 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M30 33 C 50 30, 80 31, 104 27" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
</svg>`;

function letterhead(m) {
  return `<div class="lh">${DEVICE()}<div class="names"><b>${m.country}</b><br>${m.issuer}<br>${m.department}</div>
<div class="refbox"><span dir="ltr">${m.ref}</span><br>لجنة المناقصات</div></div>`;
}

function sheet(ctx, n, look, inner) {
  const { rot, dx, dy } = look;
  const style = `--rot:${rot}deg;--dx:${dx}mm;--dy:${dy}mm`;
  return `<div class="sheet" style="${style}">${ctx.mode === 'measure' ? '' : specks(n * 7919)}<div class="copy">
${letterhead(ctx.meta)}
${inner}
<div class="foot">– ${ea(n)} –</div>
</div>${ctx.mode === 'measure' ? '' : watermark(ctx.meta)}</div>`;
}

function scanBoq(ctx) {
  const { bills, boq, totalLines } = ctx;
  const rows = [];
  for (const b of bills) {
    const lines = boq.filter((l) => l.summary && l.item.split('.')[0] === String(b.no));
    rows.push(`<tr class="bill"><td class="c">${ea(b.no)}</td><td colspan="3"><b>${b.ar}</b></td></tr>`);
    for (const l of lines) {
      // The stamp sits over the quantities of the two stamped lines (catch 3).
      const stampHere = l.stamped && !rows.some((r) => r.includes('stampwrap'));
      const q = `<span class="${l.stamped ? 'faded' : ''}">${qty(l.qty)}</span>`;
      rows.push(`<tr><td class="c">${ea(l.item)}</td><td>${ea(l.ar)}</td><td class="c">${ea(l.unit)}</td><td class="c${stampHere ? ' stampwrap' : ''}">${q}${stampHere && ctx.mode !== 'measure' ? stamp('boq', { size: 40, rot: -16, date: ea('08/03/2026'), pos: 'top:-12mm;left:-6mm', dense: true }) : ''}</td></tr>`);
    }
  }
  const inner = `<h1 class="part">الملحق (${ea(2)}): ملخص جدول الكميات</h1>
<p>يبين الجدول التالي البنود الرئيسية لجدول الكميات وكمياتها التقديرية، ويسعر المناقص جدول الكميات المفصل (${ea(totalLines)} بنداً) في الملف الإلكتروني المرفق بوثائق المناقصة. والكميات تقديرية، ويعاد قياس الأعمال المنفذة فعلاً.</p>
<table class="t boq"><colgroup><col style="width:13%"><col style="width:55%"><col style="width:14%"><col style="width:18%"></colgroup>
<thead><tr><th class="c">رقم البند</th><th>الوصف</th><th class="c">الوحدة</th><th class="c">الكمية</th></tr></thead>
<tbody>${rows.join('')}</tbody></table>
<p>لا تتضمن هذه الصفحة أي أسعار، وتسعر البنود في جدول الكميات المفصل وحده.</p>`;
  return sheet(ctx, 15, { rot: -0.45, dx: 0.8, dy: 0.6 }, inner);
}

function scanVisit(ctx) {
  const inner = `<h1 class="part">الملحق (${ea(3)}): نموذج شهادة زيارة الموقع</h1>
<div class="form">
<p>المناقصة رقم <span dir="ltr">${ctx.meta.ref}</span>: ${ea(ctx.meta.title)}</p>
<p>تشهد هيئة طرق الربط الداخلي بأن ممثل المناقص المبين أدناه قد حضر زيارة موقع المشروع التي نظمتها الهيئة يوم الأحد ${ea(15)} مارس ${ea(2026)}م في تمام الساعة ${ea('09:00')} صباحاً، بدءاً من تقاطع صحار، واطلع على طبيعة الموقع وظروفه ومسار الطريق القائم ومواقع الجسرين ومجاري الأودية.</p>
<div class="field"><span>اسم المناقص:</span><span></span></div>
<div class="field"><span>رقم السجل التجاري:</span><span></span></div>
<div class="field"><span>اسم الممثل وصفته:</span><span></span></div>
<div class="field"><span>رقم الهاتف:</span><span></span></div>
<div class="field"><span>توقيع الممثل:</span><span></span></div>
<p>وتعد هذه الشهادة من مستندات المظروف الفني وفق البند (${ea(6)}) من تعليمات المناقصين، ولا يقبل العطاء غير المصحوب بها.</p>
<h3 class="h">عن الهيئة</h3>
<div class="field"><span>ممثل الهيئة:</span><span></span></div>
<div class="field"><span>التوقيع:</span><span></span></div>
<div class="field"><span>الختم:</span><span></span></div>
<p style="margin-top:5mm">اعتمد هذا النموذج من لجنة المناقصات بالهيئة ضمن وثائق المناقصة.</p>
<div class="stampwrap" style="height:30mm">${ctx.mode === 'measure' ? '' : stamp('visit', { size: 32, rot: 9, date: ea('08/03/2026'), pos: 'top:0;right:14mm' })}</div>
</div>`;
  return sheet(ctx, 16, { rot: 0.35, dx: -0.6, dy: 0.4 }, inner);
}

function scanBond(ctx) {
  const m = ctx.meta;
  const inner = `<h1 class="part">الملحق (${ea(4)}): نموذج ضمان العطاء</h1>
<div class="form">
<p style="text-align:center">(يحرر على الورق الرسمي للبنك)</p>
<p>إلى: هيئة طرق الربط الداخلي، المديرية العامة للمشاريع، صحار، سلطنة عمان</p>
<p>الموضوع: ضمان العطاء للمناقصة رقم <span dir="ltr">${m.ref}</span>، ازدواجية طريق صحار – البريمي، القطاع الثاني</p>
<p>ضمان رقم: <span class="dots"></span> &nbsp; تاريخ الإصدار: <span class="dots"></span></p>
<p>علماً بأن السادة/ <span class="dots"></span> (ويشار إليهم فيما بعد بـ«المناقص») سيتقدمون بعطائهم للمناقصة المذكورة أعلاه، فإننا بنك <span class="dots"></span> نضمن بموجب هذا ضماناً غير مشروط وغير قابل للإلغاء أن ندفع لكم عند أول طلب كتابي منكم، ودون الرجوع إلى المناقص أو الحاجة إلى إثبات، مبلغاً لا يتجاوز (${ea('300,000')}) ثلاثمائة ألف ريال عماني، وذلك في أي من الحالتين التاليتين:</p>
<ol class="list alpha"><li><span class="mk">(أ)</span>إذا سحب المناقص عطاءه خلال مدة سريان العطاء.</li>
<li><span class="mk">(ب)</span>إذا امتنع المناقص عن توقيع العقد أو عن تقديم ضمان حسن التنفيذ بعد إخطاره بالترسية.</li></ol>
<p>ويظل هذا الضمان سارياً طوال مدة سريان العطاء وحتى (${ea(28)}) يوماً بعد انتهائها، ويجب أن تصل إلينا أي مطالبة بموجبه قبل انتهاء هذه المدة، ويخضع هذا الضمان لقوانين سلطنة عمان.</p>
<div class="field" style="margin-top:6mm"><span>اسم المفوض بالتوقيع عن البنك:</span><span></span></div>
<div class="field"><span>التوقيع:</span><span></span></div>
<div class="field"><span>ختم البنك:</span><span></span></div>
<p style="margin-top:6mm">اعتمد هذا النموذج من لجنة المناقصات بالهيئة ضمن وثائق المناقصة.</p>
<div class="stampwrap" style="height:30mm">${ctx.mode === 'measure' ? '' : stamp('bond', { size: 32, rot: -7, date: ea('08/03/2026'), pos: 'top:0;left:18mm' })}${ctx.mode === 'measure' ? '' : signature('top:8mm;left:58mm')}</div>
</div>`;
  return sheet(ctx, 17, { rot: -0.3, dx: 0.5, dy: -0.4 }, inner);
}

// ---------------------------------------------------------------------------

function watermark(m) {
  return `<div class="wm"><div class="in"><div class="ar">${m.watermarkAr}</div><div class="en" dir="ltr">${m.watermarkEn}</div></div></div>`;
}

/**
 * @param ctx   { meta, parts, pages, bills, boq, totalLines }
 * @param mode  'print' | 'scan' | 'measure'
 * @param scans for 'print': { [pageNo]: 'image file name' } of the rasterised scanned pages
 */
export function renderHtml(ctx, mode = 'print', scans = {}) {
  const c = { ...ctx, mode };
  const pages = mode === 'scan' ? ctx.pages.filter((p) => p.scan) : ctx.pages;
  const sections = pages.map((pg) => {
    if (pg.scan && mode === 'print') {
      if (!scans[pg.n]) throw new Error(`No image for scanned page ${pg.n}.`);
      return `<section class="page scanned" data-n="${pg.n}"><img src="${scans[pg.n]}" alt=""></section>`;
    }
    const inner = pg.blocks.map((b) => block(b, c)).join('\n');
    const wm = pg.scan || mode === 'measure' ? '' : watermark(ctx.meta);
    return `<section class="page${pg.scan ? ' scan' : ''}" data-n="${pg.n}">${wm}\n<div class="body">${inner}</div>\n</section>`;
  });
  const measure = mode === 'measure'
    ? `<pre id="measure"></pre><script>
const mm = (px) => (px * 25.4) / 96;
const rows = [...document.querySelectorAll('section.page')].map((s) => {
  const b = s.querySelector('.body');
  const wide = [...s.querySelectorAll('td, p, div')].some((e) => e.scrollWidth > e.clientWidth + 1);
  return [Number(s.dataset.n), Number(mm(b.getBoundingClientRect().height).toFixed(1)), b.scrollWidth > b.clientWidth + 1 || wide];
});
document.getElementById('measure').textContent = ['MEAS', 'URE'].join('') + JSON.stringify({ pageHeightMm: ${PAGE_H_MM}, sheetHeightMm: ${297 - 14 - 16}, rows }) + '#END';
</script>`
    : '';
  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8">
<title>${esc(ctx.meta.ref)}: ${esc(ctx.meta.kind)}</title>
<style>${css(ctx.meta, mode)}</style></head>
<body>
${sections.join('\n')}
${measure}
</body></html>`;
}

/** The text a reader (or OCR) takes from a scanned page: its HTML with tags and the stamp removed. */
export function scanText(ctx, n) {
  const pg = ctx.pages.find((p) => p.n === n);
  const html = pg.blocks.map((b) => block(b, { ...ctx, mode: 'measure' })).join(' ');
  return html
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export { PAGE_H_MM, PAGE_W_MM, BODY_PT, LEADING };

// HTML and print CSS for the synthetic hero booklet. Pure functions: content in, HTML out.
// mode 'print' is what Chrome prints; mode 'measure' lays the same pages out on screen at the
// printable width and reports each page's height, so build.mjs can name the page that overflows.
// With Times New Roman and Arial the screen measure matches the print within 2% of the page.
// Georgia measured up to a quarter taller on screen than in print, so re-check after a font change.

const PAGE_H_MM = 297 - 20 - 22; // A4 minus the top and bottom @page margins
const PAGE_W_MM = 210 - 18 - 18;
const BODY_PT = 12; // body text size; verify.mjs checks the printed line pitch against it
const LEADING = 1.4;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const DEVICE = `<svg class="device" viewBox="0 0 100 100" aria-hidden="true">
  <circle cx="50" cy="50" r="46" fill="none" stroke="#1d6b45" stroke-width="3"/>
  <circle cx="50" cy="50" r="40.5" fill="none" stroke="#1d6b45" stroke-width="0.8"/>
  <path d="M50 15 C 61 31 73 45 73 60 A 23 23 0 0 1 27 60 C 27 45 39 31 50 15 Z" fill="#1d6b45"/>
  <path d="M29.5 61 Q 39.75 54 50 61 T 70.5 61" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/>
  <path d="M32.5 70 Q 41.25 64.5 50 70 T 67.5 70" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
</svg>`;

function css(meta, mode) {
  const shared = `
:root { --green: #1d6b45; --green-soft: #e8f1ec; --ink: #1b1b1b; --muted: #505050; --rule: #8c9690; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; color: var(--ink); font-family: 'Times New Roman', Times, Georgia, serif; font-size: ${BODY_PT}pt; line-height: ${LEADING}; }
.page { display: flow-root; }
.page > :first-child { margin-top: 0; }
.nw { white-space: nowrap; }
h1, h2, h3, th, .kv th, .cover, .toc { font-family: Arial, Helvetica, sans-serif; }
h1.part { font-size: 13pt; color: var(--green); margin: 0 0 4.5mm; padding-bottom: 1.8mm; border-bottom: 1.2pt solid var(--green); }
h1.part .lab { display: inline-block; min-width: 20mm; }
h2.cl { font-size: 11pt; margin: 3.8mm 0 1.4mm; break-after: avoid; }
p.l { text-align: left; }
h2.cl .no { display: inline-block; min-width: 9mm; color: var(--green); }
h3.h { font-size: 10.5pt; margin: 3.2mm 0 1.3mm; color: #2a2a2a; break-after: avoid; }
p { margin: 0 0 1.8mm; text-align: justify; hyphens: manual; }
.sub { display: grid; grid-template-columns: 11mm 1fr; margin: 0 0 1.6mm; text-align: justify; }
.sub.deep { grid-template-columns: 16mm 1fr; }
.sub .no { color: #333; }
ol.list { margin: 0 0 1.8mm; padding-left: 9mm; list-style: none; counter-reset: li; }
ol.list > li { position: relative; margin: 0 0 0.9mm; text-align: justify; counter-increment: li; }
ol.list > li::before { position: absolute; left: -8mm; width: 7mm; }
ol.alpha > li::before { content: '(' counter(li, lower-alpha) ')'; }
ol.roman > li::before { content: '(' counter(li, lower-roman) ')'; }
ol.num > li::before { content: counter(li) '.'; }
ol.dash > li::before { content: '–'; left: -5mm; }
table { border-collapse: collapse; width: 100%; margin: 1mm 0 2.6mm; font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; line-height: 1.32; }
table.t th, table.t td { border: 0.5pt solid var(--rule); padding: 1mm 1.6mm; vertical-align: top; text-align: left; }
table.sans td { font-family: Arial, Helvetica, sans-serif; }
table.t thead th { background: var(--green-soft); font-size: 9pt; font-weight: 700; color: #1f3a2c; }
table.t td.c, table.t th.c { text-align: center; }
table.t td.r, table.t th.r { text-align: right; }
table.t tr.bill td { background: #f3f5f4; font-family: Arial, Helvetica, sans-serif; font-weight: 700; font-size: 9pt; }
table.t tr.total td { font-family: Arial, Helvetica, sans-serif; font-weight: 700; border-top: 1pt solid var(--ink); }
table.t tr.rest td { color: var(--muted); font-style: italic; }
table.kv th, table.kv td { padding: 1mm 1.6mm; vertical-align: top; text-align: left; border-bottom: 0.5pt solid #c9cfcb; }
table.kv th { width: 42mm; font-size: 9pt; color: #2a2a2a; }
.note { border: 0.6pt solid var(--rule); border-left: 2.4pt solid var(--green); background: #f7f9f8; padding: 2mm 3mm; margin: 2mm 0 2.6mm; font-size: 9.8pt; }
.note p:last-child { margin-bottom: 0; }
.formula { font-family: Arial, Helvetica, sans-serif; font-size: 9.6pt; text-align: center; margin: 1.5mm 0 2.4mm; padding: 2mm; border: 0.5pt solid var(--rule); }
.blank { display: inline-block; min-width: 38mm; border-bottom: 0.6pt dotted #444; }
table.t .blank { display: block; min-width: 0; height: 4.2mm; }
.sign { display: grid; grid-template-columns: 1fr 1fr; gap: 1mm 10mm; margin-top: 4mm; }
.sign div { border-bottom: 0.6pt dotted #444; padding: 4.2mm 0 0.6mm; font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #333; }
.letter p { margin-bottom: 2.2mm; }
.toc td, .toc th { font-size: 10pt; }

/* Cover */
.cover { height: ${PAGE_H_MM - 4}mm; border: 1.6pt solid var(--green); padding: 1.6mm; }
.cover .in { height: 100%; border: 0.5pt solid var(--green); padding: 13mm 14mm 10mm; display: flex; flex-direction: column; align-items: center; text-align: center; }
.cover .ksa { font-size: 10pt; letter-spacing: 0.18em; text-transform: uppercase; color: #333; }
.cover .device { width: 27mm; height: 27mm; margin: 8mm 0 5mm; }
.cover .issuer { font-size: 16.5pt; font-weight: 700; color: var(--green); }
.cover .dept { font-size: 11pt; color: #333; margin-top: 1.2mm; }
.cover .bar { width: 64mm; border-top: 2pt solid var(--green); border-bottom: 0.6pt solid var(--green); height: 1.6mm; margin: 9mm 0 8mm; }
.cover .kind { font-size: 15pt; font-weight: 700; color: #222; }
.cover .title { margin: 8mm 0 9mm; padding: 5mm 6mm; border: 0.6pt solid var(--rule); background: #f7f9f8; font-family: 'Times New Roman', Times, Georgia, serif; font-size: 14pt; line-height: 1.4; color: #111; }
.cover table.kv { width: 132mm; margin: 0 auto; font-size: 10pt; }
.cover table.kv th { width: 44mm; }
.cover .foot { margin-top: auto; font-size: 8.8pt; color: #444; line-height: 1.45; }
.cover .foot .demo { margin-top: 2.5mm; color: #6a6a6a; }

/* Watermark */
/* overflow: hidden keeps the rotated text's unrotated box, which is wider than the page, inside it. */
.wm { position: fixed; left: 0; top: 0; width: ${PAGE_W_MM}mm; height: ${PAGE_H_MM}mm; overflow: hidden; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 10; }
.wm span { transform: rotate(-54deg); white-space: nowrap; font-family: Arial, Helvetica, sans-serif; font-weight: 700; font-size: 33pt; color: rgba(95, 105, 100, 0.12); }
`;
  if (mode === 'measure') {
    return shared + `
body { width: ${PAGE_W_MM}mm; }
.wm { display: none; }
.page { margin-bottom: 20mm; }`;
  }
  return shared + `
@page {
  size: A4;
  margin: 20mm 18mm 22mm;
  @top-left {
    content: "${meta.header}";
    width: ${PAGE_W_MM}mm; vertical-align: bottom; padding-bottom: 3mm; border-bottom: 0.6pt solid #1d6b45;
    font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt; color: #3d3d3d;
  }
  @bottom-center {
    content: "Page " counter(page) " of " counter(pages);
    vertical-align: top; padding-top: 5mm;
    font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt; color: #3d3d3d;
  }
}
@page :first { @top-left { content: none; border: none; } }
.page + .page { break-before: page; }
tr, .sub, li { break-inside: avoid; }`;
}

// Keeps a number and its unit on one line ("200 m", "16 km", "20 MVA").
const UNIT = /(\d) (?=(?:m|mm|km|m2|m3|m\/h|kg|kW|kV|kVA|MVA|MB|NTU|H)\b)/g;
const glue = (html) => html.replace(UNIT, '$1&nbsp;');

function block(b, ctx) {
  if (typeof b === 'string') return `<p>${glue(b)}</p>`;
  switch (b.t) {
    case 'p': return `<p>${glue(b.html)}</p>`;
    case 'part': return `<h1 class="part"><span class="lab">${b.label}</span> ${b.title}</h1>`;
    case 'clause': return `<h2 class="cl"><span class="no">${b.no}.</span> ${b.title}</h2>`;
    case 'h': return `<h3 class="h">${b.html}</h3>`;
    case 'sub': return `<div class="sub${b.no.split('.').length > 2 ? ' deep' : ''}"><span class="no">${b.no}</span><div>${glue(b.html)}</div></div>`;
    case 'list': return `<ol class="list ${b.style}">${b.items.map((i) => `<li>${glue(i)}</li>`).join('')}</ol>`;
    case 'note': return `<div class="note">${b.html}</div>`;
    case 'formula': return `<div class="formula">${b.html}</div>`;
    case 'kv': return `<table class="kv"><tbody>${b.rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</tbody></table>`;
    case 'table': return table(b);
    case 'sign': return `<div class="sign">${b.fields.map((f) => `<div>${f}</div>`).join('')}</div>`;
    case 'letter': return `<div class="letter">${b.blocks.map((x) => block(x, ctx)).join('')}</div>`;
    case 'cover': return cover(ctx.meta);
    case 'contents': return contents(ctx);
    default: throw new Error(`Unknown block type: ${b.t}`);
  }
}

function table(b) {
  const cols = b.widths ? `<colgroup>${b.widths.map((w) => `<col style="width:${w}">`).join('')}</colgroup>` : '';
  const align = (i) => (b.align && b.align[i] ? ` class="${b.align[i]}"` : '');
  const head = b.head ? `<thead><tr>${b.head.map((h, i) => `<th${align(i)}>${h}</th>`).join('')}</tr></thead>` : '';
  const rows = b.rows.map((r) => {
    if (!Array.isArray(r)) {
      // { cls, cells } rows: bill headers, totals, "remaining items" lines
      return `<tr class="${r.cls || ''}">${r.cells.map((c, i) => `<td${r.span && i === r.cells.length - 1 ? ` colspan="${r.span}"` : align(i)}>${c}</td>`).join('')}</tr>`;
    }
    return `<tr>${r.map((c, i) => `<td${align(i)}>${c}</td>`).join('')}</tr>`;
  });
  return `<table class="t ${b.cls || ''}">${cols}${head}<tbody>${rows.join('')}</tbody></table>`;
}

function cover(m) {
  return `<div class="cover"><div class="in">
  <div class="ksa">${m.country}</div>
  ${DEVICE}
  <div class="issuer">${m.issuer}</div>
  <div class="dept">${m.department}</div>
  <div class="bar"></div>
  <div class="kind">${m.booklet.replace(': ', ':<br>')}</div>
  <div class="title">${m.title}</div>
  <table class="kv"><tbody>
    <tr><th>Tender (booklet) number</th><td>${m.ref}</td></tr>
    <tr><th>Issue date</th><td>${m.issueDate}, ${m.hijri}</td></tr>
    <tr><th>Place of issue</th><td>${m.city}</td></tr>
    <tr><th>Procurement method</th><td>${m.method}</td></tr>
    <tr><th>Volume</th><td>${m.volume}</td></tr>
  </tbody></table>
  <div class="foot">${m.coverNote}<div class="demo">${m.disclaimer}</div></div>
</div></div>`;
}

function contents({ parts, pages }) {
  const first = (id) => pages.find((p) => p.part === id)?.n;
  const rows = parts.map((p) => `<tr><td>${p.label}</td><td>${p.title}</td><td class="c">${p.clauses || '–'}</td><td class="r">${first(p.id)}</td></tr>`);
  return `<table class="t toc"><colgroup><col style="width:30mm"><col><col style="width:26mm"><col style="width:16mm"></colgroup>
<thead><tr><th>Part / annex</th><th>Title</th><th class="c">Clauses</th><th class="r">Page</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

export function renderHtml({ meta, parts, pages }, mode = 'print') {
  const ctx = { meta, parts, pages };
  const sections = pages.map((pg) => `<section class="page" data-n="${pg.n}">\n${pg.blocks.map((b) => block(b, ctx)).join('\n')}\n</section>`);
  const measure = mode === 'measure'
    ? `<pre id="measure"></pre><script>
const mm = (px) => (px * 25.4) / 96;
const rows = [...document.querySelectorAll('section.page')].map((s) => [Number(s.dataset.n), Number(mm(s.getBoundingClientRect().height).toFixed(1)), s.scrollWidth > s.clientWidth + 1]);
document.getElementById('measure').textContent = ['MEAS', 'URE'].join('') + JSON.stringify({ pageHeightMm: ${PAGE_H_MM}, rows }) + '#END';
</script>`
    : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${esc(meta.ref)}: ${esc(meta.booklet)}</title>
<style>${css(meta, mode)}</style></head>
<body>
<div class="wm"><span>${meta.watermark}</span></div>
${sections.join('\n')}
${measure}
</body></html>`;
}

export { PAGE_H_MM, PAGE_W_MM, BODY_PT, LEADING };

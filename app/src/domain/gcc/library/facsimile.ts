/**
 * Document facsimiles (plan 030 Phase 1). A file the demo doesn't hold (a
 * notice, a letter, an RFQ, a quote, a gate record) is shown as an A4-looking
 * page built from the tender's data, never as a new PDF: hundreds of tenders
 * can open a library.
 *
 * `facsimileHtml(spec)` returns one self-contained HTML document: inline CSS,
 * system fonts only (no network), no script, so it renders in
 * `<iframe srcDoc sandbox="">`. Every page carries the watermark "Synthetic
 * document for demonstration", as the demo booklets do. The text stays
 * selectable; the watermark and the stamp don't take the pointer.
 *
 * The builder only lays out what it is given: every date and figure in a spec
 * comes from `src/data` through the library's builders (app rule 1). The page
 * stays white paper in both themes (a document); the ground around it is
 * transparent, so the viewer's sunken ground shows through.
 */

/** A value in a key-value row or a table cell. `masked` names who can see it. */
export type FacCell = string | { masked: string } | { strong: string };

export interface FacTable {
  head: string[];
  rows: FacCell[][];
  /** Column alignment; numbers go right. */
  align?: ('l' | 'r')[];
  foot?: FacCell[];
}

export interface FacSection {
  heading?: string;
  paragraphs?: string[];
  /** Label and value, as on a form or a notice. */
  rows?: [string, FacCell][];
  list?: string[];
  table?: FacTable;
  /** A small line under the section. */
  note?: string;
  /** Start this section on a new page. */
  newPage?: boolean;
}

export interface FacEmail {
  from: string;
  to: string;
  cc?: string;
  subject: string;
  /** "Sun 8 Mar 2026, 07:31". */
  received: string;
  attachments?: string[];
}

export interface FacsimileSpec {
  /** The document's `<title>`. */
  title: string;
  /** The letterhead: the issuer's name only, never a real logo. */
  issuer: string;
  /** Lines under the letterhead: a department, a city and country. */
  issuerLines?: string[];
  /** The document's own heading: "Letter of invitation", "Request for quotation". */
  heading?: string;
  ref?: string;
  /** Already in words: "Sun 8 Mar 2026". */
  date?: string;
  /** The addressee, one line each. */
  to?: string[];
  subject?: string;
  /** An email: its header block replaces the letterhead's reference line. */
  email?: FacEmail;
  sections: FacSection[];
  signature?: { name?: string; role?: string; org?: string };
  footer?: string;
  /** A scanned copy: light grey paper and a "Scanned copy" stamp. */
  scanned?: boolean;
  /** Arabic: `dir="rtl"` and the system Arabic fonts. */
  lang?: 'en' | 'ar';
  /** A small stamp on the first page, e.g. "Received 8 Mar 2026". */
  stamp?: string;
}

export const WATERMARK = 'Synthetic document for demonstration';
/** The Arabic booklet's own wording (scripts/demo-itt/ilra-042). */
export const WATERMARK_AR = 'مستند اصطناعي لأغراض العرض';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function cell(c: FacCell): string {
  if (typeof c === 'string') return `<bdi dir="auto">${esc(c)}</bdi>`;
  if ('masked' in c) return `<span class="mask" title="${esc(`Masked. Visible to ${c.masked}`)}"><span class="bar" aria-hidden="true"></span>Masked · visible to ${esc(c.masked)}</span>`;
  return `<b><bdi dir="auto">${esc(c.strong)}</bdi></b>`;
}

function section(s: FacSection): string {
  const out: string[] = ['<section>'];
  if (s.heading) out.push(`<h2>${esc(s.heading)}</h2>`);
  for (const p of s.paragraphs ?? []) out.push(`<p>${esc(p)}</p>`);
  if (s.rows?.length) {
    out.push('<table class="kv"><tbody>');
    for (const [k, v] of s.rows) out.push(`<tr><th scope="row">${esc(k)}</th><td>${cell(v)}</td></tr>`);
    out.push('</tbody></table>');
  }
  if (s.list?.length) out.push(`<ol>${s.list.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`);
  if (s.table) {
    const al = (i: number) => (s.table!.align?.[i] === 'r' ? ' class="r"' : '');
    out.push('<table class="grid"><thead><tr>');
    s.table.head.forEach((h, i) => out.push(`<th${al(i)}>${esc(h)}</th>`));
    out.push('</tr></thead><tbody>');
    for (const r of s.table.rows) out.push(`<tr>${r.map((c, i) => `<td${al(i)}>${cell(c)}</td>`).join('')}</tr>`);
    out.push('</tbody>');
    if (s.table.foot) out.push(`<tfoot><tr>${s.table.foot.map((c, i) => `<td${al(i)}>${cell(c)}</td>`).join('')}</tr></tfoot>`);
    out.push('</table>');
  }
  if (s.note) out.push(`<p class="note">${esc(s.note)}</p>`);
  out.push('</section>');
  return out.join('');
}

function head(spec: FacsimileSpec): string {
  const out: string[] = ['<header class="lh">', `<div class="lh-name">${esc(spec.issuer)}</div>`];
  for (const l of spec.issuerLines ?? []) out.push(`<div class="lh-line">${esc(l)}</div>`);
  out.push('</header>');
  if (spec.email) {
    const e = spec.email;
    const row = (k: string, v?: string) => (v ? `<tr><th scope="row">${k}</th><td><bdi dir="auto">${esc(v)}</bdi></td></tr>` : '');
    out.push(`<table class="mail"><tbody>${row('From', e.from)}${row('To', e.to)}${row('Cc', e.cc)}${row('Subject', e.subject)}${row('Received', e.received)}`);
    if (e.attachments?.length) out.push(row('Attachments', e.attachments.join(' · ')));
    out.push('</tbody></table>');
  } else if (spec.ref || spec.date) {
    out.push(`<div class="refline">${spec.ref ? `<span>Ref. <bdi dir="ltr">${esc(spec.ref)}</bdi></span>` : '<span></span>'}${spec.date ? `<span>${esc(spec.date)}</span>` : ''}</div>`);
  }
  if (spec.to?.length) out.push(`<div class="to">${spec.to.map((l) => `<div>${esc(l)}</div>`).join('')}</div>`);
  if (spec.heading) out.push(`<h1>${esc(spec.heading)}</h1>`);
  if (spec.subject && !spec.email) out.push(`<p class="subj"><b>Subject:</b> ${esc(spec.subject)}</p>`);
  return out.join('');
}

const CSS = `
*{box-sizing:border-box}
html,body{margin:0;background:transparent}
body{padding:18px 12px 28px;font:13px/1.55 "Times New Roman",Times,"Liberation Serif",serif;color:#1b1b1f;-webkit-font-smoothing:antialiased}
html[lang=ar] body{font-family:"Geeza Pro","Al Nile","Arabic Typesetting","Traditional Arabic","Simplified Arabic","Noto Naskh Arabic","Times New Roman",serif;font-size:14px}
.page{position:relative;width:min(100%,794px);min-height:1060px;margin:0 auto 16px;padding:64px 70px 72px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.14),0 0 0 1px rgba(0,0,0,.06);overflow:hidden}
.scan .page{background:#efeee9;color:#2c2c30;filter:contrast(.97)}
.scan .page .body{transform:rotate(-.25deg)}
.wm{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;pointer-events:none;user-select:none;-webkit-user-select:none;z-index:2}
.wm span{transform:rotate(-32deg);font:600 34px/1.1 Helvetica,Arial,sans-serif;letter-spacing:.5px;color:rgba(120,120,135,.16);white-space:nowrap}
.wm span+span{font-size:26px}
.stamp{position:absolute;top:26px;inset-inline-end:34px;border:2px solid rgba(40,90,160,.55);color:rgba(40,90,160,.75);padding:3px 9px;font:600 11px/1.3 Helvetica,Arial,sans-serif;letter-spacing:.6px;text-transform:uppercase;transform:rotate(4deg);pointer-events:none;user-select:none;-webkit-user-select:none;z-index:3;background:rgba(255,255,255,.2)}
.stamp.scan-stamp{border-color:rgba(90,90,100,.5);color:rgba(90,90,100,.8);top:auto;bottom:40px;transform:rotate(-3deg)}
.lh{border-bottom:2px solid #1b1b1f;padding-bottom:10px;margin-bottom:14px}
.lh-name{font-size:19px;font-weight:700;letter-spacing:.2px}
.lh-line{font-size:12px;color:#55555c}
.refline{display:flex;justify-content:space-between;gap:16px;font-size:12.5px;margin:0 0 14px}
.to{margin:4px 0 16px;font-size:13px}
h1{font-size:17px;margin:10px 0 12px;text-align:center;text-transform:uppercase;letter-spacing:.6px}
h2{font-size:13.5px;margin:16px 0 6px;text-transform:uppercase;letter-spacing:.4px}
p{margin:0 0 8px}
.subj{margin:0 0 12px}
.note{font-size:11.5px;color:#55555c;font-style:italic}
table{border-collapse:collapse;width:100%;margin:4px 0 8px}
.kv th{width:36%;text-align:start;vertical-align:top;font-weight:600;padding:3px 10px 3px 0}
html[lang=ar] .kv th{padding:3px 0 3px 10px}
.kv td{padding:3px 0;vertical-align:top}
.grid th,.grid td{border:1px solid #9a9aa2;padding:4px 7px;text-align:start;vertical-align:top}
.grid th{background:#f1f1f3;font-weight:600}
.scan .grid th{background:#e4e3dd}
.grid .r{text-align:end;font-variant-numeric:tabular-nums}
.grid tfoot td{font-weight:700}
.mail{margin:0 0 16px;font-size:12.5px}
.mail th{width:90px;text-align:start;color:#55555c;font-weight:600;padding:2px 10px 2px 0;vertical-align:top}
.mail td{padding:2px 0}
.mask{display:inline-flex;align-items:center;gap:6px;color:#6b6b73;font-style:italic;font-size:12px}
.mask .bar{display:inline-block;width:64px;height:10px;background:#c9c9cf;border-radius:2px}
ol{margin:0 0 8px;padding-inline-start:22px}
.sig{margin-top:28px}
.sig .ln{width:200px;border-bottom:1px solid #1b1b1f;height:26px;margin-bottom:4px}
.foot{position:absolute;left:70px;right:70px;bottom:28px;display:flex;justify-content:space-between;gap:12px;font-size:10.5px;color:#6b6b73;border-top:1px solid #d6d6db;padding-top:6px}
@media (max-width:640px){.page{padding:36px 26px 64px;min-height:0}.foot{left:26px;right:26px}}
`;

/** One self-contained HTML document for `<iframe srcDoc sandbox="">`: no script, no network. */
export function facsimileHtml(spec: FacsimileSpec): string {
  const ar = spec.lang === 'ar';
  // Sections split into pages where one asks for a new page.
  const pages: FacSection[][] = [[]];
  for (const s of spec.sections) {
    if (s.newPage && pages[pages.length - 1].length) pages.push([]);
    pages[pages.length - 1].push(s);
  }
  const n = pages.length;
  const wm = `<div class="wm" aria-hidden="true"><span>${esc(WATERMARK)}</span>${ar ? `<span lang="ar">${esc(WATERMARK_AR)}</span>` : ''}</div>`;
  const sig = spec.signature
    ? `<div class="sig"><div class="ln"></div>${[spec.signature.name, spec.signature.role, spec.signature.org].filter(Boolean).map((l) => `<div>${esc(l!)}</div>`).join('')}</div>`
    : '';
  const body = pages.map((secs, i) => {
    const first = i === 0;
    const last = i === n - 1;
    return [
      '<div class="page">',
      wm,
      first && spec.stamp ? `<div class="stamp">${esc(spec.stamp)}</div>` : '',
      first && spec.scanned ? '<div class="stamp scan-stamp">Scanned copy</div>' : '',
      '<div class="body">',
      first ? head(spec) : `<div class="refline"><span>${esc(spec.issuer)}</span>${spec.ref ? `<span><bdi dir="ltr">${esc(spec.ref)}</bdi></span>` : ''}</div>`,
      secs.map(section).join(''),
      last ? sig : '',
      '</div>',
      `<div class="foot"><span>${esc(spec.footer ?? WATERMARK)}</span><span>Page ${i + 1} of ${n}</span></div>`,
      '</div>',
    ].join('');
  }).join('');
  return `<!doctype html><html lang="${ar ? 'ar' : 'en'}" dir="${ar ? 'rtl' : 'ltr'}"${spec.scanned ? ' class="scan"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(spec.title)}</title><style>${CSS}</style></head><body>${body}</body></html>`;
}

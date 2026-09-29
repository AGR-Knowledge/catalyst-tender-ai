import { WATERMARK } from './facsimile';

/**
 * A BOQ CSV as a plain HTML table (plan 030 step 1.3), for the file viewer's
 * sandboxed iframe: a header row, numbers right-aligned, and each bill's
 * heading row (an item with no unit and no quantity) set as a band. The demo's
 * BOQ extracts carry quantities only, no prices. No script, no network.
 */

/** Parses CSV text: quoted fields, doubled quotes, CRLF, and a leading BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let f = '';
  let q = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { f += '"'; i++; }
      else if (c === '"') q = false;
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(f); f = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else f += c;
  }
  row.push(f);
  if (row.some((x) => x !== '')) rows.push(row);
  return rows;
}

const LABEL: Record<string, string> = {
  item: 'Item', bill: 'Bill', package: 'Package', description: 'Description', description_ar: 'Description (Arabic)',
  description_en: 'Description (English)', unit: 'Unit', unit_en: 'Unit (English)', qty: 'Quantity',
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const isNum = (s: string) => /^-?[\d,]+(\.\d+)?$/.test(s.trim());
/** "186000" → "186,000"; decimals and anything else as printed. */
const grouped = (s: string) => (/^-?\d{4,}$/.test(s.trim()) ? Number(s).toLocaleString('en-GB') : s);

/** Item rows in a BOQ extract: every row but the header and the bill headings. */
export function csvItemRows(text: string): number {
  const [h, ...rows] = parseCsv(text);
  if (!h) return 0;
  const qty = h.indexOf('qty');
  return qty < 0 ? rows.length : rows.filter((r) => (r[qty] ?? '').trim() !== '').length;
}

export function csvHtml(text: string, title: string): string {
  const [h = [], ...rows] = parseCsv(text);
  const keys = h.map((k) => k.trim().toLowerCase());
  const unit = keys.indexOf('unit');
  const qty = keys.indexOf('qty');
  const right = keys.map((k, i) => k === 'qty' || (k !== 'item' && k !== 'bill' && rows.every((r) => !r[i] || isNum(r[i]))));
  const band = (r: string[]) => qty >= 0 && !(r[qty] ?? '').trim() && (unit < 0 || !(r[unit] ?? '').trim());
  const td = (r: string[], i: number) => `<td${right[i] ? ' class="r"' : ''} dir="auto">${esc(right[i] ? grouped(r[i] ?? '') : r[i] ?? '')}</td>`;
  const body = rows.map((r) => (band(r)
    ? `<tr class="band">${keys.map((_, i) => td(r, i)).join('')}</tr>`
    : `<tr>${keys.map((_, i) => td(r, i)).join('')}</tr>`)).join('');
  const css = `
*{box-sizing:border-box}html,body{margin:0;background:transparent}
body{padding:16px;font:12.5px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,"Geeza Pro","Noto Naskh Arabic",sans-serif;color:#1b1b1f}
.sheet{position:relative;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.14),0 0 0 1px rgba(0,0,0,.06);padding:18px 18px 22px;max-width:1100px;margin:0 auto}
.cap{display:flex;justify-content:space-between;gap:12px;margin:0 0 10px;font-weight:600}
.cap span{font-weight:400;color:#6b6b73}
table{border-collapse:collapse;width:100%}
th,td{border-bottom:1px solid #e3e3e8;padding:5px 8px;text-align:start;vertical-align:top}
th{position:sticky;top:0;background:#f4f4f6;font-weight:600;border-bottom:1px solid #c9c9cf}
.r{text-align:end;font-variant-numeric:tabular-nums;white-space:nowrap}
.band td{background:#f8f8fa;font-weight:600}
td[dir=auto]:lang(ar){font-family:"Geeza Pro","Noto Naskh Arabic",serif}
.wm{margin-top:12px;font-size:11px;color:#8a8a92}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body><div class="sheet"><div class="cap">${esc(title)}<span>Quantities only. The BOQ extract carries no prices.</span></div><table><thead><tr>${keys.map((k, i) => `<th${right[i] ? ' class="r"' : ''}>${esc(LABEL[k] ?? h[i])}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table><div class="wm">${esc(WATERMARK)}</div></div></body></html>`;
}

// Verifies the built CBHH tender document PDF with poppler (plan 022): every page anchor on its page,
// the texts that must stay on one page, the texts that must appear nowhere, the BOQ summary and no
// prices on it, header, footer and watermark on every page. Also renders the cover and the pages of
// the two conflicts to PNG in .out/ for a visual check. Adapted from scripts/hero-itt/verify.mjs.
// Usage: node scripts/demo-itt/cbhh-011/verify.mjs   (exit code 1 on any failure)

import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { META, ANCHORS, EXCLUSIVE, NEVER, BILLS, PAGE_COUNT, OUTPUT, PDF_DATE } from './content.mjs';
import { BODY_PT, LEADING } from './template.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, '../../..');
const outDir = path.join(here, '.out');
const pdf = path.join(appDir, OUTPUT.pdf);
const PNG_PAGES = [1, 6, 11, 14, 19];
const BOQ_PAGES = [16, 17];

if (!existsSync(pdf)) {
  console.error(`✗ ${OUTPUT.pdf} not found. Run build.mjs first.`);
  process.exit(1);
}

const norm = (s) => s.replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl').replace(/\s+/g, ' ').trim();
const pdftotext = (n, extra = []) =>
  execFileSync('pdftotext', ['-layout', ...extra, '-f', String(n), '-l', String(n), pdf, '-'], { encoding: 'utf8' });

const pageCount = Number(execFileSync('pdfinfo', [pdf], { encoding: 'utf8' }).match(/^Pages:\s+(\d+)/m)?.[1]);
const pages = [];
for (let n = 1; n <= pageCount; n++) {
  const all = pdftotext(n); // includes the diagonal watermark, scattered
  const body = pdftotext(n, ['-nodiag']); // horizontal text only
  pages[n] = { all, body: norm(body), raw: body };
}
const foundOn = (text) => pages.map((p, n) => (p && p.body.includes(norm(text)) ? n : null)).filter(Boolean);

const results = [];
const check = (page, what, ok, detail = '') => results.push({ page, what, ok, detail });

// 1. Page count
check('all', `${PAGE_COUNT} pages`, pageCount === PAGE_COUNT, `found ${pageCount}`);

// Pinned metadata dates (build.mjs): the issue date, never the build time.
{
  const raw = readFileSync(pdf).toString('latin1');
  const dates = [...raw.matchAll(/\/(CreationDate|ModDate) \(([^)]*)\)/g)].map((m) => `${m[1]} ${m[2]}`);
  check('all', `CreationDate and ModDate pinned to ${PDF_DATE}`, dates.length === 2 && dates.every((d) => d.endsWith(` ${PDF_DATE}`)), dates.join(' · '));
}

// 2. Anchors on their pages
for (const a of ANCHORS) {
  const on = pages[a.page]?.body.includes(norm(a.text));
  const elsewhere = on ? [] : foundOn(a.text);
  check(a.page, `“${a.text}”${a.catch ? ` (catch ${a.catch})` : ''}`, !!on, on ? '' : `found on: ${elsewhere.length ? elsewhere.join(', ') : 'no page'}`);
}

// 3. Texts that must sit on one page only
for (const x of EXCLUSIVE) {
  const found = foundOn(x.text);
  check(x.page, `“${x.text}” only here`, found.length === 1 && found[0] === x.page, `found on: ${found.join(', ') || 'no page'}`);
}

// 4. Texts that must appear nowhere (case-insensitive, watermark included)
for (const t of NEVER) {
  const re = new RegExp(t.replace(/\s+/g, '\\s+'), 'i');
  const hits = pages.map((p, n) => (p && re.test(p.all) ? n : null)).filter(Boolean);
  check('all', `no “${t}” anywhere`, hits.length === 0, hits.length ? `found on: ${hits.join(', ')}` : '');
}

// 5. BOQ summary (pp. 16–17): eight work packages with their line counts, summing to the total; no prices
const boq = BOQ_PAGES.map((n) => pages[n]?.body || '').join(' ');
const sum = BILLS.reduce((s, b) => s + b.lineCount, 0);
check('16–17', `work package line counts sum to ${META.boqLines}`, sum === META.boqLines && BILLS.length === 8, `${BILLS.length} packages, ${sum} lines`);
for (const b of BILLS) {
  check('16–17', `WP-${b.no} “${b.title}” · ${b.lineCount} lines`, boq.includes(norm(`WP-${b.no} ${b.title} ${b.lineCount}`)));
}
check('16–17', `summary total “Total (8 work packages) ${sum}”`, boq.includes(`Total (8 work packages) ${sum}`));
const priced = BOQ_PAGES.filter((n) => /\bAED\b|\bRate\b|\bAmount\b|\bprice[sd]?\b\s*[:\d]/i.test(pages[n]?.body || ''));
check('16–17', 'no currency, rate or amount on the BOQ pages', priced.length === 0, priced.length ? `found on: ${priced.join(', ')}` : '');

// 6. Header on every page but the cover, footer on every page
const header = norm(META.header);
const headerMissing = [];
const footerMissing = [];
for (let n = 1; n <= pageCount; n++) {
  const has = pages[n].body.includes(header);
  if ((n === 1 && has) || (n > 1 && !has)) headerMissing.push(n);
  if (!pages[n].body.includes(`Page ${n} of ${PAGE_COUNT}`)) footerMissing.push(n);
}
check('all', 'header on every page except the cover', headerMissing.length === 0, headerMissing.length ? `wrong on: ${headerMissing.join(', ')}` : '');
check('all', `footer “Page N of ${PAGE_COUNT}” on every page`, footerMissing.length === 0, footerMissing.length ? `missing on: ${footerMissing.join(', ')}` : '');

// 7. Watermark on every page: the diagonal text on each page holds exactly the watermark's letters
const letters = (s) => {
  const m = {};
  for (const ch of s.replace(/[^A-Za-z]/g, '')) m[ch] = (m[ch] || 0) + 1;
  return m;
};
const want = letters(META.watermark);
const noMark = [];
for (let n = 1; n <= pageCount; n++) {
  const a = letters(pages[n].all);
  const b = letters(pages[n].raw);
  const ok = Object.keys({ ...want, ...a }).every((ch) => (a[ch] || 0) - (b[ch] || 0) === (want[ch] || 0));
  if (!ok) noMark.push(n);
}
check('all', `watermark “${META.watermark}” on every page`, noMark.length === 0, noMark.length ? `not found on: ${noMark.join(', ')}` : '');

// 8. The print is not scaled: the body text on p. 5 keeps the template's size and leading.
{
  const bbox = execFileSync('pdftotext', ['-bbox', '-nodiag', '-f', '5', '-l', '5', pdf, '-'], { encoding: 'utf8' });
  const ys = [...new Set([...bbox.matchAll(/<word xMin="[\d.]+" yMin="([\d.]+)"/g)].map((m) => Math.round(Number(m[1]) * 10) / 10))]
    .filter((y) => y > 80 && y < 760) // skip the header and footer
    .sort((a, b) => a - b);
  const gaps = ys.slice(1).map((y, i) => y - ys[i]).filter((g) => g > 4).sort((a, b) => a - b);
  // Lower quartile, not the median: p. 5 is mostly one-line sub-clauses, so most gaps are between blocks.
  const pitch = gaps[Math.floor(gaps.length / 4)];
  const want = BODY_PT * LEADING;
  check(5, `body line pitch ${want.toFixed(1)} pt (print not scaled)`, Math.abs(pitch - want) < want * 0.04, `measured ${pitch?.toFixed(1)} pt`);
}

// Report
const w = Math.max(...results.map((r) => r.what.length));
console.log(`\nVerify ${OUTPUT.pdf}\n`);
console.log(`${'Page'.padEnd(6)} ${'Check'.padEnd(w)}  Result`);
console.log(`${'-'.repeat(6)} ${'-'.repeat(w)}  ------`);
for (const r of results) {
  console.log(`${String(r.page).padEnd(6)} ${r.what.padEnd(w)}  ${r.ok ? 'pass' : 'FAIL'}${r.detail && !r.ok ? `  (${r.detail})` : ''}`);
}

// Printed fill (bottom of the last body line ÷ printable height) and words per page, excluding
// header, footer and watermark. Information only: build.mjs measures fill before printing.
const TOP_PT = (20 * 72) / 25.4;
const AREA_PT = ((297 - 20 - 22) * 72) / 25.4;
const stats = [];
for (let n = 1; n <= pageCount; n++) {
  const bbox = execFileSync('pdftotext', ['-bbox', '-nodiag', '-f', String(n), '-l', String(n), pdf, '-'], { encoding: 'utf8' });
  const bottoms = [...bbox.matchAll(/<word xMin="[\d.]+" yMin="([\d.]+)" xMax="[\d.]+" yMax="([\d.]+)"/g)]
    .map((m) => [Number(m[1]), Number(m[2])])
    .filter(([y0, y1]) => y0 > TOP_PT && y1 < TOP_PT + AREA_PT)
    .map(([, y1]) => y1);
  const fill = Math.round(((Math.max(...bottoms) - TOP_PT) / AREA_PT) * 100);
  const text = pages[n].body.replace(header, '').replace(`Page ${n} of ${PAGE_COUNT}`, '');
  const count = text.split(' ').filter((t) => /[A-Za-z0-9]/.test(t)).length;
  stats.push(`${String(n).padStart(2)}:${String(fill).padStart(3)}% ${String(count).padStart(3)}w`);
}
console.log('\nPrinted fill and words per page (information):');
for (let i = 0; i < stats.length; i += 6) console.log('  ' + stats.slice(i, i + 6).join('   '));

// PNGs for a visual check (not committed)
mkdirSync(outDir, { recursive: true });
for (const n of PNG_PAGES.filter((p) => p <= pageCount)) {
  execFileSync('pdftoppm', ['-r', '60', '-png', '-f', String(n), '-l', String(n), '-singlefile', pdf, path.join(outDir, `page-${String(n).padStart(2, '0')}`)]);
}
console.log(`\nPNG previews of pages ${PNG_PAGES.join(', ')} written to ${path.relative(appDir, outDir)}/.`);

const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `\n✗ ${failed.length} of ${results.length} checks failed.` : `\n✓ All ${results.length} checks passed.`);
process.exit(failed.length ? 1 : 0);

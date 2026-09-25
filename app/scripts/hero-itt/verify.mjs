// Verifies the built booklet PDF with poppler: every page anchor on its page, the texts that must
// stay on one page, the BOQ summary, no mention of value added tax, header, footer and watermark
// on every page. Also renders a few pages to PNG in .out/ for a visual check.
// Usage: node scripts/hero-itt/verify.mjs   (exit code 1 on any failure)

import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { META, ANCHORS, EXCLUSIVE, BILLS, PAGE_COUNT, OUTPUT } from './content.mjs';
import { BODY_PT, LEADING } from './template.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, '../..');
const outDir = path.join(here, '.out');
const pdf = path.join(appDir, OUTPUT.pdf);
const PNG_PAGES = [1, 4, 12, 35, 38];

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

const results = [];
const check = (page, what, ok, detail = '') => results.push({ page, what, ok, detail });

// 1. Page count
check('all', `${PAGE_COUNT} pages`, pageCount === PAGE_COUNT, `found ${pageCount}`);

// 2. Anchors on their pages
for (const a of ANCHORS) {
  const on = pages[a.page]?.body.includes(norm(a.text));
  const elsewhere = on ? '' : pages.map((p, n) => (p && p.body.includes(norm(a.text)) ? n : null)).filter(Boolean);
  check(a.page, `“${a.text}”${a.flaw ? ` (flaw ${a.flaw})` : ''}`, !!on, on ? '' : `found on: ${elsewhere.length ? elsewhere.join(', ') : 'no page'}`);
}

// 3. Texts that must sit on one page only
for (const x of EXCLUSIVE) {
  const found = pages.map((p, n) => (p && p.body.includes(norm(x.text)) ? n : null)).filter(Boolean);
  check(x.page, `“${x.text}” only here`, found.length === 1 && found[0] === x.page, `found on: ${found.join(', ') || 'no page'}`);
}

// 4. BOQ summary (pp. 43–46): 11 bill titles with their line counts, summing to the booklet total
const boq = [43, 44, 45, 46].map((n) => pages[n]?.body || '').join(' ');
const sum = BILLS.reduce((s, b) => s + b.lineCount, 0);
check('43–46', `bill line counts sum to ${META.boqLines}`, sum === META.boqLines && BILLS.length === 11, `${BILLS.length} bills, ${sum} lines`);
for (const b of BILLS) {
  check('43–46', `Bill ${b.no} “${b.title}” · ${b.lineCount} lines`, boq.includes(norm(`${b.no} ${b.title} ${b.lineCount}`)));
}
check('43–46', `summary total “Total (11 bills) ${sum}”`, boq.includes(`Total (11 bills) ${sum}`));

// 5. No mention of value added tax anywhere (seeded flaw 6)
const taxHits = pages.map((p, n) => (p && (/\bVAT\b/i.test(p.all) || /value[\s-]+added/i.test(p.all)) ? n : null)).filter(Boolean);
check('all', 'no “VAT” or “value added” anywhere', taxHits.length === 0, taxHits.length ? `found on: ${taxHits.join(', ')}` : '');

// 6. Header on pp. 2–48 only, footer on every page
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
  const pitch = gaps[Math.floor(gaps.length / 2)];
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

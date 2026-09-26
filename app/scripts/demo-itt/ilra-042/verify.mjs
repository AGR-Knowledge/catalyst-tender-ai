// Verifies the built Arabic document with poppler: page count; the scanned pages are images with no
// text layer; every anchor on its page; the texts that must stay on one page; header, footer and
// watermark; no prices; and every Arabic `source` the extraction record cites is on the page it
// cites. Renders a few pages to PNG in .out/ for a visual check.
// Usage: node scripts/demo-itt/ilra-042/verify.mjs   (exit code 1 on any failure)
//
// Matching Arabic from pdftotext. The text comes back in logical order, but with bidi control
// marks, every lam-alef ligature reversed ("لا" as "ال"), "ريال" as "لاير", and the digits and signs of a number in
// brackets moved ("(1%)" comes back as "( )%1"). So every comparison works on two parts: the
// Arabic words in order, with digits, Latin and punctuation removed; and the numbers and Latin
// tokens, each of which must be on the page.

import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { META, PARTS, PAGES, BILLS, BOQ, BOQ_TOTAL_LINES, ANCHORS, EXCLUSIVE, ALLOWED_AMOUNTS, PAGE_COUNT, SCANNED, OUTPUT, RECORD, PDF_DATE } from './content.mjs';
import { BODY_PT, LEADING, scanText } from './template.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, '../../..');
const outDir = path.join(here, '.out');
const pdf = path.join(appDir, OUTPUT.pdf);
const scanPdf = path.join(outDir, 'scan.pdf');
const PNG_PAGES = [1, 5, 13, 15, 17];
const CTX = { meta: META, parts: PARTS, pages: PAGES, bills: BILLS, boq: BOQ, totalLines: BOQ_TOTAL_LINES };

if (!existsSync(pdf)) {
  console.error(`✗ ${OUTPUT.pdf} not found. Run build.mjs first.`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Normalising

const BIDI = /[‎‏‪-‮⁦-⁩؜﻿]/g;
const MARKS = /[ً-ٰٟـ]/g; // diacritics, tanween, superscript alef, tatweel
// pdftotext returns each lam-alef ligature reversed ("لا" as "ال"): the logical text compared with a PDF page
// is written the same way first (`asPrinted`), and never the PDF text itself, which already is.
const LAM_ALEF = /ل([اأإآ])/g;
const asPrinted = (s) => s.replace(MARKS, '').replace(LAM_ALEF, '$1ل');
// Arial draws "ريال" as one rial ligature, which comes back as "لاير".
const norm = (s) => s
  .replace(BIDI, '')
  .replace(MARKS, '')
  .replace(/لاير/g, 'ريال')
  .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660))
  .replace(/٬/g, ',')
  .replace(/٫/g, '.')
  .replace(/٪/g, '%')
  .replace(/\s+/g, ' ')
  .trim();
/** The Arabic words, in order, with everything else removed. */
const words = (s) => ` ${norm(s).replace(/[^ء-ي]+/g, ' ').trim()} `;
/** The numbers on a page, each also with "%" when a percent sign touches it on either side. */
function numbers(s) {
  const t = norm(s).replace(/[()[\]{}«»]/g, ' ');
  const set = new Set();
  for (const m of t.matchAll(/\d[\d,.:]*\d|\d/g)) {
    const n = m[0];
    set.add(n);
    const before = t.slice(Math.max(0, m.index - 2), m.index);
    const after = t.slice(m.index + n.length, m.index + n.length + 2);
    if (before.includes('%') || after.includes('%')) set.add(`${n}%`);
  }
  return set;
}
const hasLatin = (tok) => /[A-Za-z]/.test(tok);
/** Is `text` (Arabic words plus its numbers) on this page, and each of `tokens`? */
function on(page, text0, tokens = []) {
  const text = page.pdf ? asPrinted(text0) : text0;
  for (const v of page.views) {
    const w = words(text).trim();
    if (w && !v.words.includes(` ${w} `)) continue;
    const nums = [...numbers(text), ...tokens.filter((t) => !hasLatin(t))];
    if (!nums.every((n) => v.nums.has(n))) continue;
    if (!tokens.filter(hasLatin).every((t) => v.flat.includes(t))) continue;
    return true;
  }
  return false;
}
function view(raw) {
  return { words: words(raw), nums: numbers(raw), flat: norm(raw) };
}

// ---------------------------------------------------------------------------
// Reading the PDF

const pdftotext = (file, n, extra = []) =>
  execFileSync('pdftotext', [...extra, '-f', String(n), '-l', String(n), file, '-'], { encoding: 'utf8' });
const pageCount = Number(execFileSync('pdfinfo', [pdf], { encoding: 'utf8' }).match(/^Pages:\s+(\d+)/m)?.[1]);
const pages = [];
for (let n = 1; n <= pageCount; n++) {
  const layout = pdftotext(pdf, n, ['-layout', '-nodiag']);
  const flow = pdftotext(pdf, n, ['-nodiag']);
  const all = pdftotext(pdf, n, ['-layout']); // includes the diagonal watermark, scattered
  pages[n] = { n, layout, all, views: [view(layout), view(flow)], scanned: SCANNED.includes(n), pdf: true };
}
// The scanned pages as a reader (or OCR) sees them: the text of the sheets before rasterising.
const scanPages = Object.fromEntries(SCANNED.map((n) => [n, { n, views: [view(scanText(CTX, n))] }]));
const textPages = pages.filter((p) => p && !p.scanned);

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

// 2. The scanned pages are images with no text layer; every other page has text.
const images = execFileSync('pdfimages', ['-list', pdf], { encoding: 'utf8' }).split('\n').slice(2)
  .map((l) => l.trim().split(/\s+/)).filter((c) => c.length > 4).map((c) => ({ page: Number(c[0]), w: Number(c[3]), h: Number(c[4]) }));
for (const n of SCANNED) {
  const text = pages[n]?.all.replace(/\s+/g, '') || '';
  const img = images.find((i) => i.page === n && i.w > 800 && i.h > 1100);
  check(n, 'scanned page: no text layer, one full-page image', text === '' && !!img, `${text.length} characters of text; ${img ? `image ${img.w}×${img.h}` : 'no full-page image'}`);
}
const empty = textPages.filter((p) => p.layout.replace(/\s+/g, '').length < 200).map((p) => p.n);
check('all', 'every other page has a text layer', empty.length === 0, `little or no text on: ${empty.join(', ')}`);

// 3. Anchors on their pages
for (const a of ANCHORS) {
  const ok = on(pages[a.page], a.phrase, a.tokens);
  const elsewhere = ok ? [] : textPages.filter((p) => on(p, a.phrase, a.tokens)).map((p) => p.n);
  const label = `“${a.phrase}”${a.tokens ? ` + ${a.tokens.join(' ')}` : ''}${a.catch ? ` (catch ${a.catch})` : ''}`;
  check(a.page, label, ok, `found on: ${elsewhere.join(', ') || 'no page'}`);
}

// 4. Tokens that must sit on one page only
for (const x of EXCLUSIVE) {
  const found = textPages.filter((p) => p.views.some((v) => v.nums.has(x.token))).map((p) => p.n);
  check(x.page, `“${x.token}” on this page only`, found.length === 1 && found[0] === x.page, `found on: ${found.join(', ') || 'no page'}`);
}

// 5. The scanned pages hold what the catches need (read from the sheets before rasterising)
check(15, 'BOQ summary: Eastern Arabic digits, the two stamped lines', /[٠-٩]/.test(scanText(CTX, 15)) && BOQ.filter((l) => l.stamped).every((l) => scanText(CTX, 15).includes(l.ar.slice(0, 12))));
check(17, 'bid bond form: a fixed amount of 300,000 (catch 1)', on(scanPages[17], 'مبلغاً لا يتجاوز ٣٠٠٬٠٠٠ ثلاثمائة ألف ريال عماني'));
check(16, 'site-visit certificate: Sunday 15 March 2026, 09:00', on(scanPages[16], 'يوم الأحد ١٥ مارس ٢٠٢٦م في تمام الساعة ٠٩:٠٠ صباحاً'));

// 6. Header (Arabic header and the reference in Latin characters) on every text page but the
//    cover; footer "صفحة N من 18" on every text page.
const headerMissing = [];
const footerMissing = [];
for (const p of textPages) {
  const v = p.views[0];
  const head = v.words.includes(words(asPrinted(META.headerAr))) && v.flat.includes(META.ref);
  if (p.n > 1 && !head) headerMissing.push(p.n);
  const lines = p.layout.split('\n').filter((l) => l.trim());
  const foot = view(lines.slice(-2).join(' '));
  if (!(foot.words.includes(` ${asPrinted(META.footerAr.join(' '))} `) && foot.nums.has(String(p.n)) && foot.nums.has(String(PAGE_COUNT)))) footerMissing.push(p.n);
}
check('text', `header with ${META.ref} on every text page but the cover`, headerMissing.length === 0, `missing on: ${headerMissing.join(', ')}`);
check('text', `footer “${META.footerAr[0]} N ${META.footerAr[1]} ${PAGE_COUNT}” on every text page`, footerMissing.length === 0, `missing on: ${footerMissing.join(', ')}`);
check('scan', `${META.ref} on the letterhead of every scanned page`, SCANNED.every((n) => scanPages[n].views[0].flat.includes(META.ref)));

// 7. Watermark on every page: the diagonal text holds exactly the English line's letters. The
//    scanned pages carry it in the image; it is checked on the sheets printed before rasterising.
const letters = (s) => {
  const m = {};
  for (const ch of s.replace(/[^A-Za-z]/g, '')) m[ch] = (m[ch] || 0) + 1;
  return m;
};
const want = letters(META.watermarkEn);
const hasMark = (all, body) => {
  const a = letters(all);
  const b = letters(body);
  return Object.keys({ ...want, ...a }).every((ch) => (a[ch] || 0) - (b[ch] || 0) === (want[ch] || 0));
};
const noMark = textPages.filter((p) => !hasMark(p.all, p.layout)).map((p) => p.n);
if (existsSync(scanPdf)) {
  SCANNED.forEach((n, i) => {
    if (!hasMark(pdftotext(scanPdf, i + 1, ['-layout']), pdftotext(scanPdf, i + 1, ['-layout', '-nodiag']))) noMark.push(n);
  });
} else noMark.push('scanned pages (run build.mjs)');
// The Arabic line is in the same element; pdftotext scatters rotated Arabic too much to match it.
check('all', `watermark “${META.watermarkEn}” on every page`, noMark.length === 0, `not found on: ${noMark.join(', ')}`);

// 8. No prices. Amounts in rials on the text pages are only the Section 5 thresholds; on the
//    scanned pages only the bid bond form's fixed amount. The CSV has no rate or amount column.
// A figure, then up to three words (the amount in words), then the currency.
const RIAL = /(\d[\d,.]*)\s*\)?\s*(?:[\u0621-\u064a]+\s+){0,3}?(?:ريال|ر\.ع)/g;
const amounts = (t) => [...norm(t).replace(/[()]/g, ' ').replace(/\s+/g, ' ').matchAll(RIAL)].map((m) => m[1]);
const priced = [];
const seen = new Set();
for (const p of textPages) {
  for (const a of p.views.flatMap((v) => amounts(v.flat))) {
    seen.add(a);
    if (!ALLOWED_AMOUNTS.includes(a)) priced.push(`p. ${p.n}: ${a}`);
  }
}
for (const n of SCANNED) {
  for (const a of amounts(scanText(CTX, n))) {
    seen.add(a);
    if (!(n === 17 && a === '300,000')) priced.push(`p. ${n}: ${a}`);
  }
}
// The check must see the amounts it allows, or it is not reading the rials at all.
const sawAll = [...ALLOWED_AMOUNTS, '300,000'].every((a) => seen.has(a));
check('all', 'no prices (only the qualification thresholds and the bond form amount)', priced.length === 0 && sawAll,
  priced.length ? priced.join('; ') : `amounts read: ${[...seen].join(', ') || 'none'}`);
const csvHead = readFileSync(path.join(appDir, OUTPUT.csv), 'utf8').replace(/^﻿/, '').split('\n')[0];
check('csv', 'BOQ CSV: Arabic and English descriptions, no rate or amount column', /description_ar/.test(csvHead) && /description_en/.test(csvHead) && !/rate|amount|price|total/i.test(csvHead), csvHead);

// 9. The print is not scaled: the body text on p. 5 keeps the template's size and leading.
{
  const bbox = execFileSync('pdftotext', ['-bbox', '-nodiag', '-f', '5', '-l', '5', pdf, '-'], { encoding: 'utf8' });
  const ys = [...new Set([...bbox.matchAll(/<word xMin="[\d.]+" yMin="([\d.]+)"/g)].map((m) => Math.round(Number(m[1]) * 10) / 10))]
    .filter((y) => y > 80 && y < 760)
    .sort((a, b) => a - b);
  // The most frequent gap between lines: Arabic paragraphs are short, so the median would be a
  // heading's gap.
  const gaps = ys.slice(1).map((y, i) => Math.round((y - ys[i]) * 4) / 4).filter((g) => g > 4);
  const freq = gaps.reduce((m, g) => m.set(g, (m.get(g) || 0) + 1), new Map());
  const pitch = [...freq].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
  const wantPt = BODY_PT * LEADING;
  check(5, `body line pitch ${wantPt.toFixed(1)} pt (print not scaled)`, Math.abs(pitch - wantPt) < wantPt * 0.04, `measured ${pitch?.toFixed(1)} pt`);
}

// 10. The extraction record: every `source` it cites is on the page it cites.
const recordPath = path.join(appDir, RECORD);
if (existsSync(recordPath)) {
  const src = readFileSync(recordPath, 'utf8');
  const cites = [...src.matchAll(/page:\s*(\d+)[^\n]*?source:\s*'([^']+)'/g)].map((m) => ({ page: Number(m[1]), source: m[2] }));
  const bad = cites.filter((c) => {
    const p = SCANNED.includes(c.page) ? scanPages[c.page] : pages[c.page];
    return !p || !on(p, c.source);
  });
  check('record', `${RECORD}: ${cites.length} Arabic sources, each on its cited page`, cites.length > 20 && bad.length === 0,
    bad.length ? bad.slice(0, 6).map((b) => `p. ${b.page}: “${b.source.slice(0, 50)}”`).join('; ') + (bad.length > 6 ? ` … and ${bad.length - 6} more` : '') : `only ${cites.length} sources found`);
} else {
  check('record', `${RECORD} not written yet (sources not checked)`, true);
}

// Report
const w = Math.min(96, Math.max(...results.map((r) => r.what.length)));
console.log(`\nVerify ${OUTPUT.pdf}\n`);
console.log(`${'Page'.padEnd(7)} ${'Check'.padEnd(w)}  Result`);
console.log(`${'-'.repeat(7)} ${'-'.repeat(w)}  ------`);
for (const r of results) {
  console.log(`${String(r.page).padEnd(7)} ${r.what.padEnd(w)}  ${r.ok ? 'pass' : 'FAIL'}${r.detail && !r.ok ? `  (${r.detail})` : ''}`);
}

// PNGs for a visual check (not committed)
mkdirSync(outDir, { recursive: true });
for (const n of PNG_PAGES.filter((p) => p <= pageCount)) {
  execFileSync('pdftoppm', ['-r', '60', '-png', '-f', String(n), '-l', String(n), '-singlefile', pdf, path.join(outDir, `page-${String(n).padStart(2, '0')}`)]);
}
console.log(`\nPNG previews of pages ${PNG_PAGES.join(', ')} written to ${path.relative(appDir, outDir)}/.`);

const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `\n✗ ${failed.length} of ${results.length} checks failed.` : `\n✓ All ${results.length} checks passed.`);
process.exit(failed.length ? 1 : 0);

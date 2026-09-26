// Builds the synthetic Arabic tender document ILRA/RD/2026/042 (and its BOQ CSV) with headless Chrome.
// Usage: npm --prefix app run demo-itt:ilra                (build, then verify)
//        node scripts/demo-itt/ilra-042/build.mjs          (build only)
// Three passes: measure every page on screen; print the three scanned pages as photocopied sheets
// and rasterise them with pdftoppm; print the document with those images in place, so the
// scanned pages have no text layer. Headless Chrome on macOS writes the PDF and then does not
// exit, so each run waits for its "written" signal, stops it, and gives up after a timeout.

import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, statSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { META, PARTS, PAGES, BILLS, BOQ, BOQ_TOTAL_LINES, PAGE_COUNT, SCANNED, OUTPUT, PDF_DATE } from './content.mjs';
import { renderHtml } from './template.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, '../../..');
const outDir = path.join(here, '.out');
const pdfPath = path.join(appDir, OUTPUT.pdf);
const csvPath = path.join(appDir, OUTPUT.csv);
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MAX_BYTES = 1.5 * 1024 * 1024;
const FILL_MAX = 0.985; // screen and print layout can differ by a line; keep one in hand
const FILL_SPARSE = 0.5;
const SCAN_DPI = 110;
const CTX = { meta: META, parts: PARTS, pages: PAGES, bills: BILLS, boq: BOQ, totalLines: BOQ_TOTAL_LINES };

function fail(msg) {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

function runChrome(args, isDone, label) {
  const profile = path.join(outDir, `chrome-profile-${label}`);
  rmSync(profile, { recursive: true, force: true });
  const all = [
    '--headless=new', '--disable-gpu', '--use-mock-keychain', '--password-store=basic',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-networking', '--disable-component-update', '--disable-sync',
    '--allow-file-access-from-files', `--user-data-dir=${profile}`, ...args,
  ];
  return new Promise((resolve, reject) => {
    const child = spawn(CHROME, all, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child.kill('SIGTERM');
    };
    const check = () => { if (isDone(out, err)) finish(); };
    child.stdout.on('data', (d) => { out += d; check(); });
    child.stderr.on('data', (d) => { err += d; check(); });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Chrome (${label}) did not finish within 90 s.\n${err.slice(-2000)}`));
    }, 90_000);
    child.on('error', reject);
    child.on('exit', () => {
      clearTimeout(timer);
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      if (done || isDone(out, err)) resolve({ out, err });
      else reject(new Error(`Chrome (${label}) exited early.\n${err.slice(-2000)}`));
    });
  });
}

const printPdf = (html, file, label) => runChrome(
  ['--no-pdf-header-footer', `--print-to-pdf=${file}`, pathToFileURL(html).href],
  (o, e) => /bytes written to file/.test(o + e),
  label,
);

const pdfPages = (file) => Number(execFileSync('pdfinfo', [file], { encoding: 'utf8' }).match(/^Pages:\s+(\d+)/m)?.[1]);

function checkContentShape() {
  if (PAGES.length !== PAGE_COUNT) fail(`content.mjs has ${PAGES.length} pages; expected ${PAGE_COUNT}.`);
  PAGES.forEach((p, i) => { if (p.n !== i + 1) fail(`Page object ${i} is numbered ${p.n}; expected ${i + 1}.`); });
  const scans = PAGES.filter((p) => p.scan).map((p) => p.n);
  if (scans.join() !== SCANNED.join()) fail(`Scanned pages are ${scans.join(', ')}; SCANNED says ${SCANNED.join(', ')}.`);
  // Clauses run 1–40 without gaps.
  const clauses = PAGES.flatMap((p) => p.blocks.filter((b) => b.t === 'clause').map((b) => b.no));
  clauses.forEach((no, i) => { if (no !== i + 1) fail(`Clause heading ${i + 1} is numbered ${no}.`); });
  if (clauses.length !== 40) fail(`The document has ${clauses.length} numbered clauses; expected 40.`);
  const items = new Set();
  for (const l of BOQ) {
    if (items.has(l.item)) fail(`BOQ item ${l.item} appears twice.`);
    items.add(l.item);
    if (!BILLS.some((b) => String(b.no) === l.item.split('.')[0])) fail(`BOQ item ${l.item} has no bill.`);
  }
  const stamped = BOQ.filter((l) => l.stamped);
  if (stamped.length !== 2 || stamped.some((l) => !l.summary)) fail('Exactly two summary lines must sit under the stamp (catch 3).');
  const pkgs = new Set(BOQ.filter((l) => l.pkg).map((l) => l.pkg));
  if (pkgs.size !== 6) fail(`The BOQ lines name ${pkgs.size} packages; expected 6.`);
}

async function measure() {
  const file = path.join(outDir, 'measure.html');
  writeFileSync(file, renderHtml(CTX, 'measure'));
  const { out } = await runChrome(['--dump-dom', pathToFileURL(file).href], (o) => o.includes('</html>'), 'measure');
  const m = out.match(/MEASURE(\{.*?\})#END/s);
  if (!m) fail('The measuring pass returned no page heights.');
  const { pageHeightMm, sheetHeightMm, rows } = JSON.parse(m[1]);
  const over = [];
  const sparse = [];
  const wide = rows.filter((r) => r[2]).map((r) => `p. ${r[0]}`);
  const line = rows.map(([n, h]) => {
    const fill = h / (SCANNED.includes(n) ? sheetHeightMm : pageHeightMm);
    if (fill > FILL_MAX) over.push(`p. ${n} (${Math.round(fill * 100)}%)`);
    else if (fill < FILL_SPARSE && n > 1) sparse.push(`p. ${n} (${Math.round(fill * 100)}%)`);
    return `${String(n).padStart(2)}:${String(Math.round(fill * 100)).padStart(3)}%`;
  });
  console.log('Page fill (content height ÷ printable height):');
  for (let i = 0; i < line.length; i += 9) console.log('  ' + line.slice(i, i + 9).join('  '));
  if (sparse.length) console.log(`  Sparse pages: ${sparse.join(', ')}`);
  if (over.length) fail(`These pages are too full and would overflow: ${over.join(', ')}. Trim their text.`);
  if (wide.length) fail(`Content is wider than its box on ${wide.join(', ')}.`);
}

/** Prints the scanned pages as photocopied sheets and rasterises them to greyscale JPEGs. */
async function scans() {
  const html = path.join(outDir, 'scan.html');
  const pdf = path.join(outDir, 'scan.pdf');
  writeFileSync(html, renderHtml(CTX, 'scan'));
  rmSync(pdf, { force: true });
  await printPdf(html, pdf, 'scan');
  const n = pdfPages(pdf);
  if (n !== SCANNED.length) fail(`The scan pass printed ${n} pages; expected ${SCANNED.length}.`);
  const files = {};
  SCANNED.forEach((page, i) => {
    const base = path.join(outDir, `scan-${page}`);
    execFileSync('pdftoppm', ['-jpeg', '-gray', '-r', String(SCAN_DPI), '-jpegopt', 'quality=70', '-f', String(i + 1), '-l', String(i + 1), '-singlefile', pdf, base]);
    if (!existsSync(`${base}.jpg`)) fail(`pdftoppm did not write ${base}.jpg.`);
    files[page] = `scan-${page}.jpg`;
  });
  console.log(`Scanned pages ${SCANNED.join(', ')} rasterised at ${SCAN_DPI} dpi (greyscale JPEG).`);
  return files;
}

/**
 * Pins the PDF's CreationDate and ModDate to `PDF_DATE` (content.mjs: the tender's issue date, a fixed time
 * zone), so a rebuild writes the same bytes and the file is never dated after the demo's "today". Chrome's
 * own stamp has the same length ("D:YYYYMMDDHHmmSS+HH'mm'"), so the cross-reference offsets stay valid.
 */
function pinDates(file) {
  const text = readFileSync(file).toString('latin1');
  let n = 0;
  const out = text.replace(/\/(CreationDate|ModDate) \((D:[^)]*)\)/g, (m, key, date) => {
    if (date.length !== PDF_DATE.length) fail(`Unexpected ${key} in the PDF: ${date}. Expected the form of ${PDF_DATE}.`);
    n++;
    return `/${key} (${PDF_DATE})`;
  });
  if (n !== 2) fail(`Expected one CreationDate and one ModDate in the PDF; found ${n}.`);
  writeFileSync(file, Buffer.from(out, 'latin1'));
}

async function print(images) {
  const file = path.join(outDir, 'document.html');
  writeFileSync(file, renderHtml(CTX, 'print', images));
  mkdirSync(path.dirname(pdfPath), { recursive: true });
  rmSync(pdfPath, { force: true });
  await printPdf(file, pdfPath, 'print');
  const pages = pdfPages(pdfPath);
  if (pages !== PAGE_COUNT) fail(`Chrome produced ${pages} pages; expected ${PAGE_COUNT}. A page overflowed: trim its text.`);
  pinDates(pdfPath);
  const bytes = statSync(pdfPath).size;
  console.log(`\nPDF: ${path.relative(appDir, pdfPath)} · ${pages} pages · ${(bytes / 1024).toFixed(0)} KB`);
  if (bytes > MAX_BYTES) fail(`The PDF is ${(bytes / 1048576).toFixed(2)} MB; the limit is 1.5 MB.`);
}

function csv() {
  const q = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const rows = [['item', 'bill', 'description_ar', 'description_en', 'unit', 'unit_en', 'qty', 'package']];
  for (const b of BILLS) {
    rows.push([`Bill ${b.no}`, b.no, b.ar, b.en, '', '', '', '']);
    for (const l of BOQ.filter((x) => x.item.split('.')[0] === String(b.no))) {
      rows.push([l.item, b.no, l.ar, l.en, l.unit, l.unitEn, l.qty, l.pkg || 'in-house']);
    }
  }
  // UTF-8 with a byte-order mark, so spreadsheet programs read the Arabic correctly.
  writeFileSync(csvPath, '﻿' + rows.map((r) => r.map(q).join(',')).join('\n') + '\n');
  console.log(`CSV: ${path.relative(appDir, csvPath)} · ${BILLS.length} bills, ${BOQ.length} representative lines of ${BOQ_TOTAL_LINES}`);
}

mkdirSync(outDir, { recursive: true });
checkContentShape();
try {
  await measure();
  const images = await scans();
  await print(images);
} catch (e) {
  fail(e.message);
}
csv();
console.log(`Build OK. The printed HTML is in ${path.relative(appDir, outDir)}/document.html.`);

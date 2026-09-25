// Builds the synthetic hero booklet PDF (and the Vol. 2 BOQ extract CSV) with headless Chrome.
// Usage: npm --prefix app run hero-itt   (build, then verify)
//        node scripts/hero-itt/build.mjs  (build only)
// Headless Chrome on macOS writes the PDF and then does not exit, so each run waits for its
// "written" signal, stops it, and gives up after a timeout.

import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, statSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { META, PARTS, PAGES, BILLS, PAGE_COUNT, OUTPUT } from './content.mjs';
import { renderHtml } from './template.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, '../..');
const outDir = path.join(here, '.out');
const pdfPath = path.join(appDir, OUTPUT.pdf);
const csvPath = path.join(appDir, OUTPUT.csv);
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MAX_BYTES = 1.5 * 1024 * 1024;
const FILL_MAX = 0.985; // screen and print layout can differ by a line; keep one in hand
const FILL_SPARSE = 0.55;

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
    `--user-data-dir=${profile}`, ...args,
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

function checkContentShape() {
  if (PAGES.length !== PAGE_COUNT) fail(`content.mjs has ${PAGES.length} pages; expected ${PAGE_COUNT}.`);
  PAGES.forEach((p, i) => { if (p.n !== i + 1) fail(`Page object ${i} is numbered ${p.n}; expected ${i + 1}.`); });
  const lines = BILLS.reduce((s, b) => s + b.lineCount, 0);
  if (lines !== META.boqLines) fail(`Bill line counts sum to ${lines}; expected ${META.boqLines}.`);
  BILLS.forEach((b) => {
    if (b.items.length >= b.lineCount) fail(`Bill ${b.no} lists more representative lines than it has.`);
  });
  // Clauses run 1–89 without gaps, in the model booklet's order.
  const clauses = PAGES.flatMap((p) => p.blocks.filter((b) => b.t === 'clause').map((b) => b.no));
  clauses.forEach((no, i) => { if (no !== i + 1) fail(`Clause heading ${i + 1} is numbered ${no}.`); });
  if (clauses.length !== 89) fail(`The booklet has ${clauses.length} numbered clauses; expected 89.`);
}

async function measure() {
  const file = path.join(outDir, 'measure.html');
  writeFileSync(file, renderHtml({ meta: META, parts: PARTS, pages: PAGES }, 'measure'));
  const { out } = await runChrome(['--dump-dom', pathToFileURL(file).href], (o) => o.includes('</html>'), 'measure');
  const m = out.match(/MEASURE(\{.*?\})#END/s);
  if (!m) fail('The measuring pass returned no page heights.');
  const { pageHeightMm, rows } = JSON.parse(m[1]);
  const over = [];
  const sparse = [];
  const wide = rows.filter((r) => r[2]).map((r) => `p. ${r[0]}`);
  const line = rows.map(([n, h]) => {
    const fill = h / pageHeightMm;
    if (fill > FILL_MAX) over.push(`p. ${n} (${Math.round(fill * 100)}%)`);
    else if (fill < FILL_SPARSE && n > 1) sparse.push(`p. ${n} (${Math.round(fill * 100)}%)`);
    return `${String(n).padStart(2)}:${String(Math.round(fill * 100)).padStart(3)}%`;
  });
  console.log('Page fill (content height ÷ printable height):');
  for (let i = 0; i < line.length; i += 8) console.log('  ' + line.slice(i, i + 8).join('  '));
  if (sparse.length) console.log(`  Sparse pages: ${sparse.join(', ')}`);
  if (over.length) fail(`These pages are too full and would overflow: ${over.join(', ')}. Trim their text.`);
  // Content wider than the page would run off it, or over the neighbouring table cell.
  if (wide.length) fail(`Content is wider than the page on ${wide.join(', ')} (a no-wrap span in a narrow cell?).`);
}

async function print() {
  const file = path.join(outDir, 'booklet.html');
  writeFileSync(file, renderHtml({ meta: META, parts: PARTS, pages: PAGES }, 'print'));
  mkdirSync(path.dirname(pdfPath), { recursive: true });
  rmSync(pdfPath, { force: true });
  await runChrome(
    ['--no-pdf-header-footer', `--print-to-pdf=${pdfPath}`, pathToFileURL(file).href],
    (o, e) => /bytes written to file/.test(o + e),
    'print',
  );
  const info = execFileSync('pdfinfo', [pdfPath], { encoding: 'utf8' });
  const pages = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
  if (pages !== PAGE_COUNT) fail(`Chrome produced ${pages} pages; expected ${PAGE_COUNT}. A page overflowed: trim its text.`);
  const bytes = statSync(pdfPath).size;
  console.log(`\nPDF: ${path.relative(appDir, pdfPath)} · ${pages} pages · ${(bytes / 1024).toFixed(0)} KB`);
  if (bytes > MAX_BYTES) fail(`The PDF is ${(bytes / 1048576).toFixed(2)} MB; the limit is 1.5 MB.`);
}

function csv() {
  const q = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const rows = [['item', 'bill', 'description', 'unit', 'qty']];
  for (const b of BILLS) {
    rows.push([`Bill ${b.no}`, b.no, b.title, '', '']);
    for (const it of b.items) rows.push([it.item, b.no, it.description, it.unit, it.qty]);
    const rest = b.lineCount - b.items.length;
    rows.push([`${b.no}.x`, b.no, `Remaining items in bill ${b.no} (${rest} lines)`, '', '']);
  }
  writeFileSync(csvPath, rows.map((r) => r.map(q).join(',')).join('\n') + '\n');
  console.log(`CSV: ${path.relative(appDir, csvPath)} · ${BILLS.length} bills, ${BILLS.reduce((s, b) => s + b.items.length, 0)} representative lines`);
}

mkdirSync(outDir, { recursive: true });
checkContentShape();
try {
  await measure();
  await print();
} catch (e) {
  fail(e.message);
}
csv();
console.log(`Build OK. The printed HTML is in ${path.relative(appDir, outDir)}/booklet.html.`);

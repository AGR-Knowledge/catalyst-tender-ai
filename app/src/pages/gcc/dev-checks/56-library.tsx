import { useMemo } from 'react';
import { useTenantKey } from '@/domain/tenancy';
import { firstWithRole, type Person } from '@/data/people';
import { isGccTenantKey } from '@/data/gcc';
import { port } from '@/domain/gcc/lifecycle.port';
import { queriesFor } from '@/domain/gcc/lifecycle';
import { addendaFor } from '@/domain/gcc/s1';
import { dataOf } from '@/domain/gcc/s1/common';
import { dg1PackFor, dg1Write } from '@/domain/gcc/dg1';
import { quotesFor, rfqsFor, sentBy } from '@/domain/gcc/s2';
import { documentFor } from '@/domain/gcc/documents';
import { HERO_ID } from '@/data/gcc/hero';
import {
  DATED_WORD, WATERMARK, flatFolders, libFileWrite, libFilesOf, libraryFor, type LibraryFileVM, type LibraryVM,
} from '@/domain/gcc/library';
import { boqOf, dg1PursueOf } from '@/domain/gcc/library/documents';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Plan 030: every tender's library, as its Head of Tendering and four other
 * people, on the seed (`done` is an empty map in memory, and the upload row
 * writes into a copy), so it changes nothing. The library agrees with the
 * modules it reads (addenda, RFQs and replies, the tracker's gates), masks what
 * the viewer may not see, and every facsimile is a watermarked document with
 * no script. Plan 033 (rows 13–18): every tender pursued at DG1 has its
 * booklet (the held PDF, else one extract), and every file's date says
 * Received, Sent or Made.
 */

interface Check { name: string; ok: boolean; got: string }

const DONE: Record<string, string> = {};

const htmlOf = (f: LibraryFileVM) => (f.view.kind === 'html' ? f.view.html() : null);
const inFolder = (lib: LibraryVM, id: string) => flatFolders(lib.folders).find((f) => f.id === id) ?? null;
const list = (xs: string[], n = 3) => (xs.length ? `${xs.slice(0, n).join(', ')}${xs.length > n ? ` +${xs.length - n}` : ''}` : 'none');

function checks(tenant: string): Check[] {
  const out: Check[] = [];
  const add = (name: string, ok: boolean, got: string) => out.push({ name, ok, got });
  const hot = firstWithRole(tenant, 'hot')!;
  const rows = port.rows(tenant, { kind: 'all' }, hot, 'all', DONE);
  const libOf = (viewer: Person, id: string) => libraryFor({ tenant, viewer, done: DONE }, id);
  const libs = rows.map((r) => ({ id: r.id, lib: libOf(hot, r.id) }));
  const all = libs.flatMap((x) => (x.lib ? [x as { id: string; lib: LibraryVM }] : []));

  // 1. Every tender the Head of Tendering can open has a library, opening with its notice.
  const noNotice = libs.filter((x) => !x.lib || !inFolder(x.lib, '01')?.files.some((f) => f.kind === 'notice')).map((x) => x.id);
  add('Every tender opens with its notice in 01', !noNotice.length, `${all.length} of ${rows.length} libraries · without a notice: ${list(noNotice)}`);

  // 2. Addenda: 01 › Addenda holds exactly `addendaFor`, the source of the tab's "Add. n" badge.
  const addOff = all.filter(({ id, lib }) => (inFolder(lib, '01/addenda')?.files.length ?? 0) !== addendaFor(tenant, id).length).map((x) => x.id);
  const addN = all.reduce((n, x) => n + addendaFor(tenant, x.id).length, 0);
  add('01 › Addenda equals addendaFor on every tender', !addOff.length, `${addN} addenda · off: ${list(addOff)}`);

  // 3. A held booklet is its own PDF, with its BOQ where the demo holds one (the hero's, Corniche's T-2026-061, Batinah's T-2026-042).
  const held = all.flatMap(({ id, lib }) => { const d = documentFor(tenant, id); return d ? [{ id, lib, d }] : []; });
  const heldOff = held.filter(({ lib, d }) => !lib.files.some((f) => f.kind === 'booklet' && f.view.kind === 'url' && f.view.src === d.url)).map((x) => x.id);
  const withBoq = held.filter(({ d }) => boqOf(d.url));
  const boqOff = withBoq.filter(({ lib, d }) => !lib.files.some((f) => f.kind === 'boq' && f.view.kind === 'csv' && f.view.src === boqOf(d.url))).map((x) => x.id);
  add('Held booklets open as their PDF, with their BOQ where held', !heldOff.length && !boqOff.length,
    `${held.length} held · booklet off: ${list(heldOff)} · BOQ on ${withBoq.length ? withBoq.map((x) => x.id).join(', ') : 'none'}${boqOff.length ? ` · missing on ${list(boqOff)}` : ''}`);

  // 4. An Arabic booklet (Batinah's T-2026-042) is tagged Arabic, and a scanned one carries its OCR pages.
  const arabic = held.filter(({ d }) => d.lang === 'ar').map(({ id, lib, d }) => ({ id, d, f: lib.files.find((f) => f.kind === 'booklet') }));
  const arOff = arabic.filter(({ d, f }) => !f || f.lang !== 'AR' || (d.scanned && (!f.scanned || !f.ocrText))).map((x) => x.id);
  add('Arabic booklets: tagged AR; a scanned one with its OCR pages', !arOff.length,
    arabic.length ? arabic.map(({ id, f }) => `${id} ${f?.lang ?? 'no language'}${f?.scanned ? `, scanned, OCR ${f.ocrText ?? 'none'}` : ''}`).join(' · ') + (arOff.length ? ` · off: ${list(arOff)}` : '') : 'no Arabic booklet in this company');

  // 5. 04 holds the Sourcing tab's RFQs as sent and every reply (a quote or a decline), for the same demo state.
  const withRfqs = all.filter(({ id }) => rfqsFor(tenant, id, DONE).some((r) => sentBy(r)));
  const srcOff = withRfqs.filter(({ id, lib }) => {
    const rfqs = rfqsFor(tenant, id, DONE).filter((r) => sentBy(r));
    const quotes = quotesFor(tenant, id, DONE);
    const replies = rfqs.filter((r) => (r.quoteId && r.repliedAt && quotes.some((q) => q.id === r.quoteId)) || r.declined).length;
    const n = (k: string) => lib.files.filter((f) => f.kind === k).length;
    return n('rfq') !== rfqs.length || n('quote') + n('decline') !== replies;
  }).map((x) => x.id);
  const rfqN = withRfqs.reduce((n, x) => n + x.lib.files.filter((f) => f.kind === 'rfq').length, 0);
  add('04 equals the RFQs sent and their replies', !srcOff.length, `${withRfqs.length} tenders · ${rfqN} RFQs · off: ${list(srcOff)}`);

  // 6. Masking in 04: the Tender Coordinator sees the count only; with `see.quotes.summary` (the CEO) a quote shows
  //    the levelled total and masks the supplier's prices; with `see.quotes` (Procurement) nothing is masked.
  const coord = firstWithRole(tenant, 'coord');
  const exec = firstWithRole(tenant, 'exec');
  const proc = firstWithRole(tenant, 'proc');
  const quoted = withRfqs.find(({ lib }) => lib.files.some((f) => f.kind === 'quote'));
  if (quoted && coord && exec && proc) {
    const c = libOf(coord, quoted.id);
    const coordOk = !c || (!!inFolder(c, '04')?.masked && !c.files.some((f) => f.kind === 'rfq' || f.kind === 'quote'));
    const q = (p: Person) => libOf(p, quoted.id)?.files.find((f) => f.kind === 'quote') ?? null;
    const eq = q(exec); const pq = q(proc);
    const eh = eq ? htmlOf(eq) ?? '' : ''; const ph = pq ? htmlOf(pq) ?? '' : '';
    const execOk = !!eq && eh.includes('class="mask"') && eh.includes('Levelled total');
    const procOk = !!pq && !ph.includes('class="mask"');
    add(`04 masking on ${quoted.id}: coordinator, CEO (summary), Procurement`, coordOk && execOk && procOk,
      `coordinator ${c ? (coordOk ? 'count only' : 'sees files') : 'cannot open it'} · CEO ${execOk ? 'total only' : 'off'} · Procurement ${procOk ? 'prices' : 'masked'}`);
  } else add('04 masking: coordinator, CEO (summary), Procurement', true, 'no quote received in this company');

  // 7. Commercial figures (the commercial proposal, the bid bond, an award's value) need `see.margin`.
  const commercial = (lib: LibraryVM) => lib.files.filter((f) => f.id === '05/commercial/commercial' || f.id === '05/forms/bond' || (f.id === '07/result' && f.tags.includes('Won')));
  const figure = (f: LibraryFileVM) => f.id !== '07/result' || !!htmlOf(f)?.includes('excluding VAT');
  const withCommercial = all.filter(({ lib }) => commercial(lib).length);
  const hotMasked = withCommercial.filter(({ lib }) => commercial(lib).some((f) => f.masked)).map((x) => x.id);
  const coordLeak = coord ? withCommercial.filter(({ id }) => { const l = libOf(coord, id); return !!l && commercial(l).some((f) => !f.masked && figure(f)); }).map((x) => x.id) : [];
  add('Commercial files: figures for see.margin only', !hotMasked.length && !coordLeak.length,
    `${withCommercial.length} tenders · Head of Tendering masked on ${list(hotMasked)} · coordinator sees figures on ${list(coordLeak)}`);

  // 8. 03 has a sub-folder for each gate the tracker shows as reached, and no other.
  const gateOff = all.filter(({ id, lib }) => {
    const reached = (port.tracker(tenant, id, hot, DONE)?.nodes ?? []).filter((n) => n.kind === 'gate' && n.status !== 'not-reached').map((n) => n.gate!.toLowerCase());
    const have = (inFolder(lib, '03')?.folders ?? []).map((f) => f.id.slice(3));
    return reached.sort().join() !== have.sort().join();
  }).map((x) => x.id);
  add('03 › DG1–DG3: exactly the gates the tracker shows as reached', !gateOff.length, `off: ${list(gateOff)}`);

  // 9. No two files in one folder share a name.
  const dupes = all.flatMap(({ id, lib }) => flatFolders(lib.folders).filter((f) => new Set(f.files.map((x) => x.name.toLowerCase())).size !== f.files.length).map((f) => `${id} ${f.id}`));
  add('No two files in one folder share a name', !dupes.length, `${all.reduce((n, x) => n + x.lib.count, 0)} files · repeated in: ${list(dupes)}`);

  // 10. Every facsimile is watermarked on every page and has no script.
  const facs = all.flatMap(({ lib }) => lib.files.filter((f) => f.view.kind === 'html'));
  const facOff = facs.filter((f) => {
    const h = htmlOf(f)!;
    const pages = (h.match(/class="page[" ]/g) ?? []).length;
    return /<script/i.test(h) || !h.includes(WATERMARK) || (h.match(/class="wm"/g) ?? []).length < pages;
  }).map((f) => f.name);
  add('Every facsimile: a watermark on each page, no script', !facOff.length, `${facs.length} facsimiles · off: ${list(facOff, 2)}`);

  // 11. Add file: a write reads back, the same name again is version 2 and still one row.
  const hero = [HERO_ID, ...all.map((x) => x.id)].find((id) => { const l = all.find((x) => x.id === id)?.lib; return !!l && !!inFolder(l, '05/technical'); });
  if (hero) {
    const file = { name: 'Check draft.pdf', size: 2048, type: 'application/pdf' };
    const w1 = libFileWrite(DONE, hero, '05/technical', file, '2026-03-08T10:00', hot.id);
    const d1 = { ...DONE, [w1.key]: w1.value };
    const w2 = libFileWrite(d1, hero, '05/technical', file, '2026-03-08T10:01', hot.id);
    const d2 = { ...d1, [w2.key]: w2.value };
    const back = libFilesOf(d2, hero);
    const rowsIn = libraryFor({ tenant, viewer: hot, done: d2 }, hero)?.files.filter((f) => f.name === file.name) ?? [];
    const ok = !w1.again && w2.again && back.length === 1 && back[0].version === 2 && rowsIn.length === 1 && rowsIn[0].tags.includes('v2');
    add('Add file: reads back; the same name again is v2, one row', ok, `${hero} · ${back.length} key, version ${back[0]?.version ?? '-'} · ${rowsIn.length} row${rowsIn[0] ? `, tags ${rowsIn[0].tags.join(', ')}` : ''}`);
  } else add('Add file: reads back; the same name again is v2, one row', false, 'no library to add to');

  // 12. No empty folder, except 05 Our proposal and its sub-folders (always there to add to).
  const empty = all.flatMap(({ id, lib }) => flatFolders(lib.folders).filter((f) => !f.count && !f.id.startsWith('05')).map((f) => `${id} ${f.id}`));
  add('No empty folder, except 05 Our proposal', !empty.length, `empty: ${list(empty)}`);

  // Plan 033. 13–14. A tender we pursued at DG1 has its booklet: the held PDF, else exactly one extract in 01. No other tender has an extract.
  const lcs = queriesFor({ tenant, viewer: hot, done: DONE });
  const extracts = (lib: LibraryVM) => lib.files.filter((f) => f.kind === 'booklet-extract');
  const pursued = all.filter(({ id }) => { const l = lcs.one(id); return !!l && !!dg1PursueOf(l); });
  const wantExtract = pursued.filter(({ id }) => !documentFor(tenant, id));
  const extractOff = wantExtract.filter(({ lib }) => { const x = extracts(lib); return x.length !== 1 || x[0].folderId !== '01'; }).map((x) => x.id);
  add('Every DG1 Pursue without a held PDF: one booklet extract in 01', !extractOff.length,
    `${pursued.length} pursued · ${pursued.length - wantExtract.length} with the held PDF · ${wantExtract.length} extracts · off: ${list(extractOff)}`);
  const pursuedIds = new Set(pursued.map((x) => x.id));
  const strayExtract = all.filter(({ id, lib }) => extracts(lib).length && (!pursuedIds.has(id) || !!documentFor(tenant, id))).map((x) => x.id);
  add('No extract without a DG1 Pursue, or beside a held PDF', !strayExtract.length, `${all.length - wantExtract.length} tenders without one · with one: ${list(strayExtract)}`);

  // 15. The extract reaches us with the booklet receipt in 02 or after it (bought through the portal), never before.
  const withReceipt = wantExtract.flatMap(({ id, lib }) => {
    const x = extracts(lib)[0];
    const r = lib.files.find((f) => f.folderId === '02' && f.title === 'Booklet purchase receipt');
    return x && r ? [{ id, x, r }] : [];
  });
  const beforeReceipt = withReceipt.filter(({ x, r }) => !x.receivedAt || !r.receivedAt || x.receivedAt < r.receivedAt).map((x) => x.id);
  add('Extract dated at or after the booklet receipt', !beforeReceipt.length,
    withReceipt.length ? `${withReceipt.map(({ id, x }) => `${id} ${x.receivedAt}`).join(', ')} · before it: ${list(beforeReceipt)}` : 'no pursued tender here bought its booklet through the portal');

  // 16. Every file says what its date is: Received, Sent or Made.
  const filesAll = all.flatMap(({ lib }) => lib.files);
  const byWord = (w: string) => filesAll.filter((f) => f.dated === w).length;
  const undated = filesAll.filter((f) => !f.dated || !(f.dated in DATED_WORD)).map((f) => f.name);
  add('Every file says Received, Sent or Made', !undated.length,
    `${filesAll.length} files · ${byWord('received')} received · ${byWord('sent')} sent · ${byWord('made')} made · without: ${list(undated, 2)}`);

  // 17. No two files in one tender share a name, across its folders.
  const tenderDupes = all.filter(({ lib }) => new Set(lib.files.map((f) => f.name.toLowerCase())).size !== lib.files.length).map((x) => x.id);
  add('No two files in one tender share a name', !tenderDupes.length, `${all.length} tenders · repeated in: ${list(tenderDupes)}`);

  // 18. A DG1 Pursue recorded in the demo adds the extract; an Arabic tender's is tagged AR and points to the Arabic original.
  const arabicIds = new Set(dataOf(tenant).intakeToday.filter((e) => e.language === 'AR').flatMap((e) => (e.tenderId ? [e.tenderId] : [])));
  const livePursue = (ids: string[]) => {
    for (const id of ids) {
      const pack = dg1PackFor(tenant, id, DONE);
      if (!pack) continue;
      try {
        const w = dg1Write({ tenderId: id, decision: 'pursue', reasonCodes: [], note: 'Dev check', at: '2026-03-08T10:20' }, hot.id, pack, DONE);
        const d = { ...DONE, ...Object.fromEntries(w.writes.map((x) => [x.key, x.value])) };
        const lib = libraryFor({ tenant, viewer: hot, done: d }, id);
        return { id, x: lib ? extracts(lib) : [] };
      } catch { /* refused (a field still being validated): try the next */ }
    }
    return null;
  };
  const waiting = rows.filter((r) => r.live && r.stage === 1 && !documentFor(tenant, r.id)).map((r) => r.id);
  const en = livePursue(waiting.filter((id) => !arabicIds.has(id)));
  const ar = livePursue(waiting.filter((id) => arabicIds.has(id)));
  const arOk = !ar || (ar.x.length === 1 && ar.x[0].lang === 'AR' && !!htmlOf(ar.x[0])?.includes('Arabic original'));
  // Dated at the Pursue's minute (10:20) or at an earlier portal purchase, never after the demo clock.
  add('A DG1 Pursue in the demo adds the extract, never dated after it; Arabic: AR and the original',
    (!en || (en.x.length === 1 && !!en.x[0].receivedAt && en.x[0].receivedAt <= '2026-03-08T10:20')) && arOk,
    `${en ? `${en.id} ${en.x.length} extract${en.x[0] ? ` dated ${en.x[0].receivedAt}` : ''}` : 'no tender to pursue'} · ${ar ? `${ar.id} ${ar.x[0]?.lang ?? 'no language'}${arOk ? ', points to the Arabic original' : ', off'}` : 'no Arabic tender waiting for DG1'}`);

  return out;
}

export default function LibraryCheck() {
  const tenant = useTenantKey();
  const rows = useMemo(() => (isGccTenantKey(tenant) ? checks(tenant) : []), [tenant]);
  if (!isGccTenantKey(tenant)) return <CardHead title="Tender library (plans 030, 033)" meta="No GCC seed for this tenant" />;
  const failing = rows.filter((r) => !r.ok).length;
  return (
    <>
      <CardHead title="Tender library (plans 030, 033)" meta={failing ? `${failing} of ${rows.length} failing` : `All ${rows.length} pass`} />
      <DataTable
        rows={rows}
        rowKey={(c) => c.name}
        columns={[
          { key: 'n', header: 'Check', width: '1.5fr', primary: true, render: (c) => <span className="cell-main">{c.name}</span> },
          { key: 'g', header: 'Got', width: '2fr', render: (c) => c.got },
          { key: 'r', header: 'Result', width: '.6fr', align: 'right', render: (c) => (c.ok ? <span className="t-green">✓ Pass</span> : <span className="t-red">× Fail</span>) },
        ]}
      />
    </>
  );
}

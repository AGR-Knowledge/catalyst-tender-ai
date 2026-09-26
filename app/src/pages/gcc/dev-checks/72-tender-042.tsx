import { useMemo } from 'react';
import { gccData } from '@/data/gcc';
import { can } from '@/data/access';
import { firstWithRole, type Person } from '@/data/people';
import { documentFor, isArabicRecord, isGccRecord } from '@/domain/gcc/documents';
import { currentOf, lifecycle, queriesFor, tenderCtx, type DemoDone } from '@/domain/gcc/lifecycle';
import { bidBondFor, eligibilityFor, fitFor, validationAction } from '@/domain/gcc/s1';
import { dg1PackFor, dg1Write } from '@/domain/gcc/dg1';
import { packagesFor } from '@/domain/gcc/s2/packaging';
import { MASKED_TEXT, packFor, packReadyKey, type PackViewer } from '@/domain/gcc/s3';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Dev check for plan 023: the third demo tender, T-2026-042 in Batinah, whose document is Arabic with
 * three scanned pages. It checks Batinah's data in every tenant (the tender lives in Batinah only), so
 * the rows read the same whichever tenant is active. The PDF itself is checked by
 * `npm --prefix app run demo-itt:ilra`. Values are typed only in `EXPECT`.
 */

const TENANT = 'batinah';
const T = 'T-2026-042';
const OCR_PAGES = [15, 16, 17];

const EXPECT: Record<string, string> = {
  'Document resolves, Arabic and GCC record': '/bids/gcc/ILRA-RD-2026-042-booklet-ar.pdf · ar · Arabic · groups and conflicts',
  'Scanned: 18 pages, OCR on pp. 15–17': 'scanned · 18 pages · OCR fields on pp. 15, 16, 17',
  'OCR fields: low confidence, each with its reason': '7 fields · all low · all with a reason',
  'Every item carries its Arabic source': 'yes',
  'Conflicts: 2, 1 blocking DG1': 'VAL-042-1 blocks DG1 · VAL-042-2 does not · the register row holds the same 2',
  'Bond follows VAL-042-1 (1% or a fixed amount)': 'open: OMR 320,000 at 1%, the higher of the two · 1% picked: OMR 320,000 at 1% · form picked: OMR 300,000, a fixed amount',
  'Eligibility against the vault': '7 met · 1 at risk · 1 interpretation · 0 fail → eligible',
  'Fit and verdict': '81 · Pursue',
  'Seed: Stage 1, validating; DG1 locked': 'Stage 1 · validating · DG1 locked',
  'After the bond conflict and DG1 Pursue: Stage 2': 'Stage 2 · packaging · 6 packages',
  'Pack: no gaps; margin masked for the Procurement Lead': '10 of 10 sections current · 61 ± 8 · Masked for your role',
};

type Write = { key: string; value: string };
/** The seeded pack opens only at Stage 3 (s3/ready.ts): read it as a presenter who has moved the tender there. */
const READY = { [packReadyKey(T)]: '1' };
const put = (done: DemoDone, ws: Write[]): DemoDone => ({ ...done, ...Object.fromEntries(ws.map((w) => [w.key, w.value])) });

const sightFor = (p: Person): PackViewer => {
  const l = queriesFor({ tenant: TENANT, viewer: p, done: {} }).one(T);
  const c = l ? tenderCtx(TENANT, l) : {};
  return { canSeeMargin: can(p, 'see.margin', c).ok, canSeePositions: can(p, 'see.positions', c).ok };
};

function compute(): Record<string, string> {
  const got: Record<string, string> = {};
  const doc = documentFor(TENANT, T);
  if (!doc) return { 'Document resolves, Arabic and GCC record': 'No document' };
  const r = doc.record;
  got['Document resolves, Arabic and GCC record'] = `${doc.url} · ${doc.lang} · ${isArabicRecord(r) ? 'Arabic' : 'not Arabic'} · ${isGccRecord(r) ? 'groups and conflicts' : 'no groups'}`;

  // Every extracted item, with its page and Arabic source.
  type Item = { page: number; source?: string };
  const items: Item[] = isGccRecord(r) && isArabicRecord(r)
    ? [...Object.values(r.groups).flat(), ...r.summary, ...r.eligibility, ...r.evaluation, ...r.submission, ...r.dates, ...r.scope, ...r.clauses, ...r.flags] as Item[]
    : [];
  // The OCR'd fields are the field-group values read from the scanned pages.
  const fields = isGccRecord(r) ? Object.values(r.groups).flat().filter((f) => OCR_PAGES.includes(f.page)) : [];
  const ocrPages = [...new Set(fields.map((f) => f.page))].sort((a, b) => a - b);
  got['Scanned: 18 pages, OCR on pp. 15–17'] = `${r.scanned ? 'scanned' : 'not scanned'} · ${r.pages} pages · OCR fields on pp. ${ocrPages.join(', ')}`;
  got['OCR fields: low confidence, each with its reason'] = `${fields.length} fields · ${fields.every((f) => f.confidence === 'low') ? 'all low' : 'not all low'} · ${fields.every((f) => !!f.note) ? 'all with a reason' : 'some without a reason'}`;
  got['Every item carries its Arabic source'] = items.length && items.every((i) => typeof i.source === 'string' && /[\u0600-\u06ff]/.test(i.source)) ? 'yes' : 'no';

  const row = gccData(TENANT).register.find((t) => t.id === T);
  const conflicts = isGccRecord(r) ? r.conflicts : [];
  const sameAsRow = JSON.stringify(conflicts.map((c) => c.id)) === JSON.stringify(row?.validations.map((v) => v.id));
  got['Conflicts: 2, 1 blocking DG1'] = conflicts.map((c) => `${c.id} ${c.blocksDg1 ? 'blocks DG1' : 'does not'}`).join(' · ')
    + (sameAsRow ? ` · the register row holds the same ${conflicts.length}` : ' · the register row differs');

  // The bond: 1% of the estimate against the form's fixed OMR 300,000, the higher of the two until VAL-042-1 is resolved.
  const bondItem = row?.validations.find((v) => v.id === 'VAL-042-1');
  const bondOn = (pick?: 'value' | 'alt') => bidBondFor(TENANT, T, pick && bondItem ? put({}, [validationAction(bondItem, 'pick', { pick }, `${TENANT}.coord`)]) : {});
  const [open, onRate, onForm] = [bondOn(), bondOn('value'), bondOn('alt')];
  got['Bond follows VAL-042-1 (1% or a fixed amount)'] = open && onRate && onForm
    ? `open: ${open.text}${open.rateBasis === 'higher-until-resolved' ? ', the higher of the two' : ''} · 1% picked: ${onRate.text} · form picked: ${onForm.text}`
    : 'No bond';

  got['Eligibility against the vault'] = eligibilityFor(TENANT, T, {})?.text ?? 'none';
  const fit = fitFor(TENANT, T, {});
  got['Fit and verdict'] = fit ? `${fit.weighted} · ${fit.verdictLabel}` : 'none';

  const seed = lifecycle(TENANT, T, {});
  const now = seed ? currentOf(seed) : null;
  got['Seed: Stage 1, validating; DG1 locked'] = `Stage ${now?.stage} · ${now?.step} · DG1 ${dg1PackFor(TENANT, T, {})?.locked ? 'locked' : 'open'}`;

  // The Coordinator resolves the blocking conflict; the Head of Tendering pursues.
  let done = put({}, (row?.validations ?? []).filter((v) => v.blocksDg1).map((v) => validationAction(v, 'pick', { pick: 'value' }, `${TENANT}.coord`)));
  const pack1 = dg1PackFor(TENANT, T, done);
  try {
    done = put(done, dg1Write({ tenderId: T, decision: 'pursue', reasonCodes: [], at: '2026-03-08T10:20' }, `${TENANT}.hot`, pack1!, done).writes);
    const after = lifecycle(TENANT, T, done);
    const cur = after ? currentOf(after) : null;
    got['After the bond conflict and DG1 Pursue: Stage 2'] = `Stage ${cur?.stage} · ${cur?.step} · ${packagesFor(TENANT, T, done).length} packages`;
  } catch (e) {
    got['After the bond conflict and DG1 Pursue: Stage 2'] = `Refused: ${(e as Error).message}`;
  }

  const hot = firstWithRole(TENANT, 'hot');
  const proc = firstWithRole(TENANT, 'proc');
  const full = hot ? packFor(TENANT, T, READY, sightFor(hot)) : null;
  const masked = proc ? packFor(TENANT, T, READY, sightFor(proc)) : null;
  const sections = full ? Object.values(full.sections) : [];
  got['Pack: no gaps; margin masked for the Procurement Lead'] = full && masked
    ? `${sections.filter((s) => s.freshness === 'current').length} of ${sections.length} sections current · ${full.summary.win} · ${masked.summary.margin === MASKED_TEXT && masked.summary.win === MASKED_TEXT ? MASKED_TEXT : 'not masked'}`
    : 'No pack';
  return got;
}

export default function Tender042Check() {
  const got = useMemo(compute, []);
  const rows = Object.entries(EXPECT).map(([name, expected]) => ({ name, expected, got: got[name] ?? 'missing' }));
  const failed = rows.filter((r) => r.got !== r.expected).length;
  return (
    <>
      <CardHead title="Third demo tender: T-2026-042, Arabic (Batinah)" meta={failed ? `${failed} of ${rows.length} checks failing` : `All ${rows.length} checks pass`} />
      <DataTable
        rows={rows}
        rowKey={(r) => r.name}
        columns={[
          { key: 'n', header: 'Check', width: '1.5fr', primary: true, render: (r) => <span className="cell-main">{r.name}</span> },
          { key: 'e', header: 'Expected', width: '1.4fr', priority: 2, render: (r) => r.expected },
          { key: 'g', header: 'Got', width: '1.4fr', render: (r) => r.got },
          { key: 'r', header: 'Result', width: '.6fr', align: 'right', render: (r) => (r.got === r.expected ? <span className="t-green">✓ Pass</span> : <span className="t-red">× Fail</span>) },
        ]}
      />
    </>
  );
}

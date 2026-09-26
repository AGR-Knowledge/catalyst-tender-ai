import { useMemo } from 'react';
import { gccData } from '@/data/gcc';
import { can } from '@/data/access';
import { firstWithRole, type Person } from '@/data/people';
import { S2_TENDERS } from '@/data/gcc/s2';
import { repliesFor } from '@/data/gcc/s2/replies';
import { documentFor, isGccRecord } from '@/domain/gcc/documents';
import { currentOf, lifecycle, queriesFor, tenderCtx, type DemoDone } from '@/domain/gcc/lifecycle';
import { bidBondFor, eligibilityFor, fitFor, validationAction } from '@/domain/gcc/s1';
import { dg1PackFor, dg1Write } from '@/domain/gcc/dg1';
import { packagesFor } from '@/domain/gcc/s2/packaging';
import { MASKED_TEXT, packFor, packReadyKey, type PackViewer } from '@/domain/gcc/s3';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Dev check for plan 022: the second demo tender, T-2026-061 in Corniche, an English Abu Dhabi hospital
 * MEP package whose English text governs. It checks Corniche's data in every tenant (the tender lives
 * in Corniche only), so the rows read the same whichever tenant is active. The PDF itself is checked
 * by `npm --prefix app run demo-itt:cbhh`. Values are typed only in `EXPECT`.
 */

const TENANT = 'corniche';
const T = 'T-2026-061';

const EXPECT: Record<string, string> = {
  'Document resolves, English GCC record': '/bids/gcc/CBHH-PRJ-2026-011-ITT.pdf · en · 20 pages · groups and conflicts',
  'Conflicts: 2, 1 blocking DG1': 'VAL-061-1 blocks DG1 · VAL-061-2 does not · the register row holds the same 2',
  'English governs: no Arabic-prevails flag': 'English · no Arabic-prevails flag',
  'Eligibility against the vault': '8 met · 1 at risk · 1 interpretation · 0 fail → eligible',
  'Fit and verdict': '73.5 · Pursue',
  'Bond: fixed amount, validity from VAL-061-1': 'fixed · AED 2,000,000 · 150 days until resolved · 150 or 120 once resolved',
  'Seed: Stage 1, validating; DG1 locked': 'Stage 1 · validating · DG1 locked',
  'After the bond conflict and DG1 Pursue: Stage 2': 'Stage 2 · packaging · 7 packages',
  'Stage 2 seeds nothing sent; replies are scripted': '0 RFQs · 0 quotes · 6 scripted replies',
  'Pack: no gaps; margin masked for the Procurement Lead': '10 of 10 sections current · 52 ± 8 · Masked for your role',
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
  if (!doc) return { 'Document resolves, English GCC record': 'No document' };
  const r = doc.record;
  got['Document resolves, English GCC record'] = `${doc.url} · ${doc.lang} · ${r.pages} pages · ${isGccRecord(r) ? 'groups and conflicts' : 'no groups'}`;

  const row = gccData(TENANT).register.find((t) => t.id === T);
  const conflicts = isGccRecord(r) ? r.conflicts : [];
  const sameAsRow = JSON.stringify(conflicts.map((c) => c.id)) === JSON.stringify(row?.validations.map((v) => v.id));
  got['Conflicts: 2, 1 blocking DG1'] = conflicts.map((c) => `${c.id} ${c.blocksDg1 ? 'blocks DG1' : 'does not'}`).join(' · ')
    + (sameAsRow ? ` · the register row holds the same ${conflicts.length}` : ' · the register row differs');

  const prevails = r.flags.filter((f) => /prevail/i.test(`${f.title} ${f.detail}`));
  got['English governs: no Arabic-prevails flag'] = `${r.language} · ${prevails.length ? 'Arabic-prevails flag raised' : 'no Arabic-prevails flag'}`;

  got['Eligibility against the vault'] = eligibilityFor(TENANT, T, {})?.text ?? 'none';
  const fit = fitFor(TENANT, T, {});
  got['Fit and verdict'] = fit ? `${fit.weighted} · ${fit.verdictLabel}` : 'none';

  // The fixed bond, valid for the longer reading until the Coordinator resolves VAL-061-1.
  const blocking = (row?.validations ?? []).filter((v) => v.blocksDg1);
  const resolved = (pick: 'value' | 'alt') => put({}, blocking.map((v) => validationAction(v, 'pick', { pick }, `${TENANT}.coord`)));
  const bond = bidBondFor(TENANT, T, {});
  const onValue = bidBondFor(TENANT, T, resolved('value'));
  const onAlt = bidBondFor(TENANT, T, resolved('alt'));
  got['Bond: fixed amount, validity from VAL-061-1'] = bond
    ? `${bond.fixed ? 'fixed' : 'a rate'} · ${bond.amount.ccy} ${bond.amount.amount.toLocaleString('en-GB')} · ${bond.validityDays} days until resolved · ${onValue?.validityDays} or ${onAlt?.validityDays} once resolved`
    : 'No bond';

  const seed = lifecycle(TENANT, T, {});
  const now = seed ? currentOf(seed) : null;
  got['Seed: Stage 1, validating; DG1 locked'] = `Stage ${now?.stage} · ${now?.step} · DG1 ${dg1PackFor(TENANT, T, {})?.locked ? 'locked' : 'open'}`;

  // The Coordinator resolves the blocking conflict; the Head of Tendering pursues.
  let done = resolved('value');
  const pack1 = dg1PackFor(TENANT, T, done);
  try {
    done = put(done, dg1Write({ tenderId: T, decision: 'pursue', reasonCodes: [], at: '2026-03-08T10:20' }, `${TENANT}.hot`, pack1!, done).writes);
    const after = lifecycle(TENANT, T, done);
    const cur = after ? currentOf(after) : null;
    got['After the bond conflict and DG1 Pursue: Stage 2'] = `Stage ${cur?.stage} · ${cur?.step} · ${packagesFor(TENANT, T, done).length} packages`;
  } catch (e) {
    got['After the bond conflict and DG1 Pursue: Stage 2'] = `Refused: ${(e as Error).message}`;
  }

  const s2 = S2_TENDERS[TENANT].find((x) => x.tenderId === T);
  const replies = (s2?.packages ?? []).flatMap((p) => repliesFor(TENANT, T, p.id));
  got['Stage 2 seeds nothing sent; replies are scripted'] = s2
    ? `${s2.rfqs.length} RFQs · ${s2.quotes.length} quotes · ${replies.length} scripted replies`
    : 'No Stage 2 data';

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

export default function Tender061Check() {
  const got = useMemo(compute, []);
  const rows = Object.entries(EXPECT).map(([name, expected]) => ({ name, expected, got: got[name] ?? 'missing' }));
  const failed = rows.filter((r) => r.got !== r.expected).length;
  return (
    <>
      <CardHead title="Second demo tender: T-2026-061, English (Corniche)" meta={failed ? `${failed} of ${rows.length} checks failing` : `All ${rows.length} checks pass`} />
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

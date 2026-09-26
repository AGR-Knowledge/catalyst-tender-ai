import { useMemo } from 'react';
import { useTenantKey } from '@/domain/tenancy';
import { isGccTenantKey, gccData } from '@/data/gcc';
import { HERO_ID } from '@/data/gcc/hero';
import { can } from '@/data/access';
import { personById } from '@/data/people';
import { validationAction } from '@/domain/gcc/s1';
import { dg1PackFor, dg1Reopen, dg1Write } from '@/domain/gcc/dg1';
import {
  coverageBar, gapWrite, isWriteError, levelledFor, mixWrite, packageCoverage, packagesFor, packagingWrite, recommendedShortlist,
  rfqDraft, rfqWrite, rfqsFor, shortlistWrite, supplierName, supplierView, toLevel, type Done,
} from '@/domain/gcc/s2';
import { pendingReplies } from '../s2/simulate';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Plan 008b: script B through the Stage 2 rules the screens call, on an
 * in-memory `done` (the demo state is not touched). The hero is pursued at
 * DG1, packaged, shortlisted, sent and answered with the scripted replies.
 * The generic rows run in the open tenant; the rows naming Najd's suppliers
 * (Tarvessa, Rhein Aqua, Tamarisk, Khuzama) run in Najd whichever tenant is open.
 */

interface Check { name: string; ok: boolean; got: string }
type Write = { key: string; value: string };

const put = (d: Done, r: Write | Write[] | { error: string }): Done => {
  if ('error' in r) throw new Error(r.error);
  const ws = Array.isArray(r) ? r : [r];
  return { ...d, ...Object.fromEntries(ws.map((w) => [w.key, w.value])) };
};

/** DG1 Pursue of the hero: the blocking validations answered, then the Bid Manager's decision. */
function pursued(tenant: string): Done {
  const t = gccData(tenant).register.find((x) => x.id === HERO_ID)!;
  let d = put({}, t.validations.filter((v) => v.blocksDg1).map((v) => validationAction(v, 'pick', { pick: 'value' }, `${tenant}.coord`)));
  d = put(d, dg1Write({ tenderId: HERO_ID, decision: 'pursue', note: 'Dev check: script B' }, `${tenant}.bid`, dg1PackFor(tenant, HERO_ID, d)!, d).writes);
  return d;
}

/** Packages approved, every sendable shortlist approved as recommended, every RFQ sent. */
function sent(tenant: string, from: Done): Done {
  let d = put(from, packagingWrite(HERO_ID, `${tenant}.proc`, {}, undefined, { tenant, done: from }));
  for (const { pkg } of packagesFor(tenant, HERO_ID, d)) {
    const rec = recommendedShortlist(tenant, HERO_ID, pkg.id, d).items;
    const ids = rec.filter((i) => i.sendable).map((i) => i.supplierId);
    if (!ids.length) continue;
    d = put(d, shortlistWrite(tenant, HERO_ID, pkg.id, ids, [], `${tenant}.proc`, d));
    d = put(d, rfqWrite(tenant, HERO_ID, pkg.id, ids, `${tenant}.proc`, d));
  }
  return d;
}

const replied = (tenant: string, from: Done): Done => put(from, pendingReplies(tenant, HERO_ID, from).map((r) => r.write));

function checks(tenant: string): Check[] {
  const out: Check[] = [];
  const add = (name: string, ok: boolean, got: string) => out.push({ name, ok, got });
  const guard = (name: string, f: () => void) => { try { f(); } catch (e) { add(name, false, (e as Error).message); } };

  // The open tenant.
  guard('Hero after Pursue: packages and coverage', () => {
    const d = pursued(tenant);
    const pkgs = packagesFor(tenant, HERO_ID, d);
    const bar = coverageBar(tenant, HERO_ID);
    const cov = packageCoverage(tenant, HERO_ID, d);
    const within = !!bar && bar.subcontractCap.ok;
    add(`Hero after Pursue (${tenant}): packages and coverage`, pkgs.length > 0 && !!bar && cov.total === pkgs.length && cov.covered === 0 && within,
      `${pkgs.length} packages · ${cov.covered} of ${cov.total} covered · ${bar ? bar.subcontractCap.text : 'no coverage bar'}`);
  });

  guard('RFQ draft: matched lines only, no rates', () => {
    const d = pursued(tenant);
    const pkg = packagesFor(tenant, HERO_ID, d)[0]?.pkg;
    const draft = pkg ? rfqDraft(tenant, HERO_ID, pkg.id, d) : null;
    // A line carries its item, description, unit and quantity only: no rate, amount or value field.
    const priced = (draft?.lines ?? []).filter((l) => Object.keys(l).some((k) => !['item', 'description', 'unit', 'qty'].includes(k)));
    const own = new Set(pkg?.lineItems ?? []);
    const foreign = draft && own.size ? draft.lines.filter((l) => !own.has(l.item) && !/x$/.test(l.item)) : [];
    add(`RFQ draft (${tenant}, ${pkg?.id ?? 'no package'}): matched lines only, no rates`, !!draft && draft.lines.length > 0 && !priced.length && !foreign.length,
      draft ? `${draft.lineCount} lines in the package, ${draft.lines.length} shown, ${priced.length ? `${priced.length} with a price field` : 'no price field'}${foreign.length ? `; foreign: ${foreign.map((l) => l.item).join(', ')}` : ''}` : 'No draft');
  });

  guard('Simulated replies', () => {
    const d = sent(tenant, pursued(tenant));
    const p = pendingReplies(tenant, HERO_ID, d);
    const after = replied(tenant, d);
    const r = rfqsFor(tenant, HERO_ID, after);
    const quotes = r.filter((x) => x.quoteId).length;
    const declines = r.filter((x) => x.declined).length;
    const want = p.length;
    add(`Demo replies (${tenant}): quotes and declines arrive`, want === 0 ? true : quotes + declines === want && pendingReplies(tenant, HERO_ID, after).length === 0,
      want ? `${want} scripted: ${quotes} ${quotes === 1 ? 'quote' : 'quotes'}, ${declines} ${declines === 1 ? 'decline' : 'declines'}; ${pendingReplies(tenant, HERO_ID, after).length} left` : 'No scripted replies for this tenant\'s hero yet');
  });

  guard('Supplier view', () => {
    const d = sent(tenant, pursued(tenant));
    const contact = personById(`${tenant}.supplier`);
    const rfq = rfqsFor(tenant, HERO_ID, d).find((r) => contact && supplierView(tenant, contact.id, r.id, d));
    const v = rfq && contact ? supplierView(tenant, contact.id, rfq.id, d) : null;
    const others = rfqsFor(tenant, HERO_ID, d).filter((r) => r.packageId === rfq?.packageId && r.supplierId !== rfq?.supplierId).map((r) => supplierName(tenant, r.supplierId));
    const pkg = packagesFor(tenant, HERO_ID, d).find((p) => p.pkg.id === rfq?.packageId)?.pkg;
    const json = JSON.stringify(v);
    const leaks = [...others.filter((n) => json.includes(n)), ...(pkg && json.includes(String(pkg.value.amount)) ? ['the package estimate'] : [])];
    const foreign = rfq && contact ? rfqsFor(tenant, HERO_ID, d).find((r) => r.supplierId !== rfq.supplierId) : undefined;
    const closed = !foreign || !supplierView(tenant, contact!.id, foreign.id, d);
    add(`Supplier Portal (${tenant}): no other supplier's data`, !!v && !leaks.length && closed,
      v ? `${contact!.name} sees ${v.package.id}; ${others.length} other suppliers on it${leaks.length ? `; leaks ${leaks.join(', ')}` : ', none shown'}; another firm's RFQ ${closed ? 'refused' : 'opens'}` : 'The supplier has no RFQ on the hero');
  });

  guard('Quotes masked', () => {
    const who = (role: string) => personById(`${tenant}.${role}`);
    const sees = ['proc', 'hot', 'comm'].map(who).filter(Boolean).every((p) => can(p!, 'see.quotes').ok);
    const masked = ['bid', 'exec'].map(who).filter(Boolean).every((p) => !can(p!, 'see.quotes').ok);
    add(`Quote money without see.quotes (${tenant}): masked`, sees && masked, `Procurement, Head of Tendering, Pricing: ${sees ? 'shown' : 'not all shown'} · Bid Manager, CEO: ${masked ? 'masked' : 'shown'}`);
  });

  // Najd: script B's named suppliers.
  const N = 'najd';
  guard('Screened-out supplier refused', () => {
    const d = put(pursued(N), packagingWrite(HERO_ID, `${N}.proc`, {}, undefined, { tenant: N, done: pursued(N) }));
    const sl = shortlistWrite(N, HERO_ID, 'P-08', ['qimma', 'tarvessa'], [], `${N}.proc`, d);
    // With the P-08 shortlist approved, the RFQ is still refused for the screening.
    const rec = recommendedShortlist(N, HERO_ID, 'P-08', d).items.filter((i) => i.sendable).map((i) => i.supplierId);
    const listed = put(d, shortlistWrite(N, HERO_ID, 'P-08', rec, [], `${N}.proc`, d));
    const rq = rfqWrite(N, HERO_ID, 'P-08', ['tarvessa'], `${N}.proc`, listed);
    add('Tarvessa (sanctions match) refused: shortlist and RFQ', isWriteError(sl) && isWriteError(rq), `${isWriteError(sl) ? sl.error : 'Shortlist accepted'} · ${isWriteError(rq) ? rq.error : 'RFQ sent'}`);
  });

  let najd: Done = {};
  guard('Najd script B', () => { najd = replied(N, sent(N, pursued(N))); });
  const lv = levelledFor(N, HERO_ID, najd);
  const rhein = lv.find((l) => l.supplierId === 'rhein-aqua' && l.packageId === 'P-02');
  const kinds = new Set(rhein?.adjustments.map((a) => a.kind));
  add('Rhein Aqua (EUR, ex works): currency and delivery adjustments', !!rhein && kinds.has('currency') && kinds.has('delivery'),
    rhein ? `${rhein.original.ccy} → ${rhein.levelled.ccy}; ${rhein.adjustments.map((a) => a.kind).join(', ')}` : 'No Rhein Aqua quote');
  const tam = lv.find((l) => l.supplierId === 'tamarisk' && l.packageId === 'P-03');
  const vat = tam?.adjustments.find((a) => a.kind === 'vat');
  add('Tamarisk (VAT-inclusive): VAT removed', !!vat && !!vat.delta && vat.delta.amount < 0, vat ? vat.label : 'No VAT adjustment');

  guard('Override needs a reason', () => {
    const none = mixWrite(N, HERO_ID, 'balanced', [{ pkgId: 'P-05', supplierId: 'khuzama', reason: ' ' }], `${N}.proc`, najd);
    const w = mixWrite(N, HERO_ID, 'balanced', [{ pkgId: 'P-05', supplierId: 'khuzama', reason: 'delivery record' }], `${N}.proc`, najd);
    const detail = isWriteError(w) ? w.error : w.audit.detail ?? '';
    add('Best fit: an override needs a reason and is audited', isWriteError(none) && !isWriteError(w) && detail.includes('Override recorded for P-05: rank 2'),
      `${isWriteError(none) ? 'No reason: refused' : 'No reason: accepted'} · ${detail.match(/Override recorded[^.]*\./)?.[0] ?? detail}`);
  });

  guard('Writes refused after re-open', () => {
    const reopened = put(najd, dg1Reopen(N, HERO_ID, 'Dev check: re-open', `${N}.bid`, najd).writes);
    const refused = [
      packagingWrite(HERO_ID, `${N}.proc`, {}, undefined, { tenant: N, done: reopened }),
      gapWrite(HERO_ID, 'P-03', 'Suppliers declined', `${N}.proc`, undefined, { tenant: N, done: reopened }),
      mixWrite(N, HERO_ID, 'balanced', [], `${N}.proc`, reopened),
      rfqWrite(N, HERO_ID, 'P-01', ['sadeem'], `${N}.proc`, reopened),
    ].filter((r) => 'error' in r).length;
    add('After a DG1 re-open: Stage 2 writes refused', refused === 4, `${refused} of 4 refused (packaging, gap, mix, RFQ)`);
  });

  const q = toLevel(N, {});
  const seeded = q.quotes.filter((x) => x.tenderId === 'T-2026-104').length;
  add('T-2026-104 levels at seed, with no demo action', seeded > 0, `${seeded} of ${q.count} quotes to level are T-2026-104's`);

  return out;
}

export default function Stage2ScreensCheck() {
  const tenant = useTenantKey();
  const rows = useMemo(() => (isGccTenantKey(tenant) ? checks(tenant) : []), [tenant]);
  if (!isGccTenantKey(tenant)) return <CardHead title="Stage 2 screens (plan 008b)" meta="No GCC seed for this tenant" />;
  const failing = rows.filter((r) => !r.ok).length;
  return (
    <>
      <CardHead title="Stage 2 screens (plan 008b)" meta={failing ? `${failing} of ${rows.length} failing` : `All ${rows.length} pass`} />
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

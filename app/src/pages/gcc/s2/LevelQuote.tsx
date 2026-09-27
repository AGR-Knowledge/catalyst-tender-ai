import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { money } from '@/domain/money';
import {
  K, levelWrite, levelledFor, packagesFor, quotesFor, readDone, rfqsFor, sideBySide, supplierName,
  type Adjustment, type LevValue, type LevelledVM,
} from '@/domain/gcc/s2';
import { Card } from '@/components/ui/primitives';
import { Masked } from '@/components/tender/Masked';
import { Money } from '@/components/tender/Money';
import { SourceChip } from '@/components/tender/SourceChip';
import { When } from '@/components/tender/When';
import { PanelHead, QuoteAmount, Tag, Why, byLine, refusal } from './ui';
import type { DeskCtx } from './vm/desk';

/**
 * One quote levelled (spec §8.6, archetype E): the original against the
 * levelled quote, side by side, with the trace of each change; then every
 * adjustment with its source, which the buyer confirms, changes (an estimated
 * amount) or rejects with a note. The agent proposes; the buyer decides.
 * Amounts are masked without `see.quotes`: the work stays visible. Levelled
 * totals also show with `see.quotes.summary`; the quoted amounts don't.
 */

const STATE_TAG: Record<Adjustment['state'], { text: string; tone: 'orange' | 'green' | 'grey' }> = {
  proposed: { text: 'To confirm', tone: 'orange' }, confirmed: { text: 'Confirmed', tone: 'green' }, rejected: { text: 'Rejected', tone: 'grey' },
};

const MONEY_KINDS: Adjustment['kind'][] = ['currency', 'vat', 'delivery', 'exclusion'];

const signed = (m: { amount: number; ccy: Parameters<typeof money>[1] }) => `${m.amount >= 0 ? '+' : '−'} ${money(Math.abs(m.amount), m.ccy)}`;

/**
 * Without `see.quotes`, a money adjustment is named without its rate, amount or share: beside a
 * levelled total (`see.quotes.summary`), "VAT 15% removed" or an exchange rate gives the quoted price back.
 */
const PLAIN: Partial<Record<Adjustment['kind'], { label?: string; source: string }>> = {
  currency: { source: 'Demo bid exchange rate' },
  vat: { label: 'VAT removed: shown excluding VAT', source: 'The price is stated as inclusive of VAT' },
  delivery: { label: 'Freight and any customs duty added, to reach delivered to site', source: 'Benchmark freight and customs duty [assumption]' },
  exclusion: { label: 'Exclusion priced with a benchmark allowance', source: 'Benchmark allowance [assumption]' },
};
const plainOf = (desk: DeskCtx, a: Adjustment) => (!desk.seesQuotes && (a.delta || a.kind === 'currency') ? PLAIN[a.kind] : undefined);
const nameOf = (desk: DeskCtx, a: Adjustment) => plainOf(desk, a)?.label ?? a.label;
const ROW_KIND: Record<string, Adjustment['kind']> = { Currency: 'currency', VAT: 'vat', Delivery: 'delivery', Exclusions: 'exclusion' };

export function LevelQuote({ desk, quoteId }: { desk: DeskCtx; quoteId: string }) {
  const { tenant, tenderId, done } = desk;
  const q = quotesFor(tenant, tenderId, done).find((x) => x.id === quoteId);
  const view = useMemo(() => (q ? sideBySide(tenant, q, done) : null), [tenant, q, done]);
  const noLevel = refusal(desk, 'quote.level');
  if (!q || !view) return <Card><p className="s2-pad s2-muted">This quote is not on this tender.</p></Card>;
  const { vm, rows } = view;
  const pkg = packagesFor(tenant, tenderId, done).find((p) => p.pkg.id === q.packageId)?.pkg;
  const proposed = vm.adjustments.filter((a) => a.state === 'proposed');
  // The side-by-side trace, rebuilt from the plain names when the rates are masked.
  const traceOf = (r: (typeof rows)[number]) => {
    if (desk.seesQuotes) return r.trace;
    if (r.field === 'Price') return vm.adjustments.filter((a) => a.delta).map((a) => nameOf(desk, a)).join('; ') || undefined;
    const k = ROW_KIND[r.field];
    return k ? vm.adjustments.filter((a) => a.kind === k).map((a) => `${nameOf(desk, a)} (${a.state})`).join('; ') || undefined : r.trace;
  };

  const confirmAll = () => desk.applyAll(
    proposed.map((a) => levelWrite(tenant, tenderId, q.id, a.key, 'confirmed', desk.viewer.id, done, undefined, undefined, a)),
    `${proposed.length} ${proposed.length === 1 ? 'adjustment' : 'adjustments'} confirmed on ${vm.supplierName}'s quote`, 'quotes',
  );

  return (
    <div className="s2-stack">
      <Card>
        <PanelHead
          title={<>{vm.supplierName} · <span className="mono s2-pid">{q.packageId}</span> {pkg?.title}</>}
          sub={<>Received <When date={q.receivedAt.slice(0, 10)} time={q.receivedAt.slice(11, 16)} short /> · {q.level === 'line' ? 'Priced per line' : 'One package price'} · <SourceChip source={{ kind: 'quote', label: q.id.replace(/^Q-/, 'Q '), detail: `Quote from ${vm.supplierName}, page ${q.page ?? 1}` }} /></>}
        >
          {vm.state === 'levelled' ? <Tag tone="green"><Check size={11} aria-hidden /> Levelled</Tag> : <Tag tone="orange">{vm.proposed} to confirm</Tag>}
          {!vm.compliant && <Tag tone="red">Non-compliant</Tag>}
        </PanelHead>

        <div className="s2-lev-sum s2-pad-x">
          <div><span className="s2-label">As quoted</span><span className="s2-big">{desk.seesQuotes ? <Money value={vm.original} /> : <Masked by={desk.quotesBy} />}</span></div>
          <span className="s2-arrow" aria-hidden>→</span>
          <div><span className="s2-label">Levelled: excluding VAT, delivered to site, {vm.levelled.ccy}</span><span className="s2-big">{desk.seesLevelled ? <Money value={vm.levelled} /> : <Masked by={desk.quotesBy} />}</span></div>
        </div>
        {vm.flags.length > 0 && <ul className="s2-flags s2-pad-x">{vm.flags.map((f) => <li key={f}>{f}</li>)}</ul>}

        <div className="s2-tablewrap s2-pad-x">
          <table className="s2-table s2-sbs">
            <caption className="sr-only">Original quote against the levelled quote</caption>
            <thead><tr><th scope="col">Field</th><th scope="col">As quoted</th><th scope="col">Levelled</th><th scope="col">What changed</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const money = r.field === 'Price' || r.field === 'Exclusions';
                const hide = money && !desk.seesQuotes;
                // The levelled price is a levelled total; the exclusions' allowances are adjustment amounts.
                const hideLevelled = r.field === 'Price' ? !desk.seesLevelled : hide;
                return (
                  <tr key={r.field}>
                    <th scope="row">{r.field}</th>
                    <td>{hide && r.field === 'Price' ? <Masked by={desk.quotesBy} /> : r.original}</td>
                    <td>{hideLevelled ? <Masked by={desk.quotesBy} /> : r.levelled}</td>
                    <td className="s2-muted">{traceOf(r) ?? 'No change'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <PanelHead title={`Adjustments (${vm.adjustments.length})`} sub="Proposed by the Outreach & Evaluation agent. Each one is shown with its source; you confirm, change or reject it.">
          {proposed.length > 1 && <button type="button" className="btn btn-sm" disabled={!!noLevel} onClick={confirmAll}>Confirm all {proposed.length}</button>}
        </PanelHead>
        {vm.adjustments.length === 0 && <p className="s2-pad s2-muted">Nothing to adjust: the quote is in the bid currency, excluding VAT, delivered to site, valid long enough and complete.</p>}
        <ol className="s2-adjs">
          {vm.adjustments.map((a) => <AdjustmentRow key={a.key} desk={desk} quoteId={q.id} a={a} seeded={!!q.seededDecisions?.[a.key]} noLevel={noLevel} />)}
        </ol>
        {noLevel && <div className="s2-pad-x"><Why reason={noLevel} /></div>}
      </Card>

      <PackageComparison desk={desk} pkgId={q.packageId} current={q.id} />
    </div>
  );
}

function AdjustmentRow({ desk, quoteId, a, seeded, noLevel }: { desk: DeskCtx; quoteId: string; a: Adjustment; seeded: boolean; noLevel: string | null }) {
  const { tenant, tenderId, done } = desk;
  const lev = readDone<LevValue>(done, K.lev(quoteId, a.key));
  const [mode, setMode] = useState<'change' | 'reject' | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const st = STATE_TAG[a.state];
  const decided = a.state !== 'proposed';
  const source = plainOf(desk, a)?.source ?? a.source;

  const commit = (state: 'confirmed' | 'rejected', amt?: number) => {
    const ok = desk.apply(
      levelWrite(tenant, tenderId, quoteId, a.key, state, desk.viewer.id, done, amt, note || undefined, a),
      state === 'confirmed' ? `Confirmed: ${a.label}` : `Rejected: ${a.label}. Your note is recorded`, 'quotes',
    );
    if (ok) { setMode(null); setNote(''); setAmount(''); }
  };
  const agent = a.proposedDelta ?? a.delta;
  const typed = Number(amount.replace(/[^0-9.-]/g, ''));
  const changeBlock = !amount.trim() || Number.isNaN(typed) ? 'Enter the amount.' : !note.trim() ? 'Add a note saying why the amount differs.' : null;

  return (
    <li className={`s2-adj s-${a.state}`}>
      <div className="s2-adj-top">
        <span className="s2-adj-l">{nameOf(desk, a)}</span>
        {a.estimated && <span className="t-orange s2-est">estimated</span>}
        <span className="s2-grow" />
        {a.delta && (desk.seesQuotes ? <span className="num s2-delta">{signed(a.delta)}</span> : <Masked by={desk.quotesBy} />)}
        <Tag tone={st.tone}>{st.text}</Tag>
      </div>
      <p className="s2-adj-ft">
        {/* Currency, VAT and delivery restate the price; an exclusion's allowance is money: masked without `see.quotes`. */}
        <span>{!desk.seesQuotes && MONEY_KINDS.includes(a.kind) && a.kind !== 'exclusion' ? <Masked by={desk.quotesBy} /> : a.from}</span> <span aria-hidden>→</span>{' '}
        <span>{!desk.seesQuotes && MONEY_KINDS.includes(a.kind) ? <Masked by={desk.quotesBy} /> : a.to}</span>
      </p>
      <p className="s2-adj-src"><SourceChip source={{ kind: a.kind === 'currency' || a.kind === 'delivery' || a.kind === 'exclusion' ? 'calc' : 'quote', label: a.kind === 'currency' ? 'Calc: FX' : a.kind === 'delivery' ? 'Calc: freight' : a.kind === 'exclusion' ? 'Calc: allowance' : 'Quote', detail: source }} /> {source}</p>
      {a.proposedDelta && a.delta && desk.seesQuotes && <p className="s2-muted">Changed from the agent's {signed(a.proposedDelta)}.</p>}
      {a.note && <p className="s2-over">Note: {a.note}</p>}
      {decided && lev && <p className="s2-muted">{a.state === 'confirmed' ? 'Confirmed' : 'Rejected'} by {byLine(lev.byId, lev.at)}. Both the agent's proposal and your decision are kept.</p>}
      {decided && seeded && <p className="s2-muted">Decided before today.</p>}

      {!seeded && mode === null && (
        <div className="s2-actbar s2-actbar-l">
          {!decided && <button type="button" className="btn btn-sm btn-primary" disabled={!!noLevel} onClick={() => commit('confirmed')}>Confirm</button>}
          {a.estimated && a.delta && desk.seesQuotes && <button type="button" className="btn btn-sm" disabled={!!noLevel} onClick={() => { setMode('change'); setAmount(String(agent?.amount ?? '')); }}>Change amount</button>}
          {a.state !== 'rejected' && <button type="button" className="btn btn-sm" disabled={!!noLevel} onClick={() => setMode('reject')}>Reject</button>}
          {decided && a.state === 'rejected' && <button type="button" className="btn btn-sm" disabled={!!noLevel} onClick={() => commit('confirmed')}>Confirm instead</button>}
        </div>
      )}
      {mode && (
        <div className="s2-reason">
          {mode === 'change' && (
            <label>
              <span className="s2-label">Amount in {a.delta!.ccy} (the agent proposed {agent ? money(agent.amount, agent.ccy, { full: true }) : 'none'})</span>
              <input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
          )}
          <label>
            <span className="s2-label">{mode === 'reject' ? 'Why reject the agent’s adjustment? (required)' : 'Why a different amount? (required)'}</span>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="In a sentence." />
          </label>
          <div className="s2-actbar s2-actbar-l">
            <button type="button" className="btn btn-sm btn-primary"
              disabled={mode === 'reject' ? !note.trim() : !!changeBlock}
              onClick={() => (mode === 'reject' ? commit('rejected') : commit('confirmed', Math.round(typed)))}>
              {mode === 'reject' ? 'Reject with note' : 'Confirm the new amount'}
            </button>
            <button type="button" className="btn btn-sm" onClick={() => { setMode(null); setNote(''); }}>Cancel</button>
            <Why reason={mode === 'reject' ? (note.trim() ? null : 'A note is required.') : changeBlock} />
          </div>
        </div>
      )}
    </li>
  );
}

/** Every reply in the quote's package, levelled side by side, the lowest compliant one marked in words. */
export function PackageComparison({ desk, pkgId, current, onPick }: { desk: DeskCtx; pkgId: string; current?: string; onPick?(quoteId: string): void }) {
  const { tenant, tenderId, done } = desk;
  const [trace, setTrace] = useState(false);
  const levelled = levelledFor(tenant, tenderId, done).filter((l) => l.packageId === pkgId);
  const rfqs = rfqsFor(tenant, tenderId, done).filter((r) => r.packageId === pkgId);
  const byRfq = new Map(quotesFor(tenant, tenderId, done).filter((x) => x.packageId === pkgId).map((x) => [x.rfqId, x.id]));
  const lvOf = (quoteId?: string): LevelledVM | undefined => levelled.find((l) => l.quoteId === quoteId);
  const lowest = [...levelled].filter((l) => l.compliant).sort((a, b) => a.levelled.amount - b.levelled.amount)[0]?.quoteId;

  return (
    <Card>
      <PanelHead title={`${pkgId}: every reply, levelled`} sub="Excluding VAT, delivered to site, in the bid currency.">
        <button type="button" className="btn btn-sm" aria-expanded={trace} onClick={() => setTrace(!trace)}>
          {trace ? <ChevronDown size={12} aria-hidden /> : <ChevronRight size={12} aria-hidden />} Show adjustments
        </button>
      </PanelHead>
      <div className="s2-tablewrap s2-pad-x">
        <table className="s2-table">
          <thead><tr><th scope="col">Supplier</th><th scope="col">State</th><th scope="col" className="r">As quoted</th><th scope="col" className="r">Levelled</th><th scope="col">Flags</th></tr></thead>
          <tbody>
            {rfqs.map((r) => {
              const qid = r.quoteId ?? byRfq.get(r.id);
              const l = lvOf(qid);
              const state = r.declined ? { t: 'declined', tone: 'grey' as const } : !l ? { t: 'awaited', tone: 'ink' as const }
                : !l.compliant ? { t: 'non-compliant', tone: 'red' as const } : l.state === 'levelled' ? { t: 'levelled', tone: 'green' as const }
                : l.adjustments.some((a) => a.estimated) ? { t: 'estimated', tone: 'orange' as const } : { t: 'quoted', tone: 'ink' as const };
              return (
                <tr key={r.id} className={qid && qid === current ? 's2-cur' : ''}>
                  <th scope="row">
                    {onPick && qid ? <button type="button" className="btn-link" onClick={() => onPick(qid)}>{l?.supplierName ?? supplierName(desk.tenant, r.supplierId)}</button> : (l?.supplierName ?? supplierName(desk.tenant, r.supplierId))}
                    {qid && qid === lowest && <span className="s2-lowest">lowest</span>}
                  </th>
                  <td><Tag tone={state.tone}>{state.t}</Tag>{r.declined && <span className="s2-muted"> {r.declined.reason}</span>}</td>
                  <td className="r">{l ? <QuoteAmount desk={desk} value={l.original} /> : ''}</td>
                  <td className="r">{l ? <QuoteAmount desk={desk} value={l.levelled} levelled /> : ''}</td>
                  <td className="s2-muted">
                    {l?.flags.join('; ')}
                    {trace && l && (
                      <ul className="s2-trace">
                        {l.adjustments.map((a) => (
                          <li key={a.key}>{nameOf(desk, a)}{a.delta && desk.seesQuotes ? `: ${signed(a.delta)}` : ''}{a.estimated ? ' (estimated)' : ''} · {STATE_TAG[a.state].text.toLowerCase()}</li>
                        ))}
                        {!l.adjustments.length && <li>No adjustments</li>}
                      </ul>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

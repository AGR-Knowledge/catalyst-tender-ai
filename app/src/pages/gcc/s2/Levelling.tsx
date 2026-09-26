import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { useDemo } from '@/state/store';
import { useTenantKey } from '@/domain/tenancy';
import {
  coverageAcross, levelledFor, longLeadAtRisk, mixFor, mixOptions, quotesFor, type LevelledVM,
} from '@/domain/gcc/s2';
import { Card, Kpis, type KpiItem } from '@/components/ui/primitives';
import { EmptyState } from '@/components/tender/EmptyState';
import { SourceHost } from '@/components/tender/SourceHost';
import { When } from '@/components/tender/When';
import { calendarDaysBetween } from '@/domain/calendar';
import { DEMO_NOW } from '@/domain/gcc/clock';
import { LevelQuote } from './LevelQuote';
import { CoverageCard } from './Coverage';
import { BestFitPanel } from './BestFit';
import { PanelHead, Tag } from './ui';
import { useDesk, useLiveTenders, useParam, type DeskCtx } from './vm/desk';
import './s2.css';
import { QUOTES_TO_COVER } from '@/data/gcc/s2';

/**
 * Quote levelling (`/levelling`, spec §8.6–§8.7, archetype E): the quotes to
 * level across the viewer's tenders, oldest first; one quote levelled side by
 * side with its trace; coverage; and the best-fit mix for its tender. The same
 * panel is the Levelling section of the Sourcing desk, for one tender.
 */

interface QueueItem { vm: LevelledVM; receivedAt: string; title: string }

function queueOf(tenant: string, tenderIds: string[], done: Record<string, string>, titles: Map<string, string>): QueueItem[] {
  return tenderIds.flatMap((tid) => {
    const received = new Map(quotesFor(tenant, tid, done).map((q) => [q.id, q.receivedAt]));
    return levelledFor(tenant, tid, done).map((vm) => ({ vm, receivedAt: received.get(vm.quoteId) ?? '', title: titles.get(tid) ?? tid }));
  }).sort((a, b) => Number(a.vm.state === 'levelled') - Number(b.vm.state === 'levelled') || a.receivedAt.localeCompare(b.receivedAt));
}

function Queue({ items, selected, onSelect, showTender }: { items: QueueItem[]; selected: string | null; onSelect(id: string): void; showTender: boolean }) {
  const todo = items.filter((i) => i.vm.state === 'to-level');
  const doneList = items.filter((i) => i.vm.state === 'levelled');
  const row = (i: QueueItem) => (
    <li key={i.vm.quoteId}>
      <button type="button" className={`s2-q ${i.vm.quoteId === selected ? 'on' : ''}`} aria-current={i.vm.quoteId === selected} onClick={() => onSelect(i.vm.quoteId)}>
        <span className="s2-q-t"><b>{i.vm.supplierName}</b> <span className="mono s2-pid">{i.vm.packageId}</span></span>
        <span className="s2-q-m">
          {showTender && <span className="mono">{i.vm.tenderId} · </span>}
          received <When date={i.receivedAt.slice(0, 10)} time={i.receivedAt.slice(11, 16)} short />
        </span>
        <span className="s2-q-f">
          {i.vm.state === 'to-level' ? <Tag tone="orange">{i.vm.proposed} to confirm</Tag> : <Tag tone="green">Levelled</Tag>}
          {!i.vm.compliant && <Tag tone="red">Non-compliant</Tag>}
          {i.vm.flags.length > 0 && <span className="s2-muted">{i.vm.flags.length} {i.vm.flags.length === 1 ? 'flag' : 'flags'}</span>}
        </span>
      </button>
    </li>
  );
  return (
    <Card className="s2-md-nav">
      <PanelHead title={`To level (${todo.length})`} sub="Oldest first. The agent proposes each adjustment; you confirm it." />
      {items.length === 0 && <EmptyState title="No quotes yet." body="Quotes arrive here as suppliers reply to the RFQs." compact />}
      <ul className="s2-nav" role="list">{todo.map(row)}</ul>
      {doneList.length > 0 && (
        <>
          <div className="s2-pad-x s2-label s2-qh">Levelled ({doneList.length})</div>
          <ul className="s2-nav" role="list">{doneList.map(row)}</ul>
        </>
      )}
    </Card>
  );
}

/** The Levelling section of the desk: this tender's quotes, one levelled, and coverage. */
export function LevellingPanel({ desk }: { desk: DeskCtx }) {
  const items = useMemo(() => queueOf(desk.tenant, [desk.tenderId], desk.done, new Map([[desk.tenderId, desk.title]])), [desk.tenant, desk.tenderId, desk.done, desk.title]);
  const [q, setQ] = useParam('q');
  const selected = items.find((i) => i.vm.quoteId === q)?.vm.quoteId ?? items[0]?.vm.quoteId ?? null;
  return (
    <div className="s2-stack">
      <div className="s2-md">
        <Queue items={items} selected={selected} onSelect={setQ} showTender={false} />
        <div className="s2-md-main">
          {selected ? <LevelQuote desk={desk} quoteId={selected} /> : <Card><EmptyState title="Nothing to level yet." body="Send the RFQs; replies land here." compact /></Card>}
        </div>
      </div>
      <CoverageCard desk={desk} />
    </div>
  );
}

function Strip({ tenant, ids, done, desk }: { tenant: string; ids: string[]; done: Record<string, string>; desk: DeskCtx | null }) {
  const items = useMemo<KpiItem[]>(() => {
    const q = ids.flatMap((tid) => levelledFor(tenant, tid, done).filter((l) => l.state === 'to-level').map((l) => quotesFor(tenant, tid, done).find((x) => x.id === l.quoteId)!.receivedAt)).sort();
    const days = q.length ? calendarDaysBetween(q[0].slice(0, 10), DEMO_NOW.slice(0, 10)) : 0;
    const cov = coverageAcross(tenant, done).byTender.filter((b) => ids.includes(b.tenderId));
    const covered = cov.reduce((s, b) => s + b.covered, 0);
    const total = cov.reduce((s, b) => s + b.total, 0);
    const late = ids.flatMap((tid) => longLeadAtRisk(tenant, tid, done));
    const mix = desk ? mixFor(tenant, desk.tenderId, done) : null;
    const bal = desk ? mixOptions(tenant, desk.tenderId, done).options.find((o) => o.option === 'balanced') : undefined;
    const icv = mix?.icvShare ?? (bal?.picks.length ? bal.icvShare : null);
    return [
      { label: 'To level', value: String(q.length), tone: q.length && days > 2 ? 'orange' : 'ink', sub: q.length ? `Oldest received ${days === 0 ? 'today' : `${days} ${days === 1 ? 'day' : 'days'} ago`}` : 'Nothing waiting' },
      { label: 'Packages covered', value: `${covered} of ${total}`, tone: total && covered === total ? 'green' : 'ink', sub: `${QUOTES_TO_COVER} compliant, levelled quotes, or an accepted gap` },
      { label: 'Long lead at risk', value: String(late.length), tone: late.length ? 'red' : 'green', sub: late.length ? late.slice(0, 2).map((l) => `${l.pkgId}: ${l.bestWeeks} weeks against ${l.needByWeeks} needed`).join(' · ') : 'Every package meets the programme' },
      { label: 'ICV in mix', value: icv === null ? 'No mix yet' : `${icv}%`, tone: 'ink', sub: desk ? `${mix ? `${mix.label} mix, approved` : 'Balanced mix, recommended'} · ${desk.tenderId}` : 'Choose a tender' },
    ];
  }, [tenant, ids, done, desk]);
  return <Kpis items={items} />;
}

function Detail({ tenderId, quoteId }: { tenderId: string; quoteId: string | null }) {
  const desk = useDesk(tenderId);
  return (
    <>
      <div className="s2-md-main">
        {quoteId ? <LevelQuote desk={desk} quoteId={quoteId} /> : <Card><EmptyState title="Choose a quote to level." compact /></Card>}
      </div>
    </>
  );
}

function TenderPanels({ tenderId }: { tenderId: string }) {
  const desk = useDesk(tenderId);
  return (
    <div className="s2-stack">
      <CoverageCard desk={desk} />
      <BestFitPanel desk={desk} />
    </div>
  );
}

function StripFor({ tenant, ids, done, tenderId }: { tenant: string; ids: string[]; done: Record<string, string>; tenderId: string | null }) {
  return tenderId ? <StripWith tenant={tenant} ids={ids} done={done} tenderId={tenderId} /> : <Strip tenant={tenant} ids={ids} done={done} desk={null} />;
}
function StripWith({ tenant, ids, done, tenderId }: { tenant: string; ids: string[]; done: Record<string, string>; tenderId: string }) {
  const desk = useDesk(tenderId);
  return <Strip tenant={tenant} ids={ids} done={done} desk={desk} />;
}

export default function Levelling() {
  const { state } = useDemo();
  const tenant = useTenantKey();
  const tenders = useLiveTenders();
  const [t, setT] = useParam('tender');
  const [q, setQ] = useParam('q');
  const [all, setAll] = useState(true);
  const ids = useMemo(() => (t && tenders.some((x) => x.id === t) ? [t] : tenders.map((x) => x.id)), [t, tenders]);
  const titles = useMemo(() => new Map(tenders.map((x) => [x.id, x.title])), [tenders]);
  const items = useMemo(() => queueOf(tenant, ids, state.done, titles), [tenant, ids, state.done, titles]);
  const shown = all ? items : items.filter((i) => i.vm.state === 'to-level');
  const sel = shown.find((i) => i.vm.quoteId === q) ?? shown[0] ?? null;
  const tenderId = sel?.vm.tenderId ?? (ids.length === 1 ? ids[0] : null);
  useEffect(() => { if (q && !items.some((i) => i.vm.quoteId === q)) setQ(null); }, [q, items, setQ]);

  if (!tenders.length) {
    return <div className="view"><Card><EmptyState title="No tenders are being sourced now." body="Quotes arrive once a pursued tender's RFQs are answered." /></Card></div>;
  }
  return (
    <SourceHost>
      <div className="view s2-page">
        <div className="s2-picker" role="group" aria-label="Tenders">
          <button type="button" className={`s2-tender ${ids.length > 1 ? 'on' : ''}`} aria-pressed={ids.length > 1} onClick={() => { setT(null); setQ(null); }}>All tenders <span className="num">{tenders.length}</span></button>
          {tenders.map((x) => (
            <button key={x.id} type="button" className={`s2-tender ${ids.length === 1 && ids[0] === x.id ? 'on' : ''}`} aria-pressed={ids.length === 1 && ids[0] === x.id} onClick={() => { setT(x.id); setQ(null); }}>
              <span className="mono">{x.id}</span><span className="s2-tender-t">{x.title}</span>
            </button>
          ))}
          <span className="s2-grow" />
          <label className="s2-check"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Show levelled quotes</label>
          {tenderId && <Link className="btn btn-sm" to={`/sourcing?tender=${encodeURIComponent(tenderId)}&s=tracking`}><ExternalLink size={12} aria-hidden /> Packages & RFQs</Link>}
        </div>
        <StripFor tenant={tenant} ids={ids} done={state.done} tenderId={tenderId} />
        <div className="s2-md">
          <Queue items={shown} selected={sel?.vm.quoteId ?? null} onSelect={setQ} showTender={ids.length > 1} />
          {sel ? <Detail key={sel.vm.quoteId} tenderId={sel.vm.tenderId} quoteId={sel.vm.quoteId} /> : <div className="s2-md-main"><Card><EmptyState title="Nothing to level." body="Every quote on these tenders is levelled." compact /></Card></div>}
        </div>
        {tenderId && <TenderPanels key={tenderId} tenderId={tenderId} />}
      </div>
    </SourceHost>
  );
}

import { useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { personById, firstWithRole } from '@/data/people';
import { queueFor, validationsOf, blockingOpen, DONE_KEY, type QueueItem } from '@/domain/gcc/s1';
import { dataOf, shortWhen } from '@/domain/gcc/s1/common';
import { STAGE_BANDS } from '@/domain/gcc/kpi/stages';
import { Card, CardHead } from '@/components/ui/primitives';
import { EmptyState } from '@/components/tender/EmptyState';
import { Callout } from '@/components/tender/Callout';
import { SourceHost } from '@/components/tender/SourceHost';
import { useS1 } from './vm/useS1';
import { kpiCtxOf, tilesOf, valueTile } from './vm/tiles';
import { docOf, sourceDocOf } from './vm/docs';
import { unrecognisedIn } from './vm/uploads';
import { Strip } from './parts/Strip';
import { ValidationCard } from './parts/ValidationCard';
import '@/components/dashboard/dashboard.css';
import './s1.css';

/**
 * `/intake-queue` (spec §6.3): only the fields the agent would not accept
 * alone, grouped by tender, the tenders with DG1 blockers first. Items
 * resolved in the demo stay under their tender, marked, so the person sees
 * what they did; items sent back stay open. Files the agent could not place
 * wait at the bottom.
 */

const HERE = '/intake-queue';
const CONTROL = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)';
const groupId = (tenderId: string) => `vq-${tenderId}`;

interface Group { tenderId: string; title: string; shortTitle: string; open: QueueItem[]; resolved: QueueItem[] }

/**
 * Where focus goes after an action on a card (plan 025b): the card's first
 * control while it stays open (sent back), else the open card that takes its
 * place in the group, else the group's heading, else the page's.
 */
function focusAfter(root: HTMLElement, acted: { tenderId: string; itemId: string; index: number }) {
  const group = root.querySelector<HTMLElement>(`[id="${groupId(acted.tenderId)}"]`);
  const open = group ? [...group.querySelectorAll<HTMLElement>('article.vq:not(.resolved)')] : [];
  const card = open.find((a) => a.dataset.vq === acted.itemId) ?? open[Math.min(acted.index, open.length - 1)];
  const page = document.querySelector<HTMLElement>('h1');
  if (page && !group) page.tabIndex = -1;
  (card?.querySelector<HTMLElement>(CONTROL) ?? group?.querySelector<HTMLElement>('[data-vq-head]') ?? page)?.focus();
}

export default function IntakeQueue() {
  const s1 = useS1();
  const { tenant, viewer, viewAs, done, q } = s1;
  const [params] = useSearchParams();
  const focus = params.get('tender');

  const groups = useMemo<Group[]>(() => {
    const live = (id: string) => { const l = q.one(id); return !!l && !l.closedAt; };
    const open = queueFor(tenant, done).filter((g) => live(g.tenderId));
    const openIds = new Set(open.map((g) => g.tenderId));
    // Tenders whose items were all resolved in the demo keep their group, after the open ones.
    const settled = dataOf(tenant).register
      .filter((t) => !openIds.has(t.id) && live(t.id) && t.validations.some((v) => done[DONE_KEY.val(v.id)]))
      .map((t) => ({ tenderId: t.id, title: t.title, shortTitle: t.shortTitle, items: [] as QueueItem[] }));
    return [...open, ...settled].map((g) => {
      const all = validationsOf(tenant, g.tenderId, done);
      return { tenderId: g.tenderId, title: g.title, shortTitle: g.shortTitle, open: all.filter((x) => x.state !== 'resolved'), resolved: all.filter((x) => x.state === 'resolved') };
    }).sort((a, b) => Number(b.tenderId === focus) - Number(a.tenderId === focus));
  }, [tenant, done, q, focus]);

  const openItems = groups.flatMap((g) => g.open);
  const blocking = openItems.filter((x) => x.item.blocksDg1).length;
  const sentBack = openItems.filter((x) => x.state === 'sent-back').length;
  const oldest = openItems.reduce<QueueItem | null>((a, b) => (!a || b.ageMin > a.ageMin ? b : a), null);
  const ctx = kpiCtxOf({ tenant, viewer, viewAs, done }, '30d', 'intake-queue');
  const tiles = [
    ...tilesOf(['INT-5'], ctx, HERE),
    valueTile('q.blocking', 'Blocking DG1', String(blocking), {
      kind: 'state', means: 'Open fields marked as blocking DG1. Pursue stays locked on their tender until a person confirms them', counted: 'Open items, including those sent back to the agent, marked “blocks DG1”.', source: 'Validation items',
    }, ctx, { tone: blocking ? 'orange' : 'green', sub: blocking ? 'Pursue is locked on their tenders' : 'Nothing blocks DG1', detail: blocking ? 'Pursue is locked on their tenders' : 'Nothing blocks DG1' }),
    valueTile('q.oldest', 'Oldest item', oldest ? oldest.ageText : 'None', {
      kind: 'state', means: 'How long the oldest open field has waited since the agent raised it', counted: 'Age of the oldest open item, on the demo clock.', target: `Under ${STAGE_BANDS.queueOldestRedH} h`, source: 'Validation items',
    }, ctx, { sub: oldest ? `${oldest.item.tenderId} · ${oldest.item.field}` : 'The queue is clear', detail: oldest ? `${oldest.item.tenderId} · ${oldest.item.field}` : 'The queue is clear', tone: oldest && oldest.ageMin > STAGE_BANDS.queueOldestRedH * 60 ? 'red' : undefined }),
    valueTile('q.sentback', 'Sent back to the agent', String(sentBack), {
      kind: 'state', means: 'Items a person sent back for a re-read. They stay open until a person decides', counted: 'Open items whose last action was Send back.', source: 'Validation items',
    }, ctx, { sub: sentBack ? 'Still open: a person decides' : 'None waiting on a re-read', detail: sentBack ? 'Still open: a person decides' : 'None waiting on a re-read' }),
  ];

  const unplaced = unrecognisedIn(done);
  const coord = firstWithRole(tenant, 'coord');

  // Resolving a card moves it under "Resolved today": keep keyboard focus in the queue (plan 025b).
  const root = useRef<HTMLDivElement>(null);
  const acted = useRef<{ tenderId: string; itemId: string; index: number } | null>(null);
  const onActed = (q: QueueItem) => {
    const g = groups.find((x) => x.tenderId === q.item.tenderId);
    acted.current = { tenderId: q.item.tenderId, itemId: q.item.id, index: Math.max(0, g?.open.findIndex((x) => x.item.id === q.item.id) ?? 0) };
  };
  useEffect(() => {
    const a = acted.current;
    acted.current = null;
    if (a && root.current) focusAfter(root.current, a);
  }, [groups]);

  return (
    <SourceHost>
      <div className="view s1" ref={root}>
        <Strip tiles={tiles} />
        <p className="s1-intro">Only the values the Intake &amp; Extraction agent would not accept on its own are here. Everything else was accepted with its page recorded.</p>

        {groups.length === 0 && (
          <Card><EmptyState title="No fields to check." body="Values the agent reads with low confidence, or reads two ways, appear here before DG1." /></Card>
        )}

        {groups.map((g) => {
          const d = docOf(tenant, g.tenderId);
          const doc = sourceDocOf(d);
          const b = blockingOpen(tenant, g.tenderId, done);
          const hadBlockers = [...g.open, ...g.resolved].some((x) => x.item.blocksDg1);
          return (
            <Card key={g.tenderId} id={groupId(g.tenderId)}>
              <CardHead
                title={<span className="vq-gt" tabIndex={-1} data-vq-head><span className="mono">{g.tenderId}</span> {g.shortTitle}</span>}
                meta={<Link to={`/tenders/${g.tenderId}?tab=requirements`} className="btn-link">Open tender <ArrowRight size={12} aria-hidden /></Link>}
              />
              <div className="vq-group">
                {b.count > 0 && (
                  <Callout variant="route" title={`${b.text}. DG1 is locked on this tender.`} compact>Pursue unlocks once the flagged fields are confirmed.</Callout>
                )}
                {b.count === 0 && hadBlockers && (
                  <Callout variant="verdict" word="Unlocked" title="Every field that blocked DG1 is confirmed." compact
                    action={s1.check('dg1.view', g.tenderId).ok ? <Link className="btn btn-sm" to={`/dg1?tender=${g.tenderId}`}>Open the DG1 pack</Link> : undefined}>
                    The Bid Manager can record DG1 now.
                  </Callout>
                )}
                {g.open.map((x) => <ValidationCard key={x.item.id} q={x} s1={s1} doc={doc} record={d?.record ?? null} onActed={onActed} />)}
                {g.resolved.length > 0 && (
                  <>
                    <h3 className="s1-h3">Resolved today</h3>
                    {g.resolved.map((x) => <ValidationCard key={x.item.id} q={x} s1={s1} doc={doc} record={d?.record ?? null} />)}
                  </>
                )}
              </div>
            </Card>
          );
        })}

        {unplaced.length > 0 && (
          <Card>
            <CardHead title="Documents to classify" meta={<span className="num">{unplaced.length}</span>} />
            <p className="s1-lede">Uploaded files the agent read but could not place. {coord ? `${coord.name} classifies them` : 'A person classifies them'}; nothing is logged until then.</p>
            <ul className="vq-files">
              {unplaced.map((u) => (
                <li key={u.key}>
                  <span className="mono">{u.file}</span>
                  <span className="s1-sub">uploaded by {personById(u.times[0].byId)?.name ?? u.times[0].byId}, {shortWhen(u.times[0].at)} · stopped after the page read</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </SourceHost>
  );
}

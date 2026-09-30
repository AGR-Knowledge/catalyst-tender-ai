import {
  CANCEL_REASONS, ENDINGS, FACTORS, LESSON_AREAS, LOSS_REASONS, STOPPED_EARLIER, WIN_REASONS, WITHDRAW_REASONS, groupOf, labelOf,
  type Ending, type VocabItem,
} from '@/data/gcc/debriefs/vocab';
import { RIVALS } from '@/data/gcc/debriefs';
import { inWindow, windowOf } from '@/domain/gcc/period';
import { recordsFor, type DebriefEntry } from './records';
import { factorLabels } from './form';
import { STATUS_TONE, endingGateOf, endingLabelOf, gateReasonLabel, mainLabelOf, rivalLabel, statusTextOf } from './vm';
import type { ArchiveFilters, ArchiveRow, ArchiveVM, CountRow, DebriefCtx } from './types';

/**
 * The debriefs archive (plan 035 step 3.4) for plan 037's page and the Bid
 * record. The window is the period's (`windowOf`), counted on the ended time;
 * the sector and ending filters narrow everything. Totals count every ending;
 * the breakdowns read accepted debriefs only, so a reason on screen is one the
 * Head of Tendering signed off. Places are medians rounded to whole places, as
 * the Bid record rounds them.
 */

const uniq = <T>(xs: T[]) => [...new Set(xs)];

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Our place, where known: the result's (after any debrief the employer told us), else the submission's. */
const placeOf = (e: DebriefEntry): [number, number] | undefined => e.l.result?.rank ?? e.record.submission?.place;

const medianPlace = (xs: DebriefEntry[]): [number, number] | undefined => {
  const ps = xs.flatMap((e) => { const p = placeOf(e); return p ? [p] : []; });
  return ps.length ? [Math.round(median(ps.map((p) => p[0]))), Math.round(median(ps.map((p) => p[1])))] : undefined;
};

const shareOf = (n: number, of: number) => (of ? Math.round((n / of) * 1000) / 10 : 0);

/** Count rows in the list's order, for the ids that occur. `share` is a percentage of `of`. */
function countRows(list: VocabItem[], items: { id: string; tenderId: string }[], of = items.length): CountRow[] {
  return list.flatMap((v) => {
    const ids = items.filter((x) => x.id === v.id).map((x) => x.tenderId);
    return ids.length ? [{ id: v.id, label: v.label, count: ids.length, share: shareOf(ids.length, of), tenderIds: ids }] : [];
  });
}

const STOP_REASONS: Partial<Record<Ending, VocabItem[]>> = { cancelled: CANCEL_REASONS, withdrawn: WITHDRAW_REASONS };

/** A stopped ending's reason: the debrief's main reason, or the gate's first reason for No-Bid and rejected. */
function stopReasonOf(e: DebriefEntry): { id: string; label: string } | null {
  const list = STOP_REASONS[e.record.ending];
  const main = e.record.submission?.main;
  if (list) return main ? { id: main, label: labelOf(list, main) } : null;
  const code = endingGateOf(e.l, e.record.ending)?.reasonCodes[0];
  return code ? { id: code, label: gateReasonLabel(code) } : null;
}

export function rowOf(ctx: Pick<DebriefCtx, 'tenant'>, e: DebriefEntry): ArchiveRow {
  const { l, record, status } = e;
  const s = record.submission;
  const place = placeOf(e);
  return {
    tenderId: l.tenderId, title: l.shortTitle, employer: l.issuer, sector: l.sector,
    ending: record.ending, endingLabel: endingLabelOf(record.ending), group: groupOf(record.ending), endedAt: record.endedAt,
    mainLabel: mainLabelOf(e),
    factorLabels: s ? factorLabels(s.factors) : [],
    ...(s?.rivalId ? { rival: rivalLabel(ctx.tenant, s.rivalId) } : {}),
    ...(place ? { place } : {}),
    lessons: s?.lessons ?? [],
    ...(s?.bidAgain ? { bidAgain: s.bidAgain } : {}),
    status, statusText: statusTextOf(record, status), statusTone: STATUS_TONE[status],
    ...(s ? { recordedById: s.byId, submittedAt: s.at } : {}),
    ...(record.accepted ? { acceptedById: record.accepted.byId, acceptedAt: record.accepted.at } : {}),
  };
}

/** The ended bids in a window, for the viewer (the KPIs and the archive count the same list). */
export function endedIn(ctx: DebriefCtx, w: { from: string; to: string }): DebriefEntry[] {
  return recordsFor(ctx).filter((e) => inWindow(e.record.endedAt, w));
}

export function archiveOf(ctx: DebriefCtx, filters: ArchiveFilters): ArchiveVM {
  const inPeriod = endedIn(ctx, windowOf(filters.period, ctx.tenant));
  const sectors = uniq(inPeriod.map((e) => e.l.sector)).sort((a, b) => a.localeCompare(b));
  const list = inPeriod
    .filter((e) => (!filters.sector || e.l.sector === filters.sector) && (!filters.group || groupOf(e.record.ending) === filters.group))
    .sort((a, b) => b.record.endedAt.localeCompare(a.record.endedAt) || a.l.tenderId.localeCompare(b.l.tenderId));
  const n = (f: (e: DebriefEntry) => boolean) => list.filter(f).length;
  const accepted = list.filter((e) => e.status === 'accepted');
  const won = accepted.filter((e) => e.record.ending === 'won');
  const lost = accepted.filter((e) => e.record.ending === 'lost');
  const stopped = accepted.filter((e) => groupOf(e.record.ending) === 'stopped');
  const mainOf = (e: DebriefEntry) => ({ id: e.record.submission!.main ?? 'other', tenderId: e.l.tenderId });

  const lossReasons = countRows(LOSS_REASONS, lost.map(mainOf), lost.length).map((row) => {
    const xs = lost.filter((e) => row.tenderIds.includes(e.l.tenderId));
    const ranked = xs.filter((e) => !!placeOf(e));
    const factor = countRows(FACTORS, xs.flatMap((e) => e.record.submission!.factors.map((id) => ({ id, tenderId: e.l.tenderId }))))
      .sort((a, b) => b.count - a.count)[0];
    const place = medianPlace(ranked);
    return { ...row, ...(place ? { place } : {}), placeN: ranked.length, ...(factor ? { topFactor: { label: factor.label, count: factor.count } } : {}) };
  });

  const cited = (xs: DebriefEntry[], id: string) => xs.filter((e) => e.record.submission!.factors.includes(id)).map((e) => e.l.tenderId);
  const factors = FACTORS.flatMap((f) => {
    const winIds = cited(won, f.id);
    const lossIds = cited(lost, f.id);
    return winIds.length || lossIds.length ? [{ id: f.id, label: f.label, wins: winIds.length, losses: lossIds.length, winIds, lossIds }] : [];
  });

  const rivals = ((RIVALS as Record<string, { id: string; name: string }[]>)[ctx.tenant] ?? []).flatMap((r) => {
    const xs = lost.filter((e) => e.record.submission!.rivalId === r.id);
    if (!xs.length) return [];
    const bySector = uniq(xs.map((e) => e.l.sector)).map((s) => ({ s, n: xs.filter((e) => e.l.sector === s).length })).sort((a, b) => b.n - a.n || a.s.localeCompare(b.s));
    const place = medianPlace(xs.filter((e) => !!placeOf(e)));
    return [{ id: r.id, name: r.name, beatUs: xs.length, sectors: bySector.map((x) => x.s), ...(place ? { place } : {}), tenderIds: xs.map((e) => e.l.tenderId) }];
  }).sort((a, b) => b.beatUs - a.beatUs || a.name.localeCompare(b.name));

  const stoppedKinds = ENDINGS.filter((x) => groupOf(x.id) === 'stopped').flatMap((kind) => {
    const xs = stopped.filter((e) => e.record.ending === kind.id);
    if (!xs.length) return [];
    const reasons = xs.flatMap((e) => { const r = stopReasonOf(e); return r ? [{ ...r, tenderId: e.l.tenderId }] : []; });
    const vocab = uniq(reasons.map((r) => r.id)).map((id) => ({ id, label: reasons.find((r) => r.id === id)!.label }));
    const order = STOP_REASONS[kind.id] ?? vocab;
    return [{
      ending: kind.id, label: kind.label, count: xs.length,
      reasons: countRows(order, reasons, xs.length).sort((a, b) => b.count - a.count),
      tenderIds: xs.map((e) => e.l.tenderId),
    }];
  });

  const earlier = stopped.flatMap((e) => (e.record.submission!.stoppedEarlier ? [{ id: e.record.submission!.stoppedEarlier, tenderId: e.l.tenderId }] : []));

  const lessons = accepted.flatMap((e) => e.record.submission!.lessons.map((x) => ({ ...x, tenderId: e.l.tenderId, byId: e.record.submission!.byId, at: e.record.submission!.at })));
  const lessonAreas = LESSON_AREAS.flatMap((a) => {
    const xs = lessons.filter((x) => x.area === a.id).sort((p, q) => q.at.localeCompare(p.at));
    return xs.length ? [{
      id: a.id, label: a.label, count: xs.length,
      // The latest two different sentences: generated lessons can repeat across tenders.
      latest: xs.filter((x, i) => xs.findIndex((y) => y.text === x.text) === i).slice(0, 2).map((x) => ({ tenderId: x.tenderId, text: x.text, byId: x.byId, at: x.at })),
      tenderIds: uniq(xs.map((x) => x.tenderId)),
    }] : [];
  }).sort((a, b) => b.count - a.count);

  return {
    filters, sectors,
    totals: {
      endings: list.length,
      won: n((e) => e.record.ending === 'won'), lost: n((e) => e.record.ending === 'lost'), stopped: n((e) => groupOf(e.record.ending) === 'stopped'),
      accepted: accepted.length, submitted: n((e) => e.status === 'submitted'), sentBack: n((e) => e.status === 'sent-back'),
      due: n((e) => e.status === 'due'), overdue: n((e) => e.status === 'overdue'),
    },
    winReasons: countRows(WIN_REASONS, won.map(mainOf), won.length).sort((a, b) => b.count - a.count),
    lossReasons: lossReasons.sort((a, b) => b.count - a.count),
    factors, rivals, stopped: stoppedKinds,
    stoppedEarlier: countRows(STOPPED_EARLIER, earlier, earlier.length),
    lessonAreas,
    rows: list.map((e) => rowOf(ctx, e)),
  };
}

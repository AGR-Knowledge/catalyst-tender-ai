import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { personById } from '@/data/people';
import { ENDING_GROUPS, labelOf, type ArchiveVM, type CountRow, type EndingGroup } from '@/domain/gcc/debriefs';
import { dayMonth, plural } from '@/domain/gcc/s1/common';
import { Card, CardHead } from '@/components/ui/primitives';
import { EmptyState } from '@/components/tender/EmptyState';

/**
 * The Debriefs archive's cards (plan 037). Every count is a button that lists
 * its debriefs in the table below (`onPick`). The bars take the colour of the
 * ending they count, fixed and said in each card's key and in "How to read
 * this": won green, lost grey, stopped hatched, and blue for a count across
 * endings. Numbers come from `archiveFor`; bar widths are drawn against the
 * card's largest count. Row anatomy is fixed: a row of a kind always has the
 * same lines, with words ("Place not published") where a value is missing.
 */

/** What a click hands the table: a key, the chip's words, and the tenders. `wide` lists them from the whole period, ignoring the chips. */
export interface ArchivePick { key: string; label: string; ids: string[]; wide?: boolean }
export type OnPick = (p: ArchivePick) => void;

export type Mark = 'won' | 'lost' | 'stop' | 'one';
const MK: Record<Mark, string> = { won: 'won', lost: 'lost', stop: 'wd', one: 'one' };

/** The card's colour key: the mark as the bars draw it, and what it counts. */
export const Key = ({ mark, children }: { mark: Mark; children: ReactNode }) => (
  <span className="db-key"><span className={`co-mk ${MK[mark]}`} aria-hidden />{children}</span>
);

const Bar = ({ n, top, mark }: { n: number; top: number; mark: Mark }) => (
  <span className={`co-bd-bar db-bar-${mark}`} aria-hidden><span style={{ width: `${n ? Math.max(3, Math.round((n / Math.max(1, top)) * 100)) : 0}%` }} /></span>
);

/** `CountRow.share` as the rows print it. */
const pctOf = (r: Pick<CountRow, 'share'>) => `${Math.round(r.share)}%`;
const topOf = (xs: { count: number }[]) => Math.max(1, ...xs.map((x) => x.count));
const placeText = (p: [number, number] | undefined, n?: number) =>
  (p ? <>Our place <span className="num">{p[0]} of {p[1]}</span>{n !== undefined && <> (n = {n})</>}</> : 'Place not published');

/** What the page's chips have narrowed, so an empty card can say why it is empty. */
export interface EmptyWhy { endings: number; group?: EndingGroup; narrowed: boolean }
interface Kind { group?: EndingGroup; one: string; many: string; ended: number }

function emptyOf(why: EmptyWhy, k: Kind): { title: string; body?: string } {
  const where = why.narrowed ? 'this selection' : 'this period';
  if (!why.endings) return { title: why.narrowed ? 'No bids ended in this selection.' : 'No bids ended in this period.' };
  if (why.group && k.group && why.group !== k.group) {
    return { title: 'Not in this selection.', body: `The Ending chip shows ${labelOf(ENDING_GROUPS, why.group).toLowerCase()} bids only.` };
  }
  if (!k.ended) return { title: `No ${k.many} in ${where}.` };
  return { title: 'No accepted debriefs yet.', body: `${plural(k.ended, k.one, k.many)} in ${where}. They count here once the Head of Tendering accepts the debrief.` };
}

function Body({ empty, children }: { empty: { title: string; body?: string } | null; children: ReactNode }) {
  return <div className="eq-scroll">{empty ? <EmptyState title={empty.title} body={empty.body} compact /> : children}</div>;
}

/** One reason: label, share, bar and count. */
function ReasonRow({ r, top, mark, one, many, pick }: { r: CountRow; top: number; mark: Mark; one: string; many: string; pick(): void }) {
  return (
    <button type="button" className="co-bd-row" onClick={pick} aria-label={`${r.label}: ${plural(r.count, one, many)}, ${pctOf(r)}. List these debriefs`}>
      <span className="co-bd-l" title={r.label}>{r.label}</span>
      <span className="co-bd-r num">{pctOf(r)}</span>
      <Bar n={r.count} top={top} mark={mark} />
      <span className="co-bd-m"><span className="num">{r.count}</span> {r.count === 1 ? one : many}</span>
    </button>
  );
}

const accepted = (rows: { count: number }[]) => plural(rows.reduce((s, r) => s + r.count, 0), 'accepted debrief');

export function WinCard({ vm, why, onPick }: { vm: ArchiveVM; why: EmptyWhy; onPick: OnPick }) {
  const rows = vm.winReasons;
  const empty = rows.length ? null : emptyOf(why, { group: 'won', one: 'win', many: 'wins', ended: vm.totals.won });
  return (
    <Card className="co-bd-card">
      <CardHead title="Why we win" meta={<Key mark="won">{rows.length ? `Main reason · ${accepted(rows)}` : 'Main reason'}</Key>} />
      <Body empty={empty}>
        <ul className="co-bd" aria-label="Why we win">
          {rows.map((r) => (
            <li key={r.id}>
              <ReasonRow r={r} top={topOf(rows)} mark="won" one="win" many="wins" pick={() => onPick({ key: `win:${r.id}`, label: `Won on ${r.label.toLowerCase()}`, ids: r.tenderIds })} />
            </li>
          ))}
        </ul>
      </Body>
    </Card>
  );
}

export function LossCard({ vm, why, onPick }: { vm: ArchiveVM; why: EmptyWhy; onPick: OnPick }) {
  const rows = vm.lossReasons;
  const empty = rows.length ? null : emptyOf(why, { group: 'lost', one: 'loss', many: 'losses', ended: vm.totals.lost });
  return (
    <Card className="co-bd-card">
      <CardHead title="Why we lose" meta={<Key mark="lost">{rows.length ? `Main reason · ${accepted(rows)}` : 'Main reason'}</Key>} />
      <Body empty={empty}>
        <ul className="co-bd" aria-label="Why we lose">
          {rows.map((r) => (
            <li key={r.id}>
              <ReasonRow r={r} top={topOf(rows)} mark="lost" one="loss" many="losses" pick={() => onPick({ key: `loss:${r.id}`, label: `Lost on ${r.label.toLowerCase()}`, ids: r.tenderIds })} />
              <span className="co-ls-x db-x">{placeText(r.place, r.place ? r.placeN : undefined)}</span>
              <span className="co-ls-x db-x">{r.topFactor ? <>Top factor · {r.topFactor.label} (<span className="num">{r.topFactor.count}</span>)</> : 'No factor recorded'}</span>
            </li>
          ))}
        </ul>
      </Body>
    </Card>
  );
}

export function RivalsCard({ vm, why, onPick }: { vm: ArchiveVM; why: EmptyWhy; onPick: OnPick }) {
  const rows = vm.rivals;
  const empty = rows.length ? null : emptyOf(why, { group: 'lost', one: 'loss', many: 'losses', ended: vm.totals.lost });
  const top = Math.max(1, ...rows.map((r) => r.beatUs));
  return (
    <Card className="co-bd-card">
      <CardHead title="Who beat us" meta={<Key mark="lost">Named as the winner</Key>} />
      <Body empty={empty}>
        <ul className="co-bd" aria-label="Who beat us">
          {rows.map((r) => (
            <li key={r.id}>
              <button
                type="button" className="co-bd-row" onClick={() => onPick({ key: `rival:${r.id}`, label: `Won by ${r.name}`, ids: r.tenderIds })}
                aria-label={`${r.name}: beat us ${plural(r.beatUs, 'time')}. List these debriefs`}
              >
                <span className="co-bd-l" title={r.name}>{r.name}</span>
                <span className="co-bd-r">beat us <span className="num">{r.beatUs}</span> {r.beatUs === 1 ? 'time' : 'times'}</span>
                <Bar n={r.beatUs} top={top} mark="lost" />
                <span className="co-bd-m co-clip" title={r.sectors.join(' · ')}>{r.sectors.join(' · ') || 'No sector recorded'}</span>
              </button>
              <span className="co-ls-x db-x">{placeText(r.place)}</span>
            </li>
          ))}
        </ul>
        <p className="co-bd-more">From accepted lost debriefs that name the winner. Our place is the median where the employer published it.</p>
      </Body>
    </Card>
  );
}

export function StoppedCard({ vm, why, onPick }: { vm: ArchiveVM; why: EmptyWhy; onPick: OnPick }) {
  const kinds = vm.stopped.filter((k) => k.count > 0);
  const answers = vm.stoppedEarlier;
  const empty = kinds.length ? null : emptyOf(why, { group: 'stopped', one: 'stopped bid', many: 'stopped bids', ended: vm.totals.stopped });
  return (
    <Card className="co-bd-card">
      <CardHead title="Why bids stopped" meta={<Key mark="stop">Neither won nor lost</Key>} />
      <Body empty={empty}>
        <ul className="co-bd" aria-label="Why bids stopped">
          {kinds.map((k) => (
            <li key={k.ending}>
              <button
                type="button" className="co-bd-row co-bd-row-1" onClick={() => onPick({ key: `stop:${k.ending}`, label: k.label, ids: k.tenderIds })}
                aria-label={`${k.label}: ${k.count}. List these debriefs`}
              >
                <span className="co-bd-l" title={k.label}>{k.label}</span>
                <span className="co-bd-r num">{k.count}</span>
                <Bar n={k.count} top={topOf(kinds)} mark="stop" />
              </button>
              <span className="co-ls-x db-x">
                {k.reasons.length ? k.reasons.map((r, i) => (
                  <span key={r.id}>
                    {i > 0 && ' · '}
                    <button
                      type="button" className="db-link" onClick={() => onPick({ key: `stop:${k.ending}:${r.id}`, label: `${k.label}: ${r.label}`, ids: r.tenderIds })}
                      aria-label={`${k.label}, ${r.label}: ${r.count}. List these debriefs`}
                    >{r.label} <span className="num">{r.count}</span></button>
                  </span>
                )) : 'No reason in an accepted debrief yet'}
              </span>
            </li>
          ))}
        </ul>
        <h3 className="s1-h3 co-dc-h">Should we have stopped earlier?</h3>
        {answers.length ? (
          <ul className="co-bd" aria-label="Should we have stopped earlier?">
            {answers.map((r) => (
              <li key={r.id}>
                <button
                  type="button" className="co-bd-row co-bd-row-1" onClick={() => onPick({ key: `earlier:${r.id}`, label: `Stopped earlier? ${r.label}`, ids: r.tenderIds })}
                  aria-label={`${r.label}: ${r.count}. List these debriefs`}
                >
                  <span className="co-bd-l" title={r.label}>{r.label}</span>
                  <span className="co-bd-r num">{r.count}</span>
                  <Bar n={r.count} top={topOf(answers)} mark="one" />
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="s1-muted co-dc-none">No answer in an accepted debrief yet.</p>}
        <p className="co-bd-more">Asked of withdrawn bids, No-Bids at DG2 and rejections at DG3.</p>
      </Body>
    </Card>
  );
}

type Latest = ArchiveVM['lessonAreas'][number]['latest'][number];

function Quote({ x }: { x: Latest | undefined }) {
  if (!x) return <li className="db-q none">No other lesson in this area in the period.</li>;
  return (
    <li className="db-q">
      <q>{x.text}</q>
      <span className="db-q-by">
        <Link className="mono co-rt-link" to={`/tenders/${encodeURIComponent(x.tenderId)}?tab=debrief`}>{x.tenderId}</Link>
        {' · '}{personById(x.byId)?.name ?? 'Not recorded'} · {dayMonth(x.at)}
      </span>
    </li>
  );
}

export function LessonsCard({ vm, why, onPick }: { vm: ArchiveVM; why: EmptyWhy; onPick: OnPick }) {
  const areas = vm.lessonAreas.filter((a) => a.count > 0);
  const empty = areas.length ? null : emptyOf(why, { one: 'bid ended', many: 'bids ended', ended: vm.totals.endings });
  return (
    <Card className="co-bd-card">
      <CardHead title="Lessons by area" meta={<Key mark="one">Lessons in accepted debriefs</Key>} />
      <Body empty={empty}>
        <ul className="co-bd" aria-label="Lessons by area">
          {areas.map((a) => (
            <li key={a.id}>
              <button
                type="button" className="co-bd-row co-bd-row-1" onClick={() => onPick({ key: `area:${a.id}`, label: `Lessons: ${a.label}`, ids: a.tenderIds })}
                aria-label={`${a.label}: ${plural(a.count, 'lesson')}. List these debriefs`}
              >
                <span className="co-bd-l" title={a.label}>{a.label}</span>
                <span className="co-bd-r"><span className="num">{a.count}</span> {a.count === 1 ? 'lesson' : 'lessons'}</span>
                <Bar n={a.count} top={topOf(areas)} mark="one" />
              </button>
              <ul className="db-qs" aria-label={`The latest lessons on ${a.label.toLowerCase()}`}>
                <Quote x={a.latest[0]} />
                <Quote x={a.latest[1]} />
              </ul>
            </li>
          ))}
        </ul>
      </Body>
    </Card>
  );
}

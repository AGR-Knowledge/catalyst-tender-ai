import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { TrackerNodeVM, TrackerVM } from '@/domain/gcc/viewmodels';
import { dateText } from '@/domain/calendar';
import { initialsOf } from '@/data/people';
import { Money } from '@/components/tender/Money';
import { StatusPill } from '@/components/tender/StatusPill';

/**
 * The tender tracker (dashboards.md §7): every stage and gate in lifecycle
 * order, then the Now card. A stopped tender shows the stop in red, fades
 * everything after it and says why.
 *
 * Plan 027d: a stage is a circle, a decision gate a violet diamond on a faint
 * violet band, so the three gates stand out at first glance. Every node has
 * the same rows on one grid, so they line up: the mark, the label, a chip
 * (a stage's days, a gate's decision), when, and who. Each mark keeps a
 * glyph beside its colour (✓ done, ● now, ✕ stopped, ‖ on hold).
 */

type Look = 'done' | 'current' | 'not-reached' | 'stopped' | 'hold';

/** A held gate stays open for the tender, so it reads as on hold rather than passed. */
const lookOf = (n: TrackerNodeVM): Look => (n.kind === 'gate' && n.status === 'done' && n.decision?.tone === 'orange' ? 'hold' : n.status);

const GLYPH: Record<Look, string> = { done: '✓', current: '●', 'not-reached': '', stopped: '✕', hold: '‖' };
const WORD: Record<'stage' | 'gate', Record<Look, string>> = {
  stage: { done: 'done', current: 'now', 'not-reached': 'not reached', stopped: 'stopped here', hold: 'on hold' },
  gate: { done: 'passed', current: 'open', 'not-reached': 'not reached', stopped: 'stopped here', hold: 'on hold' },
};

/** "28 Feb" from an ISO date or date-time. */
const day = (iso?: string) => (iso ? dateText(iso.slice(0, 10)).replace(/^\w+ /, '').replace(/ \d{4}$/, '') : '');
const at = (iso: string) => `${day(iso)}${iso.length > 10 ? ` ${iso.slice(11, 16)}` : ''}`;

/** The node's five rows as text: chip, when, who and the who's suffix. */
function rows(n: TrackerNodeVM) {
  if (n.kind === 'gate') {
    const d = n.decision;
    if (d) return { chip: d.label, tone: d.tone, when: at(d.at), who: d.byName, initials: initialsOf(d.byName), late: d.onTime ? null : `${d.lateBy ?? 'a while'} late` };
    // An open gate has no decider yet: it says since when, and its note says the time left.
    return { chip: n.status === 'current' ? 'Open' : '', tone: undefined, when: n.status === 'current' && n.from ? `since ${day(n.from)}` : '', who: '', initials: '', late: null };
  }
  const reached = n.status !== 'not-reached';
  const chip = reached && n.days !== undefined ? (n.status === 'current' ? `${n.days} d so far` : `${n.days} d`) : '';
  const when = n.from ? (n.to ? `${day(n.from)} – ${day(n.to)}` : `since ${day(n.from)}`) : '';
  return { chip, tone: undefined, when, who: n.ownerInitials ?? '', initials: n.ownerInitials ?? '', late: null };
}

function Node({ n, after }: { n: TrackerNodeVM; after: boolean }) {
  const look = lookOf(n);
  const r = rows(n);
  const gate = n.kind === 'gate';
  // Under the rows when it adds something: an open gate's time left, a re-open, a result. A stop's reason is the outcome line under the track.
  const extra = n.note && look !== 'stopped' ? n.note : '';
  const said = [
    n.label, WORD[n.kind][look], r.chip, r.who && (gate ? r.who : `owner ${r.who}`), r.when,
    gate && n.decision ? (r.late ?? 'on time') : '', n.note,
  ].filter(Boolean).join(', ');
  return (
    <li className={`tt-node k-${n.kind} s-${n.status} v-${look} ${after ? 'after-stop' : ''}`} title={n.note || undefined}>
      <span className="sr-only">{said}</span>
      <span className="tt-mark" aria-hidden><span className="tt-glyph">{GLYPH[look]}</span></span>
      <span className="tt-label" aria-hidden>{n.label}</span>
      <span className="tt-chip-row" aria-hidden>{r.chip && <span className={`tt-dec ${r.tone ? `tone-${r.tone}` : ''}`}>{r.chip}</span>}</span>
      <span className="tt-when" aria-hidden title={r.when || undefined}>{r.when}</span>
      <span className="tt-who" aria-hidden>
        {r.initials && <span className="avatar xs" title={r.who}>{r.initials}</span>}
        {gate && n.decision && <span className={r.late ? 't-red' : 'tt-ok'}>· {r.late ?? 'on time'}</span>}
      </span>
      {extra && <span className="tt-note" aria-hidden>{extra}</span>}
    </li>
  );
}

/** The marks drawn as in the track. */
function Key() {
  const mk = (kind: 'stage' | 'gate', look: Look) => (
    <span className={`tt-kmark k-${kind} v-${look}`}><span className="tt-mark"><span className="tt-glyph">{GLYPH[look]}</span></span></span>
  );
  return (
    <ul className="tt-key" aria-hidden>
      <li>{mk('stage', 'not-reached')}Stage</li>
      <li>{mk('gate', 'not-reached')}Decision gate</li>
      <li className="sep">{mk('stage', 'done')}Done</li>
      <li>{mk('stage', 'current')}Now</li>
      <li>{mk('stage', 'stopped')}Stopped here</li>
    </ul>
  );
}

export function TenderTracker({ vm, onClose, onOpen, focusOnOpen = true }: {
  vm: TrackerVM; onClose?(): void; onOpen?(id: string): void; focusOnOpen?: boolean;
}) {
  const head = useRef<HTMLHeadingElement>(null);

  useEffect(() => { if (focusOnOpen) head.current?.focus({ preventScroll: false }); }, [vm.tenderId, focusOnOpen]);

  useEffect(() => {
    if (!onClose) return;
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[aria-modal="true"]')) return;
      onClose();
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);

  // Where the track is wider than its card (the workspace Overview), open it with the current or stopped node in the middle, not at Intake.
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = track.current;
    const at = t?.querySelector<HTMLElement>('.tt-node.s-current, .tt-node.s-stopped');
    if (!t || !at || t.scrollWidth <= t.clientWidth) return;
    const a = at.getBoundingClientRect(), b = t.getBoundingClientRect();
    t.scrollLeft = Math.max(0, t.scrollLeft + (a.left + a.width / 2) - (b.left + b.width / 2));
  }, [vm.tenderId]);

  const stopAt = vm.nodes.findIndex((n) => n.status === 'stopped');
  const now = vm.now;

  return (
    <section className="card tt" aria-labelledby={`tt-${vm.tenderId}`}>
      <header className="tt-head">
        <h3 className="tt-title" id={`tt-${vm.tenderId}`} ref={head} tabIndex={-1}>
          <span className="mono">{vm.tenderId}</span>
          <span className="tt-sep" aria-hidden>·</span>
          <span>{vm.title}</span>
          {vm.value && <><span className="tt-sep" aria-hidden>·</span><Money value={vm.value} /></>}
        </h3>
        <StatusPill health={vm.health} />
        {onClose && (
          <button type="button" className="btn btn-icon tt-x" onClick={onClose} aria-label="Close the tracker"><X aria-hidden /></button>
        )}
      </header>

      <Key />
      <div className="tt-track" ref={track} tabIndex={0} aria-label="Stages and gates">
        <ol className="tt-nodes">
          {vm.nodes.map((n, i) => <Node key={n.key} n={n} after={stopAt >= 0 && i > stopAt} />)}
        </ol>
      </div>

      {vm.outcome && <div className="tt-outcome">{vm.outcome}</div>}

      {now && (
        <div className="tt-now">
          <div className="tt-now-h">Now: {now.stageLabel} · {now.stepLabel}</div>
          <dl className="tt-kv">
            <dt>With</dt><dd>{now.withName ? `${now.withName}${now.withRole ? `, ${now.withRole}` : ''}` : 'Nobody yet'}</dd>
            <dt>Team</dt><dd>{now.team ?? 'No team yet'}</dd>
            <dt>Status</dt><dd>{now.status}</dd>
            <dt>Next</dt><dd>{now.next}</dd>
            <dt>Blocker</dt><dd className={now.blocker ? 't-red' : ''}>{now.blocker ?? 'None'}</dd>
          </dl>
          {onOpen && (
            <div className="tt-foot"><button type="button" className="btn btn-sm btn-primary" onClick={() => onOpen(vm.tenderId)}>Open tender</button></div>
          )}
        </div>
      )}
      {!now && onOpen && (
        <div className="tt-foot pad"><button type="button" className="btn btn-sm" onClick={() => onOpen(vm.tenderId)}>Open tender</button></div>
      )}
    </section>
  );
}

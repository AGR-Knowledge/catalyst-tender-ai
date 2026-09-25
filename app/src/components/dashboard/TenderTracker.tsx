import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { TrackerNodeVM, TrackerVM } from '@/domain/gcc/viewmodels';
import { dateText } from '@/domain/calendar';
import { Money } from '@/components/tender/Money';
import { StatusPill } from '@/components/tender/StatusPill';

/**
 * The tender tracker (dashboards.md §7): every stage and gate in lifecycle
 * order, with dates, days, who and when, then the Now card. A stopped tender
 * greys everything after the stop and says why.
 */

const MARK: Record<TrackerNodeVM['status'], string> = { done: '✓', current: '●', 'not-reached': '○', stopped: '✕' };
const STATUS_WORD: Record<TrackerNodeVM['status'], string> = { done: 'done', current: 'current', 'not-reached': 'not reached', stopped: 'stopped here' };

/** "28 Feb" from an ISO date or date-time. */
const day = (iso?: string) => (iso ? dateText(iso.slice(0, 10)).replace(/^\w+ /, '').replace(/ \d{4}$/, '') : '');
const at = (iso: string) => `${day(iso)}${iso.length > 10 ? ` ${iso.slice(11, 16)}` : ''}`;

function Node({ n, after }: { n: TrackerNodeVM; after: boolean }) {
  const dates = n.from ? (n.to ? `${day(n.from)}–${day(n.to)}` : `since ${day(n.from)}`) : '';
  return (
    <li className={`tt-node k-${n.kind} s-${n.status} ${after ? 'after-stop' : ''}`}>
      <span className="tt-mark" aria-hidden>{MARK[n.status]}</span>
      <span className="tt-label">{n.label}<span className="sr-only">, {STATUS_WORD[n.status]}</span></span>
      {n.kind === 'gate' && n.decision ? (
        <span className="tt-detail">
          <span className={`tt-dec tone-${n.decision.tone}`}>{n.decision.label}</span>
          <span>{n.decision.byName}</span>
          <span className="num">{at(n.decision.at)}</span>
          <span className={n.decision.onTime ? 'tt-ok' : 't-red'}>{n.decision.onTime ? 'on time' : `late by ${n.decision.lateBy ?? 'a while'}`}</span>
        </span>
      ) : (
        <span className="tt-detail">
          {dates && <span className="num">{dates}</span>}
          {(n.days !== undefined || n.ownerInitials) && (
            <span>{n.days !== undefined ? `${n.days} d` : ''}{n.days !== undefined && n.ownerInitials ? ' · ' : ''}{n.ownerInitials ?? ''}</span>
          )}
        </span>
      )}
      {n.note && <span className="tt-note">{n.note}</span>}
    </li>
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

      <div className="tt-track" tabIndex={0} aria-label="Stages and gates">
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

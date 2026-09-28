import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Person } from '@/data/people';
import { calendarItemDetail, type CalendarDetailVM } from '@/domain/gcc/calendar';
import { dateArabicOf, ocrPagesOf } from '@/domain/gcc/arabic';
import { ModalFrame } from '@/components/overlays/Frames';
import { ClosingContext, usePresence } from '@/state/presence';
import { When } from '@/components/tender/When';
import { SlaClock } from '@/components/tender/SlaClock';
import { SourceChip } from '@/components/tender/SourceChip';
import { StatusPill } from '@/components/tender/StatusPill';
import { Money } from '@/components/tender/Money';
import { BilingualValue } from '@/components/tender/BilingualValue';
import { docOf, sourceDocOf } from '../s1/vm/docs';

/**
 * The detail of one calendar item (plan 027b Phase 6), on the app's modal:
 * when (in the item's zone, with the countdown, and in the tenant's zone when
 * that differs), where, the tender, what is still needed, the source page and
 * the tender's other dates. Its buttons go and act; opening one closes the
 * modal first. Esc and the scrim close it, and focus returns to the chip.
 */

const GLYPH: Record<string, string> = { green: '✓', orange: '!', red: '×' };

function Source({ tenant, d }: { tenant: string; d: CalendarDetailVM }) {
  const s = d.source!;
  const document = docOf(tenant, s.tenderId);
  const doc = sourceDocOf(document);
  const record = document?.record ?? null;
  const ar = dateArabicOf(record, { date: d.item.date, time: d.item.time, page: s.page });
  const scanned = ocrPagesOf(record).includes(s.page);
  return (
    <div className="gcal-md-src">
      <SourceChip source={{ kind: 'page', page: s.page, label: `p. ${s.page}`, ...(scanned ? { scanned: true, ...(ar ? { arabic: ar } : {}) } : {}) }} doc={doc} />
      <span>Page {s.page} of {doc ? doc.title : 'the tender documents'}</span>
      {ar && <BilingualValue className="gcal-md-ar" en={`${d.item.title}: ${d.when.text}`} ar={ar} />}
    </div>
  );
}

function Body({ tenant, d }: { tenant: string; d: CalendarDetailVM }) {
  const { item, when, tender } = d;
  const others = d.otherDates.length > 1;
  return (
    <div className="modal-body gcal-md">
      <section>
        <h4>When</h4>
        <p className="gcal-md-when"><span className="num">{when.text}</span><span className="cd">{when.countdown}</span></p>
        {when.tenantText && <p className="gcal-md-alt num">{when.tenantText}</p>}
        {item.flags.length > 0 && <ul className="gcal-md-flags">{item.flags.map((f) => <li key={f}><span aria-hidden>! </span>{f}</li>)}</ul>}
      </section>

      {d.where && (
        <section>
          <h4>Where</h4>
          <p>{d.where}</p>
        </section>
      )}

      {tender && (
        <section>
          <h4>Tender</h4>
          <dl className="gcal-md-kv">
            <dt>Stage</dt><dd>{tender.stage} · {tender.step}</dd>
            <dt>Issuer</dt><dd>{tender.issuer}</dd>
            <dt>Owner</dt><dd>{tender.ownerName ? `${tender.ownerName}${tender.ownerRole ? `, ${tender.ownerRole}` : ''}` : 'With nobody now'}</dd>
            <dt>Health</dt><dd><StatusPill health={tender.health} /></dd>
            <dt>Value</dt><dd>{tender.value ? <Money value={tender.value} /> : null}{tender.valueNote && <span className="gcal-md-note">{tender.value ? ` · ${tender.valueNote}` : tender.valueNote}</span>}</dd>
          </dl>
        </section>
      )}

      {(d.needs.length > 0 || d.sla) && (
        <section>
          <h4>What's needed</h4>
          {d.sla && <p className="gcal-md-sla"><span>Time limit</span> <SlaClock start={d.sla.start} end={d.sla.end} /></p>}
          <ul className="gcal-md-needs">
            {d.needs.map((n) => (
              <li key={n.text} className={n.tone && GLYPH[n.tone] ? `t-${n.tone}` : ''}>
                <span className="g" aria-hidden>{n.tone && GLYPH[n.tone] ? GLYPH[n.tone] : '·'}</span>
                <span className="x">{n.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {d.source && (
        <section>
          <h4>Source</h4>
          <Source tenant={tenant} d={d} />
        </section>
      )}

      {others && (
        <section>
          <h4>Other dates on this tender</h4>
          <ol className="gcal-tl">
            {d.otherDates.map((o) => (
              <li key={o.key} className={`${o.past ? 'past' : ''} ${o.current ? `cur gcal-c-${item.category}` : ''}`} aria-current={o.current || undefined}>
                <span className="mk" aria-hidden>{o.past ? '✓' : ''}</span>
                <span className="l">{o.label}{o.current && <span className="sr-only"> (this item)</span>}{o.past && <span className="sr-only"> (passed)</span>}</span>
                <span className="w"><When date={o.date} time={o.time} tz={o.tz} short /></span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

export function EventModal({ id, tenant, viewer, done, onClose, onGo }: {
  id: string | null;
  tenant: string;
  viewer: Person;
  done: Readonly<Record<string, string>>;
  onClose(): void;
  onGo(to: string): void;
}) {
  const detail = useMemo(() => (id ? calendarItemDetail(id, { tenant, viewer, done }) : null), [id, tenant, viewer, done]);
  const { shown, closing } = usePresence(detail);
  if (!shown) return null;
  const { item } = shown;
  return createPortal(
    <ClosingContext.Provider value={closing}>
      <div className={`gcal-modal-host gcal-c-${item.category}`}>
        <ModalFrame
          wide
          eyebrow={shown.categoryLabel}
          title={item.title}
          sub={item.tenderId ? `${item.tenderId}${item.shortTitle ? ` · ${item.shortTitle}` : ''}` : undefined}
          onClose={onClose}
          actions={[
            ...shown.actions.map((a) => ({ label: a.label, primary: a.primary, onClick: () => onGo(a.to) })),
            { label: 'Close', onClick: onClose },
          ]}
        >
          <Body tenant={tenant} d={shown} />
        </ModalFrame>
      </div>
    </ClosingContext.Provider>,
    document.body,
  );
}

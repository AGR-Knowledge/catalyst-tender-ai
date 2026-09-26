import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Tone } from '@/data/types';
import type { ExtractField, ExtractFlag } from '@/data/extracted/types';
import type { GccFieldGroup } from '@/data/gcc/types';
import { validationsOf, type QueueItem } from '@/domain/gcc/s1';
import { isArabicRecord, isGccRecord, type TenderRecord } from '@/domain/gcc/documents';
import { termsOf } from '@/domain/gcc/workspace';
import { dateText } from '@/domain/calendar';
import { Card, CardHead } from '@/components/ui/primitives';
import { SourceChip } from '@/components/tender/SourceChip';
import type { SourceDoc } from '@/components/tender/SourceHost';
import { StatusPill } from '@/components/tender/StatusPill';
import { LangBadge } from '@/components/tender/LangBadge';
import { Callout } from '@/components/tender/Callout';
import { docOf, sourceDocOf } from '@/pages/gcc/s1/vm/docs';
import type { WorkspaceCtx, WorkspaceTabDef } from './types';
import '@/pages/gcc/s1/s1.css';

/**
 * Requirements (order 30, plan 007b): what the agent read, by field group
 * (spec §6.4): identity, commercial, guarantees, time, eligibility,
 * evaluation, submission and risk clauses, each value with its confidence,
 * page and note, and the flags to raise at screening. A field still in the
 * intake queue says so. A record without groups (the real sample documents)
 * shows its own sections. Arabic documents show the English value; the
 * bilingual view comes later.
 */

const GROUPS: { key: GccFieldGroup; label: string }[] = [
  { key: 'identity', label: 'Identity' }, { key: 'commercial', label: 'Commercial' }, { key: 'guarantees', label: 'Guarantees' },
  { key: 'time', label: 'Time' }, { key: 'evaluation', label: 'Evaluation' }, { key: 'submission', label: 'Submission' }, { key: 'risk', label: 'Risk clauses' },
];
const CONF: Record<ExtractField['confidence'], { label: string; tone: Tone } | null> = {
  high: null, medium: { label: 'Medium confidence', tone: 'orange' }, low: { label: 'Low confidence', tone: 'red' },
};
const SEVERITY: Record<ExtractFlag['severity'], { label: string; tone: Tone; rank: number }> = {
  high: { label: 'High', tone: 'red', rank: 0 }, medium: { label: 'Medium', tone: 'orange', rank: 1 }, low: { label: 'Low', tone: 'grey', rank: 2 },
};

const onPage = (q: QueueItem, page: number) => q.item.page === page || q.item.alt?.page === page;
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The queue item a low-confidence field stands for: the item named like the
 * field, else the one on its page when no other low-confidence field shares
 * that page (two fields on one page must not both claim one item).
 */
function itemFor(f: ExtractField, items: QueueItem[], fields: ExtractField[]): QueueItem | undefined {
  if (f.confidence !== 'low') return undefined;
  const named = items.find((q) => sameName(q.item.field, f.label));
  if (named) return named;
  const lowHere = fields.filter((x) => x.confidence === 'low' && x.page === f.page);
  const here = items.filter((q) => onPage(q, f.page) && !fields.some((x) => sameName(q.item.field, x.label)));
  return lowHere.length === 1 && here.length === 1 ? here[0] : undefined;
}

function Fields({ fields, doc, items, tenderId }: { fields: ExtractField[]; doc: SourceDoc | null; items: QueueItem[]; tenderId: string }) {
  return (
    <dl className="rq">
      {fields.map((f) => {
        const c = CONF[f.confidence];
        const q = itemFor(f, items, fields);
        return (
          <div key={`${f.label}:${f.page}`} className="rq-row">
            <dt>{f.label}</dt>
            <dd>
              <span className="rq-v">{f.value}</span>
              <span className="rq-meta">
                <SourceChip source={{ kind: 'page', page: f.page, label: `p. ${f.page}`, terms: termsOf(f.value) }} doc={doc} />
                {c && !q && <StatusPill label={c.label} tone={c.tone} />}
                {q && (q.state === 'resolved'
                  ? <StatusPill label={`Validated: ${q.resolvedValue}`} tone="green" icon="✓" />
                  : <Link to={`/intake-queue?tender=${tenderId}`} className="rq-q"><StatusPill label={q.conflict ? 'Conflict: in the intake queue' : 'In the intake queue'} tone="orange" icon="!" /></Link>)}
              </span>
              {f.note && <span className="rq-note">{f.note}</span>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function Flags({ flags, doc }: { flags: ExtractFlag[]; doc: SourceDoc | null }) {
  const sorted = [...flags].sort((a, b) => SEVERITY[a.severity].rank - SEVERITY[b.severity].rank);
  return (
    <ul className="rq-flags">
      {sorted.map((f) => (
        <li key={f.title} className={`rq-flag sev-${f.severity}`}>
          <div className="rq-flag-h">
            <StatusPill label={SEVERITY[f.severity].label} tone={SEVERITY[f.severity].tone} icon="!" />
            <span className="rq-flag-t">{f.title}</span>
            <SourceChip source={{ kind: 'page', page: f.page, label: `p. ${f.page}` }} doc={doc} />
          </div>
          <p>{f.detail}</p>
        </li>
      ))}
    </ul>
  );
}

function Section({ title, meta, children }: { title: string; meta?: string; children: ReactNode }) {
  return <Card><CardHead title={title} meta={meta} /><div className="s1-pad">{children}</div></Card>;
}

function Requirements({ ctx }: { ctx: WorkspaceCtx }) {
  const d = docOf(ctx.tenant, ctx.tenderId);
  if (!d) return null;
  const r: TenderRecord = d.record;
  const doc = sourceDocOf(d);
  const items = validationsOf(ctx.tenant, ctx.tenderId, ctx.done);
  const open = items.filter((x) => x.state !== 'resolved');
  const prevails = r.flags.find((f) => /arabic text (shall )?prevails?/i.test(`${f.title} ${f.detail}`));
  const asFields = (xs: { label: string; date: string; time?: string; page: number; confidence: ExtractField['confidence'] }[]): ExtractField[] =>
    xs.map((x) => ({ label: x.label, value: `${dateText(x.date)}${x.time ? `, ${x.time}` : ''}`, page: x.page, confidence: x.confidence }));

  return (
    <div className="ws-tab">
      <Card>
        <CardHead title="What the agent read" meta={<span className="rq-badges"><LangBadge lang={d.lang === 'ar' ? 'AR' : 'EN'} />{d.scanned && <span className="wsh-badge">OCR</span>}</span>} />
        <p className="s1-lede">
          {r.docType}, {r.pages} pages{r.refNo ? `, ${r.refNo}` : ''}. Read by the Intake &amp; Extraction agent; every value links to its page.
          {isArabicRecord(r) && ' Read from an Arabic document: the English value is shown.'}
        </p>
        <div className="s1-pad rq-top">
          {open.length > 0 && (
            <Callout variant="route" title={`${open.length} field${open.length === 1 ? '' : 's'} in the intake queue`} compact
              action={<Link className="btn btn-sm" to={`/intake-queue?tender=${ctx.tenderId}`}>Open the queue</Link>}>
              The agent would not accept {open.length === 1 ? 'it' : 'them'} alone: {open.map((q) => q.item.field).join(', ')}.
            </Callout>
          )}
          {prevails && <Callout variant="route" word="Language" title="The Arabic text prevails" compact>{prevails.detail}</Callout>}
        </div>
      </Card>

      {isGccRecord(r) ? (
        <>
          {GROUPS.filter((g) => r.groups[g.key]?.length).slice(0, 4).map((g) => (
            <Section key={g.key} title={g.label}><Fields fields={r.groups[g.key]} doc={doc} items={items} tenderId={ctx.tenderId} /></Section>
          ))}
          <Section title="Eligibility and prequalification" meta="Checked against the vault in Eligibility & fit">
            <Fields fields={r.eligibility} doc={doc} items={items} tenderId={ctx.tenderId} />
          </Section>
          {GROUPS.filter((g) => r.groups[g.key]?.length).slice(4).map((g) => (
            <Section key={g.key} title={g.label}><Fields fields={r.groups[g.key]} doc={doc} items={items} tenderId={ctx.tenderId} /></Section>
          ))}
        </>
      ) : (
        <>
          {r.summary.length > 0 && <Section title="Summary"><Fields fields={r.summary} doc={doc} items={items} tenderId={ctx.tenderId} /></Section>}
          {r.dates.length > 0 && <Section title="Dates"><Fields fields={asFields(r.dates)} doc={doc} items={items} tenderId={ctx.tenderId} /></Section>}
          {r.eligibility.length > 0 && <Section title="Eligibility and prequalification"><Fields fields={r.eligibility} doc={doc} items={items} tenderId={ctx.tenderId} /></Section>}
          {r.evaluation.length > 0 && <Section title="Evaluation"><Fields fields={r.evaluation} doc={doc} items={items} tenderId={ctx.tenderId} /></Section>}
          {r.submission.length > 0 && <Section title="Submission"><Fields fields={r.submission} doc={doc} items={items} tenderId={ctx.tenderId} /></Section>}
          {r.clauses.length > 0 && (
            <Section title="Clauses">
              <Fields fields={r.clauses.map((c) => ({ label: `${c.ref} ${c.title}`, value: c.summary, page: c.page, confidence: 'high' as const }))} doc={doc} items={items} tenderId={ctx.tenderId} />
            </Section>
          )}
        </>
      )}

      {r.flags.length > 0 && <Section title="Flags to raise at screening" meta={`${r.flags.length}`}><Flags flags={r.flags} doc={doc} /></Section>}
    </div>
  );
}

export const TABS: WorkspaceTabDef[] = [{
  id: 'requirements', label: 'Requirements', order: 30, plan: '007b',
  shows: (ctx) => !!docOf(ctx.tenant, ctx.tenderId),
  badge: (ctx) => {
    const n = validationsOf(ctx.tenant, ctx.tenderId, ctx.done).filter((q) => q.state !== 'resolved').length;
    return n ? { text: `${n} to check`, tone: 'orange' } : null;
  },
  Panel: Requirements,
}];

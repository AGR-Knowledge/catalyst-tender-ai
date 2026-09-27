import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Tone } from '@/data/types';
import type { ExtractField, ExtractFlag } from '@/data/extracted/types';
import type { GccFieldGroup } from '@/data/gcc/types';
import { validationsOf, type QueueItem } from '@/domain/gcc/s1';
import { isArabicRecord, isGccRecord, type TenderRecord } from '@/domain/gcc/documents';
import { termsOf } from '@/domain/gcc/workspace';
import { arabicOf, ocrBadgeText, ocrOf, prevailsOf, prevailsTitle, reasonOf } from '@/domain/gcc/arabic';
import { dateText } from '@/domain/calendar';
import { Card, CardHead } from '@/components/ui/primitives';
import { SourceChip } from '@/components/tender/SourceChip';
import type { SourceDoc } from '@/components/tender/SourceHost';
import { StatusPill } from '@/components/tender/StatusPill';
import { LangBadge } from '@/components/tender/LangBadge';
import { Callout } from '@/components/tender/Callout';
import { ArabicToggle, BilingualValue } from '@/components/tender/BilingualValue';
import { docOf, sourceDocOf } from '@/pages/gcc/s1/vm/docs';
import { ReadInEnglish } from '../parts/ReadInEnglish';
import type { WorkspaceCtx, WorkspaceTabDef } from './types';
import '@/pages/gcc/s1/s1.css';

/**
 * Requirements (order 30, plan 007b): what the agent read, by field group
 * (spec §6.4): identity, commercial, guarantees, time, eligibility,
 * evaluation, submission and risk clauses, each value with its confidence,
 * page and note, and the flags to raise at screening. A field still in the
 * intake queue says so. A record without groups (the real sample documents)
 * shows its own sections.
 *
 * A document read from Arabic (plan 012) shows every English value with the
 * Arabic it was read from and its page (`BilingualValue`), its clauses and
 * scope, "Show Arabic sources" for the whole tab (on by default), the
 * prevailing-language callout from `prevailsOf`, and Read in English. A
 * scanned page's chip says it was read by OCR. English documents render as
 * before.
 */

/** How an Arabic or scanned record shows: the tab's switch, and the pages read by OCR. Absent for an English record. */
interface ArabicView { show: boolean; ocrPages: number[] }

type Field = ExtractField & { source?: string };

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

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function Fields({ fields, doc, items, tenderId, ar }: { fields: Field[]; doc: SourceDoc | null; items: QueueItem[]; tenderId: string; ar?: ArabicView }) {
  return (
    <dl className="rq">
      {fields.map((f) => {
        const c = CONF[f.confidence];
        const q = itemFor(f, items, fields);
        const src = ar ? arabicOf(f) : undefined;
        const scanned = !!ar && ar.ocrPages.includes(f.page);
        const reason = ar ? reasonOf(f, ar.ocrPages) : null;
        const terms = scanned ? undefined : termsOf(f.value);
        return (
          <div key={`${f.label}:${f.page}`} className="rq-row">
            <dt>{f.label}</dt>
            <dd>
              <BilingualValue en={f.value} ar={src} page={f.page} doc={doc} terms={terms} scanned={scanned} show={!!ar?.show} className="rq-v" />
              <span className="rq-meta">
                {!(ar?.show && src) && (
                  <SourceChip source={{ kind: 'page', page: f.page, label: `p. ${f.page}`, ...(terms ? { terms } : {}), ...(scanned ? { scanned: true, ...(src ? { arabic: src } : {}) } : {}) }} doc={doc} />
                )}
                {c && !q && <StatusPill label={reason ? `${c.label}: ${lowerFirst(reason)}` : c.label} tone={c.tone} />}
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

function Flags({ flags, doc, ar }: { flags: (ExtractFlag & { source?: string })[]; doc: SourceDoc | null; ar?: ArabicView }) {
  const sorted = [...flags].sort((a, b) => SEVERITY[a.severity].rank - SEVERITY[b.severity].rank);
  return (
    <ul className="rq-flags">
      {sorted.map((f) => (
        <li key={f.title} className={`rq-flag sev-${f.severity}`}>
          <div className="rq-flag-h">
            <StatusPill label={SEVERITY[f.severity].label} tone={SEVERITY[f.severity].tone} icon="!" />
            <span className="rq-flag-t">{f.title}</span>
            <SourceChip source={{ kind: 'page', page: f.page, label: `p. ${f.page}`, ...(ar?.ocrPages.includes(f.page) ? { scanned: true } : {}) }} doc={doc} />
          </div>
          <p><BilingualValue en={f.detail} ar={ar ? arabicOf(f) : undefined} show={!!ar?.show} /></p>
        </li>
      ))}
    </ul>
  );
}

function Section({ title, meta, children }: { title: string; meta?: string; children: ReactNode }) {
  return <Card><CardHead title={title} meta={meta} /><div className="s1-pad">{children}</div></Card>;
}

/** The scope lines of an Arabic record, each with its Arabic and page. */
function Scope({ lines, doc, ar }: { lines: { text: string; page: number; source?: string }[]; doc: SourceDoc | null; ar: ArabicView }) {
  return (
    <ul className="bv-list">
      {lines.map((l, i) => {
        const src = arabicOf(l);
        const scanned = ar.ocrPages.includes(l.page);
        const terms = scanned ? undefined : termsOf(l.text);
        return (
          <li key={i}>
            <BilingualValue en={l.text} ar={src} page={l.page} doc={doc} terms={terms} scanned={scanned} show={ar.show} />
            {!(ar.show && src) && <SourceChip source={{ kind: 'page', page: l.page, label: `p. ${l.page}`, ...(terms ? { terms } : {}), ...(scanned ? { scanned: true } : {}) }} doc={doc} />}
          </li>
        );
      })}
    </ul>
  );
}

const clauseFields = (r: TenderRecord): Field[] =>
  r.clauses.map((c) => ({ label: `${c.ref} ${c.title}`, value: c.summary, page: c.page, confidence: 'high' as const, ...('source' in c ? { source: c.source } : {}) }));

function Requirements({ ctx }: { ctx: WorkspaceCtx }) {
  // "Show Arabic sources": local to the tab, on by default; only an Arabic record offers it.
  const [showAr, setShowAr] = useState(true);
  const d = docOf(ctx.tenant, ctx.tenderId);
  if (!d) return null;
  const r: TenderRecord = d.record;
  const doc = sourceDocOf(d);
  const items = validationsOf(ctx.tenant, ctx.tenderId, ctx.done);
  const open = items.filter((x) => x.state !== 'resolved');
  const arabic = isArabicRecord(r);
  const ocr = ocrOf(r);
  const ar: ArabicView | undefined = arabic || r.scanned ? { show: arabic && showAr, ocrPages: ocr.pages } : undefined;
  const prevails = prevailsOf(r);
  const asFields = (xs: { label: string; date: string; time?: string; page: number; confidence: ExtractField['confidence']; source?: string }[]): Field[] =>
    xs.map((x) => ({ label: x.label, value: `${dateText(x.date)}${x.time ? `, ${x.time}` : ''}`, page: x.page, confidence: x.confidence, ...(x.source !== undefined ? { source: x.source } : {}) }));

  return (
    <div className="ws-tab">
      <Card>
        <CardHead title="What the agent read" meta={<span className="rq-badges"><LangBadge lang={d.lang === 'ar' ? 'AR' : 'EN'} />{d.scanned && <span className="wsh-badge">{ocrBadgeText(ocr)}</span>}</span>} />
        <p className="s1-lede">
          {r.docType}, {r.pages} pages{r.refNo ? `, ${r.refNo}` : ''}. Read by the Intake &amp; Extraction agent; every value links to its page.
          {arabic && ' Read from an Arabic document: each English value is a reading aid, shown with the Arabic it was read from.'}
        </p>
        {arabic && (
          <div className="s1-pad bv-tools">
            <ReadInEnglish record={r} doc={doc} />
            <ArabicToggle on={showAr} onChange={setShowAr} />
          </div>
        )}
        <div className="s1-pad rq-top">
          {open.length > 0 && (
            <Callout variant="route" title={`${open.length} field${open.length === 1 ? '' : 's'} in the intake queue`} compact
              action={<Link className="btn btn-sm" to={`/intake-queue?tender=${ctx.tenderId}`}>Open the queue</Link>}>
              The agent would not accept {open.length === 1 ? 'it' : 'them'} alone: {open.map((q) => q.item.field).join(', ')}.
            </Callout>
          )}
          {prevails && (prevails.ar || prevails.kind === 'unstated' ? (
            <Callout variant="route" word="Language" title={prevailsTitle(prevails)} compact>
              <BilingualValue en={prevails.kind === 'arabic' ? `“${prevails.en}”` : prevails.en} ar={prevails.ar ?? undefined} page={prevails.page} doc={doc} show={!!ar?.show} />
            </Callout>
          ) : <Callout variant="route" word="Language" title="The Arabic text prevails" compact>{prevails.flag ?? prevails.en}</Callout>)}
        </div>
      </Card>

      {isGccRecord(r) ? (
        <>
          {GROUPS.filter((g) => r.groups[g.key]?.length).slice(0, 4).map((g) => (
            <Section key={g.key} title={g.label}><Fields fields={r.groups[g.key]} doc={doc} items={items} tenderId={ctx.tenderId} ar={ar} /></Section>
          ))}
          <Section title="Eligibility and prequalification" meta="Checked against the vault in Eligibility & fit">
            <Fields fields={r.eligibility} doc={doc} items={items} tenderId={ctx.tenderId} ar={ar} />
          </Section>
          {GROUPS.filter((g) => r.groups[g.key]?.length).slice(4).map((g) => (
            <Section key={g.key} title={g.label}><Fields fields={r.groups[g.key]} doc={doc} items={items} tenderId={ctx.tenderId} ar={ar} /></Section>
          ))}
          {arabic && ar && r.scope.length > 0 && <Section title="Scope of work"><Scope lines={r.scope} doc={doc} ar={ar} /></Section>}
          {arabic && r.clauses.length > 0 && <Section title="Clauses"><Fields fields={clauseFields(r)} doc={doc} items={items} tenderId={ctx.tenderId} ar={ar} /></Section>}
        </>
      ) : (
        <>
          {r.summary.length > 0 && <Section title="Summary"><Fields fields={r.summary} doc={doc} items={items} tenderId={ctx.tenderId} ar={ar} /></Section>}
          {r.dates.length > 0 && <Section title="Dates"><Fields fields={asFields(r.dates)} doc={doc} items={items} tenderId={ctx.tenderId} ar={ar} /></Section>}
          {r.eligibility.length > 0 && <Section title="Eligibility and prequalification"><Fields fields={r.eligibility} doc={doc} items={items} tenderId={ctx.tenderId} ar={ar} /></Section>}
          {r.evaluation.length > 0 && <Section title="Evaluation"><Fields fields={r.evaluation} doc={doc} items={items} tenderId={ctx.tenderId} ar={ar} /></Section>}
          {r.submission.length > 0 && <Section title="Submission"><Fields fields={r.submission} doc={doc} items={items} tenderId={ctx.tenderId} ar={ar} /></Section>}
          {r.clauses.length > 0 && (
            <Section title="Clauses">
              <Fields fields={clauseFields(r)} doc={doc} items={items} tenderId={ctx.tenderId} ar={ar} />
            </Section>
          )}
        </>
      )}

      {r.flags.length > 0 && <Section title="Flags to raise at screening" meta={`${r.flags.length}`}><Flags flags={r.flags} doc={doc} ar={ar} /></Section>}
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

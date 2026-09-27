import { FileText } from 'lucide-react';
import { personById } from '@/data/people';
import { dateText } from '@/domain/calendar';
import { addendaFor, pipelineFor, DISPOSITION_LABEL, type AddendumVM } from '@/domain/gcc/s1';
import { dataOf, shortWhen, tenderOf } from '@/domain/gcc/s1/common';
import { ocrOf, pagesText } from '@/domain/gcc/arabic';
import { Card, CardHead } from '@/components/ui/primitives';
import { SourceChip } from '@/components/tender/SourceChip';
import { useSourceHost } from '@/components/tender/SourceHost';
import { LangBadge } from '@/components/tender/LangBadge';
import { Callout } from '@/components/tender/Callout';
import { EmptyState } from '@/components/tender/EmptyState';
import { docOf, sourceDocOf } from '@/pages/gcc/s1/vm/docs';
import { uploadsOf } from '@/pages/gcc/s1/vm/uploads';
import { IntakeSteps } from '@/pages/gcc/s1/IntakeSteps';
import { ReadInEnglish } from '../parts/ReadInEnglish';
import type { WorkspaceCtx, WorkspaceTabDef } from './types';
import '@/pages/gcc/s1/s1.css';

/**
 * Documents (order 20, plan 007b): the tender document the demo holds (read
 * through `documentFor`), every source it arrived from (one tender, one ID,
 * spec §6.8), this morning's intake steps (§6.2), and each addendum with what
 * it changed and what that set off. A document read from Arabic offers Read
 * in English beside it, and a scanned one names its OCR pages (plan 012).
 */

const eventsOf = (tenant: string, id: string) => dataOf(tenant).intakeToday.filter((e) => e.tenderId === id);

function Addendum({ a }: { a: AddendumVM }) {
  const chip = (page: number) => <SourceChip source={{ kind: 'addendum', page, label: `add.${a.no} p. ${page}`, doc: null }} />;
  return (
    <Card>
      <CardHead title={`Addendum ${a.no}`} meta={<span className="mono">{a.ref}</span>} />
      <p className="s1-lede">Received {shortWhen(a.receivedAt)} · {a.pages} pages · linked to this tender. {a.summary}</p>
      <div className="s1-pad ad">
        <div className="ad-sec">
          <h4>Dates</h4>
          {a.diff.dates.length ? (
            <ul>{a.diff.dates.map((d) => <li key={d.field}><b>{d.label}</b>: <s>{dateText(d.from.slice(0, 10))}</s> → {dateText(d.to.slice(0, 10))}</li>)}</ul>
          ) : <p className="s1-muted">{a.diff.datesNote ?? 'No date changes.'}</p>}
        </div>
        {a.diff.boq.length > 0 && (
          <div className="ad-sec">
            <h4>BOQ lines</h4>
            <ul>{a.diff.boq.map((b) => <li key={b.item}><b className="mono">{b.item}</b>{b.topic ? ` ${b.topic}` : ''}{b.packageId ? ` (Package ${b.packageId})` : ''}: <s>{b.from}</s> → {b.to}</li>)}</ul>
          </div>
        )}
        {a.diff.clauses.length > 0 && (
          <div className="ad-sec">
            <h4>Clauses</h4>
            <ul>{a.diff.clauses.map((c) => <li key={c.clause}><b>{c.clause}</b> {chip(c.page)}: <s>{c.from}</s> → {c.to}</li>)}</ul>
          </div>
        )}
        <div className="ad-sec">
          <h4>What it set off</h4>
          <ul>{a.effects.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
        {a.packStale && (
          <Callout variant="stale" title="The Bid / No-Bid pack is stale" compact>It was issued before this addendum arrived and needs a re-run before the committee relies on it.</Callout>
        )}
      </div>
    </Card>
  );
}

function Documents({ ctx }: { ctx: WorkspaceCtx }) {
  const host = useSourceHost();
  const d = docOf(ctx.tenant, ctx.tenderId);
  const doc = sourceDocOf(d);
  const t = tenderOf(ctx.tenant, ctx.tenderId);
  const data = dataOf(ctx.tenant);
  const events = eventsOf(ctx.tenant, ctx.tenderId);
  const own = events.find((e) => e.disposition !== 'addendum');
  const pipeline = own ? pipelineFor(ctx.tenant, own.id) : null;
  const uploads = uploadsOf(ctx.done, ctx.tenderId);
  const addenda = addendaFor(ctx.tenant, ctx.tenderId);
  const sourceName = (id: string) => data.sources.find((s) => s.id === id)?.name ?? id;
  const file = d ? decodeURIComponent(d.url.split('/').pop() ?? d.url) : null;
  const ocr = ocrOf(d?.record);

  return (
    <div className="ws-tab">
      <Card>
        <CardHead title="Tender documents" />
        {d ? (
          <div className="s1-pad doc">
            <FileText size={22} aria-hidden className="doc-ic" />
            <div className="doc-m">
              <div className="doc-t">{d.title}</div>
              <div className="doc-s"><span className="mono">{file}</span> · {d.record.docType} · {d.record.pages} pages</div>
              <div className="doc-b"><LangBadge lang={d.lang === 'ar' ? 'AR' : 'EN'} />{d.scanned && <span className="wsh-badge">{ocr.pages.length ? `OCR: ${pagesText(ocr.pages)} scanned` : 'OCR: scanned pages'}</span>}{d.record.issued && <span className="doc-s">Issued {dateText(d.record.issued)}</span>}</div>
            </div>
            {d.lang === 'ar' && <ReadInEnglish record={d.record} doc={doc} />}
            {host && doc && <button type="button" className="btn btn-sm" onClick={(e) => host.open({ doc, page: 1, label: d.title }, e.currentTarget)}>Open the document</button>}
          </div>
        ) : <EmptyState title="The demo holds no copy of this tender's documents." body="The register keeps where it came from; its fields were entered from the notice." compact />}
      </Card>

      <Card>
        <CardHead title="Received from" meta={<span className="num">{1 + events.length + uploads.length} {1 + events.length + uploads.length === 1 ? 'entry' : 'entries'}</span>} />
        <p className="s1-lede">One tender, one ID: each copy that arrived is listed here rather than logged twice.</p>
        <ul className="doc-src">
          {t && <li><span className="num doc-when">{shortWhen(t.intake.capturedAt)}</span><span>Notice captured from {t.sourceDetail}</span></li>}
          {events.map((e) => (
            <li key={e.id}><span className="num doc-when">{shortWhen(e.receivedAt)}</span><span>{e.docType} from {sourceName(e.sourceId)}: {DISPOSITION_LABEL[e.disposition](e.tenderId)}</span></li>
          ))}
          {uploads.flatMap((u) => u.times.map((x, i) => (
            <li key={`${u.key}:${i}`}>
              <span className="num doc-when">{shortWhen(x.at)}</span>
              <span>{i === 0 ? 'Uploaded' : 'Uploaded again'} by {personById(x.byId)?.name ?? x.byId}: <span className="mono">{u.file}</span>{i === 0 ? ', recognised by file name (demo)' : ', flagged as a duplicate'}</span>
            </li>
          )))}
        </ul>
      </Card>

      {pipeline && (
        <Card>
          <CardHead title="Intake steps" meta={pipeline.loggedText} />
          <div className="s1-pad"><IntakeSteps pipeline={pipeline} tender={t} /></div>
        </Card>
      )}

      {addenda.map((a) => <Addendum key={a.id} a={a} />)}
    </div>
  );
}

export const TABS: WorkspaceTabDef[] = [{
  id: 'documents', label: 'Documents', order: 20, plan: '007b',
  shows: (ctx) => !!docOf(ctx.tenant, ctx.tenderId) || eventsOf(ctx.tenant, ctx.tenderId).length > 0 || addendaFor(ctx.tenant, ctx.tenderId).length > 0 || uploadsOf(ctx.done, ctx.tenderId).length > 0,
  badge: (ctx) => {
    const a = addendaFor(ctx.tenant, ctx.tenderId);
    return a.length ? { text: `Add. ${a[a.length - 1].no}`, tone: 'cyan' } : null;
  },
  Panel: Documents,
}];

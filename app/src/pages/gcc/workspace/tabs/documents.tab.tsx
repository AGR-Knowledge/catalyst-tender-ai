import { useMemo } from 'react';
import { dateText } from '@/domain/calendar';
import { addendaFor, pipelineFor, type AddendumVM } from '@/domain/gcc/s1';
import { dataOf, shortWhen, tenderOf } from '@/domain/gcc/s1/common';
import { libraryFor } from '@/domain/gcc/library';
import { Card, CardHead } from '@/components/ui/primitives';
import { SourceChip } from '@/components/tender/SourceChip';
import { Callout } from '@/components/tender/Callout';
import { EmptyState } from '@/components/tender/EmptyState';
import { IntakeSteps } from '@/pages/gcc/s1/IntakeSteps';
import { LibraryBrowser } from '@/pages/gcc/library/LibraryBrowser';
import { useBookletExtra } from '@/pages/gcc/library/bookletExtra';
import type { WorkspaceCtx, WorkspaceTabDef } from './types';
import '@/pages/gcc/s1/s1.css';

/**
 * Library (id `documents`, order 20; plan 030, first built by 007b): every file
 * the tender arrived as and every file made for it, in folders, with its
 * source, time and sender, and View in a panel on the right (`LibraryBrowser`).
 * Every tender has at least its notice, so the tab always shows. Below it, as
 * before: this morning's intake steps (spec §6.2) and each addendum with what
 * it changed and what that set off (script C). An Arabic booklet's row, and
 * the viewer's header, carry Read in English (plan 012).
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

function Library({ ctx }: { ctx: WorkspaceCtx }) {
  const lib = useMemo(() => libraryFor({ tenant: ctx.tenant, viewer: ctx.viewer, done: ctx.done }, ctx.tenderId), [ctx.tenant, ctx.viewer, ctx.done, ctx.tenderId]);
  const t = tenderOf(ctx.tenant, ctx.tenderId);
  const own = eventsOf(ctx.tenant, ctx.tenderId).find((e) => e.disposition !== 'addendum');
  const pipeline = own ? pipelineFor(ctx.tenant, own.id) : null;
  const addenda = addendaFor(ctx.tenant, ctx.tenderId);
  // Read in English on the Arabic booklet's row (and in the viewer's header).
  const rowExtra = useBookletExtra(ctx.tenant, ctx.tenderId);

  return (
    <div className="ws-tab">
      <Card>
        {lib
          ? <LibraryBrowser lib={lib} rowExtra={rowExtra} readOnly={ctx.viewAs ? `Viewing as ${ctx.viewer.name}. Read only` : undefined} />
          : <EmptyState title="This tender's library isn't part of your role." compact />}
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
  id: 'documents', label: 'Library', order: 20, plan: '030',
  // Every tender has at least its notice as captured.
  shows: () => true,
  badge: (ctx) => {
    const a = addendaFor(ctx.tenant, ctx.tenderId);
    return a.length ? { text: `Add. ${a[a.length - 1].no}`, tone: 'cyan' } : null;
  },
  Panel: Library,
}];

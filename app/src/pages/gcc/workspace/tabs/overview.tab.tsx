import { createElement, useMemo, type ComponentType, type ReactNode } from 'react';
import { gccData, isGccTenantKey } from '@/data/gcc';
import { stepLabel } from '@/data/gcc/stages';
import { auditTimeline, docFor, latestOf } from '@/domain/gcc/workspace';
import type { TenderRowVM } from '@/domain/gcc/viewmodels';
import { Card, CardHead, KV } from '@/components/ui/primitives';
import { TenderTracker } from '@/components/dashboard/TenderTracker';
import { column } from '@/components/dashboard/columns';
import { WinCell } from '@/components/dashboard/columns/base.cols';
import { EmptyState } from '@/components/tender/EmptyState';
import { Masked } from '@/components/tender/Masked';
import { When } from '@/components/tender/When';
import { SourceChip } from '@/components/tender/SourceChip';
import { ThresholdBar } from '@/components/tender/ThresholdBar';
import { AuditEntry } from '@/components/tender/AuditEntry';
import { StatusPill } from '@/components/tender/StatusPill';
import type { WorkspaceCtx, WorkspaceTabDef } from './types';

/**
 * Overview (order 10, always shown): the tracker, where the tender stands
 * (the step facts, each through its table column's renderer, so money,
 * percentages and dates read exactly as in the tables), the tender's
 * particulars, and the latest activity.
 */

/** Words for the parts of a fact key; a unit at the end goes in brackets. */
const WORD: Record<string, string> = { rfqs: 'RFQs', rfq: 'RFQ', dg1: 'DG1', dg2: 'DG2', dg3: 'DG3', m2: 'M2', m3: 'M3', elig: 'eligibility', est: 'estimated', boq: 'BOQ' };
const UNIT: Record<string, string> = { pct: '(%)', wd: '(working days)', m: '(months)' };

/**
 * A fact key without a registered column header, in words: "prepWd" → "Prep
 * (working days)", "rfqsAnsweredOnTime" → "RFQs answered on time". Never the raw key.
 */
export function factLabel(key: string): string {
  const parts = key.replace(/\./g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/\s+/).filter(Boolean);
  const last = parts.length > 1 ? UNIT[parts[parts.length - 1]] : undefined;
  const words = (last ? parts.slice(0, -1) : parts).map((w) => WORD[w] ?? w);
  const text = [...words, ...(last ? [last] : [])].join(' ');
  return text ? text[0].toUpperCase() + text.slice(1) : 'Fact';
}

/** A fact with no registered column: words, never raw keys; masked facts stay masked. */
function plainFact(row: TenderRowVM, k: string): ReactNode {
  const v = row.facts[k];
  if (v === null || v === undefined) return row.facts[`${k}.masked`] ? <Masked /> : <span className="tk-sub">Not stated</span>;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return typeof v === 'number' ? <span className="num">{v.toLocaleString('en-GB')}</span> : v;
}

/** The value as the fact's table column renders it. */
function factValue(row: TenderRowVM, k: string): ReactNode {
  const def = column(k)?.build();
  const R = def?.cellRenderer as ComponentType<{ data: TenderRowVM; value: unknown }> | undefined;
  if (typeof R !== 'function') return plainFact(row, k);
  return createElement(R, { data: row, value: row.facts[k] });
}

function Overview({ ctx }: { ctx: WorkspaceCtx }) {
  const { row, tracker, tenant } = ctx;
  // A fact with no value that isn't masked doesn't apply to this step (a fee once documents are downloaded): left out.
  const facts = Object.keys(row.facts).filter((k) => !k.endsWith('.masked') && (row.facts[k] !== null || row.facts[`${k}.masked`]));
  const model = isGccTenantKey(tenant) ? gccData(tenant).fit : null;
  const doc = docFor(row);
  const latest = useMemo(
    () => latestOf(auditTimeline(tenant, row.id, ctx.done, ctx.audit, ctx.viewer), 5),
    [tenant, row.id, ctx.done, ctx.audit, ctx.viewer],
  );
  const winP = row.win ? Math.round(row.win.p <= 1 ? row.win.p * 100 : row.win.p) : null;
  const fitTone = row.fit === null || !model ? undefined : row.fit >= model.pursueAt ? 'green' : row.fit >= model.conditionsFrom ? 'orange' : 'muted';

  return (
    <div className="ws-tab">
      {tracker
        ? <TenderTracker vm={tracker} focusOnOpen={false} />
        : <Card><EmptyState title="No tracker for this tender yet." compact /></Card>}

      <div className="ws-two">
        <Card>
          <CardHead title="Where it stands" meta={row.live ? stepLabel(row.stage, row.step) : <StatusPill health={row.health} />} />
          <div className="ws-kv">
            {facts.length === 0 && <KV k="Step facts" v="None recorded for this step." />}
            {facts.map((k) => <KV key={k} k={column(k)?.header ?? factLabel(k)} v={factValue(row, k)} />)}
          </div>
        </Card>

        <Card>
          <CardHead title="Tender" />
          <div className="ws-kv">
            <KV k="Sector" v={row.sector} />
            <KV k="Team" v={row.teamName ?? 'No team yet'} />
            <KV k="Source" v={
              <span className="ws-src">
                <span>{row.source.name} · <span className="mono">{row.source.ref}</span></span>
                {doc && <SourceChip source={{ kind: 'page', page: 1, label: 'p. 1' }} doc={doc} />}
              </span>
            } />
            <KV k="Captured" v={<When date={row.capturedAt.slice(0, 10)} time={row.capturedAt.slice(11, 16)} short />} />
            <KV k="Fit" v={
              <ThresholdBar value={row.fit} threshold={model?.pursueAt} thresholdLabel="pursue at" tone={fitTone} label="Fit" />
            } />
            <KV k="Win" v={row.win && winP !== null
              ? <ThresholdBar value={winP} band={row.win.band} unit="%" label="Win probability" tone="ink" />
              : <WinCell row={row} />} />
          </div>
        </Card>
      </div>

      <Card>
        <CardHead title="Latest activity" meta={
          <button type="button" className="btn-link" onClick={() => ctx.openTab('audit')}>All activity</button>
        } />
        <div className="ws-activity">
          {latest.length === 0 ? <EmptyState title="No activity on this tender yet." compact /> : latest.map((e) => (
            <AuditEntry
              key={e.key} actor={e.actor} at={e.at} action={e.action} system={e.system} before={e.before} after={e.after} detail={e.detail}
              chip={<>{e.chip && <StatusPill label={e.chip.label} tone={e.chip.tone} />}{e.flag && <span className="ws-flag">{e.flag}</span>}</>}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

export const TABS: WorkspaceTabDef[] = [
  { id: 'overview', label: 'Overview', order: 10, plan: '019', shows: () => true, Panel: Overview },
];

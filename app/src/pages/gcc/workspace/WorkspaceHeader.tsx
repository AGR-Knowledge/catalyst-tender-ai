import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Lock } from 'lucide-react';
import type { WorkspaceHeaderVM } from '@/domain/gcc/workspace';
import { Money } from '@/components/tender/Money';
import { StatusPill } from '@/components/tender/StatusPill';
import { LangBadge } from '@/components/tender/LangBadge';
import { whenLabel } from '@/components/tender/When';
import { DemoTag } from '@/components/tender/DemoTag';
import { HERO_ID } from '@/data/gcc/hero';
import { TenderLabelPills, useTenderLabels } from '@/components/tender/TenderLabel';

/**
 * The sticky header of the Tender Workspace (spec §4.1): one line of
 * identity (ID, title, badges, value) and one of issuer, due and owner. The
 * crumb names the stage and step in words; the lifecycle itself is the
 * tracker on Overview (plan 029), not repeated here. The tab list sits in
 * its last row so the two stick together.
 */

export function WorkspaceHeader({ vm, onBack, tabs }: { vm: WorkspaceHeaderVM; onBack(): void; tabs: ReactNode }) {
  const who = `${vm.issuer}${vm.place ? ` · ${vm.place}` : ''}${vm.procurement ? ` · ${vm.procurement}` : ''}`;
  // Plan 042: OG and Previous beside the TID; a re-issue names its earlier tender under the title.
  const labels = useTenderLabels(vm.id);
  const prev = labels.previous;
  return (
    <header className="wsh">
      <div className="wsh-crumb">
        <button type="button" className="btn-link wsh-back" onClick={onBack}><ChevronLeft size={13} aria-hidden />Back</button>
        <span className="wsh-stage">{vm.stage}</span>
        {/* Plan 014: the presenter's way into script D, on the hero only. */}
        {vm.id === HERO_ID && <Link className="btn-link" style={{ marginLeft: 'auto', color: 'var(--ink-3)' }} to="/demo/compare" aria-label="Compare tenants (demo view)"><DemoTag title="A presenter view: in the product nobody sees across companies" />Compare tenants</Link>}
      </div>

      <div className="wsh-l1">
        <div className="wsh-id">
          {vm.flag && <span className="wsh-flag" role="img" aria-label={vm.place.split(', ').pop()}>{vm.flag}</span>}
          <span className="mono wsh-tid">{vm.id}</span>
          <TenderLabelPills labels={labels} />
        </div>
        <h2 className="wsh-title" title={vm.fullTitle}>{vm.title}</h2>
        <div className="wsh-badges">
          {vm.language && <LangBadge lang={vm.language} />}
          {vm.restricted && <span className="wsh-badge restricted"><Lock size={11} aria-hidden />Restricted</span>}
          {vm.addendum && <span className="wsh-badge">{vm.addendum}</span>}
          <StatusPill health={vm.health} />
        </div>
        <div className="wsh-value">
          {vm.value ? <Money value={vm.value} /> : null}
          {vm.valueNote && <span className="wsh-vnote">{vm.valueNote}</span>}
        </div>
      </div>

      {prev && (
        <p className="tlab-prevline" title={prev.canOpen ? prev.note : undefined}>
          Re-issue of <span className="mono">{prev.previousId}</span>
          {prev.endedHow && <> ({prev.endedHow}{prev.endedText ? `, ${prev.endedText}` : ''})</>}
          {prev.canOpen && <> · <Link className="btn-link" to={`/tenders/${encodeURIComponent(prev.previousId)}`}>Open earlier tender</Link></>}
        </p>
      )}

      <div className="wsh-l2">
        <span className="wsh-who" title={who}>{who}</span>
        <span className={`wsh-due ${vm.due?.near ? 'near' : ''}`}>
          {vm.due ? (
            <>
              <span className="wsh-dk">Submission</span>
              <span className="num">{whenLabel(vm.due.date, vm.due.time, vm.due.time ? vm.due.tz : undefined)}</span>
              <span className="wsh-cd">in {vm.due.countdown}</span>
            </>
          ) : <span className="wsh-cd">{vm.dueNote}</span>}
        </span>
        {/* A closed tender reads its outcome in place of the countdown, so there is no "With …" line. */}
        <span className="wsh-owner">
          {!vm.closed && (vm.owner ? <>With <b>{vm.owner.name}</b>{vm.owner.role ? `, ${vm.owner.role}` : ''}</> : 'With nobody now')}
          {vm.bidManager && <>{vm.closed ? '' : ' · '}Bid Manager <b>{vm.bidManager.name}</b></>}
        </span>
      </div>

      {tabs}
    </header>
  );
}

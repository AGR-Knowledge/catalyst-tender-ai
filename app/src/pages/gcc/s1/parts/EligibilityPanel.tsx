import { useMemo, useState } from 'react';
import { MessageSquareText, Users } from 'lucide-react';
import type { Tone } from '@/data/types';
import { eligibilityFor, type EligibilityLine as Line, type EligibilityResult, type JvScenario } from '@/domain/gcc/s1';
import { queriesFor as queryDraftsFor } from '@/domain/gcc/s1/queries';
import { dataOf, profileOf } from '@/domain/gcc/s1/common';
import { EligibilityLine, LINE_STATE } from '@/components/tender/EligibilityLine';
import type { SourceDoc } from '@/components/tender/SourceHost';
import { StatusPill } from '@/components/tender/StatusPill';
import { Callout } from '@/components/tender/Callout';
import type { S1 } from '../vm/useS1';
import { RenewalButton } from './RenewalButton';

/**
 * Eligibility against the credentials vault (spec §6.5): the roll-up sentence,
 * one line per PQ requirement with its evidence and the date it is checked
 * against (bid opening, not today), and the actions: request renewal, draft
 * query, add evidence. The JV scenario re-runs the check with a partner from
 * the company's list; it is a what-if, and nothing is recorded.
 */

export const ELIGIBILITY_VERDICT: Record<EligibilityResult['verdict'], { label: string; tone: Tone; icon: string }> = {
  eligible: { label: 'Eligible', tone: 'green', icon: '✓' },
  'eligible-with-jv': { label: 'Eligible only with a JV partner', tone: 'orange', icon: '!' },
  'not-eligible': { label: 'Not eligible', tone: 'red', icon: '×' },
};

const needsAttention = (l: Line) => l.state !== 'pass' && l.state !== 'na';
const SATISFIED: Record<NonNullable<Line['satisfiedBy']>, string> = { self: 'Met by the company', partner: 'Met by the partner', both: 'Met by both members', combined: 'Met by the members combined' };

export function EligibilityPanel({ s1, tenderId, doc, mode = 'full', onQueries }: {
  s1: S1; tenderId: string; doc: SourceDoc | null;
  /** `pack`: the DG1 pack shows the lines that need attention and a count of the rest. */
  mode?: 'full' | 'pack';
  /** Opens the tender's Queries (the tab in the workspace, the link elsewhere). */
  onQueries?(): void;
}) {
  const { tenant, done } = s1;
  const base = useMemo(() => eligibilityFor(tenant, tenderId, done), [tenant, tenderId, done]);
  const partners = dataOf(tenant).partners;
  const [jv, setJv] = useState<{ on: boolean; partnerId: string; lead: JvScenario['lead'] }>(() => ({
    on: false, partnerId: base?.jvPartner?.id ?? partners[0]?.id ?? '', lead: base?.jv?.lead ?? 'partner',
  }));
  const [showMet, setShowMet] = useState(false);
  const shares = base?.jv?.shares;
  const scenario = useMemo<JvScenario | undefined>(
    () => (jv.on && jv.partnerId ? { partnerId: jv.partnerId, lead: jv.lead, shares: shares ?? [60, 40] } : undefined),
    [jv.on, jv.partnerId, jv.lead, shares],
  );
  const shown = useMemo(() => (scenario ? eligibilityFor(tenant, tenderId, done, scenario) : base), [scenario, tenant, tenderId, done, base]);
  const queries = useMemo(() => queryDraftsFor(tenant, tenderId, done).items, [tenant, tenderId, done]);
  if (!base || !shown) return null;

  const company = profileOf(tenant).name;
  const v = ELIGIBILITY_VERDICT[shown.verdict];
  const attention = shown.lines.filter(needsAttention);
  const met = shown.lines.filter((l) => !needsAttention(l));
  const opening = shown.lines.find((l) => /opening/.test(l.checkedAgainst.label))?.checkedAgainst.label;
  const evidenceRight = s1.check('credential.manage', tenderId);

  const actionsOf = (l: Line) => {
    const out = [];
    if (scenario && l.satisfiedBy) out.push(<span key="by" className="el-by"><Users size={11} aria-hidden />{SATISFIED[l.satisfiedBy]}</span>);
    if (l.actions.includes('request-renewal')) {
      for (const r of l.renew ?? []) out.push(<RenewalButton key={r.credentialId} s1={s1} tenderId={tenderId} credentialId={r.credentialId} ownerId={r.ownerId} label={r.label} validTo={r.validTo} />);
    }
    if (l.actions.includes('draft-query')) {
      // Only a query the agent drafted is offered: a line without one shows no dead button.
      const q = queries.find((x) => x.query.relatesTo === l.reqId);
      if (q) out.push(<button key="q" type="button" className="btn btn-sm" onClick={onQueries} disabled={!onQueries}><MessageSquareText size={12} aria-hidden />Query {q.state === 'draft' ? 'drafted' : q.state}: review</button>);
    }
    if (l.actions.includes('add-evidence')) {
      out.push(
        <span key="e" className="s1-act">
          <button type="button" className="btn btn-sm" disabled={!evidenceRight.ok} title={evidenceRight.ok ? undefined : evidenceRight.reason}
            onClick={() => s1.toast('Demo: evidence is added in Company › Credentials, then the check re-runs.', 'ink3')}>Add evidence</button>
        </span>,
      );
    }
    if (l.actions.includes('find-partner') && !jv.on && partners.length) {
      out.push(<button key="p" type="button" className="btn btn-sm" onClick={() => setJv((s) => ({ ...s, on: true }))}>Try a JV partner</button>);
    }
    return out.length ? <>{out}</> : undefined;
  };

  return (
    <div className="elp">
      <div className="elp-roll">
        <StatusPill label={v.label} tone={v.tone} icon={v.icon} />
        <span className="elp-text">{shown.text}</span>
      </div>
      <div className="elp-counts" aria-label="Lines by result">
        {(['pass', 'at-risk', 'interpretation', 'fail'] as const).map((k) => {
          const n = k === 'pass' ? shown.counts.met : k === 'at-risk' ? shown.counts.atRisk : k === 'interpretation' ? shown.counts.interpretation : shown.counts.fail;
          return <span key={k} className={`elp-c tone-${n ? LINE_STATE[k].tone : 'muted'}`}><b className="num">{n}</b> {k === 'pass' ? 'met' : LINE_STATE[k].label.toLowerCase()}</span>;
        })}
      </div>
      {(opening || shown.entity) && (
        <p className="elp-note">
          {shown.entity && <>Checked for {shown.entity.name}, the group company that bids in the tender's country. </>}
          {opening && <>Certificates are checked against {opening}, when they must be valid, not against today.</>}
        </p>
      )}

      {partners.length > 0 && (
        <div className={`elp-jv ${jv.on ? 'on' : ''}`}>
          <label className="elp-sw">
            <input type="checkbox" checked={jv.on} onChange={(e) => setJv((s) => ({ ...s, on: e.target.checked }))} />
            <span>JV scenario</span>
          </label>
          {jv.on ? (
            <>
              <label className="elp-sel">Partner
                <select value={jv.partnerId} onChange={(e) => setJv((s) => ({ ...s, partnerId: e.target.value }))}>
                  {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label className="elp-sel">Lead
                <select value={jv.lead} onChange={(e) => setJv((s) => ({ ...s, lead: e.target.value as JvScenario['lead'] }))}>
                  <option value="partner">The partner leads</option>
                  <option value="self">{company} leads</option>
                </select>
              </label>
              <span className="elp-jvnote">A what-if: the lines below are re-checked with both members. Nothing is recorded.</span>
            </>
          ) : (
            <span className="elp-jvnote">
              {base.verdict === 'eligible-with-jv' && base.jvPartner
                ? `Bidding alone fails ${base.counts.fail} line${base.counts.fail === 1 ? '' : 's'}. ${base.jvPartner.name} as lead clears ${base.counts.fail === 1 ? 'it' : 'them'}: switch on to see the lines.`
                : `Re-run the check with a partner from ${company}'s list.`}
            </span>
          )}
        </div>
      )}
      {shown.error && <Callout variant="block" title={shown.error} compact />}

      <div className="elp-lines">
        {attention.map((l) => <EligibilityLine key={l.reqId} line={l} doc={doc} actions={actionsOf(l)} />)}
        {attention.length === 0 && <p className="elp-note">Every requirement is met on the date it must hold.</p>}
      </div>
      {met.length > 0 && (showMet ? (
        <>
          <h3 className="s1-h3">Met or not asked</h3>
          <div className="elp-lines met">{met.map((l) => <EligibilityLine key={l.reqId} line={l} doc={doc} actions={actionsOf(l)} />)}</div>
          <button type="button" className="btn btn-sm elp-more" onClick={() => setShowMet(false)} aria-expanded>Hide the lines that are met</button>
        </>
      ) : (
        <button type="button" className="btn btn-sm elp-more" onClick={() => setShowMet(true)} aria-expanded={false}>
          {mode === 'pack' ? `${met.length} more lines are met or not asked: show them` : `Show the ${met.length} lines that are met or not asked`}
        </button>
      ))}
    </div>
  );
}

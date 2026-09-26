import type { ReactNode } from 'react';
import type { Tone } from '@/data/types';
import type { EligibilityLine as Line, Evidence, LineState } from '@/domain/gcc/s1';
import { StatusPill } from './StatusPill';
import { SourceChip, type SourceChipRef } from './SourceChip';
import type { SourceDoc } from './SourceHost';
import './tender.css';

/**
 * One PQ requirement against the credential vault (ui-direction §6.2): the
 * requirement and its page, the result in words, the evidence, the
 * explanation and the caller's actions. It renders 007a's result; it never
 * works one out.
 */

export const LINE_STATE: Record<LineState, { label: string; tone: Tone; icon: string }> = {
  pass: { label: 'Pass', tone: 'green', icon: '✓' },
  'at-risk': { label: 'At risk', tone: 'orange', icon: '!' },
  interpretation: { label: 'Interpretation', tone: 'orange', icon: '?' },
  fail: { label: 'Fail', tone: 'red', icon: '×' },
  na: { label: 'Not stated', tone: 'grey', icon: '–' },
};

const EVIDENCE_KIND: Record<Evidence['kind'], SourceChipRef['kind']> = {
  credential: 'credential', project: 'project', financials: 'credential', person: 'credential', partner: 'credential',
};

const evidenceRef = (e: Evidence): SourceChipRef => ({
  kind: EVIDENCE_KIND[e.kind], id: e.id,
  label: e.kind === 'credential' ? `Cred: ${e.label}` : e.label,
});

export function EligibilityLine({ line, doc, actions }: { line: Line; doc?: SourceDoc | null; actions?: ReactNode }) {
  const s = LINE_STATE[line.state];
  return (
    <div className={`el-line tone-${s.tone}`}>
      <div className="el-top">
        <span className="mono el-id">{line.reqId}</span>
        <span className="el-req">{line.text}</span>
        <SourceChip source={{ kind: 'page', page: line.page, label: `p. ${line.page}`, terms: [line.text] }} doc={doc} />
        {line.alsoOn?.map((p) => <SourceChip key={p} source={{ kind: 'page', page: p, label: `p. ${p}` }} doc={doc} />)}
        <span className="el-state"><StatusPill label={s.label} tone={s.tone} icon={s.icon} /></span>
      </div>
      <div className="el-why">{line.why}</div>
      {(line.evidence.length > 0 || actions) && (
        <div className="el-foot">
          {line.evidence.length > 0 && (
            <span className="src-chips" role="group" aria-label={`Evidence for ${line.reqId}`}>
              {line.evidence.map((e) => <SourceChip key={`${e.kind}:${e.id}`} source={evidenceRef(e)} detail={`Checked against ${line.checkedAgainst.label}`} />)}
            </span>
          )}
          {actions && <span className="el-act">{actions}</span>}
        </div>
      )}
    </div>
  );
}

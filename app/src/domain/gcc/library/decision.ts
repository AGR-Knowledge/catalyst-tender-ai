import type { GateKind, GateRecord } from '@/data/gcc/lifecycle';
import { money } from '@/domain/money';
import { currentOf, eligibilityOf, openGate, standingGate } from '@/domain/gcc/lifecycle';
import { reasonLabel as dg1Reason } from '@/domain/gcc/dg1/decision';
import { reasonLabel as dg2Reason } from '@/domain/gcc/dg2/decision';
import { dg3ReasonLabel } from '@/domain/gcc/dg3/decision';
import { dg2RecordFor } from '@/domain/gcc/dg2/record';
import { packVersionsFor } from '@/domain/gcc/s3/versions';
import { WIN_AGENT } from '@/domain/gcc/s3/win';
import type { FacCell, FacSection, FacsimileSpec } from './facsimile';
import { docDate, fileOf, nameOf, type LibCtx } from './context';
import { facsimileFile, INTAKE_AGENT } from './documents';
import { fileName } from './names';
import type { LibraryFileVM } from './types';

/**
 * 03 Bid decision (plan 030 Design): a sub-folder per gate the tender has
 * reached, as the tracker reads it (a decision that stands, or the gate open
 * now). DG1: the evidence pack and each record. DG2: each issued version of
 * the Bid / No-Bid pack, each record and, for a No-Bid, the decline letter.
 * DG3: the pack Compliance issued and each record. Records read the lifecycle,
 * so a gate recorded in the demo shows here as on every dashboard.
 */

const DECISION_WORD: Record<GateRecord['decision'], string> = {
  pursue: 'Pursue', discard: 'Discard', hold: 'Hold', bid: 'Bid', 'no-bid': 'No-Bid', approved: 'Approved for submission', rejected: 'Rejected: do not submit',
};
const RECOMMENDATION: Record<NonNullable<GateRecord['recommendation']>, string> = { pursue: 'Pursue', conditions: 'Pursue with conditions', discard: 'Discard' };

/** The tracker's rule: a gate is reached once a decision on it stands, or while it is open. */
export function gateReached(c: LibCtx, g: GateKind): boolean {
  return !!standingGate(c.l, g) || openGate(c.l)?.gate === g;
}

const reasonsOf = (g: GateRecord) => g.reasonCodes.map(g.gate === 'DG1' ? dg1Reason : g.gate === 'DG2' ? dg2Reason : dg3ReasonLabel);

function recordSpec(c: LibCtx, g: GateRecord, extra: FacSection[]): FacsimileSpec {
  const by = nameOf(g.byId) ?? g.byId;
  const note: FacCell | null = !g.note ? null
    : g.gate === 'DG2' && !c.can('see.positions') ? { masked: c.holders('see.positions') }
    : g.gate === 'DG3' && !c.can('see.margin') ? { masked: c.holders('see.margin') }
    : g.note;
  const rows: [string, FacCell][] = [
    ['Tender', `${c.l.tenderId} · ${c.l.title}`],
    ['Decision', { strong: DECISION_WORD[g.decision] }],
    ['Recorded by', by],
    ['Recorded', docDate(g.at) ?? ''],
    ['Gate opened', docDate(g.openedAt) ?? ''],
    ['Time limit', `${g.slaHours} h · ${g.onTime ? 'decided on time' : 'decided late'}`],
    ...(g.recommendation ? [['Agent recommendation', `${RECOMMENDATION[g.recommendation]} (a recommendation, not a decision)`] as [string, FacCell]] : []),
    ...(g.reasonCodes.length ? [['Reasons', reasonsOf(g).join('; ')] as [string, FacCell]] : []),
    ...(note ? [['Note', note] as [string, FacCell]] : []),
    ...(g.reopened ? [['Re-opened', g.reopened] as [string, FacCell]] : []),
  ];
  return {
    title: `${c.prefix} ${g.gate} record`, issuer: c.company, issuerLines: ['Tendering department'], heading: `${g.gate} decision record`,
    ref: `${c.l.tenderId} · ${g.gate}`, date: docDate(g.at.slice(0, 10)), sections: [{ rows }, ...extra],
    footer: 'Internal record · Synthetic document for demonstration',
  };
}

function recordFiles(c: LibCtx, gate: GateKind, folder: string, extra: (g: GateRecord) => FacSection[] = () => []): LibraryFileVM[] {
  const records = c.l.gates.filter((g) => g.gate === gate);
  return records.map((g, i) => fileOf(folder, `record-${i + 1}`, {
    kind: `${gate.toLowerCase()}-record`,
    name: fileName(c.prefix, records.length > 1 ? `${gate} record, round ${i + 1}` : `${gate} record`), title: `${gate} record: ${DECISION_WORD[g.decision]}`, type: 'Record',
    source: { channel: 'person', label: `Recorded by ${nameOf(g.byId) ?? g.byId}` }, receivedAt: g.at, by: nameOf(g.byId),
    tags: [DECISION_WORD[g.decision], ...(g.reopened ? ['Re-opened'] : [])],
    ...facsimileFile(() => recordSpec(c, g, extra(g)), 1),
  }));
}

// ---------------------------------------------------------------------------

function dg1Files(c: LibCtx): LibraryFileVM[] {
  const { l } = c;
  const g = standingGate(l, 'DG1') ?? l.gates.find((x) => x.gate === 'DG1');
  const open = openGate(l);
  const at = g?.openedAt ?? (open?.gate === 'DG1' ? open.openedAt : null);
  const out: LibraryFileVM[] = [];
  if (at) {
    const counts = eligibilityOf(c.tenant, l, c.done);
    const value = c.t?.value ?? l.value;
    const spec = (): FacsimileSpec => ({
      title: `${c.prefix} DG1 evidence pack`, issuer: c.company, issuerLines: ['Tendering department'], heading: 'DG1 evidence pack',
      ref: `${l.tenderId} · DG1`, date: docDate(at.slice(0, 10)),
      sections: [
        { rows: [
          ['Tender', l.title], ['Issuer', c.issuer], ['Sector', l.sector],
          ...(value.amount ? [['Value', `${money(value.amount, value.ccy)} (${value.basis === 'published' ? 'published' : value.basis === 'estimate' ? 'platform estimate' : 'not stated'})`] as [string, FacCell]] : []),
          ...(l.submissionDeadline ? [['Submission', docDate(`${l.submissionDeadline.date}T${l.submissionDeadline.time}`) ?? ''] as [string, FacCell]] : []),
          ...(counts ? [['Eligibility', `${counts.pass} met · ${counts.atRisk} at risk · ${counts.interpretation} to interpret · ${counts.fail} failed`] as [string, FacCell]] : []),
          ...(g?.recommendation ? [['Recommendation', `${RECOMMENDATION[g.recommendation]} (a recommendation, not a decision)`] as [string, FacCell]] : []),
        ] },
        { note: `Generated by the ${INTAKE_AGENT} when the tender was logged. The agents recommend; people decide at DG1.` },
      ],
    });
    out.push(fileOf('03/dg1', 'pack', {
      kind: 'dg1-pack', name: fileName(c.prefix, 'DG1 evidence pack'), title: 'DG1 evidence pack', type: 'PDF',
      source: { channel: 'agent', label: `Generated by the ${INTAKE_AGENT}` }, receivedAt: at, by: INTAKE_AGENT,
      ...facsimileFile(spec, 1),
    }));
  }
  return [...out, ...recordFiles(c, 'DG1', '03/dg1')];
}

function dg2Files(c: LibCtx): LibraryFileVM[] {
  const { l } = c;
  const out: LibraryFileVM[] = [];
  const pv = c.t ? packVersionsFor(c.tenant, l.tenderId, c.done) : null;
  const issued = pv?.versions.filter((v) => v.issuedAt) ?? [];
  const g = standingGate(l, 'DG2') ?? l.gates.find((x) => x.gate === 'DG2');
  const open = openGate(l);
  // Versions the demo holds; else the one pack the gate opened on (a tender with a lifecycle only).
  const packs = issued.length
    ? issued.map((v) => ({ version: v.version, at: v.issuedAt!, generated: v.generatedAt, by: v.rerunById }))
    : [{ version: 1, at: g?.openedAt ?? (open?.gate === 'DG2' ? open.openedAt : currentOf(l).at), generated: undefined, by: undefined }];
  // As the tables read it: win probability goes with committee positions (`lifecycle.port.ts`).
  const canWin = c.can('see.positions');
  for (const p of packs) {
    const f3 = l.facts?.stage === 3 ? l.facts : null;
    const spec = (): FacsimileSpec => ({
      title: `${c.prefix} DG2 Bid-No-Bid pack v${p.version}`, issuer: c.company, issuerLines: ['Tendering department'], heading: `Bid / No-Bid pack, version ${p.version}`,
      ref: `${l.tenderId} · DG2 · v${p.version}`, date: docDate(p.at.slice(0, 10)),
      sections: [
        { rows: [
          ['Tender', l.title], ['Issuer', c.issuer],
          ...(p.generated ? [['Generated', docDate(p.generated) ?? ''] as [string, FacCell]] : []),
          ['Issued to the committee', docDate(p.at) ?? ''],
          ...(f3 ? [['Win probability', canWin ? `${f3.win.p}% ± ${f3.win.band} points` : { masked: c.holders('see.positions') }] as [string, FacCell]] : []),
          ...(f3 ? [['Margin range', c.can('see.margin') ? `${f3.marginRange[0]}–${f3.marginRange[1]}%` : { masked: c.holders('see.margin') }] as [string, FacCell]] : []),
        ] },
        { heading: 'Sections', list: ['9.1 Win probability', '9.2 Competitors', '9.3 Eligibility and JV', '9.4 Resource and capacity', '9.5 to 9.10 Commercial, risk and recommendation'] },
        { note: `Generated by the ${WIN_AGENT}${p.by ? `, re-run by ${nameOf(p.by)}` : ''}. The pack recommends; the committee records positions and the Head of Tendering decides.` },
      ],
    });
    out.push(fileOf('03/dg2', `pack-v${p.version}`, {
      kind: 'dg2-pack', name: fileName(c.prefix, `DG2 Bid-No-Bid pack v${p.version}`), title: `Bid / No-Bid pack, version ${p.version}`, type: 'PDF',
      source: { channel: 'agent', label: `Generated by the ${WIN_AGENT}` }, receivedAt: p.at, by: WIN_AGENT,
      tags: [`v${p.version}`],
      ...facsimileFile(spec, 2),
    }));
  }

  // Positions, for those who may see them; masked for everyone else.
  const rec = c.t ? dg2RecordFor(c.tenant, l.tenderId, c.done, { canSeeMargin: c.can('see.margin'), canSeePositions: c.can('see.positions') }) : null;
  const positions = (): FacSection[] => {
    if (!rec) return [];
    if (!c.can('see.positions')) return [{ heading: 'Committee positions', rows: [['Positions', { masked: c.holders('see.positions') }]] }];
    if (!rec.positions.length) return [];
    return [{ heading: 'Committee positions', table: { head: ['Seat', 'Member', 'Position', 'Recorded'], rows: rec.positions.map((x) => [x.seatLabel, x.name, x.stance, docDate(x.at) ?? '']) } }];
  };
  out.push(...recordFiles(c, 'DG2', '03/dg2', positions));

  // The decline letter, for a No-Bid: the one drafted in the demo, else from the record's reasons.
  const noBid = g && g.decision === 'no-bid' ? g : null;
  if (noBid) {
    const letter = rec?.letter;
    const reasons = reasonsOf(noBid);
    const spec = (): FacsimileSpec => ({
      title: `${c.prefix} Letter declining to bid`, issuer: c.company, heading: 'Letter declining to bid', ref: c.ref ?? l.tenderId,
      date: docDate((letter?.at ?? noBid.at).slice(0, 10)), to: [c.issuer, 'Tendering Committee'], subject: l.title,
      sections: [{ paragraphs: letter?.text ? letter.text.split(/\n{2,}/) : [
        `Thank you for inviting ${c.company} to bid for ${l.title}.`,
        `After careful review we have decided not to submit a bid on this occasion${reasons.length ? `: ${reasons.join('; ').toLowerCase()}` : ''}.`,
        'We value our relationship with you and look forward to future opportunities.',
      ] }],
      signature: { name: nameOf(letter?.byId ?? noBid.byId) ?? undefined, org: c.company },
    });
    out.push(fileOf('03/dg2', 'decline-letter', {
      kind: 'decline-letter', name: fileName(c.prefix, 'Letter declining to bid'), title: 'Letter declining to bid', type: 'Letter',
      source: { channel: 'person', label: letter ? `${letter.sent ? 'Sent' : 'Drafted'} by ${nameOf(letter.byId)}` : `Recorded by ${nameOf(noBid.byId)}` },
      receivedAt: letter?.at ?? noBid.at, by: nameOf(letter?.byId ?? noBid.byId),
      tags: letter && !letter.sent ? ['Draft'] : [],
      ...facsimileFile(spec, 1),
    }));
  }
  return out;
}

function dg3Files(c: LibCtx): LibraryFileVM[] {
  const { l } = c;
  const issuedAt = (l.facts?.stage === 7 && l.facts.dg3IssuedAt) || l.log.find((e) => e.step === 'dg3-issued')?.at
    || standingGate(l, 'DG3')?.openedAt || l.gates.find((x) => x.gate === 'DG3')?.openedAt;
  const out: LibraryFileVM[] = [];
  if (issuedAt) {
    // Compliance issues the pack: whoever held Stage 7 before it went for approval.
    const i = l.log.findIndex((e) => e.step === 'dg3-issued');
    const before = (i > 0 ? l.log.slice(0, i) : l.log).filter((e) => e.stage === 7);
    const by = nameOf(before[before.length - 1]?.ownerId);
    out.push(fileOf('03/dg3', 'pack', {
      kind: 'dg3-pack', name: fileName(c.prefix, 'DG3 submission approval pack'), title: 'DG3 submission approval pack', type: 'PDF',
      source: { channel: 'person', label: by ? `Issued by ${by}` : 'Issued by Compliance' }, receivedAt: issuedAt, by,
      ...facsimileFile(() => ({
        title: `${c.prefix} DG3 submission approval pack`, issuer: c.company, issuerLines: ['Compliance'], heading: 'DG3 submission approval pack',
        ref: `${l.tenderId} · DG3`, date: docDate(issuedAt.slice(0, 10)),
        sections: [
          { rows: [['Tender', l.title], ['Issuer', c.issuer], ['Issued for approval', docDate(issuedAt) ?? ''], ...(l.submissionDeadline ? [['Submission deadline', docDate(`${l.submissionDeadline.date}T${l.submissionDeadline.time}`) ?? ''] as [string, FacCell]] : [])] },
          { heading: 'Contents', list: ['Compliance matrix against the tender requirements', 'Final price and margin summary', 'Bid bond and signatures', 'Open red-lines and risks with owners'] },
          { note: 'The Head of Tendering approves or rejects the submission at DG3.' },
        ],
      }), 1),
    }));
  }
  return [...out, ...recordFiles(c, 'DG3', '03/dg3')];
}

/** 03 Bid decision, gate by gate. */
export function decisionFiles(c: LibCtx): LibraryFileVM[] {
  return [
    ...(gateReached(c, 'DG1') ? dg1Files(c) : []),
    ...(gateReached(c, 'DG2') ? dg2Files(c) : []),
    ...(gateReached(c, 'DG3') ? dg3Files(c) : []),
  ];
}

import { UploadModal } from '@/components/intake/UploadModal';
import { HandoverModal, TenantAddModal } from './FlowModals';
import { VALIDATIONS, REDLINES } from '@/data/workspace';
import { useDemo, type ModalSpec } from '@/state/store';
import { ClosingContext, usePresence } from '@/state/presence';
import { useLive, FOCUS_ID } from '@/domain/live';
import { cr, dayMonth, pct } from '@/domain/format';
import { ModalFrame } from './Frames';

export function ModalHost() {
  const { state } = useDemo();
  const { shown, closing } = usePresence(state.modal);
  if (!shown) return null;
  return <ClosingContext.Provider value={closing}><ModalSwitch key={JSON.stringify(shown)} spec={shown} /></ClosingContext.Provider>;
}

function ModalSwitch({ spec }: { spec: ModalSpec }) {
  switch (spec.type) {
    case 'dg1': return <Dg1Modal id={spec.id} />;
    case 'dg2': return <Dg2Modal id={spec.id} />;
    case 'validation': return <ValidationModal vkey={spec.key} />;
    case 'gap': return <GapModal />;
    case 'dg3': return <Dg3Modal />;
    case 'submit': return <SubmitModal />;
    case 'sme': return <SmeModal />;
    case 'reset': return <ResetModal />;
    case 'upload': return <UploadModal />;
    case 'handover': return <HandoverModal from={spec.from} />;
    case 'tenant-add': return <TenantAddModal />;
  }
}

function Dg1Modal({ id }: { id: string }) {
  const { closeModal, mark } = useDemo();
  const live = useLive();
  const t = live.byId(id);
  if (!t) return null;
  const k = 'dg1-' + id.slice(-3);
  return (
    <ModalFrame
      onClose={closeModal}
      eyebrow="Gate DG1 · Pursue or discard"
      title={`${t.id} · ${t.name}`}
      sub={`${t.client}, ${cr(t.value)} (${t.detail?.rows.find((r) => r[0] === 'Source')?.[1] ?? 'captured today'})`}
      rows={[
        { k: 'Fit-score', v: `${t.fit}%` },
        { k: 'Bid security', v: t.detail?.bidSecurity?.replace('pending coordinator validation', 'confirmed by coordinator') ?? 'Not stated' },
        { k: 'Closest comparable', v: t.detail?.comparables ?? 'None on record', tone: 'green' },
        { k: 'Submission window', v: `${t.days} days, closing ${dayMonth(t.due)}` },
        { k: 'Estimating load', v: t.detail?.resourceAsk ?? 'Not set' },
      ]}
      foot="SLA 24h. Decision recorded at DG1"
      actions={[
        { label: 'Pursue and release to Stage 2', primary: true, onClick: () => mark(k, `${t.id} pursued at DG1. Outreach Agent issuing RFQs`, 'green', 'pursued') },
        { label: 'Discard', danger: true, onClick: () => mark(k, `${t.id} discarded at DG1. Rationale recorded.`, 'orange', 'discarded') },
        { label: 'Cancel', onClick: closeModal },
      ]}
    />
  );
}

function Dg2Modal({ id }: { id: string }) {
  const { closeModal, mark } = useDemo();
  const live = useLive();
  const t = live.byId(id);
  if (!t || !t.detail) return null;
  const k = 'dg2-' + id.slice(-3);
  const low = t.confidence === 'low';
  const rows = [
    { k: 'Win probability', v: `${t.win}% ±${t.band}`, tone: low ? ('red' as const) : ('orange' as const) },
    { k: 'Resource ask', v: t.detail.resourceAsk },
    { k: 'Expected margin', v: t.detail.expectedMargin },
    { k: 'Comparable bids', v: t.detail.comparables, tone: low ? ('red' as const) : undefined },
  ];
  if (id === 'T-2026-047') rows.push({ k: 'Sector variance', v: `${live.solarVariance.toFixed(1).replace('-', '−')} pts delivered vs bid`, tone: 'red' });
  if (id === 'T-2026-052') rows.push({ k: 'Client history', v: 'No prior award', tone: undefined });
  const note = id === 'T-2026-047'
    ? 'Solar BoP delivery variance from three projects is attached to this pack.'
    : 'Few comparable bids on record, so confidence is low. Declining frees the estimating team for T-2026-049.';
  return (
    <ModalFrame
      onClose={closeModal}
      eyebrow="Gate DG2 · Bid / No-Bid"
      title={`${t.id} · ${t.name}`}
      sub="Bid Committee decision, recorded against the tender record"
      rows={rows}
      note={note}
      foot="Decision and rationale are written to the audit trail"
      actions={[
        { label: 'Approve pursuit', primary: true, onClick: () => mark(k, `${t.id} approved at DG2. Resource committed, Stages 4 and 5 released`, 'green', 'approved') },
        { label: 'Decline', danger: true, onClick: () => mark(k, `${t.id} declined at DG2 and resource released back to the pipeline`, 'orange', 'declined') },
        { label: 'Cancel', onClick: closeModal },
      ]}
    />
  );
}

function ValidationModal({ vkey }: { vkey: string }) {
  const { closeModal, mark } = useDemo();
  const v = VALIDATIONS.find((x) => x.key === vkey);
  if (!v) return null;
  const title = `${v.tender} · ${v.field}`;
  return (
    <ModalFrame
      onClose={closeModal}
      eyebrow="Validation · Stage 1"
      title={title}
      sub={v.sub}
      rows={v.rows.map(([k, val, tone]) => ({ k, v: val, tone }))}
      note={v.note}
      foot="Saved to the tender record under your name"
      actions={[
        { label: 'Accept and log', primary: true, onClick: () => mark(v.key, `${title} validated and written to the tender record`, 'green', 'accepted') },
        { label: 'Send back to agent', onClick: () => mark(v.key, `${title}: re-extracted by the Intake Agent above threshold and logged`, 'orange', 'returned') },
        { label: 'Cancel', onClick: closeModal },
      ]}
    />
  );
}

function GapModal() {
  const { closeModal, mark, toast } = useDemo();
  return (
    <ModalFrame
      onClose={closeModal}
      eyebrow="Critical gap · Stage 7"
      title="ISO 45001 certificate expiry"
      sub={`Mandatory under ITB 9.4 and blocks DG3 on ${FOCUS_ID}`}
      rows={[
        { k: 'Current certificate', v: 'Expires 08 Mar 2026 (today)', tone: 'red' },
        { k: 'Submission date', v: '12 Mar 2026' },
        { k: 'Detected', v: 'At Stage 6, by the Compliance Agent' },
        { k: 'Owner', v: 'QHSE Manager (notified 28 Feb)' },
        { k: 'Renewal status', v: 'Audit closed, certificate issued 06 Mar', tone: 'green' },
      ]}
      note="Filing the renewed certificate against ITB 9.4 re-runs the mandatory check across all 214 requirements."
      foot="DG3 cannot be cleared with an open mandatory gap"
      actions={[
        { label: 'File certificate & close gap', primary: true, onClick: () => mark('gap', 'ISO 45001 closed. Mandatory coverage 100%, DG3 pack ready for the Review Board') },
        { label: 'Escalate to Bid Manager', onClick: () => { closeModal(); toast('Escalated to R. Iyer. Gap remains open', 'orange'); } },
        { label: 'Cancel', onClick: closeModal },
      ]}
    />
  );
}

function Dg3Modal() {
  const { closeModal, mark } = useDemo();
  const live = useLive();
  const openRedlines = REDLINES.filter((r) => r.status === 'Open' && !live.is('redline-' + r.key)).length;
  return (
    <ModalFrame
      onClose={closeModal}
      eyebrow="Gate DG3 · Final bid approval"
      title={`${FOCUS_ID} · Tender Review Board`}
      sub="400 kV Substation & Transmission Line, convened by the Compliance / Legal Lead"
      rows={[
        { k: 'Mandatory coverage', v: pct(live.mandatoryCoverage), tone: 'green' },
        { k: 'Overall requirement cover', v: `${pct(live.coverage, 1)} with ${live.openGaps} non-mandatory items open` },
        { k: 'Contract positions open', v: openRedlines ? `${openRedlines}, carried as a qualification` : 'None', tone: openRedlines ? 'orange' : 'green' },
        { k: 'Risks with named owners', v: '17 of 17', tone: 'green' },
        { k: 'Board quorum', v: '4 of 5 members present' },
      ]}
      note="Last gate before submission. Packaging starts once DG3 is recorded and the price is frozen at M2."
      foot="SLA 48h, with the decision recorded at DG3"
      actions={[
        { label: 'Record DG3 approval', primary: true, onClick: () => mark('dg3', `DG3 recorded for ${FOCUS_ID}. Submission desk released`) },
        { label: 'Cancel', onClick: closeModal },
      ]}
    />
  );
}

function SubmitModal() {
  const { closeModal, mark } = useDemo();
  const live = useLive();
  return (
    <ModalFrame
      onClose={closeModal}
      eyebrow="Milestone M3 · Submission"
      title={`Submit ${FOCUS_ID} to CPPP`}
      sub={`400 kV Substation & Transmission Line at ${cr(live.scenario.price)}, ${live.scenario.name} scenario`}
      rows={[
        { k: 'DG3 record', v: 'Present, cleared by the Review Board', tone: 'green' },
        { k: 'Price', v: `${cr(live.scenario.price)}, frozen at M2`, tone: 'green' },
        { k: 'Volumes', v: '3 of 3 packaged' },
        { k: 'Signatures', v: '9 of 9 placed' },
        { k: 'Portal window', v: 'Closes 12 Mar 15:00 IST' },
      ]}
      note="Submission can't be undone. The portal receipt is saved to the archive."
      foot="No submission without a DG3 record"
      actions={[
        { label: 'Submit and capture receipt', primary: true, onClick: () => mark('submitted', `${FOCUS_ID} submitted. Portal receipt captured, archive written`) },
        { label: 'Cancel', onClick: closeModal },
      ]}
    />
  );
}

function SmeModal() {
  const { closeModal, mark } = useDemo();
  const live = useLive();
  return (
    <ModalFrame
      onClose={closeModal}
      eyebrow="SME task · Stage 6"
      title="Substation protection philosophy"
      sub="Assigned to A. Deshpande (Electrical), overdue by 2 days"
      rows={[
        { k: 'Agent pre-draft', v: 'Structure and 4 of 7 sub-sections' },
        { k: 'Source', v: 'Vadodara 400 kV bid, section 4.2' },
        { k: 'Evaluator weight', v: 'Technical approach (40)' },
        { k: 'Submission', v: '12 Mar (4 days)' },
      ]}
      note="Structure is pre-drafted with sources cited. Only the protection philosophy needs SME input."
      foot="Section moves to review on approval"
      actions={[
        { label: 'Approve SME draft', primary: true, onClick: () => mark('sec-1', `Substation protection philosophy approved (${live.sectionsComplete + 1} of ${live.sectionsTotal} sections complete)`, 'green', 'approved') },
        { label: 'Reassign', onClick: () => mark('sec-1', 'Reassigned to S. Venkat (Electrical), due in 24h', 'orange', 'reassigned') },
        { label: 'Cancel', onClick: closeModal },
      ]}
    />
  );
}

function ResetModal() {
  const { closeModal, reset } = useDemo();
  return (
    <ModalFrame
      onClose={closeModal}
      eyebrow="Demo controls"
      title="Reset the demo?"
      sub="Clears the decisions, validations and submission from this session."
      actions={[
        { label: 'Reset demo', primary: true, onClick: () => { reset(); } },
        { label: 'Cancel', onClick: closeModal },
      ]}
    />
  );
}

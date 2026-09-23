import type { Tone } from '@/data/types';
import { SUBMISSION_LOG } from '@/data/workspace';
import { useDemo } from '@/state/store';
import { useNudge } from '@/state/nav';
import { useLive, FOCUS_ID } from '@/domain/live';
import { cr } from '@/domain/format';
import { Card, CardFoot, CardHead, StageTrack, tc } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

export function Submission() {
  const { openModal, toast } = useDemo();
  const nudge = useNudge();
  const live = useLive();
  const t = live.byId(FOCUS_ID)!;

  const checks: { name: string; meta: string; state: string; tone: Tone; fix?: () => void }[] = [
    { name: 'Volume 1: Technical proposal', meta: `PDF/A, 236 pages, ${live.sectionsComplete} of ${live.sectionsTotal} sections complete`, state: 'Packaged', tone: 'green' },
    { name: 'Volume 2: Commercial proposal', meta: `XLSX + signed PDF at the ${cr(live.scenario.price)} ${live.scenario.name.toLowerCase()} price`, state: live.m2Frozen ? 'Packaged' : 'Waiting on M2 freeze', tone: live.m2Frozen ? 'green' : 'orange', fix: live.m2Frozen ? undefined : () => nudge('comm', `M2 freeze on ${FOCUS_ID}`) },
    { name: 'Volume 3: Compliance pack', meta: '214 requirements, evidence index', state: live.gapClosed ? 'Packaged' : 'Blocked by 1 critical gap', tone: live.gapClosed ? 'green' : 'red', fix: live.gapClosed ? undefined : () => nudge('comp', `ISO 45001 gap on ${FOCUS_ID}`) },
    { name: 'Forms and annexures', meta: '17 forms with signature blocks placed', state: 'Packaged', tone: 'green' },
    { name: 'Bid security', meta: 'BG ₹ 1.92 Cr, scanned original couriered', state: 'Packaged', tone: 'green' },
  ];
  const packaged = checks.filter((c) => c.tone === 'green').length;

  const gates: { name: string; state: string; tone: Tone; fix?: () => void; label?: string }[] = [
    {
      name: 'DG3: Final bid approval',
      state: live.dg3 === 'recorded' ? 'Recorded by the Tender Review Board' : live.dg3 === 'ready' ? 'Ready to convene, pack complete' : 'Cannot be cleared while a mandatory gap is open',
      tone: live.dg3 === 'recorded' ? 'green' : live.dg3 === 'ready' ? 'orange' : 'red',
      fix: live.dg3 !== 'recorded' ? () => nudge('comp', live.dg3 === 'ready' ? `convene the Review Board for ${FOCUS_ID}` : `ISO 45001 gap on ${FOCUS_ID}`) : undefined,
      label: 'Nudge compliance',
    },
    { name: 'M2: Price freeze', state: live.m2Frozen ? `Frozen on ${live.scenario.name} at ${cr(live.scenario.price)}` : 'Not yet frozen by the Commercial Manager', tone: live.m2Frozen ? 'green' : 'orange', fix: live.m2Frozen ? undefined : () => nudge('comm', `M2 freeze on ${FOCUS_ID}`), label: 'Nudge commercial' },
    { name: 'M3: Submission authority', state: live.submitted ? 'Exercised by R. Iyer, receipt captured' : 'Bid Manager signature required at upload', tone: live.submitted ? 'green' : 'orange' },
    { name: 'Portal window', state: `CPPP closes 12 Mar 15:00 IST (${t.days} days)`, tone: 'ink' },
  ];

  const log = live.submitted
    ? [{ when: 'Today 11:52', what: 'Portal submission', detail: 'Receipt CPPP/2026/TNT/0412-88 captured and archive written' }, ...SUBMISSION_LOG]
    : SUBMISSION_LOG;

  const label = live.submitted ? 'Submitted, receipt captured' : live.canSubmit ? 'Submit to portal' : `Blocked: ${live.submissionMissing.join(' and ')} missing`;
  const cls = live.submitted ? 'btn-success' : live.canSubmit ? 'btn-primary' : 'btn-blocked';

  return (
    <div className="view">
      <Card style={{ marginBottom: 'var(--gap)' }}>
        <CardHead title={`${t.id} · ${t.name}`} meta={`${t.client}, ${cr(t.value)}, Stage ${t.stage}`} />
        <div style={{ padding: '16px 22px 16px' }}><StageTrack current={t.stage} /></div>
      </Card>

      <div className="split" style={{ '--cols': '1.5fr 1fr' } as React.CSSProperties}>
        <Card>
          <CardHead title="Submission package" meta={`${packaged} of ${checks.length} packaged. Assembled by the agent, authorised by you`} />
          {checks.map((c) => (
            <div className="item" key={c.name} style={{ alignItems: 'center', padding: '13px 22px' }}>
              <span className="item-body"><span className="item-title">{c.name}</span><span className="item-text" style={{ fontSize: 11.5, marginTop: 2 }}>{c.meta}</span></span>
              {c.fix
                ? <button type="button" className={`btn-link ${tc(c.tone)}`} style={{ color: `var(--${c.tone})` }} onClick={c.fix}>{c.state} · nudge</button>
                : <span className={tc(c.tone)} style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap' }}>{c.state}</span>}
            </div>
          ))}
          <CardFoot row>
            <span className="grow">Upload needs a DG3 record and a price frozen at M2.</span>
            <button type="button" className={`btn ${cls}`} onClick={() => {
              if (live.submitted) return toast('Already submitted. Receipt CPPP/2026/TNT/0412-88 is in the archive', 'ink3');
              if (live.canSubmit) return openModal({ type: 'submit' });
              toast(`Submission blocked: ${live.submissionMissing.join(' and ')} required first`, 'red');
            }}>{live.submitted ? '✓ ' : ''}{label}</button>
          </CardFoot>
        </Card>
        <Card>
          <CardHead title="Gates and window" />
          {gates.map((g) => (
            <div key={g.name} style={{ padding: '13px 22px', borderBottom: '1px solid var(--line-3)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{g.name}</div>
                {g.fix && <button type="button" className="btn-link" style={{ fontSize: 12 }} onClick={g.fix}>{g.label} →</button>}
              </div>
              <div className={tc(g.tone)} style={{ fontSize: 12, marginTop: 3, lineHeight: 1.45 }}>{g.state}</div>
            </div>
          ))}
        </Card>
      </div>

      <Card style={{ marginTop: 'var(--gap)' }}>
        <CardHead title="Pre-submission log" meta="Audit-logged" />
        <DataTable
          rows={log}
          rowKey={(l) => l.when + l.what}
          columns={[
            { key: 'w', header: 'When', width: '.8fr', render: (l) => <span className="num t-ink3">{l.when}</span> },
            { key: 'a', header: 'Step', width: '1fr', primary: true, render: (l) => <span className="t-ink" style={{ fontSize: 13, fontWeight: 500 }}>{l.what}</span> },
            { key: 'd', header: 'Detail', width: '2fr', render: (l) => l.detail },
          ]}
        />
      </Card>
    </div>
  );
}

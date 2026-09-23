import { AGENTS, EVAL_THRESHOLD, EVAL_WATCH, MODEL_ROUTING } from '@/data/catalog';
import { useDemo } from '@/state/store';
import { useLive, FOCUS_ID } from '@/domain/live';
import { int } from '@/domain/format';
import { Card, CardFoot, CardHead, Kpis, Meter, SectionTitle, tc } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

export function Agents() {
  const { openDrawer } = useDemo();
  const live = useLive();
  const evaluated = AGENTS.filter((a) => a.eval != null);
  const avgEval = evaluated.reduce((a, x) => a + (x.eval ?? 0), 0) / evaluated.length;

  const guardrails = [
    { when: '11:04', agent: 'Compliance Verification', rule: 'Cannot clear gate with open mandatory gaps', action: live.gapClosed ? `Gap closed, DG3 progression released on ${FOCUS_ID}` : `DG3 progression blocked on ${FOCUS_ID} by ISO 45001 expiry`, tone: live.gapClosed ? 'green' : 'red' },
    { when: '09:58', agent: 'Intake & Extraction', rule: 'Low-confidence field routed to human', action: '5 fields sent to the Tender Coordinator queue', tone: 'ink2' },
    { when: '−1d 17:48', agent: 'Outreach & Evaluation', rule: 'No commitment authority', action: live.txChoice ? 'Transformer award released after buyer selection' : 'Transformer award recommendation held for buyer approval', tone: 'ink2' },
    { when: '−1d 14:10', agent: 'Costing & Margin', rule: 'No price without Commercial Manager selection', action: 'Scenario set presented; no default applied', tone: 'ink2' },
    { when: '−2d 10:15', agent: 'Document Assembly', rule: 'No submission without DG3 record', action: 'Dry-run submission blocked pending gate record', tone: 'ink2' },
  ] as const;

  return (
    <div className="view">
      <Kpis items={[
        { label: 'Agent runs (24h)', value: int(live.totalRuns), sub: `across ${live.active.length} active tenders` },
        { label: 'Eval pass rate', value: `${avgEval.toFixed(1)}%`, sub: `all agents above the ${EVAL_THRESHOLD}% threshold`, tone: 'green' },
        { label: 'Human escalations', value: '61', sub: `${((61 / live.totalRuns) * 100).toFixed(1)}% of runs` },
        { label: 'Guardrail blocks', value: '7', sub: 'all correctly triggered', tone: 'orange' },
        { label: 'Model spend MTD', value: '₹ 2.14 L', sub: `${MODEL_ROUTING[0].pct}% economy tier` },
      ]} />

      <div className="split">
        <Card>
          <CardHead title="Agent status" meta="Select an agent for its remit, guardrails and eval history" />
          <DataTable
            rows={AGENTS.map((a, i) => ({ ...a, i }))}
            rowKey={(a) => a.name}
            onRowClick={(a) => openDrawer({ type: 'agent', index: a.i })}
            columns={[
              { key: 'n', header: 'Agent', width: '1.6fr', primary: true, render: (a) => (<><span className="cell-main">{a.name}</span><span className="cell-sub">{live.agentEsc[a.name] === 'None' ? a.tier + ' tier' : live.agentEsc[a.name]}</span></>) },
              { key: 's', header: 'Stage', width: '.5fr', render: (a) => <span className="num t-ink3" style={{ fontSize: 12 }}>{a.stage}</span> },
              { key: 't', header: 'State', width: '.75fr', priority: 2, render: (a) => {
                const tone = a.state === 'Active' ? 'green' : a.state === 'Idle' ? 'faint' : 'cyan';
                return <span className={tc(tone)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}><span className={`dot bg-${tone}`} />{a.state}</span>;
              } },
              { key: 'r', header: 'Runs 24h', width: '.6fr', align: 'right', render: (a) => <span className="num t-ink" style={{ fontSize: 12.5 }}>{int(a.runs)}</span> },
              { key: 'e', header: 'Eval', width: '.6fr', align: 'right', render: (a) => <span className={`num ${a.eval == null ? 't-ink3' : a.eval < EVAL_WATCH ? 't-orange' : 't-ink'}`} style={{ fontSize: 12.5 }}>{a.eval != null ? `${a.eval.toFixed(1)}%` : 'Pending'}</span> },
            ]}
          />
          <CardFoot>Cost ceilings apply per agent and per tender. Eval scores under {EVAL_WATCH}% go on watch.</CardFoot>
        </Card>

        <Card>
          <CardHead title="Model routing" meta="cost control" />
          <div className="card-body">
            {MODEL_ROUTING.map((r) => <Meter key={r.label} label={r.label} value={`${r.pct}%`} pct={r.pct} tone={r.tone} />)}
          </div>
          <div style={{ padding: '2px 22px 16px', fontSize: 12, color: 'var(--ink-4)', lineHeight: 1.5 }}>Classification and routing run on the economy tier; the frontier tier is reserved for Stages 3, 5, 6 and 7 where reasoning quality changes the outcome.</div>
          <CardFoot>Switching provider re-runs the evaluation set before the change goes live.</CardFoot>
        </Card>
      </div>

      <SectionTitle title="Recent guardrail activations" sub="Logged to the audit trail" />
      <Card>
        <DataTable
          rows={[...guardrails]}
          rowKey={(g) => g.when + g.agent}
          columns={[
            { key: 'w', header: 'When', width: '.7fr', render: (g) => <span className="num t-ink3">{g.when}</span> },
            { key: 'a', header: 'Agent', width: '1fr', primary: true, render: (g) => <span className="t-ink" style={{ fontSize: 13 }}>{g.agent}</span> },
            { key: 'r', header: 'Guardrail', width: '1.3fr', priority: 2, render: (g) => g.rule },
            { key: 'x', header: 'Action taken', width: '1.7fr', render: (g) => <span className={tc(g.tone)}>{g.action}</span> },
          ]}
        />
      </Card>
    </div>
  );
}

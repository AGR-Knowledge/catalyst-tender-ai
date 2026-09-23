import { useSearchParams } from 'react-router-dom';
import { GATES, RACI, STAGES, type RaciValue } from '@/data/stages';
import { roleOf } from '@/data/roles';
import { useDemo } from '@/state/store';
import { useGo } from '@/state/nav';
import { useLive } from '@/domain/live';
import { Card, SectionTitle } from '@/components/ui/primitives';

const raciTone: Record<RaciValue, string> = { A: 't-ink', R: 't-cyan', C: 't-ink3', I: 't-ink3', '·': 'raci-none' };

export function Workflow() {
  const [params, setParams] = useSearchParams();
  const { state } = useDemo();
  const { goRole } = useGo();
  const live = useLive();
  const n = Math.min(9, Math.max(1, Number(params.get('stage')) || 1));
  const st = STAGES[n - 1];
  const inStage = (k: number) => live.active.filter((t) => t.stage === k).length;

  return (
    <div className="view">
      <div className="gate-cards">
        {GATES.map((g) => (
          <Card key={g.id} className="gate-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span className="gate-id">{g.id}</span>
              <span style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.1px' }}>{g.name}</span>
              <span className="num t-ink3" style={{ marginLeft: 'auto', fontSize: 11.5 }}>{g.sla}</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 9 }}>{g.owner} · <span className="t-orange">{live.gateCounts[g.id as 'DG1']} waiting</span></div>
            <div style={{ fontSize: 12, color: 'var(--ink-5)', marginTop: 3 }}>{g.after}</div>
          </Card>
        ))}
      </div>

      <SectionTitle title="The nine-stage lifecycle" sub="Stages 4 & 5 run in parallel, with a rework loop after DG3. Stage 9 feeds back into Stage 1." />
      <div className="stage-chips" role="tablist" aria-label="Lifecycle stages">
        {STAGES.map((x) => {
          const on = x.n === n;
          const count = x.n < 9 ? inStage(x.n) : null;
          return (
            <button type="button" role="tab" aria-selected={on} key={x.n} className={`stage-chip ${on ? 'on' : ''}`} onClick={() => setParams({ stage: String(x.n) }, { replace: true })}>
              <span className="n">0{x.n}</span>
              <span className="s">{x.short}</span>
              <span className="bar" />
              <span className="tg">
                <span className={x.tag ? 'hl' : ''}>{x.tag || 'AI only'}</span>
                {count != null && <span className="ct">{count} live</span>}
              </span>
            </button>
          );
        })}
      </div>

      <Card className="stage-detail" key={n}>
        <div style={{ padding: '20px 24px 18px', borderBottom: '1px solid var(--line-2)' }}>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.3px' }}>Stage {st.n}: {st.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-4)', marginTop: 4 }}>Primary agent: {st.agent}. Business owner: {st.owner}. Control point: {st.control}</div>
        </div>
        <div className="stage-cols">
          {[
            { head: 'Agent does (autonomous)', tone: 't-cyan', items: st.ai },
            { head: 'Human does', tone: 't-ink', items: st.hu },
            { head: 'Outputs', tone: 't-ink3', items: st.out },
          ].map((c) => (
            <div key={c.head} className="stage-col">
              <div className={`eyebrow ${c.tone}`}>{c.head}</div>
              {c.items.map((i) => (
                <div key={i} className="stage-li"><span aria-hidden>●</span><span>{i}</span></div>
              ))}
            </div>
          ))}
        </div>
        <div className="stage-foot">
          <span className="eyebrow">Acceptance / KPI</span>
          {st.kpi.map((k) => <span key={k} className="t-green" style={{ fontSize: 12.5, fontWeight: 500 }}>{k}</span>)}
          {st.role === state.role
            ? <button type="button" className="btn-link" style={{ marginLeft: 'auto' }} onClick={() => goRole(st.role)}>You own this stage. Go to my dashboard →</button>
            : <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--ink-4)' }}>
                Owned by {roleOf(st.role).name}, {roleOf(st.role).short}
                <button type="button" className="btn btn-sm" onClick={() => goRole(st.role, { announce: true })}><span className="demo-chip">Demo</span>View as {roleOf(st.role).name}</button>
              </span>}
        </div>
      </Card>

      <SectionTitle title="Who does what, stage by stage" sub="R responsible, A accountable, C consulted, I informed. Your row is highlighted; select another row to view as that persona (demo)" />
      <Card>
        <div className="raci-hint">Swipe sideways to see all nine stages →</div>
        <div className="raci-scroll">
          <div className="raci">
            <div className="raci-row head">
              <span>Role</span>
              {STAGES.map((s) => <span key={s.n} className="c">S{s.n}</span>)}
            </div>
            {RACI.map((r) => (
              <button type="button" key={r.role} className={`raci-row ${r.key === state.role ? 'mine' : ''}`} onClick={() => r.key !== state.role && goRole(r.key, { announce: true })}>
                <span className={r.key === state.role ? 't-ink' : 't-ink2'} style={{ fontSize: 13, fontWeight: 500 }}>{r.role}</span>
                {r.cells.map((v, i) => <span key={i} className={`c num ${raciTone[v]} ${i + 1 === n ? 'col-on' : ''}`} style={{ fontWeight: 600, fontSize: 11.5 }}>{v}</span>)}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

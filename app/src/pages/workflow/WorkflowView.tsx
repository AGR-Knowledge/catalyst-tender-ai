import { useSearchParams } from 'react-router-dom';
import { GATES, RACI, STAGES, type RaciValue } from '@/data/stages';
import type { Stage } from '@/data/types';
import { Card, SectionTitle } from '@/components/ui/primitives';

/**
 * The user manual (plan 044): gate cards, the nine stages with each one's
 * agent, human tasks, outputs and KPIs, and who does what. The content is the
 * generic product content in `data/stages.ts`; the live numbers and the
 * persona buttons come from the world's wrapper, so this file reads no
 * tenant's data: the Indian preview passes `useLive()` counts, a GCC company
 * its own lifecycles.
 */

const raciTone: Record<RaciValue, string> = { A: 't-ink', R: 't-cyan', C: 't-ink3', I: 't-ink3', '·': 'raci-none' };

export type RaciRow = (typeof RACI)[number];

/** A person a stage or a RACI row points at, in the reader's company. */
export interface WorkflowActor {
  /** "Priya Sharma", "Tarek Haddad". */
  name: string;
  /** "BM", "Commercial Manager". */
  short: string;
  /** The reader is this person (their stage, their row). */
  mine: boolean;
  /** Switch to them (a demo control). Absent: no button. */
  go?(): void;
}

export interface WorkflowProps {
  /** Tenders waiting at each gate now. */
  gateWaiting: Record<string, number>;
  /** Live tenders in a stage now. */
  liveIn(n: number): number;
  stageOwner(st: Stage): WorkflowActor | null;
  raciActor(row: RaciRow): WorkflowActor | null;
  /** "You own this stage. Go to my dashboard →". */
  goMine(st: Stage): void;
  /** The persona button's verb: "View as" on the preview, "Act as" where View as is a read-only product feature. */
  switchVerb: string;
  /** A world's wording over `data/stages.ts` (GCC: gate owners and KPI targets). Defaults to it as it is. */
  stages?: Stage[];
  gates?: typeof GATES;
}

export function WorkflowView({ gateWaiting, liveIn, stageOwner, raciActor, goMine, switchVerb, stages = STAGES, gates = GATES }: WorkflowProps) {
  const [params, setParams] = useSearchParams();
  const n = Math.min(9, Math.max(1, Number(params.get('stage')) || 1));
  const st = stages[n - 1];
  const owner = stageOwner(st);

  return (
    <div className="view">
      <div className="gate-cards">
        {gates.map((g) => (
          <Card key={g.id} className="gate-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span className="gate-id">{g.id}</span>
              <span style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.1px' }}>{g.name}</span>
              <span className="num t-ink3" style={{ marginLeft: 'auto', fontSize: 11.5 }}>{g.sla}</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 9 }}>{g.owner} · <span className="t-orange">{gateWaiting[g.id] ?? 0} waiting</span></div>
            <div style={{ fontSize: 12, color: 'var(--ink-5)', marginTop: 3 }}>{g.after}</div>
          </Card>
        ))}
      </div>

      <SectionTitle title="The nine-stage lifecycle" sub="Stages 4 & 5 run in parallel, with a rework loop after DG3. Stage 9 feeds back into Stage 1." />
      <div className="stage-chips" role="tablist" aria-label="Lifecycle stages">
        {stages.map((x) => {
          const on = x.n === n;
          const count = x.n < 9 ? liveIn(x.n) : null;
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
          {owner?.mine
            ? <button type="button" className="btn-link" style={{ marginLeft: 'auto' }} onClick={() => goMine(st)}>You own this stage. Go to my dashboard →</button>
            : owner && <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--ink-4)' }}>
                Owned by {owner.name}, {owner.short}
                {owner.go && <button type="button" className="btn btn-sm" onClick={owner.go}><span className="demo-chip">Demo</span>{switchVerb} {owner.name}</button>}
              </span>}
        </div>
      </Card>

      <SectionTitle title="Who does what, stage by stage" sub={`R responsible, A accountable, C consulted, I informed. Your row is highlighted; select another row to ${switchVerb.toLowerCase()} that persona (demo)`} />
      <Card>
        <div className="raci-hint">Swipe sideways to see all nine stages →</div>
        <div className="raci-scroll">
          <div className="raci">
            <div className="raci-row head">
              <span>Role</span>
              {STAGES.map((s) => <span key={s.n} className="c">S{s.n}</span>)}
            </div>
            {RACI.map((r) => {
              const a = raciActor(r);
              const mine = !!a?.mine;
              return (
                <button type="button" key={r.role} className={`raci-row ${mine ? 'mine' : ''}`} onClick={() => !mine && a?.go?.()} disabled={!mine && !a?.go}>
                  <span className={mine ? 't-ink' : 't-ink2'} style={{ fontSize: 13, fontWeight: 500 }}>{r.role}</span>
                  {r.cells.map((v, i) => <span key={i} className={`c num ${raciTone[v]} ${i + 1 === n ? 'col-on' : ''}`} style={{ fontWeight: 600, fontSize: 11.5 }}>{v}</span>)}
                </button>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}

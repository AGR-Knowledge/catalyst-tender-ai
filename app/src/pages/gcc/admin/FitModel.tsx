import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { RotateCcw, Scale } from 'lucide-react';
import type { Tone } from '@/data/types';
import { CRITERIA, type Criterion } from '@/data/gcc/types';
import {
  CAP_RULES, CAP_TEXT, CRITERION_LABEL, SCORE_MAX, THRESHOLD_ORDER_TEXT, WEIGHT_MAX, applyWhatIf, balanceWeights, modelOf, movesText, weightsCheck, whatIfBase, whatIfProblems,
  type WhatIfModel, type WhatIfRow, type WhatIfSide,
} from '@/domain/gcc/admin';
import type { Verdict } from '@/domain/gcc/s1/fit';
import { Card, CardFoot, CardHead } from '@/components/ui/primitives';
import { StatusPill } from '@/components/tender/StatusPill';
import { Money } from '@/components/tender/Money';
import { AdminGrid, Cell2, Rule, useAdmin } from './AdminKit';

/**
 * `/admin/fit` (plan 024 Phase 3, spec §6.6): the company's fit model, and a
 * what-if. Switching the what-if on reveals sliders for the nine weights and
 * the two thresholds; the list beside shows every live Stage 1 tender's score
 * and recommendation now and with the what-if, changed rows first. Nothing is
 * saved: leaving the page, or "Reset the what-if", returns to the model every
 * screen uses.
 */

const VERDICT_TONE: Record<Verdict, Tone> = { pursue: 'green', conditions: 'orange', discard: 'grey' };

const sameModel = (a: WhatIfModel, b: WhatIfModel) =>
  a.pursueAt === b.pursueAt && a.conditionsFrom === b.conditionsFrom && CRITERIA.every((c) => a.weights[c] === b.weights[c]);

/** A recommendation on its own line, the score and any cap under it: fits a narrow column. */
function Side({ s, from }: { s: WhatIfSide; from?: WhatIfSide }) {
  const moved = from && from.label !== s.label;
  return (
    <span className="fit-verdict">
      <span className="line">
        {moved && <span className="ch" aria-hidden>→</span>}
        <StatusPill label={s.label} tone={VERDICT_TONE[s.verdict]} />
      </span>
      <span className="adm-sub">
        <span className="num" style={{ color: 'var(--ink-2)', fontWeight: moved ? 600 : 500 }}>{s.weighted}</span>
        {moved ? ` · changes from ${from!.label}` : s.capped ? ` · ${CAP_TEXT[s.capped]}` : ''}
      </span>
    </span>
  );
}

export default function FitModel() {
  const { tenant, done, viewer, profile } = useAdmin();
  const navigate = useNavigate();
  const base = useMemo(() => whatIfBase(tenant, done, viewer), [tenant, done, viewer]);
  const current = useMemo(() => (base ? modelOf(base.d) : null), [base]);
  const [on, setOn] = useState(false);
  const [model, setModel] = useState<WhatIfModel | null>(null);
  const [last, setLast] = useState<Criterion | null>(null);

  const m = model ?? current;
  const problems = useMemo(() => (m ? whatIfProblems(m) : []), [m]);
  const scoring = on && m && !problems.length ? m : current;
  const vm = useMemo(() => (base && scoring ? applyWhatIf(base, scoring) : null), [base, scoring]);

  if (!base || !current || !m || !vm) return <div className="view" />;
  const fit = base.d.fit;
  const dirty = !sameModel(m, current);

  const reset = () => { setModel(null); setLast(null); };
  const toggle = () => { setOn(!on); reset(); };
  const setWeight = (c: Criterion, v: number) => { setModel({ ...m, weights: { ...m.weights, [c]: v } }); setLast(c); };
  const balance = () => { if (last) setModel({ ...m, weights: balanceWeights(m.weights, last) }); };
  const wCheck = weightsCheck(m.weights);

  const columns: ColDef<WhatIfRow>[] = [
    {
      headerName: 'Tender', field: 'tenderId', flex: 1, minWidth: 150,
      cellRenderer: (p: ICellRendererParams<WhatIfRow>) => p.data && (
        <Cell2 main={<Link className="mono" to={`/tenders/${encodeURIComponent(p.data.tenderId)}`}>{p.data.tenderId}</Link>} sub={p.data.shortTitle} />
      ),
    },
    { headerName: 'Now', colId: 'now', flex: 1, minWidth: 160, valueGetter: (p) => p.data?.now.weighted, cellRenderer: (p: ICellRendererParams<WhatIfRow>) => p.data && <Side s={p.data.now} /> },
    {
      headerName: on ? 'With the what-if' : 'With the what-if (off)', colId: 'next', flex: 1.15, minWidth: 180, valueGetter: (p) => p.data?.next.weighted,
      cellRenderer: (p: ICellRendererParams<WhatIfRow>) => p.data && <Side s={p.data.next} from={p.data.now} />,
    },
  ];

  const summary = !on
    ? 'The current model’s score and recommendation for each live Stage 1 tender. Switch on the what-if to try other weights and thresholds.'
    : problems.length ? `The impact waits for a valid model. ${problems.join(' ')}`
    : !dirty ? 'The what-if equals the current model. Move a slider to see the impact.'
    : movesText(vm);

  return (
    <div className="view">
      <div className="fit-split">
        <Card>
          <CardHead title="Fit model" meta={profile.name}>
            <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span id="fit-whatif-l" style={{ fontSize: 12.5, fontWeight: 500 }}>What-if</span>
              <button type="button" role="switch" aria-checked={on} aria-labelledby="fit-whatif-l" className={`switch ${on ? 'on' : ''}`} onClick={toggle}><span /></button>
            </span>
          </CardHead>
          <Rule>Weighted fit adds up each criterion’s score times its weight. The agent recommends; people decide at DG1.</Rule>
          <div className="fit-weights" role="group" aria-label="Weights">
            {CRITERIA.map((c) => {
              const w = m.weights[c];
              const was = current.weights[c];
              return (
                <div key={c} className={`fit-w ${w !== was ? 'changed' : ''}`}>
                  <span>{CRITERION_LABEL[c]}{w !== was && <span className="was" style={{ display: 'block' }}>Now {was}%</span>}</span>
                  {on ? (
                    <input type="range" min={0} max={WEIGHT_MAX} step={1} value={w} aria-label={`${CRITERION_LABEL[c]} weight`} aria-valuetext={`${w}%`}
                      onChange={(e) => setWeight(c, Number(e.target.value))} />
                  ) : (
                    <span className="bar" aria-hidden><span style={{ width: `${(w / WEIGHT_MAX) * 100}%` }} /></span>
                  )}
                  <span className="v num">{w}%</span>
                </div>
              );
            })}
          </div>
          {on && (
            <div className="fit-check" role="status">
              <StatusPill label={wCheck.text} tone={wCheck.ok ? 'green' : 'red'} icon={wCheck.ok ? '✓' : '×'} />
              {!wCheck.ok && last && (
                <button type="button" className="btn btn-sm" onClick={balance}>Keep {CRITERION_LABEL[last].toLowerCase()} at {m.weights[last]}% and balance the others</button>
              )}
            </div>
          )}
          <div className="fit-t">
            <span>Pursue at{m.pursueAt !== current.pursueAt && <span className="adm-sub" style={{ display: 'block' }}>Now {current.pursueAt}</span>}</span>
            {on ? <input type="range" min={0} max={SCORE_MAX} step={1} value={m.pursueAt} aria-label="Pursue at" aria-valuetext={`${m.pursueAt} of ${SCORE_MAX}`} onChange={(e) => setModel({ ...m, pursueAt: Number(e.target.value) })} /> : <span />}
            <span className="num" style={{ textAlign: 'right' }}>{m.pursueAt}</span>
          </div>
          <div className="fit-t">
            <span>Pursue with conditions from{m.conditionsFrom !== current.conditionsFrom && <span className="adm-sub" style={{ display: 'block' }}>Now {current.conditionsFrom}</span>}</span>
            {on ? <input type="range" min={0} max={SCORE_MAX} step={1} value={m.conditionsFrom} aria-label="Pursue with conditions from" aria-valuetext={`${m.conditionsFrom} of ${SCORE_MAX}`} onChange={(e) => setModel({ ...m, conditionsFrom: Number(e.target.value) })} /> : <span />}
            <span className="num" style={{ textAlign: 'right' }}>{m.conditionsFrom}</span>
          </div>
          {on && m.conditionsFrom >= m.pursueAt && (
            <div className="fit-check" role="status"><StatusPill label={THRESHOLD_ORDER_TEXT} tone="red" icon="×" /></div>
          )}
          <p className="fit-note">Below {m.conditionsFrom}: Recommend discard. {CAP_RULES.join(' ')}</p>
          <dl className="fit-kv">
            <dt>Value band</dt><dd><Money value={fit.band.min} /> – <Money value={fit.band.max} /></dd>
            <dt>Single-project limit</dt><dd><Money value={fit.singleLimit} /></dd>
            <dt>DG2 referral above</dt><dd><Money value={fit.dg2Referral} /></dd>
            <dt>Safe delivery load</dt><dd className="num">{fit.safeDeliveryPct}%</dd>
          </dl>
          <CardFoot row>
            <span className="grow"><Scale size={12} aria-hidden style={{ verticalAlign: -1, marginRight: 6 }} />A what-if: nothing is saved, and every screen keeps the current model.</span>
            {on && <button type="button" className="btn btn-sm" onClick={reset} disabled={!dirty}><RotateCcw size={12} aria-hidden />Reset the what-if</button>}
          </CardFoot>
        </Card>

        <Card>
          <CardHead title="Live impact" meta={`${vm.rows.length} live Stage 1 tender${vm.rows.length === 1 ? '' : 's'}`} />
          <div className="fit-summary" role="status" aria-live="polite">{summary}</div>
          <AdminGrid<WhatIfRow> rows={vm.rows} columns={columns} label="Live Stage 1 tenders: score and recommendation now and with the what-if"
            onEnter={(r) => navigate(`/tenders/${encodeURIComponent(r.tenderId)}`)} rowHeight={58} />
          <CardFoot>
            Changed rows first. Scores re-check eligibility against the credentials vault, as Screening does.
            {vm.hidden > 0 && ` ${vm.hidden} restricted tender${vm.hidden === 1 ? ' is' : 's are'} scored but not listed for you.`} Press Enter on a row to open the tender.
          </CardFoot>
        </Card>
      </div>
    </div>
  );
}

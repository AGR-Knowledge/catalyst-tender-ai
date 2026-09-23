import { SECTION_CARDS, WIN_THEMES, type SectionColumn } from '@/data/workspace';
import type { Tone } from '@/data/types';
import { useDemo } from '@/state/store';
import { useLive, FOCUS_ID } from '@/domain/live';
import { Card, CardFoot, CardHead, Meter, tc } from '@/components/ui/primitives';
import { Board, type BoardColumn } from '@/components/ui/Board';

const COLS: { key: SectionColumn; head: string; tone: Tone }[] = [
  { key: 'drafted', head: 'Agent drafted', tone: 'cyan' },
  { key: 'sme', head: 'SME input needed', tone: 'orange' },
  { key: 'review', head: 'In review', tone: 'ink' },
  { key: 'approved', head: 'Approved', tone: 'green' },
];

export function PropDashboard() {
  const { openModal, toast, mark, is, val } = useDemo();
  const live = useLive();
  const focus = live.byId(FOCUS_ID)!;

  const cards = SECTION_CARDS.map((c) => {
    if (c.key === 'sec-1') {
      if (val('sec-1') === 'approved') return { ...c, column: 'review' as const, meta: 'SME draft approved, in review', tone: 'ink3' as Tone };
      if (val('sec-1') === 'reassigned') return { ...c, meta: 'Due in 24h · S. Venkat', tone: 'orange' as Tone };
    }
    if (c.key === 'cvs' && is('cvs')) return { ...c, meta: 'Two CVs substituted, due tomorrow', tone: 'orange' as Tone };
    return c;
  });
  const commercial = { key: 'commercial', name: 'Commercial proposal', column: 'review' as const, meta: live.m2Frozen ? 'M2 frozen, pricing locked' : 'Awaiting M2 freeze', tone: (live.m2Frozen ? 'green' : 'orange') as Tone };

  const columns: BoardColumn[] = COLS.map((col) => {
    const list = [...cards.filter((c) => c.column === col.key), ...(col.key === 'review' ? [commercial] : [])];
    return {
      key: col.key, head: col.head, tone: col.tone, count: live.sections[col.key],
      cards: list.map((c) => ({
        key: c.key, name: c.name, meta: c.meta, metaTone: c.tone,
        onClick: c.key === 'sec-1' && !is('sec-1') ? () => openModal({ type: 'sme' }) : () => toast(`${c.name} section opened with reuse provenance`, 'ink3'),
      })),
    };
  });

  const weakest = [...live.scoring].sort((a, b) => a.score / a.weight - b.score / b.weight)[0];

  return (
    <>
      <Card id="sec-sections">
        <CardHead title={`Section board for ${FOCUS_ID}`} meta={`${live.sectionsTotal} sections, ${focus.days} days to submission`} />
        <Board columns={columns} maxCards={4} />
      </Card>

      <div className="split" style={{ '--cols': '1fr 1.25fr', marginTop: 'var(--gap)' } as React.CSSProperties}>
        <Card id="sec-scoring">
          <CardHead title="Simulated evaluator scoring" meta={`${Math.round(live.score)} / 100`} />
          <div className="card-body">
            {live.scoring.map((x) => {
              const p = (x.score / x.weight) * 100;
              const tone = p < 70 ? 'orange' : 'ink';
              return <Meter key={x.key} label={`${x.label} (${x.weight})`} value={x.score.toFixed(1)} pct={p} tone={tone} valueTone={tone} />;
            })}
          </div>
          <CardFoot row>
            <span className="grow">
              {is('cvs')
                ? `Two substation-specific CVs substituted from the library. ${weakest.label} is now the weakest-scored criterion.`
                : 'Key personnel scores lowest. Suggested fix: swap in two CVs with more substation experience from the past-bid library.'}
            </span>
            {is('cvs')
              ? <span className="t-green" style={{ fontSize: 12.5, fontWeight: 500 }}>✓ Applied</span>
              : <button type="button" className="btn btn-primary" onClick={() => mark('cvs', `Two CVs substituted from the library. Simulated score ${Math.round(live.score)} → ${Math.round(live.score + 2)}`)}>Apply</button>}
          </CardFoot>
        </Card>
        <Card id="sec-themes">
          <CardHead title="Win themes" meta="coverage checked per section" />
          {WIN_THEMES.map((t, i) => (
            <div className="item" key={t.title} style={{ padding: '14px 22px' }}>
              <span className="mark num">{i + 1}</span>
              <span className="item-body"><span className="item-title">{t.title}</span><span className={`item-text ${tc(t.tone)}`}>{t.body}</span></span>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}

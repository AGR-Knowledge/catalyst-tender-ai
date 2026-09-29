import { useMemo } from 'react';
import { useTenantKey } from '@/domain/tenancy';
import { personById } from '@/data/people';
import { gccData, isGccTenantKey } from '@/data/gcc';
import { RESULT_SPLITS } from '@/data/gcc/lifecycle/targets';
import { resultsIn } from '@/domain/gcc/lifecycle';
import { windowOf } from '@/domain/gcc/period';
import { bidRecordFor } from '@/domain/gcc/company/record';
import { calibrationFor } from '@/domain/gcc/s3/win';
import { usersOf } from '@/domain/gcc/admin';
import { convert } from '@/domain/money';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Plan 034: the last 12 months read like a real contractor's, in every
 * company. Our place and the gap are published on most losses and make sense;
 * value won is in proportion to the company's size; the win forecasts of B–E
 * calibrate while Najd keeps its one over-confident band (gcc-demo-data §5.1);
 * no 12-month bid reads as a completed project listed again; seats stay within
 * the licence. Reads the seed with an empty `done`, so it changes nothing.
 */

interface Check { name: string; ok: boolean; got: string }

const GCC = ['najd', 'corniche', 'dafna', 'batinah', 'qurain'] as const;

/** Value won ÷ FY2025 turnover, the range of one year's work won for one year done. */
const BOOK_TO_BILL: [number, number] = [0.9, 1.3];
const TOLERANCE = 10;

/** A title as a set of lower-case words: "Wadi crossing bridges, Saham" = "Saham wadi crossing bridges". */
const wordsOf = (s: string) => [...new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean))].sort().join(' ');

function checks(): Check[] {
  const out: Check[] = [];
  const add = (name: string, ok: boolean, got: string) => out.push({ name, ok, got });
  const per = GCC.map((t) => {
    const lost = resultsIn(t, windowOf('12m', t), ['lost'], undefined, {}).map((x) => x.r);
    return { t, lost, price: lost.filter((r) => r.lossReason === 'price') };
  });
  /** Every company passes `test`; `got` lists each company's reading. */
  const each = (test: (t: (typeof GCC)[number]) => [boolean, string]) => {
    const rows = GCC.map((t) => ({ t, r: test(t) }));
    return [rows.every((x) => x.r[0]), rows.map((x) => `${x.t} ${x.r[1]}${x.r[0] ? '' : ' ✗'}`).join(' · ')] as const;
  };

  // 1. Places on at least half the losses, gaps on at least half the price losses.
  add('Places on ≥ half the losses, gaps on ≥ half the price losses', ...each((t) => {
    const { lost, price } = per.find((x) => x.t === t)!;
    const placed = lost.filter((r) => r.rank).length;
    const gaps = price.filter((r) => r.gapToWinnerPct !== undefined).length;
    return [placed * 2 >= lost.length && gaps * 2 >= price.length, `${placed}/${lost.length}, ${gaps}/${price.length}`];
  }));

  // 2. Every published figure makes sense.
  add('Every place ≤ its bidders; every gap > 0, one decimal', ...each((t) => {
    const { lost } = per.find((x) => x.t === t)!;
    const bad = lost.filter((r) => (r.rank && (r.rank[0] < 1 || r.rank[0] > r.rank[1] || r.rank[1] < 3 || r.rank[1] > 9))
      || (r.gapToWinnerPct !== undefined && (!(r.gapToWinnerPct > 0) || Math.abs(Math.round(r.gapToWinnerPct * 10) - r.gapToWinnerPct * 10) > 1e-9)));
    return [bad.length === 0, bad.length ? `${bad.length} off` : 'ok'];
  }));

  // 3. A prequalification loss was never opened.
  add('No pq loss has a place or a gap', ...each((t) => {
    const pq = per.find((x) => x.t === t)!.lost.filter((r) => r.lossReason === 'pq');
    return [pq.every((r) => !r.rank && r.gapToWinnerPct === undefined), `${pq.length} pq`];
  }));

  // 4. Najd's Why we lost card: places and gaps on most reasons.
  const najd = bidRecordFor('najd', {}, personById('najd.hot')!).losses;
  const withPlace = najd.rows.filter((r) => r.place).length;
  const withGap = najd.rows.filter((r) => r.gap && r.gap !== 'masked').length;
  add('Najd: Why we lost shows places and gaps on most reasons', withPlace * 2 > najd.rows.length && withGap * 2 > najd.rows.length,
    `places on ${withPlace} of ${najd.rows.length} reasons, gaps on ${withGap} · ${najd.placeRecorded} of ${najd.total} losses placed`);

  // 5. Value won in proportion to size.
  add(`Value won ${BOOK_TO_BILL[0]}–${BOOK_TO_BILL[1]}× FY2025 turnover`, ...each((t) => {
    const r = bidRecordFor(t, {}, personById(`${t}.hot`)!);
    const fy = gccData(t).company.financials.find((f) => f.fy === 2025)!.turnover;
    const x = r.totals.valueWon.amount / convert(fy.amount, fy.ccy, r.totals.valueWon.ccy);
    return [x >= BOOK_TO_BILL[0] && x <= BOOK_TO_BILL[1], `${x.toFixed(2)}×`];
  }));

  // 6. B–E: every judged band within ±10 points (Dafna once it has the 20 bids calibration needs).
  add(`B–E: every judged band within ±${TOLERANCE} points`, ...each((t) => {
    if (t === 'najd') return [true, 'see below'];
    const c = calibrationFor(gccData(t).history.outcomes);
    if (!c.enough) return [t === 'dafna', `n ${c.n}, not judged`];
    const judged = c.bands.filter((b) => !b.smallSample);
    return [judged.length > 0 && judged.every((b) => Math.abs(b.gap) <= TOLERANCE), `n ${c.n}, ${judged.map((b) => `${b.label} ${b.gap > 0 ? '+' : ''}${b.gap.toFixed(1)}`).join(', ')}`];
  }));

  // 7. Najd keeps its bands, the over-confident < 30% one included.
  const cn = calibrationFor(gccData('najd').history.outcomes);
  const najdBands = RESULT_SPLITS.calibration.map((b) => ({ b, x: cn.bands.find((y) => y.label === `${b.band}%`) }));
  add('Najd: bands equal RESULT_SPLITS.calibration', najdBands.every(({ b, x }) => x && x.bids === b.bids && x.won === b.won),
    najdBands.map(({ b, x }) => `${b.band} ${x ? `${x.won} of ${x.bids}` : 'missing'}`).join(' · '));

  // 8. Seats within the licence.
  add('Seats in use ≤ licensed', ...each((t) => {
    const s = usersOf(t).seats;
    return [s.used <= s.licensed, `${s.used} of ${s.licensed}`];
  }));

  // 9. No 12-month bid reads as a completed project listed again.
  add('No 12-month result title = a register project’s (as word sets)', ...each((t) => {
    const d = gccData(t);
    const projects = new Map(d.projects.map((p) => [wordsOf(p.title), p.id]));
    const clash = d.history.outcomes.filter((o) => projects.has(wordsOf(o.title)));
    return [clash.length === 0, clash.length ? clash.map((o) => `${o.id} = ${projects.get(wordsOf(o.title))}`).join(', ') : `${d.history.outcomes.length} results`];
  }));

  return out;
}

export default function HistoryCheck() {
  const tenant = useTenantKey();
  const rows = useMemo(() => (isGccTenantKey(tenant) ? checks() : []), [tenant]);
  if (!isGccTenantKey(tenant)) return <CardHead title="A bid history that reads true (plan 034)" meta="No GCC seed for this tenant" />;
  const failing = rows.filter((r) => !r.ok).length;
  return (
    <>
      <CardHead title="A bid history that reads true (plan 034)" meta={failing ? `${failing} of ${rows.length} failing` : `All ${rows.length} pass`} />
      <DataTable
        rows={rows}
        rowKey={(c) => c.name}
        columns={[
          { key: 'n', header: 'Check', width: '1.5fr', primary: true, render: (c) => <span className="cell-main">{c.name}</span> },
          { key: 'g', header: 'Got', width: '2fr', render: (c) => c.got },
          { key: 'r', header: 'Result', width: '.6fr', align: 'right', render: (c) => (c.ok ? <span className="t-green">✓ Pass</span> : <span className="t-red">× Fail</span>) },
        ]}
      />
    </>
  );
}

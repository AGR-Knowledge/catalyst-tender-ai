import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RATE_TOLERANCE } from '@/data/boq';
import { useDemo } from '@/state/store';
import { useLive, FOCUS_ID } from '@/domain/live';
import { CLASS_LABEL, closestBid, compareBids, compareLine, ratesElsewhere, rateLabel, median, type BoqLine } from '@/domain/boq';
import { cr, int, pct, plural } from '@/domain/format';
import { Card, CardFoot, CardHead, tc } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

const MINUS = '−';
const signed = (n: number, dp = 1) => `${n < 0 ? MINUS : '+'}${Math.abs(n).toFixed(dp)}%`;
const deltaTone = (d: number | null) => (d == null ? 'ink3' : d > RATE_TOLERANCE ? 'red' : d < -RATE_TOLERANCE ? 'orange' : 'green');

export function Boq() {
  const live = useLive();
  const { openDrawer } = useDemo();
  const [params, setParams] = useSearchParams();
  const all = live.boqs;
  const id = params.get('t') && live.boqOf(params.get('t')!) ? params.get('t')! : (live.boqOf(FOCUS_ID) ? FOCUS_ID : all[0]?.tender.id);
  const boq = id ? live.boqOf(id) : null;
  const [pick, setPick] = useState<string | null>(null);
  const [otherId, setOtherId] = useState<string | null>(null);
  const [allRates, setAllRates] = useState(false);

  const setBid = (v: string) => { setParams({ t: v }, { replace: true }); setPick(null); setOtherId(null); setAllRates(false); };

  const compares = useMemo(() => (boq ? boq.lines.map((l) => compareLine(l, boq.tender.id, all)) : []), [boq, all]);
  if (!boq) return <div className="view"><Card><div className="card-body t-ink3">No live bid has a bill of quantities yet.</div></Card></div>;

  const t = boq.tender;
  const covered = boq.split.self + boq.split.sub;
  const coveredPct = (covered / boq.total) * 100;
  const openLines = boq.lines.filter((l) => l.cls === 'open');
  const flagged = boq.lines.filter((_, i) => compares[i].flag);
  const line = boq.lines.find((l) => l.item === pick) ?? boq.lines.find((l, i) => !l.lump && compares[i].n > 0) ?? boq.lines[0];
  const other = (otherId ? live.boqOf(otherId) : null) ?? closestBid(boq, all);
  const pair = other ? compareBids(boq, other) : null;
  const pkgOf = (l: BoqLine) => (l.pkg ? live.packages.find((p) => p.key === l.pkg) : undefined);

  const status = (l: BoqLine) => {
    const p = pkgOf(l);
    if (p) return p.column === 'approved' ? { s: 'Locked to quote', tone: 'green' as const } : p.column === 'issued' ? { s: `RFQ out, ${p.responded} of ${p.invited}`, tone: 'orange' as const } : { s: 'Quotes in, comparing', tone: 'cyan' as const };
    if (l.cls === 'open') return { s: 'No one covers it', tone: 'red' as const };
    if (l.cls === 'self') return { s: boq.basis === 'priced' ? 'Own rate build-up' : 'Rate library', tone: 'ink3' as const };
    return { s: boq.basis === 'priced' ? 'Quoted' : 'To go out for quotes', tone: 'ink3' as const };
  };

  const verdict = openLines.length
    ? `${pct(coveredPct)} of the bill by value is covered by self-performed or subcontract lines. ${openLines.map((l) => l.desc.split(',')[0]).join(' and ')} ${openLines.length === 1 ? 'is' : 'are'} outside the service catalogue, worth ${cr(openLines.reduce((a, l) => a + l.amount, 0), 1)}.`
    : `Every line in the bill is covered: ${pct((boq.split.self / boq.total) * 100)} self-performed and ${pct((boq.split.sub / boq.total) * 100)} through subcontract packages.`;

  const pts = line && !line.lump ? ratesElsewhere(line.code, t.id, all).sort((a, b) => a.rate - b.rate) : [];
  const lineMed = median(pts.map((p) => p.rate));
  const lo = Math.min(line.rate, ...pts.map((p) => p.rate));
  const hi = Math.max(line.rate, ...pts.map((p) => p.rate));
  const x = (r: number) => (hi === lo ? 50 : ((r - lo) / (hi - lo)) * 100);
  const lc = compares[boq.lines.indexOf(line)];

  return (
    <div className="view">
      <Card>
        <div className="boq-bar">
          <label className="sort prog-pick">
            <span className="sr-only">Bid</span>
            <select value={t.id} onChange={(e) => setBid(e.target.value)} aria-label="Bid">
              {all.map((b) => <option key={b.tender.id} value={b.tender.id}>{b.tender.id}, {b.tender.name}</option>)}
            </select>
          </label>
          <button type="button" className="btn-link" onClick={() => openDrawer({ type: 'tender', id: t.id })}>Open tender record</button>
        </div>
        <div className="figs boq-figs">
          <div className="fig"><div className="k">{boq.basis === 'priced' ? 'Priced BOQ' : 'Estimated BOQ'}</div><div className="v">{cr(boq.total)}</div><div className="s">{t.client}, Stage {t.stage}</div></div>
          <div className="fig"><div className="k">Lines in the bill</div><div className="v">{int(boq.fullLines)}</div><div className="s">rolled up to {boq.lines.length} items</div></div>
          <div className="fig"><div className="k">Covered</div><div className={`v ${openLines.length ? 't-orange' : 't-green'}`}>{pct(coveredPct)}</div><div className="s">{openLines.length ? `${plural(openLines.length, 'item')} not covered` : 'all lines covered'}</div></div>
          <div className="fig"><div className="k">Rates off the median</div><div className={`v ${flagged.length ? 't-orange' : 't-green'}`}>{flagged.length}</div><div className="s">more than {RATE_TOLERANCE}% from other bids</div></div>
          <div className="fig"><div className="k">Basis</div><div className="v sm">{boq.basis === 'priced' ? 'Priced by the bid team' : 'Estimate from the rate library'}</div></div>
        </div>
        <div className="boq-cover">
          <div className="boq-split" role="img" aria-label={`Self-performed ${pct((boq.split.self / boq.total) * 100)}, subcontract ${pct((boq.split.sub / boq.total) * 100)}, not covered ${pct((boq.split.open / boq.total) * 100)}`}>
            {(['self', 'sub', 'open'] as const).map((k) => boq.split[k] > 0 && <i key={k} className={`c-${k}`} style={{ width: `${(boq.split[k] / boq.total) * 100}%` }} />)}
          </div>
          <div className="boq-legend">
            {(['self', 'sub', 'open'] as const).filter((k) => boq.split[k] > 0).map((k) => (
              <span key={k}><i className={`c-${k}`} aria-hidden />{CLASS_LABEL[k]} <b>{pct((boq.split[k] / boq.total) * 100)}</b> <span className="t-ink4">{cr(boq.split[k], 1)}</span></span>
            ))}
          </div>
          <p className="boq-verdict">{verdict}</p>
        </div>
      </Card>

      <div className="split" style={{ '--cols': '1.65fr 1fr', marginTop: 'var(--gap)' } as React.CSSProperties}>
        <Card>
          <CardHead title="Bill of quantities" meta={`${boq.lines.length} of ${int(boq.fullLines)} lines, by item`} />
          <DataTable
            rows={boq.lines}
            rowKey={(l) => l.item}
            onRowClick={(l) => { setPick(l.item); setAllRates(false); }}
            rowLabel={(l) => `Check the rate for ${l.desc}`}
            columns={[
              { key: 'i', header: 'Item', width: '46px', render: (l) => <span className={`num ${l.item === line.item ? 't-ink' : 't-ink4'}`}>{l.item}</span> },
              { key: 'd', header: 'Description', width: '2fr', primary: true, render: (l) => (<><span className={`cell-main ${l.item === line.item ? 'boq-on' : ''}`}>{l.desc}</span><span className="cell-sub">{l.lump ? 'Lump sum' : `${int(l.qty)} ${l.unit}`}, {l.bill.toLowerCase()}</span></>) },
              { key: 'r', header: 'Rate', width: '.8fr', align: 'right', render: (l) => <span className="num">{l.lump ? 'Lump sum' : rateLabel(l.rate)}</span> },
              { key: 'a', header: 'Amount', width: '.8fr', align: 'right', render: (l) => <span className="num t-ink">{cr(l.amount, 1)}</span> },
              { key: 'c', header: 'Covered by', width: '1.05fr', priority: 2, render: (l) => { const s = status(l); return (<><span className={`cell-main ${l.cls === 'open' ? 't-red' : ''}`} style={{ fontWeight: 500, fontSize: 12.5 }}>{CLASS_LABEL[l.cls]}</span><span className={`cell-sub ${tc(s.tone)}`}>{s.s}</span></>); } },
              { key: 'v', header: 'Vs other bids', width: '.85fr', align: 'right', render: (l) => { const c = compares[boq.lines.indexOf(l)]; return c.delta == null ? <span className="t-ink4" style={{ fontSize: 12 }}>{l.lump ? 'Not comparable' : 'No other bid'}</span> : <span className={`num ${tc(deltaTone(c.delta))}`}>{signed(c.delta)}</span>; } },
            ]}
          />
          <CardFoot>Every line is matched to the service catalogue in Settings, which is how the same item is found on other bids. Lump sums are priced as one lot and are not compared on rate.</CardFoot>
        </Card>

        <Card>
          <CardHead title="Rate check" meta={`item ${line.item}`} />
          <div className="card-body boq-check">
            <div className="boq-check-h">{line.desc}</div>
            <div className="t-ink4" style={{ fontSize: 12 }}>{line.lump ? 'Lump sum' : `${int(line.qty)} ${line.unit}`}. {line.why}.</div>
            {line.lump ? (
              <p className="note" style={{ marginTop: 14 }}>A lump sum has no unit rate, so it cannot be set against other bids. It is checked against the package quotes instead.</p>
            ) : pts.length === 0 ? (
              <p className="note" style={{ marginTop: 14 }}>No other live bid carries this item, so there is nothing to compare it with yet.</p>
            ) : (
              <>
                <div className="boq-kv">
                  <span><i>This bid</i><b>{rateLabel(line.rate)}</b></span>
                  <span><i>Median of {plural(pts.length, 'bid')}</i><b>{rateLabel(lineMed!)}</b></span>
                  <span><i>Difference</i><b className={tc(deltaTone(lc.delta))}>{signed(lc.delta!)}</b></span>
                </div>
                <div className="boq-range" aria-hidden>
                  <span className="rl" />
                  {pts.map((p) => <i key={p.tender.id} style={{ left: `${x(p.rate)}%` }} title={`${p.tender.id} ${rateLabel(p.rate)}`} />)}
                  <i className="med" style={{ left: `${x(lineMed!)}%` }} />
                  <b style={{ left: `${x(line.rate)}%` }} />
                </div>
                <div className="boq-range-lbl"><span>{rateLabel(lo)}</span><span>{rateLabel(hi)}</span></div>
                <div className="boq-others">
                  {(allRates ? pts : [...pts].sort((a, b) => Number(b.tender.sector === t.sector) - Number(a.tender.sector === t.sector) || Math.abs(a.rate - line.rate) - Math.abs(b.rate - line.rate)).slice(0, 5).sort((a, b) => a.rate - b.rate)).map((p) => (
                    <button type="button" key={p.tender.id} className="boq-other" onClick={() => setBid(p.tender.id)} title={`Open the BOQ for ${p.tender.id}`}>
                      <span className="n"><b>{p.tender.name}</b><small>{p.tender.id}, {p.tender.client}</small></span>
                      <span className="num">{rateLabel(p.rate)}</span>
                      <span className={`num ${tc(deltaTone(((line.rate - p.rate) / p.rate) * 100))}`} style={{ width: 58, textAlign: 'right' }}>{signed(((line.rate - p.rate) / p.rate) * 100)}</span>
                    </button>
                  ))}
                  {pts.length > 5 && <button type="button" className="btn-link boq-more" onClick={() => setAllRates(!allRates)}>{allRates ? 'Show the closest five' : `Show all ${pts.length} bids`}</button>}
                </div>
                <p className="boq-note">{lc.flag ? `More than ${RATE_TOLERANCE}% ${lc.delta! > 0 ? 'above' : 'below'} the median. ${lc.delta! > 0 ? 'Worth a second look before the price is frozen, as it may cost the bid on the commercial score.' : 'Check the quantity and the build-up before relying on it, as a low rate here comes out of margin.'}` : `Within ${RATE_TOLERANCE}% of the median of other bids.`}</p>
              </>
            )}
          </div>
        </Card>
      </div>

      {other && pair && (
        <Card style={{ marginTop: 'var(--gap)' }}>
          <CardHead title="Compare with another bid" meta={`${plural(pair.rows.length, 'shared item')}`}>
            <label className="sort">
              <span className="sr-only">Compare with</span>
              <select value={other.tender.id} onChange={(e) => setOtherId(e.target.value)} aria-label="Compare with">
                {all.filter((b) => b.tender.id !== t.id).map((b) => <option key={b.tender.id} value={b.tender.id}>{b.tender.id}, {b.tender.name}</option>)}
              </select>
            </label>
          </CardHead>
          {pair.rows.length ? (
            <>
              <div className="boq-pair-sum">
                <span><i>{t.id}</i><b>{t.name}</b></span>
                <span className={`gap ${tc(deltaTone(pair.gap))}`}>{signed(pair.gap!)}<small>weighted by value, on {cr(pair.sharedValue, 1)} of shared items</small></span>
                <span><i>{other.tender.id}</i><b>{other.tender.name}</b></span>
              </div>
              <DataTable
                rows={pair.rows}
                rowKey={(r) => r.line.code}
                columns={[
                  { key: 'd', header: 'Item', width: '2fr', primary: true, render: (r) => (<><span className="cell-main">{r.line.desc}</span><span className="cell-sub">per {r.line.unit}</span></>) },
                  { key: 'a', header: t.id, width: '1fr', align: 'right', render: (r) => <span className="num t-ink">{rateLabel(r.line.rate)}</span> },
                  { key: 'b', header: other.tender.id, width: '1fr', align: 'right', render: (r) => <span className="num">{rateLabel(r.other.rate)}</span> },
                  { key: 'g', header: 'Difference', width: '.8fr', align: 'right', render: (r) => <span className={`num ${tc(deltaTone(r.delta))}`}>{signed(r.delta)}</span> },
                ]}
              />
            </>
          ) : <div className="card-body t-ink3" style={{ fontSize: 13 }}>These two bids share no rated items.</div>}
          <CardFoot>{t.sector === other.tender.sector ? `Both are ${t.sector.toLowerCase()} bids.` : `${t.sector} against ${other.tender.sector.toLowerCase()}, so only the common civil items line up.`} Rates are compared per unit, so the size of each bid does not skew the difference.</CardFoot>
        </Card>
      )}
    </div>
  );
}

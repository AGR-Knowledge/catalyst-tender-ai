import type { Tone } from '@/data/types';
import type { MoneyPair } from '@/domain/money';
import { gccData, isGccTenantKey } from '@/data/gcc';
import { Tip } from '@/components/tender/Tip';

/** Money already converted by a rule module: the tenant currency first, the stated amount and rate on hover or focus. */
export function PairMoney({ v, basis }: { v: MoneyPair | undefined; basis?: 'published' | 'estimate' | 'not-stated' }) {
  if (!v) return <span className="tk-sub">Not stated</span>;
  const est = basis === 'estimate' ? <span className="s1-est"> est.</span> : null;
  if (!v.original) return <span className="num money">{v.text}{est}</span>;
  return (
    <Tip className="num money conv" width={260} label={`${v.text}, converted from ${v.original}`}
      tip={<><b>Stated as {v.original}</b><span>Rate {v.rate} as of {v.asOf}</span></>}>
      {v.text}{est}
    </Tip>
  );
}

/** The tenant's fit thresholds, for a fit number's tone. */
export function fitTone(tenant: string, fit: number | null | undefined): Tone | undefined {
  if (fit === null || fit === undefined || !isGccTenantKey(tenant)) return undefined;
  const m = gccData(tenant).fit;
  return fit >= m.pursueAt ? 'green' : fit >= m.conditionsFrom ? 'orange' : 'muted';
}

export function FitNum({ tenant, fit }: { tenant: string; fit: number | null | undefined }) {
  if (fit === null || fit === undefined) return <span className="tk-sub">Not scored</span>;
  const tone = fitTone(tenant, fit);
  const word = tone === 'green' ? 'pursue band' : tone === 'orange' ? 'conditions band' : 'below the conditions band';
  return <span className={`num s1-fit t-${tone ?? 'ink'}`} title={`Fit ${Math.round(fit)} of 100: ${word}`}>{Math.round(fit)}</span>;
}

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import type { MoneyVM } from '@/domain/gcc/viewmodels';
import type { PairVM, SupplierDetailVM } from '@/domain/gcc/suppliers/detail';
import type { HealthWord } from '@/domain/gcc/suppliers/health';
import { dayMonthYear } from '@/domain/gcc/s1/common';
import { Money } from '@/components/tender/Money';
import { Masked } from '@/components/tender/Masked';

/** Shared pieces of the supplier profile's tabs (plan 031). */

export interface TabProps { d: SupplierDetailVM; onTab(id: string): void }

/** The glyph with each health word, so the pill never rests on colour alone; adequate is plain. */
export const HEALTH_ICON: Record<HealthWord, string | undefined> = { Strong: '✓', Adequate: undefined, Watch: '!' };

/** "18 Nov 2025" from an ISO date or time. */
export const dmy = (iso: string) => dayMonthYear(iso.slice(0, 10));

/** An amount in the supplier's currency, with the company-currency equivalent under it when they differ. */
export function Pair({ v }: { v: PairVM }) {
  return (
    <span className="spf-pair">
      <Money value={v.own} />
      {v.company && <span className="spf-eq">≈ <Money value={v.company} /></span>}
    </span>
  );
}

/** An awarded value, or the mask that names who may see it. */
export function Awarded({ v, by }: { v: MoneyVM | null; by: string }) {
  return v ? <Money value={v} /> : <Masked by={by} />;
}

/** A tender the viewer may open links to its workspace; one they may not reads "not shared with you". */
export function TenderRef({ id, title, tab = 'overview' }: { id: string; title: string | null; tab?: string }) {
  if (title === null) return <span className="spf-hidden"><Lock size={11} aria-hidden /><span className="mono">{id}</span> not shared with you</span>;
  return <Link to={`/tenders/${encodeURIComponent(id)}?tab=${tab}`} className="spf-tender"><span className="mono">{id}</span> {title}</Link>;
}

/** A card body that scrolls inside an `.eq-row` while its head stays. */
export const Scroll = ({ children, pad = true }: { children: ReactNode; pad?: boolean }) => <div className={`eq-scroll ${pad ? 'spf-pad' : ''}`}>{children}</div>;

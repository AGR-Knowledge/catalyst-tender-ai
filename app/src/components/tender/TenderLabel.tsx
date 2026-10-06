import { useMemo } from 'react';
import { useDemo } from '@/state/store';
import { useTenantKey } from '@/domain/tenancy';
import { labelsOf, type TenderLabelsVM } from '@/domain/gcc/labels';
import { Tip } from './Tip';
import './tender-label.css';

/**
 * The OG and Previous labels (plan 042): two small pills that sit beside a
 * TID, the same on every screen. A word in a pill, never a coloured stripe.
 * - OG: neutral ink on a light surface;
 * - Previous: a calm blue tint, the funnel's "previous" family (plan 039).
 *
 * `plain` renders the pills without their popovers (a native title only), for
 * places where the pills sit inside another control, such as a list button.
 */

export const OG_TIP = 'Original: built on a real tender document supplied by the client';

/** The labels of one tender for the current viewer and demo state. */
export function useTenderLabels(tenderId: string): TenderLabelsVM {
  const tenant = useTenantKey();
  const { state } = useDemo();
  return useMemo(() => labelsOf(tenant, tenderId, state.person, state.done), [tenant, tenderId, state.person, state.done]);
}

export function TenderLabelPills({ labels, plain = false, className = '' }: { labels: TenderLabelsVM; plain?: boolean; className?: string }) {
  const { og, previous } = labels;
  if (!og && !previous) return null;
  const pill = (kind: 'og' | 'previous', word: string, tip: string) => (plain ? (
    <span className={`tlab tlab-${kind}`} title={tip}>
      <span aria-hidden>{word}</span>
      <span className="sr-only">{tip}</span>
    </span>
  ) : (
    <Tip tip={tip} className={`tlab tlab-${kind}`} label={`${word}. ${tip}`} width={300}>{word}</Tip>
  ));
  return (
    <span className={`tlab-pills ${className}`}>
      {og && pill('og', 'OG', OG_TIP)}
      {previous && pill('previous', 'Previous', previous.tip)}
    </span>
  );
}

/** The labels of a tender, read for the current viewer. Renders nothing for a tender with neither. */
export function TenderLabel({ tenderId, plain, className }: { tenderId: string; plain?: boolean; className?: string }) {
  const labels = useTenderLabels(tenderId);
  return <TenderLabelPills labels={labels} plain={plain} className={className} />;
}

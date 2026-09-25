import { money, rateNote } from '@/domain/money';
import type { MoneyVM } from '@/domain/gcc/viewmodels';
import { Tip } from './Tip';

/**
 * Tenant-currency money (ui-direction §7.1): "SAR 482.6 M", or every digit
 * with `full`. A converted amount never converts silently: hover or focus
 * shows the amount as stated and the rate.
 */
export function Money({ value, full = false, className = '' }: { value: MoneyVM; full?: boolean; className?: string }) {
  const text = money(value.amount, value.ccy, { full });
  const exact = money(value.amount, value.ccy, { full: true });
  if (!value.original || value.original.ccy === value.ccy) {
    return <span className={`num money ${className}`} title={full ? undefined : exact}>{text}</span>;
  }
  const o = value.original;
  return (
    <Tip
      className={`num money conv ${className}`}
      label={`${text}, converted from ${money(o.amount, o.ccy)}`}
      width={280}
      tip={<><b>Stated as {money(o.amount, o.ccy, { full: true })}</b><span>Converted to {exact}</span><span>{rateNote(o.ccy, value.ccy)}</span></>}
    >
      {text}
    </Tip>
  );
}

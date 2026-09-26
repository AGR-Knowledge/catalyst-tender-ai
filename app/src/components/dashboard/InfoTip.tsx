import { Info } from 'lucide-react';
import type { InfoVM } from '@/domain/gcc/viewmodels';
import { MIN_N } from '@/data/gcc/targets';
import { usePop } from '@/components/tender/Tip';

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
/** The small-sample threshold in words ("five"), digits above ten. */
const MIN_N_TEXT = WORDS[MIN_N] ?? String(MIN_N);

/**
 * The ⓘ beside every KPI label (dashboards.md §3). It opens on hover, on
 * keyboard focus and on tap; Esc closes it. The text comes from the registry,
 * never from the page.
 */
export function InfoTip({ info }: { info: InfoVM }) {
  const pop = usePop<HTMLButtonElement>({ width: 320 });
  return (
    <>
      <button type="button" className="info-btn" aria-label={`About ${info.label}`} {...pop.triggerProps}>
        <Info size={16} strokeWidth={1.7} aria-hidden />
      </button>
      {pop.render(
        <div className="info-pop">
          <div className="ip-t">{info.label}</div>
          <dl>
            <dt>What it means</dt><dd>{info.means}</dd>
            <dt>How it’s counted</dt><dd>{info.counted}</dd>
            {info.period && <><dt>Period</dt><dd>{info.period}</dd></>}
            <dt>Target</dt><dd>{info.target ?? 'None (information)'}</dd>
            <dt>Source</dt><dd>{info.source}</dd>
          </dl>
          {info.smallSample && <div className="ip-note">Small sample: fewer than {MIN_N_TEXT} results, so the counts are shown first and the tone stays neutral.</div>}
        </div>,
      )}
    </>
  );
}

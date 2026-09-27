import { holdersOf } from '@/data/access';
import { personById } from '@/data/people';
import type { Tone } from '@/data/types';
import type { Dg3LineState, Dg3LineVM } from '@/domain/gcc/dg3';
import { Masked } from '@/components/tender/Masked';
import { StatusPill } from '@/components/tender/StatusPill';
import './dg3.css';

/**
 * The DG3 evidence (plan 018 step 3.2, left column): every line of the pack
 * with its state, failing lines first, each in a plain sentence with its
 * owners where relevant. Price and margin read masked for roles without
 * `see.margin`, but pass or fail always shows.
 */

const STATE: Record<Dg3LineState, { label: string; tone: Tone; icon: string }> = {
  fail: { label: 'Fails', tone: 'red', icon: '!' },
  pass: { label: 'Pass', tone: 'green', icon: '✓' },
  info: { label: 'For information', tone: 'grey', icon: 'i' },
};

/** What a person on an item does: owns the risk, or signs the document. */
const PERSON_WORD: Record<string, string> = { risks: 'Owner', signatories: 'Signs' };

export function Evidence({ lines, meta }: { lines: Dg3LineVM[]; meta: string }) {
  // Failing lines first; otherwise the pack's own order, so the price sits beside the margin condition.
  const sorted = [...lines.filter((l) => l.state === 'fail'), ...lines.filter((l) => l.state !== 'fail')];
  const count = (s: Dg3LineState) => lines.filter((l) => l.state === s).length;
  const fails = count('fail');
  return (
    <section className="dg3-ev" aria-labelledby="dg3-ev-h">
      <header className="dg3-ev-h">
        <h3 id="dg3-ev-h">Evidence in the DG3 pack</h3>
        <span className="dg3-ev-m">{meta}</span>
      </header>
      <p className="dg3-ev-sum">
        {fails ? <><span className="t-red">{fails === 1 ? '1 check fails' : `${fails} checks fail`}</span> · {count('pass')} pass</> : `All ${count('pass')} checks pass`}
        {count('info') > 0 && ` · ${count('info')} for information`}
      </p>
      <ol className="dg3-lines">
        {sorted.map((l) => {
          const st = STATE[l.state];
          return (
            <li key={l.key} className={`dg3-line s-${l.state}`}>
              <div className="dg3-line-h">
                <StatusPill label={st.label} tone={st.tone} icon={st.icon} />
                <span className="dg3-line-l">{l.label}</span>
                {l.state === 'fail' && l.blocking && <span className="dg3-block">Blocks approval</span>}
              </div>
              <p className="dg3-line-t">
                {l.text}
                {l.maskLabel && <>{l.text ? ' ' : ''}<Masked text={l.maskLabel} by={holdersOf('see.margin')} /></>}
              </p>
              {l.items && l.items.length > 0 && (
                <ul className="dg3-items">
                  {l.items.map((it) => {
                    const p = personById(it.ownerId);
                    return (
                      <li key={it.text}>
                        <span>{it.text}</span>
                        {(p || it.tag) && (
                          <span className="dg3-item-m">
                            {p && <span>{PERSON_WORD[l.key] ?? 'Owner'}: {p.name}, {p.title}</span>}
                            {it.tag && <span className="dg3-tag">{it.tag}</span>}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

import { useEffect, useRef, type ReactNode } from 'react';
import type { Tone } from '@/data/types';
import { KV, StageTrack, tc } from '@/components/ui/primitives';
import { useClosing } from '@/state/presence';

export interface OverlayAction { label: string; onClick: () => void; primary?: boolean; danger?: boolean; disabled?: boolean }
export interface OverlayRow { k: ReactNode; v?: ReactNode; tone?: Tone; mono?: boolean; stack?: boolean }
export interface OverlaySection { head: string; rows: OverlayRow[] }

function useOverlayBehaviour(onCloseProp: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onCloseProp);
  closeRef.current = onCloseProp;
  useEffect(() => {
    const onClose = () => closeRef.current();
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = ref.current?.querySelector<HTMLElement>('[data-autofocus]') ?? ref.current?.querySelector<HTMLElement>('button');
    first?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      // Only the top-most overlay (a modal over a drawer) responds to the keyboard.
      const stack = document.querySelectorAll(':not([data-closing]) > [aria-modal="true"]');
      if (stack[stack.length - 1] !== ref.current) return;
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab' && ref.current) {
        const f = Array.from(ref.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])'));
        if (!f.length) return;
        const [a, z] = [f[0], f[f.length - 1]];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.({ preventScroll: true });
    };
  }, []);
  return ref;
}

const btnClass = (a: OverlayAction) => `btn btn-lg ${a.primary ? 'btn-primary' : a.danger ? 'btn-danger' : ''}`;

export function DrawerFrame(props: {
  eyebrow: string; title: string; sub?: string; kpis?: { label: string; value: ReactNode; tone?: Tone }[];
  stage?: number; sections?: OverlaySection[]; note?: ReactNode; actions?: OverlayAction[]; foot?: string; onClose: () => void; children?: ReactNode;
}) {
  const ref = useOverlayBehaviour(props.onClose);
  const closing = useClosing();
  return (
    <div className="overlay" role="presentation" data-closing={closing || undefined}>
      <div className="scrim" onClick={props.onClose} aria-hidden />
      <div className="drawer" ref={ref} role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <div className="drawer-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="eyebrow">{props.eyebrow}</div>
            <div className="ttl" id="drawer-title">{props.title}</div>
            {props.sub && <div className="sub">{props.sub}</div>}
          </div>
          <button type="button" className="btn" onClick={props.onClose}>Close</button>
        </div>
        <div className="drawer-body">
          {props.kpis && (
            <div className="drawer-kpis">
              {props.kpis.map((k) => (
                <div key={k.label}>
                  <div className="k">{k.label}</div>
                  <div className={`v ${tc(k.tone ?? 'ink')}`} title={typeof k.value === 'string' ? k.value : undefined}>{k.value}</div>
                </div>
              ))}
            </div>
          )}
          {props.stage != null && (
            <div className="drawer-sec">
              <div className="eyebrow">Stage progress</div>
              <StageTrack current={props.stage} compact />
            </div>
          )}
          {props.sections?.map((s) => (
            <div className="drawer-sec" key={s.head}>
              <div className="eyebrow">{s.head}</div>
              {s.rows.map((r, i) => <KV key={i} {...r} />)}
            </div>
          ))}
          {props.children}
          {props.note && <div className="note drawer-note">{props.note}</div>}
        </div>
        <div className="drawer-foot">
          {props.actions?.map((a) => <button type="button" key={a.label} className={btnClass(a)} onClick={a.onClick} disabled={a.disabled}>{a.label}</button>)}
          {props.foot && <span className="f">{props.foot}</span>}
        </div>
      </div>
    </div>
  );
}

export function ModalFrame(props: {
  eyebrow: string; title: string; sub?: string; rows?: OverlayRow[]; note?: ReactNode; actions: OverlayAction[]; foot?: string; onClose: () => void; children?: ReactNode; wide?: boolean;
}) {
  const ref = useOverlayBehaviour(props.onClose);
  const closing = useClosing();
  return (
    <div className="modal-wrap" role="presentation" data-closing={closing || undefined}>
      <div className="scrim" onClick={props.onClose} aria-hidden />
      <div className={`modal ${props.wide ? 'modal-wide' : ''}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-head">
          <div className="eyebrow">{props.eyebrow}</div>
          <div className="ttl" id="modal-title">{props.title}</div>
          {props.sub && <div className="sub">{props.sub}</div>}
        </div>
        {props.rows && <div className="modal-body">{props.rows.map((r, i) => <KV key={i} {...r} />)}</div>}
        {props.children}
        {props.note && <div className="note modal-note">{props.note}</div>}
        <div className="modal-foot">
          {props.actions.map((a, i) => (
            <button type="button" key={a.label} className={btnClass(a)} onClick={a.onClick} disabled={a.disabled} data-autofocus={i === 0 ? true : undefined}>{a.label}</button>
          ))}
          {props.foot && <span className="f">{props.foot}</span>}
        </div>
      </div>
    </div>
  );
}

import { useDemo } from '@/state/store';
import { bg } from '@/components/ui/primitives';

export function Toasts() {
  const { state } = useDemo();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {state.toasts.map((t) => (
        <div className={`toast ${t.leaving ? 'leaving' : ''}`} key={t.id}>
          <span className={`dot ${bg(t.tone)}`} aria-hidden />
          {t.msg}
        </div>
      ))}
    </div>
  );
}

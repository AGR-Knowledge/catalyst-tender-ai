import { useGo } from '@/state/nav';
import { useDemo } from '@/state/store';
import { Card } from '@/components/ui/primitives';

export function NotFound() {
  const { goRole, goPage } = useGo();
  const { state } = useDemo();
  return (
    <div className="view">
      <Card style={{ padding: '44px 28px', textAlign: 'center' }}>
        <div className="eyebrow">404</div>
        <div style={{ fontSize: 20, fontWeight: 600, marginTop: 6, letterSpacing: '-0.3px' }}>This page isn’t part of the workspace</div>
        <p style={{ color: 'var(--ink-4)', marginTop: 6, fontSize: 13 }}>The link may be out of date. Use the sidebar to find the page.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" onClick={() => goRole(state.role)}>Go to my dashboard</button>
          <button type="button" className="btn" onClick={() => goPage('/pipeline')}>Open the pipeline</button>
        </div>
      </Card>
    </div>
  );
}

import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { canSee, rolesWith, PAGE_LABEL, type CanCtx, type Capability, type PageKey } from '@/data/access';
import { roleOf } from '@/data/roles';
import { useDemo } from '@/state/store';
import { useGo } from '@/state/nav';
import { useWorld } from '@/domain/tenancy';
import { useCan } from '@/domain/permissions';
import { Card } from '@/components/ui/primitives';

function RestrictedCard({ title, body, children }: { title: string; body: ReactNode; children: ReactNode }) {
  return (
    <div className="view">
      <Card style={{ padding: '44px 28px', textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface-active)', display: 'grid', placeItems: 'center', margin: '0 auto 14px', color: 'var(--ink-3)' }}><Lock size={18} /></div>
        <div className="eyebrow">Outside your scope</div>
        <div style={{ fontSize: 20, fontWeight: 600, marginTop: 6, letterSpacing: '-0.3px' }}>{title}</div>
        <p style={{ color: 'var(--ink-4)', marginTop: 6, fontSize: 13, maxWidth: 520, marginInline: 'auto' }}>{body}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18, flexWrap: 'wrap' }}>{children}</div>
      </Card>
    </div>
  );
}

/** Legacy routes: renders the page only when the signed-in persona has it in scope. */
export function Guard({ page, children }: { page: PageKey; children: ReactNode }) {
  const { state } = useDemo();
  const { goRole } = useGo();
  const world = useWorld();
  if (canSee(state.role, page, world)) return <>{children}</>;
  const me = roleOf(state.role);
  const owners = rolesWith(page).map(roleOf);
  return (
    <RestrictedCard
      title={`${PAGE_LABEL[page]} isn’t part of the ${me.view}`}
      body={<>It is available to {owners.map((o) => o.short).join(', ')}. Access follows your role ({me.scope}) and is granted by an administrator.</>}
    >
      <button type="button" className="btn btn-primary" onClick={() => goRole(state.role)}>Go to my dashboard</button>
      {owners[0] && <button type="button" className="btn" onClick={() => goRole(owners[0].key, { announce: true })}><span className="demo-chip">Demo</span>View as {owners[0].name}</button>}
    </RestrictedCard>
  );
}

/** GCC routes: renders the page only when `can(cap, ctx)` allows it, otherwise the reason `can()` gives. */
export function GuardCap({ cap, ctx, children }: { cap: Capability; ctx?: Omit<CanCtx, 'viewAs'>; children: ReactNode }) {
  const check = useCan()(cap, ctx);
  const { goPage } = useGo();
  if (check.ok) return <>{children}</>;
  return (
    <RestrictedCard title="This page isn’t part of your role" body={`${check.reason}.`}>
      <button type="button" className="btn btn-primary" onClick={() => goPage('/')}>Go to my dashboard</button>
    </RestrictedCard>
  );
}

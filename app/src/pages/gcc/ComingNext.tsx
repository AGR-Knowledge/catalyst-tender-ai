/// <reference types="vite/client" />
import { Link, useLocation } from 'react-router-dom';
import { GuardCap } from '@/pages/Restricted';
import { NotFound } from '@/pages/NotFound';
import { Card } from '@/components/ui/primitives';
import { EmptyState } from '@/components/tender/EmptyState';
import { SCREENS } from './screens';

/** A working screen that isn't built yet: its name and what it will do. Dev builds also name the plan that builds it. */
export function ComingNext({ path }: { path?: string }) {
  const { pathname } = useLocation();
  const key = path ?? (pathname.replace(/\/+$/, '') || '/');
  const s = SCREENS[key];
  if (!s) return <NotFound />;
  const page = (
    <div className="view">
      <Card>
        <EmptyState
          title={s.name}
          body={<>{s.line} This screen isn’t part of the demo yet.{import.meta.env.DEV && <span className="t-muted"> Plan {s.plan}.</span>}</>}
          action={<Link className="btn btn-sm" to="/">Back to my dashboard</Link>}
        />
      </Card>
    </div>
  );
  return s.cap ? <GuardCap cap={s.cap}>{page}</GuardCap> : page;
}

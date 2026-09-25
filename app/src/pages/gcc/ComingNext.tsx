import { Link, useLocation } from 'react-router-dom';
import { GuardCap } from '@/pages/Restricted';
import { NotFound } from '@/pages/NotFound';
import { Card } from '@/components/ui/primitives';
import { EmptyState } from '@/components/tender/EmptyState';
import { SCREENS } from './screens';

/** A working screen that isn't built yet: its name, what it will do and which plan builds it. */
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
          body={`${s.line} Screen arrives with plan ${s.plan}.`}
          action={<Link className="btn btn-sm" to="/">Back to my dashboard</Link>}
        />
      </Card>
    </div>
  );
  return s.cap ? <GuardCap cap={s.cap}>{page}</GuardCap> : page;
}

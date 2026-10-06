import { lazy, Suspense } from 'react';
import { roleOf } from '@/data/roles';
import { useDemo } from '@/state/store';
import { useGo } from '@/state/nav';
import { useLive } from '@/domain/live';
import { useWorld } from '@/domain/tenancy';
import { WorkflowView } from './workflow/WorkflowView';

/*
 * `/workflow`, the user manual (plan 044): one page in both worlds. The
 * Indian preview reads its live counts from `useLive()`; a GCC company loads
 * its own wrapper (`pages/gcc/workflow`), which reads its lifecycles and
 * never this file's Indian modules.
 */
const GccWorkflow = lazy(() => import('@/pages/gcc/workflow/GccWorkflow'));

export function Workflow() {
  const gcc = useWorld() === 'gcc';
  if (gcc) return <Suspense fallback={<div className="view" aria-busy="true"><p className="eyebrow">Loading…</p></div>}><GccWorkflow /></Suspense>;
  return <LegacyWorkflow />;
}

/** The full-lifecycle preview: today's counts and its eight personas. */
function LegacyWorkflow() {
  const { state } = useDemo();
  const { goRole } = useGo();
  const live = useLive();
  return (
    <WorkflowView
      gateWaiting={live.gateCounts}
      liveIn={(k) => live.active.filter((t) => t.stage === k).length}
      stageOwner={(st) => ({ name: roleOf(st.role).name, short: roleOf(st.role).short, mine: st.role === state.role, go: () => goRole(st.role, { announce: true }) })}
      raciActor={(r) => ({ name: roleOf(r.key).name, short: roleOf(r.key).short, mine: r.key === state.role, go: () => goRole(r.key, { announce: true }) })}
      goMine={(st) => goRole(st.role)}
      switchVerb="View as"
    />
  );
}

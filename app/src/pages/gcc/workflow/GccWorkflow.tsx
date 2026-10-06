import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { switcherOf, type Person } from '@/data/people';
import type { RoleKey } from '@/data/types';
import { nameStop } from '@/data/tenants';
import { useDemo } from '@/state/store';
import { useTenant, useTenantKey } from '@/domain/tenancy';
import { currentOf, openGate, queriesFor } from '@/domain/gcc/lifecycle';
import { WorkflowView, type WorkflowActor } from '@/pages/workflow/WorkflowView';
import { gccGates, gccStages } from './manual';

/**
 * The user manual in a GCC company (plan 044): the same page as the Indian
 * preview, with this company's numbers (open DG1, DG2 and DG3 gates; live
 * tenders per stage, as the reader may see them) and this company's people
 * behind the persona buttons. A stage or row names a role by its title
 * ("Planning Manager"), so the person is matched on the title first and on
 * the role key after; a role with no person here has no button.
 */
export default function GccWorkflow() {
  const { state, setPerson, toast } = useDemo();
  const tenant = useTenantKey();
  const navigate = useNavigate();
  const { person, done } = state;
  const head = useTenant().headTitle;
  const stages = useMemo(() => gccStages(head), [head]);
  const gates = useMemo(() => gccGates(head), [head]);

  const counts = useMemo(() => {
    const live = queriesFor({ tenant, viewer: person, done }).live();
    const gates: Record<string, number> = { DG1: 0, DG2: 0, DG3: 0 };
    const stages = new Map<number, number>();
    for (const l of live) {
      const g = openGate(l)?.gate;
      if (g) gates[g] += 1;
      const n = currentOf(l).stage;
      stages.set(n, (stages.get(n) ?? 0) + 1);
    }
    return { gates, stages };
  }, [tenant, person, done]);

  const people = useMemo(() => switcherOf(tenant).filter((p) => p.tenant === tenant), [tenant]);
  const resolve = (label: string, role: RoleKey): Person | undefined =>
    people.find((p) => p.title === label)
    ?? people.find((p) => label.startsWith(`${p.title} `) || label.startsWith(`${p.title}/`) || p.title.startsWith(label))
    ?? people.find((p) => p.role === role);

  const actor = (p: Person | undefined): WorkflowActor | null => {
    if (!p) return null;
    return {
      name: p.name, short: p.title, mine: p.id === person.id,
      go: () => {
        setPerson(p.id);
        navigate('/');
        window.scrollTo({ top: 0 });
        toast(`Now acting as ${nameStop(`${p.name}, ${p.title}`)} Demo control`, 'ink3');
      },
    };
  };

  return (
    <WorkflowView
      gateWaiting={counts.gates}
      liveIn={(n) => counts.stages.get(n) ?? 0}
      stageOwner={(st) => actor(resolve(st.owner, st.role))}
      raciActor={(r) => actor(resolve(r.role, r.key))}
      goMine={() => navigate('/')}
      switchVerb="Act as"
      stages={stages}
      gates={gates}
    />
  );
}

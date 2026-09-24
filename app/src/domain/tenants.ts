import { HOME_TENANT, ONBOARDING, TENANTS, type Tenant } from '@/data/tenants';
import { useDemo } from '@/state/store';

export interface LiveTenant extends Tenant {
  steps: { key: string; label: string; detail: string; done: boolean }[];
  stepsDone: number;
  /** Onboarding finished and a go-live date booked. */
  scheduled: boolean;
  status: string;
  home: boolean;
}

export const stepKey = (tenant: string, step: string) => `tn-${tenant}-${step}`;
export const goLiveKey = (tenant: string) => `tn-${tenant}-golive`;

export function liveTenants(done: Record<string, string>, added: Tenant[]): LiveTenant[] {
  return [...TENANTS, ...added].map((t) => {
    const steps = ONBOARDING.map((s) => ({ ...s, done: t.doneSteps.includes(s.key) || !!done[stepKey(t.key, s.key)] }));
    const stepsDone = steps.filter((s) => s.done).length;
    const scheduled = !t.live && !!done[goLiveKey(t.key)];
    const status = t.live ? `Live since ${t.goLive}` : scheduled ? `Go-live booked for ${t.goLive}` : `Onboarding, ${stepsDone} of ${steps.length} steps`;
    return { ...t, steps, stepsDone, scheduled, status, home: t.key === HOME_TENANT };
  });
}

export function useTenants(): LiveTenant[] {
  const { state } = useDemo();
  return liveTenants(state.done, state.tenants);
}

export const homeTenant = () => TENANTS.find((t) => t.key === HOME_TENANT)!;

import { DEFAULT_TENANT, ONBOARDING, TENANTS, completeTenant, type ProfiledTenant, type Tenant } from '@/data/tenants';
import { PLATFORM_BUCKET, useDemo } from '@/state/store';

export interface LiveTenant extends ProfiledTenant {
  steps: { key: string; label: string; detail: string; done: boolean }[];
  stepsDone: number;
  /** Onboarding finished and a go-live date booked. */
  scheduled: boolean;
  status: string;
  /** The tenant the presenter is working in. */
  home: boolean;
}

/** Onboarding keys start with `tn-`, so the store keeps them in the platform bucket. */
export const stepKey = (tenant: string, step: string) => `tn-${tenant}-${step}`;
export const goLiveKey = (tenant: string) => `tn-${tenant}-golive`;

/** `platformDone` is the store's platform bucket, where onboarding ticks live. */
export function liveTenants(platformDone: Record<string, string>, added: Tenant[], active: string = DEFAULT_TENANT): LiveTenant[] {
  return [...TENANTS, ...added.map(completeTenant)].map((t) => {
    const steps = ONBOARDING.map((s) => ({ ...s, done: t.doneSteps.includes(s.key) || !!platformDone[stepKey(t.key, s.key)] }));
    const stepsDone = steps.filter((s) => s.done).length;
    const scheduled = !t.live && !!platformDone[goLiveKey(t.key)];
    const status = t.live ? `Live since ${t.goLive}` : scheduled ? `Go-live booked for ${t.goLive}` : `Onboarding, ${stepsDone} of ${steps.length} steps`;
    return { ...t, steps, stepsDone, scheduled, status, home: t.key === active };
  });
}

/** Every tenant on the platform, seeded and added. */
export function useTenants(): LiveTenant[] {
  const { state } = useDemo();
  return liveTenants(state.doneBy[PLATFORM_BUCKET] ?? {}, state.tenants, state.tenant);
}

/** The tenants a presenter can work in (not those still onboarding). */
export function useSwitchableTenants(): LiveTenant[] {
  return useTenants().filter((t) => t.switchable);
}

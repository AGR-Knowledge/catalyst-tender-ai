import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DEFAULT_TENANT, type TenantWorld } from '@/data/tenants';
import { useDemo } from '@/state/store';
import { useTenants, type LiveTenant } from './tenants';

/** The active tenant's key. */
export function useTenantKey(): string {
  return useDemo().state.tenant;
}

/** The active tenant: profile, currency, calendar and world. */
export function useTenant(): LiveTenant {
  const tenants = useTenants();
  const key = useTenantKey();
  return tenants.find((t) => t.key === key) ?? tenants.find((t) => t.key === DEFAULT_TENANT)!;
}

/** Which screens render: the full-lifecycle preview or the Stage 1–3 GCC build. */
export function useWorld(): TenantWorld {
  return useTenant().world;
}

/**
 * Demo control: switch tenant and land on its home, so a legacy route is never
 * shown under a GCC brand. Settings stays where it is.
 */
export function useSwitchTenant() {
  const { setTenant } = useDemo();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return useCallback((key: string) => {
    setTenant(key);
    if (!pathname.startsWith('/settings')) navigate('/');
    window.scrollTo({ top: 0 });
  }, [setTenant, navigate, pathname]);
}

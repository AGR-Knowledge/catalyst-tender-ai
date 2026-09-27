import { useEffect, useLayoutEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TENANT_BUILD } from '@/data/roles';
import { useDemo } from '@/state/store';
import { useTenant } from '@/domain/tenancy';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ViewAsBanner } from './ViewAsBanner';
import { DrawerHost } from '@/components/overlays/Drawers';
import { ModalHost } from '@/components/overlays/Modals';
import { Toasts } from '@/components/overlays/Toasts';
import { IntakeWatcher } from '@/components/intake/UploadButton';
import { accentVars } from '@/domain/gcc/admin/branding';
import { useBranding } from '@/domain/gcc/admin/useBranding';

export function AppShell() {
  const { state } = useDemo();
  const tenant = useTenant();
  const [navOpen, setNavOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => setNavOpen(false), [loc.pathname]);

  // Prospect branding (plan 024): the chosen accent replaces the company's brand tokens on the
  // document root, so portalled sheets and the focus ring follow. Before paint, so it never flashes.
  const accent = useBranding()?.accent;
  useLayoutEffect(() => {
    if (!accent) return;
    const root = document.documentElement.style;
    const vars = accentVars(accent);
    Object.entries(vars).forEach(([k, v]) => root.setProperty(k, v));
    return () => Object.keys(vars).forEach((k) => root.removeProperty(k));
  }, [accent]);

  useEffect(() => {
    if (!navOpen) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setNavOpen(false);
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [navOpen]);

  return (
    <div className="app">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="main-col">
        <Header onMenu={() => setNavOpen(true)} />
        <main className="content" id="main">
          <ViewAsBanner />
          <Outlet />
          {state.showBanner && (
            <div className="footer-note">
              <span>Prototype: indicative UI, illustrative data</span>
              <span className="r">Catalyst Tender AI for {tenant.name}, {TENANT_BUILD}</span>
            </div>
          )}
        </main>
      </div>
      <IntakeWatcher />
      <DrawerHost />
      <ModalHost />
      <Toasts />
    </div>
  );
}

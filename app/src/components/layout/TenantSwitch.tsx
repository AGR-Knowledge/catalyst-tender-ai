import { useRef, useState } from 'react';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { useDemo } from '@/state/store';
import { useClickOutside, useGo } from '@/state/nav';
import { useTenants, type LiveTenant } from '@/domain/tenants';
import { useSwitchTenant, useTenant } from '@/domain/tenancy';
import { useCan } from '@/domain/permissions';
import { nameStop, statusTone } from '@/data/tenants';
import { tc } from '@/components/ui/primitives';
import { LOGO_MAX_PX } from '@/domain/gcc/admin/branding';
import { useBranding } from '@/domain/gcc/admin/useBranding';

/** The tenant's two-letter mark in its own accent colour, or in the prospect's (plan 024). */
export const TenantMark = ({ t, small, accent }: { t: LiveTenant; small?: boolean; accent?: string }) => (
  <span className={`tn-mark accent-${accent ?? t.accent} ${small ? 'sm' : ''}`} aria-hidden>{t.monogram}</span>
);

/**
 * The company the presenter is working in. Switching is a demo control: it
 * changes the data, currency, calendar and brand. A tenant still onboarding
 * cannot be switched into; it opens its setup instead.
 */
export function TenantSwitch() {
  const { openDrawer, openModal } = useDemo();
  const { goPage } = useGo();
  const switchTo = useSwitchTenant();
  const tenants = useTenants();
  const current = useTenant();
  // Prospect branding (plan 024): the logo in place of the mark, the prospect's name in place of the company's, here only.
  const branding = useBranding();
  const shownName = branding?.displayName ?? current.name;
  // Tenant onboarding is a platform action (Catalyst operator only). Switching stays open to everyone: it is a demo control.
  const canAdd = useCan()('tenant.add').ok;
  const switchable = tenants.filter((t) => t.switchable);
  const onboarding = tenants.filter((t) => !t.switchable);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  return (
    <span className="pop-anchor" ref={ref}>
      <button type="button" className={`hd-pill hd-tenant ${branding?.logo ? 'has-logo' : ''} ${open ? 'open' : ''}`} onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label={`Company: ${nameStop(shownName)} Switch company (demo control)`} title={shownName}>
        {branding?.logo
          ? <img src={branding.logo.dataUrl} alt="" style={{ height: 20, maxHeight: LOGO_MAX_PX, maxWidth: 72, objectFit: 'contain', flex: 'none' }} />
          : <TenantMark t={current} small accent={branding?.accent} />}
        {/* The prospect's name always shows, capped with an ellipsis on narrower screens (components.css). */}
        <span className="hd-tenant-name">{shownName}</span>
        <ChevronDown size={12} className="t-muted" aria-hidden />
      </button>
      {open && (
        <div className="popover tn-pop" role="menu">
          <div className="pop-head"><span className="t"><span className="demo-chip">Demo</span>Switch company</span><span className="t-muted" style={{ fontSize: 11.5 }}>{tenants.length} on this platform</span></div>
          <div className="tn-list">
            {switchable.map((t) => (
              <button
                type="button" role="menuitemradio" aria-checked={t.home} key={t.key} className="pop-item tn-opt"
                onClick={() => { setOpen(false); if (!t.home) switchTo(t.key); }}
              >
                <TenantMark t={t} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="item-title" style={{ fontSize: 12.5 }}>{t.name}</span>
                  <span className="item-text" style={{ fontSize: 11.5, marginTop: 2 }}>{t.country} · {t.currency}{t.home ? ', you are here' : ''}</span>
                </span>
                {t.home && <Check size={14} className="t-green" aria-hidden style={{ marginTop: 4 }} />}
              </button>
            ))}
            {onboarding.length > 0 && <div className="pop-sub" role="presentation">Onboarding</div>}
            {onboarding.map((t) => (
              <button type="button" role="menuitem" key={t.key} className="pop-item tn-opt" onClick={() => { setOpen(false); openDrawer({ type: 'tenant', key: t.key }); }}>
                <TenantMark t={t} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="item-title" style={{ fontSize: 12.5 }}>{t.name}</span>
                  <span className={`item-text ${tc(statusTone(t.live, t.stepsDone))}`} style={{ fontSize: 11.5, marginTop: 2 }}>{t.status}</span>
                </span>
              </button>
            ))}
          </div>
          {canAdd && (
            <div className="pop-foot">
              <button type="button" className="btn-link" onClick={() => { setOpen(false); goPage('/settings#tenants'); }}>Manage tenants</button>
              <span style={{ flex: 1 }} />
              <button type="button" className="btn-link" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }} onClick={() => { setOpen(false); openModal({ type: 'tenant-add' }); }}><Plus size={13} aria-hidden />Add tenant</button>
            </div>
          )}
        </div>
      )}
    </span>
  );
}

import { useRef, useState } from 'react';
import { Building2, Check, ChevronDown, Plus } from 'lucide-react';
import { useDemo } from '@/state/store';
import { useClickOutside, useGo } from '@/state/nav';
import { useTenants } from '@/domain/tenants';
import { statusTone } from '@/data/tenants';
import { tc } from '@/components/ui/primitives';

/**
 * The tenant the user is working in, as in the dashboard wireframe's top bar.
 * Only live tenants hold tenders; one still onboarding opens its setup instead.
 */
export function TenantSwitch() {
  const { openDrawer, openModal } = useDemo();
  const { goPage } = useGo();
  const tenants = useTenants();
  const current = tenants.find((t) => t.home)!;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  return (
    <span className="pop-anchor" ref={ref}>
      <button type="button" className={`hd-pill hd-tenant ${open ? 'open' : ''}`} onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label={`Tenant: ${current.name}. Change tenant`}>
        <Building2 size={14} aria-hidden />
        <span className="hide-md">{current.name}</span>
        <ChevronDown size={12} className="t-muted" aria-hidden />
      </button>
      {open && (
        <div className="popover tn-pop" role="menu">
          <div className="pop-head"><span className="t">Tenants</span><span className="t-muted" style={{ fontSize: 11.5 }}>{tenants.length} on this platform</span></div>
          {tenants.map((t) => (
            <button
              type="button" role="menuitemradio" aria-checked={t.home} key={t.key} className="pop-item tn-opt"
              onClick={() => { setOpen(false); if (!t.home) openDrawer({ type: 'tenant', key: t.key }); }}
            >
              <span className="tn-mark" aria-hidden>{t.name.split(' ').filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join('')}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="item-title" style={{ fontSize: 12.5 }}>{t.name}</span>
                <span className={`item-text ${tc(statusTone(t.live, t.stepsDone))}`} style={{ fontSize: 11.5, marginTop: 2 }}>{t.home ? `${t.status}, you are here` : t.status}</span>
              </span>
              {t.home && <Check size={14} className="t-green" aria-hidden style={{ marginTop: 4 }} />}
            </button>
          ))}
          <div className="pop-foot">
            <button type="button" className="btn-link" onClick={() => { setOpen(false); goPage('/settings#tenants'); }}>Manage tenants</button>
            <span style={{ flex: 1 }} />
            <button type="button" className="btn-link" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }} onClick={() => { setOpen(false); openModal({ type: 'tenant-add' }); }}><Plus size={13} aria-hidden />Add tenant</button>
          </div>
        </div>
      )}
    </span>
  );
}

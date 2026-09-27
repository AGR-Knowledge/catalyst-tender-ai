import { useRef, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Activity, Building2, ChevronDown, KeyRound, LayoutGrid, Lock, Moon, Rocket, ShieldCheck, Sun } from 'lucide-react';
import { PERSON_GROUPS, roleLine, switcherOf, type Person } from '@/data/people';
import { can } from '@/data/access';
import { TENANT_BUILD } from '@/data/roles';
import { useDemo } from '@/state/store';
import { useTheme } from '@/state/theme';
import { useClickOutside } from '@/state/nav';
import { useTenant } from '@/domain/tenancy';
import { openBreakGlass } from '@/domain/platform/breakglass';
import { Toasts } from '@/components/overlays/Toasts';
import './platform.css';

/**
 * The Catalyst Platform Console's own shell (plan 011, spec §13, ui-direction
 * §5 G): Catalyst's mark, an "Operator" label, operator slate instead of a
 * tenant accent, no tenant switcher and no tenant sidebar. The persona menu is
 * the demo control back into the company the presenter came from.
 */

/** The console's sections, in page order. The rail scrolls to them. */
export const SECTIONS = [
  { id: 'plc-overview', label: 'Overview', Icon: LayoutGrid },
  { id: 'plc-tenants', label: 'Tenants', Icon: Building2 },
  { id: 'plc-releases', label: 'Releases', Icon: Rocket },
  { id: 'plc-guardrails', label: 'Guardrails', Icon: ShieldCheck },
  { id: 'plc-breakglass', label: 'Break-glass', Icon: KeyRound },
] as const;

function PersonOpt({ p, on, onPick }: { p: Person; on: boolean; onPick: () => void }) {
  return (
    <button type="button" role="menuitemradio" aria-checked={on} className={`role-opt ${on ? 'on' : ''}`} onClick={onPick}>
      <span className={`avatar sm ${on ? '' : 'soft'}`}>{p.initials}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="t">{p.name}</span>
        <span className="s">{roleLine(p)}</span>
      </span>
      {on && <span className="t-green" style={{ fontSize: 11, marginTop: 6 }}>✓</span>}
    </button>
  );
}

export default function PlatformShell() {
  const { state, setPerson, toast } = useDemo();
  const { resolved, toggle } = useTheme();
  const tenant = useTenant();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [on, setOn] = useState<string>(SECTIONS[0].id);
  const menuRef = useRef<HTMLSpanElement>(null);
  useClickOutside(menuRef, () => setMenu(false), menu);

  const me = state.realPerson;
  // Only Catalyst operators open the console; anyone else goes to their own dashboard.
  if (!can(me, 'platform.console').ok) return <Navigate to="/" replace />;

  const open = Object.values(state.doneBy).reduce((n, d) => n + openBreakGlass(d).length, 0);
  const groups = PERSON_GROUPS.map((g) => ({ g, people: switcherOf(state.tenant).filter((p) => p.group === g) })).filter((x) => x.people.length);

  const pick = (p: Person) => {
    setMenu(false);
    if (p.id === me.id) return;
    setPerson(p.id);
    navigate('/');
    window.scrollTo({ top: 0 });
    toast(`Now acting as ${p.name}, ${p.title.replace(/\.$/, '')}. Demo control`, 'ink3');
  };
  const go = (id: string) => {
    setOn(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="plc">
      <aside className="plc-rail" aria-label="Platform Console">
        <div className="plc-brand">
          <span className="plc-mark" aria-hidden>C</span>
          <div style={{ minWidth: 0 }}>
            <div className="plc-name">Catalyst</div>
            <div className="plc-tag">Platform Console</div>
          </div>
        </div>
        <nav className="plc-nav" aria-label="Console sections">
          <div className="plc-nav-label">Estate</div>
          {SECTIONS.map(({ id, label, Icon }) => (
            <button key={id} type="button" className={`plc-nav-item ${on === id ? 'on' : ''}`} aria-current={on === id ? 'true' : undefined} onClick={() => go(id)}>
              <Icon aria-hidden />
              <span>{label}</span>
              {id === 'plc-breakglass' && <span className={`n ${open ? 'open' : ''}`} aria-label={`${open} open`}>{open}</span>}
            </button>
          ))}
        </nav>
        <div className="plc-rail-foot">
          <Lock size={13} aria-hidden />
          <span>Operators see counts and health. Tender content stays locked in each tenant.</span>
        </div>
      </aside>

      <div className="plc-main">
        <header className="plc-top">
          <div className="plc-top-t">
            <h1>Platform Console</h1>
            <p>Every tenant’s health, counts and spend. No tender content.</p>
          </div>
          <span className="plc-op"><Activity aria-hidden />Operator</span>
          <div className="plc-acts">
            <button type="button" className="btn btn-icon" onClick={toggle} aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`}>
              {resolved === 'dark' ? <Sun /> : <Moon />}
            </button>
            <div className="hd-sep" />
            <span className="pop-anchor plc-me" ref={menuRef}>
              <button
                type="button" className={`profile-btn ${menu ? 'open' : ''}`} onClick={() => setMenu(!menu)} aria-haspopup="menu" aria-expanded={menu}
                aria-label={`Persona: ${me.name}, ${me.title}. Switch persona (demo control)`} title={`${me.name}, ${me.title}`}
              >
                <span className="avatar">{me.initials}</span>
                <ChevronDown size={12} className="caret t-muted" aria-hidden />
              </button>
              {menu && (
                <div className="popover" style={{ width: 340 }} role="menu" aria-label="Switch persona">
                  <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--line-2)' }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{me.name}, {me.title}</span>
                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-5)', marginTop: 1 }}>Catalyst platform. Not a user of any tenant</span>
                  </div>
                  <div style={{ padding: '8px 8px 4px', maxHeight: 'min(520px, 66vh)', overflowY: 'auto' }}>
                    <div className="eyebrow" style={{ padding: '4px 10px 7px', display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className="demo-chip">Demo</span>Back to {tenant.name}
                    </div>
                    {groups.map(({ g, people }) => (
                      <div key={g} role="group" aria-label={g}>
                        <div className="eyebrow" style={{ padding: '8px 10px 4px', fontSize: 11.5, color: 'var(--ink-5)' }}>{g}</div>
                        {people.map((p) => <PersonOpt key={p.id} p={p} on={p.id === me.id} onPick={() => pick(p)} />)}
                      </div>
                    ))}
                  </div>
                  <div className="pop-foot"><span style={{ flex: 1 }}>In production Catalyst operators sign in to the console only.</span></div>
                </div>
              )}
            </span>
          </div>
        </header>
        <main className="plc-content" id="main">
          <Outlet />
        </main>
        {state.showBanner && (
          <div className="plc-foot">
            <span>Prototype: indicative UI, illustrative data</span>
            <span className="r">Catalyst Platform Console, {TENANT_BUILD}</span>
          </div>
        )}
      </div>
      <Toasts />
    </div>
  );
}

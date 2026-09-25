import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, ChevronDown, ChevronRight, Eye, Menu, Moon, RotateCcw, Sun } from 'lucide-react';
import { WALK_ORDER, roleOf } from '@/data/roles';
import { PERSON_GROUPS, peopleOf, roleLine, switcherOf, type Person } from '@/data/people';
import { can } from '@/data/access';
import { SUPPLIER_TOTAL } from '@/data/catalog';
import { useDemo } from '@/state/store';
import { useTheme } from '@/state/theme';
import { useLive, FOCUS_ID } from '@/domain/live';
import { TODAY_LABEL, plural } from '@/domain/format';
import { useClickOutside, useGo } from '@/state/nav';
import { useTenant } from '@/domain/tenancy';
import { DEMO_TODAY, dateText } from '@/domain/calendar';
import { bg } from '@/components/ui/primitives';
import { GlobalSearch } from './Search';
import { UploadButton } from '@/components/intake/UploadButton';
import { TenantSwitch } from './TenantSwitch';
import { screenHead } from '@/pages/gcc/screens';

function usePageHead() {
  const { state } = useDemo();
  const live = useLive();
  const { pathname } = useLocation();
  const path = pathname.split('/')[1] || 'dashboard';
  const role = roleOf(state.role);
  const tenant = useTenant();
  const t = live.byId(FOCUS_ID)!;
  // GCC tenants: titles come from the GCC screen map; the legacy alerts read Indian data, so they are not shown.
  if (tenant.world === 'gcc') {
    if (path === 'settings') return { title: 'Settings', sub: 'Sources, people, appearance and the demo session.' };
    const head = screenHead(pathname);
    return head ? { title: head.title, sub: head.sub ?? `${dateText(DEMO_TODAY)} · ${tenant.hqCity}` } : { title: 'Not found', sub: 'This page does not exist in the workspace.' };
  }
  const waiting = live.alertsFor(state.role).length;
  const heads: Record<string, { title: string; sub: string }> = {
    dashboard: { title: role.view, sub: `${TODAY_LABEL.replace(/^\w+, /, '')}, ${waiting ? `${plural(waiting, 'item')} waiting on you` : 'nothing waiting on you'}` },
    workflow: { title: 'Envisaged Product Workflow', sub: 'Nine stages, ten agents, three mandatory human gates. Select a stage for its agent, owner and outputs.' },
    agents: { title: 'Agent Console', sub: 'Status, guardrails and evaluation scores for the ten agents. Operations and AI governance only.' },
    pipeline: { title: 'Pipeline', sub: 'Live pursuits in the bid office.' },
    submission: { title: 'Submission desk', sub: `${t.id} · ${t.name}: packaging, signatures and portal submission. Milestone M3.` },
    suppliers: { title: 'Supplier database', sub: `${SUPPLIER_TOTAL} screened suppliers, scored on delivered performance.` },
    library: { title: 'Artefacts library', sub: 'Past-bid content available to the Drafting Agent.' },
    intake: { title: 'Uploaded documents', sub: 'Tender documents read by the Intake Agent, with every field linked to its page.' },
    settings: { title: 'Settings', sub: 'Sources, gates, appearance and the demo session.' },
    boq: { title: 'BOQ and rates', sub: 'Bill of quantities for each bid, with every rate compared against the same item on other bids.' },
  };
  return heads[path] ?? { title: 'Not found', sub: 'This page does not exist in the workspace.' };
}

/** A person row in the GCC persona menu: avatar, name, role line and the one-line hint. */
function PersonOpt({ p, on, onPick, compact }: { p: Person; on: boolean; onPick: () => void; compact?: boolean }) {
  return (
    <button type="button" role="menuitemradio" aria-checked={on} className={`role-opt ${on ? 'on' : ''}`} onClick={onPick}>
      <span className={`avatar sm ${on ? '' : 'soft'}`}>{p.initials}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="t">{p.name}</span>
        <span className="s">{roleLine(p)}</span>
        {!compact && <span className="s" style={{ color: 'var(--ink-6)', marginTop: 2 }}>{p.hint}</span>}
      </span>
      {on && <span className="t-green" style={{ fontSize: 11, marginTop: 6 }}>✓</span>}
    </button>
  );
}

export function Header({ onMenu }: { onMenu: () => void }) {
  const { state, openDrawer, openModal, toast, setPerson, startViewAs } = useDemo();
  const { resolved, toggle } = useTheme();
  const live = useLive();
  const { goRole, goSection, goPage } = useGo();
  const { pathname } = useLocation();
  const head = usePageHead();
  const role = roleOf(state.role);
  const tenant = useTenant();
  const gcc = tenant.world === 'gcc';

  const [notif, setNotif] = useState(false);
  const [profile, setProfile] = useState(false);
  const [viewList, setViewList] = useState(false);
  const notifRef = useRef<HTMLSpanElement>(null);
  const profileRef = useRef<HTMLSpanElement>(null);
  useClickOutside(notifRef, () => setNotif(false), notif);
  useClickOutside(profileRef, () => setProfile(false), profile);

  const alerts = gcc ? [] : live.alertsFor(state.role);

  // GCC persona menu: the tenant's people by group; the Head of Tendering can also View as anyone else.
  const me = state.realPerson;
  const groups = PERSON_GROUPS.map((g) => ({ g, people: switcherOf(state.tenant).filter((p) => p.group === g) })).filter((x) => x.people.length);
  const viewable = can(me, 'view.as').ok ? peopleOf(state.tenant).filter((p) => p.id !== me.id) : [];
  const pickPerson = (p: Person) => {
    setProfile(false);
    if (p.id === me.id && !state.viewAs) return;
    setPerson(p.id);
    // Settings stays where it is, as with a company switch.
    if (!pathname.startsWith('/settings')) goPage('/');
    toast(`Now acting as ${p.name}, ${p.title}. Demo control`, 'ink3');
  };
  const pickView = (p: Person) => {
    setProfile(false);
    setViewList(false);
    startViewAs(p.id);
  };

  return (
    <header className="header">
      <button type="button" className="btn btn-icon hd-menu" onClick={onMenu} aria-label="Open navigation"><Menu /></button>
      <div className="hd-title">
        <h1>{head.title}</h1>
        <p title={head.sub}>{head.sub}</p>
      </div>
      <div className="hd-actions">
        <TenantSwitch />
        {/* Search and upload read the Indian register; GCC tenants get their own with plans 006 and 007. */}
        {!gcc && <GlobalSearch />}
        {!gcc && <UploadButton />}

        <span className="pop-anchor" ref={notifRef}>
          <button type="button" className="hd-pill" onClick={() => { setNotif(!notif); setProfile(false); }} aria-haspopup="dialog" aria-expanded={notif} aria-label={`Alerts, ${alerts.length} open`}>
            <Bell size={14} aria-hidden />
            <span className="hide-sm">Alerts</span>
            <span className={`count ${alerts.length ? 't-red' : 't-muted'}`}>{alerts.length}</span>
          </button>
          {notif && (
            <div className="popover" role="dialog" aria-label="Agent alerts">
              <div className="pop-head"><span className="t">Alerts for {state.person.name}</span><button type="button" className="btn-link" style={{ color: 'var(--ink-4)' }} onClick={() => setNotif(false)}>Close</button></div>
              {alerts.length === 0 && <div className="pop-empty">{gcc ? 'No alerts yet.' : 'Nothing waiting on you.'}</div>}
              {alerts.map((a) => (
                <button type="button" key={a.key} className="pop-item" onClick={() => {
                  setNotif(false);
                  if (a.tender) openDrawer({ type: 'tender', id: a.tender });
                  else if (a.anchor) goSection(a.anchor);
                }}>
                  <span className={`bar-rail ${bg(a.tone)}`} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="item-title" style={{ fontSize: 12.5 }}>{a.title}</span>
                    <span className="item-text" style={{ fontSize: 11.5, marginTop: 2 }}>{a.body}</span>
                  </span>
                  <span className="t-muted" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{a.when}</span>
                </button>
              ))}
              <div className="pop-foot">Alerts are logged to the audit trail.</div>
            </div>
          )}
        </span>

        <button type="button" className="btn btn-icon" onClick={toggle} aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`}>
          {resolved === 'dark' ? <Sun /> : <Moon />}
        </button>

        <div className="hd-sep" />

        <span className="pop-anchor" ref={profileRef}>
          {gcc ? (
            <button type="button" className={`profile-btn ${profile ? 'open' : ''}`} onClick={() => { setProfile(!profile); setNotif(false); setViewList(false); }} aria-haspopup="menu" aria-expanded={profile} aria-label={`Persona: ${me.name}, ${me.title}. Switch persona (demo control)`} title={`${me.name}, ${me.title}`}>
              <span className="avatar">{me.initials}</span>
              <ChevronDown size={12} className="caret t-muted" aria-hidden />
            </button>
          ) : (
            <button type="button" className={`profile-btn ${profile ? 'open' : ''}`} onClick={() => { setProfile(!profile); setNotif(false); }} aria-haspopup="menu" aria-expanded={profile} aria-label={`Signed in as ${role.name}, ${role.title}. Switch view`} title={`${role.name}, ${role.title}`}>
              <span className="avatar">{role.initials}</span>
              <ChevronDown size={12} className="caret t-muted" aria-hidden />
            </button>
          )}
          {profile && gcc && (
            <div className="popover" style={{ width: 360 }} role="menu" aria-label="Switch persona">
              <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--line-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="avatar sm">{me.initials}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{me.name}, {roleLine(me)}</span>
                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-5)', marginTop: 1 }}>
                      {me.tenant === '*' ? 'Catalyst platform' : tenant.name}{state.viewAs ? `, viewing as ${state.person.name}` : ''}
                    </span>
                  </span>
                </div>
              </div>
              <div style={{ padding: '8px 8px 4px', maxHeight: 'min(520px, 66vh)', overflowY: 'auto' }}>
                <div className="eyebrow" style={{ padding: '4px 10px 7px', display: 'flex', gap: 6, alignItems: 'center' }}><span className="demo-chip">Demo</span>Switch persona</div>
                {groups.map(({ g, people }) => (
                  <div key={g} role="group" aria-label={g}>
                    <div className="eyebrow" style={{ padding: '8px 10px 4px', fontSize: 11.5, color: 'var(--ink-5)' }}>{g}</div>
                    {people.map((p) => <PersonOpt key={p.id} p={p} on={p.id === me.id} onPick={() => pickPerson(p)} />)}
                  </div>
                ))}
                {viewable.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--line-2)', marginTop: 6, paddingTop: 6 }}>
                    <button type="button" role="menuitem" className="role-opt" aria-expanded={viewList} onClick={() => setViewList(!viewList)}>
                      <Eye size={14} aria-hidden style={{ marginTop: 3, color: 'var(--ink-4)' }} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="t">View as…</span>
                        <span className="s">See the workspace as someone else, read only. Logged in the audit trail.</span>
                      </span>
                      <ChevronRight size={14} aria-hidden style={{ marginTop: 3, color: 'var(--ink-5)', transform: viewList ? 'rotate(90deg)' : undefined, transition: 'transform var(--dur-fast) ease' }} />
                    </button>
                    {viewList && (
                      <div role="group" aria-label="View as">
                        {viewable.map((p) => <PersonOpt key={p.id} p={p} compact on={p.id === state.viewAs} onPick={() => pickView(p)} />)}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="pop-foot">
                <span style={{ flex: 1 }}>In production each user signs in to their own view.</span>
                <button type="button" className="btn-link" style={{ color: 'var(--ink-3)', display: 'inline-flex', gap: 5, alignItems: 'center' }} onClick={() => { setProfile(false); openModal({ type: 'reset' }); }}><RotateCcw size={12} />Reset demo</button>
                <button type="button" className="btn-link" style={{ color: 'var(--ink-3)' }} onClick={() => { setProfile(false); toast('Session ended. Sign in again to resume', 'ink3'); }}>Sign out</button>
              </div>
            </div>
          )}
          {profile && !gcc && (
            <div className="popover" style={{ width: 340 }} role="menu">
              <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--line-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="avatar sm">{role.initials}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{role.name}, {role.short}</span>
                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-5)', marginTop: 1 }}>{tenant.name}, {role.scope}</span>
                  </span>
                </div>
              </div>
              <div style={{ padding: '8px 8px 4px', maxHeight: 'min(390px, 55vh)', overflowY: 'auto' }}>
                <div className="eyebrow" style={{ padding: '4px 10px 7px', display: 'flex', gap: 6, alignItems: 'center' }}><span className="demo-chip">Demo</span>Switch persona, in hand-over order</div>
                {WALK_ORDER.map(roleOf).map((r, n) => {
                  const on = r.key === state.role;
                  return (
                    <button type="button" role="menuitemradio" aria-checked={on} key={r.key} className={`role-opt ${on ? 'on' : ''}`} onClick={() => { setProfile(false); goRole(r.key, { announce: true }); }}>
                      <span className="role-n" aria-hidden>{n + 1}</span>
                      <span className={`avatar sm ${on ? '' : 'soft'}`}>{r.initials}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="t">{r.title}</span>
                        <span className="s">{r.name}, {r.view}</span>
                      </span>
                      {live.roleAttention[r.key] && !on && <span className="dot bg-orange pulse" style={{ marginTop: 10 }} title="Needs attention" />}
                      {on && <span className="t-green" style={{ fontSize: 11, marginTop: 6 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
              <div className="pop-foot">
                <span style={{ flex: 1 }}>In production each user signs in to their own view.</span>
                <button type="button" className="btn-link" style={{ color: 'var(--ink-3)', display: 'inline-flex', gap: 5, alignItems: 'center' }} onClick={() => { setProfile(false); openModal({ type: 'reset' }); }}><RotateCcw size={12} />Reset demo</button>
                <button type="button" className="btn-link" style={{ color: 'var(--ink-3)' }} onClick={() => { setProfile(false); toast('Session ended. Sign in again to resume', 'ink3'); }}>Sign out</button>
              </div>
            </div>
          )}
        </span>
      </div>
    </header>
  );
}

import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, ChevronDown, Menu, Moon, RotateCcw, Sun } from 'lucide-react';
import { TENANT, WALK_ORDER, roleOf } from '@/data/roles';
import { SUPPLIER_TOTAL } from '@/data/catalog';
import { useDemo } from '@/state/store';
import { useTheme } from '@/state/theme';
import { useLive, FOCUS_ID } from '@/domain/live';
import { TODAY_LABEL, plural } from '@/domain/format';
import { useClickOutside, useGo } from '@/state/nav';
import { bg } from '@/components/ui/primitives';
import { GlobalSearch } from './Search';
import { UploadButton } from '@/components/intake/UploadButton';
import { TenantSwitch } from './TenantSwitch';

function usePageHead() {
  const { state } = useDemo();
  const live = useLive();
  const path = useLocation().pathname.split('/')[1] || 'dashboard';
  const role = roleOf(state.role);
  const t = live.byId(FOCUS_ID)!;
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
    settings: { title: 'Settings', sub: 'Tenants, sources, gates, appearance and who holds which role.' },
    boq: { title: 'BOQ and rates', sub: 'Bill of quantities for each bid, with every rate compared against the same item on other bids.' },
  };
  return heads[path] ?? { title: 'Not found', sub: 'This page does not exist in the workspace.' };
}

export function Header({ onMenu }: { onMenu: () => void }) {
  const { state, openDrawer, openModal, toast } = useDemo();
  const { resolved, toggle } = useTheme();
  const live = useLive();
  const { goRole, goSection } = useGo();
  const head = usePageHead();
  const role = roleOf(state.role);

  const [notif, setNotif] = useState(false);
  const [profile, setProfile] = useState(false);
  const notifRef = useRef<HTMLSpanElement>(null);
  const profileRef = useRef<HTMLSpanElement>(null);
  useClickOutside(notifRef, () => setNotif(false), notif);
  useClickOutside(profileRef, () => setProfile(false), profile);

  const alerts = live.alertsFor(state.role);

  return (
    <header className="header">
      <button type="button" className="btn btn-icon hd-menu" onClick={onMenu} aria-label="Open navigation"><Menu /></button>
      <div className="hd-title">
        <h1>{head.title}</h1>
        <p title={head.sub}>{head.sub}</p>
      </div>
      <div className="hd-actions">
        <TenantSwitch />
        <GlobalSearch />
        <UploadButton />

        <span className="pop-anchor" ref={notifRef}>
          <button type="button" className="hd-pill" onClick={() => { setNotif(!notif); setProfile(false); }} aria-haspopup="dialog" aria-expanded={notif} aria-label={`Alerts, ${alerts.length} open`}>
            <Bell size={14} aria-hidden />
            <span className="hide-sm">Alerts</span>
            <span className={`count ${alerts.length ? 't-red' : 't-muted'}`}>{alerts.length}</span>
          </button>
          {notif && (
            <div className="popover" role="dialog" aria-label="Agent alerts">
              <div className="pop-head"><span className="t">Alerts for {role.name}</span><button type="button" className="btn-link" style={{ color: 'var(--ink-4)' }} onClick={() => setNotif(false)}>Close</button></div>
              {alerts.length === 0 && <div className="pop-empty">Nothing waiting on you.</div>}
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
          <button type="button" className={`profile-btn ${profile ? 'open' : ''}`} onClick={() => { setProfile(!profile); setNotif(false); }} aria-haspopup="menu" aria-expanded={profile} aria-label={`Signed in as ${role.name}, ${role.title}. Switch view`} title={`${role.name}, ${role.title}`}>
            <span className="avatar">{role.initials}</span>
            <ChevronDown size={12} className="caret t-muted" aria-hidden />
          </button>
          {profile && (
            <div className="popover" style={{ width: 340 }} role="menu">
              <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--line-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="avatar sm">{role.initials}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{role.name}, {role.short}</span>
                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-5)', marginTop: 1 }}>{TENANT}, {role.scope}</span>
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

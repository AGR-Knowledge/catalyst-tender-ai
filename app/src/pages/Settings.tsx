import { Monitor, Moon, RotateCcw, Sun } from 'lucide-react';
import { CONTROL_POINTS, SOURCES } from '@/data/catalog';
import { ROLES } from '@/data/roles';
import { useDemo } from '@/state/store';
import { useTheme, type ThemePref } from '@/state/theme';
import { useGo } from '@/state/nav';
import { Card, CardFoot, CardHead, tc } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

const THEMES: { key: ThemePref; label: string; icon: JSX.Element }[] = [
  { key: 'light', label: 'Light', icon: <Sun /> },
  { key: 'dark', label: 'Dark', icon: <Moon /> },
  { key: 'system', label: 'System', icon: <Monitor /> },
];

export function Settings() {
  const { state, setBanner, openModal, toast } = useDemo();
  const { pref, setPref } = useTheme();
  const { goRole } = useGo();
  const actions = Object.keys(state.done).length;

  return (
    <div className="view">
      <div className="split" style={{ '--cols': '1fr 1fr' } as React.CSSProperties}>
        <Card>
          <CardHead title="Sources watched" meta="Intake Agent · Stage 1" />
          {SOURCES.map((x) => (
            <div className="item" key={x.name} style={{ alignItems: 'center', padding: '12px 22px' }}>
              <span className="item-body"><span className="item-title" style={{ fontSize: 13 }}>{x.name}</span><span className="item-text" style={{ fontSize: 11.5, marginTop: 2 }}>{x.mode}</span></span>
              <span className={tc(x.tone)} style={{ fontSize: 12 }}>{x.state}</span>
            </div>
          ))}
        </Card>
        <Card>
          <CardHead title="Gates and control points" meta="Cannot be bypassed" />
          <DataTable
            rows={CONTROL_POINTS}
            rowKey={(x) => x.name}
            columns={[
              { key: 'n', header: 'Control point', width: '1.6fr', primary: true, render: (x) => (<><span className="cell-main" style={{ fontSize: 13 }}>{x.name}</span><span className="cell-sub">{x.state}</span></>) },
              { key: 'o', header: 'Owner', width: '1fr', render: (x) => x.owner },
              { key: 's', header: 'SLA / at', width: '.6fr', align: 'right', render: (x) => <span className="num">{x.sla}</span> },
            ]}
          />
        </Card>
      </div>

      <Card style={{ marginTop: 'var(--gap)' }}>
        <CardHead title="Users and roles" meta="Administrator only" />
        <div className="users">
          {ROLES.map((r) => (
            <button type="button" key={r.key} className="user" onClick={() => toast(`${r.name}: role, tender scope and gate authority opened (admin only)`, 'ink3')}>
              <span className="avatar sm soft">{r.initials}</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 500 }}>{r.name}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-4)', marginTop: 1 }}>{r.title}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-5)', marginTop: 3 }}>{r.scope}</span>
              </span>
            </button>
          ))}
        </div>
        <CardFoot>Only an administrator can change a user's role. Persona switches from the profile menu are logged.</CardFoot>
      </Card>

      <div className="split" style={{ '--cols': '1fr 1fr', marginTop: 'var(--gap)' } as React.CSSProperties}>
        <Card>
          <CardHead title="Appearance" meta="Saved on this device" />
          <div className="setting">
            <div><div className="setting-t">Theme</div><div className="setting-s">Follow the system, or fix light or dark for the demo room.</div></div>
            <div className="seg" role="radiogroup" aria-label="Theme">
              {THEMES.map((t) => (
                <button type="button" role="radio" aria-checked={pref === t.key} key={t.key} className={pref === t.key ? 'on' : ''} onClick={() => setPref(t.key)}>{t.icon}{t.label}</button>
              ))}
            </div>
          </div>
          <div className="setting">
            <div><div className="setting-t">Prototype footer</div><div className="setting-s">Shows the “indicative UI, illustrative data” note under every page.</div></div>
            <button type="button" role="switch" aria-checked={state.showBanner} className={`switch ${state.showBanner ? 'on' : ''}`} onClick={() => setBanner(!state.showBanner)}><span /></button>
          </div>
        </Card>
        <Card>
          <CardHead title="Demo session" meta={`${actions} action${actions === 1 ? '' : 's'} recorded`} />
          <div className="setting">
            <div><div className="setting-t">Guided walk-through</div><div className="setting-s">Starts at the Tender Coordinator and hands the tender role to role through all eight dashboards.</div></div>
            <button type="button" className="btn" onClick={() => goRole('coord', { announce: 'Walk-through started at Stage 1 with the Tender Coordinator' })}>Start</button>
          </div>
          <div className="setting">
            <div><div className="setting-t">Reset demo</div><div className="setting-s">Re-opens every gate, validation and decision. Theme and current view are kept.</div></div>
            <button type="button" className="btn btn-danger" onClick={() => openModal({ type: 'reset' })} disabled={!actions}><RotateCcw size={13} />Reset</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Monitor, Moon, Plus, RotateCcw, Sun } from 'lucide-react';
import { useTenants } from '@/domain/tenants';
import { useTenant } from '@/domain/tenancy';
import { statusTone } from '@/data/tenants';
import { TENANT } from '@/data/roles';
import { CONTROL_POINTS, SOURCES } from '@/data/catalog';
import { PERSON_GROUPS, peopleOf, roleLine } from '@/data/people';
import { useDemo } from '@/state/store';
import { useCan } from '@/domain/permissions';
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
  const { state, setBanner, openModal, openDrawer, toast } = useDemo();
  const tenants = useTenants();
  const loc = useLocation();
  useEffect(() => {
    if (!loc.hash) return;
    const t = window.setTimeout(() => document.getElementById(loc.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    return () => window.clearTimeout(t);
  }, [loc.hash, loc.key]);
  const { pref, setPref } = useTheme();
  const { goRole } = useGo();
  const tenant = useTenant();
  const gcc = tenant.world === 'gcc';
  const can = useCan();
  const canTenants = can('tenant.add').ok;
  const canUsers = can('admin.users').ok;
  const people = peopleOf(state.tenant);
  // Reset works on this company or on all of them, so it is available while any company has actions.
  const actions = Object.keys(state.done).length;
  const anyActions = Object.values(state.doneBy).some((d) => Object.keys(d).length > 0) || Object.values(state.auditBy).some((a) => a.length > 0);

  return (
    <div className="view">
      {canTenants && (
      <Card id="tenants" style={{ marginBottom: 'var(--gap)' }}>
        <CardHead title="Tenants" meta="Platform administrator only">
          <button type="button" className="btn" onClick={() => openModal({ type: 'tenant-add' })}><Plus size={14} aria-hidden />Add tenant</button>
        </CardHead>
        <DataTable
          rows={tenants}
          rowKey={(t) => t.key}
          onRowClick={(t) => openDrawer({ type: 'tenant', key: t.key })}
          rowLabel={(t) => `Open ${t.name}`}
          columns={[
            { key: 'n', header: 'Tenant', width: '1.7fr', primary: true, render: (t) => (<><span className="cell-main">{t.name}{t.home && <span className="t-ink4" style={{ fontWeight: 400 }}>, current</span>}</span><span className="cell-sub">{t.country}, {t.currency}</span></>) },
            { key: 'r', header: 'Data residency', width: '1.2fr', priority: 2, render: (t) => t.residency },
            { key: 'a', header: 'Admin', width: '1fr', priority: 3, render: (t) => t.admin },
            { key: 'u', header: 'Seats', width: '.5fr', align: 'right', priority: 2, render: (t) => <span className="num">{t.seats}</span> },
            { key: 's', header: 'Status', width: '1.3fr', align: 'right', render: (t) => <span className={tc(statusTone(t.live, t.stepsDone))}>{t.status}</span> },
          ]}
        />
        <CardFoot>Each tenant has its own documents, users, rate library and past bids, held in its own region. Switch company from the top bar (a demo control).</CardFoot>
      </Card>
      )}

      {gcc ? (
        // GCC companies show their own sources. Source health arrives with plan 007.
        <Card>
          <CardHead title="Sources watched" meta={tenant.name} />
          {tenant.sources.map((x) => (
            <div className="item" key={x.name} style={{ alignItems: 'center', padding: '12px 22px' }}>
              <span className="item-body"><span className="item-title" style={{ fontSize: 13 }}>{x.name}</span><span className="item-text" style={{ fontSize: 11.5, marginTop: 2 }}>{x.mode}</span></span>
            </div>
          ))}
        </Card>
      ) : (
      <div className="split" style={{ '--cols': '1fr 1fr' } as React.CSSProperties}>
        <Card>
          <CardHead title="Sources watched" meta={TENANT} />
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
      )}

      {canUsers ? (
        <Card style={{ marginTop: 'var(--gap)' }}>
          <CardHead title="Users and roles" meta={`${tenant.headTitle} only`} />
          {PERSON_GROUPS.map((g) => {
            const inGroup = people.filter((p) => p.group === g);
            if (!inGroup.length) return null;
            return (
              <div key={g}>
                <div className="eyebrow" style={{ padding: '14px 22px 6px', fontSize: 11.5, color: 'var(--ink-5)' }}>{g}</div>
                <div className="users">
                  {inGroup.map((p) => (
                    <button type="button" key={p.id} className="user" onClick={() => toast(`${p.name}: role, tender scope and gate authority (${tenant.headTitle} only)`, 'ink3')}>
                      <span className="avatar sm soft">{p.initials}</span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-4)', marginTop: 1 }}>{roleLine(p)}</span>
                        <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-5)', marginTop: 3 }}>{p.hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <CardFoot>Only the {tenant.headTitle} changes a user's role or tender scope. Persona switches and View as are logged in the audit trail.</CardFoot>
        </Card>
      ) : (
        <Card style={{ marginTop: 'var(--gap)' }}>
          <CardHead title="Users and roles" meta="Managed by your Head of Tendering" />
        </Card>
      )}

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
          <CardHead title={<><span className="demo-chip">Demo</span>Demo session</>} meta={`${actions} action${actions === 1 ? '' : 's'} recorded in this company`} />
          <div className="setting">
            <div>
              <div className="setting-t">Demo scope</div>
              <div className="setting-s">{gcc ? 'GCC companies run Stage 1 to Stage 3 only, so no preview data appears under their brand.' : 'All nine stages, on the Indian preview data.'}</div>
            </div>
            <span className="t-ink3" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{gcc ? 'Stages 1–3 with DG1 and DG2' : 'Full lifecycle (preview)'}</span>
          </div>
          {tenant.world === 'legacy-in' && (
            <div className="setting">
              <div><div className="setting-t">Guided walk-through</div><div className="setting-s">Starts at the Tender Coordinator and hands the tender role to role through all eight dashboards.</div></div>
              <button type="button" className="btn" onClick={() => goRole('coord', { announce: 'Walk-through started at Stage 1 with the Tender Coordinator' })}>Start</button>
            </div>
          )}
          <div className="setting">
            <div><div className="setting-t">Reset demo</div><div className="setting-s">Re-opens every gate, validation and decision for {tenant.name}, or for every company. Theme and current view are kept.</div></div>
            <button type="button" className="btn btn-danger" onClick={() => openModal({ type: 'reset' })} disabled={!anyActions}><RotateCcw size={13} />Reset</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

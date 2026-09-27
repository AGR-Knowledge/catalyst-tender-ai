import { useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useDemo } from '@/state/store';
import { BREAKGLASS_MAX_HOURS } from '@/data/platform/facts';
import { consoleVM } from '@/domain/platform/console';
import { breakGlassRequest, type BreakGlassInput } from '@/domain/platform/breakglass';
import { KpiTiles } from '@/components/dashboard/KpiTile';
import { CardHead } from '@/components/ui/primitives';
import { StatusPill } from '@/components/tender/StatusPill';
import { TenantPanel } from './TenantPanel';
import { BreakGlassModal } from './BreakGlassModal';
import '@/components/dashboard/dashboard.css';
import './platform.css';
import { nameStop } from '@/data/tenants';

/**
 * The Platform Console (plan 011, spec §13, catalogue §C.8): PLT-1…6, the
 * tenant list with its locked "Tender data" cells, releases and canary,
 * guardrail activations by tenant, and the break-glass log. Everything on it
 * comes from `consoleVM`: counts and health, never tender content.
 */
export default function Console() {
  const { state, auditTo, toast } = useDemo();
  const vm = useMemo(() => consoleVM({ doneBy: state.doneBy, added: state.tenants }), [state.doneBy, state.tenants]);
  const [asking, setAsking] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const request = (key: string) => { setAsking(key); setOpen(true); };
  const send = (key: string, input: BreakGlassInput) => {
    const row = vm.tenants.find((t) => t.key === key);
    const w = breakGlassRequest(state.doneBy[key] ?? {}, input);
    auditTo(key, w.event, w.set);
    setOpen(false);
    toast(`Request sent to ${nameStop(row?.name ?? key)} ${row?.admin ?? 'Their Head of Tendering'} sees it in the audit log and can revoke it`, 'green');
  };

  const g = vm.guardrails;
  return (
    <div className="view plc-view">
      <section id="plc-overview" className="plc-card" aria-label="Overview" style={{ marginBottom: 0 }}>
        <div className="plc-promise">
          <span className="plc-promise-ic" aria-hidden><ShieldCheck size={17} /></span>
          <div>
            <div className="plc-promise-t">Counts and health only. Tender content stays locked in each tenant.</div>
            <div className="plc-promise-b">
              Catalyst sees no tender, price, margin, quote or document. Looking inside a tenant needs a break-glass request: one tenant, read only,{' '}
              {BREAKGLASS_MAX_HOURS} hours at most, a second approver, and the tenant’s Head of Tendering sees it in their audit log and can revoke it.
            </div>
          </div>
        </div>
        <KpiTiles tiles={vm.tiles} onDrill={() => {}} />
      </section>

      <TenantPanel rows={vm.tenants} onRequest={request} />

      <div className="plc-grid2">
        <section className="card plc-card" id="plc-releases" aria-labelledby="plc-releases-h">
          <CardHead title={<span id="plc-releases-h">Releases and canary</span>} meta="Demo figures" />
          <div className="plc-rel">
            {vm.releases.map((r) => (
              <div key={r.version} className="plc-rel-r">
                <div>
                  <div className="plc-rel-v num">{r.version}</div>
                  <div style={{ marginTop: 4 }}><StatusPill label={r.channel} tone={r.channel === 'Canary' ? 'cyan' : 'green'} icon={r.channel === 'Canary' ? '◐' : '✓'} /></div>
                </div>
                <div>
                  <div className="plc-rel-n">{r.note}</div>
                  <div className="plc-sub">Since {r.since} · {r.tenants.length ? r.tenants.join(', ') : 'No tenant yet'}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card plc-card" id="plc-guardrails" aria-labelledby="plc-guardrails-h">
          <CardHead title={<span id="plc-guardrails-h">Guardrail activations by tenant</span>} meta="This month · demo figures" />
          <div style={{ overflowX: 'auto' }}>
            <table className="plc-tbl">
              <thead>
                <tr>
                  <th scope="col">Tenant</th>
                  {g.kinds.map((k) => <th key={k.key} scope="col" style={{ textAlign: 'right', whiteSpace: 'normal' }}>{k.label}</th>)}
                  <th scope="col" style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.key}>
                    <td title={r.name}>{r.short}</td>
                    {g.kinds.map((k) => <td key={k.key} className="num" style={{ textAlign: 'right' }}>{r.counts[k.key]}</td>)}
                    <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{r.total}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ fontWeight: 600 }}>All tenants</td>
                  {g.kinds.map((k) => <td key={k.key} className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{g.totals[k.key]}</td>)}
                  <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{g.kinds.reduce((s, k) => s + g.totals[k.key], 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="card plc-card" id="plc-breakglass" aria-labelledby="plc-breakglass-h">
        <CardHead title={<span id="plc-breakglass-h">Break-glass log</span>} meta={vm.log.length ? `${vm.log.length} ${vm.log.length === 1 ? 'request' : 'requests'}` : undefined} />
        {vm.log.length === 0 ? (
          <div className="plc-empty">No break-glass requests. Each request appears here and in the tenant’s own audit log.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="plc-tbl plc-log-r">
              <thead>
                <tr>
                  <th scope="col">Requested</th>
                  <th scope="col">Tenant</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Scope</th>
                  <th scope="col">Requested by · approver</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {vm.log.map((l) => (
                  <tr key={l.id}>
                    <td className="num" style={{ whiteSpace: 'nowrap' }}>{l.when}</td>
                    <td>{l.tenant}</td>
                    <td><div className="plc-reason">{l.reason}</div></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{l.scope}</td>
                    <td>{l.requestedBy}<div className="plc-sub">{l.approver}</div></td>
                    <td><span className={`t-${l.tone}`}>{l.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="plc-note">
        As of {vm.asOf}. Tier, release, spend, evaluation and guardrail figures are illustrative platform facts, not live telemetry.
        Connector health, intake timings and onboarding come from each tenant’s own records, so they match what the tenant sees.
      </p>

      <BreakGlassModal
        open={open} tenants={vm.tenants} initial={asking} requesterId={state.realPerson.id}
        onSend={send} onClose={() => setOpen(false)}
      />
    </div>
  );
}

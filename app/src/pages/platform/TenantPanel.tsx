import { Clock, KeyRound, Lock } from 'lucide-react';
import type { TenantRowVM } from '@/domain/platform/console';
import { CardHead } from '@/components/ui/primitives';
import { Tip } from '@/components/tender/Tip';

/**
 * The tenant list (plan 011 §1.3–1.4, catalogue §C.8): who runs on the
 * platform, where their data lives, which release they run, and their health
 * as dots with words. The "Tender data" cell is locked for every tenant: the
 * only way in is a break-glass request, and even that opens nothing here.
 */
export function TenantPanel({ rows, onRequest }: { rows: TenantRowVM[]; onRequest(key: string): void }) {
  const live = rows.filter((r) => r.live).length;
  return (
    <section className="card plc-card" id="plc-tenants" aria-labelledby="plc-tenants-h">
      <CardHead title={<span id="plc-tenants-h">Tenants</span>} meta={`${live} live · ${rows.length - live} onboarding`} />
      <div style={{ overflowX: 'auto' }}>
        <table className="plc-tbl">
          <thead>
            <tr>
              <th scope="col">Tenant</th>
              <th scope="col">Region and residency</th>
              <th scope="col">Tier and release</th>
              <th scope="col">Health</th>
              <th scope="col">Tender data</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>
                  <div className="plc-tn">
                    <span className={`plc-mono accent-${r.accent}`} aria-hidden>{r.monogram}</span>
                    <div style={{ minWidth: 0 }}>
                      <div className="plc-tn-t">{r.name}</div>
                      <div className="plc-sub">{r.status} · <span className="num">{r.seats}</span> seats</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div>{r.region}</div>
                  <div className="plc-sub">{r.residency}</div>
                </td>
                <td>
                  <div>{r.tier}</div>
                  <div className="plc-sub num">{r.version}{r.canary && <span className="plc-canary">Canary</span>}</div>
                </td>
                <td>
                  {r.health.length ? (
                    <div className="plc-health">
                      {r.health.map((h) => (
                        <Tip key={h.key} className="plc-h" width={260} label={`${h.label}: ${h.value}. ${h.detail}`} tip={<><b>{h.label}: {h.value}</b><span>{h.detail}</span></>}>
                          <span className={`dot bg-${h.tone}`} aria-hidden />
                          {h.label} <b>{h.value}</b>
                        </Tip>
                      ))}
                    </div>
                  ) : <span className="plc-none">Not reading tenders yet</span>}
                </td>
                <td>
                  <div className="plc-lock">
                    <span className="plc-lock-t"><Lock size={12} aria-hidden />Tender data</span>
                    {r.lock.canRequest ? (
                      <button type="button" className="btn btn-sm" onClick={() => onRequest(r.key)} aria-label={`Request break-glass access to ${r.name}`}>
                        Request break-glass access
                      </button>
                    ) : <span className="plc-sub" style={{ marginTop: 0 }}>{r.lock.why}</span>}
                    {r.breakGlass && (
                      <span className={`plc-bg t-${r.breakGlass.tone}`}>
                        {r.breakGlass.status === 'requested' ? <Clock size={12} aria-hidden /> : <KeyRound size={12} aria-hidden />}
                        {r.breakGlass.text}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

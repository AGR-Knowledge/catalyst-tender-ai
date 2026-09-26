import { useMemo } from 'react';
import { useTenantKey } from '@/domain/tenancy';
import { PLATFORM_OPERATOR, personById } from '@/data/people';
import { can } from '@/data/access';
import { isGccTenantKey } from '@/data/gcc';
import { S2_SUPPLIERS } from '@/data/gcc/s2';
import { lifecyclesOf } from '@/domain/gcc/lifecycle';
import { ACTION_SOURCES } from '@/domain/gcc/actions/platform.actions';
import { DASHBOARDS } from '@/domain/gcc/dashboards/portfolio.dash';
import type { KpiCtx } from '@/domain/gcc/kpi/types';
import { consoleVM, stringsOf } from '@/domain/platform/console';
import { breakGlassOf, breakGlassProblem, breakGlassRequest, breakGlassRevoke, requestedAction } from '@/domain/platform/breakglass';
import { PLATFORM_BUCKET, writeTo, type AuditEvent } from '@/state/store';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Plan 011: the Platform Console shows counts and health only, and a
 * break-glass request lands in the tenant it targets. Runs on in-memory state
 * (the store's own `writeTo` step), never on the live demo, so it changes
 * nothing. The request targets another tenant than the open one, to prove it
 * doesn't land where the presenter is.
 */

interface Check { name: string; ok: boolean; got: string }

const GCC = ['najd', 'corniche', 'dafna', 'batinah', 'qurain'] as const;
const REASON = 'Support case 4471: intake queue stuck on one scanned upload';
const CURRENCY_AMOUNT = /\b(SAR|AED|QAR|OMR|KWD|USD|EUR|INR)\s?\d/;

function checks(open: string): Check[] {
  const out: Check[] = [];
  const add = (name: string, ok: boolean, got: string) => out.push({ name, ok, got });
  const target = open === 'corniche' ? 'dafna' : 'corniche';
  const hot = personById(`${target}.hot`)!;

  // A request written the way the console writes it, into `target`, with the presenter in `open`.
  const input = { reason: REASON, hours: 4, requestedById: PLATFORM_OPERATOR.id, approverId: 'platform.security' };
  const req = breakGlassRequest({}, input);
  const s1 = writeTo({}, {}, target, req.event, req.set);

  // 1. Leak scan: no tender ID, title, value or supplier anywhere in the console's view models.
  const vm = consoleVM({ doneBy: s1.doneBy, added: [] });
  const strings = stringsOf(vm);
  const titles = GCC.flatMap((t) => lifecyclesOf(t).map((l) => l.title));
  const suppliers = GCC.flatMap((t) => S2_SUPPLIERS[t].map((s) => s.name));
  const hits = [
    ...strings.filter((s) => /T-20\d\d/.test(s)).map((s) => `ID in “${s.slice(0, 40)}”`),
    ...strings.filter((s) => CURRENCY_AMOUNT.test(s)).map((s) => `amount in “${s.slice(0, 40)}”`),
    ...titles.filter((t) => strings.some((s) => s.includes(t))).map((t) => `title “${t.slice(0, 30)}”`),
    ...suppliers.filter((n) => strings.some((s) => s.includes(n))).map((n) => `supplier “${n}”`),
  ];
  add('Console: no tender ID, title, value or supplier', !hits.length, hits.length ? hits.slice(0, 3).join(' · ') : `${strings.length} strings scanned against ${titles.length} titles and ${suppliers.length} suppliers`);

  // 2. PLT-6 counts the written request.
  const plt6 = vm.tiles.find((t) => t.id === 'PLT-6');
  const row = vm.tenants.find((t) => t.key === target);
  add('PLT-6 counts the request; the row says so', plt6?.display === '1' && row?.breakGlass?.status === 'requested', `PLT-6 ${plt6?.display ?? 'missing'} · ${row?.breakGlass?.text ?? 'no row status'}`);

  // 3. It lands in the target tenant's `done` and audit trail, not the open one's.
  const inTarget = breakGlassOf(s1.doneBy[target] ?? {});
  const trail: AuditEvent[] = s1.auditBy[target] ?? [];
  const elsewhere = Object.keys(s1.doneBy).filter((k) => k !== target).concat(Object.keys(s1.auditBy).filter((k) => k !== target));
  add(`Request lands in ${target}, not ${open}`, inTarget.length === 1 && trail[0]?.action === requestedAction(4) && trail[0]?.actorId === PLATFORM_OPERATOR.id && !elsewhere.length,
    `${target}: ${inTarget.length} request, audit “${trail[0]?.action ?? 'none'}” · elsewhere: ${elsewhere.join(', ') || 'nothing'}`);

  // 4. The Head of Tendering's action row, on their home only.
  const src = ACTION_SOURCES.find((s) => s.id === 'breakglass.review')!;
  const rows = src.rows({ tenant: target, viewer: hot, done: s1.doneBy[target] } as unknown as KpiCtx);
  const onHome = DASHBOARDS.find((d) => d.key === 'portfolio.hot')?.actions.includes('breakglass.review');
  const r0 = rows[0];
  add('Head of Tendering sees “Catalyst requested access”', rows.length === 1 && !!onHome && r0.shortTitle === 'Catalyst requested access' && r0.primary.kind === 'route' && r0.primary.to.startsWith('/admin/audit'),
    r0 ? `${r0.type} · ${r0.primary.label} · on portfolio.hot: ${onHome ? 'yes' : 'no'}` : 'No row');

  // 5. Revoke: the revoked key and an audit entry; the console shows who revoked it; nothing is open.
  const rev = breakGlassRevoke(s1.doneBy[target], 1, hot.id);
  const s2 = rev ? writeTo(s1.doneBy, s1.auditBy, target, rev.event, rev.set) : s1;
  const after = breakGlassOf(s2.doneBy[target] ?? {})[0];
  const vm2 = consoleVM({ doneBy: s2.doneBy, added: [] });
  const text = vm2.tenants.find((t) => t.key === target)?.breakGlass?.text ?? '';
  const rows2 = src.rows({ tenant: target, viewer: hot, done: s2.doneBy[target] } as unknown as KpiCtx);
  add('Revoke: “Revoked by” the Head of Tendering, nothing open', after?.status === 'revoked' && text.startsWith(`Revoked by ${hot.name}`) && vm2.tiles.find((t) => t.id === 'PLT-6')?.display === '0' && !rows2.length && (s2.auditBy[target]?.length ?? 0) === 2,
    `${text || 'no status'} · PLT-6 ${vm2.tiles.find((t) => t.id === 'PLT-6')?.display} · ${s2.auditBy[target]?.length ?? 0} audit entries`);

  // 6. Reset (this company) drops the tenant's `done` and audit trail whole, so it clears both; nothing sits in the platform bucket.
  const keys = Object.keys(s2.doneBy[target] ?? {});
  add('Reset clears it: keys only in the tenant’s own state', keys.every((k) => k.startsWith('breakglass:')) && !keys.some((k) => k.startsWith('tn-')) && !s2.doneBy[PLATFORM_BUCKET],
    keys.join(', '));

  // 7. The operator: the console yes, tender data no.
  const denied = (['tender.view', 'see.margin', 'see.quotes', 'dg1.decide'] as const).filter((c) => !can(PLATFORM_OPERATOR, c).ok);
  add('Operator: console yes; tender.view, margin, quotes, gates no', can(PLATFORM_OPERATOR, 'platform.console').ok && denied.length === 4,
    `console ${can(PLATFORM_OPERATOR, 'platform.console').ok ? 'yes' : 'no'} · denied ${denied.join(', ')}`);

  // 8. The form's rules: reason of 20+, 1–4 hours, a second approver who isn't the requester.
  const short = breakGlassProblem({ ...input, reason: 'Too short a reason' });
  const long = breakGlassProblem({ ...input, hours: 5 });
  const self = breakGlassProblem({ ...input, approverId: PLATFORM_OPERATOR.id });
  add('Form: short reason, 5 h and self-approval refused', !!short && !!long && !!self && breakGlassProblem(input) === null, [short, long, self].map((x) => x ?? 'accepted').join(' · '));

  return out;
}

export default function PlatformCheck() {
  const tenant = useTenantKey();
  const rows = useMemo(() => (isGccTenantKey(tenant) ? checks(tenant) : []), [tenant]);
  if (!isGccTenantKey(tenant)) return <CardHead title="Platform Console and break-glass (plan 011)" meta="No GCC seed for this tenant" />;
  const failing = rows.filter((r) => !r.ok).length;
  return (
    <>
      <CardHead title="Platform Console and break-glass (plan 011)" meta={failing ? `${failing} of ${rows.length} failing` : `All ${rows.length} pass`} />
      <DataTable
        rows={rows}
        rowKey={(c) => c.name}
        columns={[
          { key: 'n', header: 'Check', width: '1.5fr', primary: true, render: (c) => <span className="cell-main">{c.name}</span> },
          { key: 'g', header: 'Got', width: '2fr', render: (c) => c.got },
          { key: 'r', header: 'Result', width: '.6fr', align: 'right', render: (c) => (c.ok ? <span className="t-green">✓ Pass</span> : <span className="t-red">× Fail</span>) },
        ]}
      />
    </>
  );
}

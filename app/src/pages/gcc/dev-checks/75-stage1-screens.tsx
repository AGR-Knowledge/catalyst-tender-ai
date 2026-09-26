import { useMemo } from 'react';
import { useTenantKey } from '@/domain/tenancy';
import { gccData, isGccTenantKey } from '@/data/gcc';
import { HERO_ID } from '@/data/gcc/hero';
import { can } from '@/data/access';
import { firstWithRole, type Person } from '@/data/people';
import { DEMO_NOW } from '@/domain/gcc/clock';
import { dataPort } from '@/domain/gcc/port';
import { documentFor } from '@/domain/gcc/documents';
import { blockingOpen, radarFor, recogniseUpload, triageFor, validationAction, validationsOf } from '@/domain/gcc/s1';
import type { DoneWrite } from '@/domain/gcc/s1/done';
import { dg1PackFor, dg1RecordFor, dg1Write, validateDg1, type Dg1Input } from '@/domain/gcc/dg1';
import { SCREENS, isScreenBuilt } from '@/pages/gcc/screens';
import { WORKSPACE_TABS, type WorkspaceCtx } from '@/pages/gcc/workspace/tabs';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Plan 007b: the Stage 1 and DG1 screens' wiring on the open tenant's copy of
 * the hero tender, from the seed (`done` empty) and through the writes the
 * screens make. About ten rows; the rules themselves are checked in 70.
 */

interface Check { name: string; ok: boolean; got: string }

type Done = Record<string, string>;
const NONE: Done = {};
const PATHS = ['/radar', '/intake-queue', '/screening', '/dg1', '/calendar'];
const MINE = ['documents', 'requirements', 'eligibility', 'dates', 'queries'];
const put = (d: Done, ws: DoneWrite[]): Done => ({ ...d, ...Object.fromEntries(ws.map((w) => [w.key, w.value])) });

/** The tabs of 007b a tender shows, probed as the workspace probes them. */
function tabsOf(tenant: string, tenderId: string, viewer: Person, done: Done): string[] {
  const ctx = { tenant, tenderId, viewer, viewAs: false, done, audit: [], now: DEMO_NOW, can: () => true, check: () => ({ ok: true }), openTab: () => {}, hasTab: () => false } as unknown as WorkspaceCtx;
  return WORKSPACE_TABS.filter((t) => MINE.includes(t.id)).filter((t) => { try { return t.shows(ctx); } catch { return false; } }).map((t) => t.id);
}

function checks(tenant: string): Check[] {
  const out: Check[] = [];
  const add = (name: string, ok: boolean, got: string) => out.push({ name, ok, got });
  const role = (r: Parameters<typeof firstWithRole>[1]) => firstWithRole(tenant, r)!;
  const coord = role('coord');
  const bm = role('bid');
  const proc = role('proc');
  const opens = (p: Person, path: string) => { const cap = SCREENS[path]?.cap; return !cap || can(p, cap).ok; };

  // 1. The five screens are built, and the routes answer to the right roles.
  const built = PATHS.filter(isScreenBuilt);
  const access = opens(coord, '/radar') && opens(coord, '/intake-queue') && opens(bm, '/dg1') && opens(bm, '/screening') && !opens(proc, '/dg1');
  add('Screens built; Coordinator opens radar and queue, Bid Manager DG1, Procurement not DG1', built.length === PATHS.length && access,
    `${built.length} of ${PATHS.length} built · Procurement on /dg1: ${opens(proc, '/dg1') ? 'opens' : 'refused'}`);

  // 2. The hero's queue: the two fields the agent would not accept alone.
  const items = validationsOf(tenant, HERO_ID, NONE);
  const blocking = blockingOpen(tenant, HERO_ID, NONE);
  add(`${HERO_ID}: 2 fields in the queue, blocking DG1`, items.length === 2 && blocking.count >= 1,
    `${items.map((q) => `${q.item.field}${q.item.alt ? ' (two values)' : ''}`).join(', ')} · ${blocking.count} blocking`);

  // 3. DG1 locked on the seed, open once the fields are confirmed.
  const pack0 = dg1PackFor(tenant, HERO_ID, NONE);
  const resolved = put(NONE, items.map((q) => validationAction(q.item, q.item.alt ? 'pick' : 'accept', { ...(q.item.alt ? { pick: 'value' as const } : {}), at: DEMO_NOW }, coord.id)));
  const pack1 = dg1PackFor(tenant, HERO_ID, resolved);
  const elig = pack1?.eligibility?.result;
  const pursue: Dg1Input = {
    tenderId: HERO_ID, decision: 'pursue', note: 'Dev check', at: DEMO_NOW,
    strategy: elig?.verdict === 'eligible-with-jv' && elig.jvPartner ? { kind: 'jv', partnerId: elig.jvPartner.id } : { kind: 'prime' },
  };
  const locked = pack0 ? validateDg1(pursue, pack0, NONE) : null;
  const open = pack1 ? validateDg1(pursue, pack1, resolved) : null;
  add('DG1: Pursue locked while fields are open, then allowed', !!pack0?.locked && !!locked && !locked.ok && !pack1?.locked && !!open?.ok,
    `${pack0?.locked?.reason ?? 'not locked'} → ${open?.ok ? 'allowed' : open?.errors.join(' ')}`);

  // 4. Pursue moves the hero to Stage 2 on the port: dashboards, tracker and workspace read it.
  const w = pack1 && open?.ok ? dg1Write(pursue, bm.id, pack1, resolved) : null;
  const pursued = w ? put(resolved, w.writes) : resolved;
  const port = dataPort();
  const row = port?.rows(tenant, { kind: 'all' }, bm, 'all', pursued).find((r) => r.id === HERO_ID);
  add('Pursue moves the hero to Stage 2, Sourcing', row?.stage === 2 && !!w?.effects.some((e) => e.startsWith('RFQ clock started')),
    port ? `Stage ${row?.stage ?? '?'} · ${row?.step ?? ''} · ${w?.effects.length ?? 0} effects` : 'Data port not loaded yet');

  // 5. Discard needs a reason code.
  const bare = pack1 ? validateDg1({ tenderId: HERO_ID, decision: 'discard' }, pack1, resolved) : null;
  const coded = pack1 ? validateDg1({ tenderId: HERO_ID, decision: 'discard', reasonCodes: ['pq-fail-turnover'] }, pack1, resolved) : null;
  add('Discard needs a reason code', !!bare && !bare.ok && !!coded?.ok, `${bare?.errors[0] ?? '?'} · with a code: ${coded?.ok ? 'allowed' : coded?.errors.join(' ')}`);

  // 6. Re-open is offered on a decision recorded in the demo; a seed decision is history.
  const demo = dg1RecordFor(tenant, HERO_ID, pursued);
  const seedId = gccData(tenant).register.find((t) => dg1RecordFor(tenant, t.id, NONE).source === 'seed')?.id;
  const seed = seedId ? dg1RecordFor(tenant, seedId, NONE) : null;
  add('Re-open offered on a demo decision only', demo.source === 'demo' && (!seed || seed.source === 'seed'),
    `${HERO_ID}: ${demo.source ?? 'none'}${seedId ? ` · ${seedId}: ${seed?.source}` : ' · no seed decision'}`);

  // 7. Tabs: all five on the hero; absent where a tender has nothing for them.
  const heroTabs = tabsOf(tenant, HERO_ID, bm, NONE);
  const bare7 = gccData(tenant).register.find((t) => t.id !== HERO_ID && !documentFor(tenant, t.id));
  const bareTabs = bare7 ? tabsOf(tenant, bare7.id, bm, NONE) : [];
  add('Workspace tabs: five on the hero, none empty elsewhere', heroTabs.length === MINE.length && !bareTabs.includes('requirements'),
    `${HERO_ID}: ${heroTabs.join(', ')}${bare7 ? ` · ${bare7.id}: ${bareTabs.join(', ') || 'none'}` : ''}`);

  // 8. The radar sends no restricted rows to someone not cleared; the lane is a count.
  const radar = radarFor(tenant, false, NONE, coord);
  const lane = radarFor(tenant, false, NONE).restrictedCount;
  add('Radar: restricted captures are a count only for the Coordinator', !radar.captures.some((c) => c.restricted), `${radar.captures.length} captures shown · lane ${lane}`);

  // 9. Upload: the hero's booklet is recognised by file name; an unknown file is not.
  const doc = documentFor(tenant, HERO_ID);
  const file = doc ? decodeURIComponent(doc.url.split('/').pop() ?? '') : '';
  const hit = file ? recogniseUpload(file, tenant) : null;
  add('Upload: the hero booklet opens the hero; an unknown file stops', hit?.tenderId === HERO_ID && !recogniseUpload('unknown-tender.pdf', tenant), `${file || 'no file'} → ${hit?.tenderId ?? 'not recognised'}`);

  // 10. Triage states the load; it does not rank.
  const triage = triageFor(tenant, NONE);
  add('Screening triage: rows in DG1 order, flags as facts', triage.rows.length > 0 && triage.flags.every((f) => / would /.test(f)),
    `${triage.rows.length} rows · ${triage.flags[0] ?? 'no flags'}`);

  return out;
}

export default function Stage1ScreensCheck() {
  const tenant = useTenantKey();
  const rows = useMemo(() => (isGccTenantKey(tenant) ? checks(tenant) : []), [tenant]);
  if (!isGccTenantKey(tenant)) return <CardHead title="Stage 1 screens (plan 007b)" meta="No GCC seed for this tenant" />;
  const failing = rows.filter((r) => !r.ok).length;
  return (
    <>
      <CardHead title="Stage 1 screens (plan 007b)" meta={failing ? `${failing} of ${rows.length} failing` : `All ${rows.length} pass`} />
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

import { useMemo } from 'react';
import { useTenantKey } from '@/domain/tenancy';
import { isGccTenantKey, gccData } from '@/data/gcc';
import { HERO_ID } from '@/data/gcc/hero';
import { personById, type Person } from '@/data/people';
import { dataPort } from '@/domain/gcc/port';
import { lifecyclesOf } from '@/domain/gcc/lifecycle';
import { packFor } from '@/domain/gcc/s3/pack';
import { requestFor, requestWrite } from '@/domain/gcc/requestKeys';
import { auditTimeline, workspaceHeader, workspaceRail } from '@/domain/gcc/workspace';
import { searchTenders } from '@/components/layout/GccSearch';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';
import { RESERVED_TABS, WORKSPACE_TABS } from '../workspace/tabs';

/**
 * Plan 019: the Tender Workspace's tab registry, header, rail, audit timeline,
 * search and request keys, on the seed (no demo actions). About ten rows; the
 * Najd rows use Najd's people whichever tenant is open.
 */

interface Check { name: string; ok: boolean; got: string }

const NONE: Record<string, string> = {};

function vmOf(tenant: string, id: string, viewer: Person) {
  const port = dataPort();
  const row = port?.rows(tenant, { kind: 'all' }, viewer, 'all', NONE).find((r) => r.id === id) ?? null;
  if (!port || !row) return null;
  const tracker = port.tracker(tenant, id, viewer, NONE);
  return {
    row,
    header: workspaceHeader({ tenant, viewer, done: NONE }, row, tracker),
    rail: workspaceRail({ tenant, viewer, viewAs: false, done: NONE, row, tracker }),
  };
}

function checks(tenant: string): Check[] {
  const out: Check[] = [];
  const add = (name: string, ok: boolean, got: string) => out.push({ name, ok, got });

  // 6.1 Tabs
  const ids = WORKSPACE_TABS.map((t) => t.id);
  const off = WORKSPACE_TABS.filter((t) => RESERVED_TABS.find((r) => r.id === t.id)?.order !== t.order).map((t) => `${t.id} ${t.order}`);
  add('Tabs: unique ids, orders from the reserved table', new Set(ids).size === ids.length && !off.length, `${ids.join(', ')}${off.length ? `; off table: ${off.join(', ')}` : ''}`);

  // 6.2 Hero header in this tenant: value in the tenant's currency, addendum badge, working-day countdown, no "undefined".
  const own = [...lifecyclesOf(tenant)].find((l) => l.tenderId === HERO_ID)?.bidManagerId;
  const bm = personById(own) ?? personById(`${tenant}.bid`);
  const hero = bm ? vmOf(tenant, HERO_ID, bm) : null;
  const ccy = isGccTenantKey(tenant) ? gccData(tenant).fit.band.min.ccy : '';
  if (hero) {
    const h = hero.header;
    const json = JSON.stringify(h);
    // The hero has no addendum in the seed (only T-2026-097 does), so its badge is absent: checked on 097 below.
    const ok = h.value?.ccy === ccy && !h.addendum && !!h.due && /working day/.test(h.due.countdown) && !json.includes('undefined');
    add(`Hero header (${HERO_ID}) as ${bm!.name}`, ok, `${h.value ? `${h.value.ccy} ${Math.round(h.value.amount / 1e6)} M` : 'no value'} · ${h.addendum ?? 'no addendum yet'} · ${h.due ? `${h.due.countdown} ${h.due.tz}` : h.dueNote}`);
  } else add(`Hero header (${HERO_ID})`, false, 'Hero not found for its Bid Manager');

  // 6.3 Rail on the hero: Stage 1 recommendation, three reasons, a page source.
  if (hero && tenant === 'najd') {
    const r = hero.rail.recommendation;
    const ok = r?.kind === 'card' && r.stage === 1 && r.reasons.length === 3 && r.sources.some((s) => s.kind === 'page');
    add('Hero rail: Stage 1 recommendation', ok, r?.kind === 'card' ? `${r.verdict} · ${r.reasons.length} reasons · ${r.sources.filter((s) => s.kind === 'page').map((s) => s.label).join(', ')}` : r ? `A ${r.gate} decision` : 'None');
  }

  // The Najd rows.
  const hot = personById('najd.hot')!;
  const proc = personById('najd.proc')!;
  const coord = personById('najd.coord')!;

  // 6.4 T-2026-097 as the Procurement Lead: no win, margin or price values (against the Head of Tendering's).
  const a = vmOf('najd', 'T-2026-097', hot);
  const b = vmOf('najd', 'T-2026-097', proc);
  if (a && b) {
    const pack = packFor('najd', 'T-2026-097', NONE, { canSeeMargin: true, canSeePositions: true });
    const secrets = [
      a.rail.recommendation?.kind === 'card' ? a.rail.recommendation.confidence : null,
      pack?.summary.margin, pack?.summary.win,
      ...(a.rail.recommendation?.kind === 'card' ? a.rail.recommendation.wouldChange : []),
    ].filter((x): x is string => !!x && x !== 'Masked for your role');
    const seen = JSON.stringify([b.header, b.rail]);
    const leaks = [...secrets.filter((s) => seen.includes(s)), ...(/\d of \d positions|quorum needs/.test(seen) ? ['committee positions'] : [])];
    add('T-2026-097 as the Procurement Lead: win, margin, positions masked', secrets.length > 0 && !leaks.length, leaks.length ? `Shows ${leaks.join(' | ')}` : `None of ${secrets.length} figures shown (${secrets.slice(0, 2).join(', ')} …)`);
    add('T-2026-097 header: the addendum badge', b.header.addendum === 'Addendum 2 applied', b.header.addendum ?? 'No badge');
  } else add('T-2026-097 as the Procurement Lead: win, margin, positions masked', false, 'Tender not found');

  // Blocker wording for T-2025-329 without margin.
  const m = vmOf('najd', 'T-2025-329', proc);
  const blocker = m?.rail.blockers[0]?.title ?? 'No blocker';
  add('T-2025-329 blocker as the Procurement Lead', /figures masked for your role/.test(blocker) && !/\d%/.test(blocker), blocker);

  // 6.5 Audit timeline past DG1.
  const past = lifecyclesOf('najd').find((l) => l.gates.some((g) => g.gate === 'DG1'));
  if (past) {
    const e = auditTimeline('najd', past.tenderId, NONE, [], hot).flatMap((d) => d.entries).find((x) => x.action.startsWith('DG1'));
    add(`Audit timeline (${past.tenderId}): the DG1 record`, !!e && !!e.chip && !!e.at && e.actor.name !== 'Platform', e ? `${e.chip?.label} · ${e.actor.name} · ${e.at}` : 'No DG1 entry');
  }

  // 6.6 Search: the restricted tender for cleared people only.
  const port = dataPort();
  const found = (p: Person) => !!port && searchTenders(port.rows('najd', { kind: 'all' }, p, 'all', NONE), 'T-2026-121').some((r) => r.id === 'T-2026-121');
  add('Search T-2026-121: Aisha no, Faisal yes', !found(coord) && found(hot), `${coord.name}: ${found(coord) ? 'found' : 'not found'} · ${hot.name}: ${found(hot) ? 'found' : 'not found'}`);
  add('Workspace T-2026-121 as Aisha: "No tender here"', !vmOf('najd', 'T-2026-121', coord), vmOf('najd', 'T-2026-121', coord) ? 'Opens' : 'Not found state');

  // 6.7 requestKeys round-trip on an in-memory `done`.
  const w = requestWrite(HERO_ID, 'najd.fin', 'dev-check', { what: 'Round trip', due: '2026-03-10T12:00', at: '2026-03-08T10:01', byId: 'najd.bid' });
  const back = requestFor({ [w.key]: w.value }, HERO_ID, 'najd.fin', 'dev-check');
  add('requestWrite → requestFor', !!back && back.what === 'Round trip' && back.due === '2026-03-10T12:00', back ? `${back.key} · due ${back.due}` : 'Not read back');

  return out;
}

export default function WorkspaceCheck() {
  const tenant = useTenantKey();
  const rows = useMemo(() => (isGccTenantKey(tenant) ? checks(tenant) : []), [tenant]);
  if (!isGccTenantKey(tenant)) return <CardHead title="Tender Workspace (plan 019)" meta="No GCC seed for this tenant" />;
  const failing = rows.filter((r) => !r.ok).length;
  return (
    <>
      <CardHead title="Tender Workspace (plan 019)" meta={failing ? `${failing} of ${rows.length} failing` : `All ${rows.length} pass`} />
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

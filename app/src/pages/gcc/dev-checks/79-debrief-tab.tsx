import { useMemo } from 'react';
import { useTenantKey } from '@/domain/tenancy';
import { isGccTenantKey } from '@/data/gcc';
import { HERO_ID } from '@/data/gcc/hero';
import { can } from '@/data/access';
import { firstWithRole, type Person } from '@/data/people';
import type { Lifecycle } from '@/data/gcc/lifecycle';
import { DEMO_NOW } from '@/domain/gcc/clock';
import { lifecyclesOf, tenderCtx } from '@/domain/gcc/lifecycle';
import { DEBRIEF_STATUSES, archiveFor, debriefFor, labelOf, validateDebrief, type DebriefVM } from '@/domain/gcc/debriefs';
import { libraryFor, type LibraryFileVM } from '@/domain/gcc/library';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';
import { RESERVED_TABS, WORKSPACE_TABS, workspaceTab, type WorkspaceCtx } from '../workspace/tabs';
import { RECORDABLE, debriefLines } from '../workspace/debrief/format';

/**
 * Plan 036: the Debrief tab, its badge, the presenter's examples and the
 * Debrief record in 07 Result, on the seed (`done` is an empty map in memory),
 * so it changes nothing. The tab shows exactly where plan 035 finds an ending;
 * the badge asks the Project Director to record and the Head of Tendering to
 * accept; the file exists exactly when the debrief is accepted and is masked
 * without `debrief.view`; the record's words match the archive's.
 */

interface Check { name: string; ok: boolean; got: string }

const NONE: Record<string, string> = {};
const list = (xs: string[], n = 3) => (xs.length ? `${xs.slice(0, n).join(', ')}${xs.length > n ? ` +${xs.length - n}` : ''}` : 'none');

/** A workspace context for one tender and viewer on the seed: enough for a tab's `shows` and `badge`. */
function probe(tenant: string, l: Lifecycle, viewer: Person): WorkspaceCtx {
  const cctx = tenderCtx(tenant, l);
  return {
    tenant, tenderId: l.tenderId, row: {} as WorkspaceCtx['row'], tracker: null, viewer, viewAs: false, done: NONE, audit: [], now: DEMO_NOW,
    can: (cap) => can(viewer, cap, cctx).ok,
    check: (cap, extra) => can(viewer, cap, { ...cctx, ...extra }),
    openTab: () => undefined, hasTab: () => false,
  };
}

const debriefFile = (files: LibraryFileVM[] | undefined) => files?.find((f) => f.kind === 'debrief-record') ?? null;

function checks(tenant: string): Check[] {
  const out: Check[] = [];
  const add = (name: string, ok: boolean, got: string) => out.push({ name, ok, got });
  const tab = workspaceTab('debrief');
  const hot = firstWithRole(tenant, 'hot');
  const dir = firstWithRole(tenant, 'dir');
  const coord = firstWithRole(tenant, 'coord');
  if (!tab || !hot || !dir || !coord) {
    add('The Debrief tab and its people', false, `${tab ? 'tab' : 'no tab'} · ${[hot, dir, coord].filter(Boolean).length} of 3 people`);
    return out;
  }
  const all = lifecyclesOf(tenant, hot, NONE);
  const vmOf = (viewer: Person, id: string) => debriefFor({ tenant, viewer, done: NONE, now: DEMO_NOW }, id);
  const ended = all.flatMap((l) => { const vm = vmOf(hot, l.tenderId); return vm ? [{ l, vm }] : []; });

  // 1. The tab shows exactly where the Head of Tendering has a debrief, never on a live tender (the hero).
  const off = all.filter((l) => tab.shows(probe(tenant, l, hot)) !== !!vmOf(hot, l.tenderId)).map((l) => l.tenderId);
  const hero = all.find((l) => l.tenderId === HERO_ID);
  const heroShows = !!hero && tab.shows(probe(tenant, hero, hot));
  const pins = tenant === 'najd' ? ['T-2025-270', 'T-2025-255', 'T-2025-438'] : [];
  const pinsOff = pins.filter((id) => { const l = all.find((x) => x.tenderId === id); return !l || !tab.shows(probe(tenant, l, hot)); });
  add('The tab shows exactly on tenders with an ending', !off.length && !heroShows && !pinsOff.length && ended.length > 0,
    `${ended.length} of ${all.length} tenders ended · off: ${list(off)} · hero ${heroShows ? 'shows it' : 'no tab'}${pins.length ? ` · ${pinsOff.length ? `missing on ${list(pinsOff)}` : `on ${pins.join(', ')}`}` : ''}`);

  // 2. The tab's cap is `debrief.view`: the Tender Coordinator gets it masked, not absent.
  const first = ended[0]?.l;
  const coordMasked = !!first && tab.shows(probe(tenant, first, coord)) && !probe(tenant, first, coord).can('debrief.view');
  add('Cap debrief.view: masked for the Tender Coordinator', tab.cap === 'debrief.view' && coordMasked,
    `cap ${tab.cap ?? 'none'} · ${coord.name} on ${first?.tenderId ?? 'no ended tender'}: ${coordMasked ? 'masked tab' : 'not masked'}`);

  // 3. The badge: the Project Director's status word while it is theirs to record; "To accept" for the Head of Tendering while submitted.
  const badOf = (p: Person, l: Lifecycle) => tab.badge?.(probe(tenant, l, p))?.text ?? null;
  const badgeOff = ended.filter(({ l, vm }) => {
    const d = badOf(dir, l);
    const h = badOf(hot, l);
    const dWant = RECORDABLE.includes(vm.status) ? labelOf(DEBRIEF_STATUSES, vm.status) : null;
    const hWant = vm.status === 'submitted' ? 'To accept' : null;
    return d !== dWant || h !== hWant;
  }).map(({ l }) => l.tenderId);
  const n = (s: DebriefVM['status']) => ended.filter((x) => x.vm.status === s).length;
  const najdPins = tenant !== 'najd' ? '' : (() => {
    const a = ended.find((x) => x.l.tenderId === 'T-2025-270');
    const b = ended.find((x) => x.l.tenderId === 'T-2025-438');
    return ` · T-2025-270 ${a ? badOf(dir, a.l) ?? 'no badge' : 'missing'} for ${dir.name} · T-2025-438 ${b ? badOf(hot, b.l) ?? 'no badge' : 'missing'} for ${hot.name}`;
  })();
  const najdOk = tenant !== 'najd' || /T-2025-270 Due for .* T-2025-438 To accept for /.test(najdPins);
  add('Badge: Due, Overdue or Sent back to record; To accept to sign off', !badgeOff.length && najdOk,
    `due ${n('due')} · overdue ${n('overdue')} · sent back ${n('sent-back')} · submitted ${n('submitted')} · accepted ${n('accepted')} · off: ${list(badgeOff)}${najdPins}`);

  // 4. Every presenter example ("Fill in an example") passes the form's own rules.
  const withEx = ended.map(({ l }) => ({ id: l.tenderId, vm: vmOf(dir, l.tenderId) })).filter((x): x is { id: string; vm: DebriefVM } => !!x.vm?.example);
  const exOff = withEx.map(({ id, vm }) => ({ id, v: validateDebrief(vm.example!, vm) })).filter((x) => !x.v.ok);
  const exWant = tenant === 'najd' ? ['T-2025-270', 'T-2025-262'] : tenant === 'corniche' ? ['T-2025-120'] : [];
  const exMissing = exWant.filter((id) => !withEx.some((x) => x.id === id));
  add('Every example validates', !exOff.length && !exMissing.length,
    `${withEx.length ? withEx.map((x) => x.id).join(', ') : 'no example in this company'}${exOff.length ? ` · failing: ${exOff.map((x) => `${x.id} (${x.v.errors[0]})`).join('; ')}` : ''}${exMissing.length ? ` · missing: ${exMissing.join(', ')}` : ''}`);

  // 5. 07 Result holds a Debrief record exactly when the debrief is accepted (T-2025-255 in Najd).
  const fileOff = ended.filter(({ l, vm }) => !!debriefFile(libraryFor({ tenant, viewer: hot, done: NONE }, l.tenderId)?.files) !== (vm.status === 'accepted')).map(({ l }) => l.tenderId);
  const accepted = ended.filter((x) => x.vm.status === 'accepted');
  const f255 = tenant === 'najd' ? debriefFile(libraryFor({ tenant, viewer: hot, done: NONE }, 'T-2025-255')?.files) : null;
  const f255Ok = tenant !== 'najd' || (!!f255 && f255.folderId === '07' && f255.dated === 'made' && f255.tags.includes('Debrief'));
  add('07 Result: a Debrief record ⇔ accepted', !fileOff.length && f255Ok,
    `${accepted.length} accepted · off: ${list(fileOff)}${tenant === 'najd' ? ` · T-2025-255 ${f255 ? `${f255.name}, Made ${f255.receivedAt}, by ${f255.by}` : 'no file'}` : ''}`);

  // 6. Without `debrief.view` the file is listed masked and its facsimile holds none of the lessons.
  const maskOff: string[] = [];
  let maskN = 0;
  for (const { l, vm } of accepted) {
    const f = debriefFile(libraryFor({ tenant, viewer: coord, done: NONE }, l.tenderId)?.files);
    if (!f) continue;
    maskN += 1;
    const html = f.view.kind === 'html' ? f.view.html() : '';
    const leaks = (vm.record.submission?.lessons ?? []).some((x) => x.text && html.includes(x.text.slice(0, 40)));
    if (!f.masked || leaks) maskOff.push(l.tenderId);
  }
  add(`Masked for ${coord.name} (no debrief.view)`, !maskOff.length, `${maskN} files seen masked · off: ${list(maskOff)}`);

  // 7. The reserved row and the registered tab agree: `debrief` at 95, between Bid / No-Bid and Decisions & audit.
  const res = RESERVED_TABS.find((r) => r.id === 'debrief');
  const ids = WORKSPACE_TABS.map((t) => t.id);
  const at = ids.indexOf('debrief');
  add('RESERVED_TABS: debrief at 95', res?.order === 95 && tab.order === 95 && ids[at - 1] === 'bid-decision' && ids[at + 1] === 'audit',
    `reserved ${res ? `${res.label} ${res.order} (${res.plan})` : 'missing'} · registered ${tab.order} · between ${ids[at - 1] ?? 'none'} and ${ids[at + 1] ?? 'none'}`);

  // 8. No tab id or order collides, in the reserved table or the registry.
  const dup = (xs: (string | number)[]) => xs.filter((x, i) => xs.indexOf(x) !== i).map(String);
  const clash = [...dup(RESERVED_TABS.map((r) => r.id)), ...dup(RESERVED_TABS.map((r) => r.order)), ...dup(ids), ...dup(WORKSPACE_TABS.map((t) => t.order))];
  add('No tab id or order collides', !clash.length, clash.length ? `clashes: ${clash.join(', ')}` : `${RESERVED_TABS.length} reserved · ${WORKSPACE_TABS.length} registered`);

  // 9. The record reads as the archive does: the same factors and lessons on every accepted debrief of the 12 months.
  const rows = archiveFor({ tenant, viewer: hot, done: NONE, now: DEMO_NOW }, { period: '12m' }).rows.filter((r) => r.status === 'accepted');
  const wordsOff = rows.filter((r) => {
    const vm = ended.find((x) => x.l.tenderId === r.tenderId)?.vm;
    const sub = vm?.record.submission;
    if (!vm || !sub) return true;
    const lines = debriefLines(vm, sub);
    const factors = lines.find((x) => x.id === 'factors')?.text ?? '';
    const lessons = lines.find((x) => x.id === 'lessons')?.items ?? [];
    return factors !== (r.factorLabels.join(' · ') || 'None given') || lessons.length !== r.lessons.length || r.lessons.some((x) => !lessons.some((y) => y.endsWith(x.text)));
  }).map((r) => r.tenderId);
  add('The record and the archive say the same', !wordsOff.length, `${rows.length} accepted in the archive · off: ${list(wordsOff)}`);

  return out;
}

export default function DebriefTabCheck() {
  const tenant = useTenantKey();
  const rows = useMemo(() => (isGccTenantKey(tenant) ? checks(tenant) : []), [tenant]);
  if (!isGccTenantKey(tenant)) return <CardHead title="Debrief tab (plan 036)" meta="No GCC seed for this tenant" />;
  const failing = rows.filter((r) => !r.ok).length;
  return (
    <>
      <CardHead title="Debrief tab (plan 036)" meta={failing ? `${failing} of ${rows.length} failing` : `All ${rows.length} pass`} />
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

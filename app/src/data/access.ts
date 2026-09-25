import type { RoleKey } from './types';
import type { TenantWorld } from './tenants';
import { isRoleKey } from './roles';
import { personById, type Person, type Seat } from './people';
import { GCC_STAGES, STAGE_NUMBERS, stageShortLabel, type StageN } from './gcc/stages';

/**
 * What each persona sees and may do. The sidebar, the page guards, global
 * search and cross-role actions all read from here, so there is one definition
 * of scope.
 *
 * - Legacy screens (the Indian full-lifecycle preview) ask `canSee(role, page)`.
 * - GCC screens ask `can(person, capability, ctx)`, through `useCan()` and
 *   `useMask()` in `domain/permissions.ts`. Pages never check a role directly.
 */

export type PageKey = 'pipeline' | 'workflow' | 'agents' | 'submission' | 'suppliers' | 'library' | 'intake' | 'boq' | 'settings';

export interface RoleNavItem {
  key: string;
  label: string;
  /** Section on the persona's own dashboard (element id). */
  anchor?: string;
  /** Shared page. */
  page?: PageKey;
}

export interface RoleNavGroup { label: string; items: RoleNavItem[] }

export const SHARED_PAGES: PageKey[] = ['pipeline', 'workflow', 'settings'];

export const ROLE_NAV: Record<RoleKey, RoleNavGroup[]> = {
  coord: [
    { label: 'Stage 1 · Intake', items: [
      { key: 'queue', label: 'Validation queue', anchor: 'sec-queue' },
      { key: 'confidence', label: 'Extraction confidence', anchor: 'sec-confidence' },
      { key: 'intake', label: 'Intake today', anchor: 'sec-intake' },
      { key: 'uploads', label: 'Uploaded documents', page: 'intake' },
    ] },
  ],
  bid: [
    { label: 'Bid ownership', items: [
      { key: 'today', label: 'Needs you today', anchor: 'sec-today' },
      { key: 'register', label: 'Active bid register', anchor: 'sec-register' },
      { key: 'focus', label: 'T-2026-041 stage progress', anchor: 'sec-focus' },
      { key: 'resources', label: 'Resources and clashes', anchor: 'sec-resources' },
      { key: 'boq', label: 'BOQ and rates', page: 'boq' },
      { key: 'submission', label: 'Submission desk', page: 'submission' },
      { key: 'uploads', label: 'Uploaded documents', page: 'intake' },
    ] },
    { label: 'Reference', items: [
      { key: 'suppliers', label: 'Supplier database', page: 'suppliers' },
      { key: 'library', label: 'Artefacts library', page: 'library' },
    ] },
  ],
  proc: [
    { label: 'Stage 2 · Source', items: [
      { key: 'board', label: 'Package board', anchor: 'sec-board' },
      { key: 'quotes', label: 'Quote comparison', anchor: 'sec-quotes' },
      { key: 'boq', label: 'BOQ and rates', page: 'boq' },
    ] },
    { label: 'Reference', items: [
      { key: 'suppliers', label: 'Supplier database', page: 'suppliers' },
    ] },
  ],
  exec: [
    { label: 'Bid Committee', items: [
      { key: 'decisions', label: 'DG2 decisions', anchor: 'sec-decisions' },
      { key: 'stages', label: 'Pipeline by stage', anchor: 'sec-pipeline' },
      { key: 'margins', label: 'Portfolio margin', anchor: 'sec-margins' },
      { key: 'impact', label: 'Bid effort', anchor: 'sec-impact' },
    ] },
    { label: 'Governance', items: [
      { key: 'agents', label: 'Agent console', page: 'agents' },
    ] },
  ],
  comm: [
    { label: 'Stage 5 · Price', items: [
      { key: 'cost', label: 'Cost build-up', anchor: 'sec-cost' },
      { key: 'scenarios', label: 'Margin scenarios', anchor: 'sec-scenarios' },
      { key: 'reprice', label: 'Re-price log', anchor: 'sec-reprice' },
      { key: 'boq', label: 'BOQ and rates', page: 'boq' },
    ] },
    { label: 'Reference', items: [
      { key: 'suppliers', label: 'Supplier database', page: 'suppliers' },
    ] },
  ],
  prop: [
    { label: 'Stage 6 · Draft', items: [
      { key: 'sections', label: 'Section board', anchor: 'sec-sections' },
      { key: 'scoring', label: 'Evaluator scoring', anchor: 'sec-scoring' },
      { key: 'themes', label: 'Win themes', anchor: 'sec-themes' },
    ] },
    { label: 'Reference', items: [
      { key: 'library', label: 'Artefacts library', page: 'library' },
    ] },
  ],
  comp: [
    { label: 'Stage 7 · Verify', items: [
      { key: 'matrix', label: 'Compliance matrix', anchor: 'sec-matrix' },
      { key: 'gaps', label: 'Gaps & DG3', anchor: 'sec-gaps' },
      { key: 'redlines', label: 'Contract positions', anchor: 'sec-redlines' },
    ] },
    { label: 'Reference', items: [
      { key: 'library', label: 'Artefacts library', page: 'library' },
    ] },
  ],
  dir: [
    { label: 'Stage 9 · Delivery', items: [
      { key: 'projects', label: 'Projects', anchor: 'sec-projects' },
      { key: 'deviations', label: 'Deviations', anchor: 'sec-deviations' },
      { key: 'programme', label: 'Delivery programme', anchor: 'sec-programme' },
      { key: 'learning', label: 'Learning loop', anchor: 'sec-learning' },
    ] },
    { label: 'Governance', items: [
      { key: 'agents', label: 'Agent console', page: 'agents' },
      { key: 'suppliers', label: 'Supplier database', page: 'suppliers' },
    ] },
  ],
  // GCC role keys: no legacy screens. One empty group keeps the legacy sidebar's `[own, ...rest]` safe.
  hot: [{ label: '', items: [] }], member: [{ label: '', items: [] }], plan: [{ label: '', items: [] }], fin: [{ label: '', items: [] }],
  hr: [{ label: '', items: [] }], supplier: [{ label: '', items: [] }], platform: [{ label: '', items: [] }],
};

/**
 * Legacy page access. GCC tenants and GCC-only role keys see Settings only:
 * legacy pages read Indian data and are already redirected for GCC tenants.
 */
export function canSee(role: RoleKey, page: PageKey, world: TenantWorld = 'legacy-in'): boolean {
  if (world === 'gcc' || !isRoleKey(role)) return page === 'settings';
  if (SHARED_PAGES.includes(page)) return true;
  return ROLE_NAV[role].some((g) => g.items.some((i) => i.page === page));
}

/** The legacy personas who can open a page. */
export function rolesWith(page: PageKey): RoleKey[] {
  return (Object.keys(ROLE_NAV) as RoleKey[]).filter((r) => isRoleKey(r) && canSee(r, page));
}

export const PAGE_LABEL: Record<PageKey, string> = {
  pipeline: 'Pipeline', workflow: 'Workflow', agents: 'Agent console', submission: 'Submission desk',
  suppliers: 'Supplier database', library: 'Artefacts library', intake: 'Uploaded documents', boq: 'BOQ and rates', settings: 'Settings',
};

/* =====================================================================
 * GCC: capabilities, grants and `can()` (plan 003)
 * Sources: roles-and-access §6 and §9, kpi-and-screen-catalogue §C and §D.
 * ===================================================================== */

/**
 * How far a grant reaches.
 * - `tenant`: everything in the tenant.
 * - `sector`: tenders in the person's sector.
 * - `assigned`: tenders where the person is the Bid Manager.
 * - `invited`: tenders the person was invited to (contributors).
 * - `own`: records the person owns (their input, their credential, their RFQ).
 * - `seat`: needs a Bid Committee seat.
 */
export type Scope = 'tenant' | 'sector' | 'assigned' | 'invited' | 'own' | 'seat';

export type Capability =
  // viewing
  | 'tender.view' | 'radar.view' | 'queue.view' | 'screening.view' | 'dg1.view' | 'sourcing.view' | 'levelling.view'
  | 'supplier.view' | 'pack.view' | 'dg2.view' | 'company.view' | 'audit.view' | 'admin.view'
  // dashboards (dashboards.md §8.3, §9): the portfolio and the stage dashboards (which stages: `STAGE_ACCESS`)
  | 'portfolio.view' | 'stage.view'
  // Stage 1 / DG1
  | 'tender.create' | 'field.validate' | 'query.draft' | 'query.approve' | 'addendum.link' | 'booklet.request' | 'booklet.approve'
  | 'dg1.decide' | 'dg1.delegate' | 'reopen.request'
  // Stage 2
  | 'package.approve' | 'package.comment' | 'shortlist.approve' | 'rfq.send' | 'quote.level' | 'bestfit.approve' | 'supplier.manage'
  // Stage 3 / DG2
  | 'pack.issue' | 'pack.note' | 'input.request' | 'input.respond' | 'dg2.position' | 'dg2.decide' | 'dg2.secretary' | 'reopen.approve'
  // Stage 7 / DG3
  | 'dg3.view' | 'dg3.issue' | 'dg3.decide'
  // company, admin, platform
  | 'credential.manage' | 'credential.renew' | 'facility.edit'
  | 'admin.users' | 'admin.gates' | 'admin.sources' | 'admin.fit' | 'admin.targets' | 'admin.branding' | 'view.as'
  | 'platform.console' | 'platform.breakglass' | 'tenant.add'
  // sensitive data (masking)
  | 'see.margin' | 'see.quotes' | 'see.quotes.summary' | 'see.positions' | 'see.pii' | 'see.restricted'
  // supplier portal
  | 'portal.rfq';

type Grants = Partial<Record<Capability, Scope>>;
const all = (caps: Capability[], scope: Scope): Grants => Object.fromEntries(caps.map((c) => [c, scope]));

const ALL_VIEWS: Capability[] = [
  'tender.view', 'radar.view', 'queue.view', 'screening.view', 'dg1.view', 'sourcing.view', 'levelling.view',
  'supplier.view', 'pack.view', 'dg2.view', 'company.view', 'audit.view', 'admin.view',
];
const ADMIN: Capability[] = ['admin.users', 'admin.gates', 'admin.sources', 'admin.fit', 'admin.targets', 'admin.branding'];
/** Contributors: the invited tender and their own inputs. Stage owners add their stage dashboard (`STAGE_ACCESS`). */
const CONTRIBUTOR: Grants = { ...all(['tender.view', 'pack.view'], 'invited'), 'input.respond': 'own' };
const STAGE_OWNER: Grants = { ...CONTRIBUTOR, 'stage.view': 'tenant' };

/**
 * Which stage dashboards each role opens (dashboards.md §8.3). `stage.view` is
 * answered from here: the Head of Tendering and the CEO see all nine, the Bid
 * Manager 1–8, each stage owner their own stage. Roles not listed get none.
 */
export const STAGE_ACCESS: Record<RoleKey, StageN[]> = {
  hot: STAGE_NUMBERS, exec: STAGE_NUMBERS, bid: [1, 2, 3, 4, 5, 6, 7, 8],
  coord: [1], proc: [2], member: [3], plan: [4], comm: [5], prop: [6], comp: [7], dir: [9],
  fin: [], hr: [], supplier: [], platform: [],
};

/** What each role may see and do. Anything not listed is denied. */
export const GRANTS: Record<RoleKey, Grants> = {
  hot: {
    ...all(ALL_VIEWS, 'tenant'),
    ...all(['portfolio.view', 'stage.view', 'dg3.view'], 'tenant'),
    ...all(['tender.create', 'field.validate', 'query.draft', 'query.approve', 'addendum.link', 'booklet.approve',
      'dg1.delegate', 'reopen.request', 'input.request', 'dg2.secretary', 'credential.manage', ...ADMIN, 'view.as'], 'tenant'),
    // The final approvals (dashboards.md §9): DG2 after the committee's positions, DG3 on Compliance's pack.
    ...all(['dg2.decide', 'dg3.decide', 'reopen.approve'], 'tenant'),
    ...all(['see.margin', 'see.quotes', 'see.positions', 'see.pii', 'see.restricted'], 'tenant'),
  },
  coord: {
    ...all(['tender.view', 'radar.view', 'queue.view', 'screening.view', 'dg1.view', 'company.view', 'stage.view'], 'tenant'),
    ...all(['tender.create', 'field.validate', 'query.draft', 'addendum.link', 'booklet.request'], 'tenant'),
  },
  bid: {
    ...all(['tender.view', 'radar.view', 'queue.view', 'screening.view', 'dg1.view', 'sourcing.view', 'levelling.view', 'pack.view', 'dg2.view', 'dg3.view', 'company.view', 'stage.view'], 'tenant'),
    'portfolio.view': 'assigned',
    ...all(['dg1.decide', 'query.approve', 'package.comment', 'pack.issue', 'pack.note', 'input.request', 'reopen.request',
      'see.margin', 'see.quotes.summary', 'see.positions'], 'assigned'),
  },
  proc: {
    ...all(['tender.view', 'sourcing.view', 'levelling.view', 'supplier.view', 'company.view', 'stage.view'], 'tenant'),
    ...all(['package.approve', 'shortlist.approve', 'rfq.send', 'quote.level', 'bestfit.approve', 'supplier.manage', 'see.quotes'], 'tenant'),
  },
  // The CEO is an ordinary committee member (seat `ceo`): read everything, record a DG2 position, approve nothing.
  exec: {
    ...all(ALL_VIEWS.filter((c) => c !== 'admin.view'), 'tenant'),
    ...all(['portfolio.view', 'stage.view'], 'tenant'),
    'dg2.position': 'seat',
    ...all(['see.margin', 'see.quotes.summary', 'see.positions', 'see.restricted'], 'tenant'),
  },
  member: {
    ...all(['tender.view', 'pack.view', 'dg2.view', 'company.view', 'stage.view'], 'tenant'),
    'dg2.position': 'seat',
    // Tenant-configurable later (catalogue §C.5); default yes for committee members.
    ...all(['see.margin', 'see.positions', 'see.quotes.summary'], 'tenant'),
  },
  comm: {
    ...all(['tender.view', 'levelling.view', 'pack.view'], 'invited'),
    'input.respond': 'own',
    'stage.view': 'tenant',
    ...all(['see.margin', 'see.quotes'], 'invited'),
  },
  plan: STAGE_OWNER,
  comp: { ...STAGE_OWNER, ...all(['dg3.view', 'dg3.issue'], 'tenant') },
  dir: STAGE_OWNER,
  // The Proposal Manager owns Stage 6 (R11). The Indian preview's `prop` persona keeps using `canSee`.
  prop: { 'tender.view': 'tenant', 'pack.view': 'invited', 'stage.view': 'tenant', 'input.respond': 'own' },
  // Finance and HR open Company to reach the credentials they own (R11).
  fin: { ...CONTRIBUTOR, 'company.view': 'tenant', 'facility.edit': 'tenant', 'credential.renew': 'own' },
  hr: { 'company.view': 'tenant', 'credential.renew': 'own' },
  supplier: { 'portal.rfq': 'own' },
  platform: all(['platform.console', 'platform.breakglass', 'tenant.add'], 'tenant'),
};

/** How a role is named in a reason sentence. */
const HOLDER: Record<RoleKey, string> = {
  hot: 'the Head of Tendering', coord: 'the Tender Coordinator', bid: 'the Bid Manager', proc: 'the Procurement Lead',
  exec: 'the CEO', member: 'Bid Committee members', comm: 'the Commercial Manager', plan: 'the Planning Manager',
  comp: 'the Compliance / Legal Lead', dir: 'the Project Director', fin: 'Finance / Treasury', hr: 'HR',
  supplier: 'the supplier', platform: 'Catalyst operators', prop: 'the Proposal Manager',
};

/** Each capability as the subject of a sentence: "Sending RFQs is for the Procurement Lead". */
const CAP_TEXT: Record<Capability, string> = {
  'tender.view': 'This tender', 'radar.view': 'The tender radar', 'queue.view': 'The intake queue', 'screening.view': 'Screening',
  'dg1.view': 'DG1 decisions', 'sourcing.view': 'Packages and RFQs', 'levelling.view': 'Quote levelling', 'supplier.view': 'The supplier master',
  'pack.view': 'The Bid / No-Bid pack', 'dg2.view': 'The DG2 committee', 'company.view': 'The company profile', 'audit.view': 'The audit log',
  'admin.view': 'Administration', 'portfolio.view': 'The portfolio dashboard', 'stage.view': 'The stage dashboards',
  'tender.create': 'Creating tenders', 'field.validate': 'Validating fields', 'query.draft': 'Drafting queries', 'query.approve': 'Approving queries',
  'addendum.link': 'Linking addenda', 'booklet.request': 'Requesting a booklet purchase', 'booklet.approve': 'Approving a booklet purchase',
  'dg1.decide': 'Recording DG1', 'dg1.delegate': 'Recording DG1 as a delegate', 'reopen.request': 'Requesting a re-open',
  'package.approve': 'Approving packages', 'package.comment': 'Commenting on packages', 'shortlist.approve': 'Approving the shortlist',
  'rfq.send': 'Sending RFQs', 'quote.level': 'Levelling quotes', 'bestfit.approve': 'Approving the best-fit mix', 'supplier.manage': 'Managing suppliers',
  'pack.issue': 'Issuing the pack', 'pack.note': "Editing the presenter's note", 'input.request': 'Requesting inputs', 'input.respond': 'Answering input requests',
  'dg2.position': 'Recording a DG2 position', 'dg2.decide': 'Recording the DG2 decision', 'dg2.secretary': 'Acting as committee secretary',
  'reopen.approve': 'Approving a re-open',
  'dg3.view': 'DG3 approvals', 'dg3.issue': 'Issuing the DG3 pack', 'dg3.decide': 'Approving DG3',
  'credential.manage': 'Managing credentials', 'credential.renew': 'Renewing credentials', 'facility.edit': 'Editing bank facilities',
  'admin.users': 'Managing users and roles', 'admin.gates': 'Setting committees and gates', 'admin.sources': 'Managing sources',
  'admin.fit': 'Changing the fit model', 'admin.targets': 'Setting targets and SLAs', 'admin.branding': 'Changing the branding', 'view.as': 'View as',
  'platform.console': 'The Platform Console', 'platform.breakglass': 'Break-glass access', 'tenant.add': 'Adding tenants',
  'see.margin': 'Margin', 'see.quotes': 'Supplier quotes', 'see.quotes.summary': 'Levelled quote summaries', 'see.positions': 'Committee positions',
  'see.pii': 'Personal data', 'see.restricted': 'The restricted lane',
  'portal.rfq': 'The Supplier Portal RFQ',
};

/** Masking reasons (roles-and-access §9). */
const MASKED: Partial<Record<Capability, string>> = {
  'see.margin': 'Margin is masked for your role',
  'see.quotes': 'Supplier quotes are masked for your role',
  'see.quotes.summary': 'Supplier quotes are masked for your role',
  'see.positions': 'Committee positions are masked for your role',
  'see.pii': 'Personal data is masked for your role',
  'see.restricted': 'Restricted-lane tenders are visible to cleared people only',
};

export interface CanCtx {
  tender?: { bidManagerId?: string; sector?: string; invited?: string[]; restricted?: boolean };
  /** For `stage.view`: which stage. Without it the answer is "any stage at all", which is what navigation asks. */
  stage?: number;
  ownerId?: string;
  seat?: Seat;
  /** The presenter is viewing as this person: read only. */
  viewAs?: boolean;
}

export interface CanResult { ok: boolean; reason?: string }

const OK: CanResult = { ok: true };
const no = (reason: string): CanResult => ({ ok: false, reason });

/** Viewing and masked-data checks stay open under View as; everything else is a write. */
export const isReadCap = (cap: Capability) => cap.endsWith('.view') || cap.startsWith('see.');

const nameOf = (id?: string) => personById(id)?.name;

function joinAnd(xs: string[]): string {
  return xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

/** The roles granted a capability. */
const holderRoles = (cap: Capability) => (Object.keys(GRANTS) as RoleKey[]).filter((r) => GRANTS[r][cap]);

/** Who may see or do something, for a tooltip: "the Head of Tendering, the CEO and Bid Committee members". */
export function holdersOf(cap: Capability): string {
  return joinAnd(holderRoles(cap).map((r) => HOLDER[r]));
}

/** `stage.view`: the role's `STAGE_ACCESS` decides. */
function stageView(person: Person, stage?: number): CanResult {
  const stages = STAGE_ACCESS[person.role];
  if (stage === undefined) return stages.length ? OK : no('The stage dashboards are outside your role');
  return (stages as number[]).includes(stage) ? OK : no(`Stage ${stage} is outside your role`);
}

/** Why a role without the grant cannot do something, naming who can when that is short enough to read. */
function notGranted(person: Person, cap: Capability, ctx: CanCtx): string {
  if (MASKED[cap]) return MASKED[cap]!;
  if (cap === 'dg1.decide') {
    const bm = nameOf(ctx.tender?.bidManagerId);
    const who = bm ? `Only the assigned Bid Manager, ${bm}, records DG1` : 'Only the assigned Bid Manager records DG1';
    return GRANTS[person.role]['dg1.delegate'] ? `${who}. You can record it as their delegate, with a reason` : who;
  }
  if (cap === 'dg2.decide') return 'Only the Head of Tendering approves DG2';
  if (cap === 'dg3.decide') return 'Only the Head of Tendering approves DG3';
  if (cap === 'dg3.issue') return 'Only Compliance issues the DG3 pack';
  if (cap === 'dg2.position') return 'Only Bid Committee members record a position';
  if (cap === 'stage.view') return ctx.stage ? `Stage ${ctx.stage} is outside your role` : 'The stage dashboards are outside your role';
  const holders = holderRoles(cap).map((r) => HOLDER[r]);
  if (holders.length && holders.length <= 3) return `${CAP_TEXT[cap]} is for ${joinAnd(holders)}`;
  return `${CAP_TEXT[cap]} is outside your role`;
}

/**
 * The one permission check for GCC screens. Reasons are user-facing sentences.
 * With no tender (or no owner) in `ctx`, scoped grants answer at list level:
 * "may this person see such things at all", which is what navigation asks.
 */
export function can(person: Person, cap: Capability, ctx: CanCtx = {}): CanResult {
  if (ctx.viewAs && !isReadCap(cap)) return no(`Viewing as ${person.name}. Read only`);
  const grants = GRANTS[person.role];
  const t = ctx.tender;
  if (t?.restricted && !(grants['see.restricted'] && person.cleared)) return no('This tender is in the restricted lane. Only cleared people can open it');
  const scope = grants[cap];
  if (!scope) return no(notGranted(person, cap, ctx));
  if (cap === 'stage.view') return stageView(person, ctx.stage);
  switch (scope) {
    case 'tenant':
      return OK;
    case 'assigned': {
      if (!t) return OK;
      if (t.bidManagerId === person.id) return OK;
      const bm = nameOf(t.bidManagerId);
      if (cap === 'dg1.decide') return no(bm ? `Only the assigned Bid Manager, ${bm}, records DG1` : 'This tender has no assigned Bid Manager yet');
      if (MASKED[cap]) return no(MASKED[cap]!.replace('for your role', 'on tenders not assigned to you'));
      return no(bm ? `${CAP_TEXT[cap]} on this tender is for its Bid Manager, ${bm}` : 'This tender has no assigned Bid Manager yet');
    }
    case 'sector':
      return !t || t.sector === person.sector ? OK : no(`This tender is outside your sector (${person.sector ?? 'none'})`);
    case 'invited':
      return !t || t.invited?.includes(person.id) ? OK : no('This tender has not been shared with you. Its Bid Manager can invite you');
    case 'own':
      return ctx.ownerId === undefined || ctx.ownerId === person.id ? OK : no(`Only ${nameOf(ctx.ownerId) ?? 'its owner'} can update this`);
    case 'seat':
      return person.seat ? OK : no('Only Bid Committee members record a position');
  }
}

/* =====================================================================
 * GCC navigation model (dashboards.md §8.3). Data only: the sidebar renders it.
 * Dashboard on top, then Calendar and My requests; the nine numbered stages the
 * person may open, each with its working screens; Company; and Administration
 * and Settings pinned to the bottom.
 * ===================================================================== */

export interface GccNavItem {
  key: string;
  label: string;
  path: string;
  /** No capability: everyone (Dashboard; Settings holds the demo controls). */
  cap?: Capability;
  gate?: 'DG1' | 'DG2' | 'DG3';
  /** A stage entry: shown when `can(person, 'stage.view', { stage })`. Its path opens the stage dashboard. */
  stage?: StageN;
  /** Working screens under a stage, or Administration's pages. */
  children?: GccNavItem[];
}

export interface GccNavGroup {
  key: string;
  /** Section label above the group ("Stages"); none for the others. */
  label?: string;
  /** Pinned to the bottom of the rail, below a divider. */
  pinned?: 'bottom';
  items: GccNavItem[];
}

/** The working screens under each stage (dashboards.md §8.1). Stages 4–9 other than 7 have a dashboard only. */
const STAGE_SCREENS: Partial<Record<StageN, GccNavItem[]>> = {
  1: [
    { key: 'radar', label: 'Tender radar', path: '/radar', cap: 'radar.view' },
    { key: 'intake-queue', label: 'Intake queue', path: '/intake-queue', cap: 'queue.view' },
    { key: 'screening', label: 'Screening', path: '/screening', cap: 'screening.view' },
    { key: 'dg1', label: 'DG1 decisions', path: '/dg1', cap: 'dg1.view', gate: 'DG1' },
  ],
  2: [
    { key: 'sourcing', label: 'Packages & RFQs', path: '/sourcing', cap: 'sourcing.view' },
    { key: 'levelling', label: 'Quote levelling', path: '/levelling', cap: 'levelling.view' },
    { key: 'suppliers', label: 'Suppliers', path: '/suppliers', cap: 'supplier.view' },
  ],
  3: [
    { key: 'packs', label: 'Bid packs', path: '/packs', cap: 'pack.view' },
    { key: 'dg2', label: 'DG2 approvals', path: '/dg2', cap: 'dg2.view', gate: 'DG2' },
  ],
  7: [
    { key: 'dg3', label: 'DG3 approvals', path: '/dg3', cap: 'dg3.view', gate: 'DG3' },
  ],
};

export const NAV_GCC: GccNavGroup[] = [
  { key: 'top', items: [
    { key: 'dashboard', label: 'Dashboard', path: '/' },
    { key: 'calendar', label: 'Calendar', path: '/calendar', cap: 'tender.view' },
    // Only for people who owe inputs; the sidebar hides it where My requests is already the home.
    { key: 'requests', label: 'My requests', path: '/requests', cap: 'input.respond' },
  ] },
  { key: 'stages', label: 'Stages', items: GCC_STAGES.map((st) => ({
    key: `stage-${st.n}`, label: stageShortLabel(st.n), path: `/stages/${st.n}`, cap: 'stage.view' as const, stage: st.n,
    children: STAGE_SCREENS[st.n] ?? [],
  })) },
  { key: 'company', items: [
    { key: 'company', label: 'Company', path: '/company', cap: 'company.view' },
  ] },
  { key: 'bottom', pinned: 'bottom', items: [
    { key: 'admin', label: 'Administration', path: '/admin', cap: 'admin.view', children: [
      { key: 'admin-users', label: 'Users & roles', path: '/admin/users', cap: 'admin.users' },
      { key: 'admin-committees', label: 'Committees & gates', path: '/admin/committees', cap: 'admin.gates' },
      { key: 'admin-sources', label: 'Sources & integrations', path: '/admin/sources', cap: 'admin.sources' },
      { key: 'admin-fit', label: 'Fit model & rules', path: '/admin/fit', cap: 'admin.fit' },
      { key: 'admin-targets', label: 'Targets & SLAs', path: '/admin/targets', cap: 'admin.targets' },
      { key: 'admin-branding', label: 'Branding', path: '/admin/branding', cap: 'admin.branding' },
      { key: 'admin-audit', label: 'Audit log', path: '/admin/audit', cap: 'audit.view' },
    ] },
    { key: 'settings', label: 'Settings', path: '/settings' },
  ] },
];

/**
 * The navigation a person gets: `NAV_GCC` filtered by `can`. Stage entries need
 * `stage.view` for their stage; every other entry and child needs its own
 * capability; empty groups are dropped.
 *
 * Self-check against dashboards.md §8.3 (every role also gets Dashboard and Settings):
 *
 * | Role                 | Calendar | My requests | Stages, and their screens                                                        | Company | Administration |
 * | -------------------- | -------- | ----------- | -------------------------------------------------------------------------------- | ------- | -------------- |
 * | hot                  | yes      | no          | 1–9 · 1: radar, queue, screening, DG1 · 2: packages, levelling, suppliers · 3: packs, DG2 · 7: DG3 | yes | all 7 |
 * | exec                 | yes      | no          | 1–9 · 1: radar, queue, screening, DG1 · 2: all three · 3: packs, DG2               | yes     | no             |
 * | bid                  | yes      | no          | 1–8 · 1: radar, queue, screening, DG1 · 2: packages, levelling · 3: packs, DG2 · 7: DG3 | yes | no          |
 * | coord                | yes      | no          | 1 · radar, queue, screening, DG1                                                 | yes     | no             |
 * | proc                 | yes      | no          | 2 · packages, levelling, suppliers                                               | yes     | no             |
 * | member               | yes      | no          | 3 · packs, DG2                                                                   | yes     | no             |
 * | plan, comm, prop, dir| yes      | yes         | their own stage (4, 5, 6, 9), no screens                                         | no      | no             |
 * | comp                 | yes      | yes         | 7 · DG3                                                                          | no      | no             |
 * | fin                  | yes      | home        | none                                                                             | yes     | no             |
 * | hr                   | no       | home        | none                                                                             | yes     | no             |
 * | supplier, platform   | no       | no          | none                                                                             | no      | no             |
 *
 * The supplier gets the Supplier Portal (plan 008) and the operator the Platform Console (plan 011), each in its own shell.
 */
export function navFor(person: Person, viewAs = false): GccNavGroup[] {
  const ok = (it: GccNavItem) => !it.cap || can(person, it.cap, { viewAs, stage: it.stage }).ok;
  const keep = (it: GccNavItem): GccNavItem | null =>
    ok(it) ? { ...it, children: it.children?.filter(ok) } : null;
  return NAV_GCC
    .map((g) => ({ ...g, items: g.items.map(keep).filter((it): it is GccNavItem => it !== null) }))
    .filter((g) => g.items.length > 0);
}

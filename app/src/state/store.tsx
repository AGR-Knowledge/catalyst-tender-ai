import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import type { RoleKey, Tone } from '@/data/types';
import type { ScenarioKey } from '@/data/workspace';
import { DEFAULT_TENANT, LEGACY_TENANT, TENANTS, nameStop, type Tenant } from '@/data/tenants';
import { isRoleKey } from '@/data/roles';
import { belongsTo, counterpartIn, defaultPersonOf, firstWithRole, personById, type Person } from '@/data/people';
import { can } from '@/data/access';
import { DEMO_TIME, DEMO_TODAY } from '@/domain/calendar';
import { EXIT_MS } from './presence';

/* Overlay descriptors. Overlays render from live state, so they never go stale. */
export type DrawerSpec =
  | { type: 'tender'; id: string }
  | { type: 'agent'; index: number }
  | { type: 'supplier'; name: string }
  | { type: 'package'; key: string }
  | { type: 'artefact'; index: number }
  | { type: 'project'; key: string }
  | { type: 'redline'; key: string }
  | { type: 'cost'; key: string }
  | { type: 'tenant'; key: string };

export type ModalSpec =
  | { type: 'dg1'; id: string }
  | { type: 'dg2'; id: string }
  | { type: 'validation'; key: string }
  | { type: 'gap' }
  | { type: 'dg3' }
  | { type: 'submit' }
  | { type: 'sme' }
  | { type: 'reset' }
  | { type: 'upload' }
  | { type: 'tenant-add' }
  | { type: 'handover'; from: RoleKey };

export interface Toast { id: number; msg: string; tone: Tone; leaving?: boolean }

/** A document dropped into the upload modal. Processing is timed from `startedAt`, so it carries on if the modal closes. */
export interface Upload {
  id: string;
  file: string;
  size: number;
  startedAt: number;
  /** Tender id once the extraction is added to the register. */
  tenderId?: string;
  /** Who uploaded it (persona name). */
  by: string;
  /** The tenant it was uploaded in. Stamped by the store. */
  tenant: string;
}

/** Bucket for platform actions (tenant onboarding), which belong to no one tenant. */
export const PLATFORM_BUCKET = '__platform';
/** Onboarding keys (`domain/tenants.ts`) are platform actions. */
const bucketOf = (key: string, tenant: string) => (key.startsWith('tn-') ? PLATFORM_BUCKET : tenant);

export type ResetScope = 'tenant' | 'all';

/** One line of a tenant's audit trail. Times run on the demo clock, from 10:00 on demo day, a minute apart. */
export interface AuditEvent {
  id: string;
  /** Demo date-time, `YYYY-MM-DDTHH:MM`, in the tenant's time zone. */
  at: string;
  actorId: string;
  action: string;
  target?: string;
  detail?: string;
  /**
   * What `detail` reveals, when it is confidential (orchestrator contract, wave 4):
   * readers show the detail only to viewers who may see it (`see.margin`,
   * `see.positions`, `see.quotes`). A DG2 position, a margin figure or a quote
   * amount in a demo audit entry must set this.
   */
  sensitive?: 'margin' | 'positions' | 'quotes';
}

interface Persisted {
  /** The tenant the presenter is working in. */
  tenant: string;
  /** Actions taken during the demo, per tenant. Value records the outcome (e.g. 'approved', 'declined'). */
  doneBy: Record<string, Record<string, string>>;
  /** Every tenant's uploads. */
  uploads: Upload[];
  /** Tenants created during the demo, on top of the seeded ones. */
  tenants: Tenant[];
  scenario: ScenarioKey;
  /** The persona the presenter is acting as, per tenant (tenant → person id). Kept across Reset. */
  personBy: Record<string, string>;
  /** Audit trail per tenant. Reset clears it. */
  auditBy: Record<string, AuditEvent[]>;
  showBanner: boolean;
}

interface Inner extends Omit<Persisted, 'uploads'> {
  uploadsAll: Upload[];
  /** Head of Tendering's "View as" (person id). Session only, cleared on tenant switch. */
  viewAs: string | null;
  drawer: DrawerSpec | null;
  modal: ModalSpec | null;
  toasts: Toast[];
}

/** What pages read. `done`, `uploads` and `audit` are the active tenant's only. */
interface State extends Inner {
  done: Record<string, string>;
  uploads: Upload[];
  audit: AuditEvent[];
  /** Who the screens are for: the viewed person during View as, otherwise the persona. Read-only while viewing. */
  person: Person;
  /** The persona the presenter picked, even during View as. */
  realPerson: Person;
  /** `person.role`, for legacy readers. */
  role: RoleKey;
}

type Action =
  | { type: 'mark'; key: string; value: string }
  | { type: 'scenario'; value: ScenarioKey }
  | { type: 'person'; id: string }
  | { type: 'viewAs'; id: string | null }
  | { type: 'audit'; value: Omit<AuditEvent, 'id' | 'at'> }
  | { type: 'banner'; value: boolean }
  | { type: 'drawer'; value: DrawerSpec | null }
  | { type: 'modal'; value: ModalSpec | null }
  | { type: 'toast'; value: Toast }
  | { type: 'untoast'; id: number }
  | { type: 'toastLeave'; id: number }
  | { type: 'tenant'; value: string }
  | { type: 'addUpload'; value: Upload }
  | { type: 'registerUpload'; id: string; tenderId: string }
  | { type: 'removeUpload'; id: string }
  | { type: 'addTenant'; value: Tenant }
  | { type: 'reset'; scope: ResetScope };

const STORAGE_KEY = 'ctai.demo.v2';
const V1_KEY = 'ctai.demo.v1';
const DEFAULTS: Persisted = { tenant: DEFAULT_TENANT, doneBy: {}, uploads: [], tenants: [], scenario: 'base', personBy: {}, auditBy: {}, showBanner: true };
/** Oldest entries drop off beyond this, so a long session cannot fill storage. */
const AUDIT_CAP = 200;

const isSwitchable = (key: unknown): key is string => typeof key === 'string' && TENANTS.some((t) => t.key === key && t.switchable);
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function strings(v: unknown): Record<string, string> {
  if (!isRecord(v)) return {};
  return Object.fromEntries(Object.entries(v).filter(([, x]) => typeof x === 'string')) as Record<string, string>;
}

function uploadsOf(v: unknown, fallbackTenant: string): Upload[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((u) => u && typeof u.id === 'string' && typeof u.file === 'string')
    .map((u) => ({ ...u, tenant: typeof u.tenant === 'string' ? u.tenant : fallbackTenant }));
}

function common(p: Record<string, unknown>) {
  return {
    tenants: Array.isArray(p.tenants) ? (p.tenants as Tenant[]).filter((t) => t && typeof t.key === 'string' && typeof t.name === 'string') : [],
    scenario: (p.scenario === 'stretch' || p.scenario === 'defensive' ? p.scenario : 'base') as ScenarioKey,
    auditBy: auditOf(p.auditBy),
    showBanner: p.showBanner !== false,
  };
}

/** Saved personas that still exist in their tenant. Before plan 003 one global `role` was saved: it carries into the tenant being worked in. */
function personasOf(p: Record<string, unknown>, tenant: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [t, id] of Object.entries(strings(p.personBy))) {
    const person = personById(id);
    if (person && belongsTo(person, t)) out[t] = id;
  }
  if (!out[tenant] && typeof p.role === 'string' && isRoleKey(p.role)) {
    const legacy = firstWithRole(tenant, p.role);
    if (legacy) out[tenant] = legacy.id;
  }
  return out;
}

function auditOf(v: unknown): Record<string, AuditEvent[]> {
  if (!isRecord(v)) return {};
  const ok = (e: unknown): e is AuditEvent => isRecord(e) && typeof e.id === 'string' && typeof e.at === 'string' && typeof e.actorId === 'string' && typeof e.action === 'string';
  return Object.fromEntries(Object.entries(v).map(([t, list]) => [t, Array.isArray(list) ? list.filter(ok) : []]));
}

/** The persona in a tenant: the saved one if it still belongs there, else the tenant's default. */
function personaIn(personBy: Record<string, string>, tenant: string): Person {
  const saved = personById(personBy[tenant]);
  return saved && belongsTo(saved, tenant) ? saved : defaultPersonOf(tenant);
}

/** The next audit time: 10:00 on demo day for the first entry, then a minute after the last. */
function nextAuditAt(list: AuditEvent[]): string {
  const last = list[list.length - 1];
  const base = last ? Date.parse(`${last.at}:00Z`) + 60_000 : Date.parse(`${DEMO_TODAY}T${DEMO_TIME}:00Z`);
  return new Date(base).toISOString().slice(0, 16);
}

function appendAudit(auditBy: Record<string, AuditEvent[]>, tenant: string, e: Omit<AuditEvent, 'id' | 'at'>): Record<string, AuditEvent[]> {
  const list = auditBy[tenant] ?? [];
  const n = Number(list[list.length - 1]?.id.split('.').pop()) || 0;
  const event: AuditEvent = { id: `${tenant}.${n + 1}`, at: nextAuditAt(list), ...e };
  return { ...auditBy, [tenant]: [...list, event].slice(-AUDIT_CAP) };
}

const tenantName = (key: string) => TENANTS.find((t) => t.key === key)?.name ?? key;

/** v1 held one `done` map for the Indian demo. Its progress moves to `gen-in`, and onboarding ticks to the platform. */
function migrateV1(p: Record<string, unknown>): Persisted {
  const legacy: Record<string, string> = {};
  const platform: Record<string, string> = {};
  for (const [k, v] of Object.entries(strings(p.done))) (bucketOf(k, LEGACY_TENANT) === PLATFORM_BUCKET ? platform : legacy)[k] = v;
  return {
    ...common(p),
    // The browser was running the Indian demo, so it reopens there.
    tenant: LEGACY_TENANT,
    doneBy: { [LEGACY_TENANT]: legacy, [PLATFORM_BUCKET]: platform },
    uploads: uploadsOf(p.uploads, LEGACY_TENANT),
    personBy: personasOf(p, LEGACY_TENANT),
  };
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const old = localStorage.getItem(V1_KEY);
      if (!old) return DEFAULTS;
      const migrated = migrateV1(JSON.parse(old) as Record<string, unknown>);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      localStorage.removeItem(V1_KEY);
      return migrated;
    }
    const p = JSON.parse(raw) as Record<string, unknown>;
    const doneBy = isRecord(p.doneBy) ? Object.fromEntries(Object.entries(p.doneBy).map(([t, d]) => [t, strings(d)])) : {};
    const tenant = isSwitchable(p.tenant) ? p.tenant : DEFAULT_TENANT;
    return {
      ...common(p),
      tenant,
      doneBy,
      uploads: uploadsOf(p.uploads, LEGACY_TENANT),
      personBy: personasOf(p, tenant),
    };
  } catch {
    return DEFAULTS;
  }
}

function reducer(s: Inner, a: Action): Inner {
  switch (a.type) {
    case 'mark': {
      const b = bucketOf(a.key, s.tenant);
      return { ...s, doneBy: { ...s.doneBy, [b]: { ...s.doneBy[b], [a.key]: a.value } }, modal: null, drawer: null };
    }
    case 'scenario': return { ...s, scenario: a.value };
    case 'person': {
      const next = personById(a.id);
      if (!next || !belongsTo(next, s.tenant)) return s;
      const prev = personaIn(s.personBy, s.tenant);
      if (next.id === prev.id) return { ...s, viewAs: null };
      return {
        ...s, viewAs: null,
        personBy: { ...s.personBy, [s.tenant]: next.id },
        auditBy: appendAudit(s.auditBy, s.tenant, { actorId: next.id, action: 'Persona switched (demo control)', detail: `From ${prev.name}` }),
      };
    }
    case 'viewAs': {
      const real = personaIn(s.personBy, s.tenant);
      if (a.id === null) {
        if (!s.viewAs) return s;
        return { ...s, viewAs: null, auditBy: appendAudit(s.auditBy, s.tenant, { actorId: real.id, action: 'View as ended', target: s.viewAs }) };
      }
      const target = personById(a.id);
      if (!target || target.id === real.id || !belongsTo(target, s.tenant) || !can(real, 'view.as').ok) return s;
      return {
        ...s, viewAs: target.id, drawer: null, modal: null,
        auditBy: appendAudit(s.auditBy, s.tenant, { actorId: real.id, action: 'View as started', target: target.id, detail: 'Read only' }),
      };
    }
    case 'audit': return { ...s, auditBy: appendAudit(s.auditBy, s.tenant, a.value) };
    case 'banner': return { ...s, showBanner: a.value };
    case 'tenant': {
      if (!isSwitchable(a.value) || a.value === s.tenant) return s;
      // The same role (and committee seat) carries across; otherwise the tenant's default persona.
      const next = counterpartIn(a.value, personaIn(s.personBy, s.tenant));
      return {
        ...s, tenant: a.value, viewAs: null, drawer: null, modal: null,
        personBy: { ...s.personBy, [a.value]: next.id },
        auditBy: appendAudit(s.auditBy, a.value, { actorId: next.id, action: 'Company switched (demo control)', detail: `From ${tenantName(s.tenant)}` }),
      };
    }
    case 'drawer': return { ...s, drawer: a.value, modal: null };
    case 'modal': return { ...s, modal: a.value };
    case 'toast': return { ...s, toasts: [...s.toasts.slice(-3), a.value] };
    case 'untoast': return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) };
    case 'toastLeave': return { ...s, toasts: s.toasts.map((t) => (t.id === a.id ? { ...t, leaving: true } : t)) };
    case 'addUpload': return { ...s, uploadsAll: [...s.uploadsAll, a.value] };
    case 'registerUpload': return { ...s, uploadsAll: s.uploadsAll.map((u) => (u.id === a.id ? { ...u, tenderId: a.tenderId } : u)) };
    case 'removeUpload': return { ...s, uploadsAll: s.uploadsAll.filter((u) => u.id !== a.id) };
    case 'addTenant': return { ...s, tenants: [...s.tenants, a.value] };
    case 'reset': {
      // Theme, persona, banner and the tenant you are in are kept. View as ends.
      if (a.scope === 'all') return { ...s, doneBy: {}, uploadsAll: [], tenants: [], auditBy: {}, scenario: 'base', viewAs: null, drawer: null, modal: null };
      const { [s.tenant]: _cleared, ...doneBy } = s.doneBy;
      const { [s.tenant]: _audit, ...auditBy } = s.auditBy;
      return {
        ...s, doneBy, auditBy, viewAs: null, uploadsAll: s.uploadsAll.filter((u) => u.tenant !== s.tenant),
        // The price scenario belongs to the Indian preview's tenders.
        scenario: s.tenant === LEGACY_TENANT ? 'base' : s.scenario,
        drawer: null, modal: null,
      };
    }
  }
}

interface Api {
  state: State;
  is: (key: string) => boolean;
  val: (key: string) => string | undefined;
  mark: (key: string, msg?: string, tone?: Tone, value?: string) => void;
  toast: (msg: string, tone?: Tone) => void;
  setScenario: (v: ScenarioKey) => void;
  /** Demo control: act as this person in the active tenant. Ends any View as. */
  setPerson: (id: string) => void;
  /** Legacy: act as the tenant's first person with this role, so `/dashboard/:role` keeps working. */
  setRole: (v: RoleKey) => void;
  /** Head of Tendering only (`view.as`): see the workspace as someone else, read only. */
  startViewAs: (id: string) => void;
  stopViewAs: () => void;
  /** Adds an entry to the active tenant's audit trail, on the demo clock. */
  logAudit: (e: Omit<AuditEvent, 'id' | 'at'>) => void;
  setBanner: (v: boolean) => void;
  openDrawer: (d: DrawerSpec) => void;
  closeDrawer: () => void;
  openModal: (m: ModalSpec) => void;
  closeModal: () => void;
  /** Demo control: work in another tenant. Closes any drawer or modal. */
  setTenant: (key: string) => void;
  /** Clears the active tenant's actions and uploads, or every tenant's (with onboarding and added tenants). */
  reset: (scope?: ResetScope) => void;
  /** The store stamps the active tenant. */
  addUpload: (u: Omit<Upload, 'tenant'>) => void;
  registerUpload: (id: string, tenderId: string) => void;
  removeUpload: (id: string) => void;
  addTenant: (t: Tenant) => void;
}

const Ctx = createContext<Api | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [inner, dispatch] = useReducer(reducer, undefined, () => {
    const { uploads, ...p } = load();
    return { ...p, uploadsAll: uploads, viewAs: null, drawer: null, modal: null, toasts: [] };
  });
  const seq = useRef(0);

  useEffect(() => {
    try {
      const { tenant, doneBy, uploadsAll, tenants, scenario, personBy, auditBy, showBanner } = inner;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tenant, doneBy, uploads: uploadsAll, tenants, scenario, personBy, auditBy, showBanner }));
    } catch { /* storage unavailable; the demo still works in memory */ }
  }, [inner.tenant, inner.doneBy, inner.uploadsAll, inner.tenants, inner.scenario, inner.personBy, inner.auditBy, inner.showBanner]); // eslint-disable-line react-hooks/exhaustive-deps

  // Brand tokens follow the tenant (`:root[data-tenant=…]` in tokens.css).
  useEffect(() => { document.documentElement.dataset.tenant = inner.tenant; }, [inner.tenant]);

  const done = useMemo(() => inner.doneBy[inner.tenant] ?? {}, [inner.doneBy, inner.tenant]);
  const uploads = useMemo(() => inner.uploadsAll.filter((u) => u.tenant === inner.tenant), [inner.uploadsAll, inner.tenant]);
  const audit = useMemo(() => inner.auditBy[inner.tenant] ?? [], [inner.auditBy, inner.tenant]);
  const realPerson = useMemo(() => personaIn(inner.personBy, inner.tenant), [inner.personBy, inner.tenant]);
  const person = useMemo(() => personById(inner.viewAs) ?? realPerson, [inner.viewAs, realPerson]);
  const state = useMemo<State>(
    () => ({ ...inner, done, uploads, audit, person, realPerson, role: person.role }),
    [inner, done, uploads, audit, person, realPerson],
  );

  const toast = useCallback((msg: string, tone: Tone = 'green') => {
    const id = ++seq.current;
    dispatch({ type: 'toast', value: { id, msg, tone } });
    window.setTimeout(() => dispatch({ type: 'toastLeave', id }), 4000);
    window.setTimeout(() => dispatch({ type: 'untoast', id }), 4000 + EXIT_MS);
  }, []);

  const api = useMemo<Api>(() => {
    const read = (k: string) => state.doneBy[bucketOf(k, state.tenant)]?.[k];
    const nameOf = (key: string) => TENANTS.find((t) => t.key === key)?.name ?? key;
    return {
      state,
      is: (k) => !!read(k),
      val: read,
      mark: (key, msg, tone, value = 'yes') => {
        dispatch({ type: 'mark', key, value });
        if (msg) toast(msg, tone);
      },
      toast,
      setScenario: (v) => dispatch({ type: 'scenario', value: v }),
      setPerson: (id) => dispatch({ type: 'person', id }),
      setRole: (v) => {
        if (v === state.role) return;
        const p = firstWithRole(state.tenant, v);
        if (p) dispatch({ type: 'person', id: p.id });
      },
      startViewAs: (id) => dispatch({ type: 'viewAs', id }),
      stopViewAs: () => dispatch({ type: 'viewAs', id: null }),
      logAudit: (e) => dispatch({ type: 'audit', value: e }),
      setBanner: (v) => dispatch({ type: 'banner', value: v }),
      openDrawer: (d) => dispatch({ type: 'drawer', value: d }),
      closeDrawer: () => dispatch({ type: 'drawer', value: null }),
      openModal: (m) => dispatch({ type: 'modal', value: m }),
      closeModal: () => dispatch({ type: 'modal', value: null }),
      setTenant: (key) => {
        if (key === state.tenant || !isSwitchable(key)) return;
        const next = counterpartIn(key, state.realPerson);
        dispatch({ type: 'tenant', value: key });
        toast(`Now working in ${nameOf(key)} as ${next.name}, ${next.title}. Demo control`, 'ink3');
      },
      addUpload: (u) => dispatch({ type: 'addUpload', value: { ...u, tenant: state.tenant } }),
      registerUpload: (id, tenderId) => dispatch({ type: 'registerUpload', id, tenderId }),
      removeUpload: (id) => dispatch({ type: 'removeUpload', id }),
      addTenant: (t) => dispatch({ type: 'addTenant', value: t }),
      reset: (scope = 'tenant') => {
        dispatch({ type: 'reset', scope });
        toast(scope === 'all'
          ? 'Demo reset for every company. Tenders are back at their starting positions'
          : `Demo reset for ${nameStop(nameOf(state.tenant))} Tenders are back at their starting positions`, 'ink3');
      },
    };
  }, [state, toast]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useDemo(): Api {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDemo must be used inside DemoProvider');
  return v;
}

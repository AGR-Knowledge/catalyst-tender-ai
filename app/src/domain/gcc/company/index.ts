import type { Person } from '@/data/people';
import type { Facility, SimilarProject } from '@/data/gcc/types';
import { DEMO_TODAY, addDays } from '@/domain/calendar';
import { convert } from '@/domain/money';
import type { MoneyVM } from '../viewmodels';
import { queriesFor } from '../lifecycle.port';
import { facilityHeadroom } from '../s1/bond';
import { CAPACITY_WINDOW_DAYS, nextWeeksLabel, teamLoad } from '../s1/triage';
import type { Done } from '../s1/done';
import { dataOf, dayMonth, profileOf } from '../s1/common';

/**
 * Company (plans 010 and 027c): the credentials vault and its renewal, and the
 * read-only company views beside it (the profile, its project register, bank
 * guarantee facility, teams and partners). The Overview's reading is in
 * `overview.ts`. Read models only; nothing here writes.
 */

export * from './vault';
export * from './renewal';
export * from './record';

const COUNTRY_NAME: Record<string, string> = {
  SA: 'Saudi Arabia', AE: 'United Arab Emirates', QA: 'Qatar', OM: 'Oman', KW: 'Kuwait', BH: 'Bahrain', JO: 'Jordan', LB: 'Lebanon', EG: 'Egypt',
  // Where the supplier masters' manufacturers are (plan 027c).
  AT: 'Austria', CH: 'Switzerland', CN: 'China', DE: 'Germany', ES: 'Spain', FR: 'France', GB: 'United Kingdom', HR: 'Croatia', IE: 'Ireland',
  IT: 'Italy', JP: 'Japan', KR: 'South Korea', NL: 'Netherlands', PL: 'Poland', PT: 'Portugal', SE: 'Sweden', SI: 'Slovenia', TN: 'Tunisia', TR: 'Türkiye',
};
export const countryName = (code: string) => COUNTRY_NAME[code] ?? code;

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** '12-31' → "31 December". */
const fyEndText = (mmdd: string) => { const [m, d] = mmdd.split('-').map(Number); return `${d} ${MONTHS_LONG[m - 1]}`; };

export const PROJECT_ROLE: Record<SimilarProject['role'], string> = { prime: 'Prime contractor', 'jv-lead': 'JV lead', 'jv-member': 'JV member', subcontractor: 'Subcontractor' };

/* ------------------------------------------------------------ capability profile */

export interface ProfileVM {
  name: string;
  hq: string;
  employees: number;
  fyEnd: string;
  sectors: string[];
  /** Where the company has delivered or holds an entity, home country first. */
  geographies: string[];
  financials: { fy: number; turnover: MoneyVM; audited: boolean; auditDate?: string; netWorth?: MoneyVM; currentRatio?: number }[];
  entities: { id: string; name: string; country: string; note: string; latest?: { fy: number; turnover: MoneyVM } }[];
  projects: ProjectVM[];
}

/** A similar project as the register holds it; `role` is the label, `roleKey` the seed's value. */
export interface ProjectVM {
  id: string; title: string; client: string; country: string; value: MoneyVM; completed: string; role: string; roleKey: SimilarProject['role']; scope: string;
  capacityM3d?: number; tertiary?: boolean; holder?: string;
  /** The O&M period, when the company ran the plant. */
  om?: { from: string; to: string };
  /** Fields of work it counts for, and other measured quantities by unit ("m span": 52). */
  fields?: string[];
  measures?: Record<string, number>;
}

export function profileFor(tenant: string): ProfileVM {
  const d = dataOf(tenant);
  const p = profileOf(tenant);
  const entities = d.company.entities ?? [];
  const entityName = new Map(entities.map((e) => [e.id, e.name]));
  const home = p.countryCode;
  const codes = [home, ...entities.map((e) => e.country), ...d.projects.map((x) => x.country)];
  return {
    name: p.name,
    hq: d.company.hq,
    employees: d.company.employees,
    fyEnd: fyEndText(d.company.fyEnd),
    sectors: p.sectors,
    geographies: [...new Set(codes)].map(countryName),
    financials: [...d.company.financials].sort((a, b) => b.fy - a.fy).map((f) => ({
      fy: f.fy, turnover: f.turnover, audited: f.audited, ...(f.auditDate ? { auditDate: f.auditDate } : {}),
      ...(f.netWorth ? { netWorth: f.netWorth } : {}), ...(f.currentRatio !== undefined ? { currentRatio: f.currentRatio } : {}),
    })),
    entities: entities.map((e) => {
      const latest = [...e.financials].sort((a, b) => b.fy - a.fy)[0];
      return { id: e.id, name: e.name, country: countryName(e.country), note: e.note, ...(latest ? { latest: { fy: latest.fy, turnover: latest.turnover } } : {}) };
    }),
    projects: [...d.projects].sort((a, b) => b.completed.localeCompare(a.completed)).map((x) => ({
      id: x.id, title: x.title, client: x.client, country: countryName(x.country), value: x.value, completed: x.completed, role: PROJECT_ROLE[x.role], roleKey: x.role, scope: x.scope,
      ...(x.capacityM3d ? { capacityM3d: x.capacityM3d } : {}), ...(x.tertiary ? { tertiary: true } : {}),
      ...(x.holder && entityName.has(x.holder) ? { holder: entityName.get(x.holder) } : {}),
      ...(x.om ? { om: x.om } : {}), ...(x.fields?.length ? { fields: x.fields } : {}), ...(x.measures ? { measures: x.measures } : {}),
    })),
  };
}

/* ------------------------------------------------------------ bank guarantee facility */

export interface FacilityVM {
  limit: MoneyVM;
  utilised: MoneyVM;
  committed: { label: string; kind: Facility['committed'][number]['kind']; tenderId?: string; amount: MoneyVM }[];
  committedTotal: MoneyVM;
  headroom: MoneyVM;
  /** Utilised and committed as a share of the limit, 0–100. */
  usedPct: number;
  asOf: string;
  confirmedBy?: string;
}

/** An amount in `ccy`, keeping the amount as stated when it was converted. */
export const inCcy = (m: { amount: number; ccy: MoneyVM['ccy'] }, ccy: MoneyVM['ccy']): MoneyVM =>
  (m.ccy === ccy ? m : { amount: convert(m.amount, m.ccy, ccy), ccy, original: m });

export function facilityFor(tenant: string): FacilityVM {
  const f = dataOf(tenant).facility;
  const ccy = f.limit.ccy;
  const h = facilityHeadroom(tenant);
  const committed = f.committed.map((c) => ({ label: c.label, kind: c.kind, ...(c.tenderId ? { tenderId: c.tenderId } : {}), amount: inCcy(c.amount, ccy) }));
  return {
    limit: f.limit,
    utilised: inCcy(f.utilised, ccy),
    committed,
    committedTotal: { amount: committed.reduce((s, c) => s + c.amount.amount, 0), ccy },
    headroom: h.headroom,
    usedPct: f.limit.amount ? Math.round((1 - h.headroom.amount / f.limit.amount) * 100) : 0,
    asOf: h.asOf,
    ...(h.confirmedByName ? { confirmedBy: h.confirmedByName } : {}),
  };
}

/* ------------------------------------------------------------ teams and partners */

export interface TeamVM {
  id: string;
  name: string;
  sector: string;
  engineers: number;
  estimators: number;
  planners: number;
  people: number;
  /** People × hours a week. */
  capacityHours: number;
  /** CAP-1's arithmetic over the next four weeks, as a whole percentage. */
  loadPct: number;
  commitments: { tenderId: string; shortTitle: string | null; hoursPerWeek: number; from: string; to: string; note?: string }[];
}

export interface TeamsVM {
  windowLabel: string;
  teams: TeamVM[];
  partners: { id: string; name: string; country: string; note: string; credentials: number; projects: number }[];
}

export function teamsFor(tenant: string, done: Done, viewer: Person): TeamsVM {
  const d = dataOf(tenant);
  const q = queriesFor({ tenant, viewer, done });
  const from = DEMO_TODAY;
  const to = addDays(DEMO_TODAY, CAPACITY_WINDOW_DAYS - 1);
  return {
    windowLabel: nextWeeksLabel(from, to),
    teams: d.teams.map((t) => {
      const people = t.engineers + t.estimators + t.planners;
      return {
        id: t.id, name: t.name, sector: t.sector, engineers: t.engineers, estimators: t.estimators, planners: t.planners, people,
        capacityHours: people * t.hoursPerWeek,
        loadPct: Math.round(teamLoad(t, from, to) * 100),
        commitments: t.commitments
          .filter((c) => c.to >= DEMO_TODAY)
          .sort((a, b) => b.hoursPerWeek - a.hoursPerWeek)
          .map((c) => ({ tenderId: c.tenderId, shortTitle: q.one(c.tenderId)?.shortTitle ?? null, hoursPerWeek: c.hoursPerWeek, from: c.from, to: c.to, ...(c.note ? { note: c.note } : {}) })),
      };
    }),
    partners: d.partners.map((p) => ({ id: p.id, name: p.name, country: countryName(p.country), note: p.note, credentials: p.credentials.length, projects: p.projects.length })),
  };
}

/** "8 Mar – 4 Apr". */
export const spanText = (from: string, to: string) => `${dayMonth(from)} – ${dayMonth(to)}`;

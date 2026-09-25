import type { RoleKey } from './types';
import { ROLES } from './roles';
import { LEGACY_TENANT, TENANTS } from './tenants';

/**
 * The named people in each tenant (gcc-demo-data §2.7). The same role key
 * exists in every GCC tenant, so switching company keeps the persona. Names are
 * fictional composites. The Indian tenant keeps its eight original personas.
 */

/** Voting seats on the Bid Committee (dashboards.md §9). The CEO is an ordinary member; the Head of Tendering approves DG2. */
export type Seat = 'ceo' | 'cfo' | 'technical' | 'operations' | 'sector';
export type PersonGroup = 'Tendering team' | 'Bid Committee' | 'Contributors' | 'External' | 'Platform';

export interface Person {
  /** `${tenant}.${role}` or `${tenant}.member.${seat}`, e.g. 'najd.bid', 'najd.member.cfo'. */
  id: string;
  /** Tenant key, or '*' for the platform operator. */
  tenant: string;
  name: string;
  initials: string;
  role: RoleKey;
  seat?: Seat;
  sector?: string;
  /** Shown in the UI, e.g. 'Chief Financial Officer'. */
  title: string;
  group: PersonGroup;
  /** One line: what this person does (spec §3). */
  hint: string;
  /** False for HR, who owns credentials but is not a demo persona. */
  switcher: boolean;
  /** Restricted-lane clearance. */
  cleared?: boolean;
}

/** Switcher and Users-and-roles order (spec §3). */
export const PERSON_GROUPS: PersonGroup[] = ['Tendering team', 'Bid Committee', 'Contributors', 'External', 'Platform'];

/** Committee order: the CEO first. */
export const SEATS: Seat[] = ['ceo', 'cfo', 'technical', 'operations', 'sector'];

export const SEAT_LABEL: Record<Seat, string> = {
  ceo: 'CEO', cfo: 'CFO', technical: 'Technical Director', operations: 'Operations Director', sector: 'Sector Head',
};

/** Two initials, ignoring honorifics and the "Al-" article: "Eng. Abdulaziz Al-Dosari" → AD. */
export function initialsOf(name: string): string {
  const words = name.replace(/^(Eng\.|Dr)\s+/, '').split(/\s+/).filter((w) => w !== 'Al' && w !== 'El');
  const letter = (w: string) => w.replace(/^(Al|El)-/, '')[0] ?? '';
  return (letter(words[0]) + (words.length > 1 ? letter(words[words.length - 1]) : '')).toUpperCase();
}

/* ---------------------------------------------------------------- GCC people */

type GccKey = 'najd' | 'corniche' | 'dafna' | 'batinah' | 'qurain';
const GCC_KEYS: GccKey[] = ['najd', 'corniche', 'dafna', 'batinah', 'qurain'];

/** One column of the §2.7 table. */
interface Roster {
  hot: string; coord: string; bid: string; proc: string; exec: string;
  cfo: string; technical: string; operations: string; sector: [name: string, sector: string];
  comm: string; plan: string; prop: string; comp: string; dir: string; fin: string; hr: string;
}

const ROSTER: Record<GccKey, Roster> = {
  najd: {
    hot: 'Faisal Al-Harbi', coord: 'Aisha Al-Qahtani', bid: 'Omar Siddiqui', proc: 'Joseph Mathew', exec: 'Eng. Abdulaziz Al-Dosari',
    cfo: 'Khalid Al-Mutairi', technical: 'Dr Hany Farouk', operations: 'Saad Al-Shehri', sector: ['Majed Al-Otaibi', 'Water and wastewater'],
    comm: 'Tarek Haddad', plan: 'Arjun Pillai', prop: 'Rami Aziz', comp: 'Lina Barakat', dir: 'Mohammed Al-Ghamdi', fin: 'Sultan Al-Anazi', hr: 'Noura Al-Shammari',
  },
  corniche: {
    hot: 'Rania Khoury', coord: "Joanna D'Souza", bid: 'Sameer Qureshi', proc: 'Ivan Petrov', exec: 'Hamad Al Mazrouei',
    cfo: 'Priya Raman', technical: 'Stefan Novak', operations: 'Yousef Al Hammadi', sector: ['Mariam Al Suwaidi', 'Buildings MEP'],
    comm: 'Daniel Okafor', plan: 'Kiran Patel', prop: 'Sophie Laurent', comp: 'Hala Mansour', dir: 'Graham Whitfield', fin: 'Anil Kumar', hr: 'Fatima Al Nuaimi',
  },
  dafna: {
    hot: 'Nasser Al-Kuwari', coord: 'Maria Santos', bid: 'Bilal Ahmed', proc: 'Suresh Babu', exec: 'Jassim Al-Sulaiti',
    cfo: 'Waleed Hamdan', technical: 'Emad Youssef', operations: 'Mubarak Al-Marri', sector: ['Abdulla Al-Emadi', 'Utility networks'],
    comm: 'George Khalil', plan: 'Deepak Sharma', prop: 'Ahmed Fathy', comp: 'Reem Al-Ansari', dir: 'Mark Ellison', fin: 'Hisham Nasr', hr: 'Sara Al-Mohannadi',
  },
  batinah: {
    hot: 'Said Al-Balushi', coord: 'Shamsa Al-Hinai', bid: 'Imran Sheikh', proc: 'Ravi Shankar', exec: 'Talal Al-Rawahi',
    cfo: 'Hilal Al-Kindi', technical: 'Ashraf Kamel', operations: 'Salim Al-Saadi', sector: ['Khamis Al-Amri', 'Roads'],
    comm: 'Nabil Aoun', plan: 'Vinod Kumar', prop: 'Latifa Al-Maawali', comp: 'Muna Al-Harthy', dir: 'Peter Grant', fin: 'Badar Al-Riyami', hr: 'Zainab Al-Lawati',
  },
  qurain: {
    hot: 'Bader Al-Mutawa', coord: 'Grace Pereira', bid: 'Tariq Mahmood', proc: 'Sanjay Verma', exec: 'Fahad Al-Enezi',
    cfo: 'Rashed Al-Ajmi', technical: 'Walid Saab', operations: 'Hamad Al-Rashidi', sector: ['Dalal Al-Shatti', 'Water'],
    comm: 'Karim Nassar', plan: 'Rohit Malhotra', prop: 'Mona Al-Rifai', comp: 'Nour El-Din', dir: 'Alan Brooks', fin: 'Yacoub Al-Qattan', hr: 'Huda Al-Kandari',
  },
};

/** The supplier contact is the same firm in every tenant (the portal preview uses tenant A's supplier). */
const SUPPLIER = { name: 'Ahmed Saleh', firm: 'Gulf Process Systems Co.' };

function gccPeople(tenant: GccKey): Person[] {
  const r = ROSTER[tenant];
  const headTitle = TENANTS.find((t) => t.key === tenant)!.headTitle;
  const p = (role: RoleKey, name: string, title: string, group: PersonGroup, hint: string, extra: Partial<Person> = {}): Person => ({
    id: `${tenant}.${role}`, tenant, name, initials: initialsOf(name), role, title, group, hint, switcher: true, ...extra,
  });
  const member = (seat: Exclude<Seat, 'ceo'>, name: string, title: string, hint: string, sector?: string): Person => ({
    ...p('member', name, title, 'Bid Committee', hint, { seat, sector }), id: `${tenant}.member.${seat}`,
  });
  const [sectorHead, sector] = r.sector;
  // "Buildings MEP" → "buildings MEP": lower-case the first letter only, so acronyms survive.
  const sectorInText = sector[0].toLowerCase() + sector.slice(1);
  return [
    p('hot', r.hot, headTitle, 'Tendering team', 'Runs the tendering department: every tender, the final DG2 and DG3 approvals, the workspace settings, and View as anyone', { cleared: true }),
    p('coord', r.coord, 'Tender Coordinator', 'Tendering team', 'Checks what the Intake Agent captured and validates the fields it was unsure of'),
    p('bid', r.bid, 'Bid Manager', 'Tendering team', 'Owns the assigned bids and records DG1: pursue or discard'),
    p('proc', r.proc, 'Procurement Lead', 'Tendering team', 'Packages the scope, sends RFQs and levels the supplier quotes'),
    p('exec', r.exec, 'Chief Executive Officer', 'Bid Committee', 'Records a DG2 position as a committee member. The Head of Tendering gives the final approval', { seat: 'ceo', cleared: true }),
    member('cfo', r.cfo, 'Chief Financial Officer', 'Records a DG2 position on margin, bonds and facility headroom'),
    member('technical', r.technical, 'Technical Director', 'Records a DG2 position on technical risk and capability'),
    member('operations', r.operations, 'Operations Director', 'Records a DG2 position on resources and delivery capacity'),
    member('sector', sectorHead, `Sector Head, ${sector}`, `Records a DG2 position for the ${sectorInText} sector`, sector),
    p('comm', r.comm, 'Commercial Manager', 'Contributors', 'Owns Stage 5: the cost build-up and the price. Answers pack requests on cost and the margin range'),
    p('plan', r.plan, 'Planning Manager', 'Contributors', 'Owns Stage 4: the programme and resource loading. Answers pack requests on the programme'),
    p('prop', r.prop, 'Proposal Manager', 'Contributors', 'Owns Stage 6: proposal sections, SME writing and the technical score'),
    p('comp', r.comp, 'Compliance / Legal Lead', 'Contributors', 'Owns Stage 7: the compliance matrix, contract positions and the DG3 pack. Answers pack requests on contract risk'),
    p('dir', r.dir, 'Project Director', 'Contributors', 'Owns Stage 9: results, the handover to delivery and lessons. Answers pack requests on the delivery approach and key people'),
    p('fin', r.fin, 'Finance / Treasury', 'Contributors', 'Answers pack requests on bonds and cash flow, and renews the financial credentials'),
    p('hr', r.hr, 'HR Manager', 'Contributors', 'Owns staff credentials and CVs in the vault', { switcher: false }),
    p('supplier', SUPPLIER.name, `Supplier, ${SUPPLIER.firm}`, 'External', 'Sees one RFQ in the Supplier Portal and replies with a quote'),
  ];
}

/** Catalyst's own operator. Not a tenant user: it sees platform health, never tenant data. */
export const PLATFORM_OPERATOR: Person = {
  id: 'platform.ops', tenant: '*', name: 'Catalyst Platform Operations', initials: 'CP', role: 'platform',
  title: 'Catalyst operator', group: 'Platform', hint: 'Runs the platform for Catalyst: tenant health and onboarding, never tenant data', switcher: true,
};

/* --------------------------------------------------------------- Indian people */

/** The full-lifecycle preview keeps its eight personas. `ROLES` stays exported for legacy readers. */
const INDIAN: Person[] = ROLES.map((r) => ({
  id: `${LEGACY_TENANT}.${r.key}`, tenant: LEGACY_TENANT, name: r.name, initials: r.initials, role: r.key,
  title: r.title, group: r.key === 'exec' ? 'Bid Committee' : 'Tendering team', hint: r.scope, switcher: true,
  ...(r.key === 'exec' ? { seat: 'ceo' as const, cleared: true } : {}),
}));

export const PEOPLE: Person[] = [...GCC_KEYS.flatMap(gccPeople), ...INDIAN, PLATFORM_OPERATOR];

/* ------------------------------------------------------------------- helpers */

const isGccTenant = (tenant: string) => TENANTS.some((t) => t.key === tenant && t.world === 'gcc');

/** The tenant's own people, including HR and the supplier contact. Never the platform operator. */
export const peopleOf = (tenant: string): Person[] => PEOPLE.filter((p) => p.tenant === tenant);

/** Who the presenter can switch to in a tenant: its switchable people, plus the Catalyst operator in GCC tenants. */
export const switcherOf = (tenant: string): Person[] => [
  ...peopleOf(tenant).filter((p) => p.switcher),
  ...(isGccTenant(tenant) ? [PLATFORM_OPERATOR] : []),
];

export const personById = (id: string | null | undefined): Person | undefined => (id ? PEOPLE.find((p) => p.id === id) : undefined);

/** The first person holding a role in a tenant, committee order for members. The operator is reachable from any GCC tenant. */
export const firstWithRole = (tenant: string, role: RoleKey): Person | undefined =>
  switcherOf(tenant).find((p) => p.role === role) ?? peopleOf(tenant).find((p) => p.role === role);

/** The Bid Committee's five voting members: the CEO, then CFO, technical, operations, sector. */
export const committeeOf = (tenant: string): Person[] =>
  peopleOf(tenant).filter((p) => p.seat).sort((a, b) => SEATS.indexOf(a.seat!) - SEATS.indexOf(b.seat!));

/** Where a fresh browser (or a company without a saved persona) starts: the Head of Tendering, or the Bid Manager in the Indian preview. */
export function defaultPersonOf(tenant: string): Person {
  return firstWithRole(tenant, tenant === LEGACY_TENANT ? 'bid' : 'hot') ?? peopleOf(tenant)[0] ?? INDIAN.find((p) => p.role === 'bid')!;
}

/** The counterpart of a person in another tenant: same role and seat, else same role, else that tenant's default. */
export function counterpartIn(tenant: string, person: Person): Person {
  const pool = switcherOf(tenant);
  return pool.find((p) => p.role === person.role && p.seat === person.seat)
    ?? pool.find((p) => p.role === person.role)
    ?? defaultPersonOf(tenant);
}

/** A person may act in a tenant if they belong to it, or are the operator in a GCC tenant. */
export const belongsTo = (person: Person, tenant: string) => person.tenant === tenant || (person.tenant === '*' && isGccTenant(tenant));

/** The role line under a name: "CEO · Bid Committee" and "CFO · Bid Committee" for members, the title otherwise. */
export function roleLine(p: Person): string {
  if (p.seat) return `${p.seat === 'sector' ? p.title : SEAT_LABEL[p.seat]} · Bid Committee`;
  return p.title;
}

import type { Facility } from '../types';
import { KEY_PERSONNEL } from '../s1/personnel';
import { NAJD } from '../tenants/najd';
import { QURAIN } from '../tenants/qurain';
import { CORNICHE } from '../tenants/corniche';
import { BATINAH } from '../tenants/batinah';
import type { InputField, InputKey, InputSpec, SeededInput } from './types';

/**
 * Contributor inputs. The six pack inputs carry the fields of catalogue §C.6
 * and feed the pack sections named in `feeds`. The six Stage 2 kick-off
 * inputs are the ones plan 008a lists on the bid workspace checklist (spec
 * §8.1); they share the request keys, so they show in "My requests" too.
 */

const STANCES = [
  { value: 'accept', label: 'Accept' }, { value: 'price', label: 'Price' }, { value: 'qualify', label: 'Qualify' }, { value: 'reject', label: 'Reject' },
];
const CATEGORIES = [
  { value: 'contractual', label: 'Contractual' }, { value: 'technical', label: 'Technical' }, { value: 'commercial', label: 'Commercial' },
  { value: 'counterparty', label: 'Counterparty' }, { value: 'geopolitical', label: 'Geopolitical' },
];
const RATINGS = [{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }];

const f = (name: string, label: string, kind: InputField['kind'], extra: Partial<InputField> = {}): InputField => ({ name, label, kind, ...extra });

export const INPUT_SPECS: Record<InputKey, InputSpec> = {
  commercial: {
    key: 'commercial', label: 'Preliminary margin range', ownerRole: 'comm', feeds: '§9.7',
    fields: [
      f('margin', 'Preliminary margin range (low–high %)', 'range'),
      f('basis', 'Basis (benchmark rates; levelled quotes for n of m packages)', 'text'),
      f('costRisks', 'Top three cost risks', 'list'),
      f('confidence', 'Confidence', 'choice', { options: [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }] }),
    ],
  },
  planning: {
    key: 'planning', label: 'Preliminary programme and delivery impact', ownerRole: 'plan', feeds: '§9.4',
    fields: [
      f('durationMonths', 'Preliminary duration (months)', 'number'),
      f('requiredMonths', 'Tender duration (months)', 'number'),
      f('longLead', 'Long-lead fit', 'text'),
      f('peakManpower', 'Peak manpower', 'number'),
      f('keyPlant', 'Key plant', 'list'),
      f('clash', 'Clash with live projects and bids', 'text'),
      f('deliveryImpact', 'Delivery load added if won (points of delivery capacity)', 'number'),
    ],
  },
  legal: {
    key: 'legal', label: 'Top five contract risks', ownerRole: 'comp', feeds: '§9.6',
    fields: [
      f('risks', 'Top five contract risks', 'list', {
        item: [
          { name: 'clause', label: 'Clause', kind: 'text' },
          { name: 'page', label: 'Page', kind: 'number' },
          { name: 'risk', label: 'Risk', kind: 'text' },
          { name: 'stance', label: 'Stance', kind: 'choice', options: STANCES },
          { name: 'category', label: 'Category', kind: 'choice', options: CATEGORIES },
          { name: 'rating', label: 'Rating', kind: 'choice', options: RATINGS },
          { name: 'mitigation', label: 'Provisional mitigation', kind: 'text' },
        ],
      }),
      f('jvStatus', 'JV agreement status', 'choice', {
        options: [{ value: 'not-applicable', label: 'Not applicable' }, { value: 'draft', label: 'Draft' }, { value: 'agreed', label: 'Agreed in principle' }, { value: 'signed', label: 'Signed' }],
      }),
      f('redline', 'Redline posture', 'text'),
    ],
  },
  pd: {
    key: 'pd', label: 'Delivery feasibility and key staff', ownerRole: 'dir', feeds: '§9.4',
    fields: [
      f('feasibility', 'Delivery feasibility', 'choice', { options: [{ value: 'yes', label: 'Yes' }, { value: 'with-conditions', label: 'With conditions' }, { value: 'no', label: 'No' }] }),
      f('feasibilityNote', 'Conditions', 'text', { optional: true }),
      f('keyStaff', 'Named key staff with availability', 'list', {
        item: [
          { name: 'name', label: 'Name', kind: 'text' },
          { name: 'role', label: 'Role', kind: 'text' },
          { name: 'availableFrom', label: 'Available from', kind: 'date' },
        ],
      }),
      f('site', 'Site and logistics notes', 'text'),
    ],
  },
  finance: {
    key: 'finance', label: 'Facility headroom and bond capacity', ownerRole: 'fin', feeds: '§9.5',
    fields: [
      f('limit', 'Facility limit', 'money'),
      f('utilised', 'Utilised', 'money'),
      f('committed', 'Committed by live bids', 'money'),
      f('headroom', 'Headroom', 'money'),
      f('asOf', 'As of', 'date'),
      f('bankLeadDays', 'Bank lead time for bonds (working days)', 'number'),
      f('bondCharges', 'Bank charges on bonds (% a year)', 'number'),
      f('workingCapital', 'Working-capital note (advance, retention, payment terms)', 'text'),
      f('fx', 'FX assumption', 'text'),
    ],
  },
  hr: {
    key: 'hr', label: 'Key-personnel availability', ownerRole: 'hr', feeds: '§9.4',
    fields: [
      f('availability', 'Key-personnel availability', 'list', {
        item: [
          { name: 'name', label: 'Name', kind: 'text' },
          { name: 'role', label: 'Role', kind: 'text' },
          { name: 'status', label: 'Availability', kind: 'text' },
        ],
      }),
      f('nationalisation', 'Nationalisation impact of named staff', 'text'),
    ],
  },
  'method-statement': {
    key: 'method-statement', label: 'Method statement outline', ownerRole: 'dir', feeds: 'Stage 2 kick-off',
    fields: [f('outline', 'Method statement outline', 'text')],
  },
  'hse-plan': {
    key: 'hse-plan', label: 'HSE plan outline', ownerRole: 'dir', feeds: 'Stage 2 kick-off',
    fields: [f('outline', 'HSE plan outline', 'text')],
  },
  'key-cvs': {
    key: 'key-cvs', label: 'Key CVs', ownerRole: 'hr', feeds: 'Stage 2 kick-off',
    fields: [f('cvs', 'Key CVs', 'list', { item: [{ name: 'name', label: 'Name', kind: 'text' }, { name: 'role', label: 'Role', kind: 'text' }] })],
  },
  programme: {
    key: 'programme', label: 'Preliminary programme', ownerRole: 'plan', feeds: 'Stage 2 kick-off',
    fields: [f('durationMonths', 'Preliminary duration (months)', 'number'), f('milestones', 'Key milestones', 'list')],
  },
  estimate: {
    key: 'estimate', label: 'Preliminary estimate', ownerRole: 'comm', feeds: 'Stage 2 kick-off',
    fields: [f('cost', 'Preliminary cost estimate', 'money'), f('basis', 'Basis', 'text')],
  },
  'design-basis': {
    key: 'design-basis', label: 'Design basis (design and build)', ownerRole: 'dir', feeds: 'Stage 2 kick-off',
    fields: [f('basis', 'Design basis', 'text'), f('standards', 'Standards and codes', 'list')],
  },
};

export const INPUT_KEYS = Object.keys(INPUT_SPECS) as InputKey[];

// ---------------------------------------------------------------------------
// Facts the contributors quote from other records, so the two never disagree.

/** A key person on record (plan 007a's personnel). `role` is the role on this bid; it defaults to the person's title. */
function staff(id: string, role?: string) {
  const p = KEY_PERSONNEL.find((x) => x.id === id);
  if (!p) throw new Error(`No key person "${id}" in data/gcc/s1/personnel.ts`);
  return { name: p.name, role: role ?? p.title, availableFrom: p.availableFrom };
}
/** HR's availability line for a key person on record. */
const availability = (id: string, status: string, role?: string) => {
  const { name, role: r } = staff(id, role);
  return { name, role: r, status };
};

/** Finance's answer quotes the facility as plan 004 records it, confirmed the same day. Committed lines are in the facility's currency. */
function facilityFields(f: Facility) {
  const committed = f.committed.reduce((s, c) => s + c.amount.amount, 0);
  return {
    limit: f.limit, utilised: f.utilised,
    committed: { amount: committed, ccy: f.limit.ccy },
    headroom: { amount: f.limit.amount - f.utilised.amount - committed, ccy: f.limit.ccy },
    asOf: f.asOf,
  };
}

// ---------------------------------------------------------------------------
// Seeded inputs. T-2026-097: all six in before the pack was generated on Sat
// 7 Mar 14:10. T-2026-101: Finance late, Legal due today (DEC-7 "2 · 1 late").
// Corniche T-2026-029: Finance due Mon 9 Mar. Qurain T-2026-049: both in.
// `itemId` is plan 017's interim item id, so nudges share one key.

const PACK_097 = { tenant: 'najd', tenderId: 'T-2026-097', requestedById: 'najd.bid', requestedAt: '2026-03-01T09:00' } as const;
const PACK_101 = { tenant: 'najd', tenderId: 'T-2026-101', requestedById: 'najd.bid', requestedAt: '2026-03-04T11:00' } as const;
const PACK_029 = { tenant: 'corniche', tenderId: 'T-2026-029', requestedById: 'corniche.bid', requestedAt: '2026-03-03T10:00' } as const;
const PACK_049 = { tenant: 'qurain', tenderId: 'T-2026-049', requestedById: 'qurain.bid', requestedAt: '2026-03-02T10:00' } as const;
// Plan 022: Corniche T-2026-061, all six in before the pack was generated at 09:45 (demo script C).
const PACK_061 = { tenant: 'corniche', tenderId: 'T-2026-061', requestedById: 'corniche.bid', requestedAt: '2026-03-08T08:05' } as const;
// Plan 023: Batinah T-2026-042 (Arabic document). All six in on demo morning, before the pack was generated at 09:50.
const PACK_042 = { tenant: 'batinah', tenderId: 'T-2026-042', requestedById: 'batinah.bid', requestedAt: '2026-03-08T07:50' } as const;

export const SEEDED_INPUTS: SeededInput[] = [
  {
    ...PACK_097, key: 'commercial', itemId: 'T-2026-097:commercial', ownerId: 'najd.comm', due: '2026-03-05T17:00', submittedAt: '2026-03-05T11:40',
    fields: {
      margin: [8.5, 11.5],
      basis: 'benchmark rates and levelled quotes for 7 of 9 packages',
      costRisks: [
        'Filtration and UV equipment: two compliant quotes only',
        'Steel and ductile iron pipe prices: quotes valid for 60 days',
        'Civil works productivity through Ramadan and the summer',
      ],
      confidence: 'medium',
    },
  },
  {
    ...PACK_097, key: 'finance', itemId: 'T-2026-097:finance', ownerId: 'najd.fin', due: '2026-03-05T17:00', submittedAt: '2026-03-05T15:20',
    fields: {
      ...facilityFields(NAJD.facility),
      bankLeadDays: 5,
      bondCharges: 0.75,
      workingCapital: '10% advance against an advance payment guarantee; 10% retention; 60-day payment terms',
      fx: 'SAR peg: no FX exposure on the main contract',
    },
  },
  {
    ...PACK_097, key: 'legal', itemId: 'T-2026-097:legal', ownerId: 'najd.comp', due: '2026-03-06T17:00', submittedAt: '2026-03-06T16:05',
    fields: {
      risks: [
        { clause: '58.2', page: 31, risk: 'Delay damages capped at 10% of contract value', stance: 'price', category: 'contractual', rating: 'medium',
          mitigation: 'Price the exposure into the programme float; seek relief for employer-caused delay' },
        { clause: '17.6', page: 27, risk: 'Limitation of liability: total liability capped at the contract value, with no exclusion of indirect loss', stance: 'qualify', category: 'contractual', rating: 'high',
          mitigation: 'Qualify the bid: exclude indirect and consequential loss' },
        { clause: '5.1', page: 12, risk: 'Design responsibility for the process guarantees (treated water quality) rests with the contractor', stance: 'qualify', category: 'technical', rating: 'high',
          mitigation: 'Back-to-back process guarantee from the filtration supplier; Rafid Process Engineering to review the design basis' },
        { clause: '4.12', page: 15, risk: 'Ground risk at the intake: unforeseen ground conditions are at the contractor\'s risk', stance: 'price', category: 'technical', rating: 'medium',
          mitigation: 'Carry a ground-risk allowance; ask the employer for the geotechnical report' },
        { clause: '15.5', page: 36, risk: 'Termination for convenience with no compensation for loss of profit', stance: 'accept', category: 'counterparty', rating: 'low',
          mitigation: 'Accept: government employer with a good payment record' },
      ],
      jvStatus: 'not-applicable',
      redline: 'Qualify clauses 17.6 and 5.1; price clauses 58.2 and 4.12; accept the rest with clarifications',
    },
  },
  {
    ...PACK_097, key: 'planning', itemId: 'T-2026-097:planning', ownerId: 'najd.plan', due: '2026-03-05T17:00', submittedAt: '2026-03-05T13:30',
    fields: {
      durationMonths: 30,
      requiredMonths: 30,
      longLead: 'Filters 30 weeks: fits the programme',
      peakManpower: 640,
      keyPlant: ['Two 100 t crawler cranes', 'Concrete batching plant on site', 'Dewatering spread for the intake works'],
      clash: 'Peak manpower overlaps the Tabuk transmission pipeline (T-2026-109) if both are won; manageable with a second site team',
      deliveryImpact: 9,
    },
  },
  {
    ...PACK_097, key: 'pd', itemId: 'T-2026-097:pd', ownerId: 'najd.dir', due: '2026-03-06T17:00', submittedAt: '2026-03-06T10:15',
    fields: {
      feasibility: 'with-conditions',
      feasibilityNote: 'Confirm the process lead before submission, as the Abha STP bid names the same person; keep the second site team available if the Tabuk pipeline is also won',
      keyStaff: [staff('najd-kp-1'), staff('najd-kp-2'), staff('najd-kp-3'), staff('najd-kp-4')],
      site: 'Live plant: work in phases around the existing treatment trains; site access from the Madinah ring road',
    },
  },
  {
    ...PACK_097, key: 'hr', itemId: 'T-2026-097:hr', ownerId: 'najd.hr', due: '2026-03-06T17:00', submittedAt: '2026-03-06T12:00',
    fields: {
      availability: [
        availability('najd-kp-1', 'Available from 1 May, when the Buraydah handover ends'),
        availability('najd-kp-2', 'Available; also named on the Abha STP bid'),
        availability('najd-kp-3', 'Available'),
        availability('najd-kp-4', 'Available from 1 April'),
      ],
      nationalisation: 'High Green band kept',
    },
  },

  {
    ...PACK_101, key: 'commercial', itemId: 'T-2026-101:commercial', ownerId: 'najd.comm', due: '2026-03-07T17:00', submittedAt: '2026-03-07T12:20',
    fields: {
      margin: [9.5, 12],
      basis: 'benchmark rates and levelled quotes for 5 of 8 packages',
      costRisks: ['Membrane equipment: one quote in so far', 'Haulage to Abha: mountain road restrictions', 'Night work in the live plant'],
      confidence: 'low',
    },
  },
  {
    ...PACK_101, key: 'planning', itemId: 'T-2026-101:planning', ownerId: 'najd.plan', due: '2026-03-07T17:00', submittedAt: '2026-03-07T10:05',
    fields: {
      durationMonths: 24,
      requiredMonths: 24,
      longLead: 'Membranes 26 weeks: fits the programme',
      peakManpower: 380,
      keyPlant: ['One 80 t mobile crane', 'Temporary bypass pumping'],
      clash: 'Shares the Water team\'s process engineers with the Madinah WTP (T-2026-097)',
      deliveryImpact: 4,
    },
  },
  {
    ...PACK_101, key: 'pd', itemId: 'T-2026-101:pd', ownerId: 'najd.dir', due: '2026-03-07T17:00', submittedAt: '2026-03-07T14:40',
    fields: {
      feasibility: 'yes',
      keyStaff: [staff('najd-kp-5', 'Project Manager'), staff('najd-kp-2')],
      site: 'Upgrade inside the operating plant; the south-west has no Najd office, so a site office is needed',
    },
  },
  {
    ...PACK_101, key: 'hr', itemId: 'T-2026-101:hr', ownerId: 'najd.hr', due: '2026-03-07T17:00', submittedAt: '2026-03-07T11:15',
    fields: {
      availability: [
        availability('najd-kp-5', 'Available', 'Project Manager'),
        availability('najd-kp-2', 'Shared with the Madinah WTP if both are won'),
      ],
      nationalisation: 'High Green band kept',
    },
  },
  { ...PACK_101, key: 'finance', itemId: 'T-2026-101:finance', ownerId: 'najd.fin', due: '2026-03-07T17:00' },
  { ...PACK_101, key: 'legal', itemId: 'T-2026-101:legal', ownerId: 'najd.comp', due: '2026-03-08T17:00' },

  {
    ...PACK_029, key: 'commercial', itemId: 'T-2026-029:commercial', ownerId: 'corniche.comm', due: '2026-03-06T17:00', submittedAt: '2026-03-06T12:00',
    fields: {
      margin: [7.5, 10],
      basis: 'benchmark rates and levelled quotes for 7 of 8 packages',
      costRisks: ['Chiller prices: quotes valid for 45 days', 'Night work in occupied teaching blocks', 'Authority inspection hold points on fire systems'],
      confidence: 'medium',
    },
  },
  {
    ...PACK_029, key: 'planning', itemId: 'T-2026-029:planning', ownerId: 'corniche.plan', due: '2026-03-06T17:00', submittedAt: '2026-03-05T15:00',
    fields: {
      durationMonths: 22,
      requiredMonths: 24,
      longLead: 'Chillers 20 weeks: fits the programme',
      peakManpower: 310,
      keyPlant: ['Two tower cranes shared with the main contractor', 'Duct fabrication at the Dubai workshop'],
      clash: 'Overlaps the Al Reem tower MEP (T-2026-041) fit-out peak in October',
      deliveryImpact: 7,
    },
  },
  { ...PACK_029, key: 'finance', itemId: 'T-2026-029:finance', ownerId: 'corniche.fin', due: '2026-03-09T17:00' },

  {
    ...PACK_049, key: 'commercial', itemId: 'T-2026-049:commercial', ownerId: 'qurain.comm', due: '2026-03-05T17:00', submittedAt: '2026-03-05T11:00',
    fields: {
      margin: [7, 10],
      basis: 'benchmark rates and levelled quotes for 6 of 7 packages',
      costRisks: ['Aeration equipment: one compliant quote', 'Bypass pumping during the rehabilitation', 'Summer working-hours restrictions'],
      confidence: 'medium',
    },
  },
  {
    ...PACK_049, key: 'finance', itemId: 'T-2026-049:finance', ownerId: 'qurain.fin', due: '2026-03-05T17:00', submittedAt: '2026-03-05T16:00',
    fields: {
      ...facilityFields(QURAIN.facility),
      bankLeadDays: 7,
      bondCharges: 1,
      workingCapital: '5% advance against an advance payment guarantee; 10% retention; 90-day payment terms',
      fx: 'KWD contract: no FX exposure on the main contract',
    },
  },

  {
    ...PACK_061, key: 'commercial', itemId: 'T-2026-061:commercial', ownerId: 'corniche.comm', due: '2026-03-08T09:40', submittedAt: '2026-03-08T09:30',
    fields: {
      margin: [8, 11],
      basis: 'benchmark rates and levelled quotes for 2 of 7 packages (chillers, AHUs)',
      costRisks: [
        'Chiller capacity: 1,500 TR or 1,750 TR changes the chiller package by about a sixth',
        'Medical gas: no specialist named yet, so no firm price',
        'Interface with the main contractor: builder\'s work, hoist time and access',
      ],
      confidence: 'medium',
    },
  },
  {
    ...PACK_061, key: 'planning', itemId: 'T-2026-061:planning', ownerId: 'corniche.plan', due: '2026-03-08T09:40', submittedAt: '2026-03-08T09:05',
    fields: {
      durationMonths: 25,
      requiredMonths: 26,
      longLead: 'Chillers 30 weeks: fits the central plant programme',
      peakManpower: 420,
      keyPlant: ['Chiller rigging into the basement plant room', 'Duct fabrication at the Dubai workshop', 'Pipe prefabrication yard on the campus'],
      clash: 'Commissioning overlaps the Sharjah hospital MEP (T-2026-018) handover; the commissioning manager is needed on both',
      deliveryImpact: 8,
    },
  },
  {
    ...PACK_061, key: 'pd', itemId: 'T-2026-061:pd', ownerId: 'corniche.dir', due: '2026-03-08T09:40', submittedAt: '2026-03-08T09:15',
    fields: {
      feasibility: 'with-conditions',
      feasibilityNote: 'Name the medical gas specialist before submission, and keep the commissioning manager free for the ten weeks of integrated testing',
      keyStaff: [staff('corniche-kp-5', 'Project Manager'), staff('corniche-kp-4'), staff('corniche-kp-3')],
      site: 'Hospital campus under construction: the main contractor controls hoists and access; site office on the Crescent Bay campus',
    },
  },
  {
    ...PACK_061, key: 'hr', itemId: 'T-2026-061:hr', ownerId: 'corniche.hr', due: '2026-03-08T09:40', submittedAt: '2026-03-08T08:50',
    fields: {
      availability: [
        availability('corniche-kp-5', 'Available', 'Project Manager'),
        availability('corniche-kp-4', 'Available; also needed for the Sharjah hospital MEP handover'),
        availability('corniche-kp-3', 'Available'),
      ],
      nationalisation: 'Emiratisation targets kept',
    },
  },
  {
    ...PACK_061, key: 'finance', itemId: 'T-2026-061:finance', ownerId: 'corniche.fin', due: '2026-03-08T09:40', submittedAt: '2026-03-08T09:20',
    fields: {
      ...facilityFields(CORNICHE.facility),
      bankLeadDays: 5,
      bondCharges: 0.8,
      workingCapital: '10% advance against an advance payment guarantee; 10% retention, half released at taking-over; 60-day payment terms',
      fx: 'AED contract: the EUR chiller and AHU quotes are the FX exposure; fix them at award',
    },
  },
  {
    ...PACK_061, key: 'legal', itemId: 'T-2026-061:legal', ownerId: 'corniche.comp', due: '2026-03-08T09:40', submittedAt: '2026-03-08T09:35',
    fields: {
      risks: [
        { clause: '14.9', page: 9, risk: 'No price adjustment: equipment, materials, labour and exchange-rate risk stay with the Contractor', stance: 'price', category: 'commercial', rating: 'high',
          mitigation: 'Fix the chiller and AHU prices at award; hedge the EUR quotes' },
        { clause: '4.6', page: 8, risk: 'Interface with the Main Contractor, who controls the site, hoists and access routes', stance: 'qualify', category: 'technical', rating: 'high',
          mitigation: 'Qualify the bid: hoist and access time per the interface schedule, with relief for delay by the Main Contractor' },
        { clause: '8.8', page: 9, risk: 'Delay damages of 0.1% of the Contract Price a day, capped at 10%', stance: 'price', category: 'contractual', rating: 'medium',
          mitigation: 'Price the exposure; keep float on the central plant and the commissioning window' },
        { clause: '4.4', page: 8, risk: 'Named specialists (medical gas, fire) cannot be replaced without the Employer\'s consent', stance: 'accept', category: 'counterparty', rating: 'medium',
          mitigation: 'Back-to-back terms and performance security from the named specialists' },
        { clause: '4.8.2', page: 13, risk: 'Medical gas systems certified by an independent authorised person before use: a hold point before handover', stance: 'accept', category: 'technical', rating: 'low',
          mitigation: 'Book the authorised person early, inside the ten-week commissioning window' },
      ],
      jvStatus: 'not-applicable',
      redline: 'Qualify Sub-Clause 4.6; price Sub-Clauses 14.9 and 8.8; accept the rest with clarifications',
    },
  },

  {
    ...PACK_042, key: 'commercial', itemId: 'T-2026-042:commercial', ownerId: 'batinah.comm', due: '2026-03-08T09:40', submittedAt: '2026-03-08T09:15',
    fields: {
      margin: [7, 10],
      basis: 'benchmark rates for all 6 packages; no levelled quotes yet',
      costRisks: [
        'Bitumen and polymer-modified binder prices: fixed unit rates for 30 months (clause 29)',
        'Imported bridge bearings and joints: quoted in EUR, ex-works',
        'Section length: 38 km or 36.5 km moves the paving, lighting and markings quantities',
      ],
      confidence: 'medium',
    },
  },
  {
    ...PACK_042, key: 'planning', itemId: 'T-2026-042:planning', ownerId: 'batinah.plan', due: '2026-03-08T09:40', submittedAt: '2026-03-08T08:55',
    fields: {
      durationMonths: 29,
      requiredMonths: 30,
      longLead: 'Bridge bearings 16 weeks and lighting columns 14 weeks: both fit the programme',
      peakManpower: 420,
      keyPlant: ['Two asphalt pavers with a material transfer vehicle', 'Bored-piling rig for the Wadi Al Jizzi bridge', 'Two 200 t crawler cranes for the precast deck beams, and falsework for the in-situ main span'],
      clash: 'Shares the Bridges Lead with the Barka wadi bridges (T-2025-405) until its handover',
      deliveryImpact: 8,
    },
  },
  {
    ...PACK_042, key: 'legal', itemId: 'T-2026-042:legal', ownerId: 'batinah.comp', due: '2026-03-08T09:40', submittedAt: '2026-03-08T09:30',
    fields: {
      risks: [
        { clause: '12', page: 5, risk: 'Bid bond: 1% of the bid value in clause 12, but a fixed OMR 300,000 on the scanned bond form (Annex 4)', stance: 'qualify', category: 'contractual', rating: 'high',
          mitigation: 'Query drafted; provide the higher of the two unless the employer answers' },
        { clause: '29', page: 8, risk: 'Fixed unit rates for the whole contract: no price adjustment for bitumen, steel or labour', stance: 'price', category: 'commercial', rating: 'high',
          mitigation: 'Fix the asphalt and aggregate prices at award; carry a bitumen allowance' },
        { clause: '24', page: 8, risk: 'Delay damages of 0.05% of the contract value a day, capped at 10%', stance: 'price', category: 'contractual', rating: 'medium',
          mitigation: 'Price the exposure; keep float on the bridge works and the traffic diversions' },
        { clause: '26', page: 8, risk: 'At least 10% of the contract to registered SMEs, on a basis the document does not state', stance: 'qualify', category: 'contractual', rating: 'medium',
          mitigation: 'Query drafted; plan the markings and signage package with registered SMEs' },
        { clause: '7', page: 5, risk: 'Arabic-only bid, and the Arabic text prevails', stance: 'accept', category: 'technical', rating: 'low',
          mitigation: 'Arabic bid documents prepared by the tender office; English working copies for the team' },
      ],
      jvStatus: 'not-applicable',
      redline: 'Qualify clauses 12 and 26; price clauses 29 and 24; accept the rest with clarifications',
    },
  },
  {
    ...PACK_042, key: 'pd', itemId: 'T-2026-042:pd', ownerId: 'batinah.dir', due: '2026-03-08T09:40', submittedAt: '2026-03-08T09:05',
    fields: {
      feasibility: 'with-conditions',
      feasibilityNote: 'Name the bridge subcontractor with a 60 m span before submission; keep the Bridges Lead free once the Barka bridges are handed over',
      keyStaff: [staff('batinah-kp-1'), staff('batinah-kp-4'), staff('batinah-kp-2'), staff('batinah-kp-3')],
      site: 'Live road: two lanes kept open throughout; site office at the Sohar interchange; Wadi Al Jizzi bridge works outside the flood season',
    },
  },
  {
    ...PACK_042, key: 'hr', itemId: 'T-2026-042:hr', ownerId: 'batinah.hr', due: '2026-03-08T09:40', submittedAt: '2026-03-08T08:40',
    fields: {
      availability: [
        availability('batinah-kp-1', 'Available'),
        availability('batinah-kp-4', 'Available once the Barka wadi bridges are handed over'),
        availability('batinah-kp-2', 'Available'),
        availability('batinah-kp-3', 'Available'),
      ],
      nationalisation: 'Omanisation ratio for construction kept',
    },
  },
  {
    ...PACK_042, key: 'finance', itemId: 'T-2026-042:finance', ownerId: 'batinah.fin', due: '2026-03-08T09:40', submittedAt: '2026-03-08T09:25',
    fields: {
      ...facilityFields(BATINAH.facility),
      bankLeadDays: 5,
      bondCharges: 0.9,
      workingCapital: '10% advance against an advance payment guarantee; 5% retention, half released at provisional acceptance; payment within 56 days',
      fx: 'OMR contract: the EUR bearings quote is the only FX exposure; fix it at award',
    },
  },
];

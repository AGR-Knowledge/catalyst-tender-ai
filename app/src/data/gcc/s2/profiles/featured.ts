import type { ProfileOverride } from './generate';

/**
 * Hand-written lines for the featured suppliers (plan 031): the ones script B
 * shows on the hero's shortlists in Najd, the two blocked suppliers, and one
 * supplier quoting on T-2026-061 (Corniche) and on T-2026-042 (Batinah). They
 * add a summary, a risk note and the tenders their jobs sit on; the generator
 * still meets every data rule (the jobs are the master's awards, within the
 * load band). Keys are `{tenant}:{supplier id}`, or `*:{id}` for the firm in
 * every tenant.
 */
export const FEATURED: Record<string, ProfileOverride> = {
  // The hero's P-02: EUR ex-works, levelled for freight, duty and currency.
  'najd:rhein-aqua': {
    cleanCertificates: true,
    summary: 'German maker of clarifier drives, aerators and screens for municipal treatment plants. It quotes in EUR, ex-works, so freight, duty and currency are levelled on every quote.',
    risk: 'Quotes ex-works and excludes installation supervision: expect an allowance for both in levelling.',
    company: { established: 1998, staff: 420, ownership: 'Private, family owned' },
    health: 'strong',
    jobTenders: ['T-2025-251', 'T-2025-262'],
    jobNotes: ['Clarifier drives and aerators; the factory acceptance test is the next milestone.', 'Order placed; the approval drawings are with our design team.'],
    completed: ['najd-p2'],
  },
  // The Supplier Portal persona's firm in every tenant.
  '*:gulf-process': {
    cleanCertificates: true,
    scale: 'maker',
    health: 'adequate',
    company: { established: 2004, staff: 640, ownership: 'Private, family owned', localSharePct: 100, classification: 'Manufacturer, on the national product list' },
  },
  'najd:gulf-process': {
    summary: 'Dammam fabricator of process equipment, sludge and dosing skids, with a high local content score. Its estimator answers RFQs in the Supplier Portal.',
    risk: 'High load: its workshop also builds for other contractors, so its delivery dates need watching.',
  },
  // The hero's P-03: EUR, delivered; VAT included.
  'najd:nordklar': {
    cleanCertificates: true,
    summary: 'Swedish maker of disc filters and UV reactors for tertiary treatment. It quotes in EUR, delivered to site.',
    health: 'strong',
  },
  'najd:tamarisk': {
    cleanCertificates: true,
    summary: 'Jeddah water-technology firm for filtration, chemical dosing and testing. Its quotes include VAT, which levelling takes out.',
  },
  // The two blocked suppliers.
  'najd:tarvessa': {
    summary: 'Jebel Ali trading house for valves and instruments. Not prequalified.',
    risk: 'A related party matched a consolidated sanctions list. It cannot be shortlisted or sent an RFQ until Compliance clears the match.',
    scale: 'contractor',
    health: 'watch',
    company: { established: 2016, staff: 20, ownership: 'Private, single shareholder', localSharePct: null, classification: 'Trading company' },
  },
  'najd:lumenza': {
    summary: 'Dutch maker of UV disinfection reactors for tertiary treatment.',
    risk: 'Its periodic check raised an anti-bribery flag: an agent’s commission on another contractor’s order is under review. No new RFQ goes to it; the order already placed continues under Compliance’s watch.',
    jobsNow: 1,
    jobTenders: ['T-2025-251'],
    jobNotes: ['Placed before the flag was raised; deliveries continue under Compliance’s watch.'],
  },
  // Corniche: quotes on T-2026-061's P-02 (AHUs).
  'corniche:qarn-air': {
    cleanCertificates: true,
    summary: 'Abu Dhabi maker of air handling units and fan coil units, on Crescent Bay Health’s approved list. It quotes in AED, delivered to site.',
    company: { established: 2006 },
    jobTenders: ['T-2025-176', 'T-2025-230'],
    jobNotes: ['Hospital AHUs with HEPA sections; the first units are through the factory test.'],
    completed: ['corniche-p3'],
  },
  // Batinah: quotes on T-2026-042's P-04 (bridge bearings).
  'batinah:alpen-bearings': {
    cleanCertificates: true,
    summary: 'Innsbruck maker of pot and elastomeric bridge bearings and expansion joints. It quotes in EUR, ex-works.',
    health: 'strong',
    jobTenders: ['T-2025-265', 'T-2024-350'],
    jobNotes: ['Pot bearings for the Bahla crossing; the shop drawings are approved.'],
    completed: ['batinah-p3'],
  },
};

/** The override for a supplier in a tenant: the firm's own lines, then the tenant's. */
export function overrideOf(tenant: string, id: string): ProfileOverride {
  const firm = FEATURED[`*:${id}`] ?? {};
  const here = FEATURED[`${tenant}:${id}`] ?? {};
  return { ...firm, ...here, company: { ...firm.company, ...here.company } };
}

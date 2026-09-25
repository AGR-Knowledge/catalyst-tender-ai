import type { ProjectLength, RequirementScope } from './types';

/**
 * Pipeline and network lengths of past projects, for experience lines stated in
 * kilometres (plan 007a step 2.2.4). Plan 004's project register gives these
 * only in the titles, so they are kept here as facts, keyed by tenant and
 * project ID. Only Najd's screened tenders ask for them.
 */
export const PROJECT_LENGTHS: ProjectLength[] = [
  { tenant: 'najd', projectId: 'najd-p4', kind: 'sewer', km: 64 },
  { tenant: 'najd', projectId: 'najd-p5', kind: 'sewer', km: 22, diameterMm: 2_000 },
  { tenant: 'najd', projectId: 'najd-p6', kind: 'water-transmission', km: 48, diameterMm: 1_200 },
  { tenant: 'najd', projectId: 'najd-p7', kind: 'water-transmission', km: 36, diameterMm: 1_000 },
];

/** Which past projects count for each kilometre-based experience line. */
export const REQUIREMENT_SCOPES: RequirementScope[] = [
  // "sewer network or trunk sewer contracts, each of 20 km or more"
  { tenant: 'najd', tenderId: 'T-2026-117', reqId: 'R-05', kinds: ['sewer'] },
  // "seawater intake or outfall extending 1 km or more offshore"
  { tenant: 'najd', tenderId: 'T-2026-119', reqId: 'R-03', kinds: ['marine-offshore'] },
  // "water transmission pipelines, each 30 km or more of DN1000 or larger"
  { tenant: 'najd', tenderId: 'T-2026-109', reqId: 'R-05', kinds: ['water-transmission'], minDiameterMm: 1_000 },
];

/**
 * How the Win-Probability & Recommendation Agent scores an uploaded tender
 * against the bid office's profile before DG1. Each criterion is scored 0 to
 * 100 with the reason and the page it rests on; the weighted total is the
 * fit-score the register carries (see domain/compat.ts).
 */

export const PROFILE = {
  bondingLimitCr: 650,
  bandCr: [100, 900] as [number, number],
  regions: ['India'],
  sectors: ['Power', 'Transport', 'Water', 'Oil & gas', 'Renewables', 'Urban infra', 'Industrial'],
};

export const CRITERIA: { key: string; label: string; weight: number }[] = [
  { key: 'scope', label: 'Scope and sector fit', weight: 25 },
  { key: 'size', label: 'Size against bonding and band', weight: 15 },
  { key: 'elig', label: 'Eligibility and experience', weight: 20 },
  { key: 'geo', label: 'Geography and site', weight: 10 },
  { key: 'client', label: 'Client and payment security', weight: 10 },
  { key: 'terms', label: 'Contract terms and risk', weight: 10 },
  { key: 'capacity', label: 'Team and delivery capacity', weight: 10 },
];

export interface CompatScore { score: number; reason: string; page?: number }

export interface CompatRecord {
  scores: Record<string, CompatScore>;
  /** What would move the recommendation, most important first. */
  sharpen: string[];
}

export const COMPAT: Record<string, CompatRecord> = {
  nit: {
    scores: {
      scope: { score: 95, reason: 'A 4.4 km major bridge with approaches across the Brahmaputra on EPC mode. Bridges and highways are the core of the transport book', page: 1 },
      size: { score: 75, reason: '₹ 504 Cr sits inside the ₹ 100 to 900 Cr band and under the ₹ 650 Cr single-bid bonding limit, but it would use most of the headroom', page: 1 },
      elig: { score: 75, reason: 'The NIT does not print the qualification criteria. Major-bridge experience on record should meet a typical NHIDCL threshold; the RFP will confirm', page: 1 },
      geo: { score: 60, reason: 'Assam, where there is no live site. Mobilisation and a river-season working window add cost', page: 1 },
      client: { score: 85, reason: 'Government authority under MoRTH, with a known payment record', page: 1 },
      terms: { score: 55, reason: 'A 120-month maintenance obligation after 30 months of construction, and the feasibility report is not warranted', page: 1 },
      capacity: { score: 80, reason: 'The bridge team frees up after Q2; the programme fits alongside the live pursuits' },
    },
    sharpen: ['Reading the full RFP for the qualification criteria', 'Pricing the 120-month maintenance obligation', 'A site visit to confirm the working window on the river'],
  },
  'rfp-rangpo': {
    scores: {
      scope: { score: 90, reason: 'An additional bridge on NH-10 on EPC mode for NHIDCL, the same kind of work the transport team delivers', page: 4 },
      size: { score: 30, reason: '₹ 13.01 Cr is far below the ₹ 100 Cr lower end of the band. Overheads and bid cost weigh heavily at this size', page: 4 },
      elig: { score: 90, reason: 'Thresholds are low: ₹ 2.60 Cr average turnover, ₹ 0.65 Cr net worth and a 72 m span major bridge in five years, all met', page: 16 },
      geo: { score: 55, reason: 'Rangpo, on the Sikkim border. A hill section with a short working season', page: 4 },
      client: { score: 90, reason: 'NHIDCL, a repeat client with a clean payment record', page: 4 },
      terms: { score: 70, reason: 'Standard EPC terms with a four-year defect liability period. Joint ventures are not allowed at this size', page: 14 },
      capacity: { score: 75, reason: 'A small team is enough, though it ties up a bridge engineer for 24 months', page: 4 },
    },
    sharpen: ['Whether the job can be run from an existing North East site', 'A re-issue date, as this one has passed'],
  },
  'tor-akkar': {
    scores: {
      scope: { score: 10, reason: 'Design consultancy for a governmental hospital. The bid office delivers EPC works and has no hospital design practice', page: 2 },
      size: { score: 20, reason: 'A US$ 3,000,000 construction budget. The consultancy fee would be a small fraction of that, well below the band', page: 2 },
      elig: { score: 15, reason: 'The minimum team needs a senior biomedical engineer and specialists with three years in the hospital sector', page: 15 },
      geo: { score: 10, reason: 'Akkar, Lebanon. Outside the operating countries, with Arabic text required in deliverables', page: 2 },
      client: { score: 40, reason: 'A governmental hospital, paid in phases, with no history with the bid office', page: 17 },
      terms: { score: 30, reason: 'Permit risk and data liability sit with the consultant, and the design must fit a fixed budget', page: 8 },
      capacity: { score: 55, reason: 'The design team has room, but not the hospital specialists the ToR asks for' },
    },
    sharpen: ['A hospital design partner who could lead, with Catalyst in support', 'Selection criteria and a submission date, neither of which the ToR gives'],
  },
};

/** Pursue at or above this score; below the lower one, the agent recommends not to pursue. */
export const PURSUE_AT = 65;
export const REVIEW_AT = 45;

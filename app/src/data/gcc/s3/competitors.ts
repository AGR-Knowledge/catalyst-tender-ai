import type { Competitor, Evidence } from './types';

/**
 * The five fictional competitors of gcc-demo-data §7, for the hero tender and
 * T-2026-097, with their evidence. Everything is synthetic: award notices,
 * opening reports, the prequalified list and the market-intelligence feed are
 * made up for the demo, and every URL uses an `.example` host.
 *
 * Every claim cites at least one evidence record, except one deliberate
 * uncited claim on Al-Masar, which the pack must suppress (spec §9.2: no
 * source, no claim).
 */

const SAR = (amount: number) => ({ amount, ccy: 'SAR' as const });

export const EVIDENCE: Evidence[] = [
  { id: 'EV-01', kind: 'award-notice', date: '2023-06-14', title: 'Award notice: Qassim STP expansion, to Hijr Al-Watan Contracting (synthetic)',
    url: 'https://awards.portal.example/2023/qassim-stp-expansion' },
  { id: 'EV-02', kind: 'award-notice', date: '2024-09-02', title: 'Award notice: Tabuk STP Phase 2, to Hijr Al-Watan Contracting (synthetic)',
    url: 'https://awards.portal.example/2024/tabuk-stp-phase-2' },
  { id: 'EV-03', kind: 'award-notice', date: '2025-04-21', title: 'Award notice: Jazan STP upgrade, to Hijr Al-Watan Contracting (synthetic)',
    url: 'https://awards.portal.example/2025/jazan-stp-upgrade' },
  { id: 'EV-04', kind: 'pq-list', date: '2026-02-03', title: 'Prequalified bidders list: Madinah WTP expansion, WCWS (synthetic)',
    url: 'https://tenders.wcws.example/prj-2026-0009/prequalified' },
  { id: 'EV-05', kind: 'market-intel', date: '2025-11-10', title: 'Market-intelligence feed: Sahab Gulf Water Technologies, water tenders 2023–25 (synthetic)',
    url: 'https://intel.market-feed.example/companies/sahab-gulf-water' },
  { id: 'EV-06', kind: 'award-notice', date: '2024-12-08', title: 'Award notice: Yanbu WTP process package, to a Sahab Gulf Water Technologies JV (synthetic)',
    url: 'https://awards.portal.example/2024/yanbu-wtp-process' },
  { id: 'EV-07', kind: 'opening-report', date: '2026-01-20', title: 'Bid opening reports: Al-Masar United Contracting, last 7 tenders (synthetic)',
    url: 'https://openings.portal.example/bidders/al-masar-united' },
  { id: 'EV-08', kind: 'award-notice', date: '2025-08-19', title: 'Award notice: Hafr Al-Batin sewer network, to Al-Masar United Contracting (synthetic)',
    url: 'https://awards.portal.example/2025/hafr-al-batin-sewer' },
  { id: 'EV-09', kind: 'award-notice', date: '2024-03-11', title: 'Award notice: Jeddah North STP, to Tihama Hydro Works Co. (synthetic)',
    url: 'https://awards.portal.example/2024/jeddah-north-stp' },
  { id: 'EV-10', kind: 'market-intel', date: '2025-06-30', title: 'Market-intelligence feed: Tihama Hydro Works Co., O&M contracts (synthetic)',
    url: 'https://intel.market-feed.example/companies/tihama-hydro-works' },
  { id: 'EV-11', kind: 'market-intel', date: '2025-10-05', title: 'Market-intelligence feed: Istria Aqua Engineering, GCC entries through local JVs (synthetic)',
    url: 'https://intel.market-feed.example/companies/istria-aqua' },
  { id: 'EV-12', kind: 'award-notice', date: '2025-01-27', title: 'Award notice: Dammam WTP rehabilitation, to Istria Aqua Engineering with a local partner (synthetic)',
    url: 'https://awards.portal.example/2025/dammam-wtp-rehabilitation' },
];

export const COMPETITORS: Competitor[] = [
  {
    id: 'hijr', name: 'Hijr Al-Watan Contracting', country: 'Saudi Arabia',
    profile: 'Large KSA water EPC contractor with a strong treatment-plant record',
    pricingPosture: 'market',
    claims: [
      { text: 'Three STP awards in 2023–25', evidenceIds: ['EV-01', 'EV-02', 'EV-03'] },
      { text: 'Prequalified for the Madinah WTP expansion', evidenceIds: ['EV-04'] },
    ],
    recentWins: [
      { title: 'Qassim STP expansion', year: 2023, value: SAR(410_000_000), evidenceId: 'EV-01' },
      { title: 'Tabuk STP Phase 2', year: 2024, value: SAR(365_000_000), evidenceId: 'EV-02' },
      { title: 'Jazan STP upgrade', year: 2025, value: SAR(290_000_000), evidenceId: 'EV-03' },
    ],
  },
  {
    id: 'sahab', name: 'Sahab Gulf Water Technologies', country: 'Saudi Arabia and UAE',
    profile: 'Process specialist in membranes and filtration; usually bids in a JV with a civil contractor',
    pricingPosture: 'premium', usuallyJv: true,
    claims: [
      { text: 'Process specialist: membrane and filtration packages', evidenceIds: ['EV-05'] },
      { text: 'Bid in a JV on 5 of its last 6 water tenders', evidenceIds: ['EV-05', 'EV-06'] },
      { text: 'Prequalified for the Madinah WTP expansion, in a JV', evidenceIds: ['EV-04'] },
    ],
    recentWins: [
      { title: 'Yanbu WTP process package (in a JV)', year: 2024, value: SAR(180_000_000), evidenceId: 'EV-06' },
    ],
  },
  {
    id: 'al-masar', name: 'Al-Masar United Contracting', country: 'Saudi Arabia',
    profile: 'Networks and treatment contractor that competes hard on price',
    pricingPosture: 'aggressive',
    claims: [
      { text: 'Lowest bidder in 4 of its last 7 tenders', evidenceIds: ['EV-07'] },
      { text: 'Prequalified for the Madinah WTP expansion', evidenceIds: ['EV-04'] },
      // Deliberately uncited: the pack drops it and counts it as suppressed.
      { text: 'Said to be bidding below cost this year', evidenceIds: [] },
    ],
    recentWins: [
      { title: 'Hafr Al-Batin sewer network', year: 2025, value: SAR(230_000_000), evidenceId: 'EV-08' },
    ],
  },
  {
    id: 'tihama', name: 'Tihama Hydro Works Co.', country: 'Saudi Arabia',
    profile: 'KSA water contractor, Water & sewage works Grade 1. A competitor here, and a JV partner elsewhere',
    pricingPosture: 'market', alsoPartnerOf: ['najd', 'dafna'],
    claims: [
      { text: 'Two STPs over 100,000 m³/day delivered, one tertiary', evidenceIds: ['EV-09', 'EV-10'] },
      { text: 'Four years of STP operation and maintenance', evidenceIds: ['EV-10'] },
      { text: 'Prequalified for the Madinah WTP expansion', evidenceIds: ['EV-04'] },
    ],
    recentWins: [
      { title: 'Jeddah North STP', year: 2024, value: SAR(470_000_000), evidenceId: 'EV-09' },
    ],
  },
  {
    id: 'istria', name: 'Istria Aqua Engineering', country: 'Europe (foreign EPC)',
    profile: 'Foreign water EPC that enters the GCC through local JVs',
    pricingPosture: 'premium', usuallyJv: true,
    claims: [
      { text: 'Enters GCC tenders through local JV partners', evidenceIds: ['EV-11', 'EV-12'] },
      { text: 'Prequalified for the Madinah WTP expansion with a local partner', evidenceIds: ['EV-04'] },
    ],
    recentWins: [
      { title: 'Dammam WTP rehabilitation (with a local partner)', year: 2025, value: SAR(260_000_000), evidenceId: 'EV-12' },
    ],
  },
];

import type { Competitor, Evidence } from './types';

/**
 * The five fictional competitors of gcc-demo-data §7, for the hero tender and
 * T-2026-097, with their evidence. Everything is synthetic: award notices,
 * opening reports, the prequalified list and the market-intelligence feed are
 * made up for the demo, and every URL uses an `.example` host.
 *
 * Every claim cites at least one evidence record, except one deliberate
 * uncited claim on Al-Thamad, which the pack must suppress (spec §9.2: no
 * source, no claim).
 */

const SAR = (amount: number) => ({ amount, ccy: 'SAR' as const });
const AED = (amount: number) => ({ amount, ccy: 'AED' as const });
const OMR = (amount: number) => ({ amount, ccy: 'OMR' as const });

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
  { id: 'EV-07', kind: 'opening-report', date: '2026-01-20', title: 'Bid opening reports: Al-Thamad United Contracting, last 7 tenders (synthetic)',
    url: 'https://openings.portal.example/bidders/al-masar-united' },
  { id: 'EV-08', kind: 'award-notice', date: '2025-08-19', title: 'Award notice: Hafr Al-Batin sewer network, to Al-Thamad United Contracting (synthetic)',
    url: 'https://awards.portal.example/2025/hafr-al-batin-sewer' },
  { id: 'EV-09', kind: 'award-notice', date: '2024-03-11', title: 'Award notice: Jeddah North STP, to Qunfudhah Hydro Works Co. (synthetic)',
    url: 'https://awards.portal.example/2024/jeddah-north-stp' },
  { id: 'EV-10', kind: 'market-intel', date: '2025-06-30', title: 'Market-intelligence feed: Qunfudhah Hydro Works Co., O&M contracts (synthetic)',
    url: 'https://intel.market-feed.example/companies/tihama-hydro-works' },
  { id: 'EV-11', kind: 'market-intel', date: '2025-10-05', title: 'Market-intelligence feed: Istria Aqua Engineering, GCC entries through local JVs (synthetic)',
    url: 'https://intel.market-feed.example/companies/istria-aqua' },
  { id: 'EV-12', kind: 'award-notice', date: '2025-01-27', title: 'Award notice: Dammam WTP rehabilitation, to Istria Aqua Engineering with a local partner (synthetic)',
    url: 'https://awards.portal.example/2025/dammam-wtp-rehabilitation' },

  // Plan 022: T-2026-061 (Corniche), three fictional UAE MEP contractors.
  { id: 'EV-061-01', kind: 'award-notice', date: '2024-05-12', title: 'Award notice: Al Ain specialist hospital MEP works, to Tessaline MEP Contracting (synthetic)',
    url: 'https://awards.portal.example/2024/al-ain-specialist-hospital-mep' },
  { id: 'EV-061-02', kind: 'award-notice', date: '2025-07-03', title: 'Award notice: Abu Dhabi rehabilitation centre MEP, to Tessaline MEP Contracting (synthetic)',
    url: 'https://awards.portal.example/2025/abu-dhabi-rehabilitation-centre-mep' },
  { id: 'EV-061-03', kind: 'opening-report', date: '2026-01-14', title: 'Tender opening reports: Maswaan Building Services Co., last 6 MEP tenders (synthetic)',
    url: 'https://openings.portal.example/bidders/sarab-building-services' },
  { id: 'EV-061-04', kind: 'award-notice', date: '2025-10-22', title: 'Award notice: Dubai clinic tower MEP, to Maswaan Building Services Co. (synthetic)',
    url: 'https://awards.portal.example/2025/dubai-clinic-tower-mep' },
  { id: 'EV-061-05', kind: 'market-intel', date: '2025-12-01', title: 'Market-intelligence feed: Brevanne Engineering Services (Gulf), healthcare MEP and medical gas (synthetic)',
    url: 'https://intel.market-feed.example/companies/brevanne-engineering-gulf' },
  { id: 'EV-061-06', kind: 'award-notice', date: '2025-03-18', title: 'Award notice: Sharjah hospital medical gas and MEP works, to Brevanne Engineering Services (Gulf) (synthetic)',
    url: 'https://awards.portal.example/2025/sharjah-hospital-medical-gas-mep' },
  { id: 'EV-061-07', kind: 'market-intel', date: '2026-03-08', title: 'Market-intelligence feed: contractors that downloaded CBHH/PRJ/2026/011 (synthetic)',
    url: 'https://intel.market-feed.example/tenders/cbhh-prj-2026-011' },

  // Plan 023: T-2026-042 (Batinah), three fictional Omani roads contractors.
  { id: 'EV-042-01', kind: 'award-notice', date: '2024-11-17', title: 'Award notice: Ibri bypass dualling, to Dhank Highways Contracting LLC (synthetic)',
    url: 'https://awards.portal.example/2024/ibri-bypass-dualling' },
  { id: 'EV-042-02', kind: 'opening-report', date: '2026-01-25', title: 'Tender opening reports: Dhank Highways Contracting LLC, last 5 roads tenders (synthetic)',
    url: 'https://openings.portal.example/bidders/liwa-highways-contracting' },
  { id: 'EV-042-03', kind: 'award-notice', date: '2025-06-09', title: 'Award notice: Wadi Hawasina bridges, to Shinas Bridges and Roads LLC (synthetic)',
    url: 'https://awards.portal.example/2025/wadi-hawasina-bridges' },
  { id: 'EV-042-04', kind: 'market-intel', date: '2025-12-14', title: 'Market-intelligence feed: Mahda Infrastructure SAOC, JV bids with foreign bridge specialists (synthetic)',
    url: 'https://intel.market-feed.example/companies/mahda-infrastructure' },
  { id: 'EV-042-05', kind: 'market-intel', date: '2026-03-08', title: 'Market-intelligence feed: contractors that bought the ILRA/RD/2026/042 tender documents (synthetic)',
    url: 'https://intel.market-feed.example/tenders/ilra-rd-2026-042' },
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
    id: 'al-masar', name: 'Al-Thamad United Contracting', country: 'Saudi Arabia',
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
    id: 'tihama', name: 'Qunfudhah Hydro Works Co.', country: 'Saudi Arabia',
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

  // Plan 022: T-2026-061 (Corniche). Fictional UAE MEP contractors.
  {
    id: 'tessaline-mep', name: 'Tessaline MEP Contracting', country: 'United Arab Emirates',
    profile: 'Abu Dhabi MEP contractor with a growing hospital record in the emirate',
    pricingPosture: 'market',
    claims: [
      { text: 'Two hospital MEP awards in Abu Dhabi in 2024–25', evidenceIds: ['EV-061-01', 'EV-061-02'] },
      { text: 'Downloaded the CBHH/PRJ/2026/011 tender documents', evidenceIds: ['EV-061-07'] },
    ],
    recentWins: [
      { title: 'Al Ain specialist hospital MEP works', year: 2024, value: AED(210_000_000), evidenceId: 'EV-061-01' },
      { title: 'Abu Dhabi rehabilitation centre MEP', year: 2025, value: AED(135_000_000), evidenceId: 'EV-061-02' },
    ],
  },
  {
    id: 'sarab-bs', name: 'Maswaan Building Services Co.', country: 'United Arab Emirates and Saudi Arabia',
    profile: 'Regional MEP contractor that competes hard on price',
    pricingPosture: 'aggressive',
    claims: [
      { text: 'Lowest tenderer in 3 of its last 6 MEP tenders', evidenceIds: ['EV-061-03'] },
      { text: 'Downloaded the CBHH/PRJ/2026/011 tender documents', evidenceIds: ['EV-061-07'] },
    ],
    recentWins: [
      { title: 'Dubai clinic tower MEP', year: 2025, value: AED(118_000_000), evidenceId: 'EV-061-04' },
    ],
  },
  {
    id: 'brevanne', name: 'Brevanne Engineering Services (Gulf)', country: 'United Arab Emirates (foreign-owned)',
    profile: 'Foreign-owned MEP contractor, strong in medical gas and commissioning; prices at a premium',
    pricingPosture: 'premium',
    claims: [
      { text: 'Approved medical gas installer: installs its own medical gas systems', evidenceIds: ['EV-061-05', 'EV-061-06'] },
      { text: 'Downloaded the CBHH/PRJ/2026/011 tender documents', evidenceIds: ['EV-061-07'] },
    ],
    recentWins: [
      { title: 'Sharjah hospital medical gas and MEP works', year: 2025, value: AED(160_000_000), evidenceId: 'EV-061-06' },
    ],
  },

  // Plan 023: likely bidders on Batinah's T-2026-042, all fictional.
  {
    id: 'liwa-highways', name: 'Dhank Highways Contracting LLC', country: 'Oman',
    profile: 'Large Omani roads contractor, Tender Board Excellent grade, with its own asphalt plants in North Al Batinah',
    pricingPosture: 'aggressive',
    claims: [
      { text: 'Lowest bidder in 3 of its last 5 roads tenders', evidenceIds: ['EV-042-02'] },
      { text: 'Bought the ILRA/RD/2026/042 tender documents', evidenceIds: ['EV-042-05'] },
    ],
    recentWins: [
      { title: 'Ibri bypass dualling', year: 2024, value: OMR(21_000_000), evidenceId: 'EV-042-01' },
    ],
  },
  {
    id: 'shinas-bridges', name: 'Shinas Bridges and Roads LLC', country: 'Oman',
    profile: 'Omani roads and bridges contractor, strongest on structures; bids road tenders with major bridges',
    pricingPosture: 'market',
    claims: [
      { text: 'Built wadi bridges with a 70 m main span in 2025', evidenceIds: ['EV-042-03'] },
      { text: 'Bought the ILRA/RD/2026/042 tender documents', evidenceIds: ['EV-042-05'] },
    ],
    recentWins: [
      { title: 'Wadi Hawasina bridges', year: 2025, value: OMR(9_800_000), evidenceId: 'EV-042-03' },
    ],
  },
  {
    id: 'mahda-infra', name: 'Mahda Infrastructure SAOC', country: 'Oman',
    profile: 'Diversified Omani contractor that bids large road tenders in a JV with a foreign bridge specialist',
    pricingPosture: 'premium', usuallyJv: true,
    claims: [
      { text: 'Bid in a JV with a foreign bridge specialist on 3 of its last 4 large road tenders', evidenceIds: ['EV-042-04'] },
      { text: 'Bought the ILRA/RD/2026/042 tender documents', evidenceIds: ['EV-042-05'] },
    ],
    recentWins: [],
  },
];

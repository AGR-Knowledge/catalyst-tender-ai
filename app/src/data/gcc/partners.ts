import type { Partner } from './types';

/**
 * Tihama Hydro Works Co.: a fictional KSA water contractor (gcc-demo-data
 * §2.4). It appears on two tenants' partner lists (Najd, Dafna) and as a
 * competitor in Stage 3: in the GCC market, contractors are both partners and
 * rivals. Each tenant holds what it knows about the partner; this is the same
 * public-facing set for both.
 */
export const TIHAMA: Partner = {
  id: 'tihama',
  name: 'Tihama Hydro Works Co.',
  country: 'SA',
  note: 'KSA water contractor, Water & sewage works Grade 1. Can lead a JV on large STPs. Also a competitor.',
  credentials: [
    { id: 'tihama-cr', kind: 'cr', label: 'Commercial Registration: water and sewage works', number: '4030xxxxxx', field: 'Water & sewage works', country: 'SA', issuer: 'Ministry of Commerce', validTo: '2027-05-31', ownerId: 'partner.tihama' },
    { id: 'tihama-zakat', kind: 'zakat', label: 'Zakat certificate (ZATCA)', country: 'SA', issuer: 'Zakat, Tax and Customs Authority', validTo: '2026-06-30', ownerId: 'partner.tihama' },
    { id: 'tihama-gosi', kind: 'gosi', label: 'GOSI certificate', country: 'SA', issuer: 'General Organization for Social Insurance', validTo: '2026-08-15', ownerId: 'partner.tihama' },
    { id: 'tihama-chamber', kind: 'chamber', label: 'Chamber of Commerce membership: Jeddah', country: 'SA', issuer: 'Jeddah Chamber', validTo: '2026-12-31', ownerId: 'partner.tihama' },
    { id: 'tihama-class', kind: 'classification', label: 'Contractor classification: Water & sewage works', field: 'Water & sewage works', grade: 1, country: 'SA', issuer: 'Contractor Classification Agency', validTo: '2028-02-28', ownerId: 'partner.tihama' },
    { id: 'tihama-sca', kind: 'contractors-authority', label: 'Saudi Contractors Authority membership', country: 'SA', issuer: 'Saudi Contractors Authority', validTo: '2026-11-30', ownerId: 'partner.tihama' },
    { id: 'tihama-saudization', kind: 'saudization', label: 'Saudization certificate: High Green band', country: 'SA', issuer: 'Ministry of Human Resources and Social Development', validTo: '2026-09-30', ownerId: 'partner.tihama' },
    { id: 'tihama-vat', kind: 'vat', label: 'VAT registration', country: 'SA', issuer: 'Zakat, Tax and Customs Authority', validTo: null, ownerId: 'partner.tihama' },
    { id: 'tihama-iso', kind: 'iso', label: 'ISO 9001 / 14001 / 45001', issuer: 'Accredited certification body', validTo: '2027-03-31', ownerId: 'partner.tihama' },
    { id: 'tihama-lc', kind: 'lc-baseline', label: 'Local content baseline certificate', score: 44, country: 'SA', issuer: 'Local Content and Government Procurement Authority', validTo: '2026-12-31', ownerId: 'partner.tihama' },
  ],
  projects: [
    { id: 'tihama-p1', title: 'Jeddah North STP', client: 'Western Cities Water Services Company', country: 'SA', capacityM3d: 180_000, tertiary: true,
      value: { amount: 780_000_000, ccy: 'SAR' }, completed: '2021-06-30', role: 'prime', scope: 'Design and build, tertiary treatment; operated for 4 years',
      om: { from: '2021-07-01', to: '2025-06-30' } },
    { id: 'tihama-p2', title: 'Southern Region STP expansion', client: 'Southern Cities Water Services Company', country: 'SA', capacityM3d: 120_000, tertiary: false,
      value: { amount: 510_000_000, ccy: 'SAR' }, completed: '2018-11-30', role: 'prime', scope: 'Civil, mechanical and electrical works, secondary treatment' },
  ],
  financials: [
    { fy: 2022, turnover: { amount: 1_050_000_000, ccy: 'SAR' }, audited: true },
    { fy: 2023, turnover: { amount: 1_100_000_000, ccy: 'SAR' }, audited: true },
    { fy: 2024, turnover: { amount: 1_150_000_000, ccy: 'SAR' }, audited: true, netWorth: { amount: 430_000_000, ccy: 'SAR' }, currentRatio: 1.28 },
    { fy: 2025, turnover: { amount: 1_210_000_000, ccy: 'SAR' }, audited: false, auditDate: '2026-04-30' },
  ],
};

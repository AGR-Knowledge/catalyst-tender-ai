import type { Tone } from './types';

/**
 * Tenants are the companies (or JVs) that each run their own bid office on the
 * platform. Data never crosses between them: sources, users, rate libraries,
 * past bids and templates all belong to one tenant. Five GCC contractors run
 * the Stage 1–3 demo; Genesis EPC India Ltd keeps the full-lifecycle preview;
 * the Gulf JV is part-way through onboarding (gcc-demo-data §2).
 */

export interface TenantSource { name: string; mode: string }

/** Which screens a tenant gets: today's full-lifecycle preview, or the Stage 1–3 GCC build. */
export type TenantWorld = 'legacy-in' | 'gcc';
export type CountryCode = 'SA' | 'AE' | 'QA' | 'OM' | 'KW' | 'IN';

/** How a tenant looks and keeps time. */
export interface TenantProfile {
  world: TenantWorld;
  /** The presenter can switch into it. A tenant still onboarding cannot. */
  switchable: boolean;
  countryCode: CountryCode;
  hqCity: string;
  /** IANA zone, e.g. Asia/Riyadh. */
  timeZone: string;
  tzLabel: string;
  locale: string;
  monogram: string;
  /** Suffix of the `.accent-*` brand class; `ink` is the neutral mark. */
  accent: string;
  headTitle: 'Head of Tendering' | 'Tendering Director';
  sectors: string[];
}

/** The profile is optional here only so a tenant added during the demo can be saved; `completeTenant` fills it. */
export interface Tenant extends Partial<TenantProfile> {
  key: string;
  name: string;
  legal: string;
  country: string;
  currency: string;
  /** Where the tenant's documents and models are held. */
  residency: string;
  sso: string;
  admin: string;
  adminEmail: string;
  /** ISO date the tenant was created on the platform. */
  created: string;
  live: boolean;
  /** Go-live month for a live tenant, or the planned one while onboarding. */
  goLive: string;
  seats: number;
  sources: TenantSource[];
  /** Onboarding steps already complete when the demo starts. */
  doneSteps: string[];
}

export type ProfiledTenant = Tenant & TenantProfile;

/** What a tenant has to set up before its first tender is read. Order matters. */
export const ONBOARDING: { key: string; label: string; detail: string }[] = [
  { key: 'entity', label: 'Company profile and legal entity', detail: 'Registered name, tax IDs, bonding lines and signatories' },
  { key: 'residency', label: 'Data residency and single sign-on', detail: 'Region for documents and models, identity provider connected' },
  { key: 'sources', label: 'Tender sources connected', detail: 'Portals, mailboxes and scanned drops the Intake Agent watches' },
  { key: 'users', label: 'Users invited to roles', detail: 'Each person gets one role and a tender scope' },
  { key: 'gates', label: 'Gates and approval limits', detail: 'DG1 to DG3 owners, referral thresholds and SLAs' },
  { key: 'catalogue', label: 'Service catalogue and rate library', detail: 'Used to classify BOQ lines and price self-performed work' },
  { key: 'history', label: 'Past bids imported', detail: 'Decided bids and delivered margins that calibrate win odds' },
];

const ALL_STEPS = ONBOARDING.map((s) => s.key);

export const TENANTS: ProfiledTenant[] = [
  {
    key: 'najd', name: 'Najd Arcline Contracting Co.', legal: 'Najd Arcline Contracting Company, closed joint stock company, Riyadh', country: 'Saudi Arabia', currency: 'SAR',
    residency: 'KSA, in-Kingdom region', sso: 'Microsoft Entra ID', admin: 'Faisal Al-Harbi', adminEmail: 'f.alharbi@najd.example',
    created: '2025-06-15', live: true, goLive: 'September 2025', seats: 20,
    sources: [
      { name: 'Etimad', mode: 'Scheduled, login. Credentials expiring Fri 13 Mar' },
      { name: 'National water utility supplier portal', mode: 'Assisted: login-gated, an operator completes access' },
      { name: 'Industrial utilities vendor portal', mode: 'Assisted: an operator completes access' },
      { name: 'tenders@najd.example mailbox', mode: 'IMAP, attachments opened' },
      { name: 'bids@najd.example mailbox', mode: 'IMAP, attachments opened' },
      { name: 'Scanned drop', mode: 'OCR on arrival' },
      { name: 'Manual upload', mode: 'Any user with upload rights' },
    ],
    doneSteps: ALL_STEPS,
    world: 'gcc', switchable: true, countryCode: 'SA', hqCity: 'Riyadh', timeZone: 'Asia/Riyadh', tzLabel: 'AST', locale: 'en-GB',
    monogram: 'NA', accent: 'najd', headTitle: 'Head of Tendering', sectors: ['Water and wastewater', 'Utility networks', 'Roads'],
  },
  {
    key: 'corniche', name: 'Corniche Lattice MEP LLC', legal: 'Corniche Lattice MEP LLC, Dubai', country: 'United Arab Emirates', currency: 'AED',
    residency: 'UAE (me-central-1)', sso: 'Okta', admin: 'Rania Khoury', adminEmail: 'r.khoury@corniche.example',
    created: '2025-08-04', live: true, goLive: 'November 2025', seats: 14,
    sources: [
      { name: 'Dubai government e-procurement portal', mode: 'Scheduled, login' },
      { name: 'Abu Dhabi government procurement portal', mode: 'Scheduled, login' },
      { name: 'Etimad (KSA entry watch)', mode: 'Scheduled, public listings' },
      { name: 'tenders@corniche.example mailbox', mode: 'IMAP, attachments opened' },
      { name: 'Manual upload', mode: 'Any user with upload rights' },
    ],
    doneSteps: ALL_STEPS,
    world: 'gcc', switchable: true, countryCode: 'AE', hqCity: 'Dubai', timeZone: 'Asia/Dubai', tzLabel: 'GST', locale: 'en-GB',
    monogram: 'CL', accent: 'corniche', headTitle: 'Head of Tendering', sectors: ['Buildings MEP', 'District cooling', 'Fit-out'],
  },
  {
    key: 'dafna', name: 'Dafna Keystone Civil W.L.L.', legal: 'Dafna Keystone Civil W.L.L., Doha, with a registered branch in Riyadh', country: 'Qatar', currency: 'QAR',
    residency: 'Qatar, in-country region', sso: 'Google Workspace', admin: 'Nasser Al-Kuwari', adminEmail: 'n.alkuwari@dafna.example',
    created: '2025-09-01', live: true, goLive: 'December 2025', seats: 12,
    sources: [
      { name: 'Monaqasat (Ministry of Finance)', mode: 'Scheduled, login' },
      { name: 'Etimad (Riyadh branch)', mode: 'Scheduled, login' },
      { name: 'tenders@dafna.example mailbox', mode: 'IMAP, attachments opened' },
      { name: 'Manual upload', mode: 'Any user with upload rights' },
    ],
    doneSteps: ALL_STEPS,
    world: 'gcc', switchable: true, countryCode: 'QA', hqCity: 'Doha', timeZone: 'Asia/Qatar', tzLabel: 'AST', locale: 'en-GB',
    monogram: 'DK', accent: 'dafna', headTitle: 'Head of Tendering', sectors: ['Civil works', 'Utility networks', 'Pump stations'],
  },
  {
    key: 'batinah', name: 'Batinah Waypoint Roads LLC', legal: 'Batinah Waypoint Roads LLC, Sohar', country: 'Oman', currency: 'OMR',
    residency: 'UAE (me-central-1)', sso: 'Microsoft Entra ID', admin: 'Said Al-Balushi', adminEmail: 's.albalushi@batinah.example',
    created: '2025-10-12', live: true, goLive: 'January 2026', seats: 12,
    sources: [
      { name: 'Tender Board e-tendering', mode: 'Scheduled, login' },
      { name: 'bids@batinah.example mailbox', mode: 'IMAP, attachments opened. Partner referrals arrive here' },
      { name: 'Scanned drop', mode: 'OCR on arrival' },
      { name: 'Manual upload', mode: 'Any user with upload rights' },
    ],
    doneSteps: ALL_STEPS,
    world: 'gcc', switchable: true, countryCode: 'OM', hqCity: 'Sohar', timeZone: 'Asia/Muscat', tzLabel: 'GST', locale: 'en-GB',
    monogram: 'BW', accent: 'batinah', headTitle: 'Head of Tendering', sectors: ['Roads', 'Bridges', 'Earthworks'],
  },
  {
    key: 'qurain', name: 'Qurain Meridian Projects Co.', legal: 'Qurain Meridian Projects Co. K.S.C.C., Kuwait City; bids in KSA through Qurain Meridian Arabia Co.', country: 'Kuwait', currency: 'KWD',
    residency: 'Bahrain (me-south-1)', sso: 'Microsoft Entra ID', admin: 'Bader Al-Mutawa', adminEmail: 'b.almutawa@qurain.example',
    created: '2025-05-20', live: true, goLive: 'August 2025', seats: 16,
    sources: [
      { name: 'CAPT (Central Agency for Public Tenders)', mode: 'Scheduled, login' },
      { name: 'Etimad (Qurain Meridian Arabia Co.)', mode: 'Scheduled, login' },
      { name: 'Oil and gas operator vendor portal', mode: 'Assisted: an operator completes access' },
      { name: 'tenders@qurain.example mailbox', mode: 'IMAP, attachments opened' },
      { name: 'Manual upload', mode: 'Any user with upload rights' },
    ],
    doneSteps: ALL_STEPS,
    world: 'gcc', switchable: true, countryCode: 'KW', hqCity: 'Kuwait City', timeZone: 'Asia/Kuwait', tzLabel: 'AST', locale: 'en-GB',
    monogram: 'QM', accent: 'qurain', headTitle: 'Head of Tendering', sectors: ['Water', 'Infrastructure', 'Oil and gas facilities'],
  },
  {
    key: 'gen-in', name: 'Genesis EPC India Ltd', legal: 'Genesis EPC India Limited, CIN U45200MH2009PLC191230', country: 'India', currency: 'INR',
    residency: 'Mumbai (ap-south-1)', sso: 'Microsoft Entra ID', admin: 'S. Kapoor', adminEmail: 'it.admin@genesis-epc.in',
    created: '2025-04-14', live: true, goLive: 'July 2025', seats: 8,
    sources: [
      { name: 'CPPP portal', mode: 'Polled every 15 min' },
      { name: 'GeM portal', mode: 'Polled every 15 min' },
      { name: 'State utility portals (7)', mode: 'Polled hourly' },
      { name: 'tenders@genesis-epc.in mailbox', mode: 'IMAP, attachments opened' },
      { name: 'rfp@genesis-infra.com mailbox', mode: 'IMAP, attachments opened' },
      { name: 'Scanned drop at \\\\bidoffice\\intake', mode: 'OCR on arrival' },
    ],
    doneSteps: ALL_STEPS,
    world: 'legacy-in', switchable: true, countryCode: 'IN', hqCity: 'Mumbai', timeZone: 'Asia/Kolkata', tzLabel: 'IST', locale: 'en-IN',
    monogram: 'GE', accent: 'ink', headTitle: 'Head of Tendering', sectors: ['Power', 'Transport', 'Renewables', 'Oil & gas'],
  },
  {
    key: 'gen-gulf', name: 'Genesis Infra Gulf JV', legal: 'Genesis Infra and Al Noor Contracting JV LLC, Abu Dhabi', country: 'United Arab Emirates', currency: 'AED',
    residency: 'UAE (me-central-1)', sso: 'Okta', admin: 'F. Al Mansoori', adminEmail: 'f.almansoori@genesis-gulf.com',
    created: '2026-02-02', live: false, goLive: 'May 2026', seats: 5,
    sources: [
      { name: 'bids@genesis-gulf.com mailbox', mode: 'IMAP, attachments opened' },
      { name: 'Abu Dhabi Procurement portal', mode: 'Credentials pending' },
    ],
    doneSteps: ['entity', 'residency', 'sources'],
    world: 'gcc', switchable: false, countryCode: 'AE', hqCity: 'Abu Dhabi', timeZone: 'Asia/Dubai', tzLabel: 'GST', locale: 'en-GB',
    monogram: 'GI', accent: 'ink', headTitle: 'Head of Tendering', sectors: ['Infrastructure'],
  },
];

/** The tenant a fresh browser opens in. */
export const DEFAULT_TENANT = 'najd';
/** Holds the full-lifecycle preview (Stages 1–9 on Indian data). */
export const LEGACY_TENANT = 'gen-in';
/** @deprecated The active tenant lives in the demo store; use `useTenant()`. Kept so untouched legacy imports compile. */
export const HOME_TENANT = DEFAULT_TENANT;

export const RESIDENCY_OPTIONS = ['Mumbai (ap-south-1)', 'UAE (me-central-1)', 'Frankfurt (eu-central-1)', 'Singapore (ap-southeast-1)'];
export const CURRENCY_OPTIONS = ['INR', 'AED', 'SAR', 'QAR', 'OMR', 'KWD', 'USD', 'EUR'];

export const statusTone = (live: boolean, done: number): Tone => (live ? 'green' : done >= ONBOARDING.length ? 'cyan' : 'orange');

/** Time zone and calendar by country, for tenants added during the demo. */
const COUNTRY_PROFILE: Record<CountryCode, Pick<TenantProfile, 'timeZone' | 'tzLabel' | 'locale' | 'world'> & { names: string[]; ccy: string }> = {
  SA: { names: ['saudi arabia', 'ksa'], ccy: 'SAR', timeZone: 'Asia/Riyadh', tzLabel: 'AST', locale: 'en-GB', world: 'gcc' },
  AE: { names: ['united arab emirates', 'uae'], ccy: 'AED', timeZone: 'Asia/Dubai', tzLabel: 'GST', locale: 'en-GB', world: 'gcc' },
  QA: { names: ['qatar'], ccy: 'QAR', timeZone: 'Asia/Qatar', tzLabel: 'AST', locale: 'en-GB', world: 'gcc' },
  OM: { names: ['oman'], ccy: 'OMR', timeZone: 'Asia/Muscat', tzLabel: 'GST', locale: 'en-GB', world: 'gcc' },
  KW: { names: ['kuwait'], ccy: 'KWD', timeZone: 'Asia/Kuwait', tzLabel: 'AST', locale: 'en-GB', world: 'gcc' },
  IN: { names: ['india'], ccy: 'INR', timeZone: 'Asia/Kolkata', tzLabel: 'IST', locale: 'en-IN', world: 'legacy-in' },
};

const CODES = Object.keys(COUNTRY_PROFILE) as CountryCode[];

/** A tenant name that ends a sentence, without doubling the stop of "Co." or "W.L.L.". */
export const nameStop = (name: string) => (name.endsWith('.') ? name : `${name}.`);

/** Two capital initials, e.g. "Najd Arcline Contracting Co." → NA. */
export const monogramOf = (name: string) =>
  name.split(' ').filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join('') || name.slice(0, 2).toUpperCase();

/** Fills the profile of a tenant added during the demo. It stays onboarding, so it is never switchable. */
export function completeTenant(t: Tenant): ProfiledTenant {
  const country = t.country.trim().toLowerCase();
  const code = CODES.find((c) => COUNTRY_PROFILE[c].names.includes(country)) ?? CODES.find((c) => COUNTRY_PROFILE[c].ccy === t.currency) ?? 'AE';
  const p = COUNTRY_PROFILE[code];
  return {
    ...t,
    world: p.world, switchable: false, countryCode: code, hqCity: t.hqCity ?? t.country, timeZone: p.timeZone, tzLabel: p.tzLabel, locale: p.locale,
    monogram: t.monogram ?? monogramOf(t.name), accent: 'ink', headTitle: t.headTitle ?? 'Head of Tendering', sectors: t.sectors ?? [],
  };
}

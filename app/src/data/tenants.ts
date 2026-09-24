import type { Tone } from './types';

/**
 * Tenants are the companies (or JVs) that each run their own bid office on the
 * platform. Data never crosses between them: sources, users, rate libraries,
 * past bids and templates all belong to one tenant. The demo register belongs
 * to Genesis EPC India Ltd; the Gulf JV is part-way through onboarding.
 */

export interface TenantSource { name: string; mode: string }

export interface Tenant {
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

export const TENANTS: Tenant[] = [
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
    doneSteps: ONBOARDING.map((s) => s.key),
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
  },
];

export const HOME_TENANT = TENANTS[0].key;

export const RESIDENCY_OPTIONS = ['Mumbai (ap-south-1)', 'UAE (me-central-1)', 'Frankfurt (eu-central-1)', 'Singapore (ap-southeast-1)'];
export const CURRENCY_OPTIONS = ['INR', 'AED', 'SAR', 'USD', 'EUR'];

export const statusTone = (live: boolean, done: number): Tone => (live ? 'green' : done >= ONBOARDING.length ? 'cyan' : 'orange');

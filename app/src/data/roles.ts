import type { Role, RoleKey } from './types';

export const ROLES: Role[] = [
  { key: 'exec', name: 'A. Menon', initials: 'AM', title: 'Executive Sponsor / Bid Committee', short: 'Bid Committee / Sponsor', view: 'Portfolio Dashboard', scope: 'Gate owner at DG2', blurb: 'Pipeline health, capital at risk and the decisions waiting on you. Read-only except at DG2.' },
  { key: 'bid', name: 'R. Iyer', initials: 'RI', title: 'Bid Manager', short: 'Bid Manager', view: 'Bid Cockpit', scope: 'Gate owner at DG1, accountable at Stage 8', blurb: 'Every live pursuit you own, what each is waiting on, and what needs your decision today.' },
  { key: 'coord', name: 'S. Nair', initials: 'SN', title: 'Tender Coordinator', short: 'Tender Coordinator', view: 'Intake & Validation Queue', scope: 'Responsible for Stage 1', blurb: 'What the Intake Agent captured overnight, and the fields it was not confident enough to accept alone.' },
  { key: 'proc', name: 'V. Kulkarni', initials: 'VK', title: 'Procurement / Estimation Lead', short: 'Procurement / Estimation', view: 'Vendor & RFQ Hub', scope: 'Accountable for Stage 2', blurb: 'Package coverage, live RFQ status and normalised quote comparison for each subcontract trade.' },
  { key: 'comm', name: 'D. Fernandes', initials: 'DF', title: 'Commercial Manager', short: 'Commercial Manager', view: 'Cost & Margin Studio', scope: 'Accountable for Stage 5', blurb: 'The cost build-up, the margin scenarios and the sensitivity behind the number you will sign.' },
  { key: 'prop', name: 'K. Bose', initials: 'KB', title: 'Proposal Manager', short: 'Proposal Manager', view: 'Proposal Workspace', scope: 'Accountable for Stage 6', blurb: 'Section status, SME tasks and simulated evaluator scoring across the submission.' },
  { key: 'comp', name: 'J. Thomas', initials: 'JT', title: 'Compliance / Legal Lead', short: 'Compliance / Legal', view: 'Compliance & Risk Console', scope: 'Accountable for Stage 7', blurb: 'Requirement-to-evidence coverage, open gaps by severity and the contractual redline position.' },
  { key: 'dir', name: 'M. Rao', initials: 'MR', title: 'Project Director', short: 'Project Director', view: 'Delivery Oversight', scope: 'Accountable for Stage 9a', blurb: 'Won projects tracked against the commitments made in the bid, with margin variance in view.' },
];

export const ROLE_KEYS = ROLES.map((r) => r.key);

export const roleOf = (k: RoleKey): Role => ROLES.find((r) => r.key === k) ?? ROLES[1];

export const isRoleKey = (v: string | undefined): v is RoleKey => !!v && (ROLE_KEYS as string[]).includes(v);

/** The order a tender is handed between roles in the guided walk-through. */
export const WALK_ORDER: RoleKey[] = ['coord', 'bid', 'proc', 'exec', 'comm', 'prop', 'comp', 'dir'];

export const WALK_STEP: Record<RoleKey, string> = {
  coord: 'Stage 1 · intake',
  bid: 'DG1 · pursue or discard',
  proc: 'Stage 2 · vendor inputs',
  exec: 'DG2 · bid / no-bid',
  comm: 'Stage 5 · cost & margin',
  prop: 'Stage 6 · proposal',
  comp: 'Stage 7 · compliance & DG3',
  dir: 'Stage 9 · delivery & learning',
};

export const TENANT = 'Genesis EPC India Ltd';
export const TENANT_BUILD = 'tenant build 2026.03';

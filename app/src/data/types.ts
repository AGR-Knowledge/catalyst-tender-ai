export type Tone = 'ink' | 'ink2' | 'ink3' | 'muted' | 'faint' | 'red' | 'orange' | 'green' | 'cyan' | 'grey';

export type RoleKey = 'exec' | 'bid' | 'coord' | 'proc' | 'comm' | 'prop' | 'comp' | 'dir';

export interface Role {
  key: RoleKey;
  name: string;
  initials: string;
  title: string;
  short: string;
  view: string;
  scope: string;
  blurb: string;
}

export interface Stage {
  n: number;
  name: string;
  short: string;
  agent: string;
  owner: string;
  control: string;
  tag: string;
  role: RoleKey;
  ai: string[];
  hu: string[];
  out: string[];
  kpi: string[];
}

export type Gate = 'DG1' | 'DG2' | 'DG3';
export type Confidence = 'high' | 'medium' | 'low';

export interface TenderDetail {
  scope: string;
  portal: string;
  bidSecurity?: string;
  rows: [string, string][];
  events: [string, string][];
  note: string;
  resourceAsk?: string;
  expectedMargin?: string;
  comparables?: string;
}

export interface Tender {
  id: string;
  name: string;
  client: string;
  sector: string;
  /** Contract value in ₹ crore. */
  value: number;
  stage: number;
  /** ISO date of the submission deadline. */
  due: string;
  /** Win probability in %, null while still at screening (fit-score applies instead). */
  win: number | null;
  band?: number;
  fit?: number;
  confidence: Confidence;
  bidManager: string;
  /** Gate the tender is currently waiting at, if any. */
  gate: Gate | null;
  status: string;
  detail?: TenderDetail;
  /** Upload id when the tender came in through the upload flow. */
  source?: string;
  /** Held at intake instead of opening DG1: the bid date has passed, or none is given. */
  held?: 'passed' | 'nodate';
}

export interface Agent {
  name: string;
  stage: string;
  state: 'Active' | 'Idle' | 'Scheduled';
  runs: number;
  eval: number | null;
  guard: string;
  remit: string;
  owner: string;
  tier: 'Economy' | 'Workhorse' | 'Frontier';
}

export interface Supplier {
  name: string;
  trade: string;
  score: number;
  projects: number;
  response: number;
  screening: 'Cleared';
  standing: 'Preferred' | 'Approved' | 'Watch';
}

export interface Artefact {
  title: string;
  kind: string;
  origin: string;
  reuses: number;
  lastUsed: string;
}

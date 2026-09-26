import type { ExtractField } from '@/data/extracted/types';
import { GCC_EXTRACTED } from '@/data/extracted/gcc';
import { HERO_DOC_KEY, HERO_EXTRACTED, HERO_FILE_NAME, HERO_ID } from '@/data/gcc/hero';
import type { IntakeDisposition, IntakeEvent, Source } from '@/data/gcc/types';
import { moneyPair, type MoneyPair } from '@/domain/money';
import { addHours, minutesBetween } from '@/domain/gcc/clock';
import type { Person } from '@/data/people';
import { lifecycle, visible } from '@/domain/gcc/lifecycle';
import type { Done } from './done';
import { eligibilityFor, fitScoresFor } from './eligibility';
import { dataOf, keyDate, tenantCcy, timeOf, weightedOf } from './common';

/**
 * Intake (spec §6.1–§6.2, plan 007a step 6.1): the timed pipeline per
 * document, the morning radar (sources, today's captures, reconciliation) and
 * upload recognition. Agent timings are simulated, from the seed's receipt
 * and logged times.
 */

/** Intake to logged, target (spec §5.4). */
export const INTAKE_TARGET_MIN = 15;

export type PipelineKey = 'received' | 'classified' | 'sensitivity' | 'language' | 'ocr' | 'fields' | 'register' | 'screened' | 'logged';

export interface PipelineStep {
  no: number;
  key: PipelineKey;
  label: string;
  state: 'done' | 'skipped' | 'waiting';
  /** Tenant-local date-time. */
  at?: string;
  time?: string;
  detail?: string;
}

export interface Pipeline {
  eventId: string;
  tenderId?: string;
  steps: PipelineStep[];
  minutes?: number;
  /** "Intake to logged 11 min". */
  loggedText?: string;
  withinTarget?: boolean;
  targetMin: number;
  /** Why the pipeline stopped early, e.g. "Documents not yet bought". */
  stopped?: string;
}

const STEPS: { key: PipelineKey; label: string; at: number }[] = [
  { key: 'received', label: 'Received', at: 0 },
  { key: 'classified', label: 'Classified', at: 0.08 },
  { key: 'sensitivity', label: 'Sensitivity checked', at: 0.12 },
  { key: 'language', label: 'Language detected', at: 0.18 },
  { key: 'ocr', label: 'OCR', at: 0.3 },
  { key: 'fields', label: 'Fields extracted', at: 0.62 },
  { key: 'register', label: 'Register check', at: 0.74 },
  { key: 'screened', label: 'Screened', at: 0.88 },
  { key: 'logged', label: 'Logged', at: 1 },
];

const LANGUAGE: Record<IntakeEvent['language'], string> = {
  EN: 'English',
  AR: 'Arabic: reading in Arabic; English fields will show the Arabic source',
  'EN+AR': 'English and Arabic (bilingual)',
};

/** The extraction record behind a docKey: the hero's, or one of the real documents. */
function recordOf(docKey: string | undefined) {
  if (!docKey) return undefined;
  return docKey === HERO_DOC_KEY ? HERO_EXTRACTED : GCC_EXTRACTED[docKey];
}

/** Fields the agent extracted, and how many it holds with low confidence. */
export function fieldCounts(docKey: string | undefined): { fields: number; low: number; pages: number } | null {
  const r = recordOf(docKey);
  if (!r) return null;
  const groups = 'groups' in r ? Object.values((r as typeof HERO_EXTRACTED).groups).flat() : [...r.summary, ...r.evaluation, ...r.submission];
  const fields: { confidence: ExtractField['confidence'] }[] = [...groups, ...r.eligibility, ...r.dates];
  return { fields: fields.length, low: fields.filter((f) => f.confidence === 'low').length, pages: r.pages };
}

const register = (tenant: string, id?: string) => (id ? dataOf(tenant).register.find((t) => t.id === id) : undefined);

export function pipelineFor(tenant: string, intakeEventId: string): Pipeline | null {
  const d = dataOf(tenant);
  const e = d.intakeToday.find((x) => x.id === intakeEventId);
  if (!e) return null;
  const t = register(tenant, e.tenderId);
  const source = d.sources.find((s) => s.id === e.sourceId);
  const needsOcr = e.language === 'AR' || source?.kind === 'scan';

  if (!e.loggedAt) {
    return {
      eventId: e.id, tenderId: e.tenderId, targetMin: INTAKE_TARGET_MIN, stopped: 'Documents not yet bought',
      steps: STEPS.map((s, i) => (i === 0
        ? { no: 1, key: s.key, label: s.label, state: 'done' as const, at: e.receivedAt, time: timeOf(e.receivedAt), detail: `${source?.name ?? e.sourceId}: notice only` }
        : { no: i + 1, key: s.key, label: s.label, state: 'waiting' as const })),
    };
  }

  const total = minutesBetween(e.receivedAt, e.loggedAt);
  const at = (f: number) => addHours(e.receivedAt, Math.round(f * total) / 60);
  const counts = fieldCounts(t?.docKey);
  const live = t ? fitScoresFor(tenant, t.id, {}) : null;
  const elig = t ? eligibilityFor(tenant, t.id, {}) : null;
  const detail: Record<PipelineKey, string | undefined> = {
    received: source?.name ?? e.sourceId,
    classified: e.docType,
    sensitivity: e.disposition === 'restricted' || t?.restricted ? 'Restricted: routed to the restricted lane' : 'Standard',
    language: LANGUAGE[e.language],
    ocr: needsOcr ? `${counts ? `${counts.pages} pages` : 'Scanned pages'} read` : 'Not needed: the document has a text layer',
    fields: counts ? `${counts.fields} fields; ${counts.low} below the confidence threshold` : undefined,
    register: e.disposition === 'addendum' ? `Addendum, linked to ${e.tenderId}` : e.disposition === 'duplicate' ? `Duplicate, merged into ${e.tenderId}` : 'New tender',
    screened: live ? `Fit ${Math.round(weightedOf(d, live.scores))} for this company${elig ? `; ${elig.text}` : ''}` : undefined,
    logged: e.tenderId ? `${e.disposition === 'addendum' ? 'Linked to' : 'TID assigned:'} ${e.tenderId}` : 'Logged',
  };
  const steps: PipelineStep[] = STEPS.map((s, i) => {
    const skipped = s.key === 'ocr' && !needsOcr;
    return {
      no: i + 1, key: s.key, label: s.label, state: skipped ? 'skipped' : 'done',
      ...(skipped ? {} : { at: at(s.at), time: timeOf(at(s.at)) }),
      ...(detail[s.key] ? { detail: detail[s.key] } : {}),
    };
  });
  return {
    eventId: e.id, tenderId: e.tenderId, steps, minutes: total, targetMin: INTAKE_TARGET_MIN,
    loggedText: `Intake to logged ${total} min`, withinTarget: total <= INTAKE_TARGET_MIN,
  };
}

// ---------------------------------------------------------------------------
// Radar (step 6.1.2)

export const ASSISTED_TEXT = 'Assisted: an operator completes the portal login. The platform never solves CAPTCHAs.';

/** Sources behind a portal login. A mailbox, the scanned drop and manual upload have no portal to log in to. */
const PORTAL_KINDS = new Set<Source['kind']>(['portal', 'client-portal']);

const MODE_LABEL: Record<Source['mode'], string> = { api: 'API', scheduled: 'Scheduled', assisted: 'Assisted' };
const STATE_LABEL: Record<Source['state'], string> = { healthy: 'Healthy', degraded: 'Degraded', 'credentials-expiring': 'Credentials expiring', down: 'Down' };

export const DISPOSITION_LABEL: Record<IntakeDisposition, (tid?: string) => string> = {
  shortlisted: () => 'Auto-shortlisted → DG1 queue',
  'low-fit': () => 'Low fit, flagged',
  duplicate: (tid) => `Duplicate, merged into ${tid}`,
  addendum: (tid) => `Addendum, linked to ${tid}`,
  restricted: () => 'Restricted lane',
  'needs-validation': () => 'Needs validation',
  'notice-only': () => 'Notice only: documents to buy',
};

const isNew = (e: IntakeEvent) => e.disposition !== 'addendum' && e.disposition !== 'duplicate';

export interface Connector {
  id: string; name: string; kind: Source['kind']; mode: Source['mode']; modeLabel: string; state: Source['state']; stateLabel: string;
  note?: string; lastPoll: string; newToday: number; loginNeeded: boolean; assistedText?: string;
}

export interface Capture {
  eventId: string; tenderId?: string; time: string; sourceName: string; ref: string; title: string; authority: string; country: string;
  value?: MoneyPair; valueBasis?: 'published' | 'estimate' | 'not-stated'; due?: string; language: IntakeEvent['language']; docType: IntakeEvent['docType'];
  fit?: number; disposition: IntakeDisposition; dispositionLabel: string; restricted: boolean; masked: boolean;
}

export interface Radar {
  connectors: Connector[];
  healthy: number;
  /** "8 of 9 healthy". */
  healthText: string;
  captures: Capture[];
  newToday: number;
  /** "Last reconciliation 06:00. 0 missed across 9 sources." */
  reconciliation: string;
  restrictedCount: number;
}

/**
 * What the Tender Coordinator reads first thing: did anything come in, is
 * anything broken, did we miss anything? With a `viewer`, tenders they may not
 * open are left out of the counts and the rows, exactly as the dashboards'
 * `capturesIn(…, viewer)` leaves them out (plan 021 4.10); without one, a
 * restricted capture is shown masked unless `viewerCleared`.
 */
export function radarFor(tenant: string, viewerCleared: boolean, done: Done = {}, viewer?: Person): Radar {
  const d = dataOf(tenant);
  const ccy = tenantCcy(tenant);
  const hidden = (e: IntakeEvent) => {
    const l = viewer && e.tenderId ? lifecycle(tenant, e.tenderId, done) : undefined;
    return !!l && !visible(tenant, l, viewer!);
  };
  const today = d.intakeToday.filter((e) => !hidden(e));
  const connectors: Connector[] = d.sources.map((s) => {
    const portal = PORTAL_KINDS.has(s.kind);
    return {
      id: s.id, name: s.name, kind: s.kind, mode: s.mode, modeLabel: MODE_LABEL[s.mode], state: s.state, stateLabel: STATE_LABEL[s.state],
      ...(s.note ? { note: s.note } : {}), lastPoll: s.lastPoll,
      newToday: today.filter((e) => e.sourceId === s.id && isNew(e)).length,
      loginNeeded: portal && s.mode !== 'api',
      ...(portal && s.mode === 'assisted' ? { assistedText: ASSISTED_TEXT } : {}),
    };
  });
  const captures: Capture[] = [...today].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt)).map((e) => {
    const t = register(tenant, e.tenderId);
    const restricted = e.disposition === 'restricted' || !!t?.restricted;
    const masked = restricted && !viewerCleared;
    const sub = t ? keyDate(t, 'submission') : undefined;
    const live = t && !masked ? fitScoresFor(tenant, t.id, done) : null;
    const hasValue = t && t.value.basis !== 'not-stated' && t.value.amount > 0;
    return {
      eventId: e.id, ...(e.tenderId ? { tenderId: e.tenderId } : {}), time: timeOf(e.receivedAt) ?? '',
      sourceName: d.sources.find((s) => s.id === e.sourceId)?.name ?? e.sourceId,
      ref: masked ? 'Restricted' : e.ref,
      title: masked ? 'Restricted tender' : restricted && t ? t.title : e.title,
      authority: masked ? 'Restricted' : t?.issuer ?? '',
      country: t?.country ?? '',
      ...(hasValue && !masked ? { value: moneyPair(t.value.amount, t.value.ccy, ccy), valueBasis: t.value.basis } : {}),
      ...(sub && !masked ? { due: sub.date } : {}),
      language: e.language, docType: e.docType,
      ...(live ? { fit: Math.round(weightedOf(d, live.scores)) } : {}),
      disposition: e.disposition, dispositionLabel: DISPOSITION_LABEL[e.disposition](e.tenderId), restricted, masked,
    };
  });
  const healthy = connectors.filter((c) => c.state === 'healthy').length;
  return {
    connectors, healthy, healthText: `${healthy} of ${connectors.length} healthy`,
    captures, newToday: today.filter(isNew).length,
    reconciliation: `Last reconciliation ${timeOf(d.reconciliation.at)}. ${d.reconciliation.missed} missed across ${d.reconciliation.sources} sources.`,
    restrictedCount: captures.filter((c) => c.restricted).length,
  };
}

// ---------------------------------------------------------------------------
// Upload recognition (step 6.1.3)

/**
 * The extraction record an uploaded file matches, by file name (either the
 * original or the ASCII name). The hero is T-2026-118 in every GCC tenant; a
 * real document resolves to the tenant's register row when `tenant` is given.
 */
export function recogniseUpload(fileName: string, tenant?: string): { docKey: string; tenderId?: string } | null {
  const name = (fileName.split(/[\\/]/).pop() ?? fileName).trim().toLowerCase();
  const hit = (names: string[]) => names.some((n) => n.toLowerCase() === name);
  if (name === HERO_FILE_NAME.toLowerCase() || hit(HERO_EXTRACTED.fileNames)) return { docKey: HERO_DOC_KEY, tenderId: HERO_ID };
  for (const [docKey, rec] of Object.entries(GCC_EXTRACTED)) {
    if (!hit(rec.fileNames)) continue;
    const tenderId = tenant ? dataOf(tenant).register.find((t) => t.docKey === docKey)?.id : undefined;
    return { docKey, ...(tenderId ? { tenderId } : {}) };
  }
  return null;
}

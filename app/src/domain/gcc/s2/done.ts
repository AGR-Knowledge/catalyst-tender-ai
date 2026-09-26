import type { Ccy } from '@/data/gcc/fx';
import { DEMO_NOW } from '@/domain/gcc/clock';

/**
 * Stage 2 demo state (plan 008a, "Done-key conventions"). Values are JSON;
 * every value carries `at` and `byId`. This module reads them; the `*Write`
 * functions in the other modules build them, and 008b's screens `mark()` them.
 * Reset demo clears them with the rest of the tenant's `done`.
 */

export type Done = Record<string, string>;

/** The demo clock every Stage 2 rule reads. */
export const NOW = DEMO_NOW;

/** A JSON value from `done`, or null when it is missing or not JSON. */
export function readDone<T>(done: Done, key: string): T | null {
  const raw = done[key];
  if (raw === undefined) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Keys that start with `prefix`, sorted so readers are deterministic. */
export const keysWithPrefix = (done: Done, prefix: string) => Object.keys(done).filter((k) => k.startsWith(prefix)).sort();

/** What a write asks the store to record in the tenant's audit log (the store's `AuditEvent` without id and time). */
export interface AuditDraft { actorId: string; action: string; target?: string; detail?: string }

/** A write: the `done` key, its JSON value (as `mark()` takes it), the typed record and the audit entry. */
export interface S2Write<T> { key: string; value: string; record: T; audit: AuditDraft }

export type S2WriteResult<T> = S2Write<T> | { error: string };

export const isWriteError = <T>(r: S2WriteResult<T>): r is { error: string } => 'error' in r;

export const write = <T>(key: string, record: T, audit: AuditDraft): S2Write<T> => ({ key, value: JSON.stringify(record), record, audit });

// ---------------------------------------------------------------------------
// Keys

export const K = {
  /** Plan 007a's DG1 decision. Stage 2 reads it through `dg1RecordFor`, never directly. */
  dg1: (tid: string) => `dg1:${tid}`,
  pkg: (tid: string) => `pkg:${tid}`,
  shortlist: (tid: string, pkgId: string) => `shortlist:${tid}:${pkgId}`,
  /** The first send for a package; later sends (reserves) add `:2`, `:3` … */
  rfqSent: (tid: string, pkgId: string, batch = 1) => (batch === 1 ? `rfq-sent:${tid}:${pkgId}` : `rfq-sent:${tid}:${pkgId}:${batch}`),
  rfqSentPrefix: (tid: string) => `rfq-sent:${tid}:`,
  lev: (quoteId: string, adjKey: string) => `lev:${quoteId}:${adjKey}`,
  gap: (tid: string, pkgId: string) => `gap:${tid}:${pkgId}`,
  mix: (tid: string) => `mix:${tid}`,
  clar: (clarId: string) => `clar:${clarId}`,
  sq: (rfqId: string) => `sq:${rfqId}`,
  nudged: (target: string) => `nudged:${target}`,
  /** Plan 009a's keys, read for presence only. */
  inputReq: (tid: string, inputKey: string) => `input-req:${tid}:${inputKey}`,
  inputSub: (tid: string, inputKey: string) => `input-sub:${tid}:${inputKey}`,
};

// ---------------------------------------------------------------------------
// Values

interface Stamp { at: string; byId: string }

/** Merge packages into the first one of the list. */
export interface PackagingMerge { into: string; from: string[] }
/** Split a hero package by its BOQ items. */
export interface PackagingSplit { from: string; parts: { id: string; title: string; lineItems: string[] }[] }

export interface PackagingValue extends Stamp { approved: true; splits?: PackagingSplit[]; merges?: PackagingMerge[] }

export interface ShortlistOverride { supplierId: string; action: 'add' | 'remove'; reason: string }
export interface ShortlistValue extends Stamp { supplierIds: string[]; overrides: ShortlistOverride[] }

export interface RfqSentValue extends Stamp { supplierIds: string[] }

export interface LevValue extends Stamp { state: 'confirmed' | 'rejected'; amount?: number; note?: string }

export interface GapValue extends Stamp { reason: string }

export type MixOption = 'lowest-cost' | 'balanced' | 'lowest-risk';
export interface MixOverride { pkgId: string; supplierId: string; reason: string }
export interface MixValue extends Stamp { option: MixOption; overrides: MixOverride[] }

export interface ClarValue extends Stamp { answer: string }

export interface SupplierQuoteValue extends Stamp {
  level: 'line' | 'package';
  amount: number;
  ccy: Ccy;
  validityDays: number;
  leadTimeWeeks: number;
  deviations: string[];
  exclusions: string[];
  fileName: string;
}

/** Plan 009a's request value: only the fields Stage 2 reads. */
export interface InputReqRead { toId?: string; due?: string }

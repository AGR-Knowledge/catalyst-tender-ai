import { PACK_VERSIONS, RERUN_EFFECTS, type PackSectionId, type PackSnapshot, type RerunEffect } from '@/data/gcc/s3';
import { nowIso, readDone, stampText, type Done, type WriteError, type WriteResult } from './done';

/**
 * Pack versions (spec §9.10): the seeded versions, plus the one a re-run
 * creates (`pack-rerun:`), plus issue to the committee (`pack-issue:`). A
 * re-run keeps every earlier version for comparison. The DG2 clock runs from
 * the first issue, whichever version is issued later.
 */

export interface PackRerunValue { version: number; at: string; byId: string; earlier?: { version: number; at: string; byId: string }[] }
export interface PackIssueValue { version: number; at: string; byId: string; firstAt: string; reason?: string; outstanding?: number }

export interface PackVersionVM {
  version: number;
  generatedAt: string;
  issuedAt?: string;
  /** Frozen at the first generation; re-runs change sections through `effects`. */
  snapshot: PackSnapshot;
  /** Every authored re-run effect applied up to this version. */
  effects: RerunEffect[];
  rerunById?: string;
}

export interface PackVersions {
  tenderId: string;
  versions: PackVersionVM[];
  /** The latest version generated. */
  current: PackVersionVM | null;
  /** The latest version issued to the committee. */
  issued: PackVersionVM | null;
  /** DG2 clock start. */
  firstIssuedAt?: string;
  issueNote?: { reason?: string; outstanding?: number; byId: string };
}

const effectsUpTo = (tenant: string, tenderId: string, version: number) =>
  RERUN_EFFECTS.filter((e) => e.tenant === tenant && e.tenderId === tenderId && e.fromVersion < version);

export function packVersionsFor(tenant: string, tenderId: string, done: Done): PackVersions {
  const seeded = PACK_VERSIONS.filter((p) => p.tenant === tenant && p.tenderId === tenderId).sort((a, b) => a.version - b.version);
  if (!seeded.length) return { tenderId, versions: [], current: null, issued: null };
  const base = seeded[seeded.length - 1];

  const rerun = readDone<PackRerunValue>(done, `pack-rerun:${tenderId}`);
  const reruns = rerun ? [...(rerun.earlier ?? []), { version: rerun.version, at: rerun.at, byId: rerun.byId }] : [];
  const issue = readDone<PackIssueValue>(done, `pack-issue:${tenderId}`);

  const versions: PackVersionVM[] = [
    ...seeded.map((p) => ({ version: p.version, generatedAt: p.generatedAt, ...(p.issuedAt ? { issuedAt: p.issuedAt } : {}), snapshot: p.snapshot, effects: effectsUpTo(tenant, tenderId, p.version) })),
    ...reruns.filter((r) => r.version > base.version).map((r) => ({
      version: r.version, generatedAt: r.at, snapshot: base.snapshot, effects: effectsUpTo(tenant, tenderId, r.version), rerunById: r.byId,
    })),
  ].map((v) => (issue && issue.version === v.version ? { ...v, issuedAt: issue.at } : v));

  const current = versions[versions.length - 1];
  const issued = [...versions].reverse().find((v) => v.issuedAt) ?? null;
  const seededFirst = seeded.find((p) => p.issuedAt)?.issuedAt;
  const firstIssuedAt = seededFirst ?? issue?.firstAt;
  return {
    tenderId, versions, current, issued,
    ...(firstIssuedAt ? { firstIssuedAt } : {}),
    ...(issue && (issue.reason || issue.outstanding) ? { issueNote: { reason: issue.reason, outstanding: issue.outstanding, byId: issue.byId } } : {}),
  };
}

export const SECTION_TITLES: Record<PackSectionId, string> = {
  '9.1': 'Win probability', '9.2': 'Competitors', '9.3': 'Eligibility and JV', '9.4': 'Resource and capacity',
  '9.5': 'Financial exposure', '9.6': 'Risk profile', '9.7': 'Expected margin range', '9.8': 'Recommendation',
  '9.9': 'Inputs status', '9.10': 'Freshness',
};

export interface VersionCompare {
  from: number;
  to: number;
  sections: { section: PackSectionId; title: string; changed: boolean; change: string }[];
  changed: PackSectionId[];
}

const marginRangeText = ([lo, hi]: [number, number]) => `${lo.toFixed(1)}–${hi.toFixed(1)}%`;

/** What changed between two versions, from the authored effects. Margin figures are masked unless the viewer may see them. */
export function compareVersions(tenant: string, tenderId: string, from: number, to: number, viewer: { canSeeMargin: boolean } = { canSeeMargin: true }): VersionCompare {
  const effects = RERUN_EFFECTS.filter((e) => e.tenant === tenant && e.tenderId === tenderId && e.fromVersion >= from && e.fromVersion < to);
  const sections = effects.map((e) => {
    let change = e.change;
    if (e.section === '9.7' && e.patch?.margin) {
      change = viewer.canSeeMargin ? `Margin range ${marginRangeText(e.patch.margin)}: ${e.change[0].toLowerCase()}${e.change.slice(1)}` : 'Margin range changed (masked for your role)';
    }
    return { section: e.section, title: SECTION_TITLES[e.section], changed: e.changed, change };
  });
  return { from, to, sections, changed: sections.filter((s) => s.changed).map((s) => s.section) };
}

// ---------------------------------------------------------------------------

/** Re-run the pack: the next version, keeping every earlier one (spec §9.10). */
export function packRerunWrite(tenant: string, tenderId: string, done: Done, byId: string): WriteResult | WriteError {
  const pv = packVersionsFor(tenant, tenderId, done);
  if (!pv.current) return { error: 'This tender has no pack to re-run yet' };
  const prev = readDone<PackRerunValue>(done, `pack-rerun:${tenderId}`);
  const version = pv.current.version + 1;
  const value: PackRerunValue = {
    version, at: nowIso(), byId,
    ...(prev ? { earlier: [...(prev.earlier ?? []), { version: prev.version, at: prev.at, byId: prev.byId }] } : {}),
  };
  return {
    key: `pack-rerun:${tenderId}`,
    value: JSON.stringify(value),
    audit: { actorId: byId, action: 'Pack re-run', target: tenderId, detail: `v${version} generated ${stampText(value.at)}; v${pv.current.version} kept for comparison` },
  };
}

export { marginRangeText };

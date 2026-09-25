import { gccData, isGccTenantKey } from '@/data/gcc';
import type { PackSectionId } from '@/data/gcc/s3';
import { addendaFor, eligibilityFor } from '@/domain/gcc/s1';
import { keysWithPrefix, readDone, stampText, type Done } from './done';
import { packVersionsFor, type PackVersions } from './versions';

/**
 * Pack freshness (spec §9.10, DEC-8). The current version is stale when an
 * addendum arrived after it was generated, or when a credential its
 * eligibility relied on was renewed after it was generated. A re-run clears
 * staleness; the earlier versions stay for comparison.
 */

export interface StaleCause { kind: 'addendum' | 'credential'; at: string; text: string; affected: PackSectionId[]; packages: string[] }

export interface Staleness {
  since: string;
  reason: string;
  /** Pack sections the changes touch. */
  affected: PackSectionId[];
  /** Stage 2 packages to re-quote, "P-03 Filtration". */
  packages: string[];
  causes: StaleCause[];
}

export interface FreshnessVM {
  tenderId: string;
  version: number;
  generatedAt: string;
  issuedAt?: string;
  firstIssuedAt?: string;
  /** "Issued with 2 inputs outstanding", when it was. */
  issueNote?: string;
  stale: Staleness | null;
  text: string;
  versions: PackVersions['versions'];
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const uniq = <T,>(xs: T[]) => [...new Set(xs)];

interface RenewedValue { validTo: string; at: string; byId: string }

/** Credentials the eligibility behind this pack used: the live check's evidence, else the snapshot's list. */
function credentialsUsed(tenant: string, tenderId: string, done: Done, snapshotIds: string[]): string[] {
  const t = gccData(tenant).register.find((x) => x.id === tenderId);
  if (t?.requirements?.length) {
    const r = eligibilityFor(tenant, tenderId, done);
    if (r) return uniq(r.lines.flatMap((l) => l.evidence.filter((e) => e.kind === 'credential').map((e) => e.id)));
  }
  return snapshotIds;
}

export function freshnessFor(tenant: string, tenderId: string, done: Done): FreshnessVM | null {
  if (!isGccTenantKey(tenant)) return null;
  const pv = packVersionsFor(tenant, tenderId, done);
  const cur = pv.current;
  if (!cur) return null;
  const gen = cur.generatedAt;
  const causes: StaleCause[] = [];

  for (const a of addendaFor(tenant, tenderId).filter((x) => x.receivedAt > gen)) {
    const boq = a.changes.filter((c) => c.kind === 'boq');
    const clauses = a.changes.filter((c) => c.kind === 'clause');
    const dates = a.changes.filter((c) => c.kind === 'date');
    const packages = a.requote?.length
      ? a.requote.map((r) => `${r.packageId} ${r.title}`)
      : uniq(boq.flatMap((c) => (c.kind === 'boq' && c.packageId ? [c.packageId] : [])));
    const what = packages.length
      ? `changes ${plural(packages.length, 'package')} (${packages.join(', ')})`
      : clauses.length ? `changes ${plural(clauses.length, 'clause')}`
      : dates.length ? `changes ${plural(dates.length, 'key date')}`
      : 'changes the tender documents';
    const affected: PackSectionId[] = [
      ...(boq.length ? (['9.7'] as const) : []),
      ...(clauses.length ? (['9.6'] as const) : []),
      ...(dates.length ? (['9.4', '9.5'] as const) : []),
    ];
    causes.push({ kind: 'addendum', at: a.receivedAt, text: `Addendum ${a.no} received ${stampText(a.receivedAt)} ${what}`, affected, packages });
  }

  const used = new Set(credentialsUsed(tenant, tenderId, done, cur.snapshot.eligibility?.credentialIds ?? []));
  const vault = gccData(tenant).credentials;
  for (const key of keysWithPrefix(done, 'renewed:')) {
    const id = key.slice('renewed:'.length);
    const v = readDone<RenewedValue>(done, key);
    if (!v || !used.has(id) || !(v.at > gen)) continue;
    const label = vault.find((c) => c.id === id)?.label ?? id;
    causes.push({ kind: 'credential', at: v.at, text: `${label} renewed ${stampText(v.at)}: eligibility to re-check`, affected: ['9.3'], packages: [] });
  }

  causes.sort((x, y) => x.at.localeCompare(y.at));
  const stale: Staleness | null = causes.length ? {
    since: causes[0].at,
    reason: causes.map((c) => c.text).join('; '),
    affected: uniq(causes.flatMap((c) => c.affected)),
    packages: uniq(causes.flatMap((c) => c.packages)),
    causes,
  } : null;

  const prev = pv.versions.filter((v) => v.version < cur.version);
  const head = cur.version === 1 || !prev.length
    ? `Pack generated ${stampText(gen)}.`
    : `Pack v${cur.version} generated ${stampText(gen)} on a re-run; ${prev.map((v) => `v${v.version} (${stampText(v.generatedAt)})`).join(', ')} kept for comparison.`;
  const issueNote = pv.issueNote?.outstanding ? `Issued with ${plural(pv.issueNote.outstanding, 'input')} outstanding` : undefined;

  return {
    tenderId,
    version: cur.version,
    generatedAt: gen,
    ...(cur.issuedAt ? { issuedAt: cur.issuedAt } : {}),
    ...(pv.firstIssuedAt ? { firstIssuedAt: pv.firstIssuedAt } : {}),
    ...(issueNote ? { issueNote } : {}),
    stale,
    text: stale ? `${head} Stale: ${stale.reason}.` : head,
    versions: pv.versions,
  };
}

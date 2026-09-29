import { can, holdersOf, type Capability } from '@/data/access';
import { personById, type Person } from '@/data/people';
import { TENANTS } from '@/data/tenants';
import type { GccTender, Source } from '@/data/gcc/types';
import type { Lifecycle } from '@/data/gcc/lifecycle';
import { dateText, DEMO_TODAY } from '@/domain/calendar';
import { documentFor, type TenderDocument } from '@/domain/gcc/documents';
import { tenderCtx } from '@/domain/gcc/lifecycle';
import { dataOf, tenderOf } from '@/domain/gcc/s1/common';
import type { Done } from '@/domain/gcc/s1/done';
import { brandingOf } from '@/domain/gcc/admin/branding';
import { refPrefix } from './names';
import type { FileSourceVM, LibraryFileVM } from './types';

/**
 * What every folder builder reads (plan 030 Phase 2): the tender's lifecycle
 * (merged with the demo state, so a gate recorded in a screen shows here), its
 * register row and held document when it has them, and the viewer's checks,
 * which all go through `can()` with the tender's context.
 */

export interface LibCtx {
  tenant: string;
  viewer: Person;
  done: Done;
  l: Lifecycle;
  /** The register row; absent for a tender that exists only as a lifecycle. */
  t?: GccTender;
  doc: TenderDocument | null;
  /** The file-name prefix: the employer's reference, file-safe. */
  prefix: string;
  /** The employer's reference as printed. */
  ref: string | null;
  issuer: string;
  /** Our company, as letters address it. */
  company: string;
  can(cap: Capability): boolean;
  holders(cap: Capability): string;
  source(id: string): Source | undefined;
}

export function libCtx(tenant: string, viewer: Person, done: Done, l: Lifecycle): LibCtx {
  const t = tenderOf(tenant, l.tenderId);
  const doc = t ? documentFor(tenant, l.tenderId) : null;
  const events = dataOf(tenant).intakeToday.filter((e) => e.tenderId === l.tenderId && e.docType !== 'Addendum');
  const ref = doc?.record.refNo ?? (l.source.ref && l.source.ref !== 'Restricted' ? l.source.ref : null) ?? events[0]?.ref ?? null;
  const issuer = t?.issuer ?? l.issuer;
  const profile = TENANTS.find((x) => x.key === tenant);
  const cctx = tenderCtx(tenant, l);
  return {
    tenant, viewer, done, l, t, doc, ref, issuer,
    prefix: refPrefix(ref, issuer, l.tenderId),
    company: brandingOf(done)?.displayName ?? profile?.name ?? tenant,
    can: (cap) => can(viewer, cap, cctx).ok,
    holders: (cap) => holdersOf(cap),
    source: (id) => dataOf(tenant).sources.find((s) => s.id === id),
  };
}

export const nameOf = (id: string | null | undefined): string | null => (id ? personById(id)?.name ?? id : null);

/** How a source reached us, for the file's Source column. */
export function sourceVM(c: LibCtx, sourceId: string, detail?: string): FileSourceVM {
  const s = c.source(sourceId);
  const label = s?.name ?? sourceId;
  switch (s?.kind) {
    case 'mailbox': return { channel: 'email', label: `Email to ${label}` };
    case 'scan': return { channel: 'scan', label };
    case 'manual': return { channel: 'upload', label: detail ?? label };
    default: return { channel: 'portal', label };
  }
}

/** "Sun 8 Mar 2026" and, with a time, ", 07:15". */
export function docDate(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const d = dateText(iso.slice(0, 10));
  return iso.length > 10 ? `${d}, ${iso.slice(11, 16)}` : d;
}

export const DEMO_YEAR = DEMO_TODAY.slice(0, 4);

/** A file with the fields every builder repeats. The tree sets its folder path. */
export function fileOf(folderId: string, key: string, f: Omit<LibraryFileVM, 'id' | 'folderId' | 'path' | 'tags'> & { tags?: string[] }): LibraryFileVM {
  return { ...f, tags: f.tags ?? [], id: `${folderId}/${key}`, folderId, path: [] };
}

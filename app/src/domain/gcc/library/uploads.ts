import { json, readDone, type Done } from '@/domain/gcc/s1/done';

/**
 * Files people add to a tender's library in the demo (plan 030 Phase 4). The
 * details are demo state, kept in `done` so a reload keeps them and Reset demo
 * clears them; the content stays only in this session's memory, as an object
 * URL. The same name in the same folder is a new version, not a second row.
 *
 * Key:   `lib-file:{tenderId}:{folderId}:{file name, lower case}`.
 * Value: JSON `LibFileValue`.
 */

export const LIB_PREFIX = 'lib-file:';

export interface LibFileStamp { size: number; type: string; at: string; byId: string }

export interface LibFileValue extends LibFileStamp {
  name: string;
  /** 1 for the first file of this name here; 2 once it was added again. */
  version: number;
  /** Earlier versions, oldest first. */
  earlier?: LibFileStamp[];
}

export interface LibFileEntry extends LibFileValue { key: string; tenderId: string; folderId: string }

export const libFileKey = (tenderId: string, folderId: string, name: string) => `${LIB_PREFIX}${tenderId}:${folderId}:${name.trim().toLowerCase()}`;

/** Every file added to one tender, oldest first. */
export function libFilesOf(done: Done, tenderId: string): LibFileEntry[] {
  const head = `${LIB_PREFIX}${tenderId}:`;
  return Object.keys(done)
    .filter((k) => k.startsWith(head))
    .flatMap((key) => {
      const v = readDone<LibFileValue>(done, key);
      if (!v?.name) return [];
      const rest = key.slice(head.length);
      const folderId = rest.slice(0, rest.indexOf(':'));
      return [{ ...v, version: v.version ?? 1, key, tenderId, folderId }];
    })
    .sort((a, b) => (a.earlier?.[0]?.at ?? a.at).localeCompare(b.earlier?.[0]?.at ?? b.at));
}

/** Files added across the tenant, by tender: for the Tender library's counts. */
export function libFileCounts(done: Done): Map<string, number> {
  const out = new Map<string, number>();
  for (const k of Object.keys(done)) {
    if (!k.startsWith(LIB_PREFIX)) continue;
    const tid = k.slice(LIB_PREFIX.length, k.indexOf(':', LIB_PREFIX.length));
    out.set(tid, (out.get(tid) ?? 0) + 1);
  }
  return out;
}

/** The write for one added file; a second file of the same name here becomes the next version. */
export function libFileWrite(done: Done, tenderId: string, folderId: string, file: { name: string; size: number; type: string }, at: string, byId: string) {
  const key = libFileKey(tenderId, folderId, file.name);
  const before = readDone<LibFileValue>(done, key);
  const stamp: LibFileStamp = { size: file.size, type: file.type, at, byId };
  const value: LibFileValue = before
    ? { name: file.name, ...stamp, version: (before.version ?? 1) + 1, earlier: [...(before.earlier ?? []), { size: before.size, type: before.type, at: before.at, byId: before.byId }] }
    : { name: file.name, ...stamp, version: 1 };
  return { key, value: json(value), parsed: value, again: !!before };
}

// ---------------------------------------------------------------------------
// The content, for this session only.

const BLOBS = new Map<string, string>();

/** Keeps a file's content for the session, under its key; the previous version's URL is released. */
export function keepContent(key: string, blob: Blob): string {
  const old = BLOBS.get(key);
  if (old) URL.revokeObjectURL(old);
  const url = URL.createObjectURL(blob);
  BLOBS.set(key, url);
  return url;
}

/** The content's object URL, when this session added the file. */
export const contentOf = (key: string): string | null => BLOBS.get(key) ?? null;

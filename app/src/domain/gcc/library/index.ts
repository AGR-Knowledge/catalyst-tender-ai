import type { Person } from '@/data/people';
import { queriesFor } from '@/domain/gcc/lifecycle';
import type { Done } from '@/domain/gcc/s1/done';
import { libCtx, nameOf, type LibCtx } from './context';
import { documentFiles } from './documents';
import { decisionFiles } from './decision';
import { sourcingFiles } from './sourcing';
import { evidenceFiles, proposalFiles, resultFiles } from './proposal';
import { FOLDERS, filesOf, flatFolders, treeOf, type FolderDef } from './folders';
import { contentOf, libFilesOf } from './uploads';
import type { LibraryFileVM, LibraryVM } from './types';

export type { FileDated, FileTypeTag, FileSourceVM, FileViewVM, LibraryFileVM, LibraryFolderVM, LibraryVM, SourceChannel } from './types';
export { DATED_WORD } from './types';
export { FOLDERS, ADD_DEFAULT, flatFolders, filesOf } from './folders';
export { facsimileHtml, WATERMARK, type FacsimileSpec, type FacSection, type FacCell } from './facsimile';
export { csvHtml, csvItemRows, parseCsv } from './csv';
export { libFileKey, libFileWrite, libFilesOf, libFileCounts, keepContent, contentOf, LIB_PREFIX, type LibFileValue } from './uploads';
export { gateReached } from './decision';

/**
 * A tender's library (plan 030 Phase 2): every file it arrived as and every
 * file made for it, in the fixed folder tree, for one viewer and one demo
 * state. It reads only functions the demo already has, so the library's
 * addenda, RFQs, quotes and gate files match the Documents badge, the
 * Sourcing tab and the tracker. Null when the tender doesn't exist or the
 * viewer may not open it (the port's rule).
 *
 * Facsimiles are built only when a file is viewed, so a library is cheap to
 * list; `libraryFor` is memoised per demo state, viewer and tender.
 */

export interface LibraryQuery { tenant: string; viewer: Person; done: Done }

function addedFiles(c: LibCtx, folders: FolderDef[]): LibraryFileVM[] {
  const known = new Set([...FOLDERS, ...folders].map((f) => f.id));
  return libFilesOf(c.done, c.l.tenderId).filter((f) => known.has(f.folderId)).map((f) => {
    const by = nameOf(f.byId) ?? f.byId;
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    return {
      id: `${f.folderId}/added:${f.name.toLowerCase()}`, kind: 'added', folderId: f.folderId, path: [],
      name: f.name, title: f.name,
      type: ext === 'pdf' || f.type === 'application/pdf' ? 'PDF' : ext === 'csv' ? 'CSV' : f.type.startsWith('image/') ? 'Image' : 'File',
      source: { channel: 'added', label: 'Added to the library' }, receivedAt: f.at, dated: 'made', by,
      tags: [`Added by ${by}`, ...(f.version > 1 ? [`v${f.version}`] : [])],
      view: { kind: 'added', mime: f.type, bytes: f.size, at: f.at, byName: by, src: () => contentOf(f.key) },
    } satisfies LibraryFileVM;
  });
}

const MEMO = new WeakMap<Done, Map<string, LibraryVM | null>>();

export function libraryFor(q: LibraryQuery, tenderId: string): LibraryVM | null {
  let memo = MEMO.get(q.done);
  if (!memo) MEMO.set(q.done, (memo = new Map()));
  const key = `${q.tenant}:${q.viewer.id}:${tenderId}`;
  if (memo.has(key)) return memo.get(key)!;

  const l = queriesFor(q).one(tenderId);
  if (!l) { memo.set(key, null); return null; }
  const c = libCtx(q.tenant, q.viewer, q.done, l);
  const s = sourcingFiles(c);
  const files = [...documentFiles(c), ...decisionFiles(c), ...s.files, ...proposalFiles(c), ...evidenceFiles(c), ...resultFiles(c)];
  const folders = treeOf([...files, ...addedFiles(c, s.folders)], s.folders, s.masked);
  const all = flatFolders(folders);
  const vm: LibraryVM = {
    tenderId, folders, files: filesOf(folders),
    count: folders.reduce((n, f) => n + f.count, 0),
    folderCount: all.filter((f) => f.files.length || f.masked).length,
  };
  memo.set(key, vm);
  return vm;
}

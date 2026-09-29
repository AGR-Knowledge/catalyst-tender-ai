import type { LibraryFileVM, LibraryFolderVM } from './types';
import { uniqueIn } from './names';

/**
 * The folder tree (plan 030 Design): a fixed order, numbered like a real
 * document system. A folder with no file is left out, except 05 Our proposal
 * and its three parts, which always show so people can add to them.
 * Package folders under 04 are made per tender (`04/{packageId}`).
 */

export interface FolderDef { id: string; name: string; parent?: string; keep?: boolean }

export const FOLDERS: FolderDef[] = [
  { id: '01', name: '01 Tender documents' },
  { id: '01/addenda', name: 'Addenda', parent: '01' },
  { id: '01/copies', name: 'Received copies', parent: '01' },
  { id: '02', name: '02 Correspondence' },
  { id: '03', name: '03 Bid decision' },
  { id: '03/dg1', name: 'DG1', parent: '03' },
  { id: '03/dg2', name: 'DG2', parent: '03' },
  { id: '03/dg3', name: 'DG3', parent: '03' },
  { id: '04', name: '04 Suppliers and quotes' },
  { id: '05', name: '05 Our proposal', keep: true },
  { id: '05/technical', name: 'Technical', parent: '05', keep: true },
  { id: '05/commercial', name: 'Commercial', parent: '05', keep: true },
  { id: '05/forms', name: 'Forms and bonds', parent: '05', keep: true },
  { id: '06', name: '06 Company evidence' },
  { id: '07', name: '07 Result' },
];

/** Folders people may add files to: 05 and its parts, and every other folder that shows. */
export const ADD_DEFAULT = '05';

/** A masked folder: listed with its count, its files not shown. */
export interface MaskedFolder { id: string; count: number; by: string }

/**
 * Builds the tree from the files, in the fixed order. `extra` are the per-tender
 * folders (04's packages), `masked` the folders the viewer sees only as counts.
 */
export function treeOf(files: LibraryFileVM[], extra: FolderDef[], masked: MaskedFolder[]): LibraryFolderVM[] {
  const defs = [...FOLDERS, ...extra];
  const nameOf = new Map(defs.map((d) => [d.id, d.name]));
  const pathOf = (id: string): string[] => {
    const d = defs.find((x) => x.id === id);
    return d?.parent ? [...pathOf(d.parent), d.name] : [d?.name ?? id];
  };
  const maskOf = new Map(masked.map((m) => [m.id, m]));

  const build = (d: FolderDef): LibraryFolderVM | null => {
    const path = pathOf(d.id);
    const own = uniqueIn(files.filter((f) => f.folderId === d.id)).map((f) => ({ ...f, path }));
    const children = defs.filter((x) => x.parent === d.id).map(build).filter((x): x is LibraryFolderVM => !!x);
    const m = maskOf.get(d.id);
    const count = own.length + children.reduce((s, c) => s + c.count, 0) + (m?.count ?? 0);
    if (!count && !d.keep) return null;
    return {
      id: d.id, name: nameOf.get(d.id) ?? d.id, path,
      files: own, folders: children, count,
      ...(m ? { masked: { by: m.by } } : {}),
      addable: !m,
    };
  };
  return defs.filter((d) => !d.parent).map(build).filter((x): x is LibraryFolderVM => !!x);
}

/** Every folder, depth first. */
export function flatFolders(folders: LibraryFolderVM[]): LibraryFolderVM[] {
  return folders.flatMap((f) => [f, ...flatFolders(f.folders)]);
}

/** Every file in tree order. */
export const filesOf = (folders: LibraryFolderVM[]): LibraryFileVM[] => flatFolders(folders).flatMap((f) => f.files);

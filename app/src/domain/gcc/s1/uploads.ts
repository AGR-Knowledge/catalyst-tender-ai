import { recogniseUpload } from '@/domain/gcc/s1';
import { json, readDone } from '@/domain/gcc/s1/done';

/**
 * Uploads made in the demo (plan 007b step 1.3), kept in `done` so a reload
 * keeps them and Reset demo clears them. One key per file name; a second
 * upload of the same name is recorded as a duplicate, not a new document.
 *
 * Key:   `gcc-upload:{file name, lower case}`.
 * Value: JSON `UploadValue`.
 */

export const UPLOAD_PREFIX = 'gcc-upload:';

export interface UploadValue {
  file: string;
  /** The extraction record the name matched (`recogniseUpload`), when it did. */
  docKey?: string;
  /** The register row it matched in this tenant. */
  tenderId?: string;
  /** Every upload of this name, oldest first. */
  times: { at: string; byId: string }[];
}

export const uploadKey = (file: string) => `${UPLOAD_PREFIX}${file.trim().toLowerCase()}`;

export function uploadsIn(done: Record<string, string>): (UploadValue & { key: string })[] {
  return Object.keys(done)
    .filter((k) => k.startsWith(UPLOAD_PREFIX))
    .flatMap((key) => { const v = readDone<UploadValue>(done, key); return v?.times?.length ? [{ ...v, key }] : []; })
    .sort((a, b) => a.times[0].at.localeCompare(b.times[0].at));
}

/** Uploads matched to one tender. */
export const uploadsOf = (done: Record<string, string>, tenderId: string) => uploadsIn(done).filter((u) => u.tenderId === tenderId);

/** Files the agent could not place: they wait in the Coordinator's queue. */
export const unrecognisedIn = (done: Record<string, string>) => uploadsIn(done).filter((u) => !u.docKey);

/** The write for one upload, and whether this name was uploaded before. */
export function uploadWrite(done: Record<string, string>, tenant: string, file: string, at: string, byId: string) {
  const key = uploadKey(file);
  const before = readDone<UploadValue>(done, key);
  const hit = recogniseUpload(file, tenant);
  const value: UploadValue = before
    ? { ...before, times: [...before.times, { at, byId }] }
    : { file, ...(hit ? { docKey: hit.docKey } : {}), ...(hit?.tenderId ? { tenderId: hit.tenderId } : {}), times: [{ at, byId }] };
  return { key, value: json(value), duplicate: !!before, previous: before, hit };
}

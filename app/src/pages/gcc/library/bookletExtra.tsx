import { useCallback, type ReactNode } from 'react';
import type { LibraryFileVM } from '@/domain/gcc/library';
import { docOf, sourceDocOf } from '@/pages/gcc/s1/vm/docs';
import { ReadInEnglish } from '@/pages/gcc/workspace/parts/ReadInEnglish';

/**
 * Read in English (plan 012) on an Arabic booklet's row and in the viewer's
 * header, wherever a tender's library shows: the workspace's Library tab and
 * the Tender library page. Undefined for a tender whose booklet isn't Arabic,
 * so its rows keep the narrow View column.
 */
export function useBookletExtra(tenant: string, tenderId: string | null): ((f: LibraryFileVM) => ReactNode) | undefined {
  const d = tenderId ? docOf(tenant, tenderId) : null;
  const extra = useCallback((f: LibraryFileVM) => (d && f.kind === 'booklet'
    ? <ReadInEnglish record={d.record} doc={sourceDocOf(d)} /> : null), [d]);
  return d?.lang === 'ar' ? extra : undefined;
}

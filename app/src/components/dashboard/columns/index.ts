/// <reference types="vite/client" />
import { collect } from '@/domain/gcc/registry';
import type { ColumnDef } from './types';

export type { AgColDef, ColumnDef } from './types';

/** Every `*.cols.tsx` module exports `COLUMNS: ColumnDef[]`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REGISTRY = collect<ColumnDef<any>>(import.meta.glob('./*.cols.tsx', { eager: true }), 'COLUMNS', 'column', (d) => d.id);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const column = (id: string): ColumnDef<any> | undefined => REGISTRY.get(id);

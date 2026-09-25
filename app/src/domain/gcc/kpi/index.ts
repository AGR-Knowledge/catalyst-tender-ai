/// <reference types="vite/client" />
import { collect } from '../registry';
import type { KpiDef } from './types';

export type { KpiCtx, KpiDef, KpiInfo, KpiKind, KpiResult } from './types';

/** Every `*.kpi.ts` module exports `KPIS: KpiDef[]`. */
const REGISTRY = collect<KpiDef>(import.meta.glob('./*.kpi.ts', { eager: true }), 'KPIS', 'KPI', (d) => d.id);

export const kpi = (id: string): KpiDef | undefined => REGISTRY.get(id);
export const kpiIds = (): string[] => [...REGISTRY.keys()];

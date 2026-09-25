/// <reference types="vite/client" />
import { collect } from '../registry';
import type { DashboardSpec } from './types';

export type { DashboardSpec, FilterKey, SortPreset } from './types';

/** Every `*.dash.ts` module exports `DASHBOARDS: DashboardSpec[]`. */
const REGISTRY = collect<DashboardSpec>(import.meta.glob('./*.dash.ts', { eager: true }), 'DASHBOARDS', 'dashboard', (d) => d.key);

export const dashboardSpec = (key: string): DashboardSpec | undefined => REGISTRY.get(key);

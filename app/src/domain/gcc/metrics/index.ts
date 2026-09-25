/// <reference types="vite/client" />
import { collect } from '../registry';
import type { MetricDef } from './types';

export type { MetricDef, MetricResult } from './types';

/** Every `*.metric.ts` module exports `METRICS: MetricDef[]`. */
const REGISTRY = collect<MetricDef>(import.meta.glob('./*.metric.ts', { eager: true }), 'METRICS', 'metric', (d) => d.id);

export const metric = (id: string): MetricDef | undefined => REGISTRY.get(id);

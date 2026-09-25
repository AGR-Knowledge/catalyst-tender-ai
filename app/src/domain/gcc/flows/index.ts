/// <reference types="vite/client" />
import { collect } from '../registry';
import type { FlowDef } from './types';

export type { FlowDef } from './types';

/** Every `*.flow.ts` module exports `FLOWS: FlowDef[]`. */
const REGISTRY = collect<FlowDef>(import.meta.glob('./*.flow.ts', { eager: true }), 'FLOWS', 'flow', (d) => d.id);

export const flow = (id: string): FlowDef | undefined => REGISTRY.get(id);

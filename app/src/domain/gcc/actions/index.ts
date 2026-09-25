/// <reference types="vite/client" />
import { collect } from '../registry';
import type { ActionSource } from './types';

export type { ActionSource } from './types';

/** Every `*.actions.ts` module exports `ACTION_SOURCES: ActionSource[]`. */
const REGISTRY = collect<ActionSource>(import.meta.glob('./*.actions.ts', { eager: true }), 'ACTION_SOURCES', 'action source', (d) => d.id);

export const actionSource = (id: string): ActionSource | undefined => REGISTRY.get(id);

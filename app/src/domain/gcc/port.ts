/// <reference types="vite/client" />
import type { DataPort } from './viewmodels';

/**
 * The data port loader. Dashboards reach tender data only through a `DataPort`
 * (dashboards.md §12, plan 006 §1.2). Plan 017 adds `lifecycle.port.ts`; until
 * then there is no port and pages say the data is not loaded yet.
 */
const mods = import.meta.glob<{ port: DataPort }>('./*.port.ts', { eager: true });

const PORT: DataPort | null = Object.keys(mods).sort().map((k) => mods[k].port).find(Boolean) ?? null;

export function dataPort(): DataPort | null {
  return PORT;
}

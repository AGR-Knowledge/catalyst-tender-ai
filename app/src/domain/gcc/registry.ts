/// <reference types="vite/client" />

/**
 * Registries collect definitions from many files (`*.kpi.ts`, `*.flow.ts` …),
 * so parallel plans add files instead of editing a shared one (plans README,
 * architecture decision 5). Each id is defined once: a duplicate throws in
 * dev and is skipped, with a warning, in a build.
 */
export function collect<T>(
  mods: Record<string, Record<string, unknown>>,
  exportName: string,
  what: string,
  idOf: (def: T) => string,
): Map<string, T> {
  const out = new Map<string, T>();
  for (const path of Object.keys(mods).sort()) {
    const list = mods[path][exportName];
    if (!Array.isArray(list)) continue;
    for (const def of list as T[]) {
      const id = idOf(def);
      if (out.has(id)) {
        const msg = `Duplicate ${what} id "${id}" in ${path}. Each ${what} is defined once.`;
        if (import.meta.env.DEV) throw new Error(msg);
        console.warn(msg);
        continue;
      }
      out.set(id, def);
    }
  }
  return out;
}

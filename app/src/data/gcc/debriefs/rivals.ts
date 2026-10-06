import type { GccTenantKey } from '@/data/gcc';
import { COMPETITORS } from '@/data/gcc/s3/competitors';

/**
 * Who we bid against, per tenant (plan 035 step 2.1): the debrief's "Who
 * won?" picker and the archive's "Who beats us". Najd, Corniche and Batinah
 * reuse the fictional competitors of gcc-demo-data §7 and plans 022 and 023,
 * named from `COMPETITORS` so a name is typed once. Dafna (Qatar) and Qurain
 * (Kuwait) have none there, so each gets three new fictional contractors.
 *
 * The six new names were web-searched on 2026-09-30 for a real firm of that
 * name before adoption (the repo is public). Orvanta, Marlex, Corvell,
 * Dunmore and Varden were dropped because real companies use them, and
 * "Wafra" because it is a well-known Kuwaiti brand.
 */

/** `short` is how a Project Director names the rival inside a sentence. */
export interface Rival { id: string; name: string; short: string }

const named = (...xs: [id: string, short: string][]): Rival[] => xs.map(([id, short]) => {
  const c = COMPETITORS.find((x) => x.id === id);
  if (!c) throw new Error(`Rivals: no competitor ${id}`);
  return { id: c.id, name: c.name, short };
});

export const RIVALS: Record<GccTenantKey, Rival[]> = {
  najd: named(['al-masar', 'Al-Thamad'], ['hijr', 'Hijr Al-Watan'], ['sahab', 'Sahab'], ['tihama', 'Qunfudhah Hydro'], ['istria', 'Istria Aqua']),
  corniche: named(['tessaline-mep', 'Tessaline'], ['sarab-bs', 'Maswaan'], ['brevanne', 'Brevanne']),
  dafna: [
    { id: 'pellstone', name: 'Thumama Pellstone Contracting W.L.L.', short: 'Pellstone' },
    { id: 'karstel', name: 'Karstel Civil Engineering W.L.L.', short: 'Karstel' },
    { id: 'trevannon', name: 'Mesaieed Trevannon Infrastructure W.L.L.', short: 'Trevannon' },
  ],
  batinah: named(['liwa-highways', 'Dhank Highways'], ['shinas-bridges', 'Shinas Bridges'], ['mahda-infra', 'Mahda']),
  qurain: [
    { id: 'ostrel', name: 'Failaka Ostrel Contracting Co.', short: 'Ostrel' },
    { id: 'brennock', name: 'Jahra Brennock Projects Co.', short: 'Brennock' },
    { id: 'kelvane', name: 'Kelvane Gulf Engineering Co.', short: 'Kelvane' },
  ],
};

/** A rival's name in its tenant, or undefined. */
export const rivalName = (tenant: string, id: string | undefined): string | undefined =>
  (RIVALS as Record<string, Rival[]>)[tenant]?.find((r) => r.id === id)?.name;

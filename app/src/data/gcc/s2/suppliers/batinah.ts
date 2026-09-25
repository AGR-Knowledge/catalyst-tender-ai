import { suppliers, type SupplierTuple } from './build';

/**
 * Batinah's supplier master: roads and structures, 16 suppliers, all
 * fictional, with three sendable suppliers for each package of T-2026-027.
 * One has anti-bribery screening due. Gulf Process Systems Co. is the
 * Supplier Portal persona's firm in every tenant; here it supplies the
 * stormwater pumps for underpasses.
 */

const CARD = 'Capital Area Roads Directorate';

const OK = (at: string): ['clear', string, 'clear', string] => ['clear', at, 'clear', at];

const ROWS: SupplierTuple[] = [
  ['gulf-process', 'Gulf Process Systems Co.', 'SA', 'Dammam', ['pumps'], [], 12, 'approved', OK('2026-02-03'), [86, 1, 3, 1], 'high', [74, 6.5], false, 'batinah.supplier'],
  ['sohar-asphalt', 'Sohar Asphalt Mixing LLC', 'OM', 'Sohar', ['asphalt'], [CARD], 52, 'approved', OK('2025-11-10'), [89, 1, 12, 4], 'medium', [92, 3.0], true],
  ['nizwa-quarry', 'Nizwa Quarry and Asphalt LLC', 'OM', 'Nizwa', ['asphalt', 'earthworks'], [CARD], 49, 'approved', OK('2025-12-04'), [86, 2, 10, 3], 'high', [85, 4.0], true],
  ['barka-precast', 'Barka Precast Concrete LLC', 'OM', 'Barka', ['precast', 'barriers'], [CARD], 47, 'approved', OK('2026-01-15'), [88, 1, 8, 3], 'medium', [89, 3.5], true],
  ['sur-precast', 'Sur Precast Industries LLC', 'OM', 'Sur', ['precast', 'barriers'], [], 44, 'approved', OK('2025-10-20'), [84, 2, 7, 2], 'low', [83, 4.5], true],
  ['alpen-bearings', 'Alpen Bridge Bearings GmbH', 'AT', 'Innsbruck', ['bearings'], [CARD], 3, 'approved', OK('2025-11-28'), [95, 0, 5, 2], 'low', [90, 4.0], false],
  ['karst-bearings', 'Karst Bridge Bearings d.o.o.', 'SI', 'Ljubljana', ['bearings'], [], 2, 'approved', OK('2026-01-08'), [89, 1, 3, 1], 'medium', [79, 5.5], false],
  ['emilia-giunti', 'Emilia Giunti S.r.l.', 'IT', 'Modena', ['bearings'], [], 4, 'approved', OK('2026-02-06'), [90, 0, 4, 1], 'medium', [86, 4.5], false],
  ['rustaq-barriers', 'Rustaq Safety Barriers LLC', 'OM', 'Rustaq', ['barriers', 'signage', 'precast'], [CARD], 45, 'approved', OK('2025-12-17'), [87, 1, 9, 3], 'medium', [88, 3.5], true],
  ['ibri-signs', 'Ibri Road Signs LLC', 'OM', 'Ibri', ['signage'], [], 43, 'approved', ['clear', '2025-12-01', 'due', '2025-08-25'], [83, 2, 6, 1], 'low', [80, 5.0], true],
  ['samail-lighting', 'Samail Street Lighting LLC', 'OM', 'Muscat', ['lighting', 'lv'], [CARD], 41, 'approved', OK('2026-01-27'), [86, 1, 8, 2], 'medium', [87, 4.0], false],
  ['luminara', 'Luminara Poles S.A.', 'ES', 'Valencia', ['lighting'], [], 2, 'approved', OK('2025-10-30'), [91, 0, 4, 1], 'low', [84, 4.5], false],
  ['khabourah-earth', 'Khabourah Earthmoving LLC', 'OM', 'Khabourah', ['earthworks', 'asphalt'], [], 50, 'approved', OK('2025-11-19'), [82, 2, 9, 2], 'high', [81, 5.0], false],
  ['seeb-piling', 'Seeb Piling Contractors LLC', 'OM', 'Seeb', ['piling'], [CARD], 42, 'approved', OK('2026-02-12'), [88, 1, 7, 2], 'medium', [86, 4.0], false],
  ['amerat-foundations', 'Amerat Foundation Engineering LLC', 'OM', 'Muscat', ['piling'], [], 44, 'approved', OK('2025-12-21'), [86, 1, 6, 2], 'medium', [85, 4.0], false],
  ['bidbid-foundations', 'Bidbid Foundations LLC', 'OM', 'Bidbid', ['piling', 'earthworks'], [], 39, 'pending', OK('2025-12-08'), [81, 3, 5, 1], 'low', [77, 5.5], false],
];

export const BATINAH_SUPPLIERS = suppliers('batinah', ROWS);

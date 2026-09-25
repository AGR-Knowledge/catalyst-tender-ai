import { suppliers, type SupplierTuple } from './build';

/**
 * Corniche's supplier master: MEP and district cooling, 16 suppliers, all
 * fictional, with three sendable suppliers for each package of T-2026-044.
 * One has sanctions screening due. Gulf Process Systems Co. is the Supplier
 * Portal persona's firm in every tenant.
 */

const ECUC = 'Emirates Cooling Utilities Company';

const OK = (at: string): ['clear', string, 'clear', string] => ['clear', at, 'clear', at];

const ROWS: SupplierTuple[] = [
  ['gulf-process', 'Gulf Process Systems Co.', 'SA', 'Dammam', ['pumps', 'chem-dosing', 'process-mech'], [], 20, 'approved', OK('2026-02-03'), [86, 1, 4, 1], 'high', [74, 6.5], false, 'corniche.supplier'],
  ['arctis', 'Arctis Chiller Technik GmbH', 'DE', 'Stuttgart', ['chillers'], [ECUC], 6, 'approved', OK('2025-11-12'), [93, 0, 6, 2], 'medium', [90, 4.0], false],
  ['setouchi', 'Setouchi Refrigeration Co.', 'JP', 'Okayama', ['chillers'], [ECUC], 4, 'approved', ['due', '2025-08-20', 'clear', '2025-12-02'], [95, 0, 5, 2], 'medium', [88, 4.5], false],
  ['tilal-thermal', 'Tilal Thermal Systems LLC', 'AE', 'Dubai', ['chillers', 'cooling-towers'], [], 38, 'approved', OK('2026-01-18'), [85, 2, 8, 2], 'medium', [84, 4.0], false],
  ['warsan-thermal', 'Warsan Thermal Equipment LLC', 'AE', 'Dubai', ['chillers', 'cooling-towers'], [], 40, 'approved', OK('2026-01-22'), [87, 1, 6, 2], 'medium', [86, 4.0], false],
  ['mirdif-towers', 'Mirdif Cooling Towers LLC', 'AE', 'Dubai', ['cooling-towers'], [ECUC], 41, 'approved', OK('2025-10-28'), [88, 1, 7, 2], 'low', [89, 3.5], false],
  ['hamriyah-pumps', 'Hamriyah Pump Works FZE', 'AE', 'Sharjah', ['pumps', 'chem-dosing'], [], 33, 'approved', OK('2025-12-09'), [84, 2, 6, 1], 'medium', [81, 5.0], false],
  ['anjar-mech', 'Anjar Mechanical Contracting', 'LB', 'Beirut', ['hvac', 'pumps', 'pipes'], [], 8, 'pending', OK('2026-01-26'), [80, 3, 5, 1], 'high', [72, 6.0], false],
  ['qusais-switchgear', 'Qusais Switchgear LLC', 'AE', 'Dubai', ['lv', 'hv', 'ica'], [ECUC], 44, 'approved', OK('2025-11-03'), [89, 1, 9, 3], 'medium', [90, 3.5], false],
  ['nord-trasformatori', 'Nord Trasformatori S.r.l.', 'IT', 'Verona', ['hv'], [], 3, 'approved', OK('2025-12-15'), [92, 0, 4, 1], 'high', [83, 5.0], false],
  ['barsha-em', 'Barsha Electromechanical LLC', 'AE', 'Dubai', ['lv', 'hvac', 'insulation', 'bms'], [], 36, 'approved', OK('2026-02-11'), [83, 2, 7, 1], 'medium', [80, 5.0], false],
  ['deira-controls', 'Deira Controls and BMS LLC', 'AE', 'Dubai', ['bms', 'ica'], [ECUC], 39, 'approved', OK('2025-10-16'), [90, 1, 8, 3], 'medium', [92, 3.0], false],
  ['karama-pipe', 'Karama Pipe Supplies LLC', 'AE', 'Dubai', ['pipes', 'valves'], [], 35, 'approved', OK('2026-01-07'), [86, 1, 10, 3], 'medium', [87, 4.0], false],
  ['liguria-valvole', 'Liguria Valvole S.p.A.', 'IT', 'Genoa', ['valves'], [], 4, 'approved', OK('2025-11-21'), [91, 0, 5, 1], 'low', [85, 4.5], false],
  ['nahda-chemicals', 'Nahda Water Chemicals LLC', 'AE', 'Sharjah', ['chem-dosing'], [], 30, 'approved', OK('2025-12-30'), [87, 1, 6, 2], 'low', [86, 4.0], false],
  ['marmoom-insulation', 'Marmoom Insulation Contracting LLC', 'AE', 'Dubai', ['insulation', 'hvac'], [], 42, 'approved', OK('2026-02-19'), [84, 2, 6, 1], 'medium', [82, 4.5], false],
];

export const CORNICHE_SUPPLIERS = suppliers('corniche', ROWS);

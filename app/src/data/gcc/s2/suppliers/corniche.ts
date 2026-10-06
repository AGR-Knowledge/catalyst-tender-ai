import { suppliers, type SupplierTuple } from './build';

/**
 * Corniche's supplier master: MEP and district cooling, 16 suppliers, all
 * fictional, with three sendable suppliers for each package of T-2026-044,
 * and 13 more for T-2026-061's packages (plan 022): 29 in all.
 * One has sanctions screening due. Gulf Process Systems Co. is the Supplier
 * Portal persona's firm in every tenant.
 */

const ECUC = 'Chillmont Cooling Utilities Company';
const CBHH = 'Crescent Bay Health Holding';

const OK = (at: string): ['clear', string, 'clear', string] => ['clear', at, 'clear', at];

const ROWS: SupplierTuple[] = [
  ['gulf-process', 'Gulf Process Systems Co.', 'SA', 'Dammam', ['pumps', 'chem-dosing', 'process-mech'], [], 20, 'approved', OK('2026-02-03'), [86, 1, 4, 1], 'high', [74, 6.5], false, 'corniche.supplier'],
  ['arctis', 'Kaltenau Chiller Technik GmbH', 'DE', 'Stuttgart', ['chillers'], [ECUC], 6, 'approved', OK('2025-11-12'), [93, 0, 6, 2], 'medium', [90, 4.0], false],
  ['setouchi', 'Ushimado Refrigeration Co.', 'JP', 'Okayama', ['chillers'], [ECUC], 4, 'approved', ['due', '2025-08-20', 'clear', '2025-12-02'], [95, 0, 5, 2], 'medium', [88, 4.5], false],
  // Plan 016c: both on ECUC's list, so T-2026-044's seeded RFQs (P-01, P-02; avlRequired) went to approved suppliers.
  ['tilal-thermal', 'Tilal Thermal Systems LLC', 'AE', 'Dubai', ['chillers', 'cooling-towers'], [ECUC], 38, 'approved', OK('2026-01-18'), [85, 2, 8, 2], 'medium', [84, 4.0], false],
  ['warsan-thermal', 'Warsan Thermal Equipment LLC', 'AE', 'Dubai', ['chillers', 'cooling-towers'], [ECUC], 40, 'approved', OK('2026-01-22'), [87, 1, 6, 2], 'medium', [86, 4.0], false],
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

  // Plan 022: T-2026-061, the Abu Dhabi hospital MEP package. Two AHU manufacturers (the hvac suppliers above are
  // contractors), and three each for the packages no supplier above covers: medical gas, fire and plumbing.
  ['qarn-air', 'Qarn Air Handling Industries LLC', 'AE', 'Abu Dhabi', ['hvac'], [CBHH], 46, 'approved', OK('2026-01-14'), [88, 1, 7, 2], 'medium', [87, 4.0], false],
  ['kestrelwind', 'Falkenwind Lufttechnik GmbH', 'DE', 'Kassel', ['hvac'], [], 5, 'approved', OK('2025-12-04'), [91, 0, 4, 1], 'low', [84, 5.0], false],
  ['oskerwyn-medgas', 'Oskerwyn Medical Gas Systems Ltd', 'GB', 'Leeds', ['medical-gas'], [CBHH], 7, 'approved', OK('2025-11-26'), [94, 0, 5, 2], 'medium', [89, 4.5], false],
  ['valmora-medgas', 'Valmora Gas Medicali S.r.l.', 'IT', 'Bergamo', ['medical-gas'], [], 4, 'approved', OK('2026-01-09'), [90, 1, 3, 1], 'low', [82, 5.0], false],
  ['thalmira-medgas', 'Thalmira Medical Gas Services LLC', 'AE', 'Abu Dhabi', ['medical-gas'], [CBHH], 44, 'approved', OK('2026-02-05'), [86, 1, 6, 2], 'high', [85, 4.0], false],
  ['pyrenta-fire', 'Pyrenta Fire and Safety LLC', 'AE', 'Dubai', ['fire'], [CBHH], 41, 'approved', OK('2026-01-20'), [89, 1, 9, 3], 'medium', [90, 3.5], false],
  ['khalidiya-fire', 'Khalidiya Fire Protection LLC', 'AE', 'Abu Dhabi', ['fire'], [CBHH], 45, 'approved', OK('2025-12-18'), [85, 2, 7, 2], 'medium', [86, 4.0], false],
  ['shamal-fire', 'Shamal Fire Systems Contracting LLC', 'AE', 'Sharjah', ['fire'], [], 37, 'approved', OK('2026-02-12'), [82, 2, 5, 1], 'low', [79, 5.0], false],
  ['baniyas-plumbing', 'Baniyas Plumbing and Drainage LLC', 'AE', 'Abu Dhabi', ['plumbing'], [CBHH], 43, 'approved', OK('2026-01-28'), [87, 1, 8, 2], 'medium', [88, 4.0], false],
  ['wathba-hydro', 'Wathba Hydro Services LLC', 'AE', 'Abu Dhabi', ['plumbing'], [], 39, 'approved', OK('2025-12-11'), [84, 2, 6, 1], 'medium', [83, 4.5], false],
  ['galdrevin-plumbing', 'Galdrevin Plumbing Contracting LLC', 'AE', 'Abu Dhabi', ['plumbing'], [], 36, 'pending', OK('2026-02-24'), [80, 3, 4, 0], 'low', [76, 5.5], false],
  ['reem-power', 'Saadiyat Power Systems LLC', 'AE', 'Abu Dhabi', ['lv'], [CBHH], 42, 'approved', OK('2026-01-16'), [88, 1, 8, 2], 'medium', [89, 4.0], false],
  ['corvane-elv', 'Corvane ELV Systems LLC', 'AE', 'Dubai', ['bms'], [], 35, 'approved', OK('2026-02-02'), [86, 1, 7, 2], 'medium', [85, 4.0], false],
];

export const CORNICHE_SUPPLIERS = suppliers('corniche', ROWS);

import { HERO_ISSUER } from '../../hero';
import { suppliers, type SupplierTuple } from './build';

/**
 * Najd's supplier master (gcc-demo-data §6): 48 suppliers, all fictional.
 * Screening on demo day: 41 current, 5 due (checked more than 180 days ago),
 * 2 blocked (Tarvessa Trading FZE, sanctions match; Lumenza UV Systems,
 * anti-bribery flag). Trades cover the hero's 11 packages and the packages of
 * T-2026-104 and T-2026-109, with 4–6 candidates each.
 *
 * AVL columns name the clients whose approved-vendor lists include the
 * supplier, spelt as the register spells the issuer.
 */

const ECWS = HERO_ISSUER;
const GCIU = 'Gulf Coast Industrial Utilities Company';
const NCWS = 'Northern Cities Water Services Company';

const OK = (at: string): ['clear', string, 'clear', string] => ['clear', at, 'clear', at];

const ROWS: SupplierTuple[] = [
  // Piling, dewatering and shoring; trenchless crossings
  ['rasikh', 'Rasikh Foundations Co.', 'SA', 'Dammam', ['piling', 'trenchless'], [], 44, 'approved', OK('2025-11-18'), [91, 1, 7, 2], 'medium', [88, 4.5], false],
  ['taweel', 'Taweel Geotechnical', 'SA', 'Riyadh', ['piling', 'trenchless'], [], 38, 'approved', ['due', '2025-08-16', 'clear', '2025-11-03'], [87, 2, 5, 1], 'low', [80, 5.5], false],
  ['sadeem', 'Sadeem Piling and Shoring Co.', 'SA', 'Jubail', ['piling'], [ECWS], 41, 'approved', OK('2025-12-02'), [89, 1, 6, 2], 'medium', [84, 4.0], false],
  ['jibal', 'Jibal Ground Engineering', 'SA', 'Riyadh', ['piling', 'trenchless'], [], 36, 'approved', OK('2026-01-12'), [84, 2, 8, 1], 'low', [90, 3.5], false],
  ['qasr', 'Qasr Geo-Structures Co.', 'SA', 'Khobar', ['piling', 'trenchless'], [], 33, 'pending', OK('2025-10-21'), [82, 3, 4, 0], 'low', [76, 6.0], false],

  // Process mechanical equipment
  ['rhein-aqua', 'Rhein Aqua Systems GmbH', 'DE', 'Duisburg', ['process-mech'], [ECWS, GCIU], 12, 'approved', OK('2025-12-15'), [93, 0, 6, 2], 'medium', [92, 5.0], false],
  ['gulf-process', 'Gulf Process Systems Co.', 'SA', 'Dammam', ['process-mech', 'sludge', 'chem-dosing'], [ECWS], 58, 'approved', OK('2026-02-03'), [86, 1, 9, 3], 'high', [74, 6.5], true, 'najd.supplier'],
  ['hanseong', 'Hanseong Water Machinery', 'KR', 'Changwon', ['process-mech', 'pumps', 'surge'], [GCIU], 6, 'approved', OK('2025-10-30'), [90, 1, 5, 1], 'low', [86, 4.5], false],
  ['vistula', 'Vistula Process Equipment S.A.', 'PL', 'Gdańsk', ['process-mech'], [], 4, 'pending', OK('2026-01-20'), [83, 2, 3, 0], 'low', [71, 6.0], false],

  // Tertiary filtration, DAF and UV; odour control
  ['nordklar', 'Nordklar Filtration AB', 'SE', 'Malmö', ['filtration'], [ECWS, GCIU], 9, 'approved', OK('2025-11-25'), [94, 0, 5, 2], 'medium', [91, 4.0], false],
  ['sahara-clearwater', 'Sahara Clearwater Technologies', 'AE', 'Dubai', ['filtration', 'odour'], [], 22, 'approved', OK('2025-12-08'), [81, 2, 7, 1], 'high', [69, 7.0], false],
  ['tamarisk', 'Tamarisk Water Technologies', 'SA', 'Jeddah', ['filtration', 'chem-dosing', 'testing'], [], 47, 'approved', OK('2026-01-06'), [88, 1, 8, 2], 'medium', [85, 4.5], false],
  ['lumenza', 'Lumenza UV Systems B.V.', 'NL', 'Eindhoven', ['filtration'], [], 5, 'approved', ['clear', '2026-01-27', 'flag', '2026-01-27'], [90, 0, 3, 1], 'low', [88, 3.5], false],

  // Sludge thickening and dewatering
  ['castellan', 'Castellan Separators Srl', 'IT', 'Bergamo', ['sludge'], [ECWS, GCIU], 8, 'approved', OK('2025-10-14'), [92, 1, 6, 2], 'medium', [89, 4.0], false],
  ['brenner', 'Brenner Zentrifugen GmbH', 'DE', 'Rosenheim', ['sludge'], [], 7, 'approved', ['due', '2025-09-02', 'clear', '2025-12-01'], [88, 1, 4, 1], 'low', [83, 5.0], false],
  ['salwa', 'Salwa Environmental Equipment', 'SA', 'Hofuf', ['sludge', 'odour', 'chem-dosing'], [], 51, 'approved', OK('2025-12-19'), [85, 2, 10, 3], 'medium', [87, 4.0], true],

  ['odrana', 'Odrana Odour Control FZCO', 'AE', 'Dubai', ['odour'], [], 18, 'approved', OK('2025-11-11'), [80, 3, 6, 1], 'medium', [78, 5.5], false],
  ['khuzama', 'Khuzama Air Treatment', 'SA', 'Riyadh', ['odour'], [ECWS], 43, 'approved', OK('2026-02-10'), [89, 1, 5, 2], 'low', [90, 3.5], true],

  // HV substations and transformers; LV distribution, MCCs and cables
  ['hijaz-power', 'Hijaz Power Equipment Co.', 'SA', 'Jeddah', ['hv', 'lv'], [ECWS, GCIU, NCWS], 49, 'approved', OK('2025-10-08'), [91, 1, 11, 4], 'medium', [93, 3.5], true],
  ['levant-switchgear', 'Levant Switchgear SAL', 'LB', 'Beirut', ['hv', 'lv'], [ECWS, GCIU], 10, 'approved', OK('2025-11-04'), [78, 3, 8, 1], 'high', [72, 7.5], false],
  ['weser', 'Weser Transformer Works GmbH', 'DE', 'Bremen', ['hv'], [], 3, 'approved', OK('2025-12-22'), [95, 0, 4, 1], 'high', [81, 5.0], false],
  ['nafud', 'Nafud Electric Industries', 'SA', 'Riyadh', ['hv', 'lv'], [NCWS], 46, 'approved', OK('2026-01-15'), [87, 1, 9, 2], 'medium', [86, 4.0], true],
  ['hafar-cable', 'Hafar Cable Industries', 'SA', 'Dammam', ['lv'], [ECWS], 54, 'approved', OK('2025-10-27'), [90, 0, 12, 5], 'medium', [92, 3.0], true],
  ['sarawat', 'Sarawat Panel Builders', 'SA', 'Abha', ['lv'], [], 45, 'approved', ['due', '2025-09-05', 'clear', '2025-12-14'], [84, 2, 6, 1], 'low', [79, 5.0], true],

  // Instrumentation, control and SCADA
  ['qimma', 'Qimma Automation', 'SA', 'Riyadh', ['ica'], [ECWS, GCIU, NCWS], 42, 'approved', OK('2026-02-24'), [92, 0, 10, 3], 'medium', [94, 3.0], false],
  ['ellanby', 'Ellanby Instrumentation Ltd', 'GB', 'Leeds', ['ica'], [GCIU], 2, 'approved', OK('2025-11-19'), [86, 1, 5, 1], 'low', [82, 5.0], false],
  ['asir-telemetry', 'Asir Telemetry Solutions', 'SA', 'Khamis Mushait', ['ica'], [], 39, 'pending', OK('2026-01-29'), [83, 2, 4, 0], 'high', [75, 6.0], false],
  ['hatta', 'Hatta Instrumentation FZE', 'AE', 'Dubai', ['ica'], [], 14, 'approved', OK('2025-12-04'), [85, 1, 6, 1], 'medium', [80, 5.0], false],
  ['tarvessa', 'Tarvessa Trading FZE', 'AE', 'Jebel Ali', ['valves', 'ica'], [], null, 'none', ['match', '2026-02-18', 'clear', '2026-02-18'], [79, 2, 3, 0], 'low', [66, 6.5], false],

  // Valves, penstocks and pipes
  ['unaizah-valve', 'Unaizah Valve Industries', 'SA', 'Qassim', ['valves'], [ECWS, NCWS], 52, 'approved', OK('2025-10-02'), [89, 1, 10, 3], 'medium', [90, 3.5], true],
  ['brescia', 'Brescia Valvole S.p.A.', 'IT', 'Brescia', ['valves'], [], 5, 'approved', OK('2025-11-27'), [91, 0, 5, 1], 'low', [85, 4.5], false],
  ['tarout', 'Tarout Flow Control Co.', 'SA', 'Qatif', ['valves'], [], 40, 'approved', OK('2026-01-08'), [86, 2, 7, 2], 'medium', [83, 4.0], true],
  ['scheldt', 'Scheldt Penstocks B.V.', 'NL', 'Antwerp', ['valves'], [], 3, 'pending', OK('2025-12-11'), [88, 1, 3, 0], 'low', [77, 5.5], false],
  ['sudair-steel', 'Sudair Steel Pipe Co.', 'SA', 'Sudair', ['pipes'], [NCWS], 55, 'approved', OK('2025-10-19'), [87, 1, 9, 3], 'medium', [88, 4.0], true],

  // GRP pipes (mandatory list); steel structures and covers
  ['tuwaiq-pipe', 'Tuwaiq Pipe Industries', 'SA', 'Riyadh', ['grp'], [ECWS, NCWS], 61, 'approved', OK('2026-02-16'), [92, 0, 11, 4], 'medium', [95, 3.0], true],
  ['eastern-composite', 'Eastern Composite Pipes Co.', 'SA', 'Dammam', ['grp'], [ECWS, NCWS], 57, 'approved', OK('2025-11-06'), [88, 1, 9, 3], 'high', [86, 4.0], true],
  ['qassim-fibreglass', 'Qassim Fibreglass Industries', 'SA', 'Buraydah', ['grp', 'steel'], [], 49, 'approved', OK('2025-12-29'), [85, 2, 7, 1], 'low', [82, 4.5], true],
  ['harrat', 'Harrat Composite Pipes', 'SA', 'Madinah', ['grp', 'steel'], [], 46, 'approved', OK('2026-01-22'), [83, 1, 5, 1], 'low', [80, 5.0], true],
  ['shaqra-steel', 'Shaqra Steel Structures', 'SA', 'Riyadh', ['steel'], [], 48, 'approved', OK('2025-10-12'), [88, 1, 8, 2], 'medium', [87, 4.0], true],
  ['ula-steel', 'Ula Steel Fabrication Co.', 'SA', 'Yanbu', ['steel'], [], 44, 'approved', OK('2025-11-30'), [81, 2, 6, 1], 'medium', [79, 5.5], true],

  // Pumps and surge vessels
  ['aldervane', 'Aldervane Pumps', 'GB', 'Sheffield', ['pumps', 'surge'], [], 3, 'approved', ['clear', '2025-12-10', 'due', '2025-07-24'], [90, 1, 4, 1], 'low', [84, 4.5], false],
  ['dunmore', 'Dunmore Hydraulics', 'IE', 'Cork', ['pumps', 'surge'], [ECWS, NCWS], 7, 'approved', OK('2025-10-24'), [89, 1, 6, 2], 'medium', [87, 4.0], false],
  ['lusitania', 'Lusitania Bombas S.A.', 'PT', 'Porto', ['pumps', 'surge'], [], 4, 'approved', OK('2026-01-13'), [84, 2, 4, 1], 'low', [81, 5.0], false],

  // Chemical dosing; testing and disinfection
  ['carthage', 'Carthage Dosing Systems', 'TN', 'Sfax', ['chem-dosing', 'testing'], [], 6, 'approved', OK('2025-12-17'), [86, 1, 5, 1], 'low', [83, 4.5], false],

  // Cathodic protection
  ['rabigh-cp', 'Rabigh Cathodic Protection Co.', 'SA', 'Rabigh', ['cathodic', 'testing'], [NCWS], 45, 'approved', OK('2025-11-15'), [90, 0, 7, 2], 'medium', [89, 3.5], false],
  ['sabkha', 'Sabkha Corrosion Control', 'SA', 'Jubail', ['cathodic'], [], 40, 'approved', OK('2026-02-05'), [85, 1, 5, 1], 'low', [84, 4.0], false],
  ['farasan', 'Farasan Anodes Co.', 'SA', 'Jazan', ['cathodic'], [], 37, 'approved', ['due', '2025-08-29', 'clear', '2025-11-20'], [82, 2, 4, 0], 'low', [76, 5.5], false],
  ['nuqra', 'Nuqra Pipeline Services', 'SA', 'Riyadh', ['cathodic', 'testing'], [], 43, 'approved', OK('2025-12-26'), [87, 1, 6, 2], 'medium', [86, 4.0], false],
];

export const NAJD_SUPPLIERS = suppliers('najd', ROWS);

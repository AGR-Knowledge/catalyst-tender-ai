import { HERO_ISSUER } from '../../hero';
import { suppliers, type SupplierTuple } from './build';

/**
 * Qurain's supplier master: tunnelling and large pipelines in Kuwait, with a
 * few process suppliers for KSA water work through Qurain Meridian Arabia Co.
 * 33 suppliers, all fictional: Qurain's two Stage 2 tenders have 22 packages
 * between them, and each needs three sendable suppliers in its trade. One has
 * anti-bribery screening due. Gulf Process Systems Co. is the Supplier Portal
 * persona's firm in every tenant.
 */

const SGSA = 'Southern Governorates Sanitation Agency';
const NWGP = 'National Water Grid Projects Office';

const OK = (at: string): ['clear', string, 'clear', string] => ['clear', at, 'clear', at];

const ROWS: SupplierTuple[] = [
  ['gulf-process', 'Gulf Process Systems Co.', 'SA', 'Dammam', ['pumps', 'process-mech', 'sludge', 'surge'], [HERO_ISSUER, NWGP], 40, 'approved', OK('2026-02-03'), [86, 1, 6, 2], 'high', [74, 6.5], false, 'qurain.supplier'],
  // Tunnelling
  ['rheintal-tbm', 'Rheintal Tunnelbau Maschinen GmbH', 'DE', 'Karlsruhe', ['tbm'], [SGSA], 2, 'approved', OK('2025-11-06'), [92, 0, 3, 1], 'medium', [88, 5.0], false],
  ['hokuriku-shield', 'Hokuriku Shield Machines Co.', 'JP', 'Kanazawa', ['tbm'], [], 1, 'approved', OK('2026-01-14'), [94, 0, 2, 1], 'low', [85, 6.0], false],
  ['taihu-shield', 'Taihu Shield Machinery Co.', 'CN', 'Wuxi', ['tbm'], [], 1, 'approved', OK('2025-12-02'), [84, 2, 3, 0], 'medium', [71, 6.5], false],
  ['wafra-segments', 'Wafra Precast Segments Co.', 'KW', 'Wafra', ['segments', 'precast'], [SGSA], 47, 'approved', OK('2025-12-11'), [87, 1, 5, 2], 'medium', [89, 4.0], true],
  ['sulaibiya-precast', 'Sulaibiya Precast Co.', 'KW', 'Sulaibiya', ['segments', 'precast'], [], 44, 'approved', OK('2026-01-19'), [84, 2, 6, 1], 'high', [83, 4.5], true],
  ['kabd-precast', 'Kabd Precast Industries Co.', 'KW', 'Kabd', ['segments', 'precast'], [SGSA], 45, 'approved', OK('2026-01-26'), [85, 1, 6, 2], 'medium', [86, 4.0], true],
  ['failaka-grouting', 'Failaka Grouting Services W.L.L.', 'KW', 'Kuwait City', ['grouting'], [SGSA], 39, 'approved', OK('2025-10-26'), [88, 1, 7, 2], 'medium', [87, 4.0], false],
  ['ticino-injection', 'Ticino Injection Systems SA', 'CH', 'Lugano', ['grouting'], [], 3, 'approved', OK('2025-12-29'), [91, 0, 3, 1], 'low', [86, 4.5], false],
  ['kazma-micro', 'Kazma Microtunnelling Co.', 'KW', 'Kuwait City', ['trenchless', 'grouting', 'shafts'], [NWGP], 41, 'approved', OK('2026-02-09'), [86, 1, 6, 2], 'medium', [85, 4.0], false],
  ['khiran-ground', 'Khiran Ground Engineering Co.', 'KW', 'Khiran', ['shafts', 'piling', 'trenchless', 'grouting'], [SGSA], 40, 'approved', OK('2025-12-14'), [86, 1, 7, 2], 'medium', [85, 4.0], false],
  ['subiya-foundations', 'Subiya Foundations Co.', 'KW', 'Jahra', ['shafts', 'piling', 'trenchless'], [NWGP], 42, 'approved', OK('2026-01-06'), [83, 2, 6, 1], 'high', [80, 5.0], false],
  ['ventalba-vent', 'Ventalba Ventilation S.L.', 'ES', 'Bilbao', ['ventilation'], [], 3, 'approved', OK('2025-11-14'), [90, 0, 4, 1], 'low', [87, 4.5], false],
  ['rhone-ventilation', 'Rhône Tunnel Ventilation SAS', 'FR', 'Lyon', ['ventilation'], [], 3, 'approved', OK('2025-12-08'), [89, 0, 3, 1], 'medium', [84, 5.0], false],
  ['fahaheel-air', 'Fahaheel Air Systems Co.', 'KW', 'Fahaheel', ['ventilation', 'hvac'], [], 37, 'approved', OK('2026-01-28'), [80, 2, 5, 1], 'high', [72, 6.0], false],
  // Pipelines
  ['mutla-steel', 'Mutla Steel Pipe Co.', 'KW', 'Shuaiba', ['pipes'], [NWGP], 50, 'approved', OK('2025-10-18'), [88, 1, 8, 3], 'medium', [90, 3.5], true],
  ['bubiyan-composite', 'Bubiyan Composite Pipes Co.', 'KW', 'Shuaiba', ['grp'], [NWGP, SGSA], 48, 'approved', OK('2026-01-05'), [86, 1, 7, 2], 'medium', [88, 4.0], true],
  ['mina-pipe', 'Mina Abdullah Pipe Industries Co.', 'KW', 'Mina Abdullah', ['pipes', 'grp'], [NWGP], 49, 'approved', OK('2025-11-25'), [85, 1, 6, 2], 'medium', [86, 4.0], true],
  ['salmiya-valve', 'Salmiya Valve Trading Co.', 'KW', 'Salmiya', ['valves'], [NWGP], 31, 'approved', OK('2025-12-03'), [84, 2, 9, 2], 'medium', [84, 4.0], false],
  ['ardiya-valve', 'Ardiya Valve and Flow Co.', 'KW', 'Ardiya', ['valves'], [NWGP], 33, 'approved', OK('2026-02-02'), [86, 1, 6, 2], 'low', [85, 4.0], false],
  ['tyrol-armaturen', 'Tyrol Armaturen GmbH', 'AT', 'Kufstein', ['valves'], [], 3, 'approved', OK('2025-11-11'), [93, 0, 4, 1], 'low', [87, 4.5], false],
  ['garda-valvole', 'Garda Valvole S.p.A.', 'IT', 'Brescia', ['valves'], [], 4, 'approved', ['clear', '2025-11-22', 'due', '2025-08-30'], [92, 0, 4, 1], 'low', [86, 4.5], false],
  ['danube-surge', 'Danube Surge Systems GmbH', 'AT', 'Linz', ['surge'], [], 2, 'approved', OK('2025-12-17'), [91, 0, 3, 1], 'low', [84, 5.0], false],
  ['sulaibikhat-pipeline', 'Sulaibikhat Pipeline Services Co.', 'KW', 'Sulaibikhat', ['testing'], [NWGP], 34, 'approved', OK('2026-01-15'), [87, 1, 5, 2], 'low', [86, 4.0], false],
  // Pump stations, protection, power and controls
  ['mangaf-pumps', 'Mangaf Pump Services', 'KW', 'Mangaf', ['pumps', 'surge'], [SGSA], 36, 'approved', OK('2026-01-30'), [85, 1, 6, 2], 'medium', [86, 4.0], false],
  ['shuwaikh-water', 'Shuwaikh Water Technologies Co.', 'KW', 'Shuwaikh', ['filtration', 'sludge', 'process-mech'], [HERO_ISSUER], 37, 'approved', OK('2025-12-20'), [85, 1, 5, 1], 'medium', [84, 4.5], false],
  ['abdali-cp', 'Abdali Cathodic Protection W.L.L.', 'KW', 'Kuwait City', ['cathodic', 'testing'], [NWGP], 38, 'approved', OK('2025-11-09'), [87, 1, 5, 1], 'low', [85, 4.0], false],
  ['salmi-corrosion', 'Salmi Corrosion Engineering Co.', 'KW', 'Kuwait City', ['cathodic', 'testing'], [NWGP], 36, 'approved', OK('2026-02-05'), [84, 2, 5, 1], 'medium', [83, 4.5], false],
  ['adriatic-cp', 'Adriatic Corrosion Protection d.o.o.', 'HR', 'Rijeka', ['cathodic'], [], 3, 'approved', OK('2025-12-10'), [90, 0, 3, 1], 'low', [85, 5.0], false],
  ['rai-electrical', 'Rai Electrical Contracting Co.', 'KW', 'Al-Rai', ['hv', 'lv', 'ica'], [SGSA], 38, 'approved', OK('2025-12-27'), [85, 1, 7, 2], 'medium', [84, 4.0], false],
  ['qurtuba-power', 'Qurtuba Power Systems Co.', 'KW', 'Kuwait City', ['hv', 'lv', 'ica'], [NWGP], 41, 'approved', OK('2026-01-21'), [88, 1, 8, 3], 'medium', [88, 3.5], false],
  ['nuwaiseeb-electrical', 'Nuwaiseeb Electrical Works Co.', 'KW', 'Ahmadi', ['hv', 'lv'], [], 39, 'approved', OK('2025-11-18'), [83, 2, 6, 1], 'high', [80, 5.0], false],
  ['mishref-controls', 'Mishref Controls and Telemetry Co.', 'KW', 'Mishref', ['ica'], [NWGP], 35, 'approved', OK('2026-02-10'), [87, 1, 5, 2], 'low', [86, 4.0], false],
];

export const QURAIN_SUPPLIERS = suppliers('qurain', ROWS);

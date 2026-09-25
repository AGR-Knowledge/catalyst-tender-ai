import { HERO_ISSUER } from '../../hero';
import { suppliers, type SupplierTuple } from './build';

/**
 * Dafna's supplier master: sewer rehabilitation, with a few process suppliers
 * for KSA water work through the Riyadh branch. 16 suppliers, all fictional,
 * with three sendable suppliers for each package of T-2026-019. One has
 * sanctions screening due. Gulf Process Systems Co. is the Supplier Portal
 * persona's firm in every tenant.
 */

const SMDO = 'Southern Municipalities Drainage Office';

const OK = (at: string): ['clear', string, 'clear', string] => ['clear', at, 'clear', at];

const ROWS: SupplierTuple[] = [
  ['gulf-process', 'Gulf Process Systems Co.', 'SA', 'Dammam', ['process-mech', 'sludge', 'pumps'], [HERO_ISSUER], 58, 'approved', OK('2026-02-03'), [86, 1, 5, 1], 'high', [74, 6.5], false, 'dafna.supplier'],
  ['mesaieed-relining', 'Mesaieed Relining Services W.L.L.', 'QA', 'Mesaieed', ['cipp', 'cctv'], [SMDO], 44, 'approved', OK('2025-11-05'), [90, 1, 9, 3], 'medium', [91, 3.5], false],
  ['oder-liner', 'Oder Liner Systems GmbH', 'DE', 'Frankfurt (Oder)', ['cipp'], [], 5, 'approved', OK('2025-12-01'), [93, 0, 5, 1], 'low', [86, 4.5], false],
  ['anatolia-kanal', 'Anatolia Kanal Teknik A.Ş.', 'TR', 'Izmir', ['cipp', 'manholes', 'cctv'], [], 7, 'approved', OK('2026-01-14'), [84, 2, 6, 1], 'medium', [80, 5.0], false],
  ['simaisma-manhole', 'Simaisma Manhole Rehabilitation W.L.L.', 'QA', 'Doha', ['manholes', 'cipp'], [SMDO], 40, 'approved', OK('2025-10-22'), [87, 1, 8, 2], 'medium', [88, 4.0], false],
  ['umm-salal-precast', 'Umm Salal Precast Manholes', 'QA', 'Umm Salal', ['manholes'], [], 46, 'approved', OK('2026-02-02'), [85, 2, 7, 2], 'low', [84, 4.0], true],
  ['duhail-bypass', 'Duhail Bypass Pumping Services', 'QA', 'Doha', ['bypass', 'pumps'], [SMDO], 38, 'approved', OK('2025-11-17'), [89, 1, 10, 3], 'high', [87, 3.5], false],
  ['saale-pumpen', 'Pumpenwerk Saale GmbH', 'DE', 'Halle', ['pumps', 'bypass'], [], 4, 'approved', OK('2025-12-18'), [92, 0, 4, 1], 'low', [85, 4.5], false],
  ['khor-inspection', 'Khor Pipeline Inspection W.L.L.', 'QA', 'Al Khor', ['cctv'], [SMDO], 41, 'approved', OK('2026-01-21'), [91, 0, 11, 4], 'medium', [93, 3.0], false],
  ['zubarah-survey', 'Zubarah Survey Technologies W.L.L.', 'QA', 'Doha', ['cctv'], [], 37, 'pending', ['due', '2025-08-31', 'clear', '2025-10-09'], [82, 2, 5, 1], 'low', [78, 5.5], false],
  ['dukhan-composite', 'Dukhan Composite Pipes W.L.L.', 'QA', 'Dukhan', ['grp'], [SMDO], 48, 'approved', OK('2025-11-26'), [88, 1, 8, 2], 'medium', [89, 4.0], true],
  ['shamal-pipe', 'Shamal Ductile Pipe Trading W.L.L.', 'QA', 'Doha', ['pipes', 'valves'], [], 29, 'approved', OK('2025-12-10'), [83, 2, 6, 1], 'medium', [79, 5.0], false],
  ['kharrara-pipe', 'Al Kharrara Pipe Supplies W.L.L.', 'QA', 'Doha', ['grp', 'pipes', 'valves'], [SMDO], 36, 'approved', OK('2026-01-12'), [85, 1, 7, 2], 'medium', [84, 4.0], false],
  ['wukair-env', 'Al Wukair Environmental Systems W.L.L.', 'QA', 'Al Wakra', ['odour', 'filtration'], [], 39, 'approved', OK('2025-11-30'), [87, 1, 5, 1], 'low', [85, 4.5], false],
  ['fuwairit-water', 'Fuwairit Water Equipment W.L.L.', 'QA', 'Doha', ['filtration', 'odour'], [], 35, 'approved', OK('2026-01-09'), [86, 1, 5, 1], 'low', [83, 4.5], false],
  ['mosel-separation', 'Mosel Separation Technik GmbH', 'DE', 'Koblenz', ['sludge', 'filtration'], [HERO_ISSUER], 6, 'approved', OK('2025-12-22'), [91, 0, 4, 1], 'medium', [87, 4.0], false],
];

export const DAFNA_SUPPLIERS = suppliers('dafna', ROWS);

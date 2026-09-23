/**
 * Delivery programmes for the projects in PROJECTS (workspace.ts).
 *
 * Each project carries its contract length and where the baseline says it
 * should be today (`planned`, %). Activity spans are fractions of the contract
 * length. Status, lateness, forecast completion and the "days late" figure are
 * all worked out in domain/programme.ts against the project's actual progress,
 * so the Gantt, the portfolio table and the deviation list cannot disagree.
 */

export interface ActivityDef {
  id: string;
  name: string;
  /** Start and finish as a fraction of the contract length. Equal values make a milestone. */
  s: number;
  e: number;
  crit?: boolean;
}
export interface GroupDef { code: string; name: string; acts: ActivityDef[] }

const SUBSTATION: GroupDef[] = [
  { code: 'ENG', name: 'Engineering and approvals', acts: [
    { id: '1010', name: 'Site survey and soil investigation', s: 0, e: 0.06 },
    { id: '1020', name: 'Primary engineering and single-line diagram', s: 0.03, e: 0.14, crit: true },
    { id: '1030', name: 'Drawing approval by the utility', s: 0.12, e: 0.2, crit: true },
  ] },
  { code: 'PRC', name: 'Procurement', acts: [
    { id: '2010', name: 'Power transformers, manufacture and FAT', s: 0.12, e: 0.55, crit: true },
    { id: '2020', name: 'GIS switchgear, manufacture and delivery', s: 0.15, e: 0.5 },
    { id: '2030', name: 'Control and relay panels', s: 0.3, e: 0.58 },
  ] },
  { code: 'CIV', name: 'Civil works', acts: [
    { id: '3010', name: 'Site grading and boundary wall', s: 0.08, e: 0.22 },
    { id: '3020', name: 'Transformer and GIS hall foundations', s: 0.2, e: 0.42, crit: true },
    { id: '3030', name: 'GIS building and control room', s: 0.3, e: 0.55 },
  ] },
  { code: 'ERC', name: 'Erection', acts: [
    { id: '4010', name: 'GIS erection', s: 0.5, e: 0.7 },
    { id: '4020', name: 'Transformer erection and oil filling', s: 0.55, e: 0.75, crit: true },
    { id: '4030', name: 'Cabling and secondary wiring', s: 0.6, e: 0.82 },
  ] },
  { code: 'TST', name: 'Testing and handover', acts: [
    { id: '5010', name: 'Pre-commissioning tests', s: 0.8, e: 0.92, crit: true },
    { id: '5020', name: 'Charging and handover', s: 1, e: 1, crit: true },
  ] },
];

const LINE: GroupDef[] = [
  { code: 'SUR', name: 'Survey and clearances', acts: [
    { id: '1010', name: 'Route survey and tower spotting', s: 0, e: 0.08 },
    { id: '1020', name: 'Forest and right-of-way clearances', s: 0.04, e: 0.2, crit: true },
  ] },
  { code: 'SUP', name: 'Supply', acts: [
    { id: '2010', name: 'Tower steel', s: 0.1, e: 0.5 },
    { id: '2020', name: 'Conductor, insulators and hardware', s: 0.2, e: 0.6 },
  ] },
  { code: 'FDN', name: 'Foundations', acts: [
    { id: '3010', name: 'Tower foundations, 212 locations', s: 0.15, e: 0.55, crit: true },
  ] },
  { code: 'ERC', name: 'Erection and stringing', acts: [
    { id: '4010', name: 'Tower erection', s: 0.35, e: 0.75, crit: true },
    { id: '4020', name: 'Stringing, 62 km', s: 0.6, e: 0.9, crit: true },
    { id: '4030', name: 'Highway and rail crossings', s: 0.7, e: 0.88 },
  ] },
  { code: 'TST', name: 'Testing and energisation', acts: [
    { id: '5010', name: 'Line testing', s: 0.9, e: 0.97 },
    { id: '5020', name: 'Energisation', s: 1, e: 1, crit: true },
  ] },
];

const METRO: GroupDef[] = [
  { code: 'DES', name: 'Design and approvals', acts: [
    { id: '1010', name: 'Alignment survey and utility mapping', s: 0, e: 0.07 },
    { id: '1020', name: 'Viaduct and station design', s: 0.03, e: 0.18, crit: true },
    { id: '1030', name: 'Traffic diversion approvals', s: 0.1, e: 0.2 },
  ] },
  { code: 'UTL', name: 'Utilities', acts: [
    { id: '2010', name: 'Utility shifting along the corridor', s: 0.12, e: 0.3, crit: true },
  ] },
  { code: 'VIA', name: 'Viaduct', acts: [
    { id: '3010', name: 'Piling, piers and pile caps', s: 0.2, e: 0.48, crit: true },
    { id: '3020', name: 'Pier caps and segment casting', s: 0.28, e: 0.55 },
    { id: '3030', name: 'Segment erection, spans 1 to 40', s: 0.42, e: 0.72, crit: true },
  ] },
  { code: 'STN', name: 'Stations', acts: [
    { id: '4010', name: 'Station structures, three stations', s: 0.35, e: 0.75 },
    { id: '4020', name: 'Architectural finishes', s: 0.65, e: 0.9 },
  ] },
  { code: 'SYS', name: 'Systems interface', acts: [
    { id: '5010', name: 'Track and third-rail interface', s: 0.72, e: 0.9 },
    { id: '5020', name: 'Trial run support', s: 0.9, e: 0.98 },
    { id: '5030', name: 'Handover to the operator', s: 1, e: 1, crit: true },
  ] },
];

const SOLAR: GroupDef[] = [
  { code: 'DES', name: 'Design and approvals', acts: [
    { id: '1010', name: 'Layout and yield study', s: 0, e: 0.08 },
    { id: '1020', name: 'Grid connectivity approval', s: 0.05, e: 0.2, crit: true },
  ] },
  { code: 'PRC', name: 'Procurement', acts: [
    { id: '2010', name: 'PV modules, supply', s: 0.1, e: 0.45, crit: true },
    { id: '2020', name: 'Central inverters, supply', s: 0.3, e: 0.86 },
  ] },
  { code: 'CIV', name: 'Civil works', acts: [
    { id: '3010', name: 'Site levelling and fencing', s: 0.08, e: 0.25 },
    { id: '3020', name: 'Piling and mounting structures', s: 0.2, e: 0.55, crit: true },
  ] },
  { code: 'ELE', name: 'Electrical', acts: [
    { id: '4010', name: 'Module installation', s: 0.4, e: 0.78, crit: true },
    { id: '4020', name: '33 kV cabling and pooling substation', s: 0.5, e: 0.82 },
    { id: '4030', name: 'Inverter station erection', s: 0.55, e: 0.9, crit: true },
  ] },
  { code: 'COM', name: 'Commissioning', acts: [
    { id: '5010', name: 'Pre-commissioning tests', s: 0.92, e: 0.98 },
    { id: '5020', name: 'Commercial operation date', s: 1, e: 1, crit: true },
  ] },
];

const WATER: GroupDef[] = [
  { code: 'DES', name: 'Design and consents', acts: [
    { id: '1010', name: 'Process design and P&IDs', s: 0, e: 0.12, crit: true },
    { id: '1020', name: 'Consent to establish from GPCB', s: 0.05, e: 0.18 },
  ] },
  { code: 'CIV', name: 'Civil works', acts: [
    { id: '2010', name: 'Excavation and raft for clarifiers', s: 0.12, e: 0.35, crit: true },
    { id: '2020', name: 'Tanks and clarifiers', s: 0.25, e: 0.6, crit: true },
    { id: '2030', name: 'Admin and lab building', s: 0.3, e: 0.5 },
  ] },
  { code: 'MEC', name: 'Mechanical', acts: [
    { id: '3010', name: 'Pumps, blowers and mixers, supply', s: 0.2, e: 0.55 },
    { id: '3020', name: 'Equipment erection', s: 0.55, e: 0.78, crit: true },
    { id: '3030', name: 'Process piping', s: 0.5, e: 0.8 },
  ] },
  { code: 'EIC', name: 'Electrical and controls', acts: [
    { id: '4010', name: 'MCC panels and SCADA', s: 0.6, e: 0.85 },
  ] },
  { code: 'COM', name: 'Commissioning', acts: [
    { id: '5010', name: 'Hydro tests', s: 0.8, e: 0.88 },
    { id: '5020', name: 'Process stabilisation', s: 0.88, e: 0.98, crit: true },
    { id: '5030', name: 'Handover to the client', s: 1, e: 1, crit: true },
  ] },
];

export interface ProgrammeDef {
  /** Contract length in months. */
  months: number;
  /** Where the baseline says the project should be today, in %. */
  planned: number;
  prefix: string;
  groups: GroupDef[];
}

/** Keyed by Project.key. `planned` against Project.progress gives the schedule position. */
export const PROGRAMMES: Record<string, ProgrammeDef> = {
  vad: { months: 24, planned: 70, prefix: 'VAD', groups: SUBSTATION },
  che: { months: 30, planned: 45, prefix: 'CMP3', groups: METRO },
  jai: { months: 14, planned: 91, prefix: 'JSP', groups: SOLAR },
  bha: { months: 18, planned: 57, prefix: 'BHD', groups: SOLAR },
  kut: { months: 20, planned: 34, prefix: 'KHS', groups: SOLAR },
  dah: { months: 16, planned: 22, prefix: 'DETP', groups: WATER },
  tri: { months: 18, planned: 93, prefix: 'TTL', groups: LINE },
};

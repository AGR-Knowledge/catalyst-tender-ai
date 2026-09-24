/**
 * Bills of quantities. Items come from one catalogue shared by every bid, so the
 * same line (say, RCC M30 in foundations) can be compared across tenders. Each
 * bid's bill is a set of shares of its value; quantities and rates are derived
 * in domain/boq.ts so the bill always totals to the value on the register.
 */

export type BoqClass = 'self' | 'sub' | 'open';

export interface CatalogueItem {
  code: string;
  desc: string;
  unit: string;
  /** Typical rate in ₹ per unit across the decided set, before any bid's own factor. */
  rate: number;
  /** Lump-sum items are priced as one lot and cannot be compared on rate. */
  lump?: boolean;
}

export const CATALOGUE: Record<string, CatalogueItem> = {
  EXC: { code: 'EXC', desc: 'Excavation in all soils, including disposal', unit: 'cum', rate: 420 },
  PCC: { code: 'PCC', desc: 'Plain cement concrete M15, levelling course', unit: 'cum', rate: 6_800 },
  RCC: { code: 'RCC', desc: 'Reinforced cement concrete M30 in foundations', unit: 'cum', rate: 11_500 },
  REB: { code: 'REB', desc: 'Reinforcement steel Fe 500D, cut, bent and placed', unit: 'MT', rate: 78_000 },
  SST: { code: 'SST', desc: 'Structural steel, fabricated and erected', unit: 'MT', rate: 1_12_000 },
  PIL: { code: 'PIL', desc: 'Bored cast-in-situ piles, 1,200 mm', unit: 'm', rate: 38_000 },
  EMB: { code: 'EMB', desc: 'Embankment with approved borrow material', unit: 'cum', rate: 760 },
  GSB: { code: 'GSB', desc: 'Granular sub-base, Grade I', unit: 'cum', rate: 2_200 },
  DBM: { code: 'DBM', desc: 'Dense bituminous macadam, 50 mm', unit: 'sqm', rate: 900 },
  SWD: { code: 'SWD', desc: 'RCC storm-water drain, 1.2 m wide', unit: 'm', rate: 18_500 },
  PEB: { code: 'PEB', desc: 'Pre-engineered building, erected and clad', unit: 'sqm', rate: 26_000 },
  GIS: { code: 'GIS', desc: '400 kV GIS bay, supply, erection and testing', unit: 'bay', rate: 14_20_00_000 },
  TRF: { code: 'TRF', desc: '315 MVA power transformer, delivered and erected', unit: 'no', rate: 20_60_00_000 },
  TWR: { code: 'TWR', desc: 'Transmission tower steel, galvanised and erected', unit: 'MT', rate: 1_05_000 },
  CON: { code: 'CON', desc: 'ACSR Moose conductor, strung and sagged', unit: 'km', rate: 6_40_000 },
  CBL: { code: 'CBL', desc: 'Control and power cabling, laid and terminated', unit: 'km', rate: 4_80_000 },
  EAR: { code: 'EAR', desc: 'Earthing and lightning protection', unit: 'lot', rate: 0, lump: true },
  SCA: { code: 'SCA', desc: 'SCADA, control and protection', unit: 'lot', rate: 0, lump: true },
  TNC: { code: 'TNC', desc: 'Testing and commissioning', unit: 'lot', rate: 0, lump: true },
  SIT: { code: 'SIT', desc: 'Site establishment and temporary works', unit: 'lot', rate: 0, lump: true },
  MMS: { code: 'MMS', desc: 'Module mounting structure, galvanised', unit: 'MT', rate: 98_000 },
  INV: { code: 'INV', desc: 'Inverter station, 3.2 MW, installed', unit: 'no', rate: 1_62_00_000 },
  MVC: { code: 'MVC', desc: '33 kV cabling, trenched and jointed', unit: 'km', rate: 22_00_000 },
  PIP: { code: 'PIP', desc: 'Carbon steel line pipe, 24 inch, laid and welded', unit: 'm', rate: 46_000 },
  SPL: { code: 'SPL', desc: 'Piping spools, fabricated and erected', unit: 'inch-dia', rate: 2_350 },
  PMP: { code: 'PMP', desc: 'Pumping station, mechanical and electrical', unit: 'no', rate: 36_00_00_000 },
  HYD: { code: 'HYD', desc: 'Hydrotest, pigging and pre-commissioning', unit: 'lot', rate: 0, lump: true },
  DIP: { code: 'DIP', desc: 'DI K9 pipe, 1,000 mm, laid and jointed', unit: 'm', rate: 31_000 },
  PRC: { code: 'PRC', desc: 'Treatment process equipment, supplied and erected', unit: 'lot', rate: 0, lump: true },
  RES: { code: 'RES', desc: 'RCC service reservoir', unit: 'ML', rate: 1_80_00_000 },
  TRK: { code: 'TRK', desc: 'Ballastless track, laid and aligned', unit: 'track m', rate: 42_000 },
  OHE: { code: 'OHE', desc: '25 kV overhead equipment, erected', unit: 'TKM', rate: 58_00_000 },
  UTL: { code: 'UTL', desc: 'Utility piping and cooling water network', unit: 'm', rate: 28_000 },
};

export interface BoqTemplateLine { code: string; share: number; cls: BoqClass; why: string; bill: string }

/** Bill structure by sector. Shares add to 1. */
export const TEMPLATES: Record<string, BoqTemplateLine[]> = {
  Power: [
    { bill: 'Civil', code: 'EXC', share: 0.018, cls: 'self', why: 'Earthworks, own fleet' },
    { bill: 'Civil', code: 'RCC', share: 0.11, cls: 'self', why: 'Foundations, self-performed on every substation' },
    { bill: 'Civil', code: 'REB', share: 0.062, cls: 'self', why: 'Bought against the steel index' },
    { bill: 'Electrical', code: 'GIS', share: 0.23, cls: 'sub', why: 'OEM supply and erection' },
    { bill: 'Electrical', code: 'TRF', share: 0.17, cls: 'sub', why: 'OEM supply' },
    { bill: 'Line', code: 'TWR', share: 0.16, cls: 'self', why: 'Tower erection crews in house' },
    { bill: 'Line', code: 'CON', share: 0.08, cls: 'self', why: 'Stringing gangs in house' },
    { bill: 'Electrical', code: 'CBL', share: 0.05, cls: 'sub', why: 'Cabling subcontract' },
    { bill: 'Electrical', code: 'SCA', share: 0.07, cls: 'sub', why: 'Specialist protection vendor' },
    { bill: 'General', code: 'TNC', share: 0.05, cls: 'self', why: 'In-house commissioning team' },
  ],
  Transport: [
    { bill: 'Earthworks', code: 'EXC', share: 0.04, cls: 'self', why: 'Own fleet' },
    { bill: 'Earthworks', code: 'EMB', share: 0.15, cls: 'self', why: 'Core capability, own excavators' },
    { bill: 'Pavement', code: 'GSB', share: 0.08, cls: 'self', why: 'Own crushing plant' },
    { bill: 'Pavement', code: 'DBM', share: 0.12, cls: 'sub', why: 'Bituminous works subcontracted on past jobs' },
    { bill: 'Structures', code: 'PIL', share: 0.11, cls: 'sub', why: 'Piling specialist' },
    { bill: 'Structures', code: 'RCC', share: 0.19, cls: 'self', why: 'Self-performed' },
    { bill: 'Structures', code: 'REB', share: 0.09, cls: 'self', why: 'Bought against the steel index' },
    { bill: 'Structures', code: 'SST', share: 0.1, cls: 'sub', why: 'Girder fabrication subcontracted' },
    { bill: 'Systems', code: 'SCA', share: 0.06, cls: 'open', why: 'Traffic and signalling systems are outside the service catalogue' },
    { bill: 'General', code: 'SIT', share: 0.06, cls: 'self', why: 'Own site set-up' },
  ],
  Renewables: [
    { bill: 'Civil', code: 'EXC', share: 0.03, cls: 'self', why: 'Own fleet' },
    { bill: 'Civil', code: 'PIL', share: 0.12, cls: 'sub', why: 'Ram-piling subcontract' },
    { bill: 'Civil', code: 'RCC', share: 0.08, cls: 'self', why: 'Self-performed' },
    { bill: 'Mechanical', code: 'MMS', share: 0.22, cls: 'sub', why: 'Structure supplier installs' },
    { bill: 'Electrical', code: 'INV', share: 0.2, cls: 'sub', why: 'OEM supply' },
    { bill: 'Electrical', code: 'MVC', share: 0.15, cls: 'self', why: 'Cabling gangs in house' },
    { bill: 'Electrical', code: 'SCA', share: 0.1, cls: 'sub', why: 'Specialist SCADA vendor' },
    { bill: 'General', code: 'TNC', share: 0.1, cls: 'self', why: 'In-house commissioning' },
  ],
  'Oil & gas': [
    { bill: 'Civil', code: 'EXC', share: 0.05, cls: 'self', why: 'Own fleet' },
    { bill: 'Civil', code: 'RCC', share: 0.09, cls: 'self', why: 'Self-performed' },
    { bill: 'Mechanical', code: 'PIP', share: 0.34, cls: 'self', why: 'Pipeline spreads in house' },
    { bill: 'Mechanical', code: 'SPL', share: 0.16, cls: 'sub', why: 'Spool fabrication shop' },
    { bill: 'Mechanical', code: 'SST', share: 0.08, cls: 'sub', why: 'Pipe racks subcontracted' },
    { bill: 'Mechanical', code: 'PMP', share: 0.14, cls: 'sub', why: 'Packaged pump vendor' },
    { bill: 'Electrical', code: 'CBL', share: 0.06, cls: 'sub', why: 'Cabling subcontract' },
    { bill: 'General', code: 'HYD', share: 0.08, cls: 'self', why: 'In-house testing crew' },
  ],
  Water: [
    { bill: 'Civil', code: 'EXC', share: 0.06, cls: 'self', why: 'Own fleet' },
    { bill: 'Pipeline', code: 'DIP', share: 0.3, cls: 'self', why: 'Pipe-laying gangs in house' },
    { bill: 'Civil', code: 'RCC', share: 0.14, cls: 'self', why: 'Self-performed' },
    { bill: 'Civil', code: 'REB', share: 0.06, cls: 'self', why: 'Bought against the steel index' },
    { bill: 'Civil', code: 'RES', share: 0.12, cls: 'self', why: 'Reservoirs self-performed' },
    { bill: 'Process', code: 'PRC', share: 0.18, cls: 'sub', why: 'Process technology partner' },
    { bill: 'Mechanical', code: 'PMP', share: 0.09, cls: 'sub', why: 'Packaged pump vendor' },
    { bill: 'Electrical', code: 'SCA', share: 0.05, cls: 'open', why: 'Instrumentation outside the catalogue at this size' },
  ],
  'Urban infra': [
    { bill: 'Earthworks', code: 'EXC', share: 0.08, cls: 'self', why: 'Own fleet' },
    { bill: 'Roads', code: 'GSB', share: 0.14, cls: 'self', why: 'Own crushing plant' },
    { bill: 'Roads', code: 'DBM', share: 0.2, cls: 'sub', why: 'Bituminous works subcontracted' },
    { bill: 'Drainage', code: 'SWD', share: 0.26, cls: 'self', why: 'Self-performed' },
    { bill: 'Utilities', code: 'DIP', share: 0.14, cls: 'self', why: 'Pipe-laying gangs in house' },
    { bill: 'Utilities', code: 'CBL', share: 0.1, cls: 'sub', why: 'Street lighting subcontract' },
    { bill: 'General', code: 'SIT', share: 0.08, cls: 'self', why: 'Own site set-up' },
  ],
  Industrial: [
    { bill: 'Civil', code: 'EXC', share: 0.03, cls: 'self', why: 'Own fleet' },
    { bill: 'Civil', code: 'RCC', share: 0.14, cls: 'self', why: 'Self-performed' },
    { bill: 'Civil', code: 'REB', share: 0.07, cls: 'self', why: 'Bought against the steel index' },
    { bill: 'Structural', code: 'SST', share: 0.16, cls: 'sub', why: 'Fabrication subcontracted' },
    { bill: 'Buildings', code: 'PEB', share: 0.1, cls: 'sub', why: 'PEB supplier erects' },
    { bill: 'Mechanical', code: 'UTL', share: 0.26, cls: 'self', why: 'Piping crews in house' },
    { bill: 'Electrical', code: 'CBL', share: 0.12, cls: 'sub', why: 'Cabling subcontract' },
    { bill: 'General', code: 'TNC', share: 0.12, cls: 'self', why: 'In-house commissioning' },
  ],
  Buildings: [
    { bill: 'Civil', code: 'EXC', share: 0.05, cls: 'self', why: 'Own fleet' },
    { bill: 'Civil', code: 'RCC', share: 0.36, cls: 'self', why: 'Self-performed' },
    { bill: 'Civil', code: 'REB', share: 0.16, cls: 'self', why: 'Bought against the steel index' },
    { bill: 'Services', code: 'CBL', share: 0.14, cls: 'sub', why: 'MEP subcontract' },
    { bill: 'Services', code: 'PRC', share: 0.21, cls: 'open', why: 'Medical equipment is outside the catalogue' },
    { bill: 'General', code: 'SIT', share: 0.08, cls: 'self', why: 'Own site set-up' },
  ],
};

/**
 * T-2026-041 is priced in detail: its subcontract lines are the nine RFQ
 * packages from Stage 2, so their status follows the Package board.
 */
export const FOCUS_BOQ: (BoqTemplateLine & { pkg?: string })[] = [
  { bill: 'Civil', code: 'EXC', share: 0.014, cls: 'self', why: 'Earthworks, own fleet' },
  { bill: 'Civil', code: 'RCC', share: 0.094, cls: 'sub', why: 'Foundations package', pkg: 'civil' },
  { bill: 'Civil', code: 'REB', share: 0.052, cls: 'self', why: 'Bought against the steel index' },
  { bill: 'Civil', code: 'SST', share: 0.064, cls: 'sub', why: 'Structural steel package', pkg: 'steel' },
  { bill: 'Electrical', code: 'GIS', share: 0.206, cls: 'sub', why: 'Switchgear package', pkg: 'sw' },
  { bill: 'Electrical', code: 'TRF', share: 0.17, cls: 'sub', why: 'Transformer package', pkg: 'tx' },
  { bill: 'Electrical', code: 'CBL', share: 0.048, cls: 'sub', why: 'HV cabling package', pkg: 'hv' },
  { bill: 'Electrical', code: 'SCA', share: 0.062, cls: 'sub', why: 'Control and protection package', pkg: 'cp' },
  { bill: 'Electrical', code: 'EAR', share: 0.018, cls: 'sub', why: 'Earthing package', pkg: 'earth' },
  { bill: 'Line', code: 'TWR', share: 0.13, cls: 'self', why: 'Tower erection crews in house, 62 km' },
  { bill: 'Line', code: 'CON', share: 0.074, cls: 'self', why: 'Stringing gangs in house' },
  { bill: 'General', code: 'SIT', share: 0.03, cls: 'sub', why: 'Site establishment package', pkg: 'site' },
  { bill: 'General', code: 'TNC', share: 0.038, cls: 'sub', why: 'Testing package, in-house option priced alongside', pkg: 'tc' },
];

/** Lines in the full bill for each sector; only the roll-up by item is shown. */
export const LINE_COUNT: Record<string, number> = {
  Power: 212, Transport: 184, Renewables: 126, 'Oil & gas': 168, Water: 142, 'Urban infra': 118, Industrial: 156, Buildings: 94,
};

/** A rate more than this far from the median of other bids is flagged. */
export const RATE_TOLERANCE = 8;

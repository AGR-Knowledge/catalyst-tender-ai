import type { Ccy } from '../fx';
import type { GccTenantKey } from '../index';

/**
 * Parts for the fictional tenders of the generated history (plan 017 §3.2).
 * Place names are real; issuers are invented in the style of the hero's
 * "Eastern Cities Water Services Company" and are never a real authority or
 * company. Value ranges are in major units of the tenant currency.
 */

export interface SectorPool {
  /** Work types: "STP expansion" becomes "Qatif STP expansion". */
  works: string[];
  /** Min and max value, major units. */
  value: [number, number];
  teamId: string;
}

export interface TenantPool {
  ccy: Ccy;
  country: string;
  cities: string[];
  issuers: string[];
  /** Keyed by the tenant's sector names (data/tenants.ts). */
  sectors: Record<string, SectorPool>;
  /** Portal host for `.example` notice URLs, keyed by source id; sources not listed get no URL. */
  hosts: Record<string, string>;
  /** Source ids with their share of new tenders. */
  sourceMix: [string, number][];
}

const M = 1_000_000;

export const POOLS: Record<GccTenantKey, TenantPool> = {
  najd: {
    ccy: 'SAR',
    country: 'Saudi Arabia',
    cities: ['Riyadh', 'Jeddah', 'Dammam', 'Makkah', 'Madinah', 'Taif', 'Tabuk', 'Hail', 'Buraydah', 'Unaizah', 'Abha', 'Khamis Mushait',
      'Jazan', 'Najran', 'Hofuf', 'Jubail', 'Yanbu', 'Al-Kharj', 'Sakaka', 'Arar', 'Al-Baha', 'Qatif', 'Khobar', 'Hafr Al-Batin', 'Bisha',
      'Rabigh', 'Al-Qunfudhah', 'Al-Majmaah'],
    issuers: ['Central Cities Water Services Company', 'Eastern Cities Water Services Company (ECWS)', 'Northern Cities Water Services Company',
      'Southern Cities Water Services Company', 'Western Cities Water Services Company', 'Eastern Province Roads Programme Office',
      'Central Region Roads Programme Office', 'Western Region Municipal Projects Office', 'Gulf Coast Industrial Utilities Company'],
    sectors: {
      'Water and wastewater': {
        works: ['STP expansion', 'STP upgrade', 'water treatment plant', 'sewage lift stations', 'treated effluent pipeline', 'water reservoirs',
          'water storage tanks', 'wastewater treatment plant rehabilitation', 'sludge treatment facility', 'industrial wastewater treatment',
          'pumping stations upgrade', 'odour control upgrade', 'TSE reuse scheme'],
        value: [120 * M, 520 * M], teamId: 'najd-water',
      },
      'Utility networks': {
        works: ['water distribution network', 'sewer network extension', 'water transmission pipeline', 'trunk sewer', 'stormwater drainage network',
          'house connections programme', 'sewer rehabilitation', 'stormwater pumping stations', 'water network rehabilitation', 'utility corridor',
          'force main replacement', 'district metering zones'],
        value: [90 * M, 420 * M], teamId: 'najd-networks',
      },
      Roads: {
        works: ['ring road, section 3', 'road dualling', 'interchange upgrade', 'access road', 'bypass', 'urban roads package', 'road rehabilitation',
          'expressway, section 2', 'service roads', 'bridges and culverts package', 'road widening', 'industrial area roads'],
        value: [80 * M, 380 * M], teamId: 'najd-networks',
      },
    },
    hosts: { etimad: 'etimad.example', 'nwu-portal': 'nwu-suppliers.example', 'industrial-portal': 'industrial-utilities.example',
      'og-portal': 'og-vendors.example', 'municipal-listing': 'ep-municipal.example' },
    sourceMix: [['etimad', 70], ['nwu-portal', 8], ['industrial-portal', 5], ['municipal-listing', 5], ['mail-tenders', 8], ['mail-bids', 3], ['scan', 1]],
  },
  corniche: {
    ccy: 'AED',
    country: 'United Arab Emirates',
    cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Al Ain', 'Umm Al Quwain', 'Dubai Marina', 'Business Bay',
      'Jumeirah', 'Deira', 'Al Barsha', 'Dubai South', 'Jebel Ali', 'Al Reem Island', 'Yas Island', 'Saadiyat', 'Khalifa City', 'Mussafah',
      'Al Qusais', 'Mirdif'],
    issuers: ['Crescent Bay Health Holding', 'Gulfshore Hospitality Developments', 'Emirates Cooling Utilities Company', 'Sharjah Campus Development Office',
      'Palm Crescent Properties', 'Northern Emirates Education Projects Office', 'Desert Rose Developments', 'Harbour Gate Real Estate'],
    sectors: {
      'Buildings MEP': {
        works: ['hospital MEP package', 'office tower MEP', 'residential towers MEP', 'school campus MEP', 'hotel MEP works', 'university labs MEP',
          'mall extension MEP', 'data centre MEP', 'airport terminal MEP', 'civic centre MEP', 'metro depot MEP', 'villa community MEP'],
        value: [60 * M, 520 * M], teamId: 'corniche-mep',
      },
      'District cooling': {
        works: ['district cooling plant', 'chilled water network', 'thermal energy storage tank', 'cooling plant expansion', 'chiller replacement programme',
          'district cooling network extension', 'cooling tower replacement', 'energy transfer stations', 'cooling plant retrofit', 'chilled water pipeline',
          'cooling plant, Phase 2', 'thermal storage and pumping upgrade'],
        value: [80 * M, 480 * M], teamId: 'corniche-mep',
      },
      'Fit-out': {
        works: ['hotel fit-out', 'office fit-out', 'airport lounge fit-out', 'museum fit-out', 'retail fit-out', 'hospital refurbishment', 'clinic fit-out',
          'school refurbishment', 'residential refurbishment', 'restaurant fit-out', 'headquarters fit-out', 'auditorium fit-out'],
        value: [50 * M, 300 * M], teamId: 'corniche-mep',
      },
    },
    hosts: { 'dubai-portal': 'tejari.example', 'abudhabi-portal': 'tejari.example', 'etimad-watch': 'etimad.example' },
    sourceMix: [['dubai-portal', 45], ['abudhabi-portal', 35], ['mail', 17], ['etimad-watch', 3]],
  },
  dafna: {
    ccy: 'QAR',
    country: 'Qatar',
    cities: ['Doha', 'Al Rayyan', 'Al Wakrah', 'Al Khor', 'Lusail', 'Umm Salal', 'Mesaieed', 'Al Daayen', 'Al Shamal', 'Dukhan', 'Ras Laffan',
      'Al Sadd', 'West Bay', 'Al Thumama', 'Al Gharrafa', 'Abu Hamour', 'Muaither', 'Simaisma', 'Education City', 'Al Sailiya', 'Al Wukair'],
    issuers: ['Northern Growth Corridor Authority', 'Doha Drainage Works Authority', 'Southern Municipalities Drainage Office',
      'Peninsula Public Works Office', 'Central Doha Utilities Programme', 'Industrial Cities Infrastructure Office'],
    sectors: {
      'Civil works': {
        works: ['roads and utilities package', 'deep sewer shaft works', 'drainage tunnel shafts', 'utility diversions', 'groundwater control works',
          'stormwater outfall', 'retaining structures', 'box culverts package', 'site enabling works', 'road and drainage upgrade', 'marine outfall civil works',
          'underpass civil works'],
        value: [45 * M, 360 * M], teamId: 'dafna-utilities',
      },
      'Utility networks': {
        works: ['sewer network', 'storm drainage network', 'treated effluent main', 'foul water pumping main', 'utility corridor', 'trunk sewer',
          'water transmission main', 'house connections programme', 'sewer rehabilitation', 'district utilities', 'irrigation network', 'utility spur'],
        value: [50 * M, 380 * M], teamId: 'dafna-utilities',
      },
      'Pump stations': {
        works: ['pump station upgrade', 'pumping station', 'pump station refurbishment', 'lift stations package', 'stormwater pumping station',
          'booster station', 'pump station rehabilitation', 'terminal pumping station', 'surge protection works', 'pumping station, Phase 2',
          'wet well rehabilitation', 'pump station electrical upgrade'],
        value: [45 * M, 260 * M], teamId: 'dafna-utilities',
      },
    },
    hosts: { monaqasat: 'monaqasat.example', 'etimad-branch': 'etimad.example' },
    sourceMix: [['monaqasat', 72], ['mail', 22], ['etimad-branch', 6]],
  },
  batinah: {
    ccy: 'OMR',
    country: 'Oman',
    cities: ['Sohar', 'Muscat', 'Nizwa', 'Sur', 'Ibri', 'Barka', 'Rustaq', 'Saham', 'Shinas', 'Liwa', 'Duqm', 'Salalah', 'Buraimi', 'Ibra',
      'Bahla', 'Seeb', 'Suwaiq', 'Musannah', 'Khabourah', 'Yanqul', 'Adam', 'Samail', 'Bidbid'],
    issuers: ['Interior Links Roads Authority', 'Capital Area Roads Directorate', 'Batinah Coastal Roads Office', 'Dhofar Regional Works Office',
      'Northern Governorates Roads Programme', 'Port Cities Access Roads Office'],
    sectors: {
      Roads: {
        works: ['road dualling', 'ring road, section 3', 'bypass', 'coastal road widening', 'interchange', 'access road', 'truck route', 'service roads',
          'dual carriageway', 'mountain road improvement', 'industrial estate roads', 'internal roads'],
        value: [3 * M, 36 * M], teamId: 'batinah-roads',
      },
      Bridges: {
        works: ['wadi bridges', 'wadi crossing', 'interchange bridges', 'bridge widening', 'pedestrian bridges package', 'flyover', 'wadi crossing bridges',
          'bridge rehabilitation', 'viaduct', 'culverts and bridges package', 'bridge strengthening', 'overpass'],
        value: [3 * M, 32 * M], teamId: 'batinah-roads',
      },
      Earthworks: {
        works: ['flood protection earthworks', 'freezone earthworks', 'bypass earthworks', 'access embankment', 'site grading package', 'wadi training works',
          'quarry access earthworks', 'port platform earthworks', 'cut and fill package', 'dam embankment works', 'land reclamation earthworks',
          'road formation earthworks'],
        value: [3 * M, 30 * M], teamId: 'batinah-roads',
      },
    },
    hosts: { 'tender-board': 'tenderboard.example' },
    sourceMix: [['tender-board', 80], ['mail-bids', 15], ['scan', 5]],
  },
  qurain: {
    ccy: 'KWD',
    country: 'Kuwait',
    cities: ['Kuwait City', 'Jahra', 'Ahmadi', 'Farwaniya', 'Hawalli', 'Mubarak Al-Kabeer', 'Fahaheel', 'Salmiya', 'Shuwaikh', 'Sulaibiya', 'Wafra',
      'Abdali', 'Kabd', 'Mutlaa', 'Subiya', 'Khairan', 'Mina Abdullah', 'Jaber Al-Ahmad', 'Sabah Al-Ahmad', 'Abdullah Al-Mubarak', 'Mangaf', 'Fintas'],
    issuers: ['Southern Governorates Sanitation Agency', 'National Water Grid Projects Office', 'Northern Governorates Public Works Office',
      'Coastal Infrastructure Projects Office', 'Upstream Facilities Engineering Company', 'Housing Cities Utilities Programme'],
    sectors: {
      Water: {
        works: ['STP rehabilitation', 'pumping main', 'sewer network', 'effluent reuse line', 'water reservoirs', 'sewer rehabilitation', 'pumping station',
          'water transmission line', 'water network', 'sewer upgrade', 'sewage treatment rehabilitation', 'water storage tanks'],
        value: [4 * M, 55 * M], teamId: 'qurain-water',
      },
      Infrastructure: {
        works: ['storm drainage', 'road and utilities package', 'port utilities', 'city utilities', 'storm outfall', 'district utilities', 'housing utilities',
          'stormwater network', 'utility corridor', 'service roads and drainage', 'infrastructure package', 'drainage tunnels'],
        value: [5 * M, 58 * M], teamId: 'qurain-water',
      },
      'Oil and gas facilities': {
        works: ['water injection plant', 'gathering centre upgrade', 'produced water treatment', 'tank farm civil works', 'effluent treatment',
          'gas plant utilities', 'cooling water system', 'water injection pipeline', 'flowline replacement', 'firewater network', 'booster station civil works',
          'produced water pipeline'],
        value: [4 * M, 42 * M], teamId: 'qurain-water',
      },
    },
    hosts: { capt: 'capt.example', 'etimad-arabia': 'etimad.example', 'og-portal': 'og-vendors.example' },
    sourceMix: [['capt', 68], ['mail', 17], ['og-portal', 10], ['etimad-arabia', 5]],
  },
};

/** "ECWS" from "Eastern Cities Water Services Company (ECWS)", else the initials: "CCWSC" → trimmed to four letters. */
export function acronymOf(issuer: string): string {
  const paren = issuer.match(/\(([A-Z]{2,6})\)/);
  if (paren) return paren[1];
  return issuer.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).join('').slice(0, 5);
}

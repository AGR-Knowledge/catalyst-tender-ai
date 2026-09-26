import type { Ccy } from '../fx';
import type { Incoterm } from './types';

/**
 * Scripted supplier replies for the demo (orchestrator contract, wave 4).
 *
 * After a demo sends RFQs on a demo tender, "Simulate supplier replies"
 * (plan 008b, a labelled demo control; plan 014's "Advance agent work" calls
 * the same thing) submits these replies through the Supplier Portal write
 * (`supplierQuoteWrite`), so the quotes arrive the way a real one does and
 * levelling has something to level. Nothing here is live data.
 *
 * - 008b adds the hero's replies (T-2026-118, every GCC tenant that pursues it).
 * - 022 adds Corniche's T-2026-061; 023 adds Batinah's T-2026-042.
 *   Append to your own tenant's list only; don't reorder others.
 *
 * Each reply carries the levelling traps the demo shows (spec §8.6): a foreign
 * currency, VAT included or not stated, ex-works delivery, a short validity,
 * an exclusion. `vatInclusive` and `incoterm` feed the levelled quote (008b
 * makes the portal quote read them; the portal default is DAP site, VAT excluded).
 */
export interface ScriptedReply {
  tenderId: string;
  packageId: string;
  supplierId: string;
  /** Minutes after the RFQ was sent that the reply "arrives" (for the time shown). */
  afterMinutes: number;
  level: 'line' | 'package';
  amount: number;
  ccy: Ccy;
  validityDays: number;
  leadTimeWeeks: number;
  deviations: string[];
  exclusions: string[];
  fileName: string;
  vatInclusive?: boolean;
  incoterm?: Incoterm;
  /** A supplier that declines instead, with its reason. */
  declines?: string;
}

// The hero, T-2026-118 (plan 008b). SAR is the bid currency in every tenant (booklet §28); the RFQs ask for
// 120 days' validity (bid validity 90 days + 30). Gulf Process Systems' P-02 RFQ is left unanswered in Najd and
// Dafna, so the presenter can answer it in the Supplier Portal preview.
type HeroQuoteExtra = Partial<Pick<ScriptedReply, 'deviations' | 'exclusions' | 'vatInclusive' | 'incoterm'>>;
const heroQuote = (
  packageId: string, supplierId: string, afterMinutes: number, level: 'line' | 'package', amount: number, ccy: Ccy,
  validityDays: number, leadTimeWeeks: number, fileName: string, extra: HeroQuoteExtra = {},
): ScriptedReply => ({ tenderId: 'T-2026-118', packageId, supplierId, afterMinutes, level, amount, ccy, validityDays, leadTimeWeeks, deviations: [], exclusions: [], fileName, ...extra });
const heroDecline = (packageId: string, supplierId: string, afterMinutes: number, level: 'line' | 'package', declines: string): ScriptedReply =>
  ({ tenderId: 'T-2026-118', packageId, supplierId, afterMinutes, level, amount: 0, ccy: 'SAR', validityDays: 0, leadTimeWeeks: 0, deviations: [], exclusions: [], fileName: '', declines });

// Corniche's T-2026-061 (plan 022). AED is the bid currency (ITT 8.1); the RFQs ask for 150 days' validity (bid
// validity 120 days + 30). P-01: EUR ex-works without the cooling towers, VAT included, a 30-day validity. P-02: one
// clean quote, one that excludes the AHU controls, and one in EUR delivered to site.
const cbhhQuote = (
  packageId: string, supplierId: string, afterMinutes: number, amount: number, ccy: Ccy, validityDays: number, leadTimeWeeks: number,
  fileName: string, extra: HeroQuoteExtra = {},
): ScriptedReply => ({ tenderId: 'T-2026-061', packageId, supplierId, afterMinutes, level: 'line', amount, ccy, validityDays, leadTimeWeeks, deviations: [], exclusions: [], fileName, ...extra });

// Batinah's T-2026-042 (plan 023). OMR is the bid currency (§8); the RFQs ask for 120 days' validity (bid validity
// 90 days + 30). P-04, imported bearings: EUR ex-works; a 45-day validity; an exclusion with a long lead time.
// P-05, street lighting: VAT included; one in USD; one that does not state VAT (the portal reads it as excluding VAT).
const ilraQuote = (
  packageId: string, supplierId: string, afterMinutes: number, amount: number, ccy: Ccy, validityDays: number, leadTimeWeeks: number,
  fileName: string, extra: HeroQuoteExtra = {},
): ScriptedReply => ({ tenderId: 'T-2026-042', packageId, supplierId, afterMinutes, level: 'line', amount, ccy, validityDays, leadTimeWeeks, deviations: [], exclusions: [], fileName, ...extra });

export const SCRIPTED_REPLIES: Record<'najd' | 'corniche' | 'dafna' | 'batinah' | 'qurain', ScriptedReply[]> = {
  najd: [
    // P-02: EUR ex-works with an exclusion; USD CIF with 60 days' validity; a lead time past the programme need.
    heroQuote('P-02', 'rhein-aqua', 42, 'line', 13_480_000, 'EUR', 150, 27, 'RAS-Q-26-0418_ECWS-P02.pdf', { incoterm: 'EXW', exclusions: ['Excludes installation supervision'] }),
    heroQuote('P-02', 'hanseong', 71, 'line', 14_420_000, 'USD', 60, 26, 'HWM-ECWS0147-P02-Rev0.pdf', { incoterm: 'CIF Dammam' }),
    heroQuote('P-02', 'vistula', 118, 'line', 13_150_000, 'EUR', 120, 34, 'VPE-2026-117.pdf'),
    // P-03: VAT included; two quotes and a decline, so the buyer accepts a gap.
    heroQuote('P-03', 'tamarisk', 26, 'line', 24_380_000, 'SAR', 120, 28, 'TWT-QT-0311.pdf', { vatInclusive: true }),
    heroQuote('P-03', 'nordklar', 55, 'line', 5_310_000, 'EUR', 120, 30, 'Nordklar_Offer_26-0092.pdf'),
    heroDecline('P-03', 'sahara-clearwater', 88, 'line', 'Filtration workshop committed to two Dubai projects until September 2026'),
    // P-04: an unpriced-scope exclusion, a declared deviation and a late lead time.
    heroQuote('P-04', 'gulf-process', 35, 'line', 18_940_000, 'SAR', 120, 30, 'GPS-ECWS-P04-Quote.pdf', { exclusions: ['Excludes commissioning spares'] }),
    heroQuote('P-04', 'castellan', 64, 'line', 4_690_000, 'EUR', 120, 30, 'CS-2026-0214.pdf'),
    heroQuote('P-04', 'salwa', 81, 'line', 18_420_000, 'SAR', 120, 33, 'SEE-Q-P04.pdf', { deviations: ['Belt thickener belt width 2.0 m against 2.5 m specified; same hydraulic capacity'] }),
    // P-05: three clean quotes, covered on arrival. Salwa ranks first; Khuzama second, with the better delivery record.
    heroQuote('P-05', 'khuzama', 22, 'package', 10_180_000, 'SAR', 150, 28, 'KAT-ECWS-Odour-Q1.pdf'),
    heroQuote('P-05', 'salwa', 47, 'package', 9_240_000, 'SAR', 120, 30, 'SEE-Q-P05.pdf'),
    heroQuote('P-05', 'odrana', 96, 'package', 9_560_000, 'SAR', 120, 32, 'OOC-26-044.pdf'),
    heroDecline('P-05', 'sahara-clearwater', 89, 'package', 'Filtration workshop committed to two Dubai projects until September 2026'),
  ],
  corniche: [
    cbhhQuote('P-01', 'arctis', 38, 2_340_000, 'EUR', 150, 30, 'ACT-Angebot-26-061-P01.pdf', { incoterm: 'EXW', exclusions: ['Excludes the cooling tower cells: chillers only'] }),
    cbhhQuote('P-01', 'tilal-thermal', 64, 13_125_000, 'AED', 150, 28, 'TTS-QT-0611.pdf', { vatInclusive: true }),
    cbhhQuote('P-01', 'warsan-thermal', 97, 12_180_000, 'AED', 30, 31, 'WTE-Q-26-061.pdf'),
    cbhhQuote('P-02', 'qarn-air', 45, 16_480_000, 'AED', 150, 18, 'QAHI-Q-061-P02.pdf'),
    cbhhQuote('P-02', 'barsha-em', 72, 17_350_000, 'AED', 150, 20, 'BEM-26-0412.pdf', { exclusions: ['Excludes the AHU control panels and DDC controllers'] }),
    cbhhQuote('P-02', 'kestrelwind', 110, 4_050_000, 'EUR', 150, 26, 'KWL-Angebot-2026-061.pdf', { incoterm: 'DAP site' }),
  ],
  dafna: [
    heroQuote('P-03', 'mosel-separation', 48, 'line', 5_240_000, 'EUR', 120, 30, 'MST-Angebot-26-031.pdf', { incoterm: 'EXW', exclusions: ['Excludes installation supervision'] }),
    // Qatar has no VAT: the levelling notes it as outside scope.
    heroQuote('P-03', 'wukair-env', 30, 'line', 21_150_000, 'QAR', 60, 28, 'AWES-QT-118.pdf', { vatInclusive: true }),
    heroQuote('P-03', 'fuwairit-water', 77, 'line', 22_400_000, 'SAR', 120, 31, 'FWE-2026-07.pdf'),
    heroQuote('P-05', 'wukair-env', 41, 'package', 9_380_000, 'SAR', 120, 30, 'AWES-QT-119.pdf'),
    heroQuote('P-05', 'fuwairit-water', 69, 'package', 9_910_000, 'SAR', 120, 29, 'FWE-2026-08.pdf'),
    heroQuote('P-09', 'kharrara-pipe', 53, 'line', 24_100_000, 'SAR', 60, 18, 'AKP-Q-2611.pdf'),
    heroQuote('P-09', 'shamal-pipe', 84, 'line', 23_700_000, 'SAR', 120, 20, 'SDP-0326.pdf', { exclusions: ['Excludes factory tests witnessed by the Entity'] }),
    heroQuote('P-11', 'gulf-process', 36, 'line', 11_260_000, 'SAR', 120, 26, 'GPS-ECWS-P11-Quote.pdf', { vatInclusive: true }),
    heroQuote('P-11', 'saale-pumpen', 58, 'line', 2_310_000, 'EUR', 120, 32, 'PWS-26-0457.pdf', { incoterm: 'EXW' }),
    heroDecline('P-11', 'duhail-bypass', 92, 'line', 'Surge vessels are outside our supply range; we quote bypass pumping only'),
  ],
  batinah: [
    ilraQuote('P-04', 'alpen-bearings', 36, 1_390_000, 'EUR', 120, 16, 'ABB-Angebot-26-0142_ILRA042.pdf', { incoterm: 'EXW' }),
    ilraQuote('P-04', 'emilia-giunti', 58, 1_450_000, 'EUR', 45, 18, 'EG-Offerta-2026-031.pdf'),
    ilraQuote('P-04', 'karst-bearings', 104, 1_340_000, 'EUR', 120, 20, 'KBB-26-077.pdf', { incoterm: 'EXW', exclusions: ['Excludes installation supervision'] }),
    ilraQuote('P-05', 'samail-lighting', 29, 2_180_000, 'OMR', 120, 12, 'SSL-Q-0342.pdf', { vatInclusive: true }),
    ilraQuote('P-05', 'jebel-lumen', 67, 5_310_000, 'USD', 120, 14, 'JLL-QT-26-0415.pdf'),
    ilraQuote('P-05', 'luminara', 95, 1_980_000, 'OMR', 120, 16, 'LUM-2026-OM-018.pdf', { deviations: ['LED luminaires rated 80,000 hours against 100,000 specified'] }),
  ],
  qurain: [
    heroQuote('P-06', 'qurtuba-power', 33, 'line', 1_590_000, 'KWD', 120, 38, 'QPS-26-0102.pdf'),
    heroQuote('P-06', 'rai-electrical', 57, 'line', 1_640_000, 'KWD', 60, 36, 'REC-Q-0417.pdf'),
    heroQuote('P-06', 'nuwaiseeb-electrical', 101, 'line', 1_520_000, 'KWD', 120, 44, 'NEW-2026-19.pdf'),
    heroQuote('P-08', 'mishref-controls', 28, 'line', 820_000, 'KWD', 120, 34, 'MCT-Q-081.pdf'),
    heroQuote('P-08', 'rai-electrical', 63, 'line', 790_000, 'KWD', 120, 36, 'REC-Q-0418.pdf', { exclusions: ['Excludes installation supervision'] }),
    heroDecline('P-08', 'qurtuba-power', 90, 'line', 'Our controls team is fully loaded on a refinery shutdown until June'),
    heroQuote('P-09', 'tyrol-armaturen', 44, 'line', 5_820_000, 'EUR', 120, 18, 'TA-2026-0633.pdf', { incoterm: 'EXW' }),
    heroQuote('P-09', 'mutla-steel', 25, 'line', 2_010_000, 'KWD', 120, 16, 'MSP-26-211.pdf'),
    heroQuote('P-09', 'ardiya-valve', 79, 'line', 1_960_000, 'KWD', 60, 19, 'AVF-Q-26-09.pdf'),
    heroQuote('P-11', 'gulf-process', 38, 'line', 11_320_000, 'SAR', 120, 26, 'GPS-ECWS-P11-Quote.pdf', { vatInclusive: true }),
    heroQuote('P-11', 'mangaf-pumps', 52, 'line', 790_000, 'KWD', 120, 28, 'MPS-26-077.pdf'),
    heroQuote('P-11', 'danube-surge', 86, 'line', 2_290_000, 'EUR', 120, 30, 'DSS-26-015.pdf', { incoterm: 'EXW', exclusions: ['Excludes installation supervision'] }),
  ],
};

/** The scripted replies for one package of one tender in one tenant. */
export const repliesFor = (tenant: string, tenderId: string, packageId: string): ScriptedReply[] =>
  (SCRIPTED_REPLIES[tenant as keyof typeof SCRIPTED_REPLIES] ?? []).filter((r) => r.tenderId === tenderId && r.packageId === packageId);

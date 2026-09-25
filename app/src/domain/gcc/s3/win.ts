import { gccData, isGccTenantKey } from '@/data/gcc';
import type { BidOutcome } from '@/data/gcc/types';
import { WIN_MODELS, type WinModel } from '@/data/gcc/s3';
import { MIN_N } from '@/data/gcc/targets';

/**
 * Win probability (pack §9.1, DEC-3): the sector hit rate plus each driver's
 * points, clamped to 5–95, with a band set by how many comparable bids the
 * model learned from, and a calibration note from the tenant's own history
 * (OUT-4). A recommendation of the Win-Probability & Recommendation agent,
 * never a decision.
 */

export const WIN_AGENT = 'Win-Probability & Recommendation agent';
export const LOW_DATA_TEXT = 'Fewer than 5 comparable bids: treat this score as a rough guide';

/** Uncertainty band, in points, from the number of comparables. */
export function bandFor(comparables: number): number {
  if (comparables >= 20) return 6;
  if (comparables >= 10) return 8;
  if (comparables >= 5) return 12;
  return 15;
}

// ---------------------------------------------------------------------------
// Calibration (OUT-4): predicted bands against actual win rates.

interface BandDef { key: string; label: string; phrase: string; test: (p: number) => boolean }

/** The OUT-4 bands of gcc-demo-data §5.1, highest first. */
const BANDS: BandDef[] = [
  { key: '>70', label: '> 70%', phrase: 'over 70%', test: (p) => p > 70 },
  { key: '50-70', label: '50–70%', phrase: 'between 50% and 70%', test: (p) => p >= 50 && p <= 70 },
  { key: '30-50', label: '30–50%', phrase: 'between 30% and 50%', test: (p) => p >= 30 && p < 50 },
  { key: '<30', label: '< 30%', phrase: 'under 30%', test: (p) => p < 30 },
];

/** Gap allowed between a band's average prediction and its actual win rate. */
const CALIBRATION_TOLERANCE = 10;
/** OUT-4 hides the table below this many outcomes. */
const CALIBRATION_MIN_N = 20;

export interface CalibrationBand {
  key: string;
  label: string;
  bids: number;
  won: number;
  /** Average predicted win probability in the band. */
  predicted: number;
  /** Won ÷ bids, as a percentage. */
  actual: number;
  /** Actual − predicted, in points. Negative = over-confident. */
  gap: number;
  /** Fewer than `MIN_N` bids: shown with its counts, not judged (dashboards.md §2). */
  smallSample: boolean;
  within: boolean;
}

export interface Calibration { n: number; enough: boolean; bands: CalibrationBand[]; text: string }

export function calibrationFor(outcomes: BidOutcome[]): Calibration {
  const decided = outcomes.filter((o) => (o.result === 'won' || o.result === 'lost') && o.predictedWin !== undefined);
  const n = decided.length;
  if (n < CALIBRATION_MIN_N) return { n, enough: false, bands: [], text: `Not enough outcomes yet to calibrate (${n} decided bids; ${CALIBRATION_MIN_N} needed)` };

  const bands = BANDS.map((b) => {
    const xs = decided.filter((o) => b.test(o.predictedWin!));
    const won = xs.filter((o) => o.result === 'won').length;
    const predicted = xs.length ? xs.reduce((s, o) => s + o.predictedWin!, 0) / xs.length : 0;
    const actual = xs.length ? (won / xs.length) * 100 : 0;
    const gap = actual - predicted;
    const smallSample = xs.length < MIN_N;
    return { key: b.key, label: b.label, bids: xs.length, won, predicted, actual, gap, smallSample, within: smallSample || Math.abs(gap) <= CALIBRATION_TOLERANCE };
  });

  const off = bands.filter((b) => !b.within);
  const lead = `Calibrated on ${n} decided bids`;
  if (!off.length) return { n, enough: true, bands, text: `${lead}: every band within ±${CALIBRATION_TOLERANCE} points` };
  const parts = off.map((b) => {
    const phrase = BANDS.find((d) => d.key === b.key)!.phrase;
    return `${phrase}, where the model is ${b.gap < 0 ? 'over-confident' : 'under-confident'} (${b.won} of ${b.bids} won)`;
  });
  return { n, enough: true, bands, text: `${lead}: bands within ±${CALIBRATION_TOLERANCE} points except ${parts.join(', and ')}` };
}

// ---------------------------------------------------------------------------

export interface WinDriverVM { key: string; label: string; points: number; pointsText: string; why: string; source: string }

export interface WinVM {
  tenderId: string;
  /** Win probability, %. */
  p: number;
  /** ± points. */
  band: number;
  /** "58 ± 8". */
  text: string;
  base: WinModel['base'];
  /** Largest effect first. */
  drivers: WinDriverVM[];
  /** Σ driver points. */
  sum: number;
  comparables: number;
  lowData: boolean;
  lowDataText?: string;
  calibration: string;
  movers: WinModel['movers'];
  bidders: string[];
  agent: string;
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

export const winModelOf = (tenant: string, tenderId: string) => WIN_MODELS.find((m) => m.tenant === tenant && m.tenderId === tenderId);

export function winFor(tenant: string, tenderId: string): WinVM | null {
  const m = winModelOf(tenant, tenderId);
  if (!m || !isGccTenantKey(tenant)) return null;
  const sum = m.drivers.reduce((s, d) => s + d.points, 0);
  const p = Math.min(95, Math.max(5, m.base.pct + sum));
  const band = bandFor(m.comparables);
  const lowData = m.comparables < 5;
  const drivers = m.drivers
    .map((d, i) => ({ d, i }))
    .sort((a, b) => Math.abs(b.d.points) - Math.abs(a.d.points) || a.i - b.i)
    .map(({ d }) => ({ key: d.key, label: d.label, points: d.points, pointsText: `${signed(d.points)} pts`, why: d.why, source: d.source }));
  return {
    tenderId,
    p,
    band,
    text: `${p} ± ${band}`,
    base: m.base,
    drivers,
    sum,
    comparables: m.comparables,
    lowData,
    ...(lowData ? { lowDataText: LOW_DATA_TEXT } : {}),
    calibration: calibrationFor(gccData(tenant).history.outcomes).text,
    movers: m.movers,
    bidders: m.bidders ?? [],
    agent: WIN_AGENT,
  };
}

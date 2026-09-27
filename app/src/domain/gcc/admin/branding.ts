import { TENANTS } from '@/data/tenants';

/**
 * Prospect branding (s1-s3-demo-spec §16, plan 024 Phase 4): before a meeting
 * the presenter sets the prospect's accent colour, logo and company name for
 * the current tenant, so the prospect sees their own company in the demo. The
 * one saved write in Administration.
 *
 * Key contract: `branding` in the tenant's `done`, holding JSON
 * `{ accent?, logo?: { dataUrl, name }, displayName?, at, byId }`. Reset demo
 * clears it with the rest of the tenant. "Restore defaults" writes a value
 * with no fields, which reads as no branding.
 */

export const BRANDING_KEY = 'branding';

/**
 * The accent palettes that exist in `tokens.css` (`--acc-{key}`, light and
 * dark). Each GCC tenant owns one by default; any may be chosen for a prospect.
 */
export type AccentKey = 'najd' | 'corniche' | 'dafna' | 'batinah' | 'qurain';

/** Palette order and the colour's name in words, for the swatches and the audit entry. */
export const ACCENTS: { key: AccentKey; name: string }[] = [
  { key: 'najd', name: 'teal' },
  { key: 'corniche', name: 'violet' },
  { key: 'dafna', name: 'amber' },
  { key: 'batinah', name: 'slate blue' },
  { key: 'qurain', name: 'crimson' },
];

export const isAccentKey = (v: unknown): v is AccentKey => ACCENTS.some((a) => a.key === v);
export const accentName = (k: AccentKey) => ACCENTS.find((a) => a.key === k)!.name;

/** The tenant's own palette, when it has one (the Indian preview keeps the neutral mark). */
export function defaultAccentOf(tenant: string): AccentKey | null {
  const a = TENANTS.find((t) => t.key === tenant)?.accent;
  return isAccentKey(a) ? a : null;
}

/** The brand tokens a palette sets, as inline style values. Both themes read well: the palette variables change with the theme. */
export function accentVars(k: AccentKey): Record<'--brand' | '--brand-soft' | '--brand-ink', string> {
  return { '--brand': `var(--acc-${k})`, '--brand-soft': `var(--acc-${k}-soft)`, '--brand-ink': `var(--acc-${k}-ink)` };
}

/* ------------------------------------------------------------------ the logo */

export const LOGO_MAX_KB = 200;
/** Shown at most this tall, wherever it appears. */
export const LOGO_MAX_PX = 32;
export const LOGO_TYPES: { mime: string; label: string }[] = [
  { mime: 'image/png', label: 'PNG' },
  { mime: 'image/jpeg', label: 'JPG' },
  { mime: 'image/svg+xml', label: 'SVG' },
];

/** The file input's `accept`. */
export const LOGO_ACCEPT = LOGO_TYPES.map((t) => t.mime).join(',');

const kb = (bytes: number) => Math.ceil(bytes / 1024);

/** Why a file can't be the logo, in words, or null when it can. */
export function logoProblem(file: { name: string; type: string; size: number }): string | null {
  if (!LOGO_TYPES.some((t) => t.mime === file.type)) {
    return `${file.name} is not a PNG, JPG or SVG image. Choose one of those.`;
  }
  if (file.size > LOGO_MAX_KB * 1024) {
    return `${file.name} is ${kb(file.size)} KB. The logo must be ${LOGO_MAX_KB} KB or smaller.`;
  }
  return null;
}

/* --------------------------------------------------------------- read, write */

export interface BrandingLogo { dataUrl: string; name: string }

export interface Branding {
  accent?: AccentKey;
  logo?: BrandingLogo;
  /** The prospect's company name, shown in place of the tenant's name in the company switcher only. */
  displayName?: string;
  at: string;
  byId: string;
}

/** What the Branding page saves. */
export type BrandingInput = Pick<Branding, 'accent' | 'logo' | 'displayName'>;

export const DISPLAY_NAME_MAX = 60;

const cleanName = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, DISPLAY_NAME_MAX) : '');

function cleanLogo(v: unknown): BrandingLogo | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const { dataUrl, name } = v as Record<string, unknown>;
  const ok = typeof dataUrl === 'string' && typeof name === 'string' && LOGO_TYPES.some((t) => dataUrl.startsWith(`data:${t.mime}`));
  return ok ? { dataUrl, name } : undefined;
}

/** The saved branding, or null when none is set (or it was restored to the defaults). Unknown or broken fields are dropped. */
export function brandingOf(done: Record<string, string>): Branding | null {
  const raw = done[BRANDING_KEY];
  if (!raw) return null;
  let v: Record<string, unknown>;
  try { v = JSON.parse(raw) as Record<string, unknown>; } catch { return null; }
  if (!v || typeof v !== 'object') return null;
  const accent = isAccentKey(v.accent) ? v.accent : undefined;
  const logo = cleanLogo(v.logo);
  const displayName = cleanName(v.displayName) || undefined;
  if (!accent && !logo && !displayName) return null;
  return {
    ...(accent ? { accent } : {}), ...(logo ? { logo } : {}), ...(displayName ? { displayName } : {}),
    at: typeof v.at === 'string' ? v.at : '', byId: typeof v.byId === 'string' ? v.byId : '',
  };
}

/**
 * The value to `mark()` under `BRANDING_KEY`. An accent equal to the tenant's
 * own is not stored, so "no accent" always means the tenant's own brand.
 */
export function brandingValue(tenant: string, input: BrandingInput, at: string, byId: string): string {
  const accent = input.accent && input.accent !== defaultAccentOf(tenant) ? input.accent : undefined;
  const displayName = cleanName(input.displayName) || undefined;
  return JSON.stringify({ ...(accent ? { accent } : {}), ...(input.logo ? { logo: input.logo } : {}), ...(displayName ? { displayName } : {}), at, byId });
}

/** "Accent violet, logo acme.svg, name “Acme Contracting”", or "Restored to the company’s own brand". */
export function brandingChangeText(tenant: string, input: BrandingInput): string {
  const accent = input.accent && input.accent !== defaultAccentOf(tenant) ? input.accent : undefined;
  const name = cleanName(input.displayName);
  const parts = [
    accent && `accent ${accentName(accent)}`,
    input.logo && `logo ${input.logo.name}`,
    name && `name “${name}”`,
  ].filter(Boolean) as string[];
  if (!parts.length) return 'Restored to the company’s own brand';
  const text = parts.join(', ');
  return text[0].toUpperCase() + text.slice(1);
}

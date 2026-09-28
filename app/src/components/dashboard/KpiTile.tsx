import type { Tone } from '@/data/types';
import type { DrillVM, TileVM } from '@/domain/gcc/viewmodels';
import { Masked } from '@/components/tender/Masked';
import { StatusPill } from '@/components/tender/StatusPill';
import { InfoTip } from './InfoTip';

/**
 * Words rather than a figure ("No results in this period") wrap in the body font
 * instead of the big mono. Longer figures ("SAR 3.09 bn", "1 won · 2 lost") step
 * down a size, so six tiles fit across at 1440 px without cutting the value.
 */
function sizeOf(s: string): string {
  if (s.length > 16 && /[a-z]{4,}/.test(s)) return 'long';
  if (s.length > 15) return 'xxs'; // "Thu 12 Mar, 10:00"
  if (s.length > 12) return 'xs';
  if (s.length > 9) return 'sm';
  if (s.length > 6) return 'md';
  return '';
}

/**
 * A tile's status words (dashboards.md §3), one per tone that judges the value.
 * A KPI's `status` replaces the word where the default would mislead ("Below
 * target", "Renew soon"); the glyph stays the tone's. Information tones (ink,
 * muted, cyan), neutral small samples and masked tiles show no pill.
 */
export const TILE_STATUS: Partial<Record<Tone, { label: string; icon: string }>> = {
  green: { label: 'On track', icon: '✓' },
  orange: { label: 'Watch', icon: '!' },
  red: { label: 'Off track', icon: '!' },
};

function statusOf(tile: TileVM): { label: string; tone: Tone; icon: string } | null {
  if (tile.masked || tile.smallSample || !tile.tone) return null;
  const s = TILE_STATUS[tile.tone];
  return s ? { label: tile.status ?? s.label, tone: tile.tone, icon: s.icon } : null;
}

/**
 * One KPI tile (dashboards.md §3), the same four rows on every tile: label, ⓘ
 * and the status pill; the value, in ink; one detail line (what the value is
 * made of); one reference line under a hairline ("Target 25%"), with the owner
 * chip at its right. Status is a word, never a coloured edge. A tile not yet
 * converted shows its full `sub` in place of the detail line.
 *
 * The rows are a subgrid of the tile row (`dashboard.css`), so the values,
 * details and reference lines of tiles side by side sit at the same heights.
 * A tile with a drill-down is a button; one without isn't clickable and
 * doesn't look it.
 */
export function KpiTile({ tile, onDrill, index = 0 }: { tile: TileVM; onDrill(d: DrillVM): void; index?: number }) {
  // Not registered yet: one line, "Not available yet" (dev builds name the id).
  if (tile.missing) {
    return (
      <div role="listitem" className="kt missing" style={{ animationDelay: `${index * 30}ms` }}>
        <div className="kt-miss">{tile.display}</div>
      </div>
    );
  }
  const status = statusOf(tile);
  const body = (
    <>
      {tile.masked ? <div className="kt-value masked-v"><Masked by={tile.masked.by} /></div>
        : <div className={`kt-value ${sizeOf(tile.display)}`} title={tile.display}>{tile.display}</div>}
      {tile.detail ? <div className="kt-detail" title={tile.sub ?? tile.detail}>{tile.detail}</div>
        : tile.sub && <div className="kt-sub">{tile.sub}</div>}
      <div className="kt-ref">
        {tile.ref && <><span className="kt-ref-k">{tile.ref.k}</span><span className="kt-ref-v">{tile.ref.v}</span></>}
        {tile.ownerTag && <span className="kt-owner">{tile.ownerTag}</span>}
      </div>
    </>
  );
  const drill = tile.drill;
  const value = tile.masked ? 'masked for your role' : tile.display;
  return (
    <div role="listitem" className={`kt ${drill ? 'click' : ''}`} style={{ animationDelay: `${index * 30}ms` }}>
      <div className="kt-head">
        <span className="kt-lab">
          <span className="kt-label">{tile.label}</span>
          <InfoTip info={tile.info} />
        </span>
        {status && <span className="kt-pill"><StatusPill {...status} /></span>}
      </div>
      {drill ? (
        <button
          type="button" className="kt-hit" onClick={() => onDrill(drill)}
          aria-label={`${tile.label}: ${value}${status ? `, ${status.label}` : ''}.${tile.sub ? ` ${tile.sub}.` : ''} ${drill.kind === 'route' ? 'Open' : 'Show these tenders'}`}
        >{body}</button>
      ) : <div className="kt-body">{body}</div>}
    </div>
  );
}

/** Six across at 1440 px, 3 × 2 from 1100 px, 2 × 3 below (4 tiles on My requests). */
export function KpiTiles({ tiles, onDrill }: { tiles: TileVM[]; onDrill(d: DrillVM): void }) {
  return (
    <div className="kt-grid" data-n={tiles.length} role="list" aria-label="Key figures">
      {tiles.map((t, i) => <KpiTile key={t.id} tile={t} onDrill={onDrill} index={i} />)}
    </div>
  );
}

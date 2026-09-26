import type { DrillVM, TileVM } from '@/domain/gcc/viewmodels';
import { Masked } from '@/components/tender/Masked';
import { InfoTip } from './InfoTip';

/**
 * Words rather than a figure ("No results in this period") wrap in the body font
 * instead of the big mono. Longer figures ("SAR 3.09 bn", "1 won · 2 lost") step
 * down a size, so six tiles fit across at 1440 px without cutting the value.
 */
function sizeOf(s: string): string {
  if (s.length > 16 && /[a-z]{4,}/.test(s)) return 'long';
  if (s.length > 12) return 'xs';
  if (s.length > 9) return 'sm';
  if (s.length > 6) return 'md';
  return '';
}

/**
 * One KPI tile (dashboards.md §3): label and ⓘ, the value in its tone, a
 * sub-line, and an owner tag when the thing measured waits on someone else.
 * A tile with a drill-down is a button; one without isn't clickable and doesn't
 * look it.
 */
export function KpiTile({ tile, onDrill, index = 0 }: { tile: TileVM; onDrill(d: DrillVM): void; index?: number }) {
  // Not registered yet: one line, "Not available yet" (dev builds name the id).
  if (tile.missing) {
    return (
      <div className="kt missing" style={{ animationDelay: `${index * 30}ms` }}>
        <div className="kt-miss">{tile.display}</div>
      </div>
    );
  }
  const body = (
    <>
      {tile.masked ? <div className="kt-value masked-v"><Masked by={tile.masked.by} /></div>
        : <div className={`kt-value t-${tile.tone ?? 'ink'} ${sizeOf(tile.display)}`} title={tile.display}>{tile.display}</div>}
      {tile.sub && <div className="kt-sub">{tile.sub}</div>}
    </>
  );
  const drill = tile.drill;
  return (
    <div className={`kt ${drill ? 'click' : ''} ${tile.tone ? `tone-${tile.tone}` : ''}`} style={{ animationDelay: `${index * 30}ms` }}>
      <div className="kt-head">
        <span className="kt-label">{tile.label}</span>
        <InfoTip info={tile.info} />
        {tile.ownerTag && <span className="kt-owner">{tile.ownerTag}</span>}
      </div>
      {drill ? (
        <button
          type="button" className="kt-hit" onClick={() => onDrill(drill)}
          aria-label={`${tile.label}: ${tile.masked ? 'masked for your role' : tile.display}${tile.sub ? `, ${tile.sub}` : ''}. ${drill.kind === 'route' ? 'Open' : 'Show these tenders'}`}
        >{body}</button>
      ) : <div className="kt-body">{body}</div>}
    </div>
  );
}

/** Six across at 1440 px, 3 × 2 from 1100 px, 2 × 3 below (4 tiles on My requests). */
export function KpiTiles({ tiles, onDrill }: { tiles: TileVM[]; onDrill(d: DrillVM): void }) {
  return (
    <div className="kt-grid" data-n={tiles.length} role="list" aria-label="Key figures">
      {tiles.map((t, i) => <div role="listitem" key={t.id}><KpiTile tile={t} onDrill={onDrill} index={i} /></div>)}
    </div>
  );
}

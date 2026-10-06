import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import type { DrillVM, ListCellVM, ListPanelVM, ListRowVM } from '@/domain/gcc/viewmodels';
import { ClosingContext, usePresence } from '@/state/presence';
import { DrawerFrame } from '@/components/overlays/Frames';
import { StatusPill } from '@/components/tender/StatusPill';
import './list-panel.css';

/**
 * Plan 040: the list a tile opens over its dashboard ("Late gate decisions",
 * "Company documents"). The drawer's frame and motion; Esc and Close shut it,
 * and focus goes back to the tile. It renders the panel's view model and
 * computes nothing: rows are text, status is a word in a pill, no stripes.
 * A row with somewhere to go is a button; the link under the list hands its
 * drill back to the dashboard.
 */

function Cell({ c }: { c: ListCellVM }) {
  if (c.pill) return <span className="lp-cell"><StatusPill label={c.pill.label} tone={c.pill.tone} icon={c.pill.icon} /></span>;
  return (
    <span className="lp-cell cell-two">
      <span className={c.mono ? 'tk-main tk-mono' : 'tk-main'} title={c.text}>{c.text}</span>
      {c.sub && <span className="tk-sub" title={c.sub}>{c.sub}</span>}
    </span>
  );
}

function Row({ row, keys, onOpen }: { row: ListRowVM; keys: string[]; onOpen(to: string): void }) {
  const cells = keys.map((k) => <Cell key={k} c={row.cells[k] ?? { text: '' }} />);
  return (
    <li className="lp-li">
      {row.to
        ? <button type="button" className="lp-row click" onClick={() => onOpen(row.to!)} aria-label={row.label}>{cells}</button>
        : <div className="lp-row" aria-label={row.label}>{cells}</div>}
    </li>
  );
}

function Body({ panel, onClose, onOpen, onFoot }: { panel: ListPanelVM; onClose(): void; onOpen(to: string): void; onFoot(d: DrillVM): void }) {
  const keys = panel.columns.map((c) => c.key);
  const grid = { '--lp-cols': panel.columns.map((c) => c.width ?? '1fr').join(' ') } as CSSProperties;
  const foot = panel.foot;
  return (
    <div className="lp-wrap">
      <DrawerFrame
        eyebrow="From tile" title={panel.title} sub={panel.lede} onClose={onClose}
        actions={foot ? [{ label: foot.label, onClick: () => onFoot(foot.drill) }] : undefined}
        foot="Esc to close"
      >
        <div className="lp" style={grid}>
          {panel.rows.length ? (
            <>
              <div className="lp-head" aria-hidden>{panel.columns.map((c) => <span key={c.key}>{c.label}</span>)}</div>
              <ul className="lp-list" aria-label={panel.title}>
                {panel.rows.map((r) => <Row key={r.id} row={r} keys={keys} onOpen={onOpen} />)}
              </ul>
            </>
          ) : <p className="lp-empty">{panel.empty}</p>}
        </div>
      </DrawerFrame>
    </div>
  );
}

export function ListPanel({ panel, onClose, onOpen, onFoot }: {
  panel: ListPanelVM | null;
  onClose(): void;
  /** A row's destination: the tender, or the document in Company › Credentials. */
  onOpen(to: string): void;
  /** The link under the list: the table with every decision, or Company › Credentials. */
  onFoot(d: DrillVM): void;
}) {
  const { shown, closing } = usePresence(panel);
  if (!shown) return null;
  return createPortal(
    <ClosingContext.Provider value={closing}>
      <Body key={shown.title} panel={shown} onClose={onClose} onOpen={onOpen} onFoot={onFoot} />
    </ClosingContext.Provider>,
    document.body,
  );
}

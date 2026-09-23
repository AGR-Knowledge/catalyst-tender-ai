import type { Tone } from '@/data/types';
import { tc } from './primitives';

export interface BoardCard { key: string; name: string; meta: string; metaTone?: Tone; onClick: () => void }
export interface BoardColumn { key: string; head: string; tone: Tone; count: number; cards: BoardCard[] }

export function Board({ columns, maxCards = 4 }: { columns: BoardColumn[]; maxCards?: number }) {
  return (
    <div className="board-c">
      <div className="board">
        {columns.map((col) => {
          const shown = col.cards.slice(0, maxCards);
          const more = col.count - shown.length;
          return (
            <div className="board-col" key={col.key}>
              <div className="board-col-head">
                <span className={`h ${tc(col.tone)}`}>{col.head}</span>
                <span className="n">{col.count}</span>
              </div>
              {shown.map((c) => (
                <button type="button" key={c.key} className="board-card" onClick={c.onClick}>
                  <span className="n">{c.name}</span>
                  <span className={`m ${tc(c.metaTone)}`}>{c.meta}</span>
                </button>
              ))}
              {shown.length === 0 && <div className="board-empty">Nothing here</div>}
              {more > 0 && <div className="board-more">+ {more} more</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

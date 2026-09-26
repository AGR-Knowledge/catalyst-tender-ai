import { useNavigate } from 'react-router-dom';
import type { TileVM } from '@/domain/gcc/viewmodels';
import { KpiTiles } from '@/components/dashboard/KpiTile';

/** A screen's header strip (ui-direction §5 B): the dashboard kit's tiles; a tile that opens another screen goes there. */
export function Strip({ tiles }: { tiles: TileVM[] }) {
  const navigate = useNavigate();
  if (!tiles.length) return null;
  return (
    <div className="s1-strip">
      <KpiTiles tiles={tiles} onDrill={(d) => { if (d.kind === 'route') navigate(d.to); }} />
    </div>
  );
}

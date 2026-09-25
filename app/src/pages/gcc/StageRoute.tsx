import { useParams } from 'react-router-dom';
import { isStageN } from '@/data/gcc/stages';
import { stageDashboardKey } from '@/domain/gcc/dashboards/home';
import { GuardCap } from '@/pages/Restricted';
import { NotFound } from '@/pages/NotFound';
import { DashboardRoute } from './DashboardRoute';

/** `/stages/:n`: that stage's dashboard, the same page its owner uses as home, if the viewer's role includes the stage. */
export function StageRoute() {
  const n = Number(useParams().n);
  if (!isStageN(n)) return <NotFound />;
  return (
    <GuardCap cap="stage.view" ctx={{ stage: n }}>
      <DashboardRoute dashboardKey={stageDashboardKey(n)} />
    </GuardCap>
  );
}

export default StageRoute;

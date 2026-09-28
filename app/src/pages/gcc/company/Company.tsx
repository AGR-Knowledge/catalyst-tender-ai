import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { vaultFor } from '@/domain/gcc/company';
import { Tabs, tabPanelProps, type TabItem } from '@/components/tender/Tabs';
import { useS1 } from '../s1/vm/useS1';
import { Overview } from './Overview';
import { Credentials } from './Credentials';
import { Projects } from './Projects';
import { Financials } from './Financials';
import { Teams } from './Teams';
import '@/components/dashboard/dashboard.css';
import '../s1/s1.css';
import './company.css';

/**
 * `/company`, Company profile (plans 010 and 027c, catalogue §D): an Overview
 * that reads like a bidder's profile, then the credentials vault with the
 * renewal upload, the similar-projects register, the accounts and bank
 * guarantee facility, and the tendering teams and partners, all read from the
 * seed. The tab and what is open live in the URL (`?tab=`, `?cred=`,
 * `?project=`), so My requests, the eligibility lines and the dashboard tiles
 * can link straight to them.
 */

const PREFIX = 'company';
type TabId = 'overview' | 'credentials' | 'projects' | 'financials' | 'teams';
const TAB_IDS: TabId[] = ['overview', 'credentials', 'projects', 'financials', 'teams'];
const LABEL: Record<TabId, string> = { overview: 'Overview', credentials: 'Credentials', projects: 'Projects', financials: 'Financials', teams: 'Teams and partners' };
/** The tab values of plan 010, so older links still land. */
const OLD: Record<string, TabId> = { profile: 'overview', facility: 'financials' };

const tabOf = (want: string | null): TabId => {
  if (!want) return 'overview';
  if (OLD[want]) return OLD[want];
  return (TAB_IDS as string[]).includes(want) ? (want as TabId) : 'overview';
};

export default function Company() {
  const s1 = useS1();
  const { tenant, viewer, done } = s1;
  const [params, setParams] = useSearchParams();
  const active = tabOf(params.get('tab'));
  const vault = useMemo(() => vaultFor(tenant, done, viewer), [tenant, done, viewer]);

  const openTab = useCallback((id: string) => {
    // Leaving a tab drops its own parameters (the open credential or project, the filters). Overview is the bare URL.
    setParams(() => {
      const n = new URLSearchParams();
      if (id !== 'overview') n.set('tab', id);
      return n;
    }, { replace: true });
  }, [setParams]);

  const tabs: TabItem[] = TAB_IDS.map((id) => ({
    id, label: LABEL[id],
    badge: id === 'credentials' && vault.counts.atRisk ? { text: `${vault.counts.atRisk} at risk`, tone: 'orange' } : null,
  }));

  return (
    <div className="view s1 co">
      <div className="co-tabs">
        <Tabs tabs={tabs} active={active} onChange={openTab} label="Company profile sections" prefix={PREFIX} />
      </div>
      <div className="co-panel" {...tabPanelProps(PREFIX, active)}>
        {active === 'overview' && <Overview s1={s1} vault={vault} onTab={openTab} />}
        {active === 'credentials' && <Credentials s1={s1} vault={vault} />}
        {active === 'projects' && <Projects s1={s1} />}
        {active === 'financials' && <Financials tenant={tenant} />}
        {active === 'teams' && <Teams s1={s1} />}
      </div>
    </div>
  );
}

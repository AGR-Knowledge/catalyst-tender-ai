import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { vaultFor } from '@/domain/gcc/company';
import { Tabs, tabPanelProps, type TabItem } from '@/components/tender/Tabs';
import { useS1 } from '../s1/vm/useS1';
import { Credentials } from './Credentials';
import { Profile } from './Profile';
import { Facility } from './Facility';
import { Teams } from './Teams';
import '@/components/dashboard/dashboard.css';
import '../s1/s1.css';
import './company.css';

/**
 * `/company` (plan 010, catalogue §D): the credentials vault with the renewal
 * upload, then the company's capability profile, bank guarantee facility, and
 * tendering teams and partners, all read from the seed. The tab and the open
 * credential live in the URL (`?tab=`, `?cred=`), so My requests and the
 * eligibility lines can link straight to a credential.
 */

const PREFIX = 'company';
type TabId = 'credentials' | 'profile' | 'facility' | 'teams';
const TAB_IDS: TabId[] = ['credentials', 'profile', 'facility', 'teams'];
const LABEL: Record<TabId, string> = { credentials: 'Credentials', profile: 'Capability profile', facility: 'Bank facility', teams: 'Teams and partners' };

export default function Company() {
  const s1 = useS1();
  const { tenant, viewer, done } = s1;
  const [params, setParams] = useSearchParams();
  const want = params.get('tab') as TabId | null;
  const active: TabId = want && TAB_IDS.includes(want) ? want : 'credentials';
  const vault = useMemo(() => vaultFor(tenant, done, viewer), [tenant, done, viewer]);

  const openTab = useCallback((id: string) => {
    // Leaving a tab drops its own parameters (the open credential, the filters).
    setParams(() => {
      const n = new URLSearchParams();
      if (id !== 'credentials') n.set('tab', id);
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
        <Tabs tabs={tabs} active={active} onChange={openTab} label="Company sections" prefix={PREFIX} />
      </div>
      <div className="co-panel" {...tabPanelProps(PREFIX, active)}>
        {active === 'credentials' && <Credentials s1={s1} vault={vault} />}
        {active === 'profile' && <Profile tenant={tenant} />}
        {active === 'facility' && <Facility tenant={tenant} />}
        {active === 'teams' && <Teams s1={s1} />}
      </div>
    </div>
  );
}

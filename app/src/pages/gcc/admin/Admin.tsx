import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gavel, Palette, RadioTower, ScrollText, ShieldCheck, SlidersHorizontal, Target, Users as UsersIcon } from 'lucide-react';
import type { Tone } from '@/data/types';
import { GATE_SLA_HOURS } from '@/data/gcc/targets';
import { useDemo } from '@/state/store';
import { OWNER_RULE, brandingChangeText, brandingOf, gatesOf, sourcesOf, targetsOf, usersOf, whatIfBase } from '@/domain/gcc/admin';
import { Callout } from '@/components/tender/Callout';
import { tc } from '@/components/ui/primitives';
import { SCREENS } from '../screens';
import { rightsLine, useAdmin } from './AdminKit';

/**
 * `/admin` (plan 024 step 1.1, catalogue B11): one card per section, each with
 * a status line derived from that section, and the rule that only the Head of
 * Tendering changes these settings. A gate without an owner is called out
 * above the cards, because it blocks tenders.
 */

interface Section { path: string; icon: ReactNode; status: string; tone?: Tone }

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default function Admin() {
  const { tenant, done, viewer, check } = useAdmin();
  const { state } = useDemo();
  const navigate = useNavigate();

  const users = useMemo(() => usersOf(tenant), [tenant]);
  const gates = useMemo(() => gatesOf(tenant), [tenant]);
  const sources = useMemo(() => sourcesOf(tenant), [tenant]);
  const fit = useMemo(() => whatIfBase(tenant, done, viewer), [tenant, done, viewer]);
  const targets = useMemo(() => targetsOf(tenant), [tenant]);
  const branding = brandingOf(done);

  const blocked = gates.gates.filter((g) => g.blocked);
  const scored = fit ? fit.items.length + fit.hidden : 0;
  const sections: Section[] = [
    { path: '/admin/users', icon: <UsersIcon size={16} aria-hidden />, status: `${plural(users.total, 'person', 'people')} · ${users.seats.used} of ${users.seats.licensed} seats in use` },
    {
      path: '/admin/committees', icon: <Gavel size={16} aria-hidden />,
      status: blocked.length ? `${plural(blocked.length, 'gate')} without an owner` : `${gates.gates.length} gates, each with an owner · quorum ${gates.committee.quorum} of ${gates.committee.total}`,
      tone: blocked.length ? 'red' : undefined,
    },
    {
      path: '/admin/sources', icon: <RadioTower size={16} aria-hidden />,
      status: `${plural(sources.rows.length, 'source')} · ${sources.issues || 'all healthy'}`, tone: sources.issues ? 'orange' : undefined,
    },
    {
      path: '/admin/fit', icon: <SlidersHorizontal size={16} aria-hidden />,
      status: fit ? `Pursue at ${fit.d.fit.pursueAt} · with conditions from ${fit.d.fit.conditionsFrom} · ${plural(scored, 'live Stage 1 tender')} scored` : 'No fit model',
    },
    {
      path: '/admin/targets', icon: <Target size={16} aria-hidden />,
      status: `${plural(targets.length, 'setting')} · DG1 ${GATE_SLA_HOURS.DG1} h, DG2 ${GATE_SLA_HOURS.DG2} h, DG3 ${GATE_SLA_HOURS.DG3} h`,
    },
    {
      path: '/admin/branding', icon: <Palette size={16} aria-hidden />,
      status: branding ? `Prospect branding on: ${brandingChangeText(tenant, branding).replace(/^./, (c) => c.toLowerCase())}` : 'The company’s own brand',
      tone: branding ? 'cyan' : undefined,
    },
    { path: '/admin/audit', icon: <ScrollText size={16} aria-hidden />, status: `${plural(state.audit.length, 'entry', 'entries')} this session` },
  ];

  return (
    <div className="view">
      <p className="adm-lead"><ShieldCheck size={15} aria-hidden />{rightsLine()}</p>
      {blocked.map((g) => (
        <div key={g.key} style={{ marginBottom: 'var(--gap)' }}>
          <Callout variant="block" title={g.blocked!}>{g.title}. {OWNER_RULE}</Callout>
        </div>
      ))}
      <div className="adm-cards">
        {sections.map((s) => {
          const screen = SCREENS[s.path];
          const may = screen.cap ? check(screen.cap) : { ok: true as const };
          const whyId = `adm-why${s.path.replace(/\W+/g, '-')}`;
          return (
            <button key={s.path} type="button" className="adm-card" disabled={!may.ok} onClick={() => navigate(s.path)} aria-describedby={may.ok ? undefined : whyId}>
              <span className="t">{s.icon}{screen.name}</span>
              <span className="d">{screen.line}</span>
              <span className={`s ${tc(s.tone)}`}>{s.status}</span>
              {!may.ok && <span className="why" id={whyId}>{may.reason}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

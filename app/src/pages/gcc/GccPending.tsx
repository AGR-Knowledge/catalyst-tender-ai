/// <reference types="vite/client" />
import type { ComponentType } from 'react';
import { useTenant } from '@/domain/tenancy';
import { DEMO_TIME, DEMO_TODAY, weekendText, whenText } from '@/domain/calendar';
import { Card, CardFoot, CardHead, KV } from '@/components/ui/primitives';

/**
 * Dev checks at `/dev/checks` (development builds only): a smoke test of the
 * tenancy foundation, people and seed data, not demo content. Later plans add
 * panels as new files in `dev-checks/` and never edit this one.
 */
const PANELS = Object.entries(import.meta.glob<{ default: ComponentType }>('./dev-checks/*.tsx', { eager: true }))
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, mod]) => ({ path, Panel: mod.default }));

export function GccPending() {
  const t = useTenant();
  return (
    <div className="view">
      <Card style={{ marginBottom: 'var(--gap)' }}>
        <CardHead title={t.name} meta="Tenant profile" />
        <div style={{ padding: '6px 22px 14px' }}>
          <KV k="Legal entity" v={t.legal} />
          <KV k="Head office" v={`${t.hqCity}, ${t.country}`} />
          <KV k="Sectors" v={t.sectors.join(', ')} />
          <KV k="Bid currency" v={t.currency} />
          <KV k="Time zone" v={`${t.tzLabel} (${t.timeZone})`} />
          <KV k="Weekend" v={weekendText(t.countryCode)} />
          <KV k="Demo today" v={whenText(DEMO_TODAY, DEMO_TIME, t.tzLabel)} />
          <KV k="Data residency" v={t.residency} />
          <KV k={t.headTitle} v={`${t.admin}, ${t.adminEmail}`} />
        </div>
        <CardFoot>Dev checks, development builds only. Each panel below checks one plan's data or rules; the demo itself starts at the dashboard.</CardFoot>
      </Card>
      {PANELS.map(({ path, Panel }) => (
        <Card key={path} style={{ marginBottom: 'var(--gap)' }}><Panel /></Card>
      ))}
    </div>
  );
}

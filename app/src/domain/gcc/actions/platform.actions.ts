import { actorName, openBreakGlass, stampText } from '@/domain/platform/breakglass';
import type { ActionSource } from './types';

/**
 * "Catalyst requested access" (plan 011, catalogue GOV-6, spec §13): an open
 * break-glass request on the Head of Tendering's home. It reads the tenant's
 * own `done`, where the request was written, so Reset clears it. The row
 * opens the audit log, where the request can be revoked.
 */
export const ACTION_SOURCES: ActionSource[] = [
  {
    id: 'breakglass.review',
    cap: 'audit.view',
    rows: (ctx) => openBreakGlass(ctx.done).map((r) => ({
      id: `breakglass.review:${r.n}`,
      source: 'breakglass.review',
      type: 'Catalyst access',
      typeTone: 'orange',
      shortTitle: 'Catalyst requested access',
      what: `Read only, up to ${r.hours} h, second approver ${actorName(r.approverId)} (Catalyst). Reason: “${r.reason}”`,
      due: { kind: 'text', text: `Requested ${stampText(r.at)}`, tone: 'orange' },
      primary: { kind: 'route', label: 'View in audit log', to: '/admin/audit?kind=catalyst' },
      // Someone outside the company asking to see its data comes before any bid item.
      urgency: -1 - r.n,
    })),
  },
];

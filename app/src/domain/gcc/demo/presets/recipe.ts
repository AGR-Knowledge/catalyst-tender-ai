import { PLATFORM_OPERATOR, firstWithRole } from '@/data/people';
import { gccData, type GccTenantKey } from '@/data/gcc';
import { HERO_ID } from '@/data/gcc/hero';
import { addHours, DEMO_NOW } from '@/domain/gcc/clock';
import { validationAction } from '@/domain/gcc/s1';
import type { AuditDraft as S1AuditDraft, DoneWrite } from '@/domain/gcc/s1/done';
import type { AuditDraft, PresetPlan, Write } from './types';

/**
 * Builds one preset's writes and audit entries in click order (plan 014 step
 * 2.5, orchestrator decision 2026-09-27):
 * - the first entry is the presenter's summary, recorded as the Catalyst
 *   operator with no tender target, so the audit log reads "Presenter (demo
 *   control)" and no tender's audit tab shows Catalyst acting in the tenant;
 * - each writer's own entry follows, under the person the writer names, with
 *   " (demo control)" added to its action.
 * `nextAt()` is the demo time the store will stamp on the next entry (10:00
 * for the summary after the reset, then a minute apart), so a value stamped
 * with it reads the same time as its audit entry, as a click's does.
 */

type Done = Record<string, string>;
type S2Like = { key: string; value: string; audit: AuditDraft } | { error: string };

const DEMO_CONTROL = ' (demo control)';

export function recipe(tenant: GccTenantKey) {
  let done: Done = {};
  const writes: Write[] = [];
  const entries: AuditDraft[] = [];

  const add = (ws: Write[], audits: AuditDraft[]) => {
    done = { ...done, ...Object.fromEntries(ws.map((w) => [w.key, w.value])) };
    writes.push(...ws.map(({ key, value }) => ({ key, value })));
    entries.push(...audits.map((a) => ({ ...a, action: `${a.action}${DEMO_CONTROL}` })));
  };

  return {
    tenant,
    done: () => done,
    /** Entry 0 is the summary, so the first writer's entry is at 10:01. */
    nextAt: () => addHours(DEMO_NOW, (entries.length + 1) / 60),
    /** A Stage 1 or DG1 write (plan 007a): the screens log it for the tender, as the person who acted. */
    s1(tenderId: string, byId: string, ws: DoneWrite[], audits: S1AuditDraft[]) {
      add(ws, audits.map((a) => ({ actorId: byId, action: a.action, target: tenderId, ...(a.detail ? { detail: a.detail } : {}) })));
    },
    /** A Stage 2 or Stage 3 write (plans 008a, 009a): it carries its own audit entry. A refusal stops the preset. */
    write(r: S2Like) {
      if ('error' in r) throw new Error(r.error);
      add([r], [r.audit]);
    },
    /** A plain audit entry the screen logs beside a write (the pack's "Committee notified"). */
    note(a: AuditDraft) { add([], [a]); },
    plan(label: string, summary: string, to: string, message: string): PresetPlan {
      return {
        writes,
        audit: [{ actorId: PLATFORM_OPERATOR.id, action: `Scenario preset "${label}" applied${DEMO_CONTROL}`, detail: summary }, ...entries],
        to, message,
      };
    },
  };
}

export type Recipe = ReturnType<typeof recipe>;

/** The hero's fields that block DG1, resolved as the Coordinator would (the pick keeps the booklet's value); dev check 45's `resolved()`. */
export function resolveHeroBlockers(r: Recipe): number {
  const t = gccData(r.tenant).register.find((x) => x.id === HERO_ID);
  if (!t) throw new Error(`${HERO_ID} is not on this company's register`);
  const coord = firstWithRole(r.tenant, 'coord')?.id ?? `${r.tenant}.coord`;
  const items = t.validations.filter((v) => v.blocksDg1);
  for (const v of items) {
    const w = validationAction(v, v.alt ? 'pick' : 'accept', { ...(v.alt ? { pick: 'value' as const } : {}), at: r.nextAt() }, coord);
    r.s1(HERO_ID, coord, [w], [w.audit]);
  }
  return items.length;
}

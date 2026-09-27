import { gccData } from '@/data/gcc';
import { committeeOf, firstWithRole } from '@/data/people';
import { freshnessFor, packIssueWrite, packRerunWrite, packVersionsFor } from '@/domain/gcc/s3';
import { recipe } from './recipe';
import type { Preset } from './types';

/** Script C's committee tender (s1-s3-demo-spec §17): pack issued, stale after an addendum, 2 of 5 positions. */
const SCRIPT_C = 'T-2026-097';

/**
 * "Start: DG2 committee" (spec §16, script C), Najd only: T-2026-097's pack
 * re-run on the addendum and issued by its Bid Manager, as the pack screen's
 * "Re-run" and "Issue" do. The seeded positions are kept.
 */
export const preset: Preset = {
  id: 'dg2-committee',
  label: 'Start: DG2 committee',
  line: 'T-2026-097’s pack re-run on the addendum and issued to the committee; the positions recorded so far kept.',
  order: 4,
  tenants: ['najd'],
  build(tenant) {
    if (tenant !== 'najd') return { unavailable: 'Script C runs in Najd.' };
    const r = recipe(tenant);
    const bm = gccData(tenant).register.find((t) => t.id === SCRIPT_C)?.bidManagerId ?? firstWithRole(tenant, 'bid')?.id ?? `${tenant}.bid`;
    r.write(packRerunWrite(tenant, SCRIPT_C, r.done(), bm, r.nextAt()));
    r.write(packIssueWrite(tenant, SCRIPT_C, r.done(), bm, undefined, r.nextAt()));
    const pv = packVersionsFor(tenant, SCRIPT_C, r.done());
    const v = pv.issued?.version;
    const members = committeeOf(tenant);
    r.note({ actorId: bm, action: 'Committee notified', target: SCRIPT_C, detail: `Pack v${v} sent to ${members.map((m) => `${m.name} (${m.title})`).join(', ')}` });
    if (freshnessFor(tenant, SCRIPT_C, r.done())?.stale) throw new Error(`${SCRIPT_C}'s pack is still stale after the re-run`);
    return r.plan(
      this.label,
      `${SCRIPT_C}: pack re-run and v${v} issued to the committee. Positions recorded so far are kept.`,
      `/dg2?tender=${SCRIPT_C}`,
      `Start: DG2 committee. ${SCRIPT_C}’s pack is re-run on the addendum and v${v} is with the committee, fresh. Showing DG2 approvals.`,
    );
  },
};

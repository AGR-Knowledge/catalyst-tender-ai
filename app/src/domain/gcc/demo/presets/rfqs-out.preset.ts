import { HERO_ID } from '@/data/gcc/hero';
import { firstWithRole } from '@/data/people';
import { plural, tenderOf } from '@/domain/gcc/s1/common';
import { defaultTeam, dg1PackFor, dg1Write, proposedMilestones, type Dg1Input } from '@/domain/gcc/dg1';
import { packagesFor, packagingWrite, recommendedShortlist, rfqCounts, rfqWrite, rfqsFor, s2TenderOf, shortlistWrite, approvedShortlist, sentSupplierIds, supplierOf, screeningOf } from '@/domain/gcc/s2';
import { recipe, resolveHeroBlockers } from './recipe';
import type { Preset } from './types';

/**
 * "Start: RFQs out" (spec §16, script B): as "Start: DG1 due", then DG1
 * Pursue by the hero's Bid Manager with the recommended team and strategy (as
 * the DG1 form proposes them), the packaging as the agent proposed it, every
 * shortlist as recommended and every RFQ sent (as "Approve all" and "Send all"
 * do: a package with no screened supplier stays unsent), all through their
 * writers. No supplier replies yet.
 */
export const preset: Preset = {
  id: 'rfqs-out',
  label: 'Start: RFQs out',
  line: 'The hero pursued at DG1, packaged and shortlisted, every RFQ sent. No replies yet.',
  order: 3,
  tenants: 'all',
  build(tenant) {
    const r = recipe(tenant);
    const n = resolveHeroBlockers(r);
    const pack = dg1PackFor(tenant, HERO_ID, r.done());
    if (!pack || pack.locked) throw new Error(pack?.locked?.reason ?? `No DG1 pack for ${HERO_ID}`);
    if (pack.recommendation.verdict === 'discard') {
      return { unavailable: 'The agent recommends discarding the hero here, so script B runs in Najd, Dafna or Qurain.' };
    }
    if (!s2TenderOf(tenant, HERO_ID)) return { unavailable: 'The hero has no sourcing record in this company.' };

    // DG1 Pursue, recorded by the Bid Manager with the form's proposals.
    const bm = tenderOf(tenant, HERO_ID)?.bidManagerId ?? firstWithRole(tenant, 'bid')?.id ?? `${tenant}.bid`;
    const team = defaultTeam(tenant);
    const elig = pack.eligibility?.result;
    const at = r.nextAt();
    const input: Dg1Input = {
      tenderId: HERO_ID, decision: 'pursue', team, milestones: proposedMilestones(tenant, HERO_ID, at), at,
      strategy: elig?.verdict === 'eligible-with-jv' && elig.jvPartner
        ? { kind: 'jv', partnerId: elig.jvPartner.id, ...(elig.jv?.shares ? { shares: elig.jv.shares } : {}) }
        : { kind: 'prime' },
    };
    const dg1 = dg1Write(input, bm, pack, r.done());
    r.s1(HERO_ID, bm, dg1.writes, dg1.audit);

    // Stage 2, by the DG1 team's Procurement Lead, each record at its own audit entry's minute (plan 025a).
    const proc = team.proc || firstWithRole(tenant, 'proc')?.id || bm;
    r.write(packagingWrite(HERO_ID, proc, {}, r.nextAt(), { tenant, done: r.done() }));
    const pkgs = packagesFor(tenant, HERO_ID, r.done());
    // "Approve all as recommended": a package whose candidates are all greyed out can't be shortlisted, as on the screen.
    let shortlisted = 0;
    for (const { pkg } of pkgs) {
      const picks = recommendedShortlist(tenant, HERO_ID, pkg.id, r.done()).items.filter((i) => i.sendable).map((i) => i.supplierId);
      if (!picks.length) continue;
      r.write(shortlistWrite(tenant, HERO_ID, pkg.id, picks, [], proc, r.done(), r.nextAt()));
      shortlisted++;
    }
    for (const { pkg } of pkgs) {
      // "Send all": every shortlisted supplier that is screened and not yet sent this RFQ.
      const sent = sentSupplierIds(tenant, HERO_ID, pkg.id, r.done());
      const to = (approvedShortlist(tenant, HERO_ID, pkg.id, r.done())?.supplierIds ?? []).filter((id) => {
        const s = supplierOf(tenant, id);
        return !!s && screeningOf(s).sendable && !sent.has(id);
      });
      if (to.length) r.write(rfqWrite(tenant, HERO_ID, pkg.id, to, proc, r.done(), r.nextAt()));
    }

    const c = rfqCounts(tenant, HERO_ID, r.done());
    const issued = new Set(rfqsFor(tenant, HERO_ID, r.done()).map((x) => x.packageId)).size;
    const unsent = pkgs.length - issued;
    const noSupplier = unsent ? `; ${plural(unsent, 'package')} ${unsent === 1 ? 'has' : 'have'} no screened supplier to send to` : '';
    return r.plan(
      this.label,
      `${HERO_ID}: ${plural(n, 'field')} resolved, DG1 Pursue, packaging approved, ${plural(shortlisted, 'shortlist')} approved and ${plural(c.sent, 'RFQ')} sent for ${issued} of ${plural(pkgs.length, 'package')}${noSupplier}.`,
      `/sourcing?tender=${HERO_ID}&s=tracking`,
      `Start: RFQs out. The hero is in Stage 2 with ${plural(c.sent, 'RFQ')} out for ${issued} of ${plural(pkgs.length, 'package')}${noSupplier}. No replies yet. Showing the package board.`,
    );
  },
};

import { can, type Capability } from '@/data/access';
import { SEATS, SEAT_LABEL, committeeOf, peopleOf, roleLine, type Person, type Seat } from '@/data/people';
import { DG2_QUORUM, DG2_SEATS, GATE_SLA_HOURS } from '@/data/gcc/targets';
import { gccData, isGccTenantKey } from '@/data/gcc';
import type { Money } from '@/data/gcc/types';
import type { GateKey } from '@/domain/gcc/viewmodels';

/**
 * Administration › Committees & gates (plan 024 Phase 2, dashboards.md §9,
 * catalogue B11): the three gates, who decides each, its time limit and who
 * holds it in this company; the Bid Committee's seats and quorum; and the
 * gates without an owner, which block every tender that reaches them. Who
 * holds a gate is asked of `can()`, so this page agrees with the gate screens.
 */

export interface GatePerson { id: string; name: string; line: string; title: string }

export interface GateVM {
  key: GateKey;
  /** "DG1 · Pursue or Discard". */
  title: string;
  /** Who decides, as the rule reads (dashboards.md §9). */
  rule: string;
  slaHours: number;
  /** When the clock starts: "from logging". */
  slaFrom: string;
  /** "Decides", with the people who may record the decision here. */
  owners: { label: string; people: GatePerson[] };
  /** The other parts of the gate: the delegate, the committee, the pack's issuer. */
  roles: { label: string; people: GatePerson[]; note?: string }[];
  /** "This gate is blocked: no Bid Manager is named", or null. */
  blocked: string | null;
}

export interface SeatVM { seat: Seat; label: string; person: GatePerson | null }

export interface GatesVM {
  gates: GateVM[];
  withoutOwners: number;
  committee: { seats: SeatVM[]; filled: number; quorum: number; total: number; referral: Money | null };
}

/** A gate without an owner blocks every tender that reaches it (ui-direction §5 F). */
export const OWNER_RULE = 'A gate without an owner blocks every tender that reaches it.';

const who = (p: Person): GatePerson => ({ id: p.id, name: p.name, line: roleLine(p), title: p.title });

/** The tenant's people who may do this, at list level. */
const holders = (tenant: string, cap: Capability) => peopleOf(tenant).filter((p) => can(p, cap).ok).map(who);

export function gatesOf(tenant: string): GatesVM {
  const committee = committeeOf(tenant);
  const bySeat = new Map(committee.map((p) => [p.seat!, p]));
  const seats: SeatVM[] = SEATS.map((seat) => {
    const p = bySeat.get(seat);
    return { seat, label: SEAT_LABEL[seat], person: p ? who(p) : null };
  });

  const dg1 = holders(tenant, 'dg1.decide');
  const dg1Delegates = holders(tenant, 'dg1.delegate');
  const dg2 = holders(tenant, 'dg2.decide');
  const dg3 = holders(tenant, 'dg3.decide');
  const dg3Issuers = holders(tenant, 'dg3.issue');

  const gates: GateVM[] = [
    {
      key: 'DG1', title: 'DG1 · Pursue or Discard',
      rule: 'The assigned Bid Manager decides. The Head of Tendering may record it as a delegate, with a reason, and the Bid Manager is told.',
      slaHours: GATE_SLA_HOURS.DG1, slaFrom: 'from the tender being logged',
      owners: { label: 'Decides', people: dg1 },
      roles: [{ label: 'Delegate', people: dg1Delegates }],
      blocked: dg1.length ? null : 'This gate is blocked: no Bid Manager is named.',
    },
    {
      key: 'DG2', title: 'DG2 · Bid / No-Bid',
      rule: `Committee members record named positions; once ${DG2_QUORUM} of ${DG2_SEATS} have, the Head of Tendering approves. An approval against the majority needs a reason.`,
      slaHours: GATE_SLA_HOURS.DG2, slaFrom: 'from the pack being issued',
      owners: { label: 'Approves', people: dg2 },
      roles: [{ label: 'Positions', people: seats.flatMap((s) => (s.person ? [s.person] : [])), note: `Quorum ${DG2_QUORUM} of ${DG2_SEATS}` }],
      blocked: !dg2.length ? 'This gate is blocked: nobody may approve DG2.'
        : committee.length < DG2_QUORUM ? `This gate is blocked: ${committee.length} of ${DG2_SEATS} seats are filled, fewer than the quorum of ${DG2_QUORUM}.`
        : null,
    },
    {
      key: 'DG3', title: 'DG3 · Final bid approval',
      rule: 'The Compliance / Legal Lead issues the DG3 pack; the Head of Tendering approves submission or rejects it, with reasons.',
      slaHours: GATE_SLA_HOURS.DG3, slaFrom: 'from the pack being issued',
      owners: { label: 'Approves', people: dg3 },
      roles: [{ label: 'Issues the pack', people: dg3Issuers }],
      blocked: !dg3.length ? 'This gate is blocked: nobody may approve DG3.'
        : !dg3Issuers.length ? 'This gate is blocked: nobody may issue the DG3 pack.'
        : null,
    },
  ];

  return {
    gates,
    withoutOwners: gates.filter((g) => g.blocked).length,
    committee: {
      seats, filled: committee.length, quorum: DG2_QUORUM, total: DG2_SEATS,
      referral: isGccTenantKey(tenant) ? gccData(tenant).fit.dg2Referral : null,
    },
  };
}

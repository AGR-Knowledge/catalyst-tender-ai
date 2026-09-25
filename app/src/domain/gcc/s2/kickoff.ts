import type { RoleKey } from '@/data/types';
import { KICKOFF_DUE, RFQ_CLOCK_HOURS } from '@/data/gcc/s2';
import { personById } from '@/data/people';
import { addHours } from '@/domain/gcc/clock';
import { K, readDone, type Done, type InputReqRead } from './done';
import { addWorkingDays, pursueOf, tenantOf } from './context';
import { packagingFor } from './packaging';
import { approvedShortlist } from './shortlist';
import { rfqClock, rfqIssueLag, rfqsFor, type RfqClock } from './rfq';

/**
 * The bid workspace checklist a DG1 pursue creates (spec §8.1). Internal
 * inputs belong to plan 009a: their state is read from its `input-req:` and
 * `input-sub:` keys, by presence only.
 */

export type KickoffInputKey = keyof typeof KICKOFF_DUE.inputs;

export const KICKOFF_INPUTS: { inputKey: KickoffInputKey; label: string; ownerRole: RoleKey }[] = [
  { inputKey: 'method-statement', label: 'Method statement outline', ownerRole: 'dir' },
  { inputKey: 'hse-plan', label: 'HSE plan outline', ownerRole: 'dir' },
  { inputKey: 'key-cvs', label: 'Key CVs', ownerRole: 'hr' },
  { inputKey: 'programme', label: 'Preliminary programme', ownerRole: 'plan' },
  { inputKey: 'estimate', label: 'Preliminary estimate', ownerRole: 'comm' },
  { inputKey: 'design-basis', label: 'Design basis (design and build)', ownerRole: 'dir' },
];

export type KickoffState = 'done' | 'open' | 'to request' | 'requested' | 'submitted';

export interface KickoffItem {
  key: string;
  label: string;
  ownerId: string;
  ownerName: string;
  due: string;
  state: KickoffState;
  stateText: string;
  inputKey?: KickoffInputKey;
  ownerRole?: RoleKey;
  clock?: RfqClock | null;
}

export interface KickoffVM { tenderId: string; pursuedAt: string; pursuedById: string; items: KickoffItem[] }

export function kickoffFor(tenant: string, tenderId: string, done: Done): KickoffVM | null {
  const p = pursueOf(tenant, tenderId, done);
  if (!p) return null;
  const cc = tenantOf(tenant).cc;
  const proc = `${tenant}.proc`;
  const name = (id: string) => personById(id)?.name ?? id;
  const packaging = packagingFor(tenant, tenderId, done);
  const pkgs = packaging.packages;
  const lists = pkgs.filter(({ pkg }) => approvedShortlist(tenant, tenderId, pkg.id, done)).length;
  const sentPkgs = new Set(rfqsFor(tenant, tenderId, done).map((r) => r.packageId));
  const sent = pkgs.filter(({ pkg }) => sentPkgs.has(pkg.id)).length;
  const lag = rfqIssueLag(tenant, tenderId, done);

  const items: KickoffItem[] = [
    { key: 'packaging', label: 'Approve scope packaging', ownerId: proc, ownerName: name(proc), due: addHours(p.at, KICKOFF_DUE.packagingHours),
      state: packaging.approved ? 'done' : 'open', stateText: packaging.approved ? `Approved, ${pkgs.length} packages` : `${pkgs.length} packages proposed` },
    { key: 'shortlists', label: 'Approve supplier shortlists', ownerId: proc, ownerName: name(proc), due: addHours(p.at, KICKOFF_DUE.shortlistsHours),
      state: pkgs.length && lists === pkgs.length ? 'done' : 'open', stateText: `${lists} of ${pkgs.length} approved` },
    { key: 'rfqs', label: 'Send RFQs', ownerId: proc, ownerName: name(proc), due: addHours(p.at, RFQ_CLOCK_HOURS),
      state: pkgs.length && sent === pkgs.length ? 'done' : 'open',
      stateText: `${sent} of ${pkgs.length} packages issued${lag ? `, ${lag.text} after DG1` : ''}`, clock: rfqClock(tenant, tenderId, done) },
    ...KICKOFF_INPUTS.map(({ inputKey, label, ownerRole }): KickoffItem => {
      const req = readDone<InputReqRead>(done, K.inputReq(tenderId, inputKey)) ?? (done[K.inputReq(tenderId, inputKey)] ? {} : null);
      const sub = done[K.inputSub(tenderId, inputKey)] !== undefined;
      const ownerId = req?.toId ?? `${tenant}.${ownerRole}`;
      const state: KickoffState = sub ? 'submitted' : req ? 'requested' : 'to request';
      return {
        key: `input:${inputKey}`, label, inputKey, ownerRole, ownerId, ownerName: name(ownerId),
        due: req?.due ?? addWorkingDays(p.at, KICKOFF_DUE.inputs[inputKey], cc), state,
        stateText: state === 'submitted' ? 'Submitted' : state === 'requested' ? 'Requested' : 'To request',
      };
    }),
  ];
  return { tenderId, pursuedAt: p.at, pursuedById: p.byId, items };
}

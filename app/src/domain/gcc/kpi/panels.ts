import type { Tone } from '@/data/types';
import { can } from '@/data/access';
import { personById } from '@/data/people';
import type { GateRecord, Lifecycle } from '@/data/gcc/lifecycle';
import { isScreenBuilt } from '@/pages/gcc/screens';
import { durationText, minutesBetween } from '../clock';
import { dayMonth, dayText, type CompanyDocument, type DocumentStatus } from '../actions/portfolio.actions';
import type { DrillVM, ListPanelVM, ListRowVM } from '../viewmodels';
import type { KpiCtx } from './types';

/**
 * Plan 040: the list panels two Head of Tendering tiles open over the
 * dashboard. Decisions on time lists its late gate decisions; Documentation
 * gaps lists every document in the credentials vault, gaps first. The rows are
 * the tiles' own rows, so a tile and its panel never disagree.
 */

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "Thu 5 Mar, 09:10". */
const when = (iso: string) => `${dayText(iso)}, ${iso.slice(11, 16)}`;

/** How late a gate decision was, past its limit: "3 h 20 m". */
export const lateBy = (g: Pick<GateRecord, 'openedAt' | 'at' | 'slaHours'>) => durationText(minutesBetween(g.openedAt, g.at) - g.slaHours * 60);

const tenderPath = (id: string) => `/tenders/${encodeURIComponent(id)}`;

/** Decisions on time → "Late gate decisions · 30 days": newest first, each row opens its tender. */
export function lateDecisionsPanel(ctx: KpiCtx, late: { l: Lifecycle; g: GateRecord }[], all: number, table: Exclude<DrillVM, { kind: 'list' }>): ListPanelVM {
  const rows = [...late].sort((a, b) => b.g.at.localeCompare(a.g.at)).map(({ l, g }): ListRowVM => {
    const by = personById(g.byId);
    const how = `${lateBy(g)} late`;
    return {
      id: `${g.gate}:${l.tenderId}:${g.at}`,
      label: `${g.gate} on ${l.tenderId}, ${how}. Open the tender`,
      to: tenderPath(l.tenderId),
      cells: {
        gate: { text: g.gate, mono: true },
        tender: { text: l.tenderId, sub: l.shortTitle, mono: true },
        by: { text: by?.name ?? 'Not recorded', sub: by?.title },
        opened: { text: when(g.openedAt), sub: `Decided ${when(g.at)}` },
        limit: { text: `${g.slaHours} h` },
        late: { text: how },
      },
    };
  });
  return {
    kind: 'late-decisions',
    title: `Late gate decisions · ${ctx.window.label}`,
    lede: rows.length
      ? `${count(rows.length, 'gate decision')} of ${all} in the period ${rows.length === 1 ? 'was' : 'were'} made after the time limit. Newest first; click a row to open the tender.`
      : `All ${count(all, 'gate decision')} in the period were made within the time limit.`,
    columns: [
      { key: 'gate', label: 'Gate', width: '64px' },
      { key: 'tender', label: 'Tender', width: '1.5fr' },
      { key: 'by', label: 'Decided by', width: '1.2fr' },
      { key: 'opened', label: 'Gate opened', width: '1.25fr' },
      { key: 'limit', label: 'Limit', width: '64px' },
      { key: 'late', label: 'How late', width: '1fr' },
    ],
    rows,
    empty: 'No late gate decisions in this period.',
    foot: { label: `Show all ${count(all, 'decision')} in the table`, drill: table },
  };
}

export const DOCUMENT_STATUS: Record<DocumentStatus, { label: string; tone: Tone; icon: string }> = {
  expired: { label: 'Expired', tone: 'red', icon: '×' },
  expiring: { label: 'Expiring before a bid', tone: 'orange', icon: '!' },
  valid: { label: 'Valid', tone: 'green', icon: '✓' },
};

const CHECK_WORD: Record<CompanyDocument['bids'][number]['checkLabel'], string> = { opens: 'opens', 'is submitted': 'submitted', 'stays valid': 'valid to' };

/** "30 Apr", with the year only outside the demo year ("14 Nov 2027"). */
const dateOf = (iso: string) => dayMonth(iso);

/** Documentation gaps → "Company documents": every vault document, gaps first. */
export function documentsPanel(ctx: KpiCtx, docs: CompanyDocument[]): ListPanelVM {
  const company = can(ctx.viewer, 'company.view').ok && isScreenBuilt('/company');
  const gaps = docs.filter((d) => d.status !== 'valid').length;
  const rows = docs.map((d): ListRowVM => {
    const c = d.cred;
    const owner = personById(c.ownerId);
    const [first, ...rest] = d.bids;
    const s = DOCUMENT_STATUS[d.status];
    return {
      id: c.id,
      label: `${c.label}: ${s.label}${d.validTo ? `, expires ${dateOf(d.validTo)}` : ''}${company ? '. Open it in Company › Credentials' : ''}`,
      ...(company ? { to: `/company?tab=credentials&cred=${encodeURIComponent(c.id)}` } : {}),
      cells: {
        doc: { text: c.label, sub: c.issuer },
        number: { text: c.number ?? 'None', mono: !!c.number },
        expires: { text: d.validTo ? dateOf(d.validTo) : 'No expiry', mono: !!d.validTo },
        status: { text: s.label, pill: s },
        bids: first
          ? { text: `${first.l.tenderId}, ${CHECK_WORD[first.checkLabel]} ${dateOf(first.checkDate)}`, sub: rest.length ? `and ${count(rest.length, 'more live bid')}` : undefined }
          : { text: 'None' },
        owner: { text: owner?.name ?? 'No owner named', sub: owner?.title },
        renewal: { text: d.renewed ? 'Renewed' : d.requested ? 'Requested' : d.status === 'valid' ? 'Not needed' : 'Not requested' },
      },
    };
  });
  return {
    kind: 'documents',
    title: 'Company documents',
    lede: `Every document in the credentials vault, ${gaps ? `the ${count(gaps, 'gap')} first` : 'none with a gap'}. A document has a gap when it has expired, or expires before a live bid needs it.`,
    columns: [
      { key: 'doc', label: 'Document', width: '1.7fr' },
      { key: 'number', label: 'Number', width: '.8fr' },
      { key: 'expires', label: 'Expires', width: '96px' },
      { key: 'status', label: 'Status', width: '150px' },
      { key: 'bids', label: 'Live bids affected', width: '1.3fr' },
      { key: 'owner', label: 'Owner', width: '1.1fr' },
      { key: 'renewal', label: 'Renewal', width: '108px' },
    ],
    rows,
    empty: 'No documents in the credentials vault yet.',
    ...(company ? { foot: { label: 'Open Company › Credentials', drill: { kind: 'route', to: '/company?tab=credentials&bids=affects', label: 'Open Company › Credentials' } } } : {}),
  };
}

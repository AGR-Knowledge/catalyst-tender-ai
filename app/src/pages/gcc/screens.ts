/// <reference types="vite/client" />
import type { ComponentType } from 'react';
import type { Capability } from '@/data/access';
import { stageOf } from '@/data/gcc/stages';

/**
 * The GCC screen map: every working screen the sidebar links to, whether it is
 * built yet, and what it will do. `App.tsx` makes one route per entry. Until a
 * screen is built its route shows `ComingNext`, and action rows say "Open
 * tender" instead of "Open DG3" (dashboards.md §4). Each plan that builds a
 * screen flips its `built` to true and adds its `page`, here and nowhere else.
 */
export interface ScreenInfo {
  name: string;
  /** One line: what the screen is for. */
  line: string;
  /** The plan that builds it. */
  plan: string;
  built: boolean;
  /** Who may open it (the same capability as its sidebar entry). The route guards it. */
  cap?: Capability;
  /** The page, loaded on demand once `built`: `page: () => import('./s1/Radar')` (a default export). */
  page?: () => Promise<{ default: ComponentType }>;
}

export const SCREENS: Record<string, ScreenInfo> = {
  '/calendar': { name: 'Calendar', line: 'Every deadline, site visit and gate across your tenders, in the authority’s time zone.', plan: '007', built: true, cap: 'tender.view', page: () => import('./s1/Calendar') },
  '/radar': { name: 'Tender radar', line: 'Every notice captured from your portals, mailboxes and scanned post, with the health of each source.', plan: '007', built: true, cap: 'radar.view', page: () => import('./s1/Radar') },
  '/intake-queue': { name: 'Intake queue', line: 'Values the Intake Agent read with low confidence, for a person to check before DG1.', plan: '007', built: true, cap: 'queue.view', page: () => import('./s1/IntakeQueue') },
  '/screening': { name: 'Screening', line: 'Eligibility against the credentials vault, and the fit score, for each tender.', plan: '007', built: true, cap: 'screening.view', page: () => import('./s1/Screening') },
  '/dg1': { name: 'DG1 decisions', line: 'Pursue or discard, recorded by the assigned Bid Manager with the evidence pack.', plan: '007', built: true, cap: 'dg1.view', page: () => import('./s1/Dg1') },
  '/sourcing': { name: 'Packages & RFQs', line: 'Scope packages, supplier shortlists and RFQs, with their reply clock.', plan: '008', built: true, cap: 'sourcing.view', page: () => import('./s2/Sourcing') },
  '/levelling': { name: 'Quote levelling', line: 'Supplier quotes made comparable: currency, VAT, delivery terms and exclusions.', plan: '008', built: true, cap: 'levelling.view', page: () => import('./s2/Levelling') },
  '/suppliers': { name: 'Suppliers', line: 'The supplier master, with each supplier’s screening status.', plan: '008', built: true, cap: 'supplier.view', page: () => import('./s2/Suppliers') },
  '/packs': { name: 'Bid packs', line: 'The Bid / No-Bid pack for the committee, with its freshness and the inputs it waits on.', plan: '009', built: true, cap: 'pack.view', page: () => import('./s3/Packs') },
  '/dg2': { name: 'DG2 approvals', line: 'Committee positions, then the final Bid / No-Bid approval by the Head of Tendering.', plan: '009', built: true, cap: 'dg2.view', page: () => import('./dg2/Dg2') },
  '/dg3': { name: 'DG3 approvals', line: 'Final bid approval by the Head of Tendering.', plan: '018', built: true, cap: 'dg3.view', page: () => import('./dg3/Dg3') },
  '/company': { name: 'Company', line: 'The credentials vault, capability profile, bank facility and tendering teams.', plan: '010', built: true, cap: 'company.view', page: () => import('./company/Company') },
  '/admin': { name: 'Administration', line: 'Users and roles, committees and gates, sources, the fit model, targets, branding and the audit log.', plan: '024', built: true, cap: 'admin.view', page: () => import('./admin/Admin') },
  '/admin/users': { name: 'Users & roles', line: 'Who has which role and scope, with View as.', plan: '024', built: true, cap: 'admin.users', page: () => import('./admin/Users') },
  '/admin/committees': { name: 'Committees & gates', line: 'Committee seats, quorum and the owner of each gate.', plan: '024', built: true, cap: 'admin.gates', page: () => import('./admin/Committees') },
  '/admin/sources': { name: 'Sources & integrations', line: 'The portals, mailboxes and scanned drops the Intake Agent watches.', plan: '024', built: true, cap: 'admin.sources', page: () => import('./admin/Sources') },
  '/admin/fit': { name: 'Fit model & rules', line: 'Fit weights, the pursue threshold and the value band, with their live impact.', plan: '024', built: true, cap: 'admin.fit', page: () => import('./admin/FitModel') },
  '/admin/targets': { name: 'Targets & SLAs', line: 'Gate time limits and the thresholds behind every dashboard tone.', plan: '024', built: true, cap: 'admin.targets', page: () => import('./admin/Targets') },
  '/admin/branding': { name: 'Branding', line: 'The company mark and accent colour.', plan: '024', built: true, cap: 'admin.branding', page: () => import('./admin/Branding') },
  '/admin/audit': { name: 'Audit log', line: 'Every decision and action: who, when and why.', plan: '010', built: true, cap: 'audit.view', page: () => import('./admin/AuditLog') },
};

/** True once the screen at `path` exists, so an action can open it directly. */
export const isScreenBuilt = (path: string): boolean => !!SCREENS[path.split('?')[0]]?.built;

/** The top-bar title and line for a GCC path, or null when no such page exists. */
export function screenHead(pathname: string): { title: string; sub?: string } | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/' || path === '/dashboard') return { title: 'Dashboard' };
  if (path === '/requests') return { title: 'My requests', sub: 'Everything the bid teams are waiting for from you.' };
  const stage = /^\/stages\/(\d+)$/.exec(path);
  if (stage) {
    const s = stageOf(Number(stage[1]));
    return s ? { title: `Stage ${s.n} · ${s.short}`, sub: s.full } : null;
  }
  const tender = /^\/tenders\/([^/]+)$/.exec(path);
  // The page header carries the tender's identity; the top bar names the place (019 review).
  if (tender) return { title: 'Tender workspace', sub: 'Documents, requirements, sourcing and decisions for one bid.' };
  if (import.meta.env.DEV && path === '/dev/checks') return { title: 'Dev checks', sub: 'Tenant foundation, people and seed data. Development only.' };
  if (import.meta.env.DEV && path === '/dev/kit') return { title: 'Kit preview', sub: 'Every dashboard component on fixture data. Development only.' };
  const screen = SCREENS[path];
  return screen ? { title: screen.name, sub: screen.line } : null;
}

import { useCallback, useEffect, type RefObject } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { RoleKey } from '@/data/types';
import { roleOf } from '@/data/roles';
import { useDemo } from './store';

export type NavKey = string;

function scrollToId(id: string, tries = 12) {
  const el = document.getElementById(id);
  if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  if (tries > 0) window.setTimeout(() => scrollToId(id, tries - 1), 50);
}

export function useGo() {
  const navigate = useNavigate();
  const loc = useLocation();
  const { state, setRole, closeDrawer, closeModal, toast } = useDemo();

  /** Switch persona (demo control) and open that persona's dashboard. */
  const goRole = useCallback((role: RoleKey, opts: { nav?: NavKey; announce?: string | boolean } = {}) => {
    setRole(role);
    closeDrawer();
    closeModal();
    navigate(`/dashboard/${role}`, { state: { nav: opts.nav ?? 'dash' } });
    if (opts.announce) {
      const r = roleOf(role);
      toast(typeof opts.announce === 'string' ? opts.announce : `Signed in as ${r.name} (${r.view})`, 'ink3');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigate, setRole, closeDrawer, closeModal, toast]);

  /** Jump to a section of the current persona's own dashboard. */
  const goSection = useCallback((anchor: string, nav?: NavKey) => {
    closeDrawer();
    closeModal();
    const path = `/dashboard/${state.role}`;
    if (loc.pathname !== path || (loc.state as { nav?: string } | null)?.nav !== nav) navigate(path, { state: { nav: nav ?? 'dash' } });
    scrollToId(anchor);
  }, [navigate, loc.pathname, loc.state, state.role, closeDrawer, closeModal]);

  const goPage = useCallback((path: string) => {
    closeDrawer();
    closeModal();
    navigate(path);
    window.scrollTo({ top: 0 });
  }, [navigate, closeDrawer, closeModal]);

  return { goRole, goSection, goPage };
}

/** A persona cannot open another role's workspace; it notifies the owner instead. */
export function useNudge() {
  const { toast, closeDrawer } = useDemo();
  return useCallback((role: RoleKey, what: string, name?: string) => {
    const r = roleOf(role);
    closeDrawer();
    toast(`Reminder sent to ${name ?? r.name} (${r.short}): ${what}`, 'ink3');
  }, [toast, closeDrawer]);
}

export function useClickOutside(ref: RefObject<HTMLElement>, onOutside: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const h = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onOutside(); };
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h);
    document.addEventListener('keydown', k);
    return () => {
      document.removeEventListener('mousedown', h);
      document.removeEventListener('touchstart', h);
      document.removeEventListener('keydown', k);
    };
  }, [ref, onOutside, active]);
}

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import type { RoleKey, Tone } from '@/data/types';
import type { ScenarioKey } from '@/data/workspace';
import { isRoleKey } from '@/data/roles';
import { EXIT_MS } from './presence';

/* Overlay descriptors. Overlays render from live state, so they never go stale. */
export type DrawerSpec =
  | { type: 'tender'; id: string }
  | { type: 'agent'; index: number }
  | { type: 'supplier'; name: string }
  | { type: 'package'; key: string }
  | { type: 'artefact'; index: number }
  | { type: 'project'; key: string }
  | { type: 'redline'; key: string }
  | { type: 'cost'; key: string };

export type ModalSpec =
  | { type: 'dg1'; id: string }
  | { type: 'dg2'; id: string }
  | { type: 'validation'; key: string }
  | { type: 'gap' }
  | { type: 'dg3' }
  | { type: 'submit' }
  | { type: 'sme' }
  | { type: 'reset' }
  | { type: 'upload' };

export interface Toast { id: number; msg: string; tone: Tone; leaving?: boolean }

/** A document dropped into the upload modal. Processing is timed from `startedAt`, so it carries on if the modal closes. */
export interface Upload {
  id: string;
  file: string;
  size: number;
  startedAt: number;
  /** Tender id once the extraction is added to the register. */
  tenderId?: string;
  /** Who uploaded it (persona name). */
  by: string;
}

interface Persisted {
  /** Actions taken during the demo. Value records the outcome (e.g. 'approved', 'declined'). */
  done: Record<string, string>;
  uploads: Upload[];
  scenario: ScenarioKey;
  role: RoleKey;
  showBanner: boolean;
}

interface State extends Persisted {
  drawer: DrawerSpec | null;
  modal: ModalSpec | null;
  toasts: Toast[];
}

type Action =
  | { type: 'mark'; key: string; value: string }
  | { type: 'scenario'; value: ScenarioKey }
  | { type: 'role'; value: RoleKey }
  | { type: 'banner'; value: boolean }
  | { type: 'drawer'; value: DrawerSpec | null }
  | { type: 'modal'; value: ModalSpec | null }
  | { type: 'toast'; value: Toast }
  | { type: 'untoast'; id: number }
  | { type: 'toastLeave'; id: number }
  | { type: 'addUpload'; value: Upload }
  | { type: 'registerUpload'; id: string; tenderId: string }
  | { type: 'removeUpload'; id: string }
  | { type: 'reset' };

const STORAGE_KEY = 'ctai.demo.v1';
const DEFAULTS: Persisted = { done: {}, uploads: [], scenario: 'base', role: 'bid', showBanner: true };

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<Persisted>;
    return {
      done: p.done && typeof p.done === 'object' ? p.done : {},
      uploads: Array.isArray(p.uploads) ? p.uploads.filter((u) => u && typeof u.id === 'string' && typeof u.file === 'string') : [],
      scenario: p.scenario === 'stretch' || p.scenario === 'defensive' ? p.scenario : 'base',
      role: isRoleKey(p.role) ? p.role : 'bid',
      showBanner: p.showBanner !== false,
    };
  } catch {
    return DEFAULTS;
  }
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'mark': return { ...s, done: { ...s.done, [a.key]: a.value }, modal: null, drawer: null };
    case 'scenario': return { ...s, scenario: a.value };
    case 'role': return { ...s, role: a.value };
    case 'banner': return { ...s, showBanner: a.value };
    case 'drawer': return { ...s, drawer: a.value, modal: null };
    case 'modal': return { ...s, modal: a.value };
    case 'toast': return { ...s, toasts: [...s.toasts.slice(-3), a.value] };
    case 'untoast': return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) };
    case 'toastLeave': return { ...s, toasts: s.toasts.map((t) => (t.id === a.id ? { ...t, leaving: true } : t)) };
    case 'addUpload': return { ...s, uploads: [...s.uploads, a.value] };
    case 'registerUpload': return { ...s, uploads: s.uploads.map((u) => (u.id === a.id ? { ...u, tenderId: a.tenderId } : u)) };
    case 'removeUpload': return { ...s, uploads: s.uploads.filter((u) => u.id !== a.id) };
    case 'reset': return { ...s, ...DEFAULTS, role: s.role, showBanner: s.showBanner, drawer: null, modal: null };
  }
}

interface Api {
  state: State;
  is: (key: string) => boolean;
  val: (key: string) => string | undefined;
  mark: (key: string, msg?: string, tone?: Tone, value?: string) => void;
  toast: (msg: string, tone?: Tone) => void;
  setScenario: (v: ScenarioKey) => void;
  setRole: (v: RoleKey) => void;
  setBanner: (v: boolean) => void;
  openDrawer: (d: DrawerSpec) => void;
  closeDrawer: () => void;
  openModal: (m: ModalSpec) => void;
  closeModal: () => void;
  reset: () => void;
  addUpload: (u: Upload) => void;
  registerUpload: (id: string, tenderId: string) => void;
  removeUpload: (id: string) => void;
}

const Ctx = createContext<Api | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({ ...load(), drawer: null, modal: null, toasts: [] }));
  const seq = useRef(0);

  useEffect(() => {
    try {
      const { done, uploads, scenario, role, showBanner } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ done, uploads, scenario, role, showBanner }));
    } catch { /* storage unavailable; the demo still works in memory */ }
  }, [state.done, state.uploads, state.scenario, state.role, state.showBanner]); // eslint-disable-line react-hooks/exhaustive-deps

  const toast = useCallback((msg: string, tone: Tone = 'green') => {
    const id = ++seq.current;
    dispatch({ type: 'toast', value: { id, msg, tone } });
    window.setTimeout(() => dispatch({ type: 'toastLeave', id }), 4000);
    window.setTimeout(() => dispatch({ type: 'untoast', id }), 4000 + EXIT_MS);
  }, []);

  const api = useMemo<Api>(() => ({
    state,
    is: (k) => !!state.done[k],
    val: (k) => state.done[k],
    mark: (key, msg, tone, value = 'yes') => {
      dispatch({ type: 'mark', key, value });
      if (msg) toast(msg, tone);
    },
    toast,
    setScenario: (v) => dispatch({ type: 'scenario', value: v }),
    setRole: (v) => dispatch({ type: 'role', value: v }),
    setBanner: (v) => dispatch({ type: 'banner', value: v }),
    openDrawer: (d) => dispatch({ type: 'drawer', value: d }),
    closeDrawer: () => dispatch({ type: 'drawer', value: null }),
    openModal: (m) => dispatch({ type: 'modal', value: m }),
    closeModal: () => dispatch({ type: 'modal', value: null }),
    addUpload: (u) => dispatch({ type: 'addUpload', value: u }),
    registerUpload: (id, tenderId) => dispatch({ type: 'registerUpload', id, tenderId }),
    removeUpload: (id) => dispatch({ type: 'removeUpload', id }),
    reset: () => { dispatch({ type: 'reset' }); toast('Demo reset. Tenders are back at their starting positions', 'ink3'); },
  }), [state, toast]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useDemo(): Api {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDemo must be used inside DemoProvider');
  return v;
}

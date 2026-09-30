/// <reference types="vite/client" />
import { LOGIN_EMAIL, LOGIN_PASSWORD_SHA256, LOGIN_SALT } from '@/data/login';

/*
 * The sign-in gate (plan 038). A gate for a sales demo, not security: with no
 * backend, anyone who reads the JavaScript can get round it. Its record lives
 * under `ctai.login`, outside `ctai.demo.*`, so Reset demo leaves it alone.
 * Every storage call is guarded, with an in-memory copy, so signing in still
 * works when the browser blocks storage.
 */

const KEY = 'ctai.login';
const GATE_KEY = 'ctai.login.gate';
/** A record signs in only while it carries the current hash's first 12 characters: a new hash signs everybody out. */
const HASH_KEY = LOGIN_PASSWORD_SHA256.slice(0, 12);

interface LoginRecord { email: string; at: string; key: string }

const local = () => window.localStorage;
const session = () => window.sessionStorage;

let memLogin: string | null = null;
let memGate = false;
/** Set once `localStorage` fails to read or write: from then on the in-memory copy carries this tab. */
let memOnly = false;

function read(store: () => Storage, key: string): string | null {
  try { return store().getItem(key); } catch { if (store === local) memOnly = true; return null; }
}
function write(store: () => Storage, key: string, value: string | null) {
  try {
    if (value === null) store().removeItem(key);
    else store().setItem(key, value);
  } catch { if (store === local) memOnly = true; }
}

/** Lowercase hex SHA-256. Throws when `crypto.subtle` is missing (plain http off localhost). */
export async function sha256Hex(text: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('crypto.subtle is unavailable');
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Production builds are always gated. On the dev server, other sessions share
 * the same port and don't know the password, so only a tab that has opened
 * `/login` is gated, until that tab closes.
 */
export function gateOn(): boolean {
  if (import.meta.env.PROD) return true;
  return memGate || read(session, GATE_KEY) === 'on';
}

/** Gates this dev tab from now on. A no-op in production, where the gate is always on. */
export function enableDevGate(): void {
  if (import.meta.env.PROD) return;
  memGate = true;
  write(session, GATE_KEY, 'on');
}

export function isSignedIn(): boolean {
  if (!gateOn()) return true;
  const stored = read(local, KEY);
  const raw = memOnly ? memLogin : stored;
  if (!raw) return false;
  try {
    return (JSON.parse(raw) as Partial<LoginRecord>).key === HASH_KEY;
  } catch {
    return false;
  }
}

/** The email matches in any letter case; the password is hashed as typed, never trimmed and never logged. */
export async function signIn(email: string, password: string): Promise<boolean> {
  const hash = await sha256Hex(LOGIN_SALT + password);
  if (email.trim().toLowerCase() !== LOGIN_EMAIL.toLowerCase() || hash !== LOGIN_PASSWORD_SHA256) return false;
  // Wall-clock time, not the demo clock: signing in is not demo state.
  const record: LoginRecord = { email: LOGIN_EMAIL, at: new Date().toISOString(), key: HASH_KEY };
  memLogin = JSON.stringify(record);
  write(local, KEY, memLogin);
  return true;
}

/** Clears the sign-in only. Demo state, theme and sidebar preferences stay. */
export function signOut(): void {
  memLogin = null;
  write(local, KEY, null);
}

/** Where to go after signing in: a path on this site, never back to `/login`, otherwise `/`. */
export function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  // Browsers drop tabs and newlines from URLs, so `/\t/x.com` would become `//x.com`.
  if (/[\u0000-\u001f\u007f]/.test(raw)) return '/';
  if (raw === '/login' || /^\/login[/?#]/.test(raw)) return '/';
  return raw;
}

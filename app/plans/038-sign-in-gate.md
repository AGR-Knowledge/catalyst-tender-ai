# 038 — The sign-in page

Status: DONE (2026-09-30, reviewed) · Depends on: none · Can run in parallel with: 035, 036, 037

## Goal
Before anything else, the deployed demo shows a **Sign in** page. It opens only for one fixed email address and password, which we give to the people we invite. A visitor without them sees nothing of the workbench. Sign out in the persona menu really signs you out and returns you to the page.

## Context
- **Why:** the user's request of 2026-09-30: "a login page … a static username and password, with which we can login". The user supplies the email's domain. The demo is on a public Vercel URL (`vercel.json`), and today anyone who has the link can open it.
- **This is a gate, not security.** The app has no backend, so anyone who reads the JavaScript can get round it. Its job is to keep casual visitors out of a sales demo. Build nothing that pretends otherwise: no "Forgot password", no account creation, no single sign-on buttons, no lock-out.
- **The repo is PUBLIC** (CLAUDE.md, Confidentiality). **The password never goes into any tracked file** in plain text, including this plan's execution report, code comments and commit messages. The repo holds only the password's SHA-256 hash. Build and test with the **placeholder credentials** below. The orchestrator replaces them with the real email and hash at review, before the commit.
- **The personas stay a demo control** (CLAUDE.md app rule 5). Signing in opens the workbench, and whoever you pick in the persona menu is still a labelled demo switch. The sign-in page names no persona, role or tenant.
- **Current behaviour:**
  - `App.tsx` routes everything directly: `supplier-portal`, the `AppShell` routes and `platform`. No route checks anything first.
  - `components/layout/Header.tsx:212` and `:248`: both persona menus have a "Sign out" button that only toasts "Session ended. Sign in again to resume".
  - `pages/platform/PlatformShell.tsx:137`: the console's persona menu has no Sign out.
  - Settings › Reset demo clears `ctai.demo.v2` only (`state/store.tsx:321`, `:413`). Other `ctai.*` keys (theme, sidebar, period) survive it.
  - Vercel serves over https, so `crypto.subtle` is available. The catch-all rewrite in `vercel.json` already sends `/login` to `index.html`.
- **Other sessions are working in this checkout right now** (plans 035, 036, 037). They use the dev server on port 5173 and don't know the password. That is why, **on the dev server, the gate is on only in a browser tab that has opened `/login`** (step 1.2.2). Every other tab works as it does today. Production builds (`npm run build`, Vercel, `vite preview`) are always gated.

### Placeholder credentials (for building and testing only)
| | |
| --- | --- |
| Email | `demo@example.com` |
| Password | `placeholder-change-me` |
| `LOGIN_PASSWORD_SHA256` | `3f916b64b0dd154a2f08d3327de62e072b0edc03c09c263190cd93dd4a446968`, the SHA-256 of `ctai-login-v1:placeholder-change-me` |

## Scope
- **Files to create:**
  - `app/src/data/login.ts`: the email and the password hash;
  - `app/src/state/auth.ts`: the gate, sign in, sign out and the `next` check;
  - `app/src/pages/login/Login.tsx` and `app/src/pages/login/login.css`;
  - `app/scripts/login-hash.mjs`: prints the hash for a password.
- **Files to change:**
  - `app/src/App.tsx`: the `/login` route, and a `RequireLogin` layout route around every other route;
  - `app/src/components/layout/Header.tsx`: the two Sign out buttons (lines 212 and 248) only;
  - `app/src/pages/platform/PlatformShell.tsx`: a Sign out in the persona menu's foot (line 137);
  - `app/package.json`: one script, `"login:hash": "node scripts/login-hash.mjs"`;
  - `.claude/launch.json`: one new configuration, `app-preview` (step 3.1);
  - `app/README.md`: a short "Signing in" section;
  - `app/plans/README.md`: this plan's status cell only.
- **Out of scope:** stop and ask before touching any of these.
  - Every file plans 035, 036 and 037 own (`app/plans/README.md`, the Wave 11 section). In particular: `data/access.ts`, `Sidebar.tsx`, `pages/gcc/screens.ts`, `state/store.tsx`, and everything under `docs/`. The orchestrator adds the runbook line after review.
  - More than one account, per-person accounts, roles from the sign-in, or any link between the email and a persona.
  - A backend, cookies, an expiry timer, lock-out after failed attempts, "Remember me", "Forgot password", SSO.
  - Changing what Reset demo clears.
  - New libraries. Use `lucide-react` icons (already installed), the `.btn` and `.fld` classes and the tokens in `tokens.css`.

## Steps

### Phase 1: The gate
- [x] 1.1 `app/src/data/login.ts`
  - [x] 1.1.1 Export `LOGIN_EMAIL = 'demo@example.com'` and `LOGIN_PASSWORD_SHA256`, the placeholder hash from the table above. The comment says in one line that this is a demo gate, not security, and that the password is never stored in the repo, only its hash (`npm --prefix app run login:hash`).
  - [x] 1.1.2 Export `LOGIN_SALT = 'ctai-login-v1:'`. The hash is SHA-256 of `LOGIN_SALT + password`, in lowercase hex. The email is not part of the hash, so the address can change without a new hash.
- [x] 1.2 `app/src/state/auth.ts` (no JSX; every storage read and write in try/catch, with an in-memory fallback so sign-in still works when storage is blocked)
  - [x] 1.2.1 `sha256Hex(text): Promise<string>` with `crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))`. When `crypto.subtle` is missing, it throws, and the page shows its own sentence for that (step 2.3.4).
  - [x] 1.2.2 `gateOn(): boolean`. It returns `true` when `import.meta.env.PROD`. In development, it returns `true` only when `sessionStorage['ctai.login.gate'] === 'on'`, and `enableDevGate()` sets that. The comment explains why: sessions share the dev server. (acceptance: in dev, a tab that never opened `/login` is never redirected.)
  - [x] 1.2.3 `isSignedIn(): boolean`. It returns `true` when the gate is off. Otherwise it returns `true` when `localStorage['ctai.login']` holds `{ email, at, key }` whose `key` equals the first 12 characters of `LOGIN_PASSWORD_SHA256`. So replacing the hash signs everybody out. The key is `ctai.login`, not `ctai.demo.*`, so Reset demo leaves it alone.
  - [x] 1.2.4 `signIn(email, password): Promise<boolean>`. The email matches when `email.trim().toLowerCase() === LOGIN_EMAIL.toLowerCase()`, and the password when `sha256Hex(LOGIN_SALT + password) === LOGIN_PASSWORD_SHA256`. The password is not trimmed. On a match, write `ctai.login` with the real wall-clock time (`new Date().toISOString()`, not the demo clock; it is not demo state) and return `true`. Never log the password or the typed values to the console.
  - [x] 1.2.5 `signOut(): void` removes `ctai.login` only. The demo state, theme and sidebar preferences stay.
  - [x] 1.2.6 `safeNext(raw: string | null): string` returns `raw` only when it starts with `/`, does not start with `//` or `/\`, and is not `/login` or a path under it. Otherwise it returns `/`. (acceptance: `https://x.com`, `//x.com` and `/login?next=/` all give `/`.)
- [x] 1.3 `app/src/App.tsx`
  - [x] 1.3.1 Add `function RequireLogin()`. If `isSignedIn()`, it renders `<Outlet />`. Otherwise it renders `<Navigate replace to="/login?next=…">`, with `next` as `encodeURIComponent(pathname + search + hash)`, and no `next` at all when that is `/`.
  - [x] 1.3.2 Wrap every existing route (`supplier-portal`, the `AppShell` block and the `platform` block) in one `<Route element={<RequireLogin />}>`. Leave their elements unchanged.
  - [x] 1.3.3 Add `<Route path="login" element={<Login />} />` outside `RequireLogin`. The login page is small, so import it directly, not lazily: it must paint with no loading flash.

### Phase 2: The sign-in page (`pages/login/Login.tsx`, `login.css`)
Sketch (a single centred card; the page background is `--bg`, the card `--surface` with `--line` border and the usual radius):
```
                ┌────────────────────────────────────────┐
                │ [C] Catalyst Tender AI                 │
                │     Tender workbench                   │
                │                                        │
                │ Sign in                                │
                │ Use the details you were sent with     │
                │ this link.                             │
                │                                        │
                │ Email                                  │
                │ [                                   ]  │
                │ Password                               │
                │ [                           ] [Show]   │
                │                                        │
                │ (one error sentence, when there is one)│
                │ [              Sign in               ] │
                │                                        │
                │ No sign-in details? Ask the person who │
                │ shared this link with you.             │
                └────────────────────────────────────────┘
          Prototype: indicative UI, illustrative data
```
- [x] 2.1 Layout
  - [x] 2.1.1 The page is full height, with no sidebar, header or tenant accent. The card is 400 px wide at most, centred on both axes. At 375 px wide it keeps a 16 px side gutter and never scrolls sideways.
  - [x] 2.1.2 The brand row reuses the sidebar's mark: a 28 px "C" tile in `--primary-bg`/`--primary-fg`, "Catalyst Tender AI" in 600 weight, "Tender workbench" below it in `--ink-5`. Restyle it in `login.css`; the `.sb-logo` rules are scoped to the sidebar, so don't rely on them.
  - [x] 2.1.3 Below the card, the same line as the app's footer: "Prototype: indicative UI, illustrative data", in `--ink-5`.
  - [x] 2.1.4 Light and dark both read correctly, from tokens only. The theme follows the saved preference, since `ThemeProvider` already wraps the router. There is no theme toggle on this page.
  - [x] 2.1.5 `document.title` is "Sign in · Catalyst Tender AI" while the page is shown, and goes back to "Catalyst Tender AI" when it leaves.
- [x] 2.2 The form
  - [x] 2.2.1 Use `.fld` fields. **Email:** `type="email"`, `autoComplete="username"`, `autoFocus`, no placeholder text. **Password:** `type="password"`, `autoComplete="current-password"`, with a Show/Hide text button inside the field's right edge (`aria-pressed`, `aria-controls`). The labels are real `<label htmlFor>` elements.
  - [x] 2.2.2 One primary full-width `.btn .btn-primary` "Sign in". Enter submits. While the hash runs, the button reads "Signing in…" and `aria-busy` is set.
  - [x] 2.2.3 On success, `navigate(safeNext(searchParams.get('next')), { replace: true })`.
- [x] 2.3 The words (UK English; never blame the reader; never say which field was wrong)
  - [x] 2.3.1 An empty email on submit: "Enter your email address." An empty password: "Enter the password." Show them under their fields, and move focus to the first empty field.
  - [x] 2.3.2 A wrong email or password: "That email and password don't match. Check both and try again." Show it in one line above the button, with `role="alert"`. Clear the password field, keep the email and focus the password. The error clears as soon as either field is edited.
  - [x] 2.3.3 After Sign out (router state `{ signedOut: true }`), show one neutral line above the form: "You've signed out. Sign in again to carry on where you left off."
  - [x] 2.3.4 When `crypto.subtle` is missing (plain http on a host other than localhost), show: "Sign-in needs a secure connection. Open the https address instead."
- [x] 2.4 Routing on the page itself
  - [x] 2.4.1 On first render, call `enableDevGate()` (a no-op in production), so a dev tab that opens `/login` is gated from then on.
  - [x] 2.4.2 If already signed in (after 2.4.1), render `<Navigate replace to={safeNext(next)} />` instead of the form.

### Phase 3: Sign out, the production check, the docs
- [x] 3.1 Sign out
  - [x] 3.1.1 In `Header.tsx`, both "Sign out" buttons (lines 212 and 248) close the menu, call `signOut()` and `navigate('/login', { replace: true, state: { signedOut: true } })`. Remove the old toast. Change nothing else in the header.
  - [x] 3.1.2 In `PlatformShell.tsx`, the persona menu's `.pop-foot` (line 137) gains the same "Sign out" `btn-link`, styled as the header's (`color: var(--ink-3)`), after its sentence.
- [x] 3.2 `app/scripts/login-hash.mjs` and the npm script
  - [x] 3.2.1 `npm --prefix app run login:hash` asks "Password: " on the terminal with `node:readline`, so the password doesn't land in shell history. It prints only the hex SHA-256 of `ctai-login-v1:` + the answer, with `node:crypto`. The salt matches `LOGIN_SALT`. A one-line comment says to paste the output into `LOGIN_PASSWORD_SHA256`. (acceptance: typing `placeholder-change-me` prints the placeholder hash above.)
- [x] 3.3 A preview configuration for the production build
  - [x] 3.3.1 In `.claude/launch.json`, add a second configuration, next to `app`: `{ "name": "app-preview", "runtimeExecutable": "npm", "runtimeArgs": ["--prefix", "app", "run", "preview", "--", "--port", "4173", "--strictPort"], "port": 4173 }`. Don't change the `app` entry.
- [x] 3.4 `app/README.md`: a "Signing in" section of four to six lines:
  - the deployed demo asks for one email and password;
  - the repo holds only the hash, in `src/data/login.ts`;
  - to change the password, run `npm --prefix app run login:hash`, paste the output and commit. Everyone is then signed out;
  - on the dev server, the gate applies only in a tab that has opened `/login`;
  - Reset demo doesn't sign you out, and signing out keeps the demo state.

## Data and derivation
- **Facts:** `src/data/login.ts` holds `LOGIN_EMAIL`, `LOGIN_SALT` and `LOGIN_PASSWORD_SHA256`.
- **New storage:**
  - `localStorage['ctai.login']`, which Sign out clears and Reset demo deliberately does not;
  - `sessionStorage['ctai.login.gate']`, in development only, which lasts until the tab closes.
- **No `done` keys, no audit entries, and no change to `domain/`.** Signing in is not a demo action.

## Acceptance checks
- [x] `npm --prefix app run typecheck` and `npm --prefix app run build` pass.
- [x] **Dev server, your own tab** (`preview_start` with name `app`. Another session may already run it, so reuse it; open your own tab):
  - [x] a tab that has not opened `/login` works exactly as before, with no redirect;
  - [x] open `/login` and sign in with the placeholder credentials. You land on `/`, and a reload keeps you signed in;
  - [x] a wrong password shows the sentence from 2.3.2 and clears the password. An empty submit shows 2.3.1. The email matches in any letter case (`DEMO@example.com`);
  - [x] persona menu › Sign out goes to `/login` with the 2.3.3 line. Now open `/tenders/T-2025-270?tab=summary`: it redirects to `/login?next=…`, and signing in lands on that exact tender and tab;
  - [x] `/login?next=//example.com` lands on `/` after sign-in;
  - [x] Settings › Reset demo keeps you signed in. Signing out and back in keeps the demo state (e.g. a persona you switched to);
  - [x] the Platform Console (switch to the Catalyst operator persona) › Sign out works the same way;
  - [x] light and dark, 1440 px and 375 px, with no console errors.
- [x] **Production build** (`npm --prefix app run build`, then `preview_start` with name `app-preview`, in a fresh tab):
  - [x] `/` and a deep link both redirect to `/login`, and the placeholder credentials sign in;
  - [x] searching `dist/assets/*.js` for `placeholder-change-me` finds nothing; only the hash is there.
- [x] `grep -rn "placeholder-change-me" app/src` finds nothing. The plaintext appears only in this plan's table.
- [x] No role checks, no hard-coded numbers in pages, and nothing edited outside the Scope list (`git status`).

## Execution report
(Filled in by the executor. **Never write the password here.**)
- **Changed files:**
  - new: `app/src/data/login.ts`, `app/src/state/auth.ts`, `app/src/pages/login/Login.tsx`, `app/src/pages/login/login.css`, `app/scripts/login-hash.mjs`;
  - changed: `app/src/App.tsx` (the `/login` route, `RequireLogin` around every other route), `app/src/components/layout/Header.tsx` (both Sign out buttons, one shared `leave` handler, `useNavigate`), `app/src/pages/platform/PlatformShell.tsx` (Sign out in the persona menu's foot), `app/package.json` (`login:hash`), `.claude/launch.json` (`app-preview`), `app/README.md` ("Signing in"), `app/plans/README.md` (row 038 only).
  - Still the placeholder email and hash: the orchestrator swaps in the real ones before the commit.
- **Verification** (placeholder credentials only):
  - `npm --prefix app run typecheck` and `npm --prefix app run build` pass (the chunk-size warning was already there).
  - `printf … | npm --prefix app run login:hash` with the placeholder prints the placeholder hash, piped and in a pseudo-terminal; in a terminal nothing typed is echoed.
  - `grep -rn` for the placeholder password: nothing in `app/src`, in `dist/assets/*.js` or anywhere else in the checkout outside this plan's table. The bundle holds the hash only.
  - Dev server (`npm --prefix app run dev -- --port 5173 --strictPort`, none was running), headless Chromium, 62 checks, all pass, no console errors:
    - a tab that never opened `/login` opens `/` and `/tenders/T-2025-270?tab=summary` with no redirect, before and after another tab signs out;
    - `safeNext`: `https://x.com`, `//x.com`, `/\x.com`, `/login`, `/login/x`, `/login?next=/`, a tab-smuggled `//` and `null` give `/`; `/tenders/T-1?tab=a#b` and `/loginx` pass through;
    - the page: its title, email focused, an empty submit gives both 2.3.1 sentences and focuses the email, email only focuses the password; a wrong password or a wrong email gives the 2.3.2 alert, clears the password, keeps the email, focuses the password, and editing clears it; Show/Hide toggles `type` and `aria-pressed`;
    - `DEMO@example.com` with Enter lands on `/`, the title goes back, `ctai.login` holds `{ email, at, key }` with the 12-character key and no password; a reload keeps you signed in; `/login` while signed in goes on to `/`;
    - header Sign out: `/login` with the 2.3.3 line, `ctai.login` gone, `ctai.demo.v2` kept; the tender deep link redirects to `/login?next=%2Ftenders%2FT-2025-270%3Ftab%3Dsummary` and signing in lands on that tender and tab; `/login?next=//example.com` lands on `/`;
    - Settings' Reset demo ("Reset this company") keeps you signed in; a persona switched to (Omar Siddiqui, Bid Manager) is still active after signing out and back in;
    - Catalyst operator: `/platform`, the console's persona menu has Sign out, which goes to `/login` with the note; `/platform` then redirects with `next=%2Fplatform` and signing in returns to the console;
    - light and dark at 1440 and 375: the theme follows `ctai.theme`, the card is 400 px and centred at 1440, 343 px with 16 px gutters at 375, no sideways scroll. Screenshots checked by eye, including both persona menus' foot.
  - Production (`npm --prefix app run build`, then the `app-preview` command, fresh browser), 13 checks, all pass, no console errors: `/`, a tender deep link, `/platform` and `/supplier-portal` all redirect to `/login` and render nothing of the workbench; no dev gate key is written; a wrong password is refused; the placeholder signs in to the deep link; a second tab shares the sign-in and is gated again after Sign out; a record carrying another hash's key does not sign in.
  - Also on the production build: with `crypto.subtle` removed, submit shows the 2.3.4 sentence; with a slowed hash the button reads "Signing in…" with `aria-busy="true"`, then signs in.
  - Both servers stopped afterwards (no other connections to 5173).
- **Deviations from plan:**
  - `preview_start` isn't available in this session. I ran the same commands as the `app` and `app-preview` entries and drove a headless Chromium with Playwright from the local npx cache, scripted in the session scratchpad. Nothing was installed and nothing was added to the repo.
  - `safeNext` also refuses control characters. Browsers drop tabs and newlines from URLs, so `/<tab>/x.com` would become `//x.com`.
  - `login-hash.mjs` doesn't echo what is typed, and it writes the prompt to stderr so stdout holds only the hash.
  - Storage fallback: once `localStorage` throws on a read or a write, the tab uses its in-memory copy. Otherwise storage wins, so a sign-out in another tab still counts.
  - The stored `email` is `LOGIN_EMAIL`, not the letter case that was typed.
  - The Show button's accessible name stays "Show password", with `aria-pressed`; its visible text switches between Show and Hide.
  - `.login` sets `--focus-ring` to cyan, because a GCC tenant's `data-tenant` would otherwise tint the focus ring on this page (no tenant accent, 2.1.1).
  - In `App.tsx` the existing routes are indented one level inside the new `RequireLogin` route. Their elements are unchanged.
  - The 2.3.2 sentence wraps to two lines in the 400 px card. I read "one line" as one sentence in one place, and added `text-wrap: pretty`.
- **Blockers / questions:** none.
- **Follow-ups noticed (not done):**
  - Orchestrator, before the commit: the real `LOGIN_EMAIL` and `LOGIN_PASSWORD_SHA256` in `src/data/login.ts` (the hash from `npm --prefix app run login:hash`), and the runbook line.
  - Signing out in one tab doesn't move another open tab to `/login` until that tab navigates or reloads. A `storage` listener would do it; out of scope.
  - Both persona menus still say "In production each user signs in to their own view." next to a Sign out that now really signs out. It still reads true, but it could be reworded.

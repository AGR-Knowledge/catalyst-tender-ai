# Catalyst Tender AI: front-end prototype

React 18 + Vite + TypeScript. There's no backend: all data is typed mock data, and the demo state lives in `localStorage`.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # static site in dist/; deploy to any static host (use SPA fallback to index.html)
```

## How it is organised

| Path | What lives there |
|---|---|
| `src/data/access.ts` | What each persona can see: sidebar sections, shared pages, page guards |
| `src/data/` | The only place facts are written: tender register (18), roles, stages, agents, suppliers, per-role workspace data |
| `src/domain/live.ts` | Derives **every** KPI, count, badge, alert and status from the data + the demo's recorded actions |
| `src/state/` | Demo store (decisions, scenario and persona, all persisted), theme (light/dark/system), navigation helpers |
| `src/components/` | App shell (sidebar, header, global search), UI primitives, responsive `DataTable`, drawers and modals |
| `src/pages/` | 8 role dashboards (`pages/roles`) + Pipeline, Workflow, Agent console, Submission desk, Suppliers, Library, Settings |
| `src/styles/` | Design tokens (`tokens.css`, both themes), layout, components, page styles |

Rule of thumb: **never type a number into a page**. Add it to `src/data` and derive it in `live.ts`. That keeps every role's view consistent.
Replacing the mock layer with an API later means swapping `src/data` for fetches; the pages don't change.

## Demo tips
- Each persona sees only its own scope: sidebar, alerts, search and page access all come from `src/data/access.ts`. Cross-role actions become “Notify / Nudge owner” instead of opening another role's workspace.
- Switching persona is a **demo control**, labelled as such: the profile menu (the “Switch persona” section, marked Demo), the walk-through bar, and “View as” buttons on Workflow and restricted pages.
- Demo "today" is **Sun 08 Mar 2026**.
- `⌘K` / `/` opens global search. Theme toggle is in the header; you can also set it in Settings.
- The walk-through bar at the foot of each dashboard hands the tender role to role.
- **Settings → Reset demo** (or the profile menu) re-opens every gate before a new presentation.

## Tender upload and extraction

"Upload tender" (header, Tender Coordinator and Bid Manager) accepts PDFs by drag and drop or file picker.

- **Recognised files:** the three documents in `data/bids` are matched by file name. Their pre-extracted records live in `src/data/extracted/`, the stand-in for a backend. Every value carries its source page and a confidence level.
- **Processing:** `src/domain/intake.ts` is the mock intake service. It runs timed steps (upload, page read, text, classification, fields, register check, screening) from the upload's start time, so processing carries on when the modal is closed or the page reloads.
- **Unknown files and duplicates:** an unknown file stops after the page read and is queued for the coordinator. Uploading the same document twice is flagged as a duplicate.
- **Review page:** `/intake/:id` shows every extracted field with a link to its page in `public/bids/`.
  - Low and medium confidence fields can be confirmed there.
  - "Add to register" creates the next T-2026 number at Stage 1. A document whose bid date has passed, or that gives no date, is held instead of opening DG1.
- **Adding a new demo document:** add a record to `src/data/extracted/` and list it in `index.ts`.

## Compatibility, BOQ, hand-over and tenants

- **Compatibility** (`src/data/compat.ts`, `src/domain/compat.ts`): each uploaded tender is scored on seven weighted criteria against the bid office profile. The weighted total is the fit-score on the register, and it sets the recommendation: pursue at 65 or above, pursue with conditions from 45, otherwise do not pursue.
- **BOQ and rates** (`/boq`; `src/data/boq.ts`, `src/domain/boq.ts`): every live bid gets a bill built from a shared item catalogue, so the same item can be compared across bids. The bill always totals to the tender value. Quantities stay fixed and rates move with the price, so a Stretch scenario on T-2026-041 raises its rates. Rates more than 8% from the median of other bids are flagged.
- **Hand-over** (`src/domain/handover.ts`): "Hand over to…" opens the package the next owner receives, derived from live state, with an optional note. The next role sees it as "Received from…" at the top of their dashboard.
- **Tenants** (`src/data/tenants.ts`, `src/domain/tenants.ts`): these are the switcher in the top bar, the Tenants card in Settings, the tenant drawer with its onboarding checklist, and "Add tenant". The demo register belongs to Genesis EPC India Ltd. Other tenants stay in onboarding until go-live is booked.

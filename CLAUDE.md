# CLAUDE.md: Catalyst Tender AI

## What this repo is, and what we are doing right now
Catalyst Tender AI is an agentic bid and tender platform for EPC contractors:
- 9 lifecycle stages, 10 AI agents, 3 human decision gates (DG1–DG3), and one Tender Registry;
- **Catalyst** owns it and resells it to EPC companies ("tenants"); **AGR** (us) builds it.

**Current goal: a clickable demo, not the product.** It will be shown to EPC prospects to prove they would buy before the full build is funded. Judge every change by one question: does it make a prospect *feel* a real pain being solved, in a short, believable flow?

**Current focus (decided 2026-09-25):**
- **market:** GCC EPC contractors;
- **depth:** Stages 1–3 with DG1 and DG2;
- **tenants:** five fictional GCC tenants, with one hero tender that gives five different answers;
- **language:** English tenders first, Arabic as a bonus;
- **top persona:** "Head of Tendering", who approves DG2 and DG3. Every role's dashboard is specified in `dashboards.md` (2026-09-25).

The Indian tenant (`gen-in`) stays as the untouched "full lifecycle preview".

Read before any design or build work, in `docs/07-product-design/agr-product-definition/`:
- `product-foundation.md`: why it exists, how it works, the rules every screen must respect, the demo scenarios, known gaps.
- `roles-and-access.md`: every role, what it sees and may do, the permission matrix, the super-admin design (decisions R1–R7 at the top).
- `s1-s3-demo-spec.md`: what the Stage 1–3 GCC demo does, screen by screen, and the demo scripts.
- `kpi-and-screen-catalogue.md`: every KPI (formula, source, target, why) and every role's screen.
- `gcc-demo-data.md`: tenants, people, the hero tender, the seed story, GCC facts with sources.
- `ui-direction.md`: how the two AGR designs combine; components; copy rules; definition of done for a screen.
- `dashboards.md`: **authoritative for dashboards and the sidebar.** One layout for every role, period filter, KPI ⓘ, Table (AG Grid) and Graph (Recharts), tender tracker, the nine short stage names, DG2/DG3 approval by the Head of Tendering, and every role's tiles.

## Repo map
| Path | What |
| --- | --- |
| `app/` | React 18 + Vite + TS front end (no backend). See `app/README.md` |
| `app/plans/` | Numbered implementation plans (`NNN-name.md`) and their status index `README.md` |
| `app/public/bids/` | The 3 real tender PDFs the intake demo recognises by file name. Keep them there |
| `docs/07-product-design/` | **Tracked.** Client wireframes, our designs, product-definition docs |
| `docs/*` (everything else) | **Local only, gitignored:** client spec, proposal, costs, CVs, sample tenders |

## Confidentiality: the repo is PUBLIC (github.com/AGR-Knowledge/catalyst-tender-ai)
- Never `git add -f` anything under `docs/` except `docs/07-product-design/`.
- Never write into tracked files any of: prices, rates, AWS or internal costs, client staff names, the client's confidential operating numbers, CV data.
- Product concepts (stages, gates, agents, roles) are fine.
- Demo data must be synthetic. No real customer data.

## App rules (from app/README.md; they are not optional)
1. **Never type a number into a page.**
   - Facts live only in `app/src/data/`.
   - Every KPI, count, badge, alert and status is derived in `app/src/domain/live.ts`.
   - The same tender must never disagree between two screens.
2. **Access comes from `app/src/data/access.ts`.** That covers sidebar, page guards, search and upload visibility. Don't hard-code role checks in pages. The only existing exceptions are gate checks in `components/overlays/Drawers.tsx`.
3. **Demo state:**
   - Actions write through `mark()` into `store.done`, persisted in `localStorage` under `ctai.demo.v2`.
   - A new action must survive a reload and be cleared by **Settings → Reset demo**.
4. Demo "today" is **Sun 08 Mar 2026** (`TODAY_ISO` in `src/data/tenders.ts`), at 10:00 in the tenant's time zone for GCC tenants.
9. **Two worlds, one shell.**
   - GCC tenants use only the new Stage 1–3 code: `src/data/gcc`, `src/domain/gcc`, `src/pages/gcc`, `src/components/tender`.
   - GCC code never imports Indian data modules, and legacy screens never render for a GCC tenant.
   - Money and dates go through `domain/money.ts` and `domain/calendar.ts`.
   - See `app/plans/README.md` for the architecture decisions.
5. Persona switching is a labelled **demo control**, never presented as a real login.
6. UI copy uses **UK English** (organisation, normalised, programme), is plain and specific, and never blames the user.
7. Reuse existing primitives: `components/ui/*`, drawers, modals, toasts, and the tokens in `src/styles/tokens.css`. No new libraries without the orchestrator's approval.
8. The agents recommend and people decide. Every AI output is labelled as a recommendation, and every decision records who, when and why.

## Commands
```bash
npm --prefix app install
npm --prefix app run dev        # http://localhost:5173   (preview config: .claude/launch.json → "app")
npm --prefix app run typecheck
npm --prefix app run build
```
**Definition of done for any change:**
- typecheck and build pass;
- the changed flows are clicked through in the browser as each affected persona, with no console errors;
- Reset demo returns the app to its seed state.

## How work is organised: orchestrator and executor sessions
One Claude session is the **orchestrator**. It holds the big picture, talks to the user, writes plans and reviews results. Other Claude sessions are **executors**: each implements one plan. Executors start without the orchestrator's conversation, so **the plan is the whole brief**.

**If you are an executor:**
1. Read this file, `app/plans/README.md` (architecture decisions and file ownership), the product-definition docs your plan cites, and your plan. Work only on your plan.
2. Set the plan's status to `IN PROGRESS (executor, date)` in `app/plans/README.md`.
3. Work through the steps in order, ticking `- [ ]` → `- [x]` in the plan file as each leaf is done and verified.
4. **Stay in scope.** If a step is wrong, blocked or would need a decision (new library, new role, changed data model, anything under "Out of scope"), stop. Write the question under `## Execution report → Blockers` and ask the user. Don't guess.
5. Don't refactor or "improve" code outside the plan's listed files. If you notice something worth fixing, note it under `Follow-ups`.
6. When finished, fill in `## Execution report`: what changed (files), how you verified it, deviations from the plan, follow-ups. Then set the status to `DONE — awaiting review (date)`.
7. **Don't commit.** Executors share one checkout, so a commit would sweep in other sessions' half-finished files. The orchestrator reviews your plan and then commits it (see below). In a worktree of your own, commit on that worktree's branch only if the plan says so.

**Commits (user rule, 2026-09-25):**
- All work goes on the feature branch `gcc-demo`, never `main`, and is pushed to GitHub.
- Commit at major milestones only, typically when a plan is reviewed and accepted. Messages are one or two plain lines.
- Stage explicit paths, never `git add -A` or `git add .`.
- Before every push, check what is staged: nothing under `docs/` except `docs/07-product-design/`; no confidential client material; no prices, costs or real staff names; never `.claude/settings.local.json`.

**If you are the orchestrator:** plans follow the template in `app/plans/README.md`. They are hierarchical: phase → step → sub-step, each leaf small and verifiable. They are self-contained (files, data, acceptance checks) and sequenced so that parallel plans don't touch the same files.

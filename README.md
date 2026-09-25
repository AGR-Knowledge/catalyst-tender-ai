# Catalyst Tender AI

Front-end prototype of Catalyst Tender AI, a bid and tender workbench for EPC contractors. It has role-based dashboards for eight personas, a pipeline board and calendar, delivery programmes, and tender upload with field extraction and an in-app PDF viewer.

| Folder | What it holds |
| --- | --- |
| `app/` | The React + Vite application. See [app/README.md](app/README.md). The three demo tender PDFs it serves are in `app/public/bids/` and must stay there. Implementation plans are in `app/plans/`. |
| `docs/` | Every engagement document, numbered in the order the engagement ran. Only `docs/07-product-design/` is in the repository; the rest is kept locally. |
| `CLAUDE.md` | Context and working rules for Claude Code sessions: the current goal, confidentiality, app rules, and the orchestrator/executor workflow. |

Start with [product-foundation.md](docs/07-product-design/agr-product-definition/product-foundation.md), which covers what the product is, why it exists and what the demo must show. Then read [roles-and-access.md](docs/07-product-design/agr-product-definition/roles-and-access.md), which covers every role, its permissions and the super-admin design.

The current work is a Stage 1–3 demo for GCC contractors. Four docs define it:
- [s1-s3-demo-spec.md](docs/07-product-design/agr-product-definition/s1-s3-demo-spec.md): behaviour and scripts;
- [kpi-and-screen-catalogue.md](docs/07-product-design/agr-product-definition/kpi-and-screen-catalogue.md): what each role sees;
- [gcc-demo-data.md](docs/07-product-design/agr-product-definition/gcc-demo-data.md): tenants, hero tender and seed story;
- [ui-direction.md](docs/07-product-design/agr-product-definition/ui-direction.md): look and components;
- [dashboards.md](docs/07-product-design/agr-product-definition/dashboards.md): every role's dashboard, the sidebar and the gate approvals.

The build plans and their order are in [app/plans/README.md](app/plans/README.md).

```
docs/
├── 01-discovery/                      discovery questionnaire and the client's responses        local
├── 02-engagement-plans/               first plans, May 2026 (superseded by 05)                  local
├── 03-requirements-and-architecture/  client specification, blueprint, data flow                local
├── 04-proposal/                       current proposal and gap-register response                local
├── 05-delivery-plan/                  action plan, detailed plan, feature roadmap               local
├── 06-costing/                        AWS estimates, internal cost                              local
├── 07-product-design/                 the three UI designs, grouped by who made them          in git
│   ├── client-provided/               from Catalyst
│   │   ├── dashboard-wireframe/            role dashboards: interactive index.html plus one PDF per role
│   │   ├── agentic-workflow-wireframes/    the 15 agentic workflow screens (open index.html)
│   │   └── Catalyst_Tender_AI_EPC_Sales_Presentation.pdf
│   ├── agr-design/                    ours: the interactive design app/ is built from (open the .dc.html; needs internet)
│   ├── agr-uiux-bid-workbench/        ours, by the UI/UX team: Bid Workbench (bid-workbench 1.html)
│   └── agr-product-definition/        ours: product foundation, roles, Stage 1–3 spec, KPIs, GCC data, UI direction
├── 08-sample-tenders/                 real tenders: india/ and middle-east/                     local
└── 09-team/                           CVs                                                       local
```

Everything marked `local` is ignored by `.gitignore`. This repository is public, and those folders hold client-confidential material, commercial proposals, costs and personal data. Do not force-add them.

## Run locally

```bash
cd app
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in app/dist
```

## Deploy

`vercel.json` at the repository root builds the app from `app/` and serves `app/dist`. Every route falls back to `index.html`, so deep links such as `/pipeline` or `/intake/...` work on refresh. Connect the repository in Vercel; no further settings are needed.

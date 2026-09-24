# Catalyst Tender AI

Front-end prototype of Catalyst Tender AI, a bid and tender workbench for EPC contractors. It has role-based dashboards for eight personas, a pipeline board and calendar, delivery programmes, and tender upload with field extraction and an in-app PDF viewer.

| Folder | What it holds |
| --- | --- |
| `app/` | The React + Vite application. See [app/README.md](app/README.md). |
| `data/` | Client source material (wireframes, mock-ups, sample tender PDFs). Kept locally and not in the repository. The demo PDFs the app serves are copied in `app/public/bids`. |
| `design/` | The design export the prototype is based on. |

## Run locally

```bash
cd app
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in app/dist
```

## Deploy

`vercel.json` at the repository root builds the app from `app/` and serves `app/dist`. Every route falls back to `index.html`, so deep links such as `/pipeline` or `/intake/...` work on refresh. Connect the repository in Vercel; no further settings are needed.

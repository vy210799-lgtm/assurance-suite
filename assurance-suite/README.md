# Assurance suite

A GRC / audit management app covering internal audit, TPRM, external audit,
control testing, and policy management — with a read-only Trust Center
connector (all modules except external audit) and an AI assistant for
reviewing uploaded evidence files.

**Stack**
- Frontend: React 18 + Vite (`/frontend`)
- Backend: Node.js + Express (`/backend`)
- Database: SQLite via Node's built-in `node:sqlite` module (`/backend`) —
  no native compilation required, which matters on resource-limited free
  hosts (see note below)

```
assurance-suite/
├── backend/     Express API + SQLite database
└── frontend/    React (Vite) single-page app
```

---

## 1. Prerequisites

- Node.js **22.5.0 or later**, ideally in the `22.5.x`–`22.22.x` range (the
  project pins `22.11.0` via `backend/.node-version` for hosts that read
  it, like Render). This is required for the built-in `node:sqlite` module.
- npm
- No native build toolchain needed — unlike `better-sqlite3`,
  `node:sqlite` ships inside Node itself with nothing to compile. This is
  the reason the database layer uses it instead: native compilation is a
  common source of failed deploys on free-tier hosts with limited
  CPU/RAM.

## 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
- `ANTHROPIC_API_KEY` — required for the evidence AI assistant. Get one at
  https://console.anthropic.com/
- `CORS_ORIGIN` — the frontend's origin (defaults to the Vite dev server,
  `http://localhost:5173`)
- `PORT` — defaults to `4000`

```bash
npm run dev
```

You'll see a one-line warning — `ExperimentalWarning: SQLite is an
experimental feature` — that's expected and harmless; it's Node telling you
`node:sqlite` is newer API, not an error. The first run creates
`backend/assurance-suite.db` automatically (SQLite schema is created on
startup — no separate migration step). The API is now at
`http://localhost:4000/api`; check `http://localhost:4000/api/health`.

## 3. Frontend setup

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env   # only needed if your backend isn't on localhost:4000
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`). On first load
you'll be asked to pick a role — that decides which modules you see and
whether you get edit access (the Executive viewer role is read-only).

## 4. What's wired up

- **CRUD** on all five modules, each with nested detail (risk assessment,
  evidence, findings, and report for audits; due diligence and risk
  assessments for vendors; PBC/query log for external audit; test results
  for controls; attestations for policies).
- **Trust Center connector** on audits, vendors, controls, and policies
  (intentionally excluded from external audit). Connecting attempts a real
  server-side fetch of the URL you give it; if that endpoint doesn't return
  `{ documents: [...] }`, it clearly labels the data as a placeholder rather
  than pretending it's live. The "Find & fetch" box and per-document
  download buttons proxy through the backend, so they aren't blocked by the
  vendor portal's CORS policy the way a browser-only call would be —
  though most real trust centers still require an authenticated session to
  actually serve the file, in which case the button falls back to opening
  the source link.
- **AI evidence assistant**: upload a text-based file (.txt, .csv, .json,
  .md, .log work best) to an audit's Evidence section, then ask questions
  about it. This calls the real Anthropic API from the backend using your
  own `ANTHROPIC_API_KEY` — nothing is sent anywhere until you ask a
  question.
- **Role-based onboarding**: pick a role on first use (or via "Switch role"
  in the sidebar). Roles gate which modules appear in navigation; the
  Executive viewer role additionally makes every module read-only
  (no add/edit/delete, but Trust Center lookups and the AI assistant still
  work, since those are read operations).
- **Activity log**: every create/update/delete is recorded server-side and
  viewable from the clock icon in the header.

## 5. Known limitations

- Role permissions are enforced in the UI, not the API — the backend
  doesn't currently check a role/auth token on requests. Fine for a single
  trusted team; add real authentication (e.g. sessions or JWTs plus a
  `role` check per route) before exposing this beyond that.
- The Trust Center "live" fetch only works against endpoints that don't
  require authentication and that return the documented JSON shape. Most
  commercial trust centers (SafeBase, Vanta, Whistic) require OAuth, so
  real integration there means adding their SDK/API credentials server-side.
- The evidence assistant reads uploaded files as plain text in the browser,
  so PDFs/images aren't parsed (they upload, but the assistant won't be
  able to read them).

---

## 6. Setting this up in Git

From the `assurance-suite` root (the folder containing `backend/` and
`frontend/`):

```bash
cd assurance-suite
git init
git add .
git commit -m "Initial commit: assurance suite (React + Express + SQLite)"
```

`.gitignore` files are already in place in both `backend/` and `frontend/`
so `node_modules/`, `.env` (your real secrets), and the SQLite database file
won't be committed — only `.env.example` is tracked, which is what you want
collaborators to see.

### Push to GitHub (or GitLab/Bitbucket)

1. Create an empty repository on GitHub — **don't** initialize it with a
   README/.gitignore, since you already have one locally.
2. Connect and push:

```bash
git branch -M main
git remote add origin https://github.com/<your-username>/assurance-suite.git
git push -u origin main
```

(Use the SSH URL instead, `git@github.com:<you>/assurance-suite.git`, if
you have SSH keys set up — avoids typing a token every push.)

### Day-to-day workflow

```bash
git checkout -b feature/some-change   # work on a branch
git add .
git commit -m "Describe the change"
git push -u origin feature/some-change
# open a pull request into main
```

### A few things worth doing before pushing publicly

- Double-check `git status` shows no `.env` files staged — they hold your
  Anthropic API key.
- If you ever *do* commit a secret by accident, rotate the key immediately
  (revoke it in the Anthropic console and generate a new one) — removing it
  from a later commit doesn't remove it from git history.
- Consider adding a `LICENSE` file if this will be public.
- If you want CI later (e.g. GitHub Actions running `npm run build` on the
  frontend on every push), that's a `.github/workflows/*.yml` file — happy
  to write one if you tell me where you're deploying.

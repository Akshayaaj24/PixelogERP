# PIXELOG ERP (MERN)

Simple company ERP for PIXELOG: clients, Instagram reels, tasks, team, payments and reports.

```
pixelog-erp/
├── server/   Node + Express + MongoDB (Mongoose)  → API on :5000
└── client/   React + Vite + Tailwind               → app on :5173
```

## 1. Setup (first time)

**Database:** create a free cluster on MongoDB Atlas → copy the connection string.

```bash
# Backend
cd server
cp .env.example .env        # paste MONGO_URI, set a long JWT_SECRET
npm install
npm run seed                # creates admin login: admin@pixelog.in / admin123
# or: npm run seed -- --demo   (adds sample team, clients, reels, tasks)
npm run dev                 # http://localhost:5000

# Frontend (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

Log in with **admin@pixelog.in / admin123** → change the password in Settings.
Demo logins (with `--demo`): manager@pixelog.in and arun@ / john@ / priya@ / karthik@ / vijay@ / meena@pixelog.in — password `pixelog123`.

## 2. Roles — who sees what

| | Admin | Manager | Member (editor, writer, developer…) |
|---|---|---|---|
| Sidebar | Dashboard, Clients, Calendar, Team, Reports, Settings | same | My Work, Calendar, My Report, Settings |
| Dashboard | Everything + alerts (posting tomorrow, bond ending) | Everything except money + team workload | **My Work**: today / tomorrow / overdue with Start & Submit buttons |
| Clients | Add / edit / delete, logo, package ₹, payments, active toggle | View (no package) + **assign team** | — (client info is inside each work item) |
| Calendar | All work | Create, assign, move stages, approve, mark done | Only own work |
| Team | Full: photo, bond, joining date, **documents** (agreement, Aadhaar, certificates); add members | Name, photo, phone, email, designation, workload | — |
| Reports | Full + revenue / payments | Work reports (no money) | My Report |
| AI | ✓ | ✓ (+ Plan month) | ✓ (script / caption / hashtags, Ask AI about own work) |

## 3. Work flow

Every calendar item is a 🎬 Reel, 🖼️ Poster, 🌐 Website, 📢 Ads or 📝 Other job.
Reels have 3 steps: **Script → Shoot → Editing**. Other types have one step.

Status of each step: **Start → Processing → Waiting for Approval → Approved → Done**

1. Manager creates work (people auto-filled from the client's team).
2. Member taps **Start** → *Processing*, then **Submit** → *Waiting for Approval* (manager notified).
3. Manager **Approves** — or **Changes needed** with a note (back to the member).
4. Reels: manager clicks **Move to Shoot / Editing** → next person is notified.
5. Last step approved → manager **Mark Done** → the date is struck out on the calendar.

Photos, logos and documents are stored in MongoDB (documents: PDF/image, max 3 MB, admin only).

## Upgrading from v1 (reels + tasks)

```
cd server
npm install
npm run migrate      # moves old reels & tasks into the calendar, employee → member
```
Then in **Team**, set one person's Access to **Manager**, and in each client → **Assign** the team.

## 4. Deploy on Vercel — ONE project (client + server together)

The repo root has `vercel.json` + `api/index.js`: Vercel builds the React app and runs Express as `/api`. One URL, no CORS setup.

1. Push the whole `pixelog-erp` folder to GitHub.
2. **MongoDB Atlas → Network Access → allow `0.0.0.0/0`** (Vercel has no fixed IP).
3. vercel.com/new → import the repo → **Root Directory: leave empty (repo root)** → Framework: Other.
4. Environment Variables: `MONGO_URI`, `JWT_SECRET`.
5. Deploy → open `https://your-app.vercel.app/api/health` → should show `{"ok":true,"db":true}`.

No `VITE_API_URL` needed (same domain). Dates use Indian time in code.
Add your domain (e.g. erp.pixelog.in) in Project → Settings → Domains.

**Local development is unchanged:** `server` → `npm run dev`, `client` → `npm run dev`.

## 5. API (for reference)

| Method | Path | |
|---|---|---|
| POST | /api/auth/login | email, password → token |
| GET/PUT | /api/auth/me | my profile (name, phone, photo) |
| GET/POST/PUT | /api/users | team (`?stats=1` workload) · `/:id/documents` (admin) |
| GET/POST/PUT/DELETE | /api/clients | manager+admin · `PUT /:id/team` assign team |
| GET/POST/PUT/DELETE | /api/works | calendar items `?from&to&client&type&person` |
| POST | /api/works/:id/action | `start` `submit` (member) · `approve` `changes` `next` `done` `reopen` (manager) |
| GET/PUT | /api/payments | admin |
| GET | /api/dashboard | role-based |
| GET | /api/reports | `?month=YYYY-MM`, role-based |
| GET / POST | /api/activities, /api/activities/read | notifications |
| POST | /api/ai/reel, /api/ai/plan, /api/ai/ask | Claude |

## 6. AI (Claude)

| Where | What it does | Model |
|---|---|---|
| Reel form ✨ buttons | Ideas, Write/Improve script, Caption, Hashtags — uses the client's **brand notes + content language** | `claude-sonnet-5-5` |
| Calendar → **✨ Plan month** (manager/admin) | Suggests a month of reels (festivals, mix of formats) → edit → add to calendar | `claude-sonnet-5-5` |
| Top bar → **Ask AI** | Answers questions from live ERP data ("what's pending today?") | `claude-haiku-5-5` |

Setup:
1. platform.claude.com → sign up → **Billing** (add credits) → **API Keys** → Create key.
2. Local: add `ANTHROPIC_API_KEY=sk-ant-...` to `server/.env`, restart `npm run dev`.
3. Vercel: Settings → Environment Variables → add `ANTHROPIC_API_KEY` → **Redeploy**.

Safety: Ask AI can only **read** data through tools in `server/routes/ai.js`, with the logged-in user's permissions (members only see their own work; only admin sees money). It cannot create, change or post anything. The API key stays on the server — never put it in the client.

Better results: fill **Brand notes** and **Content language** (English / Tamil / Tanglish) for every client.

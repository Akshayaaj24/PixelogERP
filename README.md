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
Demo team logins (with `--demo`): priya@ / arun@ / karthik@ / vijay@pixelog.in — password `pixelog123`.

## 2. Who sees what

| | Admin (Founder) | Employee |
|---|---|---|
| Dashboard | Whole company + team workload | Only own reels & tasks |
| Clients | Add / edit / delete, packages, payments | View only (no money) |
| Reels | Create, assign, any stage | Own reels; can move up to **Sent to Owner**; edit script / caption / hashtags / notes |
| Tasks | Create, assign, delete | Own tasks; change status, comment |
| Team, Reports | ✓ | ✗ |

## 3. Reel workflow

`Idea → Script → Shoot → Editing → Sent to Owner → Sent to Client → Approved → Posted`

Videos are shared on WhatsApp — the ERP only tracks the stage.
Editor sends video on WhatsApp → sets **Sent to Owner**. Owner forwards to client → **Sent to Client** → **Approved** → **Posted**.
Each stage change notifies the right people (bell icon).

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
| GET/PUT | /api/auth/me | my profile |
| PUT | /api/auth/me/password | current, next |
| GET/POST/PUT | /api/users | team (`?stats=1` for workload) |
| GET/POST/PUT/DELETE | /api/clients | `/:id` returns client + reels + tasks + payments |
| GET/POST/PUT/DELETE | /api/reels | `?from&to&client&stage&person` |
| GET/POST/PUT/DELETE | /api/tasks | `?view=all|my|today|upcoming|overdue|done` ; POST `/:id/comments` |
| GET/PUT | /api/payments | `?month=YYYY-MM` (admin) |
| GET | /api/dashboard | `?period=today|week|month` |
| GET | /api/reports | `?month=YYYY-MM` (admin) |
| GET / POST | /api/activities, /api/activities/read | notifications |
| * | /api/ai/* | Step 5 — Claude (coming soon) |

## 6. Next: AI (Step 5)

`npm install @anthropic-ai/sdk` in `server`, add `ANTHROPIC_API_KEY` to `.env`, and fill `server/routes/ai.js`:
- `/api/ai/script`, `/api/ai/caption` → `claude-sonnet-5-5` with the client's brand notes + language
- `/api/ai/ask` → `claude-haiku-5-5` with tools that query the database using the logged-in user's permissions

The ✨ buttons in the Reel form and the **Ask AI** panel are already in place.

# StudioFlow ERP

A workflow ERP for digital marketing agencies. It covers clients, monthly content packages, video production (script → approval → shoot → edit → review → posting), staff schedules, a calendar, notifications and reports.

Built with the MERN stack: **MongoDB, Express, React and Node.js**.

## Quick start

Requirements: Node.js 20+ and MongoDB 6+. MongoDB can be local, Docker or Atlas.

```bash
docker compose up -d                 # starts MongoDB on :27017 (or use your own)
cp server/.env.example server/.env   # then set JWT_SECRET
npm install                          # installs shared, server and client workspaces
npm run seed                         # sample agency (wipes existing data!)
npm run dev                          # API on :5000, React on :5173
```

Open http://localhost:5173.

| Role  | Email                     | Password     |
|-------|---------------------------|--------------|
| Admin | admin@brightwave.agency   | admin12345   |
| Staff | sneha@brightwave.agency (or any `<firstname>@brightwave.agency`) | staff12345 |

Without the seed, the API creates an admin account on first start from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (default `admin@agency.local` / `admin12345`). Change that password straight away.

## Deploy to Vercel (website + API + MongoDB Atlas)

The repo is set up for Vercel as-is:
- `vercel.json` builds the React app into `client/dist`.
- It sends every `/api/*` request to one serverless function, `api/index.js`, which runs the same Express app.
- One MongoDB connection is reused between requests.
- Sign-in limits are stored in MongoDB.

The app doesn't store any files. Scripts and videos are shared on WhatsApp, and StudioFlow only tracks their status (submitted, approved, revision requested). So there's no file storage to set up.

1. **MongoDB Atlas.** Under Network Access, allow `0.0.0.0/0` (Vercel's IP addresses change). Copy the connection string, adding `/studioflow` before the `?`.
2. **Push this repo to GitHub.** Make sure `server/.env` is not committed.
3. **Vercel → Add New → Project → import the repo.** Leave the Root Directory as the repo root (the build needs `shared/`). The install, build and output settings come from `vercel.json`.
4. **Environment variables** (Project → Settings → Environment Variables):

| Key | Value |
|---|---|
| `MONGODB_URI` | your Atlas connection string |
| `JWT_SECRET` | a long random string: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `TZ` | `Asia/Kolkata` (or your agency's time zone) |

5. **Deploy.** Check `https://<your-app>.vercel.app/api/health`; it should return `{"ok":true}`.
6. **Data.** Either run `npm run seed` once from your PC with the Atlas URI in `server/.env` (sample data), or set `ADMIN_EMAIL` / `ADMIN_PASSWORD` in Vercel and the first request creates your admin. Never run the seed against live data: it wipes the database.

### Other hosts (Render, Railway, a VPS)

Run `npm run build`, then `npm start`. Express serves the API and the built app on `PORT`.

## How it fits together

```
api/index.js       Vercel serverless entry (wraps the Express app)
vercel.json        Vercel build + routing
shared/            Workflow rules used by BOTH server and client (pure JS)
  index.js         statuses, stageActions(), applyTransition(), planPackageVideos(),
                   scheduleConflicts(), deriveEvents(), workload(), reminders()
server/src/
  models/          Mongoose schemas: User, Client, Package, Video, Task, TaskLog,
                   Event, Notification, Activity, Setting
  core.js          config, JWT auth, role guards, access scoping, notify(), errors
  db.js            cached MongoDB connection (shared by the local server and Vercel)
  routes/          people (auth, staff) · clients (+ packages) · videos · misc
  seed.js          sample agency
  test/            workflow unit tests + API guard tests (npm test)
client/src/
  lib/store.jsx    auth, data hooks (TanStack Query), toasts/modals/drawer
  components/      ui kit, DataTable, charts, workflow (drawer, actions), modals, Layout
  pages/           Dashboard, Clients, Planning, Production (stages + staff),
                   Calendar (+ schedule), Reports, Settings, Mine (staff pages), Login
```

**The workflow engine lives in `shared/`.** The server calls `canTransition()` before every status change and `applyTransition()` to apply the knock-on effects:
- approving a script schedules its shoot
- completing a shoot assigns the editor
- approving the edit queues the post
- publishing completes the edit

The client uses the same functions to decide which buttons to show, so the UI and the API can't disagree.

**Access control is enforced on the server:**
- Every route requires a JWT.
- Admin-only routes use `requireAdmin`.
- Staff queries are scoped by `videoScope()` and `staffClientIds()`, so staff only ever receive videos they're assigned to (or clients they manage).
- File downloads check access too.

**Dates are plain `YYYY-MM-DD` strings.** Deadlines are calendar days, so they never drift across time zones. Set `TZ` in `.env` to the agency's time zone.

## API overview

| Method & path | Who | What |
|---|---|---|
| `POST /api/auth/login` · `GET /api/auth/me` · `POST /api/auth/password` | all | Sign in, current user, change password |
| `GET/POST/PATCH /api/staff` | admin (staff get a directory) | Employees |
| `GET/POST/PATCH/DELETE /api/clients` | admin (staff: own clients, read-only) | Clients; POST can create this month's package |
| `GET/POST/PATCH/DELETE /api/packages`, `POST /api/packages/:id/videos` | admin | Monthly packages → video workflows |
| `GET /api/videos`, `GET /api/videos/:id` | scoped | Videos |
| `POST /api/videos/:id/transition` | per stage rules | Status change (+ optional note/details) |
| `PATCH /api/videos/:id/stages/:stage` | admin (post: its manager) | Assignments, dates, captions… (409 on double-booking) |
| `PATCH /api/videos/:id/move` | admin | Calendar drag & drop |
| `POST /api/videos/:id/notes` | assigned | Notes and feedback |
| `/api/tasks`, `/api/events`, `/api/notifications`, `/api/activity`, `/api/settings` | mixed | General tasks, events, notifications, activity feed, settings |

## Testing

`npm test` runs the workflow unit tests and the API guard tests. The guard tests don't need a database.

The full stack was also tested end to end in a browser. That run used FerretDB, a MongoDB-compatible server, and covered:
- admin and staff sign-in
- approvals and revisions
- double-booking detection
- package generation
- drag & drop rescheduling
- staff access limits

## Next steps worth considering

- WhatsApp or email delivery for notifications. `notify()` in `core.js` is the single hook.
- A scheduled job that writes reminder notifications, so they don't depend on someone opening the app.
- Aggregation endpoints for reports, once an agency has thousands of videos.

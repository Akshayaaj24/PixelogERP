# StudioFlow ERP — notes for Claude

MERN monorepo (npm workspaces): `shared/` (workflow rules, pure JS, ESM), `server/` (Express + Mongoose), `client/` (React 18 + Vite + TanStack Query + React Router).

## Commands
- `npm run dev`: API :5000 + Vite :5173 (proxy `/api`)
- `npm test`: node:test unit tests (`server/test`)
- `npm run seed`: wipes and reseeds MongoDB
- `npm run build`: builds the client; the server serves `client/dist` in production

## Deployment
- Vercel: `api/index.js` wraps `createApp()` and calls `connectDB()` (cached global). Keep request handling stateless: no in-memory state that has to survive between requests, and no writes to local disk.
- **No file storage, by design.** The agency shares scripts and videos on WhatsApp; the app only tracks status (submit → approve / request revision) plus notes. Don't add uploads unless asked.

## Rules of this codebase
- **Workflow logic belongs in `shared/index.js`.** Status rules, permissions (`stageActions`), side effects (`applyTransition`) and derived data (tasks, events, workload) are written once and imported by both sides. Never duplicate them in a route or a component.
- **The server is the authority.** Every mutation re-checks permissions with `canTransition` / `isAdmin`. Staff reads go through `videoScope()` / `staffClientIds()`.
- References between documents are **id strings**, not ObjectIds, so shared code compares plain strings. Models use a `toJSON` transform that adds `id` and drops `_id`. Give sub-schemas the same transform.
- Dates are `YYYY-MM-DD` strings. Use the helpers in `shared` (`addDays`, `todayS`, …), never `Date` arithmetic in components.
- Validate request bodies with zod in the route. `errorHandler` turns `ZodError` into `{ error, fields }`, and the client's `ModalForm` shows `fields` next to the inputs.
- Client mutations go through `useAction()`, which calls the API, invalidates queries and shows a toast.
- UI copy: sentence case, plain verbs, buttons say exactly what happens ("Approve script", not "Submit").

See `.claude/skills/studioflow-workflow/SKILL.md` for adding a stage, status or notification.

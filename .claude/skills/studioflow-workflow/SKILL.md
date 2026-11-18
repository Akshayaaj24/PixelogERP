---
name: studioflow-workflow
description: How to change the StudioFlow video workflow safely — add or rename a status, add a production stage, add an automatic side effect or notification, or change who may perform an action. Use for any change to statuses, approvals, stage permissions or workflow automation in this repo.
---

# Changing the StudioFlow workflow

The workflow is defined once in `shared/index.js` and used by both the API and the React client. Work through these steps in order.

## Add or change a status
1. Edit the status list (`SCRIPT_ST`, `SHOOT_ST`, `EDIT_ST`, `POST_ST`). The Mongoose enums in `server/src/models/index.js` import these lists, so the database validation follows automatically.
2. Add a badge tone in `STATUS_TONE`.
3. If the status counts as "done", update `DONE_ST`, `stageIdx()`, `stageReady()` and `tasksOf()`.
4. Make it reachable: add an entry in `stageActions()` with `{ label, status, tone, form? }`. `form` is one of `submit | revise | publish | schedule`; the client opens the matching modal in `client/src/components/workflow.jsx` (`useStageAction`).

## Add an automatic side effect or notification
- Add a `case 'stage:Status'` in `applyTransition()`. Mutate the plain video object and call `n(to, type, text)`, where `to` is a user id or `'admin'`.
- New notification types go in `NOTIFICATION_TYPES` (this also adds a toggle under Settings → Notifications).

## Add a whole new stage
This touches the most files. Search the codebase for `'edit'` to find every place the stage list is spelled out:
- `STAGE_KEYS`, `STAGES`, `STAGE_KEY`, `STAGE_LBL`, `ASSIGNEE`
- the Video schema
- `stageBodies` in `server/src/routes/videos.js`
- `planPackageVideos()` (default dates come from `Setting.gaps`)
- `deriveEvents()`
- the client's `StageCard`, `StageEditModal` and `CFG` in `pages/Production.jsx`
- a route and nav item

## Checklist before finishing
- `npm test` passes. Add a case to `server/test/workflow.test.js` for any new transition.
- A staff user can't trigger an admin-only status: the API must return 403.
- `npm run build` succeeds.

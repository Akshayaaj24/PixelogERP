import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planPackageVideos, stageActions, canTransition, applyTransition, stageIdx, scheduleConflicts, tasksOf, videoStatus, clientCode } from '@PixelogERP/shared';

const team = { writer: 'w1', videographer: 'v1', camera: 'c1', editor: 'e1', smm: 's1' };
const client = { id: 'cl1', code: 'SRK', category: 'Fitness', address: 'Studio' };
const plan = (target = 3) => planPackageVideos({ client, pkg: { id: 'p1', month: '2026-11', name: 'Pkg', target }, team, start: '2026-11-02', span: 18, gaps: { shoot: 3, edit: 4, post: 3 } })
  .map((v, i) => ({ ...v, id: `v${i}` }));
const admin = { id: 'admin', role: 'admin' };
const writer = { id: 'w1', role: 'staff' };
const actor = { id: 'admin', name: 'Admin' };

test('a package creates one workflow per video with unique codes and ordered dates', () => {
  const vs = plan(8);
  assert.equal(vs.length, 8);
  assert.equal(new Set(vs.map((v) => v.code)).size, 8);
  assert.equal(vs[0].code, 'VID-2611-SRK-01');
  vs.forEach((v) => { assert.ok(v.script.deadline < v.shoot.date && v.shoot.date < v.edit.deadline && v.edit.deadline < v.post.date); });
});

test('staff only get actions for their own, unlocked stage', () => {
  const [v] = plan(1);
  assert.deepEqual(stageActions(v, 'edit', { id: 'e1', role: 'staff' }), []); // shoot not done yet
  assert.ok(stageActions(v, 'script', writer).some((a) => a.status === 'Submitted'));
  assert.deepEqual(stageActions(v, 'script', { id: 'someone', role: 'staff' }), []);
  v.script.status = 'Submitted';
  assert.equal(canTransition(v, 'script', 'Approved', writer), false, 'writers cannot approve');
  assert.equal(canTransition(v, 'script', 'Approved', admin), true);
});

test('transitions cascade through the whole pipeline and notify the next person', () => {
  const [v] = plan(1);
  v.script.status = 'Submitted';
  let n = applyTransition(v, 'script', 'Approved', { actor });
  assert.equal(v.shoot.status, 'Scheduled');
  assert.ok(n.some((x) => x.to === 'w1') && n.some((x) => x.to === 'v1'));
  n = applyTransition(v, 'shoot', 'Completed', { actor: { id: 'v1', name: 'V' } });
  assert.equal(v.edit.status, 'Assigned');
  assert.ok(n.some((x) => x.to === 'e1' && x.type === 'New Task Assignment'));
  applyTransition(v, 'edit', 'Approved', { actor });
  assert.equal(v.post.status, 'Pending');
  assert.equal(stageIdx(v), 5);
  applyTransition(v, 'post', 'Published', { actor: { id: 's1', name: 'S' } });
  assert.equal(v.edit.status, 'Completed');
  assert.equal(stageIdx(v), 6);
  assert.equal(videoStatus(v, '2026-11-01'), 'Completed');
  assert.ok(tasksOf(v).every((t) => t.done));
});

test('revision feedback is stored as a feedback note', () => {
  const [v] = plan(1);
  v.script.status = 'Under Review';
  applyTransition(v, 'script', 'Revision Required', { actor, note: 'Tighten the hook' });
  assert.equal(v.notes[0].kind, 'feedback');
});

test('double-booked shoots are detected', () => {
  const vs = plan(2);
  vs[1].shoot.date = vs[0].shoot.date; vs[1].shoot.time = vs[0].shoot.time;
  const c = scheduleConflicts(vs);
  assert.ok(c.length >= 1 && c[0].videoIds.length === 2);
});

test('client codes stay unique', () => {
  assert.equal(clientCode('Spice Route Kitchens', []), 'SRK');
  assert.notEqual(clientCode('Spice Route Kitchens', ['SRK']), 'SRK');
});

// API guard tests that run without a database
import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
process.env.NODE_ENV = 'test';
const { createApp } = await import('../src/app.js');
const app = createApp();

test('health check responds', async () => {
  const r = await request(app).get('/api/health');
  assert.equal(r.status, 200);
});
test('protected routes require a token', async () => {
  for (const p of ['/api/videos', '/api/clients', '/api/staff', '/api/settings']) {
    const r = await request(app).get(p);
    assert.equal(r.status, 401, p);
  }
});
test('a bad token is rejected', async () => {
  const r = await request(app).get('/api/videos').set('Authorization', 'Bearer nope');
  assert.equal(r.status, 401);
});
test('login validates input before touching the database', async () => {
  const r = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });
  assert.equal(r.status, 400);
  assert.ok(r.body.fields.email);
});
test('unknown API routes return 404 JSON', async () => {
  const r = await request(app).get('/api/nope');
  assert.equal(r.status, 404);
});

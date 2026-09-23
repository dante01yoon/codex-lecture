import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { createApp, buildRequest, ENDPOINT } from '../server.mjs';

const fixture = { model: 'jev-1.13.0', answers: {
  department: { type: 'choice', choice: 'technical', confidence: 0.72 }, urgent: { type: 'noul', noul: 0.93 }
}, usage: { input_tokens: 234 } };
function setup(t, options = {}) {
  const evidenceDir = mkdtempSync(path.join(tmpdir(), 'dante-test-'));
  t.after(() => rmSync(evidenceDir, { recursive: true, force: true }));
  const app = createApp({ apiKey: 'offline-test-key', evidenceDir,
    fetchImpl: async () => { throw new Error('Unexpected provider request'); }, ...options });
  return { app, evidenceDir };
}
// Dispatch directly through Node's real HTTP request handler, without opening any socket.
function request(app, url, { method = 'GET', body, headers = {} } = {}) {
  return new Promise(resolve => {
    const req = Readable.from(body === undefined ? [] : [Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))]);
    Object.assign(req, { url, method, headers: { host: '127.0.0.1:8794', 'content-type': 'application/json', ...headers } });
    const res = { status: 0, headers: {}, writeHead(status, values) { this.status = status; this.headers = values; },
      end(value) { const text = String(value); resolve({ status: this.status, headers: this.headers, text,
        body: this.headers['Content-Type'].startsWith('application/json') ? JSON.parse(text) : text }); } };
    app.emit('request', req, res);
  });
}
const classify = (app, text = '로그인 오류입니다.') => request(app, '/api/classify', { method: 'POST', body: { text } });
const response = (raw = fixture, status = 200) => new Response(JSON.stringify(raw), { status });

test('single bounded request uses pinned model, Choice + Noul and unknown', () => {
  const body = buildRequest('\u0000'.repeat(1200));
  assert.equal(body.model, 'jev-1.13.0');
  assert.deepEqual(Object.keys(body.questions), ['department', 'urgent']);
  assert.equal(body.questions.department.type, 'choice');
  assert.equal(body.questions.urgent.type, 'noul');
  assert.deepEqual(Object.keys(body.questions.department.criteria), ['billing', 'technical', 'sales', 'unknown']);
  assert.ok(Buffer.byteLength(JSON.stringify(body)) <= 16000);
});
test('success records raw JSON, count before fetch, no credential headers in logs', async t => {
  let calls = 0;
  const { app, evidenceDir } = setup(t, { fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, ENDPOINT);
    assert.equal(JSON.parse(readFileSync(path.join(evidenceDir, 'call-count.json'))).count, 1);
    assert.equal(options.headers.Authorization, 'Bearer offline-test-key');
    assert.equal(options.redirect, 'error');
    assert.deepEqual(JSON.parse(options.body), buildRequest('로그인 오류입니다.'));
    return response();
  } });
  const result = await classify(app);
  assert.equal(result.status, 200);
  assert.equal(calls, 1);
  assert.deepEqual(result.body.raw, fixture);
  assert.deepEqual(result.body.decision, { department: 'technical', confidence: 0.72, urgentProbability: 0.93,
    routing: 'review', reasons: ['low_confidence', 'urgent'], threshold: 0.75 });
  assert.equal(result.body.request_number, 1);
  assert.ok(result.body.elapsed_ms >= 0);
  const logText = readFileSync(path.join(evidenceDir, 'jev-requests.jsonl'), 'utf8');
  assert.doesNotMatch(logText, /offline-test-key|Authorization|Bearer/);
  const log = JSON.parse(logText);
  assert.equal(new Date(log.timestamp).toISOString(), log.timestamp);
  assert.equal(log.http_status, 200);
  assert.deepEqual(log.raw, fixture);
  assert.deepEqual((await request(app, '/api/evidence')).body.logs, [log]);
});
test('clear success keeps the original response fields and routes to the team at the default practice threshold', async t => {
  const clear = { ...fixture, answers: { department: { type: 'choice', choice: 'billing', confidence: 0.9 }, urgent: { type: 'noul', noul: 0.1 } } };
  const { app } = setup(t, { fetchImpl: async () => response(clear) });
  const result = await classify(app);
  assert.equal(result.status, 200);
  assert.deepEqual(Object.keys(result.body), ['raw', 'elapsed_ms', 'request_number', 'decision', 'http_status']);
  assert.deepEqual(result.body.raw, clear);
  assert.deepEqual(result.body.decision, { department: 'billing', confidence: 0.9, urgentProbability: 0.1,
    routing: 'team', reasons: [], threshold: 0.75 });
});
test('out-of-range judgment is an error, never a team routing', async t => {
  const bad = { ...fixture, answers: { ...fixture.answers, urgent: { type: 'noul', noul: 1.5 } } };
  const { app } = setup(t, { fetchImpl: async () => response(bad) });
  const result = await classify(app);
  assert.equal(result.status, 502);
  assert.equal(result.body.decision, null);
  assert.deepEqual(result.body.raw, bad);
});
test('browser receives the exact same policy module the server uses', async t => {
  const { app } = setup(t);
  const served = await request(app, '/policy.mjs');
  assert.equal(served.status, 200);
  assert.match(served.headers['Content-Type'], /^text\/javascript/);
  assert.equal(served.text, readFileSync(new URL('../policy.mjs', import.meta.url), 'utf8'));
});
test('health returns only key existence; missing key blocks without count or fetch', async t => {
  const { app, evidenceDir } = setup(t, { apiKey: '' });
  assert.deepEqual((await request(app, '/api/health')).body, { hasApiKey: false });
  assert.equal((await classify(app)).status, 503);
  assert.equal(existsSync(path.join(evidenceDir, 'call-count.json')), false);
});
test('invalid, overlong, oversized and non-JSON inputs cannot spend calls', async t => {
  const { app, evidenceDir } = setup(t);
  for (const value of ['', '  ', 17, null, '가'.repeat(1201)]) assert.equal((await classify(app, value)).status, 400);
  assert.equal((await request(app, '/api/classify', { method: 'POST', body: '{' })).status, 400);
  assert.equal((await request(app, '/api/classify', { method: 'POST', body: 'x'.repeat(16001) })).status, 413);
  assert.equal((await request(app, '/api/classify', { method: 'POST', body: { text: '문의' }, headers: { 'content-type': 'text/plain' } })).status, 415);
  assert.equal(existsSync(path.join(evidenceDir, 'call-count.json')), false);
});
test('1200 unicode characters accepted', async t => {
  const { app } = setup(t, { fetchImpl: async () => response() });
  assert.equal((await classify(app, '😀'.repeat(1200))).status, 200);
});
test('provider HTTP error retains original JSON and HTTP status; no retry', async t => {
  let calls = 0;
  const raw = { error: { message: 'rate limit' } };
  const { app } = setup(t, { fetchImpl: async () => { calls++; return response(raw, 429); } });
  const result = await classify(app);
  assert.equal(result.status, 502);
  assert.equal(result.body.http_status, 429);
  assert.deepEqual(result.body.raw, raw);
  assert.equal(result.body.decision, null);
  assert.match(result.body.error, /429/);
  assert.equal(calls, 1);
});
test('non-JSON and malformed success stay errors', async t => {
  for (const fetchImpl of [async () => new Response('bad gateway', { status: 502 }), async () => response({}),
    async () => response({ ...fixture, usage: {} })]) {
    const { app } = setup(t, { fetchImpl });
    const result = await classify(app);
    assert.equal(result.status, 502);
    assert.equal(result.body.decision, null);
  }
});
test('network failure logs a spent attempt without leaking thrown credentials', async t => {
  let calls = 0;
  const { app } = setup(t, { fetchImpl: async () => { calls++; throw new Error('offline-test-key'); } });
  const result = await classify(app);
  assert.equal(result.status, 502);
  assert.equal(calls, 1);
  assert.equal(result.body.request_number, 1);
  assert.equal(result.body.http_status, null);
  assert.doesNotMatch(JSON.stringify((await request(app, '/api/evidence')).body), /offline-test-key/);
});
test('timeout covers the body and aborts without retry', async t => {
  let signal, calls = 0;
  const { app } = setup(t, { timeoutMs: 15, fetchImpl: async (_, options) => {
    signal = options.signal; calls++;
    return { status: 200, ok: true, json: () => new Promise(() => {}) };
  } });
  const result = await classify(app);
  assert.equal(result.status, 504);
  assert.equal(signal.aborted, true);
  assert.equal(calls, 1);
  assert.equal(result.body.decision, null);
});
test('concurrent requests and restart preserve the 30-call limit', async t => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return response(); };
  const { app, evidenceDir } = setup(t, { fetchImpl });
  const results = await Promise.all(Array.from({ length: 33 }, () => classify(app)));
  assert.equal(results.filter(r => r.status === 200).length, 30);
  assert.equal(results.filter(r => r.status === 429).length, 3);
  assert.equal(calls, 30);
  assert.equal(new Set(results.filter(r => r.status === 200).map(r => r.body.request_number)).size, 30);
  const restarted = createApp({ apiKey: 'offline-test-key', evidenceDir, fetchImpl });
  assert.equal((await classify(restarted)).status, 429);
  assert.equal(calls, 30);
});
test('corrupt counter fails closed and is not overwritten', async t => {
  const { evidenceDir } = setup(t);
  const counter = path.join(evidenceDir, 'call-count.json');
  writeFileSync(counter, 'broken');
  const app = createApp({ apiKey: 'offline-test-key', evidenceDir, fetchImpl: () => { throw new Error('must not call'); } });
  assert.equal((await classify(app)).status, 503);
  assert.equal(readFileSync(counter, 'utf8'), 'broken');
});
test('static allowlist protects private files, rejects foreign host/origin', async t => {
  const { app } = setup(t);
  for (const url of ['/', '/style.css', '/app.js']) assert.equal((await request(app, url)).status, 200);
  for (const url of ['/example.env', '/server.mjs', '/evidence/call-count.json', '/../server.mjs']) assert.equal((await request(app, url)).status, 404);
  assert.equal((await request(app, '/api/evidence', { headers: { host: 'evil.test' } })).status, 403);
  assert.equal((await request(app, '/api/classify', { method: 'POST', body: { text: '문의' }, headers: { origin: 'https://evil.test' } })).status, 403);
});

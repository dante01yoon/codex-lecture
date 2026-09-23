import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as policy from '../policy.mjs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const policyImport = "import { deriveDecision, URGENT_REVIEW_AT } from '/policy.mjs';";
const jevRaw = (choice, confidence, noul) => ({ model: 'jev-1.13.0', usage: { input_tokens: 123 },
  answers: { department: { type: 'choice', choice, confidence }, urgent: { type: 'noul', noul } } });

async function browser(reply) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      textContent: '', value: '', hidden: false, disabled: false, dataset: {}, attrs: {}, events: {},
      addEventListener(name, handler) { this.events[name] = handler; },
      setAttribute(name, value) { this.attrs[name] = value; },
      getAttribute(name) { return this.attrs[name]; }, focus() {},
      // Any accidental HTML insertion fails the test.
      set innerHTML(_) { throw new Error('Unsafe HTML insertion'); }
    });
    return elements.get(id);
  };
  // The slider starts at the value written in the real markup.
  element('#threshold').value = html.match(/<input id="threshold"[^>]*\svalue="([^"]+)"/)[1];
  const examples = ['billing', 'technical', 'sales', 'ambiguous'].map(id => {
    const item = element(id);
    item.querySelector = () => ({ textContent: `합성 문의 ${id}` });
    return item;
  });
  const requests = [];
  const context = vm.createContext({
    document: { querySelector: element, querySelectorAll: () => examples }, __policy: policy,
    fetch: async (url, options) => { requests.push(url); return url === '/api/health' ? { ok: true, json: async () => ({ hasApiKey: false }) } : reply(url, options); },
  });
  // app.js imports the shared policy module; bind that import to the real policy.mjs.
  assert.ok(source.startsWith(policyImport + '\n'));
  const script = source.replace(policyImport, 'const { deriveDecision, URGENT_REVIEW_AT } = __policy;');
  await vm.runInContext(`(async () => { ${script}\n })()`, context);
  const slide = value => { element('#threshold').value = value; element('#threshold').events.input(); };
  return { element, examples, slide, requests, calls: () => requests.filter(url => url !== '/api/health').length,
    submit: () => element('#ticket-form').events.submit({ preventDefault() {} }) };
}
const ok = (raw, extra = {}) => async () => ({ ok: true, json: async () => ({ raw, elapsed_ms: 17, request_number: 2,
  decision: policy.deriveDecision(raw), http_status: 200, ...extra }) });

test('markup keeps existing selectors and adds the practice threshold slider without decoration', () => {
  for (const id of ['result', 'raw-toggle', 'raw-response', 'ticket-form', 'ticket-input', 'classify-btn', 'reset-btn',
    'result-message', 'decision-content', 'response-badge', 'department-value', 'confidence-value', 'urgent-value',
    'model-value', 'tokens-value', 'elapsed-value', 'request-value', 'health-status', 'input-count',
    'threshold', 'threshold-value', 'routing-block', 'routing-value', 'routing-reasons']) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  assert.match(html, /id="result" data-state="idle"/);
  const slider = html.match(/<input id="threshold"[^>]*>/)[0];
  for (const attr of ['type="range"', 'min="0"', 'max="1"', 'step="0.05"', 'value="0.75"']) assert.ok(slider.includes(attr), attr);
  assert.match(html, /<label for="threshold">[^]*실습용 기준/);
  assert.match(html, /Choice confidence · 정답률 아님/);
  assert.match(html, /Urgent Noul/);
  assert.doesNotMatch(html, /<(img|svg|canvas|picture|video)\b/i);
  // The only network targets in the UI are this app's own endpoints; nothing is sent elsewhere.
  assert.deepEqual([...new Set(source.match(/fetch\('[^']+'/g))].sort(), ["fetch('/api/classify'", "fetch('/api/health'"]);
});
test('browser: no fake metrics, actual metadata, raw toggle, input change and reset', async () => {
  const raw = { ...jevRaw('unknown', 0, 1), model: 'provider-model-from-response', usage: { input_tokens: 456 }, marker: '<script>bad()</script>' };
  const ui = await browser(ok(raw));
  const get = ui.element;
  assert.equal(get('#health-status').textContent, 'API 키 미설정');
  assert.equal(get('#confidence-value').textContent, '');
  ui.examples[0].events.click();
  assert.equal(get('#ticket-input').value, '합성 문의 billing');
  await ui.submit();
  assert.equal(get('#result').dataset.state, 'done');
  assert.equal(get('#response-badge').textContent, '실제 API 응답');
  assert.equal(get('#model-value').textContent, raw.model);
  assert.equal(get('#tokens-value').textContent, '456');
  assert.equal(get('#confidence-value').textContent, '0.0%');
  assert.equal(get('#urgent-value').textContent, '100.0%');
  assert.equal(get('#routing-block').dataset.routing, 'review');
  assert.match(get('#routing-reasons').textContent, /unknown/);
  assert.match(get('#routing-reasons').textContent, /긴급 신호 100\.0% ≥ 80\.0%/);
  assert.match(get('#raw-response').textContent, /<script>/);
  get('#raw-toggle').events.click();
  assert.equal(get('#raw-response').hidden, false);
  get('#raw-toggle').events.click();
  assert.equal(get('#raw-response').hidden, true);
  get('#ticket-input').events.input();
  assert.equal(get('#result').dataset.state, 'idle');
  assert.equal(get('#decision-content').hidden, true);
  get('#reset-btn').events.click();
  assert.equal(get('#ticket-input').value, '');
  assert.equal(ui.calls(), 1);
});
test('browser: clear response goes to the team; moving the slider re-applies policy without a new API call', async () => {
  const raw = jevRaw('billing', 0.8, 0.1);
  const ui = await browser(ok(raw));
  const get = ui.element;
  get('#ticket-input').value = '어제 결제가 두 번 됐어요.';
  await ui.submit();
  const rawText = get('#raw-response').textContent;
  assert.equal(get('#routing-block').dataset.routing, 'team');
  assert.equal(get('#routing-value').textContent, '담당 팀 배정 · 결제 · 환불 팀');
  assert.match(get('#routing-reasons').textContent, /검토 이유 없음/);

  ui.slide('0.85');
  assert.equal(get('#threshold-value').textContent, '0.85');
  assert.equal(get('#routing-block').dataset.routing, 'review');
  assert.equal(get('#routing-value').textContent, '검토함 · 사람 확인');
  assert.equal(get('#routing-reasons').textContent, '검토 이유: 선택 신뢰도 80.0% < 실습용 기준 85.0%');
  assert.equal(get('#department-value').textContent, '결제 · 환불 팀');

  ui.slide('0.8'); // equal to confidence: passes
  assert.equal(get('#threshold-value').textContent, '0.80');
  assert.equal(get('#routing-block').dataset.routing, 'team');
  ui.slide('0');
  assert.equal(get('#routing-block').dataset.routing, 'team');

  assert.equal(get('#result').dataset.state, 'done');
  assert.equal(get('#confidence-value').textContent, '80.0%');
  assert.equal(get('#raw-response').textContent, rawText);
  assert.deepEqual(JSON.parse(rawText), raw);
  assert.equal(ui.calls(), 1);
});
test('browser: urgent response stays in review at every slider position', async () => {
  const ui = await browser(ok(jevRaw('technical', 0.99, 0.8)));
  ui.element('#ticket-input').value = '서비스가 멈췄습니다.';
  await ui.submit();
  for (const value of ['0', '0.5', '0.95']) {
    ui.slide(value);
    assert.equal(ui.element('#routing-block').dataset.routing, 'review');
    assert.equal(ui.element('#routing-reasons').textContent, '검토 이유: 긴급 신호 80.0% ≥ 80.0%');
  }
  ui.slide('1');
  assert.match(ui.element('#routing-reasons').textContent, /선택 신뢰도 99\.0% < 실습용 기준 100\.0% · 긴급 신호/);
  assert.equal(ui.calls(), 1);
});
test('browser: slider before any result or after reset changes only the label', async () => {
  const ui = await browser(ok(jevRaw('sales', 0.9, 0)));
  assert.equal(ui.element('#threshold').value, '0.75');
  ui.slide('0.6');
  assert.equal(ui.element('#threshold-value').textContent, '0.60');
  assert.equal(ui.element('#result').dataset.state, undefined);
  ui.element('#ticket-input').value = '팀 요금제 문의';
  await ui.submit();
  assert.equal(ui.element('#routing-block').dataset.routing, 'team');
  ui.element('#reset-btn').events.click();
  ui.slide('0.95');
  assert.equal(ui.element('#result').dataset.state, 'idle');
  assert.equal(ui.element('#decision-content').hidden, true);
  assert.equal(ui.calls(), 1);
});
test('browser: malformed success response is shown as an error, never as a routing decision', async () => {
  const bad = jevRaw('billing', NaN, 0.1);
  const ui = await browser(async () => ({ ok: true, json: async () => ({ raw: bad, elapsed_ms: 1, request_number: 3, decision: null }) }));
  ui.element('#ticket-input').value = '문의';
  await ui.submit();
  assert.equal(ui.element('#result').dataset.state, 'error');
  assert.equal(ui.element('#decision-content').hidden, true);
  assert.equal(ui.element('#routing-value').textContent, '');
  ui.slide('0.5');
  assert.equal(ui.element('#result').dataset.state, 'error');
  assert.equal(ui.calls(), 1);
});
test('browser: loading blocks double submission and errors never show a decision', async () => {
  let finish;
  const ui = await browser(() => new Promise(resolve => { finish = resolve; }));
  const get = ui.element;
  get('#ticket-input').value = '문의';
  const pending = ui.submit();
  assert.equal(get('#result').dataset.state, 'loading');
  assert.equal(get('#classify-btn').disabled, true);
  await ui.submit();
  assert.equal(ui.calls(), 1);
  finish({ ok: false, json: async () => ({ raw: { error: 'failure' }, error: 'TypeSafe API HTTP 429 오류' }) });
  await pending;
  assert.equal(get('#result').dataset.state, 'error');
  assert.equal(get('#decision-content').hidden, true);
  assert.match(get('#result-message').textContent, /429/);
  assert.equal(get('#classify-btn').disabled, false);
  assert.equal(get('#raw-toggle').disabled, false);
  ui.slide('0.3');
  assert.equal(get('#result').dataset.state, 'error');
  assert.equal(ui.calls(), 1);
});
test('browser: invalid text makes no request', async () => {
  const ui = await browser(() => { throw new Error('must not call'); });
  for (const value of ['', '가'.repeat(1201)]) {
    ui.element('#ticket-input').value = value;
    await ui.submit();
    assert.equal(ui.element('#result').dataset.state, 'error');
  }
  assert.equal(ui.calls(), 0);
});

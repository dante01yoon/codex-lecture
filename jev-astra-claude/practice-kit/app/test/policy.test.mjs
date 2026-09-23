import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveDecision, DEFAULT_THRESHOLD, URGENT_REVIEW_AT } from '../policy.mjs';
export const fixture = (department = 'billing', confidence = 0.81, urgent = 0.13) => ({
  model: 'jev-1.13.0', answers: {
    department: { type: 'choice', choice: department, confidence, probabilities: { [department]: 0.9 } },
    urgent: { type: 'noul', noul: urgent }
  }, usage: { input_tokens: 321, output_tokens: 42 }
});
const deepFreeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
};

test('policy preserves all four choices and exact probabilities, adding routing fields', () => {
  for (const department of ['billing', 'technical', 'sales', 'unknown']) {
    for (const value of [0, 0.49, 0.5, 1]) {
      const raw = fixture(department, value, value);
      const before = structuredClone(raw);
      const decision = deriveDecision(raw);
      assert.equal(decision.department, department);
      assert.equal(decision.confidence, value);
      assert.equal(decision.urgentProbability, value);
      assert.equal(decision.threshold, DEFAULT_THRESHOLD);
      assert.deepEqual(Object.keys(decision), ['department', 'confidence', 'urgentProbability', 'routing', 'reasons', 'threshold']);
      assert.deepEqual(raw, before);
    }
  }
});
test('clear case routes to the team with no reasons', () => {
  assert.deepEqual(deriveDecision(fixture('billing', 0.81, 0.13)), {
    department: 'billing', confidence: 0.81, urgentProbability: 0.13, routing: 'team', reasons: [], threshold: 0.75
  });
});
test('confidence threshold boundary: equal passes, below goes to review', () => {
  assert.equal(DEFAULT_THRESHOLD, 0.75);
  assert.equal(deriveDecision(fixture('sales', 0.75, 0)).routing, 'team');
  assert.deepEqual(deriveDecision(fixture('sales', 0.7499, 0)).reasons, ['low_confidence']);
  assert.equal(deriveDecision(fixture('sales', 0.7499, 0)).routing, 'review');
  // Slider values arrive as decimal strings converted with Number(); check every step, including float-prone ones.
  for (let step = 0; step <= 20; step++) {
    const threshold = Number((step * 0.05).toFixed(2));
    assert.equal(deriveDecision(fixture('technical', threshold, 0), threshold).routing, 'team', `equal at ${threshold}`);
    if (threshold > 0) assert.equal(deriveDecision(fixture('technical', threshold - 0.001, 0), threshold).routing, 'review');
  }
  assert.equal(deriveDecision(fixture('technical', 0, 0), 0).routing, 'team');
  assert.equal(deriveDecision(fixture('technical', 0.99, 0), 1).routing, 'review');
});
test('unknown always goes to review, even with high confidence and any threshold', () => {
  for (const threshold of [0, 0.5, 1]) {
    const decision = deriveDecision(fixture('unknown', 1, 0), threshold);
    assert.equal(decision.routing, 'review');
    assert.deepEqual(decision.reasons, ['unknown_department']);
  }
});
test('urgent Noul at or above 0.8 goes to review regardless of threshold', () => {
  assert.equal(URGENT_REVIEW_AT, 0.8);
  for (const threshold of [0, 0.75, 1]) {
    assert.deepEqual(deriveDecision(fixture('billing', 1, 0.8), threshold).reasons, ['urgent']);
  }
  assert.equal(deriveDecision(fixture('billing', 1, 0.7999)).routing, 'team');
  assert.deepEqual(deriveDecision(fixture('unknown', 0.2, 0.95)).reasons, ['unknown_department', 'low_confidence', 'urgent']);
});
test('malformed judgments never become default success or team routing', () => {
  const missingUrgent = fixture(); delete missingUrgent.answers.urgent;
  const missingConfidence = fixture(); delete missingConfidence.answers.department.confidence;
  const wrongType = fixture(); wrongType.answers.urgent.type = 'score';
  for (const raw of [null, undefined, {}, { answers: {} }, missingUrgent, missingConfidence, wrongType,
    fixture('other'), fixture('billing', NaN), fixture('billing', '0.8'), fixture('billing', 2), fixture('billing', -0.1),
    fixture('billing', Infinity), fixture('billing', 0.9, NaN), fixture('billing', 0.9, 1.01), fixture('billing', 0.5, -1), fixture('billing', 0.9, null)]) {
    assert.throws(() => deriveDecision(raw), /형식/);
  }
});
test('invalid thresholds fail closed', () => {
  for (const threshold of [NaN, -0.01, 1.01, Infinity, '0.5', null, '']) {
    assert.throws(() => deriveDecision(fixture(), threshold), /검토 기준/);
  }
});
test('changing the threshold never changes the raw response', () => {
  const raw = deepFreeze(fixture('technical', 0.72, 0.4));
  const before = JSON.stringify(raw);
  const routes = [0, 0.5, 0.7, 0.75, 0.8, 1].map(threshold => deriveDecision(raw, threshold).routing);
  assert.deepEqual(routes, ['team', 'team', 'team', 'review', 'review', 'review']);
  assert.equal(JSON.stringify(raw), before);
});

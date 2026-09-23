const departments = new Set(['billing', 'technical', 'sales', 'unknown']);
const probability = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

// Practice values for the demo, not thresholds validated on real support data.
export const DEFAULT_THRESHOLD = 0.75;
export const URGENT_REVIEW_AT = 0.8;
export const REVIEW_REASONS = ['unknown_department', 'low_confidence', 'urgent'];

// Pure policy shared by server.mjs and public/app.js: no I/O, no external actions, input is never mutated.
// Invalid judgments or thresholds throw so callers fail closed instead of routing to a team.
export function deriveDecision(raw, threshold = DEFAULT_THRESHOLD) {
  if (!probability(threshold)) throw new Error('검토 기준은 0~1 사이의 숫자여야 합니다.');
  const department = raw?.answers?.department;
  const urgent = raw?.answers?.urgent;
  if (department?.type !== 'choice' || !departments.has(department.choice) ||
      !probability(department.confidence) || urgent?.type !== 'noul' || !probability(urgent.noul)) {
    throw new Error('API 판단 응답 형식이 올바르지 않습니다.');
  }
  const reasons = [];
  if (department.choice === 'unknown') reasons.push('unknown_department');
  if (department.confidence < threshold) reasons.push('low_confidence');
  if (urgent.noul >= URGENT_REVIEW_AT) reasons.push('urgent');
  return {
    department: department.choice, confidence: department.confidence, urgentProbability: urgent.noul,
    routing: reasons.length ? 'review' : 'team', reasons, threshold
  };
}

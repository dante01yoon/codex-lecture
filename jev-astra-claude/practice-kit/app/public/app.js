import { deriveDecision, URGENT_REVIEW_AT } from '/policy.mjs';
const $ = selector => document.querySelector(selector);
const input = $('#ticket-input');
const result = $('#result');
const submit = $('#classify-btn');
const reset = $('#reset-btn');
const rawToggle = $('#raw-toggle');
const threshold = $('#threshold');
const examples = [...document.querySelectorAll('[data-example]')];
const teams = {
  billing: ['결제 · 환불 팀', '결제 및 환불 문의'],
  technical: ['기술 지원 팀', '접속 및 기능 오류 문의'],
  sales: ['도입 상담 팀', '도입 및 요금제 문의'],
  unknown: ['담당 팀 미정', '근거 부족 또는 해당 없음']
};
const percent = value => `${(value * 100).toFixed(1)}%`;
const reasonText = {
  unknown_department: () => '담당 팀을 정할 근거 부족(unknown)',
  low_confidence: decision => `선택 신뢰도 ${percent(decision.confidence)} < 실습용 기준 ${percent(decision.threshold)}`,
  urgent: decision => `긴급 신호 ${percent(decision.urgentProbability)} ≥ ${percent(URGENT_REVIEW_AT)}`
};
let busy = false;
// Last successful server response; threshold changes re-apply the shared policy to it without a new API call.
let lastResponse = null;
function setState(state, message) {
  result.dataset.state = state;
  result.setAttribute('aria-busy', String(state === 'loading'));
  $('#result-message').textContent = message;
  $('#result-message').hidden = state === 'done';
  $('#decision-content').hidden = state !== 'done';
  $('#response-badge').textContent = { idle: '대기 중', loading: '판단 중', done: '실제 API 응답', error: '오류' }[state];
}
function clearRaw() {
  $('#raw-response').textContent = '';
  $('#raw-response').hidden = true;
  rawToggle.disabled = true;
  rawToggle.setAttribute('aria-expanded', 'false');
  rawToggle.textContent = '원본 JSON 펼치기 ＋';
}
function readThreshold() { return threshold.value.trim() === '' ? NaN : Number(threshold.value); }
function render() {
  const decision = deriveDecision(lastResponse.raw, readThreshold());
  const [name, description] = teams[decision.department];
  $('#department-value').textContent = name;
  $('#department-description').textContent = description;
  $('#routing-block').dataset.routing = decision.routing;
  $('#routing-value').textContent = decision.routing === 'review' ? '검토함 · 사람 확인' : `담당 팀 배정 · ${name}`;
  $('#routing-reasons').textContent = decision.routing === 'review'
    ? `검토 이유: ${decision.reasons.map(reason => reasonText[reason](decision)).join(' · ')}`
    : '검토 이유 없음 · 모든 조건을 통과했습니다.';
  $('#confidence-value').textContent = percent(decision.confidence);
  $('#urgent-value').textContent = percent(decision.urgentProbability);
}
function updateCount() { $('#input-count').textContent = `${[...input.value].length.toLocaleString('ko-KR')} / 1,200자`; }
function idle() { lastResponse = null; clearRaw(); setState('idle', '문의를 입력하면 Jev의 판단이 이곳에 표시됩니다.'); }
input.addEventListener('input', () => { updateCount(); idle(); });
examples.forEach(button => button.addEventListener('click', () => {
  input.value = button.querySelector('span').textContent;
  updateCount(); idle(); input.focus();
}));
reset.addEventListener('click', () => { input.value = ''; updateCount(); idle(); input.focus(); });
threshold.addEventListener('input', () => {
  $('#threshold-value').textContent = readThreshold().toFixed(2);
  if (!lastResponse) return;
  try { render(); } catch (error) { lastResponse = null; setState('error', error.message); }
});
rawToggle.addEventListener('click', () => {
  const expanded = rawToggle.getAttribute('aria-expanded') !== 'true';
  rawToggle.setAttribute('aria-expanded', String(expanded));
  $('#raw-response').hidden = !expanded;
  rawToggle.textContent = expanded ? '원본 JSON 접기 −' : '원본 JSON 펼치기 ＋';
});
$('#ticket-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  lastResponse = null;
  clearRaw();
  if (!input.value.trim() || [...input.value].length > 1200) {
    setState('error', '문의 내용을 1~1,200자로 입력해 주세요.'); return;
  }
  busy = true;
  [input, submit, reset, ...examples].forEach(control => { control.disabled = true; });
  setState('loading', 'Jev가 담당 팀과 긴급성을 판단하고 있습니다.');
  try {
    const response = await fetch('/api/classify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: input.value })
    });
    const data = await response.json();
    if (data.raw !== null && data.raw !== undefined) {
      $('#raw-response').textContent = JSON.stringify(data.raw, null, 2);
      rawToggle.disabled = false;
    }
    if (!response.ok) throw new Error(data.error || `서버 HTTP ${response.status} 오류`);
    lastResponse = data;
    render();
    $('#model-value').textContent = data.raw.model;
    $('#tokens-value').textContent = data.raw.usage.input_tokens.toLocaleString('ko-KR');
    $('#elapsed-value').textContent = `${data.elapsed_ms.toLocaleString('ko-KR')} ms`;
    $('#request-value').textContent = `${data.request_number} / 30회`;
    setState('done', '');
  } catch (error) {
    lastResponse = null;
    setState('error', error instanceof TypeError ? '서버에 연결할 수 없습니다. 서버 실행 상태를 확인해 주세요.' : error.message);
  } finally {
    busy = false;
    [input, submit, reset, ...examples].forEach(control => { control.disabled = false; });
  }
});
try {
  const response = await fetch('/api/health');
  if (!response.ok) throw new Error();
  const health = await response.json();
  $('#health-status').textContent = health.hasApiKey ? 'API 키 설정됨' : 'API 키 미설정';
} catch { $('#health-status').textContent = '서버 연결 실패'; }

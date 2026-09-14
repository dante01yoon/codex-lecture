세 페이지를 `Promise.allSettled`로 동시에 조회하고, 각 `CallToolResult.content`의 `text` 블록 JSON을 파싱했습니다.

| 서비스 | 시작 안내 | 응답 결과 관리 안내 | 기능·가격 | 근거 및 출처 |
|---|---|---|---|---|
| Tally | 확인됨 — “Create your first form”, “Start with a template”, `/`를 입력해 시작하라는 안내가 있음 | 일부 확인 — `Insights`, `Partial submissions`, `Submissions data retention` 항목은 있지만, 이 페이지에서 구체적인 응답 관리 절차는 확인하지 못함 | 무료 기능에 관한 설명은 있으나 구체적인 가격은 미확인 | “Create your first form”, “Insights”, “Submissions data retention” — [Tally Help Center](https://tally.so/help) |
| Typeform | 미확인 | 미확인 | 미확인 | 조회 결과: `HTTP Error 403: Forbidden`. 도구 응답에 `source`가 반환되지 않아 출처 링크도 미확인 |
| Google Forms | 확인됨 — “How to use Google Forms”, 폼·퀴즈·RSVP 생성 및 공유 안내가 있음 | 확인됨 — “Choose where to save form responses”, “View & manage form responses” 안내가 있음 | 이 페이지에서 기능별 제한이나 가격은 미확인 | “You can create forms, quizzes, RSVPs…”, “View & manage form responses” — [Google Forms 도움말](https://support.google.com/docs/topic/9055404?hl=en) |

Typeform 호출은 Promise 자체로는 `fulfilled`였지만, 파싱된 JSON 내용이 `{"error":"HTTP Error 403: Forbidden","tool":"read_service"}`였으므로 조회 실패로 판정했습니다.
# DANTE Support Desk

한국어 고객 문의를 입력하면 Jev에 담당 팀(Choice)과 명시적 긴급성(Noul)을 한 번에 질문하는 로컬 웹 앱입니다. 실습에서 Astra는 앱 구현, Jev는 실행 중 판단을 맡습니다. 선택한 팀, Choice confidence, urgent Noul 값과 함께 사람 검토 정책에 따른 처리 경로(검토함 또는 담당 팀)를 보여줍니다. 어떤 메시지도 외부로 발송하지 않습니다.

## 사람 검토 정책

`policy.mjs`의 순수 함수 `deriveDecision(raw, threshold = 0.75)`가 정책 전체를 담당합니다. 서버와 브라우저가 같은 파일을 사용하며(서버가 `/policy.mjs`로 원본 그대로 제공), 서버 응답의 `decision`은 기본 기준 0.75로 계산한 값입니다.

- 기존 `department`, `confidence`, `urgentProbability`를 그대로 두고 `routing`(`team` 또는 `review`), `reasons`, `threshold`를 추가합니다.
- 다음 중 하나라도 해당하면 `review`: 선택이 `unknown`(`unknown_department`), confidence < threshold(`low_confidence`, 같으면 통과), urgent Noul ≥ 0.8(`urgent`). 아니면 `team`.
- 판단이 없거나, 형식이 다르거나, NaN이나 0~1 범위 밖이면 예외가 발생합니다. 서버는 502 오류로, 화면은 오류 상태로 처리하며 팀 배정으로 넘어가지 않습니다. 잘못된 threshold도 예외입니다.
- 화면의 `#threshold` 슬라이더(0~1, 0.05 단위)는 **실습용 기준**입니다. 실제 문의 데이터로 검증한 값이 아닙니다. 슬라이더를 움직이면 마지막 성공 응답의 raw JSON에 같은 함수를 다시 적용하며 API를 다시 호출하지 않고 raw도 바꾸지 않습니다.
- Choice confidence는 선택지 분포가 얼마나 모였는지를 나타냅니다. 정답률이나 사실일 확률이 아니므로 화면에서도 그렇게 표시하지 않습니다.
- 검토함/담당 팀 표시는 화면에만 나타나며 고객이나 팀에 메시지를 보내지 않습니다.

## 설치와 실행

Node.js 20 이상이 필요합니다. 외부 npm 의존성이 없어 `npm install` 없이 실행할 수 있습니다.

```sh
npm start
```

브라우저에서 http://127.0.0.1:8794 를 엽니다. 기본 호스트와 포트는 고정되어 있습니다. 환경변수 이름은 `TYPESAFE_API_KEY`입니다. 촬영 담당자가 서버 프로세스 환경에 주입한 후 실행합니다. `example.env`에는 빈 값만 있으며 서버가 .env 파일을 자동으로 읽지는 않습니다. 키가 없으면 화면에 ‘API 키 미설정’이 표시되고 판단 요청은 오류로 종료됩니다. 키는 브라우저로 전달하지 않습니다.

## 실제 API와 오프라인 검사

```sh
npm test
```

오프라인 테스트는 Node 내장 테스트 러너와 주입한 가짜 전송 함수를 사용합니다. HTTP 핸들러에 직접 요청 스트림을 전달하므로 로컬 포트를 열거나 외부 네트워크에 연결하지 않습니다. 키를 읽거나 실제 API를 호출하지 않으며, 임시 폴더에 테스트 기록을 생성하고 제거합니다. 테스트의 합성 응답은 화면용 성공 결과가 아니며 모델 정확도나 실제 연결을 검증하지 않습니다.

실제 실행에서 ‘담당 팀 판단하기’를 누르면 서버가 `https://api.typesafe.ai/v1/systemone`에 `jev-1.13.0`을 요청합니다. 실제 응답의 `model`, `usage.input_tokens`, `answers.department.confidence`, `answers.urgent.noul`을 표시합니다. Choice confidence는 선택지 분포의 확신 정도이며 정답 확률을 뜻하지 않습니다. Noul 값은 긴급성 질문에 대한 Yes 확률입니다. 응답 전에는 수치나 성공 결과를 표시하지 않습니다.

입력은 Unicode 코드 포인트 기준 1,200자, 직렬화한 API 요청은 16,000 bytes 이하로 제한합니다. 실습 전체 호출 상한은 30회이며 호출 시작 전에 횟수를 저장합니다. 오류와 시간 초과도 횟수를 소비합니다. 재시도는 하지 않으며 응답 본문까지 포함하여 20초로 제한합니다. 앱 서버는 한 프로세스로 실행하세요.

## 기록과 코드 구성

- `evidence/call-count.json`: 재시작 후에도 유지하는 호출 횟수. 초기화 버튼은 이 값을 바꾸지 않습니다.
- `evidence/jev-requests.jsonl`: ISO 시각, 요청 번호와 본문, 원본 JSON 응답, 공급자 HTTP 상태, 소요 시간, 오류. 헤더나 환경변수의 키는 기록하지 않습니다. JSON이 아닌 응답이나 연결 실패는 raw가 null이며 오류로 기록됩니다.
- `GET /api/health`: 키 존재 여부 boolean만 반환합니다.
- `GET /api/evidence`: 이 앱의 요청 로그만 반환합니다.
- `policy.mjs`: 서버와 브라우저가 공유하는 순수 함수 `deriveDecision(raw, threshold)`. 검사는 `test/policy.test.mjs`에 있습니다.
- `server.mjs`: 입력 제한, API 호출, 카운터, 기록, 정적 파일(`/policy.mjs` 포함) 제공.
- `public/`: 한국어 UI, 실제 응답 렌더링, 검토 기준 슬라이더.
- `test/ui.test.mjs`: 실제 `app.js`를 가짜 DOM에서 실행하여 제출, 슬라이더 조작, 오류 응답에서의 화면 상태와 API 호출 횟수를 확인합니다. 실제 브라우저 렌더링 검사는 아닙니다.

기록이 손상되거나 저장되지 않으면 추가 호출을 차단합니다. `.gitignore`는 `.env` 및 `evidence/`를 제외합니다. 문의 내용 자체가 로그에 남으므로 촬영에는 제공된 합성 예시를 사용하세요.

## 참고 문서

제공된 `../inputs/quickstart.md`, `confidence.md`, `coding-agents.md`와 프로젝트 TypeSafe 스킬을 참고했습니다. 공개 문서 실시간 열람은 접근 실패하여 제공된 공식 문서의 계약을 사용했습니다.

- [TypeSafe Quick start](https://docs.typesafe.ai/introduction/quickstart)
- [Confidence](https://docs.typesafe.ai/confidence)
- [Jev with coding agents](https://docs.typesafe.ai/introduction/coding-agents)

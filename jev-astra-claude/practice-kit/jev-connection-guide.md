# Jev를 Codex와 Claude Code 프로젝트에 연결하기

이 실습에서 Codex CLI와 Claude Code는 **앱을 작성하고 검토하는 코딩 에이전트**입니다. Jev는 Codex나 Claude의 채팅 모델을 바꾸는 설정이 아닙니다. 앱 서버가 TypeSafe Jev API를 호출하고, 그 결과를 앱 코드가 처리합니다.

```text
Codex CLI 또는 Claude Code
  └─ TypeSafe 스킬을 참고해 앱 코드를 작성·수정
       ↓
브라우저 → 내 앱의 서버 → Jev API → 구조화된 답변
                          └→ 앱 코드가 팀 배정·사람 검토 규칙 적용
```

공식 문서도 코딩 에이전트와 Jev의 역할을 이렇게 구분합니다. 에이전트는 Jev를 호출하는 앱 코드를 만들고, 실행 중인 앱은 상태와 질문을 Jev에 보내 답을 받습니다. [Jev with coding agents](https://docs.typesafe.ai/introduction/coding-agents) · [Quick start](https://docs.typesafe.ai/introduction/quickstart)

## 1. Codex 또는 Claude Code가 프로젝트를 읽게 하기

실습 폴더에서 TypeSafe 공식 스킬을 프로젝트에 설치합니다. 이 스킬은 에이전트에게 Jev 요청 형식과 구현 문서를 안내합니다. 스킬 설치 자체가 API 연결이나 로그인을 대신하지는 않습니다.

```sh
npx --yes skills add typesafe-ai/skills --skill typesafe-ai --agent codex claude-code --yes --copy
```

이 프로젝트에서는 스킬 파일이 `.agents/skills/typesafe-ai/SKILL.md`와 `.claude/skills/typesafe-ai/SKILL.md`에 놓입니다. 에이전트가 읽었는지 실제 대화에서 확인하고, 변경할 파일·테스트·네트워크 호출 범위를 프롬프트에 분명히 적습니다. [TypeSafe 공식 스킬](https://github.com/typesafe-ai/skills/blob/main/skills/typesafe-ai/SKILL.md)

Codex와 Claude Code는 각 CLI의 계정으로 별도 로그인해야 합니다. 한 폴더를 둘 다 사용할 때는 같은 파일을 동시에 고치지 않도록 순서대로 실행하세요. 예를 들어 Codex가 API 연결을 구현한 뒤 Claude Code가 정책과 검사를 리뷰할 수 있습니다.

## 2. Jev API 키는 앱 서버에 전달하기

에이전트의 CLI 로그인 정보와 Jev API 키는 서로 다른 인증입니다. TypeSafe 대시보드에서 API 키를 발급하고, 앱을 시작하는 **서버 프로세스**에 `TYPESAFE_API_KEY`로 전달합니다. 이 실습의 `app/start-demo.sh`는 키를 숨김 입력으로 받아 서버 프로세스에만 전달합니다.

```sh
cd app
npm test
bash start-demo.sh
```

`TypeSafe API key (hidden input):` 프롬프트에 키를 입력한 뒤 브라우저에서 [실습 앱](http://127.0.0.1:8794)을 엽니다. `.env` 파일은 앱이 자동으로 읽지 않습니다. 키를 브라우저 코드, 화면 녹화, 코딩 에이전트 프롬프트 또는 공유 자료에 붙여 넣지 마세요.

## 3. 실제 요청이 흐르는 경로

1. 브라우저가 문의 문장을 `POST /api/classify`로 로컬 앱 서버에 보냅니다.
2. `app/server.mjs`의 `buildRequest()`가 문의를 `state`에 담고, 담당 팀 `Choice`와 긴급성 `Noul` 질문을 `questions`에 만듭니다.
3. 같은 서버가 TypeSafe의 `/v1/systemone` 엔드포인트에 `Authorization: Bearer …`를 붙여 요청합니다. 이 헤더는 브라우저로 내려가지 않습니다.
4. Jev의 구조화된 답이 돌아오면 `app/policy.mjs`가 `unknown`, 낮은 confidence, 긴급성 기준을 적용해 팀 배정 또는 사람 검토를 결정합니다.
5. 브라우저에는 앱 서버가 가공한 결과가 표시됩니다.

실습 코드는 API 키가 없으면 호출을 거부하고, 요청·응답 로그에서 키와 인증 헤더를 제외합니다. 이 예제의 `0.75`와 `0.8`은 실습 기준이며 실제 지원 업무 데이터로 검증한 기준이 아닙니다. 업무에 연결하기 전에는 자신의 문의 데이터로 품질과 검토 규칙을 평가해야 합니다.

## 4. 에이전트에게 구현 요청하기

Codex나 Claude Code에서 같은 프로젝트 폴더를 열고, 스킬과 앱 요구사항을 읽은 뒤 작은 단위로 맡깁니다. 이 실습의 실제 구현 프롬프트는 `inputs/astra-prompt.txt`, 정책 검토 프롬프트는 `inputs/claude-prompt.txt`와 `inputs/claude-terminal-prompt.txt`에 있습니다. 실제 요청에는 키를 넣지 말고, 검증은 합성 응답을 사용하는 `npm test`로 먼저 수행합니다.

아래처럼 구현 범위와 키 보호를 함께 명시할 수 있습니다.

```text
TypeSafe 공식 스킬과 이 앱의 README를 읽어 주세요.
서버가 문의를 state로 보내고 Choice/Noul 응답을 받아 화면에 표시하는 흐름을 확인하세요.
API 키는 서버 환경변수에서만 읽고 브라우저로 보내지 마세요.
합성 응답 테스트를 실행하고, 변경 파일과 실행한 검사를 보고해 주세요.
```

## 연결이 안 될 때

- **에이전트가 Jev 문서를 모름:** 프로젝트에 공식 스킬이 설치됐는지, 사용 중인 CLI가 해당 프로젝트 스킬 경로를 읽는지 확인합니다.
- **앱에 `API 키 미설정`이 표시됨:** CLI 로그인 여부가 아니라 앱 서버를 시작한 프로세스의 `TYPESAFE_API_KEY`를 확인하고 서버를 다시 시작합니다.
- **API 오류가 발생함:** TypeSafe 키·계정 권한·응답의 HTTP 상태를 확인합니다. 화면에 버튼이 생겼다는 사실만으로 API 연결이 완료된 것은 아닙니다.
- **코딩 에이전트가 변경을 끝냈다고 함:** 실제 diff와 테스트 출력을 직접 확인합니다. 앱이 Jev를 호출했는지는 브라우저 요청이 아니라 서버 코드와 실제 요청 기록으로 확인합니다.

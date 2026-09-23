# Astra · Claude · Jev 실습 — 문의 분류함을 직접 실행하기

이 실습에서는 고객 문의 한 문장을 넣고 담당 팀과 긴급성 판단을 확인합니다. Astra와 Claude Code는 앱 코드를 만들고 고칩니다. 실행 중 문의를 판단하는 API는 Jev이고, 검토함으로 보낼 조건은 `policy.mjs`에 있습니다.

먼저 [Jev와 Codex·Claude Code 연결 안내](jev-connection-guide.ko.md)에서 각 CLI 로그인, TypeSafe 공식 스킬 설치, 서버용 API 키, 브라우저에서 Jev까지 이어지는 요청 경로를 확인하세요.

작성 기준: 2026-09-22. macOS 터미널 기준이며, 아래 명령은 각 코드 블록에서 한 줄씩 실행합니다. 개인 API 키는 자료에 포함되어 있지 않습니다.

## 1. 준비하기

이 앱은 Node.js 20 이상이 필요합니다. 터미널에서 다음 결과를 확인합니다.

```sh
node --version
npm --version
```

Node.js가 없으면 [Node.js 공식 다운로드](https://nodejs.org/en/download)에서 설치합니다. 앱 자체는 외부 npm 패키지를 사용하지 않아 `npm install` 없이 실행할 수 있습니다.

Codex CLI가 없다면 [OpenAI 공식 설치 안내](https://learn.chatgpt.com/docs/codex/cli)의 macOS/Linux 설치 명령을 사용합니다.

```sh
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

Claude Code는 [공식 설치 안내](https://code.claude.com/docs/en/setup)의 macOS/Linux 설치 명령을 사용합니다.

```sh
curl -fsSL https://claude.ai/install.sh | bash
```

설치 후 새 터미널을 열어 확인합니다.

```sh
codex --version
claude --version
```

Codex와 Claude의 로그인은 각 프로그램을 처음 실행할 때 진행합니다. 사용하는 계정에서 해당 도구와 모델에 접근할 수 있어야 합니다. Jev API 사용량은 TypeSafe 계정에서 별도로 확인합니다.

## 2. 완성 앱부터 실행하기

터미널에서 제공 자료의 `app` 폴더로 이동합니다. 아래 경로를 자신의 실제 폴더 위치로 바꿉니다.

```sh
cd "/실제/실습자료/위치/app"
npm test
```

이 검사는 외부 Jev API를 호출하지 않습니다. 제작 중 Claude가 정책을 추가한 버전에서는 31개 검사가 통과했습니다. 자신의 출력에서 실패 수를 직접 확인하세요. 이 결과만으로 실제 API 연결이 확인된 것은 아닙니다.

[TypeSafe API Keys](https://console.typesafe.ai/keys)에서 자신의 키를 준비한 다음 시작 스크립트를 실행합니다. 키 발급 위치는 [공식 Quick start](https://docs.typesafe.ai/introduction/quickstart.md)에 안내돼 있습니다.

```sh
bash start-demo.sh
```

`TypeSafe API key (hidden input):`이 나오면 키를 입력하고 Enter를 누릅니다. 입력 문자는 화면에 표시되지 않습니다. 스크립트가 `TYPESAFE_API_KEY` 환경변수를 서버 프로세스에 전달합니다. 이미 이 환경변수가 설정되어 있다면 다시 묻지 않습니다.

서버가 실행된 상태에서 [실습 앱](http://127.0.0.1:8794)을 엽니다. 서버를 켠 터미널은 그대로 두고, 종료할 때 Ctrl+C를 누릅니다. `example.env`에 값을 적는 것만으로는 적용되지 않습니다. 이 앱은 `.env`를 자동으로 읽지 않습니다.

## 3. 문의 세 개로 확인하기

각 문장을 입력하고 `담당 팀 판단하기`를 누릅니다. 예시 버튼은 문장만 입력하며 결과는 버튼 안에 저장되어 있지 않습니다.

| 입력 | 확인할 것 |
|---|---|
| 어제 결제가 두 번 됐어요. 중복 결제 한 건을 환불해 주세요. | 담당 팀, Choice confidence, 긴급 Noul, 응답 모델, 사용량을 읽습니다. |
| 비밀번호를 바꾼 뒤 로그인하면 화면이 멈춰요. 새로고침해도 똑같습니다. | 예시 버튼 대신 직접 입력하고 요청 번호가 새로 생기는지 확인합니다. |
| 지난번에 말씀드린 건이 아직 그대로예요. 확인 부탁드립니다. | 근거가 부족할 때 어떤 답을 내는지 확인하고, 검토함으로 가는 이유를 읽습니다. |

제작 중 이 세 문장은 각각 `billing`, `technical`, `unknown`으로 응답했습니다. `unknown`은 confidence가 높더라도 사람 검토로 보냅니다. 다른 입력에서도 같은 정확도를 보장하는 결과는 아닙니다.

`원본 JSON 펼치기`를 눌러 `answers.department`, `answers.urgent`, `model`, `usage`를 확인하세요. 실제 입력과 원본 응답을 함께 보려면 [로컬 요청 기록](http://127.0.0.1:8794/api/evidence)을 열어 같은 `request_number`의 `request.state.text`와 `raw`를 비교합니다.

## 4. 확률과 앱 규칙을 나눠 보기

`Choice confidence`는 선택지 확률 분포가 얼마나 한쪽으로 모였는지 나타내는 값입니다. 선택한 팀이 실제로 정답일 확률과 같다고 해석하지 않습니다. `Noul`은 질문에 대한 Yes 확률이며 별도의 confidence가 없습니다. [TypeSafe Confidence](https://docs.typesafe.ai/confidence.md), [Noul](https://docs.typesafe.ai/primitives/noul.md).

현재 정책은 다음 중 하나라도 해당하면 검토함으로 보냅니다.

- 담당 팀 선택이 `unknown`.
- Choice confidence가 화면의 실습용 기준보다 작음. 기준과 같으면 이 조건으로는 보류하지 않음.
- 긴급 Noul이 `0.8` 이상.

기본 confidence 기준은 `0.75`입니다. 이 수치는 실제 고객 데이터로 검증한 업무 기준이 아니라 실습값입니다.

다음 문장을 한 번 분류해 보세요.

```text
결제는 정상인데 구독 등급을 바꾼 뒤 팀원 초대가 안 됩니다. 요금제가 잘못된 건지 기능 오류인지 모르겠습니다.
```

제작 중 한 요청은 `technical`, confidence `0.8`, 긴급 Noul `0.05`로 응답했습니다. 이 응답에서는 기준을 `0.75`에서 `0.85`로 올리면 낮은 confidence 조건으로 검토함에 들어갑니다. 직접 받은 값이 다르면 그 값보다 조금 낮은 기준과 높은 기준을 비교하세요. 값이 `1`이거나 이미 `unknown`/긴급 조건에 걸렸다면 슬라이더로 처리 경로가 바뀌지 않을 수 있습니다.

슬라이더를 움직여도 원본 응답과 요청 번호는 그대로여야 합니다. 이때는 같은 응답에 코드의 규칙을 다시 적용하므로 Jev를 재호출할 필요가 없습니다. 결과는 화면에만 표시되며 실제 팀이나 고객에게 메시지를 발송하지 않습니다.

## 5. TypeSafe 공식 스킬 설치하기

완성 앱에는 제작에 사용한 스킬이 들어 있습니다. 새 실습 폴더에서 다시 시작하거나 스킬을 설치할 때는 해당 폴더에서 실행합니다.

```sh
npx --yes skills add typesafe-ai/skills --skill typesafe-ai --agent codex claude-code --yes --copy
```

이 명령은 Codex와 Claude Code 양쪽에 프로젝트 스킬을 복사합니다. 옵션은 skills CLI 버전에 따라 달라질 수 있으므로 실패하면 현재 안내와 `npx skills add --help`를 확인하세요. 스킬은 에이전트에게 구현 지침을 제공할 뿐, CLI 로그인이나 Jev API 키를 대신하지 않습니다. [TypeSafe 공식 Quick start](https://docs.typesafe.ai/introduction/quickstart)

제공 앱에서 다음 파일을 확인할 수 있습니다.

```text
.agents/skills/typesafe-ai/SKILL.md
.claude/skills/typesafe-ai/SKILL.md
```

이 파일은 코딩 에이전트에 API 사용법을 알려줍니다. API 키를 발급하거나 Jev 모델을 로컬에 설치하는 기능은 아닙니다. [공식 스킬 원문](https://github.com/typesafe-ai/skills/blob/main/skills/typesafe-ai/SKILL.md).

## 6. 실제 Codex에서 앱을 고쳐 보기

서버를 실행한 창과 다른 터미널을 열어 같은 `app` 폴더로 이동합니다. 기존 파일이 있으므로 처음부터 다시 만들라는 요청 대신 작은 개선 하나를 맡깁니다.

```sh
codex -m gpt-6-astra
```

`-m`은 이 실습 기기의 CLI에서도 확인한 모델 지정 옵션입니다. 해당 모델을 사용할 수 없다면 계정의 모델 목록을 확인하세요. 다른 모델로 실행한 결과를 Astra가 한 일로 기록하지 않습니다.

아래는 완성 앱에 적용할 **추가 연습용 요청**입니다. 제작 당시의 원문 프롬프트는 자료의 `inputs/astra-prompt.txt`에서 볼 수 있습니다.

```text
이 폴더의 TypeSafe 스킬과 README.ko.md를 읽어 주세요.
현재 DANTE Support Desk의 담당 팀, 검토 경로, Choice confidence,
긴급 Noul이 1440×900 화면에서 읽기 좋게 보이도록 여백과 배치를 점검해 주세요.
필요한 CSS 수정만 적용하고 API 요청, 응답 표시, 정책은 유지하세요.
키를 찾거나 실제 Jev API를 호출하지 말고 npm test로 기존 동작을 확인하세요.
수정 파일과 실행한 검사 결과를 알려 주세요.
```

Codex 터미널에서 실제 파일 변경과 명령 실행을 확인합니다. 완료되면 앱을 새로고침하고 읽기 좋아졌는지 직접 확인합니다. 서술된 성공과 실제 화면·검사 출력이 일치해야 합니다.

## 7. 같은 폴더를 Claude Code로 확인하기

Codex의 파일 수정이 끝난 뒤 같은 `app` 폴더에서 Claude Code를 실행합니다. 같은 파일을 동시에 수정하지 않도록 순서대로 진행합니다.

```sh
claude
```

다음은 기존 정책을 검토하는 **추가 연습용 요청**입니다. 최초 정책 추가에 사용한 원문은 `inputs/claude-prompt.txt`에 있습니다.

```text
이 폴더의 TypeSafe 스킬과 policy.mjs를 읽어 주세요.
이미 구현된 사람 검토 규칙을 확인하고 npm test를 실행하세요.
unknown, confidence가 기준보다 낮은 경우, 긴급 Noul이 0.8 이상인 경우를
각각 어떤 코드가 처리하는지 파일과 함께 설명해 주세요.
confidence가 기준과 같을 때와 슬라이더를 바꿀 때도 확인하세요.
API 키를 읽거나 실제 Jev API를 호출하지 마세요.
문제가 없으면 파일을 바꾸지 말고, 문제가 있으면 근거와 수정 내용을 알려 주세요.
```

이 요청은 이미 있는 정책을 검토하는 단계입니다. 이를 처음부터 새 정책을 작성한 작업으로 기록하지 않습니다. 최초 제작에서는 Astra가 기본 앱을 만들고 Claude가 정책을 추가했으며, 각각의 실행 기록과 스냅샷이 별도로 남아 있습니다.

## 8. 새 폴더에서 다시 만들기

완성 앱을 실행해 본 뒤에는 빈 폴더에서 같은 흐름을 반복할 수 있습니다.

```sh
mkdir jev-support-practice
cd jev-support-practice
npx skills add typesafe-ai/skills --skill typesafe-ai
codex -m gpt-6-astra
```

`inputs/astra-prompt.txt`의 요구사항을 새 폴더에 맞게 사용하세요. 원문의 `../inputs`는 제공 자료의 문서를 가리킵니다. 새 폴더에서는 에이전트에게 [현재 TypeSafe 문서](https://docs.typesafe.ai/llms.txt)를 읽도록 요청하거나 해당 공식 문서 사본을 함께 둡니다. API 키를 넣기 전에는 합성 응답으로 검사를 실행합니다. 기본 앱이 동작하면 같은 폴더에서 Claude Code로 `inputs/claude-prompt.txt`의 검토 정책을 추가합니다.

새로 생성한 코드는 제공된 완성 앱과 달라질 수 있습니다. 선택지·실제 API 응답·검토 조건·실패 표시를 기준으로 확인하세요. 스크린샷이 비슷하다는 이유만으로 연동이 완료된 것은 아닙니다.

## 문제가 생겼을 때

| 보이는 상태 | 확인할 곳 |
|---|---|
| `API 키 미설정` | `bash start-demo.sh`로 서버를 다시 시작했는지 확인합니다. 키는 앱 서버가 실행되는 프로세스에 전달해야 합니다. |
| `EADDRINUSE` | 같은 앱 서버가 이미 실행 중인지 확인하고, 사용 중인 창을 유지하거나 자신이 실행한 중복 서버를 종료합니다. 기본 포트는 8794입니다. |
| API HTTP 오류 | 원본 응답과 HTTP 상태를 확인합니다. 키·권한·계정 사용량은 TypeSafe 콘솔에서 확인합니다. 오류 화면을 성공 결과로 해석하지 않습니다. |
| 20초 제한 시간 초과 | 기록에 실패가 남는지 확인합니다. 이 앱은 자동 재시도를 하지 않습니다. |
| 30회 호출 한도 | 실습 앱의 누적 호출 한도입니다. 입력창 초기화나 서버 재시작으로 지워지지 않습니다. 이미 호출한 내역을 보존한 채 다음 실습 계획을 정합니다. |
| 분류는 됐는데 검토함에 들어감 | `unknown`, 낮은 confidence, 긴급 Noul 중 어떤 이유인지 읽습니다. 높은 confidence라도 `unknown`은 검토 대상입니다. |

## 파일을 읽는 순서

1. `server.mjs`: `state`, `questions`, 실제 provider 호출, 요청/응답 기록.
2. `policy.mjs`: 어떤 조건을 사람이 검토할지 결정.
3. `public/app.js`: 원본 응답과 슬라이더를 화면에 연결.
4. `test/`: 네트워크 없이 실패·경계·화면 동작을 검사.
5. `README.ko.md`: 실행과 제한 사항.

참고 영상은 [JEV Is NOT an LLM — Here’s What It Actually Does](https://www.youtube.com/watch?v=fMV6JKkQVfE), Zubair Trabzada | AI Workshop, 2026-09-21입니다. 이 실습은 해당 영상의 개념 구분을 참고해 별도의 문의 분류 앱과 검수 절차로 구성했습니다.

# Codex Code Mode · 4가지 실습

[강의 영상](https://youtu.be/n73CZL509Po)에 나온 웹페이지, 프롬프트, 합성 데이터, 실제 실행 기록입니다. **코드를 전부 이해할 필요는 없습니다. 요청 → 결과부터 보고, 궁금할 때 실행 코드를 열어보세요.**

## 1. 자료 내려받기

GitHub 저장소 상단 **Code → Download ZIP**으로 받은 뒤 압축을 풉니다. `codex-lecture-main` 안의 **`codemode_lecture` 폴더**를 터미널에서 엽니다.

Git을 사용한다면:

```sh
git clone https://github.com/dante01yoon/codex-lecture.git
cd codex-lecture/codemode_lecture
```

이 문서의 명령은 모두 `codemode_lecture` 폴더 안에서 실행합니다.

## 2. 먼저 저장된 결과 열기

Python 3만 있으면 됩니다. 별도 Python 패키지를 설치하지 않습니다.

```sh
python3 --version
python3 production/viewer.py
```

브라우저 주소창에 **http://127.0.0.1:8769** 를 입력합니다. 서버를 켜 둔 터미널은 그대로 두고, 종료할 때 `Ctrl+C`를 누릅니다. Windows에서는 Python 3을 `python3` 이름으로 사용할 수 있는 환경에서 실행하세요. 촬영·배포 검증은 macOS에서 수행했습니다.

- **시작하기 → 기록 보는 법**: 실행 기록의 뜻과 파일 위치.
- **시작하기 → 실행 확인**: 사전 확인의 요청, 코드, 반환 결과.
- **리뷰 분석 → 결과**: 125행을 중복 제거해 120개 리뷰로 정리한 결과.
- **실제 실행 코드**: 코드 줄을 누르면 핵심 부분이 강조됩니다.

저장된 기록을 보는 동안에는 Codex 로그인이나 계정 사용량이 필요하지 않습니다. 이 웹페이지는 **공식 Codex 앱 화면이 아닌 강의용 뷰어**입니다.

## 3. 내 계정으로 새로 실행하기

[공식 Codex CLI 설치 안내](https://learn.chatgpt.com/docs/codex/cli)에 따라 설치하고, 터미널에서 `codex`를 실행해 로그인합니다. 실습에는 Python 3, 로그인된 Codex CLI, 인터넷 연결이 필요합니다.

```sh
codex --version
codex
```

로그인을 마치고 Codex를 종료한 다음 실습을 실행합니다. 뷰어를 켜 둔 상태라면 별도 터미널에서 실행하세요.

```sh
python3 course/run.py reviews
```

또는 웹페이지의 **이 프롬프트로 Codex 실제 실행** 버튼을 누릅니다. **새 실행은 계정 사용량을 소모합니다.** 한 번에 하나씩 실행하세요. 끝나면 **실제 실행 코드 / 결과** 탭을 다시 엽니다.

| 실습 | 실행 명령 | 확인할 결과 |
|---|---|---|
| 서비스 조사 | `python3 course/run.py research` | 도움말 3곳의 근거와 조회 실패 구분 |
| 리뷰 분석 | `python3 course/run.py reviews` | 125행 → 고유 120개, 낮은 평점 76개 |
| 주간 보고서 | `python3 course/run.py weekly` | 공통 ID로 업무·회의록 연결, 누락·기한 확인 |
| GitHub PR | `python3 course/run.py github` | 공개 Ruff PR 5개의 상세 정보, CI는 미조회 |

리뷰·업무는 **합성 자료**이고, 서비스·GitHub는 공개 페이지를 실시간 조회합니다. 공개 결과는 시점에 따라 바뀌며 403·429 같은 실패가 발생할 수 있습니다. 실패를 숨기거나 기능이 없다는 뜻으로 해석하지 않습니다.

## 4. 조건 하나 바꾸기

`course/prompts/02_reviews.txt`에서 낮은 평점 기준을 바꾼 뒤 다시 실행해 보세요. 결과가 달라진 이유를 원본 데이터와 대조합니다. [네 가지 응용 과제](course/EXERCISES.md)를 참고하세요.

새 실행은 `assets/<실습>.json`과 `.md`를 갱신합니다. 원래 촬영 기록을 유지하려면 폴더 사본에서 실행하세요. 뷰어 실행 버튼은 이전 기록을 `qa/before-recording-*`에 보관하지만 터미널 실행에는 이 보관 기능이 없습니다. **검증 탭은 촬영 당시 결과를 대조한 기록**이므로 조건을 바꾼 새 결과의 자동 채점표가 아닙니다.

## 5. 실행 코드와 기록은 어디 있나요?

[실행 기록 안내](course/RECORDS.md)에 요청·실제 코드·반환값을 직접 여는 순서를 정리했습니다.

| 폴더 | 내용 |
|---|---|
| `course/prompts` | 수정해서 재실행하는 한국어 요청 |
| `course/data` | 합성 리뷰·업무·회의록 |
| `course/lesson_tools.py` | 이 실습에서만 연결하는 읽기 전용 MCP 도구 |
| `assets` | 촬영 당시 요청·생성된 JavaScript·반환값·답변 |
| `production` | 실행 도우미와 웹 뷰어 |
| `qa` | 촬영 당시 집계 검증과 실행 후 생기는 로그 |

공개 배포본에서는 사전 확인의 개인 로컬 경로를 `/path/to/codemode_lecture`로 치환하고 강의와 무관한 설치 도구 목록은 생략 표시했습니다. 원본 세션 전체나 로그인 정보는 배포하지 않습니다.

## 사용 환경과 확인 범위

촬영 검증 버전은 **codex-cli 0.146.0**입니다. 실습 도우미는 `--enable code_mode --enable code_mode_only`와 실행별 MCP 설정을 사용하며 개인 설정 파일을 수정하지 않습니다. Code Mode의 실행 코드는 **JavaScript**이고, 그 코드가 호출하는 도구는 Python 등 다른 언어로 구현할 수 있습니다. 여기서는 Python MCP 서버를 호출합니다.

기능 플래그·기록 형식·모델별 도구 선택은 버전과 계정 환경에 따라 달라질 수 있습니다. `Unknown feature`가 나오면 CLI 버전과 공식 설정 문서를 확인하세요. `code_mode_calls`가 0이면 일반 작업 성공만으로 Code Mode가 사용됐다고 단정하지 마세요. 이 자료는 모든 GPT·운영체제에서의 지원을 보장하지 않습니다.

웹페이지가 안 열리면 서버 터미널의 오류를 확인하세요. `Address already in use`는 같은 포트의 기존 실습 서버를 종료한 뒤 다시 실행하면 됩니다. `codex` 또는 `python3`를 찾지 못하면 해당 프로그램의 설치와 터미널 경로 설정을 확인하세요.

`Promise.all`로 도구 요청을 묶는 것과 서버가 네트워크 작업을 병렬 처리하는 것은 별개입니다. 이 간단한 MCP 서버는 요청을 순차 처리합니다. 이 강의는 속도·요금 절감률을 측정한 비교 실험이 아닙니다.

[공식 문서와 조사 출처](SOURCES.md) · [배포 검증 범위](qa/distribution-check.json)

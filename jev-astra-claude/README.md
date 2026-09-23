# Astra · Claude Code · Jev 연결 실습

Codex CLI(Astra)와 Claude Code는 코드를 만드는 에이전트이고, Jev는 실행 중 앱 서버가 호출하는 판단 API입니다. 이 실습에서는 문의 분류 앱을 실행하고 요청·응답과 사람 검토 정책을 확인합니다.

## 바로 시작하기

1. [`practice-kit/jev-connection-guide.md`](practice-kit/jev-connection-guide.md)에서 로그인, TypeSafe 스킬 설치, API 키 경계를 확인합니다.
2. [`practice-kit/README.md`](practice-kit/README.md)의 안내에 따라 Node.js 20 이상 환경에서 압축을 풀고 실행합니다.
3. 앱 폴더에서 `npm test`로 오프라인 검사를 한 뒤 `bash start-demo.sh`를 실행합니다. 실제 API를 시험할 때 본인의 키를 터미널 프롬프트에 입력하세요. 키를 코드나 브라우저에 넣지 마세요.
4. [`practice-kit/practice-guide.md`](practice-kit/practice-guide.md)의 합성 문의를 사용해 담당 팀, Choice confidence, 긴급 Noul, 검토 경로를 확인합니다.

[`다운로드용 실습 ZIP`](downloads/jev-astra-claude-practice.zip)에는 코드, 실습 설명, 공식 문서 사본, 실제 실행 프롬프트와 공유용으로 정리한 요청 기록이 들어 있습니다. 저장소에서 바로 찾아보려면 [`압축 해제된 자료`](practice-kit/)를 여세요.

## 제작 기록

- [`history/production-notes.md`](history/production-notes.md): 개정·실행·검수 범위와 공개 상태
- [`history/media-validation.json`](history/media-validation.json), [`history/playback.json`](history/playback.json): 최종 영상 기술 검사와 브라우저 재생 확인
- [`history/package-validation.json`](history/package-validation.json): 배포 ZIP 검사
- [`captions/`](captions/): 최종 편집본의 한국어 SRT와 챕터

개인 API 키, 로그인 기록, 원시 CLI 세션, 음성 프로필은 공유 자료에서 제외했습니다. 최종 MP4는 이 실습 저장소에 포함하지 않았습니다. 검수 기록 기준 YouTube 업로드는 아직 하지 않았고, 사람의 전편 음성 청취 판정도 남아 있지 않습니다.

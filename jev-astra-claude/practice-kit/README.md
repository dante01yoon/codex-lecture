# Jev · Astra · Claude 실습 자료

[Jev 연결 안내](jev-connection-guide.md)와 [실습 안내](practice-guide.md)를 먼저 읽으세요. `app` 폴더에서 `npm test`, `bash start-demo.sh`로 시작합니다. Node.js 20 이상이 필요합니다.

- `inputs/*-prompt.txt`: 실제 최초 구현 및 후속 터미널 작업에 사용한 프롬프트.
- `inputs/*.md`: TypeSafe 공식 문서 사본.
- `evidence/jev-requests.sanitized.jsonl`: 합성 실습 문장의 실제 API 요청/응답을 공유용으로 추린 기록. 이 기록은 재생용 성공 응답이나 새 앱의 실행 기록이 아닙니다.
- `sources.json`, `reference/reference-metadata.json`: 공식 출처와 참고 영상 정보.
- `MANIFEST.sha256.json`: 압축 안의 각 자료 SHA-256와 변환 내역. manifest 자체는 자기 해시 대상에서 제외됩니다.

앱의 `evidence/`와 `call-count.json`은 포함하지 않았습니다. 새 폴더에 풀어 실행하면 누적 호출 수는 0부터 시작합니다. 기존 실행 폴더 위에 덮어풀면 그 폴더의 기존 기록이 남으므로 별도의 새 폴더를 사용하세요. 개인 API 키, 로그인 기록, 원본 CLI 세션, 음성 프로필은 포함하지 않았습니다.

# CLAUDE.md

## 프로젝트
스테이디멘션 용현동 청소 파트타이머(4~5명)의 QR 출퇴근, 객실 청소 체크·사진, 급여 산정 웹앱과 어드민.
슬랙 메시지로 객실을 배정하고, 슬랙 요청으로 기존 구글 시트에 인건비를 기록한다.

**작업 전에 반드시 `docs/기획서.md`를 먼저 읽는다.**

## 작업 원칙
- 기획서의 **[미정]** 항목은 추측으로 채우지 말고 매니저에게 물어본다.
- **[제안]** 항목은 기본값으로 구현하되, 바꾸기 쉽게 만든다.
- 기획이 바뀌면 코드보다 `docs/기획서.md`를 먼저 수정하고 같은 커밋에 포함한다.
- 공제율, 최저시급, GPS 반경, 사진 보관 기간 같은 값은 하드코딩하지 않고 `settings`로 관리한다.
- UI 문구는 한국어, 알바 화면은 모바일 우선. 어드민은 모바일·PC 모두 사용 가능하게.
- 시크릿(Supabase 키, Slack 토큰, Google 서비스 계정 JSON)은 절대 커밋하지 않는다. `.env.local`과 Railway 환경변수 사용.

## 기술 스택
- Next.js (App Router) + TypeScript, PWA
- Supabase (Postgres, Storage)
- Railway 배포
- Slack App (Events API, Interactivity)
- Google Sheets API (서비스 계정)

## 배포 참고 (이전 프로젝트에서 얻은 경험)
- Railway `redeploy`는 최신 커밋을 새로 빌드하지 않고 마지막 빌드를 재시작한다. 새 코드 배포 확인이 목적이면 쓰지 않는다.
- 배포 누락 확인: GitHub 최신 커밋 SHA와 Railway `list-deployments`의 빌드 SHA를 비교한다.
- 매니저는 PC 세션에서 개발하고 모바일 세션에서 커밋·배포 상태를 확인하는 방식으로 일한다.

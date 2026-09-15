# dimension-crew 설정 가이드 (1-1 출퇴근 + 1-2 객실 청소)

## 1. Supabase 프로젝트 생성

1. https://supabase.com 에서 새 프로젝트 생성
2. **SQL Editor**에서 `supabase/schema.sql` 내용을 그대로 실행 (1-1, 출퇴근)
3. **SQL Editor**에서 `supabase/schema_rooms.sql` 내용을 그대로 실행 (1-2, 객실 청소 — 객실 16개실 시드 데이터 포함)
4. **SQL Editor**에서 `supabase/schema_photo_category.sql` 내용을 그대로 실행 (청소 사진 객실/욕실 구분)
5. **SQL Editor**에서 `supabase/schema_drop_gps.sql` 내용을 그대로 실행 (GPS 위치 확인 기능 제거)
6. **SQL Editor**에서 `supabase/schema_qr_token.sql` 내용을 그대로 실행 (QR을 앱 안 카메라 스캔 전용으로 전환하기 위한 토큰 생성)
7. **SQL Editor**에서 `supabase/schema_payroll_row.sql` 내용을 그대로 실행 (급여장부 자동입력 여부 기록용 컬럼)
8. **SQL Editor**에서 `supabase/schema_sheet_exports.sql` 내용을 그대로 실행 (인건비 월별 알림/공지 상태 기록용 테이블)
9. **SQL Editor**에서 `supabase/checklist_items.sql` → `supabase/checklist_items_seed.sql` 순서로 실행 (운영방 일일 체크리스트 봇)
10. **Project Settings > API**에서 `Project URL`과 `service_role` 키를 복사

⚠️ 사진 저장용 Storage 버킷(`task-photos`)은 앱이 첫 사진 업로드 시 자동으로 생성합니다. 별도로 만들 필요 없습니다.

## 2. Google 서비스 계정 (Sheets 연동)

`manage_emp` 프로젝트와 동일한 방식입니다.

1. Google Cloud Console에서 프로젝트 생성 → "Google Sheets API" 활성화
2. 서비스 계정 생성 → JSON 키 발급
3. 대상 구글 시트(`STAY DIMANSION`)를 서비스 계정 이메일에 **편집자**로 공유
4. 새 탭 `QR출퇴근기록` 생성 (헤더는 앱이 자동으로 채움)

## 3. 환경변수 설정

```
cp .env.example .env.local
```

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: 1번에서 복사한 값
- `ADMIN_JWT_SECRET`, `STAFF_JWT_SECRET`: 각각 다른 랜덤 문자열 (`openssl rand -hex 32`)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: 2번에서 받은 값
- `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SHEETS_TAB_NAME`, `GOOGLE_SHEETS_PAYROLL_TAB_NAME`: 기본값 그대로 사용

## 4. 관리자 계정 생성

```
npm run create-admin
```

## 5. 로컬 실행

```
npm run dev
```

- `/admin/login` → 관리자 로그인 → **직원 관리**에서 직원 등록 (이름/전화번호/시급, 초기 PIN은 0808)
- **설정**(`/admin/settings`)에서 공제율(기본 3.3%)을 확인/수정
- `/checkin`에서 전화번호+PIN(0808)으로 최초 로그인 후 출근/퇴근 테스트
- `/calendar`에서 본인 근무 캘린더·예상 입금액 확인
- 구글 시트의 `QR출퇴근기록` 탭에 자동 기록되는지 확인

## 6. 배포 (Railway)

기획서 기준 배포 대상은 Railway입니다.

1. GitHub에 push
2. Railway에서 새 프로젝트 생성 → 이 저장소 연결
3. `.env.local`의 환경변수들을 Railway 프로젝트의 Variables에 동일하게 등록
4. 배포 후 `/admin/qr`에서 QR을 인쇄해 숙소 입구에 부착 (기존에 인쇄해둔 QR이 있다면 내용이 바뀌었으므로 반드시 다시 인쇄해서 교체)

⚠️ Railway `redeploy` 버튼은 최신 커밋을 새로 빌드하지 않고 마지막 빌드를 재시작합니다. 새 코드가 반영됐는지 확인하려면 GitHub 최신 커밋 SHA와 Railway 배포 목록의 빌드 SHA를 비교하세요.

## 7. 인건비 월별 자동 알림 (선택, 5.2.1/5.3) [실전 테스트 완료 2026-09-13]

매월 4일(또는 그 전 영업일)에 매니저 개인 슬랙 DM으로 인건비 요약을 보내고, 버튼으로 완료 공지까지 하는 기능입니다. 안 하셔도 급여장부 수동 입력(어드민 버튼)은 그대로 작동합니다.

1. **슬랙 앱 → Interactivity & Shortcuts** 켜기 → Request URL에 `https://<배포주소>/api/slack/interactions` 입력 → 저장
   - ⚠️ **Socket Mode**가 켜져 있으면 Request URL 입력란이 안 보입니다. Socket Mode를 먼저 꺼야 합니다.
2. **슬랙 앱 → Basic Information → Signing Secret** 복사 → Railway `SLACK_SIGNING_SECRET`에 등록
3. 매니저 본인의 슬랙 사용자 ID 확인 (프로필 → 점 3개 메뉴 → "멤버 ID 복사") → Railway `SLACK_MANAGER_USER_ID`에 등록
4. 인건비 완료 공지를 받을 채널(`#스테이디멘션-운영지원팀`)의 채널 ID 확인 → Railway `SLACK_PAYROLL_CHANNEL_ID`에 등록
5. **공공데이터포털**(data.go.kr) 가입 → "특일 정보" 검색 → 활용신청 → 마이페이지에서 인증키(Encoding 또는 Decoding 아무 형태나 상관없음, 코드가 자동 정규화) 확인 → Railway `DATA_GO_KR_HOLIDAY_API_KEY`에 등록
   - ⚠️ 승인 상태로 떠도 실제 인증 시스템에 반영되기까지 **1~2시간(길면 반나절) 지연**될 수 있습니다. 등록 직후 테스트해서 `SERVICE_KEY_IS_NOT_REGISTERED_ERROR`가 나오면 코드 문제가 아니라 이 지연 때문이니 시간을 두고 다시 시도하세요.
6. 임의의 긴 문자열을 만들어 Railway `CRON_SECRET`에 등록 (예: `openssl rand -hex 16`)
7. **cron-job.org**(무료) 가입 → 새 크론잡 생성 → URL에 `https://<배포주소>/api/cron/payroll-reminder?token=<6번에서 만든 값>` 입력 → 매일 1회(예: 오전 9시) 실행되게 설정
8. **동작 확인**: 브라우저에서 위 URL을 직접 열어봐서 `{"skipped":true,"today":"...","reminderDate":"..."}` 같은 JSON이 뜨면 정상 작동 중인 것입니다(오늘이 알림일이 아니라 건너뛴 것). `{"error":"..."}`가 뜨면 메시지에 원인이 나오니 그에 맞게 환경변수를 다시 확인하세요.

## 8. 운영방 PM 봇 (일일 체크리스트 + 대화형 확정)

`manage_emp` 저장소(PR #1, `claude/slack-session-84d5ql`)의 체크리스트 기능을 가져와, 운영방에서 실제로 답장을 주고받으며 계획을 재정리하는 방식으로 재구성했습니다. 위 7번과 같은 `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `CRON_SECRET`을 공용으로 사용합니다.

**동작 방식**: 매일 아침 크론이 체크리스트 + 최근 대화를 바탕으로 "오늘 할 일" 브리핑을 운영방에 올리고 확정 여부를 묻습니다. 매니저가 그 채널에 답장하면(버튼이 아니라 그냥 메시지로) Slack이 실시간으로 그 메시지를 우리 서버에 보내고, Claude가 "확정"인지 "다른 의견"인지 판단해서 확정이면 짧게 답하고, 다른 의견이면 그걸 반영해 계획을 다시 정리해서 재차 물어봅니다. **확정된 뒤에는** 일반 메시지에는 반응하지 않지만(잡담에 매번 반응하면 시끄러움), **봇을 `@멘션`하면** 그 의견을 반영해 계획을 다시 열어 재정리합니다. 실제 체크리스트 상태(`checklist_items`)는 자동으로 바뀌지 않고, 항목 추가/상태 변경은 여전히 Supabase에서 직접 합니다 — 이 봇은 "오늘 뭘 할지 대화로 정리해서 공유"하는 역할만 합니다.

1. 1번에서 `checklist_items.sql` / `checklist_items_seed.sql` / `checklist_daily_plan.sql`을 이미 실행했는지 확인
2. Slack App(7번에서 만든 것과 동일한 앱 가능) → **OAuth & Permissions**에서 Bot Token Scopes에 `chat:write`, `channels:history`(또는 `groups:history`), **`app_mentions:read`** 추가 → 재설치 후 Bot User OAuth Token이 `SLACK_BOT_TOKEN`과 같은지 확인
3. 봇을 운영방 채널에 초대하고, 채널 ID 확인 → Railway `SLACK_OPERATIONS_CHANNEL_ID`에 등록
4. **슬랙 앱 → Event Subscriptions** 켜기 → Request URL에 `https://<배포주소>/api/slack/events` 입력 (배포 후에만 검증 통과) → **Subscribe to bot events**에 `message.channels`(운영방이 공개 채널) 또는 `message.groups`(비공개 채널), 그리고 **`app_mention`**을 추가 → 저장 후 재설치
   - ⚠️ 7번에서 이미 **Signing Secret**을 등록했다면 그대로 재사용됩니다. 아직이면 **Basic Information → Signing Secret**을 복사해 Railway `SLACK_SIGNING_SECRET`에 등록하세요.
   - ⚠️ Interactivity와 마찬가지로 **Socket Mode**가 켜져 있으면 Request URL 입력란이 안 보입니다.
5. Claude API 키 발급(https://console.anthropic.com) → Railway `ANTHROPIC_API_KEY`에 등록 (없으면 브리핑은 스텁 메시지로 대체되고, 답장에 대한 "재정리"는 동작하지 않습니다 — 확정 키워드 감지만 됨)
6. 드라이런 확인: `npm run simulate` (로컬, 답장 재정리까지 시뮬레이션) 또는 배포 후 `/api/cron/daily-checklist?dryRun=1` (실제 발송/저장 없음)
7. **cron-job.org** 등 외부 스케줄러에 아침 브리핑용으로 등록 (매일 1회, 예: 오전 8시)
   - `https://<배포주소>/api/cron/daily-checklist?token=<CRON_SECRET>`
8. **동작 확인**: 위 크론 URL을 직접 열어 오늘의 브리핑이 운영방에 올라오는지 확인 → 그 채널에 "네 좋아요" 또는 "아니 이거 먼저 해줘" 같은 답장을 남겨서 봇이 반응하는지 확인 → "네 좋아요"로 확정한 뒤, `@봇이름 다시 이거 반영해줘`처럼 멘션해서 확정 후에도 재정리되는지 확인

⚠️ `/admin/checklist` 어드민 페이지는 아직 없습니다(체크리스트 항목은 Supabase에서 직접 관리).

## 참고

- 1-1(로그인/QR 출퇴근/급여 계산·캘린더/어드민 계정·시급·설정·근무 승인)과 1-2(객실 청소 체크·사진, 객실/배정/기록 관리)까지 포함합니다. GPS 위치 확인 기능은 2026-09-12 매니저 요청으로 제거했습니다.
- 인건비 월별 자동 알림, 운영방 일일 체크리스트 봇까지 슬랙 연동을 마쳤습니다. 자세한 기획 내용은 `docs/기획서.md` 참고.
- 시크릿(Supabase 키, Google 서비스 계정 JSON, Slack 토큰, Anthropic 키)은 절대 Git에 커밋하지 마세요.

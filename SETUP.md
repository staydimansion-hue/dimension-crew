# dimension-crew 설정 가이드 (1-1 출퇴근 + 1-2 객실 청소)

## 1. Supabase 프로젝트 생성

1. https://supabase.com 에서 새 프로젝트 생성
2. **SQL Editor**에서 `supabase/schema.sql` 내용을 그대로 실행 (1-1, 출퇴근)
3. **SQL Editor**에서 `supabase/schema_rooms.sql` 내용을 그대로 실행 (1-2, 객실 청소 — 객실 16개실 시드 데이터 포함)
4. **Project Settings > API**에서 `Project URL`과 `service_role` 키를 복사

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
- `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SHEETS_TAB_NAME`: 기본값 그대로 사용

## 4. 관리자 계정 생성

```
npm run create-admin
```

## 5. 로컬 실행

```
npm run dev
```

- `/admin/login` → 관리자 로그인 → **직원 관리**에서 직원 등록 (이름/전화번호/시급, 초기 PIN은 0808)
- **설정**(`/admin/settings`)에서 숙소 GPS 좌표와 허용 반경(기본 150m), 공제율(기본 3.3%)을 확인/수정
  - ⚠️ 좌표를 입력하지 않으면 GPS 확인 없이(항상 "정상") 출퇴근이 기록됩니다. 실제 운영 전에 반드시 숙소에서 "지금 이 위치를 좌표로 사용" 버튼으로 입력하세요.
- `/checkin`에서 전화번호+PIN(0808)으로 최초 로그인 후 출근/퇴근 테스트
- `/calendar`에서 본인 근무 캘린더·예상 입금액 확인
- 구글 시트의 `QR출퇴근기록` 탭에 자동 기록되는지 확인

## 6. 배포 (Railway)

기획서 기준 배포 대상은 Railway입니다.

1. GitHub에 push
2. Railway에서 새 프로젝트 생성 → 이 저장소 연결
3. `.env.local`의 환경변수들을 Railway 프로젝트의 Variables에 동일하게 등록
4. 배포 후 `/admin/qr`에서 QR을 인쇄해 숙소 입구에 부착

⚠️ Railway `redeploy` 버튼은 최신 커밋을 새로 빌드하지 않고 마지막 빌드를 재시작합니다. 새 코드가 반영됐는지 확인하려면 GitHub 최신 커밋 SHA와 Railway 배포 목록의 빌드 SHA를 비교하세요.

## 참고

- 1-1(로그인/QR 출퇴근/GPS 확인/급여 계산·캘린더/어드민 계정·시급·설정·근무 승인)과 1-2(객실 청소 체크·사진, 객실/배정/기록 관리)까지 포함합니다.
- 슬랙 연동은 다음 단계(2, 3)에서 진행합니다. 자세한 내용은 `docs/기획서.md` 참고.
- 시크릿(Supabase 키, Google 서비스 계정 JSON)은 절대 Git에 커밋하지 마세요.

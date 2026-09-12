-- 인건비 지급주기별 알림/공지 상태 기록 (2026-09-12)
-- 매월 4일(또는 그 전 영업일) 인건비 요약 DM 발송 여부, 완료 공지 발송 여부를 기록해
-- 같은 사이클에 중복 발송되는 걸 막는다.
-- Supabase SQL Editor에서 그대로 실행하세요.

create table if not exists sheet_exports (
  id uuid primary key default gen_random_uuid(),
  cycle_key text not null unique, -- 예: '2026-10' = 2026년 10월 5일 지급 사이클
  reminder_sent_at timestamptz,
  announced_at timestamptz,
  created_at timestamptz not null default now()
);

alter table sheet_exports enable row level security;
-- 정책을 별도로 추가하지 않습니다. 모든 접근은 서버(서비스 롤 키)를 통해서만 이루어집니다.

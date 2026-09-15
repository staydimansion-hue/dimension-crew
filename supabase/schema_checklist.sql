-- 일일 마감 체크리스트 (2026-09-15)
-- 매니저에게 매일 아침 운영 to-do를 미결/완료로 나눠 슬랙 DM으로 발송하고,
-- 슬랙 "완료" 버튼이나 어드민 화면에서 체크할 수 있게 하기 위한 테이블.
-- Supabase SQL Editor에서 그대로 실행하세요.

create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  due_date date,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  completed_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists checklist_items_status_due_idx on checklist_items (status, due_date);

alter table checklist_items enable row level security;
-- 정책을 별도로 추가하지 않습니다. 모든 접근은 서버(서비스 롤 키)를 통해서만 이루어집니다.

-- 일일 마감 체크리스트 알림 설정 (온/오프, 같은 날 중복 발송 방지용 마지막 발송일)
alter table settings
  add column if not exists daily_checklist_enabled boolean not null default true;

alter table settings
  add column if not exists daily_checklist_last_sent_date date;

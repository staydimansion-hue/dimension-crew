-- 운영방 PM 봇의 "오늘의 계획" 상태 저장
-- checklist_items.sql 실행 이후에 실행하세요.

create table if not exists checklist_daily_plan (
  id uuid primary key default gen_random_uuid(),
  plan_date date not null unique,
  message_text text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed')),
  revision integer not null default 0,
  slack_message_ts text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table checklist_daily_plan enable row level security;
-- 정책을 별도로 추가하지 않습니다. 모든 접근은 서버(서비스 롤 키)를 통해서만 이루어집니다.

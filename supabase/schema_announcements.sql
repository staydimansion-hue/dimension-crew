-- 전체 근로자 공지사항 게시판 (2026-09-16)
-- Supabase SQL Editor에서 그대로 실행하세요.

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists announcements_created_at_idx on announcements (created_at desc);

alter table announcements enable row level security;
-- 정책을 별도로 추가하지 않습니다. 모든 접근은 서버(서비스 롤 키)를 통해서만 이루어집니다.

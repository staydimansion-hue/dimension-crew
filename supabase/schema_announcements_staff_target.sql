-- 공지사항에 개별 직원 대상 메시지 기능 추가 (2026-10-25)
-- Supabase SQL Editor에서 그대로 실행하세요.

alter table announcements
  add column if not exists staff_id uuid references staff(id) on delete cascade;

create index if not exists announcements_staff_id_idx on announcements (staff_id);

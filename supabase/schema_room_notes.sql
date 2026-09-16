-- 방별 특이사항 메모 추가 (2026-09-16)
-- Supabase SQL Editor에서 그대로 실행하세요.

alter table room_tasks
  add column if not exists notes text;

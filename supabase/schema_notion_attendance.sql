-- 출퇴근 기록을 Notion에도 남기기 위한 컬럼 추가 (2026-10-18)
-- Supabase SQL Editor에서 그대로 실행하세요.

alter table shifts
  add column if not exists notion_page_id text;

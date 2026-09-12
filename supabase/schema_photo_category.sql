-- 1-2단계 추가 마이그레이션: 청소 사진을 객실/욕실로 구분 (2026-09-12)
-- Supabase SQL Editor에서 그대로 실행하세요.

alter table task_photos
  add column if not exists category text not null default 'room' check (category in ('room', 'bathroom'));

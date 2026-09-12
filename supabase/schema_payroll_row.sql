-- 급여장부(매입)인건비 탭) 자동입력 시 어느 행에 썼는지 기록 (2026-09-12)
-- 중복 입력 방지 및 어드민 화면에 입력 여부 표시용.
-- Supabase SQL Editor에서 그대로 실행하세요.

alter table shifts
  add column if not exists payroll_row integer;

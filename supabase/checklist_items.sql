-- 일일 체크리스트 스키마
-- Supabase SQL Editor에서 그대로 실행하세요. (schema.sql 실행 이후)

-- 상태 enum (create type 은 if not exists 를 지원하지 않으므로 존재 여부를 직접 확인)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'checklist_status') then
    create type checklist_status as enum ('not_started', 'in_progress', 'done');
  end if;
end$$;

create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status checklist_status not null default 'not_started',
  due_date date,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists checklist_items_active_sort_idx
  on checklist_items (is_active, sort_order);

alter table checklist_items enable row level security;
-- 정책을 별도로 추가하지 않습니다. 모든 접근은 서버(서비스 롤 키)를 통해서만 이루어집니다.

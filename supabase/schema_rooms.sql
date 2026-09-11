-- dimension-crew 1-2단계(객실 청소) 스키마 추가분
-- Supabase SQL Editor에서 그대로 실행하세요. (1-1단계 schema.sql이 먼저 적용되어 있어야 합니다)

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,
  type_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists room_tasks (
  id uuid primary key default gen_random_uuid(),
  work_date date not null,
  room_id uuid not null references rooms(id) on delete cascade,
  staff_id uuid references staff(id) on delete set null, -- null = 미배정
  source text not null default 'admin' check (source in ('admin', 'self_added', 'slack')),
  status text not null default 'todo' check (status in ('todo', 'done', 'carried_over')),
  completed_at timestamptz,
  carried_to_task_id uuid references room_tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists room_tasks_date_idx on room_tasks (work_date);
create index if not exists room_tasks_staff_date_idx on room_tasks (staff_id, work_date);
create index if not exists room_tasks_room_date_idx on room_tasks (room_id, work_date);

create table if not exists task_photos (
  id uuid primary key default gen_random_uuid(),
  room_task_id uuid not null references room_tasks(id) on delete cascade,
  storage_path text not null,
  keep boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists task_photos_task_idx on task_photos (room_task_id);

alter table rooms enable row level security;
alter table room_tasks enable row level security;
alter table task_photos enable row level security;
-- 정책을 별도로 추가하지 않습니다. 모든 접근은 서버(서비스 롤 키)를 통해서만 이루어집니다.

-- 객실 마스터 시드 (2026-09-11 매니저 확인)
insert into rooms (number, type_name) values
  ('201', '프라이빗룸'),
  ('202', '프라이빗룸'),
  ('203', '프라이빗룸'),
  ('204', '프라이빗룸'),
  ('205', '프라이빗룸'),
  ('301', '스탠다드룸'),
  ('302', '스탠다드룸'),
  ('303', '릴렉스룸(싱글베드)'),
  ('304', '스탠다드룸'),
  ('305', '스탠다드룸'),
  ('306', '스탠다드룸'),
  ('401', '도미토리룸'),
  ('402', '도미토리룸'),
  ('403', '도미토리룸'),
  ('404', '도미토리룸'),
  ('405', '도미토리룸')
on conflict (number) do nothing;

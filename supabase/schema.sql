-- dimension-crew 1-1단계(출퇴근) 스키마
-- Supabase SQL Editor에서 그대로 실행하세요.

create extension if not exists "pgcrypto";

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text unique not null,
  pin_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists wage_rates (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  hourly_wage integer not null,
  effective_from date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists wage_rates_staff_effective_idx
  on wage_rates (staff_id, effective_from desc);

create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  login_id text unique not null,
  password_hash text not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  id integer primary key default 1,
  geo_center_lat double precision,
  geo_center_lng double precision,
  geo_radius_m integer not null default 150,
  deduction_rate numeric(5,4) not null default 0.033,
  min_wage_krw integer,
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);

insert into settings (id) values (1) on conflict (id) do nothing;

create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  work_date date not null,
  clock_in_at timestamptz not null,
  clock_in_lat double precision,
  clock_in_lng double precision,
  clock_in_distance_m numeric(10,1),
  clock_in_out_of_range boolean,
  clock_out_at timestamptz,
  clock_out_lat double precision,
  clock_out_lng double precision,
  clock_out_distance_m numeric(10,1),
  clock_out_out_of_range boolean,
  hours_worked numeric(5,2),
  hourly_wage integer,
  amount integer,
  status text not null default 'working' check (status in ('working', 'done', 'approved')),
  approved_at timestamptz,
  sheet_row integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shifts_staff_date_idx on shifts (staff_id, work_date);

create unique index if not exists shifts_open_shift_idx
  on shifts (staff_id)
  where clock_out_at is null;

alter table staff enable row level security;
alter table wage_rates enable row level security;
alter table admins enable row level security;
alter table settings enable row level security;
alter table shifts enable row level security;
-- 정책을 별도로 추가하지 않습니다. 모든 접근은 서버(서비스 롤 키)를 통해서만 이루어집니다.

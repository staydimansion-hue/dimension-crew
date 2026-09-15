-- 운영방 PM 봇을 여러 슬랙 채널(운영방/마케팅방 등)에서 각각 독립된
-- 체크리스트로 쓸 수 있게 채널 설정 테이블을 추가하고, 기존 checklist_items /
-- checklist_daily_plan에 channel_id를 붙여 채널별로 데이터를 분리합니다.
-- checklist_items.sql / checklist_daily_plan.sql 실행 이후에 실행하세요.

create table if not exists checklist_channels (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,          -- 크론 URL의 ?channel=<key> 값, 예: 'ops', 'marketing'
  label text not null,               -- 브리핑 문구에 쓰일 팀 이름, 예: '운영팀', '마케팅팀'
  slack_channel_id text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 기존에 쓰던 운영방 채널을 'ops'로 등록 (slack_channel_id는 실제 값으로 맞춰서
-- 확인/수정하세요 — 지금까지 테스트에 쓰인 채널 ID를 기본값으로 넣어둡니다)
insert into checklist_channels (key, label, slack_channel_id)
values ('ops', '운영팀', 'C0AST8F5LHM')
on conflict (key) do nothing;

alter table checklist_items
  add column if not exists channel_id uuid references checklist_channels(id);

update checklist_items
set channel_id = (select id from checklist_channels where key = 'ops')
where channel_id is null;

alter table checklist_items
  alter column channel_id set not null;

drop index if exists checklist_items_active_sort_idx;
create index if not exists checklist_items_channel_active_sort_idx
  on checklist_items (channel_id, is_active, sort_order);

alter table checklist_daily_plan
  add column if not exists channel_id uuid references checklist_channels(id);

update checklist_daily_plan
set channel_id = (select id from checklist_channels where key = 'ops')
where channel_id is null;

alter table checklist_daily_plan
  alter column channel_id set not null;

alter table checklist_daily_plan
  drop constraint if exists checklist_daily_plan_plan_date_key;

create unique index if not exists checklist_daily_plan_date_channel_idx
  on checklist_daily_plan (plan_date, channel_id);

alter table checklist_channels enable row level security;
-- 정책을 별도로 추가하지 않습니다. 모든 접근은 서버(서비스 롤 키)를 통해서만 이루어집니다.

-- 마케팅방을 추가하려면 아래처럼 한 행만 더 넣으면 됩니다 (slack_channel_id는
-- 마케팅방의 실제 채널 ID로 교체):
-- insert into checklist_channels (key, label, slack_channel_id)
-- values ('marketing', '마케팅팀', 'C0XXXXXXXXX');

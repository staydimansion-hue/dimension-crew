-- 완료(done) 처리된 시각을 자동으로 기록해서, 브리핑에서 오래된 완료 항목을
-- 걸러낼 수 있게 합니다. checklist_items.sql 실행 이후에 실행하세요.

alter table checklist_items
  add column if not exists completed_at timestamptz;

-- 이미 완료 상태인 기존 행은 지금 시각으로 채워둡니다(정확한 완료 시각을 몰라서
-- 임시값 — 필요하면 Table Editor에서 직접 고치세요).
update checklist_items
set completed_at = now()
where status = 'done' and completed_at is null;

create or replace function checklist_items_set_completed_at()
returns trigger as $$
begin
  if new.status = 'done' and (old is null or old.status is distinct from 'done') then
    new.completed_at = now();
  elsif new.status <> 'done' then
    new.completed_at = null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists checklist_items_completed_at_trigger on checklist_items;
create trigger checklist_items_completed_at_trigger
  before insert or update on checklist_items
  for each row execute function checklist_items_set_completed_at();

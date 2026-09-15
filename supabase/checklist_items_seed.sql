-- 체크리스트 초기 데이터 (한 번만 실행하세요)
-- checklist_items.sql 실행 이후에 실행합니다.
-- 재실행 시 중복 삽입을 막기 위해, 이미 항목이 있으면 아무것도 하지 않습니다.

insert into checklist_items (title, status, due_date, sort_order)
select v.title, v.status::checklist_status, v.due_date::date, v.sort_order
from (values
  -- 완료(done)
  ('재난 문자 끄기', 'done', '2026-09-12', 10),
  ('301·303호 냄새 체크', 'done', '2026-09-12', 20),
  ('근로자 웹앱', 'done', '2026-09-13', 30),
  -- 진행중(in_progress)
  ('도배 완료', 'in_progress', '2026-09-14', 40),
  ('에어컨 금액', 'in_progress', '2026-09-14', 50),
  -- 미진행(not_started)
  ('스탠다드룸 포맥스 발주', 'not_started', '2026-09-16', 60),
  ('청소 매뉴얼 간소화', 'not_started', '2026-09-16', 70),
  ('린넨(층별 선반)·가구 발주', 'not_started', '2026-09-17', 80),
  ('옥상/손잡이', 'not_started', '2026-09-21', 90),
  ('실리콘 줄눈', 'not_started', '2026-09-22', 100)
) as v(title, status, due_date, sort_order)
where not exists (select 1 from checklist_items);

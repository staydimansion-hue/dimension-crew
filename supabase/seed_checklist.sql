-- 일일 마감 체크리스트 초기 데이터 (2026-09-15 매니저 제공)
-- 최초 1회만 실행하세요. (schema_checklist.sql이 먼저 적용되어 있어야 합니다)
-- 완료 항목은 completed_at을 now()로, 그 외에는 null로 둡니다.

insert into checklist_items (title, due_date, status, completed_at, sort_order) values
  ('재난 문자 끄기', '2026-09-12', 'done', now(), 0),
  ('301·303호 냄새 체크', '2026-09-12', 'done', now(), 1),
  ('근로자 웹앱', '2026-09-13', 'done', now(), 2),
  ('도배 완료', '2026-09-14', 'in_progress', null, 3),
  ('에어컨 금액', '2026-09-14', 'in_progress', null, 4),
  ('스탠다드룸 포맥스 발주·마무리', '2026-09-16', 'todo', null, 5),
  ('청소 매뉴얼 간소화', '2026-09-16', 'todo', null, 6),
  ('린넨·가구 층별 발주', '2026-09-17', 'todo', null, 7),
  ('옥상 / 손잡이', '2026-09-21', 'todo', null, 8),
  ('실리콘 줄눈', '2026-09-21', 'todo', null, 9);

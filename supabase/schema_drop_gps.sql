-- GPS 위치 확인 기능 제거 (2026-09-12, 매니저 요청)
-- 알바 인원이 적고 QR을 현장에서만 찍는 구조라 GPS 반경 확인이 불필요하다고 판단.
-- Supabase SQL Editor에서 그대로 실행하세요.

alter table shifts
  drop column if exists clock_in_lat,
  drop column if exists clock_in_lng,
  drop column if exists clock_in_distance_m,
  drop column if exists clock_in_out_of_range,
  drop column if exists clock_out_lat,
  drop column if exists clock_out_lng,
  drop column if exists clock_out_distance_m,
  drop column if exists clock_out_out_of_range;

alter table settings
  drop column if exists geo_center_lat,
  drop column if exists geo_center_lng,
  drop column if exists geo_radius_m;

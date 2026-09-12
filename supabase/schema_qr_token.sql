-- QR 출퇴근을 앱 안 카메라 스캔으로만 가능하게 하기 위한 토큰 (2026-09-12)
-- 기존 QR은 그냥 링크(URL)라 사진만 찍으면 어디서든 열 수 있었다.
-- 이제 QR에는 링크 대신 이 토큰 문자열을 넣고, 앱 안의 카메라 스캐너로 읽었을 때만
-- 출퇴근 처리가 진행되도록 한다. Supabase SQL Editor에서 그대로 실행하세요.

alter table settings
  add column if not exists qr_token text;

update settings
  set qr_token = upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10))
  where qr_token is null;

alter table settings
  alter column qr_token set not null;

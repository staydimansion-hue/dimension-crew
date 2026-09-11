import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import readline from "node:readline/promises";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const loginId = await rl.question("관리자 아이디: ");
const password = await rl.question("관리자 비밀번호: ");
const name = await rl.question("관리자 이름: ");
rl.close();

const passwordHash = await bcrypt.hash(password, 10);

const { error } = await supabase
  .from("admins")
  .insert({ login_id: loginId, password_hash: passwordHash, name });

if (error) {
  console.error("관리자 생성 실패:", error.message);
  process.exit(1);
}

console.log(`관리자 계정(${loginId})이 생성되었습니다.`);

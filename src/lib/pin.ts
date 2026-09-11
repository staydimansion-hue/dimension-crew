import bcrypt from "bcryptjs";

export async function hashPin(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPin(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

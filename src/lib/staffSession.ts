import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "staff_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 400; // 400일 (크롬 쿠키 만료 상한), 실질적으로 폰에 로그인 유지

function getSecret(): Uint8Array {
  const secret = process.env.STAFF_JWT_SECRET;
  if (!secret) {
    throw new Error("STAFF_JWT_SECRET 환경변수가 설정되지 않았습니다.");
  }
  return new TextEncoder().encode(secret);
}

export async function createStaffSessionCookie(staffId: string, name: string) {
  const token = await new SignJWT({ staffId, name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearStaffSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getStaffSession(): Promise<
  { staffId: string; name: string } | null
> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { staffId: payload.staffId as string, name: payload.name as string };
  } catch {
    return null;
  }
}

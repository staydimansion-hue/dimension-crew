import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const ADMIN_COOKIE_NAME = "admin_session";

async function isValidAdminSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPage = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminApi =
    pathname.startsWith("/api/admin") && pathname !== "/api/admin/login";

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const valid = await isValidAdminSession(token);

  if (!valid) {
    if (isAdminApi) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

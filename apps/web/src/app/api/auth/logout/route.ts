import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ACCESS_COOKIE = "engeradios_token";
const REFRESH_COOKIE = "engeradios_refresh_token";

const cookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (refreshToken) {
    await fetch(`${process.env.API_INTERNAL_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set(ACCESS_COOKIE, "", {
    ...cookieOptions,
    maxAge: 0,
    expires: new Date(0),
  });

  response.cookies.set(REFRESH_COOKIE, "", {
    ...cookieOptions,
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}

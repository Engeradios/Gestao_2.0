import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ACCESS_COOKIE = "engeradios_token";
const REFRESH_COOKIE = "engeradios_refresh_token";
const ACCESS_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;

const cookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

function clearAuthentication(response: NextResponse) {
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

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return clearAuthentication(
      NextResponse.json({ message: "Refresh token ausente" }, { status: 401 }),
    );
  }

  const upstream = await fetch(
    `${process.env.API_INTERNAL_URL}/api/v1/auth/refresh`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    },
  );

  const data = await upstream.json().catch(() => ({}));

  if (!upstream.ok || !data.accessToken || !data.refreshToken) {
    return clearAuthentication(
      NextResponse.json(
        { message: data.message ?? "Não foi possível renovar a sessão" },
        { status: upstream.status === 401 ? 401 : 502 },
      ),
    );
  }

  const response = NextResponse.json({
    success: true,
    expiresIn: data.expiresIn,
  });

  response.cookies.set(ACCESS_COOKIE, data.accessToken, {
    ...cookieOptions,
    maxAge: ACCESS_MAX_AGE,
  });

  response.cookies.set(REFRESH_COOKIE, data.refreshToken, {
    ...cookieOptions,
    maxAge: REFRESH_MAX_AGE,
  });

  return response;
}

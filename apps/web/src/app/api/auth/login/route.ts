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

export async function POST(request: Request) {
  const credentials = await request.json();

  const response = await fetch(
    `${process.env.API_INTERNAL_URL}/api/v1/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
      cache: "no-store",
    },
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return NextResponse.json(
      { message: data.message ?? "Credenciais inválidas" },
      { status: response.status },
    );
  }

  if (!data.accessToken || !data.refreshToken) {
    return NextResponse.json(
      { message: "Resposta de autenticação incompleta" },
      { status: 502 },
    );
  }

  const result = NextResponse.json({ usuario: data.usuario });

  result.cookies.set(ACCESS_COOKIE, data.accessToken, {
    ...cookieOptions,
    maxAge: ACCESS_MAX_AGE,
  });

  result.cookies.set(REFRESH_COOKIE, data.refreshToken, {
    ...cookieOptions,
    maxAge: REFRESH_MAX_AGE,
  });

  return result;
}

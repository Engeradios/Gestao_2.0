import { NextResponse } from "next/server";

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

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { message: data.message ?? "Credenciais inválidas" },
      { status: response.status },
    );
  }

  const result = NextResponse.json({ usuario: data.usuario });

  result.cookies.set("engeradios_token", data.accessToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 15 * 60,
  });

  return result;
}

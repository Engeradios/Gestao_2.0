import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("engeradios_token")?.value;

  if (!token) {
    return NextResponse.json(
      { message: "Sessão inválida ou expirada" },
      { status: 401 },
    );
  }

  const body = await request.json();

  const response = await fetch(
    `${process.env.API_INTERNAL_URL}/api/v1/auth/change-password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { message: data.message ?? "Não foi possível alterar a senha" },
      { status: response.status },
    );
  }

  const result = NextResponse.json(data);

  result.cookies.set("engeradios_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(0),
  });

  return result;
}

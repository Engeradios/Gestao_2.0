import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const token = (await cookies()).get("engeradios_token")?.value;

  if (!token) {
    return NextResponse.json(
      { message: "Sessão inválida ou expirada" },
      { status: 401 },
    );
  }

  const response = await fetch(
    `${process.env.API_INTERNAL_URL}/api/v1/auth/access-history`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

  const data = await response.json();

  return NextResponse.json(data, {
    status: response.status,
  });
}

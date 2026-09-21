import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  const response = await fetch(
    `${process.env.API_INTERNAL_URL}/api/v1/auth/reset-password`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  const data = await response.json().catch(() => ({}));

  return NextResponse.json(data, {
    status: response.status,
  });
}

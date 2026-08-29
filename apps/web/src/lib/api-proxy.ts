import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function apiProxy(path: string, init?: RequestInit) {
  const token = (await cookies()).get("engeradios_token")?.value;
  if (!token) {
    return NextResponse.json({ message: "Sessão expirada" }, { status: 401 });
  }

  const response = await fetch(`${process.env.API_INTERNAL_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text || "Resposta inválida da API" };
  }

  return NextResponse.json(data, { status: response.status });
}

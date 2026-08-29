import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type OperationalUser = {
  nome: string;
  email: string;
  trocarSenha?: boolean;
  permissoes?: string[];
};

export async function requireOperationalUser(
  permission: string,
): Promise<OperationalUser> {
  const token = (await cookies()).get("engeradios_token")?.value;
  if (!token) redirect("/login");
  const response = await fetch(
    `${process.env.API_INTERNAL_URL}/api/v1/auth/profile`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (!response.ok) redirect("/login");
  const user = (await response.json()) as OperationalUser;
  if (user.trocarSenha) redirect("/trocar-senha");
  if (!user.permissoes?.includes(permission)) redirect("/dashboard");
  return user;
}

export async function requireAuthenticatedUser(): Promise<OperationalUser> {
  const token = (await cookies()).get("engeradios_token")?.value;

  if (!token) redirect("/login");

  const response = await fetch(
    `${process.env.API_INTERNAL_URL}/api/v1/auth/profile`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) redirect("/login");

  const user = (await response.json()) as OperationalUser;

  if (user.trocarSenha) redirect("/trocar-senha");

  return user;
}

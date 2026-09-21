import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function DefinePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const parameters = await searchParams;

  return (
    <ResetPasswordForm
      token={parameters.token ?? ""}
      title="Defina sua senha"
    />
  );
}

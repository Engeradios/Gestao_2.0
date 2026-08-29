import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
} from "react";
export function Card(p: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...p}
      className={`rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${p.className || ""}`}
    />
  );
}
export function CardHeader(p: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...p}
      className={`border-b px-5 py-4 dark:border-slate-800 ${p.className || ""}`}
    />
  );
}
export function CardBody(p: HTMLAttributes<HTMLDivElement>) {
  return <div {...p} className={`p-5 ${p.className || ""}`} />;
}
export function Button({
  variant = "primary",
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const c =
    variant === "primary"
      ? "bg-red-600 text-white hover:bg-red-700"
      : variant === "danger"
        ? "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/30"
        : "border bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900";
  return (
    <button
      {...p}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${c} ${p.className || ""}`}
    />
  );
}
export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...p}
      className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-950 ${p.className || ""}`}
    />
  );
}
export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  children: React.ReactNode;
}) {
  const c = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
  }[tone];
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${c}`}
    >
      {children}
    </span>
  );
}
export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="p-10 text-center">
      <p className="font-semibold">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      )}
    </div>
  );
}

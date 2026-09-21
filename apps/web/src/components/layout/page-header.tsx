import Link from "next/link";
export function PageHeader({
  title,
  description,
  section,
  actions,
}: {
  title: string;
  description?: string;
  section?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Link href="/dashboard">Início</Link>
          {section && (
            <>
              <span>/</span>
              <span>{section}</span>
            </>
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

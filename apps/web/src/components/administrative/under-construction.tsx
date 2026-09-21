import { Construction } from "lucide-react";

interface UnderConstructionProps {
  category?: string;
  title: string;
  description: string;
}

export function UnderConstruction({
  category = "Módulo Administrativo",
  title,
  description,
}: UnderConstructionProps) {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950 md:p-12">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          <Construction size={38} />
        </span>

        <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-red-600">
          {category}
        </p>

        <h1 className="mt-2 text-3xl font-bold">{title}</h1>

        <p className="mx-auto mt-4 max-w-xl text-slate-500">{description}</p>

        <span className="mt-7 inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Em construção
        </span>
      </div>
    </section>
  );
}

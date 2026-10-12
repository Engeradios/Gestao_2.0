import { NfeConsultaPrevia } from "@/components/financeiro/nfe-consulta-previa";
import { NotasRecebidasWorkbench } from "@/components/financeiro/notas-recebidas-workbench";

export default function NotasRecebidasPage() {
  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
          Módulo Financeiro
        </p>
        <h1 className="mt-1 text-2xl font-bold">
          Notas fiscais recebidas
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Consulta, importação, conferência, manifestação, estoque
          e integração com Contas a Pagar.
        </p>
      </header>

      <NfeConsultaPrevia />

      <NotasRecebidasWorkbench />
    </main>
  );
}

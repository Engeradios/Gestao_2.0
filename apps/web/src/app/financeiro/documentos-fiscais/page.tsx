import { DocumentosFiscaisProfissional } from "@/components/financeiro/documentos-fiscais-profissional";
import { requireOperationalUser } from "@/lib/operational-page-auth";

export default async function DocumentosFiscaisPage() {
  await requireOperationalUser(
    "FINANCEIRO.DOCUMENTOS_FISCAIS.VISUALIZAR",
  );

  return <DocumentosFiscaisProfissional />;
}

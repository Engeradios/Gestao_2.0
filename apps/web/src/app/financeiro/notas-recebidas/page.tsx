import { permanentRedirect } from "next/navigation";

export default function NotasRecebidasLegacyPage() {
  permanentRedirect("/financeiro/documentos-fiscais");
}

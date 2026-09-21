"use client";

import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type Evidencia = {
  id: string;
  tipo: string;
  nomeOriginal: string | null;
  mime: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  criadoEm: string;
};

type Props = {
  orcamentoId: string;
  editavel: boolean;
  onChanged?: () => void;
};

const ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf";
const MAX_SIZE = 15 * 1024 * 1024;

function mensagem(body: unknown) {
  if (body && typeof body === "object" && "message" in body) {
    const value = (body as { message?: string | string[] }).message;

    if (Array.isArray(value)) return value.join(". ");
    if (value) return value;
  }

  return "Não foi possível concluir a operação.";
}

function data(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function OrcamentoEvidencias({
  orcamentoId,
  editavel,
  onChanged,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [tipo, setTipo] = useState("ANEXO");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const carregar = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/orcamentos/${orcamentoId}/evidencias`,
        { cache: "no-store" },
      );

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const body = (await response.json()) as Evidencia[] | unknown;

      if (!response.ok) throw new Error(mensagem(body));
      setEvidencias(body as Evidencia[]);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Falha ao carregar evidências.",
      );
    }
  }, [orcamentoId, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void carregar();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [carregar]);

  function selecionar(event: ChangeEvent<HTMLInputElement>) {
    setErro("");
    setSucesso("");

    const selected = event.target.files?.[0] ?? null;

    if (selected && selected.size > MAX_SIZE) {
      event.target.value = "";
      setArquivo(null);
      setErro("O arquivo excede o limite de 15 MB.");
      return;
    }

    setArquivo(selected);
  }

  function obterLocalizacao() {
    setErro("");

    if (!navigator.geolocation) {
      setErro("Geolocalização não disponível neste navegador.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude));
        setLongitude(String(position.coords.longitude));
      },
      () => setErro("Não foi possível obter a localização."),
      {
        enableHighAccuracy: true,
        timeout: 15000,
      },
    );
  }

  async function enviar(event: FormEvent) {
    event.preventDefault();

    if (!arquivo) {
      setErro("Selecione um arquivo.");
      return;
    }

    setOcupado(true);
    setErro("");
    setSucesso("");

    const form = new FormData();
    form.set("arquivo", arquivo);
    form.set("tipo", tipo);

    if (latitude) form.set("latitude", latitude);
    if (longitude) form.set("longitude", longitude);

    try {
      const response = await fetch(
        `/api/orcamentos/${orcamentoId}/evidencias`,
        {
          method: "POST",
          body: form,
        },
      );

      const body = (await response.json().catch(() => null)) as unknown;

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) throw new Error(mensagem(body));

      setArquivo(null);
      setLatitude("");
      setLongitude("");
      setSucesso("Evidência enviada com sucesso.");

      if (inputRef.current) inputRef.current.value = "";

      await carregar();
      onChanged?.();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha no envio.");
    } finally {
      setOcupado(false);
    }
  }

  async function excluir(evidencia: Evidencia) {
    if (!window.confirm(`Excluir ${evidencia.nomeOriginal ?? "evidência"}?`)) {
      return;
    }

    setOcupado(true);
    setErro("");
    setSucesso("");

    try {
      const response = await fetch(
        `/api/orcamentos/${orcamentoId}/evidencias/${evidencia.id}`,
        { method: "DELETE" },
      );

      const body = (await response.json().catch(() => null)) as unknown;

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) throw new Error(mensagem(body));

      setSucesso("Evidência excluída.");
      await carregar();
      onChanged?.();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha na exclusão.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="mt-5 space-y-4 border-t border-slate-200 pt-5 dark:border-slate-800">
      <div>
        <h3 className="font-semibold">Evidências</h3>
        <p className="text-xs text-slate-500">
          JPEG, PNG, WebP ou PDF, até 15 MB.
        </p>
      </div>

      {erro && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200"
        >
          {erro}
        </div>
      )}

      {sucesso && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
          {sucesso}
        </div>
      )}

      {editavel && (
        <form onSubmit={enviar} className="space-y-3">
          <select
            value={tipo}
            onChange={(event) => setTipo(event.target.value)}
            className="w-full rounded-lg border bg-transparent p-2 text-sm dark:border-slate-700"
          >
            <option value="ANEXO">Anexo</option>
            <option value="FOTO_LOCAL">Foto do local</option>
            <option value="DOCUMENTO">Documento</option>
            <option value="COMPROVANTE">Comprovante</option>
          </select>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            onChange={selecionar}
            className="block w-full text-sm"
          />

          <button
            type="button"
            onClick={obterLocalizacao}
            className="w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-700"
          >
            Usar localização atual
          </button>

          {latitude && longitude && (
            <p className="text-xs text-slate-500">
              Localização registrada: {latitude}, {longitude}
            </p>
          )}

          <button
            type="submit"
            disabled={ocupado || !arquivo}
            className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {ocupado ? "Processando..." : "Enviar evidência"}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {evidencias.map((item) => (
          <article
            key={item.id}
            className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"
          >
            <strong className="block break-words">
              {item.nomeOriginal ?? item.tipo}
            </strong>
            <span className="text-xs text-slate-500">
              {item.tipo} · {data(item.criadoEm)}
            </span>

            <div className="mt-3 flex gap-2">
              <a
                href={`/api/orcamentos/${orcamentoId}/evidencias/${item.id}/download`}
                download
                className="rounded-lg border px-3 py-1.5 text-xs dark:border-slate-700"
              >
                Baixar
              </a>

              {editavel && (
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => void excluir(item)}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 disabled:opacity-50 dark:border-red-900"
                >
                  Excluir
                </button>
              )}
            </div>
          </article>
        ))}

        {evidencias.length === 0 && (
          <p className="text-sm text-slate-500">
            Nenhuma evidência registrada.
          </p>
        )}
      </div>
    </section>
  );
}

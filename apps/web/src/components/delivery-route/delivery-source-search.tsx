"use client";

import { LoaderCircle, PackagePlus, Plus, Search } from "lucide-react";
import { KeyboardEvent, useEffect, useId, useState } from "react";

type SourceType = "OS" | "PEDIDO";
export type DeliverySuggestion = {
  origem: SourceType;
  numero?: string | null;
  clienteNome?: string | null;
  enderecoEntrega?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  status?: string | null;
  local?: string | null;
};

async function searchSuggestions(type: SourceType, query: string) {
  const params = new URLSearchParams({ tipo: type, q: query });
  const response = await fetch(
    `/api/estoque-logistica/roteiro-entrega/sugestoes?${params.toString()}`,
    { cache: "no-store" },
  );
  const body = (await response.json()) as unknown;
  if (!response.ok) {
    throw new Error(
      typeof body === "object" &&
        body !== null &&
        "message" in body &&
        typeof body.message === "string"
        ? body.message
        : "Falha ao buscar sugestões",
    );
  }
  return body as DeliverySuggestion[];
}

function SourceCombobox({
  type,
  label,
  placeholder,
  onSelect,
}: {
  type: SourceType;
  label: string;
  placeholder: string;
  onSelect: (item: DeliverySuggestion) => void;
}) {
  const id = useId().replaceAll(":", "");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<DeliverySuggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      void searchSuggestions(type, query.trim())
        .then((result) => {
          if (controller.signal.aborted) return;
          setItems(result);
          setActive(result.length ? 0 : -1);
          setOpen(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 280);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, type]);

  function choose(item: DeliverySuggestion) {
    onSelect(item);
    setQuery("");
    setItems([]);
    setOpen(false);
  }

  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((current) => Math.min(current + 1, items.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && open && active >= 0) {
      event.preventDefault();
      choose(items[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <label htmlFor={`${id}-input`} className="text-sm font-semibold">
        {label}
      </label>
      <div className="relative mt-1">
        <Search className="absolute left-3 top-3 text-slate-400" size={17} />
        <input
          id={`${id}-input`}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${id}-listbox`}
          aria-activedescendant={
            active >= 0 ? `${id}-option-${active}` : undefined
          }
          autoComplete="off"
          value={query}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);

            if (value.trim().length < 2) {
              setItems([]);
              setOpen(false);
              setActive(-1);
            }
          }}
          onKeyDown={keyDown}
          onFocus={() => items.length && setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-xl border bg-transparent py-2.5 pl-10 pr-10"
        />
        {loading && (
          <LoaderCircle
            className="absolute right-3 top-3 animate-spin text-slate-400"
            size={17}
          />
        )}
      </div>
      {open && (
        <div
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          {items.map((item, index) => (
            <button
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={active === index}
              key={`${item.origem}-${item.numero}-${index}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(item)}
              className={`block w-full border-b p-3 text-left last:border-b-0 dark:border-slate-700 ${active === index ? "bg-red-50 dark:bg-red-950/30" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}
            >
              <span className="block text-sm font-bold">
                {item.origem} {item.numero || "Sem número"}
              </span>
              <span className="block truncate text-sm">
                {item.clienteNome || "Cliente não informado"}
              </span>
              <span className="block truncate text-xs text-slate-500">
                {[item.enderecoEntrega, item.bairro, item.cidade]
                  .filter(Boolean)
                  .join(" - ")}
              </span>
              {(item.status || item.local) && (
                <span className="mt-1 block truncate text-xs text-slate-400">
                  {item.status || item.local}
                </span>
              )}
            </button>
          ))}
          {!loading && !items.length && (
            <p className="p-3 text-sm text-slate-500">
              Nenhuma opção encontrada.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function DeliverySourceSearch({
  onSelect,
  onOther,
}: {
  onSelect: (item: DeliverySuggestion) => void;
  onOther: () => void;
}) {
  return (
    <section className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="flex items-center gap-2 font-bold">
        <PackagePlus size={18} />
        Adicionar parada
      </h3>
      <div className="mt-3 grid gap-4">
        <SourceCombobox
          type="OS"
          label="Ordem de Serviço"
          placeholder="Digite número, chamado ou cliente"
          onSelect={onSelect}
        />
        <SourceCombobox
          type="PEDIDO"
          label="Pedido de Venda"
          placeholder="Digite número ou cliente"
          onSelect={onSelect}
        />
        <button
          type="button"
          onClick={onOther}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm font-semibold text-slate-600 hover:border-red-400 hover:text-red-600 dark:text-slate-300"
        >
          <Plus size={17} /> Outra entrega sem OS ou pedido
        </button>
      </div>
    </section>
  );
}

"use client";

import { Bell, CheckCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Notification = {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  link?: string | null;
  lidaEm?: string | null;
  criadoEm: string;
};

type NotificationResult = {
  naoLidas: number;
  items: Notification[];
};

export function NotificationCenter({
  buttonClassName,
}: {
  buttonClassName: string;
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/usuarios/me/notificacoes?limite=30", {
      cache: "no-store",
    });

    if (!response.ok) return;

    const data = (await response.json()) as NotificationResult;

    setItems(data.items ?? []);
    setUnread(data.naoLidas ?? 0);
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      void load();
    }, 0);

    const interval = window.setInterval(() => {
      void load();
    }, 30000);

    function visibility() {
      if (document.visibilityState === "visible") {
        void load();
      }
    }

    document.addEventListener("visibilitychange", visibility);

    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [load]);

  async function markRead(notification: Notification) {
    if (!notification.lidaEm) {
      await fetch(`/api/usuarios/me/notificacoes/${notification.id}/lida`, {
        method: "PATCH",
      });

      setItems((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                lidaEm: new Date().toISOString(),
              }
            : item,
        ),
      );

      setUnread((current) => Math.max(0, current - 1));
    }

    setOpen(false);

    if (notification.link) {
      router.push(notification.link);
    }
  }

  async function markAllRead() {
    setLoading(true);

    const response = await fetch(
      "/api/usuarios/me/notificacoes/marcar-todas-lidas",
      { method: "PATCH" },
    );

    setLoading(false);

    if (!response.ok) return;

    setUnread(0);
    setItems((current) =>
      current.map((item) => ({
        ...item,
        lidaEm: item.lidaEm ?? new Date().toISOString(),
      })),
    );
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        title="Notificações"
        onClick={() => {
          setOpen((current) => !current);
          void load();
        }}
        className={`${buttonClassName} relative`}
      >
        <Bell size={19} />

        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-[90] w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
          <header className="flex items-center justify-between border-b p-4 dark:border-slate-800">
            <div>
              <h2 className="font-bold">Notificações</h2>
              <p className="text-xs text-slate-500">{unread} não lida(s)</p>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={loading || unread === 0}
                onClick={() => void markAllRead()}
                title="Marcar todas como lidas"
                className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
              >
                <CheckCheck size={18} />
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                title="Fechar"
                className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          <div className="max-h-[65vh] overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                Nenhuma notificação.
              </p>
            ) : (
              items.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void markRead(notification)}
                  className={`block w-full border-b p-4 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 ${
                    notification.lidaEm
                      ? "opacity-65"
                      : "bg-red-50/50 dark:bg-red-950/10"
                  }`}
                >
                  <div className="flex gap-3">
                    {!notification.lidaEm && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-red-600" />
                    )}

                    <span className="min-w-0">
                      <strong className="block text-sm">
                        {notification.titulo}
                      </strong>

                      <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
                        {notification.mensagem}
                      </span>

                      <time className="mt-2 block text-xs text-slate-400">
                        {new Date(notification.criadoEm).toLocaleString(
                          "pt-BR",
                        )}
                      </time>
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

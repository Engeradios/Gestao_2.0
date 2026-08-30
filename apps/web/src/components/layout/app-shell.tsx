"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  Calculator,
  Bell,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  FileText,
  Gauge,
  History,
  Headphones,
  Landmark,
  LogOut,
  Menu,
  MessageSquarePlus,
  MonitorPlay,
  PackageOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  ShoppingCart,
  User,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { WeatherWidget } from "./weather-widget";
import { NotificationCenter } from "../notifications/notification-center";

interface AppShellProps {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
}

interface NavigationItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ size?: number }>;
  children?: Array<{ label: string; href: string }>;
}

const navigation: NavigationItem[] = [
  { label: "Visão Geral", href: "/dashboard", icon: Gauge },
  {
    label: "Dashboard TV",
    href: "/dashboard-tv",
    icon: MonitorPlay,
  },
  {
    label: "Orçamento",
    icon: Calculator,
    children: [
      { label: "Dashboard", href: "/orcamento/dashboard" },
      { label: "Painel", href: "/orcamento/painel" },
    ],
  },
  {
    label: "Propostas",
    icon: FileText,
    children: [
      { label: "Dashboard", href: "/propostas/dashboard" },
      { label: "Painel", href: "/propostas/painel" },
      { label: "Importação", href: "/propostas/importacao" },
    ],
  },
  {
    label: "Ordens de Serviço",
    icon: ClipboardList,
    children: [
      { label: "Dashboard", href: "/ordens-servico/dashboard" },
      { label: "Painel", href: "/ordens-servico/painel" },
      {
        label: "Painel Laboratório",
        href: "/ordens-servico/laboratorio",
      },
      { label: "Importação", href: "/ordens-servico/importacao" },
    ],
  },
  {
    label: "Compras",
    icon: ShoppingCart,
    children: [
      { label: "Dashboard", href: "/compras/dashboard" },
      { label: "Painel", href: "/compras/painel" },
      { label: "Produtos Pendentes", href: "/compras/produtos-pendentes" },
      { label: "Importação", href: "/compras/importacao" },
    ],
  },
  {
    label: "Geolocalização",
    icon: ClipboardList,
    children: [
      { label: "Mapa", href: "/geolocalizacao/mapa" },
      { label: "Relatório", href: "/geolocalizacao/relatorio" },
    ],
  },
  {
    label: "Operacional",
    icon: Wrench,
    children: [
      { label: "Dashboard", href: "/operacional/dashboard" },
      { label: "Serviços", href: "/operacional/servicos" },
      { label: "Clientes", href: "/operacional/clientes" },
      { label: "Roteiro Técnico", href: "/operacional/roteiro-tecnico" },
      { label: "Preventivas", href: "/operacional/preventivas" },
      { label: "Configurações", href: "/operacional/servicos/configuracoes" },
    ],
  },
  {
    label: "Grandes Projetos",
    icon: PackageOpen,
    children: [
      { label: "Dashboard", href: "/grandes-projetos/dashboard" },
      { label: "Projetos", href: "/grandes-projetos/projetos" },
      { label: "Relatórios", href: "/grandes-projetos/relatorios" },
    ],
  },
  { label: "Vistorias", href: "/vistoria", icon: ShieldCheck },
  {
    label: "Portal de Chamados",
    href: "/portal-chamados",
    icon: Headphones,
  },
  {
    label: "Estoque e Logística",
    icon: PackageOpen,
    children: [
      {
        label: "Novas Propostas",
        href: "/estoque-logistica/novas-propostas",
      },
      {
        label: "Roteiro de Entrega",
        href: "/estoque-logistica/roteiro-entrega",
      },
      {
        label: "Importação de Pedidos",
        href: "/estoque-logistica/importacao",
      },
    ],
  },
  {
    label: "Financeiro",
    icon: Landmark,
    children: [
      { label: "Visão Geral", href: "/financeiro" },
      { label: "Contas a Receber", href: "/financeiro/receber" },
      { label: "Contas a Pagar", href: "/financeiro/pagar" },
      { label: "Fluxo Financeiro", href: "/financeiro/fluxo" },
      { label: "DRE", href: "/financeiro/dre" },
      { label: "Plano de Contas", href: "/financeiro/plano-contas" },
      { label: "NF Recebidas", href: "/financeiro/notas-recebidas" },
      { label: "Importações", href: "/financeiro/importacoes" },
    ],
  },
  {
    label: "Administrativo",
    icon: BriefcaseBusiness,
    children: [
      {
        label: "Gestão de Contratos",
        href: "/administrativo/contratos",
      },
      {
        label: "Clientes",
        href: "/administrativo/clientes",
      },
    ],
  },
  {
    label: "Ferramentas",
    icon: Settings,
    children: [
      {
        label: "Cadastros",
        href: "/ferramentas/cadastros",
      },
      { label: "Pessoas", href: "/ferramentas/cadastros/pessoas" },
      { label: "Técnicos", href: "/ferramentas/cadastros/tecnicos" },
      { label: "Motoristas", href: "/ferramentas/cadastros/motoristas" },
      { label: "Veículos", href: "/ferramentas/cadastros/veiculos" },
      { label: "Usuários", href: "/ferramentas/usuarios" },
      { label: "Perfis e Permissões", href: "/ferramentas/perfis" },
      { label: "Tipos de proposta", href: "/ferramentas/tipos-proposta" },
      { label: "Auditoria", href: "/ferramentas/auditoria" },
      {
        label: "SLA Ordens de Serviço",
        href: "/ferramentas/sla-os",
      },
      {
        label: "Configuração de e-mail",
        href: "/ferramentas/configuracao-email",
      },
      {
        label: "Notificações",
        href: "/ferramentas/notificacoes",
      },
      { label: "Importações", href: "/ferramentas/importacoes" },
      { label: "Integrações", href: "/ferramentas/integracoes" },
      { label: "Parâmetros", href: "/ferramentas/parametros" },
    ],
  },
];

const iconButton =
  "grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800";

const accountLink =
  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900";

export function AppShell({ children, userName, userEmail }: AppShellProps) {
  const router = useRouter();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(
        "engeradios-sidebar",
        next ? "collapsed" : "expanded",
      );
      return next;
    });
  }

  function toggleGroup(label: string) {
    if (collapsed) {
      setCollapsed(false);
      window.localStorage.setItem("engeradios-sidebar", "expanded");
    }

    setExpanded((current) => (current.includes(label) ? [] : [label]));
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  function renderSidebar(mobile = false) {
    const compact = mobile ? false : collapsed;

    return (
      <aside
        className={`flex h-full flex-col border-r border-slate-200 bg-white transition-[width] duration-200 dark:border-slate-800 dark:bg-slate-950 ${
          compact ? "w-20" : "w-72"
        }`}
      >
        <div
          className={`flex h-20 items-center border-b border-slate-200 px-4 dark:border-slate-800 ${
            compact ? "justify-center" : "justify-between"
          }`}
        >
          {!compact && (
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Navegação
            </span>
          )}

          {!mobile && (
            <button
              type="button"
              onClick={toggleSidebar}
              className={iconButton}
              aria-label={
                compact ? "Expandir menu lateral" : "Recolher menu lateral"
              }
              title={compact ? "Expandir menu" : "Recolher menu"}
            >
              {compact ? (
                <PanelLeftOpen size={20} />
              ) : (
                <PanelLeftClose size={20} />
              )}
            </button>
          )}

          {mobile && (
            <button
              type="button"
              onClick={() => setMobileMenu(false)}
              className={iconButton}
              aria-label="Fechar menu"
            >
              <X size={21} />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isExpanded = expanded.includes(item.label);

              if (item.children) {
                return (
                  <div key={item.label}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(item.label)}
                      title={compact ? item.label : undefined}
                      className={`flex w-full items-center rounded-xl py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900 ${
                        compact ? "justify-center px-2" : "gap-3 px-3"
                      }`}
                    >
                      <Icon size={19} />
                      {!compact && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          <ChevronDown
                            size={16}
                            className={isExpanded ? "rotate-180" : ""}
                          />
                        </>
                      )}
                    </button>

                    {!compact && isExpanded && (
                      <div className="mb-2 ml-7 mt-1 space-y-1 border-l border-slate-200 pl-3 dark:border-slate-800">
                        {item.children.map((child) => (
                          <Link
                            prefetch={false}
                            key={child.href}
                            href={child.href}
                            onClick={() => setMobileMenu(false)}
                            className="block rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-red-50 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  prefetch={false}
                  key={item.label}
                  href={item.href ?? "/dashboard"}
                  onClick={() => setMobileMenu(false)}
                  title={compact ? item.label : undefined}
                  className={`flex items-center rounded-xl py-2.5 text-sm font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 dark:text-slate-300 dark:hover:bg-red-950/40 dark:hover:text-red-300 ${
                    compact ? "justify-center px-2" : "gap-3 px-3"
                  }`}
                >
                  <Icon size={19} />
                  {!compact && item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {!compact && (
          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-900">
              <p className="text-xs font-semibold">Gestão Engerádios 2.0</p>
              <p className="mt-1 text-xs text-slate-500">
                Ambiente de homologação
              </p>
            </div>
          </div>
        )}
      </aside>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        {renderSidebar()}
      </div>

      {mobileMenu && (
        <>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMobileMenu(false)}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            {renderSidebar(true)}
          </div>
        </>
      )}

      <div
        className={`transition-[padding] duration-200 ${
          collapsed ? "lg:pl-20" : "lg:pl-72"
        }`}
      >
        <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6 dark:border-slate-800 dark:bg-slate-950/95">
          <button
            type="button"
            onClick={() => setMobileMenu(true)}
            className={`${iconButton} lg:hidden`}
            aria-label="Abrir menu"
          >
            <Menu size={21} />
          </button>

          <Link
            prefetch={false}
            href="/dashboard"
            className="relative hidden h-12 w-40 shrink-0 sm:block"
            aria-label="Página inicial da Engerádios"
          >
            <Image
              src="/brand/logo_claro.png"
              alt="Engerádios"
              fill
              sizes="160px"
              className="object-contain dark:hidden"
              priority
            />
            <Image
              src="/brand/logo_escuro.png"
              alt="Engerádios"
              fill
              sizes="160px"
              className="hidden object-contain dark:block"
              priority
            />
          </Link>

          <div className="hidden h-8 w-px bg-slate-200 sm:block dark:bg-slate-800" />

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs uppercase tracking-widest text-red-600">
              Gestão Engerádios 2.0
            </p>
            <h1 className="truncate font-semibold">Painel Corporativo</h1>
          </div>

          <WeatherWidget />

          <Link
            prefetch={false}
            href="/ajuda"
            title="Ajuda"
            className={iconButton}
          >
            <CircleHelp size={19} />
          </Link>
          <Link
            prefetch={false}
            href="/solicitacoes"
            title="Solicitações"
            className={iconButton}
          >
            <MessageSquarePlus size={19} />
          </Link>
          <NotificationCenter buttonClassName={iconButton} />
          <ThemeToggle />

          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenu((current) => !current)}
              className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-2 pr-3 dark:border-slate-700 dark:bg-slate-900"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-red-600 font-bold text-white">
                {userName.charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-40 text-left md:block">
                <span className="block truncate text-sm font-semibold">
                  {userName}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {userEmail}
                </span>
              </span>
              <ChevronDown size={16} />
            </button>

            {userMenu && (
              <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
                <div className="border-b border-slate-200 p-4 dark:border-slate-800">
                  <p className="font-semibold">{userName}</p>
                  <p className="truncate text-xs text-slate-500">{userEmail}</p>
                </div>
                <div className="p-2">
                  <Link
                    prefetch={false}
                    href="/minha-conta"
                    className={accountLink}
                  >
                    <User size={17} /> Minha conta
                  </Link>
                  <Link
                    prefetch={false}
                    href="/minha-conta/notificacoes"
                    className={accountLink}
                  >
                    <Bell size={17} /> Notificações
                  </Link>
                  <Link
                    prefetch={false}
                    href="/minha-conta/seguranca"
                    className={accountLink}
                  >
                    <ShieldCheck size={17} /> Senha e segurança
                  </Link>
                  <Link
                    prefetch={false}
                    href="/minha-conta/acessos"
                    className={accountLink}
                  >
                    <History size={17} /> Histórico de acessos
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <LogOut size={17} /> Encerrar sessão
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="p-4 md:p-6 xl:p-8">{children}</main>
      </div>
    </div>
  );
}

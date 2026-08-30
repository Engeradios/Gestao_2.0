export const MOBILE_PERMISSIONS = {
  osView: 'OPERACIONAL.OS.VISUALIZAR',
  deliveryRouteView: 'ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.VISUALIZAR',
} as const;

export type MobileModule = {
  key: string;
  title: string;
  subtitle: string;
  href: string;
  symbol: string;
  permission: string | null;
  operational: boolean;
  enabled: boolean;
};

// Somente permissoes confirmadas nos controllers do backend entram no catalogo.
export const MOBILE_MODULES: readonly MobileModule[] = [
  { key:'os', title:'Ordens de serviço', subtitle:'Atendimentos e evidências', href:'/os', symbol:'OS', permission:MOBILE_PERMISSIONS.osView, operational:true, enabled:true },
  { key:'delivery-route', title:'Roteiro de entrega', subtitle:'Planejamento e acompanhamento', href:'/roteiro-entrega', symbol:'RE', permission:MOBILE_PERMISSIONS.deliveryRouteView, operational:true, enabled:true },
  { key:'profile', title:'Meu perfil', subtitle:'Conta e preferências', href:'/meu-perfil', symbol:'PF', permission:null, operational:false, enabled:true },
  { key:'about', title:'Sobre', subtitle:'Versão e conectividade', href:'/sobre', symbol:'i', permission:null, operational:false, enabled:true },
] as const;

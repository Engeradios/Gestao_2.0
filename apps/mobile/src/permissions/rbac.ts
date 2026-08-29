import { Role } from './roles';
import { Permission } from './permissions';

export const RBAC = {
  [Role.ADMINISTRADOR]: Object.values(Permission),

  [Role.SUPERVISOR]: [
    Permission.DASHBOARD_VIEW,
    Permission.OS_VIEW,
    Permission.OS_EDIT,
    Permission.COMPRA_VIEW,
  ],

  [Role.COMERCIAL]: [
    Permission.DASHBOARD_VIEW,
    Permission.CLIENTE_VIEW,
    Permission.CLIENTE_EDIT,
    Permission.CRM_VIEW,
    Permission.CRM_EDIT,
    Permission.CONTRATO_VIEW,
  ],

  [Role.TECNICO]: [
    Permission.OS_VIEW,
    Permission.OS_EDIT,
    Permission.CONTRATO_VIEW,
  ],

  [Role.MOTORISTA]: [
    Permission.OS_VIEW,
  ],

  [Role.AUXILIAR]: [
    Permission.CLIENTE_VIEW,
    Permission.OS_VIEW,
  ],
};
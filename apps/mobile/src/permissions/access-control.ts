import type { AuthUser } from '../services/auth.service';
import type { MobileModule } from './mobile-modules';

function values(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
export function normalizedPermissions(user: AuthUser | null | undefined): Set<string> {
  return new Set([...values(user?.permissions), ...values(user?.permissoes)].map(v => v.trim().toUpperCase()).filter(Boolean));
}
export function hasPermission(user: AuthUser | null | undefined, permission: string): boolean {
  return normalizedPermissions(user).has(permission.trim().toUpperCase());
}
export function canAccessModule(user: AuthUser | null | undefined, module: MobileModule): boolean {
  if (!module.enabled) return false;
  return module.permission === null || hasPermission(user, module.permission);
}
export function visibleModules(user: AuthUser | null | undefined, modules: readonly MobileModule[]): MobileModule[] {
  return modules.filter(module => canAccessModule(user, module));
}

import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

export interface Permissions {
  role: Role;
  canAdd: boolean;
  canRecord: boolean;
  canEdit: boolean;
  canModify: boolean;
  canDelete: boolean;
  canSell: boolean;
  canViewStats: boolean;
  canExport: boolean;
  canManageUsers: boolean;
  canResetData: boolean;
  canSettings: boolean;
  canAccessFinance: boolean;
  isAdmin: boolean;
  isGerant: boolean;
  isEmploye: boolean;
}

const PERMS: Record<Role, Omit<Permissions, 'role' | 'isAdmin' | 'isGerant' | 'isEmploye'>> = {
  admin: {
    canAdd: true, canRecord: true, canEdit: true, canModify: true, canDelete: true,
    canSell: true, canViewStats: true, canExport: true,
    canManageUsers: true, canResetData: true, canSettings: true, canAccessFinance: true,
  },
  gerant: {
    canAdd: true, canRecord: true, canEdit: true, canModify: true, canDelete: true,
    canSell: true, canViewStats: true, canExport: true,
    canManageUsers: false, canResetData: false, canSettings: false, canAccessFinance: true,
  },
  employe: {
    canAdd: true, canRecord: true, canEdit: true, canModify: true, canDelete: false,
    canSell: false, canViewStats: false, canExport: false,
    canManageUsers: false, canResetData: false, canSettings: false, canAccessFinance: false,
  },
};

export function usePermissions(): Permissions {
  const { currentUser } = useAuth();
  const role: Role = currentUser?.role ?? 'employe';
  const p = PERMS[role];
  return {
    role,
    ...p,
    isAdmin:   role === 'admin',
    isGerant:  role === 'gerant',
    isEmploye: role === 'employe',
  };
}

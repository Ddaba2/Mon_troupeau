import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

export interface Permissions {
  role: Role;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canSell: boolean;
  canViewStats: boolean;
  canExport: boolean;
  canManageUsers: boolean;
  canResetData: boolean;
  canSettings: boolean;
  isAdmin: boolean;
  isGerant: boolean;
  isEmploye: boolean;
}

const PERMS: Record<Role, Omit<Permissions, 'role' | 'isAdmin' | 'isGerant' | 'isEmploye'>> = {
  admin: {
    canAdd: true, canEdit: true, canDelete: true,
    canSell: true, canViewStats: true, canExport: true,
    canManageUsers: true, canResetData: true, canSettings: true,
  },
  gerant: {
    canAdd: true, canEdit: true, canDelete: true,
    canSell: true, canViewStats: true, canExport: true,
    canManageUsers: false, canResetData: false, canSettings: false,
  },
  employe: {
    canAdd: true, canEdit: true, canDelete: false,
    canSell: false, canViewStats: false, canExport: false,
    canManageUsers: false, canResetData: false, canSettings: false,
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

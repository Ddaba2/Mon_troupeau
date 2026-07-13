import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AppUser } from '../types';
import { countUsers, getSetting } from '../services/userService';

export type FarmMode = 'solo' | 'multi' | null;

interface AuthContextType {
  isSetupDone: boolean;
  farmMode: FarmMode;
  currentUser: AppUser | null;
  isAuthenticated: boolean;
  farmName: string;
  initAuth: () => Promise<void>;
  completeSetup: (mode: FarmMode, name: string) => void;
  login: (user: AppUser) => void;
  logout: () => void;
  setFarmName: (name: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  isSetupDone: false,
  farmMode: null,
  currentUser: null,
  isAuthenticated: false,
  farmName: 'Mon Troupeau',
  initAuth: async () => {},
  completeSetup: () => {},
  login: () => {},
  logout: () => {},
  setFarmName: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isSetupDone, setIsSetupDone] = useState(false);
  const [farmMode, setFarmMode]       = useState<FarmMode>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [farmName, setFarmNameState]  = useState('Mon Troupeau');
  const [loading, setLoading]         = useState(true);

  const initAuth = useCallback(async () => {
    try {
      const [mode, name, userCount] = await Promise.all([
        getSetting('farm_mode'),
        getSetting('farm_name'),
        countUsers(),
      ]);

      if (name) setFarmNameState(name);

      if (!mode) {
        // Pas encore configuré
        setIsSetupDone(false);
        setFarmMode(null);
      } else if (mode === 'solo') {
        setFarmMode('solo');
        setIsSetupDone(true);
        // En mode solo, on crée un utilisateur fictif admin
        setCurrentUser({
          id: 0,
          name: 'Admin',
          role: 'admin',
          pin_hash: '',
          is_active: 1,
          failed_attempts: 0,
        });
      } else {
        // Mode multi
        setFarmMode('multi');
        setIsSetupDone(userCount > 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { initAuth(); }, [initAuth]);

  const completeSetup = useCallback((mode: FarmMode, name: string) => {
    setFarmMode(mode);
    setFarmNameState(name);
    setIsSetupDone(true);
    if (mode === 'solo') {
      setCurrentUser({
        id: 0, name: 'Admin', role: 'admin',
        pin_hash: '', is_active: 1, failed_attempts: 0,
      });
    }
  }, []);

  const login = useCallback((user: AppUser) => {
    setCurrentUser(user);
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const setFarmName = useCallback((name: string) => {
    setFarmNameState(name);
  }, []);

  const isAuthenticated = farmMode === 'solo' || currentUser !== null;

  if (loading) return null;

  return (
    <AuthContext.Provider value={{
      isSetupDone, farmMode, currentUser, isAuthenticated,
      farmName, initAuth, completeSetup, login, logout, setFarmName,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

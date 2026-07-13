import React, { useState, useEffect } from 'react';
import { ChevronLeft, LogIn } from 'lucide-react';
import { AppUser } from '../../types';
import { getActiveUsers, authenticateUser } from '../../services/userService';
import { logActivity } from '../../services/activityService';
import { useAuth } from '../../context/AuthContext';
import { PinPad } from './PinPad';

const ROLE_LABELS: Record<string, string> = {
  admin:   '👑 Admin',
  gerant:  '🏭 Gérant',
  employe: '👷 Employé',
};

const ROLE_COLORS: Record<string, string> = {
  admin:   'bg-yellow-100 text-yellow-700',
  gerant:  'bg-blue-100 text-blue-700',
  employe: 'bg-gray-100 text-gray-600',
};

export function LoginScreen() {
  const { login, farmName } = useAuth();
  const [users, setUsers]       = useState<AppUser[]>([]);
  const [selected, setSelected] = useState<AppUser | null>(null);
  const [pinError, setPinError] = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    getActiveUsers().then(setUsers);
  }, []);

  const handleSelectUser = (u: AppUser) => {
    setSelected(u);
    setPinError('');
  };

  const handlePIN = async (pin: string) => {
    if (!selected?.id) return;
    setLoading(true);
    const result = await authenticateUser(selected.id, pin);
    setLoading(false);

    if (result.success && result.user) {
      await logActivity(result.user.id, result.user.name, 'Connexion');
      login(result.user);
    } else {
      setPinError(result.error ?? 'PIN incorrect');
    }
  };

  return (
    <div className="min-h-screen bg-primary-600 flex flex-col items-center justify-center p-6">
      <img src="/logo.png" alt="Mon Troupeau" className="w-24 h-24 object-contain drop-shadow-xl mb-1" />
      <h1 className="text-2xl font-bold text-white mb-0.5">{farmName}</h1>
      <p className="text-primary-200 text-sm mb-8">Identifiez-vous pour continuer</p>

      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl">

          {!selected ? (
            <>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
                Qui êtes-vous ?
              </h2>

              {users.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Aucun utilisateur configuré</p>
              ) : (
                <div className="space-y-2">
                  {users.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl border-2 border-gray-100 dark:border-gray-700 hover:border-primary-300 active:scale-98 transition-all text-left"
                    >
                      {/* Avatar initiales */}
                      <div className="w-11 h-11 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center shrink-0">
                        <span className="text-lg font-bold text-primary-700 dark:text-primary-300">
                          {u.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{u.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role]}`}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      </div>
                      <LogIn size={16} className="text-gray-300 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => { setSelected(null); setPinError(''); }}
                className="flex items-center gap-1 text-gray-400 text-sm mb-4"
              >
                <ChevronLeft size={16} /> Retour
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary-700 dark:text-primary-300">
                    {selected.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-gray-800 dark:text-gray-100">{selected.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[selected.role]}`}>
                    {ROLE_LABELS[selected.role]}
                  </span>
                </div>
              </div>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
                Entrez votre PIN à 4 chiffres
              </p>

              <PinPad onComplete={handlePIN} error={pinError} loading={loading} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

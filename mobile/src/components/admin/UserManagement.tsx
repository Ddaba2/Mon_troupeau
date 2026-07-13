import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, UserX, UserCheck, Users, Unlock } from 'lucide-react';
import { AppUser } from '../../types';
import { getUsers, deleteUser, toggleUserActive, unlockUser } from '../../services/userService';
import { logActivity } from '../../services/activityService';
import { useAuth } from '../../context/AuthContext';
import { UserForm } from './UserForm';

const ROLE_LABELS: Record<string, string> = {
  admin:   '👑 Admin',
  gerant:  '🏭 Gérant',
  employe: '👷 Employé',
};
const ROLE_COLORS: Record<string, string> = {
  admin:   'bg-yellow-100 text-yellow-700',
  gerant:  'bg-blue-100 text-blue-700',
  employe: 'bg-gray-100 text-gray-500',
};

export function UserManagement() {
  const { currentUser } = useAuth();
  const [users, setUsers]     = useState<AppUser[]>([]);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setUsers(await getUsers());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (u: AppUser) => {
    if (u.id === currentUser?.id) {
      alert('Vous ne pouvez pas supprimer votre propre compte.');
      return;
    }
    if (!confirm(`Supprimer l'utilisateur "${u.name}" ?`)) return;
    await deleteUser(u.id!);
    await logActivity(currentUser?.id, currentUser?.name ?? '', `Utilisateur supprimé : ${u.name}`, 'user', u.id);
    load();
  };

  const handleToggle = async (u: AppUser) => {
    if (u.id === currentUser?.id) {
      alert('Vous ne pouvez pas désactiver votre propre compte.');
      return;
    }
    await toggleUserActive(u.id!, !u.is_active);
    await logActivity(
      currentUser?.id, currentUser?.name ?? '',
      `Compte ${u.is_active ? 'désactivé' : 'réactivé'} : ${u.name}`,
      'user', u.id
    );
    load();
  };

  const handleUnlock = async (u: AppUser) => {
    await unlockUser(u.id!);
    await logActivity(currentUser?.id, currentUser?.name ?? '', `Compte déverrouillé : ${u.name}`, 'user', u.id);
    load();
  };

  const handleSaved = () => { setShowForm(false); setEditing(null); load(); };

  if (showForm || editing) {
    return <UserForm user={editing ?? undefined} onSave={handleSaved} onCancel={() => { setShowForm(false); setEditing(null); }} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-primary-600" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">Utilisateurs</h3>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-primary-600 text-white px-3 py-2 rounded-xl text-sm font-medium active:scale-95 transition-transform"
        >
          <Plus size={16} /> Ajouter
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Chargement…</div>
      ) : users.length === 0 ? (
        <div className="text-center py-8 text-gray-400">Aucun utilisateur</div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div
              key={u.id}
              className={`card ${!u.is_active ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                  <span className="font-bold text-primary-700 dark:text-primary-300">
                    {u.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">
                      {u.name}
                      {u.id === currentUser?.id && (
                        <span className="ml-1 text-xs text-primary-500">(vous)</span>
                      )}
                    </span>
                    <span className={`badge ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                    {!u.is_active && <span className="badge bg-gray-100 text-gray-400">Inactif</span>}
                  </div>
                  {u.last_login && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Dernière connexion : {new Date(u.last_login).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                  {u.locked_until && new Date(u.locked_until).getTime() > Date.now() && (
                    <p className="text-xs text-red-500 mt-0.5 font-medium">
                      Bloqué jusqu'à {new Date(u.locked_until).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>

                <div className="flex gap-1.5 shrink-0">
                  {u.locked_until && new Date(u.locked_until).getTime() > Date.now() && (
                    <button
                      onClick={() => handleUnlock(u)}
                      className="btn-icon text-amber-600 bg-amber-50 dark:bg-amber-900/20"
                      title="Déverrouiller le compte"
                    >
                      <Unlock size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleToggle(u)}
                    className={`btn-icon ${u.is_active ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'text-green-500 bg-green-50 dark:bg-green-900/20'}`}
                    title={u.is_active ? 'Désactiver' : 'Réactiver'}
                  >
                    {u.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                  </button>
                  <button
                    onClick={() => setEditing(u)}
                    className="btn-icon text-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(u)}
                    className="btn-icon text-red-500 bg-red-50 dark:bg-red-900/20"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

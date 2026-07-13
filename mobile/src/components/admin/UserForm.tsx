import React, { useState } from 'react';
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react';
import { AppUser, Role } from '../../types';
import { createUser, updateUser, getUserById } from '../../services/userService';
import { logActivity } from '../../services/activityService';
import { useAuth } from '../../context/AuthContext';

interface Props {
  user?: AppUser;
  onSave: () => void;
  onCancel: () => void;
}

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: 'admin',   label: '👑 Administrateur', desc: 'Accès complet — gère la ferme et les utilisateurs' },
  { value: 'gerant',  label: '🏭 Gérant',         desc: 'Ventes, statistiques, suppression — pas la gestion des users' },
  { value: 'employe', label: '👷 Employé',         desc: 'Saisie uniquement — pas de ventes ni de suppression' },
];

export function UserForm({ user, onSave, onCancel }: Props) {
  const { currentUser, login } = useAuth();
  const isEdit = !!user;

  const [name, setName]             = useState(user?.name ?? '');
  const [role, setRole]             = useState<Role>(user?.role ?? 'employe');
  const [pin, setPin]               = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const validate = (): string | null => {
    if (!name.trim()) return 'Le nom est obligatoire';
    if (!isEdit && pin.length !== 4) return 'Le PIN doit contenir 4 chiffres';
    if (!isEdit && !/^\d{4}$/.test(pin)) return 'Le PIN doit contenir uniquement des chiffres';
    if (!isEdit && pin !== confirmPin) return 'Les PINs ne correspondent pas';
    if (isEdit && pin && pin.length !== 4) return 'Le PIN doit contenir 4 chiffres';
    if (isEdit && pin && !/^\d{4}$/.test(pin)) return 'Le PIN doit contenir uniquement des chiffres';
    if (isEdit && pin && pin !== confirmPin) return 'Les PINs ne correspondent pas';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError('');
    try {
      if (isEdit && user?.id) {
        await updateUser(user.id, name.trim(), role, pin || undefined);
        await logActivity(currentUser?.id, currentUser?.name ?? '', `Utilisateur modifié : ${name}`, 'user', user.id);
        // Rafraîchir le currentUser si on vient de modifier son propre compte
        if (user.id === currentUser?.id) {
          const refreshed = await getUserById(user.id);
          if (refreshed) login(refreshed);
        }
      } else {
        const newUser = await createUser(name.trim(), role, pin);
        await logActivity(currentUser?.id, currentUser?.name ?? '', `Utilisateur créé : ${name} (${role})`, 'user', newUser.id);
      }
      onSave();
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="p-2 -ml-2 text-gray-500 dark:text-gray-300">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
          {isEdit ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
        </h2>
      </div>

      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Nom complet *</span>
          <input
            className="input mt-1"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Prénom Nom"
          />
        </label>

        <div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Rôle *</span>
          <div className="space-y-2">
            {ROLES.map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`w-full p-3 rounded-xl border-2 text-left transition-colors ${
                  role === r.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <p className="font-medium text-gray-800 dark:text-gray-100 text-sm">{r.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            PIN {isEdit ? '(laisser vide pour ne pas changer)' : '*'}
          </p>
          <label className="block relative">
            <span className="text-xs text-gray-500">PIN (4 chiffres)</span>
            <div className="relative mt-1">
              <input
                className="input pr-12"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
              />
              <button
                type="button"
                onClick={() => setShowPin(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Confirmer le PIN</span>
            <input
              className="input mt-1"
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
            />
          </label>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary mt-2">
          <Save size={20} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}

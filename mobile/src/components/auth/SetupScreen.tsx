import React, { useState } from 'react';
import { Users, User, ArrowRight, Check } from 'lucide-react';
import { PinPad } from './PinPad';
import { createUser } from '../../services/userService';
import { setSetting } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../services/activityService';

type Step = 'welcome' | 'farm_name' | 'mode' | 'admin_name' | 'admin_pin' | 'admin_confirm';

export function SetupScreen() {
  const { completeSetup } = useAuth();
  const [step, setStep]         = useState<Step>('welcome');
  const [farmName, setFarmName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [firstPin, setFirstPin]   = useState('');
  const [pinError, setPinError]   = useState('');
  const [saving, setSaving]       = useState(false);

  const setupSolo = async () => {
    setSaving(true);
    await setSetting('farm_mode', 'solo');
    await setSetting('farm_name', farmName || 'Ma Ferme');
    completeSetup('solo', farmName || 'Ma Ferme');
  };

  const setupMultiStep1 = () => {
    if (!adminName.trim()) return;
    setStep('admin_pin');
  };

  const handleFirstPin = (pin: string) => {
    setFirstPin(pin);
    setStep('admin_confirm');
  };

  const handleConfirmPin = async (pin: string) => {
    if (pin !== firstPin) {
      setPinError('Les PINs ne correspondent pas. Recommencez.');
      setStep('admin_pin');
      setFirstPin('');
      return;
    }
    setSaving(true);
    try {
      await setSetting('farm_mode', 'multi');
      await setSetting('farm_name', farmName || 'Ma Ferme');
      const admin = await createUser(adminName.trim(), 'admin', pin);
      await logActivity(admin.id, admin.name, 'Compte admin créé — configuration initiale');
      completeSetup('multi', farmName || 'Ma Ferme');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-600 flex flex-col items-center justify-center p-6">
      <img src="/logo.png" alt="Mon Troupeau" className="w-28 h-28 object-contain drop-shadow-xl mb-2" />
      <h1 className="text-3xl font-bold text-white mb-2">Mon Troupeau</h1>

      {step === 'welcome' && (
        <div className="w-full max-w-sm mt-8">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Bienvenue !</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              Configurons votre application en quelques étapes.
            </p>
            <button onClick={() => setStep('farm_name')} className="btn-primary">
              Commencer <ArrowRight size={20} />
            </button>
          </div>
        </div>
      )}

      {step === 'farm_name' && (
        <div className="w-full max-w-sm mt-8">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">Nom de la ferme</h2>
            <p className="text-gray-400 text-sm mb-4">Optionnel — modifiable plus tard</p>
            <input
              className="input mb-4"
              placeholder="Ex : Ferme Diallo"
              value={farmName}
              onChange={e => setFarmName(e.target.value)}
            />
            <button onClick={() => setStep('mode')} className="btn-primary">
              Suivant <ArrowRight size={20} />
            </button>
          </div>
        </div>
      )}

      {step === 'mode' && (
        <div className="w-full max-w-sm mt-8">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">Mode d'utilisation</h2>
            <p className="text-gray-400 text-sm mb-6">
              Combien de personnes gèrent cette ferme ?
            </p>

            <div className="space-y-3 mb-6">
              <button
                onClick={setupSolo}
                disabled={saving}
                className="w-full p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-600 flex items-center gap-4 text-left hover:border-primary-400 active:scale-98 transition-all"
              >
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center shrink-0">
                  <User size={24} className="text-primary-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">Seul éleveur</p>
                  <p className="text-xs text-gray-400 mt-0.5">Accès direct, pas de connexion</p>
                </div>
              </button>

              <button
                onClick={() => setStep('admin_name')}
                className="w-full p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-600 flex items-center gap-4 text-left hover:border-primary-400 active:scale-98 transition-all"
              >
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
                  <Users size={24} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">Plusieurs personnes</p>
                  <p className="text-xs text-gray-400 mt-0.5">Admin + Gérants + Employés avec PIN</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'admin_name' && (
        <div className="w-full max-w-sm mt-8">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">Compte Administrateur</h2>
            <p className="text-gray-400 text-sm mb-4">Votre nom (responsable de la ferme)</p>
            <input
              className="input mb-4"
              placeholder="Votre nom complet"
              value={adminName}
              onChange={e => setAdminName(e.target.value)}
              autoFocus
            />
            <button
              onClick={setupMultiStep1}
              disabled={!adminName.trim()}
              className="btn-primary"
            >
              Suivant <ArrowRight size={20} />
            </button>
          </div>
        </div>
      )}

      {step === 'admin_pin' && (
        <div className="w-full max-w-sm mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1 text-center">
              Créez votre PIN
            </h2>
            <p className="text-gray-400 text-sm mb-6 text-center">4 chiffres — retenez-le bien</p>
            {pinError && (
              <p className="text-sm text-red-600 text-center mb-4">{pinError}</p>
            )}
            <PinPad onComplete={handleFirstPin} />
          </div>
        </div>
      )}

      {step === 'admin_confirm' && (
        <div className="w-full max-w-sm mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1 text-center">
              Confirmez le PIN
            </h2>
            <p className="text-gray-400 text-sm mb-6 text-center">Saisissez le PIN à nouveau</p>
            <PinPad onComplete={handleConfirmPin} loading={saving} />
          </div>
        </div>
      )}
    </div>
  );
}

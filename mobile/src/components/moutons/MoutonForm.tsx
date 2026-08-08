import React, { useState } from 'react';
import { ArrowLeft, Save, Camera, Trash2 } from 'lucide-react';
import { Mouton, Species } from '../../types';
import { createMouton, updateMouton } from '../../services/moutonService';
import { logActivity } from '../../services/activityService';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { compressImage } from '../../utils/imageUtils';
import { SPECIES_LABELS, SPECIES_EMOJIS } from '../../utils/species';

const SPECIES_OPTIONS: Species[] = ['mouton', 'chevre', 'bovin', 'volaille', 'autre'];

interface Props { mouton?: Mouton; onSave: () => void; onCancel: () => void }

export function MoutonForm({ mouton: m, onSave, onCancel }: Props) {
  const { currentUser } = useAuth();
  const { simplified } = useApp();
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    identification_number: m?.identification_number ?? '',
    name:                  m?.name                  ?? '',
    species:               m?.species               ?? 'mouton' as Species,
    race:                  m?.race                  ?? '',
    sex:                   m?.sex                    ?? 'inconnu',
    birth_date:            m?.birth_date             ?? '',
    estimated_age_months:  m?.estimated_age_months?.toString() ?? '',
    color:                 m?.color                 ?? '',
    origin:                m?.origin                ?? 'nee_ferme',
    purchase_price:        m?.purchase_price?.toString() ?? '',
    status:                m?.status                ?? 'vivant',
    sale_price:            m?.sale_price?.toString() ?? '',
    sale_date:             m?.sale_date             ?? today,
    buyer_name:            m?.buyer_name            ?? '',
    observations:          m?.observations          ?? '',
    photo:                 m?.photo                 ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [photoProcessing, setPhotoProcessing] = useState(false);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const takePhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setPhotoProcessing(true);
      try {
        const compressed = await compressImage(file);
        setForm(f => ({ ...f, photo: compressed }));
      } catch {
        setError("Impossible de traiter cette photo");
      } finally {
        setPhotoProcessing(false);
      }
    };
    input.click();
  };

  const handleSave = async () => {
    if (!form.identification_number.trim()) { setError("Le numéro d'identification est obligatoire"); return; }
    setSaving(true);
    setError('');
    const payload = {
      ...form,
      identification_number: form.identification_number.trim(),
      name: form.name.trim() || undefined,
      race: form.race.trim() || undefined,
      color: form.color.trim() || undefined,
      birth_date: form.birth_date || undefined,
      estimated_age_months: form.estimated_age_months ? Number(form.estimated_age_months) : undefined,
      purchase_price: form.origin === 'achete' && form.purchase_price ? Number(form.purchase_price) : undefined,
      sale_price: form.sale_price ? Number(form.sale_price) : undefined,
      sale_date: form.status === 'vendu' ? (form.sale_date || undefined) : undefined,
      buyer_name: form.status === 'vendu' ? (form.buyer_name.trim() || undefined) : undefined,
      observations: form.observations.trim() || undefined,
      photo: form.photo || undefined,
    } as Mouton;
    try {
      const label = `#${payload.identification_number}${payload.name ? ` – ${payload.name}` : ''}`;
      if (m?.id) {
        await updateMouton(m.id, payload);
        await logActivity(currentUser?.id, currentUser?.name ?? '', `Animal modifié : ${label}`, 'mouton', m.id, payload.species);
      } else {
        const newId = await createMouton(payload);
        await logActivity(currentUser?.id, currentUser?.name ?? '', `Nouvel animal ajouté : ${label}`, 'mouton', newId, payload.species);
      }
      onSave();
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de l'enregistrement");
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
          {m ? "Modifier l'animal" : 'Nouvel animal'}
        </h2>
      </div>

      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Photo */}
        <div className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Photo</span>
          {photoProcessing ? (
            <div className="w-32 h-32 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-400">
              Traitement…
            </div>
          ) : form.photo ? (
            <div className="relative w-32 h-32">
              <img src={form.photo} alt="Animal" className="w-32 h-32 object-cover rounded-2xl" />
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, photo: '' }))}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={takePhoto}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 active:scale-95 transition-transform"
            >
              <Camera size={20} /> Prendre / choisir une photo
            </button>
          )}
        </div>

        <div className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Espèce</span>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {SPECIES_OPTIONS.map(sp => (
              <button key={sp} type="button" onClick={() => setForm(f => ({ ...f, species: sp }))}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  form.species === sp ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}>
                {SPECIES_EMOJIS[sp]} {SPECIES_LABELS[sp]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">N° d'identification <span className="text-red-500">*</span></span>
            <input className="input mt-1" type="text" value={form.identification_number} onChange={set('identification_number')} placeholder="ex: 001" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Nom (facultatif)</span>
            <input className="input mt-1" type="text" value={form.name} onChange={set('name')} placeholder="ex: Bila" />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Race</span>
            <input className="input mt-1" type="text" value={form.race} onChange={set('race')} placeholder="ex: Balami, Touabire…" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sexe</span>
            <select className="input mt-1" value={form.sex} onChange={set('sex')}>
              <option value="inconnu">Inconnu</option>
              <option value="male">Mâle</option>
              <option value="femelle">Femelle</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Date de naissance</span>
            <input className="input mt-1" type="date" value={form.birth_date} onChange={set('birth_date')} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Âge estimé (mois)</span>
            <input
              className="input mt-1"
              type="number"
              min="0"
              value={form.estimated_age_months}
              onChange={set('estimated_age_months')}
              placeholder="si naissance inconnue"
              disabled={!!form.birth_date}
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Couleur</span>
          <input className="input mt-1" type="text" value={form.color} onChange={set('color')} placeholder="ex: Blanc, Noir et blanc…" />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Origine</span>
          <select className="input mt-1" value={form.origin} onChange={set('origin')}>
            <option value="nee_ferme">Né(e) dans la ferme</option>
            <option value="achete">Acheté(e)</option>
          </select>
        </label>

        {form.origin === 'achete' && (
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Prix d'achat (FCFA)</span>
            <input className="input mt-1" type="number" min="0" value={form.purchase_price} onChange={set('purchase_price')} placeholder="0" />
          </label>
        )}

        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Statut</span>
          <select className="input mt-1" value={form.status} onChange={set('status')}>
            <option value="vivant">Vivant</option>
            <option value="vendu">Vendu</option>
            <option value="decede">Décédé</option>
          </select>
        </label>

        {form.status === 'vendu' && (
          <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Prix de vente (FCFA)</span>
                <input className="input mt-1" type="number" value={form.sale_price} onChange={set('sale_price')} placeholder="0" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Date de vente</span>
                <input className="input mt-1" type="date" value={form.sale_date} onChange={set('sale_date')} />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Nom de l'acheteur</span>
              <input className="input mt-1" type="text" value={form.buyer_name} onChange={set('buyer_name')} placeholder="Nom…" />
            </label>
          </div>
        )}

        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Observations</span>
          <textarea className="input mt-1 resize-none" rows={3} value={form.observations} onChange={set('observations')} placeholder="Notes…" />
        </label>

        <button onClick={handleSave} disabled={saving} className="btn-primary mt-2 simplified:py-5 simplified:text-xl">
          <Save size={simplified ? 26 : 20} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}

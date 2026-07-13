import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { HealthRecord, Mouton } from '../../types';
import { createHealthRecord, updateHealthRecord } from '../../services/healthService';
import { getMoutons, getMoutonByIdAny } from '../../services/moutonService';
import { scheduleHealthReminders } from '../../services/notificationService';
import { logActivity } from '../../services/activityService';
import { useAuth } from '../../context/AuthContext';

interface Props { record?: HealthRecord; onSave: () => void; onCancel: () => void }

const TYPE_LABELS: Record<HealthRecord['type'], string> = {
  vaccination:  'Vaccination',
  vermifuge:    'Vermifuge',
  injection:    'Injection',
  vitamines:    'Vitamines',
  consultation: 'Consultation',
  traitement:   'Traitement',
  autre:        'Soin',
};

export function HealthForm({ record, onSave, onCancel }: Props) {
  const { currentUser } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const [moutons, setMoutons] = useState<Mouton[]>([]);
  const [form, setForm] = useState({
    type:        record?.type        ?? 'vaccination',
    target_type: record?.target_type ?? 'tous',
    target_id:   record?.target_id?.toString() ?? '',
    date:        record?.date        ?? today,
    product:     record?.product     ?? '',
    quantity:    record?.quantity    ?? '',
    cost:        record?.cost?.toString() ?? '',
    next_due:    record?.next_due    ?? '',
    recurrence_months: record?.recurrence_months?.toString() ?? '',
    notes:       record?.notes       ?? '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const actifs = await getMoutons();
      // Si on modifie un soin existant dont le mouton a depuis été mis à la
      // corbeille, on l'ajoute quand même pour ne pas afficher un sélecteur vide.
      if (record?.target_type === 'mouton' && record.target_id && !actifs.some(x => x.id === record.target_id)) {
        const referenced = await getMoutonByIdAny(record.target_id);
        if (referenced) actifs.push(referenced);
      }
      setMoutons(actifs);
    })();
  }, []);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const setTargetType = (v: 'mouton' | 'tous') => setForm(f => ({ ...f, target_type: v, target_id: '' }));

  const setRecurrence = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const months = e.target.value;
    setForm(f => {
      if (!months) return { ...f, recurrence_months: '' };
      const base = new Date(f.date || today);
      base.setMonth(base.getMonth() + Number(months));
      return { ...f, recurrence_months: months, next_due: base.toISOString().split('T')[0] };
    });
  };

  const handleSave = async () => {
    if (form.target_type === 'mouton' && !form.target_id) { alert('Choisissez un mouton'); return; }
    setSaving(true);
    try {
      const payload = {
        type:        form.type,
        target_type: form.target_type,
        target_id:   form.target_type === 'mouton' ? Number(form.target_id) : undefined,
        date:        form.date,
        product:     form.product || undefined,
        quantity:    form.quantity || undefined,
        cost:        form.cost ? Number(form.cost) : undefined,
        next_due:    form.next_due || undefined,
        recurrence_months: form.recurrence_months ? Number(form.recurrence_months) : undefined,
        notes:       form.notes || undefined,
      } as Omit<HealthRecord, 'id'>;
      const targetMouton = form.target_type === 'mouton'
        ? moutons.find(m => String(m.id) === form.target_id)
        : undefined;
      const target = targetMouton ? `#${targetMouton.identification_number}` : 'tout le troupeau';
      const label = `${TYPE_LABELS[form.type as HealthRecord['type']]} — ${target}`;
      if (record?.id) {
        await updateHealthRecord(record.id, payload);
        await logActivity(currentUser?.id, currentUser?.name ?? '', `Soin modifié : ${label}`, 'health', record.id);
      } else {
        const newId = await createHealthRecord(payload);
        await logActivity(currentUser?.id, currentUser?.name ?? '', `${label} enregistrée`, 'health', newId);
      }
      scheduleHealthReminders().catch(() => {});
      onSave();
    } finally { setSaving(false); }
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="p-2 -ml-2 text-gray-500"><ArrowLeft size={24} /></button>
        <h2 className="text-xl font-bold text-gray-800">{record ? 'Modifier' : 'Nouveau soin'}</h2>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Type d'intervention</span>
          <select className="input mt-1" value={form.type} onChange={set('type')}>
            <option value="vaccination">Vaccination</option>
            <option value="vermifuge">Vermifuge</option>
            <option value="injection">Injection</option>
            <option value="vitamines">Vitamines</option>
            <option value="consultation">Consultation</option>
            <option value="traitement">Traitement</option>
            <option value="autre">Autre</option>
          </select>
        </label>

        <div>
          <span className="text-sm font-medium text-gray-700 block mb-2">Cible</span>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setTargetType('tous')}
              className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-colors ${
                form.target_type === 'tous' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'
              }`}>
              Tout le troupeau
            </button>
            <button type="button" onClick={() => setTargetType('mouton')}
              className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-colors ${
                form.target_type === 'mouton' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'
              }`}>
              Un mouton
            </button>
          </div>
        </div>

        {form.target_type === 'mouton' && (
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Mouton concerné</span>
            <select className="input mt-1" value={form.target_id} onChange={set('target_id')}>
              <option value="">— Choisir un mouton —</option>
              {moutons.map(m => (
                <option key={m.id} value={String(m.id)}>
                  #{m.identification_number}{m.name ? ` – ${m.name}` : ''}{m.deleted_at ? ' (supprimé)' : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Date du soin</span>
          <input className="input mt-1" type="date" value={form.date} onChange={set('date')} />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Produit</span>
          <input className="input mt-1" type="text" value={form.product} onChange={set('product')} placeholder="Nom du produit…" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Quantité</span>
            <input className="input mt-1" type="text" value={form.quantity} onChange={set('quantity')} placeholder="ex: 10 ml" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Coût (FCFA)</span>
            <input className="input mt-1" type="number" min="0" value={form.cost} onChange={set('cost')} placeholder="0" />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Rappel récurrent</span>
          <select className="input mt-1" value={form.recurrence_months} onChange={setRecurrence}>
            <option value="">Aucun (rappel ponctuel)</option>
            <option value="1">Tous les mois</option>
            <option value="3">Tous les 3 mois</option>
            <option value="6">Tous les 6 mois</option>
            <option value="12">Tous les 12 mois</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Prochaine intervention</span>
          <input className="input mt-1" type="date" value={form.next_due} onChange={set('next_due')} />
          {form.recurrence_months && (
            <span className="text-xs text-gray-400 mt-1 block">
              Se reprogrammera automatiquement tous les {form.recurrence_months} mois si dépassé.
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Observation</span>
          <textarea className="input mt-1 resize-none" rows={3} value={form.notes} onChange={set('notes')} placeholder="Observations…" />
        </label>

        <button onClick={handleSave} disabled={saving} className="btn-primary mt-2">
          <Save size={20} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}

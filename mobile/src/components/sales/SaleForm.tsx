import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { Sale, Mouton } from '../../types';
import { createSale, updateSale } from '../../services/saleService';
import { getMoutons, getMoutonByIdAny } from '../../services/moutonService';
import { logActivity } from '../../services/activityService';
import { useAuth } from '../../context/AuthContext';
import { formatAnimalLabel } from '../../utils/species';

interface Props { sale?: Sale; onSave: () => void; onCancel: () => void }

const TARGET_TYPES = [
  { value: 'mouton', label: '🐾 Animal' },
  { value: 'fumier', label: '🌾 Fumier' },
  { value: 'autre',  label: '— Autre revenu' },
];

export function SaleForm({ sale, onSave, onCancel }: Props) {
  const { currentUser } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const [moutons, setMoutons] = useState<Mouton[]>([]);
  const [form, setForm] = useState({
    target_type:    (sale?.target_type    ?? 'mouton') as Sale['target_type'],
    target_id:      sale?.target_id?.toString() ?? '',
    date:           sale?.date            ?? today,
    quantity:       sale?.quantity?.toString()   ?? '1',
    unit_price:     sale?.unit_price?.toString() ?? '',
    buyer_name:     sale?.buyer_name      ?? '',
    payment_method: sale?.payment_method  ?? 'especes',
    notes:          sale?.notes           ?? '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const vivants = (await getMoutons()).filter(x => x.status === 'vivant');
      // Si on modifie une vente existante dont le mouton n'est plus « vivant »
      // (déjà vendu par cette même vente, ou depuis mis à la corbeille), on
      // l'ajoute quand même à la liste pour ne pas afficher un sélecteur vide.
      if (sale?.target_type === 'mouton' && sale.target_id && !vivants.some(x => x.id === sale.target_id)) {
        const referenced = await getMoutonByIdAny(sale.target_id);
        if (referenced) vivants.push(referenced);
      }
      setMoutons(vivants);
    })();
  }, []);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const setTargetType = (v: Sale['target_type']) =>
    setForm(f => ({ ...f, target_type: v, target_id: '' }));

  const total = (Number(form.quantity) || 0) * (Number(form.unit_price) || 0);

  const handleSave = async () => {
    if (!form.unit_price || !form.quantity) { alert('Prix et quantité obligatoires'); return; }
    setSaving(true);
    const payload = {
      target_type:    form.target_type,
      target_id:      form.target_id ? Number(form.target_id) : undefined,
      date:           form.date,
      quantity:       Number(form.quantity),
      unit_price:     Number(form.unit_price),
      buyer_name:     form.buyer_name || undefined,
      payment_method: form.payment_method as Sale['payment_method'],
      notes:          form.notes || undefined,
    };
    try {
      const targetLabel = TARGET_TYPES.find(t => t.value === form.target_type)?.label ?? form.target_type;
      const moutonLabel = form.target_type === 'mouton'
        ? moutons.find(m => String(m.id) === form.target_id)
        : undefined;
      const label = moutonLabel ? `${targetLabel} #${moutonLabel.identification_number}` : targetLabel;
      if (sale?.id) {
        await updateSale(sale.id, { ...payload, amount: total });
        await logActivity(currentUser?.id, currentUser?.name ?? '', `Vente modifiée : ${label} — ${total.toLocaleString('fr-FR')} FCFA`, 'sale', sale.id);
      } else {
        const newId = await createSale(payload);
        await logActivity(currentUser?.id, currentUser?.name ?? '', `Vente enregistrée : ${label} — ${total.toLocaleString('fr-FR')} FCFA`, 'sale', newId);
      }
      onSave();
    } finally { setSaving(false); }
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="p-2 -ml-2 text-gray-500"><ArrowLeft size={24} /></button>
        <h2 className="text-xl font-bold text-gray-800">{sale ? 'Modifier la vente' : 'Nouvelle vente'}</h2>
      </div>

      <div className="space-y-4">
        {/* Type de recette */}
        <div>
          <span className="text-sm font-medium text-gray-700 block mb-2">
            Qu'est-ce qui a été vendu ? <span className="text-red-500">*</span>
          </span>
          <div className="grid grid-cols-3 gap-2">
            {TARGET_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTargetType(t.value as Sale['target_type'])}
                className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-colors text-left ${
                  form.target_type === t.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sélecteur du mouton vendu */}
        {form.target_type === 'mouton' && (
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Animal vendu</span>
            <select className="input mt-1" value={form.target_id} onChange={set('target_id')}>
              <option value="">— Choisir un animal —</option>
              {moutons.map(m => (
                <option key={m.id} value={String(m.id)}>
                  {formatAnimalLabel(m)}
                  {m.deleted_at ? ' (supprimé)' : m.status !== 'vivant' ? ' (déjà vendu)' : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Date de vente</span>
          <input className="input mt-1" type="date" value={form.date} onChange={set('date')} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Quantité <span className="text-red-500">*</span></span>
            <input className="input mt-1" type="number" min="1" value={form.quantity} onChange={set('quantity')} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Prix unitaire (FCFA) <span className="text-red-500">*</span></span>
            <input className="input mt-1" type="number" min="0" value={form.unit_price} onChange={set('unit_price')} placeholder="0" />
          </label>
        </div>

        {total > 0 && (
          <div className="bg-primary-50 rounded-xl px-4 py-3 text-center">
            <p className="text-sm text-primary-700">Total</p>
            <p className="text-2xl font-bold text-primary-800">{total.toLocaleString('fr-FR')} FCFA</p>
          </div>
        )}

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Nom du client</span>
          <input className="input mt-1" type="text" value={form.buyer_name} onChange={set('buyer_name')} placeholder="Nom…" />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Mode de paiement</span>
          <select className="input mt-1" value={form.payment_method} onChange={set('payment_method')}>
            <option value="especes">💵 Espèces</option>
            <option value="mobile_money">📱 Mobile Money (Orange, Wave…)</option>
            <option value="virement">🏦 Virement bancaire</option>
            <option value="cheque">📄 Chèque</option>
            <option value="credit">⏳ Crédit (à terme)</option>
            <option value="autre">— Autre</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Observation</span>
          <textarea className="input mt-1 resize-none" rows={2} value={form.notes} onChange={set('notes')} placeholder="Remarques…" />
        </label>

        <button onClick={handleSave} disabled={saving} className="btn-primary mt-2">
          <Save size={20} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}

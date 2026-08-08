import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { Expense, ExpenseCategory } from '../../types';
import { createExpense, updateExpense } from '../../services/expenseService';
import { logActivity } from '../../services/activityService';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'achat_moutons', label: "Achat d'animaux" },
  { value: 'alimentation',  label: 'Alimentation' },
  { value: 'medicaments',   label: 'Médicaments' },
  { value: 'transport',     label: 'Transport' },
  { value: 'main_oeuvre',   label: "Main-d'œuvre" },
  { value: 'construction',  label: 'Construction' },
  { value: 'autre',         label: 'Autre' },
];

interface Props {
  expense?: Expense;
  onSave: () => void;
  onCancel: () => void;
}

export function ExpenseForm({ expense, onSave, onCancel }: Props) {
  const { currentUser } = useAuth();
  const [category, setCategory]     = useState<ExpenseCategory>(expense?.category ?? 'alimentation');
  const [date, setDate]             = useState(expense?.date ?? new Date().toISOString().split('T')[0]);
  const [amount, setAmount]         = useState(expense?.amount?.toString() ?? '');
  const [description, setDescription] = useState(expense?.description ?? '');
  const [paymentMethod, setPaymentMethod] = useState(expense?.payment_method ?? 'especes');
  const [notes, setNotes]           = useState(expense?.notes ?? '');
  const [saving, setSaving]         = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    setSaving(true);
    try {
      const data = {
        category, date, amount: parseFloat(amount),
        description: description.trim() || undefined,
        payment_method: paymentMethod as Expense['payment_method'],
        notes: notes.trim() || undefined,
      };
      const categoryLabel = CATEGORIES.find(c => c.value === category)?.label ?? category;
      if (expense?.id) {
        await updateExpense(expense.id, data);
        await logActivity(currentUser?.id, currentUser?.name ?? '', `Dépense modifiée : ${categoryLabel} — ${data.amount.toLocaleString('fr-FR')} FCFA`, 'expense', expense.id);
      } else {
        const newId = await createExpense(data);
        await logActivity(currentUser?.id, currentUser?.name ?? '', `Dépense enregistrée : ${categoryLabel} — ${data.amount.toLocaleString('fr-FR')} FCFA`, 'expense', newId);
      }
      onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
          {expense ? 'Modifier la dépense' : 'Nouvelle dépense'}
        </h2>
        <button onClick={onCancel} className="btn-icon text-gray-400 bg-gray-100 dark:bg-gray-800">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Catégorie</label>
          <select className="input" value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required />
        </div>

        <div>
          <label className="label">Montant (FCFA)</label>
          <input
            type="number"
            className="input"
            placeholder="Ex : 5000"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            min="1"
            step="1"
            required
          />
        </div>

        <div>
          <label className="label">Description</label>
          <input
            className="input"
            placeholder="Ex : Sacs de mil, Vermifuge…"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Mode de paiement</label>
          <select className="input" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as Expense['payment_method'])}>
            <option value="especes">💵 Espèces</option>
            <option value="mobile_money">📱 Mobile Money</option>
            <option value="virement">🏦 Virement bancaire</option>
            <option value="cheque">📄 Chèque</option>
            <option value="credit">⏳ Crédit</option>
            <option value="autre">— Autre</option>
          </select>
        </div>

        <div>
          <label className="label">Observation</label>
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="Informations complémentaires…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <button type="submit" disabled={saving || !amount} className="btn-primary mt-2">
          <Save size={18} />
          {saving ? 'Enregistrement…' : expense ? 'Modifier' : 'Enregistrer'}
        </button>
      </form>
    </div>
  );
}

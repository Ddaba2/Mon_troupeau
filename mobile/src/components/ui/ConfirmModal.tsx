import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Supprimer',
  cancelLabel  = 'Annuler',
  onConfirm,
  onCancel,
  danger = true,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-4 bg-black/50"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${danger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
            <AlertTriangle size={24} className={danger ? 'text-red-600' : 'text-amber-600'} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 text-center mb-2">
            {title}
          </h2>
          {message && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed">
              {message}
            </p>
          )}
        </div>

        <div className="flex border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onCancel}
            className="flex-1 py-4 text-gray-600 dark:text-gray-300 font-semibold text-sm border-r border-gray-100 dark:border-gray-800 active:bg-gray-50 dark:active:bg-gray-800 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-4 font-semibold text-sm active:opacity-80 transition-colors ${danger ? 'text-red-600' : 'text-amber-600'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

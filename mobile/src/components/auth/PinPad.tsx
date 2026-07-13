import React, { useState } from 'react';
import { Delete } from 'lucide-react';

interface Props {
  onComplete: (pin: string) => void;
  error?: string;
  loading?: boolean;
}

const PIN_LENGTH = 4;

export function PinPad({ onComplete, error, loading }: Props) {
  const [digits, setDigits] = useState<string[]>([]);

  const haptic = (duration: number = 10) => {
    try {
      // Vibration native via API web standard (Android WebView)
      if (navigator?.vibrate) navigator.vibrate(duration);
    } catch { /* ignoré si non supporté */ }
  };

  const push = (d: string) => {
    if (digits.length >= PIN_LENGTH || loading) return;
    haptic(10);
    const next = [...digits, d];
    setDigits(next);
    if (next.length === PIN_LENGTH) {
      setTimeout(() => {
        onComplete(next.join(''));
        setDigits([]);
      }, 120);
    }
  };

  const pop = () => {
    if (loading) return;
    haptic(25);
    setDigits(d => d.slice(0, -1));
  };

  const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Indicateur PIN */}
      <div className="flex gap-4">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              i < digits.length
                ? 'bg-primary-600 border-primary-600 scale-110'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          />
        ))}
      </div>

      {/* Message d'erreur */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 text-center font-medium px-4">{error}</p>
      )}

      {/* Grille numérique */}
      <div className="grid grid-cols-3 gap-3 w-64">
        {KEYS.map((k, idx) => {
          if (k === '') return <div key={idx} />;
          if (k === '⌫') {
            return (
              <button
                key={idx}
                onPointerDown={e => { e.preventDefault(); pop(); }}
                disabled={loading}
                className="h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40"
              >
                <Delete size={22} className="text-gray-600 dark:text-gray-300" />
              </button>
            );
          }
          return (
            <button
              key={idx}
              onPointerDown={e => { e.preventDefault(); push(k); }}
              disabled={loading}
              className="h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-2xl font-semibold flex items-center justify-center active:scale-90 active:bg-primary-100 dark:active:bg-primary-900 transition-transform disabled:opacity-40"
            >
              {k}
            </button>
          );
        })}
      </div>

      {loading && (
        <p className="text-sm text-primary-600 dark:text-primary-400">Vérification…</p>
      )}
    </div>
  );
}

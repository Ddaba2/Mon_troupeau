import { useState, useEffect } from 'react';

export function useSimplifiedMode() {
  const [simplified, setSimplified] = useState(() => {
    return localStorage.getItem('mon_troupeau_simplified_mode') === 'true';
  });

  useEffect(() => {
    const html = document.documentElement;
    if (simplified) {
      html.classList.add('simplified');
    } else {
      html.classList.remove('simplified');
    }
    localStorage.setItem('mon_troupeau_simplified_mode', String(simplified));
  }, [simplified]);

  return { simplified, toggleSimplified: () => setSimplified(s => !s) };
}

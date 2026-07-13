import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';

export function useNetwork() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    Network.getStatus().then(s => setIsOnline(s.connected));

    const listener = Network.addListener('networkStatusChange', s => setIsOnline(s.connected));
    return () => { listener.then(l => l.remove()); };
  }, []);

  return isOnline;
}

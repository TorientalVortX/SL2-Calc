import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { watchForPwaUpdates } from './domain/pwaUpdates';

export default function PwaUpdatePrompt({ beforeRefresh }: { beforeRefresh?: () => void }) {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const [error, setError] = useState('');
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({ onRegisteredSW(_url, next) { setRegistration(next); } });

  useEffect(() => registration ? watchForPwaUpdates(registration) : undefined, [registration]);
  const refresh = async () => {
    try {
      beforeRefresh?.();
      await updateServiceWorker(true);
    } catch {
      setError('Could not save or refresh. Export your build before reloading the page.');
    }
  };
  if (!needRefresh && !offlineReady) return null;
  // Shared by Aether and Classic, which deliberately use separate stylesheets.
  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, left: 16, marginLeft: 'auto', maxWidth: 420,
      zIndex: 10000, padding: 16, borderRadius: 8, border: '1px solid #b59a60',
      background: '#15121c', color: '#f0e5cd', boxShadow: '0 4px 24px #0008' }} role="status">
      <strong>{needRefresh ? 'A new calculator version is ready.' : 'SL2 Calculator is ready offline.'}</strong>
      <p>{needRefresh ? 'Refresh when you are ready. Your saved builds will be kept.' : 'The calculator can now load without a connection.'}</p>
      {error && <p role="alert">{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button type="button" onClick={() => { setNeedRefresh(false); setOfflineReady(false); }}>Later</button>
        {needRefresh && <button type="button" onClick={() => { void refresh(); }}>Refresh</button>}
      </div>
    </div>
  );
}

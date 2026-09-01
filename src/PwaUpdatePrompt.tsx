import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './design';

export default function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[95] rounded-lg border border-highlight-ring/60 bg-surface-sunken p-4 text-sm text-content-bright shadow-2xl sm:left-auto sm:max-w-md" role="status">
      <div className="font-semibold text-highlight-soft">{needRefresh ? 'A new calculator version is ready.' : 'SL2 Calculator is ready offline.'}</div>
      <p className="mt-1 text-xs text-content-muted">{needRefresh ? 'Your recovery draft has already been saved. Refresh only when you are ready.' : 'All calculator tabs and game data can now load without a connection.'}</p>
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" className="border border-edge bg-transparent hover:bg-transparent" onClick={() => { setNeedRefresh(false); setOfflineReady(false); }}>Later</Button>
        {needRefresh && <Button variant="solid" tone="highlight" size="sm" className="bg-highlight-hover font-semibold" onClick={() => updateServiceWorker(true)}>Refresh</Button>}
      </div>
    </div>
  );
}

import { useRegisterSW } from 'virtual:pwa-register/react';

export default function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[95] rounded-lg border border-cyan-500/60 bg-slate-950 p-4 text-sm text-slate-100 shadow-2xl sm:left-auto sm:max-w-md" role="status">
      <div className="font-semibold text-cyan-300">{needRefresh ? 'A new calculator version is ready.' : 'SL2 Calculator is ready offline.'}</div>
      <p className="mt-1 text-xs text-slate-400">{needRefresh ? 'Your recovery draft has already been saved. Refresh only when you are ready.' : 'All calculator tabs and game data can now load without a connection.'}</p>
      <div className="mt-3 flex justify-end gap-2">
        <button className="rounded border border-slate-600 px-3 py-2" onClick={() => { setNeedRefresh(false); setOfflineReady(false); }}>Later</button>
        {needRefresh && <button className="rounded bg-cyan-600 px-3 py-2 font-semibold" onClick={() => updateServiceWorker(true)}>Refresh</button>}
      </div>
    </div>
  );
}

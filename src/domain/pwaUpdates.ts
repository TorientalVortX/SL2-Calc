/** Check on return/online and periodically, without reloading an active draft. */
export function watchForPwaUpdates(
  registration: Pick<ServiceWorkerRegistration, 'update'>,
  win: Window = window,
  doc: Document = document,
): () => void {
  let stopped = false;
  let pending = false;
  const check = async () => {
    if (stopped || pending || win.navigator.onLine === false || doc.visibilityState === 'hidden') return;
    pending = true;
    try { await registration.update(); } catch { /* Offline or temporarily unavailable: retry later. */ }
    finally { pending = false; }
  };
  const onCheck = () => { void check(); };
  win.addEventListener('focus', onCheck);
  win.addEventListener('online', onCheck);
  doc.addEventListener('visibilitychange', onCheck);
  const timer = win.setInterval(onCheck, 60_000);
  onCheck();
  return () => {
    stopped = true;
    win.clearInterval(timer);
    win.removeEventListener('focus', onCheck);
    win.removeEventListener('online', onCheck);
    doc.removeEventListener('visibilitychange', onCheck);
  };
}

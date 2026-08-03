import { Component, type ErrorInfo, type ReactNode } from 'react';
import { APP_VERSION, GAME_DATA_MANIFEST } from './domain/buildPersistence';

interface Props { children: ReactNode }
interface State { error: Error | null; copied: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, copied: false };

  static getDerivedStateFromError(error: Error): State {
    return { error, copied: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SL2 Calculator crashed', error, info);
  }

  copyDiagnostics = async () => {
    const diagnostic = {
      appVersion: APP_VERSION,
      dataVersion: GAME_DATA_MANIFEST.dataVersion,
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      note: 'Current build contents are intentionally excluded.',
    };
    await navigator.clipboard.writeText(JSON.stringify(diagnostic, null, 2));
    this.setState({ copied: true });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
        <section className="w-full max-w-xl rounded-xl border border-red-500/50 bg-slate-900 p-6 shadow-2xl">
          <div className="font-retro text-lg text-red-300">Calculator fault detected</div>
          <p className="mt-3 text-sm text-slate-300">Your browser-local saves were not deleted. Reload the page, or copy a diagnostic report when filing an issue.</p>
          <pre className="mt-4 max-h-40 overflow-auto rounded bg-black/40 p-3 text-xs text-red-200">{this.state.error.message}</pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded bg-cyan-700 px-4 py-2" onClick={this.copyDiagnostics}>{this.state.copied ? 'Diagnostic Copied' : 'Copy Diagnostic'}</button>
            <button className="rounded border border-slate-600 px-4 py-2" onClick={() => window.location.reload()}>Reload</button>
          </div>
        </section>
      </main>
    );
  }
}

/**
 * The crash screen, wrapped around the whole Codex in `aether/main.tsx`.
 *
 * Styled inline against `aether.css`'s tokens rather than with classes. A render
 * fault can come from anywhere, including whatever paints the sheet, so the one
 * screen whose job is to survive that does not depend on a stylesheet loading or
 * on a class the crashed tree defined.
 *
 * It also carries the theme correctly by construction: every colour is a token,
 * and the light palette redefines the same names.
 */
import { Component, type CSSProperties, type ErrorInfo, type ReactNode } from 'react';
import { APP_VERSION, GAME_DATA_MANIFEST } from './domain/buildPersistence';

interface Props { children: ReactNode }
interface State { error: Error | null; copied: boolean }

const shell: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1.5rem',
  background: 'var(--void, #04060a)',
  color: 'var(--text, #e6e9f0)',
  font: '400 14px/1.5 Barlow, system-ui, sans-serif',
};

const card: CSSProperties = {
  width: '100%',
  maxWidth: '34rem',
  padding: '1.5rem',
  borderRadius: '0.75rem',
  border: '1px solid var(--alert-dim, rgba(227, 112, 93, 0.16))',
  background: 'linear-gradient(var(--panel-top, #111620), var(--panel-bottom, #080b11))',
};

const button: CSSProperties = {
  padding: '0.45rem 0.9rem',
  borderRadius: '0.35rem',
  border: '1px solid var(--edge, rgba(200, 170, 106, 0.22))',
  background: 'linear-gradient(var(--btn-top, #262e3c), var(--btn-bottom, #0e121a))',
  color: 'var(--text, #e6e9f0)',
  font: 'inherit',
  cursor: 'pointer',
};

const primary: CSSProperties = {
  ...button,
  borderColor: 'var(--edge-hard, rgba(200, 170, 106, 0.4))',
  background: 'linear-gradient(var(--btn-primary-top, #6b5834), var(--btn-primary-bottom, #443722))',
};

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
      <main style={shell}>
        <section style={card}>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--alert-text, #f0a99b)' }}>
            Calculator fault detected
          </div>
          <p style={{ margin: '0.75rem 0 0', color: 'var(--text-2, #a6b0c2)' }}>
            Your browser-local saves were not deleted. Reload the page, or copy a diagnostic report
            when filing an issue.
          </p>
          <pre
            style={{
              margin: '1rem 0 0',
              maxHeight: '10rem',
              overflow: 'auto',
              padding: '0.75rem',
              borderRadius: '0.25rem',
              background: 'var(--well, rgba(0, 0, 0, 0.4))',
              color: 'var(--alert-text, #f0a99b)',
              font: '400 12px/1.5 "JetBrains Mono", ui-monospace, monospace',
            }}
          >
            {this.state.error.message}
          </pre>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
            <button type="button" style={primary} onClick={this.copyDiagnostics}>
              {this.state.copied ? 'Diagnostic Copied' : 'Copy Diagnostic'}
            </button>
            <button type="button" style={button} onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </section>
      </main>
    );
  }
}

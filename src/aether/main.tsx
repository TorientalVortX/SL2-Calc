import React from 'react';
import ReactDOM from 'react-dom/client';
import { AetherApp } from './AetherApp';
import { applyTheme, readTheme } from './state/theme';
import ErrorBoundary from '../ErrorBoundary';
import './aether.css';
import './intro/intro.css';
import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow-condensed/latin-500.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';

applyTheme(readTheme());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AetherApp />
    </ErrorBoundary>
  </React.StrictMode>,
);

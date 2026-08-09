import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import SL2Calculator from './SL2Calculator'
import './index.css'
import '@fontsource/barlow/latin-400.css'
import '@fontsource/barlow/latin-500.css'
import '@fontsource/barlow/latin-600.css'
import '@fontsource/barlow/latin-700.css'
import '@fontsource/barlow-condensed/latin-500.css'
import '@fontsource/barlow-condensed/latin-600.css'
import '@fontsource/barlow-condensed/latin-700.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import '@fontsource/jetbrains-mono/latin-700.css'
// Retro mode only.
import ErrorBoundary from './ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<div className="min-h-screen bg-surface-base text-info grid place-items-center">Loading calculator…</div>}>
        <SL2Calculator />
      </Suspense>
    </ErrorBoundary>
  </React.StrictMode>,
)

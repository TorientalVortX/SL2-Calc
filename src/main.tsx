import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import SL2Calculator from './SL2Calculator'
import './index.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/space-grotesk/latin-600.css'
import '@fontsource/press-start-2p/latin-400.css'
import '@fontsource/vt323/latin-400.css'
import ErrorBoundary from './ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<div className="min-h-screen bg-dark-900 text-accent-blue grid place-items-center">Loading calculator…</div>}>
        <SL2Calculator />
      </Suspense>
    </ErrorBoundary>
  </React.StrictMode>,
)

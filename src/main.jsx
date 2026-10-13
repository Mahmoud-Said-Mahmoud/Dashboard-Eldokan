import { Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ToastHost from './components/Common/ToastHost.jsx'
import ErrorBoundary from './components/Common/ErrorBoundary.jsx'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import '@fontsource/inter/900.css'
import '@fontsource/cairo/400.css'
import '@fontsource/cairo/500.css'
import '@fontsource/cairo/600.css'
import '@fontsource/cairo/700.css'
import '@fontsource/cairo/800.css'
import '@fontsource/cairo/900.css'

// Do not wrap the app in React.StrictMode here.
// StrictMode intentionally runs mount effects twice in development, which caused
// duplicate /products and /notifications API calls while testing on localhost.
createRoot(document.getElementById('root')).render(
  <>
    <ToastHost />
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-black" />
        </main>
      }
    >
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </Suspense>
  </>
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ensureCanonicalOrigin } from '@/lib/canonicalOrigin'
import { registerServiceWorker } from '@/lib/registerServiceWorker'
import { initPwaInstallListener } from '@/lib/pwaInstall'
import './index.css'

ensureCanonicalOrigin()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerServiceWorker()
initPwaInstallListener()

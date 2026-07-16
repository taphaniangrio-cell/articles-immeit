import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found')

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Version detection for cache invalidation
const APP_VERSION = '160'
const htmlEl = document.getElementById('app-version')
const htmlVersion = (htmlEl?.textContent || '').replace(/^v/, '') || '0'
const storedVersion = localStorage.getItem('immeit_app_version')
const alreadyReloaded = sessionStorage.getItem('immeit_reloaded')

if ((htmlVersion !== APP_VERSION || (storedVersion && storedVersion !== APP_VERSION)) && !alreadyReloaded) {
  localStorage.setItem('immeit_app_version', APP_VERSION)
  localStorage.removeItem('immeit_dash_cache')
  sessionStorage.setItem('immeit_reloaded', '1')
  if (htmlEl) htmlEl.textContent = 'v' + APP_VERSION
  location.reload()
}
if (!storedVersion) localStorage.setItem('immeit_app_version', APP_VERSION)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './index.css'
import App from './App.tsx'

history.scrollRestoration = 'manual'
if (location.hash) history.replaceState(history.state, '', location.pathname + location.search)
window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
document.documentElement.classList.add('is-loading')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
)

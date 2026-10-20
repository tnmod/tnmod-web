import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

history.scrollRestoration = 'manual'
window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
document.documentElement.classList.add('is-loading')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

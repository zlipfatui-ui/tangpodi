import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/sarabun/400.css'
import '@fontsource/sarabun/500.css'
import '@fontsource/sarabun/600.css'
import '@fontsource/sarabun/700.css'
import '@fontsource/kanit/400.css'
import '@fontsource/kanit/500.css'
import '@fontsource/kanit/600.css'
import './index.css'
import App from './App.tsx'
import AuthGate from './components/AuthGate.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </StrictMode>,
)

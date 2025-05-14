import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Ant Design styles are automatically imported when using components
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

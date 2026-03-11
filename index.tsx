import { createRoot } from 'react-dom/client'
import { name, version } from './package.json'

import './src/index.css'
import { BusinessAppIDE } from './src/BusinessAppIDE'
import { getAppPathFromPathname, getValidatedPathname } from '@/common/utils/navigationUtils'

/**
 * Normalize path-based platform URLs to include ?app= for the IDE.
 * Uses validated path from allowlist (not raw pathname) to prevent open redirect.
 */
function ensureAppParamInUrl(): boolean {
  if (typeof window === 'undefined') return false
  const { pathname, search } = window.location
  const params = new URLSearchParams(search)
  if (params.has('app') || params.has('form') || params.has('popup') || params.has('window')) {
    return false
  }
  const app = getAppPathFromPathname(pathname)
  const safePath = getValidatedPathname(pathname)
  if (!app || !safePath) return false
  params.set('app', app)
  const newUrl = `${safePath}?${params.toString()}`
  window.location.replace(newUrl)
  return true
}

function BusinessAppDevApp() {
  if (ensureAppParamInUrl()) {
    return null
  }
  return <BusinessAppIDE packageName={name} packageVersion={version} />
}
const container = document.querySelector('#root') as Element | DocumentFragment
const root = createRoot(container)
root.render(<BusinessAppDevApp />)

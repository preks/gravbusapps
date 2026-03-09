import { createRoot } from 'react-dom/client'
import { name, version } from './package.json'

import './src/index.css'
import { BusinessAppIDE } from './src/BusinessAppIDE'
import { PLATFORM_URL_TO_APP_MAPPING } from '@/common/utils/navigationUtils'

/**
 * IDE-specific: resolve app path from pathname using the navigation mapping.
 * Path-based URLs (e.g. Excel Collection copy links) need ?app= for the IDE to load correctly.
 */
function getAppPathFromPathname(pathname: string): string | null {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  return PLATFORM_URL_TO_APP_MAPPING[normalized] ?? null
}

/**
 * Normalize path-based platform URLs to include ?app= for the IDE.
 * Uses PLATFORM_URL_TO_APP_MAPPING from navigation utils (properly registered).
 */
function ensureAppParamInUrl(): boolean {
  if (typeof window === 'undefined') return false
  const { pathname, search } = window.location
  const params = new URLSearchParams(search)
  if (params.has('app') || params.has('form') || params.has('popup') || params.has('window')) {
    return false
  }
  const app = getAppPathFromPathname(pathname)
  if (!app) return false
  params.set('app', app)
  const newUrl = `${pathname}?${params.toString()}`
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

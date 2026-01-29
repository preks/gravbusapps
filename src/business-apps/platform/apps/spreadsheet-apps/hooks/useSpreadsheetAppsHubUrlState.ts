import { useCallback, useEffect, useRef } from 'react'
import { navigateTo } from '@/common/utils/navigationUtils'

type HubView = 'list' | 'upload' | 'analysis' | 'viewer' | 'editor'

export interface UseSpreadsheetAppsHubUrlStateParams {
  currentView: HubView
  currentAppId: string | null
  isLoadingApps: boolean
  loadAppById: (appId: string, filePath?: string) => Promise<unknown | null>
  setSelectedAppId: (id: string | null) => void
  setCurrentView: (view: HubView) => void
}

export interface UseSpreadsheetAppsHubUrlStateReturn {
  updateUrl: (appId: string | null, view?: HubView, filePath?: string | null) => void
  resetLoadAttempt: () => void
}

function getUrlParams(): { appId: string | null; filePath: string | null; view: HubView | null } {
  const urlParams = new URLSearchParams(window.location.search)
  return {
    appId: urlParams.get('appId'),
    filePath: urlParams.get('filePath'),
    view: (urlParams.get('view') as HubView | null) || null
  }
}

export function useSpreadsheetAppsHubUrlState(
  params: UseSpreadsheetAppsHubUrlStateParams
): UseSpreadsheetAppsHubUrlStateReturn {
  const { currentView, currentAppId, isLoadingApps, loadAppById, setSelectedAppId, setCurrentView } = params

  const loadAttemptedRef = useRef<string | null>(null)
  const cameFromDeskRef = useRef(false)

  const updateUrl = useCallback((appId: string | null, view?: HubView, filePath?: string | null) => {
    const urlParams = new URLSearchParams(window.location.search)
    if (appId) {
      urlParams.set('appId', appId)
      if (view) urlParams.set('view', view)
      if (filePath) urlParams.set('filePath', encodeURIComponent(filePath))
    } else {
      urlParams.delete('appId')
      urlParams.delete('view')
      urlParams.delete('filePath')
    }
    const newUrl = urlParams.toString()
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname
    window.history.pushState({ appId, view, filePath }, '', newUrl)
  }, [])

  const resetLoadAttempt = useCallback(() => {
    loadAttemptedRef.current = null
  }, [])

  // Load app from URL on mount.
  useEffect(() => {
    const { appId, filePath, view } = getUrlParams()
    if (!appId) return
    if (currentAppId) return
    if (isLoadingApps) return
    if (loadAttemptedRef.current === appId) return

    loadAttemptedRef.current = appId
    loadAppById(appId, filePath ? decodeURIComponent(filePath) : undefined).then(app => {
      if (!app) return
      setSelectedAppId(appId)
      setCurrentView(view === 'editor' ? 'editor' : 'viewer')
    })
  }, [currentAppId, isLoadingApps, loadAppById, setCurrentView, setSelectedAppId])

  // Track if we came from desk.
  useEffect(() => {
    const referrer = document.referrer
    const urlParams = new URLSearchParams(window.location.search)
    cameFromDeskRef.current =
      referrer.includes('/platform/apps/desk') ||
      referrer.includes('?app=platform/apps/desk') ||
      urlParams.get('from') === 'desk'

    if (cameFromDeskRef.current && currentView === 'list') {
      window.history.replaceState({ fromDesk: true }, '', window.location.href)
    }
  }, [currentView])

  // Handle browser back/forward navigation.
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as { appId?: string; view?: HubView; fromDesk?: boolean } | null

      if (state?.fromDesk && !state?.appId && currentView === 'list') {
        navigateTo(process.env.NODE_ENV === 'production' ? '/platform/desk' : '/platform/apps/desk')
        return
      }

      if (state?.appId) {
        loadAppById(state.appId).then(app => {
          if (!app) return
          setSelectedAppId(state.appId!)
          setCurrentView(state.view || 'viewer')
        })
        return
      }

      setSelectedAppId(null)
      setCurrentView('list')
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [currentView, loadAppById, setCurrentView, setSelectedAppId])

  return { updateUrl, resetLoadAttempt }
}

import { useCallback, useEffect, useRef } from 'react'
import { navigateTo } from '@/common/utils/navigationUtils'

type HubView = 'list' | 'upload' | 'analysis' | 'viewer' | 'editor'
type SidebarSection = 'home' | 'my-files' | 'shared' | 'favorites' | 'recent' | 'automations' | 'tasks' | 'trash'

export interface UseSpreadsheetAppsHubUrlStateParams {
  currentView: HubView
  currentAppId: string | null
  isLoadingApps: boolean
  loadAppById: (appId: string, filePath?: string) => Promise<unknown | null>
  setSelectedAppId: (id: string | null) => void
  setCurrentView: (view: HubView) => void
  activeSection: SidebarSection
  setActiveSection: (section: SidebarSection) => void
  /** Called when loading app from URL fails (app not found or access denied) */
  onLoadFailed?: (appId: string) => void
}

export interface UseSpreadsheetAppsHubUrlStateReturn {
  updateUrl: (appId: string | null, view?: HubView, filePath?: string | null) => void
  resetLoadAttempt: () => void
}

function getUrlParams(): {
  appId: string | null
  filePath: string | null
  view: HubView | null
  section: SidebarSection | null
} {
  const urlParams = new URLSearchParams(window.location.search)
  return {
    appId: urlParams.get('appId'),
    filePath: urlParams.get('filePath'),
    view: (urlParams.get('view') as HubView | null) || null,
    section: (urlParams.get('section') as SidebarSection | null) || null
  }
}

export function useSpreadsheetAppsHubUrlState(
  params: UseSpreadsheetAppsHubUrlStateParams
): UseSpreadsheetAppsHubUrlStateReturn {
  const {
    currentView,
    currentAppId,
    isLoadingApps,
    loadAppById,
    setSelectedAppId,
    setCurrentView,
    activeSection,
    setActiveSection,
    onLoadFailed
  } = params

  const loadAttemptedRef = useRef<string | null>(null)
  const cameFromDeskRef = useRef(false)

  const updateUrl = useCallback(
    (appId: string | null, view?: HubView, filePath?: string | null) => {
      const urlParams = new URLSearchParams(window.location.search)
      if (appId) {
        urlParams.set('appId', appId)
        if (view) urlParams.set('view', view)
        if (filePath) {
          urlParams.set('filePath', encodeURIComponent(filePath))
        } else {
          // Avoid carrying stale filePath from previous app URL state.
          urlParams.delete('filePath')
        }
      } else {
        urlParams.delete('appId')
        urlParams.delete('view')
        urlParams.delete('filePath')
      }
      // Always preserve section in URL (even when no app is selected)
      if (activeSection && activeSection !== 'my-files') {
        urlParams.set('section', activeSection)
      } else {
        urlParams.delete('section')
      }
      const newUrl = urlParams.toString()
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname
      window.history.pushState({ appId, view, filePath, section: activeSection }, '', newUrl)
    },
    [activeSection]
  )

  const resetLoadAttempt = useCallback(() => {
    loadAttemptedRef.current = null
  }, [])

  // Restore section from URL on mount
  useEffect(() => {
    const { section } = getUrlParams()
    if (section && section !== activeSection) {
      setActiveSection(section)
    }
  }, []) // Run only on mount

  // Load app from URL on mount.
  useEffect(() => {
    const { appId, filePath, view } = getUrlParams()
    if (!appId) return
    if (currentAppId) return
    if (isLoadingApps) return
    if (loadAttemptedRef.current === appId) return

    loadAttemptedRef.current = appId

    const loadFromUrl = async () => {
      const decodedFilePath = filePath ? decodeURIComponent(filePath) : undefined
      let app = await loadAppById(appId, decodedFilePath)

      // Retry once without filePath in case URL carries an outdated path.
      if (!app && decodedFilePath) {
        app = await loadAppById(appId)
      }

      if (!app) {
        onLoadFailed?.(appId)
        return
      }

      setSelectedAppId(appId)
      setCurrentView(view === 'editor' ? 'editor' : 'viewer')
    }

    void loadFromUrl()
  }, [currentAppId, isLoadingApps, loadAppById, setCurrentView, setSelectedAppId, onLoadFailed])

  // Track if we came from desk.
  useEffect(() => {
    const referrer = document.referrer
    const urlParams = new URLSearchParams(window.location.search)
    cameFromDeskRef.current =
      referrer.includes('/platform/apps/desk') ||
      referrer.includes('/platform/every-office') ||
      referrer.includes('?app=platform/apps/desk') ||
      referrer.includes('?app=platform/apps/every-office') ||
      urlParams.get('from') === 'desk'

    if (cameFromDeskRef.current && currentView === 'list') {
      window.history.replaceState({ fromDesk: true }, '', window.location.href)
    }
  }, [currentView])

  // Handle browser back/forward navigation.
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as {
        appId?: string
        view?: HubView
        section?: SidebarSection
        fromDesk?: boolean
      } | null

      // Check if we should return to a space instead of the hub
      // This happens when going back from a spreadsheet/hub that was opened from a space
      if (!state?.appId) {
        // First, check for stored space return URL
        try {
          const spaceReturnUrl = sessionStorage.getItem('space_return_url')
          if (spaceReturnUrl) {
            sessionStorage.removeItem('space_return_url')
            window.location.href = spaceReturnUrl
            return
          }
        } catch (e) {
          console.warn('Failed to check space_return_url:', e)
        }

        // Second, check if current URL has a spaceId parameter
        // If so, we should return to that space
        const urlParams = new URLSearchParams(window.location.search)
        const spaceId = urlParams.get('spaceId')
        if (spaceId) {
          const isProduction = process.env.NODE_ENV === 'production'
          const spaceUrl = isProduction
            ? `/platform/spaces?spaceId=${encodeURIComponent(spaceId)}`
            : `/platform/apps/spaces?spaceId=${encodeURIComponent(spaceId)}`
          window.location.href = spaceUrl
          return
        }
      }

      // Restore section if present
      if (state?.section) {
        setActiveSection(state.section)
      }

      if (state?.fromDesk && !state?.appId && currentView === 'list') {
        navigateTo('/platform/every-office')
        return
      }

      if (state?.appId) {
        loadAppById(state.appId).then(app => {
          if (!app) {
            onLoadFailed?.(state.appId)
            return
          }
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
  }, [currentView, loadAppById, setCurrentView, setSelectedAppId, setActiveSection, onLoadFailed])

  return { updateUrl, resetLoadAttempt }
}

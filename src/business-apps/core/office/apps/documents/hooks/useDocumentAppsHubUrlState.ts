import { useCallback, useEffect, useRef, useState } from 'react'
import { navigateTo } from '@/common/utils/navigationUtils'

type HubView = 'list' | 'upload' | 'upload-pdf' | 'upload-odf' | 'editor' | 'review' | 'templates' | 'trash'
type SidebarSection = 'home' | 'my-documents' | 'shared' | 'templates' | 'favorites' | 'recent' | 'trash'

interface HubUrlParams {
  docId: string | null
  view: HubView | null
  version: string | null
  section: SidebarSection | null
}

export interface UseDocumentAppsHubUrlStateParams {
  currentView: HubView
  currentDocumentId: string | null
  isLoadingDocument: boolean
  loadDocumentById: (id: string) => Promise<{ trashedAt?: string | null } | null>
  setCurrentView: (view: HubView) => void
  setSelectedDocumentId: (id: string | null) => void
  activeSection: SidebarSection
  setActiveSection: (section: SidebarSection) => void
}

export interface UseDocumentAppsHubUrlStateReturn {
  updateUrl: (
    docId: string | null,
    view?: HubView,
    sectionOverride?: SidebarSection | null,
    reviewVersion?: string | null
  ) => void
  resetLoadAttempt: () => void
}

interface BuildDocumentAppsHubUrlOptions {
  docId: string | null
  view?: HubView
  sectionOverride?: SidebarSection | null
  reviewVersion?: string | null
}

export function buildDocumentAppsHubUrl(
  pathname: string,
  search: string,
  options: BuildDocumentAppsHubUrlOptions
): { newUrl: string; state: { docId: string | null; view?: HubView; section?: SidebarSection; version?: string } } {
  const { docId, view, sectionOverride, reviewVersion } = options
  const urlParams = new URLSearchParams(search)

  if (docId) {
    urlParams.set('docId', docId)
    if (view) {
      urlParams.set('view', view)
    }

    if (view === 'review' && reviewVersion) {
      urlParams.set('version', reviewVersion)
    } else {
      urlParams.delete('version')
    }
  } else {
    urlParams.delete('docId')
    urlParams.delete('view')
    urlParams.delete('version')
  }

  if (sectionOverride && sectionOverride !== 'my-documents') {
    urlParams.set('section', sectionOverride)
  } else {
    urlParams.delete('section')
  }

  const nextSearch = urlParams.toString()

  return {
    newUrl: nextSearch ? `${pathname}?${nextSearch}` : pathname,
    state: {
      docId,
      view,
      ...(sectionOverride ? { section: sectionOverride } : {}),
      ...(view === 'review' && reviewVersion ? { version: reviewVersion } : {})
    }
  }
}

function getUrlParams(): HubUrlParams {
  const urlParams = new URLSearchParams(window.location.search)
  return {
    docId: urlParams.get('docId'),
    view: (urlParams.get('view') as HubView | null) || null,
    version: urlParams.get('version'),
    section: (urlParams.get('section') as SidebarSection | null) || null
  }
}

export function useDocumentAppsHubUrlState(params: UseDocumentAppsHubUrlStateParams): UseDocumentAppsHubUrlStateReturn {
  const {
    currentView,
    currentDocumentId,
    isLoadingDocument,
    loadDocumentById,
    setCurrentView,
    setSelectedDocumentId,
    activeSection,
    setActiveSection
  } = params

  const loadAttemptedRef = useRef<string | null>(null)
  const cameFromDeskRef = useRef(false)
  // Capture initial URL params at render time before any effects can clear them
  const initialUrlParamsRef = useRef(getUrlParams())
  // Track URL search params to detect changes
  const [urlSearch, setUrlSearch] = useState(window.location.search)

  const updateUrl = useCallback(
    (docId: string | null, view?: HubView, sectionOverride?: SidebarSection | null, reviewVersion?: string | null) => {
      const nextSection = sectionOverride === undefined ? activeSection : sectionOverride
      const { newUrl, state } = buildDocumentAppsHubUrl(window.location.pathname, window.location.search, {
        docId,
        view,
        sectionOverride: nextSection,
        reviewVersion
      })
      window.history.pushState(state, '', newUrl)
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

  // Track URL changes from navigation (e.g., from every-office)
  useEffect(() => {
    const checkUrlChange = () => {
      if (window.location.search !== urlSearch) {
        setUrlSearch(window.location.search)
      }
    }

    // Check on interval for URL changes (for programmatic navigation)
    const interval = setInterval(checkUrlChange, 100)
    return () => clearInterval(interval)
  }, [urlSearch])

  // Load document from URL on mount or when URL changes.
  // Uses initialDocIdRef as fallback since parent effects may clear URL params
  // before this effect runs (race condition with section-sync effect).
  useEffect(() => {
    const urlParams = getUrlParams()
    const docId = urlParams.docId || initialUrlParamsRef.current.docId
    const view = urlParams.view || initialUrlParamsRef.current.view
    const version = urlParams.version || initialUrlParamsRef.current.version
    if (!docId) return
    if (currentDocumentId === docId) return
    if (isLoadingDocument) return
    if (loadAttemptedRef.current === docId) return

    loadAttemptedRef.current = docId
    if (view === 'review' && version && urlParams.version !== version) {
      const restoredUrlParams = new URLSearchParams(window.location.search)
      restoredUrlParams.set('docId', docId)
      restoredUrlParams.set('view', 'review')
      restoredUrlParams.set('version', version)

      if (!restoredUrlParams.get('section') && initialUrlParamsRef.current.section) {
        restoredUrlParams.set('section', initialUrlParamsRef.current.section)
      }

      const restoredUrl = `${window.location.pathname}?${restoredUrlParams.toString()}`
      window.history.replaceState(window.history.state, '', restoredUrl)
      setUrlSearch(window.location.search)
    }

    initialUrlParamsRef.current = {
      docId: null,
      view: null,
      version: null,
      section: null
    }
    if (view === 'trash') {
      loadDocumentById(docId).then(doc => {
        if (!doc) {
          loadAttemptedRef.current = null
          return
        }
        setSelectedDocumentId(docId)
        setCurrentView(doc.trashedAt ? 'trash' : 'editor')
      })
      return
    }

    loadDocumentById(docId).then(doc => {
      if (!doc) {
        loadAttemptedRef.current = null
        return
      }
      setSelectedDocumentId(docId)
      setCurrentView(view === 'review' ? 'review' : 'editor')
    })
  }, [urlSearch, currentDocumentId, isLoadingDocument, loadDocumentById, setCurrentView, setSelectedDocumentId])

  // Track if we came from desk.
  useEffect(() => {
    const referrer = document.referrer
    const urlParams = new URLSearchParams(window.location.search)
    cameFromDeskRef.current =
      referrer.includes('/platform/every-office') ||
      referrer.includes('?app=platform/apps/desk') ||
      referrer.includes('?app=platform/apps/every-office') ||
      referrer.includes('?app=core/office/apps/office-launcher') ||
      urlParams.get('from') === 'desk'

    if (cameFromDeskRef.current && currentView === 'list') {
      window.history.replaceState({ fromDesk: true }, '', window.location.href)
    }
  }, [currentView])

  // Handle browser back/forward navigation.
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as {
        docId?: string
        view?: HubView
        section?: SidebarSection
        fromDesk?: boolean
      } | null

      // Check if we should return to a space instead of the hub
      // This happens when going back from a document/hub that was opened from a space
      if (!state?.docId) {
        // First, check for stored space return URL
        try {
          const spaceReturnUrl = sessionStorage.getItem('space_return_url')
          if (spaceReturnUrl) {
            sessionStorage.removeItem('space_return_url')
            navigateTo(spaceReturnUrl)
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
          const spaceUrl = `/platform/every-office/spaces?spaceId=${encodeURIComponent(spaceId)}`
          navigateTo(spaceUrl)
          return
        }
      }

      // Restore section if present
      if (state?.section) {
        setActiveSection(state.section)
      }

      // If we came from desk and there's no document, go back to desk.
      if (state?.fromDesk && !state?.docId && currentView === 'list') {
        navigateTo('/platform/every-office')
        return
      }

      if (state?.docId) {
        if (state.view === 'trash') {
          loadDocumentById(state.docId).then(doc => {
            if (!doc) return
            setSelectedDocumentId(state.docId!)
            setCurrentView(doc.trashedAt ? 'trash' : 'editor')
          })
          return
        }

        loadDocumentById(state.docId).then(doc => {
          if (!doc) return
          setSelectedDocumentId(state.docId!)
          setCurrentView(state.view === 'review' ? 'review' : state.view || 'editor')
        })
        return
      }

      setSelectedDocumentId(null)
      setCurrentView('list')
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [currentView, loadDocumentById, setCurrentView, setSelectedDocumentId, setActiveSection])

  return { updateUrl, resetLoadAttempt }
}

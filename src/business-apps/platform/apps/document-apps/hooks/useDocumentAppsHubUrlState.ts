import { useCallback, useEffect, useRef } from 'react'
import { navigateTo } from '@/common/utils/navigationUtils'

type HubView = 'list' | 'upload' | 'editor' | 'templates'
type SidebarSection = 'home' | 'my-documents' | 'shared' | 'templates' | 'favorites' | 'recent' | 'archived'

export interface UseDocumentAppsHubUrlStateParams {
  currentView: HubView
  currentDocumentId: string | null
  isLoadingDocument: boolean
  loadDocumentById: (id: string) => Promise<unknown | null>
  setCurrentView: (view: HubView) => void
  setSelectedDocumentId: (id: string | null) => void
  activeSection: SidebarSection
  setActiveSection: (section: SidebarSection) => void
}

export interface UseDocumentAppsHubUrlStateReturn {
  updateUrl: (docId: string | null, view?: HubView) => void
  resetLoadAttempt: () => void
}

function getUrlParams(): { docId: string | null; view: HubView | null; section: SidebarSection | null } {
  const urlParams = new URLSearchParams(window.location.search)
  return {
    docId: urlParams.get('docId'),
    view: (urlParams.get('view') as HubView | null) || null,
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

  const updateUrl = useCallback(
    (docId: string | null, view?: HubView) => {
      const urlParams = new URLSearchParams(window.location.search)
      if (docId) {
        urlParams.set('docId', docId)
        if (view) urlParams.set('view', view)
      } else {
        urlParams.delete('docId')
        urlParams.delete('view')
      }
      // Always preserve section in URL (even when no document is selected)
      if (activeSection && activeSection !== 'my-documents') {
        urlParams.set('section', activeSection)
      } else {
        urlParams.delete('section')
      }
      const newUrl = urlParams.toString()
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname
      window.history.pushState({ docId, view, section: activeSection }, '', newUrl)
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

  // Load document from URL on mount.
  useEffect(() => {
    const { docId, view } = getUrlParams()
    if (!docId) return
    if (currentDocumentId) return
    if (isLoadingDocument) return
    if (loadAttemptedRef.current === docId) return

    loadAttemptedRef.current = docId
    loadDocumentById(docId).then(doc => {
      if (!doc) return
      setSelectedDocumentId(docId)
      setCurrentView(view === 'editor' ? 'editor' : 'editor')
    })
  }, [currentDocumentId, isLoadingDocument, loadDocumentById, setCurrentView, setSelectedDocumentId])

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
        docId?: string
        view?: HubView
        section?: SidebarSection
        fromDesk?: boolean
      } | null

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
        loadDocumentById(state.docId).then(doc => {
          if (!doc) return
          setSelectedDocumentId(state.docId!)
          setCurrentView(state.view || 'editor')
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

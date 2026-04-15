import { useCallback, useEffect, useRef } from 'react'
import { navigateTo } from '@/common/utils/navigationUtils'

type HubView = 'list' | 'editor' | 'trash'
type SidebarSection = 'home' | 'my-notes' | 'shared' | 'pinned' | 'recent' | 'archived'

export interface UseNoteAppsHubUrlStateParams {
  currentView: HubView
  currentNoteId: string | null
  isLoadingNote: boolean
  loadNoteById: (id: string) => Promise<unknown | null>
  setCurrentView: (view: HubView) => void
  setSelectedNoteId: (id: string | null) => void
  activeSection: SidebarSection
  setActiveSection: (section: SidebarSection) => void
  treeParentId?: string | null
  setTreeParentId?: (id: string | null) => void
}

export interface UseNoteAppsHubUrlStateReturn {
  updateUrl: (noteId: string | null, view?: HubView) => void
  resetLoadAttempt: () => void
  initialParentId: string | null
}

function getUrlParams(): {
  noteId: string | null
  view: HubView | null
  section: SidebarSection | null
  parentId: string | null
} {
  const urlParams = new URLSearchParams(window.location.search)
  return {
    noteId: urlParams.get('noteId'),
    view: (urlParams.get('view') as HubView | null) || null,
    section: (urlParams.get('section') as SidebarSection | null) || null,
    parentId: urlParams.get('parentId')
  }
}

export function useNoteAppsHubUrlState(params: UseNoteAppsHubUrlStateParams): UseNoteAppsHubUrlStateReturn {
  const {
    currentView,
    currentNoteId,
    isLoadingNote,
    loadNoteById,
    setCurrentView,
    setSelectedNoteId,
    activeSection,
    setActiveSection
  } = params

  const loadAttemptedRef = useRef<string | null>(null)
  const cameFromDeskRef = useRef(false)
  const initialUrlParams = useRef(getUrlParams())
  const initialNoteIdRef = useRef(initialUrlParams.current.noteId)
  const initialViewRef = useRef(initialUrlParams.current.view)
  const initialParentId = initialUrlParams.current.parentId

  const updateUrl = useCallback(
    (noteId: string | null, view?: HubView) => {
      const urlParams = new URLSearchParams(window.location.search)
      if (noteId) {
        urlParams.set('noteId', noteId)
        if (view) urlParams.set('view', view)
      } else {
        urlParams.delete('noteId')
        urlParams.delete('view')
      }
      if (activeSection && activeSection !== 'my-notes') {
        urlParams.set('section', activeSection)
      } else {
        urlParams.delete('section')
      }
      if (params.treeParentId) {
        urlParams.set('parentId', params.treeParentId)
      } else {
        urlParams.delete('parentId')
      }
      const newUrl = urlParams.toString()
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname
      window.history.pushState({ noteId, view, section: activeSection, parentId: params.treeParentId }, '', newUrl)
    },
    [activeSection, params.treeParentId]
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

  // Load note from URL on mount.
  // Uses initialNoteIdRef as fallback since parent effects may clear URL params.
  useEffect(() => {
    const urlParams = getUrlParams()
    const noteId = urlParams.noteId || initialNoteIdRef.current
    const view = urlParams.view || initialViewRef.current
    if (!noteId) return
    if (currentNoteId) return
    if (isLoadingNote) return
    if (loadAttemptedRef.current === noteId) return

    loadAttemptedRef.current = noteId
    initialNoteIdRef.current = null
    initialViewRef.current = null
    if (view === 'trash') {
      setSelectedNoteId(noteId)
      setCurrentView('trash')
      return
    }

    loadNoteById(noteId).then(note => {
      if (!note) {
        loadAttemptedRef.current = null
        return
      }
      setSelectedNoteId(noteId)
      setCurrentView(view === 'editor' ? 'editor' : 'editor')
    })
  }, [currentNoteId, isLoadingNote, loadNoteById, setCurrentView, setSelectedNoteId])

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
        noteId?: string
        view?: HubView
        section?: SidebarSection
        fromDesk?: boolean
      } | null

      // Check if we should return to a space instead of the hub
      // This happens when going back from a note/hub that was opened from a space
      if (!state?.noteId) {
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

      if (state?.fromDesk && !state?.noteId && currentView === 'list') {
        navigateTo('/platform/every-office')
        return
      }

      if (state?.noteId) {
        if (state.view === 'trash') {
          setSelectedNoteId(state.noteId)
          setCurrentView('trash')
          return
        }

        loadNoteById(state.noteId).then(note => {
          if (!note) return
          setSelectedNoteId(state.noteId!)
          setCurrentView(state.view || 'editor')
        })
        return
      }

      setSelectedNoteId(null)
      setCurrentView('list')
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [currentView, loadNoteById, setCurrentView, setSelectedNoteId, setActiveSection])

  return { updateUrl, resetLoadAttempt, initialParentId }
}

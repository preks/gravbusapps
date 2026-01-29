import { useCallback, useEffect, useRef } from 'react'
import { navigateTo } from '@/common/utils/navigationUtils'

type HubView = 'list' | 'editor'

export interface UseNoteAppsHubUrlStateParams {
  currentView: HubView
  currentNoteId: string | null
  isLoadingNote: boolean
  loadNoteById: (id: string) => Promise<unknown | null>
  setCurrentView: (view: HubView) => void
  setSelectedNoteId: (id: string | null) => void
}

export interface UseNoteAppsHubUrlStateReturn {
  updateUrl: (noteId: string | null, view?: HubView) => void
  resetLoadAttempt: () => void
}

function getUrlParams(): { noteId: string | null; view: HubView | null } {
  const urlParams = new URLSearchParams(window.location.search)
  return {
    noteId: urlParams.get('noteId'),
    view: (urlParams.get('view') as HubView | null) || null
  }
}

export function useNoteAppsHubUrlState(params: UseNoteAppsHubUrlStateParams): UseNoteAppsHubUrlStateReturn {
  const { currentView, currentNoteId, isLoadingNote, loadNoteById, setCurrentView, setSelectedNoteId } = params

  const loadAttemptedRef = useRef<string | null>(null)
  const cameFromDeskRef = useRef(false)

  const updateUrl = useCallback((noteId: string | null, view?: HubView) => {
    const urlParams = new URLSearchParams(window.location.search)
    if (noteId) {
      urlParams.set('noteId', noteId)
      if (view) urlParams.set('view', view)
    } else {
      urlParams.delete('noteId')
      urlParams.delete('view')
    }
    const newUrl = urlParams.toString()
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname
    window.history.pushState({ noteId, view }, '', newUrl)
  }, [])

  const resetLoadAttempt = useCallback(() => {
    loadAttemptedRef.current = null
  }, [])

  // Load note from URL on mount.
  useEffect(() => {
    const { noteId, view } = getUrlParams()
    if (!noteId) return
    if (currentNoteId) return
    if (isLoadingNote) return
    if (loadAttemptedRef.current === noteId) return

    loadAttemptedRef.current = noteId
    loadNoteById(noteId).then(note => {
      if (!note) return
      setSelectedNoteId(noteId)
      setCurrentView(view === 'editor' ? 'editor' : 'editor')
    })
  }, [currentNoteId, isLoadingNote, loadNoteById, setCurrentView, setSelectedNoteId])

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
      const state = event.state as { noteId?: string; view?: HubView; fromDesk?: boolean } | null

      if (state?.fromDesk && !state?.noteId && currentView === 'list') {
        navigateTo(process.env.NODE_ENV === 'production' ? '/platform/desk' : '/platform/apps/desk')
        return
      }

      if (state?.noteId) {
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
  }, [currentView, loadNoteById, setCurrentView, setSelectedNoteId])

  return { updateUrl, resetLoadAttempt }
}

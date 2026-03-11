import { useCallback, useEffect, useRef } from 'react'
import { navigateTo } from '@/common/utils/navigationUtils'

type HubView = 'list' | 'editor'
type SidebarSection = 'home' | 'my-slides' | 'shared' | 'favorites' | 'recent' | 'archived'

export interface UseSlidesHubUrlStateParams {
  currentView: HubView
  currentSlideId: string | null
  isLoadingSlide: boolean
  loadSlideById: (id: string) => Promise<unknown | null>
  setCurrentView: (view: HubView) => void
  setSelectedSlideId: (id: string | null) => void
  activeSection: SidebarSection
  setActiveSection: (section: SidebarSection) => void
}

export interface UseSlidesHubUrlStateReturn {
  updateUrl: (slideId: string | null, view?: HubView) => void
  resetLoadAttempt: () => void
}

function getUrlParams(): { slideId: string | null; view: HubView | null; section: SidebarSection | null } {
  const urlParams = new URLSearchParams(window.location.search)
  return {
    slideId: urlParams.get('slideId'),
    view: (urlParams.get('view') as HubView | null) || null,
    section: (urlParams.get('section') as SidebarSection | null) || null
  }
}

export function useSlidesHubUrlState(params: UseSlidesHubUrlStateParams): UseSlidesHubUrlStateReturn {
  const {
    currentView,
    currentSlideId,
    isLoadingSlide,
    loadSlideById,
    setCurrentView,
    setSelectedSlideId,
    activeSection,
    setActiveSection
  } = params

  const loadAttemptedRef = useRef<string | null>(null)
  const cameFromDeskRef = useRef(false)
  const initialSlideIdRef = useRef(getUrlParams().slideId)
  const initialViewRef = useRef(getUrlParams().view)

  const updateUrl = useCallback(
    (slideId: string | null, view?: HubView) => {
      const urlParams = new URLSearchParams(window.location.search)
      if (slideId) {
        urlParams.set('slideId', slideId)
        if (view) urlParams.set('view', view)
      } else {
        urlParams.delete('slideId')
        urlParams.delete('view')
      }
      // Always preserve section in URL (even when no slide is selected)
      if (activeSection && activeSection !== 'my-slides') {
        urlParams.set('section', activeSection)
      } else {
        urlParams.delete('section')
      }
      const newUrl = urlParams.toString()
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname
      window.history.pushState({ slideId, view, section: activeSection }, '', newUrl)
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

  // Load slide from URL on mount.
  // Uses initialSlideIdRef as fallback since parent effects may clear URL params.
  useEffect(() => {
    const urlParams = getUrlParams()
    const slideId = urlParams.slideId || initialSlideIdRef.current
    const view = urlParams.view || initialViewRef.current
    if (!slideId) return
    if (currentSlideId) return
    if (isLoadingSlide) return
    if (loadAttemptedRef.current === slideId) return

    loadAttemptedRef.current = slideId
    initialSlideIdRef.current = null
    initialViewRef.current = null
    loadSlideById(slideId).then(slide => {
      if (!slide) {
        loadAttemptedRef.current = null
        return
      }
      setSelectedSlideId(slideId)
      setCurrentView(view === 'editor' ? 'editor' : 'editor')
    })
  }, [currentSlideId, isLoadingSlide, loadSlideById, setCurrentView, setSelectedSlideId])

  // Track if we came from desk
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

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as {
        slideId?: string
        view?: HubView
        section?: SidebarSection
        fromDesk?: boolean
      } | null

      // Restore section if present
      if (state?.section) {
        setActiveSection(state.section)
      }

      // If we came from desk and there's no slide, go back to desk
      if (state?.fromDesk && !state?.slideId && currentView === 'list') {
        navigateTo('/platform/every-office')
        return
      }

      if (state?.slideId) {
        loadSlideById(state.slideId).then(slide => {
          if (!slide) return
          setSelectedSlideId(state.slideId!)
          setCurrentView(state.view || 'editor')
        })
        return
      }

      setSelectedSlideId(null)
      setCurrentView('list')
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [currentView, loadSlideById, setCurrentView, setSelectedSlideId, setActiveSection])

  return { updateUrl, resetLoadAttempt }
}

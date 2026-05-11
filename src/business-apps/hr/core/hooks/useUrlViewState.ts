import { useCallback, useEffect, useMemo, useState } from 'react'

interface ViewOptionLike {
  key: string
}

interface UseUrlViewStateOptions<TViewOption extends ViewOptionLike> {
  viewOptions: TViewOption[]
  defaultTabByView?: Record<string, string>
}

interface UseUrlViewStateResult {
  activeView: string
  onViewChange: (nextView: string) => void
}

export function useUrlViewState<TViewOption extends ViewOptionLike>({
  viewOptions,
  defaultTabByView
}: UseUrlViewStateOptions<TViewOption>): UseUrlViewStateResult {
  const viewKeys = useMemo(() => viewOptions.map(option => option.key), [viewOptions])
  const defaultViewKey = viewKeys[0] ?? ''

  const applyViewToUrl = useCallback(
    (view: string) => {
      const urlParams = new URLSearchParams(globalThis.location.search)
      urlParams.set('view', view)
      urlParams.delete('tab')
      urlParams.delete('content')

      const defaultTab = defaultTabByView?.[view]
      if (defaultTab) {
        urlParams.set('tab', defaultTab)
      }

      const newUrl = `${globalThis.location.pathname}?${urlParams.toString()}`
      globalThis.history.replaceState({}, '', newUrl)
    },
    [defaultTabByView]
  )

  const getInitialView = useCallback(() => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    const viewFromUrl = urlParams.get('view')

    if (viewFromUrl && viewKeys.includes(viewFromUrl)) {
      return viewFromUrl
    }

    return defaultViewKey
  }, [defaultViewKey, viewKeys])

  const [activeView, setActiveView] = useState<string>(getInitialView)

  const onViewChange = useCallback(
    (nextView: string) => {
      if (!nextView || nextView === activeView) {
        return
      }

      setActiveView(nextView)
      applyViewToUrl(nextView)
    },
    [activeView, applyViewToUrl]
  )

  useEffect(() => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    const currentView = urlParams.get('view')

    if (!currentView) {
      applyViewToUrl(activeView)
      return
    }

    const defaultTab = defaultTabByView?.[currentView]
    if (defaultTab && !urlParams.has('tab')) {
      urlParams.set('tab', defaultTab)
      const newUrl = `${globalThis.location.pathname}?${urlParams.toString()}`
      globalThis.history.replaceState({}, '', newUrl)
    }
  }, [activeView, applyViewToUrl, defaultTabByView])

  useEffect(() => {
    const handlePopState = () => {
      setActiveView(getInitialView())
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [getInitialView])

  return {
    activeView,
    onViewChange
  }
}

import { useEffect } from 'react'

interface UseWhiteboardHubUrlStateOptions {
  currentView: 'list' | 'editor'
  selectedWhiteboardId: string | null
}

/** Keeps `?whiteboardId=` in sync while editing so refresh restores the editor. */
export function useWhiteboardHubUrlState(options: UseWhiteboardHubUrlStateOptions) {
  const { currentView, selectedWhiteboardId } = options

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (currentView === 'editor' && selectedWhiteboardId) {
      params.set('whiteboardId', selectedWhiteboardId)
    } else {
      params.delete('whiteboardId')
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState(null, '', newUrl)
  }, [currentView, selectedWhiteboardId])
}

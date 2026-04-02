import { useState, useCallback } from 'react'

const STORAGE_KEY = 'whiteboard-hub-favorites'

export function useWhiteboardHubFavorites() {
  const [favorites, setFavoritesState] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  })

  const setFavorites = useCallback((next: Set<string>) => {
    setFavoritesState(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
    } catch {
      // Ignore storage errors
    }
  }, [])

  const toggleFavorite = useCallback(
    (id: string) => {
      const next = new Set(favorites)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      setFavorites(next)
    },
    [favorites, setFavorites]
  )

  return { favorites, setFavorites, toggleFavorite }
}

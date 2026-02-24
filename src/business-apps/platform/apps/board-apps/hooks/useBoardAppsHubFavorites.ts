import { useEffect, useState } from 'react'

export interface UseBoardAppsHubFavoritesParams {
  storageKey?: string
}

export interface UseBoardAppsHubFavoritesReturn {
  favorites: Set<string>
  setFavorites: React.Dispatch<React.SetStateAction<Set<string>>>
}

function readFavoritesFromStorage(storageKey: string): Set<string> {
  try {
    const saved = localStorage.getItem(storageKey)
    return saved ? new Set(JSON.parse(saved)) : new Set()
  } catch {
    return new Set()
  }
}

export function useBoardAppsHubFavorites(params: UseBoardAppsHubFavoritesParams = {}): UseBoardAppsHubFavoritesReturn {
  const { storageKey = 'board-favorites' } = params

  const [favorites, setFavorites] = useState<Set<string>>(() => readFavoritesFromStorage(storageKey))

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(Array.from(favorites)))
  }, [favorites, storageKey])

  return { favorites, setFavorites }
}

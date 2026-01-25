import { useEffect, useState } from 'react'

export interface UseSpreadsheetAppsHubFavoritesParams {
  storageKey?: string
}

export interface UseSpreadsheetAppsHubFavoritesReturn {
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

export function useSpreadsheetAppsHubFavorites(
  params: UseSpreadsheetAppsHubFavoritesParams = {}
): UseSpreadsheetAppsHubFavoritesReturn {
  const { storageKey = 'spreadsheet-favorites' } = params
  const [favorites, setFavorites] = useState<Set<string>>(() => readFavoritesFromStorage(storageKey))

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify([...favorites]))
  }, [favorites, storageKey])

  return { favorites, setFavorites }
}

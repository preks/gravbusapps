import { useState, useEffect, useCallback } from 'react'
import { getDocumentServiceApiUrl } from '../utils/documentServiceUrl'

const API_URL = getDocumentServiceApiUrl()

interface DriveFavorite {
  id: string
  userId: string
  entityType: string
  entityId: string
  createdAt: string
}

interface UseDriveFavoritesParams {
  accessToken: string | undefined
  entityType: string
}

interface UseDriveFavoritesReturn {
  favorites: Set<string>
  setFavorites: React.Dispatch<React.SetStateAction<Set<string>>>
  toggleFavorite: (entityId: string) => Promise<void>
  isLoading: boolean
}

async function apiFetch<T>(endpoint: string, token: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...((options.headers as Record<string, string>) ?? {})
  }
  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers })
  if (!response.ok) return (options.method === 'DELETE' ? null : []) as T
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('text/html')) {
    console.warn(`[DriveFavorites] Endpoint returned HTML instead of JSON: ${endpoint}`)
    return (options.method === 'DELETE' ? null : []) as T
  }
  const text = await response.text()
  if (!text) return null as T
  try {
    return JSON.parse(text) as T
  } catch {
    console.warn(`[DriveFavorites] Invalid JSON from ${endpoint}:`, text.slice(0, 200))
    return (options.method === 'DELETE' ? null : []) as T
  }
}

export function useDriveFavorites({ accessToken, entityType }: UseDriveFavoritesParams): UseDriveFavoritesReturn {
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    setIsLoading(true)

    apiFetch<DriveFavorite[]>('/drive/favorites', accessToken)
      .then(favs => {
        if (cancelled) return
        const ids = new Set((favs ?? []).filter(f => f.entityType === entityType).map(f => f.entityId))
        setFavorites(ids)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, entityType])

  const toggleFavorite = useCallback(
    async (entityId: string) => {
      if (!accessToken) return
      const isFav = favorites.has(entityId)
      const optimistic = new Set(favorites)
      if (isFav) optimistic.delete(entityId)
      else optimistic.add(entityId)
      setFavorites(optimistic)

      try {
        if (isFav) {
          await apiFetch<void>(`/drive/favorites/${entityType}/${entityId}`, accessToken, { method: 'DELETE' })
        } else {
          await apiFetch<DriveFavorite>('/drive/favorites', accessToken, {
            method: 'POST',
            body: JSON.stringify({ entityType, entityId })
          })
        }
      } catch {
        setFavorites(favorites)
      }
    },
    [accessToken, entityType, favorites]
  )

  return { favorites, setFavorites, toggleFavorite, isLoading }
}

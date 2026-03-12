import { useDriveFavorites } from '@/business-apps/platform/apps/shared/hooks/useDriveFavorites'

export interface UseNoteAppsHubFavoritesParams {
  accessToken?: string
  storageKey?: string
}

export interface UseNoteAppsHubFavoritesReturn {
  favorites: Set<string>
  setFavorites: React.Dispatch<React.SetStateAction<Set<string>>>
  toggleFavorite: (entityId: string) => Promise<void>
}

export function useNoteAppsHubFavorites(params: UseNoteAppsHubFavoritesParams = {}): UseNoteAppsHubFavoritesReturn {
  const { favorites, setFavorites, toggleFavorite } = useDriveFavorites({
    accessToken: params.accessToken,
    entityType: 'note'
  })

  return { favorites, setFavorites, toggleFavorite }
}

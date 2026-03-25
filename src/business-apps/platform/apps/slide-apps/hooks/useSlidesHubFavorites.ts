import { useDriveFavorites } from '@/business-apps/platform/apps/shared/hooks/useDriveFavorites'

export interface UseSlidesHubFavoritesParams {
  accessToken?: string
  storageKey?: string
}

export interface UseSlidesHubFavoritesReturn {
  favorites: Set<string>
  setFavorites: React.Dispatch<React.SetStateAction<Set<string>>>
  toggleFavorite: (entityId: string) => Promise<void>
}

export function useSlidesHubFavorites(params: UseSlidesHubFavoritesParams = {}): UseSlidesHubFavoritesReturn {
  const { favorites, setFavorites, toggleFavorite } = useDriveFavorites({
    accessToken: params.accessToken,
    entityType: 'slide'
  })

  return { favorites, setFavorites, toggleFavorite }
}

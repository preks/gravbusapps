import { useDriveFavorites } from '@/business-apps/platform/apps/shared/hooks/useDriveFavorites'

export interface UseBoardAppsHubFavoritesParams {
  accessToken?: string
  storageKey?: string
}

export interface UseBoardAppsHubFavoritesReturn {
  favorites: Set<string>
  setFavorites: React.Dispatch<React.SetStateAction<Set<string>>>
  toggleFavorite: (entityId: string) => Promise<void>
}

export function useBoardAppsHubFavorites(params: UseBoardAppsHubFavoritesParams = {}): UseBoardAppsHubFavoritesReturn {
  const { favorites, setFavorites, toggleFavorite } = useDriveFavorites({
    accessToken: params.accessToken,
    entityType: 'spreadsheet_app'
  })

  return { favorites, setFavorites, toggleFavorite }
}

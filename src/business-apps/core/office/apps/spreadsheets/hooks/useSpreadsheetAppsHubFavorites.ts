import { useDriveFavorites } from '@/business-apps/platform/apps/shared/hooks/useDriveFavorites'

export interface UseSpreadsheetAppsHubFavoritesParams {
  accessToken?: string
  storageKey?: string
}

export interface UseSpreadsheetAppsHubFavoritesReturn {
  favorites: Set<string>
  setFavorites: React.Dispatch<React.SetStateAction<Set<string>>>
  toggleFavorite: (entityId: string) => Promise<void>
}

export function useSpreadsheetAppsHubFavorites(
  params: UseSpreadsheetAppsHubFavoritesParams = {}
): UseSpreadsheetAppsHubFavoritesReturn {
  const { favorites, setFavorites, toggleFavorite } = useDriveFavorites({
    accessToken: params.accessToken,
    entityType: 'spreadsheet_app'
  })

  return { favorites, setFavorites, toggleFavorite }
}

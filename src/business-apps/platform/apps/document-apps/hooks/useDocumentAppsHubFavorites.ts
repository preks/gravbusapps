import { useDriveFavorites } from '@/business-apps/platform/apps/shared/hooks/useDriveFavorites'

export interface UseDocumentAppsHubFavoritesParams {
  accessToken?: string
  storageKey?: string
}

export interface UseDocumentAppsHubFavoritesReturn {
  favorites: Set<string>
  setFavorites: React.Dispatch<React.SetStateAction<Set<string>>>
  toggleFavorite: (entityId: string) => Promise<void>
}

export function useDocumentAppsHubFavorites(
  params: UseDocumentAppsHubFavoritesParams = {}
): UseDocumentAppsHubFavoritesReturn {
  const { favorites, setFavorites, toggleFavorite } = useDriveFavorites({
    accessToken: params.accessToken,
    entityType: 'document'
  })

  return { favorites, setFavorites, toggleFavorite }
}

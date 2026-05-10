import { useDriveFavorites } from '@/business-apps/platform/apps/shared/hooks/useDriveFavorites'

interface UseWhiteboardHubFavoritesParams {
  accessToken?: string
}

export function useWhiteboardHubFavorites(params: UseWhiteboardHubFavoritesParams = {}) {
  const { favorites, setFavorites, toggleFavorite } = useDriveFavorites({
    accessToken: params.accessToken,
    entityType: 'whiteboard'
  })

  return { favorites, setFavorites, toggleFavorite }
}

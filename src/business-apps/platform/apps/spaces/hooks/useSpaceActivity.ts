/**
 * useSpaceActivity Hook
 *
 * Hook for fetching space activity feed
 */

import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { SpaceActivity } from '../types/space.types'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import translations from '../_i18n'

const API_URL = getDocumentServiceApiUrl()

export interface UseSpaceActivityResult {
  activities: SpaceActivity[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useSpaceActivity(
  spaceId: string | null,
  accessToken: string | undefined,
  limit = 50
): UseSpaceActivityResult {
  const { t } = useTranslation(translations)
  const [activities, setActivities] = useState<SpaceActivity[]>([])
  const [isLoading, setIsLoading] = useState(!!spaceId)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!spaceId || !accessToken) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const url = `${API_URL}/spaces/${spaceId}/activity?limit=${limit}`
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        // Activity endpoint may not exist yet, just return empty
        setActivities([])
        return
      }

      const data = await response.json()
      setActivities(Array.isArray(data) ? data : [])
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error-load-space-activity')
      setError(message)
      console.error('[useSpaceActivity] Error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, limit, spaceId, t])

  useEffect(() => {
    if (spaceId && accessToken) {
      refresh()
    }
  }, [spaceId, accessToken, refresh])

  return {
    activities,
    isLoading,
    error,
    refresh
  }
}

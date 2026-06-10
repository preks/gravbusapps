import { useCallback, useEffect, useState } from 'react'
import { useChatClient } from '@/common/network/chat/useChatClient'
import { getDefaultCalendarColor } from '../utils/calendarColors'

interface CurrentUserPreferenceResponse {
  myCalendarColor?: string | null
}

interface UsePersonalCalendarColorPreferenceResult {
  color: string
  hasColorOverride: boolean
  isLoading: boolean
  isSaving: boolean
  error: string | null
  refresh: () => Promise<void>
  updateColor: (nextColor: string | null) => Promise<void>
}

export function usePersonalCalendarColorPreference(accessToken: string): UsePersonalCalendarColorPreferenceResult {
  const apiClient = useChatClient(accessToken)
  const [color, setColor] = useState(getDefaultCalendarColor())
  const [hasColorOverride, setHasColorOverride] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.getCurrentUser<CurrentUserPreferenceResponse>()
      setColor(response.myCalendarColor || getDefaultCalendarColor())
      setHasColorOverride(response.myCalendarColor != null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load personal calendar color')
    } finally {
      setIsLoading(false)
    }
  }, [apiClient])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const updateColor = useCallback(
    async (nextColor: string | null) => {
      const optimisticColor = nextColor || getDefaultCalendarColor()
      const nextHasColorOverride = nextColor !== null

      if (optimisticColor === color && nextHasColorOverride === hasColorOverride) {
        return
      }

      const previousColor = color
      const previousHasColorOverride = hasColorOverride
      setColor(optimisticColor)
      setHasColorOverride(nextHasColorOverride)
      setIsSaving(true)
      setError(null)

      try {
        const response = await apiClient.updateCurrentUserPreferences<CurrentUserPreferenceResponse>({
          myCalendarColor: nextColor
        })
        setColor(response.myCalendarColor || getDefaultCalendarColor())
        setHasColorOverride(response.myCalendarColor != null)
      } catch (err) {
        setColor(previousColor)
        setHasColorOverride(previousHasColorOverride)
        setError(err instanceof Error ? err.message : 'Failed to update personal calendar color')
        throw err
      } finally {
        setIsSaving(false)
      }
    },
    [apiClient, color, hasColorOverride]
  )

  return {
    color,
    hasColorOverride,
    isLoading,
    isSaving,
    error,
    refresh,
    updateColor
  }
}

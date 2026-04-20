/**
 * useLinkedSharedCalendar Hook
 *
 * Finds a shared calendar that was created for the same organizational dimension as a space.
 * This enables linking spaces to their shared calendars.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { useChatClient } from '@/common/network/chat/useChatClient'
import type { SpaceDimension, LinkedCalendar } from '../types/space.types'
import translations from '../_i18n'

export interface UseLinkedSharedCalendarResult {
  calendar: LinkedCalendar | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useLinkedSharedCalendar(
  dimension: SpaceDimension | undefined,
  accessToken: string | undefined
): UseLinkedSharedCalendarResult {
  const { t } = useTranslation(translations)
  const chatClient = useChatClient(accessToken)
  const [calendar, setCalendar] = useState<LinkedCalendar | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastQueryRef = useRef<string | null>(null)

  const fetchLinkedCalendar = useCallback(async () => {
    if (!dimension || !accessToken) {
      setCalendar(null)
      setIsLoading(false)
      return
    }

    const queryKey = `${dimension.type}:${dimension.id}`
    if (lastQueryRef.current === queryKey && calendar) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await chatClient.getCalendars<{ calendars: LinkedCalendar[] }>({
        contextEntity: dimension.type,
        contextEntityId: dimension.id
      })

      const calendars = response?.calendars || []
      const matchingCalendars = calendars.filter(
        linkedCalendar =>
          linkedCalendar.type === 'shared' &&
          linkedCalendar.contextEntity === dimension.type &&
          linkedCalendar.contextEntityId === dimension.id
      )

      const preferredCalendar =
        matchingCalendars.find(linkedCalendar => linkedCalendar.canEdit) || matchingCalendars[0] || null

      setCalendar(preferredCalendar)
      lastQueryRef.current = queryKey
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error-load-linked-calendar')
      setError(message)
      setCalendar(null)
      console.error('[useLinkedSharedCalendar] Error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, calendar, chatClient, dimension, t])

  const refresh = useCallback(async () => {
    lastQueryRef.current = null
    await fetchLinkedCalendar()
  }, [fetchLinkedCalendar])

  useEffect(() => {
    void fetchLinkedCalendar()
  }, [fetchLinkedCalendar])

  return {
    calendar,
    isLoading,
    error,
    refresh
  }
}

export default useLinkedSharedCalendar

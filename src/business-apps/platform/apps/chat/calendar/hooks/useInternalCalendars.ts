import { useCallback, useEffect, useState } from 'react'
import { useChatClient } from '@/common/network/chat/useChatClient'
import type { InternalCalendarSummary } from '../types'

interface UseInternalCalendarsResult {
  calendars: InternalCalendarSummary[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  applyCalendarColorPreference: (calendarId: string, nextColor: string | null) => void
  replaceCalendar: (calendar: InternalCalendarSummary) => void
}

export function useInternalCalendars(accessToken: string): UseInternalCalendarsResult {
  const apiClient = useChatClient(accessToken)
  const [calendars, setCalendars] = useState<InternalCalendarSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.getCalendars<{ calendars: InternalCalendarSummary[] }>()
      setCalendars(response.calendars || [])
    } catch (err) {
      console.error('Error loading internal calendars:', err)
      setError(err instanceof Error ? err.message : 'Failed to load internal calendars')
      setCalendars([])
    } finally {
      setIsLoading(false)
    }
  }, [apiClient])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const applyCalendarColorPreference = useCallback((calendarId: string, nextColor: string | null) => {
    setCalendars(currentCalendars =>
      currentCalendars.map(calendar => {
        if (calendar.id !== calendarId) {
          return calendar
        }

        const fallbackColor = calendar.defaultColor || calendar.color

        return {
          ...calendar,
          color: nextColor || fallbackColor,
          hasColorOverride: nextColor !== null
        }
      })
    )
  }, [])

  const replaceCalendar = useCallback((nextCalendar: InternalCalendarSummary) => {
    setCalendars(currentCalendars =>
      currentCalendars.map(calendar => (calendar.id === nextCalendar.id ? nextCalendar : calendar))
    )
  }, [])

  return {
    calendars,
    isLoading,
    error,
    refresh,
    applyCalendarColorPreference,
    replaceCalendar
  }
}

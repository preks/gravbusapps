import { useCallback, useEffect, useState } from 'react'
import { useChatClient } from '@/common/network/chat/useChatClient'
import {
  type CalendarLayout,
  type CalendarTimeScope,
  DEFAULT_CALENDAR_LAYOUT,
  DEFAULT_CALENDAR_TIME_SCOPE,
  parseCalendarLayout,
  parseCalendarTimeScope
} from '../types'

interface CurrentUserWithCalendarPrefs {
  calendarTimeScope?: string | null
  calendarLayout?: string | null
}

function pickPrefs(raw: CurrentUserWithCalendarPrefs): {
  timeScope: CalendarTimeScope
  calendarLayout: CalendarLayout
} {
  const scope = parseCalendarTimeScope(raw.calendarTimeScope) ?? DEFAULT_CALENDAR_TIME_SCOPE
  const layout = parseCalendarLayout(raw.calendarLayout) ?? DEFAULT_CALENDAR_LAYOUT
  return { timeScope: scope, calendarLayout: layout }
}

export interface UseCalendarViewPreferencesResult {
  timeScope: CalendarTimeScope
  calendarLayout: CalendarLayout
  setTimeScope: (next: CalendarTimeScope) => Promise<void>
  setCalendarLayout: (next: CalendarLayout) => Promise<void>
  isLoading: boolean
  isSaving: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useCalendarViewPreferences(accessToken: string): UseCalendarViewPreferencesResult {
  const apiClient = useChatClient(accessToken)
  const [timeScope, setTimeScope] = useState<CalendarTimeScope>(DEFAULT_CALENDAR_TIME_SCOPE)
  const [calendarLayout, setCalendarLayout] = useState<CalendarLayout>(DEFAULT_CALENDAR_LAYOUT)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.getCurrentUser<CurrentUserWithCalendarPrefs>()
      const next = pickPrefs(response)
      setTimeScope(next.timeScope)
      setCalendarLayout(next.calendarLayout)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar view preferences')
    } finally {
      setIsLoading(false)
    }
  }, [apiClient])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const setTimeScopePersisted = useCallback(
    async (next: CalendarTimeScope) => {
      if (next === timeScope) {
        return
      }

      const previous = timeScope
      setTimeScope(next)
      setIsSaving(true)
      setError(null)

      try {
        const response = await apiClient.updateCurrentUserPreferences<CurrentUserWithCalendarPrefs>({
          calendarTimeScope: next
        })
        const parsed = parseCalendarTimeScope(response.calendarTimeScope)
        if (parsed) {
          setTimeScope(parsed)
        }
      } catch (err) {
        setTimeScope(previous)
        setError(err instanceof Error ? err.message : 'Failed to save calendar view')
        throw err
      } finally {
        setIsSaving(false)
      }
    },
    [apiClient, timeScope]
  )

  const setCalendarLayoutPersisted = useCallback(
    async (next: CalendarLayout) => {
      if (next === calendarLayout) {
        return
      }

      const previous = calendarLayout
      setCalendarLayout(next)
      setIsSaving(true)
      setError(null)

      try {
        const response = await apiClient.updateCurrentUserPreferences<CurrentUserWithCalendarPrefs>({
          calendarLayout: next
        })
        const parsed = parseCalendarLayout(response.calendarLayout)
        if (parsed) {
          setCalendarLayout(parsed)
        }
      } catch (err) {
        setCalendarLayout(previous)
        setError(err instanceof Error ? err.message : 'Failed to save calendar layout')
        throw err
      } finally {
        setIsSaving(false)
      }
    },
    [apiClient, calendarLayout]
  )

  return {
    timeScope,
    calendarLayout,
    setTimeScope: setTimeScopePersisted,
    setCalendarLayout: setCalendarLayoutPersisted,
    isLoading,
    isSaving,
    error,
    refresh
  }
}

/**
 * useExternalCalendarEvents - Fetches calendar events from external email providers.
 * Merges events from all connected Microsoft/Google accounts for a given date range.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { EmailApiService } from '../services/EmailApiService'
import type { EmailAccount, ExternalCalendarEvent } from '../types'

interface UseExternalCalendarEventsOptions {
  accessToken: string | null
  accounts: EmailAccount[]
  startDate: Date | null
  endDate: Date | null
  enabled?: boolean
  /** Translation function for user-facing error messages */
  t?: (key: string, vars?: Record<string, string | number>) => string
}

export function useExternalCalendarEvents({
  accessToken,
  accounts,
  startDate,
  endDate,
  enabled = true,
  t
}: UseExternalCalendarEventsOptions) {
  const [events, setEvents] = useState<ExternalCalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchingRef = useRef(false)

  const fetchEvents = useCallback(async () => {
    if (!accessToken || !startDate || !endDate || !enabled) return
    if (fetchingRef.current) return

    // Only fetch from Microsoft and Google accounts that are active
    const calendarAccounts = accounts.filter(
      a =>
        (a.provider === 'microsoft' || a.provider === 'google') &&
        a.status === 'active' &&
        a.calendarSyncEnabled !== false // Default to enabled
    )

    if (calendarAccounts.length === 0) {
      setEvents([])
      return
    }

    fetchingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      EmailApiService.setAccessToken(accessToken)

      const startISO = startDate.toISOString()
      const endISO = endDate.toISOString()

      // Fetch from all accounts in parallel
      const results = await Promise.allSettled(
        calendarAccounts.map(account => EmailApiService.getCalendarEvents(account.id, startISO, endISO))
      )

      const allEvents: ExternalCalendarEvent[] = []

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allEvents.push(...result.value)
        } else {
          console.error(`Failed to fetch calendar events for ${calendarAccounts[index]?.emailAddress}:`, result.reason)
        }
      })

      // Sort by start time
      allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

      // Deduplicate by external ID (same event from different accounts)
      const seen = new Set<string>()
      const deduped = allEvents.filter(evt => {
        const key = `${evt.provider}_${evt.externalId}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      setEvents(deduped)
    } catch (err) {
      setError(t ? t('calendar-fetch-failed') : err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
      fetchingRef.current = false
    }
  }, [accessToken, accounts, startDate, endDate, enabled, t])

  // Fetch on mount and when date range changes
  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return {
    events,
    isLoading,
    error,
    refresh: fetchEvents
  }
}

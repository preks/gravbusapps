import { useEffect, useState } from 'react'
import { useChatClient } from '@/common/network/chat/useChatClient'

export interface WeekEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
}

interface RawCalendarEvent {
  id: string
  title: string
  start: string
  end: string
  allDay?: boolean
  status?: string
}

/**
 * Fetches the current user's calendar events for the given range from the chat
 * calendar API (the same source the EveryOne calendar uses), normalized to a
 * lightweight shape for the workplace week strip.
 */
export function useWeekEvents(accessToken: string | undefined, rangeStart: Date, rangeEnd: Date) {
  const client = useChatClient(accessToken)
  const [events, setEvents] = useState<WeekEvent[]>([])
  const [loading, setLoading] = useState(true)

  const startMs = rangeStart.getTime()
  const endMs = rangeEnd.getTime()

  useEffect(() => {
    if (!accessToken) {
      setEvents([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    client
      .getCalendarEvents<{ events: RawCalendarEvent[] }>(new Date(startMs).toISOString(), new Date(endMs).toISOString())
      .then(response => {
        if (cancelled) return
        const mapped = (response.events ?? [])
          .filter(event => event.status !== 'cancelled')
          .map(event => ({
            id: event.id,
            title: event.title,
            start: new Date(event.start),
            end: new Date(event.end),
            allDay: Boolean(event.allDay)
          }))
          .sort((a, b) => a.start.getTime() - b.start.getTime())
        setEvents(mapped)
      })
      .catch(() => {
        if (!cancelled) setEvents([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [client, accessToken, startMs, endMs])

  return { events, loading }
}

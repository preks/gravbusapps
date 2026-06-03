import { useState, useCallback, useEffect, useMemo } from 'react'
import { useLocale } from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import 'dayjs/locale/de'
import 'dayjs/locale/en'
import 'dayjs/locale/ro'
import { useChatClient } from '@/common/network/chat/useChatClient'
import type { ChatClient } from '@/common/network/chat/ChatClient'
import type {
  CalendarTimeScope,
  CalendarEvent,
  Meeting,
  DateRange,
  CreateMeetingData,
  UpdateMeetingData,
  InvitationResponse,
  InvitationStatus,
  MeetingParticipant,
  PendingInvitationGroup
} from '../types'
import { getDateRangeForTimeScope } from '../types'
import { useCreateMeeting } from './useCreateMeeting'
import { groupPendingInvitations } from '../utils/groupPendingInvitations'

dayjs.extend(localizedFormat)

interface UseCalendarOptions {
  accessToken: string
  timeScope: CalendarTimeScope
  /** External calendar events to merge with internal events */
  externalEvents?: CalendarEvent[]
  selectedCalendarIds?: string[]
  includePersonal?: boolean
}

interface UseCalendarReturn {
  // State
  currentDate: Date
  timeScope: CalendarTimeScope
  events: CalendarEvent[]
  pendingInvitations: Meeting[]
  pendingInvitationGroups: PendingInvitationGroup[]
  pendingInvitationsCount: number
  selectedEvent: CalendarEvent | null
  isLoading: boolean
  error: string | null

  // API client
  apiClient: ChatClient

  // Navigation
  setCurrentDate: (date: Date) => void
  goToToday: () => void
  goToPrevious: () => void
  goToNext: () => void

  // Event selection
  selectEvent: (event: CalendarEvent | null) => void

  // Meeting operations
  createMeeting: (data: CreateMeetingData) => Promise<Meeting>
  updateMeeting: (meetingId: string, data: UpdateMeetingData) => Promise<Meeting>
  cancelMeeting: (meetingId: string) => Promise<void>
  respondToInvitation: (meetingId: string, response: InvitationResponse) => Promise<void>
  respondToSeriesInvitation: (seriesRootId: string, response: InvitationResponse) => Promise<void>

  // Refresh
  refresh: () => Promise<void>
  refreshInvitations: () => Promise<void>
  applyCalendarColorLocally: (args: { calendarId?: string; color: string; isPersonal?: boolean }) => void

  // Computed
  dateRange: DateRange
  viewTitle: string
}

type CalendarEventResponse = Omit<CalendarEvent, 'start' | 'end' | 'recurrenceEndDate'> & {
  start: string | Date
  end: string | Date
  recurrenceEndDate?: string | Date
}

const parseOptionalDate = (value?: string | Date): Date | undefined => {
  if (!value) {
    return undefined
  }

  const parsedDate = value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate
}

const normalizeCalendarEvent = (event: CalendarEventResponse): CalendarEvent => ({
  ...event,
  start: event.start instanceof Date ? event.start : new Date(event.start),
  end: event.end instanceof Date ? event.end : new Date(event.end),
  recurrenceEndDate: parseOptionalDate(event.recurrenceEndDate)
})

export const useCalendar = ({
  accessToken,
  timeScope,
  externalEvents = [],
  selectedCalendarIds = [],
  includePersonal = true
}: UseCalendarOptions): UseCalendarReturn => {
  const { locale } = useLocale()
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [internalEvents, setInternalEvents] = useState<CalendarEvent[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<Meeting[]>([])
  const [pendingInvitationGroups, setPendingInvitationGroups] = useState<PendingInvitationGroup[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apiClient = useChatClient(accessToken)

  const dateRange = useMemo((): DateRange => getDateRangeForTimeScope(currentDate, timeScope), [currentDate, timeScope])

  const viewTitle = useMemo((): string => {
    const baseLocale = locale?.split('-')[0]?.toLowerCase() || 'en'

    switch (timeScope) {
      case 'day': {
        const dayFormat = baseLocale === 'de' || baseLocale === 'ro' ? 'dddd, DD. MMMM YYYY' : 'dddd, MMMM D, YYYY'
        return dayjs(currentDate).locale(baseLocale).format(dayFormat)
      }
      case 'threeDay':
      case 'workWeek':
      case 'week': {
        const rangeStart = dayjs(dateRange.start).locale(baseLocale)
        const rangeEnd = dayjs(dateRange.end).locale(baseLocale)

        if (baseLocale === 'de' || baseLocale === 'ro') {
          if (rangeStart.month() === rangeEnd.month()) {
            return `${rangeStart.format('DD.')} - ${rangeEnd.format('DD. MMMM YYYY')}`
          }
          return `${rangeStart.format('DD. MMM')} - ${rangeEnd.format('DD. MMM YYYY')}`
        }

        if (rangeStart.month() === rangeEnd.month()) {
          return `${rangeStart.format('MMMM D')} - ${rangeEnd.format('D, YYYY')}`
        }
        return `${rangeStart.format('MMM D')} - ${rangeEnd.format('MMM D, YYYY')}`
      }
      case 'month':
        return dayjs(currentDate).locale(baseLocale).format('MMMM YYYY')
      default:
        return dayjs(currentDate).locale(baseLocale).format('MMMM YYYY')
    }
  }, [currentDate, timeScope, dateRange, locale])

  const loadEvents = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.getCalendarEventsFiltered<{ events: CalendarEventResponse[] }>(
        dateRange.start.toISOString(),
        dateRange.end.toISOString(),
        {
          calendarIds: selectedCalendarIds,
          includePersonal
        }
      )
      const loadedEvents = (response.events || []).map(normalizeCalendarEvent)

      setInternalEvents(
        loadedEvents.map(evt => ({
          ...evt,
          source: 'internal' as const
        }))
      )
    } catch (err) {
      console.error('Error loading calendar events:', err)
      setError('Failed to load calendar events')
    } finally {
      setIsLoading(false)
    }
  }, [apiClient, dateRange, selectedCalendarIds, includePersonal])
  const createMeeting = useCreateMeeting(accessToken, loadEvents)

  const rangeStartMs = dateRange.start.getTime()
  const rangeEndMs = dateRange.end.getTime()
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    const start = new Date(rangeStartMs)
    const end = new Date(rangeEndMs)
    apiClient
      .getCalendarEventsFiltered<{ events: CalendarEventResponse[] }>(start.toISOString(), end.toISOString(), {
        calendarIds: selectedCalendarIds,
        includePersonal
      })
      .then(response => {
        if (cancelled) return
        const loadedEvents = (response.events || []).map(normalizeCalendarEvent)
        setInternalEvents(
          loadedEvents.map(evt => ({
            ...evt,
            source: 'internal' as const
          }))
        )
      })
      .catch(err => {
        if (!cancelled) {
          console.error('Error loading calendar events:', err)
          setError('Failed to load calendar events')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [apiClient, rangeStartMs, rangeEndMs, selectedCalendarIds, includePersonal])

  const events = useMemo(() => {
    const rangeStart = dateRange.start.getTime()
    const rangeEnd = dateRange.end.getTime()
    const filteredExternal = externalEvents.filter(evt => {
      const evtStart = evt.start.getTime()
      const evtEnd = evt.end.getTime()
      return evtStart < rangeEnd && evtEnd > rangeStart
    })

    const seenEventKeys = new Set<string>()
    const dedupedEvents = [...internalEvents, ...filteredExternal].filter(event => {
      const eventKey = `${event.source ?? 'internal'}:${event.id}:${event.calendarId ?? event.sourceId ?? ''}`

      if (seenEventKeys.has(eventKey)) {
        return false
      }

      seenEventKeys.add(eventKey)
      return true
    })

    return dedupedEvents
      .filter(event => event.status !== 'cancelled')
      .sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [internalEvents, externalEvents, dateRange])

  const loadInvitations = useCallback(async () => {
    try {
      const response = await apiClient.getPendingInvitations<{
        meetings: Meeting[]
        groups?: PendingInvitationGroup[]
      }>()
      const meetings = response.meetings || []
      const fallbackGroups = groupPendingInvitations(meetings)
      const hasCompleteBackendGroups =
        Array.isArray(response.groups) && response.groups.length === fallbackGroups.length
      setPendingInvitations(meetings)
      setPendingInvitationGroups(hasCompleteBackendGroups ? response.groups : fallbackGroups)
    } catch (err) {
      console.error('Error loading pending invitations:', err)
    }
  }, [apiClient])

  useEffect(() => {
    loadInvitations()
  }, [loadInvitations])

  const goToToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  const goToPrevious = useCallback(() => {
    const newDate = new Date(currentDate)
    switch (timeScope) {
      case 'day':
        newDate.setDate(currentDate.getDate() - 1)
        break
      case 'threeDay':
        newDate.setDate(currentDate.getDate() - 3)
        break
      case 'workWeek':
      case 'week':
        newDate.setDate(currentDate.getDate() - 7)
        break
      case 'month':
        newDate.setMonth(currentDate.getMonth() - 1)
        break
    }
    setCurrentDate(newDate)
  }, [currentDate, timeScope])

  const goToNext = useCallback(() => {
    const newDate = new Date(currentDate)
    switch (timeScope) {
      case 'day':
        newDate.setDate(currentDate.getDate() + 1)
        break
      case 'threeDay':
        newDate.setDate(currentDate.getDate() + 3)
        break
      case 'workWeek':
      case 'week':
        newDate.setDate(currentDate.getDate() + 7)
        break
      case 'month':
        newDate.setMonth(currentDate.getMonth() + 1)
        break
    }
    setCurrentDate(newDate)
  }, [currentDate, timeScope])

  const updateMeeting = useCallback(
    async (meetingId: string, data: UpdateMeetingData): Promise<Meeting> => {
      const response = await apiClient.updateMeeting<{ meeting: Meeting }>(meetingId, data)
      await loadEvents()
      return response.meeting
    },
    [apiClient, loadEvents]
  )

  const cancelMeeting = useCallback(
    async (meetingId: string): Promise<void> => {
      await apiClient.cancelMeeting(meetingId)
      await loadEvents()
      setSelectedEvent(null)
    },
    [apiClient, loadEvents]
  )

  const respondToInvitation = useCallback(
    async (meetingId: string, response: InvitationResponse): Promise<void> => {
      await apiClient.respondToInvitation<{ participant: MeetingParticipant }>(meetingId, response)

      await Promise.all([loadEvents(), loadInvitations()])

      if (selectedEvent?.id === meetingId) {
        setSelectedEvent(prev =>
          prev
            ? {
                ...prev,
                participantStatus: response.status as InvitationStatus
              }
            : null
        )
      }
    },
    [apiClient, loadEvents, loadInvitations, selectedEvent]
  )

  const respondToSeriesInvitation = useCallback(
    async (seriesRootId: string, response: InvitationResponse): Promise<void> => {
      const selectedEventBelongsToSeries =
        selectedEvent && (selectedEvent.parentMeetingId || selectedEvent.id) === seriesRootId

      await apiClient.respondToSeriesInvitation(seriesRootId, response)
      await Promise.all([loadEvents(), loadInvitations()])

      if (selectedEventBelongsToSeries) {
        setSelectedEvent(prev =>
          prev
            ? {
                ...prev,
                participantStatus: response.status as InvitationStatus
              }
            : null
        )
      }
    },
    [apiClient, loadEvents, loadInvitations, selectedEvent]
  )

  const selectEvent = useCallback((event: CalendarEvent | null) => {
    setSelectedEvent(event)
  }, [])

  const refresh = useCallback(async () => {
    await loadEvents()
  }, [loadEvents])

  const refreshInvitations = useCallback(async () => {
    await loadInvitations()
  }, [loadInvitations])

  const applyCalendarColorLocally = useCallback(
    ({ calendarId, color, isPersonal = false }: { calendarId?: string; color: string; isPersonal?: boolean }) => {
      const matchesCalendar = (targetCalendarId?: string) => {
        if (isPersonal) {
          return !targetCalendarId
        }

        return Boolean(calendarId) && targetCalendarId === calendarId
      }

      setInternalEvents(currentEvents =>
        currentEvents.map(event => (matchesCalendar(event.calendarId) ? { ...event, color } : event))
      )
      setPendingInvitations(currentMeetings =>
        currentMeetings.map(meeting => (matchesCalendar(meeting.calendarId) ? { ...meeting, color } : meeting))
      )
      setPendingInvitationGroups(currentGroups =>
        currentGroups.map(group => {
          if (group.kind === 'single') {
            return matchesCalendar(group.meeting.calendarId)
              ? {
                  ...group,
                  meeting: { ...group.meeting, color }
                }
              : group
          }

          return {
            ...group,
            pendingMeetings: group.pendingMeetings.map(meeting =>
              matchesCalendar(meeting.calendarId) ? { ...meeting, color } : meeting
            )
          }
        })
      )
      setSelectedEvent(currentEvent =>
        currentEvent && matchesCalendar(currentEvent.calendarId) ? { ...currentEvent, color } : currentEvent
      )
    },
    []
  )

  return {
    currentDate,
    timeScope,
    events,
    pendingInvitations,
    pendingInvitationGroups,
    pendingInvitationsCount: pendingInvitationGroups.length,
    selectedEvent,
    isLoading,
    error,
    apiClient,
    setCurrentDate,
    goToToday,
    goToPrevious,
    goToNext,
    selectEvent,
    createMeeting,
    updateMeeting,
    cancelMeeting,
    respondToInvitation,
    respondToSeriesInvitation,
    refresh,
    refreshInvitations,
    applyCalendarColorLocally,
    dateRange,
    viewTitle
  }
}

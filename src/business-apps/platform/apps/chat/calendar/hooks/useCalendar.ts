import { useState, useCallback, useEffect, useMemo } from 'react'
import { useLocale } from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import 'dayjs/locale/de'
import 'dayjs/locale/en'
import 'dayjs/locale/ro'
import { CalendarApiClient, createCalendarApiClient } from '../calendarApiClient'
import type {
  CalendarView,
  CalendarEvent,
  Meeting,
  DateRange,
  CreateMeetingData,
  UpdateMeetingData,
  InvitationResponse,
  InvitationStatus
} from '../types'
import { getWeekRange, getMonthRange, getDayRange } from '../types'

dayjs.extend(localizedFormat)

interface UseCalendarOptions {
  accessToken: string
  apiUrl: string
  wsUrl?: string
  /** External calendar events to merge with internal events */
  externalEvents?: CalendarEvent[]
}

interface UseCalendarReturn {
  // State
  currentDate: Date
  view: CalendarView
  events: CalendarEvent[]
  pendingInvitations: Meeting[]
  selectedEvent: CalendarEvent | null
  isLoading: boolean
  error: string | null

  // API client
  apiClient: CalendarApiClient | null

  // Navigation
  setCurrentDate: (date: Date) => void
  setView: (view: CalendarView) => void
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

  // Refresh
  refresh: () => Promise<void>
  refreshInvitations: () => Promise<void>

  // Computed
  dateRange: DateRange
  viewTitle: string
}

export const useCalendar = ({ accessToken, apiUrl, externalEvents = [] }: UseCalendarOptions): UseCalendarReturn => {
  const { locale } = useLocale()
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [view, setView] = useState<CalendarView>('day')
  const [internalEvents, setInternalEvents] = useState<CalendarEvent[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<Meeting[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create API client
  const apiClient = useMemo(() => {
    if (!accessToken || !apiUrl) return null
    return createCalendarApiClient(apiUrl, accessToken)
  }, [accessToken, apiUrl])

  // Calculate date range based on view
  const dateRange = useMemo((): DateRange => {
    switch (view) {
      case 'day':
        return getDayRange(currentDate)
      case 'week':
        return getWeekRange(currentDate)
      case 'month':
        return getMonthRange(currentDate)
      default:
        return getWeekRange(currentDate)
    }
  }, [currentDate, view])

  // Generate view title
  const viewTitle = useMemo((): string => {
    const baseLocale = locale?.split('-')[0]?.toLowerCase() || 'en'

    switch (view) {
      case 'day': {
        // German and Romanian use day before month with leading zero (e.g., "Freitag, 09. Januar 2026")
        const dayFormat = baseLocale === 'de' || baseLocale === 'ro' ? 'dddd, DD. MMMM YYYY' : 'dddd, MMMM D, YYYY'
        return dayjs(currentDate).locale(baseLocale).format(dayFormat)
      }
      case 'week': {
        const weekStart = dayjs(dateRange.start).locale(baseLocale)
        const weekEnd = dayjs(dateRange.end).locale(baseLocale)

        // German and Romanian use day before month with leading zero
        if (baseLocale === 'de' || baseLocale === 'ro') {
          if (weekStart.month() === weekEnd.month()) {
            return `${weekStart.format('DD.')} - ${weekEnd.format('DD. MMMM YYYY')}`
          }
          return `${weekStart.format('DD. MMM')} - ${weekEnd.format('DD. MMM YYYY')}`
        }

        // English format
        if (weekStart.month() === weekEnd.month()) {
          return `${weekStart.format('MMMM D')} - ${weekEnd.format('D, YYYY')}`
        }
        return `${weekStart.format('MMM D')} - ${weekEnd.format('MMM D, YYYY')}`
      }
      case 'month':
        return dayjs(currentDate).locale(baseLocale).format('MMMM YYYY')
      default:
        return dayjs(currentDate).locale(baseLocale).format('MMMM YYYY')
    }
  }, [currentDate, view, dateRange, locale])

  // Load internal events for current date range
  const loadEvents = useCallback(async () => {
    if (!apiClient) return

    setIsLoading(true)
    setError(null)

    try {
      const loadedEvents = await apiClient.getCalendarEvents(dateRange.start, dateRange.end)

      // Mark internal events with source
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
  }, [apiClient, dateRange])

  // Merge internal + external events (does not re-fetch when external events change)
  const events = useMemo(() => {
    const rangeStart = dateRange.start.getTime()
    const rangeEnd = dateRange.end.getTime()
    const filteredExternal = externalEvents.filter(evt => {
      const evtStart = evt.start.getTime()
      const evtEnd = evt.end.getTime()
      return evtStart < rangeEnd && evtEnd > rangeStart
    })

    // Filter out cancelled/deleted meetings and sort by start time
    return [...internalEvents, ...filteredExternal]
      .filter(event => event.status !== 'cancelled')
      .sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [internalEvents, externalEvents, dateRange])

  // Load pending invitations
  const loadInvitations = useCallback(async () => {
    if (!apiClient) return

    try {
      const invitations = await apiClient.getPendingInvitations()
      setPendingInvitations(invitations)
    } catch (err) {
      console.error('Error loading pending invitations:', err)
    }
  }, [apiClient])

  // Load events when date range changes
  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  // Load invitations on mount
  useEffect(() => {
    loadInvitations()
  }, [loadInvitations])

  // Navigation functions
  const goToToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  const goToPrevious = useCallback(() => {
    const newDate = new Date(currentDate)
    switch (view) {
      case 'day':
        newDate.setDate(currentDate.getDate() - 1)
        break
      case 'week':
        newDate.setDate(currentDate.getDate() - 7)
        break
      case 'month':
        newDate.setMonth(currentDate.getMonth() - 1)
        break
    }
    setCurrentDate(newDate)
  }, [currentDate, view])

  const goToNext = useCallback(() => {
    const newDate = new Date(currentDate)
    switch (view) {
      case 'day':
        newDate.setDate(currentDate.getDate() + 1)
        break
      case 'week':
        newDate.setDate(currentDate.getDate() + 7)
        break
      case 'month':
        newDate.setMonth(currentDate.getMonth() + 1)
        break
    }
    setCurrentDate(newDate)
  }, [currentDate, view])

  // Meeting operations
  const createMeeting = useCallback(
    async (data: CreateMeetingData): Promise<Meeting> => {
      if (!apiClient) throw new Error('Calendar not initialized')

      const meeting = await apiClient.createMeeting(data)
      await loadEvents() // Refresh events
      return meeting
    },
    [apiClient, loadEvents]
  )

  const updateMeeting = useCallback(
    async (meetingId: string, data: UpdateMeetingData): Promise<Meeting> => {
      if (!apiClient) throw new Error('Calendar not initialized')

      const meeting = await apiClient.updateMeeting(meetingId, data)
      await loadEvents() // Refresh events
      return meeting
    },
    [apiClient, loadEvents]
  )

  const cancelMeeting = useCallback(
    async (meetingId: string): Promise<void> => {
      if (!apiClient) throw new Error('Calendar not initialized')

      await apiClient.cancelMeeting(meetingId)
      await loadEvents() // Refresh events
      setSelectedEvent(null)
    },
    [apiClient, loadEvents]
  )

  const respondToInvitation = useCallback(
    async (meetingId: string, response: InvitationResponse): Promise<void> => {
      if (!apiClient) throw new Error('Calendar not initialized')

      await apiClient.respondToInvitation(meetingId, response)

      // Refresh both events and invitations
      await Promise.all([loadEvents(), loadInvitations()])

      // Update selected event if it's the same meeting
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

  const selectEvent = useCallback((event: CalendarEvent | null) => {
    setSelectedEvent(event)
  }, [])

  const refresh = useCallback(async () => {
    await loadEvents()
  }, [loadEvents])

  const refreshInvitations = useCallback(async () => {
    await loadInvitations()
  }, [loadInvitations])

  return {
    // State
    currentDate,
    view,
    events,
    pendingInvitations,
    selectedEvent,
    isLoading,
    error,

    // API client
    apiClient,

    // Navigation
    setCurrentDate,
    setView,
    goToToday,
    goToPrevious,
    goToNext,

    // Event selection
    selectEvent,

    // Meeting operations
    createMeeting,
    updateMeeting,
    cancelMeeting,
    respondToInvitation,

    // Refresh
    refresh,
    refreshInvitations,

    // Computed
    dateRange,
    viewTitle
  }
}

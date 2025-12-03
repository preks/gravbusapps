import { useState, useCallback, useEffect, useMemo } from 'react'
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

interface UseCalendarOptions {
  accessToken: string
  apiUrl: string
  wsUrl?: string
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

export const useCalendar = ({ accessToken, apiUrl }: UseCalendarOptions): UseCalendarReturn => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [view, setView] = useState<CalendarView>('day')
  const [events, setEvents] = useState<CalendarEvent[]>([])
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
    const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' }

    switch (view) {
      case 'day':
        return currentDate.toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })
      case 'week': {
        const weekStart = dateRange.start
        const weekEnd = dateRange.end
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${weekStart.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} - ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
        }
        return `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
      }
      case 'month':
        return currentDate.toLocaleDateString(undefined, options)
      default:
        return currentDate.toLocaleDateString(undefined, options)
    }
  }, [currentDate, view, dateRange])

  // Load events for current date range
  const loadEvents = useCallback(async () => {
    if (!apiClient) return

    setIsLoading(true)
    setError(null)

    try {
      const loadedEvents = await apiClient.getCalendarEvents(dateRange.start, dateRange.end)
      setEvents(loadedEvents)
    } catch (err) {
      console.error('Error loading calendar events:', err)
      setError('Failed to load calendar events')
    } finally {
      setIsLoading(false)
    }
  }, [apiClient, dateRange])

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

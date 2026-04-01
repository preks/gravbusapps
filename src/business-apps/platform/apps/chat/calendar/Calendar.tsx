import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Alert, AlertDescription, Button, Collapsible, Spinner, toast, useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl, getCurrentUrlWithUpdatedSearchParams } from '@/common/utils/navigationUtils'
import translations from '../_i18n'
import { setPendingJoinMeeting } from '../pendingJoinMeetingFromPlatform'
import { useCalendar } from './hooks/useCalendar'
import { useInternalCalendars } from './hooks/useInternalCalendars'
import { usePersonalCalendarColorPreference } from './hooks/usePersonalCalendarColorPreference'
import { useEmployeeAvatarsCache } from '../hooks/useEmployeeAvatarsCache'
import {
  ArchiveCalendarDialog,
  CalendarHeader,
  CalendarVisibilityPanel,
  CreateSharedCalendarDialog,
  DayView,
  EditSharedCalendarDialog,
  ManageCalendarAccessDialog,
  WeekView,
  MonthView,
  CreateMeetingModal,
  MeetingDetailModal
} from './components'
import {
  CalendarEvent,
  CreateSharedCalendarData,
  ExternalCalendarSource,
  InternalCalendarSummary,
  InternalCalendarPermission,
  Meeting,
  CreateMeetingData,
  UpdateMeetingData,
  UpdateSharedCalendarData,
  InvitationStatus,
  EventParticipant
} from './types'
import { getDefaultCalendarColor } from './utils/calendarColors'

interface CalendarProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  activeCalls?: Record<string, any> // Active calls passed from Chat
  /** External calendar events from email providers to merge in */
  externalCalendarEvents?: CalendarEvent[]
  externalCalendarSources?: ExternalCalendarSource[]
  /** When provided, opens chat in-app (same as dashboard). When omitted, navigates to chat URL. */
  onOpenChat?: (conversationId: string) => void
  defaultSidebarOpen?: boolean
}

const CALENDAR_VISIBILITY_STORAGE_KEY = 'chat-calendar-visibility'

const CalendarInner: React.FC<CalendarProps> = ({
  accessToken,
  userInfo,
  prefixDataTestId = 'calendar',
  activeCalls = {},
  externalCalendarEvents = [],
  externalCalendarSources = [],
  onOpenChat,
  defaultSidebarOpen = true
}) => {
  // Convert activeCalls to Map for component compatibility
  const activeConversationCalls = useMemo(() => {
    const map = new Map()
    Object.entries(activeCalls).forEach(([id, call]) => {
      map.set(id, call)
    })
    return map
  }, [activeCalls])

  const {
    calendars: sharedCalendars,
    refresh: refreshCalendars,
    applyCalendarColorPreference,
    replaceCalendar
  } = useInternalCalendars(accessToken)
  const {
    color: personalCalendarColor,
    hasColorOverride: personalCalendarHasColorOverride,
    isLoading: isLoadingPersonalCalendarColor,
    isSaving: isUpdatingPersonalCalendarColor,
    updateColor: updatePersonalCalendarColor
  } = usePersonalCalendarColorPreference(accessToken)
  const [includePersonal, setIncludePersonal] = useState(true)
  const [selectedInternalCalendarIds, setSelectedInternalCalendarIds] = useState<string[]>([])
  const [selectedExternalSourceIds, setSelectedExternalSourceIds] = useState<string[]>([])
  const hasInitializedInternalSelection = useRef(false)
  const hasInitializedExternalSelection = useRef(false)

  useEffect(() => {
    try {
      const raw = globalThis.window.localStorage.getItem(CALENDAR_VISIBILITY_STORAGE_KEY)
      if (!raw) {
        return
      }

      const parsed = JSON.parse(raw) as {
        includePersonal?: boolean
        selectedInternalCalendarIds?: string[]
        selectedExternalSourceIds?: string[]
      }

      if (typeof parsed.includePersonal === 'boolean') {
        setIncludePersonal(parsed.includePersonal)
      }
      if (Array.isArray(parsed.selectedInternalCalendarIds)) {
        setSelectedInternalCalendarIds(parsed.selectedInternalCalendarIds)
        hasInitializedInternalSelection.current = true
      }
      if (Array.isArray(parsed.selectedExternalSourceIds)) {
        setSelectedExternalSourceIds(parsed.selectedExternalSourceIds)
        hasInitializedExternalSelection.current = true
      }
    } catch {
      // ignore invalid persisted state
    }
  }, [])

  useEffect(() => {
    if (!hasInitializedInternalSelection.current && sharedCalendars.length > 0) {
      setSelectedInternalCalendarIds(sharedCalendars.map(calendar => calendar.id))
      hasInitializedInternalSelection.current = true
    }
  }, [sharedCalendars])

  useEffect(() => {
    if (!hasInitializedExternalSelection.current && externalCalendarSources.length > 0) {
      setSelectedExternalSourceIds(externalCalendarSources.map(source => source.id))
      hasInitializedExternalSelection.current = true
    }
  }, [externalCalendarSources])

  useEffect(() => {
    const availableIds = new Set(sharedCalendars.map(calendar => calendar.id))
    setSelectedInternalCalendarIds(currentIds => currentIds.filter(id => availableIds.has(id)))
  }, [sharedCalendars])

  useEffect(() => {
    const availableIds = new Set(externalCalendarSources.map(source => source.id))
    setSelectedExternalSourceIds(currentIds => currentIds.filter(id => availableIds.has(id)))
  }, [externalCalendarSources])

  useEffect(() => {
    try {
      globalThis.window.localStorage.setItem(
        CALENDAR_VISIBILITY_STORAGE_KEY,
        JSON.stringify({
          includePersonal,
          selectedInternalCalendarIds,
          selectedExternalSourceIds
        })
      )
    } catch {
      // ignore write failures
    }
  }, [includePersonal, selectedInternalCalendarIds, selectedExternalSourceIds])

  const filteredExternalEvents = useMemo(
    () => externalCalendarEvents.filter(event => !event.sourceId || selectedExternalSourceIds.includes(event.sourceId)),
    [externalCalendarEvents, selectedExternalSourceIds]
  )

  // Calendar hook
  const {
    currentDate,
    view,
    events,
    pendingInvitations,
    selectedEvent,
    isLoading,
    error,
    apiClient,
    setCurrentDate,
    setView,
    goToToday,
    goToPrevious,
    goToNext,
    selectEvent,
    createMeeting,
    updateMeeting,
    cancelMeeting,
    respondToInvitation,
    refresh,
    refreshInvitations,
    applyCalendarColorLocally,
    dateRange,
    viewTitle
  } = useCalendar({
    accessToken,
    externalEvents: filteredExternalEvents,
    selectedCalendarIds: selectedInternalCalendarIds,
    includePersonal
  })

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreateSharedCalendarDialogOpen, setIsCreateSharedCalendarDialogOpen] = useState(false)
  const [isCreatingSharedCalendar, setIsCreatingSharedCalendar] = useState(false)
  const [editingCalendar, setEditingCalendar] = useState<InternalCalendarSummary | null>(null)
  const [isUpdatingCalendar, setIsUpdatingCalendar] = useState(false)
  const [accessCalendar, setAccessCalendar] = useState<InternalCalendarSummary | null>(null)
  const [isUpdatingCalendarMembers, setIsUpdatingCalendarMembers] = useState(false)
  const [archiveCalendar, setArchiveCalendar] = useState<InternalCalendarSummary | null>(null)
  const [isArchivingCalendar, setIsArchivingCalendar] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [createModalInitialDate, setCreateModalInitialDate] = useState<Date | undefined>()
  const [createModalInitialHour, setCreateModalInitialHour] = useState<number | undefined>()
  const [editingMeeting, setEditingMeeting] = useState<CalendarEvent | null>(null)
  const [enrichedSelectedEvent, setEnrichedSelectedEvent] = useState<CalendarEvent | null>(null)
  const [updatingCalendarPreferenceId, setUpdatingCalendarPreferenceId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(defaultSidebarOpen)

  const { t } = useTranslation(translations)
  const { fetchAvatarsSync, requestAvatars } = useEmployeeAvatarsCache(accessToken)
  const personalCalendarLabel = useMemo(() => {
    const displayName = userInfo?.displayName?.trim()

    return displayName || t('calendar-sidebar-myCalendar')
  }, [t, userInfo?.displayName])
  const defaultMeetingCalendarId = useMemo(() => {
    const selectedEditableCalendar = sharedCalendars.find(
      calendar => selectedInternalCalendarIds.includes(calendar.id) && calendar.canEdit
    )

    if (selectedEditableCalendar) {
      return selectedEditableCalendar.id
    }

    return sharedCalendars.find(calendar => calendar.canEdit)?.id
  }, [selectedInternalCalendarIds, sharedCalendars])

  useEffect(() => {
    const urlParams = new URLSearchParams(globalThis.window.location.search)
    const calendarIdsParam = urlParams.get('calendarIds')
    const includePersonalParam = urlParams.get('includePersonal')

    if (calendarIdsParam) {
      hasInitializedInternalSelection.current = true
      setSelectedInternalCalendarIds(
        calendarIdsParam
          .split(',')
          .map(value => value.trim())
          .filter(Boolean)
      )
    }

    if (includePersonalParam === 'false') {
      setIncludePersonal(false)
    }
  }, [])

  // Ref so timeout callback can read latest events (after date change triggers fetch)
  const eventsRef = useRef<CalendarEvent[]>(events)
  eventsRef.current = events

  const applyLocalCalendarSurfaceColor = useCallback(
    ({ calendarId, color, isPersonal = false }: { calendarId?: string; color: string; isPersonal?: boolean }) => {
      const matchesCalendar = (targetCalendarId?: string) => {
        if (isPersonal) {
          return !targetCalendarId
        }

        return Boolean(calendarId) && targetCalendarId === calendarId
      }

      applyCalendarColorLocally({ calendarId, color, isPersonal })
      setEditingMeeting(currentMeeting =>
        currentMeeting && matchesCalendar(currentMeeting.calendarId) ? { ...currentMeeting, color } : currentMeeting
      )
      setEnrichedSelectedEvent(currentEvent =>
        currentEvent && matchesCalendar(currentEvent.calendarId) ? { ...currentEvent, color } : currentEvent
      )
    },
    [applyCalendarColorLocally]
  )

  const canOpenEventDetails = useCallback(
    (event: CalendarEvent) => event.calendarPermission !== InternalCalendarPermission.FREE_BUSY,
    []
  )

  // Fetch meeting data (participant responses) and avatars when detail modal opens
  useEffect(() => {
    const enrichEventWithMeetingAndAvatars = async () => {
      if (!selectedEvent || !isDetailModalOpen) {
        setEnrichedSelectedEvent(null)
        return
      }

      const isInternalMeeting = selectedEvent.id && (!selectedEvent.source || selectedEvent.source === 'internal')

      let eventToEnrich: CalendarEvent = selectedEvent

      // For internal meetings, fetch full meeting data so we have up-to-date participant responses
      if (isInternalMeeting && apiClient) {
        try {
          const { meeting } = await apiClient.getMeeting<{ meeting: any }>(selectedEvent.id)
          const participants: EventParticipant[] =
            meeting.participants?.map(p => ({
              id: p.userId,
              firstName: p.user?.firstName,
              lastName: p.user?.lastName,
              displayName: p.user?.displayName,
              email: p.user?.email ?? '',
              avatarUrl: p.user?.avatarUrl,
              status: p.status,
              isOrganizer: p.isOrganizer,
              comment: p.responseComment
            })) ?? []
          const acceptedCount = meeting.participants?.filter(p => p.status === InvitationStatus.ACCEPTED).length ?? 0
          eventToEnrich = {
            ...selectedEvent,
            participants,
            participantCount: participants.length,
            acceptedCount,
            // Use fresh meeting flags so transcript message appears without refresh when another user enables it
            transcriptionEnabled: meeting.transcriptionEnabled ?? selectedEvent.transcriptionEnabled,
            metadata: {
              ...selectedEvent.metadata,
              ...meeting.metadata,
              aiTranscriptionEnabled:
                meeting.metadata?.aiTranscriptionEnabled ??
                meeting.transcriptionEnabled ??
                selectedEvent.metadata?.aiTranscriptionEnabled
            }
          }
        } catch (error) {
          console.error('Error fetching meeting data:', error)
        }
      }

      // Collect all user IDs that need avatars
      const userIds: string[] = []
      if (eventToEnrich.organizer?.id) userIds.push(eventToEnrich.organizer.id)
      eventToEnrich.participants?.forEach(p => {
        if (p.id) userIds.push(p.id)
      })

      if (userIds.length === 0) {
        setEnrichedSelectedEvent(eventToEnrich)
        return
      }

      try {
        let employeeInfoMap = requestAvatars(userIds)
        if (employeeInfoMap.size < userIds.length) {
          employeeInfoMap = await fetchAvatarsSync(userIds)
        }

        const organizerInfo = employeeInfoMap.get(eventToEnrich.organizer.id)
        const enrichedEvent: CalendarEvent = {
          ...eventToEnrich,
          organizer: {
            ...eventToEnrich.organizer,
            avatarUrl: organizerInfo?.avatarUrl || eventToEnrich.organizer.avatarUrl,
            employeeId: organizerInfo?.employeeId || eventToEnrich.organizer.employeeId
          },
          participants: eventToEnrich.participants?.map(p => {
            const participantInfo = employeeInfoMap.get(p.id)
            return {
              ...p,
              avatarUrl: participantInfo?.avatarUrl || p.avatarUrl,
              employeeId: participantInfo?.employeeId || p.employeeId
            }
          })
        }

        setEnrichedSelectedEvent(enrichedEvent)
      } catch (error) {
        console.error('Error fetching participant avatars:', error)
        setEnrichedSelectedEvent(eventToEnrich)
      }
    }

    enrichEventWithMeetingAndAvatars()
  }, [selectedEvent, isDetailModalOpen, apiClient, fetchAvatarsSync, requestAvatars])

  // Handle URL params to navigate to a specific date/meeting (e.g., from MeetingCard click)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const handleNavigation = async (event?: Event) => {
      const urlParams = new URLSearchParams(globalThis.window.location.search)
      const dateParam = urlParams.get('date')
      const meetingIdParam = urlParams.get('meetingId')

      // If this is triggered by switchToCalendar event, refresh only when not navigating with a date param
      // (avoids duplicate fetch when opening from MeetingCard which sets meetingId in URL)
      if (event?.type === 'switchToCalendar' && !dateParam) {
        await refresh()
      }

      if (dateParam) {
        const targetDate = new Date(dateParam)
        if (!Number.isNaN(targetDate.getTime())) {
          setCurrentDate(targetDate)
          setView('day')

          // If we have a meetingId, find and select that meeting after events load (URL keeps meetingId for shareable link)
          if (meetingIdParam) {
            timeoutId = setTimeout(() => {
              timeoutId = null
              // Only open if URL still has this meetingId (user may have closed modal and cleared URL)
              const currentParams = new URLSearchParams(globalThis.window.location.search)
              if (currentParams.get('meetingId') !== meetingIdParam) return
              // Use ref so we see events after they load for the new date (e.g. "view in calendar" from card)
              const meetingEvent = eventsRef.current.find(e => e.id === meetingIdParam)
              if (meetingEvent && canOpenEventDetails(meetingEvent)) {
                selectEvent(meetingEvent)
                setIsDetailModalOpen(true)
              }
            }, 500)
          }
          // Keep meetingId in URL so the open meeting dialog is reflected and link is shareable
        }
      } else if (meetingIdParam && events.length > 0) {
        // meetingId without date: find meeting in loaded events, go to its day and select it (URL keeps meetingId for shareable link)
        const meetingEvent = events.find(e => e.id === meetingIdParam)
        if (meetingEvent && canOpenEventDetails(meetingEvent)) {
          const meetingDate = meetingEvent.start
          if (!Number.isNaN(meetingDate.getTime())) {
            setCurrentDate(meetingDate)
            setView('day')
            selectEvent(meetingEvent)
            setIsDetailModalOpen(true)
          }
          // Keep meetingId in URL so the open meeting dialog is reflected and link is shareable
        }
      }
    }

    // Handle initial load
    handleNavigation()

    // Also listen for switchToCalendar event
    const handleSwitchEvent = (e: Event) => handleNavigation(e)
    globalThis.window.addEventListener('switchToCalendar', handleSwitchEvent)
    return () => {
      if (timeoutId !== null) clearTimeout(timeoutId)
      globalThis.window.removeEventListener('switchToCalendar', handleSwitchEvent)
    }
  }, [canOpenEventDetails, events, setCurrentDate, setView, selectEvent, refresh])

  // When events load and meetingId is in URL (e.g. opened from task link), open meeting once events are available.
  // Skip re-opening detail when create/edit modal is open (e.g. user clicked Edit).
  useEffect(() => {
    if (events.length === 0) return
    const meetingIdParam = new URLSearchParams(globalThis.window.location.search).get('meetingId')
    if (!meetingIdParam || isDetailModalOpen || isCreateModalOpen) return
    const meetingEvent = events.find(e => e.id === meetingIdParam)
    if (meetingEvent && canOpenEventDetails(meetingEvent)) {
      setCurrentDate(meetingEvent.start)
      setView('day')
      selectEvent(meetingEvent)
      setIsDetailModalOpen(true)
    }
  }, [canOpenEventDetails, events, isDetailModalOpen, isCreateModalOpen, selectEvent, setCurrentDate, setView])

  // Sync modal with browser back/forward: open/close modal when URL meetingId appears/disappears
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(globalThis.window.location.search)
      const meetingIdParam = urlParams.get('meetingId')
      if (meetingIdParam && !isDetailModalOpen) {
        const meetingEvent = events.find(e => e.id === meetingIdParam)
        if (meetingEvent && canOpenEventDetails(meetingEvent)) {
          setCurrentDate(meetingEvent.start)
          setView('day')
          selectEvent(meetingEvent)
          setIsDetailModalOpen(true)
        }
      } else if (!meetingIdParam && isDetailModalOpen) {
        setIsDetailModalOpen(false)
        selectEvent(null)
      }
    }
    globalThis.window.addEventListener('popstate', handlePopState)
    return () => globalThis.window.removeEventListener('popstate', handlePopState)
  }, [canOpenEventDetails, events, isDetailModalOpen, selectEvent, setCurrentDate, setView])

  // Refresh calendar when backend sends meeting_created (so user sees new meetings without reload)
  useEffect(() => {
    const onCalendarRefresh = () => {
      refresh()
      refreshInvitations()
    }
    globalThis.addEventListener('calendar:refresh', onCalendarRefresh)
    return () => globalThis.removeEventListener('calendar:refresh', onCalendarRefresh)
  }, [refresh, refreshInvitations])

  // Sync meeting detail modal state with URL (bookmarkable / shareable). Mutate current URL so it works from menu or sidebar.
  const setMeetingInUrl = useCallback((meetingId: string, _date?: Date) => {
    void _date // kept for API compatibility with callers; URL only stores meetingId
    const pathAndQuery = getCurrentUrlWithUpdatedSearchParams({ view: 'calendar', meetingId })
    globalThis.window.history.replaceState({}, '', `${globalThis.window.location.origin}${pathAndQuery}`)
  }, [])
  const clearMeetingFromUrl = useCallback(() => {
    const pathAndQuery = getCurrentUrlWithUpdatedSearchParams({ meetingId: null, date: null })
    globalThis.window.history.replaceState({}, '', `${globalThis.window.location.origin}${pathAndQuery}`)
  }, [])

  // Handle event click
  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      if (!canOpenEventDetails(event)) {
        return
      }

      selectEvent(event)
      setIsDetailModalOpen(true)
      setMeetingInUrl(event.id, event.start)
    },
    [canOpenEventDetails, selectEvent, setMeetingInUrl]
  )

  // Handle time slot click (for creating meetings)
  const handleTimeSlotClick = useCallback((date: Date, hour: number) => {
    setEditingMeeting(null)
    setCreateModalInitialDate(date)
    setCreateModalInitialHour(hour)
    setIsCreateModalOpen(true)
  }, [])

  // Handle day click in month view
  const handleDayClick = useCallback(
    (date: Date) => {
      // Switch to day view for that date
      setCurrentDate(date)
      setView('day')
    },
    [setCurrentDate, setView]
  )

  // Handle create meeting
  const handleCreateMeeting = useCallback(
    async (data: CreateMeetingData) => {
      await createMeeting(data)
      setIsCreateModalOpen(false)
      setEditingMeeting(null)
    },
    [createMeeting]
  )

  // Handle update meeting
  const handleUpdateMeeting = useCallback(
    async (meetingId: string, data: UpdateMeetingData) => {
      await updateMeeting(meetingId, data)
      setIsCreateModalOpen(false)
      setEditingMeeting(null)
      clearMeetingFromUrl()
      setIsDetailModalOpen(false)
    },
    [updateMeeting, clearMeetingFromUrl]
  )

  // Handle edit button click from detail modal
  const handleEditMeeting = useCallback(() => {
    if (!selectedEvent) return
    setEditingMeeting(selectedEvent)
    setIsDetailModalOpen(false)
    setIsCreateModalOpen(true)
  }, [selectedEvent])

  // Handle respond to invitation
  const handleRespondToInvitation = useCallback(
    async (
      meetingIdOrStatus: string | InvitationStatus,
      statusOrComment?: InvitationStatus | string,
      comment?: string
    ) => {
      // Support both (meetingId, status) and (status, comment) signatures
      if (
        selectedEvent &&
        (meetingIdOrStatus === 'accepted' ||
          meetingIdOrStatus === 'declined' ||
          meetingIdOrStatus === 'tentative' ||
          meetingIdOrStatus === 'pending')
      ) {
        // Called from MeetingDetailModal: (status, comment?)
        await respondToInvitation(selectedEvent.id, {
          status: meetingIdOrStatus as InvitationStatus,
          comment: statusOrComment as string | undefined
        })
      } else {
        // Called with explicit meetingId: (meetingId, status)
        await respondToInvitation(meetingIdOrStatus as string, {
          status: statusOrComment as InvitationStatus,
          comment
        })
      }
    },
    [respondToInvitation, selectedEvent]
  )

  // Handle view meeting details from pending invitations
  const handleViewInvitationDetails = useCallback(
    (meeting: Meeting) => {
      // Convert meeting to calendar event format
      const event: CalendarEvent = {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        start: new Date(meeting.startTime),
        end: new Date(meeting.endTime),
        allDay: meeting.isAllDay,
        color: meeting.color,
        status: meeting.status,
        participantStatus: InvitationStatus.PENDING, // It's pending since it's in pending invitations
        isOrganizer: false,
        organizer: {
          id: meeting.organizer?.id || '',
          firstName: meeting.organizer?.firstName,
          lastName: meeting.organizer?.lastName,
          displayName: meeting.organizer?.displayName,
          email: meeting.organizer?.email || ''
        },
        participantCount: meeting.participants?.length || 0,
        acceptedCount: meeting.participants?.filter(p => p.status === 'accepted').length || 0,
        meetingLink: meeting.meetingLink,
        location: meeting.location,
        conversationId: meeting.conversationId,
        calendarId: meeting.calendarId,
        calendarName: meeting.calendar?.name,
        calendarType: meeting.calendar?.type
      }
      selectEvent(event)
      setIsDetailModalOpen(true)
      setMeetingInUrl(meeting.id, new Date(meeting.startTime))
    },
    [selectEvent, setMeetingInUrl]
  )

  // Handle delete meeting
  const handleDeleteMeeting = useCallback(async () => {
    if (!selectedEvent) return
    await cancelMeeting(selectedEvent.id)
    clearMeetingFromUrl()
    setIsDetailModalOpen(false)
  }, [selectedEvent, cancelMeeting, clearMeetingFromUrl])

  // Handle starting a meeting call
  // Handle starting call from detail modal - dispatch event for Chat to handle
  const handleStartCall = useCallback(async () => {
    if (!enrichedSelectedEvent) return

    try {
      const conversationId = enrichedSelectedEvent.conversationId || enrichedSelectedEvent.id

      // Build participant list from event participants (excluding declined)
      const participants =
        enrichedSelectedEvent.participants
          ?.filter(p => p.status !== 'declined')
          .map(p => ({
            id: p.id,
            odId: p.id,
            odName: p.displayName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email || 'Unknown',
            avatarUrl: p.avatarUrl
          })) || []

      // Add organizer if not already included
      if (enrichedSelectedEvent.organizer && !participants.find(p => p.id === enrichedSelectedEvent.organizer.id)) {
        participants.push({
          id: enrichedSelectedEvent.organizer.id,
          odId: enrichedSelectedEvent.organizer.id,
          odName:
            enrichedSelectedEvent.organizer.displayName ||
            `${enrichedSelectedEvent.organizer.firstName || ''} ${enrichedSelectedEvent.organizer.lastName || ''}`.trim() ||
            enrichedSelectedEvent.organizer.email ||
            'Unknown',
          avatarUrl: enrichedSelectedEvent.organizer.avatarUrl
        })
      }

      globalThis.window.dispatchEvent(
        new CustomEvent('chat:join-meeting', {
          detail: {
            meetingId: enrichedSelectedEvent.id,
            conversationId,
            title: enrichedSelectedEvent.title,
            participants
          }
        })
      )

      clearMeetingFromUrl()
      setIsDetailModalOpen(false)
    } catch (error) {
      console.error('[Calendar] Error dispatching join-meeting event:', error)
    }
  }, [enrichedSelectedEvent, clearMeetingFromUrl])

  // Handle quick join from calendar event item - dispatch event for Chat to handle
  const handleQuickJoinCall = useCallback((event: CalendarEvent) => {
    const conversationId = event.conversationId || event.id

    globalThis.window.dispatchEvent(
      new CustomEvent('chat:join-meeting', {
        detail: {
          meetingId: event.id,
          conversationId,
          title: event.title
        }
      })
    )
  }, [])

  // Handle opening chat for conversation - same pattern as dashboard (in-app) or URL navigation.
  // Use conversationId when present; otherwise meeting id so chat can resolve (e.g. getConversationById or by meeting).
  const handleOpenChat = useCallback(() => {
    const id = enrichedSelectedEvent?.conversationId || enrichedSelectedEvent?.id
    if (!id) return
    if (enrichedSelectedEvent?.id) setPendingJoinMeeting(enrichedSelectedEvent.id, id)
    if (onOpenChat) {
      onOpenChat(id)
      clearMeetingFromUrl()
      setIsDetailModalOpen(false)
      return
    }
    const url = buildPlatformUrl('/platform/chat', { conversationId: id })
    navigateTo(url)
    clearMeetingFromUrl()
    setIsDetailModalOpen(false)
  }, [enrichedSelectedEvent, onOpenChat, clearMeetingFromUrl])

  // Handle create button click
  const handleCreateButtonClick = useCallback(() => {
    setEditingMeeting(null)
    setCreateModalInitialDate(undefined)
    setCreateModalInitialHour(undefined)
    setIsCreateModalOpen(true)
  }, [])

  const handleOpenCreateSharedCalendar = useCallback(() => {
    setIsCreateSharedCalendarDialogOpen(true)
  }, [])

  const handleSelectPersonalCalendarColor = useCallback(
    async (nextColor: string | null) => {
      const resolvedNextColor = nextColor || getDefaultCalendarColor()
      const isNoOp = nextColor === null ? !personalCalendarHasColorOverride : nextColor === personalCalendarColor

      if (isNoOp) {
        return
      }

      applyLocalCalendarSurfaceColor({
        color: resolvedNextColor,
        isPersonal: true
      })

      try {
        await updatePersonalCalendarColor(nextColor)
        void Promise.all([refresh(), refreshInvitations()])
      } catch (error) {
        applyLocalCalendarSurfaceColor({
          color: personalCalendarColor,
          isPersonal: true
        })
        console.error('Error updating personal calendar color:', error)
        toast.error(t('calendar-sidebar-personalColorSaveError'))
      }
    },
    [
      applyLocalCalendarSurfaceColor,
      personalCalendarColor,
      personalCalendarHasColorOverride,
      refresh,
      refreshInvitations,
      t,
      updatePersonalCalendarColor
    ]
  )

  const handleSelectInternalCalendarColor = useCallback(
    async (calendar: InternalCalendarSummary, nextColor: string | null) => {
      const previousPreferenceColor = calendar.hasColorOverride ? calendar.color : null
      const resolvedNextColor = nextColor || calendar.defaultColor
      const isNoOp = nextColor === null ? !calendar.hasColorOverride : nextColor === calendar.color

      if (isNoOp) {
        return
      }

      applyCalendarColorPreference(calendar.id, nextColor)
      applyLocalCalendarSurfaceColor({
        calendarId: calendar.id,
        color: resolvedNextColor
      })
      setUpdatingCalendarPreferenceId(calendar.id)

      try {
        const response = await apiClient.updateCalendarPreferences<{ calendar: InternalCalendarSummary }>(calendar.id, {
          color: nextColor
        })
        replaceCalendar(response.calendar)
        applyLocalCalendarSurfaceColor({
          calendarId: calendar.id,
          color: response.calendar.color
        })
        void Promise.all([refreshCalendars(), refresh(), refreshInvitations()])
      } catch (error) {
        applyCalendarColorPreference(calendar.id, previousPreferenceColor)
        applyLocalCalendarSurfaceColor({
          calendarId: calendar.id,
          color: calendar.color
        })
        console.error('Error updating calendar color preference:', error)
        toast.error(t('calendar-sidebar-calendarColorSaveError'))
      } finally {
        setUpdatingCalendarPreferenceId(currentId => (currentId === calendar.id ? null : currentId))
      }
    },
    [
      apiClient,
      applyCalendarColorPreference,
      applyLocalCalendarSurfaceColor,
      refresh,
      refreshCalendars,
      refreshInvitations,
      replaceCalendar,
      t
    ]
  )

  const handleCreateSharedCalendar = useCallback(
    async (data: CreateSharedCalendarData) => {
      setIsCreatingSharedCalendar(true)

      try {
        const response = await apiClient.createCalendar<{ calendar: InternalCalendarSummary }>({
          name: data.name,
          description: data.description,
          color: data.color,
          type: 'shared'
        })

        await refreshCalendars()
        setSelectedInternalCalendarIds(prev => Array.from(new Set([...prev, response.calendar.id])))
        setIsCreateSharedCalendarDialogOpen(false)
        toast.success(t('calendar-sidebar-calendarCreatedSuccess'))
      } catch (error) {
        console.error('Error creating shared calendar:', error)
        toast.error(t('calendar-sidebar-calendarCreatedError'))
      } finally {
        setIsCreatingSharedCalendar(false)
      }
    },
    [apiClient, refreshCalendars, t]
  )

  const handleEditInternalCalendar = useCallback((calendar: InternalCalendarSummary) => {
    setEditingCalendar(calendar)
  }, [])

  const handleManageInternalCalendarAccess = useCallback((calendar: InternalCalendarSummary) => {
    setAccessCalendar(calendar)
  }, [])

  const handleArchiveInternalCalendar = useCallback((calendar: InternalCalendarSummary) => {
    setArchiveCalendar(calendar)
  }, [])

  const handleUpdateSharedCalendar = useCallback(
    async (data: UpdateSharedCalendarData) => {
      if (!editingCalendar) {
        return
      }

      setIsUpdatingCalendar(true)

      try {
        await apiClient.updateCalendar(editingCalendar.id, data)
        await Promise.all([refreshCalendars(), refresh(), refreshInvitations()])
        setEditingCalendar(null)
        toast.success(t('calendar-sidebar-calendarUpdatedSuccess'))
      } catch (error) {
        console.error('Error updating shared calendar:', error)
        toast.error(t('calendar-sidebar-calendarUpdatedError'))
      } finally {
        setIsUpdatingCalendar(false)
      }
    },
    [apiClient, editingCalendar, refresh, refreshCalendars, refreshInvitations, t]
  )

  const handleUpdateCalendarAccess = useCallback(
    async (data: {
      members: Array<{ userId: string; permission: InternalCalendarPermission }>
      removeUserIds: string[]
    }) => {
      if (!accessCalendar) {
        return
      }

      setIsUpdatingCalendarMembers(true)

      try {
        await apiClient.updateCalendarMembers(accessCalendar.id, data)
        await refreshCalendars()
        setAccessCalendar(null)
        toast.success(t('calendar-sidebar-accessUpdatedSuccess'))
      } catch (error) {
        console.error('Error updating calendar members:', error)
        toast.error(t('calendar-sidebar-accessUpdatedError'))
      } finally {
        setIsUpdatingCalendarMembers(false)
      }
    },
    [accessCalendar, apiClient, refreshCalendars, t]
  )

  const handleConfirmArchiveCalendar = useCallback(async () => {
    if (!archiveCalendar) {
      return
    }

    setIsArchivingCalendar(true)

    try {
      await apiClient.archiveCalendar(archiveCalendar.id)
      setSelectedInternalCalendarIds(currentIds => currentIds.filter(id => id !== archiveCalendar.id))
      await refreshCalendars()
      setArchiveCalendar(null)
      toast.success(t('calendar-sidebar-calendarArchivedSuccess'))
    } catch (error) {
      console.error('Error archiving calendar:', error)
      toast.error(t('calendar-sidebar-calendarArchivedError'))
    } finally {
      setIsArchivingCalendar(false)
    }
  }, [apiClient, archiveCalendar, refreshCalendars, t])

  const handleToggleInternalCalendar = useCallback((calendarId: string, checked: boolean) => {
    setSelectedInternalCalendarIds(prev =>
      checked ? Array.from(new Set([...prev, calendarId])) : prev.filter(id => id !== calendarId)
    )
  }, [])

  const handleToggleExternalSource = useCallback((sourceId: string, checked: boolean) => {
    setSelectedExternalSourceIds(prev =>
      checked ? Array.from(new Set([...prev, sourceId])) : prev.filter(id => id !== sourceId)
    )
  }, [])

  // Close detail modal
  const handleCloseDetailModal = useCallback(() => {
    clearMeetingFromUrl()
    setIsDetailModalOpen(false)
    selectEvent(null)
  }, [selectEvent, clearMeetingFromUrl])

  // Error state (e.g. chat service unreachable) with retry
  if (error) {
    return (
      <div
        className="gba:h-full gba:flex gba:items-center gba:justify-center gba:p-4 gba:bg-background"
        data-testid={`${prefixDataTestId}-error`}
      >
        <Alert variant="destructive" className="gba:max-w-sm gba:flex gba:flex-col gba:gap-3">
          <AlertDescription>{t('calendar-error')}</AlertDescription>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            data-testid={`${prefixDataTestId}-error-retry`}
            className="gba:self-start"
          >
            {t('calendar-retry')}
          </Button>
        </Alert>
      </div>
    )
  }

  // Render calendar view based on current view mode
  const renderCalendarView = () => {
    switch (view) {
      case 'day':
        return (
          <DayView
            currentDate={currentDate}
            events={events}
            onEventClick={handleEventClick}
            onTimeSlotClick={handleTimeSlotClick}
            activeConversationCalls={activeConversationCalls}
            onJoinCall={handleQuickJoinCall}
          />
        )
      case 'week':
        return (
          <WeekView
            dateRange={dateRange}
            events={events}
            onEventClick={handleEventClick}
            onTimeSlotClick={handleTimeSlotClick}
            activeConversationCalls={activeConversationCalls}
            onJoinCall={handleQuickJoinCall}
          />
        )
      case 'month':
        return (
          <MonthView
            dateRange={dateRange}
            currentDate={currentDate}
            events={events}
            onEventClick={handleEventClick}
            onDayClick={handleDayClick}
            activeConversationCalls={activeConversationCalls}
          />
        )
      default:
        return null
    }
  }

  return (
    <Collapsible
      open={isSidebarOpen}
      onOpenChange={setIsSidebarOpen}
      className="gba:h-full gba:flex gba:flex-col gba:bg-background gba:overflow-hidden"
      data-testid={prefixDataTestId}
    >
      <div className="gba:flex gba:flex-1 gba:min-h-0 gba:min-w-0">
        {isSidebarOpen ? (
          <div className="gba:w-64 gba:md:w-72 gba:h-full gba:border-r gba:border-border/50 gba:bg-card/40">
            <CalendarVisibilityPanel
              currentDate={currentDate}
              onSelectDate={setCurrentDate}
              includePersonal={includePersonal}
              onTogglePersonal={setIncludePersonal}
              personalCalendarLabel={personalCalendarLabel}
              personalCalendarColor={personalCalendarColor}
              personalHasColorOverride={personalCalendarHasColorOverride}
              isLoadingPersonalColor={isLoadingPersonalCalendarColor}
              isUpdatingPersonalColor={isUpdatingPersonalCalendarColor}
              onSelectPersonalColor={handleSelectPersonalCalendarColor}
              onCreateSharedCalendar={handleOpenCreateSharedCalendar}
              onEditInternalCalendar={handleEditInternalCalendar}
              onManageInternalCalendarAccess={handleManageInternalCalendarAccess}
              onArchiveInternalCalendar={handleArchiveInternalCalendar}
              internalCalendars={sharedCalendars}
              updatingCalendarPreferenceId={updatingCalendarPreferenceId}
              onSelectInternalCalendarColor={handleSelectInternalCalendarColor}
              selectedInternalCalendarIds={selectedInternalCalendarIds}
              onToggleInternalCalendar={handleToggleInternalCalendar}
              externalSources={externalCalendarSources}
              selectedExternalSourceIds={selectedExternalSourceIds}
              onToggleExternalSource={handleToggleExternalSource}
            />
          </div>
        ) : null}

        <div className="gba:relative gba:flex gba:flex-1 gba:flex-col gba:min-w-0 gba:min-h-0 gba:bg-background gba:overflow-hidden">
          <CalendarHeader
            viewTitle={viewTitle}
            view={view}
            onViewChange={setView}
            onPrevious={goToPrevious}
            onNext={goToNext}
            onToday={goToToday}
            onCreateMeeting={handleCreateButtonClick}
            onRefresh={() => {
              refresh()
              refreshInvitations()
              refreshCalendars()
            }}
            pendingInvitationsCount={pendingInvitations.length}
            showSidebarToggle
            onToggleSidebar={() => setIsSidebarOpen(currentOpen => !currentOpen)}
          />

          <div className="gba:flex-1 gba:min-h-0 gba:overflow-hidden gba:relative">
            {isLoading && (
              <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:bg-background/50 gba:z-30">
                <Spinner className="gba:h-8 gba:w-8" />
              </div>
            )}
            {renderCalendarView()}
          </div>

          {pendingInvitations.length > 0 && (
            <div className="gba:absolute gba:bottom-3 gba:right-3 gba:z-20">
              <button
                onClick={() => {
                  if (pendingInvitations[0]) {
                    handleViewInvitationDetails(pendingInvitations[0])
                  }
                }}
                className="gba:flex gba:items-center gba:gap-1.5 gba:px-2.5 gba:py-1.5 gba:bg-warning gba:text-warning-foreground gba:rounded-full gba:shadow-md gba:font-medium gba:text-xs"
                data-testid="calendar-pending-invitations-badge"
                title={t('calendar-pending-invitations')}
              >
                <span>
                  {pendingInvitations.length} {t('calendar-pending-invitations')}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateMeetingModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setEditingMeeting(null)
        }}
        onSubmit={handleCreateMeeting}
        onUpdate={handleUpdateMeeting}
        accessToken={accessToken}
        availableCalendars={sharedCalendars}
        includePersonal={includePersonal}
        defaultCalendarId={defaultMeetingCalendarId}
        initialDate={createModalInitialDate}
        initialHour={createModalInitialHour}
        editMeeting={
          editingMeeting
            ? {
                id: editingMeeting.id,
                title: editingMeeting.title,
                description: editingMeeting.description,
                startTime: editingMeeting.start,
                endTime: editingMeeting.end,
                location: editingMeeting.location,
                meetingLink: editingMeeting.meetingLink,
                isAllDay: editingMeeting.allDay,
                calendarId: editingMeeting.calendarId,
                recurrence: editingMeeting.recurrence,
                recurrenceEndDate: editingMeeting.recurrenceEndDate,
                reminderMinutes: editingMeeting.reminderMinutes,
                participants: editingMeeting.participants,
                metadata: editingMeeting.metadata
              }
            : undefined
        }
      />

      <CreateSharedCalendarDialog
        isOpen={isCreateSharedCalendarDialogOpen}
        isSubmitting={isCreatingSharedCalendar}
        onClose={() => setIsCreateSharedCalendarDialogOpen(false)}
        onSubmit={handleCreateSharedCalendar}
      />

      <EditSharedCalendarDialog
        calendar={editingCalendar}
        isOpen={Boolean(editingCalendar)}
        isSubmitting={isUpdatingCalendar}
        onClose={() => setEditingCalendar(null)}
        onSubmit={handleUpdateSharedCalendar}
      />

      <ManageCalendarAccessDialog
        accessToken={accessToken}
        currentUserId={userInfo?.id}
        calendar={accessCalendar}
        isOpen={Boolean(accessCalendar)}
        isSubmitting={isUpdatingCalendarMembers}
        onClose={() => setAccessCalendar(null)}
        onSubmit={handleUpdateCalendarAccess}
      />

      <ArchiveCalendarDialog
        calendar={archiveCalendar}
        isOpen={Boolean(archiveCalendar)}
        isSubmitting={isArchivingCalendar}
        onClose={() => setArchiveCalendar(null)}
        onConfirm={handleConfirmArchiveCalendar}
      />

      <MeetingDetailModal
        event={enrichedSelectedEvent}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onRespond={handleRespondToInvitation}
        onEdit={enrichedSelectedEvent?.canEdit ? handleEditMeeting : undefined}
        onDelete={enrichedSelectedEvent?.canEdit ? handleDeleteMeeting : undefined}
        onStartCall={enrichedSelectedEvent?.meetingLink ? handleStartCall : undefined}
        onOpenChat={onOpenChat ? handleOpenChat : undefined}
        activeConversationCalls={activeConversationCalls}
      />
    </Collapsible>
  )
}

// Export the inner component as Calendar (RealtimeKitProvider is applied at modal level)
export const Calendar = CalendarInner

export default Calendar

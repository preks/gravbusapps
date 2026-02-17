import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Alert, AlertDescription, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env } from '@/common/env/EnvUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useCalendar } from './hooks/useCalendar'
import { useEmployeeAvatarsCache } from '../hooks/useEmployeeAvatarsCache'
import { CalendarHeader, DayView, WeekView, MonthView, CreateMeetingModal, MeetingDetailModal } from './components'
import { CalendarEvent, Meeting, CreateMeetingData, InvitationStatus } from './types'

interface CalendarProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  activeCalls?: Record<string, any> // Active calls passed from Chat
  /** External calendar events from email providers to merge in */
  externalCalendarEvents?: CalendarEvent[]
  /** When provided, opens chat in-app (same as dashboard). When omitted, navigates to chat URL. */
  onOpenChat?: (conversationId: string) => void
}

const CalendarInner: React.FC<CalendarProps> = ({
  accessToken,
  prefixDataTestId = 'calendar',
  activeCalls = {},
  externalCalendarEvents = [],
  onOpenChat
}) => {
  // Build API URL for calendar API
  let baseUrl = env('NEXT_PUBLIC_BASE_URL') || ''
  baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

  const chatServiceOverride = env('NEXT_PUBLIC_CHAT_SERVICE_URL')

  let apiUrl: string
  if (chatServiceOverride) {
    const localUrl = chatServiceOverride.endsWith('/') ? chatServiceOverride.slice(0, -1) : chatServiceOverride
    apiUrl = `${localUrl}/api/v1`
  } else {
    const isLocalPlatform = baseUrl.includes('localhost')
    if (isLocalPlatform) {
      baseUrl = 'https://newwork-dev.newwork.com'
    }
    apiUrl = env('NEXT_PUBLIC_CHAT_API') || `${baseUrl}/chat-service/api/v1` || ''
    if (apiUrl.includes('localhost')) {
      apiUrl = `${baseUrl}/chat-service/api/v1`
    }
  }

  // Convert activeCalls to Map for component compatibility
  const activeConversationCalls = useMemo(() => {
    const map = new Map()
    Object.entries(activeCalls).forEach(([id, call]) => {
      map.set(id, call)
    })
    return map
  }, [activeCalls])

  // Calendar hook
  const {
    currentDate,
    view,
    events,
    pendingInvitations,
    selectedEvent,
    isLoading,
    error,
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
    dateRange,
    viewTitle
  } = useCalendar({
    accessToken,
    apiUrl,
    externalEvents: externalCalendarEvents
  })

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [createModalInitialDate, setCreateModalInitialDate] = useState<Date | undefined>()
  const [createModalInitialHour, setCreateModalInitialHour] = useState<number | undefined>()
  const [editingMeeting, setEditingMeeting] = useState<CalendarEvent | null>(null)
  const [enrichedSelectedEvent, setEnrichedSelectedEvent] = useState<CalendarEvent | null>(null)

  // Avatar fetching hook with caching
  const { fetchAvatarsSync, requestAvatars } = useEmployeeAvatarsCache(accessToken)

  // Fetch avatars when selected event changes
  useEffect(() => {
    const enrichEventWithAvatars = async () => {
      if (!selectedEvent || !isDetailModalOpen) {
        setEnrichedSelectedEvent(null)
        return
      }

      // Collect all user IDs that need avatars
      const userIds: string[] = []

      // Add organizer
      if (selectedEvent.organizer?.id) {
        userIds.push(selectedEvent.organizer.id)
      }

      // Add participants
      if (selectedEvent.participants) {
        selectedEvent.participants.forEach(p => {
          if (p.id) userIds.push(p.id)
        })
      }

      if (userIds.length === 0) {
        setEnrichedSelectedEvent(selectedEvent)
        return
      }

      try {
        // Try to get from cache first (non-blocking)
        let employeeInfoMap = requestAvatars(userIds)

        // If cache doesn't have all users, fetch synchronously
        if (employeeInfoMap.size < userIds.length) {
          employeeInfoMap = await fetchAvatarsSync(userIds)
        }

        // Get organizer info
        const organizerInfo = employeeInfoMap.get(selectedEvent.organizer.id)

        // Enrich the event with avatar URLs and employee IDs
        const enrichedEvent: CalendarEvent = {
          ...selectedEvent,
          organizer: {
            ...selectedEvent.organizer,
            avatarUrl: organizerInfo?.avatarUrl || selectedEvent.organizer.avatarUrl,
            employeeId: organizerInfo?.employeeId || selectedEvent.organizer.employeeId
          },
          participants: selectedEvent.participants?.map(p => {
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
        setEnrichedSelectedEvent(selectedEvent)
      }
    }

    enrichEventWithAvatars()
  }, [selectedEvent, isDetailModalOpen, fetchAvatarsSync, requestAvatars])

  // Handle URL params to navigate to a specific date/meeting (e.g., from MeetingCard click)
  useEffect(() => {
    const handleNavigation = async (event?: Event) => {
      const urlParams = new URLSearchParams(window.location.search)
      const dateParam = urlParams.get('date')
      const meetingIdParam = urlParams.get('meetingId')

      // If this is triggered by switchToCalendar event, refresh the calendar first
      // This ensures we have the latest events (e.g., after AI schedules a meeting)
      if (event?.type === 'switchToCalendar') {
        await refresh()
      }

      if (dateParam) {
        const targetDate = new Date(dateParam)
        if (!isNaN(targetDate.getTime())) {
          setCurrentDate(targetDate)
          setView('day')

          // If we have a meetingId, find and select that meeting after events load
          if (meetingIdParam) {
            // Wait a bit for events to load, then select the meeting
            setTimeout(() => {
              const meetingEvent = events.find(e => e.id === meetingIdParam)
              if (meetingEvent) {
                selectEvent(meetingEvent)
                setIsDetailModalOpen(true)
              }
            }, 500)
          }

          // Clear the params after handling to avoid re-triggering
          const url = new URL(window.location.href)
          url.searchParams.delete('date')
          url.searchParams.delete('meetingId')
          window.history.replaceState({}, '', url.toString())
        }
      }
    }

    // Handle initial load
    handleNavigation()

    // Also listen for switchToCalendar event
    const handleSwitchEvent = (e: Event) => handleNavigation(e)
    window.addEventListener('switchToCalendar', handleSwitchEvent)
    return () => {
      window.removeEventListener('switchToCalendar', handleSwitchEvent)
    }
  }, [events, setCurrentDate, setView, selectEvent, refresh])

  // Refresh calendar when backend sends meeting_created (so user sees new meetings without reload)
  useEffect(() => {
    const onCalendarRefresh = () => {
      refresh()
      refreshInvitations()
    }
    window.addEventListener('calendar:refresh', onCalendarRefresh)
    return () => window.removeEventListener('calendar:refresh', onCalendarRefresh)
  }, [refresh, refreshInvitations])

  // Handle event click
  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      selectEvent(event)
      setIsDetailModalOpen(true)
    },
    [selectEvent]
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
    async (meetingId: string, data: Partial<CreateMeetingData>) => {
      await updateMeeting(meetingId, data)
      setIsCreateModalOpen(false)
      setEditingMeeting(null)
      setIsDetailModalOpen(false)
    },
    [updateMeeting]
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
        conversationId: meeting.conversationId
      }
      selectEvent(event)
      setIsDetailModalOpen(true)
    },
    [selectEvent]
  )

  // Handle delete meeting
  const handleDeleteMeeting = useCallback(async () => {
    if (!selectedEvent) return
    await cancelMeeting(selectedEvent.id)
    setIsDetailModalOpen(false)
  }, [selectedEvent, cancelMeeting])

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

      window.dispatchEvent(
        new CustomEvent('chat:join-meeting', {
          detail: {
            meetingId: enrichedSelectedEvent.id,
            conversationId,
            title: enrichedSelectedEvent.title,
            participants
          }
        })
      )

      setIsDetailModalOpen(false)
    } catch (error) {
      console.error('[Calendar] Error dispatching join-meeting event:', error)
    }
  }, [enrichedSelectedEvent])

  // Handle quick join from calendar event item - dispatch event for Chat to handle
  const handleQuickJoinCall = useCallback((event: CalendarEvent) => {
    const conversationId = event.conversationId || event.id

    window.dispatchEvent(
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
    if (onOpenChat) {
      onOpenChat(id)
      setIsDetailModalOpen(false)
      return
    }
    const url = buildPlatformUrl('/platform/chat', { conversationId: id })
    navigateTo(url)
    setIsDetailModalOpen(false)
  }, [enrichedSelectedEvent, onOpenChat])

  // Handle create button click
  const handleCreateButtonClick = useCallback(() => {
    setEditingMeeting(null)
    setCreateModalInitialDate(undefined)
    setCreateModalInitialHour(undefined)
    setIsCreateModalOpen(true)
  }, [])

  // Close detail modal
  const handleCloseDetailModal = useCallback(() => {
    setIsDetailModalOpen(false)
    selectEvent(null)
  }, [selectEvent])

  // Error state
  if (error) {
    return (
      <div
        className="gba:h-full gba:flex gba:items-center gba:justify-center gba:p-4 gba:bg-background"
        data-testid={`${prefixDataTestId}-error`}
      >
        <Alert variant="destructive" className="gba:max-w-sm">
          <AlertDescription>{error}</AlertDescription>
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
    <div
      className="gba:h-full gba:flex gba:flex-col gba:bg-background gba:overflow-hidden"
      data-testid={prefixDataTestId}
    >
      {/* Header */}
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
        }}
        pendingInvitationsCount={pendingInvitations.length}
      />

      {/* Main content - just the calendar view, no sidebar to save space */}
      <div className="gba:flex-1 gba:overflow-hidden gba:relative">
        {isLoading && (
          <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:bg-background/50 gba:z-30">
            <Spinner className="gba:h-8 gba:w-8" />
          </div>
        )}
        {renderCalendarView()}
      </div>

      {/* Floating pending invitations badge */}
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
          >
            <span>{pendingInvitations.length} pending</span>
          </button>
        </div>
      )}

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
                color: editingMeeting.color,
                recurrence: editingMeeting.recurrence,
                recurrenceEndDate: editingMeeting.recurrenceEndDate,
                reminderMinutes: editingMeeting.reminderMinutes,
                participants: editingMeeting.participants,
                metadata: editingMeeting.metadata
              }
            : undefined
        }
      />

      <MeetingDetailModal
        event={enrichedSelectedEvent}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onRespond={handleRespondToInvitation}
        onEdit={enrichedSelectedEvent?.isOrganizer ? handleEditMeeting : undefined}
        onDelete={enrichedSelectedEvent?.isOrganizer ? handleDeleteMeeting : undefined}
        onStartCall={enrichedSelectedEvent?.meetingLink ? handleStartCall : undefined}
        onOpenChat={onOpenChat ? handleOpenChat : undefined}
        activeConversationCalls={activeConversationCalls}
      />
    </div>
  )
}

// Export the inner component as Calendar (RealtimeKitProvider is applied at modal level)
export const Calendar = CalendarInner

export default Calendar

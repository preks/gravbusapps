import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Alert, AlertDescription, Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl, getCurrentUrlWithUpdatedSearchParams } from '@/common/utils/navigationUtils'
import translations from '../_i18n'
import { setPendingJoinMeeting } from '../pendingJoinMeetingFromPlatform'
import { useCalendar } from './hooks/useCalendar'
import { useEmployeeAvatarsCache } from '../hooks/useEmployeeAvatarsCache'
import { CalendarHeader, DayView, WeekView, MonthView, CreateMeetingModal, MeetingDetailModal } from './components'
import { CalendarEvent, Meeting, CreateMeetingData, InvitationStatus, EventParticipant } from './types'

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
    dateRange,
    viewTitle
  } = useCalendar({
    accessToken,
    externalEvents: externalCalendarEvents
  })

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [createModalInitialDate, setCreateModalInitialDate] = useState<Date | undefined>()
  const [createModalInitialHour, setCreateModalInitialHour] = useState<number | undefined>()
  const [editingMeeting, setEditingMeeting] = useState<CalendarEvent | null>(null)
  const [enrichedSelectedEvent, setEnrichedSelectedEvent] = useState<CalendarEvent | null>(null)

  const { t } = useTranslation(translations)
  const { fetchAvatarsSync, requestAvatars } = useEmployeeAvatarsCache(accessToken)

  // Ref so timeout callback can read latest events (after date change triggers fetch)
  const eventsRef = useRef<CalendarEvent[]>(events)
  eventsRef.current = events

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
              if (meetingEvent) {
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
        if (meetingEvent) {
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
  }, [events, setCurrentDate, setView, selectEvent, refresh])

  // When events load and meetingId is in URL (e.g. opened from task link), open meeting once events are available.
  // Skip re-opening detail when create/edit modal is open (e.g. user clicked Edit).
  useEffect(() => {
    if (events.length === 0) return
    const meetingIdParam = new URLSearchParams(globalThis.window.location.search).get('meetingId')
    if (!meetingIdParam || isDetailModalOpen || isCreateModalOpen) return
    const meetingEvent = events.find(e => e.id === meetingIdParam)
    if (meetingEvent) {
      setCurrentDate(meetingEvent.start)
      setView('day')
      selectEvent(meetingEvent)
      setIsDetailModalOpen(true)
    }
  }, [events, isDetailModalOpen, isCreateModalOpen, selectEvent, setCurrentDate, setView])

  // Sync modal with browser back/forward: open/close modal when URL meetingId appears/disappears
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(globalThis.window.location.search)
      const meetingIdParam = urlParams.get('meetingId')
      if (meetingIdParam && !isDetailModalOpen) {
        const meetingEvent = events.find(e => e.id === meetingIdParam)
        if (meetingEvent) {
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
  }, [events, isDetailModalOpen, selectEvent, setCurrentDate, setView])

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
      selectEvent(event)
      setIsDetailModalOpen(true)
      setMeetingInUrl(event.id, event.start)
    },
    [selectEvent, setMeetingInUrl]
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
        conversationId: meeting.conversationId
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

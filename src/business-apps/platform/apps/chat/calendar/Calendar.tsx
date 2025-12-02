import React, { useState, useCallback } from 'react'
import { Alert, AlertDescription, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env } from '@/common/env/EnvUtils'
import { useCalendar } from './hooks/useCalendar'
import {
  CalendarHeader,
  DayView,
  WeekView,
  MonthView,
  CreateMeetingModal,
  MeetingDetailModal,
  PendingInvitationsPanel
} from './components'
import type { CalendarEvent, Meeting, CreateMeetingData, InvitationStatus } from './types'

interface CalendarProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const Calendar: React.FC<CalendarProps> = ({ accessToken, prefixDataTestId = 'calendar' }) => {
  // Build API URL
  let baseUrl = env('NEXT_PUBLIC_BASE_URL') || ''
  baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const apiUrl = env('NEXT_PUBLIC_CHAT_API') || `${baseUrl}/chat-service/api/v1`

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
    cancelMeeting,
    respondToInvitation,
    dateRange,
    viewTitle
  } = useCalendar({
    accessToken,
    apiUrl
  })

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [createModalInitialDate, setCreateModalInitialDate] = useState<Date | undefined>()
  const [createModalInitialHour, setCreateModalInitialHour] = useState<number | undefined>()

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
    },
    [createMeeting]
  )

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
        // Called from PendingInvitationsPanel: (meetingId, status)
        await respondToInvitation(meetingIdOrStatus as string, {
          status: statusOrComment as InvitationStatus,
          comment
        })
      }
    },
    [respondToInvitation, selectedEvent]
  )

  // Handle quick response from pending invitations
  const handleQuickResponse = useCallback(
    async (meetingId: string, status: InvitationStatus) => {
      await respondToInvitation(meetingId, { status })
    },
    [respondToInvitation]
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
        participantStatus: 'pending', // It's pending since it's in pending invitations
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

  // Handle create button click
  const handleCreateButtonClick = useCallback(() => {
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
          />
        )
      case 'week':
        return (
          <WeekView
            dateRange={dateRange}
            events={events}
            onEventClick={handleEventClick}
            onTimeSlotClick={handleTimeSlotClick}
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
        pendingInvitationsCount={pendingInvitations.length}
      />

      {/* Main content */}
      <div className="gba:flex-1 gba:flex gba:overflow-hidden">
        {/* Sidebar with pending invitations (desktop only) */}
        {pendingInvitations.length > 0 && (
          <div className="gba:w-80 gba:flex-shrink-0 gba:border-r gba:border-border/50 gba:overflow-y-auto gba:p-4 gba:hidden gba:lg:block">
            <PendingInvitationsPanel
              invitations={pendingInvitations}
              onRespond={handleQuickResponse}
              onViewDetails={handleViewInvitationDetails}
            />
          </div>
        )}

        {/* Calendar view */}
        <div className="gba:flex-1 gba:overflow-hidden gba:relative">
          {isLoading && (
            <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:bg-background/50 gba:z-30">
              <Spinner className="gba:h-8 gba:w-8" />
            </div>
          )}
          {renderCalendarView()}
        </div>
      </div>

      {/* Mobile pending invitations (as floating badge) */}
      {pendingInvitations.length > 0 && (
        <div className="gba:fixed gba:bottom-4 gba:right-4 gba:lg:hidden gba:z-20">
          <button
            onClick={() => {
              if (pendingInvitations[0]) {
                handleViewInvitationDetails(pendingInvitations[0])
              }
            }}
            className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2 gba:bg-warning gba:text-warning-foreground gba:rounded-full gba:shadow-lg gba:font-medium gba:text-sm"
          >
            <span>
              {pendingInvitations.length} pending invitation{pendingInvitations.length !== 1 ? 's' : ''}
            </span>
          </button>
        </div>
      )}

      {/* Modals */}
      <CreateMeetingModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateMeeting}
        accessToken={accessToken}
        initialDate={createModalInitialDate}
        initialHour={createModalInitialHour}
      />

      <MeetingDetailModal
        event={selectedEvent}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onRespond={handleRespondToInvitation}
        onDelete={selectedEvent?.isOrganizer ? handleDeleteMeeting : undefined}
      />
    </div>
  )
}

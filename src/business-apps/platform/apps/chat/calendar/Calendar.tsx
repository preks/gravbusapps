import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Alert, AlertDescription, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env } from '@/common/env/EnvUtils'
import { useCalendar } from './hooks/useCalendar'
import { useEmployeeAvatars } from '../hooks/useEmployeeAvatars'
import { CalendarHeader, DayView, WeekView, MonthView, CreateMeetingModal, MeetingDetailModal } from './components'
import { CallModal } from '../components/CallModal'
import { IncomingCallDialog } from '../components/IncomingCallDialog'
import { GroupCallModal } from '../components/GroupCallModal'
import { useCall } from '../hooks/useCall'
import { useGroupCall } from '../hooks/useGroupCall'
import { useChatClient } from '../hooks/useChatClient'
import type { CalendarEvent, Meeting, CreateMeetingData, InvitationStatus } from './types'
import type { CallParticipant } from '../services/webrtcClient'

interface CalendarProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const Calendar: React.FC<CalendarProps> = ({ accessToken, prefixDataTestId = 'calendar' }) => {
  // Build API URL
  let baseUrl = env('NEXT_PUBLIC_BASE_URL') || ''
  baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const apiUrl = env('NEXT_PUBLIC_CHAT_API') || `${baseUrl}/chat-service/api/v1`
  // Use chat-service namespace with default socket path (consistent with Chat.tsx)
  const wsUrl = `${baseUrl}/chat-service`
  const wsSocketPath = '/chat-service/socket.io'

  // Initialize chat client for WebSocket and API access (needed for calls)
  const chatClient = useChatClient({
    accessToken,
    apiUrl,
    wsUrl,
    wsSocketPath
  })

  const { currentUser, wsClient, apiClient } = chatClient

  // Convert current user to CallParticipant format
  const currentUserAsParticipant: CallParticipant | null = useMemo(() => {
    if (!currentUser) return null
    return {
      id: currentUser.id,
      odId: currentUser.id,
      odName:
        currentUser.displayName ||
        `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
        currentUser.username ||
        'Unknown',
      avatarUrl: currentUser.avatarUrl
    }
  }, [currentUser])

  // 1:1 Call functionality (for 2-person meetings)
  const {
    callState,
    isInCall,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    localStream,
    remoteStream
  } = useCall({
    wsClient: wsClient || null,
    apiClient: apiClient || null,
    currentUser: currentUserAsParticipant,
    onCallStarted: (callId, participant) => {
      console.debug('Meeting 1:1 call started:', callId, participant)
    },
    onCallEnded: (callId, duration) => {
      console.debug('Meeting 1:1 call ended:', callId, 'Duration:', duration, 'ms')
    }
  })

  // Group Call functionality (for meetings with 3+ participants)
  const {
    callState: groupCallState,
    isInCall: isInGroupCall,
    localStream: groupLocalStream,
    remoteStreams: groupRemoteStreams,
    participants: groupParticipants,
    joinCall: joinGroupCall,
    leaveCall: leaveGroupCall,
    toggleMute: toggleGroupMute,
    toggleVideo: toggleGroupVideo,
    toggleScreenShare: toggleGroupScreenShare
  } = useGroupCall({
    wsClient: wsClient || null,
    apiClient: apiClient || null,
    currentUser: currentUserAsParticipant,
    onCallStarted: (roomId, participants) => {
      console.debug('Meeting group call started:', roomId, participants.length, 'participants')
    },
    onCallEnded: (roomId, duration) => {
      console.debug('Meeting group call ended:', roomId, 'Duration:', duration, 'ms')
    }
  })

  // Combined in-call state
  const isInAnyCall = isInCall || isInGroupCall

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
  const [editingMeeting, setEditingMeeting] = useState<CalendarEvent | null>(null)
  const [enrichedSelectedEvent, setEnrichedSelectedEvent] = useState<CalendarEvent | null>(null)

  // Avatar fetching hook
  const { fetchAvatarsWithEmployeeIds } = useEmployeeAvatars(accessToken)

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
        const employeeInfoMap = await fetchAvatarsWithEmployeeIds(userIds)

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
  }, [selectedEvent, isDetailModalOpen, fetchAvatarsWithEmployeeIds])

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

  // Handle starting a meeting call
  const handleStartCall = useCallback(() => {
    if (!enrichedSelectedEvent || !currentUser) return

    // Get all accepted participants (excluding current user)
    const callParticipants: CallParticipant[] = []

    if (enrichedSelectedEvent.participants) {
      for (const p of enrichedSelectedEvent.participants) {
        if ((p.status === 'accepted' || p.isOrganizer) && p.id !== currentUser.id) {
          callParticipants.push({
            id: p.id,
            odId: p.id,
            odName: p.displayName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email || 'Unknown',
            avatarUrl: p.avatarUrl
          })
        }
      }
    }

    // Also add organizer if not current user and not already in list
    if (
      enrichedSelectedEvent.organizer &&
      enrichedSelectedEvent.organizer.id !== currentUser.id &&
      !callParticipants.find(p => p.id === enrichedSelectedEvent.organizer.id)
    ) {
      callParticipants.push({
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

    if (callParticipants.length === 0) {
      console.warn('No valid participants found to call')
      return
    }

    // Use meeting ID as room ID for the call
    const roomId = enrichedSelectedEvent.id

    // If only 1 other participant, use 1:1 call. Otherwise use group call.
    if (callParticipants.length === 1) {
      // 1:1 call
      initiateCall(callParticipants[0], 'video', roomId)
    } else {
      // Group call (2+ other participants)
      joinGroupCall(roomId, 'video', callParticipants)
    }

    setIsDetailModalOpen(false)
  }, [enrichedSelectedEvent, currentUser, initiateCall, joinGroupCall])

  // Handle opening chat for conversation - navigate to chat with conversation ID
  const handleOpenChat = useCallback(() => {
    if (!enrichedSelectedEvent?.conversationId) return
    // Navigate to chat with the conversation ID
    const chatUrl = `/platform/apps/chat?conversationId=${enrichedSelectedEvent.conversationId}`
    window.location.href = chatUrl
    setIsDetailModalOpen(false)
  }, [enrichedSelectedEvent])

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
                color: editingMeeting.color
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
        onStartCall={enrichedSelectedEvent?.meetingLink && !isInAnyCall ? handleStartCall : undefined}
        onOpenChat={enrichedSelectedEvent?.conversationId ? handleOpenChat : undefined}
      />

      {/* 1:1 Call Components - render only when needed */}
      {callState.status === 'ringing' && callState.direction === 'incoming' && (
        <IncomingCallDialog
          callState={callState}
          onAccept={acceptCall}
          onReject={rejectCall}
          prefixDataTestId={`${prefixDataTestId}-incoming-call`}
        />
      )}

      {callState.status !== 'idle' && !(callState.status === 'ringing' && callState.direction === 'incoming') && (
        <CallModal
          callState={callState}
          localStream={localStream}
          remoteStream={remoteStream}
          onEndCall={endCall}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={toggleScreenShare}
          prefixDataTestId={`${prefixDataTestId}-call`}
        />
      )}

      {/* Group Call Modal */}
      {groupCallState.status !== 'idle' && (
        <GroupCallModal
          callState={groupCallState}
          localStream={groupLocalStream}
          remoteStreams={groupRemoteStreams}
          participants={groupParticipants}
          onEndCall={leaveGroupCall}
          onToggleMute={toggleGroupMute}
          onToggleVideo={toggleGroupVideo}
          onToggleScreenShare={toggleGroupScreenShare}
          prefixDataTestId={`${prefixDataTestId}-group-call`}
        />
      )}
    </div>
  )
}

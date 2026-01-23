import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Alert, AlertDescription, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env } from '@/common/env/EnvUtils'
import { useCalendar } from './hooks/useCalendar'
import { useEmployeeAvatarsCache } from '../hooks/useEmployeeAvatarsCache'
import { CalendarHeader, DayView, WeekView, MonthView, CreateMeetingModal, MeetingDetailModal } from './components'
import { CallModal } from '../components/CallModal'
import { IncomingCallDialog } from '../components/IncomingCallDialog'
import { GroupCallModal } from '../components/GroupCallModal'
import { GroupCallModalRtk } from '../components/GroupCallModalRtk'
import { RealtimeKitProvider } from '@cloudflare/realtimekit-react'
import { useCall } from '../hooks/useCall'
import { useGroupCall } from '../hooks/useGroupCall'
import { useRealtimeKitGroupCall } from '../hooks/useRealtimeKitGroupCall'
import { RealtimeKitApiClient } from '../services/realtimeKitApiClient'
import { useChatClient } from '../hooks/useChatClient'
import { CalendarEvent, Meeting, CreateMeetingData, InvitationStatus } from './types'
import type { CallParticipant } from '../services/webrtcClient'
import { rtkDebug } from '../utils/rtkDebug'

interface CalendarProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const CalendarInner: React.FC<CalendarProps> = ({ accessToken, prefixDataTestId = 'calendar' }) => {
  // Build API URL (matching Chat.tsx logic)
  let baseUrl = env('NEXT_PUBLIC_BASE_URL') || ''
  baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

  // Check if we have an explicit chat service URL override (for local development)
  const chatServiceOverride = env('NEXT_PUBLIC_CHAT_SERVICE_URL')

  let apiUrl: string
  let wsUrl: string
  let wsSocketPath: string

  if (chatServiceOverride) {
    // Local development: chat-service running directly
    const localUrl = chatServiceOverride.endsWith('/') ? chatServiceOverride.slice(0, -1) : chatServiceOverride
    apiUrl = `${localUrl}/api/v1`
    wsUrl = `${localUrl}/chat-service` // MUST include namespace
    wsSocketPath = '/socket.io' // Local chat-service uses /socket.io directly (no /chat-service prefix)
  } else {
    // Production/Dev environment: chat-service behind Kong gateway with /chat-service prefix
    // If platform is running on localhost (baseUrl includes localhost), connect to DEV environment
    const isLocalPlatform = baseUrl.includes('localhost')
    if (isLocalPlatform) {
      baseUrl = 'https://newwork-dev.newwork.com'
    }

    // Normalize API and WS endpoints; connect to chat-service namespace with default socket path
    apiUrl = env('NEXT_PUBLIC_CHAT_API') || `${baseUrl}/chat-service/api/v1` || ''

    // Override if NEXT_PUBLIC_CHAT_API is pointing to localhost when running on local platform
    if (apiUrl.includes('localhost')) {
      apiUrl = `${baseUrl}/chat-service/api/v1`
    }

    wsUrl = `${baseUrl}/chat-service` // namespace in URL (matches gateway)
    // Ensure Socket.IO path keeps /chat-service prefix (Kong strip-path=true compatible)
    wsSocketPath = env('NEXT_PUBLIC_CHAT_WS_PATH') || '/chat-service/socket.io'
  }

  // Initialize chat client for WebSocket and API access (needed for calls)
  const chatClient = useChatClient({
    accessToken,
    apiUrl,
    wsUrl,
    wsSocketPath
  })

  const { currentUser, wsClient, apiClient } = chatClient

  // Initialize RealtimeKit API client (for RealtimeKit group calls)
  // For RealtimeKitApiClient, we need the base URL without /api/v1 suffix
  // because it adds /api/v1/realtimekit internally
  const realtimeKitBaseUrl = useMemo(() => {
    if (chatServiceOverride) {
      // Local: http://localhost:3000
      return chatServiceOverride.endsWith('/') ? chatServiceOverride.slice(0, -1) : chatServiceOverride
    } else {
      // Remote: https://newwork-dev.newwork.com/chat-service
      return `${baseUrl}/chat-service`
    }
  }, [chatServiceOverride, baseUrl])

  const realtimeKitApiClient = useMemo(() => {
    if (accessToken && realtimeKitBaseUrl) {
      return new RealtimeKitApiClient(realtimeKitBaseUrl, accessToken)
    }
    return null
  }, [accessToken, realtimeKitBaseUrl])

  // Determine which group call implementation to use
  // Default: Use RealtimeKit. Set NEXT_PUBLIC_ENABLE_REALTIME_KIT_GROUP_CALLS=false to use old mesh implementation
  const useRealtimeKitForGroupCalls = env('NEXT_PUBLIC_ENABLE_REALTIME_KIT_GROUP_CALLS') !== 'false'

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

  // Group Call functionality - Conditionally use Realtime Kit or Mesh topology
  // Default: Use RealtimeKit. Set NEXT_PUBLIC_ENABLE_REALTIME_KIT_GROUP_CALLS=false to use old mesh implementation
  const meshGroupCall = useGroupCall({
    wsClient: wsClient || null,
    apiClient: apiClient || null,
    currentUser: currentUserAsParticipant,
    onCallStarted: (roomId, participants) => {
      console.debug('Meeting group call started (mesh):', roomId, participants.length, 'participants')
    },
    onCallEnded: (roomId, duration) => {
      console.debug('Meeting group call ended (mesh):', roomId, 'Duration:', duration, 'ms')
    }
  })

  const realtimeKitGroupCall = useRealtimeKitGroupCall({
    wsClient: wsClient || null,
    apiClient: realtimeKitApiClient,
    currentUser: currentUserAsParticipant
  })

  // Route to appropriate implementation based on feature flag
  const groupCall = useRealtimeKitForGroupCalls ? realtimeKitGroupCall : meshGroupCall

  const {
    callState: groupCallState,
    isInCall: isInGroupCall,
    localStream: groupLocalStream,
    remoteStreams: groupRemoteStreams,
    participants: groupParticipants,
    activeConversationCalls: groupActiveConversationCalls,
    startCall: startGroupCall,
    joinCall: joinGroupCall,
    leaveCall: leaveGroupCall,
    toggleMute: toggleGroupMute,
    toggleVideo: toggleGroupVideo,
    toggleScreenShare: toggleGroupScreenShare,
    toggleMinimize: toggleGroupMinimize,
    toggleBackground: toggleGroupBackground
  } = groupCall

  // For mesh implementation, activeConversationCalls might not exist, so provide fallback
  const activeConversationCalls = useRealtimeKitForGroupCalls
    ? (groupActiveConversationCalls as Map<string, any> | undefined)
    : undefined

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
  const handleStartCall = useCallback(async () => {
    if (!enrichedSelectedEvent || !currentUser) return

    // Get all participants (including organizer) for the call
    // For RealtimeKit, we include all participants - they can join when invited
    const callParticipants: CallParticipant[] = []

    // Add all participants (accepted or organizer status)
    if (enrichedSelectedEvent.participants) {
      for (const p of enrichedSelectedEvent.participants) {
        // Include if accepted, or if organizer (even if not explicitly accepted)
        // Exclude current user from participant list (they're the one starting the call)
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

    rtkDebug.log('[Calendar] Collected participants for call:', {
      meetingId: enrichedSelectedEvent.id,
      meetingTitle: enrichedSelectedEvent.title,
      totalParticipants: enrichedSelectedEvent.participants?.length || 0,
      callParticipants: callParticipants.map(p => ({ id: p.id, name: p.odName })),
      allEventParticipants:
        enrichedSelectedEvent.participants?.map(p => ({
          id: p.id,
          name: p.displayName || p.email,
          status: p.status,
          isOrganizer: p.isOrganizer
        })) || []
    })

    // Use meeting ID as conversationId for RealtimeKit calls
    // This ensures each calendar meeting has its own isolated call
    // NOTE: We use meeting ID, NOT the conversationId field, to prevent meetings from
    // accidentally sharing calls with chat conversations or other meetings
    const conversationId = enrichedSelectedEvent.id

    rtkDebug.log('[Calendar] Starting call for meeting:', {
      meetingId: enrichedSelectedEvent.id,
      meetingTitle: enrichedSelectedEvent.title,
      conversationId: enrichedSelectedEvent.conversationId, // For reference only
      usingConversationId: conversationId,
      participants: enrichedSelectedEvent.participants?.map(p => ({ id: p.id, name: p.displayName || p.email })) || []
    })

    // For RealtimeKit: Always use group call (it handles 1:1 as well)
    // For mesh: Use 1:1 for single participant, group for multiple
    if (useRealtimeKitForGroupCalls) {
      // Check if we're already in a call for this conversation
      if (isInGroupCall && groupCallState.roomId) {
        // Check if the current call is for this meeting by looking up the conversationId
        const currentCallEntry = activeConversationCalls
          ? Array.from(activeConversationCalls.entries()).find(
              ([convId, call]) => convId === conversationId || call.roomId === groupCallState.roomId
            )
          : null

        if (currentCallEntry) {
          const [currentConvId, currentCall] = currentCallEntry
          // If we found a call for this conversationId, we're already in the right call
          if (currentConvId === conversationId) {
            rtkDebug.log('[Calendar] Already in a call for this meeting, ignoring duplicate start request:', {
              conversationId,
              currentRoomId: groupCallState.roomId,
              currentCallRoomId: currentCall.roomId
            })
            return
          }
        }
      }

      // Check if there's already an active call for this meeting (started by someone else)
      const existingCall = activeConversationCalls?.get(conversationId)

      rtkDebug.log('[Calendar] Checking for existing call:', {
        conversationId,
        existingCall: existingCall
          ? {
              roomId: existingCall.roomId,
              callType: existingCall.callType,
              startedBy: existingCall.startedBy
            }
          : null,
        activeConversationCallsSize: activeConversationCalls?.size || 0,
        isCurrentlyInCall: isInGroupCall,
        currentRoomId: groupCallState.roomId
      })

      if (existingCall && existingCall.roomId) {
        // Join the existing call
        rtkDebug.log('[Calendar] Joining existing RealtimeKit call for meeting:', {
          conversationId,
          roomId: existingCall.roomId,
          callType: existingCall.callType
        })
        joinGroupCall(existingCall.roomId, 'video', undefined)
      } else {
        // Wait a short time for WebSocket events to arrive (in case another user just started a call)
        // The backend will also check for existing meetings, so this is just an optimization
        await new Promise(resolve => setTimeout(resolve, 300))

        // Check again after the delay
        const existingCallAfterDelay = activeConversationCalls?.get(conversationId)
        if (existingCallAfterDelay && existingCallAfterDelay.roomId) {
          rtkDebug.log('[Calendar] Found existing call after delay, joining:', {
            conversationId,
            roomId: existingCallAfterDelay.roomId
          })
          joinGroupCall(existingCallAfterDelay.roomId, 'video', undefined)
          return
        }

        // Start a new group call with the meeting ID as conversationId
        // Backend will return existing meeting if one exists for this conversationId
        // Even if no other participants yet, we can start the call (they can join via invite)
        rtkDebug.log('[Calendar] Starting new RealtimeKit group call for meeting:', {
          conversationId,
          meetingTitle: enrichedSelectedEvent.title,
          participantCount: callParticipants.length,
          participants: callParticipants.map(p => ({ id: p.id, name: p.odName }))
        })
        startGroupCall(conversationId, 'video', callParticipants, enrichedSelectedEvent.title)
      }
    } else {
      // Old mesh implementation
      if (callParticipants.length === 0) {
        console.warn('No valid participants found to call')
        return
      }

      if (callParticipants.length === 1) {
        // 1:1 call
        initiateCall(callParticipants[0], 'video', conversationId)
      } else {
        // Group call (2+ other participants)
        joinGroupCall(conversationId, 'video', callParticipants)
      }
    }

    setIsDetailModalOpen(false)
  }, [
    enrichedSelectedEvent,
    currentUser,
    initiateCall,
    joinGroupCall,
    startGroupCall,
    useRealtimeKitForGroupCalls,
    activeConversationCalls,
    isInGroupCall,
    groupCallState.roomId
  ])

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
      {groupCallState.status !== 'idle' &&
        (useRealtimeKitForGroupCalls && realtimeKitGroupCall.meeting ? (
          <RealtimeKitProvider value={realtimeKitGroupCall.meeting}>
            <GroupCallModalRtk
              callState={groupCallState}
              localStream={groupLocalStream}
              remoteStreams={groupRemoteStreams}
              participants={groupParticipants}
              onEndCall={leaveGroupCall}
              onToggleMute={toggleGroupMute}
              onToggleVideo={toggleGroupVideo}
              onToggleScreenShare={toggleGroupScreenShare}
              onToggleMinimize={toggleGroupMinimize}
              onToggleBackground={toggleGroupBackground}
              onInviteParticipant={(participant: CallParticipant) => {
                // RealtimeKit inviteToCall if available
                if ('inviteToCall' in groupCall && typeof groupCall.inviteToCall === 'function') {
                  groupCall.inviteToCall([participant])
                }
              }}
              accessToken={accessToken}
              currentUserId={currentUser?.id || null}
              conversationName={
                realtimeKitGroupCall.currentCallConversationName ||
                realtimeKitGroupCall.incomingInvite?.conversationName ||
                (enrichedSelectedEvent ? enrichedSelectedEvent.title : undefined)
              }
            />
          </RealtimeKitProvider>
        ) : (
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
        ))}
    </div>
  )
}

// Export the inner component as Calendar (RealtimeKitProvider is applied at modal level)
export const Calendar = CalendarInner

export default Calendar

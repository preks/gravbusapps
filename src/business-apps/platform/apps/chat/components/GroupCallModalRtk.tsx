/**
 * GroupCallModalRtk - Modal for Realtime Kit group video/audio calls
 *
 * This component uses Cloudflare Realtime Kit SDK to render remote participants
 * and handle media streaming through SFU infrastructure.
 *
 * Phase 2: Full SDK integration with remote video/audio rendering
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRealtimeKitSelector } from '@cloudflare/realtimekit-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription, toast } from '@newwork/nw-design-system'
import { Monitor, Maximize2 } from 'lucide-react'
import type { GroupCallParticipant, VideoQuality } from '../services/groupWebrtcClient'
import type { GroupCallUIState, PendingInvite } from '../hooks/useGroupCall'
import type { CallParticipant } from '../services/webrtcClient'
import type { ChatWebSocketClient } from '../services/chatWebSocketClient'
import type { ChatApiClient } from '../services/chatApiClient'
import { ConversationType } from '../types'
import { useChatTranslation } from '../contexts/TranslationContext'
import { rtkDebug } from '../utils/rtkDebug'
import {
  CallHeader,
  MinimizedCallView,
  ScreenShareView,
  CallControlsBar,
  ParticipantsPanel,
  ChatPanel,
  MemoizedParticipantVideoTile,
  VideoGrid,
  HorizontalFilmstrip
} from './call'
import { isVideoTrackScreenShare, extractTracksFromCollection } from '../utils/callUtils'
import { globalCallManager } from '../services/globalCallManager'

// RealtimeKit peer type with SDK-specific properties
interface RealtimeKitPeer extends GroupCallParticipant {
  name?: string // RealtimeKit uses 'name' instead of 'odName'
  userId?: string // SDK-assigned user ID
  customParticipantId?: string // Database user ID for matching reactions/raised hands
  audioTrack?: MediaStreamTrack
  videoTrack?: MediaStreamTrack
  audioEnabled?: boolean // Whether audio is enabled for this peer
  videoEnabled?: boolean // Whether video is enabled for this peer
  screenShareEnabled?: boolean
  screenShareTracks?: any
}

interface AvailableParticipant {
  id: string
  odId: string
  odName: string
  avatarUrl?: string
}

// Sidebar panel state type
type SidebarView = 'closed' | 'participants' | 'chat'

interface GroupCallModalRtkProps {
  viewMode: 'full' | 'minimized' // NEW: Control display mode without unmounting
  callState: GroupCallUIState
  localStream: MediaStream | null
  remoteStreams: Map<string, MediaStream>
  participants: GroupCallParticipant[]
  pendingInvites?: Map<string, PendingInvite>
  activeSpeakerId?: string | null // Current active speaker RTK peer ID
  activeSpeakerHistory?: string[] // Recent speakers for sorting
  onEndCall: () => void
  onToggleMute: () => void
  onToggleVideo: () => void
  onToggleScreenShare?: () => void
  onSetVideoQuality?: (quality: VideoQuality) => void
  onToggleMinimize?: () => void
  onToggleBackground?: () => void
  onToggleRaiseHand?: () => void
  onSendReaction?: (emoji: string) => void
  onMicDeviceChange?: (deviceId: string) => Promise<void>
  onCameraDeviceChange?: (deviceId: string) => Promise<void>
  onSetNoiseSuppressionEnabled?: (enabled: boolean) => Promise<void> | void
  onSetAutoGainControlEnabled?: (enabled: boolean) => Promise<void> | void
  backgroundEnabled?: boolean
  prefixDataTestId?: string
  availableParticipants?: AvailableParticipant[]
  onInviteParticipant?: (participant: CallParticipant) => void
  onReconnectParticipant?: (participantId: string) => Promise<void>
  getConnectionDiagnostics?: () => Map<string, any>
  accessToken?: string
  currentUserId?: string | null
  currentUser?: any // Full user object for AI context
  conversationName?: string
  wsClient?: ChatWebSocketClient | null
  transcriptionEnabled?: boolean
  apiClient?: ChatApiClient
  callConversation?: any // Conversation where call was initiated (for participant avatars)
  activeConversation?: any // Currently active conversation (for in-call chat)
  activeExperts?: any[] // Every AI experts for mentions in chat
  hideReactionsAndHandRaise?: boolean // Hide reactions and hand-raising UI (for 1-on-1 calls)
}

// Helper to get screen share track from peer
const getScreenShareTrack = (peer: any): MediaStreamTrack | null => {
  // First check screenShareTracks - handle various collection types
  const screenShareTracks = extractTracksFromCollection(peer.screenShareTracks)
  if (screenShareTracks.length > 0) {
    // CRITICAL: For tab sharing, SDK returns BOTH video and audio tracks
    // We MUST get the VIDEO track (kind === 'video'), not the audio track!
    // Also check track is still live (not ended/stopped)
    const videoTrack = screenShareTracks.find(t => t.kind === 'video' && t.readyState === 'live')

    if (videoTrack) {
      rtkDebug.log(`[RTK Modal] Found live VIDEO screen share track for peer ${peer.name || peer.id}:`, {
        trackId: videoTrack.id,
        trackLabel: videoTrack.label,
        trackKind: videoTrack.kind,
        readyState: videoTrack.readyState,
        totalTracks: screenShareTracks.length,
        allTrackKinds: screenShareTracks.map(t => t.kind)
      })
      return videoTrack
    }

    // Fallback: use first live track if no video track found
    const firstLiveTrack = screenShareTracks.find(t => t.readyState === 'live')
    if (firstLiveTrack) {
      rtkDebug.warn(
        `[RTK Modal] ⚠️ No live video track in screenShareTracks for peer ${peer.name || peer.id}, using first live:`,
        {
          firstTrackKind: firstLiveTrack.kind,
          allTracks: screenShareTracks.map(t => ({ id: t.id, kind: t.kind, label: t.label, readyState: t.readyState }))
        }
      )
      return firstLiveTrack
    }
    rtkDebug.warn(`[RTK Modal] ⚠️ All screen share tracks ended for peer ${peer.name || peer.id}`)
  }

  // Then check if videoTrack is actually a screen share and still live
  if (peer.videoTrack && isVideoTrackScreenShare(peer.videoTrack) && peer.videoTrack.readyState === 'live') {
    rtkDebug.log(`[RTK Modal] Found live screen share track in videoTrack for peer ${peer.name || peer.id}:`, {
      trackId: peer.videoTrack.id,
      trackLabel: peer.videoTrack.label,
      trackKind: peer.videoTrack.kind,
      readyState: peer.videoTrack.readyState
    })
    return peer.videoTrack
  }

  // Debug: Log what we found
  if (peer.screenShareEnabled) {
    rtkDebug.warn(`[RTK Modal] Peer ${peer.name || peer.id} has screenShareEnabled=true but no track found:`, {
      screenShareEnabled: peer.screenShareEnabled,
      screenShareTracks: peer.screenShareTracks,
      screenShareTracksType: typeof peer.screenShareTracks,
      videoTrack: peer.videoTrack
        ? {
            id: peer.videoTrack.id,
            label: peer.videoTrack.label,
            isScreenShare: isVideoTrackScreenShare(peer.videoTrack)
          }
        : null
    })
  }

  return null
}

// Stable empty function for missing callbacks
const NOOP = () => {}

const GroupCallModalRtkComponent: React.FC<GroupCallModalRtkProps> = ({
  viewMode,
  callState,
  localStream,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  remoteStreams: _remoteStreams, // Unused in RTK - streams built from peer tracks
  participants,
  pendingInvites,
  availableParticipants,
  activeSpeakerId, // Current active speaker
  activeSpeakerHistory, // Recent speakers for sorting
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleMinimize,
  onToggleBackground,
  onToggleRaiseHand,
  onSendReaction,
  onMicDeviceChange,
  onCameraDeviceChange,
  onSetNoiseSuppressionEnabled,
  onSetAutoGainControlEnabled,
  onInviteParticipant,
  prefixDataTestId = 'rtk-group-call',
  conversationName,
  wsClient,
  transcriptionEnabled,
  apiClient,
  accessToken,
  currentUserId,
  currentUser,
  callConversation: callConversationProp,
  activeConversation,
  activeExperts,
  hideReactionsAndHandRaise = false
}) => {
  // Generate unique instance ID to prevent portal conflicts when multiple instances exist
  const [instanceId] = useState(() => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

  // Cleanup portal container on unmount
  useEffect(() => {
    return () => {
      const portalContainerId = `rtk-group-call-minimized-portal-${instanceId}`
      const portalContainer = document.getElementById(portalContainerId)
      if (portalContainer) {
        portalContainer.remove()
      }
    }
  }, [instanceId])

  // Create conversation object for the call based on roomId
  // Use the call's conversation, NOT the active conversation from sidebar
  // CRITICAL: Use ref + effect to maintain stable object reference
  const callConversationRef = useRef<any>(null)

  // Update the ref only when roomId or calendarMeetingId changes
  useEffect(() => {
    if (!callState.roomId) {
      callConversationRef.current = null
      return
    }

    // For chat panel: Use calendarMeetingId if available (calendar meeting case)
    // For call session: Still use roomId (meeting ID)
    const chatConversationId = callState.calendarMeetingId || callState.roomId

    // Only create/update if the chat conversation ID changed
    if (!callConversationRef.current || callConversationRef.current.id !== chatConversationId) {
      rtkDebug.log('[RTK Modal] Creating call conversation for chat:', {
        roomId: callState.roomId,
        calendarMeetingId: callState.calendarMeetingId,
        chatConversationId,
        isCalendarMeeting: !!callState.calendarMeetingId,
        hasActiveConversation: !!activeConversation,
        activeConversationId: activeConversation?.id,
        activeConversationParticipantsCount: activeConversation?.participants?.length || 0
      })

      callConversationRef.current = {
        id: chatConversationId, // Use the real conversation ID for chat
        name: conversationName || 'Group Call',
        type: ConversationType.GROUP,
        participants:
          activeConversation?.participants ||
          // Fallback: Create participants from call participants if activeConversation is not available
          participants.map(p => {
            // Type assertion to access potentially additional fields that might exist at runtime
            const pAny = p as any

            // Build display name with fallbacks: odName -> firstName + lastName -> 'Unknown'
            const displayName =
              p.odName ||
              (pAny.firstName || pAny.lastName ? `${pAny.firstName || ''} ${pAny.lastName || ''}`.trim() : '') ||
              'Unknown'

            return {
              userId: p.id || p.odId,
              user: {
                id: p.id || p.odId,
                displayName,
                firstName: pAny.firstName,
                lastName: pAny.lastName,
                username: p.odName || displayName,
                avatarUrl: p.avatarUrl
              }
            }
          }),
        isActive: true,
        createdBy: activeConversation?.createdBy || '',
        createdAt: activeConversation?.createdAt || new Date().toISOString(),
        updatedAt: activeConversation?.updatedAt || new Date().toISOString()
      }
    }
  }, [callState.roomId, callState.calendarMeetingId, activeConversation, conversationName, participants]) // Added participants to deps

  // Return the stable reference - this never changes unless chat conversation ID changes
  const callConversation = callConversationRef.current
  const t = useChatTranslation()
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
  const screenShareVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())

  // Speaker output selection (sinkId). Updated by CallControlsBar.
  const selectedAudioOutputIdRef = useRef<string | null>(null)

  const applySinkIdToElement = useCallback(async (el: HTMLMediaElement | null, deviceId: string | null) => {
    if (!el || !deviceId) return
    const setSinkId = (el as any).setSinkId as ((id: string) => Promise<void>) | undefined
    if (typeof setSinkId !== 'function') return
    try {
      await setSinkId.call(el, deviceId)
    } catch (err) {
      // Best-effort only (browser support / secure context / user gesture constraints).
      console.debug('[RTK Modal] Failed to set sinkId', err)
    }
  }, [])

  // Track when video elements are created/destroyed to trigger stream attachment effect
  // This avoids adding callState.isMinimized to effect deps which causes re-render loops
  const [videoElementsVersion, setVideoElementsVersion] = useState(0)

  // Callback ref for local video that triggers version increment
  const setLocalVideoRef = useCallback((el: HTMLVideoElement | null) => {
    ;(localVideoRef as any).current = el
    if (el) {
      setVideoElementsVersion(v => v + 1)
    }
  }, [])

  // Stable video ref callback factory to prevent video element recreation on every render
  // This ref callback Map is stable across renders and prevents React from destroying/recreating video elements
  const videoRefCallbacksRef = useRef<Map<string, (el: HTMLVideoElement | null) => void>>(new Map())

  const getVideoRefCallback = useCallback(
    (peerId: string, peerName: string, isLocal: boolean) => {
      // Return existing callback if available (stable reference)
      if (videoRefCallbacksRef.current.has(peerId)) {
        return videoRefCallbacksRef.current.get(peerId)!
      }

      // Create new stable callback for this peer
      const callback = (el: HTMLVideoElement | null) => {
        if (el) {
          if (isLocal) {
            setLocalVideoRef(el)
          } else {
            remoteVideoRefs.current.set(peerId, el)
            void applySinkIdToElement(el, selectedAudioOutputIdRef.current)
            setVideoElementsVersion(v => v + 1)
          }
        } else {
          rtkDebug.log(`[RTK Modal] 🗑️ Video element destroyed for ${isLocal ? 'local' : 'peer'}`, {
            peerId,
            peerName,
            isLocal,
            isMinimized: callState.isMinimized,
            timestamp: Date.now()
          })
          if (isLocal) {
            setLocalVideoRef(null)
          } else {
            remoteVideoRefs.current.delete(peerId)
          }
        }
      }

      videoRefCallbacksRef.current.set(peerId, callback)
      return callback
    },
    [setLocalVideoRef, callState.isMinimized]
  )

  const [focusedScreenShareId, setFocusedScreenShareId] = useState<string | null>(null)
  const [expandedScreenShare, setExpandedScreenShare] = useState<{
    peerId: string
    peerName: string
    stream: MediaStream
  } | null>(null)

  // Get the meeting object to access self.userId
  const meeting = useRealtimeKitSelector((m: any) => m)

  // Derive current participant from participants or meeting
  const currentParticipant = participants.find(
    p => p.id === currentUserId || p.id === meeting?.self?.customParticipantId
  )

  // RealtimeKit meetingId (Socket.IO group-call room) is not part of GroupCallUIState typing,
  // but it is present in global call state for RTK calls.
  const globalMeetingId = ((globalCallManager.getCallData().callState as any)?.meetingId as string | null) || null

  // CRITICAL: Derive local media state from SDK (source of truth), falling back to callState.
  // callState can be stale after navigation because it comes from globalCallManager.
  const effectiveLocalIsMuted =
    meeting?.self?.audioEnabled !== undefined ? !meeting.self.audioEnabled : callState.isMuted
  const effectiveLocalIsVideoEnabled =
    meeting?.self?.videoEnabled !== undefined ? meeting.self.videoEnabled : callState.isVideoEnabled

  // ==================== Raise hand (Socket.IO truth) ====================
  // Seed from callState so we don't "lose" remote hands/order when the first WS event we receive is local-only.
  const [wsLocalHandRaised, setWsLocalHandRaised] = useState<boolean>(() => callState.handRaised)
  const [wsRemoteHandsRaised, setWsRemoteHandsRaised] = useState<Record<string, boolean>>(
    () => callState.remoteHandsRaised || {}
  )
  const [wsHandRaisedOrder, setWsHandRaisedOrder] = useState<Record<string, { order: number; timestamp: number }>>(
    () => callState.handRaisedOrder || {}
  )

  // Keep WS-derived state aligned with global callState updates (optimistic updates + other writers).
  useEffect(() => {
    setWsLocalHandRaised(callState.handRaised)
  }, [callState.handRaised])

  useEffect(() => {
    setWsRemoteHandsRaised(callState.remoteHandsRaised || {})
  }, [callState.remoteHandsRaised])

  useEffect(() => {
    setWsHandRaisedOrder(callState.handRaisedOrder || {})
  }, [callState.handRaisedOrder])

  useEffect(() => {
    const meetingId = globalMeetingId
    const localUserId = currentUserId

    if (!wsClient || !meetingId || !localUserId) return

    // Best-effort: ensure socket exists after navigation
    let socket = wsClient.getSocket()
    if (!socket && accessToken) {
      try {
        wsClient.connect(accessToken)
        socket = wsClient.getSocket()
      } catch {
        // Best-effort only
      }
    }
    if (!socket) return

    const resolveIds = (participantId: string, isLocal: boolean) => {
      let participantPeerId: string | undefined
      let participantUserId: string | undefined
      let participantCustomId: string | undefined = participantId

      if (isLocal) {
        participantPeerId = meeting?.self?.id
        participantUserId = meeting?.self?.userId
        participantCustomId = meeting?.self?.customParticipantId || participantId
      } else if (meeting?.participants?.joined) {
        const joined = Array.from(meeting.participants.joined.values())
        const matchingPeer: any = joined.find(
          (p: any) => p.customParticipantId === participantId || p.userId === participantId || p.id === participantId
        )
        if (matchingPeer) {
          participantPeerId = matchingPeer.id
          participantUserId = matchingPeer.userId
          participantCustomId = matchingPeer.customParticipantId
        }
      }

      return { participantPeerId, participantUserId, participantCustomId }
    }

    const handleHandUpdate = (data: {
      roomId?: string
      participantId: string
      handRaised: boolean
      timestamp?: number
    }) => {
      if (data.roomId && data.roomId !== meetingId) return

      const isLocal = data.participantId === localUserId
      const { participantPeerId, participantUserId, participantCustomId } = resolveIds(data.participantId, isLocal)
      const timestamp = data.timestamp || Date.now()

      if (isLocal) {
        setWsLocalHandRaised(data.handRaised)
        globalCallManager.updateCallState({ handRaised: data.handRaised })
      } else {
        setWsRemoteHandsRaised(prev => {
          const updated = { ...prev }
          if (participantPeerId) updated[participantPeerId] = data.handRaised
          if (participantUserId) updated[participantUserId] = data.handRaised
          if (participantCustomId) updated[participantCustomId] = data.handRaised
          globalCallManager.updateCallState({ remoteHandsRaised: updated })
          return updated
        })
      }

      setWsHandRaisedOrder(prev => {
        const updated = { ...prev }

        // Remove existing entries for this participant (all possible keys)
        if (participantPeerId) delete updated[participantPeerId]
        if (participantUserId) delete updated[participantUserId]
        if (participantCustomId) delete updated[participantCustomId]

        if (data.handRaised) {
          // Assign new timestamp/order (local ordering)
          const allTimestamps = new Set<number>()
          Object.values(updated).forEach(entry => allTimestamps.add(entry.timestamp))
          const order = allTimestamps.size + 1
          const orderData = { order, timestamp }
          if (participantPeerId) updated[participantPeerId] = orderData
          if (participantUserId) updated[participantUserId] = orderData
          if (participantCustomId) updated[participantCustomId] = orderData
        } else {
          // Recalculate orders based on unique timestamps
          const uniqueTimestamps = Array.from(new Set(Object.values(updated).map(e => e.timestamp))).sort(
            (a, b) => a - b
          )
          uniqueTimestamps.forEach((ts, idx) => {
            const newOrder = idx + 1
            Object.keys(updated).forEach(key => {
              if (updated[key].timestamp === ts) updated[key] = { ...updated[key], order: newOrder }
            })
          })
        }

        globalCallManager.updateCallState({ handRaisedOrder: updated })
        return updated
      })
    }

    const handleSyncParticipantStates = (data: {
      roomId: string
      participantStates: Array<{ participantId: string; handRaised: boolean }>
    }) => {
      if (data.roomId !== meetingId) return

      const baseTimestamp = Date.now()
      const nextRemote: Record<string, boolean> = {}
      const nextOrder: Record<string, { order: number; timestamp: number }> = {}
      let nextLocal: boolean | null = null

      data.participantStates.forEach((state, index) => {
        const isLocal = state.participantId === localUserId
        if (isLocal) nextLocal = state.handRaised

        const { participantPeerId, participantUserId, participantCustomId } = resolveIds(state.participantId, isLocal)

        if (!isLocal) {
          if (participantPeerId) nextRemote[participantPeerId] = state.handRaised
          if (participantUserId) nextRemote[participantUserId] = state.handRaised
          if (participantCustomId) nextRemote[participantCustomId] = state.handRaised
        }

        if (state.handRaised) {
          const orderData = { order: index + 1, timestamp: baseTimestamp + index }
          if (participantPeerId) nextOrder[participantPeerId] = orderData
          if (participantUserId) nextOrder[participantUserId] = orderData
          if (participantCustomId) nextOrder[participantCustomId] = orderData
        }
      })

      const resolvedLocal = nextLocal ?? callState.handRaised
      setWsLocalHandRaised(resolvedLocal)
      setWsRemoteHandsRaised(nextRemote)
      setWsHandRaisedOrder(nextOrder)

      globalCallManager.updateCallState({
        handRaised: resolvedLocal,
        remoteHandsRaised: nextRemote,
        handRaisedOrder: nextOrder
      })
    }

    socket.on('group-call:hand-update', handleHandUpdate)
    socket.on('group-call:sync-participant-states', handleSyncParticipantStates)

    return () => {
      socket.off('group-call:hand-update', handleHandUpdate)
      socket.off('group-call:sync-participant-states', handleSyncParticipantStates)
    }
  }, [wsClient, accessToken, globalMeetingId, currentUserId, meeting])

  const effectiveLocalHandRaised = wsLocalHandRaised
  const effectiveRemoteHandsRaised = wsRemoteHandsRaised
  const effectiveHandRaisedOrder = wsHandRaisedOrder

  // Helper to check if a participant has their hand raised
  // NOTE: We check BOTH userId (SDK) and customParticipantId (our DB) because:
  // - WebSocket events use customParticipantId (from our user database)
  // - SDK assigns its own userId (different from our DB ID)
  // - Both IDs must be checked to match participants across systems
  // Helper to check if a peerId represents the local user
  const isLocalUser = (checkPeerId: string | undefined) => {
    if (!checkPeerId) return false
    return checkPeerId === meeting?.self?.id || checkPeerId === 'local'
  }

  // Helper to check if a participant's hand is raised
  // NOT memoized - always reads latest callState to avoid stale closures
  const isParticipantHandRaised = (
    peerId: string | undefined,
    participantUserId: string | undefined,
    participantCustomId: string | undefined
  ) => {
    if (!peerId && !participantUserId && !participantCustomId) return false

    // Check if it's the local user
    if (participantUserId === meeting?.self?.userId || isLocalUser(peerId)) {
      return effectiveLocalHandRaised
    }

    // Check remote participants - try ALL three IDs (same pattern as reactions)
    const remoteHands = effectiveRemoteHandsRaised || {}
    const isRaisedByPeerId = peerId ? remoteHands[peerId] === true : false
    const isRaisedByUserId = participantUserId ? remoteHands[participantUserId] === true : false
    const isRaisedByCustomId = participantCustomId ? remoteHands[participantCustomId] === true : false
    const isRaised = isRaisedByPeerId || isRaisedByUserId || isRaisedByCustomId

    return isRaised
  }

  // Helper to get the hand raise order number for a participant
  // Match reactions pattern - check ALL three IDs (same as isParticipantHandRaised)
  // NOT memoized - always reads latest callState to avoid stale closures
  const getHandRaisedOrderNumber = (
    peerId: string | undefined,
    participantUserId: string | undefined,
    participantCustomId: string | undefined
  ): number | undefined => {
    if (!peerId && !participantUserId && !participantCustomId) return undefined

    const handRaisedOrder = effectiveHandRaisedOrder || {}

    // Try all three IDs (same pattern as reactions)
    let foundOrder: number | undefined
    if (peerId && handRaisedOrder[peerId]) {
      foundOrder = handRaisedOrder[peerId].order
      return foundOrder
    }
    if (participantUserId && handRaisedOrder[participantUserId]) {
      foundOrder = handRaisedOrder[participantUserId].order
      return foundOrder
    }
    if (participantCustomId && handRaisedOrder[participantCustomId]) {
      foundOrder = handRaisedOrder[participantCustomId].order
      return foundOrder
    }

    return undefined
  }

  const [currentPage, setCurrentPage] = useState(0)
  const [sidebarView, setSidebarView] = useState<SidebarView>('closed')
  const [unreadChatCount, setUnreadChatCount] = useState(0)
  const [activeReactions, setActiveReactions] = useState<
    Array<{
      id: string
      emoji: string
      participantId: string
      timestamp: number
    }>
  >([])

  // Show reaction animation
  const showReactionAnimation = useCallback((emoji: string, participantId: string) => {
    const reactionId = `${participantId}-${Date.now()}`

    rtkDebug.log('[RTK Modal] 🎨 showReactionAnimation called', {
      emoji,
      participantId,
      reactionId
    })

    setActiveReactions(prev => {
      const updated = [...prev, { id: reactionId, emoji, participantId, timestamp: Date.now() }]
      rtkDebug.log('[RTK Modal] 🎨 Updated activeReactions state', {
        previousCount: prev.length,
        newCount: updated.length,
        newReaction: { id: reactionId, emoji, participantId }
      })
      return updated
    })

    // Remove after 3 seconds
    setTimeout(() => {
      setActiveReactions(prev => prev.filter(r => r.id !== reactionId))
      rtkDebug.log('[RTK Modal] 🧹 Removed reaction after 3s', { reactionId })
    }, 3000)
  }, [])

  // Toggle handlers for sidebar panels (mutually exclusive)
  const handleToggleParticipants = useCallback(() => {
    setSidebarView(prev => (prev === 'participants' ? 'closed' : 'participants'))
  }, [])

  const handleToggleChat = useCallback(() => {
    setSidebarView(prev => {
      const newView = prev === 'chat' ? 'closed' : 'chat'
      // Reset unread count when opening chat
      if (newView === 'chat') {
        setUnreadChatCount(0)
      }
      return newView
    })
  }, [])

  // Listen for new messages when chat is closed (for unread tracking)
  useEffect(() => {
    if (!wsClient || !callConversation || sidebarView === 'chat') return

    const handleNewMessage = (message: any) => {
      // Only count messages from other users in this call's conversation
      if (message.conversationId === callConversation.id && message.senderId !== currentUserId) {
        setUnreadChatCount(prev => prev + 1)
      }
    }

    // Subscribe to WebSocket events
    wsClient.on('new_message', handleNewMessage)

    return () => {
      wsClient.off('new_message', handleNewMessage)
    }
  }, [wsClient, callConversation, sidebarView, currentUserId])

  // Track screen size for responsive pagination
  const [screenWidth, setScreenWidth] = useState(window.innerWidth)

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Pagination config: max participants per page (responsive)
  const PARTICIPANTS_PER_PAGE = useMemo(() => {
    // Mobile: 4 participants per page (2x2 grid) - like MS Teams
    if (screenWidth < 768) {
      return 4
    }

    // Tablet: 6 participants per page (3x2 grid)
    if (screenWidth < 1024) {
      return 6
    }

    // Desktop: 9 participants per page (3x3 grid)
    return 9
  }, [screenWidth])

  // Subscribe to remote participants from SDK
  const remotePeers: GroupCallParticipant[] = useRealtimeKitSelector((m: any): GroupCallParticipant[] => {
    // CRITICAL: Only return participants when actually in an active call
    // This prevents showing stale participants from previous calls during the transition
    if (!m?.participants?.joined || !m?.self?.roomJoined) return []

    try {
      const joined = Array.from(m.participants.joined.values())
      // Filter out local participant - check by ID, userId, and customParticipantId
      const localId = m.self?.id
      const localUserId = m.self?.userId
      const localCustomId = m.self?.customParticipantId

      const peers = joined.filter((p: any) => {
        // Exclude if peer ID matches local ID
        if (p.id === localId) return false
        // Exclude if peer userId matches local userId
        if (localUserId && p.userId === localUserId) return false
        // Exclude if peer customParticipantId matches local customParticipantId
        if (localCustomId && p.customParticipantId === localCustomId) return false
        return true
      }) as GroupCallParticipant[]

      // Deduplicate by customParticipantId or userId (keep first occurrence)
      const seenStableIds = new Set<string>()
      const dedupedPeers = peers.filter((peer: any) => {
        const stableId = peer.customParticipantId || peer.userId || peer.id
        if (seenStableIds.has(stableId)) {
          rtkDebug.log(`[RTK Modal] ⚠️ Duplicate participant filtered in selector:`, {
            peerId: peer.id,
            stableId,
            peerName: peer.name
          })
          return false
        }
        seenStableIds.add(stableId)
        return true
      })

      // Debug: Log screen share status only when screen share is actually enabled
      dedupedPeers.forEach((peer: any) => {
        if (peer.screenShareEnabled) {
          rtkDebug.log(`[RTK Modal] Remote peer ${peer.name || peer.id} screen share ACTIVE:`, {
            screenShareEnabled: peer.screenShareEnabled,
            screenShareTracks: peer.screenShareTracks,
            screenShareTracksType: typeof peer.screenShareTracks,
            videoTrackLabel: peer.videoTrack?.label
          })
        }
      })

      return dedupedPeers
    } catch {
      return []
    }
  })

  // Get local screen share track from SDK
  const localScreenShareTrack = useRealtimeKitSelector((m: any) => {
    // CRITICAL: Only return screen share track when actually in an active call
    // This prevents showing stale screen share from previous calls during transition
    if (!m?.self || !m?.self?.roomJoined) return null

    // Extract tracks from various possible structures
    const screenShareTracks = extractTracksFromCollection(m.self.screenShareTracks)
    if (screenShareTracks.length > 0) {
      rtkDebug.log('[RTK Modal] 📺 Local screen share tracks found:', {
        count: screenShareTracks.length,
        trackIds: screenShareTracks.map(t => t.id),
        trackLabels: screenShareTracks.map(t => t.label),
        trackKinds: screenShareTracks.map(t => t.kind),
        rawType: typeof m.self.screenShareTracks,
        rawIsArray: Array.isArray(m.self.screenShareTracks),
        rawIsMap: m.self.screenShareTracks instanceof Map,
        rawIsSet: m.self.screenShareTracks instanceof Set,
        rawKeys: m.self.screenShareTracks ? Object.keys(m.self.screenShareTracks) : []
      })

      // CRITICAL: For tab sharing, SDK returns BOTH video and audio tracks
      // We MUST get the VIDEO track (kind === 'video'), not the audio track!
      // Also check track is still live (not ended/stopped)
      const videoTrack = screenShareTracks.find(t => t.kind === 'video' && t.readyState === 'live')
      if (videoTrack) {
        rtkDebug.log('[RTK Modal] ✅ Found live VIDEO track for screen share:', {
          trackId: videoTrack.id,
          trackLabel: videoTrack.label,
          trackKind: videoTrack.kind,
          readyState: videoTrack.readyState
        })
        return videoTrack
      }

      // Fallback: if no live video track found, try first live track
      const firstLiveTrack = screenShareTracks.find(t => t.readyState === 'live')
      if (firstLiveTrack) {
        rtkDebug.warn('[RTK Modal] ⚠️ No live video track found in screenShareTracks, using first live track:', {
          firstTrack: firstLiveTrack.kind,
          readyState: firstLiveTrack.readyState
        })
        return firstLiveTrack
      }
      rtkDebug.warn('[RTK Modal] ⚠️ All local screen share tracks have ended')
    }

    // Also check if videoTrack is actually a screen share and still live
    if (m.self.videoTrack && isVideoTrackScreenShare(m.self.videoTrack) && m.self.videoTrack.readyState === 'live') {
      return m.self.videoTrack
    }

    return null
  })

  // Derive local screen sharing state from SDK (source of truth), falling back to callState.
  const effectiveLocalIsScreenSharing =
    meeting?.self?.screenShareEnabled === true ||
    (localScreenShareTrack?.readyState === 'live' && !!localScreenShareTrack)

  // CRITICAL: Stabilize remotePeers array to prevent unnecessary re-renders and video destruction
  // useRealtimeKitSelector returns a new array reference on every render, even if peers haven't changed
  // Create a fingerprint to detect actual peer data changes
  // IMPORTANT: Include screenShareEnabled so allScreenShares recomputes when peers start/stop sharing
  // Note: remotePeers are RealtimeKit SDK objects, not GroupCallParticipant, so cast to any
  const remotePeersFingerprint = remotePeers
    .map(
      (p: any) =>
        `${p.id}-${p.videoTrack?.id}-${p.audioTrack?.id}-${p.videoEnabled}-${p.audioEnabled}-${p.screenShareEnabled}`
    )
    .join('|')

  const stableRemotePeers = useMemo(() => {
    // CRITICAL: Don't show any participants if we're not in an active connected call
    // This prevents stale participants from previous calls from appearing during transitions
    const isConnected = callState.status === 'connected' || callState.status === 'joining'
    const isRoomJoined = meeting?.self?.roomJoined

    if (!isConnected || !isRoomJoined) {
      rtkDebug.log('[RTK Modal] 🚫 Not showing participants - call not active', {
        callStatus: callState.status,
        isRoomJoined
      })
      return []
    }

    // TEST MODE: If participants prop has significantly more items than SDK reports,
    // use the participants prop instead (indicates test mode)
    const isTestMode = participants.length > remotePeers.length + 1 // +1 for local participant

    if (isTestMode) {
      // Filter out local participant from test participants
      const localId = meeting?.self?.id
      const localUserId = meeting?.self?.userId
      const localCustomId = meeting?.self?.customParticipantId

      const testRemotePeers = participants.filter((p: any) => {
        // Exclude local participant
        if (p.id === localId) return false
        if (localUserId && (p.userId === localUserId || p.id === localUserId)) return false
        if (localCustomId && (p.customParticipantId === localCustomId || p.id === localCustomId)) return false
        // Exclude if it matches current user ID
        if (currentUserId && (p.id === currentUserId || p.userId === currentUserId)) return false
        return true
      })

      rtkDebug.log('[RTK Modal] 🧪 TEST MODE: Using test participants', {
        testParticipantsCount: testRemotePeers.length,
        sdkPeersCount: remotePeers.length,
        totalParticipantsProp: participants.length
      })

      return testRemotePeers
    }

    // Return a NEW stable array (shallow copy) so we break the reference to the selector's array
    return [...remotePeers]
  }, [
    remotePeersFingerprint,
    participants,
    meeting?.self?.id,
    meeting?.self?.userId,
    meeting?.self?.customParticipantId,
    meeting?.self?.roomJoined,
    currentUserId,
    remotePeers.length,
    callState.status
  ])

  rtkDebug.log('[RTK Modal] Remote peers count:', stableRemotePeers?.length || 0)
  rtkDebug.log('[RTK Modal] Button props:', {
    hasRaiseHandHandler: !!onToggleRaiseHand,
    hasReactionHandler: !!onSendReaction,
    handRaised: callState.handRaised
  })

  // Listen for reactions via WebSocket
  useEffect(() => {
    rtkDebug.log('[RTK Modal] Reactions useEffect triggered', {
      hasWsClient: !!wsClient,
      hasSocket: !!wsClient?.getSocket()
    })

    // Best-effort: socket might be missing after navigation; try reconnect using accessToken.
    let socket = wsClient?.getSocket()
    if (!socket && wsClient && accessToken) {
      try {
        wsClient.connect(accessToken)
        socket = wsClient.getSocket()
      } catch {
        // Best-effort only
      }
    }
    if (!socket) {
      rtkDebug.warn('[RTK Modal] ⚠️ No socket available for reactions')
      return
    }

    const handleReaction = (data: { participantId: string; participantName: string; emoji: string }) => {
      rtkDebug.log('[RTK Modal] 😊 Reaction received via WebSocket:', data)
      showReactionAnimation(data.emoji, data.participantId)
    }

    socket.on('group-call:reaction-received', handleReaction)
    rtkDebug.log('[RTK Modal] ✅ WebSocket listener attached for reactions')

    return () => {
      socket.off('group-call:reaction-received', handleReaction)
      rtkDebug.log('[RTK Modal] WebSocket listener removed for reactions')
    }
  }, [wsClient, accessToken, showReactionAnimation, stableRemotePeers, meeting])

  // Handler to mute a participant via WebSocket (auto-mute on target side)
  const handleMuteParticipant = useCallback(
    (participantId: string, participantName: string) => {
      if (!wsClient || !currentParticipant || !meeting) {
        console.error('[MUTE] No WebSocket client, current participant, or meeting available')
        return
      }

      const socket = wsClient.getSocket()
      if (!socket) {
        console.error('[MUTE] Socket not available')
        return
      }

      // Get the customParticipantId from the meeting peer (this is the user's DB ID)
      const targetPeer = meeting.participants?.joined?.get(participantId)
      const targetUserId = targetPeer?.customParticipantId || participantId

      try {
        rtkDebug.log('[MUTE] Sending mute request via WebSocket:', {
          participantRtkId: participantId,
          targetUserId,
          targetParticipantName: participantName,
          requestedBy: currentParticipant.id,
          requestedByName: currentParticipant.odName
        })

        // Emit WebSocket event to request mute
        // IMPORTANT: Use customParticipantId (user DB ID) not RTK peer ID for Socket.IO routing
        socket.emit('group-call:request-mute', {
          targetParticipantId: targetUserId, // User's DB ID for Socket.IO room routing
          targetParticipantName: participantName,
          requestedBy: currentParticipant.id,
          requestedByName: currentParticipant.odName
        })

        toast.success(`Mute request sent to ${participantName}`, {
          duration: 2000
        })
      } catch (error) {
        console.error('[MUTE] Failed to send mute request:', error)
        toast.error(`Failed to mute ${participantName}`, {
          duration: 3000
        })
      }
    },
    [wsClient, currentParticipant, meeting]
  )

  // Handler to mute all participants at once via backend-driven WebSocket (auto-mute on each participant's side)
  const handleMuteAll = useCallback(() => {
    if (!wsClient || !currentParticipant || !callState.roomId || !meeting) {
      console.error('[MUTE ALL] No WebSocket client, current participant, roomId, or meeting available')
      return
    }

    const socket = wsClient.getSocket()
    if (!socket) {
      console.error('[MUTE ALL] Socket not available')
      return
    }

    // Get all participants including test participants (use stableRemotePeers which includes all)
    const allParticipants = stableRemotePeers.length + 1 // +1 for local participant
    const participantCount = stableRemotePeers.length

    try {
      rtkDebug.log('[MUTE ALL] Sending mute-all request via backend:', {
        conversationId: callState.roomId, // roomId is actually the conversationId
        totalParticipantCount: allParticipants,
        remoteParticipantCount: participantCount,
        requestedBy: currentParticipant.id,
        requestedByName: currentParticipant.odName
      })

      // Use backend-driven mute-all endpoint that broadcasts to all participants in the room
      socket.emit('group-call:request-mute-all', {
        conversationId: callState.roomId, // roomId is the conversationId in our state
        requestedBy: currentParticipant.id,
        requestedByName: currentParticipant.odName
      })

      toast.success(`Mute request sent to all ${participantCount} participants`, {
        duration: 2000
      })
    } catch (error) {
      console.error('[MUTE ALL] Failed to send mute-all request:', error)
      toast.error('Failed to mute all participants', {
        duration: 3000
      })
    }
  }, [wsClient, currentParticipant, callState.roomId, meeting, stableRemotePeers.length])

  // Track local video element initialization
  const localVideoInitializedRef = useRef(false)
  const localVideoTrackIdRef = useRef<string | null>(null)
  const localAudioTrackIdRef = useRef<string | null>(null)
  const wasMinimizedRef = useRef(callState.isMinimized)

  // Reset local video initialization when transitioning from minimized to maximized
  useEffect(() => {
    const wasMinimized = wasMinimizedRef.current
    const isMinimizedNow = callState.isMinimized

    // Detect transition from minimized (true) to maximized (false)
    if (wasMinimized && !isMinimizedNow) {
      rtkDebug.log('[RTK Modal] 🔄 Resetting local video initialization (returning from minimized)', {
        wasInitialized: localVideoInitializedRef.current
      })

      // Reset local video initialization to force re-attachment
      localVideoInitializedRef.current = false
      localVideoTrackIdRef.current = null
      localAudioTrackIdRef.current = null
    }

    // Update ref for next comparison
    wasMinimizedRef.current = isMinimizedNow
  }, [callState.isMinimized])

  // Auto-play local video stream with optimized track updates
  useEffect(() => {
    const videoElement = localVideoRef.current
    if (!videoElement) return

    // CRITICAL: Filter out screen share track - only use camera video track
    const localVideoTrack =
      meeting?.self?.videoTrack && !isVideoTrackScreenShare(meeting.self.videoTrack) ? meeting.self.videoTrack : null
    const localAudioTrack = meeting?.self?.audioTrack
    const currentVideoTrackId = localVideoTrack?.id || null
    const currentAudioTrackId = localAudioTrack?.id || null

    rtkDebug.log('[RTK Modal] 🔄 Local video stream attachment effect running', {
      hasVideoElement: !!videoElement,
      hasVideoTrack: !!localVideoTrack,
      hasAudioTrack: !!localAudioTrack,
      isVideoEnabled: effectiveLocalIsVideoEnabled,
      hasLocalStream: !!localStream,
      isInitialized: localVideoInitializedRef.current,
      videoTrackChanged: localVideoTrackIdRef.current !== currentVideoTrackId,
      audioTrackChanged: localAudioTrackIdRef.current !== currentAudioTrackId,
      videoTrackIsScreenShare: meeting?.self?.videoTrack && isVideoTrackScreenShare(meeting.self.videoTrack)
    })

    // Initial attachment
    if (!localVideoInitializedRef.current && (localVideoTrack || localAudioTrack)) {
      const stream = new MediaStream()
      if (localVideoTrack) stream.addTrack(localVideoTrack)
      if (localAudioTrack) stream.addTrack(localAudioTrack)

      videoElement.srcObject = stream
      localVideoInitializedRef.current = true
      localVideoTrackIdRef.current = currentVideoTrackId
      localAudioTrackIdRef.current = currentAudioTrackId

      rtkDebug.log('[RTK Modal] ✅ Local video stream initially attached', {
        hasVideo: !!localVideoTrack,
        hasAudio: !!localAudioTrack
      })
      return
    }

    // Track updates for initialized stream
    if (localVideoInitializedRef.current && videoElement.srcObject instanceof MediaStream) {
      const stream = videoElement.srcObject
      const videoTrackChanged = localVideoTrackIdRef.current !== currentVideoTrackId
      const audioTrackChanged = localAudioTrackIdRef.current !== currentAudioTrackId

      if (videoTrackChanged || audioTrackChanged) {
        rtkDebug.log('[RTK Modal] 🔄 Local track changed', {
          videoChanged: videoTrackChanged,
          audioChanged: audioTrackChanged,
          oldVideoId: localVideoTrackIdRef.current,
          newVideoId: currentVideoTrackId,
          oldAudioId: localAudioTrackIdRef.current,
          newAudioId: currentAudioTrackId
        })

        try {
          // Update video track if changed
          if (videoTrackChanged) {
            stream.getVideoTracks().forEach(track => stream.removeTrack(track))
            if (localVideoTrack && effectiveLocalIsVideoEnabled) {
              stream.addTrack(localVideoTrack)
            }
            localVideoTrackIdRef.current = currentVideoTrackId
            rtkDebug.log('[RTK Modal] 📹 Updated local video track')
          }

          // Update audio track if changed
          if (audioTrackChanged) {
            stream.getAudioTracks().forEach(track => stream.removeTrack(track))
            if (localAudioTrack) {
              stream.addTrack(localAudioTrack)
            }
            localAudioTrackIdRef.current = currentAudioTrackId
            rtkDebug.log('[RTK Modal] 🔊 Updated local audio track')
          }

          rtkDebug.log('[RTK Modal] ✅ Local tracks updated dynamically', {
            hasVideo: !!localVideoTrack && effectiveLocalIsVideoEnabled,
            hasAudio: !!localAudioTrack,
            streamVideoTracks: stream.getVideoTracks().length,
            streamAudioTracks: stream.getAudioTracks().length
          })
        } catch (error) {
          rtkDebug.warn('[RTK Modal] ⚠️ Local track update failed, falling back to full replacement:', error)

          // Fallback to full replacement
          const newStream = new MediaStream()
          if (localVideoTrack && effectiveLocalIsVideoEnabled) newStream.addTrack(localVideoTrack)
          if (localAudioTrack) newStream.addTrack(localAudioTrack)

          videoElement.srcObject = newStream
          localVideoTrackIdRef.current = currentVideoTrackId
          localAudioTrackIdRef.current = currentAudioTrackId
        }
      }
    }
  }, [meeting?.self?.videoTrack, meeting?.self?.audioTrack, effectiveLocalIsVideoEnabled, videoElementsVersion])

  // Track which peers have had streams attached to avoid flickering
  const attachedPeersRef = useRef<Set<string>>(new Set())

  // Debounce timers for track updates to prevent rapid successive updates
  const trackUpdateTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Clear attached peers tracking when minimizing to ensure streams are reattached when maximizing
  useEffect(() => {
    if (callState.isMinimized) {
      rtkDebug.log('[RTK Modal] Minimized - clearing attached peers tracking for fresh attachment on maximize', {
        previouslyAttachedCount: attachedPeersRef.current.size,
        attachedPeerIds: Array.from(attachedPeersRef.current)
      })
      attachedPeersRef.current.clear()
    } else {
      rtkDebug.log('[RTK Modal] Maximized - attached peers will be tracked as streams attach', {
        currentlyAttachedCount: attachedPeersRef.current.size
      })
    }
  }, [callState.isMinimized])

  /**
   * Remote Participant Video/Audio Track Management
   *
   * This effect handles two critical operations:
   *
   * 1. INITIAL ATTACHMENT: When a peer first appears or gets their first track,
   *    create a MediaStream and attach it to the HTML video element. Mark the
   *    peer as "attached" to avoid re-creating the stream unnecessarily.
   *
   * 2. DYNAMIC TRACK UPDATES: For already-attached peers, continuously monitor
   *    for track changes (ID comparisons). When tracks change (e.g., user toggles
   *    video/audio, SDK republishes after network issue), refresh the video
   *    element's srcObject using the documented workaround (see inline comments).
   *
   * This two-phase approach prevents flickering while ensuring track updates
   * are properly reflected in the UI. The debounced update mechanism prevents
   * multiple rapid successive updates that could cause visual glitches.
   *
   * Dependencies: [remotePeers] - Runs whenever SDK reports peer/track changes
   */
  useEffect(() => {
    if (!remotePeers) return

    rtkDebug.log('[RTK Modal] 🔄 Stream attachment effect running', {
      remotePeersCount: stableRemotePeers.length,
      isMinimized: callState.isMinimized,
      attachedPeersCount: attachedPeersRef.current.size,
      videoRefsCount: remoteVideoRefs.current.size,
      remotePeerIds: stableRemotePeers.map((p: any) => p.id),
      attachedPeerIds: Array.from(attachedPeersRef.current),
      videoRefPeerIds: Array.from(remoteVideoRefs.current.keys())
    })

    stableRemotePeers.forEach((peer: any) => {
      const videoElement = remoteVideoRefs.current.get(peer.id)
      const isAttached = attachedPeersRef.current.has(peer.id)

      // Get screen share track using helper function (for detection/logging)
      const primaryScreenShareTrack = getScreenShareTrack(peer)
      const hasScreenShare = !!primaryScreenShareTrack

      // Log all peer properties to debug screen share detection
      const peerKeys = Object.keys(peer)
      const screenShareRelatedKeys = peerKeys.filter(
        key =>
          key.toLowerCase().includes('screen') ||
          key.toLowerCase().includes('share') ||
          key.toLowerCase().includes('display')
      )

      const extractedScreenShareTracks = extractTracksFromCollection(peer.screenShareTracks)
      rtkDebug.log(`[RTK Modal] Checking peer ${peer.name || peer.id}:`, {
        hasVideoElement: !!videoElement,
        hasVideoTrack: !!peer.videoTrack,
        hasAudioTrack: !!peer.audioTrack,
        hasScreenShare: hasScreenShare,
        extractedScreenShareTracksCount: extractedScreenShareTracks.length,
        screenShareTracksRaw: peer.screenShareTracks,
        screenShareTracksType: typeof peer.screenShareTracks,
        screenShareTracksIsArray: Array.isArray(peer.screenShareTracks),
        screenShareTracksIsMap: peer.screenShareTracks instanceof Map,
        screenShareTracksIsSet: peer.screenShareTracks instanceof Set,
        videoTrackEnabled: peer.videoTrack?.enabled,
        audioTrackEnabled: peer.audioTrack?.enabled,
        videoEnabled: peer.videoEnabled,
        audioEnabled: peer.audioEnabled,
        screenShareEnabled: peer.screenShareEnabled,
        isAttached,
        videoTrackId: peer.videoTrack?.id,
        audioTrackId: peer.audioTrack?.id,
        screenShareTrackId: primaryScreenShareTrack?.id,
        // Debug: show all screen-share related properties
        screenShareRelatedKeys,
        allPeerKeys: peerKeys
      })

      // Get camera track (exclude screen share track)
      // When screen sharing, peer.videoTrack should still be the camera track
      // Screen share is in screenShareTracks, not videoTrack
      const cameraVideoTrack = peer.videoTrack && !isVideoTrackScreenShare(peer.videoTrack) ? peer.videoTrack : null

      // Check if this is a test participant (mock track)
      // Test participants have mock tracks that aren't real MediaStreamTrack instances
      const isTestParticipant =
        peer.id?.startsWith('test-participant-') ||
        cameraVideoTrack?.id?.startsWith('mock-') ||
        peer.audioTrack?.id?.startsWith('mock-')

      // Only attach if we haven't attached this peer yet
      if (videoElement && (cameraVideoTrack || peer.audioTrack) && !isAttached) {
        rtkDebug.log(`[RTK Modal] 🔗 Attaching stream for peer ${peer.name || peer.id} (initial)`, {
          peerId: peer.id,
          hasVideoElement: true,
          hasCameraTrack: !!cameraVideoTrack,
          hasAudioTrack: !!peer.audioTrack,
          wasAttached: isAttached,
          isMinimized: callState.isMinimized,
          isTestParticipant
        })

        if (isTestParticipant) {
          // For test participants, skip track attachment (they're just mock objects)
          // The video element will render as avatar-only, which is fine for testing
          videoElement.srcObject = null
          attachedPeersRef.current.add(peer.id)

          rtkDebug.log(
            `[RTK Modal] ✅ Test participant marked as attached (avatar-only) for peer ${peer.name || peer.id}`,
            {
              hasVideo: !!cameraVideoTrack,
              hasAudio: !!peer.audioTrack
            }
          )
        } else {
          // Real participants: attach actual tracks
          const stream = new MediaStream()
          if (cameraVideoTrack) stream.addTrack(cameraVideoTrack)
          if (peer.audioTrack) stream.addTrack(peer.audioTrack)

          videoElement.srcObject = stream
          attachedPeersRef.current.add(peer.id)

          rtkDebug.log(`[RTK Modal] ✅ Stream attached successfully for peer ${peer.name || peer.id}`, {
            hasVideo: !!cameraVideoTrack,
            hasAudio: !!peer.audioTrack,
            videoTrackIsScreenShare: isVideoTrackScreenShare(peer.videoTrack),
            streamTrackCount: stream.getTracks().length
          })
        }
      } else if (!videoElement) {
        rtkDebug.log(`[RTK Modal] ⏭️ Skipping peer ${peer.name || peer.id} - no video element yet`, {
          peerId: peer.id,
          isAttached,
          hasTracks: !!(cameraVideoTrack || peer.audioTrack)
        })
      } else if (isAttached) {
        rtkDebug.log(`[RTK Modal] ⏭️ Skipping peer ${peer.name || peer.id} - already attached`, {
          peerId: peer.id
        })
      }

      /**
       * CRITICAL: Dynamic Track Update for Remote Participants
       *
       * Always monitor and update video/audio tracks for already-attached peers.
       * This handles scenarios like:
       * - Remote user toggles video ON/OFF (videoTrack appears/disappears)
       * - Remote user toggles audio ON/OFF (audioTrack appears/disappears)
       * - SFU republishes tracks after network issues or SDK state changes
       */
      if (videoElement && isAttached) {
        const currentStream = videoElement.srcObject as MediaStream
        const currentVideoTrack = currentStream?.getVideoTracks()[0]
        const currentAudioTrack = currentStream?.getAudioTracks()[0]

        // Get camera track (exclude screen share track)
        const cameraVideoTrack = peer.videoTrack && !isVideoTrackScreenShare(peer.videoTrack) ? peer.videoTrack : null

        const videoTrackChanged = currentVideoTrack?.id !== cameraVideoTrack?.id
        const audioTrackChanged = currentAudioTrack?.id !== peer.audioTrack?.id

        // Check if this is a test participant (mock track)
        const isTestParticipant =
          peer.id?.startsWith('test-participant-') ||
          cameraVideoTrack?.id?.startsWith('mock-') ||
          peer.audioTrack?.id?.startsWith('mock-')

        // Update stream if ANY track changed
        if (videoTrackChanged || audioTrackChanged) {
          rtkDebug.log(`[RTK Modal] 🔄 Track changed for peer ${peer.name || peer.id}`, {
            videoChanged: videoTrackChanged,
            audioChanged: audioTrackChanged,
            oldVideoId: currentVideoTrack?.id,
            newVideoId: cameraVideoTrack?.id,
            oldAudioId: currentAudioTrack?.id,
            newAudioId: peer.audioTrack?.id,
            videoTrackIsScreenShare: isVideoTrackScreenShare(peer.videoTrack),
            isTestParticipant
          })

          // Skip track updates for test participants (they're just mock objects)
          if (isTestParticipant) {
            rtkDebug.log(`[RTK Modal] ⏭️ Skipping track update for test participant ${peer.name || peer.id}`)
            return
          }

          // Cancel any pending update for this peer to avoid race conditions
          const existingTimer = trackUpdateTimersRef.current.get(peer.id)
          if (existingTimer) {
            clearTimeout(existingTimer)
          }

          /**
           * OPTIMIZED TRACK UPDATE: Minimize Video Flicker
           *
           * Strategy: Update only the changed track(s) in the existing MediaStream
           * instead of resetting the entire srcObject. This prevents video flashing
           * when only audio changes (mute/unmute).
           *
           * Cases handled:
           * 1. Audio only changed (mute/unmute) → Update audio track only, keep video
           * 2. Video only changed (video on/off) → Update video track only, keep audio
           * 3. Both changed → Update both tracks
           *
           * Fallback: If updating individual tracks fails (edge case), fall back to
           * full stream replacement with the null-then-set workaround.
           */

          // Debounced update to prevent flickering from rapid track changes
          const timer = setTimeout(() => {
            try {
              const stream = videoElement.srcObject as MediaStream

              // Update audio track if changed
              if (audioTrackChanged) {
                // Remove old audio track(s)
                stream.getAudioTracks().forEach(track => stream.removeTrack(track))

                // Add new audio track if available
                if (peer.audioTrack) {
                  stream.addTrack(peer.audioTrack)
                }

                rtkDebug.log(`[RTK Modal] 🔊 Updated audio track for peer ${peer.name || peer.id}`, {
                  hasAudio: !!peer.audioTrack,
                  audioTrackId: peer.audioTrack?.id
                })
              }

              // Update video track if changed
              if (videoTrackChanged) {
                // Remove old video track(s)
                stream.getVideoTracks().forEach(track => stream.removeTrack(track))

                // Add new video track if available
                if (cameraVideoTrack) {
                  stream.addTrack(cameraVideoTrack)
                }

                rtkDebug.log(`[RTK Modal] 📹 Updated video track for peer ${peer.name || peer.id}`, {
                  hasVideo: !!cameraVideoTrack,
                  videoTrackId: cameraVideoTrack?.id
                })
              }

              // Ensure playback continues
              videoElement.muted = false
              videoElement.play().catch(err => {
                rtkDebug.warn(`[RTK Modal] Could not auto-play peer ${peer.name || peer.id}:`, err)
              })

              rtkDebug.log(`[RTK Modal] ✅ Updated tracks for peer ${peer.name || peer.id}`, {
                hasVideo: !!cameraVideoTrack,
                hasAudio: !!peer.audioTrack,
                videoElementMuted: videoElement.muted,
                streamAudioTracks: stream.getAudioTracks().length,
                streamVideoTracks: stream.getVideoTracks().length
              })
            } catch (error) {
              // Fallback: Full stream replacement if track update fails
              rtkDebug.warn(
                `[RTK Modal] ⚠️ Track update failed for peer ${peer.name || peer.id}, falling back to full stream replacement:`,
                error
              )

              const newStream = new MediaStream()
              if (cameraVideoTrack) newStream.addTrack(cameraVideoTrack)
              if (peer.audioTrack) newStream.addTrack(peer.audioTrack)

              videoElement.srcObject = null
              setTimeout(() => {
                videoElement.srcObject = newStream
                videoElement.muted = false
                videoElement.play().catch(err => {
                  rtkDebug.warn(`[RTK Modal] Could not auto-play peer ${peer.name || peer.id}:`, err)
                })
              }, 10)
            }

            // Clean up timer reference
            trackUpdateTimersRef.current.delete(peer.id)
          }, 50) // 50ms debounce to batch rapid updates

          trackUpdateTimersRef.current.set(peer.id, timer)
        }
      }

      /**
       * Screen Share Detection & Logging
       *
       * Screen shares are now handled by the dedicated screen share area (mainScreenShareRef).
       * This section just logs screen share status for debugging.
       */
      if (hasScreenShare && primaryScreenShareTrack) {
        rtkDebug.log(`[RTK Modal] 📺 Screen share detected for peer ${peer.name || peer.id}:`, {
          trackId: primaryScreenShareTrack.id,
          trackLabel: primaryScreenShareTrack.label,
          trackEnabled: primaryScreenShareTrack.enabled,
          trackKind: primaryScreenShareTrack.kind,
          trackSettings: primaryScreenShareTrack.getSettings?.(),
          screenShareEnabled: peer.screenShareEnabled,
          extractedTracksCount: extractTracksFromCollection(peer.screenShareTracks).length,
          screenShareTracksRaw: peer.screenShareTracks,
          screenShareTracksType: typeof peer.screenShareTracks,
          screenShareTracksIsArray: Array.isArray(peer.screenShareTracks),
          screenShareTracksIsMap: peer.screenShareTracks instanceof Map,
          screenShareTracksIsSet: peer.screenShareTracks instanceof Set
        })
      } else if (peer.screenShareEnabled && !hasScreenShare) {
        // Screen share is enabled but track not found - potential issue
        const extractedTracks = extractTracksFromCollection(peer.screenShareTracks)
        rtkDebug.warn(`[RTK Modal] ⚠️ Screen share enabled for peer ${peer.name || peer.id} but no track found:`, {
          screenShareEnabled: peer.screenShareEnabled,
          extractedTracksCount: extractedTracks.length,
          extractedTracks: extractedTracks.map(t => ({ id: t.id, label: t.label, kind: t.kind })),
          screenShareTracksRaw: peer.screenShareTracks,
          screenShareTracksType: typeof peer.screenShareTracks,
          screenShareTracksIsArray: Array.isArray(peer.screenShareTracks),
          screenShareTracksIsMap: peer.screenShareTracks instanceof Map,
          screenShareTracksIsSet: peer.screenShareTracks instanceof Set,
          screenShareTracksKeys:
            peer.screenShareTracks && typeof peer.screenShareTracks === 'object'
              ? Object.keys(peer.screenShareTracks)
              : [],
          videoTrack: peer.videoTrack
            ? {
                id: peer.videoTrack.id,
                label: peer.videoTrack.label,
                kind: peer.videoTrack.kind,
                isScreenShare: isVideoTrackScreenShare(peer.videoTrack)
              }
            : null
        })
      }
    })

    // Clean up attachedPeers set when peers leave
    const currentPeerIds = new Set(stableRemotePeers.map((p: any) => p.id))
    attachedPeersRef.current.forEach(peerId => {
      if (!currentPeerIds.has(peerId)) {
        attachedPeersRef.current.delete(peerId)
        rtkDebug.log(`[RTK Modal] Removed peer ${peerId} from attached set`)

        // Clean up any pending track update timers for this peer
        const timer = trackUpdateTimersRef.current.get(peerId)
        if (timer) {
          clearTimeout(timer)
          trackUpdateTimersRef.current.delete(peerId)
        }
      }
    })

    // Screen share cleanup is handled by the mainScreenShareRef useEffect
  }, [stableRemotePeers, videoElementsVersion])

  // Cleanup all debounce timers on unmount
  useEffect(() => {
    return () => {
      trackUpdateTimersRef.current.forEach(timer => clearTimeout(timer))
      trackUpdateTimersRef.current.clear()
    }
  }, [])

  // Debug helper: Expose call controls to window for console debugging
  useEffect(() => {
    if (typeof globalThis.window !== 'undefined') {
      ;(globalThis as any).rtkLeaveCall = () => {
        rtkDebug.log('[RTK Debug] Leaving call via console command')
        onEndCall()
      }
      ;(globalThis as any).rtkToggleMute = () => {
        rtkDebug.log('[RTK Debug] Toggling mute via console command')
        onToggleMute()
      }
      ;(globalThis as any).rtkToggleVideo = () => {
        rtkDebug.log('[RTK Debug] Toggling video via console command')
        onToggleVideo()
      }

      rtkDebug.log('[RTK Debug] Console helpers registered:', {
        rtkLeaveCall: '() => Leave call',
        rtkToggleMute: '() => Toggle mute',
        rtkToggleVideo: '() => Toggle video'
      })
    }

    return () => {
      // Clean up on unmount
      if (typeof globalThis.window !== 'undefined') {
        delete (globalThis as any).rtkLeaveCall
        delete (globalThis as any).rtkToggleMute
        delete (globalThis as any).rtkToggleVideo
      }
    }
  }, [onEndCall, onToggleMute, onToggleVideo])

  // Get ALL screen shares (not just one)
  const allScreenShares = useMemo(() => {
    const shares: Array<{
      peerId: string
      peerName: string
      screenShareTrack: MediaStreamTrack
      trackId: string
      peer: any
    }> = []

    const seenPeerIds = new Set<string>()

    // Find screen shares from remote peers
    stableRemotePeers?.forEach((peer: any) => {
      // Check multiple ways to detect screen share
      const screenShareTrack = getScreenShareTrack(peer)
      const hasScreenShareEnabled = peer.screenShareEnabled === true
      const extractedTracks = extractTracksFromCollection(peer.screenShareTracks)

      rtkDebug.log(`[RTK Modal] Checking peer ${peer.name || peer.id} for screen share:`, {
        peerId: peer.id,
        hasScreenShareTrack: !!screenShareTrack,
        screenShareEnabled: hasScreenShareEnabled,
        screenShareTracks: peer.screenShareTracks,
        extractedTracksCount: extractedTracks.length,
        extractedTracks: extractedTracks.map(t => ({
          id: t.id,
          label: t.label,
          kind: t.kind,
          readyState: t.readyState
        })),
        videoTrackLabel: peer.videoTrack?.label,
        videoTrackIsScreenShare: peer.videoTrack && isVideoTrackScreenShare(peer.videoTrack)
      })

      if (screenShareTrack) {
        // CRITICAL: Only include tracks that are still live (not ended/stopped)
        if (screenShareTrack.readyState !== 'live') {
          rtkDebug.warn(
            `[RTK Modal] ⚠️ Screen share track for peer ${peer.id} is not live (state: ${screenShareTrack.readyState}) - skipping`
          )
        } else if (seenPeerIds.has(peer.id)) {
          rtkDebug.warn(`[RTK Modal] ⚠️ Duplicate screen share for peer ${peer.id} - skipping`)
        } else {
          shares.push({
            peerId: peer.id,
            peerName: peer.name || peer.displayName || peer.customParticipantId || 'Unknown',
            screenShareTrack,
            trackId: screenShareTrack.id,
            peer
          })
          seenPeerIds.add(peer.id)
        }
      } else if (hasScreenShareEnabled) {
        // Screen share is enabled but track not found yet - might be initializing
        rtkDebug.warn(`[RTK Modal] Peer ${peer.name || peer.id} has screenShareEnabled=true but no track found`, {
          peerId: peer.id,
          screenShareEnabled: peer.screenShareEnabled,
          extractedTracksCount: extractedTracks.length,
          extractedTracksDetails: extractedTracks.map(t => ({
            id: t.id,
            kind: t.kind,
            readyState: t.readyState,
            label: t.label
          })),
          hasVideoTrack: !!peer.videoTrack,
          videoTrackIsScreenShare: peer.videoTrack && isVideoTrackScreenShare(peer.videoTrack),
          videoTrackReadyState: peer.videoTrack?.readyState
        })
      }
    })

    // Add local screen share if active (SDK truth)
    rtkDebug.log('[RTK Modal] 🔍 Local screen share check:', {
      isScreenSharing: effectiveLocalIsScreenSharing,
      hasTrack: !!localScreenShareTrack,
      trackReadyState: localScreenShareTrack?.readyState,
      trackId: localScreenShareTrack?.id
    })

    if (effectiveLocalIsScreenSharing && localScreenShareTrack) {
      // CRITICAL: Only include tracks that are still live (not ended/stopped)
      if (localScreenShareTrack.readyState === 'live') {
        const localPeerId = meeting?.self?.id || 'local' // Use actual peer ID
        if (seenPeerIds.has(localPeerId)) {
          rtkDebug.warn(`[RTK Modal] ⚠️ Duplicate screen share for local peer - skipping`)
        } else {
          shares.push({
            peerId: localPeerId,
            peerName: participants[0]?.odName || 'You',
            screenShareTrack: localScreenShareTrack,
            trackId: localScreenShareTrack.id,
            peer: null
          })
          seenPeerIds.add(localPeerId) // CRITICAL: Add the actual peerId, not 'local'
          rtkDebug.log('[RTK Modal] 🖥️ Added local screen share to allScreenShares:', {
            peerId: localPeerId,
            peerName: participants[0]?.odName || 'You',
            trackId: localScreenShareTrack.id
          })
        }
      } else {
        rtkDebug.warn(
          `[RTK Modal] ⚠️ Local screen share track is not live (state: ${localScreenShareTrack.readyState}) - skipping`
        )
      }
    }

    rtkDebug.log(
      `[RTK Modal] Found ${shares.length} screen shares:`,
      shares.map(s => ({
        peerId: s.peerId,
        peerName: s.peerName,
        trackId: s.trackId
      }))
    )

    return shares
  }, [stableRemotePeers, effectiveLocalIsScreenSharing, localScreenShareTrack, participants])

  // Get focused screen share (user-selected or first one)
  const focusedScreenShare = useMemo(() => {
    if (focusedScreenShareId) {
      return allScreenShares.find(s => s.peerId === focusedScreenShareId) || allScreenShares[0] || null
    }
    return allScreenShares[0] || null
  }, [allScreenShares, focusedScreenShareId])

  // Auto-focus first screen share when it appears
  useEffect(() => {
    if (allScreenShares.length > 0 && !focusedScreenShareId) {
      setFocusedScreenShareId(allScreenShares[0].peerId)
    } else if (allScreenShares.length === 0) {
      setFocusedScreenShareId(null)
    }
  }, [allScreenShares, focusedScreenShareId])

  // Build unified grid items: participants + screen shares
  const gridItems = useMemo(() => {
    // FIXED: Create mapping from userId to avatarUrl from CALL conversation participants
    // NOT from activeConversation (which changes as user navigates)
    const avatarUrlMap = new Map<string, string>()

    // Use callConversationProp (where the call was initiated) for participant avatars
    // This ensures avatars remain correct even when user navigates to other conversations
    const conversationForAvatars = callConversationProp || activeConversation

    if (conversationForAvatars?.participants) {
      conversationForAvatars.participants.forEach((cp: any) => {
        if (cp.user?.avatarUrl) {
          // Map by userId (the stable user ID in our system)
          avatarUrlMap.set(cp.userId, cp.user.avatarUrl)
          avatarUrlMap.set(cp.user.id, cp.user.avatarUrl)
          rtkDebug.log('[RTK Modal] 🖼️ Avatar from CALL conversation:', {
            conversationId: conversationForAvatars.id,
            conversationName: conversationForAvatars.name,
            isCallConversation: conversationForAvatars === callConversationProp,
            userId: cp.userId,
            userName: cp.user.displayName || cp.user.username,
            avatarUrl: cp.user.avatarUrl
          })
        }
      })
    }

    // Fallback: check participants array
    participants.forEach(p => {
      if (p.avatarUrl && !avatarUrlMap.has(p.id)) {
        avatarUrlMap.set(p.id, p.avatarUrl)
        avatarUrlMap.set(p.odId, p.avatarUrl)
      }
    })

    rtkDebug.log('[RTK Modal] 🖼️ Avatar map built for call conversation:', {
      callConversationId: callConversationProp?.id,
      activeConversationId: activeConversation?.id,
      usedConversationId: conversationForAvatars?.id,
      totalMappings: avatarUrlMap.size,
      keys: Array.from(avatarUrlMap.keys())
    })

    const items: Array<{
      id: string
      type: 'video' | 'screen-share' | 'avatar'
      peerId: string
      avatarUrl?: string
      peerName: string
      userId?: string // SDK userId - for checking hand-raised state
      customParticipantId?: string // Our DB user ID - for checking hand-raised state
      videoTrack?: MediaStreamTrack
      audioTrack?: MediaStreamTrack
      screenShareTrack?: MediaStreamTrack
      hasVideoTrack?: boolean // For render decision
      hasAudioTrack?: boolean // For render decision
      isLocal: boolean
      isMuted: boolean
      isVideoEnabled: boolean
      isFocusedScreenShare?: boolean
      isActiveSpeaker?: boolean // Active speaker highlighting
    }> = []
    const seenIds = new Set<string>()

    // Add focused screen share first (if exists) - will be larger in grid
    if (focusedScreenShare) {
      const itemId = `screen-share-${focusedScreenShare.peerId}`
      if (!seenIds.has(itemId)) {
        items.push({
          id: itemId,
          type: 'screen-share',
          peerId: focusedScreenShare.peerId,
          peerName: focusedScreenShare.peerName,
          screenShareTrack: focusedScreenShare.screenShareTrack,
          isLocal: isLocalUser(focusedScreenShare.peerId),
          isMuted: isLocalUser(focusedScreenShare.peerId) ? effectiveLocalIsMuted : false,
          isVideoEnabled: true,
          isFocusedScreenShare: true
        })
        seenIds.add(itemId)
        rtkDebug.log('[RTK Modal] 🖥️ [1] Added focused screen share to grid:', {
          itemId,
          peerId: focusedScreenShare.peerId,
          peerName: focusedScreenShare.peerName,
          trackId: focusedScreenShare.screenShareTrack.id
        })
      }
    }

    // Add local participant (video or avatar) - ALWAYS show, even when screen sharing
    // Screen share and camera video are separate and should both be visible
    // CRITICAL: Filter out screen share track - only use camera video track
    const localVideoTrack =
      meeting?.self?.videoTrack && !isVideoTrackScreenShare(meeting.self.videoTrack) ? meeting.self.videoTrack : null
    const localAudioTrack = meeting?.self?.audioTrack
    const localHasVideo = effectiveLocalIsVideoEnabled && !!localVideoTrack

    // Always add local participant - screen share is a separate item
    const localParticipantId = 'local-participant'
    if (!seenIds.has(localParticipantId)) {
      const localPeerId = meeting?.self?.id || 'local'
      const localUserId = meeting?.self?.userId || currentUserId
      const localCustomParticipantId = meeting?.self?.customParticipantId

      // Try to match avatar by userId first (most reliable)
      const localAvatarUrl =
        avatarUrlMap.get(localUserId || '') ||
        avatarUrlMap.get(localCustomParticipantId || '') ||
        avatarUrlMap.get(localPeerId) ||
        participants[0]?.avatarUrl ||
        meeting?.self?.picture

      // Get local participant name from currentUser, currentParticipant, or meeting.self
      // Don't use participants[0] in test mode as it would be the first test participant
      const localParticipantName =
        currentUser?.displayName ||
        currentUser?.username ||
        currentParticipant?.odName ||
        meeting?.self?.name ||
        meeting?.self?.odName ||
        'You'

      const localParticipantItem = {
        id: localParticipantId,
        type: localHasVideo ? 'video' : 'avatar',
        peerId: localPeerId, // Use actual peer ID from SDK (fallback to 'local' for safety)
        peerName: localParticipantName,
        avatarUrl: localAvatarUrl,
        userId: meeting?.self?.userId, // For checking hand-raised state
        customParticipantId: meeting?.self?.customParticipantId, // Our DB user ID - for checking reactions
        videoTrack: localVideoTrack,
        audioTrack: localAudioTrack,
        hasVideoTrack: localHasVideo, // For rendering decision
        hasAudioTrack: !!localAudioTrack, // Audio needs video element too!
        isLocal: true,
        isMuted: effectiveLocalIsMuted,
        isVideoEnabled: effectiveLocalIsVideoEnabled,
        // Don't highlight yourself as active speaker (industry standard UX)
        // You already know you're speaking - more useful to see who ELSE is speaking
        isActiveSpeaker: false // Could make this: activeSpeakerId === 'local' to show self-highlight
      } as const
      items.push(localParticipantItem)
      seenIds.add(localParticipantId)
      rtkDebug.log('[RTK Modal] 👤 Added local participant to items:', {
        id: localParticipantItem.id,
        type: localParticipantItem.type,
        peerId: localParticipantItem.peerId,
        isLocal: localParticipantItem.isLocal,
        hasVideo: localHasVideo,
        hasAudio: !!localAudioTrack,
        avatarUrl: localAvatarUrl,
        localUserId,
        localCustomParticipantId,
        fromMap_userId: avatarUrlMap.get(localUserId || ''),
        fromMap_customId: avatarUrlMap.get(localCustomParticipantId || ''),
        fromMap_peerId: avatarUrlMap.get(localPeerId),
        fromParticipants: participants[0]?.avatarUrl,
        fromSelf: meeting?.self?.picture
      })
    }

    // Add ALL non-focused screen shares (from allScreenShares array)
    // CRITICAL: Skip the focused one - it's already added above!
    allScreenShares.forEach((share, index) => {
      rtkDebug.log(`[RTK Modal] 🔍 Processing allScreenShares[${index}]:`, {
        peerId: share.peerId,
        peerName: share.peerName,
        trackId: share.trackId,
        isFocused: focusedScreenShare?.peerId === share.peerId,
        focusedPeerId: focusedScreenShare?.peerId
      })

      // Skip if this is the focused screen share (already added above)
      if (share.peerId === focusedScreenShare?.peerId) {
        rtkDebug.log('[RTK Modal] ⏭️ Skipping focused screen share (already added):', share.peerId)
        return
      }

      const shareId = `screen-share-${share.peerId}`
      rtkDebug.log('[RTK Modal] 🔍 Checking if shareId exists in seenIds:', {
        shareId,
        hasInSeenIds: seenIds.has(shareId),
        seenIdsArray: Array.from(seenIds)
      })
      if (seenIds.has(shareId)) {
        rtkDebug.warn('[RTK Modal] ⚠️ Skipping duplicate screen share:', shareId)
      } else {
        items.push({
          id: shareId,
          type: 'screen-share',
          peerId: share.peerId,
          peerName: share.peerName,
          screenShareTrack: share.screenShareTrack,
          isLocal: isLocalUser(share.peerId),
          isMuted: isLocalUser(share.peerId) ? effectiveLocalIsMuted : false,
          isVideoEnabled: true
        })
        seenIds.add(shareId)
        rtkDebug.log('[RTK Modal] 🖥️ [2] Added non-focused screen share to grid:', {
          shareId,
          peerId: share.peerId,
          peerName: share.peerName,
          trackId: share.trackId
        })
      }
    })

    // Add remote participants (videos or avatars) - always add, even if sharing screen
    stableRemotePeers?.forEach((peer: any) => {
      // Get camera track - exclude screen share track
      const cameraVideoTrack = peer.videoTrack && !isVideoTrackScreenShare(peer.videoTrack) ? peer.videoTrack : null
      const hasVideo = peer.videoEnabled && !!cameraVideoTrack

      const participantId = `participant-${peer.id}`
      if (seenIds.has(participantId)) {
        rtkDebug.warn('[RTK Modal] ⚠️ Skipping duplicate participant:', participantId)
      } else {
        // Try to match avatar by userId or customParticipantId
        const avatarUrl =
          avatarUrlMap.get(peer.userId) ||
          avatarUrlMap.get(peer.customParticipantId) ||
          avatarUrlMap.get(peer.id) ||
          peer.picture

        rtkDebug.log('[RTK Modal] 👥 Adding remote participant:', {
          peerId: peer.id,
          userId: peer.userId,
          customParticipantId: peer.customParticipantId,
          peerName: peer.name,
          avatarUrl,
          fromMap_userId: avatarUrlMap.get(peer.userId),
          fromMap_customId: avatarUrlMap.get(peer.customParticipantId),
          fromMap_peerId: avatarUrlMap.get(peer.id),
          peer_picture: peer.picture
        })
        items.push({
          id: participantId,
          type: hasVideo ? 'video' : 'avatar',
          peerId: peer.id,
          peerName: peer.name || peer.displayName || peer.odName || peer.customParticipantId || 'Unknown',
          avatarUrl: avatarUrl || peer.avatarUrl || peer.picture,
          userId: peer.userId, // SDK userId - for checking hand-raised state
          customParticipantId: peer.customParticipantId, // Our DB user ID - for checking hand-raised state
          videoTrack: cameraVideoTrack,
          audioTrack: peer.audioTrack,
          hasVideoTrack: hasVideo, // For rendering decision
          hasAudioTrack: !!peer.audioTrack, // Audio needs video element too!
          isLocal: false,
          isMuted: !peer.audioEnabled,
          isVideoEnabled: peer.videoEnabled || false,
          isActiveSpeaker: activeSpeakerId === peer.id // Check if this peer is active speaker
        })
        seenIds.add(participantId)
      }
    })

    rtkDebug.log(`[RTK Modal] 📋 Raw items before sorting:`, {
      totalItems: items.length,
      itemIds: items.map(i => i.id),
      duplicateIds: items.map(i => i.id).filter((id, index, arr) => arr.indexOf(id) !== index)
    })

    // Sort items: Active speaker first (after focused screen share), then by history
    const focusedScreenShareCount = focusedScreenShare ? 1 : 0
    // CRITICAL: Find local participant, NOT screen share (screen share is also isLocal=true)
    const localItem = items.find(i => i.isLocal && i.type !== 'screen-share')

    rtkDebug.log('[RTK Modal] 🔍 Looking for local participant in items:', {
      totalItems: items.length,
      itemsWithIsLocal: items.filter(i => i.isLocal).map(i => ({ id: i.id, type: i.type, isLocal: i.isLocal })),
      foundLocalItem: localItem ? { id: localItem.id, type: localItem.type } : null
    })

    const activeSpeakerItems = items
      .slice(focusedScreenShareCount)
      .filter(item => item.isActiveSpeaker && !item.isLocal && item.type !== 'screen-share')
    const historyItems = items
      .slice(focusedScreenShareCount)
      .filter(
        item =>
          !item.isActiveSpeaker &&
          !item.isLocal &&
          item.type !== 'screen-share' &&
          activeSpeakerHistory?.includes(item.peerId)
      )
      .sort((a, b) => {
        const aIndex = activeSpeakerHistory?.indexOf(a.peerId) ?? -1
        const bIndex = activeSpeakerHistory?.indexOf(b.peerId) ?? -1
        return aIndex - bIndex
      })
    const otherItems = items
      .slice(focusedScreenShareCount)
      .filter(
        item =>
          !item.isActiveSpeaker &&
          !item.isLocal &&
          item.type !== 'screen-share' &&
          !activeSpeakerHistory?.includes(item.peerId)
      )
    const screenShareItems = items.slice(focusedScreenShareCount).filter(i => i.type === 'screen-share')

    rtkDebug.log('[RTK Modal] 📊 Sorting groups:', {
      focusedScreenShareCount,
      focusedItems: items.slice(0, focusedScreenShareCount).map(i => ({ id: i.id, type: i.type })),
      localItem: localItem ? { id: localItem.id, type: localItem.type } : null,
      activeSpeakerItems: activeSpeakerItems.map(i => ({ id: i.id, type: i.type })),
      historyItems: historyItems.map(i => ({ id: i.id, type: i.type })),
      otherItems: otherItems.map(i => ({ id: i.id, type: i.type })),
      screenShareItems: screenShareItems.map(i => ({ id: i.id, type: i.type }))
    })

    // Reconstruct: focused screen share (if any) + local + active speaker + history + others + screen shares
    const sortedItems = [
      ...items.slice(0, focusedScreenShareCount), // Keep focused screen share first
      ...(localItem ? [localItem] : []),
      ...activeSpeakerItems,
      ...historyItems,
      ...otherItems,
      ...screenShareItems
    ]

    rtkDebug.log(`[RTK Modal] Grid items built:`, {
      totalItems: sortedItems.length,
      screenShares: sortedItems.filter(i => i.type === 'screen-share').length,
      screenShareItems: sortedItems
        .filter(i => i.type === 'screen-share')
        .map(i => ({
          id: i.id,
          peerId: i.peerId,
          peerName: i.peerName,
          isFocused: i.isFocusedScreenShare,
          isLocal: i.isLocal
        })),
      focusedScreenShare: focusedScreenShare?.peerId,
      allScreenSharesCount: allScreenShares.length,
      allScreenSharesPeerIds: allScreenShares.map(s => s.peerId),
      activeSpeakerId,
      activeSpeakerCount: activeSpeakerItems.length,
      handRaisedDeps: {
        localHandRaised: callState.handRaised,
        remoteHandsRaisedKeys: Object.keys(callState.remoteHandsRaised || {}),
        remoteHandsRaisedValues: callState.remoteHandsRaised,
        handRaisedOrderKeys: Object.keys(callState.handRaisedOrder || {}),
        handRaisedOrderValues: callState.handRaisedOrder
      },
      items: sortedItems.map(i => ({
        id: i.id,
        type: i.type,
        peerId: i.peerId,
        userId: i.userId, // SDK userId
        customParticipantId: i.customParticipantId, // Our DB user ID
        peerName: i.peerName,
        isFocused: i.isFocusedScreenShare,
        isActiveSpeaker: i.isActiveSpeaker,
        isLocal: i.isLocal
      })),
      duplicateCheck: {
        allIds: sortedItems.map(i => i.id),
        duplicates: sortedItems.map(i => i.id).filter((id, index, arr) => arr.indexOf(id) !== index)
      }
    })

    return sortedItems
  }, [
    focusedScreenShare,
    allScreenShares,
    stableRemotePeers, // Use stable version to prevent unnecessary recomputation
    callState.isVideoEnabled,
    callState.isMuted,
    callState.isScreenSharing,
    callState.handRaised, // Needed for rendering hand indicator on local tile
    callState.remoteHandsRaised, // Needed for rendering hand indicators on remote tiles
    callState.handRaisedOrder, // Needed for hand-raise order numbers
    participants,
    meeting?.self?.videoTrack?.id, // Only depend on track ID, not entire object
    meeting?.self?.audioTrack?.id, // Only depend on track ID, not entire object
    meeting?.self?.videoEnabled, // SDK local video state (source of truth)
    meeting?.self?.audioEnabled, // SDK local audio state (source of truth)
    meeting?.self?.screenShareEnabled, // SDK local screen share state (source of truth)
    localScreenShareTrack?.id, // local screen share track identity
    meeting?.self?.userId, // For hand-raised checks
    meeting?.self?.customParticipantId, // For reactions
    activeSpeakerId,
    activeSpeakerHistory,
    callConversationProp?.participants, // For avatar URLs from call conversation
    activeConversation?.participants, // Fallback for avatar URLs
    currentUserId // For local avatar lookup
  ])

  // Clean up stale video ref callbacks when participants leave
  useEffect(() => {
    const currentPeerIds = new Set(gridItems.map(item => item.peerId))
    const callbackPeerIds = Array.from(videoRefCallbacksRef.current.keys())

    callbackPeerIds.forEach(peerId => {
      if (!currentPeerIds.has(peerId)) {
        videoRefCallbacksRef.current.delete(peerId)
        rtkDebug.log(`[RTK Modal] 🧹 Cleaned up video ref callback for departed peer: ${peerId}`)
      }
    })
  }, [gridItems])

  // Paginate grid items
  const paginatedGridItems = useMemo(() => {
    const totalPages = Math.ceil(gridItems.length / PARTICIPANTS_PER_PAGE)
    const startIndex = currentPage * PARTICIPANTS_PER_PAGE
    const endIndex = startIndex + PARTICIPANTS_PER_PAGE
    const pageItems = gridItems.slice(startIndex, endIndex)

    rtkDebug.log('[RTK Modal] Pagination:', {
      totalItems: gridItems.length,
      totalPages,
      currentPage,
      startIndex,
      endIndex,
      pageItems: pageItems.length
    })

    return {
      items: pageItems,
      totalPages,
      totalItems: gridItems.length
    }
  }, [gridItems, currentPage, PARTICIPANTS_PER_PAGE])

  // Reset to first page if current page is out of bounds (participants left)
  useEffect(() => {
    const totalPages = Math.ceil(gridItems.length / PARTICIPANTS_PER_PAGE)
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(totalPages - 1)
    }
  }, [gridItems.length, currentPage, PARTICIPANTS_PER_PAGE])

  // Calculate responsive values based on screen size
  const [responsiveConfig, setResponsiveConfig] = useState(() => {
    const width = window.innerWidth
    return {
      sidebarWidth: width < 768 ? 280 : width < 1024 ? 320 : 360,
      minTileSize: width < 768 ? 150 : width < 1024 ? 180 : 250,
      minTileSizeWithSidebar: width < 768 ? 120 : width < 1024 ? 150 : 200
    }
  })

  // Update responsive config on window resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      setResponsiveConfig({
        sidebarWidth: width < 768 ? 280 : width < 1024 ? 320 : 360,
        minTileSize: width < 768 ? 150 : width < 1024 ? 180 : 250,
        minTileSizeWithSidebar: width < 768 ? 120 : width < 1024 ? 150 : 200
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Calculate minimum tile size for auto-fit grid based on panel state and screen size
  const minTileSize = useMemo(() => {
    return sidebarView !== 'closed' ? responsiveConfig.minTileSizeWithSidebar : responsiveConfig.minTileSize
  }, [sidebarView, responsiveConfig])

  // Create stable track IDs for dependency tracking
  const screenShareTrackIds = useMemo(() => {
    return gridItems
      .filter(item => item.type === 'screen-share' && item.screenShareTrack)
      .map(item => `${item.peerId}:${item.screenShareTrack!.id}`)
      .sort()
      .join('|')
  }, [gridItems])

  const videoTrackIds = useMemo(() => {
    return gridItems
      .filter(item => item.type === 'video' && item.videoTrack)
      .map(item => `${item.peerId}:${item.videoTrack!.id}`)
      .sort()
      .join('|')
  }, [gridItems])

  // Attach screen share tracks to video elements in grid
  useEffect(() => {
    // When coming back from minimize, refs might not be populated yet - retry after a short delay
    const attachVideos = () => {
      gridItems.forEach(item => {
        if (item.type === 'screen-share' && item.screenShareTrack) {
          const videoEl = screenShareVideoRefs.current.get(item.peerId)
          if (!videoEl) {
            rtkDebug.warn(`[RTK Modal] ⚠️ No video element found for screen share ${item.peerId}`)
            return
          }

          // Check track state
          const track = item.screenShareTrack
          if (track.readyState === 'ended') {
            rtkDebug.warn(`[RTK Modal] Screen share track ${track.id} has ended`)
            return
          }

          const stream = new MediaStream()
          stream.addTrack(track)

          // Only update if track changed AND element has valid stream
          const currentStream = videoEl.srcObject as MediaStream
          const currentTrack = currentStream?.getVideoTracks()[0]
          if (currentStream && currentTrack?.id === track.id && track.readyState === 'live') {
            rtkDebug.log(`[RTK Modal] Screen share track already attached and live for ${item.peerId}`)
            return // Same track and still live, no need to update
          }

          // If srcObject is null (after unmount/remount), always re-attach
          if (!currentStream) {
            rtkDebug.log(`[RTK Modal] 📺 No current stream - re-attaching after Dialog remount`)
          }

          rtkDebug.log(`[RTK Modal] 📺 Attaching screen share track:`, {
            peerId: item.peerId,
            peerName: item.peerName,
            trackId: track.id,
            trackLabel: track.label,
            trackReadyState: track.readyState,
            trackEnabled: track.enabled,
            trackKind: track.kind,
            trackSettings: track.getSettings ? track.getSettings() : null,
            isLocal: item.isLocal
          })

          // Clear and re-attach with proper timing for tab captures
          videoEl.srcObject = null

          // Wait longer for tab captures to initialize properly
          setTimeout(() => {
            // Double-check track is still valid
            if (track.readyState === 'ended') {
              rtkDebug.error(`[RTK Modal] Track ended before attachment for ${item.peerId}`)
              return
            }

            videoEl.srcObject = stream
            videoEl.muted = true // Must be muted for autoplay

            // Log video element state
            rtkDebug.log(`[RTK Modal] Video element state before play:`, {
              peerId: item.peerId,
              videoWidth: videoEl.videoWidth,
              videoHeight: videoEl.videoHeight,
              readyState: videoEl.readyState,
              paused: videoEl.paused,
              muted: videoEl.muted
            })

            // Force play with better error handling
            const playPromise = videoEl.play()
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  rtkDebug.log(`[RTK Modal] ✅ Screen share playing for ${item.peerId}`, {
                    videoWidth: videoEl.videoWidth,
                    videoHeight: videoEl.videoHeight,
                    currentTime: videoEl.currentTime
                  })

                  // Check after a moment if video dimensions are available
                  setTimeout(() => {
                    if (videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
                      rtkDebug.error(`[RTK Modal] ⚠️ Video playing but no dimensions for ${item.peerId}:`, {
                        videoWidth: videoEl.videoWidth,
                        videoHeight: videoEl.videoHeight,
                        readyState: videoEl.readyState,
                        trackReadyState: track.readyState,
                        trackEnabled: track.enabled
                      })
                    }
                  }, 500)
                })
                .catch(err => {
                  rtkDebug.warn(`[RTK Modal] ⚠️ Could not auto-play screen share ${item.peerId}:`, err)
                  // Try playing again after a short delay
                  setTimeout(() => {
                    videoEl.play().catch(e => rtkDebug.error('[RTK Modal] Retry play failed:', e))
                  }, 100)
                })
            }
          }, 100) // Increased delay for tab captures to initialize
        }
      })
    }

    // Immediate attachment
    attachVideos()

    // Retry after a short delay to ensure refs are populated after Dialog remount or pagination change
    const retryTimer = setTimeout(attachVideos, 150)
    return () => clearTimeout(retryTimer)
  }, [screenShareTrackIds, gridItems, callState.isMinimized, currentPage])

  // Attach video tracks to video elements in grid
  useEffect(() => {
    const attachVideos = () => {
      gridItems.forEach(item => {
        if (item.type === 'video' && item.videoTrack) {
          const videoEl = item.isLocal ? localVideoRef.current : remoteVideoRefs.current.get(item.peerId)

          if (!videoEl) {
            if (!callState.isMinimized) {
              rtkDebug.warn(`[RTK Modal] ⚠️ No video element found for ${item.isLocal ? 'local' : item.peerId}`)
            }
            return
          }

          // Check if this is a test participant (mock track)
          const isTestParticipant =
            item.peerId?.startsWith('test-participant-') ||
            item.videoTrack?.id?.startsWith('mock-') ||
            item.audioTrack?.id?.startsWith('mock-')

          if (isTestParticipant) {
            // For test participants, skip track attachment (they're just mock objects)
            // The video element will render as avatar-only, which is fine for testing
            videoEl.srcObject = null
            return
          }

          const stream = new MediaStream()
          if (item.videoTrack) stream.addTrack(item.videoTrack)
          if (item.audioTrack) stream.addTrack(item.audioTrack)

          // Only update if track changed OR srcObject is null (after remount)
          const currentStream = videoEl.srcObject as MediaStream
          const currentVideoTrack = currentStream?.getVideoTracks()[0]
          if (currentStream && currentVideoTrack?.id === item.videoTrack.id) {
            return // Same track, no need to update
          }

          if (!currentStream) {
            rtkDebug.log(
              `[RTK Modal] 📹 Re-attaching video after Dialog remount for ${item.isLocal ? 'local' : item.peerId}`
            )
          }

          videoEl.srcObject = null
          setTimeout(() => {
            videoEl.srcObject = stream
            videoEl.muted = item.isLocal
            void applySinkIdToElement(videoEl, selectedAudioOutputIdRef.current)
            videoEl.play().catch(err => rtkDebug.warn(`[RTK Modal] Could not auto-play video ${item.peerId}:`, err))
          }, 10)
        }
      })
    }

    // Immediate attachment
    attachVideos()

    // Retry after a short delay to ensure refs are populated after Dialog remount or pagination change
    const retryTimer = setTimeout(attachVideos, 150)
    return () => clearTimeout(retryTimer)
  }, [videoTrackIds, gridItems, callState.isMinimized, currentPage])

  // Expanded screen share video ref (for fullscreen overlay)
  const expandedScreenShareVideoRef = useRef<HTMLVideoElement>(null)

  // Minimized view refs - for audio management in PiP-style window
  const pipAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())

  const handleSpeakerDeviceChange = useCallback(
    (deviceId: string) => {
      selectedAudioOutputIdRef.current = deviceId

      // Apply to all currently mounted remote media elements
      remoteVideoRefs.current.forEach(videoEl => {
        void applySinkIdToElement(videoEl, deviceId)
      })
      pipAudioRefs.current.forEach(audioEl => {
        void applySinkIdToElement(audioEl, deviceId)
      })
      void applySinkIdToElement(expandedScreenShareVideoRef.current, deviceId)
    },
    [applySinkIdToElement]
  )

  // Apply saved speaker output automatically when call UI mounts (so pre-call selection takes effect immediately).
  const hasAppliedInitialSinkIdRef = useRef(false)
  useEffect(() => {
    if (hasAppliedInitialSinkIdRef.current) return
    if (typeof window === 'undefined') return
    if (!callState.roomId) return

    try {
      const saved = localStorage.getItem('chat-preferred-audio-output')
      if (saved) {
        handleSpeakerDeviceChange(saved)
      }
    } catch {
      // ignore
    } finally {
      hasAppliedInitialSinkIdRef.current = true
    }
  }, [callState.roomId, handleSpeakerDeviceChange])

  // Reset when call ends so the next call can apply again.
  useEffect(() => {
    if (callState.roomId) return
    hasAppliedInitialSinkIdRef.current = false
  }, [callState.roomId])

  // Set expanded video stream - simplified to match old implementation
  useEffect(() => {
    if (expandedScreenShare && expandedScreenShareVideoRef.current) {
      expandedScreenShareVideoRef.current.srcObject = expandedScreenShare.stream
      expandedScreenShareVideoRef.current.play().catch(err => console.debug('Expanded video play error:', err))
    }
  }, [expandedScreenShare])

  // Auto-close expanded screen share if the peer stops sharing
  useEffect(() => {
    if (!expandedScreenShare) return

    // Check if the expanded screen share still exists in grid items
    const stillExists = gridItems.some(
      item => item.type === 'screen-share' && item.peerId === expandedScreenShare.peerId && item.screenShareTrack
    )

    if (!stillExists) {
      setExpandedScreenShare(null)
    }
  }, [expandedScreenShare, gridItems])

  // Handle ESC key to close fullscreen
  useEffect(() => {
    if (!expandedScreenShare) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpandedScreenShare(null)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [expandedScreenShare])

  // Debounced active speaker for minimized view (prevent flickering)
  const [debouncedActiveSpeaker, setDebouncedActiveSpeaker] = useState<string | null>(null)
  const activeSpeakerTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Clear existing timeout
    if (activeSpeakerTimeoutRef.current) {
      clearTimeout(activeSpeakerTimeoutRef.current)
    }

    // If there's an active speaker, debounce the update
    if (activeSpeakerId) {
      activeSpeakerTimeoutRef.current = setTimeout(() => {
        setDebouncedActiveSpeaker(activeSpeakerId)
      }, 800) // Wait 0.8 seconds before switching to prevent flickering
    }

    return () => {
      if (activeSpeakerTimeoutRef.current) {
        clearTimeout(activeSpeakerTimeoutRef.current)
      }
    }
  }, [activeSpeakerId])

  // Enrich peers with avatar data from activeConversation
  const enrichPeerWithAvatar = useCallback(
    (peer: any) => {
      if (!activeConversation?.participants) return peer

      // Try to find matching participant by userId or customParticipantId
      const conversationParticipant = activeConversation.participants.find(
        (cp: any) =>
          cp.userId === peer.userId ||
          cp.userId === peer.customParticipantId ||
          cp.user?.id === peer.userId ||
          cp.user?.id === peer.customParticipantId
      )

      if (conversationParticipant?.user?.avatarUrl) {
        rtkDebug.log('[RTK Modal] 🖼️ Enriched peer with avatar:', {
          peerId: peer.id,
          userId: peer.userId,
          customParticipantId: peer.customParticipantId,
          avatarUrl: conversationParticipant.user.avatarUrl
        })
        return {
          ...peer,
          avatarUrl: conversationParticipant.user.avatarUrl
        }
      }

      return peer
    },
    [activeConversation]
  )

  // Get first remote peer for minimized view - prioritize debounced active speaker
  const firstRemotePeer = useMemo(() => {
    // If there's a debounced active speaker, show their video
    if (debouncedActiveSpeaker) {
      const activeSpeaker = stableRemotePeers.find(peer => peer.id === debouncedActiveSpeaker)
      if (activeSpeaker) {
        return enrichPeerWithAvatar(activeSpeaker)
      }
    }
    // Fallback to first peer if no active speaker
    const firstPeer = remotePeers[0] || null
    return firstPeer ? enrichPeerWithAvatar(firstPeer) : null
  }, [remotePeers, debouncedActiveSpeaker, enrichPeerWithAvatar])

  // Track audio track IDs to trigger effect when they change
  const remoteAudioTrackIds = useMemo(() => {
    return stableRemotePeers.map(p => (p as RealtimeKitPeer).audioTrack?.id || null).join(',')
  }, [stableRemotePeers])

  // Track previous audio track IDs to prevent unnecessary re-runs
  const prevAudioTrackIdsRef = useRef<string>('')

  // Build stream from peer's tracks (RealtimeKit doesn't use remoteStreams Map)
  const buildStreamFromPeer = useCallback((peer: RealtimeKitPeer | null): MediaStream | null => {
    if (!peer) return null

    const stream = new MediaStream()

    if (peer.audioTrack) {
      stream.addTrack(peer.audioTrack)
    }

    if (peer.videoTrack) {
      stream.addTrack(peer.videoTrack)
    }

    return stream.getTracks().length > 0 ? stream : null
  }, [])

  // Play all remote audio streams when minimized (so user can hear all participants)
  useEffect(() => {
    if (!callState.isMinimized) {
      // Clean up audio elements when not minimized
      rtkDebug.log('[Minimized] Cleaning up audio elements, count:', pipAudioRefs.current.size)
      pipAudioRefs.current.forEach(audio => {
        audio.pause()
        audio.srcObject = null
      })
      pipAudioRefs.current.clear()
      prevAudioTrackIdsRef.current = ''
      return
    }

    // Skip if audio track IDs haven't changed (prevent unnecessary re-runs)
    if (prevAudioTrackIdsRef.current === remoteAudioTrackIds) {
      return
    }
    prevAudioTrackIdsRef.current = remoteAudioTrackIds

    rtkDebug.log('[Minimized] Setting up audio for remote peers:', {
      remotePeersCount: stableRemotePeers.length,
      remotePeerIds: stableRemotePeers.map(p => p.id),
      existingAudioCount: pipAudioRefs.current.size
    })

    // Create or update audio elements for each remote peer
    stableRemotePeers.forEach(peer => {
      const rtkPeer = peer as RealtimeKitPeer
      const peerName = rtkPeer.name || rtkPeer.odName
      const stream = buildStreamFromPeer(rtkPeer)
      if (stream && stream.getAudioTracks().length > 0) {
        const existingAudio = pipAudioRefs.current.get(peer.id)

        if (!existingAudio) {
          // Create new audio element
          rtkDebug.log('[Minimized] Creating audio element for peer:', peerName, {
            hasAudioTracks: stream.getAudioTracks().length,
            audioTracksInfo: stream.getAudioTracks().map(t => ({
              id: t.id,
              enabled: t.enabled,
              readyState: t.readyState
            }))
          })
          const audio = document.createElement('audio')
          audio.autoplay = true
          audio.srcObject = stream
          void applySinkIdToElement(audio, selectedAudioOutputIdRef.current)
          audio
            .play()
            .then(() => rtkDebug.log('[Minimized] Audio playing for:', peerName))
            .catch(err => console.error('[Minimized] Audio play error for', peerName, ':', err))
          pipAudioRefs.current.set(peer.id, audio)
        } else {
          // Update existing audio element with new stream
          const oldStream = existingAudio.srcObject as MediaStream
          const oldTrackId = oldStream?.getAudioTracks()[0]?.id
          const newTrackId = stream.getAudioTracks()[0]?.id

          if (oldTrackId !== newTrackId) {
            rtkDebug.log('[Minimized] Updating audio stream for peer:', peerName, {
              oldTrackId,
              newTrackId
            })
            existingAudio.srcObject = stream
            void applySinkIdToElement(existingAudio, selectedAudioOutputIdRef.current)
            existingAudio.play().catch(err => console.error('[Minimized] Audio play error for', peerName, ':', err))
          }
        }
      } else if (pipAudioRefs.current.has(peer.id)) {
        // Peer has no audio tracks, remove the audio element
        rtkDebug.log('[Minimized] Removing audio for peer (no tracks):', peerName)
        const audio = pipAudioRefs.current.get(peer.id)!
        audio.pause()
        audio.srcObject = null
        pipAudioRefs.current.delete(peer.id)
      }
    })

    // Clean up removed peers
    const currentPeerIds = new Set(stableRemotePeers.map(p => p.id))
    pipAudioRefs.current.forEach((audio, peerId) => {
      if (!currentPeerIds.has(peerId)) {
        rtkDebug.log('[Minimized] Removing audio for peer (left call):', peerId)
        audio.pause()
        audio.srcObject = null
        pipAudioRefs.current.delete(peerId)
      }
    })
  }, [callState.isMinimized, remoteAudioTrackIds, remotePeers, buildStreamFromPeer])

  // Cleanup portal container when component unmounts or viewMode changes away from minimized
  useEffect(() => {
    // Cleanup function - runs on unmount or when dependencies change
    return () => {
      if (viewMode !== 'minimized') {
        const portalContainer = document.getElementById('rtk-group-call-minimized-portal')
        if (portalContainer) {
          // Don't remove the container immediately - let React portal unmount first
          // This prevents the "appears then disappears" issue
          setTimeout(() => {
            const container = document.getElementById('rtk-group-call-minimized-portal')
            if (container && container.childElementCount === 0) {
              container.remove()
            }
          }, 100)
        }
      }
    }
  }, [viewMode])

  const isOpen =
    callState.status === 'connected' || callState.status === 'joining' || callState.status === 'reconnecting'

  // Render minimized view - floating PiP-style window
  if (isOpen && viewMode === 'minimized') {
    const rtkFirstPeer = firstRemotePeer as RealtimeKitPeer | null
    const firstRemoteStream = rtkFirstPeer ? buildStreamFromPeer(rtkFirstPeer) : null

    // Check if first remote peer has raised hand
    const isFirstPeerHandRaised = rtkFirstPeer
      ? isParticipantHandRaised(rtkFirstPeer.id, rtkFirstPeer.userId, rtkFirstPeer.customParticipantId)
      : false

    // Check if first remote peer is muted (audioEnabled is false means muted)
    const isFirstPeerMuted = rtkFirstPeer ? !rtkFirstPeer.audioEnabled : false

    // Filter reactions for first remote peer
    // Match by customParticipantId (DB ID) or peer ID
    const firstPeerReactions = rtkFirstPeer
      ? activeReactions.filter(
          r => r.participantId === rtkFirstPeer.customParticipantId || r.participantId === rtkFirstPeer.id
        )
      : []

    // Render minimized view as portal to a dedicated container
    // Use unique instance ID to prevent conflicts when multiple chat modules are loaded
    const portalContainerId = `rtk-group-call-minimized-portal-${instanceId}`
    let portalContainer = document.getElementById(portalContainerId)
    if (!portalContainer) {
      portalContainer = document.createElement('div')
      portalContainer.id = portalContainerId
      portalContainer.style.cssText = 'position: fixed; z-index: 9999;'
      document.body.appendChild(portalContainer)
    }

    const firstPeerHandRaisedOrderNumber = rtkFirstPeer
      ? getHandRaisedOrderNumber(rtkFirstPeer.id, rtkFirstPeer.userId, rtkFirstPeer.customParticipantId)
      : undefined

    rtkDebug.log('[RTK Modal] 🎨 Rendering MinimizedCallView via portal', {
      portalId: portalContainer.id,
      viewMode,
      isOpen,
      timestamp: Date.now()
    })

    // Use a unique key based on call start time to force React to properly unmount/remount
    // when call restarts, preventing duplicate portals from multiple renders
    const portalKey = `minimized-${callState.status}-${callState.startTime || Date.now()}`

    return createPortal(
      <div key={portalKey} data-view-mode="minimized">
        <MinimizedCallView
          firstRemotePeer={rtkFirstPeer}
          firstRemoteStream={firstRemoteStream}
          remotePeerCount={stableRemotePeers.length}
          callStartTime={callState.startTime}
          callType={callState.callType}
          isMuted={effectiveLocalIsMuted}
          isVideoEnabled={effectiveLocalIsVideoEnabled}
          isHandRaised={hideReactionsAndHandRaise ? false : isFirstPeerHandRaised}
          handRaisedOrderNumber={hideReactionsAndHandRaise ? undefined : firstPeerHandRaisedOrderNumber}
          isRemotePeerMuted={isFirstPeerMuted}
          reactions={hideReactionsAndHandRaise ? [] : firstPeerReactions}
          onToggleMute={onToggleMute}
          onToggleVideo={onToggleVideo}
          onExpand={onToggleMinimize || NOOP}
          onEndCall={onEndCall}
          prefixDataTestId={prefixDataTestId}
          t={t}
        />
      </div>,
      portalContainer
    )
  }

  // Don't render if not open or minimized
  if (!isOpen) {
    return null
  }

  return (
    <>
      {createPortal(
        <div key="full-call-dialog" data-view-mode="full">
          <Dialog modal={false} open={isOpen} onOpenChange={() => {}}>
            <DialogContent
              className="gba:h-[85vh] gba:p-0 gba:overflow-hidden gba:flex gba:flex-col gba:gap-0"
              style={{
                width: '90vw',
                maxWidth: window.innerWidth >= 1280 ? '1800px' : window.innerWidth >= 1024 ? '1600px' : '90vw'
              }}
              data-testid={`${prefixDataTestId}-modal`}
              onPointerDownOutside={e => e.preventDefault()}
              onEscapeKeyDown={e => e.preventDefault()}
            >
              <style>{`
              [data-testid="${prefixDataTestId}-modal"] > button[data-radix-collection-item] {
                display: none !important;
              }
              [data-testid="${prefixDataTestId}-modal"] > button {
                display: none !important;
              }
            `}</style>
              <DialogTitle className="gba:sr-only">
                {conversationName || t('chat-groupCall') || 'Group Call'}
              </DialogTitle>
              <DialogDescription className="gba:sr-only">
                {callState.callType === 'video' ? t('chat-videoCall') : t('chat-audioCall')} with{' '}
                {stableRemotePeers.length + 1} {stableRemotePeers.length + 1 === 1 ? 'participant' : 'participants'}
              </DialogDescription>

              {/* Row 1: Compact Header */}
              <div className="gba:bg-background gba:border-b gba:flex-shrink-0">
                <CallHeader
                  conversationName={conversationName}
                  conversationType={callState.conversationType}
                  callStartTime={callState.startTime}
                  participantCount={stableRemotePeers.length + 1}
                  availableParticipantsCount={availableParticipants?.length || 0}
                  callType={callState.callType}
                  showParticipantsPanel={sidebarView === 'participants'}
                  showChatPanel={sidebarView === 'chat'}
                  unreadChatCount={unreadChatCount}
                  onToggleParticipantsPanel={handleToggleParticipants}
                  onToggleChat={handleToggleChat}
                  onToggleMinimize={onToggleMinimize}
                  onClose={onEndCall}
                  prefixDataTestId={prefixDataTestId}
                  t={t}
                />
              </div>

              {/* Row 2: Video Area + Sidebar (Grid Layout) */}
              <div
                className="gba:flex-1 gba:grid gba:min-h-0 gba:overflow-hidden gba:bg-muted/30"
                style={{
                  gridTemplateColumns: sidebarView !== 'closed' ? `1fr ${responsiveConfig.sidebarWidth}px` : '1fr'
                }}
              >
                {/* Video Area */}
                <div className="gba:flex gba:flex-col gba:gap-4 gba:p-4 gba:min-h-0 gba:overflow-hidden">
                  {focusedScreenShare ? (
                    // PRESENTATION MODE: Dominant screen share + participant filmstrip
                    <>
                      {/* Main Screen Share - 75% height */}
                      <div className="gba:flex-[3] gba:min-h-0 gba:rounded-lg gba:overflow-hidden gba:bg-black gba:relative">
                        <video
                          ref={el => {
                            if (el) {
                              screenShareVideoRefs.current.set(focusedScreenShare.peerId, el)
                            }
                          }}
                          autoPlay
                          playsInline
                          muted
                          className="gba:w-full gba:h-full gba:object-contain"
                          data-testid={`${prefixDataTestId}-focused-screen-share`}
                        />

                        {/* Peer name overlay */}
                        <div className="gba:absolute gba:bottom-3 gba:left-3 gba:px-3 gba:py-1 gba:bg-black/70 gba:rounded-md gba:text-white gba:text-sm">
                          {focusedScreenShare.peerName}'s screen
                        </div>

                        {/* Exit focus button */}
                        <button
                          onClick={() => setFocusedScreenShareId(null)}
                          className="gba:absolute gba:top-3 gba:right-3 gba:p-2 gba:bg-black/70 hover:gba:bg-black/90 gba:rounded-md gba:text-white gba:transition-colors"
                          data-testid={`${prefixDataTestId}-exit-screen-share-focus-btn`}
                          aria-label={t('groupCall-exitScreenShareFocus') || 'Exit screen share focus'}
                        >
                          <Monitor className="gba:w-5 gba:h-5" />
                        </button>

                        {/* Expand to fullscreen button */}
                        <button
                          onClick={() => {
                            if (focusedScreenShare.screenShareTrack) {
                              const stream = new MediaStream([focusedScreenShare.screenShareTrack])
                              setExpandedScreenShare({
                                peerId: focusedScreenShare.peerId,
                                peerName: focusedScreenShare.peerName,
                                stream
                              })
                            }
                          }}
                          className="gba:absolute gba:top-3 gba:right-16 gba:p-2 gba:bg-black/70 hover:gba:bg-black/90 gba:rounded-md gba:text-white gba:transition-colors"
                          data-testid={`${prefixDataTestId}-expand-screen-share-btn`}
                          aria-label={t('groupCall-expandScreenShare') || 'Expand to fullscreen'}
                        >
                          <Maximize2 className="gba:w-5 gba:h-5" />
                        </button>
                      </div>

                      {/* Participant Filmstrip - 25% height */}
                      <div className="gba:flex-[1] gba:min-h-0 gba:border-t gba:border-border">
                        <HorizontalFilmstrip
                          participants={
                            gridItems
                              .filter(
                                item =>
                                  item.type === 'video' ||
                                  item.type === 'avatar' ||
                                  (item.type === 'screen-share' && !item.isFocusedScreenShare)
                              )
                              .map(item => ({
                                id: item.id,
                                peerId: item.peerId,
                                peerName: item.peerName,
                                avatarUrl: item.avatarUrl,
                                userId: item.userId,
                                customParticipantId: item.customParticipantId,
                                isLocal: item.isLocal,
                                isMuted: item.isMuted,
                                hasVideoTrack: item.hasVideoTrack || false,
                                hasAudioTrack: item.hasAudioTrack || false,
                                type: item.type,
                                screenShareTrack: item.screenShareTrack,
                                isHandRaised: hideReactionsAndHandRaise
                                  ? false
                                  : isParticipantHandRaised(item.peerId, item.userId, item.customParticipantId),
                                handRaisedOrderNumber: hideReactionsAndHandRaise
                                  ? undefined
                                  : getHandRaisedOrderNumber(item.peerId, item.userId, item.customParticipantId),
                                isActiveSpeaker: item.isActiveSpeaker
                              })) as any
                          }
                          videoRefCallback={(peerId: string, isLocal: boolean) =>
                            getVideoRefCallback(peerId, '', isLocal)
                          }
                          screenShareVideoRefCallback={(peerId: string) => (el: HTMLVideoElement | null) => {
                            if (el) {
                              screenShareVideoRefs.current.set(peerId, el)
                            } else {
                              screenShareVideoRefs.current.delete(peerId)
                            }
                          }}
                          onScreenShareClick={(peerId: string) => {
                            rtkDebug.log(`[RTK Modal] 🎯 Focusing screen share from filmstrip: ${peerId}`)
                            setFocusedScreenShareId(peerId)
                          }}
                          activeSpeakerId={activeSpeakerId}
                          reactions={hideReactionsAndHandRaise ? [] : activeReactions}
                          t={t}
                          prefixDataTestId={`${prefixDataTestId}-filmstrip`}
                          isMinimized={callState.isMinimized}
                        />
                      </div>
                    </>
                  ) : (
                    // GALLERY MODE: Auto-fit grid
                    <VideoGrid
                      mode="auto-fit"
                      minTileSize={minTileSize}
                      gridItems={paginatedGridItems.items.map(item => (
                        <div
                          key={item.id}
                          className="gba:relative gba:w-full gba:h-full gba:rounded-lg gba:overflow-hidden gba:bg-muted"
                          style={{
                            aspectRatio: window.innerWidth < 768 ? '4/3' : '16/9'
                          }}
                          data-testid={`${prefixDataTestId}-grid-item-${item.id}`}
                        >
                          <MemoizedParticipantVideoTile
                            peerId={item.peerId}
                            peerName={item.peerName}
                            avatarUrl={item.avatarUrl}
                            userId={item.userId}
                            customParticipantId={item.customParticipantId}
                            isLocal={item.isLocal}
                            isMuted={item.isMuted}
                            hasVideoTrack={item.hasVideoTrack || false}
                            hasAudioTrack={item.hasAudioTrack || false}
                            screenShareTrack={item.screenShareTrack}
                            isFocusedScreenShare={false}
                            totalScreenShares={allScreenShares.length}
                            isHandRaised={
                              hideReactionsAndHandRaise
                                ? false
                                : isParticipantHandRaised(item.peerId, item.userId, item.customParticipantId)
                            }
                            handRaisedOrderNumber={
                              hideReactionsAndHandRaise
                                ? undefined
                                : getHandRaisedOrderNumber(item.peerId, item.userId, item.customParticipantId)
                            }
                            isActiveSpeaker={item.isActiveSpeaker}
                            reactions={hideReactionsAndHandRaise ? [] : activeReactions}
                            isMinimized={callState.isMinimized}
                            onScreenShareClick={() => {
                              if (item.screenShareTrack) {
                                rtkDebug.log(`[RTK Modal] 🎯 Focusing screen share via click for ${item.peerId}`)
                                setFocusedScreenShareId(item.peerId)
                              }
                            }}
                            onScreenShareFocus={() => {
                              rtkDebug.log(`[RTK Modal] 🎯 Focus button clicked for ${item.peerId}`)
                              setFocusedScreenShareId(item.peerId)
                            }}
                            videoRef={getVideoRefCallback(item.peerId, item.peerName, item.isLocal)}
                            screenShareVideoRef={
                              item.screenShareTrack
                                ? el => {
                                    if (el) {
                                      screenShareVideoRefs.current.set(item.peerId, el)
                                    } else {
                                      screenShareVideoRefs.current.delete(item.peerId)
                                    }
                                  }
                                : undefined
                            }
                            prefixDataTestId={prefixDataTestId}
                            t={t}
                          />
                        </div>
                      ))}
                      currentPage={currentPage}
                      totalPages={paginatedGridItems.totalPages}
                      totalItems={paginatedGridItems.totalItems}
                      onPageChange={setCurrentPage}
                      isEmpty={gridItems.length === 0}
                      prefixDataTestId={prefixDataTestId}
                      t={t}
                    />
                  )}
                </div>

                {/* Sidebar - Grid Column 2 */}
                {sidebarView !== 'closed' && (
                  <div className="gba:bg-card gba:flex gba:flex-col gba:border-l gba:min-h-0 gba:overflow-hidden">
                    {sidebarView === 'participants' && (
                      <ParticipantsPanel
                        meeting={meeting}
                        isOpen={true}
                        prefixDataTestId={prefixDataTestId}
                        availableParticipants={availableParticipants}
                        pendingInvites={pendingInvites}
                        onInviteParticipant={onInviteParticipant}
                        onMuteParticipant={handleMuteParticipant}
                        onMuteAll={handleMuteAll}
                        activeSpeakerId={activeSpeakerId}
                        activeSpeakerHistory={activeSpeakerHistory}
                        remoteHandsRaised={hideReactionsAndHandRaise ? {} : effectiveRemoteHandsRaised}
                        handRaisedOrder={hideReactionsAndHandRaise ? {} : effectiveHandRaisedOrder}
                        localHandRaised={hideReactionsAndHandRaise ? false : effectiveLocalHandRaised}
                        localUserId={meeting?.self?.userId}
                        activeConversation={callConversationProp || activeConversation}
                        t={t}
                      />
                    )}
                    {sidebarView === 'chat' && apiClient && accessToken && (
                      <ChatPanel
                        conversation={callConversation}
                        apiClient={apiClient}
                        wsClient={wsClient || null}
                        currentUserId={currentUserId || null}
                        currentUser={currentUser}
                        accessToken={accessToken || ''}
                        activeExperts={activeExperts}
                        isOpen={true}
                        onClose={() => setSidebarView('closed')}
                        prefixDataTestId={`${prefixDataTestId}-chat`}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Row 3: Compact Footer - Call Controls */}
              <div className="gba:bg-background gba:border-t gba:flex-shrink-0">
                <CallControlsBar
                  callType={callState.callType}
                  isMuted={effectiveLocalIsMuted}
                  isVideoEnabled={effectiveLocalIsVideoEnabled}
                  isScreenSharing={effectiveLocalIsScreenSharing}
                  backgroundEnabled={callState.backgroundEnabled}
                  handRaised={hideReactionsAndHandRaise ? false : effectiveLocalHandRaised}
                  transcriptionActive={transcriptionEnabled}
                  onToggleMute={onToggleMute}
                  onToggleVideo={onToggleVideo}
                  onToggleScreenShare={onToggleScreenShare}
                  onToggleBackground={onToggleBackground}
                  onToggleRaiseHand={hideReactionsAndHandRaise ? undefined : onToggleRaiseHand}
                  onSendReaction={hideReactionsAndHandRaise ? undefined : onSendReaction}
                  onMicDeviceChange={
                    onMicDeviceChange
                      ? deviceId => {
                          void onMicDeviceChange(deviceId)
                        }
                      : undefined
                  }
                  onCameraDeviceChange={
                    onCameraDeviceChange
                      ? deviceId => {
                          void onCameraDeviceChange(deviceId)
                        }
                      : undefined
                  }
                  onSpeakerDeviceChange={handleSpeakerDeviceChange}
                  onNoiseSuppressionChange={
                    onSetNoiseSuppressionEnabled
                      ? enabled => {
                          void onSetNoiseSuppressionEnabled(enabled)
                        }
                      : undefined
                  }
                  onAutoGainControlChange={
                    onSetAutoGainControlEnabled
                      ? enabled => {
                          void onSetAutoGainControlEnabled(enabled)
                        }
                      : undefined
                  }
                  onEndCall={onEndCall}
                  prefixDataTestId={prefixDataTestId}
                  t={t}
                />
              </div>

              {/* Expanded stream overlay */}
              {expandedScreenShare && (
                <ScreenShareView
                  peerId={expandedScreenShare.peerId}
                  peerName={expandedScreenShare.peerName}
                  stream={expandedScreenShare.stream}
                  onClose={() => setExpandedScreenShare(null)}
                  prefixDataTestId={prefixDataTestId}
                  t={t}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>,
        document.body
      )}
    </>
  )
}

// Wrap in React.memo with custom comparison to prevent re-renders when only duration changes
// Duration updates every second but doesn't affect video stream attachment
export const GroupCallModalRtk = React.memo(GroupCallModalRtkComponent, (prevProps, nextProps) => {
  // Add diagnostic logging to identify what's triggering re-renders
  const changedProps: string[] = []

  if (prevProps.localStream !== nextProps.localStream) changedProps.push('localStream')
  if (prevProps.remoteStreams !== nextProps.remoteStreams) changedProps.push('remoteStreams')
  if (prevProps.participants !== nextProps.participants) changedProps.push('participants')
  if (prevProps.pendingInvites !== nextProps.pendingInvites) changedProps.push('pendingInvites')
  if (prevProps.activeSpeakerId !== nextProps.activeSpeakerId) changedProps.push('activeSpeakerId')
  if (prevProps.activeSpeakerHistory !== nextProps.activeSpeakerHistory) changedProps.push('activeSpeakerHistory')
  if (prevProps.onEndCall !== nextProps.onEndCall) changedProps.push('onEndCall')
  if (prevProps.onToggleMute !== nextProps.onToggleMute) changedProps.push('onToggleMute')
  if (prevProps.onToggleVideo !== nextProps.onToggleVideo) changedProps.push('onToggleVideo')
  if (prevProps.onToggleScreenShare !== nextProps.onToggleScreenShare) changedProps.push('onToggleScreenShare')
  if (prevProps.onSetVideoQuality !== nextProps.onSetVideoQuality) changedProps.push('onSetVideoQuality')
  if (prevProps.onToggleMinimize !== nextProps.onToggleMinimize) changedProps.push('onToggleMinimize')
  if (prevProps.onToggleBackground !== nextProps.onToggleBackground) changedProps.push('onToggleBackground')
  if (prevProps.onToggleRaiseHand !== nextProps.onToggleRaiseHand) changedProps.push('onToggleRaiseHand')
  if (prevProps.onSendReaction !== nextProps.onSendReaction) changedProps.push('onSendReaction')
  if (prevProps.backgroundEnabled !== nextProps.backgroundEnabled) changedProps.push('backgroundEnabled')
  if (prevProps.prefixDataTestId !== nextProps.prefixDataTestId) changedProps.push('prefixDataTestId')
  if (prevProps.availableParticipants !== nextProps.availableParticipants) changedProps.push('availableParticipants')
  if (prevProps.onInviteParticipant !== nextProps.onInviteParticipant) changedProps.push('onInviteParticipant')
  if (prevProps.onReconnectParticipant !== nextProps.onReconnectParticipant) changedProps.push('onReconnectParticipant')
  if (prevProps.getConnectionDiagnostics !== nextProps.getConnectionDiagnostics)
    changedProps.push('getConnectionDiagnostics')
  if (prevProps.accessToken !== nextProps.accessToken) changedProps.push('accessToken')
  if (prevProps.currentUserId !== nextProps.currentUserId) changedProps.push('currentUserId')
  if (prevProps.conversationName !== nextProps.conversationName) changedProps.push('conversationName')
  if (prevProps.wsClient !== nextProps.wsClient) changedProps.push('wsClient')

  // Check callState properties except duration
  const prevState = prevProps.callState
  const nextState = nextProps.callState

  const changedStateProps: string[] = []
  if (prevState.status !== nextState.status) changedStateProps.push('status')
  if (prevState.roomId !== nextState.roomId) changedStateProps.push('roomId')
  if (prevState.isMuted !== nextState.isMuted) changedStateProps.push('isMuted')
  if (prevState.isVideoEnabled !== nextState.isVideoEnabled) changedStateProps.push('isVideoEnabled')
  if (prevState.isScreenSharing !== nextState.isScreenSharing) changedStateProps.push('isScreenSharing')
  if (prevState.isMinimized !== nextState.isMinimized) changedStateProps.push('isMinimized')
  if (prevState.videoQuality !== nextState.videoQuality) changedStateProps.push('videoQuality')
  if (prevState.backgroundEnabled !== nextState.backgroundEnabled) changedStateProps.push('backgroundEnabled')
  if (prevState.handRaised !== nextState.handRaised) changedStateProps.push('handRaised')
  if (prevState.remoteHandsRaised !== nextState.remoteHandsRaised) changedStateProps.push('remoteHandsRaised')
  if (prevState.handRaisedOrder !== nextState.handRaisedOrder) changedStateProps.push('handRaisedOrder')
  if (prevState.participants.length !== nextState.participants.length) changedStateProps.push('participants.length')
  if (prevState.callType !== nextState.callType) changedStateProps.push('callType')
  if (prevState.callImplementation !== nextState.callImplementation) changedStateProps.push('callImplementation')

  if (changedProps.length > 0 || changedStateProps.length > 0) {
    rtkDebug.log('[RTK Modal] React.memo: Re-rendering due to changes', {
      changedProps: changedProps.join(', '),
      changedStateProps: changedStateProps.join(', '),
      durationChanged: prevState.duration !== nextState.duration
    })
    return false // Props changed, re-render
  }

  return true // No significant changes, skip re-render
})

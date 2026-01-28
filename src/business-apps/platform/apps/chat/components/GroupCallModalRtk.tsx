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
import type { GroupCallParticipant, VideoQuality } from '../services/groupWebrtcClient'
import type { GroupCallUIState, PendingInvite } from '../hooks/useGroupCall'
import type { CallParticipant } from '../services/webrtcClient'
import type { ChatWebSocketClient } from '../services/chatWebSocketClient'
import { useChatTranslation } from '../contexts/TranslationContext'
import { rtkDebug } from '../utils/rtkDebug'
import {
  CallHeader,
  MinimizedCallView,
  ScreenShareView,
  CallControlsBar,
  ParticipantsPanel,
  MemoizedParticipantVideoTile,
  VideoGrid
} from './call'
import { isVideoTrackScreenShare, extractTracksFromCollection } from '../utils/callUtils'

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

interface GroupCallModalRtkProps {
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
  backgroundEnabled?: boolean
  prefixDataTestId?: string
  availableParticipants?: AvailableParticipant[]
  onInviteParticipant?: (participant: CallParticipant) => void
  onReconnectParticipant?: (participantId: string) => Promise<void>
  getConnectionDiagnostics?: () => Map<string, any>
  accessToken?: string
  currentUserId?: string | null
  conversationName?: string
  wsClient?: ChatWebSocketClient | null
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
  onInviteParticipant,
  prefixDataTestId = 'rtk-group-call',
  conversationName,
  wsClient,
  currentUserId
}) => {
  const t = useChatTranslation()
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
  const screenShareVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())

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
          rtkDebug.log(`[RTK Modal] 📹 Video element created for ${isLocal ? 'local' : 'peer'}`, {
            peerId,
            peerName,
            isLocal,
            isMinimized: callState.isMinimized,
            wasAttached: attachedPeersRef.current.has(peerId),
            timestamp: Date.now()
          })
          if (isLocal) {
            setLocalVideoRef(el)
          } else {
            remoteVideoRefs.current.set(peerId, el)
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

  // Derive current user from participants or meeting
  const currentUser = participants.find(p => p.id === currentUserId || p.id === meeting?.self?.customParticipantId)

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
      return callState.handRaised
    }

    // Check remote participants - try ALL three IDs (same pattern as reactions)
    const remoteHands = callState.remoteHandsRaised || {}
    const isRaisedByPeerId = peerId ? remoteHands[peerId] === true : false
    const isRaisedByUserId = participantUserId ? remoteHands[participantUserId] === true : false
    const isRaisedByCustomId = participantCustomId ? remoteHands[participantCustomId] === true : false
    const isRaised = isRaisedByPeerId || isRaisedByUserId || isRaisedByCustomId

    rtkDebug.log('[RTK Modal] 🖐️ isParticipantHandRaised check:', {
      peerId,
      participantUserId,
      participantCustomId,
      remoteHandsRaisedObject: remoteHands,
      remoteHandsRaisedKeys: Object.keys(remoteHands),
      valuesByKey: {
        byPeerId: peerId ? remoteHands[peerId] : 'N/A',
        byUserId: participantUserId ? remoteHands[participantUserId] : 'N/A',
        byCustomId: participantCustomId ? remoteHands[participantCustomId] : 'N/A'
      },
      isRaisedByPeerId,
      isRaisedByUserId,
      isRaisedByCustomId,
      finalResult: isRaised
    })

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

    const handRaisedOrder = callState.handRaisedOrder || {}

    // Try all three IDs (same pattern as reactions)
    let foundOrder: number | undefined
    if (peerId && handRaisedOrder[peerId]) {
      foundOrder = handRaisedOrder[peerId].order
      rtkDebug.log('[RTK Modal] 🔢 Found order by peerId:', {
        peerId,
        order: foundOrder,
        timestamp: handRaisedOrder[peerId].timestamp,
        allKeys: Object.keys(handRaisedOrder),
        allValues: handRaisedOrder
      })
      return foundOrder
    }
    if (participantUserId && handRaisedOrder[participantUserId]) {
      foundOrder = handRaisedOrder[participantUserId].order
      rtkDebug.log('[RTK Modal] 🔢 Found order by userId:', {
        participantUserId,
        order: foundOrder,
        timestamp: handRaisedOrder[participantUserId].timestamp,
        allKeys: Object.keys(handRaisedOrder),
        allValues: handRaisedOrder
      })
      return foundOrder
    }
    if (participantCustomId && handRaisedOrder[participantCustomId]) {
      foundOrder = handRaisedOrder[participantCustomId].order
      rtkDebug.log('[RTK Modal] 🔢 Found order by customId:', {
        participantCustomId,
        order: foundOrder,
        timestamp: handRaisedOrder[participantCustomId].timestamp,
        allKeys: Object.keys(handRaisedOrder),
        allValues: handRaisedOrder
      })
      return foundOrder
    }

    return undefined
  }

  const [currentPage, setCurrentPage] = useState(0)
  const [showParticipantsPanel, setShowParticipantsPanel] = useState(false)
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

  // Pagination config: max participants per page
  const PARTICIPANTS_PER_PAGE = 9

  // Subscribe to remote participants from SDK
  const remotePeers: GroupCallParticipant[] = useRealtimeKitSelector((m: any): GroupCallParticipant[] => {
    if (!m?.participants?.joined) return []

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
    if (!m?.self) return null

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
    rtkDebug.log('[RTK Modal] 🔄 stableRemotePeers recomputed:', {
      count: remotePeers.length,
      fingerprint: remotePeersFingerprint,
      peers: remotePeers.map((p: any) => ({
        id: p.id,
        name: p.name,
        videoTrackId: p.videoTrack?.id,
        audioTrackId: p.audioTrack?.id,
        videoEnabled: p.videoEnabled,
        audioEnabled: p.audioEnabled
      }))
    })
    // Return a NEW stable array (shallow copy) so we break the reference to the selector's array
    return [...remotePeers]
  }, [remotePeersFingerprint])

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

    const socket = wsClient?.getSocket()
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
  }, [wsClient, showReactionAnimation, stableRemotePeers, meeting])

  // Handler to mute a participant via WebSocket (auto-mute on target side)
  const handleMuteParticipant = useCallback(
    (participantId: string, participantName: string) => {
      if (!wsClient || !currentUser || !meeting) {
        console.error('[MUTE] No WebSocket client, current user, or meeting available')
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
        console.log('[MUTE] Sending mute request via WebSocket:', {
          participantRtkId: participantId,
          targetUserId,
          targetParticipantName: participantName,
          requestedBy: currentUser.id,
          requestedByName: currentUser.odName
        })

        // Emit WebSocket event to request mute
        // IMPORTANT: Use customParticipantId (user DB ID) not RTK peer ID for Socket.IO routing
        socket.emit('group-call:request-mute', {
          targetParticipantId: targetUserId, // User's DB ID for Socket.IO room routing
          targetParticipantName: participantName,
          requestedBy: currentUser.id,
          requestedByName: currentUser.odName
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
    [wsClient, currentUser, meeting]
  )

  // Handler to mute all participants at once via WebSocket (auto-mute on each participant's side)
  const handleMuteAll = useCallback(() => {
    if (!wsClient || !currentUser || !participants || participants.length === 0 || !meeting) {
      console.error('[MUTE ALL] No WebSocket client, current user, participants, or meeting available')
      return
    }

    const socket = wsClient.getSocket()
    if (!socket) {
      console.error('[MUTE ALL] Socket not available')
      return
    }

    try {
      console.log('[MUTE ALL] Sending mute requests to all participants via WebSocket:', {
        participantCount: participants.length,
        requestedBy: currentUser.id,
        requestedByName: currentUser.odName
      })

      // Send individual mute requests to each participant (excluding self)
      participants.forEach(participant => {
        if (participant.id !== currentUser.id) {
          const participantName = (participant as RealtimeKitPeer).name || participant.odName || 'Unknown'

          // Get the customParticipantId from the meeting peer (this is the user's DB ID)
          const targetPeer = meeting.participants?.joined?.get(participant.id)
          const targetUserId = targetPeer?.customParticipantId || participant.id

          socket.emit('group-call:request-mute', {
            targetParticipantId: targetUserId, // User's DB ID for Socket.IO room routing
            targetParticipantName: participantName,
            requestedBy: currentUser.id,
            requestedByName: currentUser.odName
          })
        }
      })

      toast.success(`Mute requests sent to ${participants.length - 1} participants`, {
        duration: 2000
      })
    } catch (error) {
      console.error('[MUTE ALL] Failed to send mute requests:', error)
      toast.error('Failed to mute all participants', {
        duration: 3000
      })
    }
  }, [wsClient, currentUser, participants, meeting])

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
      isVideoEnabled: callState.isVideoEnabled,
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
            if (localVideoTrack && callState.isVideoEnabled) {
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
            hasVideo: !!localVideoTrack && callState.isVideoEnabled,
            hasAudio: !!localAudioTrack,
            streamVideoTracks: stream.getVideoTracks().length,
            streamAudioTracks: stream.getAudioTracks().length
          })
        } catch (error) {
          rtkDebug.warn('[RTK Modal] ⚠️ Local track update failed, falling back to full replacement:', error)

          // Fallback to full replacement
          const newStream = new MediaStream()
          if (localVideoTrack && callState.isVideoEnabled) newStream.addTrack(localVideoTrack)
          if (localAudioTrack) newStream.addTrack(localAudioTrack)

          videoElement.srcObject = newStream
          localVideoTrackIdRef.current = currentVideoTrackId
          localAudioTrackIdRef.current = currentAudioTrackId
        }
      }
    }
  }, [meeting?.self?.videoTrack, meeting?.self?.audioTrack, callState.isVideoEnabled, videoElementsVersion])

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

      // Only attach if we haven't attached this peer yet
      if (videoElement && (cameraVideoTrack || peer.audioTrack) && !isAttached) {
        rtkDebug.log(`[RTK Modal] 🔗 Attaching stream for peer ${peer.name || peer.id} (initial)`, {
          peerId: peer.id,
          hasVideoElement: true,
          hasCameraTrack: !!cameraVideoTrack,
          hasAudioTrack: !!peer.audioTrack,
          wasAttached: isAttached,
          isMinimized: callState.isMinimized
        })

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

        // Update stream if ANY track changed
        if (videoTrackChanged || audioTrackChanged) {
          rtkDebug.log(`[RTK Modal] 🔄 Track changed for peer ${peer.name || peer.id}`, {
            videoChanged: videoTrackChanged,
            audioChanged: audioTrackChanged,
            oldVideoId: currentVideoTrack?.id,
            newVideoId: cameraVideoTrack?.id,
            oldAudioId: currentAudioTrack?.id,
            newAudioId: peer.audioTrack?.id,
            videoTrackIsScreenShare: isVideoTrackScreenShare(peer.videoTrack)
          })

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
        } else if (!seenPeerIds.has(peer.id)) {
          shares.push({
            peerId: peer.id,
            peerName: peer.name || peer.displayName || peer.customParticipantId || 'Unknown',
            screenShareTrack,
            trackId: screenShareTrack.id,
            peer
          })
          seenPeerIds.add(peer.id)
        } else {
          rtkDebug.warn(`[RTK Modal] ⚠️ Duplicate screen share for peer ${peer.id} - skipping`)
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

    // Add local screen share if active
    rtkDebug.log('[RTK Modal] 🔍 Local screen share check:', {
      isScreenSharing: callState.isScreenSharing,
      hasTrack: !!localScreenShareTrack,
      trackReadyState: localScreenShareTrack?.readyState,
      trackId: localScreenShareTrack?.id
    })

    if (callState.isScreenSharing && localScreenShareTrack) {
      // CRITICAL: Only include tracks that are still live (not ended/stopped)
      if (localScreenShareTrack.readyState !== 'live') {
        rtkDebug.warn(
          `[RTK Modal] ⚠️ Local screen share track is not live (state: ${localScreenShareTrack.readyState}) - skipping`
        )
      } else {
        const localPeerId = meeting?.self?.id || 'local' // Use actual peer ID
        if (!seenPeerIds.has(localPeerId)) {
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
        } else {
          rtkDebug.warn(`[RTK Modal] ⚠️ Duplicate screen share for local peer - skipping`)
        }
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
  }, [stableRemotePeers, callState.isScreenSharing, localScreenShareTrack, participants])

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
    const items: Array<{
      id: string
      type: 'video' | 'screen-share' | 'avatar'
      peerId: string
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
          isMuted: isLocalUser(focusedScreenShare.peerId) ? callState.isMuted : false,
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
    const localHasVideo = callState.isVideoEnabled && !!localVideoTrack

    // Always add local participant - screen share is a separate item
    const localParticipantId = 'local-participant'
    if (!seenIds.has(localParticipantId)) {
      const localParticipantItem = {
        id: localParticipantId,
        type: localHasVideo ? 'video' : 'avatar',
        peerId: meeting?.self?.id || 'local', // Use actual peer ID from SDK (fallback to 'local' for safety)
        peerName: participants[0]?.odName || 'You',
        userId: meeting?.self?.userId, // For checking hand-raised state
        customParticipantId: meeting?.self?.customParticipantId, // Our DB user ID - for checking reactions
        videoTrack: localVideoTrack,
        audioTrack: localAudioTrack,
        hasVideoTrack: localHasVideo, // For rendering decision
        hasAudioTrack: !!localAudioTrack, // Audio needs video element too!
        isLocal: true,
        isMuted: callState.isMuted,
        isVideoEnabled: callState.isVideoEnabled,
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
        hasAudio: !!localAudioTrack
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
      if (focusedScreenShare && share.peerId === focusedScreenShare.peerId) {
        rtkDebug.log('[RTK Modal] ⏭️ Skipping focused screen share (already added):', share.peerId)
        return
      }

      const shareId = `screen-share-${share.peerId}`
      rtkDebug.log('[RTK Modal] 🔍 Checking if shareId exists in seenIds:', {
        shareId,
        hasInSeenIds: seenIds.has(shareId),
        seenIdsArray: Array.from(seenIds)
      })
      if (!seenIds.has(shareId)) {
        items.push({
          id: shareId,
          type: 'screen-share',
          peerId: share.peerId,
          peerName: share.peerName,
          screenShareTrack: share.screenShareTrack,
          isLocal: isLocalUser(share.peerId),
          isMuted: isLocalUser(share.peerId) ? callState.isMuted : false,
          isVideoEnabled: true
        })
        seenIds.add(shareId)
        rtkDebug.log('[RTK Modal] 🖥️ [2] Added non-focused screen share to grid:', {
          shareId,
          peerId: share.peerId,
          peerName: share.peerName,
          trackId: share.trackId
        })
      } else {
        rtkDebug.warn('[RTK Modal] ⚠️ Skipping duplicate screen share:', shareId)
      }
    })

    // Add remote participants (videos or avatars) - always add, even if sharing screen
    stableRemotePeers?.forEach((peer: any) => {
      // Get camera track - exclude screen share track
      const cameraVideoTrack = peer.videoTrack && !isVideoTrackScreenShare(peer.videoTrack) ? peer.videoTrack : null
      const hasVideo = peer.videoEnabled && !!cameraVideoTrack

      const participantId = `participant-${peer.id}`
      if (!seenIds.has(participantId)) {
        items.push({
          id: participantId,
          type: hasVideo ? 'video' : 'avatar',
          peerId: peer.id,
          peerName: peer.name || peer.displayName || peer.customParticipantId || 'Unknown',
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
      } else {
        rtkDebug.warn('[RTK Modal] ⚠️ Skipping duplicate participant:', participantId)
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
    meeting?.self?.userId, // For hand-raised checks
    meeting?.self?.customParticipantId, // For reactions
    activeSpeakerId,
    activeSpeakerHistory
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

  // Calculate grid layout based on paginated item count and focused screen share
  // Calculate grid layout based on paginated item count, focused screen share, AND available width
  const gridLayout = useMemo(() => {
    const itemCount = paginatedGridItems.items.length
    const hasFocusedScreenShare = !!focusedScreenShare
    const screenShareCount = allScreenShares.length
    // Adjust layout based on panel state: fewer columns when panel is open
    const isNarrow = showParticipantsPanel

    rtkDebug.log('[RTK Modal] Grid layout calculation:', {
      itemCount,
      hasFocusedScreenShare,
      screenShareCount,
      focusedScreenShareId,
      showParticipantsPanel,
      isNarrow
    })

    if (itemCount === 0) {
      return { cols: 1, rows: 1, focusedSpan: { col: 1, row: 1 } }
    }

    if (hasFocusedScreenShare) {
      // With focused screen share: optimize grid to minimize empty space
      // Reduce columns when panel is open (narrower space)
      if (itemCount <= 5) {
        // 1 focused (2x2=4 cells) + 4 others = 8 cells
        return isNarrow
          ? { cols: 3, rows: 3, focusedSpan: { col: 2, row: 2 } } // Narrower: 3 cols
          : { cols: 3, rows: 3, focusedSpan: { col: 2, row: 2 } }
      } else if (itemCount <= 7) {
        // 1 focused (2x2=4 cells) + 6 others = 10 cells
        return isNarrow
          ? { cols: 3, rows: 4, focusedSpan: { col: 2, row: 2 } } // Narrower: 3 cols, more rows
          : { cols: 4, rows: 3, focusedSpan: { col: 2, row: 2 } }
      } else if (itemCount <= 9) {
        // 1 focused (2x2=4 cells) + 8 others = 12 cells
        return isNarrow
          ? { cols: 3, rows: 4, focusedSpan: { col: 2, row: 2 } } // Narrower: 3 cols
          : { cols: 4, rows: 3, focusedSpan: { col: 2, row: 2 } }
      } else {
        // Many items
        return isNarrow
          ? { cols: 3, rows: 5, focusedSpan: { col: 2, row: 2 } } // Narrower: 3 cols
          : { cols: 4, rows: 4, focusedSpan: { col: 2, row: 2 } }
      }
    } else {
      // No focused screen share: standard grid (max 9 items per page = 3x3)
      // Keep 2 columns even when panel is open for better tile sizing
      if (itemCount <= 2) {
        return { cols: 2, rows: 1, focusedSpan: { col: 1, row: 1 } }
      } else if (itemCount <= 4) {
        return isNarrow
          ? { cols: 2, rows: 2, focusedSpan: { col: 1, row: 1 } } // Narrower: 2 cols
          : { cols: 2, rows: 2, focusedSpan: { col: 1, row: 1 } }
      } else {
        // 5-9 items
        return isNarrow
          ? { cols: 2, rows: 5, focusedSpan: { col: 1, row: 1 } } // Narrower: 2 cols, more rows
          : { cols: 3, rows: 3, focusedSpan: { col: 1, row: 1 } }
      }
    }
  }, [
    paginatedGridItems.items.length,
    focusedScreenShare,
    allScreenShares.length,
    focusedScreenShareId,
    showParticipantsPanel
  ])

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

    // If not minimized, retry after a short delay to ensure refs are populated after Dialog remount
    if (!callState.isMinimized) {
      const retryTimer = setTimeout(attachVideos, 150)
      return () => clearTimeout(retryTimer)
    }
  }, [screenShareTrackIds, gridItems, callState.isMinimized])

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
            videoEl.play().catch(err => rtkDebug.warn(`[RTK Modal] Could not auto-play video ${item.peerId}:`, err))
          }, 10)
        }
      })
    }

    // Immediate attachment
    attachVideos()

    // If not minimized, retry after a short delay to ensure refs are populated after Dialog remount
    if (!callState.isMinimized) {
      const retryTimer = setTimeout(attachVideos, 150)
      return () => clearTimeout(retryTimer)
    }
  }, [videoTrackIds, gridItems, callState.isMinimized])

  // Expanded screen share video ref (for fullscreen overlay)
  const expandedScreenShareVideoRef = useRef<HTMLVideoElement>(null)

  // Minimized view refs - for audio management in PiP-style window
  const pipAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())

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

  // Get first remote peer for minimized view - prioritize debounced active speaker
  const firstRemotePeer = useMemo(() => {
    // If there's a debounced active speaker, show their video
    if (debouncedActiveSpeaker) {
      const activeSpeaker = stableRemotePeers.find(peer => peer.id === debouncedActiveSpeaker)
      if (activeSpeaker) {
        return activeSpeaker
      }
    }
    // Fallback to first peer if no active speaker
    return remotePeers[0] || null
  }, [remotePeers, debouncedActiveSpeaker])

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
          audio
            .play()
            .then(() => console.log('[Minimized] Audio playing for:', peerName))
            .catch(err => console.error('[Minimized] Audio play error for', peerName, ':', err))
          pipAudioRefs.current.set(peer.id, audio)
        } else {
          // Update existing audio element with new stream
          const oldStream = existingAudio.srcObject as MediaStream
          const oldTrackId = oldStream?.getAudioTracks()[0]?.id
          const newTrackId = stream.getAudioTracks()[0]?.id

          if (oldTrackId !== newTrackId) {
            console.log('[Minimized] Updating audio stream for peer:', peerName, {
              oldTrackId,
              newTrackId
            })
            existingAudio.srcObject = stream
            existingAudio.play().catch(err => console.error('[Minimized] Audio play error for', peerName, ':', err))
          }
        }
      } else if (pipAudioRefs.current.has(peer.id)) {
        // Peer has no audio tracks, remove the audio element
        console.log('[Minimized] Removing audio for peer (no tracks):', peerName)
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
        console.log('[Minimized] Removing audio for peer (left call):', peerId)
        audio.pause()
        audio.srcObject = null
        pipAudioRefs.current.delete(peerId)
      }
    })
  }, [callState.isMinimized, remoteAudioTrackIds, remotePeers, buildStreamFromPeer])

  const isOpen =
    callState.status === 'connected' || callState.status === 'joining' || callState.status === 'reconnecting'

  // Render minimized view - floating PiP-style window
  if (isOpen && callState.isMinimized) {
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
    let portalContainer = document.getElementById('rtk-group-call-minimized-portal')
    if (!portalContainer) {
      portalContainer = document.createElement('div')
      portalContainer.id = 'rtk-group-call-minimized-portal'
      portalContainer.style.cssText = 'position: fixed; z-index: 9999;'
      document.body.appendChild(portalContainer)
    }

    const firstPeerHandRaisedOrderNumber = rtkFirstPeer
      ? getHandRaisedOrderNumber(rtkFirstPeer.id, rtkFirstPeer.userId, rtkFirstPeer.customParticipantId)
      : undefined

    return createPortal(
      <MinimizedCallView
        firstRemotePeer={rtkFirstPeer}
        firstRemoteStream={firstRemoteStream}
        remotePeerCount={stableRemotePeers.length}
        callStartTime={callState.startTime}
        isMuted={callState.isMuted}
        isVideoEnabled={callState.isVideoEnabled}
        isHandRaised={isFirstPeerHandRaised}
        handRaisedOrderNumber={firstPeerHandRaisedOrderNumber}
        isRemotePeerMuted={isFirstPeerMuted}
        reactions={firstPeerReactions}
        onToggleMute={onToggleMute}
        onToggleVideo={onToggleVideo}
        onExpand={onToggleMinimize || NOOP}
        onEndCall={onEndCall}
        prefixDataTestId={prefixDataTestId}
        t={t}
      />,
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
        <Dialog open={isOpen} onOpenChange={() => {}}>
          <DialogContent
            className="gba:max-w-6xl gba:h-[80vh] gba:p-0 gba:overflow-hidden gba:flex gba:flex-col"
            data-testid={`${prefixDataTestId}-modal`}
          >
            <style>{`
              [data-testid="${prefixDataTestId}-modal"] > button[data-radix-collection-item] {
                display: none !important;
              }
              [data-testid="${prefixDataTestId}-modal"] > button {
                display: none !important;
              }
            `}</style>
            <DialogTitle className="gba:sr-only">{conversationName || t('chat-groupCall') || 'Group Call'}</DialogTitle>
            <DialogDescription className="gba:sr-only">
              {callState.callType === 'video' ? t('chat-videoCall') : t('chat-audioCall')} with{' '}
              {stableRemotePeers.length + 1} {stableRemotePeers.length + 1 === 1 ? 'participant' : 'participants'}
            </DialogDescription>
            <div className="gba:flex gba:flex-1 gba:bg-background gba:min-h-0 gba:overflow-hidden">
              {/* Main content area - Takes remaining space */}
              <div className="gba:flex gba:flex-col gba:flex-1 gba:min-w-0 gba:min-h-0">
                {/* Header */}
                <CallHeader
                  conversationName={conversationName}
                  callStartTime={callState.startTime}
                  participantCount={stableRemotePeers.length + 1}
                  availableParticipantsCount={availableParticipants?.length || 0}
                  callType={callState.callType}
                  showParticipantsPanel={showParticipantsPanel}
                  onToggleParticipantsPanel={() => setShowParticipantsPanel(prev => !prev)}
                  onToggleMinimize={onToggleMinimize}
                  onClose={onEndCall}
                  prefixDataTestId={prefixDataTestId}
                  t={t}
                />

                {/* Main Content Area - Unified Grid Layout */}
                <div className="gba:flex gba:flex-col gba:flex-1 gba:p-4 gba:bg-muted/30 gba:gap-4 gba:min-h-0 gba:overflow-hidden">
                  <VideoGrid
                    gridItems={paginatedGridItems.items.map(item => {
                      const isFocused = item.isFocusedScreenShare
                      const gridColumn = isFocused ? `span ${gridLayout.focusedSpan.col}` : 'span 1'
                      const gridRow = isFocused ? `span ${gridLayout.focusedSpan.row}` : 'span 1'

                      return (
                        <div
                          key={item.id}
                          style={{ gridColumn, gridRow }}
                          className="gba:relative gba:w-full gba:h-full"
                          data-testid={`${prefixDataTestId}-grid-item-${item.id}`}
                        >
                          <MemoizedParticipantVideoTile
                            peerId={item.peerId}
                            peerName={item.peerName}
                            userId={item.userId}
                            customParticipantId={item.customParticipantId}
                            isLocal={item.isLocal}
                            isMuted={item.isMuted}
                            hasVideoTrack={item.hasVideoTrack || false}
                            hasAudioTrack={item.hasAudioTrack || false}
                            screenShareTrack={item.screenShareTrack}
                            isFocusedScreenShare={isFocused}
                            totalScreenShares={allScreenShares.length}
                            isHandRaised={isParticipantHandRaised(item.peerId, item.userId, item.customParticipantId)}
                            handRaisedOrderNumber={getHandRaisedOrderNumber(
                              item.peerId,
                              item.userId,
                              item.customParticipantId
                            )}
                            isActiveSpeaker={item.isActiveSpeaker}
                            reactions={activeReactions}
                            isMinimized={callState.isMinimized}
                            onScreenShareClick={() => {
                              if (item.screenShareTrack) {
                                // Dual behavior: focus if not focused, expand if already focused
                                if (isFocused) {
                                  // Already focused → expand to fullscreen
                                  const stream = new MediaStream([item.screenShareTrack])
                                  setExpandedScreenShare({
                                    peerId: item.peerId,
                                    peerName: item.peerName,
                                    stream
                                  })
                                } else {
                                  // Not focused → focus this screen share
                                  rtkDebug.log(`[RTK Modal] 🎯 Focusing screen share via click for ${item.peerId}`)
                                  setFocusedScreenShareId(item.peerId)
                                }
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
                      )
                    })}
                    gridLayout={gridLayout}
                    currentPage={currentPage}
                    totalPages={paginatedGridItems.totalPages}
                    totalItems={paginatedGridItems.totalItems}
                    onPageChange={setCurrentPage}
                    isEmpty={gridItems.length === 0}
                    prefixDataTestId={prefixDataTestId}
                    t={t}
                  />
                </div>

                {/* Footer - Command Bar */}
                <CallControlsBar
                  callType={callState.callType}
                  isMuted={callState.isMuted}
                  isVideoEnabled={callState.isVideoEnabled}
                  isScreenSharing={callState.isScreenSharing}
                  backgroundEnabled={callState.backgroundEnabled}
                  handRaised={callState.handRaised}
                  onToggleMute={onToggleMute}
                  onToggleVideo={onToggleVideo}
                  onToggleScreenShare={onToggleScreenShare}
                  onToggleBackground={onToggleBackground}
                  onToggleRaiseHand={onToggleRaiseHand}
                  onSendReaction={onSendReaction}
                  onEndCall={onEndCall}
                  prefixDataTestId={prefixDataTestId}
                  t={t}
                />
              </div>

              {/* Participants Panel - Sidebar (smooth transition) */}
              {showParticipantsPanel && (
                <div className="gba:w-80 gba:bg-card gba:shadow-xl gba:flex gba:flex-col gba:border-l gba:flex-shrink-0 gba:transition-all gba:duration-300 gba:h-full gba:overflow-hidden">
                  <ParticipantsPanel
                    meeting={meeting}
                    isOpen={showParticipantsPanel}
                    onClose={() => setShowParticipantsPanel(false)}
                    prefixDataTestId={prefixDataTestId}
                    availableParticipants={availableParticipants}
                    pendingInvites={pendingInvites}
                    onInviteParticipant={onInviteParticipant}
                    onMuteParticipant={handleMuteParticipant}
                    onMuteAll={handleMuteAll}
                    activeSpeakerId={activeSpeakerId}
                    activeSpeakerHistory={activeSpeakerHistory}
                    remoteHandsRaised={callState.remoteHandsRaised}
                    handRaisedOrder={callState.handRaisedOrder}
                    localHandRaised={callState.handRaised}
                    localUserId={meeting?.self?.userId}
                  />
                </div>
              )}
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
        </Dialog>,
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

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
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@newwork/nw-design-system'
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
  ParticipantVideoTile,
  VideoGrid
} from './call'
import { isVideoTrackScreenShare, extractTracksFromCollection } from '../utils/callUtils'

// RealtimeKit peer type with SDK-specific properties
interface RealtimeKitPeer extends GroupCallParticipant {
  name?: string // RealtimeKit uses 'name' instead of 'odName'
  audioTrack?: MediaStreamTrack
  videoTrack?: MediaStreamTrack
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
    const videoTrack = screenShareTracks.find(t => t.kind === 'video')

    if (videoTrack) {
      rtkDebug.log(`[RTK Modal] Found VIDEO screen share track for peer ${peer.name || peer.id}:`, {
        trackId: videoTrack.id,
        trackLabel: videoTrack.label,
        trackKind: videoTrack.kind,
        totalTracks: screenShareTracks.length,
        allTrackKinds: screenShareTracks.map(t => t.kind)
      })
      return videoTrack
    }

    // Fallback: use first track if no video track found
    rtkDebug.warn(`[RTK Modal] ⚠️ No video track in screenShareTracks for peer ${peer.name || peer.id}, using first:`, {
      firstTrackKind: screenShareTracks[0].kind,
      allTracks: screenShareTracks.map(t => ({ id: t.id, kind: t.kind, label: t.label }))
    })
    return screenShareTracks[0]
  }

  // Then check if videoTrack is actually a screen share
  if (peer.videoTrack && isVideoTrackScreenShare(peer.videoTrack)) {
    rtkDebug.log(`[RTK Modal] Found screen share track in videoTrack for peer ${peer.name || peer.id}:`, {
      trackId: peer.videoTrack.id,
      trackLabel: peer.videoTrack.label,
      trackKind: peer.videoTrack.kind
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

export const GroupCallModalRtk: React.FC<GroupCallModalRtkProps> = ({
  callState,
  localStream,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  remoteStreams: _remoteStreams, // Unused in RTK - streams built from peer tracks
  participants,
  pendingInvites,
  availableParticipants,
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
  wsClient
}) => {
  const t = useChatTranslation()
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
  const screenShareVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
  const [focusedScreenShareId, setFocusedScreenShareId] = useState<string | null>(null)
  const [expandedScreenShare, setExpandedScreenShare] = useState<{
    peerId: string
    peerName: string
    stream: MediaStream
  } | null>(null)

  // Get the meeting object to access self.userId
  const meeting = useRealtimeKitSelector((m: any) => m)

  // Helper to check if a participant has their hand raised
  // NOTE: We check BOTH userId (SDK) and customParticipantId (our DB) because:
  // - WebSocket events use customParticipantId (from our user database)
  // - SDK assigns its own userId (different from our DB ID)
  // - Both IDs must be checked to match participants across systems
  const isParticipantHandRaised = useCallback(
    (participantUserId: string | undefined, participantCustomId: string | undefined) => {
      if (!participantUserId && !participantCustomId) return false

      // Check if it's the local user
      if (participantUserId === meeting?.self?.userId) {
        return callState.handRaised
      }

      // Check remote participants - try BOTH userId and customParticipantId
      const isRaisedByUserId = participantUserId ? callState.remoteHandsRaised?.[participantUserId] || false : false
      const isRaisedByCustomId = participantCustomId
        ? callState.remoteHandsRaised?.[participantCustomId] || false
        : false
      const isRaised = isRaisedByUserId || isRaisedByCustomId

      return isRaised
    },
    [callState.handRaised, callState.remoteHandsRaised, meeting?.self?.userId]
  )
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

      // Debug: Log screen share status only when screen share is actually enabled
      peers.forEach((peer: any) => {
        if (peer.screenShareEnabled) {
          rtkDebug.log(`[RTK Modal] Remote peer ${peer.name || peer.id} screen share ACTIVE:`, {
            screenShareEnabled: peer.screenShareEnabled,
            screenShareTracks: peer.screenShareTracks,
            screenShareTracksType: typeof peer.screenShareTracks,
            videoTrackLabel: peer.videoTrack?.label
          })
        }
      })

      return peers
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
      const videoTrack = screenShareTracks.find(t => t.kind === 'video')
      if (videoTrack) {
        rtkDebug.log('[RTK Modal] ✅ Found VIDEO track for screen share:', {
          trackId: videoTrack.id,
          trackLabel: videoTrack.label,
          trackKind: videoTrack.kind
        })
        return videoTrack
      }

      // Fallback: if no video track found, return first track (shouldn't happen)
      rtkDebug.warn('[RTK Modal] ⚠️ No video track found in screenShareTracks, using first track:', {
        firstTrack: screenShareTracks[0].kind
      })
      return screenShareTracks[0]
    }

    // Also check if videoTrack is actually a screen share
    if (m.self.videoTrack && isVideoTrackScreenShare(m.self.videoTrack)) {
      return m.self.videoTrack
    }

    return null
  })

  rtkDebug.log('[RTK Modal] Remote peers count:', remotePeers?.length || 0)
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
  }, [wsClient, showReactionAnimation, remotePeers, meeting])

  // Auto-play local video stream (fallback if meeting.self.videoTrack not available)
  useEffect(() => {
    const videoElement = localVideoRef.current
    if (!videoElement) return

    // Prefer meeting.self.videoTrack if available, otherwise use localStream
    const localVideoTrack = meeting?.self?.videoTrack
    if (localVideoTrack && callState.isVideoEnabled) {
      const stream = new MediaStream()
      stream.addTrack(localVideoTrack)
      if (meeting?.self?.audioTrack) {
        stream.addTrack(meeting.self.audioTrack)
      }
      videoElement.srcObject = stream
    } else if (localStream) {
      videoElement.srcObject = localStream
    }
  }, [localStream, meeting?.self?.videoTrack, meeting?.self?.audioTrack, callState.isVideoEnabled])

  // Track which peers have had streams attached to avoid flickering
  const attachedPeersRef = useRef<Set<string>>(new Set())

  // Debounce timers for track updates to prevent rapid successive updates
  const trackUpdateTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

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

    remotePeers.forEach((peer: any) => {
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
        const stream = new MediaStream()
        if (cameraVideoTrack) stream.addTrack(cameraVideoTrack)
        if (peer.audioTrack) stream.addTrack(peer.audioTrack)

        videoElement.srcObject = stream
        attachedPeersRef.current.add(peer.id)
        rtkDebug.log(`[RTK Modal] ✅ Attached stream for peer ${peer.name || peer.id}`, {
          hasVideo: !!cameraVideoTrack,
          hasAudio: !!peer.audioTrack,
          videoTrackIsScreenShare: isVideoTrackScreenShare(peer.videoTrack)
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
           * CRITICAL WORKAROUND: HTML Video Element Track Update Issue
           *
           * Issue: When remote peer's tracks change (e.g., video OFF then ON), simply
           * updating srcObject doesn't reliably refresh the video/audio playback.
           * Audio particularly fails to resume even though the track exists and is enabled.
           *
           * Root Cause: Browsers (Chrome/Firefox) aggressively cache MediaStream state
           * in the HTMLVideoElement. When tracks are replaced in the stream, the element
           * doesn't automatically detect the change and re-establish playback.
           *
           * Solution: Force complete refresh by:
           * 1. Set srcObject = null to clear cached stream state
           * 2. Wait 10ms for browser to process the null (triggers internal cleanup)
           * 3. Set srcObject = newStream with fresh tracks
           * 4. Explicitly set muted = false (browser might auto-mute on stream changes)
           * 5. Call play() to ensure playback resumes (might be auto-paused)
           *
           * Note: This is a documented browser behavior issue, not a Cloudflare SDK bug.
           * See: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/srcObject
           */
          const newStream = new MediaStream()
          if (cameraVideoTrack) newStream.addTrack(cameraVideoTrack)
          if (peer.audioTrack) newStream.addTrack(peer.audioTrack)

          // Debounced update to prevent flickering from rapid track changes
          const timer = setTimeout(() => {
            videoElement.srcObject = null

            setTimeout(() => {
              videoElement.srcObject = newStream
              videoElement.muted = false

              videoElement.play().catch(err => {
                rtkDebug.warn(`[RTK Modal] Could not auto-play peer ${peer.name || peer.id}:`, err)
              })

              rtkDebug.log(`[RTK Modal] ✅ Updated stream for peer ${peer.name || peer.id}`, {
                hasVideo: !!cameraVideoTrack,
                hasAudio: !!peer.audioTrack,
                videoElementMuted: videoElement.muted,
                streamAudioTracks: newStream.getAudioTracks().length,
                streamVideoTracks: newStream.getVideoTracks().length
              })

              // Clean up timer reference
              trackUpdateTimersRef.current.delete(peer.id)
            }, 10)
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
    const currentPeerIds = new Set(remotePeers.map((p: any) => p.id))
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
  }, [remotePeers])

  // Cleanup all debounce timers on unmount
  useEffect(() => {
    return () => {
      trackUpdateTimersRef.current.forEach(timer => clearTimeout(timer))
      trackUpdateTimersRef.current.clear()
    }
  }, [])

  // Debug helper: Expose call controls to window for console debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).rtkLeaveCall = () => {
        rtkDebug.log('[RTK Debug] Leaving call via console command')
        onEndCall()
      }
      ;(window as any).rtkToggleMute = () => {
        rtkDebug.log('[RTK Debug] Toggling mute via console command')
        onToggleMute()
      }
      ;(window as any).rtkToggleVideo = () => {
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
      if (typeof window !== 'undefined') {
        delete (window as any).rtkLeaveCall
        delete (window as any).rtkToggleMute
        delete (window as any).rtkToggleVideo
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

    // Find screen shares from remote peers
    remotePeers?.forEach((peer: any) => {
      // Check multiple ways to detect screen share
      const screenShareTrack = getScreenShareTrack(peer)
      const hasScreenShareEnabled = peer.screenShareEnabled === true

      rtkDebug.log(`[RTK Modal] Checking peer ${peer.name || peer.id} for screen share:`, {
        hasScreenShareTrack: !!screenShareTrack,
        screenShareEnabled: hasScreenShareEnabled,
        screenShareTracks: peer.screenShareTracks,
        videoTrackLabel: peer.videoTrack?.label
      })

      if (screenShareTrack) {
        shares.push({
          peerId: peer.id,
          peerName: peer.name || peer.displayName || peer.customParticipantId || 'Unknown',
          screenShareTrack,
          trackId: screenShareTrack.id,
          peer
        })
      } else if (hasScreenShareEnabled) {
        // Screen share is enabled but track not found yet - might be initializing
        rtkDebug.warn(`[RTK Modal] Peer ${peer.name || peer.id} has screenShareEnabled=true but no track found`)
      }
    })

    // Add local screen share if active
    if (callState.isScreenSharing && localScreenShareTrack) {
      shares.push({
        peerId: 'local',
        peerName: participants[0]?.odName || 'You',
        screenShareTrack: localScreenShareTrack,
        trackId: localScreenShareTrack.id,
        peer: null
      })
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
  }, [remotePeers, callState.isScreenSharing, localScreenShareTrack, participants])

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
    }> = []

    // Add focused screen share first (if exists) - will be larger in grid
    if (focusedScreenShare) {
      items.push({
        id: `screen-share-${focusedScreenShare.peerId}`,
        type: 'screen-share',
        peerId: focusedScreenShare.peerId,
        peerName: focusedScreenShare.peerName,
        screenShareTrack: focusedScreenShare.screenShareTrack,
        isLocal: focusedScreenShare.peerId === 'local',
        isMuted: focusedScreenShare.peerId === 'local' ? callState.isMuted : false,
        isVideoEnabled: true,
        isFocusedScreenShare: true
      })
    }

    // Add local participant (video or avatar) - ALWAYS show, even when screen sharing
    // Screen share and camera video are separate and should both be visible
    const localVideoTrack = meeting?.self?.videoTrack
    const localAudioTrack = meeting?.self?.audioTrack
    const localHasVideo = callState.isVideoEnabled && !!localVideoTrack

    // Always add local participant - screen share is a separate item
    items.push({
      id: 'local-participant',
      type: localHasVideo ? 'video' : 'avatar',
      peerId: 'local',
      peerName: participants[0]?.odName || 'You',
      userId: meeting?.self?.userId, // For checking hand-raised state
      customParticipantId: meeting?.self?.customParticipantId, // Our DB user ID - for checking reactions
      videoTrack: localVideoTrack,
      audioTrack: localAudioTrack,
      hasVideoTrack: localHasVideo, // For rendering decision
      hasAudioTrack: !!localAudioTrack, // Audio needs video element too!
      isLocal: true,
      isMuted: callState.isMuted,
      isVideoEnabled: callState.isVideoEnabled
    })

    // Add ALL non-focused screen shares (from allScreenShares array)
    allScreenShares.forEach(share => {
      if (share.peerId !== focusedScreenShare?.peerId) {
        items.push({
          id: `screen-share-${share.peerId}`,
          type: 'screen-share',
          peerId: share.peerId,
          peerName: share.peerName,
          screenShareTrack: share.screenShareTrack,
          isLocal: share.peerId === 'local',
          isMuted: share.peerId === 'local' ? callState.isMuted : false,
          isVideoEnabled: true
        })
      }
    })

    // Add remote participants (videos or avatars) - always add, even if sharing screen
    remotePeers?.forEach((peer: any) => {
      // Get camera track - exclude screen share track
      const cameraVideoTrack = peer.videoTrack && !isVideoTrackScreenShare(peer.videoTrack) ? peer.videoTrack : null
      const hasVideo = peer.videoEnabled && !!cameraVideoTrack

      items.push({
        id: `participant-${peer.id}`,
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
        isVideoEnabled: peer.videoEnabled || false
      })
    })

    rtkDebug.log(`[RTK Modal] Grid items built:`, {
      totalItems: items.length,
      screenShares: items.filter(i => i.type === 'screen-share').length,
      focusedScreenShare: focusedScreenShare?.peerId,
      items: items.map(i => ({
        id: i.id,
        type: i.type,
        peerId: i.peerId,
        userId: i.userId, // SDK userId
        customParticipantId: i.customParticipantId, // Our DB user ID
        peerName: i.peerName,
        isFocused: i.isFocusedScreenShare
      }))
    })

    return items
  }, [
    focusedScreenShare,
    allScreenShares,
    remotePeers,
    callState.isVideoEnabled,
    callState.isMuted,
    callState.isScreenSharing,
    participants,
    meeting?.self
  ])

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
      // Reduce to 2 columns when panel is open
      if (itemCount <= 2) {
        return isNarrow
          ? { cols: 1, rows: 2, focusedSpan: { col: 1, row: 1 } } // Narrower: single column
          : { cols: 2, rows: 1, focusedSpan: { col: 1, row: 1 } }
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
  }, [screenShareTrackIds, gridItems])

  // Attach video tracks to video elements in grid
  useEffect(() => {
    gridItems.forEach(item => {
      if (item.type === 'video' && item.videoTrack) {
        const videoEl = item.isLocal ? localVideoRef.current : remoteVideoRefs.current.get(item.peerId)

        if (!videoEl) return

        const stream = new MediaStream()
        if (item.videoTrack) stream.addTrack(item.videoTrack)
        if (item.audioTrack) stream.addTrack(item.audioTrack)

        // Only update if track changed
        const currentStream = videoEl.srcObject as MediaStream
        const currentVideoTrack = currentStream?.getVideoTracks()[0]
        if (currentVideoTrack?.id === item.videoTrack.id) {
          return // Same track, no need to update
        }

        videoEl.srcObject = null
        setTimeout(() => {
          videoEl.srcObject = stream
          videoEl.muted = item.isLocal
          videoEl.play().catch(err => rtkDebug.warn(`[RTK Modal] Could not auto-play video ${item.peerId}:`, err))
        }, 10)
      }
    })
  }, [videoTrackIds, gridItems])

  // Expanded screen share video ref (for fullscreen overlay)
  const expandedScreenShareVideoRef = useRef<HTMLVideoElement>(null)

  // Minimized view refs - for PiP-style window
  const pipVideoRef = useRef<HTMLVideoElement>(null)
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

  // Get first remote peer for minimized view
  const firstRemotePeer = useMemo(() => {
    return remotePeers[0] || null
  }, [remotePeers])

  // Track audio track IDs to trigger effect when they change
  const remoteAudioTrackIds = useMemo(() => {
    return remotePeers.map(p => (p as RealtimeKitPeer).audioTrack?.id || null).join(',')
  }, [remotePeers])

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

  // Set remote stream on PiP video when minimized (show person speaking, not self)
  useEffect(() => {
    if (callState.isMinimized && pipVideoRef.current && firstRemotePeer) {
      const rtkPeer = firstRemotePeer as RealtimeKitPeer
      const stream = buildStreamFromPeer(rtkPeer)
      const peerName = rtkPeer.name || rtkPeer.odName
      if (stream) {
        console.log('[Minimized] Setting video stream for peer:', peerName, {
          hasVideoTracks: stream.getVideoTracks().length,
          hasAudioTracks: stream.getAudioTracks().length,
          videoTrackEnabled: stream.getVideoTracks()[0]?.enabled
        })
        pipVideoRef.current.srcObject = stream
        pipVideoRef.current.play().catch(err => console.debug('PiP video play error:', err))
      } else {
        // Clear video when no tracks available
        if (pipVideoRef.current.srcObject) {
          pipVideoRef.current.srcObject = null
        }
      }
    }
  }, [callState.isMinimized, firstRemotePeer, (firstRemotePeer as RealtimeKitPeer)?.videoTrack, buildStreamFromPeer])

  // Play all remote audio streams when minimized (so user can hear all participants)
  useEffect(() => {
    if (!callState.isMinimized) {
      // Clean up audio elements when not minimized
      console.log('[Minimized] Cleaning up audio elements, count:', pipAudioRefs.current.size)
      pipAudioRefs.current.forEach(audio => {
        audio.pause()
        audio.srcObject = null
      })
      pipAudioRefs.current.clear()
      return
    }

    console.log('[Minimized] Setting up audio for remote peers:', {
      remotePeersCount: remotePeers.length,
      remotePeerIds: remotePeers.map(p => p.id),
      existingAudioCount: pipAudioRefs.current.size
    })

    // Create or update audio elements for each remote peer
    remotePeers.forEach(peer => {
      const rtkPeer = peer as RealtimeKitPeer
      const peerName = rtkPeer.name || rtkPeer.odName
      const stream = buildStreamFromPeer(rtkPeer)
      if (stream && stream.getAudioTracks().length > 0) {
        const existingAudio = pipAudioRefs.current.get(peer.id)

        if (!existingAudio) {
          // Create new audio element
          console.log('[Minimized] Creating audio element for peer:', peerName, {
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
    const currentPeerIds = new Set(remotePeers.map(p => p.id))
    pipAudioRefs.current.forEach((audio, peerId) => {
      if (!currentPeerIds.has(peerId)) {
        console.log('[Minimized] Removing audio for peer (left call):', peerId)
        audio.pause()
        audio.srcObject = null
        pipAudioRefs.current.delete(peerId)
      }
    })
  }, [callState.isMinimized, remotePeers, remoteAudioTrackIds, buildStreamFromPeer])

  const isOpen =
    callState.status === 'connected' || callState.status === 'joining' || callState.status === 'reconnecting'

  // Render minimized view - floating PiP-style window
  if (isOpen && callState.isMinimized) {
    const rtkFirstPeer = firstRemotePeer as RealtimeKitPeer | null
    const firstRemoteStream = rtkFirstPeer ? buildStreamFromPeer(rtkFirstPeer) : null

    // Render minimized view as portal to a dedicated container
    let portalContainer = document.getElementById('rtk-group-call-minimized-portal')
    if (!portalContainer) {
      portalContainer = document.createElement('div')
      portalContainer.id = 'rtk-group-call-minimized-portal'
      portalContainer.style.cssText = 'position: fixed; z-index: 9999;'
      document.body.appendChild(portalContainer)
    }

    return createPortal(
      <MinimizedCallView
        firstRemotePeer={rtkFirstPeer}
        firstRemoteStream={firstRemoteStream}
        remotePeerCount={remotePeers.length}
        duration={callState.duration}
        isMuted={callState.isMuted}
        isVideoEnabled={callState.isVideoEnabled}
        onToggleMute={onToggleMute}
        onToggleVideo={onToggleVideo}
        onExpand={onToggleMinimize || (() => {})}
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
            className="gba:max-w-6xl gba:h-[80vh] gba:p-0 gba:overflow-hidden gba:flex"
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
              {callState.callType === 'video' ? t('chat-videoCall') : t('chat-audioCall')} with {remotePeers.length + 1}{' '}
              {remotePeers.length + 1 === 1 ? 'participant' : 'participants'}
            </DialogDescription>
            <div className="gba:flex gba:h-full gba:bg-background gba:min-h-0">
              {/* Main content area - Takes remaining space */}
              <div className="gba:flex gba:flex-col gba:flex-1 gba:min-w-0">
                {/* Header */}
                <CallHeader
                  conversationName={conversationName}
                  duration={callState.duration}
                  participantCount={remotePeers.length + 1}
                  callType={callState.callType}
                  showParticipantsPanel={showParticipantsPanel}
                  onToggleParticipantsPanel={() => setShowParticipantsPanel(prev => !prev)}
                  onToggleMinimize={onToggleMinimize}
                  onClose={onEndCall}
                  prefixDataTestId={prefixDataTestId}
                  t={t}
                />

                {/* Main Content Area - Unified Grid Layout */}
                <div className="gba:flex gba:flex-col gba:flex-1 gba:p-4 gba:bg-muted/30 gba:gap-4 gba:min-h-0 gba:overflow-y-auto">
                  <VideoGrid
                    gridItems={paginatedGridItems.items.map(item => {
                      const isFocused = item.isFocusedScreenShare
                      const gridColumn = isFocused ? `span ${gridLayout.focusedSpan.col}` : 'span 1'
                      const gridRow = isFocused ? `span ${gridLayout.focusedSpan.row}` : 'span 1'

                      return (
                        <div
                          key={item.id}
                          style={{ gridColumn, gridRow }}
                          className="gba:relative"
                          data-testid={`${prefixDataTestId}-grid-item-${item.id}`}
                        >
                          <ParticipantVideoTile
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
                            isHandRaised={isParticipantHandRaised(item.userId, item.customParticipantId)}
                            reactions={activeReactions}
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
                            videoRef={
                              item.isLocal
                                ? localVideoRef
                                : el => {
                                    if (el) {
                                      remoteVideoRefs.current.set(item.peerId, el)
                                    } else {
                                      remoteVideoRefs.current.delete(item.peerId)
                                    }
                                  }
                            }
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
                <div className="gba:w-80 gba:bg-card gba:shadow-xl gba:flex gba:flex-col gba:border-l gba:flex-shrink-0 gba:transition-all gba:duration-300">
                  <ParticipantsPanel
                    meeting={meeting}
                    isOpen={showParticipantsPanel}
                    onClose={() => setShowParticipantsPanel(false)}
                    prefixDataTestId={prefixDataTestId}
                    availableParticipants={availableParticipants}
                    pendingInvites={pendingInvites}
                    onInviteParticipant={onInviteParticipant}
                    remoteHandsRaised={callState.remoteHandsRaised}
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

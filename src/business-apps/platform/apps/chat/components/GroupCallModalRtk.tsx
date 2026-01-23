/**
 * GroupCallModalRtk - Modal for Realtime Kit group video/audio calls
 *
 * This component uses Cloudflare Realtime Kit SDK to render remote participants
 * and handle media streaming through SFU infrastructure.
 *
 * Phase 2: Full SDK integration with remote video/audio rendering
 */

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useRealtimeKitSelector } from '@cloudflare/realtimekit-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Avatar,
  AvatarFallback
} from '@newwork/nw-design-system'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  Minimize2,
  Monitor,
  Shrink,
  Maximize2,
  Image,
  ChevronLeft,
  ChevronRight,
  ZoomIn
} from 'lucide-react'
import type { GroupCallParticipant, VideoQuality } from '../services/groupWebrtcClient'
import type { GroupCallUIState, PendingInvite } from '../hooks/useGroupCall'
import type { CallParticipant } from '../services/webrtcClient'
import { useChatTranslation } from '../contexts/TranslationContext'
import { rtkDebug } from '../utils/rtkDebug'

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
  backgroundEnabled?: boolean
  prefixDataTestId?: string
  availableParticipants?: AvailableParticipant[]
  onInviteParticipant?: (participant: CallParticipant) => void
  onReconnectParticipant?: (participantId: string) => Promise<void>
  getConnectionDiagnostics?: () => Map<string, any>
  accessToken?: string
  currentUserId?: string | null
  conversationName?: string
}

// Format duration as MM:SS or HH:MM:SS
const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Get initials from name
const getInitials = (name: string): string => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

// Helper to detect if a video track is a screen share
const isVideoTrackScreenShare = (videoTrack: MediaStreamTrack | null | undefined): boolean => {
  if (!videoTrack) return false

  const label = videoTrack.label?.toLowerCase() || ''
  if (label.includes('screen') || label.includes('window') || label.includes('display') || label.includes('tab')) {
    return true
  }

  // Check track settings for displaySurface (Chrome/Firefox)
  try {
    const settings = videoTrack.getSettings?.()
    if (settings && 'displaySurface' in settings) {
      return true
    }
  } catch {
    // Ignore errors
  }

  return false
}

// Helper to extract tracks from various possible structures (Map, Set, Array, object)
const extractTracksFromCollection = (tracks: any): MediaStreamTrack[] => {
  if (!tracks) return []

  // If it's already an array
  if (Array.isArray(tracks)) {
    return tracks.filter(t => t instanceof MediaStreamTrack)
  }

  // If it's a Map
  if (tracks instanceof Map) {
    return Array.from(tracks.values()).filter(t => t instanceof MediaStreamTrack)
  }

  // If it's a Set
  if (tracks instanceof Set) {
    return Array.from(tracks).filter(t => t instanceof MediaStreamTrack)
  }

  // If it's an object with numeric keys (array-like) or values
  if (typeof tracks === 'object') {
    // Try to get values if it's an object
    const values = Object.values(tracks)
    const tracksFromValues = values.filter(t => t instanceof MediaStreamTrack)
    if (tracksFromValues.length > 0) {
      return tracksFromValues
    }

    // Try to iterate if it has forEach or similar
    if (typeof tracks.forEach === 'function') {
      const result: MediaStreamTrack[] = []
      tracks.forEach((value: any) => {
        if (value instanceof MediaStreamTrack) {
          result.push(value)
        }
      })
      return result
    }

    // Try to get entries if it's iterable
    if (typeof tracks[Symbol.iterator] === 'function') {
      const result: MediaStreamTrack[] = []
      for (const value of tracks) {
        if (value instanceof MediaStreamTrack) {
          result.push(value)
        }
      }
      return result
    }
  }

  return []
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
  remoteStreams,
  participants,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleMinimize,
  onToggleBackground,
  prefixDataTestId = 'rtk-group-call',
  conversationName
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
  const [currentPage, setCurrentPage] = useState(0)

  // Debug: Log when expanded screen share changes
  useEffect(() => {
    if (expandedScreenShare) {
      rtkDebug.log(`[RTK Modal] 🔍 Expanded screen share state changed:`, {
        peerId: expandedScreenShare.peerId,
        peerName: expandedScreenShare.peerName,
        streamId: expandedScreenShare.stream.id,
        trackCount: expandedScreenShare.stream.getTracks().length
      })
    } else {
      rtkDebug.log(`[RTK Modal] 🔍 Expanded screen share closed`)
    }
  }, [expandedScreenShare])

  // Pagination config: max participants per page
  const PARTICIPANTS_PER_PAGE = 9

  // Get meeting object from SDK to access local tracks
  const meeting = useRealtimeKitSelector((m: any) => m)

  // Subscribe to remote participants from SDK
  const remotePeers: GroupCallParticipant[] = useRealtimeKitSelector((m: any): GroupCallParticipant[] => {
    if (!m?.participants?.joined) return []

    try {
      const joined = Array.from(m.participants.joined.values())
      // Filter out local participant
      const peers = joined.filter((p: any) => p.id !== m.self?.id) as GroupCallParticipant[]

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
  const gridLayout = useMemo(() => {
    const itemCount = paginatedGridItems.items.length
    const hasFocusedScreenShare = !!focusedScreenShare
    const screenShareCount = allScreenShares.length

    rtkDebug.log('[RTK Modal] Grid layout calculation:', {
      itemCount,
      hasFocusedScreenShare,
      screenShareCount,
      focusedScreenShareId
    })

    if (itemCount === 0) {
      return { cols: 1, rows: 1, focusedSpan: { col: 1, row: 1 } }
    }

    if (hasFocusedScreenShare) {
      // With focused screen share: optimize grid to minimize empty space
      // Screen share takes 2x2, participants fill remaining cells efficiently
      if (itemCount <= 5) {
        // 1 focused (2x2=4 cells) + 4 others = 8 cells → 3x3 grid (9 cells, 1 empty)
        return { cols: 3, rows: 3, focusedSpan: { col: 2, row: 2 } }
      } else if (itemCount <= 7) {
        // 1 focused (2x2=4 cells) + 6 others = 10 cells → 4x3 grid (12 cells, 2 empty)
        return { cols: 4, rows: 3, focusedSpan: { col: 2, row: 2 } }
      } else if (itemCount <= 9) {
        // 1 focused (2x2=4 cells) + 8 others = 12 cells → 4x3 grid (12 cells, perfect!)
        return { cols: 4, rows: 3, focusedSpan: { col: 2, row: 2 } }
      } else {
        // Many items: 4x4 grid with focused 2x2 (16 cells total)
        return { cols: 4, rows: 4, focusedSpan: { col: 2, row: 2 } }
      }
    } else {
      // No focused screen share: standard grid (max 9 items per page = 3x3)
      if (itemCount <= 4) {
        return { cols: 2, rows: 2, focusedSpan: { col: 1, row: 1 } }
      } else {
        // Always 3x3 for 5-9 items
        return { cols: 3, rows: 3, focusedSpan: { col: 1, row: 1 } }
      }
    }
  }, [paginatedGridItems.items.length, focusedScreenShare, allScreenShares.length, focusedScreenShareId])

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

        // Only update if track changed
        const currentStream = videoEl.srcObject as MediaStream
        const currentTrack = currentStream?.getVideoTracks()[0]
        if (currentTrack?.id === track.id && track.readyState === 'live') {
          rtkDebug.log(`[RTK Modal] Screen share track already attached and live for ${item.peerId}`)
          return // Same track and still live, no need to update
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

  // Update expanded screen share video element
  useEffect(() => {
    if (expandedScreenShareVideoRef.current && expandedScreenShare?.stream) {
      const videoEl = expandedScreenShareVideoRef.current
      const tracks = expandedScreenShare.stream.getVideoTracks()

      if (tracks.length === 0 || tracks[0].readyState === 'ended') {
        rtkDebug.warn('[RTK Modal] Expanded screen share has no valid tracks')
        return
      }

      videoEl.srcObject = expandedScreenShare.stream
      videoEl.muted = true // Must be muted for autoplay

      const playPromise = videoEl.play()
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          rtkDebug.warn('[RTK Modal] Could not auto-play expanded screen share:', err)
          // Retry after short delay
          setTimeout(() => {
            videoEl.play().catch(e => rtkDebug.error('[RTK Modal] Retry play failed:', e))
          }, 100)
        })
      }
    }
  }, [expandedScreenShare])

  const isOpen =
    callState.status === 'connected' || callState.status === 'joining' || callState.status === 'reconnecting'

  // Render minimized view (MS Teams style - shows first participant's video)
  if (isOpen && callState.isMinimized) {
    const firstRemotePeer = remotePeers[0]
    const firstRemoteStream = firstRemotePeer ? remoteStreams.get(firstRemotePeer.id) : null

    // Check if video is actually available and enabled
    const videoTracks = firstRemoteStream?.getVideoTracks() || []
    const hasRemoteVideo = videoTracks.length > 0 && videoTracks.some(t => t.enabled && t.readyState === 'live')

    rtkDebug.log('[RTK Modal] 🔽 Rendering minimized view:', {
      hasPeer: !!firstRemotePeer,
      peerId: firstRemotePeer?.id,
      peerName: firstRemotePeer?.odName,
      hasStream: !!firstRemoteStream,
      streamId: firstRemoteStream?.id,
      hasRemoteVideo,
      totalVideoTracks: videoTracks.length,
      videoTracksEnabled: videoTracks.filter(t => t.enabled).length,
      videoTracksLive: videoTracks.filter(t => t.readyState === 'live').length,
      totalAudioTracks: firstRemoteStream?.getAudioTracks().length,
      remotePeersCount: remotePeers.length,
      remoteStreamsSize: remoteStreams.size,
      remoteStreamsKeys: Array.from(remoteStreams.keys()),
      callDuration: callState.duration
    })

    return createPortal(
      <div
        className="gba:fixed gba:bottom-4 gba:right-4 gba:z-[9999] gba:w-80 gba:bg-card gba:rounded-lg gba:shadow-2xl gba:overflow-hidden gba:border"
        style={{ pointerEvents: 'auto' }}
        data-testid={`${prefixDataTestId}-minimized`}
      >
        {/* Mini video preview - MS Teams style */}
        <div className="gba:relative gba:aspect-video gba:bg-muted">
          {hasRemoteVideo && firstRemoteStream ? (
            <video
              ref={el => {
                if (el) {
                  // Always update srcObject to ensure stream changes are reflected
                  if (el.srcObject !== firstRemoteStream) {
                    rtkDebug.log('[RTK Minimized] 📹 Attaching video stream to minimized view:', {
                      peerId: firstRemotePeer?.id,
                      peerName: firstRemotePeer?.odName,
                      streamId: firstRemoteStream.id,
                      videoTracks: firstRemoteStream.getVideoTracks().length,
                      audioTracks: firstRemoteStream.getAudioTracks().length,
                      videoEnabled: firstRemoteStream
                        .getVideoTracks()
                        .map(t => ({ id: t.id, enabled: t.enabled, readyState: t.readyState }))
                    })
                    el.srcObject = firstRemoteStream
                  }
                  // Ensure video is playing
                  if (el.paused) {
                    el.play().catch(err => rtkDebug.debug('[RTK Minimized] Video play error:', err))
                  }
                }
              }}
              autoPlay
              playsInline
              className="gba:w-full gba:h-full gba:object-cover"
            />
          ) : firstRemotePeer ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-2">
              <Avatar className="gba:h-12 gba:w-12">
                <AvatarFallback className="gba:bg-primary/20">
                  {firstRemotePeer.odName?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="gba:text-sm gba:text-foreground">{firstRemotePeer.odName}</span>
            </div>
          ) : (
            <span className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground gba:text-xs">
              {t('groupCall-waitingForParticipants')}
            </span>
          )}

          {/* Participant count overlay */}
          <div className="gba:absolute gba:top-2 gba:left-2 gba:flex gba:items-center gba:gap-1 gba:bg-black/60 gba:px-2 gba:py-1 gba:rounded-full">
            <Users className="gba:h-3 gba:w-3 gba:text-white" />
            <span className="gba:text-white gba:text-xs">{remotePeers.length + 1}</span>
          </div>

          {/* Duration */}
          <div className="gba:absolute gba:top-2 gba:right-2 gba:bg-black/60 gba:px-2 gba:py-1 gba:rounded-full">
            <span className="gba:text-white gba:text-xs gba:font-mono">{formatDuration(callState.duration)}</span>
          </div>
        </div>

        {/* Mini controls */}
        <div className="gba:flex gba:items-center gba:justify-between gba:p-2 gba:bg-muted/50">
          <div className="gba:flex gba:items-center gba:gap-1">
            <button
              onClick={onToggleMute}
              className={`gba:p-2 gba:rounded-full gba:transition-all ${
                callState.isMuted
                  ? 'gba:bg-destructive gba:text-destructive-foreground'
                  : 'gba:bg-secondary gba:text-secondary-foreground hover:gba:bg-accent'
              }`}
              title={callState.isMuted ? t('groupCall-unmute') : t('groupCall-mute')}
              data-testid={`${prefixDataTestId}-minimized-mute-btn`}
            >
              {callState.isMuted ? <MicOff className="gba:h-4 gba:w-4" /> : <Mic className="gba:h-4 gba:w-4" />}
            </button>
            <button
              onClick={onToggleVideo}
              className={`gba:p-2 gba:rounded-full gba:transition-all ${
                !callState.isVideoEnabled
                  ? 'gba:bg-destructive gba:text-destructive-foreground'
                  : 'gba:bg-secondary gba:text-secondary-foreground hover:gba:bg-accent'
              }`}
              title={callState.isVideoEnabled ? t('groupCall-turnOffVideo') : t('groupCall-turnOnVideo')}
              data-testid={`${prefixDataTestId}-minimized-video-btn`}
            >
              {callState.isVideoEnabled ? (
                <Video className="gba:h-4 gba:w-4" />
              ) : (
                <VideoOff className="gba:h-4 gba:w-4" />
              )}
            </button>
          </div>
          <div className="gba:flex gba:items-center gba:gap-1">
            {onToggleMinimize && (
              <button
                onClick={onToggleMinimize}
                className="gba:p-2 gba:rounded-full gba:bg-secondary gba:text-secondary-foreground hover:gba:bg-accent gba:transition-all"
                title={t('chat-fullscreen')}
                data-testid={`${prefixDataTestId}-minimized-expand-btn`}
              >
                <Maximize2 className="gba:h-4 gba:w-4" />
              </button>
            )}
            <button
              onClick={onEndCall}
              className="gba:p-2 gba:rounded-full gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90 gba:transition-all"
              title={t('groupCall-endCall')}
              data-testid={`${prefixDataTestId}-minimized-end-btn`}
            >
              <PhoneOff className="gba:h-4 gba:w-4" />
            </button>
          </div>
        </div>
      </div>,
      document.body
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
            <DialogTitle className="gba:sr-only">{conversationName || t('chat-groupCall') || 'Group Call'}</DialogTitle>
            <DialogDescription className="gba:sr-only">
              {callState.callType === 'video' ? t('chat-videoCall') : t('chat-audioCall')} with {remotePeers.length + 1}{' '}
              {remotePeers.length + 1 === 1 ? 'participant' : 'participants'}
            </DialogDescription>
            <div className="gba:flex gba:flex-col gba:h-full gba:bg-background gba:min-h-0">
              {/* Header */}
              <div className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4 gba:border-b gba:bg-muted/30 gba:flex-shrink-0">
                <div className="gba:flex gba:items-center gba:gap-4">
                  <div className="gba:p-2 gba:rounded-lg gba:bg-primary/10">
                    <Users className="gba:w-5 gba:h-5 gba:text-primary" />
                  </div>
                  <div>
                    <h3 className="gba:font-semibold gba:text-lg">
                      {conversationName || t('groupCall-title') || 'Group Call'}
                    </h3>
                    <div className="gba:flex gba:items-center gba:gap-3 gba:text-sm gba:text-muted-foreground">
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <span className="gba:font-mono gba:font-medium">{formatDuration(callState.duration)}</span>
                      </span>
                      <span>•</span>
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <Users className="gba:w-4 gba:h-4" />
                        <span className="gba:font-medium">{remotePeers.length + 1}</span>
                        <span>{t('groupCall-participants') || 'participants'}</span>
                      </span>
                      {callState.callType === 'audio' && (
                        <>
                          <span>•</span>
                          <span className="gba:text-xs gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-muted">
                            {t('groupCall-audioOnly')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="gba:flex gba:items-center gba:gap-2">
                  {onToggleMinimize && (
                    <button
                      onClick={onToggleMinimize}
                      className="gba:p-2 gba:rounded-lg hover:gba:bg-accent gba:transition-colors"
                      data-testid={`${prefixDataTestId}-minimize-btn`}
                      aria-label={t('groupCall-minimize')}
                      title={t('groupCall-minimize')}
                    >
                      <Minimize2 className="gba:w-5 gba:h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Main Content Area - Unified Grid Layout */}
              <div className="gba:flex gba:flex-col gba:flex-1 gba:p-4 gba:bg-muted/30 gba:gap-4 gba:min-h-0 gba:overflow-y-auto">
                {gridItems.length === 0 ? (
                  <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:rounded-lg gba:bg-muted gba:text-muted-foreground">
                    <div className="gba:text-center">
                      <Users className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-2" />
                      <p>{t('groupCall-waitingForParticipants')}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Participant Grid */}
                    <div
                      className="gba:flex-1 gba:grid gba:gap-3 gba:min-h-0"
                      style={{
                        gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
                        gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`
                      }}
                    >
                      {paginatedGridItems.items.map(item => {
                        const isFocused = item.isFocusedScreenShare
                        const gridColumn = isFocused ? `span ${gridLayout.focusedSpan.col}` : 'span 1'
                        const gridRow = isFocused ? `span ${gridLayout.focusedSpan.row}` : 'span 1'

                        return (
                          <div
                            key={item.id}
                            className={`gba:relative gba:rounded-lg gba:overflow-hidden gba:flex gba:items-center gba:justify-center ${
                              isFocused
                                ? 'gba:bg-black gba:ring-2 gba:ring-primary gba:ring-offset-2'
                                : item.type === 'screen-share'
                                  ? 'gba:bg-black'
                                  : 'gba:bg-muted'
                            }`}
                            style={{ gridColumn, gridRow }}
                            data-testid={`${prefixDataTestId}-grid-item-${item.id}`}
                          >
                            {item.type === 'screen-share' && item.screenShareTrack ? (
                              // Screen Share Tile
                              <>
                                <video
                                  ref={el => {
                                    if (el) {
                                      screenShareVideoRefs.current.set(item.peerId, el)
                                    } else {
                                      screenShareVideoRefs.current.delete(item.peerId)
                                    }
                                  }}
                                  autoPlay
                                  playsInline
                                  muted
                                  onLoadedMetadata={e => {
                                    const videoEl = e.currentTarget
                                    rtkDebug.log(`[RTK Modal] 📺 Video metadata loaded for ${item.peerId}:`, {
                                      videoWidth: videoEl.videoWidth,
                                      videoHeight: videoEl.videoHeight,
                                      duration: videoEl.duration
                                    })
                                  }}
                                  onLoadedData={e => {
                                    const videoEl = e.currentTarget
                                    rtkDebug.log(`[RTK Modal] 📺 Video data loaded for ${item.peerId}:`, {
                                      readyState: videoEl.readyState,
                                      currentTime: videoEl.currentTime
                                    })
                                  }}
                                  onError={e => {
                                    rtkDebug.error(`[RTK Modal] ❌ Video error for ${item.peerId}:`, e)
                                  }}
                                  className={`gba:w-full gba:h-full gba:object-contain gba:bg-black ${
                                    isFocused ? 'gba:cursor-zoom-in' : 'gba:cursor-pointer'
                                  }`}
                                  title={isFocused ? 'Click to expand fullscreen' : 'Click to focus this screen share'}
                                  data-testid={`${prefixDataTestId}-screenshare-${item.peerId}`}
                                  onClick={() => {
                                    rtkDebug.log(`[RTK Modal] 🖱️ Screen share clicked:`, {
                                      peerId: item.peerId,
                                      peerName: item.peerName,
                                      isFocused,
                                      hasTrack: !!item.screenShareTrack
                                    })

                                    if (isFocused) {
                                      // Click focused screen share → expand to fullscreen
                                      rtkDebug.log(`[RTK Modal] 🔍 Expanding to fullscreen...`)
                                      const stream = new MediaStream()
                                      stream.addTrack(item.screenShareTrack!)
                                      setExpandedScreenShare({
                                        peerId: item.peerId,
                                        peerName: item.peerName,
                                        stream
                                      })
                                    } else {
                                      // Click unfocused screen share → make it focused
                                      rtkDebug.log(`[RTK Modal] 🎯 Focusing screen share...`)
                                      setFocusedScreenShareId(item.peerId)
                                    }
                                  }}
                                />

                                {/* Screen share overlay */}
                                <div
                                  className={`gba:absolute gba:top-2 gba:left-2 gba:px-2 gba:py-1 gba:rounded gba:text-xs gba:flex gba:items-center gba:gap-1 ${
                                    isFocused
                                      ? 'gba:bg-primary gba:text-primary-foreground'
                                      : 'gba:bg-black/70 gba:text-white'
                                  }`}
                                >
                                  <Monitor className="gba:w-3 gba:h-3" />
                                  <span className="gba:font-medium">
                                    {item.peerName} {item.isLocal ? '(You)' : ''}
                                  </span>
                                </div>

                                {/* Expand hint for focused screen share */}
                                {isFocused && (
                                  <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:opacity-0 hover:gba:opacity-100 gba:transition-opacity gba:bg-black/40 gba:pointer-events-none">
                                    <div className="gba:px-3 gba:py-2 gba:rounded-lg gba:bg-black/80 gba:text-white gba:text-sm gba:flex gba:items-center gba:gap-2">
                                      <Maximize2 className="gba:w-4 gba:h-4" />
                                      <span>Click to expand fullscreen</span>
                                    </div>
                                  </div>
                                )}

                                {/* Focus button for non-focused screen shares */}
                                {!isFocused && allScreenShares.length > 1 && (
                                  <button
                                    onClick={e => {
                                      e.stopPropagation()
                                      rtkDebug.log(`[RTK Modal] 🎯 Focus button clicked for ${item.peerId}`)
                                      setFocusedScreenShareId(item.peerId)
                                    }}
                                    className="gba:absolute gba:top-2 gba:right-2 gba:p-2 gba:rounded-lg gba:bg-primary/90 hover:gba:bg-primary gba:text-primary-foreground gba:transition-colors gba:shadow-lg"
                                    title="Make larger"
                                    data-testid={`${prefixDataTestId}-focus-screenshare-${item.peerId}`}
                                  >
                                    <ZoomIn className="gba:w-4 gba:h-4" />
                                  </button>
                                )}
                              </>
                            ) : item.hasVideoTrack || item.hasAudioTrack ? (
                              // Video Tile (or hidden video element for audio-only playback)
                              <>
                                <video
                                  ref={
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
                                  autoPlay
                                  playsInline
                                  muted={item.isLocal}
                                  className={
                                    item.hasVideoTrack ? 'gba:w-full gba:h-full gba:object-cover' : 'gba:hidden'
                                  }
                                  data-testid={`${prefixDataTestId}-video-${item.peerId}`}
                                />

                                {/* Show avatar when no video but has audio */}
                                {!item.hasVideoTrack && item.hasAudioTrack && (
                                  <Avatar className="gba:w-24 gba:h-24">
                                    <AvatarFallback className="gba:text-2xl">
                                      {getInitials(item.peerName)}
                                    </AvatarFallback>
                                  </Avatar>
                                )}

                                {/* Name overlay */}
                                <div className="gba:absolute gba:bottom-2 gba:left-2 gba:px-2 gba:py-1 gba:rounded gba:bg-black/70 gba:text-white gba:text-sm">
                                  {item.peerName} {item.isLocal ? '(You)' : ''} {item.isMuted && '🔇'}
                                </div>
                              </>
                            ) : (
                              // Avatar Tile (no video, no audio)
                              <>
                                <Avatar className="gba:w-24 gba:h-24">
                                  <AvatarFallback className="gba:text-2xl">{getInitials(item.peerName)}</AvatarFallback>
                                </Avatar>

                                {/* Name overlay */}
                                <div className="gba:absolute gba:bottom-2 gba:left-2 gba:px-2 gba:py-1 gba:rounded gba:bg-black/70 gba:text-white gba:text-sm">
                                  {item.peerName} {item.isLocal ? '(You)' : ''} {item.isMuted && '🔇'}
                                </div>
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Pagination Controls */}
                    {paginatedGridItems.totalPages > 1 && (
                      <div className="gba:flex gba:items-center gba:justify-center gba:gap-4 gba:py-2 gba:flex-shrink-0">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                          disabled={currentPage === 0}
                          className="gba:p-2 gba:rounded-lg hover:gba:bg-accent disabled:gba:opacity-50 disabled:gba:cursor-not-allowed gba:transition-colors"
                          data-testid={`${prefixDataTestId}-prev-page-btn`}
                          aria-label="Previous page"
                        >
                          <ChevronLeft className="gba:w-5 gba:h-5" />
                        </button>

                        <div className="gba:flex gba:items-center gba:gap-2">
                          <span className="gba:text-sm gba:text-muted-foreground">
                            Page {currentPage + 1} of {paginatedGridItems.totalPages}
                          </span>
                          <span className="gba:text-xs gba:text-muted-foreground gba:px-2 gba:py-1 gba:rounded gba:bg-muted/50">
                            {paginatedGridItems.totalItems} participants
                          </span>
                        </div>

                        <button
                          onClick={() => setCurrentPage(prev => Math.min(paginatedGridItems.totalPages - 1, prev + 1))}
                          disabled={currentPage >= paginatedGridItems.totalPages - 1}
                          className="gba:p-2 gba:rounded-lg hover:gba:bg-accent disabled:gba:opacity-50 disabled:gba:cursor-not-allowed gba:transition-colors"
                          data-testid={`${prefixDataTestId}-next-page-btn`}
                          aria-label="Next page"
                        >
                          <ChevronRight className="gba:w-5 gba:h-5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer - Command Bar */}
              <div className="gba:border-t gba:bg-background gba:flex-shrink-0">
                <div className="gba:flex gba:items-center gba:justify-center gba:px-6 gba:py-3 gba:gap-6">
                  {/* Left: Media Controls Group */}
                  <div className="gba:flex gba:items-center gba:gap-3">
                    {/* Mute button */}
                    <button
                      onClick={onToggleMute}
                      className={`gba:p-3 gba:rounded-full gba:transition-all ${
                        callState.isMuted
                          ? 'gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90'
                          : 'gba:bg-accent hover:gba:bg-accent/90'
                      }`}
                      data-testid={`${prefixDataTestId}-mute-btn`}
                      aria-label={callState.isMuted ? t('groupCall-unmute') : t('groupCall-mute')}
                      title={callState.isMuted ? t('groupCall-unmute') : t('groupCall-mute')}
                    >
                      {callState.isMuted ? <MicOff className="gba:w-5 gba:h-5" /> : <Mic className="gba:w-5 gba:h-5" />}
                    </button>

                    {/* Video toggle button */}
                    {callState.callType === 'video' && (
                      <button
                        onClick={onToggleVideo}
                        className={`gba:p-3 gba:rounded-full gba:transition-all ${
                          !callState.isVideoEnabled
                            ? 'gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90'
                            : 'gba:bg-accent hover:gba:bg-accent/90'
                        }`}
                        data-testid={`${prefixDataTestId}-video-btn`}
                        aria-label={callState.isVideoEnabled ? t('groupCall-turnOffVideo') : t('groupCall-turnOnVideo')}
                        title={callState.isVideoEnabled ? t('groupCall-turnOffVideo') : t('groupCall-turnOnVideo')}
                      >
                        {callState.isVideoEnabled ? (
                          <Video className="gba:w-5 gba:h-5" />
                        ) : (
                          <VideoOff className="gba:w-5 gba:h-5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Separator */}
                  <div className="gba:h-8 gba:w-px gba:bg-border/50" />

                  {/* Center: Sharing & Effects Controls Group */}
                  <div className="gba:flex gba:items-center gba:gap-3">
                    {/* Screen share button */}
                    {onToggleScreenShare && (
                      <button
                        onClick={onToggleScreenShare}
                        className={`gba:p-3 gba:rounded-full gba:transition-all ${
                          callState.isScreenSharing
                            ? 'gba:bg-primary gba:text-primary-foreground hover:gba:bg-primary/90'
                            : 'gba:bg-accent hover:gba:bg-accent/90'
                        }`}
                        data-testid={`${prefixDataTestId}-screen-share-btn`}
                        aria-label={
                          callState.isScreenSharing
                            ? t('chat-stopSharing') || 'Stop sharing'
                            : t('chat-shareScreen') || 'Share screen'
                        }
                        title={
                          callState.isScreenSharing
                            ? t('chat-stopSharing') || 'Stop sharing'
                            : t('chat-shareScreen') || 'Share screen'
                        }
                      >
                        <Monitor className="gba:w-5 gba:h-5" />
                      </button>
                    )}

                    {/* Background effect button */}
                    {onToggleBackground && callState.callType === 'video' && (
                      <button
                        onClick={onToggleBackground}
                        className={`gba:p-3 gba:rounded-full gba:transition-all ${
                          callState.backgroundEnabled
                            ? 'gba:bg-primary gba:text-primary-foreground hover:gba:bg-primary/90'
                            : 'gba:bg-accent hover:gba:bg-accent/90'
                        }`}
                        data-testid={`${prefixDataTestId}-background-btn`}
                        aria-label={
                          callState.backgroundEnabled
                            ? t('groupCall-disableBackground') || 'Disable background'
                            : t('groupCall-enableBackground') || 'Enable background'
                        }
                        title={
                          callState.backgroundEnabled
                            ? t('groupCall-disableBackground') || 'Disable background'
                            : t('groupCall-enableBackground') || 'Enable background'
                        }
                      >
                        <Image className="gba:w-5 gba:h-5" />
                      </button>
                    )}
                  </div>

                  {/* Separator */}
                  <div className="gba:h-8 gba:w-px gba:bg-border/50" />

                  {/* Right: End Call Button */}
                  <button
                    onClick={onEndCall}
                    className="gba:px-6 gba:py-3 gba:rounded-full gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90 gba:transition-all gba:font-semibold gba:flex gba:items-center gba:gap-2"
                    data-testid={`${prefixDataTestId}-end-btn`}
                    aria-label={t('groupCall-endCall')}
                    title={t('groupCall-endCall')}
                  >
                    <PhoneOff className="gba:w-4 gba:h-4" />
                    <span className="gba:text-sm">{t('groupCall-endCall') || 'End call'}</span>
                  </button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>,
        document.body
      )}

      {/* Expanded screen share overlay (fullscreen view) - SEPARATE PORTAL for true fullscreen */}
      {expandedScreenShare &&
        createPortal(
          <div
            className="gba:fixed gba:inset-0 gba:z-[9999] gba:bg-black gba:flex gba:items-center gba:justify-center gba:cursor-pointer"
            onClick={() => {
              rtkDebug.log(`[RTK Modal] 🔍 Closing expanded screen share via overlay click`)
              setExpandedScreenShare(null)
            }}
            data-testid={`${prefixDataTestId}-expanded-screenshare-overlay`}
          >
            {/* Close button */}
            <button
              className="gba:absolute gba:top-4 gba:right-4 gba:p-3 gba:rounded-full gba:bg-white/10 hover:gba:bg-white/20 gba:text-white gba:transition-colors gba:z-10"
              onClick={e => {
                e.stopPropagation()
                rtkDebug.log(`[RTK Modal] 🔍 Close button clicked`)
                setExpandedScreenShare(null)
              }}
              title="Close (or click anywhere)"
              aria-label="Close expanded screen share"
              data-testid={`${prefixDataTestId}-close-expanded-btn`}
            >
              <Shrink className="gba:h-6 gba:w-6" />
            </button>

            {/* Participant name */}
            <div className="gba:absolute gba:top-4 gba:left-4 gba:bg-black/60 gba:text-white gba:px-4 gba:py-2 gba:rounded-lg gba:flex gba:items-center gba:gap-2 gba:pointer-events-none">
              <Monitor className="gba:h-4 gba:w-4" />
              <span>
                {t('chat-screenShare', { name: expandedScreenShare.peerName }) ||
                  `${expandedScreenShare.peerName} is sharing their screen`}
              </span>
            </div>

            {/* Video element - object-contain to preserve aspect ratio */}
            <video
              ref={expandedScreenShareVideoRef}
              autoPlay
              playsInline
              muted
              className="gba:max-w-full gba:max-h-full gba:object-contain gba:pointer-events-none"
            />
          </div>,
          document.body
        )}
    </>
  )
}

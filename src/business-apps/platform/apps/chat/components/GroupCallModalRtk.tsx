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
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, Minimize2, Monitor, Shrink, Maximize2 } from 'lucide-react'
import type { GroupCallParticipant, VideoQuality } from '../services/groupWebrtcClient'
import type { GroupCallUIState, PendingInvite } from '../hooks/useGroupCall'
import type { CallParticipant } from '../services/webrtcClient'
import { useChatTranslation } from '../contexts/TranslationContext'

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
    console.log(`[RTK Modal] Found screen share track in screenShareTracks for peer ${peer.name || peer.id}:`, {
      trackId: screenShareTracks[0].id,
      trackLabel: screenShareTracks[0].label,
      trackKind: screenShareTracks[0].kind
    })
    return screenShareTracks[0]
  }

  // Then check if videoTrack is actually a screen share
  if (peer.videoTrack && isVideoTrackScreenShare(peer.videoTrack)) {
    console.log(`[RTK Modal] Found screen share track in videoTrack for peer ${peer.name || peer.id}:`, {
      trackId: peer.videoTrack.id,
      trackLabel: peer.videoTrack.label,
      trackKind: peer.videoTrack.kind
    })
    return peer.videoTrack
  }

  // Debug: Log what we found
  if (peer.screenShareEnabled) {
    console.warn(`[RTK Modal] Peer ${peer.name || peer.id} has screenShareEnabled=true but no track found:`, {
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
  participants,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleMinimize,
  prefixDataTestId = 'rtk-group-call'
}) => {
  const t = useChatTranslation()
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
  const screenShareVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const [focusedScreenShareId, setFocusedScreenShareId] = useState<string | null>(null)
  const [expandedScreenShare, setExpandedScreenShare] = useState<{
    peerId: string
    peerName: string
    stream: MediaStream
  } | null>(null)

  // Get meeting object from SDK to access local tracks
  const meeting = useRealtimeKitSelector((m: any) => m)

  // Subscribe to remote participants from SDK
  const remotePeers = useRealtimeKitSelector((m: any) => {
    if (!m?.participants?.joined) return []

    try {
      const joined = Array.from(m.participants.joined.values())
      // Filter out local participant
      const peers = joined.filter((p: any) => p.id !== m.self?.id)

      // Debug: Log screen share status only when screen share is actually enabled
      peers.forEach((peer: any) => {
        if (peer.screenShareEnabled) {
          console.log(`[RTK Modal] Remote peer ${peer.name || peer.id} screen share ACTIVE:`, {
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
      console.log('[RTK Modal] 📺 Local screen share tracks found:', {
        count: screenShareTracks.length,
        trackIds: screenShareTracks.map(t => t.id),
        trackLabels: screenShareTracks.map(t => t.label),
        rawType: typeof m.self.screenShareTracks,
        rawIsArray: Array.isArray(m.self.screenShareTracks),
        rawIsMap: m.self.screenShareTracks instanceof Map,
        rawIsSet: m.self.screenShareTracks instanceof Set,
        rawKeys: m.self.screenShareTracks ? Object.keys(m.self.screenShareTracks) : []
      })
      return screenShareTracks[0]
    }

    // Also check if videoTrack is actually a screen share
    if (m.self.videoTrack && isVideoTrackScreenShare(m.self.videoTrack)) {
      return m.self.videoTrack
    }

    return null
  })

  console.log('[RTK Modal] Remote peers count:', remotePeers?.length || 0)

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
      console.log(`[RTK Modal] Checking peer ${peer.name || peer.id}:`, {
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
        console.log(`[RTK Modal] ✅ Attached stream for peer ${peer.name || peer.id}`, {
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
          console.log(`[RTK Modal] 🔄 Track changed for peer ${peer.name || peer.id}`, {
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
                console.warn(`[RTK Modal] Could not auto-play peer ${peer.name || peer.id}:`, err)
              })

              console.log(`[RTK Modal] ✅ Updated stream for peer ${peer.name || peer.id}`, {
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
        console.log(`[RTK Modal] 📺 Screen share detected for peer ${peer.name || peer.id}:`, {
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
        console.warn(`[RTK Modal] ⚠️ Screen share enabled for peer ${peer.name || peer.id} but no track found:`, {
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
        console.log(`[RTK Modal] Removed peer ${peerId} from attached set`)

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

      console.log(`[RTK Modal] Checking peer ${peer.name || peer.id} for screen share:`, {
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
        console.warn(`[RTK Modal] Peer ${peer.name || peer.id} has screenShareEnabled=true but no track found`)
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

    console.log(
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

    console.log(`[RTK Modal] Grid items built:`, {
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

  // Calculate grid layout based on item count and focused screen share
  const gridLayout = useMemo(() => {
    const itemCount = gridItems.length
    const hasFocusedScreenShare = !!focusedScreenShare
    const screenShareCount = allScreenShares.length

    console.log('[RTK Modal] Grid layout calculation:', {
      itemCount,
      hasFocusedScreenShare,
      screenShareCount,
      focusedScreenShareId
    })

    if (itemCount === 0) {
      return { cols: 1, rows: 1, focusedSpan: { col: 1, row: 1 } }
    }

    if (hasFocusedScreenShare) {
      // With focused screen share: make it 2x2, others fill remaining space
      // Adjust based on total items to ensure good layout
      if (itemCount <= 5) {
        // 1 focused (2x2) + up to 4 others = 3x3 grid
        return { cols: 3, rows: 3, focusedSpan: { col: 2, row: 2 } }
      } else if (itemCount <= 8) {
        // 1 focused (2x2) + up to 7 others = 4x3 grid
        return { cols: 4, rows: 3, focusedSpan: { col: 2, row: 2 } }
      } else if (itemCount <= 12) {
        // 1 focused (2x2) + up to 11 others = 4x4 grid
        return { cols: 4, rows: 4, focusedSpan: { col: 2, row: 2 } }
      } else {
        // Many items: 5x4 grid with focused 2x2
        return { cols: 5, rows: 4, focusedSpan: { col: 2, row: 2 } }
      }
    } else {
      // No focused screen share: standard grid
      if (itemCount <= 4) {
        return { cols: 2, rows: 2, focusedSpan: { col: 1, row: 1 } }
      } else if (itemCount <= 9) {
        return { cols: 3, rows: 3, focusedSpan: { col: 1, row: 1 } }
      } else if (itemCount <= 16) {
        return { cols: 4, rows: 4, focusedSpan: { col: 1, row: 1 } }
      } else {
        return { cols: 5, rows: 4, focusedSpan: { col: 1, row: 1 } }
      }
    }
  }, [gridItems.length, focusedScreenShare, allScreenShares.length, focusedScreenShareId])

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
        if (!videoEl) return

        const stream = new MediaStream()
        stream.addTrack(item.screenShareTrack)

        // Only update if track changed
        const currentStream = videoEl.srcObject as MediaStream
        const currentTrack = currentStream?.getVideoTracks()[0]
        if (currentTrack?.id === item.screenShareTrack.id) {
          return // Same track, no need to update
        }

        videoEl.srcObject = null
        setTimeout(() => {
          videoEl.srcObject = stream
          videoEl.muted = false
          videoEl.play().catch(err => console.warn(`[RTK Modal] Could not auto-play screen share ${item.peerId}:`, err))
        }, 10)
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
          videoEl.play().catch(err => console.warn(`[RTK Modal] Could not auto-play video ${item.peerId}:`, err))
        }, 10)
      }
    })
  }, [videoTrackIds, gridItems])

  // Expanded screen share video ref (for fullscreen overlay)
  const expandedScreenShareVideoRef = useRef<HTMLVideoElement>(null)

  // Update expanded screen share video element
  useEffect(() => {
    if (expandedScreenShareVideoRef.current && expandedScreenShare?.stream) {
      expandedScreenShareVideoRef.current.srcObject = expandedScreenShare.stream
      expandedScreenShareVideoRef.current.muted = false
      expandedScreenShareVideoRef.current.play().catch(err => {
        console.warn('[RTK Modal] Could not auto-play expanded screen share:', err)
      })
    }
  }, [expandedScreenShare])

  const isOpen =
    callState.status === 'connected' || callState.status === 'joining' || callState.status === 'reconnecting'

  if (!isOpen || callState.isMinimized) {
    return null
  }

  return createPortal(
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="gba:max-w-6xl gba:h-[80vh] gba:p-0 gba:overflow-hidden"
        data-testid={`${prefixDataTestId}-modal`}
      >
        <DialogTitle className="gba:sr-only">
          {t('chat-groupCall') || 'Group Call'} - Cloudflare Realtime Kit
        </DialogTitle>
        <DialogDescription className="gba:sr-only">
          {callState.callType === 'video' ? t('chat-videoCall') : t('chat-audioCall')} with {participants.length}{' '}
          {participants.length === 1 ? 'participant' : 'participants'}
        </DialogDescription>
        <div className="gba:flex gba:flex-col gba:h-full gba:bg-background">
          {/* Header */}
          <div className="gba:flex gba:items-center gba:justify-between gba:p-4 gba:border-b">
            <div className="gba:flex gba:items-center gba:gap-3">
              <Users className="gba:w-5 gba:h-5 gba:text-muted-foreground" />
              <div>
                <h3 className="gba:font-semibold">
                  {t('groupCall.title')} {callState.callType === 'audio' && `(${t('groupCall.audioOnly')})`}
                </h3>
                <p className="gba:text-sm gba:text-muted-foreground">
                  {formatDuration(callState.duration)} • {participants.length} {t('groupCall.participants')}
                </p>
              </div>
            </div>

            <div className="gba:flex gba:items-center gba:gap-2">
              {onToggleMinimize && (
                <button
                  onClick={onToggleMinimize}
                  className="gba:p-2 gba:rounded-lg hover:gba:bg-accent"
                  data-testid={`${prefixDataTestId}-minimize-btn`}
                  aria-label={t('groupCall.minimize')}
                >
                  <Minimize2 className="gba:w-5 gba:h-5" />
                </button>
              )}

              <button
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                className="gba:px-3 gba:py-1 gba:text-xs gba:rounded gba:bg-accent"
              >
                RTK
              </button>
            </div>
          </div>

          {/* Debug Info */}
          {showDebugInfo && (
            <div className="gba:p-2 gba:bg-info-secondary gba:text-xs gba:text-info-secondary-foreground">
              <strong>Cloudflare Realtime Kit</strong> • SFU Architecture • Meeting ID:{' '}
              {callState.roomId?.substring(0, 8)}...
            </div>
          )}

          {/* Main Content Area - Unified Grid Layout */}
          <div className="gba:flex-1 gba:p-4 gba:bg-muted/30 gba:overflow-hidden">
            {gridItems.length === 0 ? (
              <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:rounded-lg gba:bg-muted gba:text-muted-foreground">
                <div className="gba:text-center">
                  <Users className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-2" />
                  <p>{t('groupCall.waitingForParticipants')}</p>
                </div>
              </div>
            ) : (
              <div
                className="gba:h-full gba:grid gba:gap-3"
                style={{
                  gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
                  gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`
                }}
              >
                {gridItems.map(item => {
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
                            className="gba:w-full gba:h-full gba:object-contain gba:bg-black"
                            data-testid={`${prefixDataTestId}-screenshare-${item.peerId}`}
                            onClick={() => {
                              // Click to focus/unfocus this screen share
                              if (isFocused && allScreenShares.length > 1) {
                                // Unfocus: focus on next screen share
                                const currentIndex = allScreenShares.findIndex(s => s.peerId === item.peerId)
                                const nextIndex = (currentIndex + 1) % allScreenShares.length
                                setFocusedScreenShareId(allScreenShares[nextIndex].peerId)
                              } else if (!isFocused) {
                                // Focus this screen share
                                setFocusedScreenShareId(item.peerId)
                              } else {
                                // Click focused screen share to expand to fullscreen
                                const stream = new MediaStream()
                                stream.addTrack(item.screenShareTrack!)
                                setExpandedScreenShare({
                                  peerId: item.peerId,
                                  peerName: item.peerName,
                                  stream
                                })
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
                            {isFocused && allScreenShares.length > 1 && (
                              <span className="gba:ml-1 gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-primary-foreground/20 gba:text-primary-foreground gba:text-[10px] gba:font-bold">
                                FOCUSED
                              </span>
                            )}
                          </div>

                          {/* Focus button for non-focused screen shares */}
                          {!isFocused && allScreenShares.length > 1 && (
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                setFocusedScreenShareId(item.peerId)
                              }}
                              className="gba:absolute gba:top-2 gba:right-2 gba:p-2 gba:rounded-lg gba:bg-primary/90 hover:gba:bg-primary gba:text-primary-foreground gba:transition-colors gba:shadow-lg"
                              title="Focus this screen share"
                              data-testid={`${prefixDataTestId}-focus-screenshare-${item.peerId}`}
                            >
                              <Maximize2 className="gba:w-4 gba:h-4" />
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
                            className={item.hasVideoTrack ? 'gba:w-full gba:h-full gba:object-cover' : 'gba:hidden'}
                            data-testid={`${prefixDataTestId}-video-${item.peerId}`}
                          />

                          {/* Show avatar when no video but has audio */}
                          {!item.hasVideoTrack && item.hasAudioTrack && (
                            <Avatar className="gba:w-24 gba:h-24">
                              <AvatarFallback className="gba:text-2xl">{getInitials(item.peerName)}</AvatarFallback>
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
            )}
          </div>

          {/* Controls */}
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-4 gba:p-6 gba:border-t">
            {/* Mute button */}
            <button
              onClick={onToggleMute}
              className={`gba:p-4 gba:rounded-full gba:transition-colors ${
                callState.isMuted
                  ? 'gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90'
                  : 'gba:bg-accent hover:gba:bg-accent/80'
              }`}
              data-testid={`${prefixDataTestId}-mute-btn`}
              aria-label={callState.isMuted ? t('groupCall.unmute') : t('groupCall.mute')}
            >
              {callState.isMuted ? <MicOff className="gba:w-6 gba:h-6" /> : <Mic className="gba:w-6 gba:h-6" />}
            </button>

            {/* Video toggle button */}
            {callState.callType === 'video' && (
              <button
                onClick={onToggleVideo}
                className={`gba:p-4 gba:rounded-full gba:transition-colors ${
                  !callState.isVideoEnabled
                    ? 'gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90'
                    : 'gba:bg-accent hover:gba:bg-accent/80'
                }`}
                data-testid={`${prefixDataTestId}-video-btn`}
                aria-label={callState.isVideoEnabled ? t('groupCall.turnOffVideo') : t('groupCall.turnOnVideo')}
              >
                {callState.isVideoEnabled ? (
                  <Video className="gba:w-6 gba:h-6" />
                ) : (
                  <VideoOff className="gba:w-6 gba:h-6" />
                )}
              </button>
            )}

            {/* Screen share button */}
            {onToggleScreenShare && (
              <button
                onClick={onToggleScreenShare}
                className={`gba:p-4 gba:rounded-full gba:transition-colors ${
                  callState.isScreenSharing
                    ? 'gba:bg-primary gba:text-primary-foreground hover:gba:bg-primary/90'
                    : 'gba:bg-accent hover:gba:bg-accent/80'
                }`}
                data-testid={`${prefixDataTestId}-screen-share-btn`}
                aria-label={
                  callState.isScreenSharing
                    ? t('chat-stopSharing') || 'Stop sharing screen'
                    : t('chat-shareScreen') || 'Share screen'
                }
                title={
                  callState.isScreenSharing
                    ? t('chat-stopSharing') || 'Stop sharing screen'
                    : t('chat-shareScreen') || 'Share screen'
                }
              >
                <Monitor className="gba:w-6 gba:h-6" />
              </button>
            )}

            {/* End call button */}
            <button
              onClick={onEndCall}
              className="gba:p-4 gba:rounded-full gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90 gba:transition-colors"
              data-testid={`${prefixDataTestId}-end-btn`}
              aria-label={t('groupCall.endCall')}
            >
              <PhoneOff className="gba:w-6 gba:h-6" />
            </button>
          </div>
        </div>

        {/* Expanded screen share overlay (fullscreen view) */}
        {expandedScreenShare && (
          <div
            className="gba:fixed gba:inset-0 gba:z-50 gba:bg-black gba:flex gba:items-center gba:justify-center gba:cursor-pointer"
            onClick={() => setExpandedScreenShare(null)}
          >
            {/* Close button */}
            <button
              className="gba:absolute gba:top-4 gba:right-4 gba:p-3 gba:rounded-full gba:bg-white/10 hover:gba:bg-white/20 gba:text-white gba:transition-colors gba:z-10"
              onClick={e => {
                e.stopPropagation()
                setExpandedScreenShare(null)
              }}
              title="Close"
              aria-label="Close expanded screen share"
            >
              <Shrink className="gba:h-6 gba:w-6" />
            </button>

            {/* Participant name */}
            <div className="gba:absolute gba:top-4 gba:left-4 gba:bg-black/60 gba:text-white gba:px-4 gba:py-2 gba:rounded-lg gba:flex gba:items-center gba:gap-2">
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
              className="gba:max-w-full gba:max-h-full gba:object-contain"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>,
    document.body
  )
}

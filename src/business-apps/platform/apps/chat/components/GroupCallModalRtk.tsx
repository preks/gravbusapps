/**
 * GroupCallModalRtk - Modal for Realtime Kit group video/audio calls
 *
 * This component uses Cloudflare Realtime Kit SDK to render remote participants
 * and handle media streaming through SFU infrastructure.
 *
 * Phase 2: Full SDK integration with remote video/audio rendering
 */

import React, { useEffect, useRef, useState } from 'react'
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
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, Minimize2 } from 'lucide-react'
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

export const GroupCallModalRtk: React.FC<GroupCallModalRtkProps> = ({
  callState,
  localStream,
  participants,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onToggleMinimize,
  prefixDataTestId = 'rtk-group-call'
}) => {
  const t = useChatTranslation()
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
  const [showDebugInfo, setShowDebugInfo] = useState(false)

  // Subscribe to remote participants from SDK
  const remotePeers = useRealtimeKitSelector((m: any) => {
    if (!m?.participants?.joined) return []

    try {
      const joined = Array.from(m.participants.joined.values())
      // Filter out local participant
      return joined.filter((p: any) => p.id !== m.self?.id)
    } catch {
      return []
    }
  })

  console.log('[RTK Modal] Remote peers count:', remotePeers?.length || 0)

  // Auto-play local stream (set once, srcObject stays the same)
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
      console.log('[RTK Modal] Set local video srcObject')
    }
  }, [localStream])

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

      console.log(`[RTK Modal] Checking peer ${peer.name || peer.id}:`, {
        hasVideoElement: !!videoElement,
        hasVideoTrack: !!peer.videoTrack,
        hasAudioTrack: !!peer.audioTrack,
        videoTrackEnabled: peer.videoTrack?.enabled,
        audioTrackEnabled: peer.audioTrack?.enabled,
        videoEnabled: peer.videoEnabled,
        audioEnabled: peer.audioEnabled,
        isAttached,
        videoTrackId: peer.videoTrack?.id,
        audioTrackId: peer.audioTrack?.id
      })

      // Only attach if we haven't attached this peer yet
      if (videoElement && (peer.videoTrack || peer.audioTrack) && !isAttached) {
        const stream = new MediaStream()
        if (peer.videoTrack) stream.addTrack(peer.videoTrack)
        if (peer.audioTrack) stream.addTrack(peer.audioTrack)

        videoElement.srcObject = stream
        attachedPeersRef.current.add(peer.id)
        console.log(`[RTK Modal] ✅ Attached stream for peer ${peer.name || peer.id}`, {
          hasVideo: !!peer.videoTrack,
          hasAudio: !!peer.audioTrack
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

        const videoTrackChanged = currentVideoTrack?.id !== peer.videoTrack?.id
        const audioTrackChanged = currentAudioTrack?.id !== peer.audioTrack?.id

        // Update stream if ANY track changed
        if (videoTrackChanged || audioTrackChanged) {
          console.log(`[RTK Modal] 🔄 Track changed for peer ${peer.name || peer.id}`, {
            videoChanged: videoTrackChanged,
            audioChanged: audioTrackChanged,
            oldVideoId: currentVideoTrack?.id,
            newVideoId: peer.videoTrack?.id,
            oldAudioId: currentAudioTrack?.id,
            newAudioId: peer.audioTrack?.id
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
          if (peer.videoTrack) newStream.addTrack(peer.videoTrack)
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
                hasVideo: !!peer.videoTrack,
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
  }, [remotePeers])

  // Cleanup all debounce timers on unmount
  useEffect(() => {
    return () => {
      trackUpdateTimersRef.current.forEach(timer => clearTimeout(timer))
      trackUpdateTimersRef.current.clear()
    }
  }, [])

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

          {/* Video Grid */}
          <div className="gba:flex-1 gba:p-4 gba:bg-muted/30 gba:overflow-hidden">
            <div
              className={`gba:h-full gba:grid gba:gap-4 ${
                remotePeers && remotePeers.length > 0
                  ? remotePeers.length === 1
                    ? 'gba:grid-cols-2'
                    : remotePeers.length <= 4
                      ? 'gba:grid-cols-2'
                      : 'gba:grid-cols-3'
                  : 'gba:grid-cols-2'
              }`}
            >
              {/* Local Video */}
              <div className="gba:relative gba:rounded-lg gba:overflow-hidden gba:bg-muted">
                {callState.isVideoEnabled && localStream ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="gba:w-full gba:h-full gba:object-cover"
                    data-testid={`${prefixDataTestId}-local-video`}
                  />
                ) : (
                  <div className="gba:w-full gba:h-full gba:flex gba:items-center gba:justify-center gba:bg-muted">
                    <Avatar className="gba:w-24 gba:h-24">
                      <AvatarFallback className="gba:text-2xl">
                        {getInitials(participants[0]?.odName || 'You')}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}

                {/* Name overlay */}
                <div className="gba:absolute gba:bottom-2 gba:left-2 gba:px-2 gba:py-1 gba:rounded gba:bg-black/70 gba:text-white gba:text-sm">
                  {participants[0]?.odName || 'You'} (you) {callState.isMuted && '🔇'}
                </div>
              </div>

              {/* Remote Participants from SDK */}
              {remotePeers && remotePeers.length > 0 ? (
                remotePeers.map((peer: any) => (
                  <div
                    key={peer.id}
                    className="gba:relative gba:rounded-lg gba:overflow-hidden gba:bg-muted"
                    data-testid={`${prefixDataTestId}-remote-${peer.id}`}
                  >
                    {peer.videoEnabled && peer.videoTrack ? (
                      <video
                        ref={el => {
                          if (el) {
                            remoteVideoRefs.current.set(peer.id, el)
                          }
                        }}
                        autoPlay
                        playsInline
                        className="gba:w-full gba:h-full gba:object-cover"
                      />
                    ) : (
                      <div className="gba:w-full gba:h-full gba:flex gba:items-center gba:justify-center gba:bg-muted">
                        <Avatar className="gba:w-24 gba:h-24">
                          <AvatarFallback className="gba:text-2xl">
                            {getInitials(peer.name || peer.displayName || 'User')}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    )}

                    {/* Name overlay */}
                    <div className="gba:absolute gba:bottom-2 gba:left-2 gba:px-2 gba:py-1 gba:rounded gba:bg-black/70 gba:text-white gba:text-sm">
                      {(() => {
                        const displayName = peer.name || peer.displayName || peer.customParticipantId || 'Unknown'
                        console.log('[RTK Modal] Peer display info:', {
                          peerId: peer.id,
                          name: peer.name,
                          displayName: peer.displayName,
                          customParticipantId: peer.customParticipantId,
                          userId: peer.userId,
                          chosen: displayName
                        })
                        return displayName
                      })()}{' '}
                      {!peer.audioEnabled && '🔇'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="gba:flex gba:items-center gba:justify-center gba:rounded-lg gba:bg-muted gba:text-muted-foreground">
                  <div className="gba:text-center">
                    <Users className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-2" />
                    <p>{t('groupCall.waitingForParticipants')}</p>
                  </div>
                </div>
              )}
            </div>
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
      </DialogContent>
    </Dialog>,
    document.body
  )
}

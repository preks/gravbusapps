/**
 * GroupCallModal - Modal for group video/audio calls
 *
 * Displays multiple participants in a responsive grid layout.
 * Supports up to 4-5 participants comfortably.
 */

import React, { useEffect, useRef, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Dialog,
  DialogContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@newwork/nw-design-system'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  Users,
  Maximize2,
  Minimize2,
  Expand,
  Shrink,
  Settings,
  Signal,
  SignalHigh,
  SignalMedium,
  SignalLow,
  Check,
  ImageIcon,
  Crown,
  UserPlus
} from 'lucide-react'
import type { GroupCallParticipant, VideoQuality } from '../services/groupWebrtcClient'
import type { GroupCallUIState } from '../hooks/useGroupCall'
import type { CallParticipant } from '../services/webrtcClient'

interface AvailableParticipant {
  id: string
  odId: string
  odName: string
  avatarUrl?: string
}

interface GroupCallModalProps {
  callState: GroupCallUIState
  localStream: MediaStream | null
  remoteStreams: Map<string, MediaStream>
  participants: GroupCallParticipant[]
  onEndCall: () => void
  onToggleMute: () => void
  onToggleVideo: () => void
  onToggleScreenShare: () => void
  onSetVideoQuality?: (quality: VideoQuality) => void
  onToggleMinimize?: () => void
  onToggleBackground?: () => void
  backgroundEnabled?: boolean
  prefixDataTestId?: string
  // For adding participants to the call
  availableParticipants?: AvailableParticipant[]
  onInviteParticipant?: (participant: CallParticipant) => void
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

// Calculate grid layout based on participant count
const getGridLayout = (count: number): { cols: number; rows: number } => {
  if (count <= 1) return { cols: 1, rows: 1 }
  if (count === 2) return { cols: 2, rows: 1 }
  if (count <= 4) return { cols: 2, rows: 2 }
  if (count <= 6) return { cols: 3, rows: 2 }
  return { cols: 3, rows: 3 } // Max 9 in grid
}

// Check if a stream is a screen share (not a camera)
const isScreenShareStream = (stream: MediaStream | null): boolean => {
  if (!stream) return false
  const videoTrack = stream.getVideoTracks()[0]
  if (!videoTrack) return false

  // Check track label for screen share indicators
  const label = videoTrack.label.toLowerCase()
  if (label.includes('screen') || label.includes('window') || label.includes('tab') || label.includes('display')) {
    return true
  }

  // Check track settings for displaySurface (Chrome)
  const settings = videoTrack.getSettings?.()
  if (settings && 'displaySurface' in settings) {
    return true
  }

  return false
}

// Video tile component for each participant
const VideoTile: React.FC<{
  participant: GroupCallParticipant
  stream: MediaStream | null
  isLocal?: boolean
  isMuted?: boolean
  isVideoOff?: boolean
  isHost?: boolean
  onExpand?: () => void
  isScreenShare?: boolean
}> = ({
  participant,
  stream,
  isLocal = false,
  isMuted = false,
  isVideoOff = false,
  isHost = false,
  onExpand,
  isScreenShare = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Check if video should be visible
  const hasVideo = stream?.getVideoTracks().some(t => t.enabled) && !isVideoOff

  // Set up stream and play video - runs when stream changes OR when hasVideo becomes true
  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement || !stream || !hasVideo) return

    console.debug(
      `VideoTile ${participant.odName}: Setting stream with ${stream.getTracks().length} tracks, isLocal=${isLocal}, hasVideo=${hasVideo}`
    )

    // Always set srcObject when this effect runs (including after video is toggled back on)
    videoElement.srcObject = stream

    // Handle autoplay - browsers may block autoplay with audio
    const playVideo = async () => {
      try {
        await videoElement.play()
        console.debug(`VideoTile ${participant.odName}: Video playing successfully`)
      } catch (err) {
        console.warn(`VideoTile ${participant.odName}: Autoplay failed, trying muted:`, err)
        // If autoplay fails, try muted first then unmute
        videoElement.muted = true
        try {
          await videoElement.play()
          // For remote streams, unmute after play starts (user has interacted)
          if (!isLocal) {
            videoElement.muted = false
          }
          console.debug(`VideoTile ${participant.odName}: Video playing after mute workaround`)
        } catch (err2) {
          console.error(`VideoTile ${participant.odName}: Failed to play video:`, err2)
        }
      }
    }

    playVideo()
  }, [stream, participant.odName, isLocal, hasVideo])

  const canExpand = hasVideo && onExpand

  return (
    <div
      className={`gba:relative gba:bg-muted gba:rounded-lg gba:overflow-hidden gba:aspect-video gba:flex gba:items-center gba:justify-center ${canExpand ? 'gba:cursor-pointer gba:group' : ''}`}
      onClick={canExpand ? onExpand : undefined}
    >
      {hasVideo ? (
        <div className="gba:relative gba:w-full gba:h-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className={`gba:w-full gba:h-full ${isScreenShare ? 'gba:object-contain gba:bg-black' : 'gba:object-cover'} ${isLocal && !isScreenShare ? 'gba:-scale-x-100' : ''}`}
          />
          {/* Expand indicator for screen shares */}
          {canExpand && (
            <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:bg-black/0 group-hover:gba:bg-black/30 gba:transition-colors">
              <div className="gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:bg-black/60 gba:rounded-full gba:p-3">
                <Expand className="gba:h-6 gba:w-6 gba:text-white" />
              </div>
            </div>
          )}
          {/* Screen share badge */}
          {isScreenShare && (
            <div className="gba:absolute gba:top-2 gba:left-2 gba:bg-primary gba:text-white gba:text-xs gba:px-2 gba:py-1 gba:rounded-full gba:flex gba:items-center gba:gap-1">
              <Monitor className="gba:h-3 gba:w-3" />
              <span>Screen</span>
            </div>
          )}
        </div>
      ) : (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
          <Avatar className="gba:h-20 gba:w-20 gba:border-2 gba:border-background gba:shadow-lg">
            {participant.avatarUrl && <AvatarImage src={participant.avatarUrl} alt={participant.odName} />}
            <AvatarFallback className="gba:text-2xl gba:bg-primary/20">
              {getInitials(participant.odName)}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Participant name overlay */}
      <div className="gba:absolute gba:bottom-0 gba:left-0 gba:right-0 gba:bg-gradient-to-t gba:from-black/60 gba:to-transparent gba:p-2">
        <div className="gba:flex gba:items-center gba:gap-2">
          {isHost && <Crown className="gba:h-3 gba:w-3 gba:text-yellow-400" title="Host" />}
          <span className="gba:text-white gba:text-sm gba:font-medium gba:truncate">
            {participant.odName}
            {isLocal && ' (You)'}
          </span>
          {isMuted && <MicOff className="gba:h-3 gba:w-3 gba:text-red-400" />}
        </div>
      </div>

      {/* Connection status indicator */}
      {!isLocal && participant.connectionState && participant.connectionState !== 'connected' && (
        <div className="gba:absolute gba:top-2 gba:right-2">
          <span className="gba:px-2 gba:py-1 gba:text-xs gba:bg-yellow-500/80 gba:text-white gba:rounded-full">
            {participant.connectionState === 'connecting' ? 'Connecting...' : participant.connectionState}
          </span>
        </div>
      )}
    </div>
  )
}

// Quality icons and labels
const QualityIcon: React.FC<{ quality: VideoQuality; className?: string }> = ({ quality, className }) => {
  switch (quality) {
    case 'high':
      return <SignalHigh className={className} />
    case 'medium':
      return <SignalMedium className={className} />
    case 'low':
      return <SignalLow className={className} />
    default:
      return <Signal className={className} />
  }
}

const qualityLabels: Record<VideoQuality, { label: string; description: string }> = {
  high: { label: 'High Quality', description: '720p, 30fps - Best for fast connections' },
  medium: { label: 'Medium Quality', description: '480p, 24fps - Balanced' },
  low: { label: 'Low Quality', description: '240p, 15fps - For slow connections' }
}

export const GroupCallModal: React.FC<GroupCallModalProps> = ({
  callState,
  localStream,
  remoteStreams,
  participants,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onSetVideoQuality,
  onToggleMinimize,
  onToggleBackground,
  backgroundEnabled = false,
  prefixDataTestId = 'group-call',
  availableParticipants = [],
  onInviteParticipant
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [expandedStream, setExpandedStream] = useState<{ stream: MediaStream; participantName: string } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const expandedVideoRef = useRef<HTMLVideoElement>(null)
  const pipVideoRef = useRef<HTMLVideoElement>(null)
  const pipAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())

  // Get current user from participants (the one with local stream)
  const currentUserParticipant = useMemo(() => {
    return participants.find(p => p.connectionState === 'connected' && !remoteStreams.has(p.id))
  }, [participants, remoteStreams])

  // All participants including local user
  const allParticipants = useMemo(() => {
    const result: Array<{
      participant: GroupCallParticipant
      stream: MediaStream | null
      isLocal: boolean
    }> = []

    // Add local user first
    if (currentUserParticipant) {
      result.push({
        participant: currentUserParticipant,
        stream: localStream,
        isLocal: true
      })
    }

    // Add remote participants
    participants.forEach(p => {
      if (p.id !== currentUserParticipant?.id) {
        result.push({
          participant: p,
          stream: remoteStreams.get(p.id) || null,
          isLocal: false
        })
      }
    })

    return result
  }, [participants, currentUserParticipant, localStream, remoteStreams])

  const gridLayout = getGridLayout(allParticipants.length)

  // Participants from conversation who are not in the call yet
  const participantsNotInCall = useMemo(() => {
    const inCallIds = new Set(participants.map(p => p.id))
    return availableParticipants.filter(p => !inCallIds.has(p.id))
  }, [participants, availableParticipants])

  // Get first remote participant for minimized view
  const firstRemoteParticipant = useMemo(() => {
    const remote = allParticipants.find(p => !p.isLocal && p.stream)
    return remote || allParticipants.find(p => !p.isLocal) || null
  }, [allParticipants])

  // Toggle fullscreen - use internal state for reliable behavior
  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev)
  }

  // Set remote stream on PiP video when minimized (show person speaking, not self)
  useEffect(() => {
    if (callState.isMinimized && pipVideoRef.current && firstRemoteParticipant?.stream) {
      pipVideoRef.current.srcObject = firstRemoteParticipant.stream
      pipVideoRef.current.play().catch(err => console.debug('PiP video play error:', err))
    }
  }, [callState.isMinimized, firstRemoteParticipant])

  // Set expanded video stream
  useEffect(() => {
    if (expandedStream && expandedVideoRef.current) {
      expandedVideoRef.current.srcObject = expandedStream.stream
      expandedVideoRef.current.play().catch(err => console.debug('Expanded video play error:', err))
    }
  }, [expandedStream])

  // Play all remote audio streams when minimized (so user can hear others)
  useEffect(() => {
    if (!callState.isMinimized) {
      // Clean up audio elements when not minimized
      pipAudioRefs.current.forEach(audio => {
        audio.pause()
        audio.srcObject = null
      })
      pipAudioRefs.current.clear()
      return
    }

    // Create audio elements for each remote stream
    remoteStreams.forEach((stream, participantId) => {
      if (!pipAudioRefs.current.has(participantId)) {
        const audio = document.createElement('audio')
        audio.autoplay = true
        audio.srcObject = stream
        audio.play().catch(err => console.debug('Audio play error:', err))
        pipAudioRefs.current.set(participantId, audio)
      }
    })

    // Clean up removed streams
    pipAudioRefs.current.forEach((audio, participantId) => {
      if (!remoteStreams.has(participantId)) {
        audio.pause()
        audio.srcObject = null
        pipAudioRefs.current.delete(participantId)
      }
    })
  }, [callState.isMinimized, remoteStreams])

  if (callState.status === 'idle') return null

  // Minimized view - floating PiP-style window
  // Rendered as a portal to document.body so it persists even when chat component unmounts
  if (callState.isMinimized) {
    const hasRemoteVideo = firstRemoteParticipant?.stream?.getVideoTracks().some(t => t.enabled)

    const minimizedContent = (
      <div
        className="gba:fixed gba:bottom-12 gba:right-4 gba:z-50 gba:w-72 gba:bg-gray-900 gba:rounded-lg gba:shadow-2xl gba:overflow-hidden gba:border gba:border-gray-700"
        data-testid={`${prefixDataTestId}-minimized`}
      >
        {/* Mini video preview - shows remote participant */}
        <div className="gba:relative gba:aspect-video gba:bg-gray-800">
          {hasRemoteVideo ? (
            <video ref={pipVideoRef} autoPlay playsInline muted className="gba:w-full gba:h-full gba:object-cover" />
          ) : (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-2">
              {firstRemoteParticipant ? (
                <>
                  <Avatar className="gba:h-12 gba:w-12">
                    {firstRemoteParticipant.participant.avatarUrl && (
                      <AvatarImage src={firstRemoteParticipant.participant.avatarUrl} />
                    )}
                    <AvatarFallback className="gba:bg-primary/20">
                      {getInitials(firstRemoteParticipant.participant.odName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="gba:text-white gba:text-xs">{firstRemoteParticipant.participant.odName}</span>
                </>
              ) : (
                <span className="gba:text-gray-400 gba:text-xs">Waiting for participants...</span>
              )}
            </div>
          )}
          {/* Participant name overlay */}
          {firstRemoteParticipant && hasRemoteVideo && (
            <div className="gba:absolute gba:bottom-0 gba:left-0 gba:right-0 gba:bg-gradient-to-t gba:from-black/60 gba:to-transparent gba:p-2">
              <span className="gba:text-white gba:text-xs gba:truncate">
                {firstRemoteParticipant.participant.odName}
              </span>
            </div>
          )}
          {/* Participant count overlay */}
          <div className="gba:absolute gba:top-2 gba:left-2 gba:flex gba:items-center gba:gap-1 gba:bg-black/60 gba:px-2 gba:py-1 gba:rounded-full">
            <Users className="gba:h-3 gba:w-3 gba:text-white" />
            <span className="gba:text-white gba:text-xs">{participants.length}</span>
          </div>
          {/* Duration */}
          <div className="gba:absolute gba:top-2 gba:right-2 gba:bg-black/60 gba:px-2 gba:py-1 gba:rounded-full">
            <span className="gba:text-white gba:text-xs gba:font-mono">{formatDuration(callState.duration)}</span>
          </div>
        </div>

        {/* Mini controls */}
        <div className="gba:flex gba:items-center gba:justify-between gba:p-2 gba:bg-gray-800">
          <div className="gba:flex gba:items-center gba:gap-1">
            <button
              onClick={onToggleMute}
              className={`gba:p-2 gba:rounded-full gba:transition-all ${
                callState.isMuted
                  ? 'gba:bg-red-500 gba:text-white'
                  : 'gba:bg-gray-700 gba:text-white hover:gba:bg-gray-600'
              }`}
              title={callState.isMuted ? 'Unmute' : 'Mute'}
            >
              {callState.isMuted ? <MicOff className="gba:h-4 gba:w-4" /> : <Mic className="gba:h-4 gba:w-4" />}
            </button>
            <button
              onClick={onToggleVideo}
              className={`gba:p-2 gba:rounded-full gba:transition-all ${
                !callState.isVideoEnabled
                  ? 'gba:bg-red-500 gba:text-white'
                  : 'gba:bg-gray-700 gba:text-white hover:gba:bg-gray-600'
              }`}
              title={callState.isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {callState.isVideoEnabled ? (
                <Video className="gba:h-4 gba:w-4" />
              ) : (
                <VideoOff className="gba:h-4 gba:w-4" />
              )}
            </button>
          </div>
          <div className="gba:flex gba:items-center gba:gap-1">
            <button
              onClick={onToggleMinimize}
              className="gba:p-2 gba:rounded-full gba:bg-gray-700 gba:text-white hover:gba:bg-gray-600 gba:transition-all"
              title="Expand call"
            >
              <Maximize2 className="gba:h-4 gba:w-4" />
            </button>
            <button
              onClick={onEndCall}
              className="gba:p-2 gba:rounded-full gba:bg-red-500 gba:text-white hover:gba:bg-red-600 gba:transition-all"
              title="Leave call"
            >
              <PhoneOff className="gba:h-4 gba:w-4" />
            </button>
          </div>
        </div>
      </div>
    )

    // Render minimized view as portal to document.body so it persists
    // even when switching tabs or closing chat
    return createPortal(minimizedContent, document.body)
  }

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        ref={containerRef}
        className={`gba:p-0 gba:bg-gray-900 gba:border-none gba:overflow-hidden gba:flex gba:flex-col ${
          isFullscreen
            ? 'gba:fixed gba:inset-0 gba:max-w-none gba:w-screen gba:h-screen gba:rounded-none gba:translate-x-0 gba:translate-y-0'
            : 'gba:max-w-5xl gba:w-[95vw] gba:h-[85vh]'
        }`}
        data-testid={prefixDataTestId}
        showCloseButton={false}
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
        onOpenAutoFocus={e => e.preventDefault()}
      >
        {/* Header */}
        <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-gray-800/50">
          <div className="gba:flex gba:items-center gba:gap-3">
            <Users className="gba:h-5 gba:w-5 gba:text-white" />
            <span className="gba:text-white gba:font-medium">Group Call</span>
            <span className="gba:text-gray-400 gba:text-sm">
              {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </span>
            {/* Quality indicator */}
            <div className="gba:flex gba:items-center gba:gap-1 gba:text-gray-400 gba:text-xs">
              <QualityIcon quality={callState.videoQuality} className="gba:h-3 gba:w-3" />
              <span className="gba:capitalize">{callState.videoQuality}</span>
            </div>
          </div>

          <div className="gba:flex gba:items-center gba:gap-2">
            {callState.status === 'connected' && (
              <span className="gba:text-white gba:font-mono gba:text-sm">{formatDuration(callState.duration)}</span>
            )}
            {callState.status === 'joining' && (
              <span className="gba:text-yellow-400 gba:text-sm gba:animate-pulse">Connecting...</span>
            )}

            {/* Settings dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="gba:p-2 gba:rounded-lg gba:text-gray-400 hover:gba:text-white hover:gba:bg-gray-700 gba:transition-colors"
                  title="Settings"
                >
                  <Settings className="gba:h-4 gba:w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="gba:w-64">
                <DropdownMenuLabel>Video Quality</DropdownMenuLabel>
                {(['high', 'medium', 'low'] as VideoQuality[]).map(quality => (
                  <DropdownMenuItem
                    key={quality}
                    onClick={() => onSetVideoQuality?.(quality)}
                    className="gba:flex gba:items-center gba:justify-between gba:cursor-pointer"
                  >
                    <div className="gba:flex gba:flex-col">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <QualityIcon quality={quality} className="gba:h-4 gba:w-4" />
                        <span>{qualityLabels[quality].label}</span>
                      </div>
                      <span className="gba:text-xs gba:text-muted-foreground gba:ml-6">
                        {qualityLabels[quality].description}
                      </span>
                    </div>
                    {callState.videoQuality === quality && <Check className="gba:h-4 gba:w-4 gba:text-primary" />}
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />

                <DropdownMenuLabel>Background</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => onToggleBackground?.()}
                  className="gba:flex gba:items-center gba:justify-between gba:cursor-pointer"
                >
                  <div className="gba:flex gba:flex-col">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <ImageIcon className="gba:h-4 gba:w-4" />
                      <span>Branded Background</span>
                    </div>
                    <span className="gba:text-xs gba:text-muted-foreground gba:ml-6">Shows NEWWORK branding</span>
                  </div>
                  {backgroundEnabled && <Check className="gba:h-4 gba:w-4 gba:text-primary" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Minimize button */}
            {onToggleMinimize && (
              <button
                onClick={onToggleMinimize}
                className="gba:p-2 gba:rounded-lg gba:text-gray-400 hover:gba:text-white hover:gba:bg-gray-700 gba:transition-colors"
                title="Minimize call"
              >
                <Minimize2 className="gba:h-4 gba:w-4" />
              </button>
            )}

            {/* Fullscreen button */}
            <button
              onClick={toggleFullscreen}
              className="gba:p-2 gba:rounded-lg gba:text-gray-400 hover:gba:text-white hover:gba:bg-gray-700 gba:transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Shrink className="gba:h-4 gba:w-4" /> : <Expand className="gba:h-4 gba:w-4" />}
            </button>
          </div>
        </div>

        {/* Video Grid */}
        <div className="gba:flex-1 gba:p-3 gba:overflow-hidden">
          <div
            className="gba:h-full gba:grid gba:gap-2"
            style={{
              gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
              gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`
            }}
          >
            {allParticipants.map(({ participant, stream, isLocal }) => {
              const isScreenShare = isScreenShareStream(stream)
              return (
                <VideoTile
                  key={participant.id}
                  participant={participant}
                  stream={stream}
                  isLocal={isLocal}
                  isMuted={isLocal ? callState.isMuted : false}
                  isVideoOff={isLocal ? !callState.isVideoEnabled : false}
                  isHost={participant.id === callState.hostId}
                  isScreenShare={isScreenShare}
                  onExpand={
                    stream ? () => setExpandedStream({ stream, participantName: participant.odName }) : undefined
                  }
                />
              )
            })}

            {/* Empty slots placeholder */}
            {allParticipants.length === 0 && (
              <div className="gba:flex gba:items-center gba:justify-center gba:text-gray-500">
                <span>Waiting for participants...</span>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="gba:flex gba:items-center gba:justify-center gba:gap-4 gba:p-4 gba:bg-gray-800/50">
          {/* Mute button */}
          <button
            onClick={onToggleMute}
            className={`gba:p-4 gba:rounded-full gba:transition-all ${
              callState.isMuted
                ? 'gba:bg-red-500 hover:gba:bg-red-600 gba:text-white'
                : 'gba:bg-gray-700 hover:gba:bg-gray-600 gba:text-white'
            }`}
            title={callState.isMuted ? 'Unmute' : 'Mute'}
            data-testid={`${prefixDataTestId}-mute-btn`}
          >
            {callState.isMuted ? <MicOff className="gba:h-6 gba:w-6" /> : <Mic className="gba:h-6 gba:w-6" />}
          </button>

          {/* Video button */}
          <button
            onClick={onToggleVideo}
            className={`gba:p-4 gba:rounded-full gba:transition-all ${
              !callState.isVideoEnabled
                ? 'gba:bg-red-500 hover:gba:bg-red-600 gba:text-white'
                : 'gba:bg-gray-700 hover:gba:bg-gray-600 gba:text-white'
            }`}
            title={callState.isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            data-testid={`${prefixDataTestId}-video-btn`}
          >
            {callState.isVideoEnabled ? (
              <Video className="gba:h-6 gba:w-6" />
            ) : (
              <VideoOff className="gba:h-6 gba:w-6" />
            )}
          </button>

          {/* Screen share button */}
          <button
            onClick={onToggleScreenShare}
            className={`gba:p-4 gba:rounded-full gba:transition-all ${
              callState.isScreenSharing
                ? 'gba:bg-primary hover:gba:bg-primary/90 gba:text-white'
                : 'gba:bg-gray-700 hover:gba:bg-gray-600 gba:text-white'
            }`}
            title={callState.isScreenSharing ? 'Stop sharing' : 'Share screen'}
            data-testid={`${prefixDataTestId}-screen-share-btn`}
          >
            <Monitor className="gba:h-6 gba:w-6" />
          </button>

          {/* Add participant button */}
          {onInviteParticipant && participantsNotInCall.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="gba:p-4 gba:rounded-full gba:bg-gray-700 hover:gba:bg-gray-600 gba:text-white gba:transition-all gba:relative"
                  title="Add participant"
                  data-testid={`${prefixDataTestId}-add-participant-btn`}
                >
                  <UserPlus className="gba:h-6 gba:w-6" />
                  <span className="gba:absolute gba:-top-1 gba:-right-1 gba:bg-primary gba:text-white gba:text-xs gba:rounded-full gba:w-5 gba:h-5 gba:flex gba:items-center gba:justify-center">
                    {participantsNotInCall.length}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="gba:w-64 gba:max-h-64 gba:overflow-y-auto">
                <DropdownMenuLabel>Add to call</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {participantsNotInCall.map(participant => (
                  <DropdownMenuItem
                    key={participant.id}
                    onClick={() =>
                      onInviteParticipant({
                        id: participant.id,
                        odId: participant.odId,
                        odName: participant.odName,
                        avatarUrl: participant.avatarUrl
                      })
                    }
                    className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer"
                  >
                    <Avatar className="gba:h-8 gba:w-8">
                      {participant.avatarUrl ? (
                        <AvatarImage src={participant.avatarUrl} alt={participant.odName} />
                      ) : null}
                      <AvatarFallback className="gba:text-xs">{getInitials(participant.odName)}</AvatarFallback>
                    </Avatar>
                    <span className="gba:truncate">{participant.odName}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* End call button */}
          <button
            onClick={onEndCall}
            className="gba:p-4 gba:rounded-full gba:bg-red-500 hover:gba:bg-red-600 gba:text-white gba:transition-all gba:ml-4"
            title="Leave call"
            data-testid={`${prefixDataTestId}-end-btn`}
          >
            <PhoneOff className="gba:h-6 gba:w-6" />
          </button>
        </div>

        {/* Expanded stream overlay */}
        {expandedStream && (
          <div
            className="gba:fixed gba:inset-0 gba:z-50 gba:bg-black gba:flex gba:items-center gba:justify-center gba:cursor-pointer"
            onClick={() => setExpandedStream(null)}
          >
            {/* Close button */}
            <button
              className="gba:absolute gba:top-4 gba:right-4 gba:p-3 gba:rounded-full gba:bg-white/10 hover:gba:bg-white/20 gba:text-white gba:transition-colors gba:z-10"
              onClick={e => {
                e.stopPropagation()
                setExpandedStream(null)
              }}
              title="Close"
            >
              <Shrink className="gba:h-6 gba:w-6" />
            </button>

            {/* Participant name */}
            <div className="gba:absolute gba:top-4 gba:left-4 gba:bg-black/60 gba:text-white gba:px-4 gba:py-2 gba:rounded-lg gba:flex gba:items-center gba:gap-2">
              <Monitor className="gba:h-4 gba:w-4" />
              <span>{expandedStream.participantName}'s screen</span>
            </div>

            {/* Video element - object-contain to preserve aspect ratio */}
            <video
              ref={expandedVideoRef}
              autoPlay
              playsInline
              className="gba:max-w-full gba:max-h-full gba:object-contain"
            />

            {/* Click hint */}
            <div className="gba:absolute gba:bottom-4 gba:left-1/2 gba:-translate-x-1/2 gba:text-white/60 gba:text-sm">
              Click anywhere to close
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

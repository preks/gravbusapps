/**
 * GroupCallModal - Modal for group video/audio calls
 *
 * Displays multiple participants in a responsive grid layout.
 * Supports up to 4-5 participants comfortably.
 */

import React, { useEffect, useRef, useMemo } from 'react'
import { Dialog, DialogContent, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, Users, Maximize2, Minimize2 } from 'lucide-react'
import type { GroupCallParticipant } from '../services/groupWebrtcClient'
import type { GroupCallUIState } from '../hooks/useGroupCall'

interface GroupCallModalProps {
  callState: GroupCallUIState
  localStream: MediaStream | null
  remoteStreams: Map<string, MediaStream>
  participants: GroupCallParticipant[]
  onEndCall: () => void
  onToggleMute: () => void
  onToggleVideo: () => void
  onToggleScreenShare: () => void
  prefixDataTestId?: string
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

// Video tile component for each participant
const VideoTile: React.FC<{
  participant: GroupCallParticipant
  stream: MediaStream | null
  isLocal?: boolean
  isMuted?: boolean
  isVideoOff?: boolean
}> = ({ participant, stream, isLocal = false, isMuted = false, isVideoOff = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  const hasVideo = stream?.getVideoTracks().some(t => t.enabled) && !isVideoOff

  return (
    <div className="gba:relative gba:bg-muted gba:rounded-lg gba:overflow-hidden gba:aspect-video gba:flex gba:items-center gba:justify-center">
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`gba:w-full gba:h-full gba:object-cover ${isLocal ? 'gba:-scale-x-100' : ''}`}
        />
      ) : (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
          <Avatar className="gba:h-20 gba:w-20 gba:border-2 gba:border-background">
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

export const GroupCallModal: React.FC<GroupCallModalProps> = ({
  callState,
  localStream,
  remoteStreams,
  participants,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  prefixDataTestId = 'group-call'
}) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  if (callState.status === 'idle') return null

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        ref={containerRef}
        className="gba:max-w-5xl gba:w-[95vw] gba:h-[85vh] gba:p-0 gba:bg-gray-900 gba:border-none gba:overflow-hidden gba:flex gba:flex-col"
        data-testid={prefixDataTestId}
      >
        {/* Header */}
        <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-gray-800/50">
          <div className="gba:flex gba:items-center gba:gap-3">
            <Users className="gba:h-5 gba:w-5 gba:text-white" />
            <span className="gba:text-white gba:font-medium">Group Call</span>
            <span className="gba:text-gray-400 gba:text-sm">
              {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="gba:flex gba:items-center gba:gap-3">
            {callState.status === 'connected' && (
              <span className="gba:text-white gba:font-mono gba:text-sm">{formatDuration(callState.duration)}</span>
            )}
            {callState.status === 'joining' && (
              <span className="gba:text-yellow-400 gba:text-sm gba:animate-pulse">Connecting...</span>
            )}
            <button
              onClick={toggleFullscreen}
              className="gba:p-2 gba:rounded-lg gba:text-gray-400 hover:gba:text-white hover:gba:bg-gray-700 gba:transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="gba:h-4 gba:w-4" /> : <Maximize2 className="gba:h-4 gba:w-4" />}
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
            {allParticipants.map(({ participant, stream, isLocal }) => (
              <VideoTile
                key={participant.id}
                participant={participant}
                stream={stream}
                isLocal={isLocal}
                isMuted={isLocal ? callState.isMuted : false}
                isVideoOff={isLocal ? !callState.isVideoEnabled : false}
              />
            ))}

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
      </DialogContent>
    </Dialog>
  )
}

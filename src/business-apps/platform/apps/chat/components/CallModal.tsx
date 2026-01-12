import React, { useEffect, useRef, useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
  IconAvatar,
  useTranslation
} from '@newwork/nw-design-system'
import { UserIcon, Maximize2, Minimize2, Expand, Shrink, Monitor } from 'lucide-react'
import { CallControls } from './CallControls'
import { AddParticipantDropdown } from './AddParticipantDropdown'
import type { CallState, CallParticipant } from '../services/webrtcClient'
import translations from '../_i18n'

interface AvailableParticipant {
  id: string
  odId: string
  odName: string
  avatarUrl?: string
}

interface CallModalProps {
  callState: CallState
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  onEndCall: () => void
  onToggleMute: () => void
  onToggleVideo: () => void
  onToggleScreenShare: () => void
  prefixDataTestId?: string
  // For adding participants (upgrading to group call)
  availableParticipants?: AvailableParticipant[]
  onAddParticipant?: (participant: CallParticipant) => void
  // For user search when adding participants
  accessToken?: string
  currentUserId?: string | null
}

const getInitials = (name: string): string => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

const getParticipantName = (participant: CallParticipant | null): string => {
  if (!participant) return 'Unknown'
  return participant.odName || 'Unknown'
}

const formatDuration = (startTime: number | null): string => {
  if (!startTime) return '00:00'
  const seconds = Math.floor((Date.now() - startTime) / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const CallStatusIndicator: React.FC<{
  status: CallState['status']
  error?: string | null
  t: (key: string) => string
}> = ({ status, error, t }) => {
  const getStatusText = () => {
    switch (status) {
      case 'initiating':
        return t('call-initiating')
      case 'ringing':
        return t('call-ringing')
      case 'connecting':
        return t('call-connecting')
      case 'connected':
        return null // Don't show status when connected
      case 'ended':
        return error || t('call-ended')
      case 'failed':
        return error || t('call-failed')
      default:
        return null
    }
  }

  const statusText = getStatusText()
  if (!statusText) return null

  return (
    <div className="gba:absolute gba:top-4 gba:left-0 gba:right-0 gba:text-center gba:z-10">
      <span
        className={`gba:inline-block gba:px-3 gba:py-1 gba:rounded-full gba:text-sm gba:font-medium ${
          status === 'failed' || status === 'ended'
            ? 'gba:bg-destructive/20 gba:text-destructive'
            : 'gba:bg-black/50 gba:text-white'
        }`}
      >
        {statusText}
      </span>
    </div>
  )
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

export const CallModal: React.FC<CallModalProps> = ({
  callState,
  localStream,
  remoteStream,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  prefixDataTestId = 'call-modal',
  availableParticipants = [],
  onAddParticipant,
  accessToken,
  currentUserId
}) => {
  const { t } = useTranslation(translations)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const expandedVideoRef = useRef<HTMLVideoElement>(null)
  const [duration, setDuration] = useState('00:00')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [localVideoMinimized, setLocalVideoMinimized] = useState(false)
  const [expandedStream, setExpandedStream] = useState<{ stream: MediaStream; name: string } | null>(null)

  const isVideoCall = callState.type === 'video'
  const isConnected = callState.status === 'connected'
  const remoteParticipant = callState.remoteParticipant
  const participantName = getParticipantName(remoteParticipant)

  // Check if remote stream is a screen share
  const isRemoteScreenShare = isScreenShareStream(remoteStream)

  // Participants available to add (not already in the call)
  const participantsNotInCall = useMemo(() => {
    const inCallIds = new Set<string>()
    // Add remote participant to exclusion list
    if (remoteParticipant?.id) {
      inCallIds.add(remoteParticipant.id)
    }
    return availableParticipants.filter(p => !inCallIds.has(p.id))
  }, [availableParticipants, remoteParticipant])

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // Set expanded video stream
  useEffect(() => {
    if (expandedStream && expandedVideoRef.current) {
      expandedVideoRef.current.srcObject = expandedStream.stream
      expandedVideoRef.current.play().catch(err => console.debug('Expanded video play error:', err))
    }
  }, [expandedStream])

  // Update call duration timer
  useEffect(() => {
    if (!isConnected || !callState.startTime) return

    const interval = setInterval(() => {
      setDuration(formatDuration(callState.startTime))
    }, 1000)

    return () => clearInterval(interval)
  }, [isConnected, callState.startTime])

  // Check if modal should be open
  const isOpen = callState.status !== 'idle'

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // Toggle local video size
  const toggleLocalVideoSize = () => {
    setLocalVideoMinimized(!localVideoMinimized)
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className={`gba:p-0 gba:overflow-hidden gba:bg-gray-900 ${
          isFullscreen
            ? 'gba:w-screen gba:h-screen gba:max-w-none gba:max-h-none gba:rounded-none'
            : 'gba:w-[90vw] gba:max-w-xl gba:aspect-[4/3]'
        }`}
        data-testid={prefixDataTestId}
        showCloseButton={false}
        // Prevent closing by clicking outside or pressing escape during call
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <div className="gba:relative gba:w-full gba:h-full gba:min-h-[400px] gba:flex gba:flex-col">
          {/* Call Status */}
          <CallStatusIndicator status={callState.status} error={callState.error} t={t} />

          {/* Main Video Area */}
          <div className="gba:flex-1 gba:relative gba:bg-gray-900">
            {isVideoCall && remoteStream ? (
              // Remote video (full size) - clickable to expand
              <div
                className="gba:w-full gba:h-full gba:cursor-pointer gba:group"
                onClick={() => setExpandedStream({ stream: remoteStream, name: participantName })}
              >
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={`gba:w-full gba:h-full ${isRemoteScreenShare ? 'gba:object-contain gba:bg-black' : 'gba:object-cover'}`}
                  data-testid={`${prefixDataTestId}-remote-video`}
                />
                {/* Expand indicator on hover */}
                <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:bg-black/0 group-hover:gba:bg-black/20 gba:transition-colors gba:pointer-events-none">
                  <div className="gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:bg-black/60 gba:rounded-full gba:p-3">
                    <Expand className="gba:h-6 gba:w-6 gba:text-white" />
                  </div>
                </div>
                {/* Screen share badge */}
                {isRemoteScreenShare && (
                  <div className="gba:absolute gba:top-2 gba:left-2 gba:bg-primary gba:text-white gba:text-xs gba:px-2 gba:py-1 gba:rounded-full gba:flex gba:items-center gba:gap-1">
                    <Monitor className="gba:h-3 gba:w-3" />
                    <span>Screen</span>
                  </div>
                )}
              </div>
            ) : (
              // Audio call or no video - show avatar
              <div className="gba:w-full gba:h-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-4">
                {remoteParticipant?.avatarUrl ? (
                  <Avatar className="gba:w-32 gba:h-32 gba:ring-4 gba:ring-white/20">
                    <AvatarImage src={remoteParticipant.avatarUrl} alt={participantName} />
                    <AvatarFallback className="gba:text-4xl gba:bg-gray-700 gba:text-white">
                      {getInitials(participantName)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <IconAvatar className="gba:w-32 gba:h-32 gba:bg-gray-700" label={participantName} icon={UserIcon} />
                )}
                <div className="gba:text-center">
                  <h3 className="gba:text-xl gba:font-semibold gba:text-white">{participantName}</h3>
                  {isConnected && <p className="gba:text-sm gba:text-gray-400 gba:mt-1">{duration}</p>}
                </div>
              </div>
            )}

            {/* Local Video (Picture-in-Picture) */}
            {isVideoCall && localStream && !callState.isVideoOff && (
              <div
                className={`gba:absolute gba:bottom-20 gba:right-4 gba:rounded-lg gba:overflow-hidden gba:shadow-lg gba:border-2 gba:border-white/20 gba:cursor-pointer gba:transition-all ${
                  localVideoMinimized ? 'gba:w-20 gba:h-15' : 'gba:w-40 gba:h-30'
                }`}
                onClick={toggleLocalVideoSize}
                data-testid={`${prefixDataTestId}-local-video-container`}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="gba:w-full gba:h-full gba:object-cover gba:transform gba:scale-x-[-1]"
                  data-testid={`${prefixDataTestId}-local-video`}
                />
                <div className="gba:absolute gba:top-1 gba:right-1">
                  {localVideoMinimized ? (
                    <Maximize2 className="gba:w-3 gba:h-3 gba:text-white/70" />
                  ) : (
                    <Minimize2 className="gba:w-3 gba:h-3 gba:text-white/70" />
                  )}
                </div>
              </div>
            )}

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="gba:absolute gba:top-4 gba:right-4 gba:p-2 gba:rounded-full gba:bg-black/50 gba:text-white gba:hover:bg-black/70 gba:transition-colors"
              data-testid={`${prefixDataTestId}-fullscreen-toggle`}
            >
              {isFullscreen ? <Minimize2 className="gba:w-5 gba:h-5" /> : <Maximize2 className="gba:w-5 gba:h-5" />}
            </button>

            {/* Call Duration (shown on video call when connected) */}
            {isVideoCall && isConnected && (
              <div className="gba:absolute gba:top-4 gba:left-4 gba:px-3 gba:py-1 gba:rounded-full gba:bg-black/50 gba:text-white gba:text-sm gba:font-medium">
                {duration}
              </div>
            )}
          </div>

          {/* Call Controls */}
          <div className="gba:relative">
            <CallControls
              isMuted={callState.isMuted}
              isVideoOff={callState.isVideoOff}
              isScreenSharing={callState.isScreenSharing}
              isVideoCall={isVideoCall}
              onToggleMute={onToggleMute}
              onToggleVideo={onToggleVideo}
              onToggleScreenShare={onToggleScreenShare}
              onEndCall={onEndCall}
              prefixDataTestId={`${prefixDataTestId}-controls`}
            />

            {/* Add participant button - positioned in the controls bar */}
            {onAddParticipant && accessToken && isConnected && (
              <div className="gba:absolute gba:bottom-4 gba:right-6">
                <AddParticipantDropdown
                  accessToken={accessToken}
                  currentUserId={currentUserId || null}
                  participantsInCall={remoteParticipant ? [{ id: remoteParticipant.id }] : []}
                  conversationParticipants={participantsNotInCall}
                  onAddParticipant={onAddParticipant}
                  prefixDataTestId={`${prefixDataTestId}-add-participant`}
                  size="small"
                />
              </div>
            )}
          </div>
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

            {/* Participant/stream name */}
            <div className="gba:absolute gba:top-4 gba:left-4 gba:bg-black/60 gba:text-white gba:px-4 gba:py-2 gba:rounded-lg gba:flex gba:items-center gba:gap-2">
              {isScreenShareStream(expandedStream.stream) && <Monitor className="gba:h-4 gba:w-4" />}
              <span>
                {expandedStream.name}
                {isScreenShareStream(expandedStream.stream) ? "'s screen" : ''}
              </span>
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

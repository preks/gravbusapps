import React, { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, Avatar, AvatarImage, AvatarFallback, IconAvatar } from '@newwork/nw-design-system'
import { UserIcon, Maximize2, Minimize2 } from 'lucide-react'
import { CallControls } from './CallControls'
import type { CallState, CallParticipant } from '../services/webrtcClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface CallModalProps {
  callState: CallState
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  onEndCall: () => void
  onToggleMute: () => void
  onToggleVideo: () => void
  onToggleScreenShare: () => void
  prefixDataTestId?: string
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

const CallStatusIndicator: React.FC<{ status: CallState['status']; error?: string | null }> = ({ status, error }) => {
  const getStatusText = () => {
    switch (status) {
      case 'initiating':
        return getTranslationFromI18nKeyAndLabel('call.initiating', 'Starting call...')
      case 'ringing':
        return getTranslationFromI18nKeyAndLabel('call.ringing', 'Ringing...')
      case 'connecting':
        return getTranslationFromI18nKeyAndLabel('call.connecting', 'Connecting...')
      case 'connected':
        return null // Don't show status when connected
      case 'ended':
        return error || getTranslationFromI18nKeyAndLabel('call.ended', 'Call ended')
      case 'failed':
        return error || getTranslationFromI18nKeyAndLabel('call.failed', 'Call failed')
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

export const CallModal: React.FC<CallModalProps> = ({
  callState,
  localStream,
  remoteStream,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  prefixDataTestId = 'call-modal'
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const [duration, setDuration] = useState('00:00')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [localVideoMinimized, setLocalVideoMinimized] = useState(false)

  const isVideoCall = callState.type === 'video'
  const isConnected = callState.status === 'connected'
  const remoteParticipant = callState.remoteParticipant
  const participantName = getParticipantName(remoteParticipant)

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
        // Prevent closing by clicking outside or pressing escape during call
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <div className="gba:relative gba:w-full gba:h-full gba:min-h-[400px] gba:flex gba:flex-col">
          {/* Call Status */}
          <CallStatusIndicator status={callState.status} error={callState.error} />

          {/* Main Video Area */}
          <div className="gba:flex-1 gba:relative gba:bg-gray-900">
            {isVideoCall && remoteStream ? (
              // Remote video (full size)
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="gba:w-full gba:h-full gba:object-cover"
                data-testid={`${prefixDataTestId}-remote-video`}
              />
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
        </div>
      </DialogContent>
    </Dialog>
  )
}

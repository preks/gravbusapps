/**
 * MinimizedCallView Component
 *
 * Floating PiP-style minimized call window
 * Shows a compact view with:
 * - Remote participant video/avatar
 * - Participant count
 * - Call duration
 * - Quick controls (mute, video, expand, end call)
 */

import React, { useRef, useEffect } from 'react'
import { Users, Mic, MicOff, Video, VideoOff, Maximize2, PhoneOff } from 'lucide-react'
import { Avatar, AvatarFallback } from '@newwork/nw-design-system'
import { formatDuration, getInitials } from '../../utils/callUtils'

export interface MinimizedCallViewProps {
  /** First remote participant */
  firstRemotePeer?: {
    id: string
    name?: string
    odName?: string
    avatarUrl?: string
  } | null
  /** Stream for first remote participant */
  firstRemoteStream?: MediaStream | null
  /** Total number of remote peers */
  remotePeerCount: number
  /** Call duration in seconds */
  duration: number
  /** Whether local mic is muted */
  isMuted: boolean
  /** Whether local video is enabled */
  isVideoEnabled: boolean
  /** Callback to toggle mute */
  onToggleMute: () => void
  /** Callback to toggle video */
  onToggleVideo: () => void
  /** Callback to expand/maximize */
  onExpand: () => void
  /** Callback to end call */
  onEndCall: () => void
  /** Data test ID prefix */
  prefixDataTestId?: string
  /** Translation function */
  t?: (key: string) => string
}

export const MinimizedCallView: React.FC<MinimizedCallViewProps> = ({
  firstRemotePeer,
  firstRemoteStream,
  remotePeerCount,
  duration,
  isMuted,
  isVideoEnabled,
  onToggleMute,
  onToggleVideo,
  onExpand,
  onEndCall,
  prefixDataTestId = 'rtk-group-call',
  t = (key: string) => key
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && firstRemoteStream) {
      videoRef.current.srcObject = firstRemoteStream
    }
  }, [firstRemoteStream])

  const hasRemoteVideo = firstRemoteStream?.getVideoTracks().some(t => t.enabled)

  return (
    <div
      className="gba:fixed gba:bottom-4 gba:right-4 gba:z-50 gba:w-80 gba:bg-card gba:rounded-lg gba:shadow-2xl gba:overflow-hidden gba:border"
      data-testid={`${prefixDataTestId}-minimized`}
    >
      {/* Mini video preview */}
      <div className="gba:relative gba:aspect-video gba:bg-muted">
        {hasRemoteVideo ? (
          <video ref={videoRef} autoPlay playsInline muted className="gba:w-full gba:h-full gba:object-cover" />
        ) : (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-2">
            {firstRemotePeer ? (
              <>
                <Avatar className="gba:h-12 gba:w-12">
                  <AvatarFallback className="gba:bg-primary/20">
                    {getInitials(firstRemotePeer.name || firstRemotePeer.odName || '')}
                  </AvatarFallback>
                </Avatar>
                <span className="gba:text-sm gba:text-foreground">
                  {firstRemotePeer.name || firstRemotePeer.odName}
                </span>
              </>
            ) : (
              <span className="gba:text-muted-foreground gba:text-xs">
                {t('groupCall-waitingForParticipants') || 'Waiting for participants...'}
              </span>
            )}
          </div>
        )}

        {/* Participant name overlay (when video is shown) */}
        {firstRemotePeer && hasRemoteVideo && (
          <div className="gba:absolute gba:bottom-0 gba:left-0 gba:right-0 gba:bg-gradient-to-t gba:from-black/60 gba:to-transparent gba:p-2">
            <span className="gba:text-white gba:text-xs gba:truncate">
              {firstRemotePeer.name || firstRemotePeer.odName}
            </span>
          </div>
        )}

        {/* Participant count overlay */}
        <div className="gba:absolute gba:top-2 gba:left-2 gba:flex gba:items-center gba:gap-1 gba:bg-black/60 gba:px-2 gba:py-1 gba:rounded-full">
          <Users className="gba:h-3 gba:w-3 gba:text-white" />
          <span className="gba:text-white gba:text-xs">{remotePeerCount + 1}</span>
        </div>

        {/* Duration overlay */}
        <div className="gba:absolute gba:top-2 gba:right-2 gba:bg-black/60 gba:px-2 gba:py-1 gba:rounded-full">
          <span className="gba:text-white gba:text-xs gba:font-mono">{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Mini controls */}
      <div className="gba:flex gba:items-center gba:justify-between gba:p-2 gba:bg-muted/50">
        {/* Left side - media controls */}
        <div className="gba:flex gba:items-center gba:gap-1">
          {/* Mute button */}
          <button
            onClick={onToggleMute}
            className={`gba:p-2 gba:rounded-full gba:transition-all ${
              isMuted
                ? 'gba:bg-destructive gba:text-destructive-foreground'
                : 'gba:bg-secondary gba:text-secondary-foreground hover:gba:bg-accent'
            }`}
            title={isMuted ? t('groupCall-unmute') : t('groupCall-mute')}
            data-testid={`${prefixDataTestId}-minimized-mute-btn`}
          >
            {isMuted ? <MicOff className="gba:h-4 gba:w-4" /> : <Mic className="gba:h-4 gba:w-4" />}
          </button>

          {/* Video button */}
          <button
            onClick={onToggleVideo}
            className={`gba:p-2 gba:rounded-full gba:transition-all ${
              !isVideoEnabled
                ? 'gba:bg-destructive gba:text-destructive-foreground'
                : 'gba:bg-secondary gba:text-secondary-foreground hover:gba:bg-accent'
            }`}
            title={isVideoEnabled ? t('groupCall-turnOffVideo') : t('groupCall-turnOnVideo')}
            data-testid={`${prefixDataTestId}-minimized-video-btn`}
          >
            {isVideoEnabled ? <Video className="gba:h-4 gba:w-4" /> : <VideoOff className="gba:h-4 gba:w-4" />}
          </button>
        </div>

        {/* Right side - expand & end call */}
        <div className="gba:flex gba:items-center gba:gap-1">
          {/* Expand button */}
          <button
            onClick={onExpand}
            className="gba:p-2 gba:rounded-full gba:bg-secondary gba:text-secondary-foreground hover:gba:bg-accent gba:transition-all"
            title={t('chat-fullscreen')}
            data-testid={`${prefixDataTestId}-minimized-expand-btn`}
          >
            <Maximize2 className="gba:h-4 gba:w-4" />
          </button>

          {/* End call button */}
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
    </div>
  )
}

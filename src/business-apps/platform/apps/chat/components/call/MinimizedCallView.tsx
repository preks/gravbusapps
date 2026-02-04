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

import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { rtkDebug } from '../../utils/rtkDebug'
import {
  UserIcon,
  MicrophoneIcon,
  MicrophoneSlashIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  ArrowsOutSimpleIcon,
  PhoneDisconnectIcon,
  HandIcon
} from '@phosphor-icons/react'
import { Avatar, AvatarFallback } from '@newwork/nw-design-system'
import { formatDuration, getInitials } from '../../utils/callUtils'
import { ReactionsOverlay, Reaction } from './ReactionsOverlay'

const MODAL_WIDTH = 320
const MODAL_HEIGHT = 240
const STORAGE_KEY = 'minimizedCallPosition'

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
  /** Call start timestamp (Unix ms) - used to calculate live duration */
  callStartTime: number | null
  /** Call type: 'audio' or 'video' */
  callType?: 'audio' | 'video'
  /** Whether local mic is muted */
  isMuted: boolean
  /** Whether local video is enabled */
  isVideoEnabled: boolean
  /** Whether first remote peer has raised hand */
  isHandRaised?: boolean
  /** Order number for hand raise (1-based) */
  handRaisedOrderNumber?: number
  /** Whether first remote peer is muted */
  isRemotePeerMuted?: boolean
  /** Active reactions to display for first remote peer */
  reactions?: Reaction[]
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

export const MinimizedCallView: React.FC<MinimizedCallViewProps> = React.memo(
  ({
    firstRemotePeer,
    firstRemoteStream,
    remotePeerCount,
    callStartTime,
    callType = 'video',
    isMuted,
    isVideoEnabled,
    isHandRaised = false,
    handRaisedOrderNumber,
    isRemotePeerMuted = false,
    reactions = [],
    onToggleMute,
    onToggleVideo,
    onExpand,
    onEndCall,
    prefixDataTestId = 'rtk-group-call',
    t = (key: string) => key
  }) => {
    const videoRef = useRef<HTMLVideoElement>(null)

    // Calculate live duration independently to avoid parent re-renders
    const [duration, setDuration] = useState(0)

    // Constrain position within viewport boundaries
    const constrainPosition = useCallback((x: number, y: number) => {
      const maxX = window.innerWidth - MODAL_WIDTH
      const maxY = window.innerHeight - MODAL_HEIGHT

      return {
        x: Math.max(0, Math.min(x, maxX)),
        y: Math.max(0, Math.min(y, maxY))
      }
    }, [])

    // Drag state
    const [position, setPosition] = useState(() => {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          // CRITICAL: Constrain saved position to current viewport
          return {
            x: Math.max(0, Math.min(parsed.x, window.innerWidth - MODAL_WIDTH)),
            y: Math.max(0, Math.min(parsed.y, window.innerHeight - MODAL_HEIGHT))
          }
        } catch {
          // Ignore invalid JSON
        }
      }
      // Default position: bottom-right with 16px margin
      return {
        x: window.innerWidth - MODAL_WIDTH - 16,
        y: window.innerHeight - MODAL_HEIGHT - 16
      }
    })
    const [isDragging, setIsDragging] = useState(false)
    const dragStartPos = useRef({ x: 0, y: 0, elementX: 0, elementY: 0 })

    useEffect(() => {
      if (!callStartTime) {
        setDuration(0)
        return
      }

      // Calculate initial duration
      const calculateDuration = () => Math.floor((Date.now() - callStartTime) / 1000)
      setDuration(calculateDuration())

      // Update every second
      const timer = setInterval(() => {
        setDuration(calculateDuration())
      }, 1000)

      return () => clearInterval(timer)
    }, [callStartTime])

    // Attach stream to video element
    // CRITICAL: Only update srcObject if the video track ID actually changed to prevent flicker
    useEffect(() => {
      if (!videoRef.current || !firstRemoteStream) {
        return
      }

      const videoElement = videoRef.current
      const currentStream = videoElement.srcObject as MediaStream | null
      const currentVideoTrackId = currentStream?.getVideoTracks()[0]?.id
      const newVideoTrackId = firstRemoteStream.getVideoTracks()[0]?.id

      // Only update if the video track ID is different
      if (currentVideoTrackId !== newVideoTrackId) {
        rtkDebug.log('[MinimizedCallView] Updating video stream', {
          oldTrackId: currentVideoTrackId,
          newTrackId: newVideoTrackId
        })
        videoElement.srcObject = firstRemoteStream
      } else {
        rtkDebug.log('[MinimizedCallView] Video stream already correct, skipping update')
      }
    }, [firstRemoteStream])

    // Memoize video track check to prevent unnecessary re-renders
    const hasRemoteVideo = useMemo(() => {
      return firstRemoteStream?.getVideoTracks().some(t => t.enabled) ?? false
    }, [firstRemoteStream])

    // Handle drag start
    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        // Only allow dragging from the video area, not the controls
        const target = e.target as HTMLElement
        if (target.closest('button')) {
          return
        }

        setIsDragging(true)
        dragStartPos.current = {
          x: e.clientX,
          y: e.clientY,
          elementX: position.x,
          elementY: position.y
        }
        e.preventDefault()
      },
      [position]
    )

    // Handle drag move
    const handleMouseMove = useCallback(
      (e: MouseEvent) => {
        if (!isDragging) return

        const deltaX = e.clientX - dragStartPos.current.x
        const deltaY = e.clientY - dragStartPos.current.y

        const newPosition = constrainPosition(
          dragStartPos.current.elementX + deltaX,
          dragStartPos.current.elementY + deltaY
        )

        setPosition(newPosition)
      },
      [isDragging, constrainPosition]
    )

    // Handle drag end
    const handleMouseUp = useCallback(() => {
      setIsDragging(false)
    }, [])

    // Attach/detach global mouse event listeners for dragging
    useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        return () => {
          document.removeEventListener('mousemove', handleMouseMove)
          document.removeEventListener('mouseup', handleMouseUp)
        }
      }
    }, [isDragging, handleMouseMove, handleMouseUp])

    // Persist position to localStorage
    useEffect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position))
    }, [position])

    // Handle window resize to keep modal in bounds
    useEffect(() => {
      const handleResize = () => {
        setPosition((prev: { x: number; y: number }) => constrainPosition(prev.x, prev.y))
      }

      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }, [constrainPosition])

    return (
      <div
        className="gba:fixed gba:z-50 gba:w-80 gba:bg-card gba:rounded-lg gba:shadow-2xl gba:overflow-hidden gba:border gba:select-none"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none'
        }}
        data-testid={`${prefixDataTestId}-minimized`}
      >
        {/* Mini video preview - also serves as drag handle */}
        <div className="gba:relative gba:aspect-video gba:bg-muted" onMouseDown={handleMouseDown}>
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
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <span className="gba:text-sm gba:text-foreground">
                      {firstRemotePeer.name || firstRemotePeer.odName}
                    </span>
                    {isRemotePeerMuted && (
                      <MicrophoneSlashIcon className="gba:w-3.5 gba:h-3.5 gba:text-foreground" weight="fill" />
                    )}
                  </div>
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
              <div className="gba:flex gba:items-center gba:gap-1">
                <span className="gba:text-white gba:text-xs gba:truncate">
                  {firstRemotePeer.name || firstRemotePeer.odName}
                </span>
                {isRemotePeerMuted && (
                  <MicrophoneSlashIcon className="gba:w-3.5 gba:h-3.5 gba:text-white" weight="fill" />
                )}
              </div>
            </div>
          )}

          {/* Participant count overlay */}
          <div className="gba:absolute gba:top-2 gba:left-2 gba:flex gba:items-center gba:gap-1 gba:bg-black/60 gba:px-2 gba:py-1 gba:rounded-full">
            <UserIcon className="gba:h-3 gba:w-3 gba:text-white" weight="fill" />
            <span className="gba:text-white gba:text-xs">{remotePeerCount + 1}</span>
          </div>

          {/* Duration overlay */}
          <div className="gba:absolute gba:top-2 gba:right-2 gba:bg-black/60 gba:px-2 gba:py-1 gba:rounded-full">
            <span className="gba:text-white gba:text-xs gba:font-mono">{formatDuration(duration)}</span>
          </div>

          {/* Raised hand indicator with order number */}
          {isHandRaised && (
            <div className="gba:absolute gba:bottom-2 gba:right-2 gba:px-2 gba:py-1 gba:rounded-full gba:bg-warning gba:text-warning-foreground gba:shadow-lg gba:animate-pulse gba:flex gba:items-center gba:gap-1">
              <HandIcon className="gba:h-4 gba:w-4" weight="fill" />
              {handRaisedOrderNumber !== undefined && (
                <span className="gba:text-xs gba:font-bold">{handRaisedOrderNumber}</span>
              )}
            </div>
          )}

          {/* Reactions */}
          {reactions.length > 0 && (
            <ReactionsOverlay reactions={reactions} prefixDataTestId={`${prefixDataTestId}-minimized`} />
          )}
        </div>

        {/* Mini controls */}
        <div className="gba:flex gba:items-center gba:justify-between gba:p-2 gba:bg-muted/50">
          {/* Left side - media controls */}
          <div className="gba:flex gba:items-center gba:gap-1">
            {/* Mute button */}
            <button
              onClick={onToggleMute}
              onMouseDown={e => e.stopPropagation()}
              className={`gba:p-2 gba:rounded-full gba:transition-all ${
                isMuted
                  ? 'gba:bg-destructive gba:text-destructive-foreground'
                  : 'gba:bg-secondary gba:text-secondary-foreground hover:gba:bg-accent'
              }`}
              title={isMuted ? t('groupCall-unmute') : t('groupCall-mute')}
              data-testid={`${prefixDataTestId}-minimized-mute-btn`}
            >
              {isMuted ? (
                <MicrophoneSlashIcon className="gba:h-4 gba:w-4" weight="fill" />
              ) : (
                <MicrophoneIcon className="gba:h-4 gba:w-4" weight="fill" />
              )}
            </button>

            {/* Video button - only show for video calls */}
            {callType === 'video' && (
              <button
                onClick={onToggleVideo}
                onMouseDown={e => e.stopPropagation()}
                className={`gba:p-2 gba:rounded-full gba:transition-all ${
                  !isVideoEnabled
                    ? 'gba:bg-destructive gba:text-destructive-foreground'
                    : 'gba:bg-secondary gba:text-secondary-foreground hover:gba:bg-accent'
                }`}
                title={isVideoEnabled ? t('groupCall-turnOffVideo') : t('groupCall-turnOnVideo')}
                data-testid={`${prefixDataTestId}-minimized-video-btn`}
              >
                {isVideoEnabled ? (
                  <VideoCameraIcon className="gba:h-4 gba:w-4" weight="fill" />
                ) : (
                  <VideoCameraSlashIcon className="gba:h-4 gba:w-4" weight="fill" />
                )}
              </button>
            )}
          </div>

          {/* Right side - expand & end call */}
          <div className="gba:flex gba:items-center gba:gap-1">
            {/* Expand button */}
            <button
              onClick={onExpand}
              onMouseDown={e => e.stopPropagation()}
              className="gba:p-2 gba:rounded-full gba:bg-secondary gba:text-secondary-foreground hover:gba:bg-accent gba:transition-all"
              title={t('chat-fullscreen')}
              data-testid={`${prefixDataTestId}-minimized-expand-btn`}
            >
              <ArrowsOutSimpleIcon className="gba:h-4 gba:w-4" weight="bold" />
            </button>

            {/* End call button */}
            <button
              onClick={onEndCall}
              onMouseDown={e => e.stopPropagation()}
              className="gba:p-2 gba:rounded-full gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90 gba:transition-all"
              title={t('groupCall-endCall')}
              data-testid={`${prefixDataTestId}-minimized-end-btn`}
            >
              <PhoneDisconnectIcon className="gba:h-4 gba:w-4" weight="fill" />
            </button>
          </div>
        </div>
      </div>
    )
  }
)

MinimizedCallView.displayName = 'MinimizedCallView'

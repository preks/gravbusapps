/**
 * ParticipantVideoTile Component
 *
 * Renders a single participant's video/audio/avatar in the grid
 * Supports:
 * - Screen share display with expand/focus controls
 * - Video with fallback to avatar
 * - Audio-only avatar display
 * - Raised hand indicator
 * - Reactions overlay
 * - Muted indicator
 * - Name overlay
 */

import React, { useRef, useEffect } from 'react'
import { Monitor, ArrowsOutSimple, MagnifyingGlassPlus, MicrophoneSlash, HandIcon } from '@phosphor-icons/react'
import { Avatar, AvatarFallback, AvatarImage } from '@newwork/nw-design-system'
import { getInitials } from '../../utils/callUtils'
import { ReactionsOverlay, Reaction } from './ReactionsOverlay'
import { rtkDebug } from '../../utils/rtkDebug'

export interface ParticipantVideoTileProps {
  /** Unique peer ID */
  peerId: string
  /** Display name */
  peerName: string
  /** Avatar URL for displaying user profile picture */
  avatarUrl?: string
  /** User ID for matching raised hands/reactions */
  userId?: string
  /** Custom participant ID for matching raised hands/reactions */
  customParticipantId?: string
  /** Whether this is the local user */
  isLocal: boolean
  /** Whether participant is muted */
  isMuted: boolean
  /** Whether participant has video track */
  hasVideoTrack: boolean
  /** Whether participant has audio track */
  hasAudioTrack: boolean
  /** Screen share track (if sharing) */
  screenShareTrack?: MediaStreamTrack | null
  /** Whether this screen share is focused (enlarged) */
  isFocusedScreenShare?: boolean
  /** Total number of screen shares (to show focus button) */
  totalScreenShares?: number
  /** Whether participant's hand is raised */
  isHandRaised?: boolean
  /** Order number for hand raise (1-based) */
  handRaisedOrderNumber?: number
  /** Whether participant is the active speaker */
  isActiveSpeaker?: boolean
  /** Active reactions to display */
  reactions?: Reaction[]
  /** Callback when screen share is clicked */
  onScreenShareClick?: () => void
  /** Callback when screen share focus button is clicked */
  onScreenShareFocus?: () => void
  /** Ref callback for video element */
  videoRef?: React.Ref<HTMLVideoElement>
  /** Ref callback for screen share video element */
  screenShareVideoRef?: React.Ref<HTMLVideoElement>
  /** Data test ID prefix */
  prefixDataTestId?: string
  /** Translation function */
  t?: (key: string) => string
  /** Whether the call view is minimized */
  isMinimized?: boolean
}

export const ParticipantVideoTile: React.FC<ParticipantVideoTileProps> = ({
  peerId,
  peerName,
  avatarUrl,
  userId,
  customParticipantId,
  isLocal,
  isMuted,
  hasVideoTrack,
  // hasAudioTrack - not used
  screenShareTrack,
  isFocusedScreenShare = false,
  totalScreenShares = 0,
  isHandRaised = false,
  handRaisedOrderNumber,
  isActiveSpeaker = false,
  reactions = [],
  onScreenShareClick,
  onScreenShareFocus,
  videoRef,
  screenShareVideoRef,
  prefixDataTestId = 'rtk-group-call'
  // t - not used
}) => {
  const internalScreenShareVideoRef = useRef<HTMLVideoElement>(null)

  // Use provided ref or internal ref
  const effectiveScreenShareVideoRef = screenShareVideoRef || internalScreenShareVideoRef

  // Attach screen share track to video element (only if using internal ref)
  useEffect(() => {
    // Skip if parent is handling it via screenShareVideoRef prop
    if (screenShareVideoRef) return

    const videoEl = internalScreenShareVideoRef.current
    if (videoEl && screenShareTrack) {
      const stream = new MediaStream([screenShareTrack])
      videoEl.srcObject = stream
    }
  }, [screenShareTrack, screenShareVideoRef])

  // Filter reactions for this participant
  const participantReactions = reactions.filter(
    r => r.participantId === peerId || r.participantId === userId || r.participantId === customParticipantId
  )

  // Log reaction filtering for debugging
  if (reactions.length > 0) {
    rtkDebug.log(`[RTK VideoTile] 🎨 Reaction filtering for ${peerName}:`, {
      peerName,
      peerId,
      userId,
      customParticipantId,
      totalReactions: reactions.length,
      filteredReactions: participantReactions.length,
      allReactions: reactions.map(r => ({ id: r.id, emoji: r.emoji, participantId: r.participantId })),
      matches: participantReactions.map(r => ({ id: r.id, emoji: r.emoji }))
    })
  }

  // Screen Share Tile
  if (screenShareTrack) {
    return (
      <div className="gba:relative gba:flex gba:items-center gba:justify-center gba:bg-black gba:overflow-hidden gba:rounded-lg gba:w-full gba:h-full">
        <video
          ref={effectiveScreenShareVideoRef}
          autoPlay
          playsInline
          muted
          className={`gba:w-full gba:h-full gba:object-contain gba:bg-black ${
            isFocusedScreenShare ? 'gba:cursor-zoom-in' : 'gba:cursor-pointer'
          }`}
          title={isFocusedScreenShare ? 'Click to expand fullscreen' : 'Click to focus this screen share'}
          data-testid={`${prefixDataTestId}-screenshare-${peerId}`}
          onClick={onScreenShareClick}
          onLoadedMetadata={e => {
            const video = e.target as HTMLVideoElement
            rtkDebug.log(`[RTK VideoTile] 📺 Screen share metadata loaded for ${peerName}:`, {
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              readyState: video.readyState
            })
          }}
          onLoadedData={e => {
            const video = e.target as HTMLVideoElement
            rtkDebug.log(`[RTK VideoTile] 📺 Screen share data loaded for ${peerName}:`, {
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              currentTime: video.currentTime
            })
          }}
          onError={e => {
            const video = e.target as HTMLVideoElement
            rtkDebug.error(`[RTK VideoTile] ❌ Screen share video error for ${peerName}:`, {
              error: video.error,
              readyState: video.readyState,
              networkState: video.networkState
            })
          }}
        />

        {/* Screen share label */}
        <div
          className={`gba:absolute gba:top-2 gba:left-2 gba:px-2 gba:py-1 gba:rounded gba:text-xs gba:flex gba:items-center gba:gap-1 ${
            isFocusedScreenShare ? 'gba:bg-primary gba:text-primary-foreground' : 'gba:bg-black/70 gba:text-white'
          }`}
        >
          <Monitor className="gba:w-3 gba:h-3" />
          <span className="gba:font-medium">
            {peerName} {isLocal ? '(You)' : ''}
          </span>
        </div>

        {/* Expand hint for focused screen share */}
        {isFocusedScreenShare && (
          <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:opacity-0 hover:gba:opacity-100 gba:transition-opacity gba:bg-black/40 gba:pointer-events-none">
            <div className="gba:px-3 gba:py-2 gba:rounded-lg gba:bg-black/80 gba:text-white gba:text-sm gba:flex gba:items-center gba:gap-2">
              <ArrowsOutSimple className="gba:w-4 gba:h-4" weight="bold" />
              <span>Click to expand fullscreen</span>
            </div>
          </div>
        )}

        {/* Focus button for non-focused screen shares */}
        {!isFocusedScreenShare && totalScreenShares > 1 && (
          <button
            onClick={e => {
              e.stopPropagation()
              onScreenShareFocus?.()
            }}
            className="gba:absolute gba:top-2 gba:right-2 gba:p-2 gba:rounded-lg gba:bg-primary/90 hover:gba:bg-primary gba:text-primary-foreground gba:transition-colors gba:shadow-lg"
            title="Make larger"
            data-testid={`${prefixDataTestId}-focus-screenshare-${peerId}`}
          >
            <MagnifyingGlassPlus className="gba:w-4 gba:h-4" weight="bold" />
          </button>
        )}
      </div>
    )
  }

  // Video/Audio/Avatar Tile
  return (
    <div
      className={`gba:relative gba:flex gba:items-center gba:justify-center gba:bg-muted gba:overflow-hidden gba:rounded-lg gba:w-full gba:h-full ${
        isActiveSpeaker ? 'gba:ring-4 gba:ring-primary gba:ring-offset-2 gba:ring-offset-background' : ''
      }`}
    >
      {/* Video element (or hidden for audio-only) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={hasVideoTrack ? 'gba:w-full gba:h-full gba:object-cover' : 'gba:hidden'}
        data-testid={`${prefixDataTestId}-video-${peerId}`}
        onLoadedMetadata={e => {
          const video = e.target as HTMLVideoElement
          rtkDebug.log(`[RTK VideoTile] 📹 Video metadata loaded for ${peerName}:`, {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState,
            isLocal
          })
        }}
        onLoadedData={e => {
          const video = e.target as HTMLVideoElement
          rtkDebug.log(`[RTK VideoTile] 📹 Video data loaded for ${peerName}:`, {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            currentTime: video.currentTime,
            isLocal
          })
        }}
        onError={e => {
          const video = e.target as HTMLVideoElement
          rtkDebug.error(`[RTK VideoTile] ❌ Video error for ${peerName}:`, {
            error: video.error,
            readyState: video.readyState,
            networkState: video.networkState,
            isLocal
          })
        }}
      />

      {/* Avatar (shown when no video) */}
      {!hasVideoTrack && (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:w-full gba:h-full gba:gap-1.5">
          <Avatar className="gba:w-14 gba:h-14">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={peerName} />}
            <AvatarFallback className="gba:text-lg gba:font-semibold">{getInitials(peerName)}</AvatarFallback>
          </Avatar>
          <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:font-medium gba:text-foreground gba:px-1 gba:text-center">
            <span className="gba:truncate gba:max-w-full">
              {peerName} {isLocal ? '(You)' : ''}
            </span>
            {isMuted && (
              <div className="gba:flex gba:items-center gba:justify-center gba:w-4 gba:h-4 gba:rounded-full gba:bg-destructive gba:flex-shrink-0">
                <MicrophoneSlash className="gba:w-2.5 gba:h-2.5 gba:text-destructive-foreground" weight="fill" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Name overlay (only shown when video is on) */}
      {hasVideoTrack && (
        <div className="gba:absolute gba:bottom-2 gba:left-2 gba:px-2 gba:py-1 gba:rounded gba:bg-black/70 gba:text-white gba:text-sm gba:flex gba:items-center gba:gap-1.5">
          <span>
            {peerName} {isLocal ? '(You)' : ''}
          </span>
          {isMuted && (
            <div className="gba:flex gba:items-center gba:justify-center gba:w-5 gba:h-5 gba:rounded-full gba:bg-destructive">
              <MicrophoneSlash className="gba:w-3 gba:h-3 gba:text-destructive-foreground" weight="fill" />
            </div>
          )}
        </div>
      )}

      {/* Raised hand indicator with order number */}
      {isHandRaised && (
        <div className="gba:absolute gba:top-2 gba:right-2 gba:px-2 gba:py-1 gba:rounded-full gba:bg-warning gba:text-warning-foreground gba:shadow-lg gba:animate-pulse gba:flex gba:items-center gba:gap-1">
          <HandIcon className="gba:h-5 gba:w-5" weight="fill" />
          {handRaisedOrderNumber !== undefined && (
            <span className="gba:text-sm gba:font-bold">{handRaisedOrderNumber}</span>
          )}
        </div>
      )}

      {/* Reactions */}
      {participantReactions.length > 0 && (
        <ReactionsOverlay reactions={participantReactions} prefixDataTestId={prefixDataTestId} />
      )}
    </div>
  )
}

/**
 * Memoized ParticipantVideoTile
 * Only re-renders when data props change, not when callback references change
 */
export const MemoizedParticipantVideoTile = React.memo(ParticipantVideoTile, (prevProps, nextProps) => {
  // Compare data props only (ignore function references)
  const dataPropsEqual =
    prevProps.peerId === nextProps.peerId &&
    prevProps.peerName === nextProps.peerName &&
    prevProps.userId === nextProps.userId &&
    prevProps.customParticipantId === nextProps.customParticipantId &&
    prevProps.isLocal === nextProps.isLocal &&
    prevProps.isMuted === nextProps.isMuted &&
    prevProps.hasVideoTrack === nextProps.hasVideoTrack &&
    prevProps.hasAudioTrack === nextProps.hasAudioTrack &&
    prevProps.screenShareTrack?.id === nextProps.screenShareTrack?.id &&
    prevProps.isFocusedScreenShare === nextProps.isFocusedScreenShare &&
    prevProps.totalScreenShares === nextProps.totalScreenShares &&
    prevProps.isHandRaised === nextProps.isHandRaised &&
    prevProps.handRaisedOrderNumber === nextProps.handRaisedOrderNumber &&
    prevProps.isActiveSpeaker === nextProps.isActiveSpeaker &&
    prevProps.isMinimized === nextProps.isMinimized &&
    // Compare reactions array by length and content
    prevProps.reactions?.length === nextProps.reactions?.length &&
    JSON.stringify(prevProps.reactions) === JSON.stringify(nextProps.reactions)

  // Return true if props are equal (skip re-render), false if different (re-render)
  return dataPropsEqual
})

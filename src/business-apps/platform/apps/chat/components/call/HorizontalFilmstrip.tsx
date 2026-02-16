/**
 * HorizontalFilmstrip Component
 *
 * Displays participants in a horizontal scrollable strip for presentation mode.
 * Used when screen share is active to show all participants as thumbnails.
 */

import React from 'react'
import { Reaction } from './ReactionsOverlay'
import { MemoizedParticipantVideoTile } from './ParticipantVideoTile'

export interface FilmstripParticipant {
  id: string
  peerId: string
  peerName: string
  avatarUrl?: string
  userId?: string
  customParticipantId?: string
  isLocal: boolean
  isMuted: boolean
  hasVideoTrack: boolean
  hasAudioTrack: boolean
  isHandRaised?: boolean
  handRaisedOrderNumber?: number
  isActiveSpeaker?: boolean
  type?: 'video' | 'screen-share' | 'avatar'
  screenShareTrack?: MediaStreamTrack | null
}

export interface HorizontalFilmstripProps {
  /** Array of participants to display */
  participants: FilmstripParticipant[]
  /** Callback to get video ref for each participant */
  videoRefCallback: (peerId: string, isLocal: boolean) => React.Ref<HTMLVideoElement>
  /** Callback to get screen share video ref */
  screenShareVideoRefCallback?: (peerId: string) => React.Ref<HTMLVideoElement>
  /** Active speaker peer ID for highlighting */
  activeSpeakerId?: string | null
  /** Active reactions to display */
  reactions?: Reaction[]
  /** Translation function */
  t: (key: string) => string
  /** Data test ID prefix */
  prefixDataTestId?: string
  /** Whether the call is minimized */
  isMinimized?: boolean
  /** Callback when screen share is clicked to focus it */
  onScreenShareClick?: (peerId: string) => void
}

export const HorizontalFilmstrip: React.FC<HorizontalFilmstripProps> = ({
  participants,
  videoRefCallback,
  screenShareVideoRefCallback,
  activeSpeakerId,
  reactions = [],
  t,
  prefixDataTestId = 'filmstrip',
  isMinimized = false,
  onScreenShareClick
}) => {
  if (participants.length === 0) {
    return null
  }

  return (
    <div
      className="gba:flex gba:gap-2 gba:overflow-x-auto gba:p-3 gba:bg-background/50 gba:h-full gba:items-center"
      data-testid={`${prefixDataTestId}-container`}
    >
      {participants.map(participant => {
        const isScreenShare = participant.type === 'screen-share'

        return (
          <div
            key={participant.id}
            className="gba:flex-shrink-0 gba:rounded-lg gba:overflow-hidden gba:bg-muted"
            style={{
              width: '180px',
              aspectRatio: '16/9'
            }}
            data-testid={`${prefixDataTestId}-participant-${participant.peerId}`}
          >
            <MemoizedParticipantVideoTile
              peerId={participant.peerId}
              peerName={participant.peerName}
              avatarUrl={participant.avatarUrl}
              userId={participant.userId}
              customParticipantId={participant.customParticipantId}
              isLocal={participant.isLocal}
              isMuted={participant.isMuted}
              hasVideoTrack={participant.hasVideoTrack}
              hasAudioTrack={participant.hasAudioTrack}
              screenShareTrack={participant.screenShareTrack}
              isHandRaised={participant.isHandRaised}
              handRaisedOrderNumber={participant.handRaisedOrderNumber}
              isActiveSpeaker={activeSpeakerId === participant.peerId}
              reactions={reactions}
              videoRef={videoRefCallback(participant.peerId, participant.isLocal)}
              screenShareVideoRef={
                isScreenShare && screenShareVideoRefCallback
                  ? screenShareVideoRefCallback(participant.peerId)
                  : undefined
              }
              onScreenShareClick={
                isScreenShare && onScreenShareClick ? () => onScreenShareClick(participant.peerId) : undefined
              }
              prefixDataTestId={`${prefixDataTestId}-participant`}
              t={t}
              isMinimized={isMinimized}
            />
          </div>
        )
      })}
    </div>
  )
}

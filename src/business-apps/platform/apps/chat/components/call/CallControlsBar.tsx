/**
 * CallControlsBar Component
 *
 * Bottom control bar for group calls with:
 * - Media controls (mute, video)
 * - Sharing & effects (screen share, background)
 * - Interaction (raise hand, reactions)
 * - End call button
 */

import React, { useState } from 'react'
import {
  Microphone,
  MicrophoneSlash,
  VideoCamera,
  VideoCameraSlash,
  Monitor,
  Image,
  PhoneDisconnect,
  Smiley,
  HandIcon
} from '@phosphor-icons/react'
import { Popover, PopoverContent, PopoverTrigger } from '@newwork/nw-design-system'

export interface CallControlsBarProps {
  /** Call type (audio or video) */
  callType: 'audio' | 'video'
  /** Whether local mic is muted */
  isMuted: boolean
  /** Whether local video is enabled */
  isVideoEnabled: boolean
  /** Whether screen sharing is active */
  isScreenSharing: boolean
  /** Whether virtual background is enabled */
  backgroundEnabled: boolean
  /** Whether hand is raised */
  handRaised: boolean
  /** Whether transcription is active */
  transcriptionActive?: boolean
  /** Callback to toggle mute */
  onToggleMute: () => void
  /** Callback to toggle video */
  onToggleVideo: () => void
  /** Callback to toggle screen share */
  onToggleScreenShare?: () => void
  /** Callback to toggle background */
  onToggleBackground?: () => void
  /** Callback to toggle raise hand */
  onToggleRaiseHand?: () => void
  /** Callback to send reaction */
  onSendReaction?: (emoji: string) => void
  /** Callback to end call */
  onEndCall: () => void
  /** Data test ID prefix */
  prefixDataTestId?: string
  /** Translation function */
  t?: (key: string) => string
}

const REACTIONS = ['👍', '❤️', '😂', '👏', '🎉']

export const CallControlsBar: React.FC<CallControlsBarProps> = ({
  callType,
  isMuted,
  isVideoEnabled,
  isScreenSharing,
  backgroundEnabled,
  handRaised,
  transcriptionActive,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleBackground,
  onToggleRaiseHand,
  onSendReaction,
  onEndCall,
  prefixDataTestId = 'rtk-group-call',
  t = (key: string) => key
}) => {
  const [reactionsOpen, setReactionsOpen] = useState(false)

  return (
    <div className="gba:flex-shrink-0">
      <div className="gba:flex gba:items-center gba:justify-center gba:px-4 gba:py-2.5 gba:gap-3">
        {/* Left: Media Controls Group */}
        <div className="gba:flex gba:items-center gba:gap-3">
          {/* Transcription indicator */}
          {transcriptionActive && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-1 gba:rounded-full gba:bg-destructive/10 gba:text-destructive">
              <Microphone className="gba:w-4 gba:h-4 gba:animate-pulse" weight="fill" />
              <span className="gba:text-xs gba:font-semibold">{t('chat-call-recording')}</span>
            </div>
          )}

          {/* Mute button */}
          <button
            onClick={onToggleMute}
            className={`gba:p-2.5 gba:rounded-full gba:transition-all ${
              isMuted
                ? 'gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90'
                : 'gba:bg-accent gba:text-accent-foreground hover:gba:bg-accent/90'
            }`}
            data-testid={`${prefixDataTestId}-mute-btn`}
            aria-label={isMuted ? t('groupCall-unmute') : t('groupCall-mute')}
            title={isMuted ? t('groupCall-unmute') : t('groupCall-mute')}
          >
            {isMuted ? (
              <MicrophoneSlash className="gba:w-4 gba:h-4" weight="fill" />
            ) : (
              <Microphone className="gba:w-4 gba:h-4" weight="fill" />
            )}
          </button>

          {/* Video toggle button */}
          {callType === 'video' && (
            <button
              onClick={onToggleVideo}
              className={`gba:p-2.5 gba:rounded-full gba:transition-all ${
                !isVideoEnabled
                  ? 'gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90'
                  : 'gba:bg-accent gba:text-accent-foreground hover:gba:bg-accent/90'
              }`}
              data-testid={`${prefixDataTestId}-video-btn`}
              aria-label={isVideoEnabled ? t('groupCall-turnOffVideo') : t('groupCall-turnOnVideo')}
              title={isVideoEnabled ? t('groupCall-turnOffVideo') : t('groupCall-turnOnVideo')}
            >
              {isVideoEnabled ? (
                <VideoCamera className="gba:w-4 gba:h-4" weight="fill" />
              ) : (
                <VideoCameraSlash className="gba:w-4 gba:h-4" weight="fill" />
              )}
            </button>
          )}
        </div>

        {/* Separator */}
        <div className="gba:h-6 gba:w-px gba:bg-border/50" />

        {/* Center: Sharing & Effects Controls Group */}
        <div className="gba:flex gba:items-center gba:gap-2">
          {/* Screen share button */}
          {onToggleScreenShare && (
            <button
              onClick={onToggleScreenShare}
              className={`gba:p-2.5 gba:rounded-full gba:transition-all ${
                isScreenSharing
                  ? 'gba:bg-primary gba:text-primary-foreground hover:gba:bg-primary/90'
                  : 'gba:bg-accent hover:gba:bg-accent/90'
              }`}
              data-testid={`${prefixDataTestId}-screen-share-btn`}
              aria-label={
                isScreenSharing ? t('chat-stopSharing') || 'Stop sharing' : t('chat-shareScreen') || 'Share screen'
              }
              title={
                isScreenSharing ? t('chat-stopSharing') || 'Stop sharing' : t('chat-shareScreen') || 'Share screen'
              }
            >
              <Monitor className="gba:w-4 gba:h-4" weight="fill" />
            </button>
          )}

          {/* Background effect button */}
          {onToggleBackground && callType === 'video' && (
            <button
              onClick={onToggleBackground}
              className={`gba:p-2.5 gba:rounded-full gba:transition-all ${
                backgroundEnabled
                  ? 'gba:bg-primary gba:text-primary-foreground hover:gba:bg-primary/90'
                  : 'gba:bg-accent hover:gba:bg-accent/90'
              }`}
              data-testid={`${prefixDataTestId}-background-btn`}
              aria-label={
                backgroundEnabled
                  ? t('groupCall-disableBackground') || 'Disable background'
                  : t('groupCall-enableBackground') || 'Enable background'
              }
              title={
                backgroundEnabled
                  ? t('groupCall-disableBackground') || 'Disable background'
                  : t('groupCall-enableBackground') || 'Enable background'
              }
            >
              <Image className="gba:w-4 gba:h-4" weight="fill" />
            </button>
          )}

          {/* Raise hand button */}
          {onToggleRaiseHand && (
            <button
              onClick={onToggleRaiseHand}
              className={`gba:p-2.5 gba:rounded-full gba:transition-all ${
                handRaised
                  ? 'gba:bg-warning gba:text-warning-foreground hover:gba:bg-warning/90'
                  : 'gba:bg-accent hover:gba:bg-accent/90'
              }`}
              data-testid={`${prefixDataTestId}-raise-hand-btn`}
              aria-label={handRaised ? 'Lower hand' : 'Raise hand'}
              title={handRaised ? 'Lower hand' : 'Raise hand'}
            >
              <HandIcon className="gba:w-4 gba:h-4" weight="fill" />
            </button>
          )}

          {/* Reactions popover button */}
          {onSendReaction && (
            <Popover open={reactionsOpen} onOpenChange={setReactionsOpen}>
              <PopoverTrigger asChild>
                <button
                  className="gba:p-2.5 gba:rounded-full gba:bg-accent hover:gba:bg-accent/90 gba:transition-all"
                  data-testid={`${prefixDataTestId}-reactions-btn`}
                  aria-label="Send reaction"
                  title="Send reaction"
                >
                  <Smiley className="gba:w-4 gba:h-4" weight="fill" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="gba:w-auto gba:p-2"
                side="top"
                data-testid={`${prefixDataTestId}-reactions-popover`}
              >
                <div className="gba:flex gba:gap-1">
                  {REACTIONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => {
                        onSendReaction(emoji)
                        setReactionsOpen(false)
                      }}
                      className="gba:p-2 gba:rounded-lg hover:gba:bg-accent gba:transition-all gba:text-2xl"
                      title={`Send ${emoji}`}
                      data-testid={`${prefixDataTestId}-reaction-${emoji}`}
                      aria-label={`Send ${emoji} reaction`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Separator */}
        <div className="gba:h-6 gba:w-px gba:bg-border/50" />

        {/* Right: End Call Button */}
        <button
          onClick={onEndCall}
          className="gba:px-4 gba:py-2 gba:rounded-full gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90 gba:transition-all gba:font-medium gba:flex gba:items-center gba:gap-1.5"
          data-testid={`${prefixDataTestId}-end-btn`}
          aria-label={t('groupCall-endCall')}
          title={t('groupCall-endCall')}
        >
          <PhoneDisconnect className="gba:w-3.5 gba:h-3.5" weight="fill" />
          <span className="gba:text-xs">{t('groupCall-endCall') || 'End call'}</span>
        </button>
      </div>
    </div>
  )
}

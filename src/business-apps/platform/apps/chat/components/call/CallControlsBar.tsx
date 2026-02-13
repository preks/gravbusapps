/**
 * CallControlsBar Component
 *
 * Bottom control bar for group calls with:
 * - Media controls (mute, video)
 * - Sharing & effects (screen share, background)
 * - Interaction (raise hand, reactions)
 * - End call button
 *
 * Responsive behavior:
 * - Desktop: All buttons visible
 * - Mobile: Primary controls visible, secondary in "More" menu
 */

import React, { useState, useEffect } from 'react'
import {
  Microphone,
  MicrophoneSlash,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  Monitor,
  Image,
  PhoneDisconnect,
  Smiley,
  HandIcon,
  DotsThreeIcon,
  CaretDownIcon,
  CheckIcon
} from '@phosphor-icons/react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  RadioGroup,
  RadioGroupItem,
  Label
} from '@newwork/nw-design-system'
import { useMediaDevices } from '../../hooks/useMediaDevices'
import { MicLevelIndicator } from './MicLevelIndicator'
import type { MediaDeviceInfo } from '../../hooks/useMediaDevices'

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
  /** Callback when microphone device changes */
  onMicDeviceChange?: (deviceId: string) => void
  /** Callback when camera device changes */
  onCameraDeviceChange?: (deviceId: string) => void
  /** Callback when speaker device changes */
  onSpeakerDeviceChange?: (deviceId: string) => void
  /** Callback to toggle audio settings panel */
  onToggleAudioSettings?: () => void
  /** Shared device state from parent */
  sharedDeviceState?: {
    audioInputDevices: MediaDeviceInfo[]
    audioOutputDevices: MediaDeviceInfo[]
    videoInputDevices: MediaDeviceInfo[]
    selectedAudioInputId: string | null
    selectedAudioOutputId: string | null
    selectedVideoInputId: string | null
    setSelectedAudioInputId: (id: string | null) => void
    setSelectedAudioOutputId: (id: string | null) => void
    setSelectedVideoInputId: (id: string | null) => void
    canSelectAudioOutput: boolean
  }
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
  onMicDeviceChange,
  onCameraDeviceChange,
  onSpeakerDeviceChange,
  onToggleAudioSettings,
  sharedDeviceState,
  prefixDataTestId = 'rtk-group-call',
  t = (key: string) => key
}) => {
  const [reactionsOpen, setReactionsOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)

  // Use shared device state from parent if provided, otherwise use local hook
  const localDeviceState = useMediaDevices({ enabled: !sharedDeviceState })

  const {
    audioInputDevices: localAudioInputDevices,
    audioOutputDevices: localAudioOutputDevices,
    videoInputDevices: localVideoInputDevices,
    selectedAudioInputId: localSelectedAudioInputId,
    selectedAudioOutputId: localSelectedAudioOutputId,
    selectedVideoInputId: localSelectedVideoInputId,
    setSelectedAudioInputId: localSetSelectedAudioInputId,
    setSelectedAudioOutputId: localSetSelectedAudioOutputId,
    setSelectedVideoInputId: localSetSelectedVideoInputId,
    refreshDevices,
    isEnumerating,
    canSelectAudioOutput: localCanSelectAudioOutput
  } = localDeviceState

  // Use shared state if provided, otherwise local (shared lists are populated by parent's refreshDevices)
  const audioInputDevices = sharedDeviceState?.audioInputDevices ?? localAudioInputDevices
  const audioOutputDevices = sharedDeviceState?.audioOutputDevices ?? localAudioOutputDevices
  const videoInputDevices = sharedDeviceState?.videoInputDevices ?? localVideoInputDevices
  const selectedAudioInputId = sharedDeviceState?.selectedAudioInputId ?? localSelectedAudioInputId
  const selectedAudioOutputId = sharedDeviceState?.selectedAudioOutputId ?? localSelectedAudioOutputId
  const selectedVideoInputId = sharedDeviceState?.selectedVideoInputId ?? localSelectedVideoInputId
  const setSelectedAudioInputId = sharedDeviceState?.setSelectedAudioInputId || localSetSelectedAudioInputId
  const setSelectedAudioOutputId = sharedDeviceState?.setSelectedAudioOutputId || localSetSelectedAudioOutputId
  const setSelectedVideoInputId = sharedDeviceState?.setSelectedVideoInputId || localSetSelectedVideoInputId
  const canSelectAudioOutput = sharedDeviceState?.canSelectAudioOutput ?? localCanSelectAudioOutput

  useEffect(() => {
    if (!sharedDeviceState) {
      refreshDevices({ requestAudio: true, requestVideo: callType === 'video' })
    }
  }, [refreshDevices, callType, sharedDeviceState])

  const handleMicDeviceChange = (deviceId: string) => {
    setSelectedAudioInputId(deviceId)
    onMicDeviceChange?.(deviceId)
  }

  const handleCameraDeviceChange = (deviceId: string) => {
    setSelectedVideoInputId(deviceId)
    onCameraDeviceChange?.(deviceId)
  }

  const handleSpeakerDeviceChange = (deviceId: string) => {
    setSelectedAudioOutputId(deviceId)
    onSpeakerDeviceChange?.(deviceId)
  }

  // Track window size for responsive layout (matches GroupCallModalRtk pattern)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  // Control mic/speaker dropdown so it closes when "More audio settings" opens the sidebar
  const [audioDropdownOpen, setAudioDropdownOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Determine if we should show desktop or mobile layout
  // Desktop layout at >= 1024px matches dialog maxWidth breakpoint
  const showDesktopLayout = windowWidth >= 1024

  // Count available mobile menu options to determine if we should show "More" menu
  // Only show "More" menu if we have 2 or more options, otherwise show the single option directly
  const mobileMenuOptionCount = [
    onToggleBackground && callType === 'video', // Background effect
    onToggleRaiseHand, // Raise hand
    onSendReaction // Reactions
  ].filter(Boolean).length

  const showMoreMenu = !showDesktopLayout && mobileMenuOptionCount >= 2

  return (
    <div className="gba:flex-shrink-0">
      <div
        className={`gba:flex gba:items-center gba:justify-center ${
          showDesktopLayout ? 'gba:gap-3 gba:px-4 gba:py-3' : 'gba:gap-2 gba:px-2 gba:py-2'
        }`}
      >
        {/* Left: Media Controls Group */}
        <div className={`gba:flex gba:items-center ${showDesktopLayout ? 'gba:gap-3' : 'gba:gap-2'}`}>
          {/* Transcription indicator - desktop only */}
          {transcriptionActive && showDesktopLayout && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-1 gba:rounded-full gba:bg-destructive/10 gba:text-destructive">
              <Microphone className="gba:w-4 gba:h-4 gba:animate-pulse" weight="fill" />
              <span className="gba:text-xs gba:font-semibold">{t('chat-call-recording')}</span>
            </div>
          )}

          {/* Mute Split Button - Toggle + Device Selector */}
          <div className="gba:flex gba:items-stretch gba:gap-0">
            <button
              onClick={onToggleMute}
              className={`${showDesktopLayout ? 'gba:p-3' : 'gba:p-2.5'} gba:rounded-l-full gba:transition-all ${
                isMuted
                  ? 'gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90'
                  : 'gba:bg-accent gba:text-accent-foreground hover:gba:bg-accent/90'
              }`}
              data-testid={`${prefixDataTestId}-mute-btn`}
              aria-label={isMuted ? t('groupCall-unmute') : t('groupCall-mute')}
              title={isMuted ? t('groupCall-unmute') : t('groupCall-mute')}
            >
              {isMuted ? (
                <MicrophoneSlash className={showDesktopLayout ? 'gba:w-5 gba:h-5' : 'gba:w-4 gba:h-4'} weight="fill" />
              ) : (
                <Microphone className={showDesktopLayout ? 'gba:w-5 gba:h-5' : 'gba:w-4 gba:h-4'} weight="fill" />
              )}
            </button>
            <DropdownMenu open={audioDropdownOpen} onOpenChange={setAudioDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  disabled={isEnumerating}
                  className={`${showDesktopLayout ? 'gba:px-2 gba:py-3' : 'gba:px-1.5 gba:py-2.5'} gba:rounded-r-full gba:transition-all ${
                    isMuted
                      ? 'gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90'
                      : 'gba:bg-accent gba:text-accent-foreground hover:gba:bg-accent/90'
                  } gba:border-l gba:border-white/20 disabled:gba:opacity-50 disabled:gba:cursor-not-allowed`}
                  data-testid={`${prefixDataTestId}-mic-settings`}
                  aria-label={t('call-audioSettings')}
                >
                  <CaretDownIcon className="gba:w-3 gba:h-3" weight="bold" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="center"
                className="gba:w-[320px] gba:p-0 gba:bg-background gba:border-border"
              >
                {/* Speaker Section */}
                <div className="gba:p-4 gba:border-b gba:border-border">
                  <Label className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:mb-3 gba:block">
                    {t('call-speaker') || 'Speaker'}
                  </Label>
                  {canSelectAudioOutput ? (
                    audioOutputDevices.length > 0 ? (
                      <RadioGroup
                        value={selectedAudioOutputId || ''}
                        onValueChange={handleSpeakerDeviceChange}
                        className="gba:space-y-2"
                      >
                        {audioOutputDevices.map(device => (
                          <div key={device.deviceId} className="gba:flex gba:items-center gba:gap-3 gba:py-1.5">
                            <RadioGroupItem value={device.deviceId} id={`speaker-quick-${device.deviceId}`} />
                            <Label
                              htmlFor={`speaker-quick-${device.deviceId}`}
                              className="gba:flex-1 gba:cursor-pointer gba:text-sm"
                            >
                              {device.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      <p className="gba:text-sm gba:text-muted-foreground gba:py-2">
                        {t('call-noDevicesFound') || 'No devices found'}
                      </p>
                    )
                  ) : (
                    <p className="gba:text-sm gba:text-muted-foreground gba:py-2">
                      {t('call-speakerNotSupported') || 'Speaker selection not supported'}
                    </p>
                  )}
                </div>

                {/* Microphone Section */}
                <div className="gba:p-4 gba:border-b gba:border-border">
                  <Label className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:mb-3 gba:block">
                    {t('call-microphone') || 'Microphone'}
                  </Label>
                  {audioInputDevices.length > 0 ? (
                    <RadioGroup
                      value={selectedAudioInputId || ''}
                      onValueChange={handleMicDeviceChange}
                      className="gba:space-y-2"
                    >
                      {audioInputDevices.map(device => (
                        <div key={device.deviceId} className="gba:flex gba:items-center gba:gap-3 gba:py-1.5">
                          <RadioGroupItem value={device.deviceId} id={`mic-quick-${device.deviceId}`} />
                          <Label
                            htmlFor={`mic-quick-${device.deviceId}`}
                            className="gba:flex-1 gba:cursor-pointer gba:text-sm"
                          >
                            {device.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <p className="gba:text-sm gba:text-muted-foreground gba:py-2">
                      {t('call-noDevicesFound') || 'No devices found'}
                    </p>
                  )}
                  <MicLevelIndicator deviceId={selectedAudioInputId} className="gba:mt-3" />
                </div>

                {/* More Settings Link - close dropdown and open sidebar */}
                <button
                  onClick={() => {
                    onToggleAudioSettings?.()
                    setAudioDropdownOpen(false)
                  }}
                  className="gba:w-full gba:px-4 gba:py-3 gba:text-sm gba:text-left hover:gba:bg-muted/50 gba:transition-colors"
                  data-testid={`${prefixDataTestId}-more-audio-settings`}
                >
                  {t('call-moreAudioSettings') || 'More audio settings'}
                </button>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Video Split Button - Toggle + Device Selector */}
          {callType === 'video' && (
            <div className="gba:flex gba:items-stretch gba:gap-0">
              <button
                onClick={onToggleVideo}
                className={`${showDesktopLayout ? 'gba:p-3' : 'gba:p-2.5'} gba:rounded-l-full gba:transition-all ${
                  isVideoEnabled
                    ? 'gba:bg-accent gba:text-accent-foreground hover:gba:bg-accent/90'
                    : 'gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90'
                }`}
                data-testid={`${prefixDataTestId}-video-btn`}
                aria-label={isVideoEnabled ? t('groupCall-turnOffVideo') : t('groupCall-turnOnVideo')}
                title={isVideoEnabled ? t('groupCall-turnOffVideo') : t('groupCall-turnOnVideo')}
              >
                {isVideoEnabled ? (
                  <VideoCameraIcon
                    className={showDesktopLayout ? 'gba:w-5 gba:h-5' : 'gba:w-4 gba:h-4'}
                    weight="fill"
                  />
                ) : (
                  <VideoCameraSlashIcon
                    className={showDesktopLayout ? 'gba:w-5 gba:h-5' : 'gba:w-4 gba:h-4'}
                    weight="fill"
                  />
                )}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    disabled={isEnumerating}
                    className={`${showDesktopLayout ? 'gba:px-2 gba:py-3' : 'gba:px-1.5 gba:py-2.5'} gba:rounded-r-full gba:transition-all ${
                      isVideoEnabled
                        ? 'gba:bg-accent gba:text-accent-foreground hover:gba:bg-accent/90'
                        : 'gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90'
                    } gba:border-l gba:border-white/20 disabled:gba:opacity-50 disabled:gba:cursor-not-allowed`}
                    data-testid={`${prefixDataTestId}-camera-settings`}
                    aria-label={t('call-videoSettings')}
                  >
                    <CaretDownIcon className="gba:w-3 gba:h-3" weight="bold" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="center" className="gba:w-72 gba:bg-gray-800 gba:border-gray-700">
                  <DropdownMenuLabel className="gba:flex gba:items-center gba:gap-2 gba:text-white">
                    <VideoCameraIcon className="gba:w-4 gba:h-4" weight="fill" />
                    {t('call-selectCamera')}
                  </DropdownMenuLabel>
                  {videoInputDevices.length > 0 ? (
                    videoInputDevices.map(device => (
                      <DropdownMenuItem
                        key={device.deviceId}
                        onClick={() => handleCameraDeviceChange(device.deviceId)}
                        className="gba:flex gba:items-center gba:gap-2 gba:text-white hover:gba:bg-gray-700"
                      >
                        {selectedVideoInputId === device.deviceId && (
                          <CheckIcon className="gba:w-4 gba:h-4 gba:text-success" weight="bold" />
                        )}
                        <span className={selectedVideoInputId === device.deviceId ? '' : 'gba:ml-6'}>
                          {device.label}
                        </span>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled className="gba:text-gray-400">
                      {t('call-noDevicesFound')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Separator - desktop only */}
        {showDesktopLayout && <div className="gba:h-6 gba:w-px gba:bg-border/50" />}

        {/* Center: Sharing & Effects Controls Group */}
        <div className={`gba:flex gba:items-center ${showDesktopLayout ? 'gba:gap-3' : 'gba:gap-2'}`}>
          {/* Screen share button - always visible */}
          {onToggleScreenShare && (
            <button
              onClick={onToggleScreenShare}
              className={`${showDesktopLayout ? 'gba:p-3' : 'gba:p-2.5'} gba:rounded-full gba:transition-all ${
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
              <Monitor className={showDesktopLayout ? 'gba:w-5 gba:h-5' : 'gba:w-4 gba:h-4'} weight="fill" />
            </button>
          )}

          {/* Desktop: Individual buttons for secondary controls */}
          {showDesktopLayout && (
            <div className="gba:flex gba:items-center gba:gap-2">
              {/* Background effect button */}
              {onToggleBackground && callType === 'video' && (
                <button
                  onClick={onToggleBackground}
                  className={`gba:p-3 gba:rounded-full gba:transition-all ${
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
                  <Image className="gba:w-5 gba:h-5" weight="fill" />
                </button>
              )}

              {/* Raise hand button */}
              {onToggleRaiseHand && (
                <button
                  onClick={onToggleRaiseHand}
                  className={`gba:p-3 gba:rounded-full gba:transition-all ${
                    handRaised
                      ? 'gba:bg-warning gba:text-warning-foreground hover:gba:bg-warning/90'
                      : 'gba:bg-accent hover:gba:bg-accent/90'
                  }`}
                  data-testid={`${prefixDataTestId}-raise-hand-btn`}
                  aria-label={handRaised ? 'Lower hand' : 'Raise hand'}
                  title={handRaised ? 'Lower hand' : 'Raise hand'}
                >
                  <HandIcon className="gba:w-5 gba:h-5" weight="fill" />
                </button>
              )}

              {/* Reactions popover button */}
              {onSendReaction && (
                <Popover open={reactionsOpen} onOpenChange={setReactionsOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className="gba:p-3 gba:rounded-full gba:bg-accent hover:gba:bg-accent/90 gba:transition-all"
                      data-testid={`${prefixDataTestId}-reactions-btn`}
                      aria-label="Send reaction"
                      title="Send reaction"
                    >
                      <Smiley className="gba:w-5 gba:h-5" weight="fill" />
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
          )}

          {/* Mobile: Single option shown as direct button */}
          {!showDesktopLayout && mobileMenuOptionCount === 1 && (
            <div className="gba:flex gba:items-center gba:gap-1">
              {/* Background effect button */}
              {onToggleBackground && callType === 'video' && (
                <button
                  onClick={onToggleBackground}
                  className={`gba:p-2.5 gba:rounded-full gba:transition-all ${
                    backgroundEnabled
                      ? 'gba:bg-primary gba:text-primary-foreground hover:gba:bg-primary/90'
                      : 'gba:bg-accent hover:gba:bg-accent/90'
                  }`}
                  data-testid={`${prefixDataTestId}-background-btn-mobile`}
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
                  data-testid={`${prefixDataTestId}-raise-hand-btn-mobile`}
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
                      data-testid={`${prefixDataTestId}-reactions-btn-mobile`}
                      aria-label="Send reaction"
                      title="Send reaction"
                    >
                      <Smiley className="gba:w-4 gba:h-4" weight="fill" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="gba:w-auto gba:p-2"
                    side="top"
                    data-testid={`${prefixDataTestId}-reactions-popover-mobile`}
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
                          data-testid={`${prefixDataTestId}-reaction-${emoji}-mobile`}
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
          )}

          {/* Mobile: "More" menu for secondary controls (only when 2+ options) */}
          {showMoreMenu && (
            <Popover open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
              <PopoverTrigger asChild>
                <button
                  className="gba:p-2.5 gba:rounded-full gba:bg-accent hover:gba:bg-accent/90 gba:transition-all"
                  data-testid={`${prefixDataTestId}-more-btn`}
                  aria-label="More options"
                  title="More options"
                >
                  <DotsThreeIcon className="gba:w-4 gba:h-4" weight="fill" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="gba:w-64 gba:p-3"
                side="top"
                align="end"
                data-testid={`${prefixDataTestId}-more-menu`}
              >
                <div className="gba:flex gba:flex-col gba:gap-2">
                  {/* Background effect option */}
                  {onToggleBackground && callType === 'video' && (
                    <button
                      onClick={() => {
                        onToggleBackground()
                        setMoreMenuOpen(false)
                      }}
                      className={`gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:rounded-xl hover:gba:bg-accent gba:transition-all gba:text-left gba:w-full ${
                        backgroundEnabled ? 'gba:bg-primary/10 gba:ring-1 gba:ring-primary/20' : ''
                      }`}
                      data-testid={`${prefixDataTestId}-background-btn-mobile`}
                    >
                      <div
                        className={`gba:p-2 gba:rounded-lg ${backgroundEnabled ? 'gba:bg-primary gba:text-primary-foreground' : 'gba:bg-accent'}`}
                      >
                        <Image className="gba:w-5 gba:h-5" weight="fill" />
                      </div>
                      <span className="gba:text-sm gba:font-medium">
                        {backgroundEnabled
                          ? t('groupCall-disableBackground') || 'Disable background effect'
                          : t('groupCall-enableBackground') || 'Enable background effect'}
                      </span>
                    </button>
                  )}

                  {/* Raise hand option */}
                  {onToggleRaiseHand && (
                    <button
                      onClick={() => {
                        onToggleRaiseHand()
                        setMoreMenuOpen(false)
                      }}
                      className={`gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:rounded-xl hover:gba:bg-accent gba:transition-all gba:text-left gba:w-full ${
                        handRaised ? 'gba:bg-warning/10 gba:ring-1 gba:ring-warning/20' : ''
                      }`}
                      data-testid={`${prefixDataTestId}-raise-hand-btn-mobile`}
                    >
                      <div
                        className={`gba:p-2 gba:rounded-lg ${handRaised ? 'gba:bg-warning gba:text-warning-foreground' : 'gba:bg-accent'}`}
                      >
                        <HandIcon className="gba:w-5 gba:h-5" weight="fill" />
                      </div>
                      <span className="gba:text-sm gba:font-medium">{handRaised ? 'Lower hand' : 'Raise hand'}</span>
                    </button>
                  )}

                  {/* Reactions section */}
                  {onSendReaction && (
                    <>
                      {(onToggleBackground || onToggleRaiseHand) && <div className="gba:h-px gba:bg-border gba:my-1" />}
                      <div className="gba:px-1 gba:py-1">
                        <span className="gba:text-xs gba:text-muted-foreground gba:font-semibold gba:uppercase gba:tracking-wide">
                          Reactions
                        </span>
                      </div>
                      <div className="gba:grid gba:grid-cols-5 gba:gap-2 gba:px-1 gba:py-2">
                        {REACTIONS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => {
                              onSendReaction(emoji)
                              setMoreMenuOpen(false)
                            }}
                            className="gba:aspect-square gba:p-3 gba:rounded-xl hover:gba:bg-accent gba:transition-all gba:text-2xl gba:flex gba:items-center gba:justify-center hover:gba:scale-110 active:gba:scale-95"
                            title={`Send ${emoji}`}
                            data-testid={`${prefixDataTestId}-reaction-${emoji}-mobile`}
                            aria-label={`Send ${emoji} reaction`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Separator - hidden on mobile */}
        {showDesktopLayout && <div className="gba:h-6 gba:w-px gba:bg-border/50" />}

        {/* Right: End Call Button */}
        <button
          onClick={onEndCall}
          className={`${
            showDesktopLayout ? 'gba:px-5 gba:py-2.5 gba:gap-2' : 'gba:px-4 gba:py-2 gba:gap-1.5'
          } gba:rounded-full gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90 gba:transition-all gba:font-medium gba:flex gba:items-center`}
          data-testid={`${prefixDataTestId}-end-btn`}
          aria-label={t('groupCall-endCall')}
          title={t('groupCall-endCall')}
        >
          <PhoneDisconnect className={showDesktopLayout ? 'gba:w-4 gba:h-4' : 'gba:w-3.5 gba:h-3.5'} weight="fill" />
          <span className={showDesktopLayout ? 'gba:text-sm' : 'gba:text-xs'}>
            {t('groupCall-endCall') || 'End call'}
          </span>
        </button>
      </div>
    </div>
  )
}

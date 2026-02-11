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
  VideoCamera,
  VideoCameraSlash,
  Monitor,
  Image,
  PhoneDisconnect,
  Smiley,
  HandIcon,
  DotsThree,
  CaretDownIcon,
  CheckIcon,
  SpeakerHigh
} from '@phosphor-icons/react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import { useMediaDevices } from '../../hooks/useMediaDevices'
import { useCallPreferences } from '../../hooks/useCallPreferences'

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
  /** Whether RNNoise AI noise suppression is enabled */
  rnnoiseEnabled?: boolean
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
  /** Callback to toggle RNNoise */
  onToggleRnnoise?: () => void
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
  /** Callback when noise suppression setting changes */
  onNoiseSuppressionChange?: (enabled: boolean) => void | Promise<void>
  /** Callback when auto gain control setting changes */
  onAutoGainControlChange?: (enabled: boolean) => void | Promise<void>
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
  rnnoiseEnabled = true,
  handRaised,
  transcriptionActive,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleBackground,
  onToggleRnnoise,
  onToggleRaiseHand,
  onSendReaction,
  onEndCall,
  onMicDeviceChange,
  onCameraDeviceChange,
  onSpeakerDeviceChange,
  onNoiseSuppressionChange,
  onAutoGainControlChange,
  prefixDataTestId = 'rtk-group-call',
  t = (key: string) => key
}) => {
  const handleRnnoiseToggle = () => {
    console.log('[Call Controls] User toggling RNNoise', {
      currentState: rnnoiseEnabled,
      timestamp: new Date().toISOString()
    })
    onToggleRnnoise?.()
  }
  const [reactionsOpen, setReactionsOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const callPreferences = useCallPreferences()

  const {
    audioInputDevices,
    audioOutputDevices,
    videoInputDevices,
    selectedAudioInputId,
    selectedAudioOutputId,
    selectedVideoInputId,
    setSelectedAudioInputId,
    setSelectedAudioOutputId,
    setSelectedVideoInputId,
    refreshDevices,
    isEnumerating,
    canSelectAudioOutput
  } = useMediaDevices({ enabled: true })

  useEffect(() => {
    refreshDevices({ requestAudio: true, requestVideo: callType === 'video' })
  }, [refreshDevices, callType])

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
            <DropdownMenu>
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
              <DropdownMenuContent side="top" align="center" className="gba:w-72 gba:bg-gray-800 gba:border-gray-700">
                <DropdownMenuLabel className="gba:flex gba:items-center gba:gap-2 gba:text-white">
                  <Microphone className="gba:w-4 gba:h-4" weight="fill" />
                  {t('call-selectMicrophone')}
                </DropdownMenuLabel>
                {audioInputDevices.length > 0 ? (
                  audioInputDevices.map(device => (
                    <DropdownMenuItem
                      key={device.deviceId}
                      onClick={() => handleMicDeviceChange(device.deviceId)}
                      className="gba:flex gba:items-center gba:gap-2 gba:text-white hover:gba:bg-gray-700"
                    >
                      {selectedAudioInputId === device.deviceId && (
                        <CheckIcon className="gba:w-4 gba:h-4 gba:text-success" weight="bold" />
                      )}
                      <span className={selectedAudioInputId !== device.deviceId ? 'gba:ml-6' : ''}>{device.label}</span>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled className="gba:text-gray-400">
                    {t('call-noDevicesFound')}
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator className="gba:bg-gray-700" />

                <DropdownMenuLabel className="gba:flex gba:items-center gba:gap-2 gba:text-white">
                  <SpeakerHigh className="gba:w-4 gba:h-4" weight="fill" />
                  {t('call-selectSpeaker')}
                </DropdownMenuLabel>
                {!canSelectAudioOutput ? (
                  <DropdownMenuItem disabled className="gba:text-gray-400">
                    {t('call-deviceSettings')}
                  </DropdownMenuItem>
                ) : audioOutputDevices.length > 0 ? (
                  audioOutputDevices.map(device => (
                    <DropdownMenuItem
                      key={device.deviceId}
                      onClick={() => handleSpeakerDeviceChange(device.deviceId)}
                      className="gba:flex gba:items-center gba:gap-2 gba:text-white hover:gba:bg-gray-700"
                    >
                      {selectedAudioOutputId === device.deviceId && (
                        <CheckIcon className="gba:w-4 gba:h-4 gba:text-success" weight="bold" />
                      )}
                      <span className={selectedAudioOutputId !== device.deviceId ? 'gba:ml-6' : ''}>
                        {device.label}
                      </span>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled className="gba:text-gray-400">
                    {t('call-noDevicesFound')}
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator className="gba:bg-gray-700" />

                {/* RNNoise AI Noise Suppression */}
                {onToggleRnnoise && (
                  <>
                    <DropdownMenuCheckboxItem
                      checked={rnnoiseEnabled}
                      onCheckedChange={() => {
                        handleRnnoiseToggle()
                      }}
                      className="gba:text-white hover:gba:bg-gray-700"
                      data-testid={`${prefixDataTestId}-rnnoise-toggle`}
                    >
                      <span className="gba:flex gba:items-center gba:gap-2">
                        <span className="gba:flex gba:items-center gba:gap-2">
                          {t('call-aiNoiseSuppression') || 'AI Noise Suppression'}
                          <span className="gba:text-xs gba:text-gray-400 gba:font-normal">(RNNoise)</span>
                        </span>
                        {rnnoiseEnabled && (
                          <span className="gba:text-xs gba:bg-success/20 gba:text-success gba:px-2 gba:py-0.5 gba:rounded-full gba:font-semibold">
                            ACTIVE
                          </span>
                        )}
                      </span>
                    </DropdownMenuCheckboxItem>

                    {rnnoiseEnabled && (
                      <div className="gba:px-2 gba:py-2 gba:text-xs gba:text-gray-400">
                        <div className="gba:mb-1">{t('call-rnnoiseMode') || 'Suppression Level'}:</div>
                        <div className="gba:flex gba:gap-1">
                          <button
                            onClick={() => {
                              console.log('[Call Controls] RNNoise mode: gentle')
                              // TODO: Add callback to change mode
                            }}
                            className="gba:px-2 gba:py-1 gba:rounded gba:bg-gray-700 gba:text-white hover:gba:bg-gray-600 gba:text-xs"
                          >
                            Gentle
                          </button>
                          <button
                            onClick={() => {
                              console.log('[Call Controls] RNNoise mode: moderate')
                              // TODO: Add callback to change mode
                            }}
                            className="gba:px-2 gba:py-1 gba:rounded gba:bg-gray-700 gba:text-white hover:gba:bg-gray-600 gba:text-xs"
                          >
                            Moderate
                          </button>
                          <button
                            onClick={() => {
                              console.log('[Call Controls] RNNoise mode: aggressive')
                              // TODO: Add callback to change mode
                            }}
                            className="gba:px-2 gba:py-1 gba:rounded gba:bg-success gba:text-success-foreground gba:text-xs"
                          >
                            Aggressive
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <DropdownMenuCheckboxItem
                  checked={callPreferences.noiseSuppressionEnabled}
                  onCheckedChange={checked => {
                    const next = Boolean(checked)
                    callPreferences.setNoiseSuppressionEnabled(next)
                    void onNoiseSuppressionChange?.(next)
                  }}
                  className="gba:text-white hover:gba:bg-gray-700"
                  data-testid={`${prefixDataTestId}-noise-suppression-toggle`}
                >
                  {t('call-noiseSuppression') || 'Noise suppression'}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={callPreferences.autoGainControlEnabled}
                  onCheckedChange={checked => {
                    const next = Boolean(checked)
                    callPreferences.setAutoGainControlEnabled(next)
                    void onAutoGainControlChange?.(next)
                  }}
                  className="gba:text-white hover:gba:bg-gray-700"
                  data-testid={`${prefixDataTestId}-auto-gain-control-toggle`}
                >
                  {t('call-autoGainControl') || 'Auto gain control'}
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Video Split Button - Toggle + Device Selector */}
          {callType === 'video' && (
            <div className="gba:flex gba:items-stretch gba:gap-0">
              <button
                onClick={onToggleVideo}
                className={`${showDesktopLayout ? 'gba:p-3' : 'gba:p-2.5'} gba:rounded-l-full gba:transition-all ${
                  !isVideoEnabled
                    ? 'gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90'
                    : 'gba:bg-accent gba:text-accent-foreground hover:gba:bg-accent/90'
                }`}
                data-testid={`${prefixDataTestId}-video-btn`}
                aria-label={isVideoEnabled ? t('groupCall-turnOffVideo') : t('groupCall-turnOnVideo')}
                title={isVideoEnabled ? t('groupCall-turnOffVideo') : t('groupCall-turnOnVideo')}
              >
                {isVideoEnabled ? (
                  <VideoCamera className={showDesktopLayout ? 'gba:w-5 gba:h-5' : 'gba:w-4 gba:h-4'} weight="fill" />
                ) : (
                  <VideoCameraSlash
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
                      !isVideoEnabled
                        ? 'gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90'
                        : 'gba:bg-accent gba:text-accent-foreground hover:gba:bg-accent/90'
                    } gba:border-l gba:border-white/20 disabled:gba:opacity-50 disabled:gba:cursor-not-allowed`}
                    data-testid={`${prefixDataTestId}-camera-settings`}
                    aria-label={t('call-videoSettings')}
                  >
                    <CaretDownIcon className="gba:w-3 gba:h-3" weight="bold" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="center" className="gba:w-72 gba:bg-gray-800 gba:border-gray-700">
                  <DropdownMenuLabel className="gba:flex gba:items-center gba:gap-2 gba:text-white">
                    <VideoCamera className="gba:w-4 gba:h-4" weight="fill" />
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
                        <span className={selectedVideoInputId !== device.deviceId ? 'gba:ml-6' : ''}>
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
              {/* RNNoise AI noise suppression button */}
              {onToggleRnnoise && (
                <button
                  onClick={handleRnnoiseToggle}
                  className={`gba:p-3 gba:rounded-full gba:transition-all ${
                    rnnoiseEnabled
                      ? 'gba:bg-success gba:text-success-foreground hover:gba:bg-success/90'
                      : 'gba:bg-accent hover:gba:bg-accent/90'
                  }`}
                  data-testid={`${prefixDataTestId}-rnnoise-btn`}
                  aria-label={rnnoiseEnabled ? 'AI Noise Suppression: ON' : 'AI Noise Suppression: OFF'}
                  title={
                    rnnoiseEnabled ? 'AI Noise Suppression: ON (removes background noise)' : 'AI Noise Suppression: OFF'
                  }
                >
                  <Microphone className="gba:w-5 gba:h-5" weight="fill" />
                </button>
              )}

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
                  <DotsThree className="gba:w-4 gba:h-4" weight="fill" />
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

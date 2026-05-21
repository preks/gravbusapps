/**
 * CallControlsBar Component
 *
 * Bottom control bar for group calls: media, sharing, reactions, end call.
 * Desktop: all buttons visible. Mobile: primary + "More" menu for secondary.
 */

import React, { useState, useEffect } from 'react'
import {
  MicrophoneIcon,
  MicrophoneSlashIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  PhoneDisconnectIcon,
  CaretDownIcon
} from '@phosphor-icons/react'
import { DropdownMenu, DropdownMenuTrigger } from '@newwork/nw-design-system'
import { useMediaDevices } from '../../hooks/useMediaDevices'
import { useCallControlsLayout } from './useCallControlsLayout'
import { ControlBarButton } from './ControlBarButton'
import { AudioDeviceDropdownContent } from './AudioDeviceDropdownContent'
import { CallControlsCenterSection } from './CallControlsCenterSection'
import { CameraDeviceDropdownContent } from './CameraDeviceDropdownContent'
import type { MediaDeviceInfo } from '../../hooks/useMediaDevices'

export interface CallControlsBarProps {
  callType: 'audio' | 'video'
  isMuted: boolean
  isVideoEnabled: boolean
  isScreenSharing: boolean
  backgroundEnabled: boolean
  handRaised: boolean
  transcriptionActive?: boolean
  onToggleMute: () => void
  onToggleVideo: () => void
  onToggleScreenShare?: () => void
  onToggleBackground?: () => void
  onToggleRaiseHand?: () => void
  onSendReaction?: (emoji: string) => void
  onEndCall: () => void
  onMicDeviceChange?: (deviceId: string) => void
  onCameraDeviceChange?: (deviceId: string) => void
  onSpeakerDeviceChange?: (deviceId: string) => void
  isMirrorEnabled?: boolean
  onToggleMirror?: () => void
  onToggleAudioSettings?: () => void
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
  prefixDataTestId?: string
  t?: (key: string) => string
}

const defaultT = (key: string) => key

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
  isMirrorEnabled,
  onToggleMirror,
  onToggleAudioSettings,
  sharedDeviceState,
  prefixDataTestId = 'rtk-group-call',
  t = defaultT
}) => {
  const [reactionsOpen, setReactionsOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [audioDropdownOpen, setAudioDropdownOpen] = useState(false)

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

  const { showDesktopLayout, showMoreMenu, mobileMenuOptionCount } = useCallControlsLayout({
    callType,
    onToggleBackground,
    onToggleRaiseHand,
    onSendReaction
  })

  const size = showDesktopLayout ? 'desktop' : 'mobile'
  const iconSize = showDesktopLayout ? 'gba:w-5 gba:h-5' : 'gba:w-4 gba:h-4'

  return (
    <div className="gba:flex-shrink-0">
      <div
        className={`gba:flex gba:items-center gba:justify-center ${
          showDesktopLayout ? 'gba:gap-3 gba:px-4 gba:py-3' : 'gba:gap-2 gba:px-2 gba:py-2'
        }`}
      >
        {/* Left: Media controls */}
        <div className={`gba:flex gba:items-center ${showDesktopLayout ? 'gba:gap-3' : 'gba:gap-2'}`}>
          {transcriptionActive && showDesktopLayout && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-1 gba:rounded-full gba:bg-destructive/10 gba:text-destructive">
              <MicrophoneIcon className="gba:w-4 gba:h-4 gba:animate-pulse" weight="fill" />
              <span className="gba:text-xs gba:font-semibold">{t('chat-call-recording')}</span>
            </div>
          )}

          <div className="gba:flex gba:items-stretch gba:gap-0">
            <ControlBarButton
              variant={isMuted ? 'destructive' : 'accent'}
              size={size}
              icon={
                isMuted ? (
                  <MicrophoneSlashIcon className={iconSize} weight="fill" />
                ) : (
                  <MicrophoneIcon className={iconSize} weight="fill" />
                )
              }
              onClick={onToggleMute}
              aria-label={isMuted ? t('groupCall-unmute') : t('groupCall-mute')}
              title={isMuted ? t('groupCall-unmute') : t('groupCall-mute')}
              data-testid={`${prefixDataTestId}-mute-btn`}
              className="gba:rounded-l-full gba:rounded-r-none"
            />
            <DropdownMenu open={audioDropdownOpen} onOpenChange={setAudioDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={isEnumerating}
                  className={`${size === 'desktop' ? 'gba:px-2 gba:py-3' : 'gba:px-1.5 gba:py-2.5'} gba:rounded-r-full gba:rounded-l-none gba:transition-all gba:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-primary gba:focus-visible:ring-offset-2 gba:border-l gba:border-white/20 ${
                    isMuted
                      ? 'gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90'
                      : 'gba:bg-accent gba:text-accent-foreground hover:gba:bg-accent/90'
                  } disabled:gba:opacity-50 disabled:gba:cursor-not-allowed`}
                  data-testid={`${prefixDataTestId}-mic-settings`}
                  aria-label={t('call-audioSettings')}
                >
                  <CaretDownIcon className="gba:w-3 gba:h-3" weight="bold" />
                </button>
              </DropdownMenuTrigger>
              <AudioDeviceDropdownContent
                audioInputDevices={audioInputDevices}
                audioOutputDevices={audioOutputDevices}
                selectedAudioInputId={selectedAudioInputId}
                selectedAudioOutputId={selectedAudioOutputId}
                onMicChange={handleMicDeviceChange}
                onSpeakerChange={handleSpeakerDeviceChange}
                canSelectAudioOutput={canSelectAudioOutput}
                onMoreSettings={onToggleAudioSettings}
                onOpenChange={setAudioDropdownOpen}
                t={t}
                prefixDataTestId={prefixDataTestId}
              />
            </DropdownMenu>
          </div>

          {callType === 'video' && (
            <div className="gba:flex gba:items-stretch gba:gap-0">
              <ControlBarButton
                variant={isVideoEnabled ? 'accent' : 'destructive'}
                size={size}
                icon={
                  isVideoEnabled ? (
                    <VideoCameraIcon className={iconSize} weight="fill" />
                  ) : (
                    <VideoCameraSlashIcon className={iconSize} weight="fill" />
                  )
                }
                onClick={onToggleVideo}
                aria-label={isVideoEnabled ? t('groupCall-turnOffVideo') : t('groupCall-turnOnVideo')}
                title={isVideoEnabled ? t('groupCall-turnOffVideo') : t('groupCall-turnOnVideo')}
                data-testid={`${prefixDataTestId}-video-btn`}
                className="gba:rounded-l-full gba:rounded-r-none"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={isEnumerating}
                    className={`${size === 'desktop' ? 'gba:px-2 gba:py-3' : 'gba:px-1.5 gba:py-2.5'} gba:rounded-r-full gba:rounded-l-none gba:transition-all gba:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-primary gba:focus-visible:ring-offset-2 gba:border-l gba:border-white/20 ${
                      isVideoEnabled
                        ? 'gba:bg-accent gba:text-accent-foreground hover:gba:bg-accent/90'
                        : 'gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90'
                    } disabled:gba:opacity-50 disabled:gba:cursor-not-allowed`}
                    data-testid={`${prefixDataTestId}-camera-settings`}
                    aria-label={t('call-videoSettings')}
                  >
                    <CaretDownIcon className="gba:w-3 gba:h-3" weight="bold" />
                  </button>
                </DropdownMenuTrigger>
                <CameraDeviceDropdownContent
                  videoInputDevices={videoInputDevices}
                  selectedVideoInputId={selectedVideoInputId}
                  onSelect={handleCameraDeviceChange}
                  t={t}
                />
              </DropdownMenu>
            </div>
          )}
        </div>

        {showDesktopLayout && <div className="gba:h-6 gba:w-px gba:bg-border/50" />}

        <CallControlsCenterSection
          callType={callType}
          isScreenSharing={isScreenSharing}
          backgroundEnabled={backgroundEnabled}
          handRaised={handRaised}
          isMirrorEnabled={isMirrorEnabled}
          onToggleMirror={onToggleMirror}
          showDesktopLayout={showDesktopLayout}
          showMoreMenu={showMoreMenu}
          mobileMenuOptionCount={mobileMenuOptionCount}
          reactionsOpen={reactionsOpen}
          setReactionsOpen={setReactionsOpen}
          moreMenuOpen={moreMenuOpen}
          setMoreMenuOpen={setMoreMenuOpen}
          onToggleScreenShare={onToggleScreenShare}
          onToggleBackground={onToggleBackground}
          onToggleRaiseHand={onToggleRaiseHand}
          onSendReaction={onSendReaction}
          prefixDataTestId={prefixDataTestId}
          t={t}
        />

        {showDesktopLayout && <div className="gba:h-6 gba:w-px gba:bg-border/50" />}

        <ControlBarButton
          variant="destructive"
          size={size}
          icon={
            <PhoneDisconnectIcon
              className={showDesktopLayout ? 'gba:w-4 gba:h-4' : 'gba:w-3.5 gba:h-3.5'}
              weight="fill"
            />
          }
          onClick={onEndCall}
          aria-label={t('groupCall-endCall')}
          title={t('groupCall-endCall')}
          data-testid={`${prefixDataTestId}-end-btn`}
          className={showDesktopLayout ? 'gba:px-5 gba:py-2.5 gba:gap-2' : 'gba:px-4 gba:py-2 gba:gap-1.5'}
        >
          <span className={showDesktopLayout ? 'gba:text-sm' : 'gba:text-xs'}>
            {t('groupCall-endCall') || 'End call'}
          </span>
        </ControlBarButton>
      </div>
    </div>
  )
}

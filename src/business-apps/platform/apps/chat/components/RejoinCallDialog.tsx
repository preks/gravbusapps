import React, { useEffect, useState, memo, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Button,
  Spinner,
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import {
  MicrophoneIcon,
  MicrophoneSlashIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  PhoneIcon,
  MagicWandIcon,
  UsersThreeIcon,
  UserIcon,
  CaretDownIcon,
  CheckIcon,
  SpeakerHighIcon
} from '@phosphor-icons/react'
import translations from '../_i18n'
import { useMediaDevices } from '../hooks/useMediaDevices'
import { useCallPreferences } from '../hooks/useCallPreferences'

// Helper to get user initials from name
const getInitials = (name: string): string => {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

interface RejoinCallDialogProps {
  isOpen: boolean
  callType: 'audio' | 'video'
  conversationName?: string
  participantCount?: number
  userName?: string
  userAvatarUrl?: string
  onJoin: (preferences: {
    micEnabled: boolean
    cameraEnabled: boolean
    backgroundEnabled: boolean
    audioInputDeviceId?: string | null
    videoInputDeviceId?: string | null
  }) => void
  onCancel: () => void
  prefixDataTestId?: string
}

export const RejoinCallDialog: React.FC<RejoinCallDialogProps> = memo(
  ({
    isOpen,
    callType,
    conversationName,
    participantCount = 0,
    userName,
    userAvatarUrl,
    onJoin,
    onCancel,
    prefixDataTestId = 'rejoin-call-dialog'
  }) => {
    const { t } = useTranslation(translations)
    const callPreferences = useCallPreferences()
    const [isJoining, setIsJoining] = useState(false)
    const [micEnabled, setMicEnabled] = useState(true)
    const [cameraEnabled, setCameraEnabled] = useState(callType === 'video')
    const [backgroundEnabled, setBackgroundEnabled] = useState(true)
    const [isLoadingPreview, setIsLoadingPreview] = useState(false)

    const videoRef = useRef<HTMLVideoElement>(null)
    const streamTracksRef = useRef<MediaStreamTrack[]>([])

    const isVideoCall = callType === 'video'

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
    } = useMediaDevices({ enabled: isOpen })

    // CRITICAL: Reset state when dialog opens or callType changes
    // This ensures fresh defaults for each new call
    useEffect(() => {
      if (isOpen) {
        setIsJoining(false)
        setMicEnabled(true)
        setCameraEnabled(callType === 'video')
        setBackgroundEnabled(true)

        // Enumerate devices only while modal is open (strict gating).
        refreshDevices({ requestAudio: true, requestVideo: callType === 'video' })
      }
    }, [isOpen, callType, refreshDevices])

    const handleJoin = () => {
      if (isJoining) {
        return
      }

      setIsJoining(true)

      // Cleanup preview stream before joining
      cleanupPreview()

      onJoin({
        micEnabled,
        cameraEnabled,
        backgroundEnabled,
        audioInputDeviceId: selectedAudioInputId,
        videoInputDeviceId: selectedVideoInputId
      })
    }

    const handleCancel = () => {
      if (isJoining) {
        return
      }

      cleanupPreview()
      onCancel()
    }

    // Cleanup preview stream
    const cleanupPreview = useCallback(() => {
      // Stop all tracks
      streamTracksRef.current.forEach(track => {
        track.stop()
      })
      streamTracksRef.current = []

      // Clear video element
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }, [])

    // Setup camera preview when camera is enabled
    useEffect(() => {
      if (!cameraEnabled || isJoining || !isOpen) {
        cleanupPreview()
        return
      }

      let isMounted = true
      setIsLoadingPreview(true)

      const initPreview = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: selectedVideoInputId
              ? { deviceId: { exact: selectedVideoInputId }, width: 640, height: 360 }
              : { width: 640, height: 360 },
            audio: false
          })

          if (!isMounted) {
            stream.getTracks().forEach(track => track.stop())
            return
          }

          const videoTrack = stream.getVideoTracks()[0]
          if (!videoTrack) {
            throw new Error('No video track available')
          }

          streamTracksRef.current = [videoTrack]

          // Attach stream to video element
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }
        } catch (error) {
          console.error('[RejoinCallDialog] Failed to access camera:', error)
        } finally {
          if (isMounted) {
            setIsLoadingPreview(false)
          }
        }
      }

      initPreview()

      return () => {
        isMounted = false
        cleanupPreview()
      }
    }, [cameraEnabled, isJoining, isOpen, cleanupPreview, selectedVideoInputId])

    // Reset state when dialog closes
    useEffect(() => {
      if (!isOpen) {
        setIsJoining(false)
        setMicEnabled(true)
        setCameraEnabled(callType === 'video')
        setBackgroundEnabled(true)
      }
    }, [isOpen, callType])

    if (!isOpen) return null

    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent
          className="gba:w-[90vw] gba:max-w-sm gba:p-0 gba:overflow-hidden gba:bg-gradient-to-b gba:from-gray-800 gba:to-gray-900 gba:border-0"
          data-testid={prefixDataTestId}
          onPointerDownOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
        >
          <DialogTitle className="gba:sr-only">{t('chat-rejoinCall') || 'Rejoin Call'}</DialogTitle>
          <DialogDescription className="gba:sr-only">
            {t('chat-rejoinCallDescription') || 'Set up your audio and video before rejoining the call'}
          </DialogDescription>
          <div className="gba:flex gba:flex-col gba:items-center gba:py-6 gba:px-6">
            {/* Call Type Indicator */}
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-gray-400 gba:text-sm gba:mb-4">
              <UsersThreeIcon className="gba:w-4 gba:h-4" weight="fill" />
              <span>{isVideoCall ? t('call-incomingGroupVideoCall') : t('call-incomingGroupAudioCall')}</span>
            </div>

            {/* Video Preview or Icon */}
            {isVideoCall ? (
              <>
                {/* Video Preview */}
                <div className="gba:relative gba:w-full gba:max-w-xs gba:aspect-video gba:mb-4 gba:rounded-lg gba:overflow-hidden gba:bg-gray-800 gba:border gba:border-gray-600">
                  {cameraEnabled ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="gba:w-full gba:h-full gba:object-cover"
                      />
                      {isLoadingPreview && (
                        <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:bg-gray-800/70">
                          <Spinner className="gba:w-6 gba:h-6 gba:text-white" />
                        </div>
                      )}
                      {/* Status indicators overlay */}
                      <div className="gba:absolute gba:bottom-2 gba:left-2 gba:right-2 gba:flex gba:items-center gba:justify-between">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          {!micEnabled && (
                            <div className="gba:flex gba:items-center gba:justify-center gba:w-7 gba:h-7 gba:rounded-full gba:bg-destructive gba:shadow-lg">
                              <MicrophoneSlashIcon
                                className="gba:w-4 gba:h-4 gba:text-destructive-foreground"
                                weight="fill"
                              />
                            </div>
                          )}
                        </div>
                        {backgroundEnabled && (
                          <div className="gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:rounded gba:bg-primary/90 gba:shadow-lg">
                            <MagicWandIcon className="gba:w-3.5 gba:h-3.5 gba:text-primary-foreground" weight="fill" />
                            <span className="gba:text-xs gba:text-primary-foreground">
                              {t('call-backgroundWillBeApplied') || 'Background will be applied in call'}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:bg-gray-800">
                      <Avatar className="gba:w-24 gba:h-24 gba:ring-4 gba:ring-white/10">
                        {userAvatarUrl && <AvatarImage src={userAvatarUrl} alt={userName || 'User'} />}
                        <AvatarFallback className="gba:text-3xl gba:bg-gray-700 gba:text-white">
                          {userName ? getInitials(userName) : <UserIcon className="gba:w-12 gba:h-12" weight="fill" />}
                        </AvatarFallback>
                      </Avatar>
                      {/* Status indicators overlay - mic only */}
                      <div className="gba:absolute gba:bottom-2 gba:left-2">
                        {!micEnabled && (
                          <div className="gba:flex gba:items-center gba:justify-center gba:w-7 gba:h-7 gba:rounded-full gba:bg-destructive gba:shadow-lg">
                            <MicrophoneSlashIcon
                              className="gba:w-4 gba:h-4 gba:text-destructive-foreground"
                              weight="fill"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Group Name */}
                <h2 className="gba:text-lg gba:font-semibold gba:text-white gba:mb-1">
                  {conversationName || t('chat-groupCall')}
                </h2>

                {/* Participant Count */}
                {participantCount > 0 && (
                  <p className="gba:text-gray-400 gba:text-sm gba:mb-3">
                    {participantCount} {t('call-activeParticipants') || 'active'}
                  </p>
                )}
              </>
            ) : (
              <>
                {/* Audio Call Icon */}
                <div className="gba:relative gba:mb-6">
                  <div className="gba:flex gba:items-center gba:justify-center gba:w-28 gba:h-28 gba:rounded-full gba:bg-success/20 gba:relative gba:z-10">
                    <PhoneIcon className="gba:w-12 gba:h-12 gba:text-success" weight="fill" />
                  </div>
                </div>

                {/* Group Name */}
                <h2 className="gba:text-xl gba:font-semibold gba:text-white gba:mb-1">
                  {conversationName || t('chat-groupCall')}
                </h2>

                {/* Participant Count */}
                {participantCount > 0 && (
                  <p className="gba:text-gray-400 gba:text-sm gba:mb-4">
                    {participantCount} {t('call-activeParticipants') || 'active'}
                  </p>
                )}
              </>
            )}

            {/* Pre-join Controls - Mic, Camera, and Background toggles */}
            <div
              className={`gba:mb-6 gba:w-full gba:max-w-xs ${isVideoCall ? 'gba:grid gba:grid-cols-2 gba:gap-2' : 'gba:flex gba:justify-center'}`}
            >
              {/* Mic Split Button - Toggle + Device Selector */}
              <div className="gba:flex gba:items-stretch gba:gap-0">
                <button
                  onClick={() => setMicEnabled(!micEnabled)}
                  disabled={isJoining}
                  className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:px-4 gba:py-2.5 gba:rounded-l-full gba:bg-gray-700/50 hover:gba:bg-gray-700 gba:transition-colors gba:border gba:border-gray-600 disabled:gba:opacity-50 disabled:gba:cursor-not-allowed"
                  data-testid={`${prefixDataTestId}-toggle-mic`}
                >
                  {micEnabled ? (
                    <MicrophoneIcon className="gba:w-4 gba:h-4 gba:text-white" weight="fill" />
                  ) : (
                    <MicrophoneSlashIcon className="gba:w-4 gba:h-4 gba:text-destructive" weight="fill" />
                  )}
                  <span className="gba:text-xs gba:text-white gba:whitespace-nowrap">
                    {micEnabled ? t('call-micOn') || 'Mic' : t('call-micOff') || 'Mic off'}
                  </span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      disabled={isJoining || isEnumerating}
                      className="gba:flex gba:items-center gba:justify-center gba:px-2 gba:py-2.5 gba:rounded-r-full gba:bg-gray-700/50 hover:gba:bg-gray-700 gba:transition-colors gba:border gba:border-l-0 gba:border-gray-600 disabled:gba:opacity-50 disabled:gba:cursor-not-allowed"
                      data-testid={`${prefixDataTestId}-mic-settings`}
                      aria-label={t('call-audioSettings') || 'Audio Settings'}
                    >
                      <CaretDownIcon className="gba:w-3 gba:h-3 gba:text-white" weight="bold" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="gba:w-64 gba:bg-gray-800 gba:border-gray-700">
                    <DropdownMenuLabel className="gba:flex gba:items-center gba:gap-2 gba:text-white">
                      <MicrophoneIcon className="gba:w-4 gba:h-4" />
                      {t('call-selectMicrophone') || 'Microphone'}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="gba:bg-gray-700" />
                    {audioInputDevices.length > 0 ? (
                      audioInputDevices.map(device => (
                        <DropdownMenuItem
                          key={device.deviceId}
                          onClick={() => setSelectedAudioInputId(device.deviceId)}
                          className="gba:flex gba:items-center gba:gap-2 gba:text-white hover:gba:bg-gray-700"
                        >
                          {selectedAudioInputId === device.deviceId && (
                            <CheckIcon className="gba:w-4 gba:h-4 gba:text-success" weight="bold" />
                          )}
                          <span className={selectedAudioInputId === device.deviceId ? '' : 'gba:ml-6'}>
                            {device.label}
                          </span>
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled className="gba:text-gray-400">
                        {t('call-noDevicesFound') || 'No devices found'}
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator className="gba:bg-gray-700" />
                    <DropdownMenuLabel className="gba:flex gba:items-center gba:gap-2 gba:text-white">
                      <SpeakerHighIcon className="gba:w-4 gba:h-4" />
                      {t('call-selectSpeaker') || 'Select Speaker'}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="gba:bg-gray-700" />
                    {canSelectAudioOutput ? (
                      audioOutputDevices.length > 0 ? (
                        audioOutputDevices.map((device, idx) => (
                          <DropdownMenuItem
                            key={device.deviceId}
                            onClick={() => setSelectedAudioOutputId(device.deviceId)}
                            className="gba:flex gba:items-center gba:gap-2 gba:text-white hover:gba:bg-gray-700"
                            data-testid={`${prefixDataTestId}-speaker-device-${idx}`}
                          >
                            {selectedAudioOutputId === device.deviceId && (
                              <CheckIcon className="gba:w-4 gba:h-4 gba:text-success" weight="bold" />
                            )}
                            <span className={selectedAudioOutputId === device.deviceId ? '' : 'gba:ml-6'}>
                              {device.label}
                            </span>
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem disabled className="gba:text-gray-400">
                          {t('call-noDevicesFound') || 'No devices found'}
                        </DropdownMenuItem>
                      )
                    ) : (
                      <DropdownMenuItem disabled className="gba:text-gray-400">
                        {t('call-speakerNotSupported') || 'Speaker selection not supported in this browser'}
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuCheckboxItem
                      checked={callPreferences.noiseSuppressionEnabled}
                      onCheckedChange={checked => callPreferences.setNoiseSuppressionEnabled(Boolean(checked))}
                      className="gba:text-white hover:gba:bg-gray-700"
                      data-testid={`${prefixDataTestId}-noise-suppression-toggle`}
                    >
                      {t('call-noiseSuppression') || 'Noise suppression'}
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem
                      checked={callPreferences.autoGainControlEnabled}
                      onCheckedChange={checked => callPreferences.setAutoGainControlEnabled(Boolean(checked))}
                      className="gba:text-white hover:gba:bg-gray-700"
                      data-testid={`${prefixDataTestId}-auto-gain-control-toggle`}
                    >
                      {t('call-autoGainControl') || 'Auto gain control'}
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Camera Split Button - Toggle + Device Selector (video calls only) */}
              {isVideoCall && (
                <div className="gba:flex gba:items-stretch gba:gap-0">
                  <button
                    onClick={() => setCameraEnabled(!cameraEnabled)}
                    disabled={isJoining}
                    className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:px-4 gba:py-2.5 gba:rounded-l-full gba:bg-gray-700/50 hover:gba:bg-gray-700 gba:transition-colors gba:border gba:border-gray-600 disabled:gba:opacity-50 disabled:gba:cursor-not-allowed"
                    data-testid={`${prefixDataTestId}-toggle-camera`}
                  >
                    {cameraEnabled ? (
                      <VideoCameraIcon className="gba:w-4 gba:h-4 gba:text-white" weight="fill" />
                    ) : (
                      <VideoCameraSlashIcon className="gba:w-4 gba:h-4 gba:text-destructive" weight="fill" />
                    )}
                    <span className="gba:text-xs gba:text-white gba:whitespace-nowrap">
                      {cameraEnabled ? t('call-cameraOn') || 'Camera' : t('call-cameraOff') || 'Camera off'}
                    </span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        disabled={isJoining || isEnumerating}
                        className="gba:flex gba:items-center gba:justify-center gba:px-2 gba:py-2.5 gba:rounded-r-full gba:bg-gray-700/50 hover:gba:bg-gray-700 gba:transition-colors gba:border gba:border-l-0 gba:border-gray-600 disabled:gba:opacity-50 disabled:gba:cursor-not-allowed"
                        data-testid={`${prefixDataTestId}-camera-settings`}
                        aria-label={t('call-videoSettings') || 'Video Settings'}
                      >
                        <CaretDownIcon className="gba:w-3 gba:h-3 gba:text-white" weight="bold" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="gba:w-64 gba:bg-gray-800 gba:border-gray-700">
                      <DropdownMenuLabel className="gba:flex gba:items-center gba:gap-2 gba:text-white">
                        <VideoCameraIcon className="gba:w-4 gba:h-4" />
                        {t('call-selectCamera') || 'Camera'}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="gba:bg-gray-700" />
                      {videoInputDevices.length > 0 ? (
                        videoInputDevices.map(device => (
                          <DropdownMenuItem
                            key={device.deviceId}
                            onClick={() => setSelectedVideoInputId(device.deviceId)}
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
                          {t('call-noDevicesFound') || 'No devices found'}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* Background Toggle - Only when camera is on, spans full width */}
              {isVideoCall && cameraEnabled && (
                <button
                  onClick={() => setBackgroundEnabled(!backgroundEnabled)}
                  disabled={isJoining}
                  className="gba:col-span-2 gba:flex gba:items-center gba:justify-center gba:gap-2 gba:px-4 gba:py-2.5 gba:rounded-full gba:bg-gray-700/50 hover:gba:bg-gray-700 gba:transition-colors gba:border gba:border-gray-600 disabled:gba:opacity-50 disabled:gba:cursor-not-allowed"
                  data-testid={`${prefixDataTestId}-toggle-background`}
                >
                  <MagicWandIcon
                    className={`gba:w-4 gba:h-4 ${backgroundEnabled ? 'gba:text-primary' : 'gba:text-white'}`}
                    weight="fill"
                  />
                  <span className="gba:text-xs gba:text-white gba:whitespace-nowrap">
                    {backgroundEnabled
                      ? t('call-backgroundOn') || 'Background'
                      : t('call-backgroundOff') || 'Background off'}
                  </span>
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="gba:flex gba:items-center gba:justify-center gba:gap-8">
              {/* Cancel Button */}
              <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                <Button
                  size="icon"
                  onClick={handleCancel}
                  disabled={isJoining}
                  className="gba:w-16 gba:h-16 gba:rounded-full gba:shadow-lg gba:bg-destructive gba:hover:bg-destructive/90 disabled:gba:opacity-60 disabled:gba:cursor-not-allowed"
                  data-testid={`${prefixDataTestId}-cancel`}
                >
                  <span className="gba:text-white gba:text-xl">×</span>
                </Button>
                <span className="gba:text-xs gba:text-gray-400">{t('common-cancel')}</span>
              </div>

              {/* Join Button */}
              <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                <Button
                  size="icon"
                  onClick={handleJoin}
                  disabled={isJoining}
                  className="gba:w-16 gba:h-16 gba:rounded-full gba:shadow-lg gba:bg-success gba:hover:bg-success/90 disabled:gba:opacity-60 disabled:gba:cursor-not-allowed"
                  data-testid={`${prefixDataTestId}-join`}
                >
                  {isJoining ? (
                    <Spinner className="gba:w-7 gba:h-7 gba:text-white" />
                  ) : (
                    <PhoneIcon className="gba:w-7 gba:h-7 gba:text-white" weight="fill" />
                  )}
                </Button>
                <span className="gba:text-xs gba:text-gray-400">
                  {isJoining ? t('call-joining') || 'Joining...' : t('call-join')}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }
)

RejoinCallDialog.displayName = 'RejoinCallDialog'

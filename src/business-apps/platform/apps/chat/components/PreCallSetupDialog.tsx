import React, { useEffect, useState, memo, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  IconAvatar,
  Spinner,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import { rtkDebug } from '../utils/rtkDebug'
import {
  MicrophoneIcon,
  MicrophoneSlashIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  PhoneIcon,
  XIcon,
  UsersThreeIcon,
  MagicWandIcon,
  UserIcon,
  VideoIcon,
  CaretDownIcon,
  CheckIcon,
  SpeakerHighIcon
} from '@phosphor-icons/react'
import { useChatTranslation } from '../contexts/TranslationContext'
import { useMediaDevices } from '../hooks/useMediaDevices'
import { useCallPreferences } from '../hooks/useCallPreferences'
import { DeviceTestDialog } from './DeviceTestDialog'

interface PreCallSetupDialogProps {
  isOpen: boolean
  callType: 'audio' | 'video'
  conversationName?: string
  participantCount?: number
  userName?: string
  userAvatarUrl?: string
  onStart: (preferences: {
    micEnabled: boolean
    cameraEnabled: boolean
    backgroundEnabled: boolean
    audioInputDeviceId?: string | null
    videoInputDeviceId?: string | null
  }) => void
  onCancel: () => void
  prefixDataTestId?: string
  conversationType?: 'direct' | 'group' | 'meeting' // Type of conversation: direct (1-on-1), group, or meeting
}

const getInitials = (name: string): string => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * Parse direct call meeting name format: "Call {Name A} | {Name B}"
 * Returns the participant names as an array, or null if not a direct call format
 */
const parseDirectCallName = (conversationName?: string): string[] | null => {
  if (!conversationName) return null

  // Check if it matches the format "Call {Name A} | {Name B}"
  const match = conversationName.match(/^Call\s+(.+?)\s+\|\s+(.+)$/)
  if (!match) return null

  return [match[1].trim(), match[2].trim()]
}

export const PreCallSetupDialog: React.FC<PreCallSetupDialogProps> = memo(
  ({
    isOpen,
    callType,
    conversationName,
    participantCount = 0,
    userName,
    userAvatarUrl,
    onStart,
    onCancel,
    prefixDataTestId = 'pre-call-setup-dialog',
    conversationType = 'group' // Default to group for backward compatibility
  }) => {
    const t = useChatTranslation()
    const callPreferences = useCallPreferences()
    const [isStarting, setIsStarting] = useState(false)
    const [micEnabled, setMicEnabled] = useState(true)
    const [cameraEnabled, setCameraEnabled] = useState(callType === 'video')
    const [backgroundEnabled, setBackgroundEnabled] = useState(true)
    const [isLoadingPreview, setIsLoadingPreview] = useState(false)
    const [isDeviceTestOpen, setIsDeviceTestOpen] = useState(false)

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

    // Determine the call title based on conversation type
    const getCallTitle = (): string => {
      switch (conversationType) {
        case 'direct':
          // 1-on-1 call - show "Call with {participant name}"
          if (userName) {
            return t('chat-callWith', { name: userName }) || `Call with ${userName}`
          }

          // Try to parse the conversationName if it's in "Call {Name A} | {Name B}" format
          const participants = parseDirectCallName(conversationName)
          if (participants && participants.length === 2) {
            // For now, just show the first participant (we don't know which one is "other")
            // In a real scenario, you'd filter out the current user's name
            return t('chat-callWith', { name: participants[0] }) || `Call with ${participants[0]}`
          }

          return conversationName || t('chat-directCall') || '1-on-1 Call'
        case 'meeting':
          // Calendar meeting
          return conversationName || t('chat-meeting') || 'Meeting'
        case 'group':
        default:
          // Group call
          return conversationName || t('chat-groupCall') || 'Group Call'
      }
    }

    const callTitle = getCallTitle()

    // CRITICAL: Reset state when dialog opens or callType changes
    // This ensures fresh defaults for each new call
    useEffect(() => {
      if (isOpen) {
        rtkDebug.log('[PreCallSetupDialog] Dialog opened - resetting to defaults', {
          callType,
          willSetMic: true,
          willSetCamera: callType === 'video',
          willSetBackground: true
        })
        setIsStarting(false)
        setMicEnabled(true)
        setCameraEnabled(callType === 'video')
        setBackgroundEnabled(true)

        // Enumerate devices only when modal is shown (strict gating).
        refreshDevices({ requestAudio: true, requestVideo: callType === 'video' })
      }
    }, [isOpen, callType, refreshDevices])

    const handleStart = () => {
      if (isStarting) {
        rtkDebug.log('[PreCallSetupDialog] Already starting, ignoring duplicate click')
        return
      }

      setIsStarting(true)
      rtkDebug.log('[PreCallSetupDialog] Starting call with preferences:', {
        micEnabled,
        cameraEnabled,
        backgroundEnabled
      })

      // Cleanup preview stream before starting
      cleanupPreview()

      onStart({
        micEnabled,
        cameraEnabled,
        backgroundEnabled,
        audioInputDeviceId: selectedAudioInputId,
        videoInputDeviceId: selectedVideoInputId
      })
    }

    const handleCancel = () => {
      if (isStarting) {
        rtkDebug.log('[PreCallSetupDialog] Already starting, ignoring cancel')
        return
      }

      cleanupPreview()
      onCancel()
    }

    // Cleanup preview stream
    const cleanupPreview = useCallback(() => {
      rtkDebug.log('[PreCallSetupDialog] Cleaning up preview')

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
    // CRITICAL: Include isOpen in dependencies to re-initialize preview when dialog reopens
    useEffect(() => {
      if (!isOpen || !cameraEnabled || isStarting) {
        cleanupPreview()
        return
      }

      let isMounted = true
      setIsLoadingPreview(true)

      const initPreview = async () => {
        try {
          rtkDebug.log('[PreCallSetupDialog] Requesting camera access for preview')

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

          rtkDebug.log('[PreCallSetupDialog] Camera preview ready')
        } catch (error) {
          console.error('[PreCallSetupDialog] Failed to access camera:', error)
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
    }, [isOpen, cameraEnabled, isStarting, cleanupPreview, selectedVideoInputId])

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        cleanupPreview()
      }
    }, [cleanupPreview])

    if (!isOpen) return null

    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent
          className="gba:w-[90vw] gba:max-w-sm gba:p-0 gba:overflow-hidden gba:bg-gradient-to-b gba:from-gray-800 gba:to-gray-900 gba:border-0"
          data-testid={prefixDataTestId}
          onPointerDownOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
        >
          <DialogTitle className="gba:sr-only">
            {isVideoCall
              ? t('call-startVideoCall') || 'Start Video Call'
              : t('call-startAudioCall') || 'Start Audio Call'}
          </DialogTitle>
          <DialogDescription className="gba:sr-only">
            {t('call-setupYourCallSettings') || 'Setup your call settings before joining'} {callTitle}
          </DialogDescription>

          <div className="gba:flex gba:flex-col gba:items-center gba:py-6 gba:px-6">
            {/* Call Type Indicator */}
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-gray-400 gba:text-sm gba:mb-4">
              <UsersThreeIcon className="gba:w-4 gba:h-4" weight="fill" />
              <span>
                {isVideoCall
                  ? t('call-startingVideoCall') || 'Starting video call'
                  : t('call-startingAudioCall') || 'Starting audio call'}
              </span>
            </div>

            {/* Video Preview or User Avatar */}
            {isVideoCall ? (
              <>
                {/* Video Preview - Always same size */}
                <div className="gba:relative gba:w-full gba:max-w-xs gba:aspect-video gba:mb-4 gba:rounded-lg gba:overflow-hidden gba:bg-gray-800 gba:border gba:border-gray-600">
                  {cameraEnabled && !isStarting ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="gba:w-full gba:h-full gba:object-cover gba:scale-x-[-1]"
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
                <h2 className="gba:text-lg gba:font-semibold gba:text-white gba:mb-1">{callTitle}</h2>

                {/* Participant Count */}
                {participantCount > 0 && (
                  <p className="gba:text-gray-400 gba:text-sm gba:mb-3">
                    {participantCount}{' '}
                    {participantCount === 1
                      ? t('chat-participant') || 'participant'
                      : t('groupCall-participants') || 'participants'}
                  </p>
                )}

                {/* Starting status */}
                {isStarting ? (
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
                    <Spinner className="gba:w-4 gba:h-4 gba:text-white" />
                    <p className="gba:text-white gba:text-sm gba:font-medium">
                      {t('call-connecting') || 'Connecting...'}
                    </p>
                  </div>
                ) : (
                  <p className="gba:text-gray-400 gba:text-sm gba:mb-4">{t('call-readyToStart') || 'Ready to start'}</p>
                )}
              </>
            ) : (
              <>
                {/* User Avatar for audio calls */}
                <div className="gba:relative gba:mb-6">
                  {userAvatarUrl ? (
                    <Avatar className="gba:w-28 gba:h-28 gba:relative gba:z-10 gba:ring-4 gba:ring-white/20">
                      <AvatarImage src={userAvatarUrl} alt={userName || 'User'} />
                      <AvatarFallback className="gba:text-3xl gba:bg-gray-700 gba:text-white">
                        {userName ? getInitials(userName) : '?'}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <IconAvatar
                      className="gba:w-28 gba:h-28 gba:relative gba:z-10 gba:bg-gray-700"
                      label={callTitle}
                      icon={isVideoCall ? VideoIcon : UsersThreeIcon}
                    />
                  )}
                </div>

                {/* Group Name */}
                <h2 className="gba:text-xl gba:font-semibold gba:text-white gba:mb-1">{callTitle}</h2>

                {/* Participant Count */}
                {participantCount > 0 && (
                  <p className="gba:text-gray-400 gba:text-sm gba:mb-2">
                    {participantCount}{' '}
                    {participantCount === 1
                      ? t('chat-participant') || 'participant'
                      : t('groupCall-participants') || 'participants'}
                  </p>
                )}

                {/* Starting status */}
                {isStarting ? (
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mb-6">
                    <Spinner className="gba:w-4 gba:h-4 gba:text-white" />
                    <p className="gba:text-white gba:text-sm gba:font-medium">
                      {t('call-connecting') || 'Connecting...'}
                    </p>
                  </div>
                ) : (
                  <p className="gba:text-gray-400 gba:text-sm gba:mb-4">{t('call-readyToStart') || 'Ready to start'}</p>
                )}
              </>
            )}

            {/* Pre-call Controls - Mic, Camera, and Background toggles */}
            <div
              className={`gba:mb-6 gba:w-full gba:max-w-xs ${isVideoCall ? 'gba:grid gba:grid-cols-2 gba:gap-2' : 'gba:flex gba:justify-center'}`}
            >
              {/* Mic Split Button - Toggle + Device Selector */}
              <div className="gba:flex gba:items-stretch gba:gap-0">
                <button
                  onClick={() => setMicEnabled(!micEnabled)}
                  disabled={isStarting}
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
                      disabled={isStarting || isEnumerating}
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
                          <span className={selectedAudioInputId !== device.deviceId ? 'gba:ml-6' : ''}>
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
                    {!canSelectAudioOutput ? (
                      <DropdownMenuItem disabled className="gba:text-gray-400">
                        {t('call-speakerNotSupported') || 'Speaker selection not supported in this browser'}
                      </DropdownMenuItem>
                    ) : audioOutputDevices.length > 0 ? (
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
                          <span className={selectedAudioOutputId !== device.deviceId ? 'gba:ml-6' : ''}>
                            {device.label}
                          </span>
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled className="gba:text-gray-400">
                        {t('call-noDevicesFound') || 'No devices found'}
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

                    <DropdownMenuSeparator className="gba:bg-gray-700" />
                    <DropdownMenuItem
                      onClick={() => setIsDeviceTestOpen(true)}
                      className="gba:text-white hover:gba:bg-gray-700"
                      data-testid={`${prefixDataTestId}-test-devices`}
                    >
                      {t('call-testDevices') || 'Test devices'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Camera Split Button - Toggle + Device Selector (video calls only) */}
              {isVideoCall && (
                <div className="gba:flex gba:items-stretch gba:gap-0">
                  <button
                    onClick={() => setCameraEnabled(!cameraEnabled)}
                    disabled={isStarting}
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
                        disabled={isStarting || isEnumerating}
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
                            <span className={selectedVideoInputId !== device.deviceId ? 'gba:ml-6' : ''}>
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
                  disabled={isStarting}
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

            <DeviceTestDialog
              isOpen={isDeviceTestOpen}
              onOpenChange={setIsDeviceTestOpen}
              t={t}
              audioInputDevices={audioInputDevices}
              audioOutputDevices={audioOutputDevices}
              selectedAudioInputId={selectedAudioInputId}
              selectedAudioOutputId={selectedAudioOutputId}
              setSelectedAudioInputId={setSelectedAudioInputId}
              setSelectedAudioOutputId={setSelectedAudioOutputId}
              canSelectAudioOutput={canSelectAudioOutput}
              prefixDataTestId={`${prefixDataTestId}-device-test`}
            />

            {/* Action Buttons */}
            <div className="gba:flex gba:items-center gba:justify-center gba:gap-8">
              {/* Cancel Button */}
              <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCancel}
                  disabled={isStarting}
                  className="gba:w-16 gba:h-16 gba:rounded-full gba:shadow-lg gba:border-gray-600"
                  data-testid={`${prefixDataTestId}-cancel`}
                >
                  <XIcon className="gba:w-7 gba:h-7" weight="bold" />
                </Button>
                <span className="gba:text-xs gba:text-gray-400">{t('call-cancel') || 'Cancel'}</span>
              </div>

              {/* Start Button */}
              <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                <Button
                  size="icon"
                  onClick={handleStart}
                  disabled={isStarting}
                  className="gba:w-16 gba:h-16 gba:rounded-full gba:shadow-lg gba:bg-success gba:hover:bg-success/90 disabled:gba:opacity-60 disabled:gba:cursor-not-allowed"
                  data-testid={`${prefixDataTestId}-start`}
                >
                  {isStarting ? (
                    <Spinner className="gba:w-7 gba:h-7 gba:text-white" />
                  ) : (
                    <PhoneIcon className="gba:w-7 gba:h-7 gba:text-white" weight="fill" />
                  )}
                </Button>
                <span className="gba:text-xs gba:text-white">
                  {isStarting ? t('call-starting') || 'Starting...' : t('call-start') || 'Start'}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  },
  (prevProps, nextProps) => {
    // Only re-render if key props change
    return (
      prevProps.isOpen === nextProps.isOpen &&
      prevProps.callType === nextProps.callType &&
      prevProps.conversationName === nextProps.conversationName &&
      prevProps.participantCount === nextProps.participantCount &&
      prevProps.prefixDataTestId === nextProps.prefixDataTestId
    )
  }
)

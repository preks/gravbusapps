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
  Label,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import {
  MicrophoneIcon,
  MicrophoneSlashIcon,
  VideoCameraIcon,
  PhoneIcon,
  XIcon,
  UsersThreeIcon,
  MagicWandIcon,
  UserIcon,
  VideoIcon,
  CaretDownIcon,
  SpeakerHighIcon
} from '@phosphor-icons/react'
import { useChatTranslation } from '../contexts/TranslationContext'
import { useMediaDevices } from '../hooks/useMediaDevices'
import { MicLevelIndicator } from './call/MicLevelIndicator'

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
    const [isStarting, setIsStarting] = useState(false)
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
        return
      }

      setIsStarting(true)

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
          className="gba:w-[90vw] gba:max-w-lg gba:p-0 gba:overflow-hidden gba:bg-background gba:border-border gba:max-h-[90vh] gba:flex gba:flex-col"
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

          {/* Header Section */}
          <div className="gba:flex gba:flex-col gba:items-center gba:py-4 gba:px-6 gba:border-b gba:border-border gba:flex-shrink-0">
            {/* Call Title and Info */}
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <UsersThreeIcon className="gba:w-5 gba:h-5 gba:text-muted-foreground" weight="fill" />
              <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">{callTitle}</h2>
            </div>

            {participantCount > 0 && (
              <p className="gba:text-sm gba:text-muted-foreground">
                {participantCount}{' '}
                {participantCount === 1
                  ? t('chat-participant') || 'participant'
                  : t('groupCall-participants') || 'participants'}
              </p>
            )}
          </div>

          {/* Scrollable Content */}
          <div className="gba:overflow-y-auto gba:flex-1">
            {/* Video Preview Section */}
            <div className="gba:flex gba:flex-col gba:items-center">
              {isVideoCall ? (
                <div className="gba:relative gba:w-full gba:aspect-video gba:bg-muted gba:overflow-hidden gba:rounded-lg">
                  {cameraEnabled && !isStarting ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="gba:w-full gba:h-full gba:object-cover gba:scale-x-[-1]"
                    />
                  ) : (
                    <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:min-h-0 gba:bg-muted gba:rounded-lg gba:overflow-hidden">
                      <Avatar className="gba:w-32 gba:h-32 gba:mb-4 gba:flex-shrink-0">
                        {userAvatarUrl && <AvatarImage src={userAvatarUrl} alt={userName || 'User'} />}
                        <AvatarFallback className="gba:text-4xl gba:bg-muted gba:text-foreground">
                          {userName ? getInitials(userName) : <UserIcon className="gba:w-16 gba:h-16" weight="fill" />}
                        </AvatarFallback>
                      </Avatar>
                      <p className="gba:text-sm gba:text-muted-foreground gba:flex-shrink-0">
                        {t('call-cameraOff') || 'Your camera is turned off'}
                      </p>
                    </div>
                  )}

                  {isLoadingPreview && cameraEnabled && (
                    <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:bg-muted/70">
                      <Spinner className="gba:w-6 gba:h-6" />
                    </div>
                  )}

                  {/* Top Right: Effects Button - Only when background is enabled */}
                  {backgroundEnabled && (
                    <div className="gba:absolute gba:top-4 gba:right-4">
                      <button
                        onClick={() => setBackgroundEnabled(!backgroundEnabled)}
                        className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:rounded gba:transition-colors gba:backdrop-blur-sm gba:bg-primary/90 gba:text-primary-foreground hover:gba:bg-primary/80"
                        data-testid={`${prefixDataTestId}-preview-effects-toggle`}
                      >
                        <MagicWandIcon className="gba:w-4 gba:h-4" weight="fill" />
                        <span className="gba:text-sm gba:font-medium">
                          {t('call-effectsAndAvatars') || 'Effects and avatars'}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Bottom Controls Overlay - Always visible */}
                  <div className="gba:absolute gba:bottom-0 gba:left-0 gba:right-0 gba:bg-gradient-to-t gba:from-black/60 gba:to-transparent gba:p-4">
                    <div className="gba:flex gba:items-center gba:justify-between">
                      {/* Left: Mic/Camera Controls */}
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <button
                          onClick={() => setMicEnabled(!micEnabled)}
                          className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-black/40 hover:gba:bg-black/60 gba:transition-colors gba:backdrop-blur-sm"
                          data-testid={`${prefixDataTestId}-preview-mic-toggle`}
                        >
                          {micEnabled ? (
                            <MicrophoneIcon className="gba:w-5 gba:h-5 gba:text-white" weight="fill" />
                          ) : (
                            <MicrophoneSlashIcon className="gba:w-5 gba:h-5 gba:text-white" weight="fill" />
                          )}
                        </button>

                        {/* Camera with dropdown */}
                        <div className="gba:flex gba:items-stretch gba:gap-0">
                          <button
                            onClick={() => setCameraEnabled(!cameraEnabled)}
                            className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-l-full gba:bg-black/40 hover:gba:bg-black/60 gba:transition-colors gba:backdrop-blur-sm"
                            data-testid={`${prefixDataTestId}-preview-camera-toggle`}
                          >
                            {cameraEnabled ? (
                              <VideoCameraIcon className="gba:w-5 gba:h-5 gba:text-white" weight="fill" />
                            ) : (
                              <VideoCameraIcon
                                className="gba:w-5 gba:h-5 gba:text-white gba:opacity-50"
                                weight="fill"
                              />
                            )}
                          </button>
                          {cameraEnabled && videoInputDevices.length > 0 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="gba:flex gba:items-center gba:justify-center gba:px-2 gba:h-10 gba:rounded-r-full gba:bg-black/40 hover:gba:bg-black/60 gba:transition-colors gba:backdrop-blur-sm gba:border-l gba:border-white/20"
                                  data-testid={`${prefixDataTestId}-preview-camera-dropdown`}
                                >
                                  <CaretDownIcon className="gba:w-3 gba:h-3 gba:text-white" weight="bold" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                side="top"
                                align="start"
                                className="gba:bg-background gba:border-border gba:min-w-[200px]"
                              >
                                {videoInputDevices.map(device => (
                                  <DropdownMenuItem
                                    key={device.deviceId}
                                    onClick={() => setSelectedVideoInputId(device.deviceId)}
                                    className={selectedVideoInputId === device.deviceId ? 'gba:bg-accent' : ''}
                                  >
                                    {device.label || `Camera ${device.deviceId.substring(0, 8)}`}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>

                        {/* Apply Background - Only when camera is enabled */}
                        {cameraEnabled && (
                          <button
                            onClick={() => setBackgroundEnabled(!backgroundEnabled)}
                            className={`gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full gba:transition-colors gba:backdrop-blur-sm ${
                              backgroundEnabled
                                ? 'gba:bg-primary/90 hover:gba:bg-primary/80'
                                : 'gba:bg-black/40 hover:gba:bg-black/60'
                            }`}
                            data-testid={`${prefixDataTestId}-preview-background-toggle`}
                          >
                            <MagicWandIcon className="gba:w-5 gba:h-5 gba:text-white" weight="fill" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8">
                  {userAvatarUrl ? (
                    <Avatar className="gba:w-28 gba:h-28 gba:mb-4">
                      <AvatarImage src={userAvatarUrl} alt={userName || 'User'} />
                      <AvatarFallback className="gba:text-3xl gba:bg-muted gba:text-foreground">
                        {userName ? getInitials(userName) : '?'}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <IconAvatar
                      className="gba:w-28 gba:h-28 gba:mb-4 gba:bg-muted"
                      label={callTitle}
                      icon={isVideoCall ? VideoIcon : UsersThreeIcon}
                    />
                  )}
                </div>
              )}

              {isStarting && (
                <div className="gba:flex gba:items-center gba:gap-2 gba:py-4">
                  <Spinner className="gba:w-4 gba:h-4" />
                  <p className="gba:text-sm gba:font-medium gba:text-foreground">
                    {t('call-connecting') || 'Connecting...'}
                  </p>
                </div>
              )}
            </div>

            {/* Device Selection - Always Visible */}
            {/* Internal Mic and Speakers Section */}
            <div className="gba:border-t gba:border-border">
              <div className="gba:px-6 gba:py-3 gba:text-sm gba:font-medium">
                {t('call-internalMicAndSpeakers') || 'Internal Mic and Speakers'}
              </div>
              <div className="gba:px-6 gba:pb-4 gba:space-y-4">
                {/* Microphone */}
                <div className="gba:space-y-2">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <MicrophoneIcon className="gba:w-4 gba:h-4 gba:text-muted-foreground" weight="fill" />
                    <Label className="gba:text-sm">{t('call-microphone') || 'Microphone'}</Label>
                    <Switch
                      checked={micEnabled}
                      onCheckedChange={setMicEnabled}
                      disabled={isStarting}
                      className="gba:ml-auto"
                      data-testid={`${prefixDataTestId}-mic-toggle`}
                    />
                  </div>
                  <Select value={selectedAudioInputId || ''} onValueChange={setSelectedAudioInputId}>
                    <SelectTrigger className="gba:w-full" data-testid={`${prefixDataTestId}-mic-select`}>
                      <SelectValue placeholder={t('call-selectMicrophone') || 'Select microphone'} />
                    </SelectTrigger>
                    <SelectContent>
                      {audioInputDevices.length > 0 ? (
                        audioInputDevices.map(device => (
                          <SelectItem key={device.deviceId} value={device.deviceId}>
                            {device.label || `Microphone ${device.deviceId.substring(0, 8)}`}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          {t('call-noDevicesFound') || 'No devices found'}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <MicLevelIndicator
                    deviceId={selectedAudioInputId}
                    prefixDataTestId={`${prefixDataTestId}-mic-level`}
                  />
                </div>

                {/* Speaker */}
                <div className="gba:space-y-2 gba:pt-2 gba:border-t gba:border-border">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <SpeakerHighIcon className="gba:w-4 gba:h-4 gba:text-muted-foreground" weight="fill" />
                    <Label className="gba:text-sm">{t('call-speaker') || 'Speaker'}</Label>
                  </div>
                  {canSelectAudioOutput ? (
                    <Select value={selectedAudioOutputId || ''} onValueChange={setSelectedAudioOutputId}>
                      <SelectTrigger className="gba:w-full" data-testid={`${prefixDataTestId}-speaker-select`}>
                        <SelectValue placeholder={t('call-selectSpeaker') || 'Select speaker'} />
                      </SelectTrigger>
                      <SelectContent>
                        {audioOutputDevices.length > 0 ? (
                          audioOutputDevices.map(device => (
                            <SelectItem key={device.deviceId} value={device.deviceId}>
                              {device.label || `Speaker ${device.deviceId.substring(0, 8)}`}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>
                            {t('call-noDevicesFound') || 'No devices found'}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="gba:text-sm gba:text-muted-foreground">
                      {t('call-speakerNotSupported') || 'Speaker selection not supported in this browser'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-6 gba:p-4 gba:border-t gba:border-border gba:flex-shrink-0">
            {/* Cancel Button */}
            <div className="gba:flex gba:flex-col gba:items-center gba:gap-1.5">
              <Button
                variant="outline"
                size="icon"
                onClick={handleCancel}
                disabled={isStarting}
                className="gba:w-12 gba:h-12 gba:rounded-full"
                data-testid={`${prefixDataTestId}-cancel`}
              >
                <XIcon className="gba:w-5 gba:h-5" weight="bold" />
              </Button>
              <span className="gba:text-xs gba:text-muted-foreground">{t('call-cancel') || 'Cancel'}</span>
            </div>

            {/* Start Button */}
            <div className="gba:flex gba:flex-col gba:items-center gba:gap-1.5">
              <Button
                size="icon"
                onClick={handleStart}
                disabled={isStarting}
                className="gba:w-12 gba:h-12 gba:rounded-full gba:bg-success hover:gba:bg-success/90 disabled:gba:opacity-60 disabled:gba:cursor-not-allowed"
                data-testid={`${prefixDataTestId}-start`}
              >
                {isStarting ? (
                  <Spinner className="gba:w-5 gba:h-5 gba:text-white" />
                ) : (
                  <PhoneIcon className="gba:w-5 gba:h-5 gba:text-white" weight="fill" />
                )}
              </Button>
              <span className="gba:text-xs gba:text-foreground">
                {isStarting ? t('call-starting') || 'Starting...' : t('call-start') || 'Join now'}
              </span>
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

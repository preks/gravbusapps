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
import { rtkDebug } from '../utils/rtkDebug'
import {
  MicrophoneIcon,
  MicrophoneSlashIcon,
  VideoCameraIcon,
  PhoneIcon,
  PhoneDisconnectIcon,
  UsersThreeIcon,
  MagicWandIcon,
  UserIcon,
  CaretDownIcon,
  SpeakerHighIcon
} from '@phosphor-icons/react'
import type { GroupCallInvite } from '../hooks/useGroupCall'
import { useChatTranslation } from '../contexts/TranslationContext'
import { useMediaDevices } from '../hooks/useMediaDevices'
import { useCallPreferences } from '../hooks/useCallPreferences'
import { MicLevelIndicator } from './call/MicLevelIndicator'

interface IncomingGroupCallDialogProps {
  invite: GroupCallInvite
  userName?: string
  userAvatarUrl?: string
  onAccept: (preferences: {
    micEnabled: boolean
    cameraEnabled: boolean
    backgroundEnabled: boolean
    audioInputDeviceId?: string | null
    videoInputDeviceId?: string | null
  }) => void
  onDecline: () => void
  prefixDataTestId?: string
}

const getInitials = (name: string): string => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

// Pulsing ring animation component (uses design tokens)
const PulsingRing: React.FC<{ colorClass?: string }> = ({ colorClass = 'gba:bg-primary' }) => (
  <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center">
    <div
      className={`gba:absolute gba:w-36 gba:h-36 gba:rounded-full ${colorClass} gba:opacity-20 gba:animate-ping`}
      style={{ animationDuration: '1.5s' }}
    />
    <div
      className={`gba:absolute gba:w-32 gba:h-32 gba:rounded-full ${colorClass} gba:opacity-30 gba:animate-ping`}
      style={{ animationDuration: '1.5s', animationDelay: '0.3s' }}
    />
  </div>
)

export const IncomingGroupCallDialog: React.FC<IncomingGroupCallDialogProps> = memo(
  ({ invite, userName, userAvatarUrl, onAccept, onDecline, prefixDataTestId = 'incoming-group-call-dialog' }) => {
    const t = useChatTranslation()
    const callPreferences = useCallPreferences()
    const [ringCount, setRingCount] = useState(0)
    const [isJoining, setIsJoining] = useState(false)
    const [micEnabled, setMicEnabled] = useState(true)
    const [cameraEnabled, setCameraEnabled] = useState(invite?.callType === 'video')
    const [backgroundEnabled, setBackgroundEnabled] = useState(true)
    const [isLoadingPreview, setIsLoadingPreview] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)
    const streamTracksRef = useRef<MediaStreamTrack[]>([])

    const callerName = invite.from.odName || 'Unknown'
    const isVideoCall = invite.callType === 'video'
    const conversationType = invite.conversationType || 'group' // Default to group for backward compatibility

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
    } = useMediaDevices({ enabled: !!invite })

    // Determine the call title based on conversation type
    const getCallTitle = (): string => {
      switch (conversationType) {
        case 'direct':
          // 1-on-1 call - show the full conversation name (e.g., "Call Mo Salah | Xmir Sali")
          return invite.conversationName || t('chat-directCall') || '1-on-1 Call'
        case 'meeting':
          // Calendar meeting
          return invite.conversationName || t('chat-meeting') || 'Meeting'
        case 'group':
        default:
          // Group call
          return invite.conversationName || t('chat-groupCall') || 'Group Call'
      }
    }

    const callTitle = getCallTitle()

    // Determine call type label (e.g., "Group video call", "1-on-1 audio call")
    const getCallTypeLabel = (): string => {
      const mediaType = isVideoCall ? t('call-video') || 'video' : t('call-audio') || 'audio'

      switch (conversationType) {
        case 'direct':
          return `1-on-1 ${mediaType} call`
        case 'meeting':
          return `${t('chat-meeting') || 'Meeting'} ${mediaType} call`
        case 'group':
        default:
          return `${t('chat-group') || 'Group'} ${mediaType} call`
      }
    }

    const callTypeLabel = getCallTypeLabel()

    // CRITICAL: Reset state when invite changes
    // This ensures fresh defaults for each new invite
    useEffect(() => {
      if (invite) {
        rtkDebug.log('[IncomingGroupCallDialog] Invite received - resetting to defaults', {
          callType: invite.callType,
          willSetMic: true,
          willSetCamera: invite.callType === 'video',
          willSetBackground: true
        })
        setRingCount(0)
        setIsJoining(false)
        setMicEnabled(true)
        setCameraEnabled(invite.callType === 'video')
        setBackgroundEnabled(true)

        // Enumerate devices only while invite modal is shown (strict gating).
        refreshDevices({ requestAudio: true, requestVideo: invite.callType === 'video' })
      }
    }, [invite, refreshDevices])

    const handleAccept = () => {
      if (isJoining) {
        rtkDebug.log('[IncomingGroupCallDialog] Already joining, ignoring duplicate click')
        return
      }

      setIsJoining(true)
      rtkDebug.log('[IncomingGroupCallDialog] Joining with preferences:', {
        micEnabled,
        cameraEnabled,
        backgroundEnabled
      })

      // Cleanup preview stream before joining
      cleanupPreview()

      onAccept({
        micEnabled,
        cameraEnabled,
        backgroundEnabled,
        audioInputDeviceId: selectedAudioInputId,
        videoInputDeviceId: selectedVideoInputId
      })
    }

    const handleDecline = () => {
      if (isJoining) {
        rtkDebug.log('[IncomingGroupCallDialog] Already joining, ignoring decline')
        return
      }

      cleanupPreview()
      onDecline()
    }

    // Cleanup preview stream
    const cleanupPreview = useCallback(() => {
      rtkDebug.log('[IncomingGroupCallDialog] Cleaning up preview')

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
    // CRITICAL: Include invite in dependencies to re-initialize preview for each new invite
    useEffect(() => {
      if (!invite || !cameraEnabled || isJoining) {
        cleanupPreview()
        return
      }

      let isMounted = true
      setIsLoadingPreview(true)

      const initPreview = async () => {
        try {
          rtkDebug.log('[IncomingGroupCallDialog] Requesting camera access for preview')

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

          rtkDebug.log('[IncomingGroupCallDialog] Camera preview ready')
        } catch (error) {
          console.error('[IncomingGroupCallDialog] Failed to access camera:', error)
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
    }, [invite, cameraEnabled, isJoining, cleanupPreview, selectedVideoInputId])

    // Ring animation counter
    useEffect(() => {
      const interval = setInterval(() => {
        setRingCount(prev => prev + 1)
      }, 1000)

      return () => clearInterval(interval)
    }, [])

    // Play ringtone effect
    useEffect(() => {
      let audioContext: AudioContext | null = null
      let oscillator: OscillatorNode | null = null
      let gainNode: GainNode | null = null

      const playRing = () => {
        try {
          audioContext = new AudioContext()
          oscillator = audioContext.createOscillator()
          gainNode = audioContext.createGain()

          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)

          oscillator.type = 'sine'
          oscillator.frequency.value = 440

          gainNode.gain.value = 0.1

          oscillator.start()

          setTimeout(() => {
            if (oscillator) oscillator.stop()
          }, 200)
        } catch (e) {
          console.debug('Could not play ringtone:', e)
        }
      }

      playRing()
      const ringInterval = setInterval(playRing, 3000)

      return () => {
        clearInterval(ringInterval)
        if (oscillator) {
          try {
            oscillator.stop()
          } catch {
            // Already stopped
          }
        }
        if (audioContext) {
          audioContext.close()
        }
      }
    }, [])

    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent
          className="gba:w-[90vw] gba:max-w-lg gba:p-0 gba:overflow-hidden gba:bg-background gba:border-border gba:max-h-[90vh] gba:flex gba:flex-col"
          data-testid={prefixDataTestId}
          onPointerDownOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
        >
          <DialogTitle className="gba:sr-only">{t('chat-incomingGroupCall') || 'Incoming Group Call'}</DialogTitle>
          <DialogDescription className="gba:sr-only">
            {callerName} {t('chat-isCallingYou') || 'is calling you'} to join {callTitle}
          </DialogDescription>

          {/* Header - PreCall-like */}
          <div className="gba:flex gba:flex-col gba:items-center gba:py-4 gba:px-6 gba:border-b gba:border-border gba:flex-shrink-0">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <UsersThreeIcon className="gba:w-5 gba:h-5 gba:text-muted-foreground" weight="fill" />
              <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">{callTitle}</h2>
            </div>
            <p className="gba:text-sm gba:text-muted-foreground">
              {t('call-startedBy')} {callerName}
            </p>
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">{callTypeLabel}</p>
          </div>

          {/* Scrollable content - PreCall layout */}
          <div className="gba:overflow-y-auto gba:flex-1">
            {/* Video / Avatar section - full width like PreCall */}
            <div className="gba:flex gba:flex-col gba:items-center">
              {isVideoCall ? (
                <>
                  <div className="gba:relative gba:w-full gba:aspect-video gba:bg-muted gba:overflow-hidden gba:rounded-lg">
                    {cameraEnabled && !isJoining ? (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="gba:w-full gba:h-full gba:object-cover gba:scale-x-[-1]"
                        />
                        {isLoadingPreview && (
                          <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:bg-muted/70">
                            <Spinner className="gba:w-6 gba:h-6 gba:text-foreground" />
                          </div>
                        )}
                        {/* Top right: Effects button - like PreCall */}
                        {backgroundEnabled && (
                          <div className="gba:absolute gba:top-4 gba:right-4">
                            <button
                              type="button"
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
                      </>
                    ) : (
                      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:min-h-0 gba:bg-muted gba:rounded-lg gba:overflow-hidden">
                        <Avatar className="gba:w-32 gba:h-32 gba:mb-4 gba:flex-shrink-0">
                          {userAvatarUrl ? <AvatarImage src={userAvatarUrl} alt={userName || 'User'} /> : null}
                          <AvatarFallback className="gba:text-4xl gba:bg-muted gba:text-foreground">
                            {userName ? (
                              getInitials(userName)
                            ) : (
                              <UserIcon className="gba:w-16 gba:h-16" weight="fill" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <p className="gba:text-sm gba:text-muted-foreground gba:flex-shrink-0">
                          {t('call-cameraOff') || 'Your camera is turned off'}
                        </p>
                      </div>
                    )}
                    {/* Bottom overlay - always visible when not joining so mic/camera can be toggled */}
                    {!isJoining && (
                      <div className="gba:absolute gba:bottom-0 gba:left-0 gba:right-0 gba:bg-gradient-to-t gba:from-black/60 gba:to-transparent gba:p-4">
                        <div className="gba:flex gba:items-center gba:justify-between">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <button
                              type="button"
                              onClick={() => setMicEnabled(!micEnabled)}
                              disabled={isJoining}
                              className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-black/40 hover:gba:bg-black/60 gba:transition-colors gba:backdrop-blur-sm disabled:gba:opacity-50 disabled:gba:cursor-not-allowed"
                              data-testid={`${prefixDataTestId}-preview-mic-toggle`}
                            >
                              {micEnabled ? (
                                <MicrophoneIcon className="gba:w-5 gba:h-5 gba:text-white" weight="fill" />
                              ) : (
                                <MicrophoneSlashIcon className="gba:w-5 gba:h-5 gba:text-white" weight="fill" />
                              )}
                            </button>
                            <div className="gba:flex gba:items-stretch gba:gap-0">
                              <button
                                type="button"
                                onClick={() => setCameraEnabled(!cameraEnabled)}
                                disabled={isJoining}
                                className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-l-full gba:bg-black/40 hover:gba:bg-black/60 gba:transition-colors gba:backdrop-blur-sm disabled:gba:opacity-50 disabled:gba:cursor-not-allowed"
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
                                      type="button"
                                      className="gba:flex gba:items-center gba:justify-center gba:px-2 gba:h-10 gba:rounded-r-full gba:bg-black/40 hover:gba:bg-black/60 gba:transition-colors gba:backdrop-blur-sm gba:border-l gba:border-white/20 disabled:gba:opacity-50"
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
                            {cameraEnabled && (
                              <button
                                type="button"
                                onClick={() => setBackgroundEnabled(!backgroundEnabled)}
                                disabled={isJoining}
                                className={`gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full gba:transition-colors gba:backdrop-blur-sm ${
                                  backgroundEnabled
                                    ? 'gba:bg-primary/90 hover:gba:bg-primary/80'
                                    : 'gba:bg-black/40 hover:gba:bg-black/60'
                                } disabled:gba:opacity-50 disabled:gba:cursor-not-allowed`}
                                data-testid={`${prefixDataTestId}-preview-background-toggle`}
                              >
                                <MagicWandIcon className="gba:w-5 gba:h-5 gba:text-white" weight="fill" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {isJoining ? (
                    <div className="gba:flex gba:items-center gba:gap-2 gba:py-4">
                      <Spinner className="gba:w-4 gba:h-4 gba:text-foreground" />
                      <p className="gba:text-sm gba:font-medium gba:text-foreground">
                        {t('call-joiningCall') || 'Joining call...'}
                      </p>
                    </div>
                  ) : (
                    <p className="gba:text-muted-foreground gba:text-sm gba:py-4">
                      {t('call-ringing')}
                      <span className="gba:inline-block gba:w-8">{'.'.repeat((ringCount % 3) + 1)}</span>
                    </p>
                  )}
                </>
              ) : (
                <>
                  {/* Caller Avatar with Pulsing Ring (for audio calls) */}
                  <div className="gba:relative gba:mb-6">
                    <PulsingRing colorClass="gba:bg-success" />
                    {invite.from.avatarUrl ? (
                      <Avatar className="gba:w-28 gba:h-28 gba:relative gba:z-10 gba:ring-4 gba:ring-border">
                        <AvatarImage src={invite.from.avatarUrl} alt={callerName} />
                        <AvatarFallback className="gba:text-3xl gba:bg-muted gba:text-foreground">
                          {getInitials(callerName)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <IconAvatar
                        className="gba:w-28 gba:h-28 gba:relative gba:z-10 gba:bg-muted gba:text-foreground"
                        label={callerName}
                        icon={UsersThreeIcon}
                      />
                    )}
                  </div>

                  {/* Ringing indicator / Joining status */}
                  {isJoining ? (
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mb-6">
                      <Spinner className="gba:w-4 gba:h-4 gba:text-foreground" />
                      <p className="gba:text-foreground gba:text-sm gba:font-medium">
                        {t('call-joiningCall') || 'Joining call...'}
                      </p>
                    </div>
                  ) : (
                    <p className="gba:text-muted-foreground gba:text-sm gba:mb-4">
                      {t('call-ringing')}
                      <span className="gba:inline-block gba:w-8">{'.'.repeat((ringCount % 3) + 1)}</span>
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Device section - PreCall style (Microphone & Speaker) */}
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
                      disabled={isJoining}
                      className="gba:ml-auto"
                      data-testid={`${prefixDataTestId}-mic-toggle`}
                    />
                  </div>
                  <Select
                    value={selectedAudioInputId || ''}
                    onValueChange={id => setSelectedAudioInputId(id)}
                    disabled={isJoining || isEnumerating}
                  >
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
                    <Select
                      value={selectedAudioOutputId || ''}
                      onValueChange={id => setSelectedAudioOutputId(id)}
                      disabled={isJoining || isEnumerating}
                    >
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

                {/* Noise suppression & Auto gain (callPreferences – used when call starts) */}
                <div className="gba:space-y-2 gba:pt-2 gba:border-t gba:border-border">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Label className="gba:text-sm gba:flex-1">
                      {t('call-noiseSuppression') || 'Noise suppression'}
                    </Label>
                    <Switch
                      checked={callPreferences.noiseSuppressionEnabled}
                      onCheckedChange={callPreferences.setNoiseSuppressionEnabled}
                      disabled={isJoining}
                      data-testid={`${prefixDataTestId}-noise-suppression-toggle`}
                    />
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Label className="gba:text-sm gba:flex-1">{t('call-autoGainControl') || 'Auto gain control'}</Label>
                    <Switch
                      checked={callPreferences.autoGainControlEnabled}
                      onCheckedChange={callPreferences.setAutoGainControlEnabled}
                      disabled={isJoining}
                      data-testid={`${prefixDataTestId}-auto-gain-control-toggle`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - PreCall-style (gap-1.5, icon w-5 h-5) */}
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-6 gba:p-4 gba:border-t gba:border-border gba:flex-shrink-0">
            <div className="gba:flex gba:flex-col gba:items-center gba:gap-1.5">
              <Button
                variant="destructive"
                size="icon"
                onClick={handleDecline}
                disabled={isJoining}
                className="gba:w-12 gba:h-12 gba:rounded-full"
                data-testid={`${prefixDataTestId}-decline`}
              >
                <PhoneDisconnectIcon className="gba:w-5 gba:h-5" weight="fill" />
              </Button>
              <span className="gba:text-xs gba:text-muted-foreground">{t('call-decline')}</span>
            </div>
            <div className="gba:flex gba:flex-col gba:items-center gba:gap-1.5">
              <Button
                size="icon"
                onClick={handleAccept}
                disabled={isJoining}
                className="gba:w-12 gba:h-12 gba:rounded-full gba:bg-success gba:hover:bg-success/90 disabled:gba:opacity-60 disabled:gba:cursor-not-allowed"
                data-testid={`${prefixDataTestId}-accept`}
              >
                {isJoining ? (
                  <Spinner className="gba:w-5 gba:h-5 gba:text-success-foreground" />
                ) : (
                  <PhoneIcon className="gba:w-5 gba:h-5 gba:text-success-foreground" weight="fill" />
                )}
              </Button>
              <span className="gba:text-xs gba:text-foreground">
                {isJoining ? t('call-joining') || 'Joining...' : t('call-join')}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  },
  (prevProps, nextProps) => {
    // Only re-render if invite or testId changes
    return (
      prevProps.invite.roomId === nextProps.invite.roomId &&
      prevProps.invite.callType === nextProps.invite.callType &&
      prevProps.invite.from.id === nextProps.invite.from.id &&
      prevProps.invite.conversationName === nextProps.invite.conversationName &&
      prevProps.prefixDataTestId === nextProps.prefixDataTestId
    )
  }
)

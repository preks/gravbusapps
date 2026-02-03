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
  Spinner
} from '@newwork/nw-design-system'
import { rtkDebug } from '../utils/rtkDebug'
import {
  MicrophoneIcon,
  MicrophoneSlashIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  PhoneIcon,
  PhoneDisconnectIcon,
  UsersThreeIcon,
  MagicWandIcon,
  UserIcon
} from '@phosphor-icons/react'
import type { GroupCallInvite } from '../hooks/useGroupCall'
import { useChatTranslation } from '../contexts/TranslationContext'

interface IncomingGroupCallDialogProps {
  invite: GroupCallInvite
  userName?: string
  userAvatarUrl?: string
  onAccept: (preferences: { micEnabled: boolean; cameraEnabled: boolean; backgroundEnabled: boolean }) => void
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

// Pulsing ring animation component
const PulsingRing: React.FC<{ color?: string }> = ({ color = 'bg-primary' }) => (
  <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center">
    <div
      className={`gba:absolute gba:w-36 gba:h-36 gba:rounded-full ${color} gba:opacity-20 gba:animate-ping`}
      style={{ animationDuration: '1.5s' }}
    />
    <div
      className={`gba:absolute gba:w-32 gba:h-32 gba:rounded-full ${color} gba:opacity-30 gba:animate-ping`}
      style={{ animationDuration: '1.5s', animationDelay: '0.3s' }}
    />
  </div>
)

export const IncomingGroupCallDialog: React.FC<IncomingGroupCallDialogProps> = memo(
  ({ invite, userName, userAvatarUrl, onAccept, onDecline, prefixDataTestId = 'incoming-group-call-dialog' }) => {
    const t = useChatTranslation()
    const [ringCount, setRingCount] = useState(0)
    const [isJoining, setIsJoining] = useState(false)
    const [micEnabled, setMicEnabled] = useState(true)
    const [cameraEnabled, setCameraEnabled] = useState(invite?.callType === 'video')
    const [backgroundEnabled, setBackgroundEnabled] = useState(true)
    const [isLoadingPreview, setIsLoadingPreview] = useState(false)

    const videoRef = useRef<HTMLVideoElement>(null)
    const streamTracksRef = useRef<MediaStreamTrack[]>([])

    const callerName = invite.from.odName || 'Unknown'
    const groupName = invite.conversationName || t('chat-groupCall')
    const isVideoCall = invite.callType === 'video'

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
      }
    }, [invite])

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

      onAccept({ micEnabled, cameraEnabled, backgroundEnabled })
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
            video: { width: 640, height: 360 },
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
    }, [invite, cameraEnabled, isJoining, cleanupPreview])

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
          className="gba:w-[90vw] gba:max-w-sm gba:p-0 gba:overflow-hidden gba:bg-gradient-to-b gba:from-gray-800 gba:to-gray-900 gba:border-0"
          data-testid={prefixDataTestId}
          onPointerDownOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
        >
          <DialogTitle className="gba:sr-only">{t('chat-incomingGroupCall') || 'Incoming Group Call'}</DialogTitle>
          <DialogDescription className="gba:sr-only">
            {callerName} {t('chat-isCallingYou') || 'is calling you'} to join {groupName}
          </DialogDescription>
          <div className="gba:flex gba:flex-col gba:items-center gba:py-6 gba:px-6">
            {/* Call Type Indicator */}
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-gray-400 gba:text-sm gba:mb-4">
              <UsersThreeIcon className="gba:w-4 gba:h-4" weight="fill" />
              <span>{isVideoCall ? t('call-incomingGroupVideoCall') : t('call-incomingGroupAudioCall')}</span>
            </div>

            {/* Video Preview or Caller Avatar */}
            {isVideoCall ? (
              <>
                {/* Video Preview - Always same size */}
                <div className="gba:relative gba:w-full gba:max-w-xs gba:aspect-video gba:mb-4 gba:rounded-lg gba:overflow-hidden gba:bg-gray-800 gba:border gba:border-gray-600">
                  {cameraEnabled && !isJoining ? (
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
                <h2 className="gba:text-lg gba:font-semibold gba:text-white gba:mb-1">{groupName}</h2>

                {/* Caller Name */}
                <p className="gba:text-gray-400 gba:text-sm gba:mb-3">
                  {t('call-startedBy')} {callerName}
                </p>

                {/* Ringing indicator / Joining status */}
                {isJoining ? (
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
                    <Spinner className="gba:w-4 gba:h-4 gba:text-white" />
                    <p className="gba:text-white gba:text-sm gba:font-medium">
                      {t('call-joiningCall') || 'Joining call...'}
                    </p>
                  </div>
                ) : (
                  <p className="gba:text-gray-400 gba:text-sm gba:mb-4">
                    {t('call-ringing')}
                    <span className="gba:inline-block gba:w-8">{'.'.repeat((ringCount % 3) + 1)}</span>
                  </p>
                )}
              </>
            ) : (
              <>
                {/* Caller Avatar with Pulsing Ring (for audio calls) */}
                <div className="gba:relative gba:mb-6">
                  <PulsingRing color="gba:bg-success" />
                  {invite.from.avatarUrl ? (
                    <Avatar className="gba:w-28 gba:h-28 gba:relative gba:z-10 gba:ring-4 gba:ring-white/20">
                      <AvatarImage src={invite.from.avatarUrl} alt={callerName} />
                      <AvatarFallback className="gba:text-3xl gba:bg-gray-700 gba:text-white">
                        {getInitials(callerName)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <IconAvatar
                      className="gba:w-28 gba:h-28 gba:relative gba:z-10 gba:bg-gray-700"
                      label={callerName}
                      icon={UsersThreeIcon}
                    />
                  )}
                </div>

                {/* Group Name */}
                <h2 className="gba:text-xl gba:font-semibold gba:text-white gba:mb-1">{groupName}</h2>

                {/* Caller Name */}
                <p className="gba:text-gray-400 gba:text-sm gba:mb-2">
                  {t('call-startedBy')} {callerName}
                </p>

                {/* Ringing indicator / Joining status */}
                {isJoining ? (
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mb-6">
                    <Spinner className="gba:w-4 gba:h-4 gba:text-white" />
                    <p className="gba:text-white gba:text-sm gba:font-medium">
                      {t('call-joiningCall') || 'Joining call...'}
                    </p>
                  </div>
                ) : (
                  <p className="gba:text-gray-400 gba:text-sm gba:mb-4">
                    {t('call-ringing')}
                    <span className="gba:inline-block gba:w-8">{'.'.repeat((ringCount % 3) + 1)}</span>
                  </p>
                )}
              </>
            )}

            {/* Pre-join Controls - Mic, Camera, and Background toggles */}
            <div
              className={`gba:mb-6 gba:w-full gba:max-w-xs ${isVideoCall ? 'gba:grid gba:grid-cols-2 gba:gap-2' : 'gba:flex gba:justify-center'}`}
            >
              {/* Mic Toggle - Always visible */}
              <button
                onClick={() => setMicEnabled(!micEnabled)}
                disabled={isJoining}
                className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:px-4 gba:py-2.5 gba:rounded-full gba:bg-gray-700/50 hover:gba:bg-gray-700 gba:transition-colors gba:border gba:border-gray-600 disabled:gba:opacity-50 disabled:gba:cursor-not-allowed"
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

              {/* Camera Toggle - Only for video calls */}
              {isVideoCall && (
                <button
                  onClick={() => setCameraEnabled(!cameraEnabled)}
                  disabled={isJoining}
                  className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:px-4 gba:py-2.5 gba:rounded-full gba:bg-gray-700/50 hover:gba:bg-gray-700 gba:transition-colors gba:border gba:border-gray-600 disabled:gba:opacity-50 disabled:gba:cursor-not-allowed"
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
              {/* Decline Button */}
              <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={handleDecline}
                  disabled={isJoining}
                  className="gba:w-16 gba:h-16 gba:rounded-full gba:shadow-lg"
                  data-testid={`${prefixDataTestId}-decline`}
                >
                  <PhoneDisconnectIcon className="gba:w-7 gba:h-7" weight="fill" />
                </Button>
                <span className="gba:text-xs gba:text-gray-400">{t('call-decline')}</span>
              </div>

              {/* Accept Button */}
              <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                <Button
                  size="icon"
                  onClick={handleAccept}
                  disabled={isJoining}
                  className="gba:w-16 gba:h-16 gba:rounded-full gba:shadow-lg gba:bg-success gba:hover:bg-success/90 disabled:gba:opacity-60 disabled:gba:cursor-not-allowed"
                  data-testid={`${prefixDataTestId}-accept`}
                >
                  {isJoining ? (
                    <Spinner className="gba:w-7 gba:h-7 gba:text-white" />
                  ) : (
                    <PhoneIcon className="gba:w-7 gba:h-7 gba:text-white" weight="fill" />
                  )}
                </Button>
                <span className="gba:text-xs gba:text-white">
                  {isJoining ? t('call-joining') || 'Joining...' : t('call-join')}
                </span>
              </div>
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

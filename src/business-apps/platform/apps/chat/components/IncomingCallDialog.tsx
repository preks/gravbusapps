import React, { useEffect, useState, memo } from 'react'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import {
  PhoneIcon,
  PhoneDisconnectIcon,
  VideoCameraIcon,
  UserIcon,
  CaretDownIcon,
  CheckIcon
} from '@phosphor-icons/react'
import type { CallState, CallParticipant } from '../services/webrtcClient'
import { useChatTranslation } from '../contexts/TranslationContext'
import { useMediaDevices } from '../hooks/useMediaDevices'

interface IncomingCallDialogProps {
  callState: CallState
  onAccept: (preferences?: { audioInputDeviceId?: string | null; videoInputDeviceId?: string | null }) => void
  onReject: () => void
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

const getParticipantName = (participant: CallParticipant | null): string => {
  if (!participant) return 'Unknown'
  return participant.odName || 'Unknown'
}

// Pulsing ring animation component (uses design tokens)
const PulsingRing: React.FC<{ colorClass?: string }> = ({ colorClass = 'gba:bg-success' }) => (
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

export const IncomingCallDialog: React.FC<IncomingCallDialogProps> = memo(
  ({ callState, onAccept, onReject, prefixDataTestId = 'incoming-call-dialog' }) => {
    const t = useChatTranslation()
    const [ringCount, setRingCount] = useState(0)

    const isOpen = callState.status === 'ringing' && callState.direction === 'incoming'
    const remoteParticipant = callState.remoteParticipant
    const participantName = getParticipantName(remoteParticipant)
    const isVideoCall = callState.type === 'video'

    const {
      audioInputDevices,
      videoInputDevices,
      selectedAudioInputId,
      selectedVideoInputId,
      setSelectedAudioInputId,
      setSelectedVideoInputId,
      refreshDevices,
      isEnumerating
    } = useMediaDevices({ enabled: isOpen })

    useEffect(() => {
      if (!isOpen) return
      refreshDevices({ requestAudio: true, requestVideo: isVideoCall })
    }, [isOpen, isVideoCall, refreshDevices])

    const handleAccept = () => {
      onAccept({
        audioInputDeviceId: selectedAudioInputId,
        videoInputDeviceId: selectedVideoInputId
      })
    }

    // Ring animation counter (for visual feedback)
    useEffect(() => {
      if (!isOpen) {
        setRingCount(0)
        return
      }

      const interval = setInterval(() => {
        setRingCount(prev => prev + 1)
      }, 1000)

      return () => clearInterval(interval)
    }, [isOpen])

    // Play ringtone effect
    useEffect(() => {
      if (!isOpen) return

      // Create audio context for ringtone
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

          // Ring pattern: 2 short beeps
          setTimeout(() => {
            if (oscillator) oscillator.stop()
          }, 200)
        } catch (e) {
          console.debug('Could not play ringtone:', e)
        }
      }

      // Play initial ring
      playRing()

      // Ring interval
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
    }, [isOpen])

    if (!isOpen) return null

    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent
          className="gba:w-[90vw] gba:max-w-sm gba:p-0 gba:overflow-hidden gba:bg-background gba:border-border gba:max-h-[90vh] gba:flex gba:flex-col"
          data-testid={prefixDataTestId}
          onPointerDownOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
        >
          <DialogTitle className="gba:sr-only">
            {isVideoCall ? t('call-incomingVideoCall') : t('call-incomingAudioCall')}
          </DialogTitle>
          <DialogDescription className="gba:sr-only">
            {t('call-incomingFrom')} {participantName}
          </DialogDescription>

          {/* Header - PreCall-like */}
          <div className="gba:flex gba:flex-col gba:items-center gba:py-4 gba:px-6 gba:border-b gba:border-border gba:flex-shrink-0">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              {isVideoCall ? (
                <VideoCameraIcon className="gba:w-5 gba:h-5 gba:text-muted-foreground" weight="fill" />
              ) : (
                <PhoneIcon className="gba:w-5 gba:h-5 gba:text-muted-foreground" weight="fill" />
              )}
              <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">
                {isVideoCall ? t('call-incomingVideoCall') : t('call-incomingAudioCall')}
              </h2>
            </div>
            <p className="gba:text-sm gba:text-muted-foreground">
              {t('call-incomingFrom')} {participantName}
            </p>
          </div>

          {/* Scrollable content */}
          <div className="gba:overflow-y-auto gba:flex-1 gba:flex gba:flex-col gba:items-center gba:py-6 gba:px-6">
            {/* Caller Avatar with Pulsing Ring */}
            <div className="gba:relative gba:mb-6">
              <PulsingRing colorClass={isVideoCall ? 'gba:bg-primary' : 'gba:bg-success'} />
              {remoteParticipant?.avatarUrl ? (
                <Avatar className="gba:w-28 gba:h-28 gba:relative gba:z-10 gba:ring-4 gba:ring-border">
                  <AvatarImage src={remoteParticipant.avatarUrl} alt={participantName} />
                  <AvatarFallback className="gba:text-3xl gba:bg-muted gba:text-foreground">
                    {getInitials(participantName)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <IconAvatar
                  className="gba:w-28 gba:h-28 gba:relative gba:z-10 gba:bg-muted gba:text-foreground"
                  label={participantName}
                  icon={UserIcon}
                />
              )}
            </div>

            {/* Caller Name */}
            <h3 className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-2">{participantName}</h3>

            {/* Ringing indicator */}
            <p className="gba:text-muted-foreground gba:text-sm gba:mb-8">
              {t('call-ringing')}
              <span className="gba:inline-block gba:w-8">{'.'.repeat((ringCount % 3) + 1)}</span>
            </p>

            {/* Device selection */}
            <div className="gba:w-full gba:max-w-xs gba:mb-6 gba:flex gba:flex-col gba:gap-2">
              <div className="gba:flex gba:items-center gba:justify-center gba:gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      disabled={isEnumerating}
                      className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:px-3 gba:py-2 gba:rounded-full gba:bg-muted hover:gba:bg-accent gba:text-foreground gba:text-sm gba:border gba:border-border disabled:gba:opacity-50 disabled:gba:cursor-not-allowed gba:min-w-[160px]"
                      data-testid={`${prefixDataTestId}-mic-settings`}
                      aria-label={t('call-selectMicrophone')}
                    >
                      <span className="gba:truncate">{t('call-selectMicrophone')}</span>
                      <CaretDownIcon className="gba:w-4 gba:h-4" weight="bold" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="gba:w-72 gba:bg-popover gba:border-border">
                    <DropdownMenuLabel className="gba:text-foreground">{t('call-selectMicrophone')}</DropdownMenuLabel>
                    <DropdownMenuSeparator className="gba:bg-border" />
                    {audioInputDevices.length > 0 ? (
                      audioInputDevices.map(device => (
                        <DropdownMenuItem
                          key={device.deviceId}
                          onClick={() => setSelectedAudioInputId(device.deviceId)}
                          className="gba:flex gba:items-center gba:gap-2 gba:text-foreground hover:gba:bg-accent"
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
                      <DropdownMenuItem disabled className="gba:text-muted-foreground">
                        {t('call-noDevicesFound')}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {isVideoCall && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        disabled={isEnumerating}
                        className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:px-3 gba:py-2 gba:rounded-full gba:bg-muted hover:gba:bg-accent gba:text-foreground gba:text-sm gba:border gba:border-border disabled:gba:opacity-50 disabled:gba:cursor-not-allowed gba:min-w-[160px]"
                        data-testid={`${prefixDataTestId}-camera-settings`}
                        aria-label={t('call-selectCamera')}
                      >
                        <span className="gba:truncate">{t('call-selectCamera')}</span>
                        <CaretDownIcon className="gba:w-4 gba:h-4" weight="bold" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="gba:w-72 gba:bg-popover gba:border-border">
                      <DropdownMenuLabel className="gba:text-foreground">{t('call-selectCamera')}</DropdownMenuLabel>
                      <DropdownMenuSeparator className="gba:bg-border" />
                      {videoInputDevices.length > 0 ? (
                        videoInputDevices.map(device => (
                          <DropdownMenuItem
                            key={device.deviceId}
                            onClick={() => setSelectedVideoInputId(device.deviceId)}
                            className="gba:flex gba:items-center gba:gap-2 gba:text-foreground hover:gba:bg-accent"
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
                        <DropdownMenuItem disabled className="gba:text-muted-foreground">
                          {t('call-noDevicesFound')}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>

          {/* Footer - PreCall-like */}
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-6 gba:p-4 gba:border-t gba:border-border gba:flex-shrink-0">
            <div className="gba:flex gba:flex-col gba:items-center gba:gap-1.5">
              <Button
                variant="destructive"
                size="icon"
                onClick={onReject}
                className="gba:w-12 gba:h-12 gba:rounded-full"
                data-testid={`${prefixDataTestId}-reject`}
              >
                <PhoneDisconnectIcon className="gba:w-5 gba:h-5" weight="fill" />
              </Button>
              <span className="gba:text-xs gba:text-muted-foreground">{t('call-decline')}</span>
            </div>
            <div className="gba:flex gba:flex-col gba:items-center gba:gap-1.5">
              <Button
                size="icon"
                onClick={handleAccept}
                className="gba:w-12 gba:h-12 gba:rounded-full gba:bg-success hover:gba:bg-success/90"
                data-testid={`${prefixDataTestId}-accept`}
              >
                {isVideoCall ? (
                  <VideoCameraIcon className="gba:w-5 gba:h-5 gba:text-success-foreground" weight="fill" />
                ) : (
                  <PhoneIcon className="gba:w-5 gba:h-5 gba:text-success-foreground" weight="fill" />
                )}
              </Button>
              <span className="gba:text-xs gba:text-foreground">{t('call-accept')}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  },
  (prevProps, nextProps) => {
    // Only re-render if call status, direction, type, or participant changes
    return (
      prevProps.callState.status === nextProps.callState.status &&
      prevProps.callState.direction === nextProps.callState.direction &&
      prevProps.callState.type === nextProps.callState.type &&
      prevProps.callState.remoteParticipant?.id === nextProps.callState.remoteParticipant?.id &&
      prevProps.prefixDataTestId === nextProps.prefixDataTestId
    )
  }
)

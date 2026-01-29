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
  Spinner
} from '@newwork/nw-design-system'
import {
  MicrophoneIcon,
  MicrophoneSlashIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  PhoneIcon,
  PhoneDisconnectIcon,
  UsersThreeIcon
} from '@phosphor-icons/react'
import type { GroupCallInvite } from '../hooks/useGroupCall'
import { useChatTranslation } from '../contexts/TranslationContext'

interface IncomingGroupCallDialogProps {
  invite: GroupCallInvite
  onAccept: () => void
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
  ({ invite, onAccept, onDecline, prefixDataTestId = 'incoming-group-call-dialog' }) => {
    const t = useChatTranslation()
    const [ringCount, setRingCount] = useState(0)
    const [isJoining, setIsJoining] = useState(false)
    const [micEnabled, setMicEnabled] = useState(true)
    const [cameraEnabled, setCameraEnabled] = useState(invite.callType === 'video')

    const callerName = invite.from.odName || 'Unknown'
    const groupName = invite.conversationName || t('chat-groupCall')
    const isVideoCall = invite.callType === 'video'

    const handleAccept = () => {
      if (isJoining) {
        console.log('[IncomingGroupCallDialog] Already joining, ignoring duplicate click')
        return
      }

      setIsJoining(true)
      // TODO: Pass micEnabled and cameraEnabled to onAccept
      // For now, just call onAccept - will need to update the signature
      console.log('[IncomingGroupCallDialog] Joining with:', { micEnabled, cameraEnabled })
      onAccept()
    }

    const handleDecline = () => {
      if (isJoining) {
        console.log('[IncomingGroupCallDialog] Already joining, ignoring decline')
        return
      }

      onDecline()
    }

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
          <div className="gba:flex gba:flex-col gba:items-center gba:py-8 gba:px-6">
            {/* Call Type Indicator */}
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-gray-400 gba:text-sm gba:mb-6">
              <UsersThreeIcon className="gba:w-4 gba:h-4" weight="fill" />
              <span>{isVideoCall ? t('call-incomingGroupVideoCall') : t('call-incomingGroupAudioCall')}</span>
            </div>

            {/* Caller Avatar with Pulsing Ring */}
            <div className="gba:relative gba:mb-6">
              <PulsingRing color={isVideoCall ? 'gba:bg-primary' : 'gba:bg-success'} />
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
                <Spinner className="gba:w-4 gba:h-4 gba:text-success" />
                <p className="gba:text-success gba:text-sm gba:font-medium">
                  {t('call-joiningCall') || 'Joining call...'}
                </p>
              </div>
            ) : (
              <p className="gba:text-gray-400 gba:text-sm gba:mb-4">
                {t('call-ringing')}
                <span className="gba:inline-block gba:w-8">{'.'.repeat((ringCount % 3) + 1)}</span>
              </p>
            )}

            {/* Pre-join Controls - Mic and Camera toggles */}
            {!isJoining && (
              <div className="gba:flex gba:items-center gba:gap-3 gba:mb-6">
                <button
                  onClick={() => setMicEnabled(!micEnabled)}
                  className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2 gba:rounded-full gba:bg-gray-700/50 hover:gba:bg-gray-700 gba:transition-colors gba:border gba:border-gray-600"
                  data-testid={`${prefixDataTestId}-toggle-mic`}
                >
                  {micEnabled ? (
                    <MicrophoneIcon className="gba:w-4 gba:h-4 gba:text-white" weight="fill" />
                  ) : (
                    <MicrophoneSlashIcon className="gba:w-4 gba:h-4 gba:text-destructive" weight="fill" />
                  )}
                  <span className="gba:text-xs gba:text-white">
                    {micEnabled ? t('call-micOn') || 'Mic' : t('call-micOff') || 'Mic off'}
                  </span>
                </button>

                {isVideoCall && (
                  <button
                    onClick={() => setCameraEnabled(!cameraEnabled)}
                    className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2 gba:rounded-full gba:bg-gray-700/50 hover:gba:bg-gray-700 gba:transition-colors gba:border gba:border-gray-600"
                    data-testid={`${prefixDataTestId}-toggle-camera`}
                  >
                    {cameraEnabled ? (
                      <VideoCameraIcon className="gba:w-4 gba:h-4 gba:text-white" weight="fill" />
                    ) : (
                      <VideoCameraSlashIcon className="gba:w-4 gba:h-4 gba:text-destructive" weight="fill" />
                    )}
                    <span className="gba:text-xs gba:text-white">
                      {cameraEnabled ? t('call-cameraOn') || 'Camera' : t('call-cameraOff') || 'Camera off'}
                    </span>
                  </button>
                )}
              </div>
            )}

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
                <span className="gba:text-xs gba:text-gray-400">
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

import React, { useEffect, useState, memo } from 'react'
import {
  Dialog,
  DialogContent,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  IconAvatar,
  useTranslation
} from '@newwork/nw-design-system'
import { Phone, PhoneOff, Video, Users } from 'lucide-react'
import type { GroupCallInvite } from '../hooks/useGroupCall'
import translations from '../_i18n'

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
    const { t } = useTranslation(translations)
    const [ringCount, setRingCount] = useState(0)

    const callerName = invite.from.odName || 'Unknown'
    const groupName = invite.conversationName || t('chat-groupCall')
    const isVideoCall = invite.callType === 'video'

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
          <div className="gba:flex gba:flex-col gba:items-center gba:py-8 gba:px-6">
            {/* Call Type Indicator */}
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-gray-400 gba:text-sm gba:mb-6">
              <Users className="gba:w-4 gba:h-4" />
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
                  icon={Users}
                />
              )}
            </div>

            {/* Group Name */}
            <h2 className="gba:text-xl gba:font-semibold gba:text-white gba:mb-1">{groupName}</h2>

            {/* Caller Name */}
            <p className="gba:text-gray-400 gba:text-sm gba:mb-2">
              {t('call-startedBy')} {callerName}
            </p>

            {/* Ringing indicator */}
            <p className="gba:text-gray-400 gba:text-sm gba:mb-8">
              {t('call-ringing')}
              <span className="gba:inline-block gba:w-8">{'.'.repeat((ringCount % 3) + 1)}</span>
            </p>

            {/* Action Buttons */}
            <div className="gba:flex gba:items-center gba:justify-center gba:gap-8">
              {/* Decline Button */}
              <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={onDecline}
                  className="gba:w-16 gba:h-16 gba:rounded-full gba:shadow-lg"
                  data-testid={`${prefixDataTestId}-decline`}
                >
                  <PhoneOff className="gba:w-7 gba:h-7" />
                </Button>
                <span className="gba:text-xs gba:text-gray-400">{t('call-decline')}</span>
              </div>

              {/* Accept Button */}
              <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                <Button
                  size="icon"
                  onClick={onAccept}
                  className="gba:w-16 gba:h-16 gba:rounded-full gba:shadow-lg gba:bg-success gba:hover:bg-success/90"
                  data-testid={`${prefixDataTestId}-accept`}
                >
                  {isVideoCall ? (
                    <Video className="gba:w-7 gba:h-7 gba:text-white" />
                  ) : (
                    <Phone className="gba:w-7 gba:h-7 gba:text-white" />
                  )}
                </Button>
                <span className="gba:text-xs gba:text-gray-400">{t('call-join')}</span>
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

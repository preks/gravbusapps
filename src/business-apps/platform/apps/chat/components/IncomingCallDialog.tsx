import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  IconAvatar
} from '@newwork/nw-design-system'
import { Phone, PhoneOff, Video, UserIcon } from 'lucide-react'
import type { CallState, CallParticipant } from '../services/webrtcClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface IncomingCallDialogProps {
  callState: CallState
  onAccept: () => void
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

// Pulsing ring animation component
const PulsingRing: React.FC<{ color?: string }> = ({ color = 'bg-success' }) => (
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

export const IncomingCallDialog: React.FC<IncomingCallDialogProps> = ({
  callState,
  onAccept,
  onReject,
  prefixDataTestId = 'incoming-call-dialog'
}) => {
  const [ringCount, setRingCount] = useState(0)

  const isOpen = callState.status === 'ringing' && callState.direction === 'incoming'
  const remoteParticipant = callState.remoteParticipant
  const participantName = getParticipantName(remoteParticipant)
  const isVideoCall = callState.type === 'video'

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
        className="gba:w-[90vw] gba:max-w-sm gba:p-0 gba:overflow-hidden gba:bg-gradient-to-b gba:from-gray-800 gba:to-gray-900 gba:border-0"
        data-testid={prefixDataTestId}
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <div className="gba:flex gba:flex-col gba:items-center gba:py-8 gba:px-6">
          {/* Call Type Indicator */}
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-gray-400 gba:text-sm gba:mb-6">
            {isVideoCall ? (
              <>
                <Video className="gba:w-4 gba:h-4" />
                <span>{getTranslationFromI18nKeyAndLabel('call.incomingVideoCall', 'Incoming video call')}</span>
              </>
            ) : (
              <>
                <Phone className="gba:w-4 gba:h-4" />
                <span>{getTranslationFromI18nKeyAndLabel('call.incomingAudioCall', 'Incoming audio call')}</span>
              </>
            )}
          </div>

          {/* Caller Avatar with Pulsing Ring */}
          <div className="gba:relative gba:mb-6">
            <PulsingRing color={isVideoCall ? 'gba:bg-primary' : 'gba:bg-success'} />
            {remoteParticipant?.avatarUrl ? (
              <Avatar className="gba:w-28 gba:h-28 gba:relative gba:z-10 gba:ring-4 gba:ring-white/20">
                <AvatarImage src={remoteParticipant.avatarUrl} alt={participantName} />
                <AvatarFallback className="gba:text-3xl gba:bg-gray-700 gba:text-white">
                  {getInitials(participantName)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <IconAvatar
                className="gba:w-28 gba:h-28 gba:relative gba:z-10 gba:bg-gray-700"
                label={participantName}
                icon={UserIcon}
              />
            )}
          </div>

          {/* Caller Name */}
          <h2 className="gba:text-xl gba:font-semibold gba:text-white gba:mb-2">{participantName}</h2>

          {/* Ringing indicator */}
          <p className="gba:text-gray-400 gba:text-sm gba:mb-8">
            {getTranslationFromI18nKeyAndLabel('call.ringing', 'Ringing')}
            <span className="gba:inline-block gba:w-8">{'.'.repeat((ringCount % 3) + 1)}</span>
          </p>

          {/* Action Buttons */}
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-8">
            {/* Reject Button */}
            <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
              <Button
                variant="destructive"
                size="icon"
                onClick={onReject}
                className="gba:w-16 gba:h-16 gba:rounded-full gba:shadow-lg"
                data-testid={`${prefixDataTestId}-reject`}
              >
                <PhoneOff className="gba:w-7 gba:h-7" />
              </Button>
              <span className="gba:text-xs gba:text-gray-400">
                {getTranslationFromI18nKeyAndLabel('call.decline', 'Decline')}
              </span>
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
              <span className="gba:text-xs gba:text-gray-400">
                {getTranslationFromI18nKeyAndLabel('call.accept', 'Accept')}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

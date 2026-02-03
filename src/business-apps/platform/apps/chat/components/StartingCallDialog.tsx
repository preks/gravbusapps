import React, { useEffect, useState, memo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Button,
  IconAvatar,
  Spinner
} from '@newwork/nw-design-system'
import { PhoneDisconnectIcon, UsersThreeIcon, VideoIcon } from '@phosphor-icons/react'
import { useChatTranslation } from '../contexts/TranslationContext'

interface StartingCallDialogProps {
  isOpen: boolean
  callType: 'audio' | 'video'
  conversationName?: string
  participantCount?: number
  onCancel: () => void
  prefixDataTestId?: string
}

// Pulsing ring animation component
const PulsingRing: React.FC<{ color?: string }> = ({ color = 'gba:bg-primary' }) => (
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

export const StartingCallDialog: React.FC<StartingCallDialogProps> = memo(
  ({
    isOpen,
    callType,
    conversationName,
    participantCount = 0,
    onCancel,
    prefixDataTestId = 'starting-call-dialog'
  }) => {
    const t = useChatTranslation()
    const [dots, setDots] = useState(0)

    const isVideoCall = callType === 'video'
    const groupName = conversationName || t('chat-groupCall') || 'Group Call'

    // Animated dots for "Starting call..."
    useEffect(() => {
      const interval = setInterval(() => {
        setDots(prev => (prev + 1) % 4)
      }, 500)

      return () => clearInterval(interval)
    }, [])

    if (!isOpen) return null

    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent
          className="gba:w-[90vw] gba:max-w-sm gba:p-0 gba:overflow-hidden gba:bg-gradient-to-b gba:from-gray-800 gba:to-gray-900 gba:border-0"
          data-testid={prefixDataTestId}
          onPointerDownOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
        >
          <DialogTitle className="gba:sr-only">{t('call-startingCall') || 'Starting Call'}</DialogTitle>
          <DialogDescription className="gba:sr-only">
            {t('call-connectingToCall') || 'Connecting to call'} {groupName}
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

            {/* Icon with Pulsing Ring */}
            <div className="gba:relative gba:mb-6">
              <PulsingRing color="gba:bg-success" />
              <IconAvatar
                className="gba:w-28 gba:h-28 gba:relative gba:z-10 gba:bg-gray-700"
                label={groupName}
                icon={isVideoCall ? VideoIcon : UsersThreeIcon}
              />
            </div>

            {/* Group Name */}
            <h2 className="gba:text-xl gba:font-semibold gba:text-white gba:mb-1">{groupName}</h2>

            {/* Participant Count */}
            {participantCount > 0 && (
              <p className="gba:text-gray-400 gba:text-sm gba:mb-2">
                {participantCount}{' '}
                {participantCount === 1
                  ? t('chat-participant') || 'participant'
                  : t('groupCall-participants') || 'participants'}
              </p>
            )}

            {/* Connecting Status */}
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-6">
              <Spinner className="gba:w-4 gba:h-4 gba:text-success" />
              <p className="gba:text-success gba:text-sm gba:font-medium">
                {t('call-connecting') || 'Connecting'}
                <span className="gba:inline-block gba:w-8">{'.'.repeat(dots)}</span>
              </p>
            </div>

            {/* Cancel Button */}
            <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
              <Button
                variant="destructive"
                size="icon"
                onClick={onCancel}
                className="gba:w-16 gba:h-16 gba:rounded-full gba:shadow-lg"
                data-testid={`${prefixDataTestId}-cancel`}
              >
                <PhoneDisconnectIcon className="gba:w-7 gba:h-7" weight="fill" />
              </Button>
              <span className="gba:text-xs gba:text-gray-400">{t('call-cancel') || 'Cancel'}</span>
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

/**
 * System message (call/meeting, participant, conversation events).
 */

import React from 'react'
import { VideoCameraIcon } from '@phosphor-icons/react'
import { UserPlus, UserMinus, Pencil, Users } from 'lucide-react'
import type { Message } from '../types'

const SYSTEM_ICON_CLASS = 'gba:w-4 gba:h-4 gba:flex-shrink-0 gba:text-muted-foreground'

function getSystemMessageIcon(
  messageType: string | undefined,
  systemIconClassName: string
): (() => React.ReactElement) | null {
  const isMeetingOrCall =
    messageType === 'meeting_start' ||
    messageType === 'meeting_end' ||
    messageType === 'call_start' ||
    messageType === 'call_end'
  if (isMeetingOrCall) {
    return () => <VideoCameraIcon className={systemIconClassName} weight="fill" />
  }
  if (messageType === 'participant_joined') {
    return () => <UserPlus className={systemIconClassName} />
  }
  if (messageType === 'participant_left') {
    return () => <UserMinus className={systemIconClassName} />
  }
  if (messageType === 'conversation_created') {
    return () => <Users className={systemIconClassName} />
  }
  if (messageType === 'conversation_renamed') {
    return () => <Pencil className={systemIconClassName} />
  }
  return null
}

export interface SystemMessageBlockProps {
  message: Message
  formattedTime: string
}

export const SystemMessageBlock: React.FC<SystemMessageBlockProps> = ({ message, formattedTime }) => {
  const messageType = message.metadata?.type
  const SystemIcon = getSystemMessageIcon(messageType, SYSTEM_ICON_CLASS)

  return (
    <div className="gba:flex gba:justify-center gba:py-1.5" data-testid={`message-system-${message.id}`}>
      <div className="gba:flex gba:items-center gba:gap-2 gba:bg-muted/50 gba:px-3 gba:py-1.5 gba:rounded-full">
        {SystemIcon && <SystemIcon />}
        <span className="gba:text-xs gba:text-muted-foreground">{formattedTime}</span>
        <span className="gba:text-xs gba:text-foreground gba:font-medium">{message.content}</span>
      </div>
    </div>
  )
}

SystemMessageBlock.displayName = 'SystemMessageBlock'

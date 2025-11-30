import React from 'react'
import { IconAvatar, Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@newwork/nw-design-system'
import type { Message } from '../types'
import { UserIcon } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface MessageItemProps {
  message: Message
  currentUserId: string | null
  isGroupChat: boolean
}

const formatTime = (date: Date | string): string => {
  // Parse the date - if it's a string, ensure it's treated as UTC
  let d: Date
  if (typeof date === 'string') {
    // If the string doesn't end with 'Z' (UTC indicator), add it
    // This ensures the timestamp is interpreted as UTC
    const dateStr = date.endsWith('Z') ? date : date + 'Z'
    d = new Date(dateStr)
  } else {
    d = date
  }

  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return getTranslationFromI18nKeyAndLabel('chat.time.justNow', 'Just now')
  if (diffMins < 60)
    return getTranslationFromI18nKeyAndLabel('chat.time.minutesAgo', `${diffMins}m ago`).replace(
      '{minutes}',
      diffMins.toString()
    )
  if (diffHours < 24)
    return getTranslationFromI18nKeyAndLabel('chat.time.hoursAgo', `${diffHours}h ago`).replace(
      '{hours}',
      diffHours.toString()
    )
  if (diffDays < 7)
    return getTranslationFromI18nKeyAndLabel('chat.time.daysAgo', `${diffDays}d ago`).replace(
      '{days}',
      diffDays.toString()
    )

  return d.toLocaleDateString()
}

const formatFullTimestamp = (date: Date | string): string => {
  // Parse the date - if it's a string, ensure it's treated as UTC
  let d: Date
  if (typeof date === 'string') {
    // If the string doesn't end with 'Z' (UTC indicator), add it
    const dateStr = date.endsWith('Z') ? date : date + 'Z'
    d = new Date(dateStr)
  } else {
    d = date
  }

  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const getStatusIcon = (status?: string, isOwnMessage?: boolean) => {
  const baseClass = isOwnMessage ? 'gba:opacity-70' : 'gba:text-muted-foreground'
  switch (status) {
    case 'read':
      return <span className={`${baseClass} gba:text-[10px]`}>✓✓</span>
    case 'delivered':
      return <span className={`${baseClass} gba:text-[10px]`}>✓✓</span>
    case 'sent':
      return <span className={`${baseClass} gba:text-[10px]`}>✓</span>
    default:
      return null
  }
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, currentUserId, isGroupChat }) => {
  const isOwnMessage = message.senderId === currentUserId
  const sender = message.sender

  if (message.isDeleted) {
    return (
      <div className="gba:flex gba:justify-center gba:py-1.5" data-testid={`message-${message.id}`}>
        <span className="gba:text-xs gba:text-muted-foreground gba:italic gba:bg-muted/50 gba:px-3 gba:py-1 gba:rounded-full">
          {getTranslationFromI18nKeyAndLabel('chat.message.deleted', 'Message deleted')}
        </span>
      </div>
    )
  }

  return (
    <div
      className={`gba:flex gba:gap-2 gba:mb-1 ${isOwnMessage ? 'gba:flex-row-reverse' : 'gba:flex-row'}`}
      data-testid={`message-${message.id}`}
    >
      {!isOwnMessage && isGroupChat && (
        <IconAvatar
          className="gba:w-7 gba:h-7 gba:flex-shrink-0 gba:mt-0.5"
          label={sender?.firstName || sender?.username || getTranslationFromI18nKeyAndLabel('chat.user', 'User')}
          icon={UserIcon}
        />
      )}

      <div
        className={`gba:max-w-[80%] gba:px-3 gba:py-2 gba:shadow-sm ${
          isOwnMessage
            ? 'gba:bg-primary gba:text-primary-foreground gba:rounded-2xl gba:rounded-br-md'
            : 'gba:bg-card gba:text-card-foreground gba:rounded-2xl gba:rounded-bl-md gba:border gba:border-border/50'
        }`}
      >
        {!isOwnMessage && isGroupChat && sender && (
          <div className="gba:text-[11px] gba:font-medium gba:mb-0.5 gba:text-primary">
            {sender.firstName} {sender.lastName}
          </div>
        )}

        <div className="gba:break-words gba:text-sm gba:leading-relaxed">{message.content}</div>

        <div
          className={`gba:flex gba:items-center gba:justify-end gba:gap-1 gba:mt-1 ${
            isOwnMessage ? 'gba:opacity-70' : 'gba:text-muted-foreground'
          }`}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="gba:text-[10px]">{formatTime(message.createdAt)}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="gba:text-xs">{formatFullTimestamp(message.createdAt)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {isOwnMessage && getStatusIcon(message.status, isOwnMessage)}
        </div>
      </div>
    </div>
  )
}

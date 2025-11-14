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

const getStatusIcon = (status?: string) => {
  switch (status) {
    case 'read':
      return <span className="gba:text-blue-500">✓✓</span>
    case 'delivered':
      return <span className="gba:text-gray-500">✓✓</span>
    case 'sent':
      return <span className="gba:text-gray-500">✓</span>
    default:
      return null
  }
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, currentUserId, isGroupChat }) => {
  const isOwnMessage = message.senderId === currentUserId
  const sender = message.sender

  if (message.isDeleted) {
    return (
      <div className="gba:flex gba:justify-center gba:py-2" data-testid={`message-${message.id}`}>
        <span className="gba:text-sm gba:text-muted-foreground gba:italic">
          {getTranslationFromI18nKeyAndLabel('chat.message.deleted', 'Message deleted')}
        </span>
      </div>
    )
  }

  return (
    <div
      className={`gba:flex gba:gap-2 gba:mb-4 ${isOwnMessage ? 'gba:flex-row-reverse' : 'gba:flex-row'}`}
      data-testid={`message-${message.id}`}
    >
      {!isOwnMessage && isGroupChat && (
        <IconAvatar
          className="gba:w-8 gba:h-8 gba:flex-shrink-0"
          label={sender?.firstName || sender?.username || getTranslationFromI18nKeyAndLabel('chat.user', 'User')}
          icon={UserIcon}
        />
      )}

      <div
        className={`gba:max-w-[75%] gba:rounded-lg gba:px-4 gba:py-2 ${
          isOwnMessage ? 'gba:bg-primary gba:text-primary-foreground' : 'gba:bg-muted gba:text-foreground'
        }`}
      >
        {!isOwnMessage && isGroupChat && sender && (
          <div className="gba:text-xs gba:font-semibold gba:mb-1 gba:opacity-80">
            {sender.firstName} {sender.lastName}
          </div>
        )}

        <div className="gba:break-words">{message.content}</div>

        <div
          className={`gba:flex gba:items-center gba:gap-1 gba:mt-1 gba:text-xs ${
            isOwnMessage ? 'gba:opacity-80' : 'gba:text-muted-foreground'
          }`}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>{formatTime(message.createdAt)}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{formatFullTimestamp(message.createdAt)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {isOwnMessage && <span className="gba:ml-1">{getStatusIcon(message.status)}</span>}
        </div>
      </div>
    </div>
  )
}

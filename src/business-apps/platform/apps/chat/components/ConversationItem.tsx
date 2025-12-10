import React, { useState } from 'react'
import {
  IconAvatar,
  Avatar,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@newwork/nw-design-system'
import type { Conversation } from '../types'
import type { UserPresence } from '../hooks/usePresence'
import { UserIcon, UsersIcon } from 'lucide-react'
import { SignOut } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface ConversationItemProps {
  conversation: Conversation
  onClick: () => void
  onRemove?: (conversationId: string) => void
  isActive?: boolean
  currentUserId?: string | null
  compact?: boolean
  otherUserPresence?: UserPresence
}

const getOtherParticipant = (conversation: Conversation, currentUserId?: string | null) => {
  if (conversation.type !== 'direct' || !conversation.participants || conversation.participants.length === 0) {
    return null
  }

  // Filter out current user to get the other participant
  const otherParticipants = conversation.participants.filter(p => {
    return p.userId !== currentUserId && p.user?.id !== currentUserId
  })

  return otherParticipants[0] || null
}

const getConversationName = (conversation: Conversation, currentUserId?: string | null): string => {
  if (conversation.name) {
    return conversation.name
  }

  const otherParticipant = getOtherParticipant(conversation, currentUserId)
  if (otherParticipant?.user) {
    const name = `${otherParticipant.user.firstName || ''} ${otherParticipant.user.lastName || ''}`.trim()
    return (
      name || otherParticipant.user.username || getTranslationFromI18nKeyAndLabel('chat.unknownUser', 'Unknown User')
    )
  }

  return getTranslationFromI18nKeyAndLabel('chat.directMessage', 'Direct Message')
}

// Presence status indicator component - only shows for online/away, not offline
const PresenceIndicator: React.FC<{ status: 'online' | 'away' | 'offline'; className?: string }> = ({
  status,
  className = ''
}) => {
  // Don't show indicator for offline status
  if (status === 'offline') return null

  const statusColors = {
    online: 'gba:bg-success',
    away: 'gba:bg-warning',
    offline: 'gba:bg-muted-foreground'
  }

  const statusTitles = {
    online: 'Online',
    away: 'Away',
    offline: 'Offline'
  }

  return (
    <span
      className={`gba:absolute gba:bottom-0 gba:right-0 gba:w-3 gba:h-3 gba:rounded-full gba:border-2 gba:border-background ${statusColors[status]} ${className}`}
      title={statusTitles[status]}
    />
  )
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  onClick,
  onRemove,
  isActive = false,
  currentUserId = null,
  compact = false,
  otherUserPresence
}) => {
  const name = getConversationName(conversation, currentUserId)
  const otherParticipant = getOtherParticipant(conversation, currentUserId)
  const avatarUrl = otherParticipant?.user?.avatarUrl

  // Don't show unread count if:
  // 1. There's no unread count from API
  // 2. The last message was sent by the current user (they already know about it)
  // 3. The conversation is currently active (user is viewing it)
  // 4. The conversation was created by the current user and has no lastMessage (no responses yet)
  const lastMessageIsFromCurrentUser = conversation.lastMessage?.senderId === currentUserId
  const createdByCurrentUser = conversation.createdBy === currentUserId
  const noMessagesFromOthers = !conversation.lastMessage && createdByCurrentUser
  const unreadCount =
    lastMessageIsFromCurrentUser || isActive || noMessagesFromOthers ? 0 : conversation.unreadCount || 0
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Only show presence for direct messages (default to offline if no presence data)
  const showPresence = conversation.type === 'direct'
  const presenceStatus = otherUserPresence?.status || 'offline'
  const hasActiveCall = conversation.type === 'group' && !!conversation.activeCall

  // Get names of participants currently in the call
  const getParticipantsInCall = (): string[] => {
    if (!hasActiveCall || !conversation.activeCall?.participantIds || !conversation.participants) {
      return []
    }

    const participantIds = conversation.activeCall.participantIds
    return conversation.participants
      .filter(p => {
        const odId = p.userId || p.user?.id
        return odId && participantIds.includes(odId)
      })
      .map(p => {
        const user = p.user
        if (!user) return 'Unknown'
        const firstName = user.firstName || ''
        const lastName = user.lastName || ''
        const fullName = `${firstName} ${lastName}`.trim()
        return fullName || user.displayName || user.username || 'Unknown'
      })
  }

  const participantsInCall = hasActiveCall ? getParticipantsInCall() : []

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent conversation selection
    setShowRemoveDialog(true)
  }

  const handleConfirmRemove = () => {
    setShowRemoveDialog(false)
    onRemove?.(conversation.id)
  }

  const avatarSize = compact ? 'gba:w-9 gba:h-9' : 'gba:w-10 gba:h-10'

  return (
    <>
      <div
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`gba:w-full gba:flex gba:items-center gba:text-left gba:transition-all gba:duration-150 gba:relative gba:group gba:cursor-pointer gba:mx-1 gba:rounded-lg ${
          compact ? 'gba:gap-2.5 gba:px-2.5 gba:py-2' : 'gba:gap-3 gba:px-3 gba:py-2.5'
        } ${isActive ? 'gba:bg-primary/10 gba:text-primary' : 'gba:hover:bg-muted/80'}`}
        style={{ width: 'calc(100% - 8px)' }}
        data-testid={`conversation-item-${conversation.id}`}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        }}
      >
        <div className="gba:relative gba:flex-shrink-0">
          {conversation.type === 'group' ? (
            // Group chat: always show group icon
            <IconAvatar className={avatarSize} label={name} icon={UsersIcon} />
          ) : avatarUrl ? (
            // Direct chat with avatar
            <Avatar className={`${avatarSize} gba:ring-2 gba:ring-background`}>
              <img src={avatarUrl} alt={name} className="gba:w-full gba:h-full gba:object-cover gba:rounded-full" />
            </Avatar>
          ) : (
            // Direct chat without avatar
            <IconAvatar className={avatarSize} label={name} icon={UserIcon} />
          )}
          {showPresence && <PresenceIndicator status={presenceStatus} />}
        </div>

        <div className="gba:flex-1 gba:min-w-0 gba:flex gba:flex-col gba:gap-0.5">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span
              className={`gba:font-medium gba:truncate ${compact ? 'gba:text-sm' : 'gba:text-sm'} ${isActive ? 'gba:text-primary' : 'gba:text-foreground'}`}
            >
              {name}
            </span>
            {hasActiveCall && (
              <span className="gba:text-[10px] gba:text-success gba:uppercase">
                {getTranslationFromI18nKeyAndLabel('chat.activeCallShort', 'In Call')}
              </span>
            )}
            {unreadCount > 0 && (
              <Badge
                variant="default"
                className="gba:flex-shrink-0 gba:min-w-[18px] gba:h-[18px] gba:px-1 gba:text-[10px] gba:font-semibold"
                data-testid={`conversation-unread-${conversation.id}`}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
          {hasActiveCall && participantsInCall.length > 0 && !compact ? (
            <p className="gba:text-xs gba:text-success gba:truncate gba:max-w-[180px]">
              {participantsInCall.join(', ')}
            </p>
          ) : conversation.lastMessage && !compact ? (
            <p className="gba:text-xs gba:text-muted-foreground gba:truncate gba:max-w-[180px]">
              {conversation.lastMessage.content}
            </p>
          ) : null}
        </div>

        <div className="gba:flex gba:items-center">
          {onRemove && isHovered && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRemoveClick}
              className="gba:h-7 gba:w-7 gba:opacity-70 gba:hover:opacity-100"
              data-testid={`conversation-item-remove-${conversation.id}`}
              title={
                conversation.type === 'group'
                  ? getTranslationFromI18nKeyAndLabel('chat.leaveConversation', 'Leave conversation')
                  : getTranslationFromI18nKeyAndLabel('chat.removeConversation', 'Remove conversation')
              }
            >
              <SignOut className="gba:w-3.5 gba:h-3.5" />
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {conversation.type === 'group'
                ? getTranslationFromI18nKeyAndLabel('chat.leaveConversationTitle', 'Leave conversation?')
                : getTranslationFromI18nKeyAndLabel('chat.removeConversationTitle', 'Remove conversation?')}
            </DialogTitle>
            <DialogDescription>
              {conversation.type === 'group'
                ? getTranslationFromI18nKeyAndLabel(
                    'chat.leaveConversationDescription',
                    'You will no longer receive messages from this conversation. You can be added back by other participants.'
                  )
                : getTranslationFromI18nKeyAndLabel(
                    'chat.removeConversationDescription',
                    'This will remove the conversation from your list. You can always start a new conversation.'
                  )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowRemoveDialog(false)}
              data-testid="conversation-item-remove-cancel"
            >
              {getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmRemove} data-testid="conversation-item-remove-confirm">
              {conversation.type === 'group'
                ? getTranslationFromI18nKeyAndLabel('chat.leave', 'Leave')
                : getTranslationFromI18nKeyAndLabel('chat.remove', 'Remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

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
import { ChatTextIcon, SignOutIcon } from '@phosphor-icons/react'
import type { Conversation } from '../types'
import type { UserPresence } from '../hooks/usePresence'
import { UserIcon, UsersIcon, Sparkles, CalendarIcon, PhoneCall, Pin } from 'lucide-react'
import { UserStatusIndicator } from './UserStatusIndicator'

interface ConversationItemProps {
  conversation: Conversation
  onClick: () => void
  onRemove?: (conversationId: string) => void
  isActive?: boolean
  currentUserId?: string | null
  compact?: boolean
  otherUserPresence?: UserPresence
  activeExpertCount?: number
  isPinned?: boolean
  isMuted?: boolean
  t: (key: string, params?: Record<string, any>) => string
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

const getConversationName = (
  conversation: Conversation,
  currentUserId?: string | null,
  t?: (key: string) => string
): string => {
  if (conversation.name) {
    return conversation.name
  }

  const otherParticipant = getOtherParticipant(conversation, currentUserId)
  if (otherParticipant?.user) {
    const name = `${otherParticipant.user.firstName || ''} ${otherParticipant.user.lastName || ''}`.trim()
    return name || otherParticipant.user.username || (t ? t('chat-unknownUser') : 'Unknown User')
  }

  return t ? t('chat-directMessage') : 'Direct Message'
}

// Presence status indicator component - only shows for online, not offline
const PresenceIndicator: React.FC<{
  status: 'online' | 'offline'
  className?: string
  t?: (key: string) => string
}> = ({ status, className = '', t }) => {
  // Don't show indicator for offline status
  if (status === 'offline') return null

  const statusColors = {
    online: 'gba:bg-success',
    offline: 'gba:bg-muted-foreground'
  }

  const getStatusTitle = (status: 'online' | 'offline'): string => {
    if (!t) return status === 'online' ? 'Online' : 'Offline'
    return status === 'online' ? t('chat-statusOnline') : t('chat-statusOffline')
  }

  return (
    <span
      className={`gba:absolute gba:bottom-0 gba:right-0 gba:w-3 gba:h-3 gba:rounded-full gba:border-2 gba:border-background ${statusColors[status]} ${className}`}
      title={getStatusTitle(status)}
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
  otherUserPresence,
  activeExpertCount = 0,
  isPinned = false,
  isMuted = false,
  t
}) => {
  const name = getConversationName(conversation, currentUserId, t)
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
  // Map 'away' to 'offline' for display purposes (PresenceIndicator only shows online/offline)
  const showPresence = conversation.type === 'direct'
  const rawPresenceStatus = otherUserPresence?.state || 'offline'
  const presenceStatus: 'online' | 'offline' = rawPresenceStatus === 'online' ? 'online' : 'offline'
  const hasActiveCall = !!conversation.activeCall
  const isDirectChat = conversation.type === 'direct'
  const isGroupChat = conversation.type === 'group'

  // Use enhanced status if available
  const userStatus = otherUserPresence?.userStatus

  // Determine call message key based on call type
  const getCallMessageKey = (): string => {
    if (conversation.metadata?.type === 'meeting') {
      return 'chat-activeCallMeeting'
    } else if (isDirectChat) {
      return 'chat-activeCallDirect'
    } else if (isGroupChat) {
      return 'chat-activeCallGroup'
    }
    return 'chat-activeCallInGroup' // fallback
  }

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent conversation selection
    setShowRemoveDialog(true)
  }

  const handleConfirmRemove = () => {
    setShowRemoveDialog(false)
    onRemove?.(conversation.id)
  }

  const avatarSize = compact ? 'gba:w-9 gba:h-9' : 'gba:w-10 gba:h-10'
  const hasActiveExperts = activeExpertCount > 0 && conversation.type === 'group'

  return (
    <>
      <div
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`gba:w-full gba:flex gba:items-center gba:text-left gba:transition-all gba:duration-150 gba:relative gba:group gba:cursor-pointer gba:mx-1 gba:rounded-lg ${
          compact ? 'gba:gap-2.5 gba:px-2.5 gba:py-2' : 'gba:gap-3 gba:px-3 gba:py-2.5'
        } ${
          isActive
            ? hasActiveExperts
              ? 'gba:bg-gradient-to-r gba:from-primary/10 gba:via-primary/10 gba:to-accent/10 gba:text-primary gba:border gba:border-primary/20'
              : 'gba:bg-primary/10 gba:text-primary'
            : hasActiveExperts
              ? 'gba:bg-gradient-to-r gba:from-accent/5 gba:via-background gba:to-accent/5 gba:border gba:border-accent/20 hover:gba:border-accent/40'
              : 'gba:hover:bg-muted/80'
        }`}
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
            // Group chat: show calendar icon for meeting chats, group icon for regular
            <div className="gba:relative">
              <IconAvatar
                className={`${avatarSize} ${hasActiveExperts ? 'gba:ring-2 gba:ring-primary gba:ring-offset-2 gba:ring-offset-background' : ''}`}
                label={name}
                icon={conversation.metadata?.type === 'meeting' ? CalendarIcon : UsersIcon}
              />
              {hasActiveExperts && (
                <div className="gba:absolute gba:-bottom-1 gba:-right-1 gba:w-4 gba:h-4 gba:rounded-full gba:bg-gradient-to-br gba:from-primary gba:to-accent gba:flex gba:items-center gba:justify-center gba:border-2 gba:border-background gba:shadow-md">
                  <Sparkles className="gba:w-2.5 gba:h-2.5 gba:text-primary-foreground" />
                </div>
              )}
            </div>
          ) : avatarUrl ? (
            // Direct chat with avatar
            <Avatar className={`${avatarSize} gba:ring-2 gba:ring-background`}>
              <img src={avatarUrl} alt={name} className="gba:w-full gba:h-full gba:object-cover gba:rounded-full" />
            </Avatar>
          ) : (
            // Direct chat without avatar
            <IconAvatar className={avatarSize} label={name} icon={UserIcon} />
          )}
          {isMuted ? (
            <span
              className="gba:absolute gba:bottom-0 gba:right-0 gba:w-3 gba:h-3 gba:rounded-full gba:border-2 gba:border-background gba:bg-destructive"
              title={t('chat-muteConversation')}
              data-testid={`conversation-item-muted-indicator-${conversation.id}`}
            />
          ) : showPresence && userStatus ? (
            <UserStatusIndicator status={userStatus} size="sm" className="gba:absolute gba:bottom-0 gba:right-0" />
          ) : showPresence ? (
            <PresenceIndicator status={presenceStatus} t={t} />
          ) : null}
        </div>

        <div className="gba:flex-1 gba:min-w-0 gba:flex gba:flex-col gba:gap-0.5">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span
              className={`gba:font-medium gba:truncate ${compact ? 'gba:text-sm' : 'gba:text-sm'} ${isActive ? 'gba:text-primary' : 'gba:text-foreground'}`}
            >
              {name}
            </span>
            {isPinned && (
              <Pin
                className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground gba:flex-shrink-0"
                aria-hidden
                data-testid={`conversation-item-pinned-icon-${conversation.id}`}
              />
            )}
            {hasActiveCall && (
              <span className="gba:flex gba:items-center gba:text-success" title={t(getCallMessageKey())}>
                <PhoneCall className="gba:w-4 gba:h-4" />
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
          {/* Show status message for online users in direct chats */}
          {showPresence && userStatus?.statusMessage && presenceStatus !== 'offline' ? (
            <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:truncate gba:max-w-[180px]">
              <ChatTextIcon size={12} weight="duotone" className="gba:flex-shrink-0" />
              <span className="gba:italic gba:truncate">{userStatus.statusMessage}</span>
            </div>
          ) : showPresence && otherUserPresence?.lastSeen && presenceStatus === 'offline' ? (
            <p className="gba:text-xs gba:text-muted-foreground gba:truncate gba:max-w-[180px]">
              {(() => {
                try {
                  const lastSeenDate = new Date(otherUserPresence.lastSeen)

                  // Check if date is valid
                  if (isNaN(lastSeenDate.getTime())) {
                    console.error('[ConversationItem] ❌ Invalid lastSeen date')
                    return null
                  }

                  const now = new Date()
                  const diffMs = now.getTime() - lastSeenDate.getTime()

                  // Check for negative or invalid differences
                  if (diffMs < 0 || isNaN(diffMs)) {
                    return null
                  }

                  const diffMinutes = Math.floor(diffMs / (1000 * 60))
                  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

                  // Show "just now" for very recent disconnections (< 1 minute)
                  let lastSeenText: string
                  if (diffMinutes < 60) {
                    lastSeenText = t('chat-lastSeenMinutes', { minutes: diffMinutes })
                  } else if (diffHours < 24) {
                    lastSeenText = t('chat-lastSeenHours', { hours: diffHours })
                  } else if (diffDays < 7) {
                    lastSeenText = t('chat-lastSeenDays', { days: diffDays })
                  } else {
                    lastSeenText = t('chat-lastSeenLongAgo')
                  }

                  return lastSeenText
                } catch (error) {
                  console.error('[ConversationItem] ❌ Error calculating last seen time:', error)
                  return null
                }
              })()}
            </p>
          ) : conversation.lastMessage ? (
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
              title={conversation.type === 'group' ? t('chat-leaveConversation') : t('chat-removeConversation')}
            >
              <SignOutIcon className="gba:w-3.5 gba:h-3.5" />
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {conversation.type === 'group' ? t('chat-leaveConversationTitle') : t('chat-removeConversationTitle')}
            </DialogTitle>
            <DialogDescription>
              {conversation.type === 'group'
                ? t('chat-leaveConversationDescription')
                : t('chat-removeConversationDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowRemoveDialog(false)}
              data-testid="conversation-item-remove-cancel"
            >
              {t('common-cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmRemove} data-testid="conversation-item-remove-confirm">
              {conversation.type === 'group' ? t('chat-leave') : t('chat-remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

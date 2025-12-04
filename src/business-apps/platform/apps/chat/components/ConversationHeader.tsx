import React, { useState } from 'react'
import {
  Button,
  IconAvatar,
  Avatar,
  AvatarImage,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@newwork/nw-design-system'
import { ArrowLeft, DotsThreeVertical, SignOut, X, Info, Users } from '@phosphor-icons/react'
import { UserIcon } from 'lucide-react'
import type { Conversation } from '../types'
import type { UserPresence } from '../hooks/usePresence'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo } from '@/common/utils/navigationUtils'

interface ConversationHeaderProps {
  conversation: Conversation
  onBack?: () => void
  onClose?: () => void
  onRemove?: () => void
  onGroupSettings?: () => void
  showBackButton?: boolean
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

const getConversationAvatarUrl = (conversation: Conversation, currentUserId?: string | null): string | undefined => {
  if (conversation.type === 'group') {
    return undefined // Groups use icon
  }

  const otherParticipant = getOtherParticipant(conversation, currentUserId)
  return otherParticipant?.user?.avatarUrl
}

const getOtherParticipantEmployeeId = (
  conversation: Conversation,
  currentUserId?: string | null
): string | undefined => {
  if (conversation.type !== 'direct') {
    return undefined
  }

  const otherParticipant = getOtherParticipant(conversation, currentUserId)
  return otherParticipant?.user?.employeeId
}

const getInitials = (name: string): string => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

// Presence status indicator component - only shows for online/away, not offline
const PresenceIndicator: React.FC<{ status: 'online' | 'away' | 'offline'; size?: 'sm' | 'md' }> = ({
  status,
  size = 'md'
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

  const sizeClasses = size === 'sm' ? 'gba:w-2.5 gba:h-2.5' : 'gba:w-3 gba:h-3'

  return (
    <span
      className={`gba:absolute gba:bottom-0 gba:right-0 gba:rounded-full gba:border-2 gba:border-background ${statusColors[status]} ${sizeClasses}`}
      title={statusTitles[status]}
    />
  )
}

// Stacked avatars component for group chats
interface StackedAvatarsProps {
  participants: Conversation['participants']
  currentUserId?: string | null
  size?: 'sm' | 'md'
  maxAvatars?: number
}

const StackedAvatars: React.FC<StackedAvatarsProps> = ({
  participants,
  currentUserId,
  size = 'md',
  maxAvatars = 3
}) => {
  if (!participants || participants.length === 0) {
    return <IconAvatar className={size === 'sm' ? 'gba:w-8 gba:h-8' : 'gba:w-9 gba:h-9'} label="Group" icon={Users} />
  }

  // Filter out current user and get other participants
  const otherParticipants = participants.filter(p => p.userId !== currentUserId && p.user?.id !== currentUserId)

  // Take only the first maxAvatars participants
  const visibleParticipants = otherParticipants.slice(0, maxAvatars)
  const remainingCount = otherParticipants.length - maxAvatars

  const avatarSizeClass = size === 'sm' ? 'gba:w-6 gba:h-6' : 'gba:w-7 gba:h-7'
  const containerWidth = size === 'sm' ? 'gba:w-10' : 'gba:w-11'
  const containerHeight = size === 'sm' ? 'gba:h-8' : 'gba:h-9'

  return (
    <div className={`gba:relative gba:flex gba:items-center ${containerWidth} ${containerHeight}`}>
      {visibleParticipants.map((participant, index) => {
        const user = participant.user
        const name =
          user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'User'

        return (
          <Avatar
            key={participant.id || index}
            className={`${avatarSizeClass} gba:border-2 gba:border-background gba:absolute`}
            style={{
              left: `${index * (size === 'sm' ? 10 : 12)}px`,
              zIndex: maxAvatars - index
            }}
            title={name}
          >
            {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={name} />}
            <AvatarFallback className="gba:text-[10px]">{getInitials(name)}</AvatarFallback>
          </Avatar>
        )
      })}
      {remainingCount > 0 && (
        <div
          className={`${avatarSizeClass} gba:rounded-full gba:bg-muted gba:border-2 gba:border-background gba:flex gba:items-center gba:justify-center gba:text-[10px] gba:font-medium gba:text-muted-foreground gba:absolute`}
          style={{
            left: `${visibleParticipants.length * (size === 'sm' ? 10 : 12)}px`,
            zIndex: 0
          }}
          title={`+${remainingCount} more`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}

// Get presence status text for display - returns null for offline
const getPresenceStatusText = (presence?: UserPresence): string | null => {
  if (!presence || presence.status === 'offline') return null
  if (presence.status === 'online') return getTranslationFromI18nKeyAndLabel('chat.statusOnline', 'Online')
  if (presence.status === 'away') return getTranslationFromI18nKeyAndLabel('chat.statusAway', 'Away')
  return null
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  conversation,
  onBack,
  onClose,
  onRemove,
  onGroupSettings,
  showBackButton = false,
  currentUserId = null,
  compact = false,
  otherUserPresence
}) => {
  const name = getConversationName(conversation, currentUserId)
  const avatarUrl = getConversationAvatarUrl(conversation, currentUserId)
  const employeeId = getOtherParticipantEmployeeId(conversation, currentUserId)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const isGroupChat = conversation.type === 'group'
  const isDirectChat = conversation.type === 'direct'
  const presenceStatus = otherUserPresence?.status || 'offline'
  const presenceStatusText = isDirectChat ? getPresenceStatusText(otherUserPresence) : null
  const isClickable = isDirectChat && !!employeeId

  const handleProfileClick = () => {
    if (isClickable) {
      navigateTo(`/platform/employee-record?employeeId=${employeeId}`)
    }
  }

  const handleRemoveClick = () => {
    setShowRemoveDialog(true)
  }

  const handleConfirmRemove = () => {
    setShowRemoveDialog(false)
    onRemove?.()
  }

  const avatarSize = compact ? 'gba:w-8 gba:h-8' : 'gba:w-9 gba:h-9'

  return (
    <>
      <div
        className={`gba:flex gba:items-center gba:border-b gba:border-border/50 gba:bg-background/80 gba:backdrop-blur-sm gba:flex-shrink-0 ${
          compact ? 'gba:gap-2 gba:px-3 gba:py-2' : 'gba:gap-3 gba:px-4 gba:py-3'
        }`}
        data-testid="conversation-header"
      >
        {showBackButton && onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="gba:h-8 gba:w-8 gba:flex-shrink-0"
            data-testid="conversation-back-button"
          >
            <ArrowLeft className="gba:w-4 gba:h-4" />
          </Button>
        )}

        <div
          className={`gba:relative gba:flex-shrink-0 ${isClickable ? 'gba:cursor-pointer' : ''}`}
          onClick={handleProfileClick}
          title={isClickable ? 'View profile' : undefined}
        >
          {isGroupChat ? (
            <StackedAvatars
              participants={conversation.participants}
              currentUserId={currentUserId}
              size={compact ? 'sm' : 'md'}
              maxAvatars={3}
            />
          ) : avatarUrl ? (
            <Avatar
              className={`${avatarSize} ${isClickable ? 'hover:gba:ring-2 hover:gba:ring-primary gba:transition-all' : ''}`}
            >
              <AvatarImage src={avatarUrl} alt={name} />
              <AvatarFallback>{getInitials(name)}</AvatarFallback>
            </Avatar>
          ) : (
            <IconAvatar
              className={`${avatarSize} ${isClickable ? 'hover:gba:ring-2 hover:gba:ring-primary gba:transition-all' : ''}`}
              label={name}
              icon={UserIcon}
            />
          )}
          {isDirectChat && <PresenceIndicator status={presenceStatus} size={compact ? 'sm' : 'md'} />}
        </div>

        <div className="gba:flex-1 gba:min-w-0">
          <h2
            className={`gba:font-semibold gba:truncate gba:text-foreground ${compact ? 'gba:text-sm' : 'gba:text-base'} ${isClickable ? 'gba:cursor-pointer hover:gba:text-primary gba:transition-colors' : ''}`}
            onClick={handleProfileClick}
          >
            {name}
          </h2>
          {/* Show presence status for direct chats - only if online/away */}
          {isDirectChat && !compact && presenceStatusText && (
            <p className={`gba:text-xs ${presenceStatus === 'online' ? 'gba:text-success' : 'gba:text-warning'}`}>
              {presenceStatusText}
            </p>
          )}
          {/* Show participant count for group chats */}
          {isGroupChat && conversation.participants && !compact && (
            <p className="gba:text-xs gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('chat.participantsCount', '{count} participants').replace(
                '{count}',
                conversation.participants.length.toString()
              )}
            </p>
          )}
        </div>

        <div className="gba:flex gba:items-center gba:gap-1">
          {!showBackButton && onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="gba:h-8 gba:w-8 gba:flex-shrink-0"
              data-testid="conversation-close-button"
              title={getTranslationFromI18nKeyAndLabel('chat.closeConversation', 'Close conversation')}
            >
              <X className="gba:w-4 gba:h-4" />
            </Button>
          )}

          {(onRemove || (isGroupChat && onGroupSettings)) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="gba:h-8 gba:w-8 gba:flex-shrink-0"
                  data-testid="conversation-menu-button"
                >
                  <DotsThreeVertical className="gba:w-4 gba:h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isGroupChat && onGroupSettings && (
                  <DropdownMenuItem onClick={onGroupSettings} data-testid="conversation-group-settings-button">
                    <Info className="gba:w-4 gba:h-4 gba:mr-2" />
                    {getTranslationFromI18nKeyAndLabel('chat.groupSettings', 'Group Settings')}
                  </DropdownMenuItem>
                )}
                {onRemove && (
                  <DropdownMenuItem onClick={handleRemoveClick} data-testid="conversation-remove-button">
                    <SignOut className="gba:w-4 gba:h-4 gba:mr-2" />
                    {isGroupChat
                      ? getTranslationFromI18nKeyAndLabel('chat.leaveConversation', 'Leave conversation')
                      : getTranslationFromI18nKeyAndLabel('chat.removeConversation', 'Remove conversation')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
            <Button variant="ghost" onClick={() => setShowRemoveDialog(false)} data-testid="conversation-remove-cancel">
              {getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmRemove} data-testid="conversation-remove-confirm">
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

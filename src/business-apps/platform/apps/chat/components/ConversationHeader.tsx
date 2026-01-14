import React, { useState } from 'react'
import {
  Button,
  IconAvatar,
  Avatar,
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
import { UserIcon, Phone, Video, PhoneCall, UserPlus, Bell } from 'lucide-react'
import type { Conversation } from '../types'
import type { UserPresence } from '../hooks/usePresence'
import { navigateTo } from '@/common/utils/navigationUtils'

export interface ActiveCallInfo {
  roomId: string
  callType: 'audio' | 'video'
  participantCount: number
  participantNames: string[]
}

interface ConversationHeaderProps {
  conversation: Conversation
  onBack?: () => void
  onClose?: () => void
  onRemove?: () => void
  onGroupSettings?: () => void
  onAddExpert?: () => void
  onNudge?: () => void
  onAudioCall?: () => void
  onVideoCall?: () => void
  onJoinCall?: () => void
  showBackButton?: boolean
  currentUserId?: string | null
  compact?: boolean
  otherUserPresence?: UserPresence
  isCallEnabled?: boolean
  isInCall?: boolean
  activeCall?: ActiveCallInfo | null
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

const getConversationAvatarUrl = (conversation: Conversation, currentUserId?: string | null): string | undefined => {
  if (conversation.type === 'group') {
    return undefined // Groups use icon
  }

  const otherParticipant = getOtherParticipant(conversation, currentUserId)
  return otherParticipant?.user?.avatarUrl
}

// Presence status indicator component - only shows for online, not offline
const PresenceIndicator: React.FC<{ status: 'online' | 'offline'; size?: 'sm' | 'md' }> = ({ status, size = 'md' }) => {
  // Don't show indicator for offline status
  if (status === 'offline') return null

  const statusColors = {
    online: 'gba:bg-success',
    offline: 'gba:bg-muted-foreground'
  }

  const statusTitles = {
    online: 'Online',
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

// Get presence status text for display
const getPresenceStatusText = (presence?: UserPresence, t?: (key: string, params?: any) => string): string | null => {
  if (!presence || !t) return null

  if (presence.status === 'online') return t('chat-statusOnline')

  // For offline status, show last seen if available
  if (presence.status === 'offline' && presence.lastSeen) {
    try {
      const lastSeenDate = new Date(presence.lastSeen)
      // Check if date is valid
      if (isNaN(lastSeenDate.getTime())) {
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

      if (diffMinutes < 60) {
        return t('chat-lastSeenMinutes', { minutes: diffMinutes })
      } else if (diffHours < 24) {
        return t('chat-lastSeenHours', { hours: diffHours })
      } else if (diffDays < 7) {
        return t('chat-lastSeenDays', { days: diffDays })
      } else {
        return t('chat-lastSeenLongAgo')
      }
    } catch (error) {
      console.error('Error calculating last seen time:', error)
      return null
    }
  }

  return null
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  conversation,
  onBack,
  onClose,
  onRemove,
  onGroupSettings,
  onAddExpert,
  onNudge,
  onAudioCall,
  onVideoCall,
  onJoinCall,
  showBackButton = false,
  currentUserId = null,
  compact = false,
  otherUserPresence,
  isCallEnabled = true,
  isInCall = false,
  activeCall = null,
  t
}) => {
  const name = getConversationName(conversation, currentUserId, t)
  const avatarUrl = getConversationAvatarUrl(conversation, currentUserId)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const isGroupChat = conversation.type === 'group'
  const isDirectChat = conversation.type === 'direct'
  const otherParticipant = isDirectChat ? getOtherParticipant(conversation, currentUserId) : null
  // Use employeeId for navigation, not keycloak id
  const otherEmployeeId = (otherParticipant?.user as any)?.employeeId

  const handleAvatarClick = () => {
    if (isDirectChat && otherEmployeeId) {
      navigateTo(`/platform/employee-record?employeeId=${otherEmployeeId}`)
    }
  }
  const presenceStatus = otherUserPresence?.status || 'offline'
  const presenceStatusText = isDirectChat ? getPresenceStatusText(otherUserPresence, t) : null
  // Check for active call from prop (for group chats from useGroupCall) or conversation object
  const hasActiveCall = isGroupChat && (!!activeCall || !!conversation.activeCall)

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
          className={`gba:relative gba:flex-shrink-0 ${isDirectChat && otherEmployeeId ? 'gba:cursor-pointer hover:gba:opacity-80 gba:transition-opacity' : ''}`}
          onClick={isDirectChat && otherEmployeeId ? handleAvatarClick : undefined}
          title={isDirectChat && otherEmployeeId ? t('chat-viewProfile') : undefined}
        >
          {avatarUrl ? (
            <Avatar className={avatarSize}>
              <img src={avatarUrl} alt={name} className="gba:w-full gba:h-full gba:object-cover gba:rounded-full" />
            </Avatar>
          ) : (
            <IconAvatar className={avatarSize} label={name} icon={isGroupChat ? Users : UserIcon} />
          )}
          {isDirectChat && <PresenceIndicator status={presenceStatus} size={compact ? 'sm' : 'md'} />}
        </div>

        <div className="gba:flex-1 gba:min-w-0">
          <h2
            className={`gba:font-semibold gba:truncate gba:text-foreground ${compact ? 'gba:text-sm' : 'gba:text-base'}`}
          >
            {name}
          </h2>
          {/* Show presence status for direct chats */}
          {isDirectChat && !compact && presenceStatusText && (
            <p
              className={`gba:text-xs ${
                presenceStatus === 'online' ? 'gba:text-success' : 'gba:text-muted-foreground'
              }`}
            >
              {presenceStatusText}
            </p>
          )}
          {/* Show participant count for group chats */}
          {isGroupChat && conversation.participants && !compact && (
            <p className="gba:text-xs gba:text-muted-foreground">
              {t('chat-participantsCount', { count: conversation.participants.length.toString() })}
            </p>
          )}
          {hasActiveCall && !compact && <p className="gba:text-xs gba:text-success">{t('chat-activeCallInGroup')}</p>}
        </div>

        <div className="gba:flex gba:items-center gba:gap-1">
          {/* Nudge button - only for direct chats */}
          {isDirectChat && onNudge && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onNudge}
              className="gba:h-8 gba:w-8 gba:flex-shrink-0"
              data-testid="conversation-nudge-button"
              title={t('chat-sendNudge')}
            >
              <Bell className="gba:w-4 gba:h-4" />
            </Button>
          )}

          {/* Call controls - show join button for active calls, or call buttons otherwise */}
          {isCallEnabled && !isInCall && (
            <>
              {hasActiveCall && onJoinCall ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onJoinCall}
                  className="gba:h-8 gba:w-8 gba:flex-shrink-0 gba:text-success gba:hover:text-success gba:hover:bg-success/10"
                  data-testid="conversation-join-call-button"
                  title={t('chat-joinCall')}
                >
                  <PhoneCall className="gba:w-4 gba:h-4" />
                </Button>
              ) : (
                <>
                  {onAudioCall && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onAudioCall}
                      className="gba:h-8 gba:w-8 gba:flex-shrink-0"
                      data-testid="conversation-audio-call-button"
                      title={t('chat-startAudioCall')}
                    >
                      <Phone className="gba:w-4 gba:h-4" />
                    </Button>
                  )}
                  {onVideoCall && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onVideoCall}
                      className="gba:h-8 gba:w-8 gba:flex-shrink-0"
                      data-testid="conversation-video-call-button"
                      title={t('chat-startVideoCall')}
                    >
                      <Video className="gba:w-4 gba:h-4" />
                    </Button>
                  )}
                </>
              )}
            </>
          )}

          {!showBackButton && onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="gba:h-8 gba:w-8 gba:flex-shrink-0"
              data-testid="conversation-close-button"
              title={t('chat-closeConversation')}
            >
              <X className="gba:w-4 gba:h-4" />
            </Button>
          )}

          {(onRemove || (isGroupChat && (onGroupSettings || onAddExpert))) && (
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
                {isGroupChat && onAddExpert && (
                  <DropdownMenuItem onClick={onAddExpert} data-testid="conversation-add-expert-button">
                    <UserPlus className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('chat-addExpert')}
                  </DropdownMenuItem>
                )}
                {isGroupChat && onGroupSettings && (
                  <DropdownMenuItem onClick={onGroupSettings} data-testid="conversation-group-settings-button">
                    <Info className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('chat-groupSettings')}
                  </DropdownMenuItem>
                )}
                {onRemove && (
                  <DropdownMenuItem onClick={handleRemoveClick} data-testid="conversation-remove-button">
                    <SignOut className="gba:w-4 gba:h-4 gba:mr-2" />
                    {isGroupChat ? t('chat-leaveConversation') : t('chat-removeConversation')}
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
              {conversation.type === 'group' ? t('chat-leaveConversationTitle') : t('chat-removeConversationTitle')}
            </DialogTitle>
            <DialogDescription>
              {conversation.type === 'group'
                ? t('chat-leaveConversationDescription')
                : t('chat-removeConversationDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRemoveDialog(false)} data-testid="conversation-remove-cancel">
              {t('common-cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmRemove} data-testid="conversation-remove-confirm">
              {conversation.type === 'group' ? t('chat-leave') : t('chat-remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

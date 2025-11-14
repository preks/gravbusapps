import React, { useState } from 'react'
import {
  Button,
  IconAvatar,
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
import { ArrowLeft, UserIcon, DotsThreeVertical, SignOut, X, Info } from '@phosphor-icons/react'
import type { Conversation } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface ConversationHeaderProps {
  conversation: Conversation
  onBack?: () => void
  onClose?: () => void
  onRemove?: () => void
  onGroupSettings?: () => void
  showBackButton?: boolean
  currentUserId?: string | null
}

const getConversationName = (conversation: Conversation, currentUserId?: string | null): string => {
  if (conversation.name) {
    return conversation.name
  }

  if (conversation.type === 'direct' && conversation.participants && conversation.participants.length > 0) {
    // If we have currentUserId, filter it out to get the other participant
    if (currentUserId) {
      const otherParticipants = conversation.participants.filter(p => {
        // Exclude current user - check both userId and user.id
        return p.userId !== currentUserId && p.user?.id !== currentUserId
      })

      const otherParticipant = otherParticipants[0]
      if (otherParticipant?.user) {
        const name = `${otherParticipant.user.firstName || ''} ${otherParticipant.user.lastName || ''}`.trim()
        return (
          name ||
          otherParticipant.user.username ||
          getTranslationFromI18nKeyAndLabel('chat.unknownUser', 'Unknown User')
        )
      }
    }

    // If no currentUserId or filtering didn't work, try to find a participant with user data
    // In a direct message, there should be exactly 2 participants
    // We'll show the first one that has user data and isn't the current user (if currentUserId is known)
    for (const participant of conversation.participants) {
      if (participant.user) {
        // Skip if this is the current user
        if (currentUserId && (participant.userId === currentUserId || participant.user.id === currentUserId)) {
          continue
        }
        const name = `${participant.user.firstName || ''} ${participant.user.lastName || ''}`.trim()
        if (name) {
          return name
        }
        if (participant.user.username) {
          return participant.user.username
        }
      }
    }

    // Fallback: if we have exactly 2 participants, show the first one with user data
    // (This handles the case where currentUserId is null but we still want to show a name)
    if (conversation.participants.length === 2) {
      // Try to find a participant that's not the current user (if currentUserId is known)
      let participantToShow = conversation.participants.find(p => {
        if (!p.user) return false
        if (currentUserId && (p.userId === currentUserId || p.user.id === currentUserId)) {
          return false // Skip current user
        }
        return true
      })

      // If we didn't find one (or currentUserId is null), just get the first one with user data
      if (!participantToShow) {
        participantToShow = conversation.participants.find(p => p.user)
      }

      if (participantToShow?.user) {
        const name = `${participantToShow.user.firstName || ''} ${participantToShow.user.lastName || ''}`.trim()
        return (
          name ||
          participantToShow.user.username ||
          getTranslationFromI18nKeyAndLabel('chat.directMessage', 'Direct Message')
        )
      }
    }

    return getTranslationFromI18nKeyAndLabel('chat.directMessage', 'Direct Message')
  }

  return getTranslationFromI18nKeyAndLabel('chat.directMessage', 'Direct Message')
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  conversation,
  onBack,
  onClose,
  onRemove,
  onGroupSettings,
  showBackButton = false,
  currentUserId = null
}) => {
  const name = getConversationName(conversation, currentUserId)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const isGroupChat = conversation.type === 'group'

  const handleRemoveClick = () => {
    setShowRemoveDialog(true)
  }

  const handleConfirmRemove = () => {
    setShowRemoveDialog(false)
    onRemove?.()
  }

  return (
    <>
      <div
        className="gba:flex gba:items-center gba:gap-3 gba:p-4 gba:border-b gba:bg-background"
        data-testid="conversation-header"
      >
        {showBackButton && onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gba:flex-shrink-0"
            data-testid="conversation-back-button"
          >
            <ArrowLeft className="gba:w-5 gba:h-5" />
          </Button>
        )}

        <IconAvatar className="gba:w-10 gba:h-10 gba:flex-shrink-0" label={name} icon={UserIcon} />

        <div className="gba:flex-1 gba:min-w-0">
          <h2 className="gba:font-semibold gba:truncate">{name}</h2>
          {conversation.type === 'group' && conversation.participants && (
            <p className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('chat.participantsCount', '{count} participants').replace(
                '{count}',
                conversation.participants.length.toString()
              )}
            </p>
          )}
        </div>

        {!showBackButton && onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="gba:flex-shrink-0"
            data-testid="conversation-close-button"
            title={getTranslationFromI18nKeyAndLabel('chat.closeConversation', 'Close conversation')}
          >
            <X className="gba:w-5 gba:h-5" />
          </Button>
        )}

        {(onRemove || (isGroupChat && onGroupSettings)) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gba:flex-shrink-0" data-testid="conversation-menu-button">
                <DotsThreeVertical className="gba:w-5 gba:h-5" />
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

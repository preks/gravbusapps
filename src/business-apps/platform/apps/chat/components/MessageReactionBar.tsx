/**
 * Reaction chips, floating picker bar, and add-reaction popover for a message.
 */

import React from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { SmileyIcon } from '@phosphor-icons/react'
import type { Message, ConversationParticipant, User } from '../types'
import { MessageReactionPicker } from './MessageReactionPicker'

const EMOJI_LABELS: Record<string, string> = {
  '👍': 'Thumbs up',
  '👎': 'Thumbs down',
  '❤️': 'Heart',
  '😄': 'Laugh',
  '😢': 'Sad',
  '😠': 'Angry',
  '🙏': 'Crossed fingers',
  '👏': 'Clapping hands',
  '🔥': 'Fire',
  '❤': 'Heart',
  '😂': 'Face with tears of joy',
  '🥳': 'Partying face'
}

function getEmojiLabel(emoji: string): string {
  return EMOJI_LABELS[emoji] ?? emoji
}

function getDisplayName(user: User | undefined): string {
  if (!user) return 'Unknown'
  if (user.displayName) return user.displayName
  if (user.firstName || user.lastName) return [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  if (user.username) return user.username
  return 'Unknown'
}

function getInitials(name: string): string {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export interface MessageReactionBarProps {
  message: Message
  currentUserId: string | null
  isOwnMessage: boolean
  hasReactions: boolean
  showFloatingBar: boolean
  onReactionClick: (emoji: string) => void
  reactionPickerOpen: boolean
  onReactionPickerOpenChange: (open: boolean) => void
  floatingBarOnMouseEnter?: () => void
  floatingBarOnMouseLeave?: () => void
  participants?: ConversationParticipant[]
}

export const MessageReactionBar: React.FC<MessageReactionBarProps> = ({
  message,
  currentUserId,
  isOwnMessage,
  hasReactions,
  showFloatingBar,
  onReactionClick,
  reactionPickerOpen,
  onReactionPickerOpenChange,
  floatingBarOnMouseEnter,
  floatingBarOnMouseLeave,
  participants = []
}) => {
  const getUserById = (userId: string): User | undefined => participants.find(p => p.userId === userId)?.user

  return (
    <>
      {showFloatingBar && (
        <div
          className={`gba:absolute gba:bottom-full gba:mb-1 gba:rounded-lg gba:border gba:border-border gba:bg-muted gba:z-20 ${isOwnMessage ? 'gba:right-0' : 'gba:left-0'}`}
          data-testid={`message-reaction-picker-bar-${message.id}`}
          onMouseEnter={floatingBarOnMouseEnter}
          onMouseLeave={floatingBarOnMouseLeave}
        >
          <MessageReactionPicker
            onSelect={emoji => {
              onReactionClick(emoji)
              onReactionPickerOpenChange(false)
            }}
            prefixDataTestId={`message-${message.id}`}
          />
        </div>
      )}
      {hasReactions && currentUserId && (
        <div
          className={`gba:flex gba:flex-wrap gba:items-center gba:gap-1.5 gba:-mt-4 gba:relative gba:z-20 ${isOwnMessage ? 'gba:justify-end' : 'gba:justify-start'}`}
          data-testid={`message-reactions-${message.id}`}
        >
          {message.reactions &&
            Object.entries(message.reactions).map(([emoji, userIds]) => {
              if (!userIds.length) return null
              const isYours = userIds.includes(currentUserId)
              const reactedUsers = userIds.map(id => ({ id, user: getUserById(id) }))
              return (
                <HoverCard key={emoji} openDelay={300} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onReactionClick(emoji)}
                      className={`gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:px-2 gba:py-1 gba:text-xs gba:min-w-0 gba:border gba:transition-colors gba:leading-none ${
                        isOwnMessage
                          ? `gba:bg-primary gba:border-primary-foreground/25 hover:gba:border-primary-foreground/40 ${isYours ? 'gba:border-primary-foreground/50' : ''}`
                          : `gba:bg-muted gba:border-border hover:gba:bg-muted/90 ${isYours ? 'gba:border-primary/30' : ''}`
                      }`}
                      data-testid={`message-reaction-${message.id}-${emoji}`}
                    >
                      <span className="gba:leading-none gba:select-none">{emoji}</span>
                      <span
                        className={`gba:tabular-nums ${isOwnMessage ? 'gba:text-primary-foreground gba:opacity-90' : 'gba:text-muted-foreground'}`}
                      >
                        {userIds.length}
                      </span>
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent
                    align={isOwnMessage ? 'end' : 'start'}
                    side="top"
                    className="gba:w-56 gba:p-0 gba:overflow-hidden"
                  >
                    <div className="gba:px-2 gba:py-1.5 gba:border-b gba:border-border gba:bg-muted/50">
                      <span className="gba:text-xs gba:font-medium gba:text-foreground">{getEmojiLabel(emoji)}</span>
                    </div>
                    <div className="gba:max-h-48 gba:overflow-y-auto gba:py-1">
                      {reactedUsers.map(({ id, user }) => {
                        const name = getDisplayName(user)
                        return (
                          <div
                            key={id}
                            className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:hover:bg-muted/50 gba:transition-colors"
                            data-testid={`message-reaction-user-${message.id}-${emoji}-${id}`}
                          >
                            <Avatar size="sm" className="gba:h-6 gba:w-6 gba:flex-shrink-0">
                              {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={name} />}
                              <AvatarFallback className="gba:text-xs">{getInitials(name)}</AvatarFallback>
                            </Avatar>
                            <span className="gba:text-sm gba:text-foreground gba:truncate gba:min-w-0">{name}</span>
                            <span className="gba:flex-shrink-0 gba:leading-none">{emoji}</span>
                          </div>
                        )
                      })}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              )
            })}
          <Popover open={reactionPickerOpen} onOpenChange={onReactionPickerOpenChange}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`gba:inline-flex gba:items-center gba:justify-center gba:rounded-full gba:px-2 gba:py-1 gba:border gba:transition-colors ${
                  isOwnMessage
                    ? 'gba:bg-primary gba:border-primary-foreground/25 gba:text-primary-foreground hover:gba:border-primary-foreground/40'
                    : 'gba:bg-muted gba:border-border gba:text-muted-foreground hover:gba:bg-muted/90 hover:gba:text-foreground'
                }`}
                aria-label="Add reaction"
                data-testid={`message-reaction-picker-trigger-${message.id}`}
              >
                <SmileyIcon className="gba:w-4 gba:h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align={isOwnMessage ? 'end' : 'start'} side="top" className="gba:p-0">
              <MessageReactionPicker
                onSelect={emoji => {
                  onReactionClick(emoji)
                  onReactionPickerOpenChange(false)
                }}
                prefixDataTestId={`message-${message.id}`}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </>
  )
}

MessageReactionBar.displayName = 'MessageReactionBar'

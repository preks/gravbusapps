/**
 * Reaction chips, floating picker bar, and add-reaction popover for a message.
 */

import React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@newwork/nw-design-system'
import { SmileyIcon } from '@phosphor-icons/react'
import type { Message } from '../types'
import { MessageReactionPicker } from './MessageReactionPicker'

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
  floatingBarOnMouseLeave
}) => (
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
            return (
              <button
                key={emoji}
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

MessageReactionBar.displayName = 'MessageReactionBar'

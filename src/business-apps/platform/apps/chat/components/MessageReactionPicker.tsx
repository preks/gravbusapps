/**
 * Emoji-only reaction picker for chat messages. Separate from call ReactionsPicker.
 */

import React from 'react'

const MESSAGE_REACTION_EMOJIS: { emoji: string; label: string }[] = [
  { emoji: '👍', label: 'Thumbs up' },
  { emoji: '👎', label: 'Thumbs down' },
  { emoji: '❤️', label: 'Heart' },
  { emoji: '😄', label: 'Laugh' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😠', label: 'Angry' }
]

export interface MessageReactionPickerProps {
  onSelect: (emoji: string) => void
  prefixDataTestId?: string
}

export const MessageReactionPicker: React.FC<MessageReactionPickerProps> = ({
  onSelect,
  prefixDataTestId = 'chat-message'
}) => (
  <div
    className="gba:flex gba:gap-1 gba:p-1"
    role="listbox"
    aria-label="Pick a reaction"
    data-testid={`${prefixDataTestId}-reaction-picker`}
  >
    {MESSAGE_REACTION_EMOJIS.map(({ emoji, label }) => (
      <button
        key={emoji}
        type="button"
        onClick={() => onSelect(emoji)}
        className="gba:p-2 gba:rounded-md hover:gba:bg-accent gba:transition-colors gba:text-lg gba:leading-none"
        title={label}
        aria-label={`React with ${label}`}
        data-testid={`${prefixDataTestId}-reaction-emoji-${emoji}`}
      >
        {emoji}
      </button>
    ))}
  </div>
)

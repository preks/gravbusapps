/**
 * Full reaction picker with search and emoji grid. Opened by "+" on the message bar.
 */

import React, { useState, useMemo } from 'react'
import { Input } from '@newwork/nw-design-system'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { useChatTranslation } from '../contexts/TranslationContext'
import { MESSAGE_REACTION_EMOJIS } from './MessageReactionPicker'

const FULL_EMOJI_LIST = [
  ...MESSAGE_REACTION_EMOJIS,
  { emoji: '🙏', label: 'Crossed fingers' },
  { emoji: '👏', label: 'Clapping hands' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '😂', label: 'Face with tears of joy' },
  { emoji: '🥳', label: 'Partying face' },
  { emoji: '😮', label: 'Surprised' },
  { emoji: '😤', label: 'Frustrated' },
  { emoji: '🤔', label: 'Thinking' }
]

export interface MessageReactionPickerFullProps {
  onSelect: (emoji: string) => void
  prefixDataTestId?: string
}

export const MessageReactionPickerFull: React.FC<MessageReactionPickerFullProps> = ({
  onSelect,
  prefixDataTestId = 'chat-message'
}) => {
  const t = useChatTranslation()
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    if (!search.trim()) return FULL_EMOJI_LIST
    const q = search.trim().toLowerCase()
    return FULL_EMOJI_LIST.filter(({ emoji, label }) => label.toLowerCase().includes(q) || emoji.includes(q))
  }, [search])

  return (
    <div
      className="gba:flex gba:flex-col gba:w-72 gba:max-h-80"
      role="dialog"
      aria-label={t('chat-reaction-picker-full')}
      data-testid={`${prefixDataTestId}-reaction-picker-full`}
    >
      <div className="gba:flex gba:items-center gba:gap-2 gba:p-2 gba:border-b gba:border-border">
        <MagnifyingGlassIcon className="gba:w-4 gba:h-4 gba:flex-shrink-0 gba:text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('chat-reaction-search-placeholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="gba:flex-1 gba:border-0 gba:bg-transparent gba:focus-visible:ring-0 gba:text-sm"
          data-testid={`${prefixDataTestId}-reaction-picker-full-search`}
        />
      </div>
      <div className="gba:overflow-y-auto gba:p-2 gba:grid gba:grid-cols-6 gba:gap-1">
        {filtered.map(({ emoji, label }) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            className="gba:p-2 gba:rounded-md hover:gba:bg-accent gba:transition-colors gba:text-lg gba:leading-none"
            title={label}
            aria-label={t('chat-react-with-emoji', { emoji: label })}
            data-testid={`${prefixDataTestId}-reaction-full-emoji-${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

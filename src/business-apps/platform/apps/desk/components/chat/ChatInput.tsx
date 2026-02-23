import React, { useState, KeyboardEvent } from 'react'
import { Button, Input, useTranslation } from '@newwork/nw-design-system'
import { Send } from 'lucide-react'
import deskTranslations from '../../_i18n'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled = false, placeholder }) => {
  const { t } = useTranslation(deskTranslations)
  const [message, setMessage] = useState('')
  const resolvedPlaceholder = placeholder ?? t('chat-placeholder-default')

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage('')
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-2 gba:p-4 gba:border-t gba:border-border gba:bg-background/60 gba:backdrop-blur-md gba:w-full">
      <div className="gba:flex-1 gba:w-full">
        <Input
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={resolvedPlaceholder}
          disabled={disabled}
          className="gba:w-full"
          data-testid="chat-input-field"
        />
      </div>
      <Button onClick={handleSend} disabled={disabled || !message.trim()} size="default" data-testid="chat-send-button">
        <Send className="gba:h-4 gba:w-4" />
      </Button>
    </div>
  )
}

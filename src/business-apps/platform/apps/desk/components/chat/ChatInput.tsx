import React, { useState, KeyboardEvent } from 'react'
import { Button, Input } from '@newwork/nw-design-system'
import { Send } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Ask a question about your documents...'
}) => {
  const [message, setMessage] = useState('')

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
    <div className="gba:flex gba:items-center gba:gap-2 gba:p-4 gba:border-t">
      <Input
        value={message}
        onChange={e => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        disabled={disabled}
        className="gba:flex-1"
        data-testid="chat-input-field"
      />
      <Button onClick={handleSend} disabled={disabled || !message.trim()} size="default" data-testid="chat-send-button">
        <Send className="gba:h-4 gba:w-4" />
      </Button>
    </div>
  )
}

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Button, Input } from '@newwork/nw-design-system'
import { PaperPlaneTilt } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface MessageInputProps {
  onSend: (content: string) => void
  onTypingStart: () => void
  onTypingStop: () => void
  disabled?: boolean
  placeholder?: string
  compact?: boolean
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onTypingStart,
  onTypingStop,
  disabled = false,
  placeholder = getTranslationFromI18nKeyAndLabel('chat.input.placeholder', 'Type a message...'),
  compact = false
}) => {
  const [value, setValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const stopTypingTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)

    // Handle typing indicators
    if (newValue.length > 0 && !isTyping) {
      setIsTyping(true)
      onTypingStart()

      // Clear any existing stop timer
      if (stopTypingTimerRef.current) {
        clearTimeout(stopTypingTimerRef.current)
      }
    }

    // Reset stop typing timer
    if (stopTypingTimerRef.current) {
      clearTimeout(stopTypingTimerRef.current)
    }

    stopTypingTimerRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false)
        onTypingStop()
      }
    }, 2000)
  }

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim())
      setValue('')
      setIsTyping(false)
      onTypingStop()

      // Clear timers
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
      }
      if (stopTypingTimerRef.current) {
        clearTimeout(stopTypingTimerRef.current)
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
      }
      if (stopTypingTimerRef.current) {
        clearTimeout(stopTypingTimerRef.current)
      }
    }
  }, [])

  return (
    <div
      className={`gba:flex gba:items-center gba:border-t gba:border-border/50 gba:bg-background/80 gba:backdrop-blur-sm gba:flex-shrink-0 ${
        compact ? 'gba:gap-1.5 gba:p-2' : 'gba:gap-2 gba:p-3'
      }`}
      data-testid="message-input"
    >
      <div className="gba:flex-1 gba:min-w-0">
        <Input
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`gba:w-full gba:bg-muted/50 gba:border-0 focus-visible:gba:ring-1 focus-visible:gba:ring-primary/50 ${
            compact ? 'gba:h-9 gba:text-sm' : 'gba:h-10'
          }`}
          data-testid="message-input-field"
        />
      </div>
      <Button
        onClick={handleSend}
        disabled={!value.trim() || disabled}
        size="icon"
        className={`gba:flex-shrink-0 gba:rounded-full gba:transition-all ${
          compact ? 'gba:h-8 gba:w-8' : 'gba:h-9 gba:w-9'
        } ${
          value.trim() && !disabled
            ? 'gba:bg-primary gba:text-primary-foreground gba:hover:bg-primary/90'
            : 'gba:bg-muted gba:text-muted-foreground'
        }`}
        data-testid="message-send-button"
      >
        <PaperPlaneTilt className={compact ? 'gba:w-3.5 gba:h-3.5' : 'gba:w-4 gba:h-4'} />
      </Button>
    </div>
  )
}

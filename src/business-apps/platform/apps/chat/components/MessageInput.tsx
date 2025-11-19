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
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onTypingStart,
  onTypingStop,
  disabled = false,
  placeholder = getTranslationFromI18nKeyAndLabel('chat.input.placeholder', 'Type a message...')
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
      className="gba:flex gba:gap-2 gba:items-center gba:p-2 gba:border-t gba:bg-background"
      data-testid="message-input"
    >
      <div className="gba:flex-1 gba:min-w-0">
        <Input
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="gba:w-full"
          data-testid="message-input-field"
        />
      </div>
      <Button
        onClick={handleSend}
        disabled={!value.trim() || disabled}
        size="icon"
        className="gba:flex-shrink-0"
        data-testid="message-send-button"
      >
        <PaperPlaneTilt className="gba:w-4 gba:h-4" />
      </Button>
    </div>
  )
}

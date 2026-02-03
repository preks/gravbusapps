/**
 * ChatPanel - Left sidebar with conversation history and input
 */

import React, { useRef, useEffect } from 'react'
import { cn, Button } from '@newwork/nw-design-system'
import { Send, RotateCcw } from 'lucide-react'
import { ChatMessage, type ChatMessageProps } from './ChatMessage'

export interface ChatPanelProps {
  messages: ChatMessageProps[]
  inputValue: string
  onInputChange: (value: string) => void
  onSend: () => void
  onReset?: () => void
  isDisabled?: boolean
  placeholder?: string
  showResetButton?: boolean
  'data-testid'?: string
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  inputValue,
  onInputChange,
  onSend,
  onReset,
  isDisabled = false,
  placeholder = 'Describe what you want to build...',
  showResetButton = false,
  'data-testid': testId = 'chat-panel'
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inputValue])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (inputValue.trim() && !isDisabled) {
        onSend()
      }
    }
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid={testId}>
      {/* Header - fixed height, won't shrink */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-4 gba:border-b gba:border-border gba:shrink-0 gba:h-[73px]">
        <div>
          <h3 className="gba:font-semibold gba:text-foreground gba:text-sm gba:leading-tight">Conversation</h3>
          <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5 gba:leading-tight">Chat with AI to build</p>
        </div>
        {showResetButton && onReset && (
          <Button variant="ghost" size="sm" onClick={onReset} className="gba:h-8 gba:w-8 gba:p-0" title="Start over">
            <RotateCcw className="gba:w-4 gba:h-4" />
          </Button>
        )}
      </div>

      {/* Messages - constrained scrolling area with explicit max height */}
      <div
        className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:p-4 gba:space-y-4"
        style={{ maxHeight: 'calc(100vh - 280px)' }}
      >
        {messages.length === 0 && (
          <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-center gba:px-4">
            <div className="gba:text-sm gba:text-muted-foreground gba:leading-relaxed">
              Start by describing what you want to build
            </div>
          </div>
        )}

        {messages.map(message => (
          <ChatMessage key={message.id} {...message} />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="gba:border-t gba:border-border gba:p-4 gba:bg-background gba:shrink-0">
        <div className="gba:relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            rows={1}
            className={cn(
              'gba:w-full gba:resize-none gba:rounded-2xl gba:border gba:border-blue-400',
              'gba:bg-background',
              'gba:pl-5 gba:pr-14 gba:py-4 gba:text-[15px] gba:text-foreground',
              'gba:placeholder-muted-foreground/60',
              'gba:leading-relaxed',
              'gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-blue-200 gba:focus:border-blue-300',
              'gba:disabled:opacity-50 gba:disabled:cursor-not-allowed',
              'gba:min-h-[60px] gba:max-h-40 gba:overflow-y-auto',
              'gba:transition-all gba:duration-200',
              'gba:shadow-sm'
            )}
            data-testid={`${testId}-input`}
          />
          <Button
            onClick={onSend}
            disabled={!inputValue.trim() || isDisabled}
            size="sm"
            className={cn(
              'gba:absolute gba:bottom-4 gba:right-3',
              'gba:h-9 gba:w-9 gba:p-0 gba:rounded-xl',
              'gba:bg-foreground gba:text-background',
              'hover:gba:bg-foreground/90',
              'gba:disabled:opacity-30 gba:disabled:cursor-not-allowed',
              'gba:transition-all gba:duration-150',
              'gba:shadow-sm hover:gba:shadow-md'
            )}
            data-testid={`${testId}-send`}
          >
            <Send className="gba:w-4 gba:h-4" />
          </Button>
        </div>
        <p className="gba:text-[11px] gba:text-muted-foreground gba:mt-2.5 gba:leading-tight gba:opacity-50 gba:px-1">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}

export default ChatPanel

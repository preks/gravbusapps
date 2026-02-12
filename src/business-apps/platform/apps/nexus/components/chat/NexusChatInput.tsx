import { useState, useCallback, useRef } from 'react'
import { Button, Textarea } from '@newwork/nw-design-system'
import { SendHorizontal } from 'lucide-react'

interface NexusChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
  testId?: string
}

export const NexusChatInput = ({
  onSend,
  disabled = false,
  placeholder = 'Ask a question, or instruct me to create something...',
  testId = 'nexus-chat-input'
}: NexusChatInputProps) => {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return

    onSend(trimmed)
    setValue('')

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, disabled, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Cmd/Ctrl + Enter to send
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSend()
        return
      }

      // Plain Enter also sends (Shift+Enter for newline)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)

    // Auto-resize
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
  }, [])

  return (
    <div className="gba:p-3 gba:border-t gba:border-border gba:bg-background" data-testid={testId}>
      <div className="gba:flex gba:items-end gba:gap-2 gba:bg-muted/40 gba:rounded-xl gba:px-3 gba:py-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="gba:min-h-[36px] gba:max-h-[160px] gba:resize-none gba:flex-1 gba:border-0 gba:bg-transparent gba:text-sm"
          rows={1}
          data-testid={`${testId}-textarea`}
        />
        <Button
          size="icon"
          className="gba:h-8 gba:w-8 gba:flex-shrink-0"
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          data-testid={`${testId}-send`}
        >
          <SendHorizontal className="gba:h-4 gba:w-4" />
        </Button>
      </div>
    </div>
  )
}

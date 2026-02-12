import { useState, useCallback, useRef, useEffect } from 'react'
import { Button, Textarea } from '@newwork/nw-design-system'
import { SendHorizontal } from 'lucide-react'

interface NexusChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
  /** When set, the text is "typed" into the input with an animation */
  prefillText?: string | null
  /** Called after the typing animation completes */
  onPrefillComplete?: () => void
  /** Toolbar content rendered at the bottom-left of the input container (ChatGPT style) */
  toolbar?: React.ReactNode
  testId?: string
}

export const NexusChatInput = ({
  onSend,
  disabled = false,
  placeholder = 'Ask a question, or instruct me to create something...',
  prefillText,
  onPrefillComplete,
  toolbar,
  testId = 'nexus-chat-input'
}: NexusChatInputProps) => {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Typing animation when prefillText changes
  useEffect(() => {
    if (!prefillText) return

    // Clear any in-progress animation
    if (typingRef.current) clearTimeout(typingRef.current)
    setValue('')

    let index = 0
    const text = prefillText

    const typeNext = () => {
      if (index < text.length) {
        // Type 2-4 chars at a time for a fast but visible animation
        const chunkSize = Math.min(2 + Math.floor(Math.random() * 3), text.length - index)
        index += chunkSize
        setValue(text.slice(0, index))
        typingRef.current = setTimeout(typeNext, 18 + Math.random() * 12)
      } else {
        onPrefillComplete?.()
      }
    }

    // Small delay before starting to let the chat panel finish expanding
    typingRef.current = setTimeout(typeNext, 400)

    return () => {
      if (typingRef.current) clearTimeout(typingRef.current)
    }
  }, [prefillText, onPrefillComplete])

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
    <div className="gba:px-3 gba:pb-3 gba:pt-2" data-testid={testId}>
      <div className="gba:bg-card/80 gba:backdrop-blur-sm gba:rounded-2xl gba:border gba:border-border/60 gba:focus-within:border-primary/30 gba:transition-all gba:duration-200">
        {/* Textarea */}
        <div className="gba:px-4 gba:pt-3 gba:pb-1">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="gba:min-h-[36px] gba:max-h-[160px] gba:resize-none gba:w-full gba:border-0 gba:bg-transparent gba:text-sm gba:placeholder:text-muted-foreground/60 gba:p-0"
            rows={1}
            data-testid={`${testId}-textarea`}
          />
        </div>

        {/* Bottom row — toolbar left, send right */}
        <div className="gba:flex gba:items-center gba:px-3 gba:pb-3 gba:pt-4">
          <div className="gba:flex gba:items-center gba:gap-1.5 gba:flex-1 gba:min-w-0">{toolbar}</div>
          <Button
            size="icon"
            className={`gba:h-8 gba:w-8 gba:flex-shrink-0 gba:rounded-xl gba:transition-all gba:duration-200 ${
              value.trim() ? 'gba:opacity-100 gba:scale-100' : 'gba:opacity-40 gba:scale-95'
            }`}
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            data-testid={`${testId}-send`}
          >
            <SendHorizontal className="gba:h-4 gba:w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

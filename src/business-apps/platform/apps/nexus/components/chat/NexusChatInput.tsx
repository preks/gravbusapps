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
  const getTextareaElement = useCallback(() => {
    const el = textareaRef.current
    if (!el) return null
    return el instanceof HTMLTextAreaElement ? el : ((el as HTMLElement).querySelector?.('textarea') ?? null)
  }, [])

  const syncTextareaHeight = useCallback(() => {
    const textarea = getTextareaElement()
    if (!textarea) return
    // Keep single-line size as baseline, then grow only when content requires it.
    textarea.style.height = '36px'
    if (textarea.scrollHeight > 36) {
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
    }
  }, [getTextareaElement])

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
    const textarea = getTextareaElement()
    if (textarea) {
      textarea.style.height = '36px'
    }
  }, [value, disabled, onSend, getTextareaElement])

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
  }, [])

  // Auto-resize textarea when value changes (after layout so scrollHeight is correct)
  useEffect(() => {
    syncTextareaHeight()
  }, [value, syncTextareaHeight])

  // Some internal Textarea behaviors run after mount/open; enforce compact baseline again.
  useEffect(() => {
    const rafId = requestAnimationFrame(syncTextareaHeight)
    const timeoutId = setTimeout(syncTextareaHeight, 120)
    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(timeoutId)
    }
  }, [syncTextareaHeight])

  // When the panel opens, container width animates from 0 → N.
  // Re-sync on resize so the Textarea doesn't jump to a tall default until typing.
  useEffect(() => {
    const textarea = getTextareaElement()
    const target = textarea?.parentElement ?? textarea
    if (!target) return

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
      syncTextareaHeight()
    })
    observer.observe(target)
    return () => observer.disconnect()
  }, [getTextareaElement, syncTextareaHeight])

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
            className="gba:h-9 gba:min-h-9 gba:max-h-[160px] gba:resize-none gba:overflow-y-auto gba:w-full gba:border-0 gba:bg-transparent gba:text-sm gba:placeholder:text-muted-foreground/60 gba:px-3 gba:py-2 gba:focus-visible:ring-0 gba:focus-visible:ring-offset-0 gba:block"
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

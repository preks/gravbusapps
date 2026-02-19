/**
 * CreateAgentChatInput - Auto-resizing chat input for the CREATE agent panel.
 * Adapted from NexusChatInput with simplified toolbar.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button, Textarea } from '@newwork/nw-design-system'
import { SendHorizontal, Loader2 } from 'lucide-react'

interface CreateAgentChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  isProcessing?: boolean
  placeholder?: string
  testId?: string
}

export const CreateAgentChatInput = ({
  onSend,
  disabled = false,
  isProcessing = false,
  placeholder = 'Ask the agent to refine, build, or fix...',
  testId = 'create-chat-input'
}: CreateAgentChatInputProps) => {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const getTextareaElement = useCallback(() => {
    const el = textareaRef.current
    if (!el) return null
    return el instanceof HTMLTextAreaElement ? el : ((el as HTMLElement).querySelector?.('textarea') ?? null)
  }, [])

  const syncHeight = useCallback(() => {
    const textarea = getTextareaElement()
    if (!textarea) return
    textarea.style.height = '36px'
    if (textarea.scrollHeight > 36) {
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
    }
  }, [getTextareaElement])

  useEffect(() => {
    syncHeight()
  }, [value, syncHeight])

  useEffect(() => {
    const rafId = requestAnimationFrame(syncHeight)
    const timeoutId = setTimeout(syncHeight, 120)
    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(timeoutId)
    }
  }, [syncHeight])

  useEffect(() => {
    const textarea = getTextareaElement()
    const target = textarea?.parentElement ?? textarea
    if (!target || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(syncHeight)
    observer.observe(target)
    return () => observer.disconnect()
  }, [getTextareaElement, syncHeight])

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return

    onSend(trimmed)
    setValue('')

    const textarea = getTextareaElement()
    if (textarea) textarea.style.height = '36px'
  }, [value, disabled, onSend, getTextareaElement])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSend()
        return
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  return (
    <div className="gba:px-3 gba:pb-3 gba:pt-2" data-testid={testId}>
      <div className="gba:bg-card/80 gba:backdrop-blur-sm gba:rounded-2xl gba:border gba:border-border/60 gba:focus-within:border-primary/30 gba:transition-all gba:duration-200">
        <div className="gba:px-4 gba:pt-3 gba:pb-1">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="gba:h-9 gba:min-h-9 gba:max-h-[160px] gba:resize-none gba:overflow-y-auto gba:w-full gba:border-0 gba:bg-transparent gba:text-sm gba:placeholder:text-muted-foreground/60 gba:px-3 gba:py-2 gba:focus-visible:ring-0 gba:focus-visible:ring-offset-0 gba:block"
            rows={1}
            data-testid={`${testId}-textarea`}
          />
        </div>

        <div className="gba:flex gba:items-center gba:px-3 gba:pb-3 gba:pt-2">
          <span className="gba:text-[10px] gba:text-muted-foreground/50 gba:flex-1">
            Enter to send, Shift+Enter for new line
          </span>
          <Button
            size="icon"
            className={`gba:h-8 gba:w-8 gba:shrink-0 gba:rounded-xl gba:transition-all gba:duration-200 ${
              value.trim() && !isProcessing ? 'gba:opacity-100 gba:scale-100' : 'gba:opacity-40 gba:scale-95'
            }`}
            onClick={handleSend}
            disabled={disabled || !value.trim() || isProcessing}
            data-testid={`${testId}-send`}
          >
            {isProcessing ? (
              <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin" />
            ) : (
              <SendHorizontal className="gba:h-4 gba:w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

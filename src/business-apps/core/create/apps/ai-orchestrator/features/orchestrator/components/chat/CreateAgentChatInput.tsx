/**
 * CreateAgentChatInput - Auto-resizing chat input for the CREATE agent panel.
 * Uses the same InputGroup primitives as AI Builder chat.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { InputGroup, InputGroupTextarea, InputGroupAddon, InputGroupButton } from '@newwork/nw-design-system'
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
      <InputGroup className="gba:min-h-[56px] gba:rounded-xl">
        <InputGroupTextarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="gba:min-h-[56px] gba:max-h-[160px] gba:resize-none gba:rounded-xl"
          rows={2}
          data-testid={`${testId}-textarea`}
        />
        <InputGroupAddon align="block-end" className="gba:justify-end">
          <InputGroupButton
            onClick={handleSend}
            disabled={disabled || !value.trim() || isProcessing}
            variant="default"
            size="iconSm"
            className="gba:rounded-full"
            data-testid={`${testId}-send`}
            title={isProcessing ? 'Processing...' : 'Send message'}
          >
            {isProcessing ? (
              <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin" />
            ) : (
              <SendHorizontal className="gba:h-4 gba:w-4" />
            )}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <div className="gba:px-1 gba:pt-1.5">
        <span className="gba:text-[10px] gba:text-muted-foreground/60">Enter to send, Shift+Enter for new line</span>
      </div>
    </div>
  )
}

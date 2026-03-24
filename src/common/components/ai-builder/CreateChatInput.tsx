/**
 * Standardized chat input for CREATE chat panels (Flow Studio, Function Manager, etc.).
 * InputGroup + Textarea + Send/Stop button; same look as ChatDrawer (min-h 84px, rows 3).
 */

import React, { useCallback } from 'react'
import { InputGroup, InputGroupTextarea, InputGroupAddon, InputGroupButton } from '@newwork/nw-design-system'
import { SendHorizontal, Loader2, Sparkles, Square } from 'lucide-react'

export interface CreateChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
  isProcessing?: boolean
  /** When set and isProcessing, show Stop button and call on stop click. */
  onStopMessage?: () => void
  placeholder?: string
  /** Hint below input. Omit to hide. */
  tipText?: string
  /** Optional actions (e.g. Reset, Close) rendered below the input row. */
  secondaryActions?: React.ReactNode
  /** Use Sparkles icon for send when not processing. Default SendHorizontal. */
  sendIcon?: 'send' | 'sparkles'
  'data-testid'?: string
}

const DEFAULT_TIP = 'Enter to send, Shift+Enter for new line'

export const CreateChatInput: React.FC<CreateChatInputProps> = ({
  value,
  onChange,
  onSend,
  disabled = false,
  isProcessing = false,
  onStopMessage,
  placeholder = 'Type a message...',
  tipText = DEFAULT_TIP,
  secondaryActions,
  sendIcon = 'send',
  'data-testid': testId = 'create-chat-input'
}) => {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onSend()
        return
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        onSend()
      }
    },
    [onSend]
  )

  const handlePrimaryAction = useCallback(() => {
    if (isProcessing && onStopMessage) {
      onStopMessage()
      return
    }
    if (!value.trim() || disabled) return
    onSend()
  }, [isProcessing, onStopMessage, value, disabled, onSend])

  const showStop = Boolean(isProcessing && onStopMessage)
  const SendIcon = sendIcon === 'sparkles' ? Sparkles : SendHorizontal

  return (
    <div className="gba:shrink-0 gba:border-t gba:border-border gba:bg-background" data-testid={testId}>
      <div className="gba:p-4">
        <InputGroup className="gba:min-h-[84px] gba:rounded-xl">
          <InputGroupTextarea
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="gba:min-h-[84px] gba:max-h-[200px] gba:resize-none gba:rounded-xl"
            rows={3}
            data-testid={`${testId}-textarea`}
          />
          <InputGroupAddon align="block-end" className="gba:!justify-end">
            <InputGroupButton
              onClick={handlePrimaryAction}
              disabled={showStop ? false : disabled || !value.trim() || isProcessing}
              variant="default"
              size="iconSm"
              className="gba:!rounded-full"
              data-testid={showStop ? `${testId}-stop` : `${testId}-send`}
              title={showStop ? 'Stop generation' : isProcessing ? 'Processing...' : 'Send message'}
            >
              {showStop ? (
                <Square className="gba:h-4 gba:w-4" />
              ) : isProcessing ? (
                <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin" />
              ) : (
                <SendIcon className="gba:h-4 gba:w-4" />
              )}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        {tipText ? (
          <div className="gba:px-1 gba:pt-1.5">
            <span className="gba:text-[10px] gba:text-muted-foreground/60">{tipText}</span>
          </div>
        ) : null}
        {secondaryActions ? (
          <div className="gba:flex gba:items-center gba:justify-end gba:gap-1 gba:mt-2">{secondaryActions}</div>
        ) : null}
      </div>
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Textarea } from '@newwork/nw-design-system'
import { PaperPlaneRight, Paperclip, Stop, X } from '@phosphor-icons/react'
import type { SessionConfig, SpecialistAgent } from '../../types/enterpriseAgent'

export interface FabricInputProps {
  /** 'landing' = full centered card; 'workspace' = compact bottom bar */
  variant?: 'landing' | 'workspace'
  placeholder?: string
  /** When changed, updates the textarea value (chip selection prefill) */
  prefillValue?: string
  onSubmit: (task: string, config: SessionConfig) => void | Promise<unknown>
  onStop?: () => void
  onReply?: (message: string) => void | Promise<unknown>
  /** When set, input acts as a reply box instead of a new session */
  activeInterrupt?: string
  isRunning?: boolean
  isDisabled?: boolean
  selectedAgent?: SpecialistAgent
  onClearAgent?: () => void
  autoFocus?: boolean
}

const DEFAULT_CONFIG: SessionConfig = {
  mode: 'deep',
  enable_memory: true,
  enable_reflection: true
}

export const FabricInput: React.FC<FabricInputProps> = ({
  variant = 'landing',
  placeholder,
  prefillValue,
  onSubmit,
  onStop,
  onReply,
  activeInterrupt,
  isRunning = false,
  isDisabled = false,
  selectedAgent,
  onClearAgent,
  autoFocus = false
}) => {
  const [value, setValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync external prefill (chip selection) into the textarea
  useEffect(() => {
    if (prefillValue !== undefined && prefillValue !== '') {
      setValue(prefillValue)
      textareaRef.current?.focus()
    }
  }, [prefillValue])

  const isReplyMode = !!activeInterrupt
  const isLanding = variant === 'landing'

  const resolvedPlaceholder =
    placeholder ??
    (isReplyMode
      ? `Your answer to: "${activeInterrupt?.slice(0, 60)}${(activeInterrupt?.length ?? 0) > 60 ? '…' : ''}"`
      : isRunning
        ? 'Agent is working…'
        : isLanding
          ? 'Describe a task, research topic, or ask anything…'
          : 'Reply or give feedback…')

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim()
    if (!trimmed || isDisabled || isSubmitting) return

    setIsSubmitting(true)
    try {
      if (isReplyMode && onReply) {
        await Promise.resolve(onReply(trimmed))
      } else {
        const task = selectedAgent
          ? `[Working with: ${selectedAgent.display_name} — ${selectedAgent.description}]\n\n${trimmed}`
          : trimmed
        await Promise.resolve(onSubmit(task, { ...DEFAULT_CONFIG, selectedAgent }))
      }
      setValue('')
    } finally {
      setIsSubmitting(false)
    }
  }, [value, isDisabled, isSubmitting, isReplyMode, onReply, onSubmit, selectedAgent])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        void handleSubmit()
      }
    },
    [handleSubmit]
  )

  const canSend = !!value.trim() && !isDisabled && !isSubmitting && !(isRunning && !isReplyMode)

  // ── Landing variant ────────────────────────────────────────────────────────
  if (isLanding) {
    return (
      <div className="gba:w-full" data-testid="fabric-input-landing">
        <div className="gba:rounded-[2rem] gba:border gba:border-border/80 gba:bg-card/98 gba:overflow-hidden gba:shadow-[0_12px_32px_rgba(15,23,42,0.05)] gba:transition-shadow gba:focus-within:border-foreground/15 gba:focus-within:ring-1 gba:focus-within:ring-foreground/5">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={resolvedPlaceholder}
            rows={3}
            autoFocus={autoFocus}
            className="gba:min-h-[118px] gba:resize-none gba:border-0 gba:focus-visible:ring-0 gba:rounded-none gba:bg-transparent gba:px-5 gba:pt-5 gba:pb-2 gba:pr-36 gba:text-[1.05rem] gba:leading-8 gba:placeholder:text-muted-foreground/62"
            data-testid="fabric-input-textarea"
          />

          {/* Toolbar */}
          <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-3 gba:border-t gba:border-border/60">
            {/* Left: action icons */}
            <button
              className="gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
              title="Attach files"
              data-testid="fabric-input-attach"
            >
              <Paperclip className="gba:h-3.5 gba:w-3.5" />
            </button>

            {/* Selected agent chip */}
            {!isLanding && selectedAgent && (
              <button
                onClick={onClearAgent}
                className="gba:inline-flex gba:items-center gba:gap-1 gba:h-6 gba:px-2 gba:rounded-full gba:bg-primary/10 gba:text-primary gba:text-xs gba:font-medium gba:hover:bg-primary/20 gba:transition-colors"
                data-testid="fabric-input-selected-agent"
              >
                {selectedAgent.display_name}
                <X className="gba:h-3 gba:w-3" />
              </button>
            )}

            <span className="gba:ml-auto gba:text-[11px] gba:text-muted-foreground/50">⌘ Enter to send</span>

            {/* Send button */}
            <Button
              size="icon"
              className="gba:h-9 gba:w-9 gba:rounded-full gba:ml-1 gba:shrink-0"
              onClick={() => void handleSubmit()}
              disabled={!canSend}
              data-testid="fabric-input-send"
            >
              <PaperPlaneRight className="gba:h-3.5 gba:w-3.5" weight="fill" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Workspace variant — floating island card ──────────────────────────────
  return (
    <div className="gba:w-full" data-testid="fabric-input-workspace">
      <div className="gba:rounded-[1.75rem] gba:border gba:border-border gba:bg-card/95 gba:backdrop-blur-md gba:overflow-hidden gba:shadow-[0_6px_18px_rgba(15,23,42,0.035)] gba:transition-all gba:focus-within:border-foreground/20 gba:focus-within:ring-1 gba:focus-within:ring-foreground/5">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={resolvedPlaceholder}
          disabled={isSubmitting || (isRunning && !isReplyMode)}
          rows={2}
          className="gba:min-h-[88px] gba:resize-none gba:border-0 gba:focus-visible:ring-0 gba:rounded-none gba:bg-transparent gba:px-5 gba:pt-4 gba:pb-2 gba:text-[15px] gba:leading-7 gba:placeholder:text-muted-foreground/62"
          data-testid="fabric-input-textarea"
        />

        {/* Toolbar */}
        <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2.5 gba:border-t gba:border-border/80">
          <button
            className="gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
            title="Attach files"
            data-testid="fabric-input-attach"
          >
            <Paperclip className="gba:h-3.5 gba:w-3.5" />
          </button>

          {selectedAgent && (
            <button
              onClick={onClearAgent}
              className="gba:inline-flex gba:items-center gba:gap-1 gba:h-6 gba:px-2 gba:rounded-full gba:bg-primary/10 gba:text-primary gba:text-xs gba:font-medium gba:hover:bg-primary/20 gba:transition-colors"
              data-testid="fabric-input-selected-agent"
            >
              {selectedAgent.display_name}
              <X className="gba:h-3 gba:w-3" />
            </button>
          )}

          <span className="gba:ml-auto gba:text-[11px] gba:font-medium gba:tracking-[0.02em] gba:text-muted-foreground/55">
            ⌘ Enter
          </span>

          {isRunning && !isReplyMode ? (
            <button
              onClick={onStop}
              className="gba:flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-full gba:ml-1 gba:shrink-0 gba:bg-foreground gba:text-background gba:hover:opacity-90 gba:transition-opacity"
              data-testid="fabric-input-stop"
              aria-label="Stop"
            >
              <Stop className="gba:h-3.5 gba:w-3.5" weight="fill" />
            </button>
          ) : (
            <Button
              size="icon"
              className="gba:h-8 gba:w-8 gba:rounded-full gba:ml-1 gba:shrink-0"
              onClick={() => void handleSubmit()}
              disabled={!canSend}
              data-testid="fabric-input-send"
            >
              <PaperPlaneRight className="gba:h-3.5 gba:w-3.5" weight="fill" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

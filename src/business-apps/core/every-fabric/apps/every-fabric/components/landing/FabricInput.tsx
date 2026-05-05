import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Textarea } from '@newwork/nw-design-system'
import { ArrowUpIcon, PlusIcon, PlugsIcon, SpinnerGapIcon, StopIcon, XIcon } from '@phosphor-icons/react'
import type { SessionConfig, SpecialistAgent } from '../../types/enterpriseAgent'
import type { ExternalConnection } from '../../hooks/useFabricConnectors'
import { ActiveConnectorChips } from '../connectors/ActiveConnectorChips'
import { SETTINGS_KEY } from '../settings/agentSettings.types'

export interface FabricInputProps {
  /** 'landing' = full centered card; 'workspace' = compact bottom bar */
  variant?: 'landing' | 'workspace'
  placeholder?: string
  /** When changed, updates the textarea value (chip selection prefill) */
  prefillValue?: string
  onSubmit: (task: string, config: SessionConfig) => void | Promise<unknown>
  onStop?: () => void
  onReply?: (message?: string, structuredInput?: Record<string, any>) => void | Promise<unknown>
  /** When set, input acts as a reply box instead of a new session */
  activeInterrupt?: string
  isRunning?: boolean
  isDisabled?: boolean
  selectedAgent?: SpecialistAgent
  onClearAgent?: () => void
  autoFocus?: boolean
  /** Connectors integration */
  onConnectorsClick?: () => void
  activeConnectors?: ExternalConnection[]
  onRemoveConnector?: (connectionId: string) => void
}

const DEFAULT_CONFIG: SessionConfig = {
  mode: 'deep',
  enable_memory: true,
  enable_reflection: undefined
}

function buildSessionConfig(selectedAgent?: SpecialistAgent): SessionConfig {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_CONFIG, selectedAgent }
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_CONFIG,
      enable_memory: parsed.enableMemory ?? DEFAULT_CONFIG.enable_memory,
      enable_reflection:
        parsed.enableReflection === 'always' ? true : parsed.enableReflection === 'disabled' ? false : undefined,
      ...(parsed.maxIterations ? { max_iterations: parsed.maxIterations } : {}),
      selectedAgent
    }
  } catch {
    return { ...DEFAULT_CONFIG, selectedAgent }
  }
}

function resolveFabricInputPlaceholder(
  placeholder: string | undefined,
  isReplyMode: boolean,
  activeInterrupt: string | undefined,
  isRunning: boolean,
  isLanding: boolean
): string {
  if (placeholder !== undefined) return placeholder
  if (isReplyMode) {
    const tail = (activeInterrupt?.length ?? 0) > 60 ? '…' : ''
    return `Your answer to: "${activeInterrupt?.slice(0, 60)}${tail}"`
  }
  if (isRunning) return 'Agent is working…'
  if (isLanding) return 'Describe a task, research topic, or ask anything…'
  return 'Reply or give feedback…'
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
  autoFocus = false,
  onConnectorsClick,
  activeConnectors = [],
  onRemoveConnector
}) => {
  const [value, setValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync external prefill (chip selection) into the textarea
  useEffect(() => {
    if (prefillValue !== undefined && prefillValue !== '') {
      setValue(prefillValue)
      textareaRef.current?.focus()
    }
  }, [prefillValue])

  const isReplyMode = !!activeInterrupt
  const isLanding = variant === 'landing'

  const resolvedPlaceholder = resolveFabricInputPlaceholder(
    placeholder,
    isReplyMode,
    activeInterrupt,
    isRunning,
    isLanding
  )

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim()
    if (!trimmed || isDisabled || isSubmitting) return

    setIsSubmitting(true)
    try {
      if (isReplyMode && onReply) {
        await Promise.resolve(onReply(trimmed))
      } else {
        let task = trimmed

        if (selectedAgent) {
          task = `[Working with: ${selectedAgent.display_name} — ${selectedAgent.description}]\n\n${trimmed}`
        }

        await Promise.resolve(onSubmit(task, buildSessionConfig(selectedAgent)))
      }
      setValue('')
    } finally {
      setIsSubmitting(false)
    }
  }, [value, isDisabled, isSubmitting, isReplyMode, onReply, onSubmit, selectedAgent])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return
      e.preventDefault()
      handleSubmit().catch(() => undefined)
    },
    [handleSubmit]
  )

  const handleAddClick = useCallback(() => {
    if (fileInputRef.current) {
      // Clear the current value so picking the same file twice still triggers change.
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }, [])

  const handlePlaceholderFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    // Placeholder only: do not persist, preview, or upload selected files yet.
    event.target.value = ''
  }, [])

  const canSend = !!value.trim() && !isDisabled && !isSubmitting && !(isRunning && !isReplyMode)

  // ── Landing variant ────────────────────────────────────────────────────────
  if (isLanding) {
    return (
      <div className="gba:w-full" data-testid="fabric-input-landing">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="gba:hidden"
          onChange={handlePlaceholderFileChange}
          data-testid="fabric-input-file-upload"
        />
        <div className="gba:rounded-4xl gba:border gba:border-foreground/15 gba:bg-card/98 gba:overflow-hidden gba:shadow-[0_12px_32px_rgba(15,23,42,0.05)] gba:transition-shadow gba:focus-within:border-foreground/20 gba:focus-within:ring-1 gba:focus-within:ring-foreground/5">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={resolvedPlaceholder}
            disabled={isSubmitting}
            rows={3}
            autoFocus={autoFocus}
            className="gba:min-h-[118px] gba:resize-none gba:border-0 gba:focus-visible:ring-0 gba:rounded-none gba:bg-transparent gba:px-5 gba:pt-5 gba:pb-2 gba:pr-36 gba:text-[1.05rem] gba:leading-8 gba:placeholder:text-muted-foreground/62"
            data-testid="fabric-input-textarea"
          />

          {/* Active connector chips */}
          {activeConnectors.length > 0 && onRemoveConnector && (
            <ActiveConnectorChips connectors={activeConnectors} onRemove={onRemoveConnector} />
          )}

          {/* Toolbar */}
          <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-3">
            <button
              type="button"
              onClick={handleAddClick}
              className="gba:flex gba:items-center gba:justify-center gba:h-9 gba:w-9 gba:rounded-full gba:shrink-0 gba:border gba:border-foreground/15 gba:bg-background gba:text-foreground/70 gba:hover:text-foreground gba:hover:bg-muted/40 gba:transition-colors"
              title="Add"
              data-testid="fabric-input-add"
            >
              <PlusIcon className="gba:h-4 gba:w-4" weight="bold" />
            </button>

            {onConnectorsClick && (
              <button
                onClick={onConnectorsClick}
                className="gba:flex gba:items-center gba:justify-center gba:h-9 gba:w-9 gba:rounded-full gba:shrink-0 gba:border gba:border-foreground/15 gba:bg-background gba:text-foreground/70 gba:hover:text-foreground gba:hover:bg-muted/40 gba:transition-colors"
                title="Connectors"
                data-testid="fabric-input-connectors"
              >
                <PlugsIcon className="gba:h-4 gba:w-4" weight="bold" />
              </button>
            )}

            <span className="gba:ml-auto gba:text-[11px] gba:text-muted-foreground/50 gba:text-right gba:max-w-[min(100%,12rem)] gba:leading-snug">
              {isSubmitting ? 'Starting session...' : 'Enter to send, Shift+Enter for newline'}
            </span>

            {/* Send button */}
            <Button
              size="icon"
              className="gba:h-9 gba:w-9 gba:rounded-full gba:ml-1 gba:shrink-0"
              onClick={() => handleSubmit().catch(() => undefined)}
              disabled={!canSend}
              data-testid="fabric-input-send"
            >
              {isSubmitting ? (
                <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:animate-spin" weight="bold" />
              ) : (
                <ArrowUpIcon className="gba:h-3.5 gba:w-3.5" weight="bold" />
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Workspace variant — floating island card ──────────────────────────────
  return (
    <div className="gba:w-full" data-testid="fabric-input-workspace">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="gba:hidden"
        onChange={handlePlaceholderFileChange}
        data-testid="fabric-input-file-upload"
      />
      <div className="gba:rounded-[1.75rem] gba:border gba:border-foreground/15 gba:bg-card/95 gba:backdrop-blur-md gba:overflow-hidden gba:shadow-[0_6px_18px_rgba(15,23,42,0.035)] gba:transition-all gba:focus-within:border-foreground/20 gba:focus-within:ring-1 gba:focus-within:ring-foreground/5">
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

        {/* Active connector chips */}
        {activeConnectors.length > 0 && onRemoveConnector && (
          <ActiveConnectorChips connectors={activeConnectors} onRemove={onRemoveConnector} />
        )}

        {/* Toolbar */}
        <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2.5">
          <button
            type="button"
            onClick={handleAddClick}
            className="gba:flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-full gba:shrink-0 gba:border gba:border-foreground/15 gba:bg-background gba:text-foreground/70 gba:hover:text-foreground gba:hover:bg-muted/40 gba:transition-colors"
            title="Add"
            data-testid="fabric-input-add"
          >
            <PlusIcon className="gba:h-3.5 gba:w-3.5" weight="bold" />
          </button>

          {onConnectorsClick && (
            <button
              onClick={onConnectorsClick}
              className="gba:flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-full gba:shrink-0 gba:border gba:border-foreground/15 gba:bg-background gba:text-foreground/70 gba:hover:text-foreground gba:hover:bg-muted/40 gba:transition-colors"
              title="Connectors"
              data-testid="fabric-input-connectors"
            >
              <PlugsIcon className="gba:h-3.5 gba:w-3.5" weight="bold" />
            </button>
          )}

          {selectedAgent && (
            <button
              onClick={onClearAgent}
              className="gba:inline-flex gba:items-center gba:gap-1 gba:h-6 gba:px-2 gba:rounded-full gba:bg-primary/10 gba:text-primary gba:text-xs gba:font-medium gba:hover:bg-primary/20 gba:transition-colors"
              data-testid="fabric-input-selected-agent"
            >
              {selectedAgent.display_name}
              <XIcon className="gba:h-3 gba:w-3" />
            </button>
          )}

          <span className="gba:ml-auto gba:text-[11px] gba:font-medium gba:tracking-[0.02em] gba:text-muted-foreground/55 gba:text-right gba:max-w-[min(100%,11rem)] gba:leading-snug">
            Enter to send, Shift+Enter for newline
          </span>

          {isRunning && !isReplyMode ? (
            <button
              onClick={onStop}
              className="gba:flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-full gba:ml-1 gba:shrink-0 gba:bg-foreground gba:text-background gba:hover:opacity-90 gba:transition-opacity"
              data-testid="fabric-input-stop"
              aria-label="Stop"
            >
              <StopIcon className="gba:h-3.5 gba:w-3.5" weight="fill" />
            </button>
          ) : (
            <Button
              size="icon"
              className="gba:h-8 gba:w-8 gba:rounded-full gba:ml-1 gba:shrink-0"
              onClick={() => handleSubmit().catch(() => undefined)}
              disabled={!canSend}
              data-testid="fabric-input-send"
            >
              <ArrowUpIcon className="gba:h-3.5 gba:w-3.5" weight="bold" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

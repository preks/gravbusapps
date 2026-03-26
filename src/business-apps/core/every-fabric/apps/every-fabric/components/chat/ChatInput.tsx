import { useState, useRef, useCallback, useEffect } from 'react'
import { Button, Textarea } from '@newwork/nw-design-system'
import { Brain, CaretDown, CaretUp, PaperPlaneRight, SlidersHorizontal, Stop, X } from '@phosphor-icons/react'
import type { SessionConfig, SpecialistAgent } from '../../types/enterpriseAgent'

interface ChatInputProps {
  onSubmit: (task: string, options: SessionConfig) => void | Promise<unknown>
  disabled: boolean
  isRunning: boolean
  onStop: () => void
  onReply: (message: string) => void | Promise<unknown>
  activeInterrupt?: string
  onOpenMemory?: () => void
  selectedAgent?: SpecialistAgent
  onClearAgent?: () => void
}

const DEFAULT_CONFIG: SessionConfig = {
  mode: 'deep',
  enable_memory: true,
  enable_reflection: true
}

export const ChatInput = ({
  onSubmit,
  disabled,
  isRunning,
  onStop,
  onReply,
  activeInterrupt,
  onOpenMemory,
  selectedAgent,
  onClearAgent
}: ChatInputProps) => {
  const [value, setValue] = useState('')
  const [config, setConfig] = useState<SessionConfig>(DEFAULT_CONFIG)
  const [showOptions, setShowOptions] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Pre-fill interrupt reply mode
  const isReplyMode = !!activeInterrupt

  useEffect(() => {
    if (activeInterrupt) setValue('')
  }, [activeInterrupt])

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim()
    if (!trimmed || disabled || isSubmitting) return

    setIsSubmitting(true)
    try {
      if (isReplyMode) {
        await Promise.resolve(onReply(trimmed))
      } else {
        const task = selectedAgent
          ? `[Working with: ${selectedAgent.display_name} — ${selectedAgent.description}]\n\n${trimmed}`
          : trimmed
        await Promise.resolve(onSubmit(task, { ...config, selectedAgent }))
      }
      setValue('')
    } finally {
      setIsSubmitting(false)
    }
  }, [value, disabled, isReplyMode, isSubmitting, onReply, onSubmit, config, selectedAgent])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const interruptedPrompt = activeInterrupt?.trim() ?? ''
  const shortInterruptPrompt =
    interruptedPrompt.length > 60 ? `${interruptedPrompt.slice(0, 60)}...` : interruptedPrompt

  const placeholder = isReplyMode
    ? `Your answer to: "${shortInterruptPrompt}"`
    : isRunning
      ? 'Agent is working…'
      : 'Describe your goal. The agent will figure out the rest.'

  return (
    <div
      className="gba:shrink-0 gba:border-t gba:border-border gba:bg-background gba:px-4 gba:pt-3 gba:pb-4"
      data-testid="enterprise-agent-chat-input"
    >
      {/* Options panel */}
      {showOptions && (
        <div className="gba:mb-3 gba:rounded-xl gba:border gba:border-border gba:bg-muted/40 gba:p-3 gba:space-y-2.5">
          <div className="gba:flex gba:items-center gba:gap-6">
            <label className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-foreground gba:cursor-pointer">
              <input
                type="checkbox"
                checked={config.enable_memory}
                onChange={e => setConfig(prev => ({ ...prev, enable_memory: e.target.checked }))}
                className="gba:rounded"
                data-testid="enterprise-agent-option-memory"
              />
              Enable memory
            </label>
            <label className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-foreground gba:cursor-pointer">
              <input
                type="checkbox"
                checked={config.enable_reflection}
                onChange={e => setConfig(prev => ({ ...prev, enable_reflection: e.target.checked }))}
                className="gba:rounded"
                data-testid="enterprise-agent-option-reflection"
              />
              Enable reflection
            </label>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-xs gba:text-muted-foreground gba:w-10">Mode</span>
            <div className="gba:flex gba:gap-1">
              {(['deep', 'autonomous'] as const).map(m => (
                <button
                  key={m}
                  className={`gba:px-2.5 gba:py-1 gba:rounded-lg gba:text-xs gba:font-medium gba:transition-colors ${
                    config.mode === m
                      ? 'gba:bg-primary gba:text-primary-foreground'
                      : 'gba:bg-background gba:border gba:border-border gba:text-muted-foreground gba:hover:text-foreground'
                  }`}
                  onClick={() => setConfig(prev => ({ ...prev, mode: m }))}
                  data-testid={`enterprise-agent-mode-${m}`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
              <span className="gba:text-xs gba:text-muted-foreground gba:w-10 gba:shrink-0">Model</span>
              <input
                type="text"
                value={config.model ?? ''}
                onChange={e => setConfig(prev => ({ ...prev, model: e.target.value || undefined }))}
                placeholder="gpt-4o"
                className="gba:flex-1 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-2.5 gba:py-1 gba:text-xs gba:text-foreground placeholder:gba:text-muted-foreground/50 focus:gba:outline-none focus:gba:ring-1 focus:gba:ring-primary"
                data-testid="enterprise-agent-option-model"
              />
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-xs gba:text-muted-foreground gba:whitespace-nowrap">Max steps</span>
              <input
                type="number"
                min={5}
                max={50}
                step={5}
                value={config.max_iterations ?? 25}
                onChange={e => setConfig(prev => ({ ...prev, max_iterations: Number(e.target.value) }))}
                className="gba:w-16 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-2 gba:py-1 gba:text-xs gba:text-foreground focus:gba:outline-none focus:gba:ring-1 focus:gba:ring-primary"
                data-testid="enterprise-agent-option-max-iterations"
              />
            </div>
          </div>
        </div>
      )}

      {/* Textarea */}
      <div className="gba:relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isSubmitting || (isRunning && !isReplyMode)}
          rows={3}
          className="gba:resize-none gba:pr-14 gba:rounded-xl gba:text-sm"
          data-testid="enterprise-agent-input"
        />

        {/* Send / Stop button */}
        <div className="gba:absolute gba:right-2 gba:bottom-2">
          {isRunning && !isReplyMode ? (
            <Button
              variant="destructive"
              size="icon"
              className="gba:h-8 gba:w-8 gba:rounded-lg"
              onClick={onStop}
              data-testid="enterprise-agent-stop"
            >
              <Stop className="gba:h-4 gba:w-4" weight="fill" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="gba:h-8 gba:w-8 gba:rounded-lg"
              onClick={handleSubmit}
              disabled={!value.trim() || disabled || isSubmitting}
              data-testid="enterprise-agent-send"
            >
              <PaperPlaneRight className="gba:h-3.5 gba:w-3.5" weight="fill" />
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="gba:flex gba:items-center gba:gap-1 gba:mt-2">
        <Button
          variant="ghost"
          size="sm"
          className="gba:h-7 gba:text-xs gba:gap-1.5 gba:text-muted-foreground gba:hover:text-foreground"
          onClick={() => setShowOptions(v => !v)}
          data-testid="enterprise-agent-options-toggle"
        >
          <SlidersHorizontal className="gba:h-3.5 gba:w-3.5" />
          Options
          {showOptions ? <CaretUp className="gba:h-3 gba:w-3" /> : <CaretDown className="gba:h-3 gba:w-3" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gba:h-7 gba:text-xs gba:gap-1.5 gba:text-muted-foreground gba:hover:text-foreground"
          onClick={onOpenMemory}
          data-testid="enterprise-agent-memory-btn"
        >
          <Brain className="gba:h-3.5 gba:w-3.5" />
          Memory
        </Button>

        {selectedAgent && (
          <button
            onClick={onClearAgent}
            className="gba:inline-flex gba:items-center gba:gap-1 gba:h-6 gba:px-2 gba:rounded-full gba:bg-primary/10 gba:text-primary gba:text-xs gba:font-medium gba:hover:bg-primary/20 gba:transition-colors"
            data-testid="enterprise-agent-selected-badge"
          >
            {selectedAgent.display_name}
            <X className="gba:h-3 gba:w-3" />
          </button>
        )}

        <span className="gba:ml-auto gba:text-xs gba:text-muted-foreground/60">Cmd/Ctrl+Enter to send</span>
      </div>
    </div>
  )
}

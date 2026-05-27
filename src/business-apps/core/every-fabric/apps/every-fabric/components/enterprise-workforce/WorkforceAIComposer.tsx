// Collapsible AI-powered "find me an agent" composer.
//
// Default state is a slim, low-attention trigger row so it doesn't
// dominate the page. Clicking the trigger expands the full prompt
// surface with sample chips. Submitting (or selecting a sample) hands
// the query up to the screen, which switches into match mode.

import { ArrowRightIcon, SparkleIcon, XIcon } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface WorkforceAIComposerProps {
  activeQuery: string | null
  onSubmit: (query: string) => void
  onClear: () => void
}

const SAMPLE_PROMPTS = [
  'Summarise a long board meeting transcript',
  'Translate marketing copy into German',
  'Analyse a customer support ticket',
  'Draft a new company policy'
]

export const WorkforceAIComposer: React.FC<WorkforceAIComposerProps> = ({ activeQuery, onSubmit, onClear }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(activeQuery !== null)
  const [value, setValue] = useState(activeQuery ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setValue(activeQuery ?? '')
    if (activeQuery !== null) setIsExpanded(true)
  }, [activeQuery])

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const handleExpand = () => {
    setIsExpanded(true)
    focusInput()
  }

  const handleCollapse = () => {
    setIsExpanded(false)
    if (activeQuery !== null) onClear()
    setValue('')
  }

  const handleSubmit = (next: string) => {
    const trimmed = next.trim()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={handleExpand}
        className="gba:group gba:flex gba:w-full gba:items-center gba:gap-2.5 gba:rounded-xl gba:border gba:border-border gba:bg-card gba:px-3.5 gba:py-2.5 gba:text-left gba:transition-colors gba:hover:border-foreground/20 gba:hover:bg-muted/40"
        data-testid="workforce-ai-trigger"
      >
        <SparkleIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:group-hover:text-foreground" />
        <span className="gba:flex-1 gba:text-sm gba:text-muted-foreground">Find the right agent for the job</span>
        <span className="gba:hidden gba:rounded-md gba:border gba:border-border gba:bg-background gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-muted-foreground gba:sm:inline">
          AI
        </span>
      </button>
    )
  }

  return (
    <div
      className="gba:rounded-2xl gba:border gba:border-border gba:bg-card gba:p-4 gba:shadow-sm"
      data-testid="workforce-ai-composer"
    >
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
        <div className="gba:flex gba:items-center gba:gap-2">
          <SparkleIcon className="gba:h-4 gba:w-4 gba:text-foreground" weight="fill" />
          <p className="gba:text-sm gba:font-medium gba:text-foreground">Find the right agent for the job</p>
        </div>
        <button
          type="button"
          onClick={handleCollapse}
          aria-label="Collapse"
          className="gba:inline-flex gba:h-7 gba:w-7 gba:items-center gba:justify-center gba:rounded-md gba:text-muted-foreground gba:hover:bg-muted gba:hover:text-foreground"
          data-testid="workforce-ai-collapse"
        >
          <XIcon className="gba:h-4 gba:w-4" />
        </button>
      </div>

      <form
        className="gba:mt-3 gba:flex gba:items-stretch gba:gap-2"
        onSubmit={e => {
          e.preventDefault()
          handleSubmit(value)
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') handleCollapse()
          }}
          placeholder="Describe a task… e.g. translate a contract into Spanish"
          className="gba:h-10 gba:w-full gba:flex-1 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:text-sm gba:text-foreground gba:placeholder-muted-foreground gba:outline-none gba:focus:border-foreground/30"
          data-testid="workforce-ai-input"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="gba:inline-flex gba:h-10 gba:items-center gba:gap-1.5 gba:rounded-lg gba:bg-foreground gba:px-3.5 gba:text-sm gba:font-medium gba:text-background gba:transition-opacity gba:hover:opacity-90 gba:disabled:cursor-not-allowed gba:disabled:opacity-30"
          data-testid="workforce-ai-submit"
        >
          <span className="gba:hidden gba:sm:inline">Find</span>
          <ArrowRightIcon className="gba:h-4 gba:w-4" weight="bold" />
        </button>
      </form>

      {!activeQuery && (
        <div className="gba:mt-3 gba:flex gba:flex-wrap gba:gap-1.5">
          {SAMPLE_PROMPTS.map(prompt => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                setValue(prompt)
                handleSubmit(prompt)
              }}
              className="gba:inline-flex gba:items-center gba:rounded-full gba:border gba:border-border gba:bg-background gba:px-2.5 gba:py-1 gba:text-xs gba:text-muted-foreground gba:transition-colors gba:hover:border-foreground/20 gba:hover:bg-muted/40 gba:hover:text-foreground"
              data-testid={`workforce-ai-sample-${prompt.slice(0, 16).replace(/\s+/g, '-').toLowerCase()}`}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

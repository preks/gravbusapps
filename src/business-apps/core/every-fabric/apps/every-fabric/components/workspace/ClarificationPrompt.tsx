import { useEffect, useRef, useState } from 'react'
import { Button, Textarea } from '@newwork/nw-design-system'
import { ArrowRight, PauseCircle, PencilSimple, X } from '@phosphor-icons/react'
import { WORKSPACE_CHAT_GUTTER_CLASS, WORKSPACE_CHAT_RAIL_CLASS } from './workspaceLayout.constants'

// ─── Option parsing ───────────────────────────────────────────────────────────
// The agent may embed numbered/bulleted options inside the question text, e.g.:
//   "Which format do you prefer?\n1. PDF\n2. Word\n3. Slides"
// We parse these out and surface them as clickable chips.

interface ParsedQuestion {
  headline: string
  options: string[]
}

function parseQuestion(question: string): ParsedQuestion {
  const lines = question
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  // Match lines like: "1. Foo", "- Foo", "• Foo", "a) Foo", "A. Foo"
  const optionRe = /^(?:\d+[\.\)]|[-•*]|[a-zA-Z][\.\)])\s+(.+)$/
  const options: string[] = []
  const rest: string[] = []

  for (const line of lines) {
    const m = optionRe.exec(line)
    if (m) {
      options.push(m[1].trim())
    } else {
      rest.push(line)
    }
  }

  // If no embedded options were found, fall back to generic quick-answers
  return {
    headline: rest.join(' ') || question,
    options: options.length > 0 ? options : []
  }
}

// Quick-answers shown when the question has no embedded options
const FALLBACK_OPTIONS = ['Yes, proceed', 'No, stop', 'Continue', 'Clarify more']

// ─── Keyboard trap ────────────────────────────────────────────────────────────

function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !ref.current) return
    const el = ref.current
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    el.addEventListener('keydown', trap)
    first?.focus()
    return () => el.removeEventListener('keydown', trap)
  }, [active, ref])
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface ClarificationPromptProps {
  question: string
  isOpen: boolean
  onAnswer: (answer: string) => void
  onDismiss?: () => void
}

export const ClarificationPrompt: React.FC<ClarificationPromptProps> = ({ question, isOpen, onAnswer, onDismiss }) => {
  const [freeText, setFreeText] = useState('')
  const [isCustomOpen, setIsCustomOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [forceClosed, setForceClosed] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const { headline, options } = parseQuestion(question)
  const displayOptions = options.length > 0 ? options : FALLBACK_OPTIONS
  const visible = isOpen && !forceClosed

  useFocusTrap(panelRef, visible)

  // Reset on new question
  useEffect(() => {
    setFreeText('')
    setIsCustomOpen(false)
    setSubmitted(false)
    setForceClosed(false)
  }, [question])

  const submit = (value: string) => {
    if (!value.trim() || submitted) return
    setSubmitted(true)
    setForceClosed(true)
    onDismiss?.()
    onAnswer(value.trim())
  }

  const dismiss = () => {
    setForceClosed(true)
    onDismiss?.()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={`gba:fixed gba:inset-0 gba:bg-background/18 gba:z-[55] gba:transition-opacity gba:duration-200 ${
          visible ? 'gba:opacity-100 gba:pointer-events-auto' : 'gba:opacity-0 gba:pointer-events-none'
        }`}
        onClick={dismiss}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Agent clarification"
        data-testid="fabric-clarification-prompt"
        className={`gba:fixed gba:inset-x-0 gba:bottom-[9.625rem] sm:gba:bottom-[10.875rem] lg:gba:bottom-[11.625rem] gba:z-[60] gba:pointer-events-none gba:transition-all gba:duration-300 gba:ease-out ${
          visible ? 'gba:translate-y-0 gba:opacity-100' : 'gba:translate-y-4 gba:opacity-0 gba:pointer-events-none'
        }`}
      >
        <div className={WORKSPACE_CHAT_GUTTER_CLASS}>
          <div className={`${WORKSPACE_CHAT_RAIL_CLASS} gba:mx-auto gba:pointer-events-auto`}>
            <div className="gba:rounded-[1.6rem] gba:border gba:border-border/85 gba:bg-card/98 gba:backdrop-blur-xl gba:shadow-[0_20px_60px_rgba(15,23,42,0.14)] gba:overflow-hidden">
              <div className="gba:flex gba:items-center gba:gap-2.5 gba:px-4 sm:gba:px-5 gba:pt-4 gba:pb-3">
                <PauseCircle className="gba:h-4 gba:w-4 gba:text-amber-500 gba:shrink-0" weight="fill" />
                <span className="gba:text-sm gba:font-semibold gba:text-foreground gba:flex-1">
                  Agent needs your input
                </span>
                {onDismiss && (
                  <button
                    onClick={dismiss}
                    className="gba:inline-flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
                    data-testid="fabric-clarification-dismiss"
                    aria-label="Dismiss"
                  >
                    <X className="gba:h-4 gba:w-4" />
                  </button>
                )}
              </div>

              <div className="gba:px-4 sm:gba:px-5 gba:pb-3">
                <p className="gba:text-sm gba:text-foreground gba:leading-relaxed">{headline}</p>
              </div>

              <div className="gba:px-3 sm:gba:px-4 gba:pb-3 gba:space-y-2">
                {displayOptions.map((opt, i) => (
                  <button
                    key={`${opt}-${i}`}
                    onClick={() => submit(opt)}
                    disabled={submitted}
                    data-testid={`fabric-clarification-option-${i}`}
                    className="gba:flex gba:w-full gba:items-center gba:gap-3 gba:px-3.5 gba:py-3 gba:rounded-[1.05rem] gba:border gba:border-border/75 gba:bg-background/95 gba:text-left gba:transition-all gba:hover:border-primary/55 gba:hover:bg-primary/5 gba:disabled:opacity-50 gba:disabled:cursor-not-allowed"
                  >
                    <span className="gba:inline-flex gba:items-center gba:justify-center gba:h-7 gba:w-7 gba:rounded-full gba:bg-muted gba:text-xs gba:font-semibold gba:text-foreground/80 gba:shrink-0">
                      {i + 1}
                    </span>
                    <span className="gba:flex-1 gba:text-sm gba:font-medium gba:text-foreground">{opt}</span>
                    <ArrowRight className="gba:h-4 gba:w-4 gba:text-muted-foreground/60" />
                  </button>
                ))}
              </div>

              <div className="gba:px-3 sm:gba:px-4 gba:pb-4">
                {!isCustomOpen ? (
                  <button
                    onClick={() => setIsCustomOpen(true)}
                    disabled={submitted}
                    className="gba:flex gba:w-full gba:items-center gba:gap-3 gba:px-3.5 gba:py-3 gba:rounded-[1.05rem] gba:border gba:border-dashed gba:border-border/70 gba:bg-background/70 gba:text-left gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/25 gba:transition-colors gba:disabled:opacity-50"
                    data-testid="fabric-clarification-open-custom"
                  >
                    <PencilSimple className="gba:h-4 gba:w-4 gba:shrink-0" />
                    <span className="gba:flex-1 gba:text-sm">Write your own answer</span>
                    <span className="gba:text-[11px] gba:uppercase gba:tracking-wide">Enter to send</span>
                  </button>
                ) : (
                  <div className="gba:space-y-2">
                    <Textarea
                      value={freeText}
                      onChange={e => setFreeText(e.target.value)}
                      placeholder="Type your answer and press Enter…"
                      rows={2}
                      disabled={submitted}
                      className="gba:resize-none gba:text-sm gba:rounded-[1.05rem]"
                      data-testid="fabric-clarification-input"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          submit(freeText)
                        }
                      }}
                    />
                    <div className="gba:flex gba:items-center gba:justify-between gba:px-1">
                      <span className="gba:text-[11px] gba:text-muted-foreground">
                        Press Enter to send, Shift+Enter for newline
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gba:h-7 gba:text-xs"
                        disabled={!freeText.trim() || submitted}
                        onClick={() => submit(freeText)}
                        data-testid="fabric-clarification-submit"
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Button, Textarea, useTranslation } from '@newwork/nw-design-system'
import { ArrowRightIcon, PauseCircleIcon, PencilSimpleIcon, XIcon } from '@phosphor-icons/react'
import translations from '../../_i18n'
import {
  WORKSPACE_CHAT_GUTTER_CLASS,
  WORKSPACE_CHAT_OFFSET_TRANSITION_CLASS,
  WORKSPACE_CHAT_RAIL_CLASS
} from './workspaceLayout.constants'

// ─── Option parsing ───────────────────────────────────────────────────────────
// The agent may embed numbered/bulleted options inside the question text, e.g.:
//   "Which format do you prefer?\n1. PDF\n2. Word\n3. Slides"
// We parse these out and surface them as clickable chips.

interface ParsedQuestion {
  headline: string
  options: string[]
}

function extractEmbeddedOptionText(line: string): string | null {
  const numbered = /^(\d+)[.)]\s+/.exec(line)
  if (numbered) {
    const text = line.slice(numbered[0].length).trim()
    return text.length > 0 ? text : null
  }

  const marker = line[0]
  if (marker === '-' || marker === '•' || marker === '*') {
    const text = line.slice(1).trimStart().trim()
    return text.length > 0 ? text : null
  }

  const lettered = /^([a-zA-Z])[.)]\s+/.exec(line)
  if (lettered) {
    const text = line.slice(lettered[0].length).trim()
    return text.length > 0 ? text : null
  }

  return null
}

function parseQuestion(question: string): ParsedQuestion {
  const lines = question
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  // Match lines like: "1. Foo", "- Foo", "• Foo", "a) Foo", "A. Foo" (linear-time; avoids ReDoS-prone combined regex)
  const options: string[] = []
  const rest: string[] = []

  for (const line of lines) {
    const optionText = extractEmbeddedOptionText(line)
    if (optionText) {
      options.push(optionText)
    } else {
      rest.push(line)
    }
  }

  return {
    headline: rest.join(' ') || question,
    options: options.length > 0 ? options : []
  }
}

// Detect if this is an open-ended information request vs a choice question
function isOpenEndedQuestion(question: string): boolean {
  const lowerQ = question.toLowerCase()
  // Keywords that indicate the user needs to provide information
  const openEndedIndicators = [
    'what is',
    'what are',
    'which',
    'please provide',
    'tell me',
    'describe',
    'specify',
    'enter',
    'type',
    'explain',
    'topic',
    'domain',
    'name',
    'details'
  ]
  return openEndedIndicators.some(indicator => lowerQ.includes(indicator))
}

// Quick-answers shown when the question has no embedded options and is not open-ended

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
      } else if (document.activeElement === last) {
        e.preventDefault()
        first?.focus()
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
  /**
   * Mirrors `ConversationPanel.chatOffsetClass` — the resolved right-offset
   * utility class (regular or preview-width variant) when the right workspace
   * panel is open, otherwise an empty string. Applied on an **outer** wrapper
   * around the gutter so it can't collide with the responsive gutter's
   * `padding-right` in the Tailwind cascade.
   */
  chatOffsetClass?: string
  onAnswer: (answer: string) => void
  onDismiss?: () => void
}

export const ClarificationPrompt: React.FC<ClarificationPromptProps> = ({
  question,
  isOpen,
  chatOffsetClass = '',
  onAnswer,
  onDismiss
}) => {
  const { t } = useTranslation(translations)
  const [freeText, setFreeText] = useState('')
  const [isCustomOpen, setIsCustomOpen] = useState(false)
  const panelRef = useRef<HTMLDialogElement>(null)
  const { headline, options } = parseQuestion(question)
  const isOpenEnded = options.length === 0 && isOpenEndedQuestion(question)
  const fallbackOptions = [t('workspace-fallback-yes'), t('workspace-fallback-no')]
  let displayOptions: string[]
  if (options.length > 0) {
    displayOptions = options
  } else if (isOpenEnded) {
    displayOptions = []
  } else {
    displayOptions = fallbackOptions
  }

  useFocusTrap(panelRef, isOpen)

  // Reset on new question
  useEffect(() => {
    setFreeText('')
    // Auto-open textarea for open-ended questions
    setIsCustomOpen(isOpenEnded)
  }, [question, isOpenEnded])

  const submit = (value: string) => {
    if (!value.trim()) return
    onAnswer(value.trim())
  }

  const dismiss = () => {
    onDismiss?.()
  }

  return (
    <>
      {/*
        Backdrop + dialog are both `absolute` so they anchor to the same
        positioning context as the bottom composer (the `relative` wrapper
        inside WorkspaceLayout) — not the viewport. That keeps the modal's
        centered rail perfectly aligned with the composer, regardless of the
        sidebar width.
      */}
      <div
        aria-hidden="true"
        className={`gba:absolute gba:inset-0 gba:bg-background/18 gba:z-[55] gba:transition-opacity gba:duration-200 ${
          isOpen ? 'gba:opacity-100 gba:pointer-events-auto' : 'gba:opacity-0 gba:pointer-events-none'
        }`}
        onClick={dismiss}
      />

      <dialog
        ref={panelRef}
        open={isOpen}
        aria-modal="true"
        aria-label={t('workspace-clarification-aria')}
        data-testid="fabric-clarification-prompt"
        className={`gba:absolute gba:inset-x-0 gba:top-auto gba:bottom-[9.625rem] sm:gba:bottom-[10.875rem] lg:gba:bottom-[11.625rem] gba:z-[60] gba:m-0 gba:pointer-events-none gba:max-h-none gba:w-full gba:max-w-none gba:border-0 gba:bg-transparent gba:p-0 gba:shadow-none gba:backdrop:bg-transparent gba:transition-all gba:duration-300 gba:ease-out ${chatOffsetClass} ${WORKSPACE_CHAT_OFFSET_TRANSITION_CLASS} ${
          isOpen ? 'gba:translate-y-0 gba:opacity-100' : 'gba:translate-y-4 gba:opacity-0 gba:pointer-events-none'
        }`}
        data-chat-offset={chatOffsetClass ? 'true' : 'false'}
      >
        <div className={WORKSPACE_CHAT_GUTTER_CLASS}>
          <div className={`${WORKSPACE_CHAT_RAIL_CLASS} gba:mx-auto gba:pointer-events-auto`}>
            <div className="gba:rounded-[1.6rem] gba:border gba:border-border/85 gba:bg-card/98 gba:backdrop-blur-xl gba:shadow-[0_20px_60px_rgba(15,23,42,0.14)] gba:overflow-hidden">
              <div className="gba:flex gba:items-center gba:gap-2.5 gba:px-4 sm:gba:px-5 gba:pt-4 gba:pb-3">
                <PauseCircleIcon className="gba:h-4 gba:w-4 gba:text-amber-500 gba:shrink-0" weight="fill" />
                <span className="gba:text-sm gba:font-semibold gba:text-foreground gba:flex-1">
                  {t('enterprise-agent-interrupt-title')}
                </span>
                {onDismiss && (
                  <button
                    onClick={dismiss}
                    className="gba:inline-flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
                    data-testid="fabric-clarification-dismiss"
                    aria-label={t('workspace-clarification-dismiss')}
                  >
                    <XIcon className="gba:h-4 gba:w-4" />
                  </button>
                )}
              </div>

              <div className="gba:px-4 sm:gba:px-5 gba:pb-3">
                <p className="gba:text-sm gba:text-foreground gba:leading-relaxed">{headline}</p>
              </div>

              {/* Only show option buttons if there are options */}
              {displayOptions.length > 0 && (
                <div className="gba:px-3 sm:gba:px-4 gba:pb-3 gba:space-y-2">
                  {displayOptions.map((opt, i) => (
                    <button
                      key={`${opt}-${i}`}
                      onClick={() => submit(opt)}
                      data-testid={`fabric-clarification-option-${i}`}
                      className="gba:flex gba:w-full gba:items-center gba:gap-3 gba:px-3.5 gba:py-3 gba:rounded-[1.05rem] gba:border gba:border-border/75 gba:bg-background/95 gba:text-left gba:transition-all gba:hover:border-primary/55 gba:hover:bg-primary/5"
                    >
                      <span className="gba:inline-flex gba:items-center gba:justify-center gba:h-7 gba:w-7 gba:rounded-full gba:bg-muted gba:text-xs gba:font-semibold gba:text-foreground/80 gba:shrink-0">
                        {i + 1}
                      </span>
                      <span className="gba:flex-1 gba:text-sm gba:font-medium gba:text-foreground">{opt}</span>
                      <ArrowRightIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground/60" />
                    </button>
                  ))}
                </div>
              )}

              <div className="gba:px-3 sm:gba:px-4 gba:pb-4">
                {/* For open-ended questions, show textarea directly. For choice questions with options, show toggle button. */}
                {!isCustomOpen && displayOptions.length > 0 ? (
                  <button
                    onClick={() => setIsCustomOpen(true)}
                    className="gba:flex gba:w-full gba:items-center gba:gap-3 gba:px-3.5 gba:py-3 gba:rounded-[1.05rem] gba:border gba:border-dashed gba:border-border/70 gba:bg-background/70 gba:text-left gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/25 gba:transition-colors"
                    data-testid="fabric-clarification-open-custom"
                  >
                    <PencilSimpleIcon className="gba:h-4 gba:w-4 gba:shrink-0" />
                    <span className="gba:flex-1 gba:text-sm">{t('workspace-clarification-custom')}</span>
                    <span className="gba:text-[11px] gba:uppercase gba:tracking-wide">
                      {t('workspace-clarification-enter-hint')}
                    </span>
                  </button>
                ) : (
                  <div className="gba:space-y-2">
                    <Textarea
                      value={freeText}
                      onChange={e => setFreeText(e.target.value)}
                      placeholder={t('workspace-clarification-placeholder')}
                      rows={2}
                      className="gba:resize-none gba:text-sm gba:rounded-[1.05rem]"
                      data-testid="fabric-clarification-input"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          submit(freeText)
                        }
                      }}
                      autoFocus={isOpenEnded}
                    />
                    <div className="gba:flex gba:items-center gba:justify-between gba:px-1">
                      <span className="gba:text-[11px] gba:text-muted-foreground">
                        {t('workspace-clarification-keyboard-hint')}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gba:h-7 gba:text-xs"
                        disabled={!freeText.trim()}
                        onClick={() => submit(freeText)}
                        data-testid="fabric-clarification-submit"
                      >
                        {t('workspace-clarification-send')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </dialog>
    </>
  )
}

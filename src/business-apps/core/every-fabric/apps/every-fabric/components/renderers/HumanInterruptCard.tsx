import { useState } from 'react'
import { Button, Textarea } from '@newwork/nw-design-system'
import { PauseCircle } from '@phosphor-icons/react'

interface HumanInterruptCardProps {
  question: string
  sessionId: string
  onAnswer: (answer: string) => void
}

const QUICK_ANSWERS = ['Yes', 'No', 'Continue', 'Stop', 'Confirm']

export const HumanInterruptCard = ({ question, sessionId, onAnswer }: HumanInterruptCardProps) => {
  const [answer, setAnswer] = useState('')

  const submit = (value: string) => {
    if (!value.trim()) return
    onAnswer(value.trim())
    setAnswer('')
  }

  return (
    <div
      className="gba:rounded-xl gba:border gba:border-border gba:bg-muted/50 gba:p-4 gba:max-w-3xl"
      data-testid={`enterprise-agent-interrupt-${sessionId}`}
    >
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
        <PauseCircle className="gba:h-4 gba:w-4 gba:text-primary gba:animate-pulse gba:flex-shrink-0" weight="fill" />
        <span className="gba:text-sm gba:font-semibold gba:text-foreground">Agent needs your input</span>
      </div>

      <p className="gba:text-sm gba:text-foreground gba:mb-3 gba:leading-relaxed">{question}</p>

      {/* Quick-answer chips */}
      <div className="gba:flex gba:flex-wrap gba:gap-1.5 gba:mb-3">
        {QUICK_ANSWERS.map(opt => (
          <button
            key={opt}
            className="gba:px-3 gba:py-1 gba:rounded-full gba:border gba:border-border gba:bg-background gba:text-xs gba:font-medium gba:text-foreground gba:hover:bg-muted gba:transition-colors"
            onClick={() => submit(opt)}
            data-testid={`enterprise-agent-quick-answer-${opt.toLowerCase()}`}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Free-text answer */}
      <div className="gba:flex gba:gap-2">
        <Textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder="Your answer…"
          rows={2}
          className="gba:resize-none gba:text-sm gba:flex-1 gba:rounded-lg"
          data-testid="enterprise-agent-interrupt-input"
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              submit(answer)
            }
          }}
        />
        <Button
          size="sm"
          className="gba:self-end"
          disabled={!answer.trim()}
          onClick={() => submit(answer)}
          data-testid="enterprise-agent-interrupt-submit"
        >
          Answer
        </Button>
      </div>
    </div>
  )
}

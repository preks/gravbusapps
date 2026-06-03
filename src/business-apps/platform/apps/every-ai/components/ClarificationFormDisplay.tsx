import React, { useCallback, useMemo, useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@newwork/nw-design-system'
import { Question } from '@phosphor-icons/react'

import type { ClarificationQuestionItem, ClarificationRequestOutput } from '../types/models'

interface ClarificationFormDisplayProps {
  data: ClarificationRequestOutput
  sendMessage?: (message: string, files: File[]) => void
  isAgentGenerating?: boolean
}

type AnswerValue = string | number | boolean | string[] | null

interface AnswersState {
  [questionId: string]: AnswerValue
}

const formatDateForInput = (value: AnswerValue): string => {
  if (typeof value !== 'string') return ''
  return value
}

const buildInitialAnswers = (questions: ClarificationQuestionItem[]): AnswersState => {
  const initial: AnswersState = {}
  for (const question of questions) {
    if (question.default !== undefined && question.default !== null) {
      initial[question.id] = question.default as AnswerValue
      continue
    }
    if (question.field === 'BOOLEAN') {
      initial[question.id] = false
    } else if (question.field === 'MULTISELECT') {
      initial[question.id] = []
    } else if (question.field === 'NUMBER') {
      initial[question.id] = ''
    } else {
      initial[question.id] = ''
    }
  }
  return initial
}

const isAnswerEmpty = (value: AnswerValue): boolean => {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  return false
}

interface QuestionFieldProps {
  question: ClarificationQuestionItem
  value: AnswerValue
  onChange: (next: AnswerValue) => void
  disabled: boolean
}

function QuestionField({ question, value, onChange, disabled }: QuestionFieldProps) {
  const fieldType = question.field ?? 'STRING'
  const controlId = `clarify-${question.id}`

  if (fieldType === 'TEXT') {
    return (
      <textarea
        id={controlId}
        className="gba:min-h-24 gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-ring disabled:gba:cursor-not-allowed disabled:gba:opacity-50"
        value={typeof value === 'string' ? value : ''}
        placeholder={question.placeholder ?? ''}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
      />
    )
  }

  if (fieldType === 'NUMBER') {
    return (
      <Input
        id={controlId}
        type="number"
        value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
        placeholder={question.placeholder ?? ''}
        onChange={event => {
          const next = event.target.value
          onChange(next === '' ? '' : Number(next))
        }}
        disabled={disabled}
      />
    )
  }

  if (fieldType === 'BOOLEAN') {
    return (
      <label className="gba:flex gba:items-center gba:gap-2">
        <input
          id={controlId}
          type="checkbox"
          checked={value === true}
          onChange={event => onChange(event.target.checked)}
          disabled={disabled}
        />
        <span className="gba:text-sm gba:text-muted-foreground">{question.placeholder ?? 'Yes'}</span>
      </label>
    )
  }

  if (fieldType === 'DATE') {
    return (
      <Input
        id={controlId}
        type="date"
        value={formatDateForInput(value)}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
      />
    )
  }

  if (fieldType === 'SELECT') {
    const options = question.options ?? []
    return (
      <select
        id={controlId}
        className="gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-ring disabled:gba:cursor-not-allowed disabled:gba:opacity-50"
        value={typeof value === 'string' ? value : ''}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
      >
        <option value="" disabled>
          {question.placeholder ?? 'Select an option'}
        </option>
        {options.map(option => (
          <option key={`${controlId}-${option}`} value={option}>
            {option}
          </option>
        ))}
      </select>
    )
  }

  if (fieldType === 'MULTISELECT') {
    const options = question.options ?? []
    const selectedValues = Array.isArray(value) ? value : []
    return (
      <div className="gba:flex gba:flex-col gba:gap-2">
        {options.map(option => {
          const checked = selectedValues.includes(option)
          return (
            <label key={`${controlId}-${option}`} className="gba:flex gba:items-center gba:gap-2">
              <input
                type="checkbox"
                checked={checked}
                onChange={event => {
                  const next = event.target.checked
                    ? [...selectedValues, option]
                    : selectedValues.filter(item => item !== option)
                  onChange(next)
                }}
                disabled={disabled}
              />
              <span className="gba:text-sm">{option}</span>
            </label>
          )
        })}
      </div>
    )
  }

  return (
    <Input
      id={controlId}
      value={typeof value === 'string' ? value : ''}
      placeholder={question.placeholder ?? ''}
      onChange={event => onChange(event.target.value)}
      disabled={disabled}
    />
  )
}

/**
 * Inline form rendered in the EveryAI chat when the agent calls the
 * `ask_clarifications` tool. The user's answers are POSTed back to the same
 * `/v2/chat` endpoint as a JSON-encoded `user_input_text`, which the
 * supervisor decodes and feeds into the suspended LangGraph thread via
 * `Command(resume=...)`.
 */
export const ClarificationFormDisplay: React.FC<ClarificationFormDisplayProps> = ({
  data,
  sendMessage,
  isAgentGenerating = false
}) => {
  const [answers, setAnswers] = useState<AnswersState>(() => buildInitialAnswers(data.questions))
  const [submitted, setSubmitted] = useState(false)
  const [cancelled, setCancelled] = useState(false)

  const missingRequired = useMemo(() => {
    return data.questions
      .filter(question => question.required !== false)
      .filter(question => isAnswerEmpty(answers[question.id]))
      .map(question => question.id)
  }, [answers, data.questions])

  const handleSubmit = useCallback(() => {
    if (!sendMessage || submitted || cancelled || missingRequired.length > 0) return
    const payload = JSON.stringify({
      action: 'clarification_response',
      interrupt_id: data.id,
      data: answers
    })
    setSubmitted(true)
    sendMessage(payload, [])
  }, [answers, cancelled, data.id, missingRequired.length, sendMessage, submitted])

  const handleCancel = useCallback(() => {
    if (!sendMessage || submitted || cancelled) return
    const payload = JSON.stringify({
      action: 'clarification_cancel',
      interrupt_id: data.id,
      data: {}
    })
    setCancelled(true)
    sendMessage(payload, [])
  }, [cancelled, data.id, sendMessage, submitted])

  const isLocked = submitted || cancelled || isAgentGenerating

  return (
    <Card className="gba:my-3 gba:border-primary/20">
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:gap-2 gba:py-3">
        <Question className="gba:h-5 gba:w-5 gba:shrink-0 gba:text-primary" weight="duotone" aria-hidden="true" />
        <CardTitle className="gba:text-sm gba:font-medium">A few quick questions</CardTitle>
      </CardHeader>
      <CardContent className="gba:flex gba:flex-col gba:gap-4">
        {data.purpose ? <p className="gba:text-sm gba:text-muted-foreground">{data.purpose}</p> : null}

        {data.questions.map(question => (
          <div key={question.id} className="gba:flex gba:flex-col gba:gap-1.5">
            <Label htmlFor={`clarify-${question.id}`} className="gba:text-sm gba:font-medium">
              {question.label}
              {question.required === false ? null : (
                <span className="gba:ml-1 gba:text-destructive" aria-hidden="true">
                  *
                </span>
              )}
            </Label>
            <QuestionField
              question={question}
              value={answers[question.id] ?? ''}
              onChange={next => setAnswers(prev => ({ ...prev, [question.id]: next }))}
              disabled={isLocked}
            />
          </div>
        ))}

        <div className="gba:mt-2 gba:flex gba:items-center gba:justify-end gba:gap-2">
          <Button variant="ghost" onClick={handleCancel} disabled={isLocked}>
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLocked || missingRequired.length > 0}
            data-testid="clarification-form-submit"
          >
            {submitted ? 'Sent' : 'Send answers'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default ClarificationFormDisplay

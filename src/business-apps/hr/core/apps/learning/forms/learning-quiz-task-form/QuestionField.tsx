import React from 'react'
import type { LearningQuizQuestion } from '../../types'

interface QuestionFieldProps {
  question: LearningQuizQuestion
  selectedKeys: string[]
  disabled: boolean
  onSingleAnswer: (questionId: string, selectedKey: string) => void
  onMultiAnswer: (questionId: string, selectedKey: string, checked: boolean) => void
}

export const QuestionField: React.FC<QuestionFieldProps> = ({
  question,
  selectedKeys,
  disabled,
  onSingleAnswer,
  onMultiAnswer
}) => (
  <fieldset
    className="gba:space-y-3 gba:rounded-lg gba:border gba:p-4"
    data-testid={`learning-quiz-question-${question.id}`}
  >
    <legend className="gba:text-sm gba:font-semibold">
      {question.orderNo}. {question.prompt}
    </legend>
    <div className="gba:space-y-2">
      {question.options.map(option => {
        const inputType = question.questionType === 'MCQ_MULTI_LEARNING_QUESTION' ? 'checkbox' : 'radio'
        const inputId = `learning-quiz-${question.id}-${option.key}`
        return (
          <label key={option.key} htmlFor={inputId} className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
            <input
              id={inputId}
              type={inputType}
              name={question.id}
              value={option.key}
              checked={selectedKeys.includes(option.key)}
              disabled={disabled}
              onChange={event => {
                if (inputType === 'radio') onSingleAnswer(question.id, option.key)
                if (inputType === 'checkbox') onMultiAnswer(question.id, option.key, event.target.checked)
              }}
              data-testid={`learning-quiz-answer-${question.id}-${option.key}`}
            />
            <span>{option.text}</span>
          </label>
        )
      })}
    </div>
  </fieldset>
)

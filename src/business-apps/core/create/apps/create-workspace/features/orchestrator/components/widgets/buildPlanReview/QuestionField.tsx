/**
 * QuestionField - Component for rendering clarifying questions
 */

import React from 'react'
import { Input, Label, RadioGroup, RadioGroupItem } from '@newwork/nw-design-system'
import type { ClarifyingQuestion } from '../../../types'

interface QuestionFieldProps {
  question: ClarifyingQuestion
  value: string
  onChange: (value: string) => void
}

export const QuestionField: React.FC<QuestionFieldProps> = ({ question, value, onChange }) => {
  if (question.options && question.options.length > 0) {
    return (
      <div className="gba:space-y-2">
        <Label className="gba:flex gba:items-center gba:gap-1">
          {question.question}
          {question.required && <span className="gba:text-destructive">*</span>}
        </Label>
        {question.context && <p className="gba:text-sm gba:text-muted-foreground">{question.context}</p>}
        <RadioGroup value={value} onValueChange={onChange}>
          {question.options.map((option, i) => (
            <div key={i} className="gba:flex gba:items-center gba:space-x-2">
              <RadioGroupItem value={option} id={`${question.id}-${i}`} />
              <Label htmlFor={`${question.id}-${i}`} className="gba:font-normal">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    )
  }

  return (
    <div className="gba:space-y-2">
      <Label htmlFor={question.id} className="gba:flex gba:items-center gba:gap-1">
        {question.question}
        {question.required && <span className="gba:text-destructive">*</span>}
      </Label>
      {question.context && <p className="gba:text-sm gba:text-muted-foreground">{question.context}</p>}
      <Input
        id={question.id}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Enter your answer..."
      />
    </div>
  )
}

/**
 * UserSummaryView - User-friendly view of build plan with natural language summary.
 * Refinement section has been removed (now handled by the agent chat panel).
 */

import React from 'react'
import { Button } from '@newwork/nw-design-system'
import type { BuildPlan } from '../../../types'
import { ComponentList } from './ComponentList'
import { QuestionField } from './QuestionField'
import { BuildPlanActions } from './BuildPlanActions'

interface UserSummaryViewProps {
  plan: BuildPlan
  answers: Record<string, string>
  skippedComponents: Set<string>
  hasQuestions: boolean
  allQuestionsAnswered: boolean
  isLoading?: boolean
  hideActions?: boolean
  onAnswerChange: (questionId: string, answer: string) => void
  onToggleComponent: (componentId: string) => void
  onReanalyze: () => void
  onEdit?: () => void
  onConfirm: () => void
  onCancel: () => void
  testId?: string
}

export const UserSummaryView: React.FC<UserSummaryViewProps> = ({
  plan,
  answers,
  skippedComponents,
  hasQuestions,
  allQuestionsAnswered,
  isLoading = false,
  hideActions = false,
  onAnswerChange,
  onToggleComponent,
  onReanalyze,
  onEdit,
  onConfirm,
  onCancel,
  testId
}) => {
  const userSummary = plan.userSummary

  if (!userSummary) {
    console.error('BuildPlan missing userSummary - this should not happen')
    return null
  }

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      {/* Two-column layout for What You're Getting and What You Can Do */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <div className="gba:space-y-1.5">
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">What You're Getting</h3>
          <ul className="gba:space-y-1">
            {userSummary.whatYouGet.map(item => (
              <li
                key={`getting-${item.slice(0, 30)}`}
                className="gba:flex gba:gap-2 gba:text-sm gba:text-foreground gba:leading-relaxed"
              >
                <span className="gba:text-muted-foreground gba:mt-0.5">•</span>
                <span className="gba:flex-1">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="gba:space-y-1.5">
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">What You Can Do</h3>
          <ul className="gba:space-y-1">
            {userSummary.whatYouCanDo.map(item => (
              <li
                key={`cando-${item.slice(0, 30)}`}
                className="gba:flex gba:gap-2 gba:text-sm gba:text-foreground gba:leading-relaxed"
              >
                <span className="gba:text-muted-foreground gba:mt-0.5">•</span>
                <span className="gba:flex-1">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Why This Matters */}
      <div className="gba:space-y-1.5">
        <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Why This Matters</h3>
        <p className="gba:text-sm gba:text-foreground gba:leading-relaxed">{userSummary.businessValue}</p>
      </div>

      {/* Build Time */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground gba:py-2 gba:border-y gba:border-border">
        <span className="gba:font-medium">Build Time:</span>
        <span>{userSummary.estimatedTime}</span>
      </div>

      {/* Clarifying Questions */}
      {hasQuestions && (
        <div className="gba:space-y-4 gba:py-4 gba:border-y gba:border-border">
          <div className="gba:flex gba:items-center gba:justify-between">
            <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Clarifying Questions</h3>
            <span className="gba:text-xs gba:text-muted-foreground gba:font-medium">Required before building</span>
          </div>
          <div className="gba:space-y-5">
            {plan.questions!.map(question => (
              <QuestionField
                key={question.id}
                question={question}
                value={answers[question.id] || ''}
                onChange={value => onAnswerChange(question.id, value)}
              />
            ))}
            <Button onClick={onReanalyze} disabled={!allQuestionsAnswered || isLoading} variant="outline" size="sm">
              Re-analyze with Answers
            </Button>
          </div>
        </div>
      )}

      {/* Component List */}
      <ComponentList
        components={plan.components}
        skippedComponents={skippedComponents}
        onToggle={onToggleComponent}
        onEdit={onEdit}
        isLoading={isLoading}
        variant="flat"
      />

      {/* Actions */}
      {!hideActions && (
        <BuildPlanActions
          onConfirm={onConfirm}
          onCancel={onCancel}
          isLoading={isLoading}
          allQuestionsAnswered={allQuestionsAnswered}
          variant="simple"
        />
      )}
    </div>
  )
}

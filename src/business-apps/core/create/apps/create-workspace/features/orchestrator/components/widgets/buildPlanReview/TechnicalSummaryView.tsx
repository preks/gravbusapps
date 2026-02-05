/**
 * TechnicalSummaryView - Technical/detailed view of build plan
 */

import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { Edit2 } from 'lucide-react'
import type { BuildPlan } from '../../../types'
import { ComponentList } from './ComponentList'
import { QuestionField } from './QuestionField'
import { BuildPlanActions } from './BuildPlanActions'

interface TechnicalSummaryViewProps {
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

export const TechnicalSummaryView: React.FC<TechnicalSummaryViewProps> = ({
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
  return (
    <div className="gba:space-y-6" data-testid={testId}>
      {/* Summary Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:pb-6 gba:border-b gba:border-border">
        <div className="gba:flex gba:items-center gba:gap-3">
          <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">Build Plan</h2>
          <span className="gba:text-muted-foreground gba:text-sm">•</span>
          <span className="gba:text-sm gba:text-muted-foreground">
            {plan.components.length} component{plan.components.length !== 1 ? 's' : ''}
          </span>
          <span className="gba:text-muted-foreground gba:text-sm">•</span>
          <span className="gba:text-sm gba:text-muted-foreground">
            ~{Math.ceil(plan.estimated_duration_seconds / 60)} min
          </span>
          <span className="gba:text-muted-foreground gba:text-sm">•</span>
          <span className="gba:text-sm gba:text-muted-foreground gba:capitalize">{plan.analysis.complexity}</span>
        </div>

        {onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit} disabled={isLoading} className="gba:text-xs">
            <Edit2 className="gba:w-3 gba:h-3 gba:mr-1.5" />
            Edit Plan
          </Button>
        )}
      </div>

      {/* Goal */}
      <div className="gba:space-y-3">
        <h3 className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:leading-none">
          Goal
        </h3>
        <p className="gba:text-base gba:text-foreground gba:leading-[1.6]">{plan.analysis.intent}</p>
      </div>

      {/* Notes */}
      {plan.analysis.notes && plan.analysis.notes.length > 0 && (
        <div className="gba:space-y-3">
          <h3 className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:leading-none">
            Notes
          </h3>
          <ul className="gba:space-y-2">
            {plan.analysis.notes.map((note, i) => (
              <li key={i} className="gba:text-sm gba:text-muted-foreground gba:flex gba:gap-2 gba:leading-[1.5]">
                <span className="gba:text-muted-foreground gba:mt-0.5">•</span>
                <span className="gba:flex-1">{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Clarifying Questions */}
      {hasQuestions && (
        <div className="gba:space-y-5 gba:py-6 gba:border-t gba:border-b gba:border-border">
          <div className="gba:flex gba:items-center gba:justify-between">
            <h3 className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:leading-none">
              Clarifying Questions
            </h3>
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

      {/* Component List - Grouped */}
      <ComponentList
        components={plan.components}
        skippedComponents={skippedComponents}
        onToggle={onToggleComponent}
        isLoading={isLoading}
        variant="grouped"
      />

      {/* Actions */}
      {!hideActions && (
        <BuildPlanActions
          onConfirm={onConfirm}
          onCancel={onCancel}
          isLoading={isLoading}
          isRefining={false}
          allQuestionsAnswered={allQuestionsAnswered}
          selectedCount={plan.components.length - skippedComponents.size}
          totalCount={plan.components.length}
          variant="withCounter"
        />
      )}
    </div>
  )
}

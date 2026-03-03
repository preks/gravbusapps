/**
 * BuildPlanReview - Component for reviewing and confirming a build plan.
 * Refinement is now handled via the agent chat side panel.
 */

import React from 'react'
import type { BuildPlan } from '../../../types'
import { useBuildPlanReviewState } from './useBuildPlanReviewState'
import { UserSummaryView } from './UserSummaryView'

export interface BuildPlanReviewProps {
  plan: BuildPlan
  onConfirm: (skipComponents?: string[]) => void
  onCancel: () => void
  onReanalyze?: (answers: Record<string, string>) => void
  onEdit?: () => void
  isLoading?: boolean
  hideActions?: boolean
  onSkippedComponentsChange?: (skippedIds: string[]) => void
  'data-testid'?: string
}

export const BuildPlanReview: React.FC<BuildPlanReviewProps> = ({
  plan,
  onConfirm,
  onCancel,
  onReanalyze,
  onEdit,
  isLoading = false,
  hideActions = false,
  onSkippedComponentsChange,
  'data-testid': testId = 'build-plan-review'
}) => {
  const {
    answers,
    skippedComponents,
    hasQuestions,
    allQuestionsAnswered,
    handleAnswerChange,
    toggleComponentSkip,
    handleConfirm,
    handleReanalyze
  } = useBuildPlanReviewState({
    plan,
    onConfirm,
    onReanalyze,
    onSkippedComponentsChange
  })

  return (
    <UserSummaryView
      plan={plan}
      answers={answers}
      skippedComponents={skippedComponents}
      hasQuestions={hasQuestions}
      allQuestionsAnswered={allQuestionsAnswered}
      isLoading={isLoading}
      hideActions={hideActions}
      onAnswerChange={handleAnswerChange}
      onToggleComponent={toggleComponentSkip}
      onReanalyze={handleReanalyze}
      onEdit={onEdit}
      onConfirm={handleConfirm}
      onCancel={onCancel}
      testId={testId}
    />
  )
}

export default BuildPlanReview

/**
 * BuildPlanReview - Component for reviewing and confirming a build plan
 *
 * Shows:
 * - Analysis summary
 * - List of components to be built
 * - Clarifying questions (if any)
 * - Confirm/Cancel actions
 */

import React from 'react'
import type { BuildPlan } from '../../../types'
import { useBuildPlanReviewState } from './useBuildPlanReviewState'
import { UserSummaryView } from './UserSummaryView'
import { TechnicalSummaryView } from './TechnicalSummaryView'

export interface BuildPlanReviewProps {
  plan: BuildPlan
  onConfirm: (skipComponents?: string[]) => void
  onCancel: () => void
  onReanalyze?: (answers: Record<string, string>) => void
  onEdit?: () => void
  onRefine?: (feedback: string) => void
  isLoading?: boolean
  isRefining?: boolean
  refinementSummary?: string | null
  refineError?: string | null
  hideActions?: boolean
  onSkippedComponentsChange?: (skippedIds: string[]) => void
  'data-testid'?: string
}

/**
 * BuildPlanReview component - orchestrator for plan review views
 */
export const BuildPlanReview: React.FC<BuildPlanReviewProps> = ({
  plan,
  onConfirm,
  onCancel,
  onReanalyze,
  onEdit,
  onRefine,
  isLoading = false,
  isRefining = false,
  refinementSummary,
  refineError,
  hideActions = false,
  onSkippedComponentsChange,
  'data-testid': testId = 'build-plan-review'
}) => {
  const {
    answers,
    skippedComponents,
    feedback,
    setFeedback,
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
    onRefine,
    refinementSummary,
    onSkippedComponentsChange
  })

  // Check if plan has user-friendly summary
  const hasUserSummary = !!plan.user_summary

  // Render user-friendly summary layout
  if (hasUserSummary) {
    return (
      <UserSummaryView
        plan={plan}
        answers={answers}
        skippedComponents={skippedComponents}
        feedback={feedback}
        hasQuestions={hasQuestions}
        allQuestionsAnswered={allQuestionsAnswered}
        isLoading={isLoading}
        isRefining={isRefining}
        refinementSummary={refinementSummary}
        refineError={refineError}
        hideActions={hideActions}
        onAnswerChange={handleAnswerChange}
        onToggleComponent={toggleComponentSkip}
        onReanalyze={handleReanalyze}
        onEdit={onEdit}
        onRefine={onRefine}
        onFeedbackChange={setFeedback}
        onConfirm={handleConfirm}
        onCancel={onCancel}
        testId={testId}
      />
    )
  }

  // Render technical layout if no user_summary
  return (
    <TechnicalSummaryView
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

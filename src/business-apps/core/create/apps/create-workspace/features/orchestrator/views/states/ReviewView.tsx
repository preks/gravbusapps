/**
 * ReviewView - Build plan review state
 */

import React from 'react'
import { BuildPlanReview } from '../../components/widgets/buildPlanReview'
import type { BuildPlan } from '../../types'

export interface ReviewViewProps {
  plan: BuildPlan
  onConfirm: (skipComponents?: string[]) => void
  onCancel: () => void
  onReanalyze: (answers: Record<string, string>) => void
  isLoading: boolean
  'data-testid'?: string
}

export const ReviewView: React.FC<ReviewViewProps> = ({
  plan,
  onConfirm,
  onCancel,
  onReanalyze,
  isLoading,
  'data-testid': testId
}) => {
  return (
    <BuildPlanReview
      plan={plan}
      onConfirm={onConfirm}
      onCancel={onCancel}
      onReanalyze={onReanalyze}
      isLoading={isLoading}
      data-testid={testId}
    />
  )
}

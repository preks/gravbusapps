import React from 'react'
import type { EvaluationDetail } from '../types'
import { ReviewSummaryTableCard } from './ReviewSummaryTableCard'

interface SelfReviewsTableProps {
  evaluations: EvaluationDetail[]
  loading: boolean
  cycleName: string
}

export const SelfReviewsTable: React.FC<SelfReviewsTableProps> = props => (
  <ReviewSummaryTableCard
    testId="self-reviews-table"
    titleKey="self-reviews-title"
    descriptionKey="self-reviews-description"
    firstColumnHeaderKey="table-employee"
    emptyMessageKey="empty-no-self-reviews"
    rowTestIdPrefix="self-review-row"
    reviewerType="SELF_EVALUATION_PARTICIPANT_TYPE"
    {...props}
  />
)

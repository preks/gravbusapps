import React from 'react'
import type { EvaluationDetail } from '../types'
import { ReviewSummaryTableCard } from './ReviewSummaryTableCard'

interface ManagerReviewsTableProps {
  evaluations: EvaluationDetail[]
  loading: boolean
  cycleName: string
}

export const ManagerReviewsTable: React.FC<ManagerReviewsTableProps> = props => (
  <ReviewSummaryTableCard
    testId="manager-reviews-table"
    titleKey="manager-reviews-title"
    descriptionKey="manager-reviews-description"
    firstColumnHeaderKey="table-manager"
    emptyMessageKey="empty-no-manager-reviews"
    rowTestIdPrefix="manager-row"
    reviewerType="MANAGER_EVALUATION_PARTICIPANT_TYPE"
    {...props}
  />
)

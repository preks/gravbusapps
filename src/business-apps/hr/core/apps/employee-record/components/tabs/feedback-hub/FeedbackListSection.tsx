'use client'

import React from 'react'
import {
  Card,
  CardContent,
  EmptyState,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  Spinner
} from '@newwork/nw-design-system'
import { FEEDBACK_LIST_LIMIT } from '../../../queries/feedbackQueries'
import FeedbackCards from './FeedbackCards'
import { FormattedFeedback } from './types'

interface FeedbackListSectionProps {
  title: string
  loading: boolean
  feedbackList: FormattedFeedback[]
  emptyLabel: string
  total: number
  currentPage: number
  onPreviousPage: () => void
  onNextPage: () => void
  privateBadgeLabel: string
  publicBadgeLabel: string
  showMoreLabel: string
  showLessLabel: string
}

const FeedbackListSection: React.FC<FeedbackListSectionProps> = ({
  title,
  loading,
  feedbackList,
  emptyLabel,
  total,
  currentPage,
  onPreviousPage,
  onNextPage,
  privateBadgeLabel,
  publicBadgeLabel,
  showMoreLabel,
  showLessLabel
}) => {
  let listContent: React.ReactNode
  if (loading) {
    listContent = (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-40">
        <Spinner size="lg" />
      </div>
    )
  } else if (feedbackList.length > 0) {
    listContent = (
      <FeedbackCards
        feedbackList={feedbackList}
        privateBadgeLabel={privateBadgeLabel}
        publicBadgeLabel={publicBadgeLabel}
        showMoreLabel={showMoreLabel}
        showLessLabel={showLessLabel}
      />
    )
  } else {
    listContent = <EmptyState title={emptyLabel} />
  }

  return (
    <Card>
      <CardContent className="gba:p-4 gba:space-y-4">
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
          <h3 className="gba:text-lg gba:font-semibold">{title}</h3>
        </div>
        {listContent}
        {total > FEEDBACK_LIST_LIMIT && (
          <div className="gba:mt-4 gba:flex gba:justify-end">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={onPreviousPage}
                    className={currentPage === 1 ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={onNextPage}
                    className={
                      currentPage >= Math.ceil(total / FEEDBACK_LIST_LIMIT)
                        ? 'gba:pointer-events-none gba:opacity-50'
                        : 'gba:cursor-pointer'
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default FeedbackListSection

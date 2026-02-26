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
  /** Optional action (e.g. AI Insights button) shown next to the section title */
  headerAction?: React.ReactNode
  /** Optional content (e.g. AI analysis panel) shown as the "back" of the card when flipped */
  footerContent?: React.ReactNode
  /** When true, the card flips to show footerContent instead of the list (front/back flip) */
  showBackContent?: boolean
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
  showLessLabel,
  headerAction,
  footerContent,
  showBackContent = false
}) => {
  let listContent: React.ReactNode
  if (loading) {
    listContent = (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-40">
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

  const hasFlip = footerContent != null
  const isFlipped = hasFlip && showBackContent

  const frontFace = (
    <div className="gba:space-y-4">
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
    </div>
  )

  const panelMaxHeight = 'calc(100vh - 240px)'
  const backFace =
    footerContent != null ? (
      <div
        className="gba:w-full gba:h-full gba:overflow-y-auto gba:overflow-x-hidden gba:scrollbar-thin gba:pr-1"
        style={{ maxHeight: panelMaxHeight }}
      >
        {footerContent}
      </div>
    ) : null

  return (
    <Card className={hasFlip ? 'gba:overflow-hidden' : undefined}>
      <CardContent className="gba:p-4">
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:mb-4">
          <h3 className="gba:text-lg gba:font-semibold">{title}</h3>
          {headerAction}
        </div>

        {hasFlip ? (
          <div
            className={`gba:relative gba:w-full ${isFlipped ? '' : 'gba:min-h-[200px]'}`}
            style={{ perspective: '1000px' }}
          >
            <div
              className="gba:relative gba:w-full gba:transition-transform gba:duration-500 gba:ease-in-out"
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                minHeight: isFlipped ? undefined : '200px',
                height: isFlipped ? panelMaxHeight : undefined,
                maxHeight: isFlipped ? panelMaxHeight : undefined
              }}
            >
              {/* Front: list + pagination */}
              <div
                className="gba:w-full gba:min-h-[200px]"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden'
                }}
              >
                {frontFace}
              </div>
              {/* Back: insights panel (constrained height so column stays smaller) */}
              {backFace != null && (
                <div
                  className="gba:absolute gba:inset-0 gba:w-full gba:flex gba:flex-col"
                  style={{
                    transform: 'rotateY(180deg)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden'
                  }}
                >
                  {backFace}
                </div>
              )}
            </div>
          </div>
        ) : (
          frontFace
        )}
      </CardContent>
    </Card>
  )
}

export default FeedbackListSection

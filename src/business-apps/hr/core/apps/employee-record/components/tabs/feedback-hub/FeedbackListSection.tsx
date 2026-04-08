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
  /** Label used for unknown senders (e.g. "Unknown user"); when sender matches this, name is not clickable. */
  unknownSenderLabel?: string
  /** Optional action (e.g. AI Insights button) shown next to the section title */
  headerAction?: React.ReactNode
  /** Optional content (e.g. AI analysis panel) shown as the "back" of the card when flipped */
  footerContent?: React.ReactNode
  /** When true, the card flips to show footerContent instead of the list (front/back flip) */
  showBackContent?: boolean
}

function getListContent(
  loading: boolean,
  feedbackList: FormattedFeedback[],
  emptyLabel: string,
  privateBadgeLabel: string,
  publicBadgeLabel: string,
  showMoreLabel: string,
  showLessLabel: string,
  unknownSenderLabel?: string
): React.ReactNode {
  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-40">
        <Spinner size="lg" />
      </div>
    )
  }
  if (feedbackList.length > 0) {
    return (
      <FeedbackCards
        feedbackList={feedbackList}
        privateBadgeLabel={privateBadgeLabel}
        publicBadgeLabel={publicBadgeLabel}
        showMoreLabel={showMoreLabel}
        showLessLabel={showLessLabel}
        unknownSenderLabel={unknownSenderLabel}
      />
    )
  }
  return <EmptyState title={emptyLabel} />
}

function FlipCardInner({
  isFlipped,
  frontFace,
  backFace
}: {
  isFlipped: boolean
  frontFace: React.ReactNode
  backFace: React.ReactNode | null
}) {
  const containerMinHeight = isFlipped ? '' : 'gba:min-h-[200px]'

  return (
    <div className={`gba:relative gba:w-full gba:h-full ${containerMinHeight}`}>
      {isFlipped && backFace !== null ? backFace : frontFace}
    </div>
  )
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
  unknownSenderLabel,
  headerAction,
  footerContent,
  showBackContent = false
}) => {
  const listContent = getListContent(
    loading,
    feedbackList,
    emptyLabel,
    privateBadgeLabel,
    publicBadgeLabel,
    showMoreLabel,
    showLessLabel,
    unknownSenderLabel
  )
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

  const backFace =
    footerContent === null || footerContent === undefined ? null : (
      <div className="gba:w-full gba:h-full">{footerContent}</div>
    )

  return (
    <Card className={`gba:h-full ${hasFlip ? 'gba:overflow-hidden' : ''}`}>
      <CardContent className="gba:p-4 gba:h-full gba:flex gba:flex-col">
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:mb-4">
          <h3 className="gba:text-lg gba:font-semibold">{title}</h3>
          {headerAction}
        </div>

        <div className="gba:flex-1">
          {hasFlip ? <FlipCardInner isFlipped={isFlipped} frontFace={frontFace} backFace={backFace} /> : frontFace}
        </div>
      </CardContent>
    </Card>
  )
}

export default FeedbackListSection

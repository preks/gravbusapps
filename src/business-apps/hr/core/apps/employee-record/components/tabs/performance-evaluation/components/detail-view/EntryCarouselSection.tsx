import React, { useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import DetailItemCard from './DetailItemCard'
import { CarouselEntry, ReviewerFallbackIdentity } from './types'

interface EntryCarouselSectionProps {
  title?: string
  entries: CarouselEntry[]
  testIdPrefix: string
  selfLabel: string
  peerLabel: string
  managerLabel: string
  previousLabel: string
  nextLabel: string
  reviewerColumnLabel: string
  selfReviewerFallback?: ReviewerFallbackIdentity
  managerReviewerFallback?: ReviewerFallbackIdentity
}

const EntryCarouselSection: React.FC<EntryCarouselSectionProps> = ({
  title,
  entries,
  testIdPrefix,
  selfLabel,
  peerLabel,
  managerLabel,
  previousLabel,
  nextLabel,
  reviewerColumnLabel,
  selfReviewerFallback,
  managerReviewerFallback
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!entries.length) return null

  const safeIndex = Math.min(currentIndex, entries.length - 1)
  const isFirst = safeIndex === 0
  const isLast = safeIndex === entries.length - 1
  const currentEntry = entries[safeIndex]

  return (
    <section className="gba:space-y-3" data-testid={`${testIdPrefix}-section`}>
      {title ? <p className="gba:text-base gba:font-semibold">{title}</p> : null}

      <DetailItemCard
        item={currentEntry.item}
        testId={currentEntry.testId}
        subtitle={currentEntry.subtitle}
        selfLabel={selfLabel}
        peerLabel={peerLabel}
        managerLabel={managerLabel}
        reviewerColumnLabel={reviewerColumnLabel}
        selfReviewerFallback={selfReviewerFallback}
        managerReviewerFallback={managerReviewerFallback}
        headerControls={
          <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${testIdPrefix}-controls`}>
            <span className="gba:text-xs gba:text-muted-foreground" data-testid={`${testIdPrefix}-position`}>
              {safeIndex + 1} / {entries.length}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={isFirst}
              data-testid={`${testIdPrefix}-previous`}
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            >
              {previousLabel}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={isLast}
              data-testid={`${testIdPrefix}-next`}
              onClick={() => setCurrentIndex(prev => Math.min(entries.length - 1, prev + 1))}
            >
              {nextLabel}
            </Button>
          </div>
        }
      />
    </section>
  )
}

export default EntryCarouselSection

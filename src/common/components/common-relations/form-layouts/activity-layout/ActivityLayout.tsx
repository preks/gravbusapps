import React from 'react'
import { Skeleton } from '@newwork/nw-design-system'
import ActivitySegment from '../../form-segments/activity-segment/ActivitySegment'
import type { ActivitySegmentProps } from '../../form-segments/activity-segment/ActivitySegment'

export interface ActivityLayoutProps
  extends Omit<ActivitySegmentProps, 'titleLabel' | 'typeLabel' | 'dateLabel' | 'descriptionLabel'> {
  // Labels (required)
  titleLabel: React.ReactNode
  typeLabel: React.ReactNode
  dateLabel: React.ReactNode
  descriptionLabel: React.ReactNode
  uploadFileLabel?: React.ReactNode
  entityLabel?: React.ReactNode

  // Loading state - shows skeletons while data is being fetched
  loading?: boolean
}

const ActivityLayout: React.FC<ActivityLayoutProps> = ({
  titleLabel,
  typeLabel,
  dateLabel,
  descriptionLabel,
  uploadFileLabel,
  entityLabel,
  loading = false,
  ...segmentProps
}) => {
  // Show skeletons while loading
  if (loading) {
    return (
      <div data-testid="activity-layout-loading" className="gba:space-y-4">
        <Skeleton className="gba:h-10 gba:w-full" />
        <Skeleton className="gba:h-10 gba:w-full" />
        <Skeleton className="gba:h-10 gba:w-full" />
        <Skeleton className="gba:h-32 gba:w-full" />
        <Skeleton className="gba:h-10 gba:w-full" />
      </div>
    )
  }

  return (
    <div data-testid="activity-layout">
      <ActivitySegment
        {...segmentProps}
        titleLabel={titleLabel}
        typeLabel={typeLabel}
        dateLabel={dateLabel}
        descriptionLabel={descriptionLabel}
        uploadFileLabel={uploadFileLabel}
        entityLabel={entityLabel}
      />
    </div>
  )
}

export default ActivityLayout

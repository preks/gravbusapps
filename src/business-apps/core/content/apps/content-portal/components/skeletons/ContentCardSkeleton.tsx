import React from 'react'
import { Card, Skeleton } from '@newwork/nw-design-system'

interface ContentCardSkeletonProps {
  variant?: 'default' | 'featured' | 'horizontal'
  count?: number
}

const ContentCardSkeleton: React.FC<ContentCardSkeletonProps> = ({ variant = 'default', count = 1 }) => {
  const skeletons = Array.from({ length: count }, (_, i) => i)

  if (variant === 'featured') {
    return (
      <>
        {skeletons.map(index => (
          <Card key={`skeleton-featured-${index}`} className="gba:p-6">
            <div className="gba:flex gba:gap-4">
              <Skeleton className="gba:w-32 gba:h-32 gba:rounded-lg gba:shrink-0" />
              <div className="gba:flex-1 gba:space-y-3">
                <Skeleton className="gba:h-4 gba:w-24" />
                <Skeleton className="gba:h-8 gba:w-full" />
                <Skeleton className="gba:h-4 gba:w-full" />
                <Skeleton className="gba:h-4 gba:w-3/4" />
                <div className="gba:flex gba:gap-4 gba:pt-2">
                  <Skeleton className="gba:h-4 gba:w-20" />
                  <Skeleton className="gba:h-4 gba:w-20" />
                  <Skeleton className="gba:h-4 gba:w-32" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </>
    )
  }

  if (variant === 'horizontal') {
    return (
      <>
        {skeletons.map(index => (
          <Card key={`skeleton-horizontal-${index}`} className="gba:p-6">
            <div className="gba:flex gba:gap-6">
              <Skeleton className="gba:w-48 gba:h-32 gba:rounded-lg gba:shrink-0" />
              <div className="gba:flex-1 gba:space-y-3">
                <Skeleton className="gba:h-6 gba:w-3/4" />
                <Skeleton className="gba:h-4 gba:w-full" />
                <Skeleton className="gba:h-4 gba:w-full" />
                <Skeleton className="gba:h-4 gba:w-1/2" />
              </div>
            </div>
          </Card>
        ))}
      </>
    )
  }

  return (
    <>
      {skeletons.map(index => (
        <Card key={`skeleton-default-${index}`} className="gba:overflow-hidden">
          <Skeleton className="gba:w-full gba:h-48" />
          <div className="gba:p-4 gba:space-y-3">
            <Skeleton className="gba:h-4 gba:w-24" />
            <Skeleton className="gba:h-6 gba:w-full" />
            <Skeleton className="gba:h-4 gba:w-full" />
            <Skeleton className="gba:h-4 gba:w-3/4" />
            <div className="gba:flex gba:gap-4 gba:pt-2">
              <Skeleton className="gba:h-4 gba:w-16" />
              <Skeleton className="gba:h-4 gba:w-16" />
            </div>
          </div>
        </Card>
      ))}
    </>
  )
}

export default ContentCardSkeleton

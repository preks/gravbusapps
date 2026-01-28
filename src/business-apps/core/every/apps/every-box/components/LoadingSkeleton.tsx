/**
 * LoadingSkeleton Component
 * Displays skeleton loading states for tasks and flows
 */

import React from 'react'
import { Card, CardContent, Skeleton } from '@newwork/nw-design-system'
// Note: Card/CardContent used only for flow skeleton, not task skeleton

interface LoadingSkeletonProps {
  count?: number
  type?: 'task' | 'flow'
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ count = 10, type = 'task' }) => {
  if (type === 'flow') {
    // Flow skeleton - matches OutboxView layout
    return (
      <div className="gba:flex gba:flex-col gba:gap-3 gba:h-full gba:px-3 gba:py-2" data-testid="loading-skeleton-flow">
        {/* Flow cards */}
        <div className="gba:space-y-2 gba:flex-1 gba:overflow-hidden">
          {Array.from({ length: count }).map((_, index) => (
            <Card key={`skeleton-flow-${index}`}>
              <CardContent className="gba:p-3">
                <div className="gba:space-y-2">
                  {/* Badges row - Blink badge, assignee avatars, status badge */}
                  <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                    <Skeleton className="gba:h-5 gba:w-16 gba:rounded-full" />
                    <Skeleton className="gba:h-4 gba:w-4 gba:rounded" />
                    <div className="gba:flex gba:-space-x-2">
                      <Skeleton className="gba:h-6 gba:w-6 gba:rounded-full" />
                      <Skeleton className="gba:h-6 gba:w-6 gba:rounded-full" />
                    </div>
                    <Skeleton className="gba:h-5 gba:w-20 gba:rounded-full" />
                  </div>

                  {/* Title */}
                  <Skeleton className="gba:h-4 gba:w-3/4" />

                  {/* Progress section */}
                  <div className="gba:space-y-1">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Skeleton className="gba:h-3.5 gba:w-3.5 gba:rounded" />
                      <Skeleton className="gba:h-3 gba:w-32" />
                    </div>
                    <Skeleton className="gba:h-1.5 gba:w-full gba:rounded-full" />
                  </div>

                  {/* Metadata - date */}
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <Skeleton className="gba:h-3 gba:w-3 gba:rounded" />
                    <Skeleton className="gba:h-3 gba:w-28" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Task skeleton - matches TaskCard layout (compact split view)
  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:px-3 gba:py-2" data-testid="loading-skeleton-task">
      {/* Task cards */}
      <div className="gba:space-y-2 gba:flex-1 gba:overflow-hidden">
        {Array.from({ length: count }).map((_, index) => (
          <div key={`skeleton-task-${index}`} className="gba:px-3 gba:py-2.5 gba:bg-card gba:rounded-lg gba:mb-2">
            <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
              {/* Left: Name and Title */}
              <div className="gba:flex gba:flex-col gba:gap-0.5 gba:flex-1 gba:min-w-0">
                {/* Creator Name */}
                <Skeleton className="gba:h-4 gba:w-32" />
                {/* Task Title */}
                <Skeleton className="gba:h-3 gba:w-48" />
              </div>

              {/* Right: Timestamp */}
              <Skeleton className="gba:h-3 gba:w-20 gba:flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * LoadingSkeleton Component
 * Displays skeleton loading states for tasks and flows
 */

import React from 'react'
import { Card, CardContent, Skeleton } from '@newwork/nw-design-system'

interface LoadingSkeletonProps {
  count?: number
  type?: 'task' | 'flow'
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ count = 10, type = 'task' }) => {
  if (type === 'flow') {
    // Flow skeleton - matches OutboxView layout
    return (
      <div className="gba:flex gba:flex-col gba:gap-4 gba:h-full" data-testid="loading-skeleton-flow">
        {/* Search bar + Refresh button */}
        <div className="gba:flex gba:items-center gba:gap-4">
          <Skeleton className="gba:h-10 gba:flex-1 gba:rounded-md" />
          <Skeleton className="gba:h-10 gba:w-10 gba:rounded-md" />
        </div>

        {/* Filter buttons - All, Blinks, Requests */}
        <div className="gba:flex gba:gap-2 gba:flex-wrap">
          <Skeleton className="gba:h-9 gba:w-20 gba:rounded-md" />
          <Skeleton className="gba:h-9 gba:w-24 gba:rounded-md" />
          <Skeleton className="gba:h-9 gba:w-28 gba:rounded-md" />
        </div>

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

  // Task skeleton - matches InboxView layout
  return (
    <div className="gba:flex gba:flex-col gba:gap-3 gba:h-full" data-testid="loading-skeleton-task">
      {/* Search bar + Refresh button */}
      <div className="gba:flex gba:items-center gba:gap-4">
        <Skeleton className="gba:h-10 gba:flex-1 gba:rounded-md" />
        <Skeleton className="gba:h-10 gba:w-10 gba:rounded-md" />
      </div>

      {/* Filter buttons - All, Blinks, Approvals, Completed */}
      <div className="gba:flex gba:items-center gba:gap-1">
        <Skeleton className="gba:h-8 gba:w-20 gba:rounded-md" />
        <Skeleton className="gba:h-8 gba:w-20 gba:rounded-md" />
        <Skeleton className="gba:h-8 gba:w-28 gba:rounded-md" />
        <Skeleton className="gba:h-8 gba:w-28 gba:rounded-md" />
      </div>

      {/* Task cards */}
      <div className="gba:space-y-0 gba:flex-1 gba:overflow-hidden">
        {Array.from({ length: count }).map((_, index) => (
          <Card key={`skeleton-task-${index}`} className="nw:py-0">
            <CardContent className="gba:px-4 gba:py-3">
              <div className="gba:flex gba:items-center gba:gap-4">
                {/* Avatar */}
                <Skeleton className="gba:h-8 gba:w-8 gba:rounded-full gba:flex-shrink-0" />

                {/* Creator info column */}
                <div className="gba:flex gba:flex-col gba:gap-1 gba:w-48 gba:flex-shrink-0">
                  <Skeleton className="gba:h-3 gba:w-28" />
                  <Skeleton className="gba:h-3 gba:w-24" />
                </div>

                {/* Module icon */}
                <Skeleton className="gba:h-5 gba:w-5 gba:rounded gba:flex-shrink-0" />

                {/* Task title and description */}
                <div className="gba:flex gba:flex-col gba:gap-1 gba:flex-1 gba:min-w-0">
                  <Skeleton className="gba:h-5 gba:w-3/4" />
                  <Skeleton className="gba:h-3 gba:w-1/2" />
                </div>

                {/* Due date */}
                <Skeleton className="gba:h-3 gba:w-20 gba:flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/**
 * LoadingSkeleton Component
 * Displays skeleton loading states for tasks and flows
 */

import React from 'react';
import { Card, CardContent, Skeleton } from '@newwork/nw-design-system';

interface LoadingSkeletonProps {
  count?: number;
  type?: 'task' | 'flow';
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ count = 3, type = 'task' }) => {
  return (
    <div className="gba:space-y-3" data-testid={`loading-skeleton-${type}`}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
              <div className="gba:flex-1 gba:space-y-3">
                {/* Badges */}
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Skeleton className="gba:h-5 gba:w-16" />
                  <Skeleton className="gba:h-5 gba:w-20" />
                  <Skeleton className="gba:h-5 gba:w-24" />
                </div>

                {/* Title */}
                <Skeleton className="gba:h-6 gba:w-3/4" />

                {/* Description */}
                <Skeleton className="gba:h-4 gba:w-full" />
                <Skeleton className="gba:h-4 gba:w-2/3" />

                {/* Flow-specific progress bar */}
                {type === 'flow' && (
                  <div className="gba:space-y-2">
                    <div className="gba:flex gba:justify-between">
                      <Skeleton className="gba:h-3 gba:w-16" />
                      <Skeleton className="gba:h-3 gba:w-20" />
                    </div>
                    <Skeleton className="gba:h-2 gba:w-full" />
                  </div>
                )}

                {/* Metadata */}
                <div className="gba:flex gba:items-center gba:gap-4">
                  <Skeleton className="gba:h-3 gba:w-32" />
                  <Skeleton className="gba:h-3 gba:w-28" />
                </div>
              </div>

              {/* Action button */}
              <Skeleton className="gba:h-10 gba:w-10 gba:rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};


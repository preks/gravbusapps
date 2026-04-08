import React from 'react'
import { Skeleton } from '@newwork/nw-design-system'

const CARD_COUNT = 8

/**
 * Card grid skeleton for initial load (e.g. debug tab, orphaned contexts).
 */
export const CardGridSkeleton: React.FC = () => (
  <div className="gba:p-6">
    <div
      className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:gap-4"
      data-testid="card-grid-skeleton"
    >
      {Array.from({ length: CARD_COUNT }, (_, i) => (
        <div key={i} className="gba:rounded-lg gba:border gba:p-4 gba:space-y-2">
          <Skeleton className="gba:h-5 gba:w-3/4" />
          <Skeleton className="gba:h-4 gba:w-full" />
          <Skeleton className="gba:h-3 gba:w-1/2" />
        </div>
      ))}
    </div>
  </div>
)
